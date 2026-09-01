// Detects deceptive-pattern tells that are facts about the source.
//
// The governing rule is the same as audit_generic_design: only facts become
// rules. "The decline button says 'No thanks, I hate saving money'" is a fact.
// "This checkout is manipulative" is a judgement and belongs to
// design_review_checklist. A genuine last-two-items inventory still matches
// `only 2 left` — the finding names the phrase, not the warehouse.

import {
  type LintFinding,
  type AuditReport,
  auditStructuredFrom,
  renderNotVisibleSection,
} from "./lint.js";

const lineOf = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

const CONFIRMSHAMING =
  /no thanks,?\s+i\s+(hate|don['’]t want|prefer to (?:miss|skip)|would rather)/gi;
const ONLY_LEFT = /\bonly\s+\d+\s+left\b/gi;
const EXPIRES_IN = /\bexpires?\s+in\s+\d+\s*(?:seconds?|secs?|minutes?|mins?)\b/gi;
const LIVE_BINDING = /\$\{|\{\{|{\s*[a-zA-Z]/;
const MARKETING_NEAR =
  /\b(newsletter|marketing|promotional|updates from us|receive emails?)\b/i;
const CHECKBOX = /<input\b[^>]*>/gi;
const ACCEPT_ALL = /\baccept all\b/i;
const REJECT_ALL = /\b(reject all|decline all|refuse all)\b/i;

function windowAround(src: string, index: number, span: number, radius = 160): string {
  return src.slice(Math.max(0, index - radius), Math.min(src.length, index + span + radius));
}

export function ethicalRules(code: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const add = (index: number, severity: LintFinding["severity"], rule: string, message: string, fix: string) =>
    findings.push({ line: lineOf(code, index), severity, rule, message, fix, doc: "ethical-design" });

  for (const re of [CONFIRMSHAMING]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      add(m.index, "warning", "confirmshaming",
        `Decline copy guilt-trips the reader: "${m[0]}".`,
        `Use a neutral decline: "No thanks". See ethical-design.`);
    }
  }

  CHECKBOX.lastIndex = 0;
  let box: RegExpExecArray | null;
  while ((box = CHECKBOX.exec(code)) !== null) {
    const tag = box[0];
    if (!/\btype=["']checkbox["']/i.test(tag)) continue;
    if (!/\bchecked\b/i.test(tag) && !/\bdefaultChecked\b/.test(tag)) continue;
    const around = windowAround(code, box.index, tag.length);
    if (!MARKETING_NEAR.test(around)) continue;
    add(box.index, "warning", "prechecked-marketing",
      `A marketing/newsletter checkbox is pre-checked.`,
      `Default to unchecked. GDPR and CPRA treat pre-ticked marketing as invalid consent.`);
  }

  for (const re of [ONLY_LEFT, EXPIRES_IN]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (LIVE_BINDING.test(windowAround(code, m.index, m[0].length, 40))) continue;
      add(m.index, "info", "fake-urgency-copy",
        `Urgency/scarcity phrase with no live binding in the surrounding text: "${m[0]}".`,
        `Show a real count or deadline from data, or drop the phrase. See ethical-design.`);
    }
  }

  if (ACCEPT_ALL.test(code) && !REJECT_ALL.test(code)) {
    const at = code.search(ACCEPT_ALL);
    add(at < 0 ? 0 : at, "warning", "accept-without-reject",
      `The snippet offers "Accept all" and no equally-named reject ("Reject all" / "Decline all" / "Refuse all").`,
      `Put Reject all on the same layer, same weight. See ethical-design.`);
  }

  return findings;
}

export const ETHICAL_NOT_VISIBLE: string[] = [
  `**Nothing here is measured, and nothing is rendered.** No checkout is completed, no countdown is timed, no warehouse is queried, no consent banner is clicked. Every finding is a fact about a phrase or an attribute in the pasted snippet.`,

  `**Whether a scarcity or deadline claim is true.** \`only 2 left\` and \`expires in 5 minutes\` fire when those strings appear as literals. A store that really has two units, or a sale that really ends in five minutes, still matches — the finding names the phrase, not the inventory. A count interpolated from data (\`{stock}\`, \`\${remaining}\`) in the same window is skipped, which is a heuristic about nearby source, not a proof the number is live.`,

  `**A marketing opt-in that is pre-checked without the words this rule looks for.** \`prechecked-marketing\` needs a \`type="checkbox"\` carrying \`checked\` or JSX \`defaultChecked\`, and, within 160 characters, one of: newsletter, marketing, promotional, "updates from us", "receive email(s)". \`Remember me\` checked, a checked filter chip, and a checked "I agree to the terms" box stay silent — the last of those is a different legal question this tool does not answer. A checked state held only in JavaScript, with none of those attributes in the text, is invisible.`,

  `**Confirmshaming written as anything other than "No thanks, I …".** Guilt in a modal title, a toast, or "Are you sure you want to miss out?" is invisible. The matcher is the decline-button shape in ethical-design's confirmshaming row, not a sentiment model.`,

  `**A consent banner whose reject is named something this list does not include.** \`accept-without-reject\` looks for the literal "Accept all" and then for "Reject all", "Decline all" or "Refuse all". "No thanks", "Save preferences", and a reject control built from an icon with no of those names are invisible, so a banner can fail the symmetry test in ethical-design and still pass here.`,

  `**English-only literals, and only inside the pasted snippet.** There is no directory mode. A phrase in another language, a string loaded from a translation file, or a decline that arrives from a CMS at runtime is not in this text and is not checked. Pair with get_design_doc("ethical-design") and a human looking at the render.`,
];

const PREAMBLE =
  `This audit reads the pasted snippet as text. It does not load a page, complete a purchase, or decide whether a pattern is "dark" — only whether a named tell is present.`;

const CLOSING =
  `A clean result means none of these specific tells appeared in the snippet — not that the flow is honest, and not that a regulator would agree. Pair with get_design_doc("ethical-design") and a human looking at the render.`;

export function ethicalReport(code: string): AuditReport {
  const findings = ethicalRules(code);
  const out: string[] = ["# Ethical-design audit", ""];
  if (findings.length === 0) {
    out.push("✅ No named deceptive-pattern tells in this snippet.", "");
  } else {
    out.push("## Findings", "");
    for (const f of findings) {
      out.push(`- **${f.rule}** (line ${f.line}, ${f.severity}): ${f.message}`);
      out.push(`  - Fix: ${f.fix}`);
    }
    out.push("");
  }
  out.push("_Facts about the source — a phrase, a checked attribute — not a verdict on the business._");
  out.push("", ...renderNotVisibleSection(PREAMBLE, ETHICAL_NOT_VISIBLE, CLOSING));
  return {
    text: out.join("\n"),
    structured: auditStructuredFrom({ findings, notVisible: ETHICAL_NOT_VISIBLE }),
  };
}
