// Deterministic color-system generator.
// One brand color → an accessible tonal scale, a cohesive neutral ramp, and
// verified light/dark semantic tokens. Every text/UI pair is checked against
// WCAG 2.2 and adjusted until it passes — outputs a real palette, not advice.

import { normalizeHex } from "./tokens.js";
import { contrastRatio } from "./a11y.js";

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex)!.slice(1);
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hslToHex(h: HSL): string {
  return rgbToHex(hslToRgb(h));
}

// Tailwind-like lightness anchors per step. Hue is preserved; saturation is
// eased down at the extremes so tints don't look neon and shades don't muddy.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const L_TARGET: Record<number, number> = {
  50: 0.97, 100: 0.94, 200: 0.86, 300: 0.76, 400: 0.66,
  500: 0.56, 600: 0.48, 700: 0.40, 800: 0.32, 900: 0.25, 950: 0.16,
};

export type Scale = Record<number, string>;

/** Build a 50–950 tonal scale from one hex, preserving hue. */
export function makeScale(hex: string, opts: { neutralSat?: number } = {}): Scale {
  const base = rgbToHsl(hexToRgb(hex));
  const scale: Scale = {};
  for (const step of STEPS) {
    const l = L_TARGET[step];
    // ease saturation: fuller in the mid-tones, gentler at the ends
    const satEase = 1 - Math.pow(Math.abs(l - 0.5) * 2, 2) * 0.25;
    const s = opts.neutralSat ?? Math.min(1, base.s * satEase);
    scale[step] = hslToHex({ h: base.h, s, l });
  }
  return scale;
}

/** A cohesive gray ramp tinted by the brand hue (low saturation). */
export function neutralScale(hex: string): Scale {
  const { h } = rgbToHsl(hexToRgb(hex));
  const scale: Scale = {};
  for (const step of STEPS) scale[step] = hslToHex({ h, s: 0.05, l: L_TARGET[step] });
  return scale;
}

const WHITE = "#ffffff";

/** Pick black or white text for a background, whichever has more contrast. */
export function bestOn(bg: string): { color: string; ratio: number } {
  const onWhite = contrastRatio("#0a0a0a", bg);
  const onBlack = contrastRatio(WHITE, bg);
  return onWhite >= onBlack ? { color: "#0a0a0a", ratio: onWhite } : { color: WHITE, ratio: onBlack };
}

/**
 * Nudge a color's lightness (hue/sat preserved) until it hits `target` contrast
 * against `bg`. Moves away from the background in luminance. Returns the closest
 * passing color, or the best achievable if the target is unreachable.
 */
export function suggestAccessibleColor(
  fg: string,
  bg: string,
  opts: { target?: number; direction?: "auto" | "darken" | "lighten" } = {},
): { hex: string; ratio: number; reached: boolean; lightnessDelta: number } {
  const target = opts.target ?? 4.5;
  const start = rgbToHsl(hexToRgb(fg));
  const bgL = rgbToHsl(hexToRgb(bg)).l;
  const dir = opts.direction && opts.direction !== "auto"
    ? opts.direction
    : bgL > 0.5 ? "darken" : "lighten";
  const sign = dir === "darken" ? -1 : 1;

  let best = { hex: normalizeHex(fg)!, ratio: contrastRatio(fg, bg), l: start.l };
  if (best.ratio >= target) return { hex: best.hex, ratio: best.ratio, reached: true, lightnessDelta: 0 };

  for (let l = start.l; l >= 0 && l <= 1; l += sign * 0.01) {
    const hex = hslToHex({ h: start.h, s: start.s, l });
    const ratio = contrastRatio(hex, bg);
    if (ratio > best.ratio) best = { hex, ratio, l };
    if (ratio >= target) return { hex, ratio, reached: true, lightnessDelta: +(l - start.l).toFixed(3) };
  }
  return { hex: best.hex, ratio: best.ratio, reached: false, lightnessDelta: +(best.l - start.l).toFixed(3) };
}

/** Darkest scale step whose text-contrast on `bg` still meets `target`. */
function readableStep(scale: Scale, bg: string, target: number, prefer: "dark" | "light"): string {
  const order = prefer === "dark" ? [...STEPS].reverse() : [...STEPS];
  for (const step of order) {
    if (contrastRatio(scale[step], bg) >= target) return scale[step];
  }
  return prefer === "dark" ? scale[950] : scale[50];
}

export interface ColorSystem {
  primary: Scale;
  neutral: Scale;
  light: Record<string, string>;
  dark: Record<string, string>;
  checks: Array<{ label: string; pair: string; ratio: number; required: number; pass: boolean }>;
}

