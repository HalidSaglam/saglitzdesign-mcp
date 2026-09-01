// Renders a ScreenshotReport. Two pure functions over the same data, so the
// markdown an agent reads and the HTML a human opens can never disagree.

import type { ScreenshotReport } from "./screenshot.js";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const pct = (n: number) => `${(n * 100).toFixed(n >= 0.01 ? 1 : 2)}%`;

function unit(r: ScreenshotReport): string {
  return r.source.scale === 1 ? "image px" : `logical px (at ${r.source.scale}× scale)`;
}

export function renderMarkdown(r: ScreenshotReport): string {
  const out: string[] = [
    `# Screenshot measurement — ${r.source.name}`,
    "",
    `${r.source.width}×${r.source.height} image pixels · lengths below are in **${unit(r)}**` +
      (r.source.sampledEveryNth > 1 ? ` · colours sampled every ${r.source.sampledEveryNth}th pixel` : ""),
    "",
    "## Palette",
    "",
    `**${r.palette.significant} significant colour(s)** (≥0.5% of the screen) out of ${r.palette.distinctExact} distinct values.`,
    "",
    "| colour | coverage | merged near-duplicates |",
    "|---|---|---|",
    ...r.palette.clusters.map((c) => `| \`${c.hex}\` | ${pct(c.coverage)} | ${c.members} |`),
    "",
  ];

  if (r.stockRegion.length) {
    out.push(
      `**Stock-region accents.** ${r.stockRegion.length} significant cluster(s) sit in Tailwind's indigo/violet/purple band — a fact about hue, not a defect if this *is* the brand:`,
      "",
      "| colour | coverage | nearest stop | hue Δ |",
      "|---|---|---|---|",
      ...r.stockRegion.map((s) => `| \`${s.hex}\` | ${pct(s.coverage)} | \`${s.stop}\` | ${s.degrees}° |`),
      "",
      "Named in get_design_doc(\"ai-default-aesthetic\"); measured in source by `audit_generic_design`. A genuine indigo brand still lists here.",
      "",
    );
  }

  out.push("## Contrast", "");
  if (r.contrast.length === 0) {
    out.push("_No foreground/background pair was distinct enough to measure._", "");
  } else {
    out.push(
      "Colour pairs present on the screen. The ratio is exact; whether a pair is genuinely text on that background is not something pixels establish.",
      "",
      "| foreground | background | ratio | AA normal (4.5) | AA large / UI (3.0) |",
      "|---|---|---|---|---|",
      ...r.contrast.map((c) =>
        `| \`${c.fg}\` | \`${c.bg}\` | ${c.ratio.toFixed(2)}:1 | ${c.passesNormal ? "✅" : "❌"} | ${c.passesLarge ? "✅" : "❌"} |`),
      "",
    );
    const failing = r.contrast.filter((c) => !c.passesLarge);
    if (failing.length) {
      out.push(`${failing.length} pair(s) fall below 3:1. Repair one with \`fix_contrast\`.`, "");
    }
  }

  out.push(
    "## Density",
    "",
    `- Dominant colour covers **${pct(r.density.backgroundCoverage)}** of the screen.`,
    `- ${r.density.emptyBands} empty horizontal band(s); the tallest is **${r.density.largestEmptyBand} ${unit(r)}**.`,
    "",
    "## Structure",
    "",
  );

  const s = r.structure;
  if (!s.leftEdges && !s.gaps) {
    out.push("_Nothing crossed the detection threshold — no structural claim is made._", "");
  }
  if (s.leftEdges) {
    const v = s.leftEdges.value;
    out.push(
      v.length === 1
        ? `- **1 left edge detected** at x = ${v[0]} — consistent (confidence: ${s.leftEdges.confidence}).`
        : `- **${v.length} left edges detected** at x = ${v.join(", ")} — they do not agree (confidence: ${s.leftEdges.confidence}).`,
    );
  }
  if (s.gaps) {
    out.push(`- **Vertical gaps detected:** ${s.gaps.value.join(", ")} ${unit(r)} (confidence: ${s.gaps.confidence}).`);
    out.push(
      s.offGridGaps.length
        ? `- ${s.offGridGaps.length} gap(s) are not multiples of 4: ${s.offGridGaps.join(", ")}.`
        : "- Every detected gap is a multiple of 4.",
    );
  }

  out.push(
    "",
    "_Measured from the pixels. Exact values: palette, coverage, contrast ratios, density. Detections carry a confidence level and describe the image, not the interface's meaning. Pair with `design_review_checklist` and `get_design_doc(\"design-critique-scoring\")` for judgement._",
  );
  return out.join("\n");
}

