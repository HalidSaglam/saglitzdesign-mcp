// Readers for the four surfaces an Xcode project declares configuration on:
// an Info.plist (XML), an .xcodeproj's build settings (INFOPLIST_KEY_* in the
// pbxproj text), an entitlements plist, and an asset catalog's Contents.json
// files. Nothing here talks to the filesystem — every reader takes source
// text (or, for the asset catalog, an already-read list of files) and
// returns what it found, or an explicit admission that it could not read it.
//
// The rule that shapes readPlist: a project that declares zero keys and a
// project we failed to read look identical unless the reader tells them
// apart. Returning an empty Map means "read, and empty"; returning null
// means "not read". Conflating them would let a later audit report a binary
// plist's permissions as "none declared", which is a false guarantee, not a
// gap — so null is the deliberate, load-bearing case, not a fallback.

import { maskComments } from "./scan.js";

export interface PlistValue {
  key: string;
  value: string | boolean | string[];
}

export interface ColorSet {
  path: string;
  hasDarkVariant: boolean;
}

export interface ConfigRead {
  /** Keys found, whichever surface carried them. */
  keys: Map<string, string | boolean | string[]>;
  /** Entitlement identifiers set true, pulled out of the entitlements surface. */
  entitlements: Set<string>;
  /** Colorsets found in an asset catalog, with whether each declares a dark variant. */
  colorSets: ColorSet[];
  /** Which surfaces were actually readable. */
  surfaces: { plist: string[]; buildSettings: string[]; entitlements: string[]; assetCatalogs: string[] };
  /** Paths that exist but could not be parsed — binary plists, malformed JSON. */
  unparsed: string[];
}

// ── plist ────────────────────────────────────────────────────────────────────

/**
 * Finds the index at which the tag `</tag>` opened by the `<tag` at `from`
 * closes, counting nested same-named opens/closes so a `<dict>` holding
 * another `<dict>` is not mistaken for closing at the first `</dict>` it
 * meets. Returns the index of the *start* of the matching close tag, or
 * null if the source runs out before depth returns to zero.
 */
function findMatchingClose(source: string, from: number, tag: string): number | null {
  const openTok = `<${tag}`;
  const closeTok = `</${tag}>`;
  let depth = 1;
  let i = from;
  while (depth > 0) {
    const nextClose = source.indexOf(closeTok, i);
    if (nextClose === -1) return null;
    const nextOpen = source.indexOf(openTok, i);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const tagEnd = source.indexOf(">", nextOpen);
      if (tagEnd === -1) return null;
      if (source[tagEnd - 1] !== "/") depth++; // a self-closed same-named tag does not nest
      i = tagEnd + 1;
    } else {
      depth--;
      i = nextClose + closeTok.length;
    }
  }
  return i - closeTok.length;
}

/**
 * Removes nested `<dict>...</dict>` and `<array>...</array>` spans from an
 * array's body, so a scan for `<string>` afterwards only ever meets a
 * *direct* child of the array — never a string that happens to live inside
 * a dict this array holds. `CFBundleURLTypes` is exactly this shape: an
 * array of dicts, each carrying a role, a bundle identifier, and its own
 * nested array of URL schemes. Without stripping, a flat `<string>` scan
 * over the whole array body would harvest all of those into one array,
 * indistinguishable from one another — a wrongly populated key, not a
 * merely incomplete one. Self-closed containers (`<array/>`) hold nothing
 * and are left as-is; a container missing its matching close is left in
 * place too, along with the rest of the body, rather than guessed at. That
 * does not, on its own, guarantee the caller's outer scan stops shortly
 * after: an unrelated stray close tag later in the document can rebalance
 * the outer scan's own counting and let it run to completion, in which case
 * whatever this function left unstripped is still there for a later
 * `<string>` scan to pick up. Reaching that needs two independent
 * malformations to line up; it is a known gap, not one this function
 * guards against.
 */
