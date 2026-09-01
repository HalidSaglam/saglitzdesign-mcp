// Deterministic UX-copy auditor.
// Readability (Flesch), sentence length, passive voice, jargon/filler, weak CTAs,
// and "you"-focus — the machine-checkable slice of UX writing. Flags phrases with
// fixes; grounded in ux-writing. Not a style oracle, a fast objective pass.

import { type LintFinding, type AuditReport, type AuditStructured, auditStructuredFrom, renderNotVisibleSection } from "./lint.js";

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

// One notion of "inside a word", for every boundary in this file.
//
// It is `\p{L}\p{M}\p{N}\p{Cf}` and not `[a-z0-9]`, `\w` or `\b`, because all
// three of those are ASCII-only and an ASCII-only boundary does not merely
// fail to read another script — it silently reclassifies every letter of
// that script as a *word edge*, so an English entry matches inside a foreign
// word: `ok` fired inside Turkish "Çok", `robust` inside "設定robust設定",
// `just` inside "простоjustдалее", and `\b`'s ASCII definition counted the
// "we" ending German "Löwe" as first-person voice. `\p{L}\p{N}` alone fixed
// those four but was still one class short of the same defect: it has no
// notion of a combining mark or a zero-width joiner, so it re-treats *those*
// as edges instead — `robust` still fired inside a ZWJ-joined
// "設定‍robust‍設定", an NFD-normalized "Löwe" (base letter +
// combining diaeresis, rather than the precomposed character) still read as
// ending in "we", and Hebrew `לְwe` still counted as first-person, which is
// not an NFD artefact at all — Hebrew niqqud, Arabic harakat and Indic vowel
// signs have no precomposed form to normalize to, so the combining mark *is*
// the only spelling. `\p{M}` (combining marks) and `\p{Cf}` (formatting
// characters — ZWJ/ZWNJ among them) close both. Each of these is one
// character class away from the last, which is why there is one class here
// rather than a fix at each site. An underscore is deliberately NOT a word
// character: markdown italics (`_robust_`, `_you_`) read as the word they
// wrap, which is the same rule stated once instead of differing between
// matchers.
const WORD_CHAR = "\\p{L}\\p{M}\\p{N}\\p{Cf}";

// Characters that extend a word list entry — a hyphen included, since entries
// like "cutting-edge" carry one internally. `\b` is wrong here for a second
// reason on top of the ASCII one: a hyphen is a non-word character, so it puts
// a boundary *inside* "non-cutting-edge" right before "cutting-edge" and the
// phrase reads as jargon when it's the opposite of jargon. Anything NOT in
// this class — space, punctuation, an underscore, string start/end — is a
// legitimate edge for an entry.
const ENTRY_EDGE = `[${WORD_CHAR}-]`;

// A leading run of characters that are themselves never part of an entry —
// punctuation, a quote mark, an emoji, whitespace. Skippable before an
// anchored match because none of it is content: "👉 Go" and "\"Go\"" still
// begin with "Go" once the wrapper around it is set aside. Derived from
// ENTRY_EDGE by stripping its brackets and negating the class, rather than a
// second hand-written copy of WORD_CHAR + "-" — the two constants agreeing was
// a comment's claim once already; deriving one from the other makes it a fact
// the next edit to WORD_CHAR cannot silently break. So it can never eat a
// letter, digit or hyphen on the way to a later match — "Please submit the
// form" still fails to start with "submit", and "Çok yakında" no longer
// starts with "ok".
const LEADING_NOISE = `[^${ENTRY_EDGE.slice(1, -1)}]*`;

