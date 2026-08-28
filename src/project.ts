// Run the design auditors over a real project instead of a pasted snippet.
//
// design_lint, audit_design_system and the rest all take a string, which meant
// auditing a codebase involved copying files into a chat one at a time. Good
// tools nobody can afford to use.
//
// Deliberate limits, all of them reported rather than silent: a truncated audit
// that looks complete is worse than one that says what it skipped.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import {
  designLint, type LintFinding, type AuditReport, type AuditStructured,
  auditStructuredFrom, renderNotVisibleSection,
} from "./lint.js";
import { auditDesignSystem, type DesignSystemAudit } from "./dsaudit.js";

/** Directories that are never anyone's source. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit",
  "coverage", "vendor", ".turbo", ".cache", ".parcel-cache", "__pycache__", ".venv", "target",
  ".output", "storybook-static", ".vercel", ".netlify",
]);

/**
 * Extensions worth linting for *design* defects. `.js`/`.ts` are excluded by
 * default: most are logic, and linting them for missing alt text produces noise
 * that buries the real findings. Callers who keep components in `.js` can ask.
 */
export const UI_EXTENSIONS = [".css", ".scss", ".sass", ".less", ".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".astro"];
const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass", ".less"]);

export const MAX_FILES = 400;
export const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
export const MAX_FILE_BYTES = 500 * 1024;

export interface ProjectFile {
  path: string;   // relative to the root
  bytes: number;
  source: string;
}

export interface ScanResult {
  files: ProjectFile[];
  scannedBytes: number;
  skippedLarge: string[];
  hitFileCap: boolean;
  hitByteCap: boolean;
  unreadable: string[];
}

export interface ProjectAudit {
  root: string;
  scan: ScanResult;
  findings: Array<LintFinding & { file: string }>;
  system: DesignSystemAudit;
  /** Files ranked by how much needs fixing. */
  worstFiles: Array<{ file: string; errors: number; warnings: number; info: number }>;
}

/**
 * Walk the tree, then read — in that order, and name-matched files first.
 *
 * The caps must never decide *which kind* of file gets read. A single pass
 * that reads as it walks and hard-returns at `MAX_FILES` lets alphabetical
 * order do the choosing: `app/`, `components/` and `lib/` all sort before
 * `next.config.js`, so on a 420-component project the one file that declares
 * the security headers was never opened — and the audit then reported the
 * headers absent. A directory listing is cheap; the file *contents* are what
 * the caps exist to bound. So the walk collects candidates unbounded (it is
 * only readdir) and the `filenames` matches are read *first*, before any
 * extension match, wherever in the tree they turned up. That ordering is the
 * whole of the priority: it decides which files get the budget, never how big
 * the budget is.
 *
 * **Both groups are counted against both caps.** The name matches were exempt
 * until v0.25.0, on the assumption that configuration is "by construction a
 * handful of small files". `audit_apple_ui` falsified it: an Xcode asset
 * catalog writes one `Contents.json` per asset entry, so a name match on that
 * basename scales with an app's image count. 400 imagesets read 401 files and
 * 120 padded ones read 3.5 MB, both past a bound two shipped disclosure
 * sentences state as absolute — and, worse, the 401st file was the first Swift
 * file, which tripped `hitFileCap` before a single one of them was opened. An
 * exemption is only ever as good as its caller's naming, and a cap that a
 * caller can lift by choosing a popular basename is not a cap. Priority
 * survives the change; the exemption does not, and a configuration file
 * dropped for the cap is reported through `hitFileCap`/`hitByteCap` like any
 * other.
 *
 * A `filenames` entry containing a `/` is matched against the **end of the
 * file's path** rather than against its basename, so a caller that wants one
 * member of a directory shape can say so — `audit_apple_ui` asks for
 * `.colorset/Contents.json` and leaves every imageset, appiconset and dataset
 * `Contents.json` unopened. Entries without a `/` are basenames, as before.
 * Separators are normalised to `/` before the comparison, so the same entry
 * works on Windows.
 *
 * `extraSkipDirs` adds to `SKIP_DIRS` for one caller without widening it for
 * the rest. The shared list already carries `node_modules` and `vendor`,
 * because a dependency someone else wrote is not the project being audited and
 * reading it produces findings the user cannot act on — but the directory a
 * dependency lands in is ecosystem-specific, and an auditor scoped to one
 * ecosystem knows its own names (`Pods`, `Carthage`, `DerivedData` for Xcode)
 * where this shared function does not. Adding rather than replacing is
 * deliberate: a caller reaching for this wants *more* excluded, never less, and
 * a replace-semantics argument would let one silently start reading
 * `node_modules`.
 */
export function scanProject(
  root: string,
  extensions: string[] = UI_EXTENSIONS,
  filenames: string[] = [],
  extraSkipDirs: string[] = [],
): ScanResult {
  const wanted = new Set(extensions.map((e) => e.toLowerCase()));
  const wantedNames = new Set(filenames.filter((n) => !n.includes("/")));
  const wantedPathEnds = filenames.filter((n) => n.includes("/"));
  const skipDirs = extraSkipDirs.length ? new Set([...SKIP_DIRS, ...extraSkipDirs]) : SKIP_DIRS;
  const files: ProjectFile[] = [];
  const skippedLarge: string[] = [];
  const unreadable: string[] = [];
  let scannedBytes = 0;
  let hitFileCap = false;
  let hitByteCap = false;

  const named: string[] = [];
  const byExt: string[] = [];

  // A `/`-bearing entry is a path tail, so it needs the whole path rather than
  // the directory entry's name. Guarded on the list being non-empty: every
  // caller but one passes basenames only, and they should not pay for a
  // per-file string split.
  const matchesPathEnd = (full: string): boolean => {
    if (!wantedPathEnds.length) return false;
    const path = sep === "/" ? full : full.split(sep).join("/");
    return wantedPathEnds.some((end) => path.endsWith(end));
  };

  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      unreadable.push(relative(root, dir) || ".");
      return;
    }
    // Deterministic order, so the same project always produces the same report.
    for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".") && entry.isDirectory() && !skipDirs.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      // A name match is configuration; it is read before any of the source
      // files, wherever in the tree it turned up. It is not exempt from the
      // caps — see the doc comment.
      if (wantedNames.has(entry.name) || matchesPathEnd(full)) named.push(full);
      else if (wanted.has(extname(entry.name).toLowerCase())) byExt.push(full);
    }
  };

  walk(root);

  const read = (full: string): void => {
    let size = 0;
    try {
      size = statSync(full).size;
    } catch {
      unreadable.push(relative(root, full));
      return;
    }
    const rel = relative(root, full);
    if (size > MAX_FILE_BYTES) {
      skippedLarge.push(rel);
      return;
    }
    if (files.length >= MAX_FILES) {
      hitFileCap = true;
      return;
    }
    if (scannedBytes + size > MAX_TOTAL_BYTES) {
      hitByteCap = true;
      return;
    }
    try {
      files.push({ path: rel, bytes: size, source: readFileSync(full, "utf8") });
      scannedBytes += size;
    } catch {
      unreadable.push(rel);
    }
  };

  // Configuration first, source second, one budget between them; everything
  // after the first file that would cross a cap is unread too, in either group.
  for (const group of [named, byExt]) {
    for (const full of group) {
      if (hitFileCap || hitByteCap) break;
      read(full);
    }
  }

  return { files, scannedBytes, skippedLarge, hitFileCap, hitByteCap, unreadable };
}

