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

export function designLintReport(code: string): string {
  const findings = designLint(code);
  if (findings.length === 0) {
    return "# Design lint\n\n✅ No design anti-patterns detected in this snippet.\n\n_Static checks only (hardcoded values, focus/alt/labels, semantics). Still verify visually and with a keyboard + screen reader. See design_review_checklist for a full audit._";
  }
  const counts = findings.reduce((m, f) => ((m[f.severity] = (m[f.severity] ?? 0) + 1), m), {} as Record<string, number>);
  const out: string[] = [
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
  ];
  return out.join("\n");
}

// ── audit reports ────────────────────────────────────────────────────────────

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
