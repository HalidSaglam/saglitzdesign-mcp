import { describe, it, expect } from "vitest";
import { decodePng } from "../dist/png.js";
import { measure } from "../dist/screenshot.js";
import { encodePng, canvasRows } from "./helpers/pngFixture.js";

/**
 * A canvas of a known background with coloured rectangles drawn on it, so
 * every measured number has a known correct answer.
 */
function canvas(
  width: number,
  height: number,
  bg: [number, number, number],
  rects: Array<{ x: number; y: number; w: number; h: number; rgb: [number, number, number] }> = [],
) {
  return decodePng(encodePng({ width, height, colorType: 2, bitDepth: 8, rows: canvasRows(width, height, bg, rects) }));
}

const WHITE: [number, number, number] = [255, 255, 255];
const INK: [number, number, number] = [17, 24, 39];      // #111827
const BRAND: [number, number, number] = [79, 70, 229];   // #4f46e5

describe("palette measurement", () => {
  it("reports the dominant colour and its coverage exactly", () => {
    const img = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 10, h: 10, rgb: INK }]);
    const r = measure(img, { name: "test.png" });
    expect(r.palette.clusters[0].hex).toBe("#ffffff");
    expect(r.palette.clusters[0].coverage).toBeCloseTo(0.99, 2);
    expect(r.palette.clusters[1].hex).toBe("#111827");
    expect(r.palette.clusters[1].coverage).toBeCloseTo(0.01, 3);
  });

  it("counts exact colours and significant ones separately", () => {
    const img = canvas(100, 100, WHITE, [
      { x: 0, y: 0, w: 10, h: 10, rgb: INK },
      { x: 20, y: 0, w: 10, h: 10, rgb: BRAND },
      { x: 40, y: 0, w: 1, h: 1, rgb: [1, 2, 3] }, // 0.01% — below the significance floor
    ]);
    const r = measure(img);
    expect(r.palette.distinctExact).toBe(4);
    expect(r.palette.significant).toBe(3); // the 1px colour is not significant
  });

  it("merges indistinguishable colours into one cluster", () => {
    const img = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 50, h: 50, rgb: [254, 254, 254] }]);
    const r = measure(img);
    expect(r.palette.distinctExact).toBe(2);
    expect(r.palette.clusters).toHaveLength(1);
    expect(r.palette.clusters[0].members).toBe(1);
  });

  it("records the source dimensions and scale", () => {
    const img = canvas(40, 20, WHITE);
    const r = measure(img, { name: "shot.png", scale: 2 });
    expect(r.source).toMatchObject({ name: "shot.png", width: 40, height: 20, scale: 2 });
  });

  it("names a stock-region fact when a significant cluster sits on indigo, and stays silent on teal", () => {
    const indigo = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 40, h: 40, rgb: BRAND }]);
    const hit = measure(indigo).stockRegion;
    expect(hit.length).toBeGreaterThan(0);
    expect(hit[0].stop).toBe("indigo-500");
    expect(hit[0].hex).toBe("#4f46e5");
    const teal = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 40, h: 40, rgb: [5, 150, 105] }]);
    expect(measure(teal).stockRegion).toEqual([]);
  });
});

describe("density measurement", () => {
  it("reports background coverage and empty bands", () => {
    // two 10px-tall bars with gaps above, between and below
    const img = canvas(100, 100, WHITE, [
      { x: 10, y: 10, w: 80, h: 10, rgb: INK },
      { x: 10, y: 50, w: 80, h: 10, rgb: INK },
    ]);
    const r = measure(img);
    expect(r.density.backgroundCoverage).toBeCloseTo(0.84, 2);
    expect(r.density.largestEmptyBand).toBe(40); // rows 60..99
    expect(r.density.emptyBands).toBe(3);        // 0..9, 20..49, 60..99
  });
});

describe("contrast measurement", () => {
  it("computes the exact WCAG ratio for a foreground on the dominant background", () => {
    const img = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 30, h: 30, rgb: INK }]);
    const r = measure(img);
    const pair = r.contrast.find((c) => c.fg === "#111827" && c.bg === "#ffffff")!;
    expect(pair).toBeDefined();
    expect(pair.ratio).toBeCloseTo(17.74, 1);
    expect(pair.passesNormal).toBe(true);
  });

  it("flags a failing pair", () => {
    const GREY: [number, number, number] = [170, 170, 170]; // #aaaaaa on white ≈ 2.32:1
    const img = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 30, h: 30, rgb: GREY }]);
    const pair = measure(img).contrast.find((c) => c.fg === "#aaaaaa")!;
    expect(pair.ratio).toBeLessThan(3);
    expect(pair.passesNormal).toBe(false);
    expect(pair.passesLarge).toBe(false);
  });

  it("does not treat a second large area as a foreground", () => {
    // a 50/50 split: both colours are backgrounds, so no pair is produced
    const img = canvas(100, 100, WHITE, [{ x: 0, y: 0, w: 100, h: 50, rgb: INK }]);
    expect(measure(img).contrast).toEqual([]);
  });

  it("orders pairs by how much of the screen the foreground occupies", () => {
    const img = canvas(100, 100, WHITE, [
      { x: 0, y: 0, w: 30, h: 30, rgb: INK },    // 9%
      { x: 50, y: 0, w: 10, h: 10, rgb: BRAND }, // 1%
    ]);
    const r = measure(img);
    expect(r.contrast[0].fg).toBe("#111827");
    expect(r.contrast[1].fg).toBe("#4f46e5");
  });
});

