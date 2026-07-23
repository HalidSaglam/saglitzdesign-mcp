import { describe, it, expect } from "vitest";
import { buildTypeScale, fluidClamp, typeScaleReport } from "../dist/typescale.js";
import { buildElevation, elevationReport } from "../dist/elevation.js";
import { motionReport, MOTION_IDS } from "../dist/motion.js";

describe("type scale", () => {
  it("keeps base at the given size and grows by ratio", () => {
    const { steps } = buildTypeScale({ base: 16, ratio: 1.25 });
    const base = steps.find((s) => s.name === "base")!;
    const lg = steps.find((s) => s.name === "lg")!;
    expect(base.px).toBe(16);
    expect(lg.px).toBeCloseTo(20, 0);
  });
  it("gives headings a fluid clamp, body none", () => {
    const { steps } = buildTypeScale({ fluid: true });
    expect(steps.find((s) => s.name === "3xl")!.fluid).toContain("clamp(");
    expect(steps.find((s) => s.name === "base")!.fluid).toBeUndefined();
  });
  it("fluidClamp returns a valid clamp expression", () => {
    expect(fluidClamp(24, 40)).toMatch(/^clamp\(.+rem, .+vw, .+rem\)$/);
    expect(fluidClamp(20, 20)).toBe("1.25rem"); // equal → static
  });
  it("report emits CSS and Tailwind blocks", () => {
    const r = typeScaleReport({ ratio: 1.333 });
    expect(r).toContain("--text-base");
    expect(r).toContain("@theme {");
  });
});

describe("elevation", () => {
  it("level 0 is 'none', higher levels have layered shadows", () => {
    const ramp = buildElevation({ levels: 5 });
    expect(ramp[0].css).toBe("none");
    expect((ramp[5].css.match(/rgba\(/g) ?? []).length).toBe(2); // two layered shadows
    expect(ramp[5].css).toContain("rgba(0, 0, 0");
  });
  it("hue tint switches to hsl", () => {
    expect(buildElevation({ hue: "220 40%" })[2].css).toContain("hsl(220");
  });
  it("report includes dark-mode guidance", () => {
    expect(elevationReport()).toContain("## Dark mode");
  });
});

describe("motion", () => {
  it("emits easing + duration tokens", () => {
    const r = motionReport(undefined, "css");
    expect(r).toContain("--ease-decelerate");
    expect(r).toContain("--duration-base: 200ms");
  });
  it("filters to one animation", () => {
    const r = motionReport("shimmer", "css");
    expect(r).toContain("### shimmer");
    expect(r).not.toContain("### spring-pop");
  });
  it("swiftui stack emits swift code; reduced-motion always present", () => {
    const r = motionReport("fade-in", "swiftui");
    expect(r).toContain(".easeOut");
    expect(r).toContain("prefers-reduced-motion");
  });
  it("exposes the animation ids", () => {
    expect(MOTION_IDS).toContain("slide-up");
  });
});