function stripNestedContainers(body: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const dictIdx = body.indexOf("<dict", i);
    const arrIdx = body.indexOf("<array", i);
    let idx: number, tag: string;
    if (dictIdx === -1 && arrIdx === -1) {
      out += body.slice(i);
      return out;
    } else if (dictIdx === -1 || (arrIdx !== -1 && arrIdx < dictIdx)) {
      idx = arrIdx;
      tag = "array";
    } else {
      idx = dictIdx;
      tag = "dict";
    }

    out += body.slice(i, idx);
    const tagEnd = body.indexOf(">", idx);
    if (tagEnd === -1) return out; // malformed tail — stop, do not guess at the rest

    if (body[tagEnd - 1] === "/") {
      i = tagEnd + 1; // self-closed, nothing inside to strip
      continue;
    }
    const closeIdx = findMatchingClose(body, tagEnd + 1, tag);
    if (closeIdx === null) return out + body.slice(idx); // unbalanced — leave the rest untouched
    i = closeIdx + `</${tag}>`.length;
  }
}

/**
 * Walks a `<dict>...</dict>` body one `<key>` + value pair at a time.
 *
 * Handles the subset Apple's own project templates emit: `<string>`,
 * `<true/>`, `<false/>`, and `<array>` of `<string>`.
 *
 * A value that is itself a `<dict>` — NSAppTransportSecurity's inner
 * exception dicts, a scene manifest, anything nesting further — is walked
 * only far enough to find its matching close tag so the scan can continue
 * past it correctly; its own keys are never surfaced into the flat map this
 * reader returns, because ConfigRead has no shape for nested structure. The
 * outer key that pointed at it is therefore absent from the result, not
 * present with a guessed or flattened value. The same is true of any other
 * value type outside the subset above (`<integer>`, `<real>`, `<date>`,
 * `<data>`): the key is dropped rather than represented with a wrong type.
 *
 * An `<array>` is read for its *direct* `<string>` children only —
 * `stripNestedContainers` removes any nested `<dict>`/`<array>` span before
 * the `<string>` scan runs, so an array of dicts (`CFBundleURLTypes`) comes
 * back as an empty array rather than a flattened mix of the role strings,
 * bundle identifiers and schemes that live one level down inside it. That
 * empty array is not a dropped key: it correctly states "this array has no
 * string values directly in it", which is true; the strings nested inside
 * its member dicts are unreachable here for the same reason a dict-valued
 * key's contents are — this reader has no shape for anything past one
 * level of nesting. A later audit that wants to disclose this gap should
 * point here.
 */
function parseDictBody(body: string, map: Map<string, string | boolean | string[]>): void {
  let pos = 0;
  for (;;) {
    const keyStart = body.indexOf("<key>", pos);
    if (keyStart === -1) return;
    const keyClose = body.indexOf("</key>", keyStart);
    if (keyClose === -1) return; // unbalanced — stop rather than misread the remainder
    const key = body.slice(keyStart + 5, keyClose).trim();
    pos = keyClose + "</key>".length;

    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (body[pos] !== "<") return; // no value node follows — malformed, stop here

    const tagMatch = /^<([A-Za-z][A-Za-z0-9]*)(?:\s[^>]*)?(\/)?>/.exec(body.slice(pos));
    if (!tagMatch) return;
    const tagName = tagMatch[1];
    const selfClosing = !!tagMatch[2];
    const openLen = tagMatch[0].length;

    if (selfClosing) {
      if (tagName === "true") map.set(key, true);
      else if (tagName === "false") map.set(key, false);
      else if (tagName === "array") map.set(key, []); // a self-closed, empty array
      // any other self-closing tag: outside the subset, key dropped
      pos += openLen;
      continue;
    }

    const closeIdx = findMatchingClose(body, pos + openLen, tagName);
    if (closeIdx === null) return; // unbalanced — stop rather than misread the remainder
    const inner = body.slice(pos + openLen, closeIdx);
    pos = closeIdx + `</${tagName}>`.length;

    if (tagName === "string") {
      map.set(key, inner);
    } else if (tagName === "array") {
      const strings: string[] = [];
      for (const m of stripNestedContainers(inner).matchAll(/<string>([\s\S]*?)<\/string>/g)) strings.push(m[1]);
      map.set(key, strings);
    }
    // "dict" and any other tag name: read past, key not recorded (see doc comment above).
  }
}

/**
 * Reads an XML property list into its top-level keys.
 *
 * Returns `null`, not an empty Map, for a binary plist (detected by the
 * `bplist00` magic) or for anything that does not carry a `<plist>` /
 * `<dict>` structure at all — these are cases where the reader could not
 * look, and saying so is different from saying the project declared
 * nothing. A binary plist is never parsed here even partially: a wrong
 * parse would produce confident wrong keys, which is worse than the
 * admitted gap.
 */