export function auditProject(root: string, extensions?: string[]): ProjectAudit {
  const scan = scanProject(root, extensions);

  const findings: Array<LintFinding & { file: string }> = [];
  for (const f of scan.files) {
    for (const finding of designLint(f.source)) findings.push({ ...finding, file: f.path });
  }

  // The consistency score is a property of the styles as a whole, so it is
  // computed over everything at once — cross-file drift is the thing a
  // per-file audit cannot see, and the reason this tool exists.
  const styleSource = scan.files
    .filter((f) => STYLE_EXTENSIONS.has(extname(f.path).toLowerCase()) || /style|class(Name)?=/.test(f.source))
    .map((f) => f.source)
    .join("\n");
  const system = auditDesignSystem(styleSource);

  const byFile = new Map<string, { file: string; errors: number; warnings: number; info: number }>();
  for (const f of findings) {
    const row = byFile.get(f.file) ?? { file: f.file, errors: 0, warnings: 0, info: 0 };
    if (f.severity === "error") row.errors++;
    else if (f.severity === "warning") row.warnings++;
    else row.info++;
    byFile.set(f.file, row);
  }
  const worstFiles = [...byFile.values()].sort(
    (a, b) => b.errors - a.errors || b.warnings - a.warnings || b.info - a.info || a.file.localeCompare(b.file),
  );

  return { root, scan, findings, system, worstFiles };
}

