// Deterministic modular type-scale generator.
// base size + ratio → named steps with line-heights, tracking, and fluid clamp().
// Emits CSS custom properties and a Tailwind @theme block. Real output, not advice.

export interface TypeScaleOptions {
  base?: number; // px, default 16
  ratio?: number; // modular ratio, default 1.25 (major third)
  steps?: number; // named steps above base, default 7
  fluid?: boolean; // emit clamp() that scales between mobile and desktop
  minVw?: number; // px viewport where fluid scaling starts (default 375)
  maxVw?: number; // px viewport where it stops (default 1280)
}

export const NAMED_RATIOS: Record<string, number> = {
  "minor-second": 1.067,
  "major-second": 1.125,
  "minor-third": 1.2,
  "major-third": 1.25,
  "perfect-fourth": 1.333,
  "augmented-fourth": 1.414,
  "perfect-fifth": 1.5,
  golden: 1.618,
};

// step name → exponent relative to base (0)
const STEP_NAMES: Array<{ name: string; n: number }> = [
  { name: "xs", n: -2 },
  { name: "sm", n: -1 },
  { name: "base", n: 0 },
  { name: "lg", n: 1 },
  { name: "xl", n: 2 },
  { name: "2xl", n: 3 },
  { name: "3xl", n: 4 },
  { name: "4xl", n: 5 },
  { name: "5xl", n: 6 },
  { name: "6xl", n: 7 },
];

function round(n: number, p = 2): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

/** Line-height eases down as size grows: tight for display, roomy for body. */
function lineHeightFor(px: number): number {
  if (px <= 14) return 1.5;
  if (px <= 18) return 1.6;
  if (px <= 24) return 1.4;
  if (px <= 36) return 1.2;
  if (px <= 56) return 1.1;
  return 1.05;
}

function trackingFor(px: number): string {
  if (px <= 14) return "0.01em";
  if (px >= 36) return "-0.02em";
  if (px >= 24) return "-0.01em";
  return "0";
}

/** Fluid clamp() between minPx@minVw and maxPx@maxVw (all in px → rem). */
export function fluidClamp(minPx: number, maxPx: number, minVw = 375, maxVw = 1280): string {
  if (Math.abs(maxPx - minPx) < 0.1) return `${round(maxPx / 16, 4)}rem`;
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const yIntercept = minPx - slope * minVw;
  const preferred = `${round(yIntercept / 16, 4)}rem + ${round(slope * 100, 4)}vw`;
  return `clamp(${round(minPx / 16, 4)}rem, ${preferred}, ${round(maxPx / 16, 4)}rem)`;
}

export interface TypeStep {
  name: string;
  px: number;
  rem: number;
  lineHeight: number;
  tracking: string;
  fluid?: string;
}

export function buildTypeScale(opts: TypeScaleOptions = {}): { steps: TypeStep[]; meta: Required<TypeScaleOptions> } {
  const base = opts.base ?? 16;
  const ratio = opts.ratio ?? 1.25;
  const stepsUp = opts.steps ?? 7;
  const fluid = opts.fluid ?? true;
  const minVw = opts.minVw ?? 375;
  const maxVw = opts.maxVw ?? 1280;

  // mobile uses a gentler ratio so display type shrinks but body stays readable
  const mobileRatio = Math.max(1.1, ratio - 0.1);

  const wanted = STEP_NAMES.filter((s) => s.n <= stepsUp);
  const steps: TypeStep[] = wanted.map(({ name, n }) => {
    const px = round(base * ratio ** n);
    const step: TypeStep = {
      name,
      px,
      rem: round(px / 16, 4),
      lineHeight: lineHeightFor(px),
      tracking: trackingFor(px),
    };
    if (fluid && n > 0) {
      const mobilePx = round(base * mobileRatio ** n);
      step.fluid = fluidClamp(Math.min(mobilePx, px), px, minVw, maxVw);
    }
    return step;
  });
  return { steps, meta: { base, ratio, steps: stepsUp, fluid, minVw, maxVw } };
}

export function typeScaleReport(opts: TypeScaleOptions = {}): string {
  const { steps, meta } = buildTypeScale(opts);
  const ratioName = Object.entries(NAMED_RATIOS).find(([, v]) => Math.abs(v - meta.ratio) < 0.001)?.[0];
  const out: string[] = [
    `# Type scale — base ${meta.base}px · ratio ${meta.ratio}${ratioName ? ` (${ratioName})` : ""}`,
    "",
    "| token | size | rem | line-height | tracking |" + (meta.fluid ? " fluid clamp() |" : ""),
    "|---|---|---|---|---|" + (meta.fluid ? "---|" : ""),
    ...steps.map((s) =>
      `| text-${s.name} | ${s.px}px | ${s.rem}rem | ${s.lineHeight} | ${s.tracking} |` +
      (meta.fluid ? ` ${s.fluid ? `\`${s.fluid}\`` : "—"} |` : ""),
    ),
    "",
    "## CSS custom properties",
    "```css",
    ":root {",
    ...steps.map((s) => `  --text-${s.name}: ${meta.fluid && s.fluid ? s.fluid : s.rem + "rem"};`),
    ...steps.map((s) => `  --leading-${s.name}: ${s.lineHeight};`),
    "}",
    "```",
    "",
    "## Tailwind v4 (@theme)",
    "```css",
    "@theme {",
    ...steps.map((s) => `  --text-${s.name}: ${meta.fluid && s.fluid ? s.fluid : s.rem + "rem"};`),
    "}",
    "```",
    "",
    "_Rules: create hierarchy with size **and weight**, not size alone; keep body 16px+ (never px for font-size — rem respects user zoom). Fluid clamp() scales display type down on small screens automatically. Feed into `generate_design_tokens` or `create_design_system`. See get_design_doc(\"typography\")._",
  ];
  return out.join("\n");
}
