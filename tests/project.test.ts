import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  scanProject, auditProject, projectAuditReport,
  MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES,
  PROJECT_NOT_VISIBLE, PROJECT_PREAMBLE, PROJECT_CLOSING,
} from "../dist/project.js";
import { designLint } from "../dist/lint.js";
import { contrastRatio } from "../dist/a11y.js";
import { securityReport } from "../dist/security.js";
import { genericReport } from "../dist/generic.js";
import { seoReport } from "../dist/seo.js";
import { perfReport } from "../dist/perf.js";

// The auditors were only usable on pasted strings, so nobody could afford to
// run them on a real codebase. These tests cover the walk and, above all, the
// limits: an audit that quietly stops early but reads as complete is worse than
// no audit.

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "saglitz-project-"));
  mkdirSync(join(root, "src", "components"), { recursive: true });
  mkdirSync(join(root, "node_modules", "junk"), { recursive: true });
  mkdirSync(join(root, "dist"), { recursive: true });
  mkdirSync(join(root, ".git"), { recursive: true });

  writeFileSync(join(root, "src", "components", "Card.tsx"), '<img src="/a.png" />\n');
  writeFileSync(join(root, "src", "styles.css"), ".a{color:#111827;border-radius:6px}\n.b{color:#111928;border-radius:7px}\n");
  writeFileSync(join(root, "src", "logic.ts"), 'export const x = "#ff0000";\n');
  writeFileSync(join(root, "node_modules", "junk", "bad.css"), ".x{color:#123456}\n");
  writeFileSync(join(root, "dist", "built.css"), ".y{color:#654321}\n");
  writeFileSync(join(root, ".git", "config.css"), ".z{color:#abcdef}\n");
  writeFileSync(join(root, "huge.css"), `/* big */\n${"a".repeat(MAX_FILE_BYTES + 10)}\n`);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("scanning", () => {
  it("walks source and never enters build or vendor output", () => {
    const files = scanProject(root).files.map((f) => f.path.replace(/\\/g, "/"));
    expect(files).toContain("src/components/Card.tsx");
    expect(files).toContain("src/styles.css");
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files.some((f) => f.startsWith("dist/"))).toBe(false);
    expect(files.some((f) => f.startsWith(".git"))).toBe(false);
  });

  it("excludes .ts by default, and includes it when asked", () => {
    expect(scanProject(root).files.some((f) => f.path.endsWith("logic.ts"))).toBe(false);
    expect(scanProject(root, [".ts"]).files.some((f) => f.path.endsWith("logic.ts"))).toBe(true);
  });

  it("skips a file over the per-file cap and names it", () => {
    const scan = scanProject(root);
    expect(scan.files.some((f) => f.path === "huge.css")).toBe(false);
    expect(scan.skippedLarge).toContain("huge.css");
  });

  it("is deterministic", () => {
    expect(scanProject(root).files.map((f) => f.path)).toEqual(scanProject(root).files.map((f) => f.path));
  });

  it("scans files matched by exact name even without an extension", () => {
    const dir = mkdtempSync(join(tmpdir(), "sd-scan-"));
    writeFileSync(join(dir, "_headers"), "/*\n  X-Frame-Options: DENY\n");
    writeFileSync(join(dir, "app.css"), "a { color: red }");

    const withNames = scanProject(dir, [".css"], ["_headers"]);
    expect(withNames.files.map((f) => f.path).sort()).toEqual(["_headers", "app.css"]);

    const withoutNames = scanProject(dir, [".css"]);
    expect(withoutNames.files.map((f) => f.path)).toEqual(["app.css"]);
  });

  // A `filenames` entry carrying a `/` is a path tail rather than a basename.
  // `audit_apple_ui` needs it because `Contents.json` is one file per asset
  // entry in an Xcode catalog and only the colorsets among them are readable:
  // matching the basename pulled in every imageset for nothing.
  it("matches a filenames entry containing a slash against the end of the path", () => {
    const dir = mkdtempSync(join(tmpdir(), "sd-tail-"));
    mkdirSync(join(dir, "Assets.xcassets", "Brand.colorset"), { recursive: true });
    mkdirSync(join(dir, "Assets.xcassets", "Logo.imageset"), { recursive: true });
    writeFileSync(join(dir, "Assets.xcassets", "Contents.json"), "{}");
    writeFileSync(join(dir, "Assets.xcassets", "Brand.colorset", "Contents.json"), "{}");
    writeFileSync(join(dir, "Assets.xcassets", "Logo.imageset", "Contents.json"), "{}");
    writeFileSync(join(dir, "app.css"), "a { color: red }");

    const tail = scanProject(dir, [".css"], [".colorset/Contents.json"]);
    expect(tail.files.map((f) => f.path.replace(/\\/g, "/")).sort())
      .toEqual(["Assets.xcassets/Brand.colorset/Contents.json", "app.css"]);

    // The basename spelling is what it replaces, and it takes all three.
    const basename = scanProject(dir, [".css"], ["Contents.json"]);
    expect(basename.files).toHaveLength(4);

    rmSync(dir, { recursive: true, force: true });
  });

  // Name matches are read *first*; they are not read *extra*. They were exempt
  // from both caps until v0.25.0, on the assumption that configuration is a
  // handful of small files — an assumption a caller can break by choosing a
  // popular basename, and `audit_apple_ui` did. A cap a caller can lift is not
  // a cap, and two shipped disclosure sentences stated it as absolute.
  it("counts name matches against the file cap rather than exempting them", () => {
    const dir = mkdtempSync(join(tmpdir(), "sd-namecap-"));
    for (let i = 0; i < MAX_FILES + 20; i++) {
      mkdirSync(join(dir, `d${String(i).padStart(4, "0")}`));
      writeFileSync(join(dir, `d${String(i).padStart(4, "0")}`, "_headers"), "/*\n");
    }
    writeFileSync(join(dir, "app.css"), "a { color: red }");

    const scan = scanProject(dir, [".css"], ["_headers"]);
    expect(scan.files).toHaveLength(MAX_FILES);
    expect(scan.hitFileCap).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("counts name matches against the total-bytes cap rather than exempting them", () => {
    const dir = mkdtempSync(join(tmpdir(), "sd-namebytes-"));
    const body = "/*\n" + "x".repeat(200 * 1024);
    for (let i = 0; i < 20; i++) {
      mkdirSync(join(dir, `d${String(i).padStart(4, "0")}`));
      writeFileSync(join(dir, `d${String(i).padStart(4, "0")}`, "_headers"), body);
    }

    const scan = scanProject(dir, [".css"], ["_headers"]);
    expect(scan.scannedBytes).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
    expect(scan.hitByteCap).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  // Priority is the half that has to survive: the whole reason name matches
  // are read first is that alphabetical order otherwise pushes the one file
  // declaring the security headers out of a 420-component project.
  it("still reads a name match ahead of the source files that would have crowded it out", () => {
    const dir = mkdtempSync(join(tmpdir(), "sd-priority-"));
    mkdirSync(join(dir, "app"));
    for (let i = 0; i < MAX_FILES + 20; i++) {
      writeFileSync(join(dir, "app", `c${String(i).padStart(4, "0")}.css`), "a { color: red }");
    }
    writeFileSync(join(dir, "next.config.js"), "module.exports = {};\n");

    const scan = scanProject(dir, [".css"], ["next.config.js"]);
    expect(scan.files.map((f) => f.path)).toContain("next.config.js");
    expect(scan.files).toHaveLength(MAX_FILES);
    expect(scan.hitFileCap).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("auditing", () => {
  it("attaches a file to every finding", () => {
    const { findings } = auditProject(root);
    const img = findings.find((f) => f.rule === "img-no-alt")!;
    expect(img).toBeDefined();
    expect(img.file.replace(/\\/g, "/")).toBe("src/components/Card.tsx");
    expect(img.line).toBeGreaterThan(0);
  });

  it("scores consistency across files, not per file", () => {
    // The two near-identical colours live in one file here, but the point is
    // that the score is computed over the whole project at once.
    const { system } = auditProject(root);
    expect(system.duplicateColors.length).toBeGreaterThan(0);
  });

  it("ranks files by how much needs fixing", () => {
    const { worstFiles } = auditProject(root);
    expect(worstFiles[0].errors).toBeGreaterThanOrEqual(worstFiles[worstFiles.length - 1].errors);
  });
});

describe("the report never reads as complete when it is not", () => {
  it("names what it skipped", () => {
    const report = projectAuditReport(root).text;
    expect(report).toMatch(/What this did not look at/);
    expect(report).toMatch(/node_modules/);
    expect(report).toMatch(/Capped:.*huge\.css|huge\.css/);
  });

  it("carries the caveat that budgets are calibrated for one product", () => {
    expect(projectAuditReport(root).text).toMatch(/calibrated for one product/i);
  });

  it("says so plainly when there is nothing to audit", () => {
    const empty = mkdtempSync(join(tmpdir(), "saglitz-empty-"));
    expect(projectAuditReport(empty).text).toMatch(/Found no design source/);
    rmSync(empty, { recursive: true, force: true });
  });
});

// Pinned before `projectAuditReport` gained a "Not visible to this audit"
// section, so the diff of that change can be judged against the exact bytes
// this report rendered beforehand rather than against itself. The disclosure
// section is new text and is the point of the change; everything above it —
// the header, the consistency table, the findings, the "What this did not look
// at" list and the closing italic — must come out unchanged, and this is what
// says so.
//
// The body is taken as everything above the new section's heading and trimmed
// at the end: the section is appended after a blank separator line, so the only
// byte that legitimately differs above it is trailing whitespace nothing
// renders.
describe("the report above the disclosure section, pinned before that section existed", () => {
  let pinRoot: string;

  beforeAll(() => {
    pinRoot = mkdtempSync(join(tmpdir(), "saglitz-pin-"));
    mkdirSync(join(pinRoot, "src"), { recursive: true });
    writeFileSync(join(pinRoot, "src", "Card.tsx"), '<img src="/a.png" />\n<div onClick={go}>Go</div>\n');
    writeFileSync(
      join(pinRoot, "src", "styles.css"),
      ".a{color:#111827;border-radius:6px}\n.b{color:#111928;border-radius:7px}\n",
    );
  });

  afterAll(() => rmSync(pinRoot, { recursive: true, force: true }));

  /** The report above the disclosure section, with the tmp path made stable. */
  const pinnedBody = (root: string): string =>
    projectAuditReport(root).text.split("## Not visible to this audit")[0].trimEnd().replaceAll(root, "<root>");

  it("renders the findings half exactly as it did before", () => {
    expect(pinnedBody(pinRoot)).toMatchInlineSnapshot(`
      "# Project design audit

      \`<root>\` — 2 file(s), 0 KB scanned.

      **1 error · 3 warning · 2 info** across 2 file(s) · **consistency 96/100**

      ## Is it one system?

      _Budgets are calibrated for one product's UI. A portfolio showing ten brands, a multi-tenant app, or a component library demonstrating every state in both themes legitimately exceeds them — read the numbers, not just the score._

      | dimension | distinct | budget | |
      |---|---|---|---|
      | Colors | 2 | ≤ 14 | ✅ |
      | Font sizes | 0 | ≤ 9 | ✅ |
      | Border radii | 2 | ≤ 4 | ✅ |
      | Shadows | 0 | ≤ 6 | ✅ |
      | Spacing values | 0 | ≤ 12 | ✅ |

      - **1 indistinguishable colour(s)** across the project: keep \`#111827\`, drop \`#111928\`

      ## Findings, worst file first

      ### \`src/Card.tsx\` — 1 error · 1 warning · 0 info
      - 🔴 **L1** \`img-no-alt\` — <img> without an alt attribute — invisible/opaque to screen readers.
      - 🟡 **L2** \`clickable-div\` — Clickable <div> without a role — not focusable or announced as interactive.

      ### \`src/styles.css\` — 0 error · 2 warning · 2 info
      - 🟡 **L1** \`hardcoded-color\` — Hardcoded hex color instead of a design token.
      - 🔵 **L1** \`magic-number-radius\` — Ad-hoc border-radius — mixed radii look accidental.
      - 🟡 **L2** \`hardcoded-color\` — Hardcoded hex color instead of a design token.
      - 🔵 **L2** \`magic-number-radius\` — Ad-hoc border-radius — mixed radii look accidental.

      Fixes for each rule are in \`design_lint\` — run it on a single file to get the fix text, or read the rule id.

      ## What this did not look at

      - Directories never scanned: node_modules, .git, .hg, .svn, dist, build, out, .next, and other build/vendor output.
      - Extensions scanned: .css, .scss, .sass, .less, .html, .htm, .jsx, .tsx, .vue, .svelte, .astro. \`.js\`/\`.ts\` are excluded by default — pass them explicitly if your components live there.
      - \`.gitignore\` is not parsed; the skip list above is fixed.
      - Copy is not audited here: run \`audit_ux_copy\` on the strings that matter. Screens are not measured: run \`measure_screenshot\` on a PNG.

      _Static analysis of the files as written. It cannot see values that arrive at runtime, from a theme provider, or from a framework's own defaults._"
    `);
  });

  it("renders the nothing-to-audit half exactly as it did before", () => {
    const empty = mkdtempSync(join(tmpdir(), "saglitz-pin-empty-"));
    expect(pinnedBody(empty)).toMatchInlineSnapshot(`
      "# Project design audit

      Found no design source under \`<root>\`.

      Looked for .css, .scss, .sass, .less, .html, .htm, .jsx, .tsx, .vue, .svelte, .astro outside node_modules, .git, .hg, .svn, dist, build and friends.

      _If your components live in \`.js\`/\`.ts\`, pass those extensions explicitly — they are excluded by default because most such files are logic, and linting them for missing alt text buries the real findings._"
    `);
    rmSync(empty, { recursive: true, force: true });
  });
});

// ── the structured half ──────────────────────────────────────────────────────

/** A throwaway project directory, removed when the test that made it ends. */
function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "saglitz-fx-"));
  for (const [path, body] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

const ruleIds = (r: { findings: Array<{ rule: string }> }): string[] =>
  [...new Set(r.findings.map((f) => f.rule))].sort();

describe("audit_project answers a machine as well as a reader", () => {
  it("reports what the scan actually read, beside the findings", () => {
    const r = projectAuditReport(join(__dirname, "..", "recipes"));
    expect(r.structured.scan.filesRead).toBeGreaterThan(0);
    expect(r.structured.scan.scannedBytes).toBeGreaterThan(0);
    expect(r.structured.scan.hitFileCap).toBe(false);
    expect(r.structured.scan.hitByteCap).toBe(false);
    expect(r.structured.scan.skippedLarge).toEqual([]);
    expect(r.structured.scan.unreadable).toEqual([]);
    expect(r.structured.notVisible.length).toBeGreaterThan(0);
  });

  it("copies the scan from the scan, rather than recomputing it", () => {
    const dir = fixture({
      "small.css": ".a{color:#ff0000}\n",
      "huge.css": `.b{color:#00ff00}\n/*${"c".repeat(MAX_FILE_BYTES)}*/\n`,
    });
    const scan = scanProject(dir);
    const { structured } = projectAuditReport(dir);
    expect(structured.scan).toEqual({
      filesRead: scan.files.length,
      scannedBytes: scan.scannedBytes,
      skippedLarge: scan.skippedLarge,
      hitFileCap: scan.hitFileCap,
      hitByteCap: scan.hitByteCap,
      unreadable: scan.unreadable,
    });
    expect(structured.scan.skippedLarge).toEqual(["huge.css"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("carries every finding as fields, each with the file it came from", () => {
    const dir = fixture({ "src/Card.tsx": '<img src="/a.png" />\n' });
    const { structured } = projectAuditReport(dir);
    const img = structured.findings.find((f) => f.rule === "img-no-alt")!;
    expect(img).toBeDefined();
    expect(img.file!.replace(/\\/g, "/")).toBe("src/Card.tsx");
    expect(img.line).toBe(1);
    expect(img.severity).toBe("error");
    expect(img.fix.length).toBeGreaterThan(10);
    expect(img.doc).toBe("accessibility");
    rmSync(dir, { recursive: true, force: true });
  });

  it("summarises the same list it returns", () => {
    const dir = fixture({
      "a.css": ".a{color:#111827;border-radius:6px}\n.b{color:#111928;border-radius:7px}\n",
      "b.tsx": '<img src="/a.png" />\n<div onClick={go}>Go</div>\n',
    });
    const { structured } = projectAuditReport(dir);
    const count = (s: string) => structured.findings.filter((f) => f.severity === s).length;
    expect(structured.summary).toEqual({ error: count("error"), warning: count("warning"), info: count("info") });
    expect(structured.summary.error + structured.summary.warning + structured.summary.info)
      .toBe(structured.findings.length);
    rmSync(dir, { recursive: true, force: true });
  });

  // One array, two renderings. A disclosure list typed separately from the
  // field that reports it drifts, and when it does neither reader can tell
  // which one is lying.
  it("prints every notVisible entry in the markdown it returns, on both branches", () => {
    const audited = fixture({ "a.css": ".a{color:#ff0000}\n" });
    const empty = mkdtempSync(join(tmpdir(), "saglitz-fx-empty-"));
    for (const dir of [audited, empty]) {
      const r = projectAuditReport(dir);
      expect(r.structured.notVisible).toEqual(PROJECT_NOT_VISIBLE);
      expect(r.structured.notVisible.length).toBeGreaterThan(0);
      expect(r.text).toContain("## Not visible to this audit");
      expect(r.text).toContain(PROJECT_PREAMBLE);
      expect(r.text.endsWith(PROJECT_CLOSING)).toBe(true);
      for (const entry of r.structured.notVisible) expect(r.text).toContain(entry);
    }
    rmSync(audited, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  });

  // The nothing-to-audit branch is where a caller most needs the scan: it is
  // the branch a permissions failure lands in.
  it("still reports the scan when it found nothing to audit", () => {
    const empty = mkdtempSync(join(tmpdir(), "saglitz-fx-empty2-"));
    const r = projectAuditReport(empty);
    expect(r.text).toMatch(/Found no design source/);
    expect(r.structured.findings).toEqual([]);
    expect(r.structured.summary).toEqual({ error: 0, warning: 0, info: 0 });
    expect(r.structured.scan.filesRead).toBe(0);
    rmSync(empty, { recursive: true, force: true });
  });

  it("closes without implying that an empty findings list is a pass", () => {
    expect(PROJECT_CLOSING).toMatch(/not that the project is sound, and not that it was all read/i);
    expect(PROJECT_CLOSING).toMatch(/`scan` says how much of it was/);
  });
});

// Every sentence in PROJECT_NOT_VISIBLE was written after running the tool on
// the directory built below it, and these are those runs. The order keeps the
// pair honest: first what the tool does, then that the sentence says it. A
// sentence with no demonstration here does not belong in the list.
describe("what audit_project cannot see — one demonstration per disclosure entry", () => {
  const notVisible = PROJECT_NOT_VISIBLE.join("\n");
  /**
   * The report above the disclosure section. Several entries below assert that
   * a word never reaches the report — and the entry making the claim quotes
   * that very word, so the absence has to be checked where the claim is about.
   */
  const reportBody = (dir: string): string =>
    projectAuditReport(dir).text.split("## Not visible to this audit")[0];

  /**
   * The report's own "What this did not look at" section — where its cap and
   * skip notices are rendered — and nothing else.
   *
   * Two entries below quote their notice verbatim, which is what makes them
   * checkable prose; it also means the quoted string is in every report the
   * tool ever prints, cap or no cap. A `text.toContain(bullet)` assertion
   * therefore stopped testing the renderer the moment the quote landed in the
   * list: deleting the notice from the renderer left the whole file green.
   * A quote and its guard cannot be the same string match, so the guards below
   * are scoped to the section that is supposed to carry the notice, and counted
   * against an uncapped run of the same shape.
   */
  const didNotLookAt = (dir: string, extensions?: string[]): string => {
    const t = projectAuditReport(dir, extensions).text;
    const start = t.indexOf("## What this did not look at");
    const end = t.indexOf("## Not visible to this audit");
    expect(start, "report has no \"What this did not look at\" section").toBeGreaterThan(-1);
    return t.slice(start, end);
  };

  const countOf = (haystack: string, needle: string): number => haystack.split(needle).length - 1;
  const asRoot = typeof process.getuid === "function" && process.getuid() === 0;

  it("has an entry for every demonstration below, and no empty list", () => {
    expect(PROJECT_NOT_VISIBLE.length).toBe(15);
    for (const entry of PROJECT_NOT_VISIBLE) expect(entry.startsWith("**")).toBe(true);
  });

  it("1. measures nothing and renders nothing", () => {
    const dir = fixture({ "a.css": ".a { color: #777777; background: #888888; padding: 13px 27px; }\n" });
    const a = auditProject(dir);
    // One finding about the text, and not one word about the two colours
    // together — 3.6:1 here — or about the rhythm of 13/27px.
    expect(a.findings.map((f) => f.rule)).toEqual(["hardcoded-color"]);
    expect(reportBody(dir)).not.toMatch(/contrast/i);
    expect(notVisible).toMatch(/Nothing here is measured, and nothing is rendered/);
    expect(notVisible).toMatch(/No contrast ratio is computed/);
    expect(notVisible).toMatch(/says nothing whatever about how those two colours read against each other/);
    // The one computed number that entry does not park: near-duplicate colours
    // are found by colour-distance arithmetic over the written values.
    const dupes = fixture({ "b.css": ".a{color:#111827}\n.b{color:#111928}\n" });
    expect(auditProject(dupes).system.duplicateColors.length).toBe(1);
    expect(notVisible).toMatch(/not the colour-distance arithmetic that calls two written values indistinguishable/);
    // Three numbers this report prints, each from a different place: a count
    // read off the text, a budget that is a constant, and a score that is a
    // formula over both. The entry no longer enumerates where they come from —
    // it denies, of each, the one source that would make it a measurement.
    expect(auditProject(dupes).system.dimensions.map((d) => d.budget)).toEqual([14, 9, 4, 6, 12]);
    expect(auditProject(dupes).system.dimensions[0].unique).toBe(2);
    expect(auditProject(dupes).system.score).toBe(96);
    expect(notVisible).toMatch(/No number above is measured from a rendered page/);
    expect(notVisible).toMatch(/not the consistency score computed from both/);
    rmSync(dupes, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  });

  it("2. runs design_lint's rules and the consistency count, and no other auditor's", () => {
    const page =
      `<!doctype html><html lang="en"><head><script src="https://cdn.example.com/a.js"></script></head>\n` +
      `<body><main><h1>A</h1><h1>B</h1>\n` +
      `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"><h3>🚀 Fast</h3></div>\n` +
      `<img src="/hero.jpg" alt="Hero" loading="lazy" fetchpriority="high">\n` +
      `</main></body></html>`;
    const dir = fixture({ "index.html": page });

    expect(auditProject(dir).findings).toEqual([]);

    // The same file, handed to the four auditors this one does not run.
    expect(ruleIds(securityReport({ root: dir }).structured)).toContain("external-script-no-sri");
    expect(ruleIds(securityReport({ root: dir }).structured)).toContain("csp-missing");
    expect(ruleIds(genericReport({ root: dir }).structured)).toEqual(["ai-default-gradient", "emoji-as-icon"]);
    expect(ruleIds(seoReport({ source: page, filename: "index.html" }).structured)).toContain("multiple-h1");
    expect(ruleIds(perfReport({ source: page, filename: "index.html" }).structured)).toContain("lazy-hero");

    expect(notVisible).toMatch(/the consistency table is `audit_design_system` over the same files, and contributes no findings/);
    // The fifth auditor it does not run is the one that answers entry 1's
    // "no contrast ratio is computed" — from pairs, not from any file.
    expect(contrastRatio("#6B7280", "#FFFFFF")).toBeCloseTo(4.83, 2);
    expect(notVisible).toMatch(/neither is `audit_accessibility`/);
    expect(notVisible).toContain("`#6B7280` on `#FFFFFF` came back 4.83:1");
    expect(notVisible).toMatch(/The rules owned by `audit_security`, `audit_generic_design`, `audit_seo_geo` and `audit_performance` are not run here at all/);
    for (const rule of ["external-script-no-sri", "csp-missing", "ai-default-gradient", "emoji-as-icon", "multiple-h1", "lazy-hero"]) {
      expect(notVisible, rule).toContain(rule);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("3. inherits design_lint's own blind spots", () => {
    const dir = fixture({
      "App.vue": `<template><div @click="go">Go</div></template>\n`,
      "App.jsx": `<div onClick={go}>Go</div>\n`,
    });
    const a = auditProject(dir);
    expect(a.findings.map((f) => `${f.file}:${f.rule}`)).toEqual(["App.jsx:clickable-div"]);
    expect(notVisible).toMatch(/Everything `design_lint` cannot see/);
    expect(notVisible).toMatch(/It carries its own disclosure list, which this one does not repeat/);

    // Not inherited — manufactured by the per-file split, in the tool whose
    // whole claim is that it reads across files. The evidence that would
    // silence the rule is in the project and is never handed to the linter.
    const split = fixture({
      "a.css": ".btn { outline: none; }\n",
      "b.css": ".btn:focus { outline: 2px solid blue; }\n",
    });
    expect(auditProject(split).findings.map((f) => `${f.file}:L${f.line}:${f.rule}:${f.severity}`))
      .toEqual(["a.css:L1:outline-none:error"]);
    // The same two lines as one design_lint snippet: nothing at all.
    expect(designLint(".btn { outline: none; }\n.btn:focus { outline: 2px solid blue; }\n")).toEqual([]);
    expect(notVisible).toMatch(/One cost is not inherited but manufactured here/);
    expect(notVisible).toMatch(/it lands on a rule graded `error`/);
    // Not *the* highest-severity rule: img-no-alt is graded error as well.
    expect(designLint(`<img src="/a.png" />`).map((f) => f.severity)).toEqual(["error"]);
    expect(notVisible).toMatch(/that linter's own remedy, lint the markup and the CSS together, is not available through this tool/);
    rmSync(split, { recursive: true, force: true });
    expect(notVisible).toMatch(/<div @click="go">/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("4a. stops at the file cap and reads nothing after it", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < MAX_FILES + 5; i++) files[`a/f${String(i).padStart(4, "0")}.css`] = `.f${i}{color:#00${i % 10}f00}\n`;
    files["z/Late.tsx"] = '<img src="/a.png" />\n';
    const dir = fixture(files);

    const scan = scanProject(dir);
    expect(scan.files.length).toBe(MAX_FILES);
    expect(scan.hitFileCap).toBe(true);
    expect(scan.files.some((f) => f.path.includes("Late"))).toBe(false);
    // The defect in the file the cap cut off is simply absent.
    expect(auditProject(dir).findings.some((f) => f.rule === "img-no-alt")).toBe(false);

    const r = projectAuditReport(dir);
    // The notice is one bullet, and it is not on the header line: that line
    // counts what was read and reads exactly like a complete scan.
    const capBullet = `- **Capped:** the ${MAX_FILES}-file cap was reached, so later files were not read.`;
    expect(didNotLookAt(dir)).toContain(capBullet);
    // Counted, not merely present: the disclosure quotes the same bullet, so a
    // capped run carries it twice and an uncapped run of the same shape once.
    expect(countOf(r.text, capBullet)).toBe(2);
    const uncapped = fixture({ "a.css": ".a{color:#ff0000}\n" });
    expect(projectAuditReport(uncapped).structured.scan.hitFileCap).toBe(false);
    expect(countOf(projectAuditReport(uncapped).text, capBullet)).toBe(1);
    expect(didNotLookAt(uncapped)).not.toContain("**Capped:**");
    rmSync(uncapped, { recursive: true, force: true });
    const header = r.text.split("\n").slice(0, 5).join("\n");
    expect(header).toContain(`${MAX_FILES} file(s), 8 KB scanned`);
    expect(header).not.toMatch(/cap|Capped|partial|truncat/i);
    expect(notVisible).toContain("reads exactly like a complete scan");
    expect(notVisible).toContain(`- **Capped:** the ${MAX_FILES}-file cap was reached, so later files were not read.`);
    expect(r.structured.scan.hitFileCap).toBe(true);
    expect(r.structured.scan.filesRead).toBe(MAX_FILES);

    expect(notVisible).toContain(`It reads at most ${MAX_FILES} files`);
    expect(notVisible).toMatch(/it stops at the \*first\* file that would cross either line/);
    expect(notVisible).toContain(`A project of ${MAX_FILES + 5} stylesheets under \`a/\` plus one component under \`z/\` was read to ${MAX_FILES} files`);
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);

  it("4b. stops at the total-byte cap and reads nothing after it", () => {
    const big = `/* x */\n.pad{content:'${"a".repeat(450 * 1024)}'}\n`;
    const files: Record<string, string> = { "z/Late.tsx": '<img src="/a.png" />\n' };
    for (let i = 0; i < 8; i++) files[`a/big${i}.css`] = big;
    const dir = fixture(files);

    const scan = scanProject(dir);
    expect(scan.hitByteCap).toBe(true);
    expect(scan.hitFileCap).toBe(false);
    expect(scan.files.length).toBe(6);
    expect(scan.scannedBytes).toBeLessThan(MAX_TOTAL_BYTES);
    expect(scan.files.some((f) => f.path.includes("Late"))).toBe(false);
    expect(auditProject(dir).findings.some((f) => f.rule === "img-no-alt")).toBe(false);

    const r = projectAuditReport(dir);
    expect(didNotLookAt(dir)).toContain(`- **Capped:** the ${(MAX_TOTAL_BYTES / 1024).toFixed(0)} KB total cap was reached, so later files were not read.`);
    expect(r.structured.scan.hitByteCap).toBe(true);

    expect(notVisible).toContain("at most 3072 KB in total");
    expect(notVisible).toContain("eight 450 KB stylesheets exhausted the byte budget after six (2700 KB read)");
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);

  it("5. skips a file over the per-file cap whole, and carries on", () => {
    const dir = fixture({
      "huge.css": `.a{color:#ff0000}\n/*${"b".repeat(MAX_FILE_BYTES)}*/\n`,
      "small.css": ".b{color:#00ff00}\n",
    });
    const scan = scanProject(dir);
    expect(scan.skippedLarge).toEqual(["huge.css"]);
    expect(scan.files.map((f) => f.path)).toEqual(["small.css"]);
    expect(scan.hitFileCap).toBe(false);
    // The oversized file's own hex is neither linted nor counted.
    expect(auditProject(dir).findings.map((f) => `${f.file}:${f.rule}`)).toEqual(["small.css:hardcoded-color"]);
    expect(auditProject(dir).system.dimensions.find((d) => d.id === "color")!.unique).toBe(1);

    const r = projectAuditReport(dir);
    expect(didNotLookAt(dir)).toContain(`- **Capped:** 1 file(s) over ${(MAX_FILE_BYTES / 1024).toFixed(0)} KB were skipped: huge.css.`);
    expect(r.structured.scan.skippedLarge).toEqual(["huge.css"]);
    expect(notVisible).toContain("skipped whole rather than truncated");
    expect(notVisible).toContain("The report names up to five such files");
    rmSync(dir, { recursive: true, force: true });
  });

  // The two demonstrations below need a permissions failure, which only a
  // non-root process can stage — there is no portable substitute (a dangling
  // symlink never becomes a candidate, so it cannot populate `unreadable`).
  // The sentence's wording is pinned here instead, unskipped, so a root runner
  // cannot take the entry's only assertion away with the demonstration.
  it("6-pin. keeps the wording of the unreadable-path entry, root or not", () => {
    expect(notVisible).toMatch(/A path this process could not open/);
    expect(notVisible).toContain("1 path(s) could not be read");
    expect(notVisible).toMatch(/`scan.unreadable` carries the paths/);
    expect(notVisible).toMatch(/a permissions problem reads exactly like an empty project/);
  });

  it.skipIf(asRoot)("6. records a path it could not open, and names it only in the structured scan", () => {
    const dir = fixture({ "ok.css": ".a{color:#ff0000}\n", "secret.css": ".b{color:#00ff00}\n" });
    chmodSync(join(dir, "secret.css"), 0o000);
    try {
      const scan = scanProject(dir);
      expect(scan.unreadable).toEqual(["secret.css"]);
      expect(scan.files.map((f) => f.path)).toEqual(["ok.css"]);

      const r = projectAuditReport(dir);
      expect(didNotLookAt(dir)).toContain("- **Capped:** 1 path(s) could not be read.");
      // Same trap as the cap bullet: the disclosure quotes this string too.
      expect(countOf(r.text, "1 path(s) could not be read")).toBe(2);
      expect(reportBody(dir)).not.toContain("secret.css");  // counted, never named
      expect(r.structured.scan.unreadable).toEqual(["secret.css"]);
      expect(notVisible).toContain("`1 path(s) could not be read`");
    } finally {
      chmodSync(join(dir, "secret.css"), 0o644);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(asRoot)("6b. reports a wholly unreadable project as empty, with the paths only in the scan", () => {
    const dir = fixture({ "locked/x.css": ".b{color:#00ff00}\n" });
    chmodSync(join(dir, "locked"), 0o000);
    try {
      const r = projectAuditReport(dir);
      expect(r.text).toMatch(/Found no design source/);
      expect(reportBody(dir)).not.toMatch(/could not be read/);
      expect(r.structured.scan.unreadable).toEqual(["locked"]);
      expect(notVisible).toMatch(/a permissions problem reads exactly like an empty project/);
    } finally {
      chmodSync(join(dir, "locked"), 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("7. never follows a symbolic link, and never mentions one", () => {
    const outside = fixture({ "Linked.tsx": '<img src="/a.png" />\n', "pkg/Deep.tsx": '<img src="/b.png" />\n' });
    const dir = fixture({ "Real.tsx": '<img src="/c.png" />\n' });
    symlinkSync(join(outside, "Linked.tsx"), join(dir, "Linked.tsx"));
    symlinkSync(join(outside, "pkg"), join(dir, "pkg"));

    const scan = scanProject(dir);
    expect(scan.files.map((f) => f.path)).toEqual(["Real.tsx"]);
    // Stepped over in silence: in neither list a reader would check.
    expect(scan.unreadable).toEqual([]);
    expect(scan.skippedLarge).toEqual([]);
    const r = projectAuditReport(dir);
    expect(r.structured.findings.map((f) => f.file)).toEqual(["Real.tsx"]);
    expect(reportBody(dir)).not.toContain("Linked.tsx");
    expect(reportBody(dir)).not.toContain("Deep.tsx");

    // The counter-example that belongs beside the claim: the path you pass is
    // resolved, so auditing *through* a link at the top reads the real tree.
    const linkParent = mkdtempSync(join(tmpdir(), "saglitz-fx-link-"));
    const linkedRoot = join(linkParent, "linked-root");
    symlinkSync(outside, linkedRoot);
    expect(scanProject(linkedRoot).files.map((f) => f.path).sort()).toEqual(["Linked.tsx", "pkg/Deep.tsx"]);

    expect(notVisible).toMatch(/Anything reached through a symbolic link/);
    expect(notVisible).toMatch(/counted in neither `scan.unreadable` nor `scan.skippedLarge`/);
    expect(notVisible).toMatch(/the path you pass is followed whether or not it is itself a link/);
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
    rmSync(linkParent, { recursive: true, force: true });
  });

  it("8. reads only the listed extensions, and `extensions` replaces the list", () => {
    const dir = fixture({
      "Card.js": '<img src="/a.png" />\n',
      "app.css": ".a{color:#ff0000;border-radius:7px}\n",
      "tailwind.config.ts": `export default { theme: { colors: { brand: "#ff0000", accent: "#00ff00" } } }\n`,
    });
    const byDefault = auditProject(dir);
    expect(byDefault.findings.map((f) => `${f.file}:${f.rule}`))
      .toEqual(["app.css:hardcoded-color", "app.css:magic-number-radius"]);
    expect(byDefault.system.dimensions.find((d) => d.id === "color")!.unique).toBe(1); // not the config's two

    const withJs = auditProject(dir, [".js"]);
    expect(withJs.findings.map((f) => `${f.file}:${f.rule}`)).toEqual(["Card.js:img-no-alt"]);
    // The .css that was audited a moment ago is now unread: the list replaced.
    expect(withJs.system.dimensions.find((d) => d.id === "color")!.unique).toBe(0);

    // And the extension must carry its dot: without one nothing matches, and
    // the report is indistinguishable from a genuinely empty project.
    const noDot = projectAuditReport(dir, ["js"]);
    expect(noDot.text).toMatch(/Found no design source/);
    expect(noDot.structured.scan.filesRead).toBe(0);

    expect(notVisible).toMatch(/\*replaces\* that list rather than adding to it/);
    expect(notVisible).toMatch(/the colour count fell from 1 to 0/);
    expect(notVisible).toMatch(/each with its leading dot/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("9. enters no dot-directory, reads dot-files, and cannot tell built output from source", () => {
    const dir = fixture({
      ".storybook/preview.css": ".a{color:#ff0000}\n",
      ".eslintrc.css": ".b{color:#00ff00}\n",
      "public/bundle.css": ".c{color:#0000ff}\n",
      "node_modules/pkg/x.css": ".d{color:#ffff00}\n",
    });
    expect(scanProject(dir).files.map((f) => f.path).sort()).toEqual([".eslintrc.css", "public/bundle.css"]);
    // The committed bundle's colour is counted like any other.
    expect(auditProject(dir).system.dimensions.find((d) => d.id === "color")!.unique).toBe(2);
    expect(notVisible).toMatch(/plus every directory whose name begins with a dot/);
    expect(notVisible).toMatch(/`\.eslintrc\.css` was scanned/);
    expect(notVisible).toMatch(/`public\/bundle\.css`, was read as though it were hand-written source/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("10. does not read Tailwind's named scale utilities into the consistency count", () => {
    const dir = fixture({
      "Page.tsx":
        `<div className="bg-indigo-500 text-white rounded-lg text-sm p-4 shadow-lg gap-3">\n` +
        `  <span className="bg-emerald-600 rounded-3xl text-2xl px-7 shadow-2xl">a</span>\n` +
        `  <span className="bg-rose-400 rounded-sm text-xs m-5 shadow-inner">b</span>\n` +
        `</div>\n`,
    });
    const a = auditProject(dir);
    expect(a.system.dimensions.map((d) => d.unique)).toEqual([0, 0, 0, 0, 0]);
    expect(a.system.score).toBe(100);
    expect(a.findings).toEqual([]);

    // Arbitrary values are read, and a hex counts wherever it is written.
    const arb = fixture({ "P.tsx": `<div className="bg-[#6366f1] rounded-[9px] text-[13px]">a</div>\n` });
    const b = auditProject(arb);
    expect(Object.fromEntries(b.system.dimensions.map((d) => [d.id, d.unique])))
      .toMatchObject({ color: 1, radius: 1, type: 1 });

    expect(notVisible).toMatch(/Styling expressed as utility classes/);
    expect(notVisible).toMatch(/hexes and `rgb\(\)` among them/);
    expect(notVisible).toMatch(/scored \*\*100\/100\*\* with no findings at all/);
    expect(notVisible).toMatch(/`rounded-\[9px\]` and `text-\[13px\]` each counted/);
    rmSync(dir, { recursive: true, force: true });
    rmSync(arb, { recursive: true, force: true });
  });

  it("11. counts hex and rgb() colours, and may count another notation as none", () => {
    const colors = (dir: string) => auditProject(dir).system.dimensions.find((d) => d.id === "color")!.unique;
    const css = (fn: (i: number) => string) =>
      Array.from({ length: 20 }, (_, i) => `.c${i}{color:${fn(i)}}`).join("\n") + "\n";

    const oklch = fixture({ "a.css": css((i) => `oklch(0.${50 + i} 0.1 ${i * 7}deg)`) });
    const hsl = fixture({ "a.css": css((i) => `hsl(${i * 7} 50% 50%)`) });
    const rgb = fixture({ "a.css": css((i) => `rgb(${i * 10},20,30)`) });
    const named = fixture({ "a.css": ".a{color:red}.b{color:blue}.c{color:rebeccapurple}\n" });

    expect(colors(oklch)).toBe(0);
    expect(auditProject(oklch).system.score).toBe(100);
    expect(colors(hsl)).toBe(0);
    expect(colors(named)).toBe(0);
    expect(colors(rgb)).toBe(20);
    // The per-file rule reads the same notations, and fires on none of these.
    for (const dir of [oklch, hsl, named]) expect(auditProject(dir).findings, dir).toEqual([]);

    // The rule is narrower than the count, and this is the direction that
    // costs: the twenty rgb() colours the palette counted drew no finding.
    expect(auditProject(rgb).findings).toEqual([]);
    const hexes = fixture({
      "a.css": Array.from({ length: 20 }, (_, i) => `.c${i}{color:#${String(i).padStart(2, "0")}00ff}`).join("\n") + "\n",
    });
    expect(colors(hexes)).toBe(20);
    expect(auditProject(hexes).findings.map((f) => f.rule)).toEqual(Array(20).fill("hardcoded-color"));
    rmSync(hexes, { recursive: true, force: true });

    expect(notVisible).toMatch(/A colour written as something other than a hex or `rgb\(\)`\/`rgba\(\)`/);
    expect(notVisible).toMatch(/twenty `rgb\(\)` colours counted as twenty/);
    expect(notVisible).toMatch(/The per-file `hardcoded-color` rule is narrower still/);
    expect(notVisible).toMatch(/the second is not a check that passed/);
    for (const dir of [oklch, hsl, rgb, named]) rmSync(dir, { recursive: true, force: true });
  });

  it("12. collects only style files and files whose text carries style/class into the count", () => {
    const emotion = fixture({ "E.tsx": "const a = css`color:#ff0000;border-radius:7px`;\n" });
    const a = auditProject(emotion);
    expect(Object.fromEntries(a.system.dimensions.map((d) => [d.id, d.unique])))
      .toMatchObject({ color: 0, radius: 0 });
    // Its own findings are reported as usual — only the count skips it.
    expect(a.findings.map((f) => f.rule)).toEqual(["hardcoded-color", "magic-number-radius"]);

    const styled = fixture({ "S.tsx": "const A = styled.div`color:#ff0000;border-radius:7px`;\n" });
    expect(Object.fromEntries(auditProject(styled).system.dimensions.map((d) => [d.id, d.unique])))
      .toMatchObject({ color: 1, radius: 1 });

    // A bare substring is all the filter needs, which cuts the other way too:
    // the word `styles` in an import pulls a file in that would otherwise be out.
    const imported = fixture({ "I.tsx": 'import styles from "./a.module.css";\nconst hex = "#ff0000";\nconst r = "border-radius:7px";\n' });
    const notImported = fixture({ "N.tsx": 'import x from "./a.module.css";\nconst hex = "#ff0000";\nconst r = "border-radius:7px";\n' });
    expect(Object.fromEntries(auditProject(imported).system.dimensions.map((d) => [d.id, d.unique])))
      .toMatchObject({ color: 1, radius: 1 });
    expect(Object.fromEntries(auditProject(notImported).system.dimensions.map((d) => [d.id, d.unique])))
      .toMatchObject({ color: 0, radius: 0 });

    expect(notVisible).toMatch(/whose text contains `style` or `class=`\/`className=`/);
    expect(notVisible).toMatch(/`styled\.div` does match/);
    expect(notVisible).toMatch(/a substring is all it takes/);
    for (const dir of [emotion, styled, imported, notImported]) rmSync(dir, { recursive: true, force: true });
  });

  it("12b. reads a non-UTF-8 file as text and reports it in no register at all", () => {
    const dir = fixture({ "utf8.css": ".b{color:#00ff00;border-radius:9px}\n" });
    writeFileSync(join(dir, "utf16.css"), Buffer.from("\ufeff.a{color:#ff0000;border-radius:7px}\n", "utf16le"));

    const scan = scanProject(dir);
    expect(scan.files.map((f) => f.path).sort()).toEqual(["utf16.css", "utf8.css"]);
    expect(scan.unreadable).toEqual([]);
    expect(scan.skippedLarge).toEqual([]);
    // Its bytes count against the byte cap like any other file's.
    expect(scan.scannedBytes).toBe(scan.files.reduce((n, f) => n + f.bytes, 0));
    expect(scan.files.find((f) => f.path === "utf16.css")!.bytes).toBeGreaterThan(0);

    const a = auditProject(dir);
    expect(a.findings.map((f) => `${f.file}:${f.rule}`))
      .toEqual(["utf8.css:hardcoded-color", "utf8.css:magic-number-radius"]);
    expect(Object.fromEntries(a.system.dimensions.map((d) => [d.id, d.unique])))
      .toMatchObject({ color: 1, radius: 1 });   // the UTF-8 file's values, and only those

    expect(notVisible).toMatch(/A file that is not UTF-8 text/);
    expect(notVisible).toMatch(/it appears in neither `scan.unreadable` nor `scan.skippedLarge`/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("13. computes off-grid spacing, token adoption, fonts and z-index, and prints none of them", () => {
    const dir = fixture({
      "a.css":
        `.a{color:#777777;background:#888888;padding:13px 27px;z-index:9999;font-family:Inter}\n` +
        `.b{font-family:Roboto}.c{font-family:Georgia}.d{color:var(--x)}\n`,
    });
    const a = auditProject(dir);
    expect(a.system.offGridSpacing.length).toBeGreaterThan(0);
    expect(a.system.tokenUse.tokens).toBe(1);
    expect(a.system.fontFamilies.length).toBe(3);
    expect(a.system.zIndexOutliers.length).toBe(1);

    const r = projectAuditReport(dir);
    const body = r.text.split("## Not visible to this audit")[0];
    for (const absent of ["13px", "27px", "Token adoption", "z-index", "9999", "Inter", "Roboto"]) {
      expect(body, absent).not.toContain(absent);
    }
    expect(JSON.stringify(r.structured.findings)).not.toContain("9999");

    expect(notVisible).toMatch(/off-grid spacing values, token adoption, the font-family count and magic z-index values/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("14. ranks on counts, and prints a slice of what the structured list carries", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 25; i++) files[`F${String(i).padStart(2, "0")}.tsx`] = '<img src="/a.png" />\n';
    files["Many.tsx"] = Array.from({ length: 15 }, (_, i) => `<img src="/${i}.png" />`).join("\n") + "\n";
    const dir = fixture(files);

    const a = auditProject(dir);
    expect(a.findings.length).toBe(40);
    expect(a.worstFiles.length).toBe(26);

    const r = projectAuditReport(dir);
    expect((r.text.match(/^### /gm) ?? []).length).toBe(20);
    expect(r.text).toContain("…and 3 more in this file.");
    expect(r.text).toContain("6 further file(s) have findings");
    expect(r.structured.findings.length).toBe(40);

    // One error outranks ten notes: the order is a count, not a judgement.
    const ranked = fixture({
      "A_one_error.tsx": '<img src="/a.png" />\n',
      "B_ten_notes.css": Array.from({ length: 10 }, (_, i) => `.c${i}{border-radius:${i + 3}px}`).join("\n") + "\n",
    });
    const worst = auditProject(ranked).worstFiles;
    expect(worst[0]).toEqual({ file: "A_one_error.tsx", errors: 1, warnings: 0, info: 0 });
    expect(worst[1].info).toBe(10);

    expect(notVisible).toMatch(/"Worst file first" sorts on counts/);
    expect(notVisible).toMatch(/a 26-file run printed 20 sections/);
    expect(notVisible).toMatch(/carries every one of them \(40 in that run\)/);
    rmSync(dir, { recursive: true, force: true });
    rmSync(ranked, { recursive: true, force: true });
  }, 20_000);
});
