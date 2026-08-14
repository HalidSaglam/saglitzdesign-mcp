import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanProject, auditProject, projectAuditReport, MAX_FILE_BYTES } from "../dist/project.js";

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
    const report = projectAuditReport(root);
    expect(report).toMatch(/What this did not look at/);
    expect(report).toMatch(/node_modules/);
    expect(report).toMatch(/Capped:.*huge\.css|huge\.css/);
  });

  it("carries the caveat that budgets are calibrated for one product", () => {
    expect(projectAuditReport(root)).toMatch(/calibrated for one product/i);
  });

  it("says so plainly when there is nothing to audit", () => {
    const empty = mkdtempSync(join(tmpdir(), "saglitz-empty-"));
    expect(projectAuditReport(empty)).toMatch(/Found no design source/);
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
    projectAuditReport(root).split("## Not visible to this audit")[0].trimEnd().replaceAll(root, "<root>");

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