export function readPlist(source: string): Map<string, string | boolean | string[]> | null {
  if (source.trimStart().startsWith("bplist00")) return null; // binary — refuse rather than guess

  const plistOpen = /<plist[\s>]/.exec(source);
  if (!plistOpen) return null; // not a plist we recognise at all

  const dictStart = source.indexOf("<dict", plistOpen.index);
  if (dictStart === -1) return null; // a <plist> with no top-level <dict> — nothing to read

  const tagEnd = source.indexOf(">", dictStart);
  if (tagEnd === -1) return null;

  const map = new Map<string, string | boolean | string[]>();
  if (source[tagEnd - 1] === "/") return map; // self-closed <dict/>: a real, empty dict

  const closeIdx = findMatchingClose(source, tagEnd + 1, "dict");
  if (closeIdx === null) return null; // unbalanced dict — malformed, cannot be trusted

  parseDictBody(source.slice(tagEnd + 1, closeIdx), map);
  return map;
}

// ── build settings ──────────────────────────────────────────────────────────

/**
 * Reverses the small set of backslash escapes a quoted pbxproj string uses
 * for a literal `"` or `\` — `\"` and `\\` — so a value like
 * `"needs \"access\" to camera"` reads back with real quote characters
 * instead of the escape sequences that only mean something inside the
 * quoted literal. Any other escape sequence is left exactly as written,
 * since this reader does not attempt the rest of pbxproj's (undocumented,
 * NeXT-derived) string-escaping grammar.
 */
