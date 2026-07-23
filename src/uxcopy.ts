// Deterministic UX-copy auditor.
// Readability (Flesch), sentence length, passive voice, jargon/filler, weak CTAs,
// and "you"-focus — the machine-checkable slice of UX writing. Flags phrases with
// fixes; grounded in ux-writing. Not a style oracle, a fast objective pass.

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
  const jargonHits = JARGON.filter((j) => new RegExp(`\\b${j}\\b`, "i").test(lower));
  const fillerHits = FILLER.filter((f) => lower.includes(f));
  const youCount = (lower.match(/\b(you|your|you're|yours)\b/g) ?? []).length;
  const weCount = (lower.match(/\b(we|our|us|we're)\b/g) ?? []).length;

  const isLikelyCta = wordCount <= 5 && sentCount === 1;
  const weakCta = isLikelyCta ? WEAK_CTA.find((c) => lower.trim() === c || lower.trim().startsWith(c)) : undefined;

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

export function uxCopyReport(text: string): string {
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
  return out.join("\n");
}
