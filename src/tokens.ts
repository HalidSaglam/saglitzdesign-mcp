// Deterministic design-token artifact generator.
// One source spec → CSS variables, Tailwind v4, SwiftUI, Jetpack Compose, DTCG JSON.
// Fills the gap where Style Dictionary v4 doesn't yet emit the stable DTCG 2025.10 format.

export interface TokenSpec {
  name: string;
  colors: Record<string, string>; // semantic role -> hex (#RGB / #RRGGBB / #RRGGBBAA)
  spacing: number[]; // px scale
  radii: Record<string, number>; // name -> px (9999 = full/pill)
  fontSizes: Record<string, number>; // name -> px
  fontFamilies: Record<string, string>; // role -> stack
}

export type TokenFormat = "css" | "tailwind" | "swiftui" | "compose" | "dtcg" | "all";

export const DEFAULT_SPACING = [2, 4, 8, 12, 16, 24, 32, 48, 64, 96];
export const DEFAULT_RADII = { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 };
export const DEFAULT_FONT_SIZES = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 40 };
export const DEFAULT_FONT_FAMILIES = {
  sans: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function normalizeHex(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 4) h = h.split("").map((c) => c + c).join("");
  return "#" + h.toLowerCase();
}

function hexParts(hex: string): { r: number; g: number; b: number; a: number } {
  const h = normalizeHex(hex)!.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

function kebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
}
function pascal(s: string): string {
  return s.replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase());
}
function camel(s: string): string {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

// ── CSS custom properties ────────────────────────────────────────────────────
function toCss(s: TokenSpec): string {
  const lines = [":root {"];
  lines.push("  /* color */");
  for (const [k, v] of Object.entries(s.colors)) lines.push(`  --color-${kebab(k)}: ${normalizeHex(v)};`);
  lines.push("  /* spacing */");
  s.spacing.forEach((v) => lines.push(`  --space-${v}: ${v}px;`));
  lines.push("  /* radius */");
  for (const [k, v] of Object.entries(s.radii)) lines.push(`  --radius-${kebab(k)}: ${v >= 9999 ? "9999px" : v + "px"};`);
  lines.push("  /* font size */");
  for (const [k, v] of Object.entries(s.fontSizes)) lines.push(`  --text-${kebab(k)}: ${(v / 16).toFixed(4).replace(/\.?0+$/, "")}rem;`);
  lines.push("  /* font family */");
  for (const [k, v] of Object.entries(s.fontFamilies)) lines.push(`  --font-${kebab(k)}: ${v};`);
  lines.push("}");
  return lines.join("\n");
}

// ── Tailwind v4 (@theme) ─────────────────────────────────────────────────────
function toTailwind(s: TokenSpec): string {
  const lines = ["@theme {"];
  for (const [k, v] of Object.entries(s.colors)) lines.push(`  --color-${kebab(k)}: ${normalizeHex(v)};`);
  s.spacing.forEach((v) => lines.push(`  --spacing-${v}: ${v}px;`));
  for (const [k, v] of Object.entries(s.radii)) lines.push(`  --radius-${kebab(k)}: ${v >= 9999 ? "9999px" : v + "px"};`);
  for (const [k, v] of Object.entries(s.fontSizes)) lines.push(`  --text-${kebab(k)}: ${(v / 16).toFixed(4).replace(/\.?0+$/, "")}rem;`);
  for (const [k, v] of Object.entries(s.fontFamilies)) lines.push(`  --font-${kebab(k)}: ${v};`);
  lines.push("}");
  return lines.join("\n");
}

// ── SwiftUI ──────────────────────────────────────────────────────────────────
function toSwiftUI(s: TokenSpec): string {
  const lines = ["import SwiftUI", "", `enum ${pascal(s.name)}Tokens {`];
  lines.push("    // Colors");
  for (const [k, v] of Object.entries(s.colors)) {
    const { r, g, b, a } = hexParts(v);
    lines.push(`    static let ${camel(k)} = Color(.sRGB, red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)}, opacity: ${a.toFixed(3)})`);
  }
  lines.push("    // Spacing (pt)");
  s.spacing.forEach((v) => lines.push(`    static let space${v}: CGFloat = ${v}`));
  lines.push("    // Corner radius (pt)");
  for (const [k, v] of Object.entries(s.radii)) lines.push(`    static let radius${pascal(k)}: CGFloat = ${v >= 9999 ? 9999 : v}`);
  lines.push("    // Font size (pt)");
  for (const [k, v] of Object.entries(s.fontSizes)) lines.push(`    static let text${pascal(k)}: CGFloat = ${v}`);
  lines.push("}");
  return lines.join("\n");
}

// ── Jetpack Compose ──────────────────────────────────────────────────────────
function toCompose(s: TokenSpec): string {
  const lines = ["import androidx.compose.ui.graphics.Color", "import androidx.compose.ui.unit.dp", "import androidx.compose.ui.unit.sp", "", `object ${pascal(s.name)}Tokens {`];
  lines.push("    // Colors (0xAARRGGBB)");
  for (const [k, v] of Object.entries(s.colors)) {
    const { r, g, b, a } = hexParts(v);
    const argb = ((Math.round(a * 255) << 24) | (r << 16) | (g << 8) | b) >>> 0;
    lines.push(`    val ${camel(k)} = Color(0x${argb.toString(16).padStart(8, "0").toUpperCase()})`);
  }
  lines.push("    // Spacing");
  s.spacing.forEach((v) => lines.push(`    val space${v} = ${v}.dp`));
  lines.push("    // Corner radius");
  for (const [k, v] of Object.entries(s.radii)) lines.push(`    val radius${pascal(k)} = ${v >= 9999 ? 9999 : v}.dp`);
  lines.push("    // Font size");
  for (const [k, v] of Object.entries(s.fontSizes)) lines.push(`    val text${pascal(k)} = ${v}.sp`);
  lines.push("}");
  return lines.join("\n");
}

// ── DTCG JSON (W3C Design Tokens Community Group, stable 2025.10) ─────────────
function toDtcg(s: TokenSpec): string {
  const obj: Record<string, unknown> = {
    $description: `${s.name} design tokens (DTCG format)`,
    color: Object.fromEntries(Object.entries(s.colors).map(([k, v]) => [kebab(k), { $type: "color", $value: normalizeHex(v) }])),
    spacing: Object.fromEntries(s.spacing.map((v) => [String(v), { $type: "dimension", $value: { value: v, unit: "px" } }])),
    radius: Object.fromEntries(Object.entries(s.radii).map(([k, v]) => [kebab(k), { $type: "dimension", $value: { value: v, unit: "px" } }])),
    fontSize: Object.fromEntries(Object.entries(s.fontSizes).map(([k, v]) => [kebab(k), { $type: "dimension", $value: { value: v, unit: "px" } }])),
    fontFamily: Object.fromEntries(Object.entries(s.fontFamilies).map(([k, v]) => [kebab(k), { $type: "fontFamily", $value: v.split(",").map((f) => f.trim()) }])),
  };
  return JSON.stringify(obj, null, 2);
}

const GENERATORS: Record<Exclude<TokenFormat, "all">, { label: string; lang: string; fn: (s: TokenSpec) => string }> = {
  css: { label: "CSS custom properties (tokens.css)", lang: "css", fn: toCss },
  tailwind: { label: "Tailwind v4 theme (app.css)", lang: "css", fn: toTailwind },
  swiftui: { label: "SwiftUI (Tokens.swift)", lang: "swift", fn: toSwiftUI },
  compose: { label: "Jetpack Compose (Tokens.kt)", lang: "kotlin", fn: toCompose },
  dtcg: { label: "DTCG JSON (tokens.json)", lang: "json", fn: toDtcg },
};

export function generateTokens(spec: TokenSpec, format: TokenFormat): string {
  const formats = format === "all" ? (Object.keys(GENERATORS) as Array<Exclude<TokenFormat, "all">>) : [format];
  const blocks = formats.map((f) => {
    const g = GENERATORS[f];
    return `## ${g.label}\n\`\`\`${g.lang}\n${g.fn(spec)}\n\`\`\``;
  });
  return `# ${spec.name} — design tokens\n\n${blocks.join("\n\n")}`;
}

export function validateColors(colors: Record<string, string>): string[] {
  const bad: string[] = [];
  for (const [k, v] of Object.entries(colors)) if (!normalizeHex(v)) bad.push(`${k}: "${v}"`);
  return bad;
}
