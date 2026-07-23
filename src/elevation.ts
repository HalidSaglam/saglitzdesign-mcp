// Deterministic elevation / shadow-system generator.
// Produces a cohesive, layered box-shadow ramp (ambient + direct light) with
// semantic level names, plus dark-mode guidance. Real CSS/Tailwind output.

export interface ElevationOptions {
  levels?: number; // number of raised levels (default 5)
  hue?: string; // optional shadow tint as "H S%" (e.g. "220 40%"); default neutral
  strength?: number; // 0.5–1.5 opacity multiplier (default 1)
}

const LEVEL_NAMES = ["flat", "raised", "overlay", "sticky", "floating", "modal", "popover", "max"];

function round(n: number, p = 3): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

interface ShadowLayer { y: number; blur: number; spread: number; alpha: number }

/** Two layered shadows per level: a soft ambient + a tighter direct one. */
function layersFor(level: number, strength: number): ShadowLayer[] {
  if (level === 0) return [];
  const k = level;
  return [
    { y: round(k * 1), blur: round(k * 2), spread: 0, alpha: round(0.04 + k * 0.008, 4) * strength },
    { y: round(k * 2.5), blur: round(k * 5), spread: round(-k * 0.5), alpha: round(0.05 + k * 0.012, 4) * strength },
  ];
}

function shadowCss(layers: ShadowLayer[], colorFn: (a: number) => string): string {
  if (layers.length === 0) return "none";
  return layers.map((l) => `${0}px ${l.y}px ${l.blur}px ${l.spread}px ${colorFn(round(l.alpha, 4))}`).join(", ");
}

export interface ElevationLevel { name: string; index: number; css: string }

export function buildElevation(opts: ElevationOptions = {}): ElevationLevel[] {
  const levels = Math.min(opts.levels ?? 5, 8);
  const strength = opts.strength ?? 1;
  const hue = opts.hue?.trim();
  const colorFn = (a: number) => (hue ? `hsl(${hue} 20% / ${a})` : `rgba(0, 0, 0, ${a})`);
  const out: ElevationLevel[] = [];
  for (let i = 0; i <= levels; i++) {
    out.push({ name: LEVEL_NAMES[i] ?? `level-${i}`, index: i, css: shadowCss(layersFor(i, strength), colorFn) });
  }
  return out;
}

export function elevationReport(opts: ElevationOptions = {}): string {
  const ramp = buildElevation(opts);
  const out: string[] = [
    "# Elevation / shadow system",
    "",
    "A layered ambient + direct shadow ramp. Use elevation to signal interaction hierarchy, not decoration — raise on hover/active/overlay, keep resting surfaces low.",
    "",
    "| token | level | usage |",
    "|---|---|---|",
    "| shadow-flat | 0 | resting surfaces, table rows |",
    "| shadow-raised | 1 | cards, buttons at rest |",
    "| shadow-overlay | 2 | dropdowns, hovered cards |",
    "| shadow-sticky | 3 | sticky headers, raised nav |",
    "| shadow-floating | 4 | FABs, popovers |",
    "| shadow-modal | 5 | dialogs, sheets |",
    "",
    "## CSS custom properties",
    "```css",
    ":root {",
    ...ramp.map((l) => `  --shadow-${l.name}: ${l.css};`),
    "}",
    "```",
    "",
    "## Tailwind v4 (@theme)",
    "```css",
    "@theme {",
    ...ramp.map((l) => `  --shadow-${l.name}: ${l.css};`),
    "}",
    "```",
    "",
    "## Dark mode",
    "Shadows barely read on dark surfaces. On dark themes, **lower shadow opacity and lean on surface-lightness steps and hairline borders** to convey elevation instead (a higher surface = a lighter neutral). Keep a faint shadow for large overlays (modals) only. See get_design_doc(\"color-systems\").",
    "",
    "_Deterministic. One shadow token per semantic level — never hand-tune per component. Pair with `generate_color_system` (surfaces) and `create_design_system`._",
  ];
  return out.join("\n");
}
