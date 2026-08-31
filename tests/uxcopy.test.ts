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
});
