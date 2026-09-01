import { describe, it, expect } from "vitest";
import { decodePng } from "../dist/png.js";
import { measure } from "../dist/screenshot.js";
import { renderMarkdown, renderHtml } from "../dist/report.js";
import { encodePng, canvasRows } from "./helpers/pngFixture.js";

function shot() {
  const rows = canvasRows(100, 100, [255, 255, 255], [{ x: 20, y: 20, w: 60, h: 20, rgb: [17, 24, 39] }]);
  return measure(decodePng(encodePng({ width: 100, height: 100, colorType: 2, bitDepth: 8, rows })), { name: "hero.png" });
}

describe("markdown report", () => {
  const md = renderMarkdown(shot());

  it("states the source and dimensions", () => {
    expect(md).toContain("hero.png");
    expect(md).toContain("100×100");
  });

  it("lists the palette with coverage", () => {
    expect(md).toMatch(/#ffffff/);
    expect(md).toMatch(/#111827/);
    expect(md).toMatch(/%/);
  });

  it("states the stock-region fact only when a cluster sits in indigo/violet/purple", () => {
    expect(renderMarkdown(shot())).not.toMatch(/Stock-region accents/);
    const rows = canvasRows(100, 100, [255, 255, 255], [{ x: 0, y: 0, w: 40, h: 40, rgb: [79, 70, 229] }]);
    const indigo = measure(decodePng(encodePng({ width: 100, height: 100, colorType: 2, bitDepth: 8, rows })), { name: "indigo.png" });
    expect(renderMarkdown(indigo)).toMatch(/Stock-region accents/);
    expect(renderMarkdown(indigo)).toContain("indigo-500");
  });

  it("reports contrast with the measured ratio", () => {
    expect(md).toMatch(/17\.\d+:1/);
  });

  it("labels lengths as image pixels when no scale was given", () => {
    expect(md).toMatch(/image px/i);
  });

  it("describes the image, never the interface", () => {
    // The positioning constraint, mechanically checked.
    expect(md).not.toMatch(/your (buttons|layout|design|spacing) (is|are)/i);
    expect(md).toMatch(/detected/i);
  });

  it("carries confidence next to every detection", () => {
    expect(md).toMatch(/confidence: (high|medium)/);
  });
});

describe("HTML report", () => {
  const html = renderHtml(shot(), { version: "0.16.0", measuredAt: "2026-07-25" });

  it("is a complete document", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
  });

  it("is strictly self-contained — no external request is possible", () => {
    expect(html).not.toMatch(/https?:\/\/(?!github\.com\/HalidSaglam)/);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/\ssrc=/i);
  });

  it("styles both colour schemes", () => {
    expect(html).toContain("prefers-color-scheme: dark");
  });

  it("renders a swatch per palette colour", () => {
    expect(html).toContain("background-color:#ffffff");
    expect(html).toContain("background-color:#111827");
  });

  it("carries the discreet footer with version and link", () => {
    expect(html).toMatch(/Measured by SaglitzDesign/);
    expect(html).toContain("0.16.0");
    expect(html).toContain("2026-07-25");
  });

  it("escapes the file name so a hostile path cannot break the document", () => {
    const r = shot();
    r.source.name = '<script>alert(1)</script>.png';
    const out = renderHtml(r, { version: "0.16.0", measuredAt: "2026-07-25" });
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
  });
});