// ── report ───────────────────────────────────────────────────────────────────

const ICON = { error: "🔴", warning: "🟡", info: "🔵" } as const;
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

export const PROJECT_PREAMBLE =
  "This walks the directory you named, reads the files it can open, and runs static rules over their text. It resolves no import, evaluates no configuration, renders nothing and measures nothing. It cannot see:";

/**
 * What `audit_project` structurally cannot see.
 *
 * Every entry was written *after* running the tool on a directory built to
 * demonstrate it, and each demonstration is kept as a test in
 * `tests/project.test.ts`. That order is the whole method, not a preference:
 * the sibling list in `lint.ts` was rewritten five times because sentences read
 * off the rules were false, and every one of the false ones was caught by
 * running the tool rather than by re-reading it. A cap sentence in particular
 * must come from a run — the constant says 400 files, the *behaviour* is that
 * the walk stops at the first file that would cross the line and reads nothing
 * after it, which is a much larger claim and is not visible in the constant.
 *
 * The standing rule these follow: write narrowing claims ("it reads only X"),
 * never completeness claims ("these are the shapes that fire", "any X is
 * reported"). A narrowing claim that turns out to be wrong under-promises; a
 * completeness claim that is wrong invites a reader to trust a gap that is not
 * there. A closed enumeration is a completeness claim wearing a list's clothes,
 * so the enumerations here are explicitly samples of what was run.
 */
