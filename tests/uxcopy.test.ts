import { describe, it, expect } from "vitest";
import { analyzeCopy, uxCopyReport, UXCOPY_NOT_VISIBLE } from "../dist/uxcopy.js";

describe("word lists match whole words, not substrings", () => {
  const a = (t: string) => analyzeCopy(t);

  it("does not read jargon inside a longer hyphenated phrase", () => {
    expect(a("A non-cutting-edge approach.").jargonHits).toEqual([]);
    expect(a("A cutting-edge approach.").jargonHits).toContain("cutting-edge");
  });

  it("does not read filler inside ordinary words", () => {
    for (const t of ["Adjust the layout.", "Justify the change.", "Every delivery is recovery."]) {
      expect(a(t).fillerHits, t).toEqual([]);
    }
    expect(a("Just click it.").fillerHits).toContain("just");
    expect(a("This is very fast.").fillerHits).toContain("very");
  });

  it("keeps multi-word filler working", () => {
    expect(a("In order to continue, please note this.").fillerHits)
      .toEqual(expect.arrayContaining(["in order to", "please note"]));
  });

  it("does not read a weak CTA inside a longer word", () => {
    expect(a("Government portal").weakCta).toBeUndefined();
    expect(a("Okay").weakCta).toBeUndefined();
    expect(a("Go").weakCta).toBe("go");
    expect(a("Submit form").weakCta).toBe("submit");
  });

  it("reads a weak CTA through leading wrapper characters, not through leading words", () => {
    expect(a("  Go").weakCta).toBe("go");
    expect(a("Go!").weakCta).toBe("go");
    expect(a('"Go"').weakCta).toBe("go");
    expect(a("(Go)").weakCta).toBe("go");
    expect(a("\u{1F449} Go").weakCta).toBe("go");
    expect(a("Please submit the form").weakCta).toBeUndefined();
  });
});

// The boundary Task 1 kept on purpose (underscore and dot as neutral edges,
// so markdown italics and end-of-sentence periods still read correctly) has a
// demonstrated flip side: an identifier or a method chain reads as prose.
// `UXCOPY_NOT_VISIBLE` discloses both; these tests are what keeps that
// disclosure from going stale if the boundary is ever narrowed without the
// disclosure being read again.
describe("the boundary's disclosed flip side", () => {
  const a = (t: string) => analyzeCopy(t);

  it("reads the first segment of a snake_case identifier as filler", () => {
    expect(a("the just_click handler fires once.").fillerHits).toContain("just");
  });

  it("reads a capitalized identifier before a dot as jargon", () => {
    expect(a("Call Robust.Init() before rendering.").jargonHits).toContain("robust");
  });

  it("does not match a multi-word filler entry split by a line break", () => {
    expect(a("please\nnote this.").fillerHits).toEqual([]);
    expect(a("please note this.").fillerHits).toContain("please note");
  });

  it("misses an irregular passive participle that does not end in -ed/-en", () => {
    expect(a("The announcement was made this morning.").passiveHits).toEqual([]);
    expect(a("The letter was written yesterday.").passiveHits).toContain("was written");
  });

  it("never tests a weak CTA outside isLikelyCta's wordCount<=5 && sentCount===1 shape", () => {
    expect(a("Please click here to continue with your order").weakCta).toBeUndefined();
    expect(a("Go. Now.").weakCta).toBeUndefined();
  });

  // A distinct error source from the syllable heuristic above, feeding the
  // same three headline numbers (avgSentenceLen, Flesch reading ease, grade
  // level) by a different route: `sentences()` has no notion of an
  // abbreviation, so a period that does not end a sentence is still read as
  // one.
  it("inflates the sentence count on an abbreviation's period", () => {
    expect(a("Ask Mr. Smith for help now.").sentences).toBe(2); // actually one
  });
});

/**
 * A non-ASCII letter is a letter, not a word boundary.
 *
 * `[a-z0-9-]`, `\w` and `\b` are all ASCII-only, and an ASCII-only boundary
 * does not merely fail to read another script — it silently reclassifies every
 * letter of that script as a word *edge*, so an English entry matches inside a
 * foreign word. Four matchers in `src/uxcopy.ts` each carried their own copy of
 * that assumption; one `WORD_CHAR` now serves all four, so there is one test
 * per matcher here rather than one per character somebody happened to be shown.
 */
describe("a non-ASCII letter is a letter, not a word boundary", () => {
  const a = (t: string) => analyzeCopy(t);

  it("does not begin a weak CTA after a leading non-ASCII letter", () => {
    expect(a("Çok yakında").weakCta).toBeUndefined(); // was "ok", matched inside "Çok"
    expect(a("Şimdi göster").weakCta).toBeUndefined();
  });

  it("does not read jargon or filler inside a word in another script", () => {
    expect(a("設定robust設定").jargonHits).toEqual([]);
    expect(a("простоjustдалее").fillerHits).toEqual([]);
  });

  it("does not count the end of a foreign word as first-person voice", () => {
    expect(a("Der Löwe schläft.").weCount).toBe(0); // "Löwe" ended in a \b-delimited "we"
  });

  it("does not fabricate a participle by truncating at a non-ASCII letter", () => {
    expect(a("The report is takenüber.").passiveHits).toEqual([]); // was ["is taken"]
  });

  it("still treats punctuation, wrappers and an underscore as edges", () => {
    expect(a("\u{1F449} Go").weakCta).toBe("go");
    expect(a('"Go"').weakCta).toBe("go");
    expect(a("_Go_").weakCta).toBe("go");
    expect(a("_robust_ code").jargonHits).toContain("robust");
    expect(a("déjà vu just").fillerHits).toContain("just"); // a real hit beside non-ASCII text
  });
});

