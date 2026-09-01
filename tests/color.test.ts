import { describe, it, expect } from "vitest";
import {
  makeScale, neutralScale, generateColorSystem, suggestAccessibleColor,
  rgbToHsl, hslToRgb, bestOn, stockAccentProximity,
} from "../dist/color.js";
import { contrastRatio } from "../dist/a11y.js";
import { colorDistance } from "../dist/colorutil.js";

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

describe("status colours", () => {
  // A design system without an error colour is not a foundation, and
  // create_design_system calls itself one. Destructive actions, form errors,
  // success confirmations and warnings all needed a role and had none.
  const brands = ["#4f46e5", "#0F62FE", "#e11d48", "#059669", "#f59e0b"];

  it("produces danger, success and warning in both themes", () => {
    for (const brand of brands) {
      const sys = generateColorSystem(brand);
      for (const role of ["danger", "dangerHover", "onDanger", "success", "onSuccess", "warning", "onWarning"]) {
        expect(sys.light[role], `${brand} light ${role}`).toMatch(/^#[0-9a-f]{6}$/);
        expect(sys.dark[role], `${brand} dark ${role}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("keeps status text legible on its own surface", () => {
    for (const brand of brands) {
      const sys = generateColorSystem(brand);
      for (const theme of ["light", "dark"] as const) {
        const t = sys[theme];
        for (const [fg, bg] of [["onDanger", "danger"], ["onSuccess", "success"], ["onWarning", "warning"]]) {
          expect(contrastRatio(t[fg], t[bg]), `${brand} ${theme} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps danger distinguishable from the brand, even when the brand is red", () => {
    // The case that breaks a naive implementation: a red brand and a red error
    // state that look identical, so a destructive button reads as the primary.
    const sys = generateColorSystem("#e11d48");
    expect(colorDistance(sys.light.primary, sys.light.danger)).toBeGreaterThan(20);
  });

  it("harmonises saturation with the brand rather than pasting in a fixed red", () => {
    const vivid = generateColorSystem("#0F62FE");
    const muted = generateColorSystem("#6b7280");
    expect(vivid.light.danger).not.toBe(muted.light.danger);
  });

  it("reports the status pairs it verified", () => {
    const sys = generateColorSystem("#4f46e5");
    const labels = sys.checks.map((c) => c.label.toLowerCase()).join(" ");
    expect(labels).toMatch(/danger/);
    expect(sys.checks.every((c) => c.pass || c.ratio > 0)).toBe(true);
  });

  it("exposes full scales for the status hues", () => {
    const sys = generateColorSystem("#4f46e5");
    for (const scale of [sys.danger, sys.success, sys.warning]) {
      expect(Object.keys(scale).length).toBeGreaterThanOrEqual(10);
      expect(scale[500]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("status colours are actually the colour they claim", () => {
  // The gap the first implementation fell through: every contrast check passed
  // while `danger` came out #46100b — a near-black brown. White reads on it
  // perfectly, and it is useless as an error colour. Contrast is necessary and
  // nowhere near sufficient.
  const hueOf = (hex: string) => rgbToHsl({
    r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16),
  }).h;
  const satOf = (hex: string) => rgbToHsl({
    r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16),
  }).s;
  const lightOf = (hex: string) => rgbToHsl({
    r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16),
  }).l;

  const inHue = (hex: string, lo: number, hi: number) => {
    const h = hueOf(hex);
    return h >= lo && h <= hi;
  };

  for (const brand of ["#4f46e5", "#0F62FE", "#e11d48", "#6b7280"]) {
    it(`reads as red / green / amber for ${brand}`, () => {
      const sys = generateColorSystem(brand);
      for (const theme of ["light", "dark"] as const) {
        const t = sys[theme];
        expect(inHue(t.danger, 340, 360) || inHue(t.danger, 0, 25), `${theme} danger ${t.danger}`).toBe(true);
        expect(inHue(t.success, 110, 175), `${theme} success ${t.success}`).toBe(true);
        expect(inHue(t.warning, 25, 60), `${theme} warning ${t.warning}`).toBe(true);
      }
    });

    it(`keeps status fills in a usable lightness range for ${brand}`, () => {
      // The assertion that actually bites. #46100b has the right hue and plenty
      // of saturation and is still a near-black brown; #fcf3f2 is the same
      // failure at the other end. A fill someone reads as "error" lives in the
      // middle, and neither hue nor contrast constrains that.
      const sys = generateColorSystem(brand);
      for (const theme of ["light", "dark"] as const) {
        for (const role of ["danger", "success", "warning"]) {
          const hex = sys[theme][role];
          expect(satOf(hex), `${theme} ${role} ${hex} saturation`).toBeGreaterThan(0.35);
          expect(lightOf(hex), `${theme} ${role} ${hex} too dark`).toBeGreaterThan(0.3);
          expect(lightOf(hex), `${theme} ${role} ${hex} too pale`).toBeLessThan(0.75);
        }
      }
    });
  }
});

describe("stockAccentProximity", () => {
  // The direction card on create_design_system has to name a fact about the
  // seed, not a taste judgement. These four hexes are the contract: house
  // indigo sits on the documented Tailwind stop; a genuine teal, IBM blue
  // and a grey do not, even when their hue is in the same half of the wheel.
  it("places house indigo on Tailwind indigo-500", () => {
    const hit = stockAccentProximity("#4F46E5");
    expect(hit).not.toBeNull();
    expect(hit!.stop).toBe("indigo-500");
    expect(hit!.hex).toBe("#615fff");
    expect(hit!.degrees).toBeLessThanOrEqual(18);
  });

  it("does not claim teal, IBM blue or grey are in the stock region", () => {
    expect(stockAccentProximity("#059669")).toBeNull();
    expect(stockAccentProximity("#0F62FE")).toBeNull();
    expect(stockAccentProximity("#6b7280")).toBeNull();
  });

  it("places violet and purple seeds on their own stops", () => {
    expect(stockAccentProximity("#8e51ff")!.stop).toBe("violet-500");
    expect(stockAccentProximity("#ad46ff")!.stop).toBe("purple-500");
  });
});