export const PROJECT_NOT_VISIBLE: string[] = [
  "**Nothing here is measured, and nothing is rendered.** No contrast ratio is computed, no tap target sized, no page loaded, no screenshot taken, no browser involved. A stylesheet declaring `.a { color: #777777; background: #888888; padding: 13px 27px; }` came back as one `hardcoded-color` warning, which says nothing whatever about how those two colours read against each other, and nothing about the spacing either. No number above is measured from a rendered page: not the counts of what the files write, not the budgets those counts are checked against, not the consistency score computed from both, not the colour-distance arithmetic that calls two written values indistinguishable. Nothing here loads a page to look at.",
  `**What the other auditors on this server would have found.** The findings above are \`design_lint\`'s rules run over each scanned file; the consistency table is \`audit_design_system\` over the same files, and contributes no findings. The rules owned by \`audit_security\`, \`audit_generic_design\`, \`audit_seo_geo\` and \`audit_performance\` are not run here at all, and neither is \`audit_accessibility\` — which is where a contrast ratio does get computed (\`#6B7280\` on \`#FFFFFF\` came back 4.83:1), from the pairs you hand it rather than from anything found in a file. One \`index.html\` — an unpinned cross-origin \`<script>\`, no CSP, the stock indigo→purple gradient, an emoji as a heading icon, two \`<h1>\`s and a \`loading="lazy"\` hero — produced **no findings** from this tool, while on that same file \`audit_security\` reported \`external-script-no-sri\` and \`csp-missing\`, \`audit_generic_design\` reported \`ai-default-gradient\` and \`emoji-as-icon\`, \`audit_seo_geo\` reported \`multiple-h1\`, and \`audit_performance\` reported \`lazy-hero\`. Point each of them at the same directory.`,
  "**Everything `design_lint` cannot see.** Each file's findings are that linter's, so its blind spots are this tool's blind spots. It carries its own disclosure list, which this one does not repeat — run `design_lint` on any snippet to read it. Demonstrated here: a Vue handler, `<div @click=\"go\">`, drew nothing in a scanned `.vue` file, where the JSX spelling `<div onClick={go}>` in the same project drew `clickable-div`. One cost is not inherited but manufactured here, and it lands on a rule graded `error`: every file is linted alone, so a rule that reads a whole snippet is handed one file at a time. `.btn { outline: none; }` in `a.css` beside `.btn:focus { outline: 2px solid blue; }` in `b.css` drew an `outline-none` **error** against `a.css`, where those same two lines in one `design_lint` snippet draw nothing at all — and that linter's own remedy, lint the markup and the CSS together, is not available through this tool. Check an `outline-none` from here against the rest of the project before acting on it.",
  `**Whatever the scan stopped short of.** It reads at most ${MAX_FILES} files and at most ${kb(MAX_TOTAL_BYTES)} in total, and it stops at the *first* file that would cross either line — everything the walk had not yet reached is then left unread, not sampled. A project of ${MAX_FILES + 5} stylesheets under \`a/\` plus one component under \`z/\` was read to ${MAX_FILES} files, and the \`<img>\` with no \`alt\` in that component was not reported; eight 450 KB stylesheets exhausted the byte budget after six (2700 KB read), and the same defect in a small file after them was not reported either. Which files are dropped is decided by the order the walk reached them — each directory's entries in name order, depth first — and not by importance. Read the notice carefully: on a truncated run the header line counts what was read (\`400 file(s), 8 KB scanned\`) and reads exactly like a complete scan, and the whole of the warning is one \`- **Capped:** the ${MAX_FILES}-file cap was reached, so later files were not read.\` bullet under "What this did not look at". \`scan.hitFileCap\` and \`scan.hitByteCap\` say it to a machine, and while either is true no absence in \`findings\` covers the part that was never opened.`,
  `**A file over ${kb(MAX_FILE_BYTES)}, which is skipped whole rather than truncated.** It is never opened, so nothing above is claimed about anything inside it, and the scan carries on with the rest. A stylesheet just over ${kb(MAX_FILE_BYTES)} whose first line was \`.a{color:#ff0000}\` produced no \`hardcoded-color\` and contributed nothing to the colour count, while a small file beside it was read normally. The report names up to five such files; \`scan.skippedLarge\` carries all of them.`,
  "**A path this process could not open.** A directory it may not list and a file it may not read are both recorded and stepped over, and the audit continues without them. The markdown counts them (`1 path(s) could not be read`) but names none — `scan.unreadable` carries the paths. Worse in one specific case, and worth knowing before reading an empty result: when *every* candidate file is unreadable the report falls into its \"Found no design source\" branch, whose fixed text mentions neither the count nor the paths, so a permissions problem reads exactly like an empty project. `scan.unreadable` is populated there too; check it.",
  "**Anything reached through a symbolic link.** The walk descends into real directories and reads real files, and a directory entry that is a symlink is neither, so it is stepped over — silently: a skipped link is counted in neither `scan.unreadable` nor `scan.skippedLarge`, and nothing in the report mentions it. A linked `Linked.tsx` and a linked `pkg/` holding `Deep.tsx`, each with an `<img>` missing its `alt`, both drew nothing, while the real file beside them was audited normally. A monorepo whose packages are linked into the tree you audit is invisible for this reason; point the tool at the directory the files really live in — the path you pass is followed whether or not it is itself a link, so auditing through a link at the top works, and it is the links inside the walk that are stepped over.",
  `**A file whose extension is not on the scanned list.** That list defaults to ${UI_EXTENSIONS.join(", ")}; \`.js\` and \`.ts\` are not on it, so a component in \`Card.js\` and a theme in \`tailwind.config.ts\` are never opened, and the colours a Tailwind config names are absent from the consistency count. The \`extensions\` argument *replaces* that list rather than adding to it: passing \`[".js"]\` found the \`.js\` component and, in the same run, stopped reading the \`.css\` file that had been audited before — its two findings disappeared and the colour count fell from 1 to 0. Pass every extension you want scanned in one call, each with its leading dot: \`[\"js\"]\` matched nothing at all and came back as \`Found no design source\`, which is the same report an empty directory gets.`,
  "**Directories the walk never enters — a fixed list, plus every directory whose name begins with a dot.** `node_modules`, `dist`, `build`, `.next` and the rest are skipped by name, and `.storybook/preview.css` was skipped for its leading dot. A dot *file* is not skipped: `.eslintrc.css` was scanned. Nothing consults `.gitignore`, and the cost runs both ways — a committed build artifact in a directory that is not on the list, `public/bundle.css`, was read as though it were hand-written source, and its values counted towards the consistency numbers.",
  "**Styling expressed as utility classes, which the consistency count does not read.** That count reads CSS declarations and literal values written in the text — `border-radius:`, `font-size:` and spacing declarations, hexes and `rgb()` among them. Tailwind's named scale utilities are none of those: a page written entirely as `bg-indigo-500 rounded-lg text-sm p-4 shadow-lg` and two more variants of it counted 0 colours, 0 type sizes, 0 radii, 0 shadows and 0 spacing values, and scored **100/100** with no findings at all. Arbitrary values are read — `rounded-[9px]` and `text-[13px]` each counted — and a hex counts wherever it is written in a scanned file, `bg-[#6366f1]` included. On a utility-first project read a high consistency score as coverage, not as restraint.",
  "**A colour written as something other than a hex or `rgb()`/`rgba()`.** Those are the notations the palette count and the near-duplicate check read; a colour written another way may not be counted at all. Demonstrated: twenty distinct `oklch()` colours in one stylesheet counted as 0 colours and scored 100/100, twenty `hsl()` colours did the same, and `color: red` counted as none — while twenty `rgb()` colours counted as twenty. The per-file `hardcoded-color` rule is narrower still — it wants a `#` hex — so besides firing on none of those, it fired on none of the `rgb()` colours the count *did* read: twenty `rgb()` declarations counted twenty colours and drew no finding, where twenty hexes counted twenty and drew twenty. An `rgb()`-heavy codebase therefore shows a populated palette and an empty hardcoded-colour result, and the second is not a check that passed.",
  "**A component whose styles are written in a form the consistency pass does not collect.** That pass concatenates the style files plus any scanned file whose text contains `style` or `class=`/`className=`. An emotion component written as ``css`color:#ff0000;border-radius:7px` `` matches none of those, so its colour and its radius were absent from the dimensions table — while its own findings, `hardcoded-color` and `magic-number-radius`, were reported as usual. `styled.div` does match, on the bare substring `style` inside it, and so does any `className=` — a substring is all it takes, so the same values in a file that merely writes `import styles from \"./a.module.css\"` were counted, while an otherwise identical file writing `import x from` was not. The dimension counts are about the files that pass that filter, not about the whole project.",
  "**A file that is not UTF-8 text.** Every scanned file is decoded as UTF-8 and the result is handed to the rules whatever it looks like, so a stylesheet saved as UTF-16 came back with no findings and contributed nothing to the counts, while the UTF-8 file beside it was audited normally. It counts as read — it appears in neither `scan.unreadable` nor `scan.skippedLarge`, and its bytes count towards the byte cap — so this one is invisible in every register.",
  "**Some of what the consistency pass computes never reaches this report.** Demonstrated on four: off-grid spacing values, token adoption, the font-family count and magic z-index values. A stylesheet with `padding: 13px 27px`, one `var(--x)` against two literals, three font families and `z-index: 9999` produced all four internally, and none of them appears in the text above or in `findings`. Run `audit_design_system` on the same source to see them.",
  "**How bad a file actually is.** \"Worst file first\" sorts on counts — errors, then warnings, then notes — so a file with one missing `alt` outranks a file with ten ad-hoc radii, and neither position is a measurement of what is at stake. The markdown also shows a slice: at most 20 files, at most 12 findings within each, the remainder counted in a line rather than listed — a 26-file run printed 20 sections, `…and 3 more in this file` and `6 further file(s) have findings`. `structuredContent.findings` carries every one of them (40 in that run), so read the structured list when you need them all.",
];

