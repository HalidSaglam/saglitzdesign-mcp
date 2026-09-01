// The Android half of the ship-quality gate — `audit_android_ui`.
//
// Same contract as `audit_apple_ui`: directory only, configuration and source
// as text, every absence scoped to the surfaces that were actually read, and a
// `notVisible` list derived from runs rather than from the shape of the code.
// It builds nothing, starts no emulator, and computes no contrast ratio.
//
// Three configuration rules and three Compose rules. Platform-scoped rules
// stay silent when no Android signal was found, so a quiet report on a folder
// of random XML is the gate, not a pass.

import {
  type LintFinding, type AuditReport, type AuditStructured,
  auditStructuredFrom, renderNotVisibleSection,
} from "./lint.js";
import { maskComments } from "./scan.js";
import { scanProject, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "./project.js";

const NO_LINE = 0;
const KT_PATH = /\.(kt|kts)$/i;
const XML_PATH = /\.xml$/i;
const MANIFEST_TAIL = /(^|\/)AndroidManifest\.xml$/i;
const VALUES_DAY = /(^|\/)values\/[^/]+\.xml$/i;
const VALUES_NIGHT = /(^|\/)values-night\//i;

export interface AndroidPlatform {
  android: boolean;
  signals: string[];
}

export const ANDROID_EXTENSIONS = [".kt", ".kts", ".xml"];
export const ANDROID_FILENAMES = ["AndroidManifest.xml"];
export const ANDROID_SKIP_DIRS = [".gradle", "generated"];

function lineLookup(source: string): (index: number) => number {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

export function inferAndroid(files: Array<{ path: string; source: string }>): AndroidPlatform {
  const signals: string[] = [];
  for (const file of files) {
    if (MANIFEST_TAIL.test(file.path)) signals.push(`AndroidManifest.xml at ${file.path}`);
    if (KT_PATH.test(file.path) && /\bimport\s+androidx\.compose\b/.test(file.source)) {
      signals.push(`import androidx.compose in ${file.path}`);
    }
    if (KT_PATH.test(file.path) && /\bimport\s+android\./.test(file.source)) {
      signals.push(`import android. in ${file.path}`);
    }
  }
  return { android: signals.length > 0, signals };
}

/**
 * Configuration half. Absence claims name the file that was read, or say that
 * no file of that kind was among the surfaces — never "the project does not".
 */
export function androidConfigRules(input: {
  files: Array<{ path: string; source: string }>;
  platform: AndroidPlatform;
}): LintFinding[] {
  const out: LintFinding[] = [];
  if (!input.platform.android) return out;

  const manifests = input.files.filter((f) => MANIFEST_TAIL.test(f.path));
  for (const file of manifests) {
    if (/windowOptOutEdgeToEdgeEnforcement\s*=\s*"true"/.test(file.source)) {
      out.push({
        line: NO_LINE,
        severity: "warning",
        rule: "edge-to-edge-opt-out",
        message: `\`${file.path}\` sets \`android:windowOptOutEdgeToEdgeEnforcement="true"\`. Targeting SDK 35 forced edge-to-edge with an opt-out; targeting SDK 36 disables that opt-out — the attribute is deprecated and ignored on Android 16 devices, so the app will draw behind the system bars whether this flag is set or not. Read from android-app-design §3, citing the Android 15/16 behaviour-change pages.`,
        fix: `Remove the attribute and apply WindowInsets per surface (top app bar consumes statusBars, scrolling content pads navigationBars, FABs offset by ime). Compose Scaffold's contentWindowInsets does most of this; a global spacer that guesses 24dp/48dp will be wrong on cutouts and gesture nav.`,
        doc: "android-app-design",
      });
    }
    if (/enableOnBackInvokedCallback\s*=\s*"false"/.test(file.source)) {
      out.push({
        line: NO_LINE,
        severity: "info",
        rule: "predictive-back-opt-out",
        message: `\`${file.path}\` sets \`android:enableOnBackInvokedCallback="false"\`. Predictive back is enabled by default for apps targeting Android 16; the manifest opt-out is documented as a temporary crutch, and \`onBackPressed()\` is no longer called for those apps. Read from android-app-design §2.`,
        fix: `Migrate interception to \`OnBackPressedCallback\` / Compose \`PredictiveBackHandler\` and drop the opt-out. Reserve back interception for genuine unsaved-data loss; prefer auto-save.`,
        doc: "android-app-design",
      });
    }
  }

  const dayThemes = input.files.filter((f) => VALUES_DAY.test(f.path) && /(^|\/)(themes|colors)\.xml$/i.test(f.path));
  const night = input.files.filter((f) => VALUES_NIGHT.test(f.path));
  if (dayThemes.length && night.length === 0) {
    out.push({
      line: NO_LINE,
      severity: "warning",
      rule: "theme-no-night",
      message: `A day resource was read (${dayThemes.map((f) => `\`${f.path}\``).join(", ")}) and no \`values-night/\` file was among the surfaces read. android-app-design §5 states dark theme is required, not optional: tone-shifted palettes, default "System default". This is a fact about the XML files this scan opened, not a claim that the app has no dark theme in code.`,
      fix: `Add \`values-night/themes.xml\` (and colors, if the day file names them) with a tone-shifted Material 3 scheme, or drive both appearances from a Compose \`ColorScheme\` pair and delete the XML. Re-run this audit on the directory so the night file is among the surfaces read.`,
      doc: "android-app-design",
    });
  }

  return out;
}

