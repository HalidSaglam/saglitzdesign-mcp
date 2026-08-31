import { describe, it, expect } from "vitest";
import { analyzeCopy } from "../dist/uxcopy.js";

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
});