// The you/we balance and the passive-voice shape need the same boundary and
// used `\b` for it. Hoisted here so all four matchers read from `WORD_CHAR`
// rather than each carrying its own idea of where a word ends.
const YOU_RE = new RegExp(`(?<![${WORD_CHAR}])(?:you|your|you're|yours)(?![${WORD_CHAR}])`, "giu");
const WE_RE = new RegExp(`(?<![${WORD_CHAR}])(?:we|our|us|we're)(?![${WORD_CHAR}])`, "giu");
const PASSIVE_RE = new RegExp(
  `(?<![${WORD_CHAR}])(?:is|are|was|were|be|been|being)\\s+[${WORD_CHAR}]+(?:ed|en)(?![${WORD_CHAR}])(?:\\s+by(?![${WORD_CHAR}]))?`,
  "giu",
);

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
  return new RegExp(`${lead}${esc}(?!${ENTRY_EDGE})`, "iu");
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

/**
 * The structured counterpart of the metrics table `uxCopyReport` prints — one
 * field per row of it. Added because the structured half shipped without it:
 * an agent chaining `structuredContent` got findings and a disclosure list and
 * no words, sentences, average sentence length, Flesch score, grade level or
 * you/we balance, while the markdown half printed all six. Grade level in
 * particular is graded against a target in that table and never becomes a
 * finding, so before this it had no machine-readable existence at all. Same
 * relationship `audit_generic_design`'s `score` and `audit_project`'s `scan`
 * have to `AUDIT_OUTPUT_SCHEMA`: extra fields beside the three every
 * structured auditor shares, mirrored in `index.ts`'s wire schema.
 */
export interface UxCopyStructured extends AuditStructured {
  metrics: {
    words: number;
    sentences: number;
    avgSentenceLen: number;
    fleschReadingEase: number;
    gradeLevel: number;
    youCount: number;
    weCount: number;
  };
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
  const passiveHits = (text.match(PASSIVE_RE) ?? []).slice(0, 8);
  const jargonHits = JARGON.filter((j) => entryPattern(j).test(lower));
  const fillerHits = FILLER.filter((f) => entryPattern(f).test(lower));
  const youCount = (lower.match(YOU_RE) ?? []).length;
  const weCount = (lower.match(WE_RE) ?? []).length;

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

  `**Whether the text being audited is short UI copy at all, which this tool assumes and never checks.** Run over this repository's own knowledge base — 96 documents, README.md, and 9 skill files, 106 files in total — the three word lists draw well over a hundred hits across the large majority of those files, almost none of it hype: \`knowledge/marketing/branding-identity.md:75\` reads "Don't: \"Leverage our best-in-class solution\" → Do: \"Ship your first campaign in 10 minutes.\"" — a sentence teaching a writer not to say "leverage" or "best-in-class" is itself flagged for both, because the tool has no notion of a quoted counter-example and no calibration for long-form prose at all. (No exact hit count is given: this corpus includes the very documents that describe this tool's reach — this sentence and \`ship-quality-gate\`'s table row among them — so a point figure over it changes with what gets written about it, this entry included, and would be stale on arrival.) Point it at a paragraph of documentation instead of a button label or a toast, and the jargon/filler counts describe the vocabulary of careful technical writing, not a defect in it.`,

  `**Three closed, English-only word lists** — ${JARGON.length} jargon entries, ${FILLER.length} filler entries, ${WEAK_CTA.length} weak-CTA entries — matched with no synonym expansion and no entry in any other language. A hyped or weak word that is not on one of these three lists is invisible however hyped or weak it reads. What does *not* follow — and what an earlier version of this entry claimed — is that copy in another language therefore scores clean. These are English words, and other languages contain English words: \`Das System ist robust.\` reports the jargon hit \`robust\`, which German carries as its own adjective, while \`innovativ\`, \`Synergie\` and \`holistisch\` in the same sentence stay invisible. So the reach over non-English copy is neither full nor none — it is whichever of these ${JARGON.length + FILLER.length + WEAK_CTA.length} English strings that language happens to share, which is a fact about the two vocabularies and not about the copy. (The word boundary reads a combining mark or a zero-width joiner as part of the letter it modifies, not as an edge, so an entry does not fire on a fragment split out by one: \`robust\` no longer fires inside \`設定robust設定\` or a zero-width-joined \`設定‍robust‍設定\`, \`ok\` no longer fires inside Turkish \`Çok\`, and Hebrew niqqud — which has no precomposed form to normalize away, unlike an accent — reads as part of the letter it decorates rather than as a boundary. That is a claim about this tool's own boundary logic, not about "every script": a script this tool cannot tokenise at all behaves differently, and what it does to the *metrics* is the next entry.)`,