export const PROJECT_CLOSING =
  "An empty findings list here means no `design_lint` rule matched the text of the files that were read — not that the project is sound, and not that it was all read. `scan` says how much of it was.";

/**
 * The structured half of `audit_project`, on top of what every structured
 * auditor carries: what the scan actually reached.
 *
 * `scan` is not decoration. The markdown's "**Capped:** the 400-file cap was
 * reached" line has no counterpart in `findings` or `summary` — a project whose
 * worst file sat one past the cap reports exactly what a clean project reports —
 * so a caller reading only `structuredContent` must be able to tell a clean
 * result from a truncated one. Every field is copied from the `ScanResult` the
 * audit already produced; nothing here is recomputed, so the two registers
 * cannot disagree about how much was read.
 */
export interface ProjectStructured extends AuditStructured {
  scan: {
    filesRead: number;
    scannedBytes: number;
    skippedLarge: string[];
    hitFileCap: boolean;
    hitByteCap: boolean;
    unreadable: string[];
  };
}

export function projectAuditReport(
  root: string,
  extensions?: string[],
): AuditReport & { structured: ProjectStructured } {
  const a = auditProject(root, extensions);
  const { scan } = a;

  const structured: ProjectStructured = {
    ...auditStructuredFrom({ findings: a.findings, notVisible: PROJECT_NOT_VISIBLE }),
    scan: {
      filesRead: scan.files.length,
      scannedBytes: scan.scannedBytes,
      skippedLarge: scan.skippedLarge,
      hitFileCap: scan.hitFileCap,
      hitByteCap: scan.hitByteCap,
      unreadable: scan.unreadable,
    },
  };

  const disclosure = renderNotVisibleSection(PROJECT_PREAMBLE, PROJECT_NOT_VISIBLE, PROJECT_CLOSING);

  if (scan.files.length === 0) {
    return {
      text: [
        "# Project design audit",
        "",
        `Found no design source under \`${root}\`.`,
        "",
        `Looked for ${UI_EXTENSIONS.join(", ")} outside ${[...SKIP_DIRS].slice(0, 6).join(", ")} and friends.`,
        "",
        "_If your components live in `.js`/`.ts`, pass those extensions explicitly — they are excluded by default because most such files are logic, and linting them for missing alt text buries the real findings._",
        "",
        ...disclosure,
      ].join("\n"),
      structured,
    };
  }

  const errors = a.findings.filter((f) => f.severity === "error").length;
  const warnings = a.findings.filter((f) => f.severity === "warning").length;
  const info = a.findings.filter((f) => f.severity === "info").length;

  const out: string[] = [
    "# Project design audit",
    "",
    `\`${root}\` — ${scan.files.length} file(s), ${kb(scan.scannedBytes)} scanned.`,
    "",
    `**${errors} error · ${warnings} warning · ${info} info** across ${a.worstFiles.length} file(s) · ` +
      `**consistency ${a.system.score}/100**`,
    "",
  ];

  // System first: cross-file drift is what a per-file pass cannot see.
  out.push(
    "## Is it one system?",
    "",
    "_Budgets are calibrated for one product's UI. A portfolio showing ten brands, a multi-tenant app, or a component library demonstrating every state in both themes legitimately exceeds them — read the numbers, not just the score._",
    "",
  );
  out.push("| dimension | distinct | budget | |", "|---|---|---|---|");
  for (const d of a.system.dimensions) {
    const mark = d.status === "ok" ? "✅" : d.status === "watch" ? "🟡" : "🔴";
    out.push(`| ${d.label} | ${d.unique} | ≤ ${d.budget} | ${mark} |`);
  }
  out.push("");
  const drifting = a.system.dimensions.filter((d) => d.status !== "ok");
  if (drifting.length) {
    for (const d of drifting) out.push(`- **${d.label}:** ${d.advice}${d.tool ? ` → \`${d.tool}\`` : ""}`);
    out.push("");
  }
  if (a.system.duplicateColors.length) {
    const redundant = a.system.duplicateColors.reduce((n, c) => n + c.drop.length, 0);
    out.push(
      `- **${redundant} indistinguishable colour(s)** across the project: ` +
      a.system.duplicateColors.slice(0, 5).map((c) => `keep \`${c.keep}\`, drop ${c.drop.map((d) => `\`${d.value}\``).join(", ")}`).join(" · "),
      "",
    );
  }

  // Then the per-file findings, worst file first.
  if (a.findings.length) {
    out.push("## Findings, worst file first", "");
    for (const row of a.worstFiles.slice(0, 20)) {
      const fileFindings = a.findings.filter((f) => f.file === row.file);
      out.push(`### \`${row.file}\` — ${row.errors} error · ${row.warnings} warning · ${row.info} info`);
      for (const f of fileFindings.slice(0, 12)) {
        out.push(`- ${ICON[f.severity]} **L${f.line}** \`${f.rule}\` — ${f.message}`);
      }
      if (fileFindings.length > 12) out.push(`- _…and ${fileFindings.length - 12} more in this file._`);
      out.push("");
    }
    if (a.worstFiles.length > 20) {
      out.push(`_${a.worstFiles.length - 20} further file(s) have findings; they are not listed here._`, "");
    }
    out.push(
      "Fixes for each rule are in `design_lint` — run it on a single file to get the fix text, or read the rule id.",
      "",
    );
  } else {
    out.push("## Findings", "", "No design or accessibility anti-patterns were detected in the scanned files.", "");
  }

  // Never let a capped scan read as a complete one.
  const notes: string[] = [];
  if (scan.hitFileCap) notes.push(`the ${MAX_FILES}-file cap was reached, so later files were not read`);
  if (scan.hitByteCap) notes.push(`the ${kb(MAX_TOTAL_BYTES)} total cap was reached, so later files were not read`);
  if (scan.skippedLarge.length) notes.push(`${scan.skippedLarge.length} file(s) over ${kb(MAX_FILE_BYTES)} were skipped: ${scan.skippedLarge.slice(0, 5).join(", ")}`);
  if (scan.unreadable.length) notes.push(`${scan.unreadable.length} path(s) could not be read`);

  out.push(
    "## What this did not look at",
    "",
    `- Directories never scanned: ${[...SKIP_DIRS].slice(0, 8).join(", ")}, and other build/vendor output.`,
    `- Extensions scanned: ${(extensions ?? UI_EXTENSIONS).join(", ")}. \`.js\`/\`.ts\` are excluded by default — pass them explicitly if your components live there.`,
    "- `.gitignore` is not parsed; the skip list above is fixed.",
    "- Copy is not audited here: run `audit_ux_copy` on the strings that matter. Screens are not measured: run `measure_screenshot` on a PNG.",
    ...notes.map((n) => `- **Capped:** ${n}.`),
    "",
    "_Static analysis of the files as written. It cannot see values that arrive at runtime, from a theme provider, or from a framework's own defaults._",
  );

  // One array, two renderings: the same `PROJECT_NOT_VISIBLE` the structured
  // half reports is what prints here, so neither reader can be told something
  // the other is not.
  out.push("", ...disclosure);

  return { text: out.join("\n"), structured };
}