const COLOR_HEX = /\bColor\s*\(\s*0x[0-9a-fA-F]+\s*\)/g;
const FONT_SIZE_SP = /\bfontSize\s*=\s*(\d+(?:\.\d+)?)\s*\.sp\b/g;
const MATERIAL2_IMPORT = /^import\s+androidx\.compose\.material\.[A-Z]/gm;

export function androidComposeRules(files: Array<{ path: string; source: string }>): LintFinding[] {
  const out: LintFinding[] = [];
  for (const file of files) {
    if (!KT_PATH.test(file.path)) continue;
    const masked = maskComments(file.source, file.path);
    const lineOf = lineLookup(masked);
    const found: LintFinding[] = [];

    COLOR_HEX.lastIndex = 0;
    for (let m = COLOR_HEX.exec(masked); m; m = COLOR_HEX.exec(masked)) {
      found.push({
        line: lineOf(m.index),
        severity: "info",
        rule: "hardcoded-compose-color",
        message: `\`${m[0]}\` appears on this line. Material 3's colour system is roles, not hexes: "always style with roles (\`primary\`, \`onPrimary\`, \`surfaceContainer…\`). Never hardcode hex values in components." A literal has no light, dark or contrast-level variant to resolve to. This says nothing about the colour's contrast ratio — that depends on what it is drawn against, which this line does not carry.`,
        fix: `Replace it with \`MaterialTheme.colorScheme.<role>\`, or put the value in a \`ColorScheme\` (static brand or \`dynamicColorScheme\`) so light, dark and contrast levels stay coherent. If this literal is a chart series or a brand swatch that must not adapt, it is doing what it was written to do.`,
        doc: "material-3",
      });
    }

    FONT_SIZE_SP.lastIndex = 0;
    for (let m = FONT_SIZE_SP.exec(masked); m; m = FONT_SIZE_SP.exec(masked)) {
      found.push({
        line: lineOf(m.index),
        severity: "warning",
        rule: "fixed-compose-font-size",
        message: `\`fontSize = ${m[1]}.sp\` appears on this line. Material 3's type scale is roles — Display, Headline, Title, Body, Label, each in small/medium/large — so a bare sp value has no style behind it to scale with the user's font size. Body Large is 16sp/24 line height; Labels are 14sp. A number here is the Compose analogue of a fixed point size.`,
        fix: `Use \`MaterialTheme.typography.bodyLarge\` (or headline/title/label) instead of a bare \`fontSize\`. Where a one-off size is required, \`TextUnit\` relative to a style still scales; a hardcoded sp does not.`,
        doc: "material-3",
      });
    }

    MATERIAL2_IMPORT.lastIndex = 0;
    for (let m = MATERIAL2_IMPORT.exec(masked); m; m = MATERIAL2_IMPORT.exec(masked)) {
      found.push({
        line: lineOf(m.index),
        severity: "warning",
        rule: "material2-import",
        message: `\`${m[0].trim()}\` pulls Material 2 into this file. android-app-design's 2026 baseline is Jetpack Compose on Material 3 (Expressive); mixing M2 components onto an M3 theme is how you get the wrong shape scale, the wrong colour roles and a second ripple. The \`material3\` package is a different artifact — this rule matches \`androidx.compose.material.Button\` and not \`androidx.compose.material3.Button\` or \`androidx.compose.material.icons\`.`,
        fix: `Change the import to \`androidx.compose.material3.\` and the matching M3 composable (\`androidx.compose.material.Button\` → \`androidx.compose.material3.Button\`, \`Divider\` → \`HorizontalDivider\`).`,
        doc: "material-3",
      });
    }

    found.sort((a, b) => a.line - b.line);
    out.push(...found);
  }
  return out;
}

