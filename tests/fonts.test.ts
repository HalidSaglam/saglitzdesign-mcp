import { describe, it, expect } from "vitest";
import { suggestFontPairing, fontPairingReport, PAIRINGS } from "../dist/fonts.js";
import { genericVisualRules } from "../dist/generic.js";

describe("suggestFontPairing", () => {
  it("maps common intents to sensible pairings", () => {
    expect(suggestFontPairing("native ios app", { limit: 1 })[0].id).toBe("sf-system");
    expect(suggestFontPairing("luxury editorial magazine", { limit: 1 })[0].vibe).toContain("editorial");
    const saas = suggestFontPairing("modern saas dashboard", { limit: 3 });
    expect(saas.some((p) => p.vibe.includes("saas"))).toBe(true);
  });

  it("does not lead a brand surface with a default UI font", () => {
    // Unqualified "modern saas" is the prompt generated landing pages arrive as.
    // Inter / Inter wins on raw keyword score; it is also what
    // audit_generic_design calls default-ui-font on a marketing route.
    const brand = suggestFontPairing("modern saas", { limit: 1 })[0];
    expect(brand.id).not.toBe("inter-inter");
    expect(brand.id).not.toBe("sf-system");
    expect(brand.heading.family).not.toBe(brand.body.family);
    expect(suggestFontPairing("modern saas landing", { limit: 1 })[0].id).not.toBe("inter-inter");
  });

  it("keeps Inter on a product surface that is not also a landing", () => {
    expect(suggestFontPairing("modern saas dashboard", { limit: 1 })[0].id).toBe("inter-inter");
  });

  it("lets a landing keyword beat a dashboard keyword", () => {
    const pick = suggestFontPairing("saas dashboard landing", { limit: 1 })[0];
    expect(pick.id).not.toBe("inter-inter");
    expect(pick.heading.family).not.toBe(pick.body.family);
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

// `suggest_font_pairing` and `audit_generic_design` ship in the same server,
// so an agent can take a stack from here, build a landing page with it, run
// the auditor over the result, and be told the recommendation was a default.
// That contradiction is this server's own doing, and the fix is not to soften
// the auditor — `typography-craft` is on its side — but to make the pairing
// say what the auditor will say, before it is used.
//
// Heading + body, no mono: a page's type is those two. (Adding the optional
// mono stack would hide the contradiction, because a mono face is a family
// the auditor counts, which is exactly why the check must not include it.)
describe("pairings agree with what audit_generic_design will say about them", () => {
  const brandPage = (p: (typeof PAIRINGS)[number]) =>
    `<h1>Ship faster</h1><a href="/signup">Get started</a>` +
    `<style>h1{font-family:${p.heading.stack}}body{font-family:${p.body.stack}}</style>`;

  const flagged = (p: (typeof PAIRINGS)[number]) =>
    genericVisualRules(brandPage(p), "app/(marketing)/page.tsx").some((f) => f.rule === "default-ui-font");

  it("every pairing the auditor calls a default warns about brand surfaces itself", () => {
    const silent = PAIRINGS.filter((p) => flagged(p) && !/brand surface/i.test(p.pairing_rules)).map((p) => p.id);
    expect(silent).toEqual([]);
  });

  // Without this the check above passes just as well if the auditor never
  // flags anything — these two are the pairings it actually has something to
  // say about, and they are the reason the clause exists.
  it("and the check is not vacuous: inter-inter and sf-system are both flagged", () => {
    const ids = PAIRINGS.filter(flagged).map((p) => p.id);
    expect(ids).toContain("inter-inter");
    expect(ids).toContain("sf-system");
  });

  // The other direction: a pairing that genuinely puts a display face beside
  // the neutral one is silent, so the clause is a statement about these
  // stacks and not a blanket disclaimer every pairing would need.
  it("stays silent on the pairings that already carry a display face", () => {
    for (const id of ["cal-inter", "instrument-inter", "clash-satoshi", "playfair-inter"]) {
      expect(flagged(PAIRINGS.find((p) => p.id === id)!), id).toBe(false);
    }
  });
});

describe("fontPairingReport names a skipped default on a brand surface", () => {
  it("says Inter / Inter scored higher and why it was dropped", () => {
    const report = fontPairingReport("modern saas", suggestFontPairing("modern saas", { limit: 3 }));
    expect(report).toMatch(/Inter \/ Inter scored higher but was skipped/);
    expect(report).toContain("default-ui-font");
    expect(report).toContain("audit_generic_design");
  });

  it("does not claim a skip when the product-surface winner is Inter", () => {
    const report = fontPairingReport("modern saas dashboard", suggestFontPairing("modern saas dashboard", { limit: 3 }));
    expect(report).not.toMatch(/scored higher but was skipped/);
  });
});
