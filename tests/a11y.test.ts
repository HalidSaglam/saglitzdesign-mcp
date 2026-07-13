import { describe, it, expect } from "vitest";
import { contrastRatio, checkContrast, checkTargets } from "../dist/a11y.js";

describe("contrastRatio", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
  it("is symmetric", () => {
    expect(contrastRatio("#4f46e5", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#4f46e5"), 10);
  });
  it("same color is 1:1", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
  it("matches a known WCAG value (#767676 on white ≈ 4.54)", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
  });
});

describe("checkContrast", () => {
  it("applies 4.5 for normal text", () => {
    const [r] = checkContrast([{ foreground: "#767676", background: "#ffffff" }]);
    expect(r.pass).toBe(true); // 4.54 ≥ 4.5
  });
  it("applies 3:1 for large text", () => {
    const [normal] = checkContrast([{ foreground: "#949494", background: "#ffffff" }]);
    const [large] = checkContrast([{ foreground: "#949494", background: "#ffffff", large_text: true }]);
    expect(normal.pass).toBe(false); // ~3.0 fails 4.5
    expect(large.pass).toBe(true); // passes 3:1
  });
  it("flags invalid hex without throwing", () => {
    const [r] = checkContrast([{ foreground: "zzz", background: "#fff" }]);
    expect(r.pass).toBe(false);
    expect(r.actual).toBe("invalid hex");
  });
});

describe("checkTargets", () => {
  it("iOS requires 44pt on the smallest side", () => {
    expect(checkTargets([{ width: 44, height: 30, platform: "ios" }])[0].pass).toBe(false);
    expect(checkTargets([{ width: 44, height: 44, platform: "ios" }])[0].pass).toBe(true);
  });
  it("web minimum is 24px", () => {
    expect(checkTargets([{ width: 24, height: 24, platform: "web" }])[0].pass).toBe(true);
    expect(checkTargets([{ width: 20, height: 40 }])[0].pass).toBe(false);
  });
  it("android minimum is 48dp", () => {
    expect(checkTargets([{ width: 48, height: 48, platform: "android" }])[0].pass).toBe(true);
    expect(checkTargets([{ width: 44, height: 44, platform: "android" }])[0].pass).toBe(false);
  });
});
