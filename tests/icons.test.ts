import { describe, it, expect } from "vitest";
import { suggestIconLibrary, ICON_LIBRARIES } from "../dist/icons.js";

describe("suggestIconLibrary", () => {
  it("steers to platform-native sets", () => {
    expect(suggestIconLibrary("native iOS app", { limit: 1 })[0].id).toBe("sf-symbols");
    expect(suggestIconLibrary("android material 3 app", { limit: 1 })[0].id).toBe("material-symbols");
  });
  it("recommends a web default for SaaS", () => {
    const saas = suggestIconLibrary("minimal saas dashboard", { limit: 3 });
    expect(saas.some((l) => l.id === "lucide")).toBe(true);
  });
  it("finds Phosphor for friendly/duotone intents", () => {
    const r = suggestIconLibrary("friendly consumer app with personality duotone", { limit: 3 });
    expect(r.some((l) => l.id === "phosphor")).toBe(true);
  });
  it("respects the limit and always returns something", () => {
    expect(suggestIconLibrary("modern", { limit: 2 })).toHaveLength(2);
    expect(suggestIconLibrary("zzz qqq", { limit: 2 }).length).toBeGreaterThan(0);
  });
  it("every library has license + install + unique id", () => {
    for (const l of ICON_LIBRARIES) {
      expect(l.license.length, l.id).toBeGreaterThan(2);
      expect(l.install.length, l.id).toBeGreaterThan(5);
      expect(l.homepage).toMatch(/^https:\/\//);
    }
    expect(new Set(ICON_LIBRARIES.map((l) => l.id)).size).toBe(ICON_LIBRARIES.length);
  });
});
