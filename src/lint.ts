// Deterministic design linter for HTML / CSS / JSX / Tailwind snippets.
// Detects the anti-patterns the craft docs warn about: hardcoded values,
// missing focus/alt/labels, killed outlines, div-soup, px fonts.
//
// Two rule families, because the target languages need different treatment:
//   • LINE rules  — CSS-ish declarations that live on one line.
//   • SOURCE rules — markup that Prettier routinely spreads over many lines
//     (`<img\n  src=…\n  alt=…\n/>`). These scan the whole snippet with a tag
//     scanner and map the match offset back to a line number, so formatting
//     never decides whether a finding fires.
// Not a full parser — a fast, high-signal design-time check.

import { scanTags, findAttr, hasAttr, hasSpread, type Tag } from "./scan.js";

export interface LintFinding {
  line: number;
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  fix: string;
  doc?: string;
}

/**
 * One finding as an MCP client receives it in `structuredContent`.
 *
 * A `LintFinding` is what a rule produces; this is what leaves the process, and
 * the two differ in exactly two ways. `file` is lifted out of the message — the
 * prose report folds the path in ("`app/page.tsx`: …") because a human reads
 * one line, and an agent chaining audit → fix needs it as a field. And `doc` is
 * required rather than optional: every rule in `seo.ts` and `perf.ts` cites a
 * document, and both suites fail if one does not.
 */
export interface AuditFinding {
  rule: string;
  severity: LintFinding["severity"];
  message: string;
  fix: string;
  doc: string;
  file?: string;
  line?: number;
}

/**
 * The structured half of an audit, declared as an `outputSchema` and returned
 * as `structuredContent` beside the markdown.
 *
 * `notVisible` is the load-bearing member and it is deliberately an array of
 * strings rather than a paragraph of prose. What an audit did *not* check is as
 * consequential to the agent acting on it as what it did: a caller that treats
 * silence as a clean bill will ship the defect this tool never looked for. The
 * same array is rendered as the report's "Not visible to this audit" section,
 * so the two can never drift apart.
 */
export interface AuditStructured {
  findings: AuditFinding[];
  summary: { error: number; warning: number; info: number };
  notVisible: string[];
}

/** A report in both registers: markdown for a person, structure for a machine. */
export interface AuditReport {
  text: string;
  structured: AuditStructured;
}

interface LineRule {
  id: string;
  severity: LintFinding["severity"];
  test: (line: string, full: string) => boolean;
  message: string;
  fix: string;
  doc?: string;
}

// ── tag scanner ──────────────────────────────────────────────────────────────
//
// The scanner and the attribute readers live in `scan.ts`, which is where every
// module that parses markup gets them. They are re-exported here because
// several modules have imported them from `./lint.js` since before that shared
// home existed.

export { scanTags, hasAttr, hasSpread };
export type { Tag };

function lineOf(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === "\n") line++;
  return line;
}

