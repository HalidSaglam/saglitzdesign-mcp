// Deterministic design linter for HTML / CSS / JSX / Tailwind snippets.
// Regex-based detection of the anti-patterns the craft docs warn about:
// hardcoded values, missing focus/alt/labels, killed outlines, div-soup, px fonts.
// Reports file-relative line numbers, severity, and a fix. Not a full parser —
// a fast, high-signal design-time check.

export interface LintFinding {
  line: number;
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  fix: string;
  doc?: string;
}

interface Rule {
  id: string;
  severity: LintFinding["severity"];
  test: (line: string, full: string) => boolean;
  message: string;
  fix: string;
  doc?: string;
}

const RULES: Rule[] = [
  {
    id: "hardcoded-color",
    severity: "warning",
    test: (l) => /(color|background|border|fill|stroke)\s*[:=]\s*["']?#([0-9a-fA-F]{3,8})\b/.test(l) || /["']#([0-9a-fA-F]{6})["']/.test(l) && /style|className|css/.test(l),
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
    id: "outline-none",
    severity: "error",
    test: (l) => /outline\s*:\s*(none|0)\b/.test(l) && !/focus/.test(l),
    message: "outline removed without a visible replacement — kills keyboard focus visibility.",
    fix: "Never remove focus indication. Use :focus-visible with a ring/outline instead.",
    doc: "accessibility",
  },
  {
    id: "img-no-alt",
    severity: "error",
    test: (l) => /<img\b/.test(l) && !/\balt\s*=/.test(l),
    message: "<img> without an alt attribute — invisible/opaque to screen readers.",
    fix: 'Add alt="" for decorative images, or a descriptive alt for meaningful ones.',
    doc: "accessibility",
  },
  {
    id: "clickable-div",
    severity: "warning",
    test: (l) => /<div\b[^>]*\bonClick\b/.test(l) && !/role\s*=/.test(l),
    message: "Clickable <div> without a role — not focusable or announced as interactive.",
    fix: "Use a <button> (or add role=\"button\", tabIndex={0}, and key handlers).",
    doc: "accessibility",
  },
  {
    id: "icon-button-no-label",
    severity: "warning",
    test: (l) => /<button\b(?![^>]*aria-label)[^>]*>\s*(<(svg|Icon|[A-Z][A-Za-z]*Icon)\b|\{)/.test(l) && !/>[^<]{2,}</.test(l),
    message: "Icon-only <button> without an accessible name.",
    fix: 'Add aria-label="…" (or visually-hidden text). See iconography.',
    doc: "iconography",
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

/** Lint a code snippet; returns findings sorted by line then severity. */
export function designLint(code: string): LintFinding[] {
  const lines = code.split(/\r?\n/);
  const findings: LintFinding[] = [];
  const sevOrder = { error: 0, warning: 1, info: 2 };
  lines.forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    for (const r of RULES) {
      try {
        if (r.test(line, code)) {
          findings.push({ line: i + 1, severity: r.severity, rule: r.id, message: r.message, fix: r.fix, doc: r.doc });
        }
      } catch {
        /* skip rule error */
      }
    }
  });
  return findings.sort((a, b) => a.line - b.line || sevOrder[a.severity] - sevOrder[b.severity]);
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
    "_Regex-based, high-signal but not exhaustive — a fast design-time pass, not a replacement for a full review or a real a11y audit (axe/keyboard/screen-reader)._",
  ];
  return out.join("\n");
}
