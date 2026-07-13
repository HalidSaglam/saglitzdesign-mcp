import { describe, it, expect } from "vitest";
import {
  normalizeHex, generateTokens, validateColors,
  DEFAULT_SPACING, DEFAULT_RADII, DEFAULT_FONT_SIZES, DEFAULT_FONT_FAMILIES,
  type TokenSpec,
} from "../dist/tokens.js";

const spec = (): TokenSpec => ({
  name: "Acme",
  colors: { primary: "#4F46E5", onPrimary: "#FFFFFF", surface: "#0A0A0B" },
  spacing: DEFAULT_SPACING,
  radii: DEFAULT_RADII,
  fontSizes: DEFAULT_FONT_SIZES,
  fontFamilies: DEFAULT_FONT_FAMILIES,
});

describe("normalizeHex", () => {
  it("expands 3-digit and lowercases", () => {
    expect(normalizeHex("#FFF")).toBe("#ffffff");
    expect(normalizeHex("#4F46E5")).toBe("#4f46e5");
  });
  it("expands 4-digit alpha", () => {
    expect(normalizeHex("#F009")).toBe("#ff000099");
  });
  it("rejects invalid input", () => {
    expect(normalizeHex("4F46E5")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("rgb(0,0,0)")).toBeNull();
  });
});

describe("validateColors", () => {
  it("returns bad entries only", () => {
    expect(validateColors({ a: "#fff", b: "nope" })).toEqual(['b: "nope"']);
    expect(validateColors({ a: "#fff" })).toEqual([]);
  });
});

describe("generateTokens", () => {
  it("css emits kebab custom properties in rem", () => {
    const out = generateTokens(spec(), "css");
    expect(out).toContain("--color-primary: #4f46e5;");
    expect(out).toContain("--color-on-primary: #ffffff;");
    expect(out).toContain("--text-base: 1rem;");
  });
  it("tailwind emits @theme", () => {
    expect(generateTokens(spec(), "tailwind")).toContain("@theme {");
  });
  it("swiftui emits normalized sRGB Color", () => {
    const out = generateTokens(spec(), "swiftui");
    expect(out).toContain("enum AcmeTokens {");
    expect(out).toMatch(/static let primary = Color\(\.sRGB, red: 0\.31\d?, green: 0\.27\d?, blue: 0\.89\d?/);
  });
  it("compose emits 0xAARRGGBB", () => {
    const out = generateTokens(spec(), "compose");
    expect(out).toContain("val primary = Color(0xFF4F46E5)");
  });
  it("dtcg emits valid JSON with $type", () => {
    const out = generateTokens(spec(), "dtcg");
    const json = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    expect(json.color.primary.$type).toBe("color");
    expect(json.color.primary.$value).toBe("#4f46e5");
  });
  it("all includes every format", () => {
    const out = generateTokens(spec(), "all");
    for (const marker of [":root {", "@theme {", "AcmeTokens", "0xFF4F46E5", "DTCG"]) {
      expect(out).toContain(marker);
    }
  });
});