  `**Copy in a script this tool cannot tokenise — which it reports as a clean pass, not as silence.** \`words()\` matches \`/[a-z0-9']+/g\`: ASCII letters, digits and an apostrophe. A letter outside \`a–z\` is not a word character, so text with no ASCII letters in it yields **zero** tokens, and \`wordCount = wds.length || 1\` turns zero into one. \`設定を保存しました。変更はいつでも元に戻せます。\` — two Japanese sentences, 24 code points — is reported as 1 word and 1 sentence, with a Flesch reading ease of **206** (above the top of the scale), a grade level of **0**, four green ticks in the metrics table and "No copy issues flagged". Chinese, Arabic, Russian, a bare emoji and the empty string all do the same. Accented Latin fragments rather than vanishing: \`Änderungen\` tokenises as \`nderungen\` and \`können\` as \`k\` + \`nnen\`, so a 12-word German sentence is counted as 15 words and those fragments are what the syllable heuristic below is then handed. This is a third route into \`avgSentenceLen\`, Flesch reading ease and grade level, beside the two disclosed further down — and the only one of the three that returns a confident pass on text that was never read. (\`sentences()\` is ASCII-terminated too: it splits on \`.\`, \`!\` and \`?\`, not on \`。\` or \`？\`.) Disclosed rather than fixed: tokenising a script written without spaces needs word segmentation with a dictionary behind it, which is a different tool than a regex.`,

  `**A multi-word filler entry split by a line break in the text it is checking.** \`FILLER\` stores \`"please note"\` and \`"in order to"\` as one literal string with a single interior space, so \`please\\nnote this.\` does not match \`please note\` — the entry's stored space and the text's actual newline are different characters. Demonstrated under both the pre-boundary substring match this tool used before and the boundary-anchored one it uses now: the boundary fix changed what counts as an edge around an entry, not how a multi-word entry is compared against the text it searches.`,

  `**A \`snake_case\` identifier, read as the word before its underscore.** \`ENTRY_EDGE\` treats an underscore as a non-content edge on purpose, so that markdown italics (\`_robust_\`) still reads as the word "robust" — the same rule reads "the just_click handler fires once." as containing the filler word "just", because \`just_click\`'s underscore is, to the matcher, exactly the same kind of boundary as the space in "just click".`,

  `**A dotted method or property chain, read as the end of a sentence.** The same boundary excludes \`.\` for the mirror reason — a sentence-ending period has to stay a valid edge everywhere else this tool reads prose — so "Call Robust.Init() before rendering." reports "robust" as jargon: the dot inside \`Robust.Init()\` reads exactly like the full stop that ends an ordinary sentence.`,

  `**A weak call to action longer than five words, or split into more than one sentence.** \`isLikelyCta\` is \`wordCount <= 5 && sentCount === 1\`; text outside that shape is never tested against \`WEAK_CTA\` at all, regardless of what it says. "Please click here to continue with your order" (seven words) and "Go. Now." (two sentences) both skip the check entirely. **The same gate read the other way is a false positive rather than a miss, and it is the commoner half:** \`isLikelyCta\` tests a *shape*, never whether the text is a call to action at all, so every string of five words or fewer in one sentence is graded as one. \`Enter a valid email address.\` and \`Enter a valid ZIP code.\` — form-validation strings, not buttons — each report the weak CTA \`enter\` at \`warning\` severity; \`Here are your results\` and \`Go to Settings > Privacy\` report \`here\` and \`go\`. \`Here's what's new\` reports \`here\` as well: an apostrophe is not a letter, so it is a legitimate edge for an entry and \`here\` matches the first four characters of \`Here's\` — the curly \`’\` behaves identically. Nothing in this tool distinguishes a button label from a heading, an error message, or an instruction.`,