const STYLES = `
:root{--bg:#ffffff;--fg:#111827;--muted:#6b7280;--line:#e5e7eb;--card:#f9fafb;--ok:#047857;--bad:#b91c1c}
@media (prefers-color-scheme: dark){:root{--bg:#0b0d12;--fg:#e5e7eb;--muted:#9ca3af;--line:#1f2937;--card:#111827;--ok:#34d399;--bad:#f87171}}
*{box-sizing:border-box}
body{margin:0;padding:2rem 1.25rem;background:var(--bg);color:var(--fg);
 font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:50rem;margin-inline:auto}
h1{font-size:1.5rem;margin:0 0 .25rem}
h2{font-size:1.05rem;margin:2.5rem 0 .75rem;letter-spacing:.02em;text-transform:uppercase;color:var(--muted)}
.sub{color:var(--muted);margin:0 0 .5rem}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(8rem,1fr));gap:.75rem;list-style:none;padding:0}
.swatch{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card)}
.chip{height:3.5rem}
.meta{padding:.5rem .625rem;font-size:.8125rem}
.meta code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.9375rem}
th,td{text-align:left;padding:.5rem .625rem;border-bottom:1px solid var(--line);white-space:nowrap}
th{color:var(--muted);font-weight:600}
.pass{color:var(--ok)}.fail{color:var(--bad)}
ul.findings{padding-left:1.1rem}
.badge{display:inline-block;font-size:.75rem;padding:.05rem .4rem;border:1px solid var(--line);border-radius:999px;color:var(--muted)}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.8125rem}
footer a{color:inherit}
`;

export function renderHtml(r: ScreenshotReport, meta: { version: string; measuredAt: string }): string {
  const e = escapeHtml;
  const u = e(unit(r));

  const swatches = r.palette.clusters.map((c) => `
      <li class="swatch"><div class="chip" style="background-color:${e(c.hex)}"></div>
        <div class="meta"><code>${e(c.hex)}</code><br>${pct(c.coverage)}${c.members ? ` · +${c.members} merged` : ""}</div></li>`).join("");

  const contrastRows = r.contrast.map((c) => `
        <tr><td><code>${e(c.fg)}</code></td><td><code>${e(c.bg)}</code></td><td>${c.ratio.toFixed(2)}:1</td>
        <td class="${c.passesNormal ? "pass" : "fail"}">${c.passesNormal ? "pass" : "fail"}</td>
        <td class="${c.passesLarge ? "pass" : "fail"}">${c.passesLarge ? "pass" : "fail"}</td></tr>`).join("");

  const findings: string[] = [];
  const s = r.structure;
  if (s.leftEdges) {
    const v = s.leftEdges.value;
    findings.push(v.length === 1
      ? `<li>One left edge detected at x = ${v[0]} — consistent. <span class="badge">confidence: ${e(s.leftEdges.confidence)}</span></li>`
      : `<li>${v.length} left edges detected at x = ${v.join(", ")} — they do not agree. <span class="badge">confidence: ${e(s.leftEdges.confidence)}</span></li>`);
  }
  if (s.gaps) {
    findings.push(`<li>Vertical gaps detected: ${s.gaps.value.join(", ")} ${u}. <span class="badge">confidence: ${e(s.gaps.confidence)}</span></li>`);
    findings.push(s.offGridGaps.length
      ? `<li>${s.offGridGaps.length} gap(s) are not multiples of 4: ${s.offGridGaps.join(", ")}.</li>`
      : `<li>Every detected gap is a multiple of 4.</li>`);
  }
  if (!findings.length) findings.push("<li>Nothing crossed the detection threshold — no structural claim is made.</li>");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Screenshot measurement — ${e(r.source.name)}</title>
<style>${STYLES}</style></head>
<body><main>
  <h1>Screenshot measurement</h1>
  <p class="sub"><code>${e(r.source.name)}</code> · ${r.source.width}×${r.source.height} image pixels · lengths in ${u}${
    r.source.sampledEveryNth > 1 ? ` · colours sampled every ${r.source.sampledEveryNth}th pixel` : ""
  }</p>

  <h2>Palette</h2>
  <p class="sub"><strong>${r.palette.significant}</strong> significant colour(s) covering at least 0.5% of the screen, out of ${r.palette.distinctExact} distinct values.</p>
  <ul class="swatches">${swatches}</ul>
  ${r.stockRegion.length ? `<p class="sub"><strong>Stock-region accents.</strong> ${r.stockRegion.length} significant cluster(s) sit in Tailwind's indigo/violet/purple band (${r.stockRegion.map((s) => `<code>${e(s.hex)}</code> → <code>${e(s.stop)}</code> ${s.degrees}°`).join("; ")}). A genuine indigo brand still lists here.</p>` : ""}

  <h2>Contrast</h2>
  ${r.contrast.length === 0
    ? `<p class="sub">No foreground/background pair was distinct enough to measure.</p>`
    : `<p class="sub">Colour pairs present on the screen. The ratio is exact; whether a pair is genuinely text on that background is not something pixels establish.</p>
  <div class="scroll"><table><thead><tr><th>foreground</th><th>background</th><th>ratio</th><th>AA normal</th><th>AA large / UI</th></tr></thead>
  <tbody>${contrastRows}</tbody></table></div>`}

  <h2>Density</h2>
  <ul class="findings">
    <li>Dominant colour covers ${pct(r.density.backgroundCoverage)} of the screen.</li>
    <li>${r.density.emptyBands} empty horizontal band(s); the tallest is ${r.density.largestEmptyBand} ${u}.</li>
  </ul>

  <h2>Structure</h2>
  <ul class="findings">${findings.join("")}</ul>

  <footer>Measured by SaglitzDesign v${e(meta.version)} on ${e(meta.measuredAt)} ·
    <a href="https://github.com/HalidSaglam/saglitzdesign-mcp">saglitzdesign-mcp</a></footer>
</main></body></html>`;
}