function attachFiles(
  files: Array<{ path: string; source: string }>,
): Array<LintFinding & { file?: string }> {
  const out: Array<LintFinding & { file?: string }> = [];
  for (const file of files) {
    for (const f of androidComposeRules([file])) {
      out.push({ ...f, file: file.path });
    }
  }
  return out;
}

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

export const ANDROID_PREAMBLE =
  "This walks the directory you named, reads AndroidManifest.xml, resource XML and Kotlin files it can open, and runs static rules over their text. It builds nothing, starts no emulator, renders nothing and measures nothing. It cannot see:";

export const ANDROID_NOT_VISIBLE: string[] = [
  "**Nothing here is measured, and nothing is rendered.** No contrast ratio is computed, no 48dp target sized, no emulator launched, no screenshot taken, no Gradle build run. `hardcoded-compose-color` fired on `Color(0xFF1A73E8)` and said nothing about how that colour reads against anything. `audit_accessibility` computes a contrast ratio from the pairs you hand it; `measure_screenshot` is the only tool here that looks at a rendered frame.",

  "**A file this scan never opened.** It opens `.kt`, `.kts` and `.xml`, plus `AndroidManifest.xml` matched by name, and stops there. Java (`.java`), resource images, `res/layout` inflated at runtime, and Gradle Kotlin DSL files that do not end in `.kts` under a name this walk skipped are each outside what was read. A Compose preview annotation is compiled code and is read; a screenshot of that preview is not.",

  "**A directory the walk never enters** — a fixed skip list, plus every directory whose name begins with a dot. `.gradle` and `generated` are on that list for this audit specifically, beside the shared `build`, `node_modules` and the rest. **Nothing inside a dependency is audited.** Pointing the tool at a `build/` output folder will also skip it by name. Pointing the tool *straight at* a generated directory audits it, because the root you name is never itself name-checked.",

  "**Whether the app actually draws edge-to-edge.** `edge-to-edge-opt-out` reports the attribute in the manifest this scan opened. It cannot see `WindowCompat.setDecorFitsSystemWindows`, `enableEdgeToEdge()`, or a theme item that opts out from a library. A project that removed the attribute and still draws under a translucent status bar with no inset padding is invisible here.",

  "**A dark theme written only in Compose.** `theme-no-night` fires when a `values/themes.xml` or `values/colors.xml` was read and no `values-night/` file was among the surfaces. A Compose-only app that ships `darkColorScheme()` and has no `res/values` XML at all produces no finding, which is correct — there was no day XML to be missing a night twin of — and settles nothing about whether the Compose schemes actually differ.",

  "**Dynamic color, contrast levels, and wallpaper palettes.** Material You is a runtime extraction. Nothing in the files this scan opens is the user's wallpaper, and no finding here is a claim about `dynamicColorScheme`.",

  "**Java, Views XML, and Navigation XML graphs.** A `Fragment` in `.java`, a `res/layout/*.xml`, or a `nav_graph.xml` action is never opened under the extension list above. Findings about Compose do not cover a View-based screen sitting next to it.",

  "**A path this process could not open.** A directory it may not list and a file it may not read are both recorded, stepped over, and the audit continues. `scan.unreadable` carries every such path.",
];

export const ANDROID_CLOSING =
  "An empty findings list here means no rule this audit runs matched the text of the files that were read — not that the project is sound, and not that it was all read. `scan` says how much of it was, and the platform line above says whether the configuration rules were allowed to run at all.";

export interface AndroidStructured extends AuditStructured {
  scan: {
    filesRead: number;
    scannedBytes: number;
    skippedLarge: string[];
    hitFileCap: boolean;
    hitByteCap: boolean;
    unreadable: string[];
  };
}

function renderFinding(f: LintFinding & { file?: string }): string[] {
  const where = f.line > 0 ? ` (line ${f.line})` : "";
  const lines = [`- **${f.rule}**${where} — ${f.file ? `${f.file}: ` : ""}${f.message}`, `  - Fix: ${f.fix}`];
  if (f.doc) lines.push(`  - Read: \`get_design_doc("${f.doc}")\``);
  return lines;
}