  `**Syllables, counted by a heuristic rather than looked up.** \`countSyllables\` strips a trailing "es"/"ed"/silent "e" and then counts vowel-group clusters; it has no dictionary and no exception list, so it miscounts ordinary words — \`countSyllables("queue")\` returns 2, though "queue" is one syllable. Every Flesch reading-ease and grade-level number this tool reports is computed on counts like that one, not on verified syllables.`,

  `**A sentence count inflated by a period that does not end a sentence — or by a line break with no terminal punctuation at all.** \`sentences()\` is \`split(/(?<=[.!?])\\s+|\\n+/)\`, two rules and not one. The first splits on any \`.\`/\`!\`/\`?\` followed by whitespace, with no notion of an abbreviation or a title: "Ask Mr. Smith for help now." counts as two sentences instead of one, because the period after "Mr" satisfies the same split as the period that actually ends the sentence. It is narrower than "any abbreviation", and worth stating as the shape it is: "Contact us, e.g. via email." splits, "Contact us, e.g., via email." does not (the comma is next, not a space), a three-dot "Loading... please wait." splits, and the single-character ellipsis "Loading… please wait." — the spelling Apple's HIG and Material both prescribe, so the one real UI copy uses — does not split at all. The second rule is the one this entry used to leave unstated: a bare newline splits on its own, with no punctuation involved and no whitespace required around it. "Save your work\\nUndo any time" — two lines, no \`.\`/\`!\`/\`?\` anywhere — counts as two sentences, and multi-line copy (a toast with a title and a body line, a tooltip, a multi-line error) is an ordinary input to this tool, not an edge case. \`avgSentenceLen\`, Flesch reading ease and grade level are all computed from that count, in both directions: the "Mr." case inflates it and moves Flesch and grade level toward "hard to read"; the bare-newline case can inflate it too, moving them toward a pass on copy that was never one sentence to begin with. Disclosed rather than fixed: recognising "Mr.", "e.g.", "i.e.", "etc." and the rest needs a maintained abbreviation list, and telling a hard line break from a paragraph break needs a notion of structure a regex over raw text does not have — both are a different tool than a sentence-boundary splitter.`,

  `**Passive voice recognised only through a participle spelled with a trailing "-ed" or "-en".** The regex is \`\\b(is|are|was|were|be|been|being)\\s+\\w+(ed|en)\\b\`, so an irregular past participle spelled neither way is invisible to it: "The announcement was made this morning." reports zero passive-voice hits, because "made" ends in neither "ed" nor "en". **The false positives that shape admits are ours in the same measure**, because a predicate adjective after "be" is spelled exactly like a passive: "This field is required." reports \`is required\`, and so do "The button is disabled.", "2 items are selected.", "Your plan is limited to 3 seats." and "The file is corrupted." — the first of those being the most common validation string in software, shipped by Material, Ant, Bootstrap and HTML5 constraint validation alike. The miss and the false positive are one rule read in its two directions: this is a spelling test, not a grammar one.`,

  `**Passive-voice hits past the eighth — in a number both registers print as a total.** \`passiveHits\` ends \`.slice(0, 8)\`, and the markdown's "**Passive voice** (n)" and the structured finding's "n passive-voice construction(s)" are both \`passiveHits.length\`. A text with 12 passive constructions reports 8; one with 30 also reports 8. It is the only capped number this tool prints — \`jargonHits\` and \`fillerHits\` are one entry per matched list word, however many times that word occurs, and every number in the metrics table is computed over the whole text — so a count from this tool can be read as exact everywhere except here, where 8 means "eight or more".`,
];

export const UXCOPY_CLOSING =
  `A clean result here means the text contains none of these specific,
listed words or shapes — not that the writing is good, and not that this is
the right register for where it will appear. Pair with
get_design_doc("ux-writing") and human judgment, and read the entries above
before pointing this at anything longer than a button label or a toast.`;

