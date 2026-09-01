// Measurement engine. Everything here is either an exact count over the pixel
// buffer or a detection carrying a confidence level. Nothing here claims to
// know what an element *is* — that is not something pixels establish.

import type { DecodedImage } from "./png.js";
import { clusterAll, rgbDistance, INDISTINGUISHABLE, type ValueUse } from "./colorutil.js";
import { contrastRatio } from "./a11y.js";
import { stockAccentProximity } from "./color.js";

export interface Detection<T> { value: T; confidence: "high" | "medium"; support: number }

export interface ScreenshotReport {
  source: { name: string; width: number; height: number; scale: number; sampledEveryNth: number };
  palette: { clusters: Array<{ hex: string; coverage: number; members: number }>; distinctExact: number; significant: number };
  contrast: Array<{ fg: string; bg: string; ratio: number; passesNormal: boolean; passesLarge: boolean; fgCoverage: number }>;
  density: { backgroundCoverage: number; largestEmptyBand: number; emptyBands: number };
  structure: { leftEdges: Detection<number[]> | null; gaps: Detection<number[]> | null; offGridGaps: number[] };
  stockRegion: Array<{ hex: string; coverage: number; stop: string; degrees: number }>;
}

export interface MeasureOptions { name?: string; scale?: 1 | 2 | 3; maxColors?: number }

const SAMPLE_BUDGET = 2_000_000;
const SIGNIFICANT = 0.005;     // ≥0.5% of the screen
const BACKGROUND_MIN = 0.15;   // a background covers at least 15%
const FOREGROUND_MAX = 0.15;
const FOREGROUND_MIN = 0.0005;
const EDGE_THRESHOLD = 24;
const SUPPORT_HIGH = 0.25;
const SUPPORT_MEDIUM = 0.10;
const ROW_EMPTY_RATIO = 0.99;

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");

export function measure(img: DecodedImage, opts: MeasureOptions = {}): ScreenshotReport {
  const { width, height, data } = img;
  const scale = opts.scale ?? 1;
  const maxColors = opts.maxColors ?? 12;
  const total = width * height;
  const everyNth = Math.max(1, Math.ceil(total / SAMPLE_BUDGET));

  // ── palette ───────────────────────────────────────────────────────────────
  const counts = new Map<number, number>();
  let sampled = 0;
  for (let p = 0; p < total; p += everyNth) {
    const i = p * 4;
    if (data[i + 3] < 16) continue; // effectively transparent
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
    sampled++;
  }
  const tally: ValueUse[] = [...counts].map(([key, count]) => ({
    value: toHex((key >> 16) & 255, (key >> 8) & 255, key & 255),
    count,
  }));
  const clusters = clusterAll(tally)
    .map((c) => ({ hex: c.keep, coverage: sampled ? c.count / sampled : 0, members: c.members.length }))
    .sort((a, b) => b.coverage - a.coverage);

  const palette = {
    clusters: clusters.slice(0, maxColors),
    distinctExact: tally.length,
    significant: clusters.filter((c) => c.coverage >= SIGNIFICANT).length,
  };

  const stockRegion = palette.clusters
    .filter((c) => c.coverage >= SIGNIFICANT)
    .flatMap((c) => {
      const hit = stockAccentProximity(c.hex);
      return hit ? [{ hex: c.hex, coverage: c.coverage, stop: hit.stop, degrees: hit.degrees }] : [];
    });

  // ── contrast ──────────────────────────────────────────────────────────────
  const backgrounds = clusters.filter((c) => c.coverage >= BACKGROUND_MIN);
  const foregrounds = clusters.filter((c) => c.coverage >= FOREGROUND_MIN && c.coverage < FOREGROUND_MAX);
  const contrast: ScreenshotReport["contrast"] = [];
  for (const bg of backgrounds) {
    for (const fg of foregrounds) {
      const ratio = +contrastRatio(fg.hex, bg.hex).toFixed(2);
      contrast.push({
        fg: fg.hex, bg: bg.hex, ratio,
        passesNormal: ratio >= 4.5, passesLarge: ratio >= 3,
        fgCoverage: fg.coverage,
      });
    }
  }
  contrast.sort((a, b) => b.fgCoverage - a.fgCoverage || a.ratio - b.ratio);

  // ── density + horizontal bands ────────────────────────────────────────────
  // Numeric distance in the hot loop: this runs once per pixel, and parsing a
  // hex string a few million times would dominate the whole measurement.
  const bgHex = clusters[0]?.hex ?? "#000000";
  const bgR = parseInt(bgHex.slice(1, 3), 16), bgG = parseInt(bgHex.slice(3, 5), 16), bgB = parseInt(bgHex.slice(5, 7), 16);
  const emptyRow: boolean[] = [];
  for (let y = 0; y < height; y++) {
    let same = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgbDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= INDISTINGUISHABLE) same++;
    }
    emptyRow.push(same / width >= ROW_EMPTY_RATIO);
  }
  const runs: number[] = [];
  let run = 0;
  for (const e of emptyRow) {
    if (e) run++;
    else if (run) { runs.push(run); run = 0; }
  }
  if (run) runs.push(run);

  const density = {
    backgroundCoverage: clusters[0]?.coverage ?? 0,
    largestEmptyBand: Math.round((runs.length ? Math.max(...runs) : 0) / scale),
    emptyBands: runs.length,
  };

  // ── structure ─────────────────────────────────────────────────────────────
  const lum = new Float32Array(total);
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    lum[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  const colSupport = new Int32Array(width);
  for (let x = 1; x < width; x++) {
    let n = 0;
    for (let y = 0; y < height; y++) {
      if (Math.abs(lum[y * width + x] - lum[y * width + x - 1]) > EDGE_THRESHOLD) n++;
    }
    colSupport[x] = n;
  }
  const minSupport = Math.max(1, Math.floor(SUPPORT_MEDIUM * height));
  const peaks: Array<{ x: number; support: number }> = [];
  for (let x = 1; x < width; x++) {
    if (colSupport[x] < minSupport) continue;
    const last = peaks[peaks.length - 1];
    if (last && x - last.x <= 2) {
      if (colSupport[x] > last.support) { last.x = x; last.support = colSupport[x]; }
    } else {
      peaks.push({ x, support: colSupport[x] });
    }
  }

  const leftPeaks = peaks.filter((p) => p.x < width / 3);
  const structure: ScreenshotReport["structure"] = { leftEdges: null, gaps: null, offGridGaps: [] };
  if (leftPeaks.length) {
    const weakest = Math.min(...leftPeaks.map((p) => p.support)) / height;
    structure.leftEdges = {
      value: [...new Set(leftPeaks.map((p) => Math.round(p.x / scale)))],
      confidence: weakest >= SUPPORT_HIGH ? "high" : "medium",
      support: +weakest.toFixed(2),
    };
  }
  if (runs.length > 1) {
    const gaps = runs.map((r) => Math.round(r / scale));
    structure.gaps = { value: gaps, confidence: "high", support: 1 };
    structure.offGridGaps = gaps.filter((g) => g % 4 !== 0);
  }

  return {
    source: { name: opts.name ?? "screenshot.png", width, height, scale, sampledEveryNth: everyNth },
    palette, contrast, density, structure, stockRegion,
  };
}
