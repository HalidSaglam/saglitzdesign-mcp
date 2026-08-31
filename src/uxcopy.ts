// Deterministic UX-copy auditor.
// Readability (Flesch), sentence length, passive voice, jargon/filler, weak CTAs,
// and "you"-focus — the machine-checkable slice of UX writing. Flags phrases with
// fixes; grounded in ux-writing. Not a style oracle, a fast objective pass.

import { type LintFinding, type AuditReport, auditStructuredFrom, renderNotVisibleSection } from "./lint.js";

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}
function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}
function countSyllables(word: string): number {
  word = word.replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const m = word.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

const JARGON = ["leverage", "synergy", "utilize", "seamless", "seamlessly", "robust", "cutting-edge", "revolutionary", "best-in-class", "world-class", "frictionless", "turnkey", "empower", "unlock", "elevate", "supercharge", "next-generation", "state-of-the-art", "holistic", "paradigm", "disrupt", "innovative"];
const FILLER = ["just", "simply", "please note", "in order to", "very", "really", "actually", "basically", "literally", "of course", "obviously", "kindly"];
const WEAK_CTA = ["submit", "click here", "learn more", "read more", "here", "continue", "ok", "go", "enter"];
const STRONG_CTA_HINT = "Lead with a specific action verb tied to the outcome: 'Start free trial', 'Create account', 'Get the report', 'Send message'.";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Characters that extend a word list entry — a hyphen included, since entries
// like "cutting-edge" carry one internally. `\b` is wrong here: a hyphen is a
// non-word character, so it puts a boundary *inside* "non-cutting-edge" right
// before "cutting-edge" and the phrase reads as jargon when it's the opposite
// of jargon. Anything NOT in this class — space, punctuation, an underscore
// (markdown italics), string start/end — is a legitimate edge for an entry.
const ENTRY_EDGE = "[a-z0-9-]";

// A leading run of characters that are themselves never part of an entry —
// punctuation, a quote mark, an emoji, whitespace. Skippable before an
// anchored match because none of it is content: "👉 Go" and "\"Go\"" still
// begin with "Go" once the wrapper around it is set aside. It cannot eat an
// ENTRY_EDGE character, so it can never swallow real words on the way to a
// later one — "Please submit the form" still fails to start with "submit".
const LEADING_NOISE = `[^${ENTRY_EDGE.slice(1, -1)}]*`;

// One matcher for all three lists: an entry counts only when neither side of
// it continues into another ENTRY_EDGE character. `anchorStart` additionally
// requires the match to begin at position 0 (after any leading noise is set
// aside), which is what WEAK_CTA's startsWith behaviour becomes once it also
// needs a boundary *after* the match — "go" still opens "Go now", but no
// longer opens "Government portal", and now "👉 Go" and a quoted "Go" still
// count as beginning with "go" while "Learn more about our submit process"
// still does not begin with "submit".
function entryPattern(entry: string, anchorStart = false): RegExp {
  const esc = escapeRegExp(entry);
  const lead = anchorStart ? `^${LEADING_NOISE}` : `(?<!${ENTRY_EDGE})`;
  return new RegExp(`${lead}${esc}(?!${ENTRY_EDGE})`, "i");
}

// 1-based line of `index` within `src` — the same walk `lint.ts`'s own
// `lineOf` does, kept as a separate three-line copy here rather than an
// export from that module: nothing else in this file needs anything else
// `lint.ts` doesn't already hand it, and re-exporting one helper across a
// module boundary for one caller is one more coupling than the line is worth.
function lineOf(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === "\n") line++;
  return line;
}

export interface CopyMetrics {
  words: number;
  sentences: number;
  avgSentenceLen: number;
  fleschReadingEase: number;
  gradeLevel: number;
  passiveHits: string[];
  jargonHits: string[];
  fillerHits: string[];
  youCount: number;
  weCount: number;
  isLikelyCta: boolean;
  weakCta?: string;
}