// The line of the earliest of `hits` in `text`. `hits[0]` is the first entry
// in JARGON/FILLER order, not the first one the reader meets: "This design is
// innovative.\nWe built a robust system." yields ["robust", "innovative"]
// because `robust` sits earlier in the word list, and pointing the finding at
// `robust` sends it to line 2 while the first flagged word is on line 1. Every
// hit is searched instead, and the smallest index wins.
function earliestHitLine(text: string, hits: string[]): number {
  let earliest = Infinity;
  for (const h of hits) {
    const at = entryPattern(h).exec(text)?.index;
    if (at !== undefined && at < earliest) earliest = at;
  }
  return lineOf(text, earliest === Infinity ? 0 : earliest);
}

/**
 * The structured half of `audit_ux_copy`, in `design_lint`'s shape: one
 * finding per triggered check, carrying a rule id, a severity, the fact that
 * made it fire, and a fix — built off the same `CopyMetrics` the markdown
 * table above is built from.
 *
 * THAT SHARED INPUT IS NOT A SHARED CONDITION, and this comment used to claim
 * it was ("so the two can never disagree about which checks fired"). This
 * function and `uxCopyReport`'s `issues[]` are two hand-written seven-branch
 * if-chains over the same metrics: `m.fleschReadingEase < 60` is spelled out
 * once here and once there, and nothing but hand keeps the second copy in
 * step with the first. `designLintReport` (src/lint.ts) does not have this
 * problem because it renders its markdown *from* its findings array — one
 * source, two renderings, structurally unable to diverge. Until this tool
 * does the same, the two registers agreeing is an invariant rather than a
 * structure, so `tests/uxcopy.test.ts` asserts it directly over inputs
 * covering all seven rules. Read that test as the guarantee; not this
 * function's inputs.
 *
 * There is no `file` (this tool takes a pasted snippet of copy, never a path)
 * and `line` marks where in the audited text the finding's evidence sits —
 * for a vocabulary hit, the earliest of the flagged words *in the text*,
 * which is not the first name in the message (that list is in word-list
 * order) — and the start of the text for a whole-text metric like average
 * sentence length or the you/we balance, which is not about any one line.
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
    add(earliestHitLine(text, m.jargonHits), "warning", "jargon-hype",
      `Jargon/hype word(s): ${m.jargonHits.join(", ")}.`,
      "Say the plain thing instead.");
  }
  if (m.fillerHits.length) {
    add(earliestHitLine(text, m.fillerHits), "info", "filler-words",
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

export function uxCopyReport(text: string): AuditReport & { structured: UxCopyStructured } {
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
  } else if (m.gradeLevel > 8) {
    // Reading grade level is the one row in the table above that is graded
    // against a target and never becomes a finding — every other ⚠️ that row
    // set has a matching entry in `issues`. So it is the only way this report
    // can print "⚠️" and "clear" in the same breath, which it did: grade 8.4
    // over "✅ No copy issues flagged — clear, active, user-focused." Say which
    // of the two is true instead of leaving the reader to pick.
    out.push(
      `✅ No copy issues flagged. One metric is still off target: reading grade level ${m.gradeLevel}, above the ≤ 8 the table grades it against — reported rather than flagged, because no rule fires on grade level alone.`,
      "",
    );
  } else {
    out.push("✅ No copy issues flagged — clear, active, user-focused.", "");
  }
  out.push("_Objective checks only (readability, voice, jargon, CTA). They don't judge tone-fit or brand voice — pair with get_design_doc(\"ux-writing\") and human judgment._");
  out.push("", ...renderNotVisibleSection(UXCOPY_PREAMBLE, UXCOPY_NOT_VISIBLE, UXCOPY_CLOSING));

  const findings = uxCopyFindings(text, m);
  return {
    text: out.join("\n"),
    structured: {
      ...auditStructuredFrom({ findings, notVisible: UXCOPY_NOT_VISIBLE }),
      metrics: {
        words: m.words, sentences: m.sentences, avgSentenceLen: m.avgSentenceLen,
        fleschReadingEase: m.fleschReadingEase, gradeLevel: m.gradeLevel,
        youCount: m.youCount, weCount: m.weCount,
      },
    },
  };
}