/** Inner text of an element, with nested tags and JSX expressions removed. */
function innerText(src: string, tag: Tag): string {
  if (tag.selfClosing) return "";
  const close = src.toLowerCase().indexOf(`</${tag.name.toLowerCase()}`, tag.end);
  const inner = src.slice(tag.end, close === -1 ? src.length : close);
  return inner
    .replace(/<[^>]*>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Does the snippet provide a visible focus indicator anywhere? `outline: none`
 * is only a defect when nothing replaces it — checking the whole snippet
 * (rather than the same line) is what makes that judgement correct.
 */
/**
 * True when this `outline: none` sits in a rule that deliberately excludes
 * keyboard focus — `:focus:not(:focus-visible)`, or the `not-focus-visible:`
 * variant. The selector is whatever precedes the enclosing `{`.
 */
function isPointerFocusException(src: string, index: number): boolean {
  const open = src.lastIndexOf("{", index);
  if (open === -1) {
    // No block: a utility class list. Only the explicit negated variant counts.
    return /not-focus-visible:outline-none/.test(src.slice(Math.max(0, index - 40), index + 40));
  }
  const prevClose = Math.max(src.lastIndexOf("}", open), src.lastIndexOf(";", open));
  const selector = src.slice(prevClose + 1, open);
  return /:not\(\s*:focus-visible\s*\)/.test(selector);
}

function hasFocusReplacement(src: string): boolean {
  // NOTE: the "not none" guards must sit directly after the colon. Written as
  // `outline\s*:\s*(?!none)` the `\s*` backtracks to zero width and the
  // lookahead passes on " none" — which would silently disable this rule.
  const cssRule = /:focus(-visible)?\b[^{}]*\{[^}]*?(outline\s*:(?!\s*(?:none|0\b))|box-shadow\s*:(?!\s*none)|border(-color)?\s*:(?!\s*none)|--ring)/i;
  // `focus:outline-none` is the removal, not the replacement — exclude it.
  const tailwind = /focus(-visible)?:(ring|outline|shadow|border)(?!-none\b|-0\b)(-|\b)/i;
  return cssRule.test(src) || tailwind.test(src);
}

// ── line rules ───────────────────────────────────────────────────────────────

const LINE_RULES: LineRule[] = [
  {
    id: "hardcoded-color",
    severity: "warning",
    test: (l) =>
      /(color|background|border|fill|stroke)\s*[:=]\s*["']?#([0-9a-fA-F]{3,8})\b/.test(l) ||
      (/["']#([0-9a-fA-F]{6})["']/.test(l) && /style|className|css/.test(l)),
    message: "Hardcoded hex color instead of a design token.",
    fix: "Reference a token: var(--color-primary) / theme color / a token constant. Generate them with generate_design_tokens.",
    doc: "design-tokens-theming",
  },
  {
    id: "px-font-size",
    severity: "warning",
    test: (l) => /font-size\s*:\s*\d+(\.\d+)?px/.test(l),
    message: "font-size in px ignores the user's browser zoom / text-size setting.",
    fix: "Use rem (or a --text-* token). 16px → 1rem.",
    doc: "accessibility",
  },
  {
    id: "important-overuse",
    severity: "info",
    test: (l) => /!important/.test(l),
    message: "!important usually signals a specificity/architecture problem.",
    fix: "Prefer a token/utility or a more specific selector; reserve !important for true overrides.",
    doc: "design-engineering",
  },
  {
    id: "fixed-height-text",
    severity: "info",
    test: (l) => /\bheight\s*:\s*\d{2,}px/.test(l) && !/(icon|avatar|line|divider|border)/i.test(l),
    message: "Fixed pixel height on a container can clip text when it wraps or scales.",
    fix: "Prefer min-height + padding so content can grow (i18n / Dynamic Type / long copy).",
    doc: "i18n-localization",
  },
  {
    id: "positive-tabindex",
    severity: "warning",
    test: (l) => /tabindex\s*=\s*["']?[1-9]/i.test(l) || /tabIndex=\{?[1-9]/.test(l),
    message: "Positive tabindex disrupts natural focus order.",
    fix: "Use tabindex=0 (focusable, in order) or -1 (programmatic). Fix DOM order instead.",
    doc: "accessibility",
  },
  {
    id: "magic-number-radius",
    severity: "info",
    test: (l) => /border-radius\s*:\s*\d+px/.test(l) && !/var\(|rounded/.test(l),
    message: "Ad-hoc border-radius — mixed radii look accidental.",
    fix: "Use one radius token across the UI (--radius-md). See clean-app-design.",
    doc: "clean-app-design",
  },
];

// ── source (tag-aware) rules ─────────────────────────────────────────────────

const IMAGE_TAGS = new Set(["img", "image"]);
const CLICKABLE_CONTAINERS = new Set(["div", "span", "li", "section"]);
const LABELLED_CONTROLS = new Set(["input", "select", "textarea"]);
const UNLABELLED_INPUT_TYPES = new Set(["hidden", "submit", "button", "image", "reset"]);

function sourceFindings(src: string): LintFinding[] {
  const found: LintFinding[] = [];
  const tags = scanTags(src);
  const push = (index: number, f: Omit<LintFinding, "line">) => found.push({ line: lineOf(src, index), ...f });

  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    const { attrs } = tag;

    if (IMAGE_TAGS.has(name) && !hasAttr(attrs, "alt") && !hasSpread(attrs)) {
      push(tag.index, {
        severity: "error",
        rule: "img-no-alt",
        message: `<${tag.name}> without an alt attribute — invisible/opaque to screen readers.`,
        fix: 'Add alt="" for decorative images, or a descriptive alt for meaningful ones.',
        doc: "accessibility",
      });
    }

    if (
      CLICKABLE_CONTAINERS.has(name) &&
      hasAttr(attrs, "onClick") &&
      !hasAttr(attrs, "role") &&
      !hasSpread(attrs)
    ) {
      push(tag.index, {
        severity: "warning",
        rule: "clickable-div",
        message: `Clickable <${tag.name}> without a role — not focusable or announced as interactive.`,
        fix: 'Use a <button> (or add role="button", tabIndex={0}, and key handlers).',
        doc: "accessibility",
      });
    }

    if (name === "button" && !hasSpread(attrs)) {
      const named =
        hasAttr(attrs, "aria-label") || hasAttr(attrs, "aria-labelledby") || hasAttr(attrs, "title");
      if (!named && innerText(src, tag).replace(/[^\p{L}\p{N}]/gu, "").length < 2) {
        push(tag.index, {
          severity: "warning",
          rule: "icon-button-no-label",
          message: "Icon-only <button> without an accessible name.",
          fix: 'Add aria-label="…" (or visually-hidden text). See iconography.',
          doc: "iconography",
        });
      }
    }

    if (LABELLED_CONTROLS.has(name) && !hasSpread(attrs)) {
      // Read at a name position, like everything else here: a `type=` written
      // inside a placeholder or a title is text, not this control's type.
      const at = findAttr(attrs, "type");
      const type = (at && !at.bound
        ? /^\s*=\s*["']?([a-z]+)/i.exec(attrs.slice(at.index + at.length))?.[1]
        : undefined)?.toLowerCase() ?? "text";
      const labelled =
        hasAttr(attrs, "aria-label") ||
        hasAttr(attrs, "aria-labelledby") ||
        hasAttr(attrs, "id") || // may be paired with <label for>
        hasAttr(attrs, "title");
      if (!UNLABELLED_INPUT_TYPES.has(type) && !labelled) {
        push(tag.index, {
          severity: "warning",
          rule: "control-no-label",
          message: `<${tag.name}> with no way to associate a label (no id, aria-label or aria-labelledby).`,
          fix: "Pair it with a <label for> via id, or add aria-label. A placeholder is not a label.",
          doc: "forms-inputs",
        });
      }
    }
  }

  // outline:none is only a defect when nothing replaces the focus ring.
  if (!hasFocusReplacement(src)) {
    // CSS declaration, or a Tailwind `outline-none` utility with any variant
    // prefix (`focus:`, `md:focus:`) — class lists start right after a quote.
    const outlineRe = /outline\s*:\s*(?:none|0)\b|(?:^|[\s"'`])(?:[a-z][a-z0-9-]*:)*outline-none\b/g;
    let m: RegExpExecArray | null;
    while ((m = outlineRe.exec(src)) !== null) {
      // `:focus:not(:focus-visible) { outline: none }` is the recommended way to
      // drop the ring for pointer focus while keeping it for the keyboard.
      // Flagging it would mark best-practice code as an error, which teaches
      // people to ignore the linter.
      if (isPointerFocusException(src, m.index)) continue;
      push(m.index, {
        severity: "error",
        rule: "outline-none",
        message: "Focus outline removed with no visible replacement — kills keyboard focus visibility.",
        fix: "Never remove focus indication outright. Pair it with :focus-visible { outline: 2px solid var(--ring) } (or focus-visible:ring-2).",
        doc: "accessibility",
      });
    }
  }

  return found;
}

// ── entry points ─────────────────────────────────────────────────────────────

/** Lint a code snippet; returns findings sorted by line then severity. */
export function designLint(code: string): LintFinding[] {
  const lines = code.split(/\r?\n/);
  const findings: LintFinding[] = [];
  const sevOrder = { error: 0, warning: 1, info: 2 };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    for (const r of LINE_RULES) {
      try {
        if (r.test(line, code)) {
          findings.push({ line: i + 1, severity: r.severity, rule: r.id, message: r.message, fix: r.fix, doc: r.doc });
        }
      } catch {
        /* a rule must never break the report */
      }
    }
  });

  try {
    findings.push(...sourceFindings(code));
  } catch {
    /* ditto */
  }

  // One finding per rule per line, even if a rule matches twice there.
  const seen = new Set<string>();
  return findings
    .filter((f) => {
      const key = `${f.line}:${f.rule}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line - b.line || sevOrder[a.severity] - sevOrder[b.severity]);
}

const ICON: Record<LintFinding["severity"], string> = { error: "🔴", warning: "🟡", info: "🔵" };

export const LINT_PREAMBLE =
  "This reads one snippet with per-line regexes and a tag scanner. It resolves no import, opens no other file, renders nothing and measures nothing. It cannot see:";

/**
 * What `design_lint` structurally cannot see.
 *
 * Every entry was written *after* running the linter on an input built to
 * demonstrate it, and each demonstration is kept as a test in
 * `tests/lint.test.ts`. That order matters and is not a style preference: an
 * earlier disclosure list on a sibling module was written from a reading of the
 * rules, four of its sentences were false, and every one of the four was caught
 * by running the tool rather than by re-reading it. A sentence that cannot be
 * demonstrated does not belong here — including one that merely over-claims
 * silence, because a caller who is told a check does not happen will go and do
 * it by hand, and being sent to do work the tool already did is the same kind
 * of wrong as being told a check happened when it did not.
 *
 * Several entries are deliberately precise about *which half* of a rule is
 * affected, because most of these rules are silent for two quite different
 * reasons — "looked and found nothing" and "never ran here" — and a reader
 * acting on silence needs to know which one they have.
 */
export const LINT_NOT_VISIBLE: string[] = [
  "**Nothing here is measured, and nothing is rendered.** No contrast ratio is computed, no tap target sized, no spacing rhythm checked, no focus order walked, no screen reader run. `.a { color: #777777; background: #888888; }` comes back as a single `hardcoded-color` warning and says nothing whatever about the contrast between the two, and `padding: 13px 27px` draws nothing at all. Every finding above is a fact about the *text* of the snippet.",
  "**Anything declared in another file** — a class, a design token, a custom property, a parent component's props. `<div class=\"btn\">Go</div>` draws nothing regardless of what `.btn` does in the stylesheet. On `outline-none` that costs in both directions: `.btn { outline: none; }` handed over on its own is reported as an error even when the `:focus-visible` ring replacing it lives in a file this call never saw, and a JSX snippet whose `outline: none` sits in that stylesheet is silent. When the answer depends on both, lint the markup and the CSS in one snippet.",
  "**`outline-none` at all, once anything in the snippet looks like a focus replacement.** The check is snippet-wide and selector-blind: one `:focus` rule setting an outline, box-shadow, border or `--ring` anywhere in the text — or a single `focus:ring-*` utility — switches the rule off for every `outline: none` in it, including ones in unrelated selectors. `.a:focus { outline: 2px solid blue; }` beside `.b { outline: none; }` reports nothing, and `.b` really is left with no focus indicator. Silence here means \"something replaced a ring somewhere\", never \"every element has one\".",
  "**A tag that carries a spread.** `img-no-alt`, `clickable-div`, `icon-button-no-label` and `control-no-label` all stand down on any element with `{...props}`, because the attribute they would report as missing may be inside it. `<img {...props} src=\"a.png\">`, `<div {...rest} onClick={go}>`, `<input {...register(\"x\")} />` and `<button {...p}><Icon/></button>` each draw nothing. The alternative is a fabricated finding, so the miss is deliberate — but it means a component that forwards its props is largely unreadable to these four rules.",
  "**A value that only exists at run time — and the two rule families split on which way that costs.** The line rules read literal text, so a hex assigned to a variable and used as `style={{ color: c }}` draws no `hardcoded-color`, and `tabIndex={n}` draws no `positive-tabindex` however large `n` is at run time (`tabIndex={5}` written out does fire). `icon-button-no-label` errs the other way: it measures a button's inner text after erasing every `{…}` expression, so `<button>{label}</button>` — a properly labelled button — is reported as icon-only. Read that rule against prop-driven buttons as a question, not a defect.",
  "**An element whose tag name is not on a rule's list.** Each tag rule is keyed to literal names, so a wrapper component is invisible even when it renders exactly the element the rule is about. `img-no-alt` fires on `img` and `image` only — `<Image src=\"/a.png\" />` is caught by coincidence of spelling while `<Avatar src=\"/a.png\" />` draws nothing. `clickable-div` covers `div`, `span`, `li` and `section`, so `<a onClick>`, `<p onClick>`, `<td onClick>` and `<article onClick>` are all silent. `icon-button-no-label` covers `<button>` and neither `<a role=\"button\">` nor `<IconButton />`; `control-no-label` covers `input`, `select` and `textarea` and not `<TextField />`.",
  "**A namespaced element, which is graded as its prefix.** `:` is not a tag-name character in the shared scanner, so `<svg:image href=\"…\">` is read as an element called `svg`, `<xhtml:img>` as one called `xhtml` and `<html:input>` as one called `html` — none of which is on any rule's list, so all three pass silently while their unprefixed spellings fire. What this does *not* cost is a Svelte head: no rule here looks for a `<head>` element at all, so `<svelte:head>` is merely an unrecognised tag, and an `<img>` written inside one is graded exactly as it would be anywhere else in the file.",
  "**Commented-out code — and the two rule families disagree about it.** The line rules skip a line whose first non-space characters are `//`, `*` or `/*`; the tag rules mask nothing. So `<!-- <img src=\"a.png\"> -->` reports `img-no-alt`, `{/* <img src=\"a.png\"> */}` reports it too, and `<!-- .b { outline: none } -->` reports `outline-none`, while `// color: #ff0000;` is skipped. The line-rule guard is about where the *line* starts, so `color: #ff0000; // fix later` still fires, and inside a block comment whose continuation lines carry no leading `*` the line rules fire normally. Dead code draws live findings here.",
  "**A CSS declaration split across lines.** `hardcoded-color`, `px-font-size`, `important-overuse`, `fixed-height-text`, `positive-tabindex` and `magic-number-radius` are single-line regexes run once per line, so `font-size:` followed by `14px` on the next line, or `color:` followed by `#ff0000`, draws nothing where the same declaration on one line draws a warning. The five tag rules do not share this blind spot — they scan the whole snippet and map the offset back to a line number, so a Prettier-wrapped `<img\\n  src=…\\n/>` is graded exactly like the one-line form.",
  "**Spellings a line rule was not written for.** `hardcoded-color` wants a `#` hex directly after `color`, `background`, `border`, `fill` or `stroke`, or a quoted six-digit hex on a line that mentions style/className/css — so `rgb(255, 0, 0)`, `hsl()`, `oklch()`, a named `red`, a `--brand: #ff0000` custom-property *definition*, and a hex inside `box-shadow` are all invisible. `px-font-size` reads only the CSS `font-size:` spelling: `style={{ fontSize: \"14px\" }}` and the `font: 14px/1.5` shorthand draw nothing. Tailwind's arbitrary-value syntax — `bg-[#ff0000]`, `text-[14px]`, `rounded-[6px]` — is where hardcoding actually happens in a Tailwind file and is exactly where these rules are blindest.",
  "**`fixed-height-text` and `magic-number-radius` on a line containing a word they stand down for.** `fixed-height-text` is dropped when the line contains `icon`, `avatar`, `line`, `divider` or `border` as a *substring*, which is much wider than it reads: `.timeline`, `.headline` and `.inline-flex` all contain `line`, and `.a { height: 40px; border-radius: 4px; }` contains `border`, so none of those four draws the height note that `.card { height: 40px; }` draws — the fourth is not silent overall, it still reports its radius. `magic-number-radius` is dropped when `var(` or `rounded` appears anywhere on the line, so `.rounded-card { border-radius: 8px; }` is silent. Both suppressors are whole-line, so a densely written declaration block quietly switches them off.",
  "**Whether a label, a role or a name actually resolves.** `control-no-label` is satisfied by the mere *presence* of an `id` and never looks for the `<label for>` that would use it, so `<input id=\"email\">` with no label anywhere is silent, and so is `<label for=\"nope\">Email</label><input id=\"email\">` where the two do not match. It also has no notion of a wrapping label: `<label>Email <input type=\"email\"></label>`, which is correct, still draws the warning. `clickable-div` is satisfied by any `role` at all — `role=\"presentation\"` silences it — and never checks that the `tabIndex` and key handlers its own fix text asks for came with it. Both grade the presence of an attribute, not the behaviour it produces.",
  "**How many defects a snippet has.** At most one finding per rule per line: `<img src=a><img src=b><img src=c>` on a single line reports one `img-no-alt`, and `.a { color: #fff; background: #000; }` reports one `hardcoded-color`. The same two images on two lines report two. The summary counts findings, not defects, and it undercounts a minified or densely written file.",
];

export const LINT_CLOSING =
  "A clean result here is not a design review and not an accessibility audit. It means no rule in this linter matched the text of this snippet — and most of what makes an interface work has no rule here at all. Take the rest from design_review_checklist, a keyboard, and a screen reader.";

export function designLintReport(code: string): AuditReport {
  const findings = designLint(code);
  const out: string[] = [];
  if (findings.length === 0) {
    out.push(
      "# Design lint",
      "",
      "✅ No design anti-patterns detected in this snippet.",
      "",
      "_Static checks only (hardcoded values, focus/alt/labels, semantics). Still verify visually and with a keyboard + screen reader. See design_review_checklist for a full audit._",
    );
  } else {
    const counts = findings.reduce((m, f) => ((m[f.severity] = (m[f.severity] ?? 0) + 1), m), {} as Record<string, number>);
    out.push(
      "# Design lint",
      "",
      `**${findings.length} finding(s)** — ${counts.error ?? 0} error · ${counts.warning ?? 0} warning · ${counts.info ?? 0} info`,
      "",
      "| line | sev | rule | issue |",
      "|---|---|---|---|",
      ...findings.map((f) => `| ${f.line} | ${ICON[f.severity]} | \`${f.rule}\` | ${f.message} |`),
      "",
      "## Fixes",
      ...findings.map((f) => `- **L${f.line} \`${f.rule}\`:** ${f.fix}${f.doc ? ` → get_design_doc("${f.doc}")` : ""}`),
      "",
      "_Regex/tag-scanner based — high-signal but not exhaustive, and it cannot see values that arrive via props or a spread. A fast design-time pass, not a replacement for a full review or a real a11y audit (axe/keyboard/screen-reader)._",
    );
  }
  out.push("", ...renderNotVisibleSection(LINT_PREAMBLE, LINT_NOT_VISIBLE, LINT_CLOSING));
  return { text: out.join("\n"), structured: auditStructuredFrom({ findings, notVisible: LINT_NOT_VISIBLE }) };
}

// ── audit reports ────────────────────────────────────────────────────────────

/**
 * The structured half of an audit, built from the findings array the report is
 * built from. Kept separate from `assembleAuditReport` because an auditor may
 * need this half without adopting that function's report layout — four of them
 * have their own, and changing nine tools' markdown to share one renderer is a
 * different change than giving them all one machine contract.
 */
export function auditStructuredFrom(input: {
  findings: Array<LintFinding & { file?: string }>;
  notVisible: string[];
  file?: string;
}): AuditStructured {
  const { findings, notVisible } = input;
  return {
    findings: findings.map((f): AuditFinding => {
      const file = f.file ?? input.file;
      return {
        rule: f.rule,
        severity: f.severity,
        message: f.message,
        fix: f.fix,
        doc: f.doc ?? "",
        ...(file ? { file } : {}),
        line: f.line,
      };
    }),
    summary: {
      error: findings.filter((f) => f.severity === "error").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
    notVisible,
  };
}

/**
 * The markdown rendering of the same `notVisible` array the structured half
 * carries. One array, two renderings: a disclosure list typed separately from
 * the field that reports it will drift, and when it does neither reader can
 * tell which one is lying.
 */
export function renderNotVisibleSection(
  preamble: string,
  notVisible: string[],
  closing: string,
): string[] {
  return [
    "## Not visible to this audit",
    "",
    preamble,
    "",
    ...notVisible.map((entry) => `- ${entry}`),
    "",
    closing,
  ];
}

/**
 * Assemble one audit into its two registers at once.
 *
 * `securityReport` and `genericReport` each build their markdown by hand, and
 * that was fine while markdown was all they returned. The two auditors that
 * declare an `outputSchema` return a second representation of the *same*
 * findings, and two hand-built representations of one thing drift — a summary
 * that disagrees with its own findings, or a "Not visible" section that lists
 * one limitation in prose and another in the array, is precisely the silent
 * wrongness these tools exist to catch in other people's code. So both come out
 * of one function, counted once and rendered twice.
 *
 * The path travels as data and is folded into the prose here, never recovered
 * from it. An earlier version did the reverse — the callers prefixed the
 * message with `path: ` for the prose and this function split it back out on
 * the first `": "` — and a file legitimately named `chapter 2: the fall.html`
 * broke the split, silently dropping `file` from every finding in that file.
 * The prose still reads the way `securityReport`'s does, with the path folded
 * into the message (a reader takes one line in at a glance, and `(line 12)`
 * beside `app/page.tsx:12` puts the same number in their eye twice), but that
 * is now a rendering decision rather than a channel.
 *
 * Findings whose path is already inside their message — `seoConfigRules` writes
 * `robots.txt: …` itself, and a project-wide claim is attributed to
 * `configuration:` rather than to any file — simply arrive with no `file`, and
 * nothing here goes looking for one.
 */
export function assembleAuditReport(input: {
  heading: string;
  /** What was read — the file count, the caps, the skips. */
  scanned: string;
  /** Anything else that belongs above the counts, e.g. coverage. */
  notes?: string[];
  /** Each finding, carrying its own path where the caller knows one. */
  findings: Array<LintFinding & { file?: string }>;
  /** The opening sentence of the "Not visible to this audit" section. */
  preamble: string;
  notVisible: string[];
  /** The closing sentence, which must never imply a measurement or a ranking. */
  closing: string;
  /** Snippet mode: the filename the caller named, if any. */
  file?: string;
}): AuditReport {
  const { findings, notVisible } = input;

  const summary = {
    error: findings.filter((f) => f.severity === "error").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  const lines: string[] = [`# ${input.heading}`, "", input.scanned, ""];
  for (const note of input.notes ?? []) lines.push(note, "");
  lines.push(`**${summary.error} error · ${summary.warning} warning · ${summary.info} info**`, "");

  if (!findings.length) {
    lines.push("No findings in what was read.", "");
  } else {
    for (const group of [
      { title: "Errors", items: findings.filter((f) => f.severity === "error") },
      { title: "Warnings", items: findings.filter((f) => f.severity === "warning") },
      { title: "Notes", items: findings.filter((f) => f.severity === "info") },
    ]) {
      if (!group.items.length) continue;
      lines.push(`## ${group.title}`, "");
      for (const f of group.items) {
        lines.push(`- **${f.rule}** (line ${f.line}) — ${f.file ? `${f.file}: ` : ""}${f.message}`);
        lines.push(`  - Fix: ${f.fix}`);
        if (f.doc) lines.push(`  - Read: \`get_design_doc("${f.doc}")\``);
      }
      lines.push("");
    }
  }

  lines.push(...renderNotVisibleSection(input.preamble, notVisible, input.closing));

  const structured = auditStructuredFrom({ findings, notVisible, file: input.file });

  return { text: lines.join("\n"), structured };
}
