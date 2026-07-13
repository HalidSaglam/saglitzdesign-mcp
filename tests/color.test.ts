import { describe, it, expect } from "vitest";
import {
  makeScale, neutralScale, generateColorSystem, suggestAccessibleColor,
  rgbToHsl, hslToRgb, bestOn,
} from "../dist/color.js";
import { contrastRatio } from "../dist/a11y.js";

const HEX = /^#[0-9a-f]{6}$/;

describe("hsl round-trip", () => {
  it("rgb→hsl→rgb is stable", () => {
    const rgb = { r: 79, g: 70, b: 229 };
    const back = hslToRgb(rgbToHsl(rgb));
    expect(Math.round(back.r)).toBe(rgb.r);
    expect(Math.round(back.g)).toBe(rgb.g);
    expect(Math.round(back.b)).toBe(rgb.b);
  });
});

describe("makeScale", () => {
  it("produces all 11 steps as valid hex", () => {
    const s = makeScale("#4F46E5");
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(s[step]).toMatch(HEX);
    }
  });
  it("gets monotonically darker from 50 to 950", () => {
    const s = makeScale("#e11d48");
    const lum = (hex: string) => contrastRatio(hex, "#000000"); // higher = lighter
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    for (let i = 1; i < steps.length; i++) {
      expect(lum(s[steps[i]])).toBeLessThan(lum(s[steps[i - 1]]));
    }
  });
});

describe("neutralScale", () => {
  it("is low-saturation (near gray)", () => {
    const s = neutralScale("#4F46E5");
    const { s: sat } = rgbToHsl({
      r: parseInt(s[500].slice(1, 3), 16),
      g: parseInt(s[500].slice(3, 5), 16),
      b: parseInt(s[500].slice(5, 7), 16),
    });
    expect(sat).toBeLessThan(0.1);
  });
});

describe("bestOn", () => {
  it("picks white for dark bg and dark for light bg", () => {
    expect(bestOn("#111111").color).toBe("#ffffff");
    expect(bestOn("#f5f5f5").color).toBe("#0a0a0a");
  });
});

describe("generateColorSystem", () => {
  it("every reported check passes for a range of brand hues", () => {
    for (const brand of ["#4F46E5", "#e11d48", "#059669", "#f59e0b", "#0ea5e9", "#7c3aed"]) {
      const sys = generateColorSystem(brand);
      const fails = sys.checks.filter((c) => !c.pass);
      expect(fails, `${brand} failing: ${fails.map((f) => f.label).join(", ")}`).toHaveLength(0);
    }
  });
  it("onPrimary genuinely meets 4.5 against primary", () => {
    const sys = generateColorSystem("#f59e0b"); // a light/yellow brand — hard case
    expect(contrastRatio(sys.light.onPrimary, sys.light.primary)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("suggestAccessibleColor", () => {
  it("reaches the target and reports it", () => {
    const r = suggestAccessibleColor("#9CA3AF", "#FFFFFF", { target: 4.5 });
    expect(r.reached).toBe(true);
    expect(r.ratio).toBeGreaterThanOrEqual(4.5);
    expect(r.hex).toMatch(HEX);
  });
  it("returns unchanged when already passing", () => {
    const r = suggestAccessibleColor("#000000", "#FFFFFF", { target: 4.5 });
    expect(r.lightnessDelta).toBe(0);
    expect(r.reached).toBe(true);
  });
  it("darkens foreground on a light background", () => {
    const r = suggestAccessibleColor("#9CA3AF", "#FFFFFF", { target: 4.5 });
    expect(r.lightnessDelta).toBeLessThan(0);
  });
});