function unescapeQuoted(raw: string): string {
  return raw.replace(/\\(["\\])/g, "$1");
}

/**
 * Pulls `INFOPLIST_KEY_*` assignments out of a `.pbxproj`'s raw text —
 * Xcode's "generate Info.plist" mode writes Info.plist keys as build
 * settings instead of into a plist file. Only the `INFOPLIST_KEY_` prefix is
 * recognised (that is the one Xcode itself emits for this purpose); every
 * other build setting, however Info.plist-shaped its name looks, is left
 * alone rather than guessed at. Values are returned as the raw right-hand
 * side text — quotes stripped and `\"`/`\\` unescaped when the setting was
 * quoted, trimmed when it was not — since this reader does not know or
 * assume the setting's intended type. Whitespace (including a tab) between
 * the closing quote and the terminating `;` is tolerated and does not
 * defeat the quoted match.
 */
export function readBuildSettingKeys(pbxproj: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /INFOPLIST_KEY_([A-Za-z0-9_]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"\s*|([^;\n]+));/g;
  for (const m of pbxproj.matchAll(re)) {
    const value = m[2] !== undefined ? unescapeQuoted(m[2]) : m[3].trim();
    map.set(m[1], value);
  }
  return map;
}

// ── entitlements ─────────────────────────────────────────────────────────────

/**
 * Reads an entitlements plist (the same XML shape as an Info.plist) down to
 * the identifiers that are declared `true`. An entitlement declared `false`
 * or any other value is not a granted capability, so it is left out.
 *
 * A source this reader cannot parse (binary, not a plist) yields an empty
 * Set here — `readPlist` is where "could not read" is distinguished from
 * "read, none granted"; callers that need that distinction should call
 * `readPlist` on the same source themselves rather than infer it from an
 * empty result here.
 */
export function readEntitlements(source: string): Set<string> {
  const map = readPlist(source);
  const out = new Set<string>();
  if (!map) return out;
  for (const [key, value] of map) {
    if (value === true) out.add(key);
  }
  return out;
}

// ── asset catalog ────────────────────────────────────────────────────────────

/**
 * Reads colorsets out of an already-collected list of asset catalog files.
 * Only `*.colorset/Contents.json` entries are considered — other catalog
 * members (`.appiconset`, `.imageset`, `.dataset`, the catalog's own root
 * `Contents.json`) are not colors and are skipped rather than misfiled.
 *
 * `hasDarkVariant` is true when any color entry carries an `appearances`
 * override for `luminosity: dark` — the standard Xcode-generated shape for
 * "this colorset has a dark appearance". Any other appearance axis (high
 * contrast, tinted) is not treated as a dark variant, because it isn't one.
 *
 * A `Contents.json` that is not valid JSON is skipped, not reported as a
 * colorset with no dark variant — that would misrepresent a file we could
 * not read as a file we read and found plain.
 *
 * A colorset **declaring no colour value at all** is skipped for a different
 * reason: it has nothing to have a dark variant *of*. Xcode's own project
 * template writes exactly this shape for `AccentColor` —
 * `{"colors":[{"idiom":"universal"}]}`, an entry with an idiom and no `color`
 * — as a placeholder meaning "use the system accent". Reporting it as a custom
 * colour missing its dark appearance fired on every default project, iOS and
 * macOS alike, before a reader had written a single colour of their own, and
 * the advice it carried ("give the dark appearance its own value") is not
 * actionable on a colorset that has no light value either. An entry is
 * counted as a colour when it carries a `color` object; a colorset with none
 * is left out of the result entirely, exactly as an unparseable one is, and
 * the omission is disclosed rather than reported.
 */
export function readAssetCatalog(files: Array<{ path: string; source: string }>): ColorSet[] {
  const out: ColorSet[] = [];
  for (const file of files) {
    if (!/\.colorset\/Contents\.json$/.test(file.path)) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.source);
    } catch {
      continue; // malformed JSON — not a colorset we can read, not one we can rule on
    }

    const colors = (parsed as { colors?: unknown })?.colors;
    // A placeholder declaring no colour value — Xcode's default `AccentColor`
    // — is not a custom colour, so it is not a custom colour missing a dark
    // appearance either.
    const declaresAColour =
      Array.isArray(colors) &&
      colors.some((c) => {
        const color = (c as { color?: unknown })?.color;
        return typeof color === "object" && color !== null;
      });
    if (!declaresAColour) continue;

    const hasDarkVariant =
      Array.isArray(colors) &&
      colors.some((c) => {
        const appearances = (c as { appearances?: unknown })?.appearances;
        return (
          Array.isArray(appearances) &&
          appearances.some((a) => (a as { appearance?: unknown; value?: unknown })?.appearance === "luminosity" && (a as { value?: unknown })?.value === "dark")
        );
      });

    out.push({ path: file.path, hasDarkVariant });
  }
  return out;
}

// ── platform inference ──────────────────────────────────────────────────────

export type ApplePlatform = "ios" | "macos";

export interface PlatformVerdict {
  platform: ApplePlatform | null;
  /** Every signal seen, named, whichever way it pointed. */
  signals: string[];
  /** Set when signals pointed both ways. */
  conflicted: boolean;
}

/**
 * Named so the exact wording that lands in `signals` — and, later, in a
 * disclosure list — is defined once, next to the check it names.
 */
const SIGNAL = {
  sandbox: "com.apple.security.app-sandbox in entitlements",
  lsMinimumSystemVersion: "LSMinimumSystemVersion key present",
  lsUIElement: "LSUIElement key present",
  iosOrientation: "UIRequiresFullScreen or UISupportedInterfaceOrientations key present",
  iosLaunchScreen: "UILaunchScreen / UILaunchStoryboardName key present",
  importAppKit: "import AppKit in any Swift file",
  importUIKit: "import UIKit in any Swift file",
  conflictingOsChecks: "#if os(macOS) and #if os(iOS) both present",
} as const;

/**
 * The key spellings each signal accepts, including the suffixed forms Xcode
 * writes as build settings.
 *
 * `GENERATE_INFOPLIST_FILE = YES` has been the default since Xcode 13, so a
 * new project has no `Info.plist` at all and every key arrives out of
 * `project.pbxproj` instead — where Xcode splits two of these families by
 * idiom and generation. A default SwiftUI-lifecycle iOS app writes
 * `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone`,
 * `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad` and
 * `INFOPLIST_KEY_UILaunchScreen_Generation`, and *no* unsuffixed spelling of
 * either. Matching only the unsuffixed names left the commonest input this
 * audit will ever be pointed at with `signals: []` and a null verdict — and
 * with no `import UIKit` to fall back on, since a SwiftUI-lifecycle app has
 * none — which silenced every platform-scoped rule on a project whose platform
 * is not remotely in doubt.
 *
 * These are matched as an explicit set rather than by prefix. A prefix test on
 * `UILaunchScreen` would also swallow a future `UILaunchScreen_Anything`, and
 * a key this file has not seen is one it should not be claiming to understand;
 * an unrecognised spelling produces no signal, which is the failure direction
 * this whole module is built around.
 *
 * The macOS families need no equivalent. Xcode writes `LSMinimumSystemVersion`
 * and `LSUIElement` unsuffixed, and the macOS template also writes a real
 * `.entitlements` carrying `com.apple.security.app-sandbox`, so a default
 * macOS project already infers correctly from two independent signals.
 */
const IOS_ORIENTATION_KEYS = [
  "UIRequiresFullScreen",
  "UISupportedInterfaceOrientations",
  "UISupportedInterfaceOrientations_iPhone",
  "UISupportedInterfaceOrientations_iPad",
] as const;
const IOS_LAUNCH_KEYS = [
  "UILaunchScreen",
  "UILaunchStoryboardName",
  "UILaunchScreen_Generation",
] as const;

/**
 * Decides which Apple platform a project targets from the configuration
 * Task 1's readers already pulled out, or admits it cannot.
 *
 * Most of what an Apple UI audit knows is platform-scoped — macOS does not
 * support Dynamic Type at all, a tap target is 44×44 on iOS but 28×28 (with
 * a 20×20 floor) in macOS's control-size table, and a tab bar is normal
 * chrome on iOS but out of place on macOS — so guessing wrong does not
 * merely miss a finding, it fires a rule on code that is correct for its
 * actual platform. `platform: null` is therefore not a failure mode this
 * function tries to avoid; it is the correct answer whenever the signals
 * available do not settle the question, and every platform-specific rule
 * downstream is expected to stay silent when it sees one.
 *
 * Every signal checked is recorded in `signals` by name — win, lose, or
 * draw — because a later disclosure of "why we could not tell" and a
 * reader's trust in a "macos"/"ios" verdict both rest on seeing the full
 * set of evidence, not just the part that decided it.
 *
 * The verdict is a set membership test, not a vote: if any signal points to
 * macOS and any other points to iOS, the answer is `null` with
 * `conflicted: true`, regardless of how many signals landed on each side.
 * Two weak iOS signals do not outweigh one strong macOS one — counting them
 * against each other would be a guess dressed up as a measurement, exactly
 * the kind of confident wrong answer the readers in this file already
 * refuse to produce for a single unreadable surface.
 *
 * `#if os(macOS)` and `#if os(iOS)` are read only as a pair: by themselves
 * neither says anything about which platform the *project* targets (both
 * branches of a `#if` commonly exist in code that is itself
 * platform-agnostic), but both present together names conditional
 * compilation for two platforms at once, which is direct evidence the
 * question this function is asking does not have one answer for this
 * project — so it is recorded as its own signal, pointing straight at
 * `conflicted`, rather than being folded into the macOS/iOS tally.
 *
 * Every Swift source is run through `maskComments` before any of the above
 * is scanned for. Without it, an `import AppKit` line sitting inside a
 * block comment — including a block comment nested inside another, the
 * idiom Swift developers reach for and which `maskComments` tracks
 * correctly for a `.swift` path — reads exactly like a live import: the
 * platform verdict would then rest on dead code, and every platform-scoped
 * rule downstream would run on that wrong assumption with nothing in the
 * output to explain why.
 *
 * Three things a caller building `swiftSources` needs to know, because this
 * function has no way to enforce or widen any of them itself:
 *
 * - Comment masking is keyed on `path` ending in `.swift`, case-insensitive
 *   (`maskComments`'s own file-shape gate — `"App.SWIFT"` and
 *   `"APP.Swift"` both qualify, same as `"App.swift"`). A path that does
 *   not end that way at all — `"App"`, `"App.swift.txt"`, an empty string
 *   — silently skips masking and this function falls back to scanning the
 *   raw source, which reopens the exact commented-out-import defect this
 *   comment describes. There is no error or signal for that fallback; it
 *   just happens.
 * - `maskComments` has residual over-masking risk in `.swift` source, not
 *   fully closed and not claimed to be. What is fixed and proven: a nested
 *   comment count that only balances by crossing a `"""` multi-line
 *   string's own boundary falls back to a flat, non-nesting answer instead
 *   — a six-scanner differential against real Swift source first caught
 *   this as a fabricated `null` verdict on a file that compiles and
 *   targets a real platform. What is *not* closed: the quote tracker is a
 *   per-line, per-character toggle, not a real tokenizer, and mishandles
 *   Swift string interpolation — a nested, unescaped `"` inside an
 *   interpolated call can close what the tracker thinks is the outer
 *   string early, exposing text that is really still inside a string
 *   literal as live code, with no `"""` involved at all. If a genuine,
 *   well-formed comment appears later in the file, nesting can walk
 *   through both spurious points and mask real code — including an
 *   `import` — in between. This is the same "more than one thing has to
 *   line up" shape as `stripNestedContainers`'s known gap above, and is
 *   deliberately not chased with a further special case: doing that
 *   correctly needs a real string-aware, interpolation-aware tokenizer, not
 *   another targeted check, which would only trade this rare, compound
 *   failure for breaking the common, legitimate case of a comment that
 *   genuinely comments out code containing string literals. Pinned by name
 *   in `tests/scan.test.ts` as a known, unfixed gap. See the over-masking
 *   paragraph on `maskComments`'s own doc comment in `src/scan.ts` for the
 *   full mechanism, including exactly what its fallbacks do and do not
 *   cover.
 * - The import/`#if` recognisers above are text patterns, not a parser:
 *   `@testable import Foo` is recognised, but `@_exported import Foo` and a
 *   submodule import like `import struct AppKit.NSRect` are not — neither
 *   sets `sawAppKit`/`sawUIKit`, so a project using only those forms
 *   produces no import-based signal at all rather than a wrong one. This is
 *   unchanged from the very first version of this function and was never
 *   claimed to be otherwise; noted here because a later task consuming
 *   these same regexes should know the recognised vocabulary before
 *   assuming it is exhaustive.
 */
export function inferPlatform(input: {
  keys: Map<string, string | boolean | string[]>;
  entitlements: Set<string>;
  swiftSources: Array<{ path: string; source: string }>;
}): PlatformVerdict {
  const signals: string[] = [];
  const pointsTo = new Set<ApplePlatform>();
  let conflicted = false;

  if (input.entitlements.has("com.apple.security.app-sandbox")) {
    signals.push(SIGNAL.sandbox);
    pointsTo.add("macos");
  }
  if (input.keys.has("LSMinimumSystemVersion")) {
    signals.push(SIGNAL.lsMinimumSystemVersion);
    pointsTo.add("macos");
  }
  if (input.keys.has("LSUIElement")) {
    signals.push(SIGNAL.lsUIElement);
    pointsTo.add("macos");
  }
  if (IOS_ORIENTATION_KEYS.some((k) => input.keys.has(k))) {
    signals.push(SIGNAL.iosOrientation);
    pointsTo.add("ios");
  }
  if (IOS_LAUNCH_KEYS.some((k) => input.keys.has(k))) {
    signals.push(SIGNAL.iosLaunchScreen);
    pointsTo.add("ios");
  }

  let sawAppKit = false;
  let sawUIKit = false;
  let sawOsMacOS = false;
  let sawOsIOS = false;
  for (const file of input.swiftSources) {
    const masked = maskComments(file.source, file.path);
    if (/(^|\n)\s*(@testable\s+)?import\s+AppKit\b/.test(masked)) sawAppKit = true;
    if (/(^|\n)\s*(@testable\s+)?import\s+UIKit\b/.test(masked)) sawUIKit = true;
    if (/#if\s+os\(macOS\)/.test(masked)) sawOsMacOS = true;
    if (/#if\s+os\(iOS\)/.test(masked)) sawOsIOS = true;
  }
  if (sawAppKit) {
    signals.push(SIGNAL.importAppKit);
    pointsTo.add("macos");
  }
  if (sawUIKit) {
    signals.push(SIGNAL.importUIKit);
    pointsTo.add("ios");
  }
  if (sawOsMacOS && sawOsIOS) {
    signals.push(SIGNAL.conflictingOsChecks);
    conflicted = true;
  }

  if (pointsTo.has("macos") && pointsTo.has("ios")) conflicted = true;

  const platform: ApplePlatform | null = conflicted
    ? null
    : pointsTo.has("macos")
      ? "macos"
      : pointsTo.has("ios")
        ? "ios"
        : null;

  return { platform, signals, conflicted };
}
