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

// ── grid track helpers ───────────────────────────────────────────────────────
//
// `grid-track-no-min` needs to tell a genuinely bare `1fr` apart from one
// already wrapped in `minmax(<not-auto>, 1fr)`: CSS Grid 1 §7.2.1 takes a
// track out of the automatic-minimum mechanic entirely once it carries an
// explicit, non-`auto` minimum, whatever that minimum's value — `minmax(0,
// 1fr)`, `minmax(200px, 1fr)` and `minmax(min(18rem, 100%), 1fr)` are all
// guarded; only `minmax(auto, 1fr)` (spec-equivalent to bare) and an
// unwrapped `1fr` are not. A regex can't find where a `minmax(...)` call
// ends when its own first argument nests parentheses — `min(18rem, 100%)`
// would close a naive `[^)]*` on its own inner `)` — so this walks the
// string counting paren depth instead of matching one.

/** Splits `s` on top-level commas only; a comma inside a nested `(...)` does not count. */
function topLevelSplit(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

/**
 * True if `line` contains at least one `minmax(...)` call whose first
 * argument is not the literal `auto` — an explicit minimum of any value,
 * which guards the whole track regardless of what that value is. The whole
 * *line* is what this reports on, not the individual track: a line with one
 * guarded track and one genuinely bare one (`minmax(0, 1fr) 1fr`) still
 * returns true, and `grid-track-no-min` stays silent on the bare track too.
 * That is a known, disclosed false negative — see `LINT_NOT_VISIBLE` — kept
 * because parsing the track list into individual tracks is a full grammar
 * this linter does not implement.
 *
 * Both the function name and the `auto` keyword are matched case-
 * insensitively on purpose, unlike everything else on this rule's path
 * (the property name, `1fr`, and the `<img>` gate are all case-sensitive,
 * which is a *disclosed silence* — see `LINT_NOT_VISIBLE`). That is a
 * deliberate asymmetry, not an oversight: CSS function and keyword names
 * are themselves case-insensitive by spec, so `MINMAX(200px, 1fr)` and
 * `minmax(200px, 1fr)` mean the same thing, and grading them differently
 * would be a *false positive* the first time this rule met real-world caps
 * — which is exactly what shipped before this comment was written:
 * `/minmax\s*\(/` with no `i` flag failed to recognise `MINMAX(200px,
 * 1fr)` as guarded at all, so a correctly-floored track written in caps
 * was reported as bare. A silence from case (a rule that should fire and
 * doesn't) is disclosed elsewhere in this file; a rule crying wolf because
 * of case is a defect, and this is the fix for it. Matching `auto` the same
 * way keeps the two checks inside this one function agreeing with each
 * other: recognising `MINMAX(` case-insensitively while still comparing its
 * argument to the lowercase literal `"auto"` would silence `MINMAX(AUTO,
 * 1fr)` — a track exactly as unguarded as a bare one — as if it were
 * genuinely floored.
 */
function hasExplicitMinmaxFloor(line: string): boolean {
  const open = /minmax\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = open.exec(line))) {
    const argStart = m.index + m[0].length;
    let depth = 1;
    let j = argStart;
    while (j < line.length && depth > 0) {
      if (line[j] === "(") depth++;
      else if (line[j] === ")") depth--;
      j++;
    }
    const inner = line.slice(argStart, depth === 0 ? j - 1 : j);
    if (topLevelSplit(inner)[0]?.trim().toLowerCase() !== "auto") return true;
    open.lastIndex = j;
  }
  return false;
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
  {
    id: "grid-track-no-min",
    severity: "info",
    // CSS Grid Level 1 §7.2.1: a <flex> outside minmax() "implies an automatic
    // minimum (i.e. minmax(auto, <flex>))". That auto minimum is defined (also
    // §7.2.1) as "the largest minimum size (specified by min-width/min-height)
    // of the grid items occupying the grid track", and §6.6 decides when that
    // resolves to the item's content-based minimum rather than zero — the
    // conditions are the item's own overflow, whether the track it spans has
    // an `auto` min sizing function, and whether it spans a flexible track
    // too. None of that is readable from the declaration, which is why this
    // is `info` and why LINT_NOT_VISIBLE says so rather than promising an
    // overflow. `minmax(0, 1fr)` removes the condition entirely at no cost;
    // src/layout.ts already emits that form. Any explicit non-`auto` first
    // argument does the same regardless of its value (`hasExplicitMinmaxFloor`
    // handles `minmax(200px, 1fr)` and a nested `minmax(min(18rem, 100%),
    // 1fr)` alike) — only `minmax(auto, 1fr)`, which is spec-equivalent to a
    // bare track, is deliberately left un-guarded so it still fires.
    test: (l, full) =>
      /grid-template-(columns|rows)\s*:[^;]*(^|[\s,(])1fr/.test(l) &&
      !hasExplicitMinmaxFloor(l) &&
      /<img[\s>]/.test(full),
    message:
      "A bare `1fr` track resolves to `minmax(auto, 1fr)` (CSS Grid 1 §7.2.1); its automatic " +
      "minimum is the largest min-width/min-height of the items in the track, and whether that " +
      "equals the item's content-based minimum is governed by §6.6. An item with a large " +
      "intrinsic size can hold the track above its `fr` share. This snippet renders an image.",
    fix: "Write `minmax(0, 1fr)` for tracks that carry images or other wide intrinsic content.",
    doc: "visual-craft-standards",
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

/**
 * "`a`, `b` and `c`" — generated from `LINE_RULES` rather than hand-typed, so
 * a disclosure sentence that names every line rule (or counts them) cannot
 * drift from the array the way `hardcoded-color` … `magic-number-radius`
 * drifted the day `grid-track-no-min` shipped as a seventh: the two
 * sentences below said "the six line rules" while `LINE_RULES.length` was
 * already 7, and nothing failed. This is the interpolation half of that
 * fix — the same pattern `UI_EXTENSIONS` uses in `project.ts` to keep a
 * restated list from going stale — used here because both affected
 * sentences quote the full member list already; a count-only assertion in
 * a test would catch drift without saying which rule caused it.
 */
function backtickList(ids: string[]): string {
  const items = ids.map((id) => "`" + id + "`");
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

// The one line rule whose case-sensitivity is a *partial* exception rather
// than the rule, documented at its own disclosure sentence below: `positive-
// tabindex`'s HTML-attribute alternative carries the case-insensitive flag,
// so `TABINDEX="5"` fires where `tabIndex={5}` does not. Every other line
// rule — `grid-track-no-min`'s own literal text (property name, `1fr`, the
// `<img>` gate) included, per `1FR`, `GRID-TEMPLATE-COLUMNS` and `<IMG>` all
// drawing nothing — is fully case-sensitive on the text it grades directly.
// (`grid-track-no-min`'s internal `minmax()` guard is a separate matter: it
// is deliberately case-*insensitive*, fixed after shipping case-sensitive —
// see that rule's own comment and disclosure sentence — but that guard is
// not itself a *rule* in this array, so it does not belong in this Set.)
//
// `LINE_RULES.length` on the line below is derived, but this Set itself is
// not: nothing here checks it against the actual `/i` flags on each rule's
// own regexes, and that was tried before being ruled out. `test.toString()`
// inspection was written and run against all seven current rules and it
// misclassified one of them: `fixed-height-text`'s test function contains a
// `/…/i` regex, so a scan for "does this rule's source contain an i flag"
// says "case-insensitive" — but that flag sits on the `icon|avatar|line|
// divider|border` *suppressor*, not on the `height:` pattern that actually
// decides the finding, so the rule is correctly case-sensitive despite the
// naive scan's answer. The same blind scan would also miss
// `grid-track-no-min`'s own case-insensitive `minmax()` handling entirely,
// because that logic lives in `hasExplicitMinmaxFloor`, a function the
// rule's `test` closure calls by reference — `.toString()` on the closure
// does not inline the body of a function it merely references. Both
// failures are the same shape: a syntactic scan cannot tell a decisive
// regex from a suppressor, or see through a function reference, so it
// cannot be trusted to answer "is this rule case-sensitive" without the
// judgment a human applies when reading what a regex actually *decides*.
// Building a check that encoded that judgment independently of this Set
// would just be this Set again, wearing a different name. So: this Set
// stays hand-maintained, verified only by (a) a human reading each rule's
// decisive regex flags directly, the way this round's review just did for
// all seven, and (b) the demonstrating tests in `tests/lint.test.ts` (the
// per-rule loop and `grid-track-no-min`'s own case-sensitivity test) that
// exercise the actual claim behaviourally. Adding a case-insensitive rule
// — or changing an existing one's case sensitivity — means updating both
// this Set *and* one of those tests by hand; neither update alone is
// caught by anything else in this file.
const CASE_INSENSITIVE_LINE_RULES = new Set(["positive-tabindex"]);
const CASE_SENSITIVE_LINE_RULE_COUNT = LINE_RULES.length - CASE_INSENSITIVE_LINE_RULES.size;

export const LINT_NOT_VISIBLE: string[] = [
  "**Nothing here is measured, and nothing is rendered.** No contrast ratio is computed, no tap target sized, no spacing rhythm checked, no focus order walked, no screen reader run. `.a { color: #777777; background: #888888; }` comes back as a single `hardcoded-color` warning and says nothing whatever about the contrast between the two, and `padding: 13px 27px` draws nothing at all. Every finding above is a fact about the *text* of the snippet.",
  "**Anything declared in another file** — a class, a design token, a custom property, a parent component's props. `<div class=\"btn\">Go</div>` draws nothing regardless of what `.btn` does in the stylesheet. On `outline-none` that costs in both directions: `.btn { outline: none; }` handed over on its own is reported as an error even when the `:focus-visible` ring replacing it lives in a file this call never saw, and a JSX snippet whose `outline: none` sits in that stylesheet is silent. When the answer depends on both, lint the markup and the CSS in one snippet.",
  "**`outline-none`, which has four demonstrated causes of silence, and only one of them is \"no focus ring was removed\".** Each isolated and run: (1) the snippet removes no ring — `.a { color: red; }`. (2) Something in it looks like a replacement. That check is snippet-wide and selector-blind, so one `:focus` rule setting an outline, box-shadow, border or `--ring` — or one `focus:ring-*` utility — switches the rule off for every `outline: none` in the text, unrelated selectors included: `.a:focus { outline: 2px solid blue; }` beside `.b { outline: none; }` reports nothing, and `.b` really is left with no indicator. (3) The removal is spelled a way the pattern does not carry. It matches `outline: none`, `outline: 0` and the `outline-none` utility, so `outline-style: none`, `outline-width: 0`, `outline: transparent`, `outline: 2px solid transparent`, the `outline-0` utility and `outline: 0px` (the word boundary fails between the `0` and the `p`) each remove the ring and draw nothing. (4) The deliberate pointer-focus exemption: `a:focus:not(:focus-visible) { outline: none; }` and the `not-focus-visible:outline-none` variant are the recommended way to drop a ring for the mouse while keeping it for the keyboard, and are passed over on purpose. This is one of only two `error` rules here — `img-no-alt` is the other — and a missed ring is the direction the gaps cost in.",
  "**A tag that carries a spread.** `img-no-alt`, `clickable-div`, `icon-button-no-label` and `control-no-label` all stand down on any element with `{...props}`, because the attribute they would report as missing may be inside it. `<img {...props} src=\"a.png\">`, `<div {...rest} onClick={go}>`, `<input {...register(\"x\")} />` and `<button {...p}><Icon/></button>` each draw nothing. The alternative is a fabricated finding, so the miss is deliberate — but it means a component that forwards its props is largely unreadable to these four rules. It stands down those four rules on that element and nothing more: `outline-none` still fires on a spread element, and a line rule still reads the line it is written on.",
  "**A value that only exists at run time — and the two rule families split on which way that costs.** The line rules read literal text, so a hex assigned to a variable and used as `style={{ color: c }}` draws no `hardcoded-color`, and `tabIndex={n}` draws no `positive-tabindex` however large `n` is at run time (`tabIndex={5}` written out does fire). `icon-button-no-label` errs the other way: it measures a button's inner text after erasing every `{…}` expression, so `<button>{label}</button>` — a properly labelled button — is reported as icon-only. Erasure is only half of that rule's misjudgement; the other half is the threshold it applies to whatever survives. With no `aria-label`, `aria-labelledby`, `title` or spread to name the button, fewer than two letters or digits fires, so `<button>3</button>`, `<button>×</button>` and `<button>好</button>` are reported as unlabelled — `×` is neither a letter nor a digit, and a single CJK character is a whole word — while `<button>Go</button>`, `<button>12</button>` and `<button>好的</button>` pass. An emoji is not a letter or a digit either, so `<button>🔍</button>` — the commonest real icon button there is — draws the warning, and so does `<button>🔍🔍</button>`; `<button>🔍 Search</button>` does not. Any one of those four names silences it whatever the text says — `<button title=\"Save\">×</button>` is quiet. Read this rule against prop-driven, symbolic and non-Latin buttons as a question, not a defect.",
  "**Which element a tag rule is really grading — the match is on the literal name, lowercased, and on nothing else.** That cuts both ways and neither way is about what finally renders. A component **is** graded whenever its name happens to spell an element: `<Button onClick={go}><Icon/></Button>` draws `icon-button-no-label`; `<Input type=\"email\" />`, `<Select>` and `<Textarea />` draw `control-no-label`; `<Div>`, `<Span>`, `<Li>` and `<Section onClick={go}>` draw `clickable-div`; `<Image src=\"/a.png\" />` and `<IMG>` draw `img-no-alt`. Those are usually false, because the wrapper is supplying the very `alt`, `aria-label`, `id` or `role` the rule wants and this call cannot see its implementation — `<Button aria-label=\"Save\">` goes quiet only because the name is written on *this* line. Every other component name is invisible in the other direction: `<Avatar src=\"/a.png\" />`, `<IconButton />`, `<TextField />` and `<Pressable onClick={go}>` render exactly the elements these rules are about and draw nothing *from the four rules keyed to element names*. The other seven rules do not consult a tag name at all, so a wrapper is not silent overall: the line rules read the line it is written on, and `<Avatar style={{ color: \"#ff0000\" }} />` reports a hardcoded colour; and `outline-none` scans the snippet's text with no reference to any element, so `<Avatar className=\"outline-none\" />` reports a removed focus ring. The plain-HTML lists are narrow too — `clickable-div` is `div`, `span`, `li`, `section` and so passes `<a onClick>`, `<p onClick>`, `<td onClick>` and `<article onClick>`; `icon-button-no-label` is `<button>` and not `<a role=\"button\">`; `control-no-label` is `input`, `select`, `textarea`.",
  "**A click handler written in a syntax `clickable-div` does not read.** It looks for an attribute named `onClick`, and HTML's `onclick` satisfies it too. Demonstrated misses: Vue's `<div @click=\"go\">` and `<div v-on:click=\"go\">`, Angular's `<div (click)=\"go()\">`, Alpine's `<div x-on:click=\"go\">` and `<div @click.prevent=\"go\">`, and Svelte 4's `<div on:click={go}>` — each draws nothing, and these are stacks the shared scanner reads elsewhere in this codebase, so the gap is not a scope decision. Current Svelte is *not* in that list: Svelte 5 replaced the event directive with an event attribute, `<div onclick={go}>`, which this rule does read; what it misses on Svelte is the legacy `on:` form that Svelte 5 still supports for backwards compatibility and that existing components are full of. Nor is the handler spelling the only way a clickable container escapes in one of these templates — three separate conditions do it as well, each run inside a `<template>`: the element must be `div`, `span`, `li` or `section`, so `<article onclick=\"go()\">` is silent; it must carry no `role`, so `role=\"button\"` silences it; and it must carry no spread, which Vue's `v-bind=\"attrs\"` counts as.",
  "**A namespaced element, which is graded as its prefix.** `:` is not a tag-name character in the shared scanner, so `<svg:image href=\"…\">` is read as an element called `svg`, `<xhtml:img>` as one called `xhtml` and `<html:input>` as one called `html` — none of which is on any rule's list, so all three pass silently while their unprefixed spellings fire. What this does *not* cost is a Svelte head: no rule here looks for a `<head>` element at all, so `<svelte:head>` is merely an unrecognised tag, and an `<img>` written inside one is graded exactly as it would be anywhere else in the file.",
  "**Commented-out code — and the two rule families disagree about it.** The line rules skip a line whose first non-space characters are `//`, `*` or `/*`; the tag rules mask nothing. So `<!-- <img src=\"a.png\"> -->` reports `img-no-alt`, `{/* <img src=\"a.png\"> */}` reports it too, and `<!-- .b { outline: none } -->` reports `outline-none`, while `// color: #ff0000;` is skipped. The line-rule guard is about where the *line* starts, so `color: #ff0000; // fix later` still fires, and inside a block comment whose continuation lines carry no leading `*` the line rules fire normally. Dead code draws live findings here — and the traffic runs the other way too, which is easier to miss: commenting out a *focus replacement* silences a real one, because `outline-none`'s replacement check reads the raw text of the snippet. `<!-- .a:focus { outline: 2px solid blue; } -->` above a live `.b { outline: none; }` reports nothing at all.",
  "**A CSS declaration split across lines.** " + backtickList(LINE_RULES.map((r) => r.id)) + " are single-line regexes run once per line, so `font-size:` followed by `14px` on the next line, a `grid-template-columns` value split the same way, or `color:` followed by `#ff0000`, draws nothing where the same declaration on one line draws a warning. The five tag rules do not share this blind spot — they scan the whole snippet and map the offset back to a line number, so a Prettier-wrapped `<img\\n  src=…\\n/>` is graded exactly like the one-line form.",
  "**Spellings a line rule was not written for.** `hardcoded-color` wants a `#` hex directly after `color`, `background`, `border`, `fill` or `stroke`, or a quoted six-digit hex on a line that mentions style/className/css — so `rgb(255, 0, 0)`, `hsl()`, `oklch()`, a named `red`, a `--brand: #ff0000` custom-property *definition*, and a hex inside `box-shadow` are all invisible — but not every custom property is, and the difference is not one a reader would guess: the pattern wants `color`, `background`, `border`, `fill` or `stroke` immediately before the colon, so `--brand-color: #ff0000` fires while `--brand: #ff0000` does not, on nothing but whether the token name happens to end in a word the rule watches. `px-font-size` reads only the CSS `font-size:` spelling: `style={{ fontSize: \"14px\" }}` and the `font: 14px/1.5` shorthand draw nothing. `important-overuse` reads the literal `!important`, so Tailwind's important modifier — `className=\"!text-red-500\"` — is invisible where `color: red !important` fires. That is the pattern: Tailwind's arbitrary-value syntax (`bg-[#ff0000]`, `text-[14px]`, `rounded-[6px]`, `h-[40px]`), its scale utilities (`h-10`) and its important modifier are where these things are actually written in a Tailwind file, and are exactly where these rules are blindest. Case is a spelling too, and " + CASE_SENSITIVE_LINE_RULE_COUNT + " of the " + LINE_RULES.length + " line rules are case-sensitive on the literal text: `HEIGHT: 40px`, `COLOR: #ff0000`, `FONT-SIZE: 14px`, `BORDER-RADIUS: 6px`, `!IMPORTANT` and `1FR` each draw nothing where the lowercase form fires. `hardcoded-color` is case-sensitive per *branch* rather than per rule, which is worth knowing before trusting either result: bare CSS `COLOR: #ff0000` is silent, while `style={{ COLOR: \"#ff0000\" }}` fires — it reaches the second branch, which looks for a quoted six-digit hex on a line mentioning style/className/css and never reads the property name at all. The hex's own case is read by neither branch: `#FF0000` fires in both places. `positive-tabindex` is the partial exception, and only on one of its two alternatives: the HTML-attribute form carries the case-insensitive flag, so `TABINDEX=\"5\"`, `TabIndex=\"5\"` and the unquoted `TABINDEX=5` all fire, while the JSX brace form is matched case-sensitively under the single spelling `tabIndex={5}` — `TABINDEX={5}`, `TabIndex={5}` and `tabindex={5}` are silent. `grid-track-no-min` is the only line rule that is case-sensitive on *some* of its own literal text and not on other parts, by design rather than accident: the property name and `1fr` are case-sensitive like the rest — `GRID-TEMPLATE-COLUMNS: 1fr 1fr;` and `1FR` both draw nothing — and so is the `<img>` gate: `<IMG src=\"a.png\">` elsewhere in the same snippet does not satisfy it, even though that same tag, same case, draws `img-no-alt` from the source rules below. But the `minmax()` guard inside it is deliberately case-*insensitive* — `MINMAX(200px, 1fr)` and `MINMAX(AUTO, 1fr)` are read exactly like their lowercase spellings — because getting this backwards was a real, shipped defect rather than a silence: a case-sensitive guard let a correctly-floored `MINMAX(200px, 1fr)` track through as if it were bare, which is this rule crying wolf rather than staying quiet, and crying wolf gets fixed rather than disclosed.",
  "**What `fixed-height-text` and `magic-number-radius` are actually reading, which is not what their names say.** `fixed-height-text` does not mean *fixed*: its pattern is a word-boundary `height:` followed by two or more digits and a literal `px`. Because `-` is a word boundary, `min-height: 40px` and `max-height: 200px` both draw the note — including the `min-height` + padding its own fix text recommends, which means the rule flags its own advice. (`line-height: 40px` escapes only by accident, because `line` is on the suppressor list below.) Because of the other half, a fixed height stated any other way is silent: `height: 9px` is one digit, and `height: 40rem`, `height: 100%`, `height: 40vh` and even `height: 40.5px` are not `px` preceded by two digits. The unit is matched literally and in lower case, so `height: 40PX` and `height: 40Px` are silent as well, and so are `height: calc(40px + 1rem)` and the logical-property spelling `block-size: 40px`. Nothing but whitespace may sit between the colon and the digits, which is why `.a { height: \"40px\"; }` and `style={{ height: \"40px\" }}` are silent too — both are a lower-case `px` behind two digits, and the quote is in the way. Shapes demonstrated to fire include `height: 40px`, `height:40px`, `height :  40px`, `min-height: 40px` and `max-height: 200px` — and, because `--` ends in a word boundary, custom-property *definitions*: `:root { --header-height: 64px; }` draws the note, as do `--height`, `--card-height` and `--nav-height`. Read all of that as a sample rather than a closed list: what the pattern reads is a narrow slice of the ways a fixed height gets written, and the slice has ragged edges in both directions. Both rules are then dropped by a word anywhere on the line. `fixed-height-text` stands down when the line contains `icon`, `avatar`, `line`, `divider` or `border` as a *substring*, which is much wider than it reads: `.timeline`, `.headline` and `.inline-flex` all contain `line`, and `.a { height: 40px; border-radius: 4px; }` contains `border`, so none of those four draws the height note that `.card { height: 40px; }` draws — the fourth is not silent overall, it still reports its radius. `magic-number-radius` is dropped when `var(` or `rounded` appears anywhere on the line, so `.rounded-card { border-radius: 8px; }` is silent. Both suppressors are whole-line, so a densely written declaration block quietly switches them off — and they are not parallel, though they read as though they were: `fixed-height-text`'s suppressor is case-insensitive, so `.a { height: 40px; BORDER: 1px solid; }` is silent, while `magic-number-radius`'s is not, so `.ROUNDED-card { border-radius: 8px; }` fires where `.rounded-card` is silent. And `magic-number-radius` reads `border-radius` in whole pixels only, which cuts both ways: `border-radius: 0px` and `border-radius: 9999px` each draw the note although a squared corner and a pill are the two least ad-hoc radii there are, while `border-radius: 50%` and `border-radius: 0.5rem` draw nothing. It reaches custom properties on the same word-boundary quirk — `:root { --border-radius: 8px; }` fires, `--radius: 8px` does not.",
  "**Whether a label, a role or a name actually resolves.** `control-no-label` is satisfied by the mere *presence* of an `id` and never looks for the `<label for>` that would use it, so `<input id=\"email\">` with no label anywhere is silent, and so is `<label for=\"nope\">Email</label><input id=\"email\">` where the two do not match. It also has no notion of a wrapping label: `<label>Email <input type=\"email\"></label>`, which is correct, still draws the warning. `clickable-div` is satisfied by any `role` at all — `role=\"presentation\"` silences it — and never checks that the `tabIndex` and key handlers its own fix text asks for came with it. The two naming rules answer the same way: `img-no-alt` accepts `alt=\"image\"` and `alt=\"a.png\"`, and `icon-button-no-label` accepts `aria-label=\"button\"` and even `aria-label=\"\"` on an icon-only button. These four read an attribute's presence rather than its content, with one demonstrated exception in the other direction: `control-no-label` reads the *value* of `type` and exempts five of them — `hidden`, `submit`, `button`, `image` and `reset` draw nothing however unlabelled they are, while `text`, `email` and `checkbox` are graded. Otherwise it is presence that satisfies them, and these are the cases run: `alt=\"image\"`, `alt=\"a.png\"`, `aria-label=\"button\"`, `aria-label=\"\"`, an `id` with no matching `<label for>`, and `role=\"presentation\"`. So a silence from these four has at least four distinct causes — the attribute was present in one of those forms; or the element carries a spread, with no attribute at all; or its `type` is one of the five exempt values; or, for `icon-button-no-label`, the button simply has visible text, which is why `<button>Save</button>` is quiet. Their findings carry no guarantee either: the wrapping label two sentences up, `<Input type=\"email\" />` and `<button>{label}</button>` are correct markup that these rules report.",
  "**How many defects a snippet has.** At most one finding per rule per line: `<img src=a><img src=b><img src=c>` on a single line reports one `img-no-alt`, and `.a { color: #fff; background: #000; }` reports one `hardcoded-color`. The same two images on two lines report two. The summary counts findings, not defects, and it undercounts a minified or densely written file.",
  "**Whether a bare `1fr` track actually overflows — and four narrower things `grid-track-no-min` reads as a whole line of raw text, not as individual tracks, live CSS, or a scoped file.** §6.6's automatic-minimum conditions depend on the grid item's own properties — its overflow, whether the track it spans has an `auto` min sizing function, whether it shares that axis with a flexible track — and the declaration does not carry any of them, so a finding here is a robustness note, not a proven overflow. The guard itself is whole-line, not per-track: `hasExplicitMinmaxFloor` fires true the moment *any* `minmax(...)` call on the line has a first argument that is not `auto`, whatever that argument's value or shape — `minmax(0, 1fr)`, `minmax(200px, 1fr)` and a nested `minmax(min(18rem, 100%), 1fr)` all count — so `grid-template-columns: minmax(0, 1fr) 1fr` is one line with one genuinely guarded track and one genuinely bare one, and reports neither. That is a known false negative, kept because parsing the track list into individual tracks is a full grammar this linter does not implement — narrower coverage over a parser, not a silent gap. The shorthand `grid-template` property is not read at all — only the longhand `grid-template-columns`/`grid-template-rows` are — so `grid-template: \"a b\" 1fr / 1fr 1fr` draws nothing. The `<img>` gate is snippet-wide, not grid-scoped: it is satisfied by any `<img>` anywhere in the text handed to `design_lint`, so a bare-`1fr` grid with no image of its own still fires when an unrelated `<img>` sits elsewhere in the same snippet, and — the reverse of the same gap — a finding says nothing about which track, if any, the image it cites actually occupies. And the guard has no notion of a comment or a string: `grid-template-columns: 1fr /* minmax(200px, 1fr) */;` and `grid-template-columns: 1fr; content: \"minmax(200px, 1fr)\";` are both read as if the commented-out or quoted `minmax(200px, 1fr)` were a real, live guard on the same declaration, so a genuinely bare `1fr` on either line is silenced by text that never reaches the browser at all — the same family as the commented-out-code blind spot named above, on this rule specifically.",
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