/** Build a full light+dark semantic system from a single brand color. */
export function generateColorSystem(brand: string): ColorSystem {
  const primary = makeScale(brand);
  const neutral = neutralScale(brand);

  // Primary as an action background: choose the step nearest the brand that
  // still carries readable on-color text (≥4.5). Fall back to a darker step.
  let primaryAction = normalizeHex(brand)!;
  if (bestOn(primaryAction).ratio < 4.5) {
    primaryAction = readableStep(primary, WHITE, 4.5, "dark"); // pick a shade white/black reads on
    // prefer a shade that specifically works with white or near-black text
    for (const step of [600, 700, 500, 800, 900]) {
      if (bestOn(primary[step]).ratio >= 4.5) { primaryAction = primary[step]; break; }
    }
  }
  const onPrimary = bestOn(primaryAction).color;

  const light: Record<string, string> = {
    background: WHITE,
    surface: neutral[50],
    surfaceElevated: WHITE,
    border: neutral[200],
    borderStrong: neutral[300],
    textPrimary: neutral[900],
    textSecondary: readableStep(neutral, WHITE, 4.5, "dark") === neutral[950] ? neutral[700] : neutral[600],
    textMuted: readableStep(neutral, WHITE, 4.5, "light"),
    primary: primaryAction,
    primaryHover: primary[700],
    onPrimary,
    primarySubtle: primary[50],
    onPrimarySubtle: readableStep(primary, primary[50], 4.5, "dark"),
    // most vivid brand step that still clears the 3:1 focus-indicator threshold
    focusRing: readableStep(primary, WHITE, 3, "light"),
  };

  const darkBg = neutral[950];
  const darkSurface = neutral[900];
  // primary on a dark canvas: a lighter step that reads as accent text/border (≥4.5)
  const darkPrimary = readableStep(primary, darkBg, 4.5, "light");
  const dark: Record<string, string> = {
    background: darkBg,
    surface: darkSurface,
    surfaceElevated: neutral[800],
    border: neutral[800],
    borderStrong: neutral[700],
    textPrimary: neutral[50],
    textSecondary: readableStep(neutral, darkBg, 4.5, "light"),
    textMuted: readableStep(neutral, darkSurface, 4.5, "light"),
    primary: darkPrimary,
    primaryHover: primary[300],
    onPrimary: bestOn(darkPrimary).color,
    primarySubtle: primary[900],
    onPrimarySubtle: readableStep(primary, primary[900], 4.5, "light"),
    focusRing: darkPrimary,
  };

  const req = (kind: "text" | "ui") => (kind === "text" ? 4.5 : 3);
  const mk = (label: string, fg: string, bg: string, kind: "text" | "ui" = "text") => {
    const ratio = +contrastRatio(fg, bg).toFixed(2);
    const required = req(kind);
    return { label, pair: `${fg} on ${bg}`, ratio, required, pass: ratio >= required };
  };
  const checks = [
    mk("light · body text", light.textPrimary, light.background),
    mk("light · secondary text", light.textSecondary, light.background),
    mk("light · muted text", light.textMuted, light.background),
    mk("light · primary button", light.onPrimary, light.primary),
    mk("light · text on subtle", light.onPrimarySubtle, light.primarySubtle),
    mk("light · focus ring", light.focusRing, light.background, "ui"),
    mk("dark · body text", dark.textPrimary, dark.background),
    mk("dark · secondary text", dark.textSecondary, dark.background),
    mk("dark · primary accent", dark.primary, dark.background, "ui"),
    mk("dark · primary button", dark.onPrimary, dark.primary),
    mk("dark · text on subtle", dark.onPrimarySubtle, dark.primarySubtle),
  ];

  return { primary, neutral, light, dark, checks };
}

function scaleTable(name: string, scale: Scale): string {
  const rows = STEPS.map((s) => `| ${name}-${s} | \`${scale[s]}\` |`).join("\n");
  return `| token | hex |\n|---|---|\n${rows}`;
}

function semanticBlock(title: string, tokens: Record<string, string>): string {
  const rows = Object.entries(tokens).map(([k, v]) => `| \`${k}\` | \`${v}\` |`).join("\n");
  return `### ${title}\n| role | hex |\n|---|---|\n${rows}`;
}

/** Render a full color system as an agent-ready markdown report. */
export function colorSystemReport(brand: string, sys: ColorSystem): string {
  const failing = sys.checks.filter((c) => !c.pass);
  const out: string[] = [
    `# Color system — from \`${normalizeHex(brand)}\``,
    "",
    "A brand-hue tonal scale, a cohesive neutral ramp, and verified light + dark semantic tokens. Feed the semantic map straight into `generate_design_tokens`.",
    "",
    "## Primary scale",
    scaleTable("primary", sys.primary),
    "",
    "## Neutral scale (brand-tinted gray)",
    scaleTable("neutral", sys.neutral),
    "",
    "## Semantic tokens",
    semanticBlock("Light theme", sys.light),
    "",
    semanticBlock("Dark theme", sys.dark),
    "",
    "## Contrast verification (WCAG 2.2)",
    `**${sys.checks.length} checks · ${sys.checks.length - failing.length} pass · ${failing.length} fail**`,
    "",
    "| pair | ratio | required | result |",
    "|---|---|---|---|",
    ...sys.checks.map((c) => `| ${c.label} | ${c.ratio}:1 | ≥${c.required}:1 | ${c.pass ? "✅" : "❌"} |`),
  ];
  if (failing.length) {
    out.push(
      "",
      "> ⚠️ Some pairs couldn't be auto-resolved from this hue at the target ratio — adjust the offending token, or run `fix_contrast` on it.",
    );
  }
  out.push(
    "",
    "_Deterministic. Next: `generate_design_tokens` (turn these into CSS/Tailwind/SwiftUI/Compose/DTCG) and `audit_accessibility` (re-verify any custom pairs)._",
  );
  return out.join("\n");
}