/**
 * One demonstration per claim the disclosure list makes about non-English copy,
 * the shape gate, the passive regex's two directions, and the passive cap. The
 * list is the deliverable of this package; a test per named instance is what
 * keeps a sentence in it from quietly becoming false.
 */
describe("what the disclosure list says about copy it cannot read", () => {
  const a = (t: string) => analyzeCopy(t);

  it("still matches an English word another language shares", () => {
    expect(a("Das System ist robust.").jargonHits).toEqual(["robust"]);
    expect(a("Das innovativ Synergie holistisch System ist gut.").jargonHits).toEqual([]);
  });

  it("returns a top-of-scale pass, not silence, for a script it cannot tokenise", () => {
    const m = a("設定を保存しました。変更はいつでも元に戻せます。");
    expect([m.words, m.sentences, m.fleschReadingEase, m.gradeLevel]).toEqual([1, 1, 206, 0]);
    expect(uxCopyReport("設定を保存しました。変更はいつでも元に戻せます。").structured.findings).toEqual([]);
    expect(a("").words).toBe(1); // wordCount = wds.length || 1, for every zero-token input
  });

  it("inflates a word count by splitting accented Latin words", () => {
    // 12 German words; "Änderungen" -> "nderungen", "können" -> "k"+"nnen",
    // "rückgängig" -> "r"+"ckg"+"ngig".
    expect(a("Wir speichern Ihre Änderungen automatisch und Sie können sie jederzeit rückgängig machen.").words).toBe(15);
  });

  it("grades any five-word single sentence as a CTA, whatever it is", () => {
    expect(a("Enter a valid email address.").weakCta).toBe("enter"); // validation text
    expect(a("Here are your results").weakCta).toBe("here"); // a heading
    expect(a("Here's what's new").weakCta).toBe("here"); // an apostrophe is a valid edge
    expect(a("Here\u2019s what\u2019s new").weakCta).toBe("here");
  });

  it("splits on a period before whitespace only — not on a comma or on U+2026", () => {
    expect(a("Contact us, e.g. via email.").sentences).toBe(2);
    expect(a("Contact us, e.g., via email.").sentences).toBe(1);
    expect(a("Loading... please wait.").sentences).toBe(2);
    expect(a("Loading\u2026 please wait.").sentences).toBe(1);
  });

  it("reads a predicate adjective after `be` as a passive construction", () => {
    expect(a("This field is required.").passiveHits).toEqual(["is required"]);
    expect(a("2 items are selected.").passiveHits).toEqual(["are selected"]);
  });

  it("caps passive hits at 8 and reports the cap as a count", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Item ${i} is created.`).join(" ");
    expect(analyzeCopy(many).passiveHits.length).toBe(8);
    const { text, structured } = uxCopyReport(many);
    expect(text).toContain("**Passive voice** (8)");
    expect(structured.findings.find((f) => f.rule === "passive-voice")!.message).toContain("8 passive-voice");
  });
});

describe("audit_ux_copy structured output", () => {
  it("declares a non-empty, disclosed notVisible list", () => {
    expect(UXCOPY_NOT_VISIBLE.length).toBeGreaterThan(0);
  });

  it("reports findings matching the flagged metrics, each carrying rule/severity/message/fix/doc", () => {
    const { structured } = uxCopyReport(
      "We leverage our seamless platform to actually just simply empower every single one of our valued users, because this extremely long and needlessly verbose sentence about our own capabilities was written by our team to be as impressive as humanly possible. Click here.",
    );
    const rules = structured.findings.map((f) => f.rule);
    expect(rules).toEqual(expect.arrayContaining(["jargon-hype", "filler-words", "company-focused"]));
    for (const f of structured.findings) {
      expect(f.doc).toBe("ux-writing");
      expect(["error", "warning", "info"]).toContain(f.severity);
      expect(typeof f.message).toBe("string");
      expect(typeof f.fix).toBe("string");
    }
    expect(structured.notVisible).toBe(UXCOPY_NOT_VISIBLE);
    expect(structured.summary.warning + structured.summary.info + structured.summary.error)
      .toBe(structured.findings.length);
  });

  it("reports no findings for clean, active, user-focused copy", () => {
    const { structured } = uxCopyReport("You can undo this any time.");
    expect(structured.findings).toEqual([]);
    expect(structured.notVisible).toBe(UXCOPY_NOT_VISIBLE);
  });

  it("carries the metrics table the markdown prints", () => {
    const { text, structured } = uxCopyReport("Your invoice includes usage, seats, discounts, taxes, and credits applied to your account balance.");
    expect(structured.metrics).toEqual({
      words: 14, sentences: 1, avgSentenceLen: 14, fleschReadingEase: 60, gradeLevel: 8.4, youCount: 2, weCount: 0,
    });
    for (const [label, value] of [
      ["Words / sentences", `${structured.metrics.words} / ${structured.metrics.sentences}`],
      ["Avg sentence length", `${structured.metrics.avgSentenceLen} words`],
      ["Flesch reading ease", `${structured.metrics.fleschReadingEase}`],
      ["Reading grade level", `${structured.metrics.gradeLevel}`],
    ] as const) {
      expect(text, label).toContain(`| ${label} | ${value} |`);
    }
  });

  // Reading grade level is the one row graded against a target that no rule
  // fires on, so it is the only way the report can print a ⚠️ and "clear" at
  // once. It did: grade 8.4 over "clear, active, user-focused".
  it("does not call copy clear while the table says its grade level is not", () => {
    const off = uxCopyReport("Your invoice includes usage, seats, discounts, taxes, and credits applied to your account balance.");
    expect(off.structured.findings).toEqual([]);
    expect(off.text).toContain("≤ 8 ⚠️");
    expect(off.text).toContain("One metric is still off target: reading grade level 8.4");
    expect(off.text).not.toContain("clear, active, user-focused");

    const clean = uxCopyReport("You can undo this any time.");
    expect(clean.text).toContain("✅ No copy issues flagged — clear, active, user-focused.");
  });

  it("points a vocabulary finding at the earliest flagged word in the text", () => {
    // jargonHits is ["robust", "innovative"] — JARGON order, not text order.
    const { structured } = uxCopyReport("This design is innovative.\nWe built a robust system.");
    expect(structured.findings.find((f) => f.rule === "jargon-hype")!.line).toBe(1);
  });
});

/**
 * The invariant `uxCopyFindings`' comment used to claim the code guaranteed.
 * It does not: that function and `uxCopyReport`'s `issues[]` are two
 * hand-written if-chains over one `CopyMetrics`, so every condition is spelled
 * out twice and only hand keeps the copies in step. `designLintReport` renders
 * its markdown from its findings array and cannot diverge; until this tool does
 * the same, this test is the guarantee.
 */
describe("the markdown and structured registers agree about which checks fired", () => {
  const RULE_OF_ISSUE: Record<string, string> = {
    "Long sentences": "long-sentences",
    "Hard to read": "hard-to-read",
    "Passive voice": "passive-voice",
    "Jargon / hype": "jargon-hype",
    Filler: "filler-words",
    "Company-focused": "company-focused",
    "Weak CTA": "weak-cta",
  };

  const inputs = [
    "You can undo this any time.",
    "Submit",
    "Click here",
    "Enter a valid email address.",
    "Just simply click here to continue.",
    "We leverage our seamless platform to empower our users.",
    "The file was uploaded and the invoice was generated by our team.",
    "Our robust, best-in-class, world-class platform was designed by our own team to actually and literally supercharge every single one of the workflows that our valued enterprise customers rely upon each day.",
    "Your invoice includes usage, seats, discounts, taxes, and credits applied to your account balance.",
    "This field is required.",
    "設定を保存しました。",
    "",
  ];

  it("names the same rules in both, for every input", () => {
    const seen = new Set<string>();
    for (const t of inputs) {
      const { text, structured } = uxCopyReport(t);
      // Only the "## Issues" section — the disclosure list below it renders
      // bullets in the same shape, and matching those instead is how a first
      // draft of this test read twelve `notVisible` entries as issues.
      // The report above the closing line only: the disclosure list below it
      // renders bullets in the same `- **` shape (a first draft of this test
      // read twelve `notVisible` entries as issues) and one of its entries
      // quotes the clean banner's own words verbatim.
      const report = text.slice(0, text.indexOf("_Objective checks only"));
      const issues = report.includes("## Issues")
        ? [...report.slice(report.indexOf("## Issues")).matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1])
        : [];
      const fromMarkdown = issues.map((label) => {
        expect(RULE_OF_ISSUE[label], `unmapped markdown issue "${label}"`).toBeDefined();
        return RULE_OF_ISSUE[label];
      });
      const fromStructured = structured.findings.map((f) => f.rule);
      expect([...fromMarkdown].sort(), JSON.stringify(t)).toEqual([...fromStructured].sort());
      expect(structured.summary.error + structured.summary.warning + structured.summary.info)
        .toBe(structured.findings.length);
      expect(report.includes("No copy issues flagged"), JSON.stringify(t)).toBe(fromStructured.length === 0);
      for (const r of fromStructured) seen.add(r);
    }
    // Non-vacuity: an input set that never fires a rule would pass the equality
    // above while testing nothing about it.
    expect([...seen].sort()).toEqual(Object.values(RULE_OF_ISSUE).sort());
  });
});
