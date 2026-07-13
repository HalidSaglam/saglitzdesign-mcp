import { describe, it, expect } from "vitest";
import { suggestFontPairing, PAIRINGS } from "../dist/fonts.js";

describe("suggestFontPairing", () => {
  it("maps common intents to sensible pairings", () => {
    expect(suggestFontPairing("native ios app", { limit: 1 })[0].id).toBe("sf-system");
    expect(suggestFontPairing("luxury editorial magazine", { limit: 1 })[0].vibe).toContain("editorial");
    const saas = suggestFontPairing("modern saas dashboard", { limit: 3 });
    expect(saas.some((p) => p.vibe.includes("saas"))).toBe(true);
  });
  it("respects the limit", () => {
    expect(suggestFontPairing("modern", { limit: 2 })).toHaveLength(2);
  });
  it("always returns something for an unknown intent", () => {
    expect(suggestFontPairing("zzzzzz qqqqq", { limit: 3 }).length).toBeGreaterThan(0);
  });
  it("every pairing has complete, paste-ready stacks", () => {
    for (const p of PAIRINGS) {
      expect(p.heading.stack).toContain(",");
      expect(p.body.stack).toContain(",");
      expect(p.why.length).toBeGreaterThan(20);
      expect(p.vibe.length).toBeGreaterThan(2);
    }
  });
  it("has unique ids", () => {
    expect(new Set(PAIRINGS.map((p) => p.id)).size).toBe(PAIRINGS.length);
  });
});