export function analyzeCopy(text: string): CopyMetrics {
  const sents = sentences(text);
  const wds = words(text);
  const wordCount = wds.length || 1;
  const sentCount = sents.length || 1;
  const syllables = wds.reduce((n, w) => n + countSyllables(w), 0);

  const asl = wordCount / sentCount; // avg sentence length
  const asw = syllables / wordCount; // avg syllables/word
  const flesch = 206.835 - 1.015 * asl - 84.6 * asw;
  const grade = 0.39 * asl + 11.8 * asw - 15.59;

  const lower = text.toLowerCase();
  const passiveHits = (text.match(/\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b(\s+by\b)?/gi) ?? []).slice(0, 8);
  const jargonHits = JARGON.filter((j) => entryPattern(j).test(lower));
  const fillerHits = FILLER.filter((f) => entryPattern(f).test(lower));
  const youCount = (lower.match(/\b(you|your|you're|yours)\b/g) ?? []).length;
  const weCount = (lower.match(/\b(we|our|us|we're)\b/g) ?? []).length;

  const isLikelyCta = wordCount <= 5 && sentCount === 1;
  const trimmedLower = lower.trim();
  const weakCta = isLikelyCta ? WEAK_CTA.find((c) => entryPattern(c, true).test(trimmedLower)) : undefined;

  return {
    words: wordCount, sentences: sentCount, avgSentenceLen: Math.round(asl * 10) / 10,
    fleschReadingEase: Math.round(flesch), gradeLevel: Math.max(0, Math.round(grade * 10) / 10),
    passiveHits, jargonHits, fillerHits, youCount, weCount, isLikelyCta, weakCta,
  };
}

function readingBand(flesch: number): string {
  if (flesch >= 70) return "easy (aim for UI copy) ✅";
  if (flesch >= 60) return "plain — good";
  if (flesch >= 50) return "fairly hard";
  return "hard — simplify ⚠️";
}

export const UXCOPY_PREAMBLE =
  `Every check above matches a fact about the text it was handed — a word
from one of three fixed lists, a sentence boundary, a participle's ending. It
cannot see, and does not attempt to judge:`;

/**
 * What `audit_ux_copy` structurally cannot see, one entry per bullet in the
 * "Not visible to this audit" section it renders — the same split
 * `design_lint`, `audit_security` and the rest already make between a single
 * array and its two renderings (markdown here, `structuredContent` on the
 * wire), so the two can never say something different from each other.
 */
export const UXCOPY_NOT_VISIBLE: string[] = [
  `**Nothing here is measured, and nothing is rendered.** No usability session is run, no A/B result read, no reader's actual comprehension checked, nothing is recorded of it read aloud. Every number in the metrics table and every hit in \`jargonHits\`/\`fillerHits\`/\`weakCta\` is a fact about the text's shape and vocabulary — never about whether it works for the person reading it.`,

  `**Whether the text being audited is short UI copy at all, which this tool assumes and never checks.** Run over this repository's own knowledge base — 96 documents, README.md, and 8 skill files, 105 files in total — the three word lists drew 184 hits across 89 of them, almost none of it hype: \`knowledge/marketing/branding-identity.md:75\` reads "Don't: \"Leverage our best-in-class solution\" → Do: \"Ship your first campaign in 10 minutes.\"" — a sentence teaching a writer not to say "leverage" or "best-in-class" is itself flagged for both, because the tool has no notion of a quoted counter-example and no calibration for long-form prose at all. Point it at a paragraph of documentation instead of a button label or a toast, and the jargon/filler counts describe the vocabulary of careful technical writing, not a defect in it.`,

  `**Three closed, English-only word lists** — ${JARGON.length} jargon entries, ${FILLER.length} filler entries, ${WEAK_CTA.length} weak-CTA entries — matched with no synonym expansion and no other language. A hyped or weak word not on one of these three lists is invisible however hyped or weak it reads, and the same copy translated into Turkish, German or Japanese scores clean regardless of its actual jargon or filler content, because none of the three lists has a non-English entry.`,

  `**A multi-word filler entry split by a line break in the text it is checking.** \`FILLER\` stores \`"please note"\` and \`"in order to"\` as one literal string with a single interior space, so \`please\\nnote this.\` does not match \`please note\` — the entry's stored space and the text's actual newline are different characters. Demonstrated under both the pre-boundary substring match this tool used before and the boundary-anchored one it uses now: the boundary fix changed what counts as an edge around an entry, not how a multi-word entry is compared against the text it searches.`,

  `**A \`snake_case\` identifier, read as the word before its underscore.** \`ENTRY_EDGE\` treats an underscore as a non-content edge on purpose, so that markdown italics (\`_robust_\`) still reads as the word "robust" — the same rule reads "the just_click handler fires once." as containing the filler word "just", because \`just_click\`'s underscore is, to the matcher, exactly the same kind of boundary as the space in "just click".`,

  `**A dotted method or property chain, read as the end of a sentence.** The same boundary excludes \`.\` for the mirror reason — a sentence-ending period has to stay a valid edge everywhere else this tool reads prose — so "Call Robust.Init() before rendering." reports "robust" as jargon: the dot inside \`Robust.Init()\` reads exactly like the full stop that ends an ordinary sentence.`,

  `**A weak call to action longer than five words, or split into more than one sentence.** \`isLikelyCta\` is \`wordCount <= 5 && sentCount === 1\`; text outside that shape is never tested against \`WEAK_CTA\` at all, regardless of what it says. "Please click here to continue with your order" (seven words) and "Go. Now." (two sentences) both skip the check entirely.`,

  `**Syllables, counted by a heuristic rather than looked up.** \`countSyllables\` strips a trailing "es"/"ed"/silent "e" and then counts vowel-group clusters; it has no dictionary and no exception list, so it miscounts ordinary words — \`countSyllables("queue")\` returns 2, though "queue" is one syllable. Every Flesch reading-ease and grade-level number this tool reports is computed on counts like that one, not on verified syllables.`,

  `**Passive voice recognised only through a participle spelled with a trailing "-ed" or "-en".** The regex is \`\\b(is|are|was|were|be|been|being)\\s+\\w+(ed|en)\\b\`, so an irregular past participle spelled neither way is invisible to it: "The announcement was made this morning." reports zero passive-voice hits, because "made" ends in neither "ed" nor "en".`,
];

export const UXCOPY_CLOSING =
  `A clean result here means the text contains none of these specific,
listed words or shapes — not that the writing is good, and not that this is
the right register for where it will appear. Pair with
get_design_doc("ux-writing") and human judgment, and read the entries above
before pointing this at anything longer than a button label or a toast.`;

/**
 * The structured half of `audit_ux_copy`, in `design_lint`'s shape: one
 * finding per triggered check, carrying a rule id, a severity, the fact that
 * made it fire, and a fix — built off the exact same `CopyMetrics` the
 * markdown table above is built from, so the two can never disagree about
 * which checks fired. There is no `file` (this tool takes a pasted snippet
 * of copy, never a path) and `line` marks where in the audited text the
 * finding's evidence sits — the first flagged word or phrase for a
 * vocabulary hit, and the start of the text for a whole-text metric like
 * average sentence length or the you/we balance, which is not about any one
 * line.
 */
function uxCopyFindings(text: string, m: CopyMetrics): LintFinding[] {
  const findings: LintFinding[] = [];
  const add = (line: number, severity: LintFinding["severity"], rule: string, message: string, fix: string) =>
    findings.push({ line, severity, rule, message, fix, doc: "ux-writing" });

  if (m.avgSentenceLen > 20) {
    add(1, "warning", "long-sentences",
      `Average sentence length is ${m.avgSentenceLen} words, above the 20-word target.`,
      "Split into shorter sentences — one idea per sentence.");
  }
  if (m.fleschReadingEase < 60) {
    add(1, "warning", "hard-to-read",
      `Flesch reading ease is ${m.fleschReadingEase}, below the 60 target for UI copy.`,
      "Use shorter words and sentences; UI copy should read at roughly grade 6–8.");
  }
  if (m.passiveHits.length) {
    add(lineOf(text, text.indexOf(m.passiveHits[0])), "info", "passive-voice",
      `${m.passiveHits.length} passive-voice construction(s), e.g. "${m.passiveHits[0].trim()}".`,
      `Prefer active voice ("We sent it" → "You'll get it").`);
  }
  if (m.jargonHits.length) {
    add(lineOf(text, entryPattern(m.jargonHits[0]).exec(text)?.index ?? 0), "warning", "jargon-hype",
      `Jargon/hype word(s): ${m.jargonHits.join(", ")}.`,
      "Say the plain thing instead.");
  }
  if (m.fillerHits.length) {
    add(lineOf(text, entryPattern(m.fillerHits[0]).exec(text)?.index ?? 0), "info", "filler-words",
      `Filler word(s): ${m.fillerHits.join(", ")}.`,
      `Cut it — it weakens the sentence ("just", "simply" can also sound condescending).`);
  }
  if (m.weCount > m.youCount) {
    add(1, "info", "company-focused",
      `${m.weCount} "we"/"our" vs ${m.youCount} "you"/"your" — copy reads company-focused rather than user-focused.`,
      "Reframe around the user's benefit.");
  }
  if (m.weakCta) {
    add(1, "warning", "weak-cta",
      `CTA text is a weak call to action: "${m.weakCta}".`,
      STRONG_CTA_HINT);
  }
  return findings;
}

export function uxCopyReport(text: string): AuditReport {
  const m = analyzeCopy(text);
  const out: string[] = [
    "# UX-copy audit",
    "",
    "| metric | value | target |",
    "|---|---|---|",
    `| Words / sentences | ${m.words} / ${m.sentences} | — |`,
    `| Avg sentence length | ${m.avgSentenceLen} words | ≤ 20 ${m.avgSentenceLen <= 20 ? "✅" : "⚠️"} |`,
    `| Flesch reading ease | ${m.fleschReadingEase} | ≥ 60 (${readingBand(m.fleschReadingEase)}) |`,
    `| Reading grade level | ${m.gradeLevel} | ≤ 8 ${m.gradeLevel <= 8 ? "✅" : "⚠️"} |`,
    `| "you"/"your" vs "we"/"our" | ${m.youCount} vs ${m.weCount} | user-focused: you ≥ we ${m.youCount >= m.weCount ? "✅" : "⚠️"} |`,
    "",
  ];

  const issues: string[] = [];
  if (m.avgSentenceLen > 20) issues.push(`**Long sentences** (${m.avgSentenceLen} avg) — split them; one idea per sentence.`);
  if (m.fleschReadingEase < 60) issues.push(`**Hard to read** (Flesch ${m.fleschReadingEase}) — shorter words and sentences. UI copy should read at ~grade 6–8.`);
  if (m.passiveHits.length) issues.push(`**Passive voice** (${m.passiveHits.length}): ${m.passiveHits.slice(0, 4).map((s) => `"${s.trim()}"`).join(", ")} — prefer active ("We sent it" → "You'll get it").`);
  if (m.jargonHits.length) issues.push(`**Jargon / hype**: ${m.jargonHits.join(", ")} — say the plain thing instead.`);
  if (m.fillerHits.length) issues.push(`**Filler**: ${m.fillerHits.join(", ")} — cut; it weakens the sentence ("just", "simply" can also sound condescending).`);
  if (m.weCount > m.youCount) issues.push(`**Company-focused** (${m.weCount} "we" vs ${m.youCount} "you") — reframe around the user's benefit.`);
  if (m.weakCta) issues.push(`**Weak CTA** ("${m.weakCta}") — ${STRONG_CTA_HINT}`);

  if (issues.length) {
    out.push("## Issues", ...issues.map((i) => `- ${i}`), "");
  } else {
    out.push("✅ No copy issues flagged — clear, active, user-focused.", "");
  }
  out.push("_Objective checks only (readability, voice, jargon, CTA). They don't judge tone-fit or brand voice — pair with get_design_doc(\"ux-writing\") and human judgment._");
  out.push("", ...renderNotVisibleSection(UXCOPY_PREAMBLE, UXCOPY_NOT_VISIBLE, UXCOPY_CLOSING));

  const findings = uxCopyFindings(text, m);
  return { text: out.join("\n"), structured: auditStructuredFrom({ findings, notVisible: UXCOPY_NOT_VISIBLE }) };
}