describe("structure detection", () => {
  it("detects a single consistent left edge for an aligned layout", () => {
    const img = canvas(200, 200, WHITE, [
      { x: 32, y: 20, w: 120, h: 12, rgb: INK },
      { x: 32, y: 60, w: 100, h: 12, rgb: INK },
      { x: 32, y: 100, w: 140, h: 12, rgb: INK },
    ]);
    const edges = measure(img).structure.leftEdges;
    expect(edges).not.toBeNull();
    expect(edges!.value).toEqual([32]);
  });

  it("FALSE-POSITIVE GUARD: a perfectly aligned layout reports one edge, never several", () => {
    const rects = Array.from({ length: 8 }, (_, i) => ({ x: 24, y: 10 + i * 24, w: 150, h: 12, rgb: INK }));
    const img = canvas(300, 300, WHITE, rects);
    const edges = measure(img).structure.leftEdges!;
    expect(edges.value).toHaveLength(1);
    expect(edges.value[0]).toBe(24);
  });

  it("FALSE-POSITIVE GUARD: an anti-aliased edge is one edge, not two", () => {
    // Real text and shapes are anti-aliased: the transition spans a couple of
    // columns. Those must merge into a single detected edge, or every screen
    // would look misaligned to us.
    const MID: [number, number, number] = [136, 140, 147];
    const rects: Array<{ x: number; y: number; w: number; h: number; rgb: [number, number, number] }> = [];
    for (let i = 0; i < 6; i++) {
      rects.push({ x: 31, y: 20 + i * 30, w: 1, h: 14, rgb: MID });   // AA column
      rects.push({ x: 32, y: 20 + i * 30, w: 120, h: 14, rgb: INK }); // solid
    }
    const img = canvas(300, 220, WHITE, rects);
    const edges = measure(img).structure.leftEdges!;
    expect(edges.value).toHaveLength(1);
  });

  it("detects genuinely different left edges", () => {
    const img = canvas(300, 300, WHITE, [
      { x: 16, y: 20, w: 150, h: 80, rgb: INK },
      { x: 24, y: 110, w: 150, h: 80, rgb: INK },
      { x: 40, y: 200, w: 150, h: 80, rgb: INK },
    ]);
    const edges = measure(img).structure.leftEdges!;
    expect(edges.value).toEqual([16, 24, 40]);
  });

  it("reports gaps and flags the ones off a 4px grid", () => {
    const img = canvas(100, 100, WHITE, [
      { x: 10, y: 20, w: 80, h: 10, rgb: INK },  // gap above: rows 0..19 = 20
      { x: 10, y: 50, w: 80, h: 10, rgb: INK },  // gap between: rows 30..49 = 20
    ]);                                           // gap below: rows 60..99 = 40
    const s = measure(img).structure;
    expect(s.gaps!.value).toEqual([20, 20, 40]);
    expect(s.offGridGaps).toEqual([]);
  });

  it("halves reported lengths at scale 2", () => {
    const img = canvas(200, 200, WHITE, [{ x: 32, y: 40, w: 120, h: 120, rgb: INK }]);
    const one = measure(img, { scale: 1 }).structure.leftEdges!.value[0];
    const two = measure(img, { scale: 2 }).structure.leftEdges!.value[0];
    expect(one).toBe(32);
    expect(two).toBe(16);
  });

  it("attaches a confidence level and support fraction", () => {
    const img = canvas(200, 200, WHITE, [{ x: 32, y: 0, w: 120, h: 200, rgb: INK }]);
    const edges = measure(img).structure.leftEdges!;
    expect(edges.confidence).toBe("high");
    expect(edges.support).toBeGreaterThanOrEqual(0.25);
  });

  it("reports nothing when there is nothing to detect", () => {
    const img = canvas(100, 100, WHITE);
    const s = measure(img).structure;
    expect(s.leftEdges).toBeNull();
    expect(s.gaps).toBeNull();
  });
});