export function androidReport(root: string): AuditReport & { structured: AndroidStructured } {
  const scan = scanProject(root, ANDROID_EXTENSIONS, ANDROID_FILENAMES, ANDROID_SKIP_DIRS);
  const files = scan.files.map((f) => ({ path: f.path, source: f.source }));
  const platform = inferAndroid(files);

  const findings: Array<LintFinding & { file?: string }> = [
    ...androidConfigRules({ files, platform }),
    ...attachFiles(files),
  ];

  const structured: AndroidStructured = {
    ...auditStructuredFrom({ findings, notVisible: ANDROID_NOT_VISIBLE }),
    scan: {
      filesRead: scan.files.length,
      scannedBytes: scan.scannedBytes,
      skippedLarge: scan.skippedLarge,
      hitFileCap: scan.hitFileCap,
      hitByteCap: scan.hitByteCap,
      unreadable: scan.unreadable,
    },
  };

  const ktFiles = files.filter((f) => KT_PATH.test(f.path));
  const xmlFiles = files.filter((f) => XML_PATH.test(f.path));
  const manifests = files.filter((f) => MANIFEST_TAIL.test(f.path));

  const lines: string[] = ["# Android UI audit", ""];
  lines.push(`\`${root}\` — ${scan.files.length} file(s), ${kb(scan.scannedBytes)} scanned.`, "");

  const SHOWN = 10;
  const surfaceLines: string[] = [];
  const name = (label: string, paths: string[]) => {
    if (!paths.length) return surfaceLines.push(`- ${label}: none read`);
    const shown = paths.slice(0, SHOWN).map((p) => `\`${p}\``).join(", ");
    const rest = paths.length > SHOWN ? `, …and ${paths.length - SHOWN} more` : "";
    return surfaceLines.push(`- ${label} (${paths.length}): ${shown}${rest}`);
  };
  name("AndroidManifest.xml", manifests.map((f) => f.path));
  name("Resource XML", xmlFiles.filter((f) => !MANIFEST_TAIL.test(f.path)).map((f) => f.path));
  name("Kotlin source", ktFiles.map((f) => f.path));
  lines.push("**Surfaces read:**", "", ...surfaceLines, "");

  if (scan.unreadable.length) {
    lines.push(
      `**Could not be opened at all:** ${scan.unreadable.slice(0, 5).map((p) => `\`${p}\``).join(", ")}`
      + `${scan.unreadable.length > 5 ? `, …and ${scan.unreadable.length - 5} more` : ""}. \`scan.unreadable\` carries all ${scan.unreadable.length}.`,
      "",
    );
  }
  if (scan.hitFileCap) lines.push(`**Capped:** the ${MAX_FILES}-file cap was reached, so later files were not read.`, "");
  if (scan.hitByteCap) lines.push(`**Capped:** the ${kb(MAX_TOTAL_BYTES)} total-bytes cap was reached, so later files were not read.`, "");
  if (scan.skippedLarge.length) {
    lines.push(
      `**Skipped ${scan.skippedLarge.length} file(s) over ${kb(MAX_FILE_BYTES)}**, unopened: ${scan.skippedLarge.slice(0, 5).map((p) => `\`${p}\``).join(", ")}`
      + `${scan.skippedLarge.length > 5 ? `, …and ${scan.skippedLarge.length - 5} more` : ""}.`,
      "",
    );
  }

  lines.push(
    platform.android
      ? `**Platform: Android**, inferred from ${platform.signals.length} signal(s): ${platform.signals.map((s) => `\`${s}\``).join(", ")}. Configuration rules ran.`
      : `**Platform: not determined.** Signals seen: none. **Every configuration rule stayed silent**, so their silence here is the gate rather than a result.`,
    "",
  );

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");
  lines.push(`**${errors.length} error · ${warnings.length} warning · ${info.length} info**`, "");

  if (!findings.length) {
    lines.push("No findings in what was read.", "");
  } else {
    for (const group of [
      { title: "Errors", items: errors },
      { title: "Warnings", items: warnings },
      { title: "Notes", items: info },
    ]) {
      if (!group.items.length) continue;
      lines.push(`## ${group.title}`, "");
      for (const f of group.items) lines.push(...renderFinding(f));
      lines.push("");
    }
  }

  lines.push(...renderNotVisibleSection(ANDROID_PREAMBLE, ANDROID_NOT_VISIBLE, ANDROID_CLOSING));
  return { text: lines.join("\n"), structured };
}
