// The configuration rules of `audit_apple_ui` — the only rules in this package
// allowed to report that something is *absent*.
//
// Everywhere else here, a reader states presence and nothing else: a Swift file
// that does not mention Dynamic Type may still support it, a screenshot with no
// visible focus ring may still draw one. Configuration is different, and the
// difference is structural rather than a matter of confidence. A `Contents.json`
// either declares a `luminosity: dark` appearance or it does not. An
// entitlements plist either carries `com.apple.security.app-sandbox` or it does
// not. Those are readable facts about a file, so a rule may say so.
//
// The licence stops exactly there, and three limits keep it there:
//
//  1. **Absent from this file** is not **absent from the project.** Xcode has
//     more than one place to put the same fact — `INFOPLIST_KEY_*` build
//     settings, `InfoPlist.xcstrings`, a target's capabilities — so every
//     message below names the surface it read. This is why there is no
//     "missing purpose string" rule here: from the plist alone it reports
//     projects that are correct, because Xcode wrote the key somewhere else,
//     and from Swift source it is a lower bound, because a third-party SDK
//     creates the obligation just as an `AVCaptureDevice` call does. Both
//     directions are wrong in the direction that costs a reader their trust,
//     so it is disclosed rather than reported.
//  2. **Absent from the project** is not **not required by Apple.** Two rules
//     below concern macOS distribution, where Apple's requirement is scoped to
//     one channel and stated for no other. They name that channel. A message
//     of the form "Apple requires no X" is a claim about every Apple surface
//     at once, and one fetch has falsified that form five times in this
//     project's history; the scoped form is a claim about a named page and is
//     correctable by adding a page rather than reversing an assertion.
//  3. **Nothing inferred inherits the licence.** The Hardened Runtime is the
//     case that proves it, and it is why there is no `hardened-runtime-absent-macos`
//     rule here. The capability has no entitlement of its own — it is a build
//     setting, `ENABLE_HARDENED_RUNTIME`, and none of the four surfaces read
//     here carries it. Two further facts close the door on every substitute:
//     Xcode "automatically adds the Hardened Runtime capability" to a new
//     macOS app from a template, and the capability "doesn't affect the
//     operation of most apps", so most correct projects declare no exception
//     entitlement at all — which makes "macOS, no exceptions declared" the
//     shape of a *correctly configured* hardened app, not of a missing one.
//     A rule keyed on that fires where it has no evidence and stays silent
//     where it has some. The fact still matters to a reader, so it belongs in
//     the disclosure list beside these findings, phrased as what was not
//     checked. What *is* readable, if a rule is ever wanted here, is a
//     *declared* `com.apple.security.cs.*` exception — present, and therefore
//     citable — never the absence of one.
//
// Every platform-scoped rule checks `platform` first and returns nothing when
// it is null. `inferPlatform` returns null whenever the signals do not settle
// the question, and a macOS-only finding on a project that turns out to be iOS
// is not a near miss — it is a confident wrong answer about code that is
// correct for the platform it actually targets.

import type { LintFinding } from "./lint.js";
import type { ConfigRead, PlatformVerdict } from "./appleconfig.js";
import { maskComments } from "./scan.js";

/**
 * Entitlement identifiers this file matches on, named once so the rule and its
 * message can never disagree about which string was looked for.
 */
const ENTITLEMENT = {
  appSandbox: "com.apple.security.app-sandbox",
  /** Reached by enabling App Sandbox › Hardware › Audio Input. */
  microphone: "com.apple.security.device.microphone",
  /** Reached by enabling Hardened Runtime › Resource Access › Audio Input. */
  audioInput: "com.apple.security.device.audio-input",
} as const;

/**
 * `UIRequiresFullScreen` as Apple writes it, and as Apple's own prose slips
 * once and writes it.
 *
 * The canonical key is the capital-`S` form: the reference page's title, the
 * companion key `UIRequiresFullScreenIgnoredStartingWithVersion` and the build
 * setting `INFOPLIST_KEY_UIRequiresFullScreen` all use it. TN3192's note and
 * the WWDC25 transcript both read `UIRequiresFullscreen` — and the note puts it
 * inside a `codeVoice` node, rendered as code, which is exactly where someone
 * copies a key from into their own plist. Both spellings are matched so a plist
 * copied from that note is not silently passed over; the message says which one
 * was found, because only the capital-`S` form is the key the system reads.
 */
const FULL_SCREEN_KEYS = ["UIRequiresFullScreen", "UIRequiresFullscreen"] as const;
const CANONICAL_FULL_SCREEN_KEY = FULL_SCREEN_KEYS[0];

/**
 * Configuration findings carry no line number.
 *
 * `LintFinding.line` is required, and every fact here is about whether a file
 * declares something, not about where in it something sits — a missing
 * entitlement has no position at all. 0 is this file's agreed "no line", chosen
 * because a real plist line is 1-based and so can never collide with it. A
 * renderer that prints `L0` beside these is printing the truth; one that prints
 * `L1` would be inventing a location.
 *
 * **A consumer must not route these through a rule+line deduper.** Three places
 * in this codebase end that way — `designLint` (`lint.ts`),
 * `genericVisualRules` and `genericCopyRules` (`generic.ts`) — keeping one
 * finding per `rule`+`line` pair, which is correct for a scanner walking a
 * file: a rule matching twice on one line is one problem. It is wrong here.
 * Two rules below emit N findings at
 * a constant line — one per colorset, one per `UIRequiresFullScreen` spelling —
 * so that filter silently collapses every one of them to a single finding and
 * the reader is told about one colorset out of three. Deduplicate these by
 * message, or not at all. Pinned by a test in `tests/apple.test.ts`.
 */
const NO_LINE = 0;

/**
 * The configuration half of `audit_apple_ui`.
 *
 * Takes what the readers in `appleconfig.ts` pulled out of a project's four
 * configuration surfaces, plus the platform verdict, and returns the findings
 * that follow from structure alone. Reads nothing, fetches nothing.
 *
 * **What this function does not check, in the place its rules are read:**
 *
 * - **Purpose strings.** Deliberately absent, in both directions — see the
 *   header comment. No rule here reports a missing `NS…UsageDescription`, and
 *   the silence must not be read as "the project's purpose strings are
 *   complete".
 * - **Orientation.** A single-orientation app is explicitly permitted by the
 *   HIG, so a narrow `UISupportedInterfaceOrientations` is not a finding.
 * - **Whether the Hardened Runtime is enabled.** It is a build capability
 *   (`ENABLE_HARDENED_RUNTIME`), not an entitlement, so it appears in none of
 *   the four surfaces read here. There is deliberately no rule for it in
 *   either direction — see limit 3 in the header comment — and the fact is
 *   handed to the disclosure list instead.
 * - **The distribution channel.** Nothing in a project's configuration states
 *   whether it ships through the Mac App Store, with Developer ID, or not at
 *   all. In particular an entitlement does not name a channel: Apple requires
 *   the sandbox *for* Mac App Store distribution and nowhere states it is
 *   exclusive *to* that channel, and sandboxed Developer ID apps are
 *   documented. `sandbox-absent-macos` is conditional on a channel and says
 *   so; it does not claim to know which one applies.
 * - **What a colorset resolves to.** `hasDarkVariant` is a declaration, not a
 *   colour. No contrast verdict is reachable from it.
 * - **A surface that could not be read.** `config.unparsed` — a binary plist,
 *   malformed JSON — produces no finding here at all, in either direction.
 *   Nothing below distinguishes "the project declares no sandbox entitlement"
 *   from "the entitlements file was there and we could not parse it", so a
 *   caller that has unparsed surfaces must disclose them alongside these
 *   findings or the reader will take an unreadable file for an empty one.
 */
export function appleConfigRules(input: { config: ConfigRead; platform: PlatformVerdict }): LintFinding[] {
  const { config, platform } = input;
  const out: LintFinding[] = [];
  const push = (f: Omit<LintFinding, "line">) => out.push({ line: NO_LINE, ...f });

  // ── colorsets ─────────────────────────────────────────────────────────────
  //
  // Not platform-scoped: the HIG asks for both appearances of a custom colour
  // regardless of which appearance the app itself ships in, because Liquid
  // Glass adapts to what is behind it either way.
  for (const colorSet of config.colorSets) {
    if (colorSet.hasDarkVariant) continue;
    push({
      severity: "warning",
      rule: "colorset-no-dark-variant",
      message: `\`${colorSet.path}\` declares no \`luminosity: dark\` appearance, so this custom colour resolves to the same value in both appearances. The HIG asks for light and dark variants of every custom colour, and says to supply both "even if your app ships in a single appearance mode", to support Liquid Glass adaptivity.`,
      fix: `Open the colorset in Xcode's asset catalog, set Appearances to "Any, Dark", and give the dark appearance its own value — or delete the colorset and use a system semantic colour, which carries its own light, dark and increased-contrast variants.`,
      doc: "apple-accessibility",
    });
  }

  // ── UIRequiresFullScreen ──────────────────────────────────────────────────
  //
  // Fires on the key's presence, not its value: `false` still leaves the
  // deprecated key in the plist, and the deprecation summary's instruction is
  // to remove it, not to set it.
  for (const key of FULL_SCREEN_KEYS) {
    if (!config.keys.has(key)) continue;
    const misspelled = key !== CANONICAL_FULL_SCREEN_KEY;
    push({
      severity: "warning",
      rule: "uirequiresfullscreen-deprecated",
      message:
        `\`${key}\` is declared in this project's configuration. Apple's reference page for \`${CANONICAL_FULL_SCREEN_KEY}\` carries \`deprecatedAt: 26.0\` and a deprecation summary beginning "Opting out of iPad multitasking and dynamic resizing is deprecated"; TN3192 adds that the key "will be ignored in a future release", with "broken layouts, UI elements positioned incorrectly, or content that doesn't fit properly" as the named cost of not updating.` +
        (misspelled
          ? ` Note the spelling: \`${key}\` is not the key the system reads — the canonical spelling is \`${CANONICAL_FULL_SCREEN_KEY}\`, with a capital \`S\`, so as written this key has no effect either way.`
          : ""),
      fix: `Handle multitasking and dynamic resizing, then remove \`${key}\` from the information property list. Where you need to keep some of the old behaviour, \`UISceneSizeRestrictions\` and \`prefersInterfaceOrientationLocked\` replace parts of it; to keep the key working on older systems only, add \`UIRequiresFullScreenIgnoredStartingWithVersion\` (which the system reads only alongside a \`${CANONICAL_FULL_SCREEN_KEY}\` of \`true\`).`,
      doc: "apple-shipping-readiness",
    });
  }

  // ── microphone entitlements ───────────────────────────────────────────────
  //
  // One Xcode checkbox labelled "Audio Input", two identifiers, reached through
  // two different capabilities. Not platform-scoped in the sense the two macOS
  // rules are: the finding is about the pair disagreeing with itself, which is
  // a fact about the entitlements file whatever the verdict says.
  const hasMic = config.entitlements.has(ENTITLEMENT.microphone);
  const hasAudioIn = config.entitlements.has(ENTITLEMENT.audioInput);
  if (hasMic !== hasAudioIn) {
    const present = hasMic ? ENTITLEMENT.microphone : ENTITLEMENT.audioInput;
    const absent = hasMic ? ENTITLEMENT.audioInput : ENTITLEMENT.microphone;
    const presentVia = hasMic ? "App Sandbox › Hardware › Audio Input" : "Hardened Runtime › Resource Access › Audio Input";
    const absentVia = hasMic ? "Hardened Runtime › Resource Access › Audio Input" : "App Sandbox › Hardware › Audio Input";
    push({
      severity: "warning",
      rule: "microphone-entitlement-mismatch",
      message: `This project declares \`${present}\` (${presentVia}) but not \`${absent}\` (${absentVia}). One Xcode checkbox label covers both identifiers, and they belong to two different capabilities — so a project that has one and not the other has enabled microphone access under one capability only.`,
      fix: `Decide which capabilities this target actually uses. If it is sandboxed and hardened, both identifiers apply and \`${absent}\` is missing — enable Audio Input under the other capability in Xcode's Signing & Capabilities tab so it is written for you. If only ${presentVia.split(" › ")[0]} applies to this target, the pair is complete as written and nothing needs to change.`,
      doc: "apple-shipping-readiness",
    });
  }

  // ── macOS-only, from here down ────────────────────────────────────────────
  //
  // The platform check comes first, once. A null verdict — the signals were
  // absent, or they conflicted — means the rule below does not run. Firing a
  // macOS distribution rule at an iOS project is not a slightly wrong finding;
  // it is a finding about a requirement that does not exist for that project.
  if (platform.platform !== "macos") return out;

  if (!config.entitlements.has(ENTITLEMENT.appSandbox)) {
    // Which surface was read is part of the finding, not decoration. "The
    // entitlements file declares no sandbox entitlement" and "no entitlements
    // file was found at all" are different facts with different next actions,
    // and a message that reads the same for both leaves the reader unable to
    // tell whether the audit looked and found nothing or never looked.
    const read = config.surfaces.entitlements;
    const surface = read.length
      ? read.length === 1
        ? `The entitlements file read here — \`${read[0]}\` — declares no \`${ENTITLEMENT.appSandbox}\`.`
        : `The entitlements files read here — ${read.map((p) => `\`${p}\``).join(", ")} — declare no \`${ENTITLEMENT.appSandbox}\`.`
      : `No entitlements file was among the surfaces read here, so there is nowhere in this input for \`${ENTITLEMENT.appSandbox}\` to have been declared.`;
    push({
      severity: "info",
      rule: "sandbox-absent-macos",
      message: `${surface} Apple's sandbox requirement is scoped to one channel — "To distribute a macOS app through the Mac App Store, you must enable the App Sandbox capability" — and the Review Guidelines repeat it at 2.4.5(i) for apps distributed via the Mac App Store. For other distribution channels Apple states the requirement on neither of those pages, so this is a fact about the Mac App Store channel rather than a defect in the project.`,
      fix: `If this app is destined for the Mac App Store, add the App Sandbox capability in Xcode's Signing & Capabilities tab — Xcode writes \`${ENTITLEMENT.appSandbox}\` into the entitlements file for you, then add only the resource entitlements the app actually uses. If it ships outside the store, no change is needed on the strength of this finding.`,
      doc: "apple-shipping-readiness",
    });
  }

  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// The Swift rules
// ═══════════════════════════════════════════════════════════════════════════
//
// **Every rule below states a presence. None of them may claim an absence, and
// the licence `appleConfigRules` has above does not extend here.**
//
// The difference is not one of confidence, it is one of structure.
// Configuration is a key/value surface: a plist either carries
// `UIRequiresFullScreen` or it does not, and both answers are readable from the
// file. Swift is a tree read here one line at a time, and two properties of the
// language make every absence claim unprovable from that vantage point:
//
//  1. **A modifier on a parent covers its children.** `.accessibilityLabel`,
//     `.accessibilityElement(children: .combine)`, `.dynamicTypeSize`,
//     `.accessibilityHidden` and `.font` all apply down the tree. So "this
//     control has no accessibility label" is not a fact about the control's
//     line — the label may be seven lines above it on an enclosing `VStack`, or
//     on the `NavigationStack` that wraps the whole screen. A line-based reader
//     never sees it, and a rule keyed on that reports correct code.
//  2. **The check may be in another file.** "This file never respects Reduce
//     Motion" is unprovable because `@Environment(\.accessibilityReduceMotion)`
//     may be read in a view model, a design-system package, or a
//     `.transaction { $0.animation = nil }` helper the view imports. A per-file
//     reader that has not read the other file has no evidence either way.
//
// What a line *does* prove is what it itself writes. `.font(.system(size: 17))`
// passes a bare `CGFloat`; `Color(red:green:blue:)` writes three numbers;
// `NavigationView` names a deprecated type; a `Button` whose entire label
// closure is one `Image(systemName:)` has a label derived from a symbol. Each
// of those is a fact about the text on that line, and each is what the
// corresponding rule says — nothing wider.
//
// **What these rules deliberately do not check, in the place their rules are
// read.** The silence is not a verdict in any of these cases:
//
// - **Accessibility labels.** No rule reports a missing one, for reason 1 above
//   and because Apple documents that SF Symbols and `Image(_:)` carry automatic
//   labels — so "icon in a button ⇒ unlabelled" false-positives on correct
//   code. `symbol-as-only-button-label` reports the *derivation*, at `info`.
// - **Reduce Motion, Reduce Transparency, `@ScaledMetric`, `dynamicTypeSize`.**
//   Nothing here reports their absence, for reason 2 above.
// - **Contrast.** `Color("Brand")` in Swift carries no ratio: the resolved
//   values live in the asset catalog and the one that renders depends on
//   appearance and the Increase Contrast setting at draw time.
// - **UIKit's fixed fonts.** `fixed-font-size` matches the SwiftUI form only.
//   `UIFont.systemFont(ofSize:)` and `Font.custom(_:fixedSize:)` carry the same
//   documented warning and are **not** matched here, so a clean run is not
//   evidence that a UIKit target scales.
// - **Anything inside a string literal.** `maskComments` blanks comments and
//   leaves string contents in place, so `Text("NavigationView")` is matched by
//   `navigationview-deprecated`. Rare in practice; stated so it is not a
//   surprise.
// - **A file whose path does not end in `.swift`.** Skipped entirely rather
//   than read unmasked — see `SWIFT_PATH` below.
//
// Findings here carry a **real 1-based line**, unlike the configuration rules
// above, which all sit at the sentinel `NO_LINE`. Two findings of one rule land
// at different lines, so the codebase's `${rule}:${line}` dedupe idiom — used by
// `designLint`, `genericVisualRules` and `genericCopyRules` — is safe for these
// and is not safe for those.

/**
 * The extension gate, matching `maskComments`' own — case-insensitively, and
 * anchored at the end of the path.
 *
 * A file this does not match is **not read at all**, rather than read with its
 * comments left live. `maskComments` masks Swift comments only for a path
 * ending in `.swift`; hand it `App` or `App.swift.txt` and it returns the
 * source untouched, so every rule below would then be matching inside comments
 * — the exact defect the security package shipped and took a review round to
 * find. Skipping is the honest failure: a caller that passes a Swift file under
 * a path this does not recognise gets silence, not fabricated findings.
 */
const SWIFT_PATH = /\.swift$/i;

/**
 * A 1-based line lookup over one file, built once per file rather than counted
 * per match — a file with many matches would otherwise be quadratic.
 */
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

/**
 * The index just past the `close` that matches the `open` at `from`, or -1 when
 * it never balances.
 *
 * String-aware to the same degree as the rest of this codebase's Swift reading
 * and no further: a `"` opens a literal in which brackets do not count, and a
 * backslash escapes the next character. Swift's interpolation (`\(...)`), its
 * `"""` multi-line form and its raw (`#"..."#`) form are not modelled — the
 * same approximation `maskComments` documents on itself. An unbalanced result
 * returns -1 and the caller emits nothing, so the failure direction is silence
 * rather than a finding about a span this function guessed at.
 */
function matchBalanced(src: string, from: number, open: string, close: string): number {
  if (src[from] !== open) return -1;
  let depth = 0;
  let inString = false;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * The literal symbol name when `body` is nothing but one `Image(systemName:)`
 * expression, or null.
 *
 * A trailing chain of modifiers is allowed — `Image(systemName: "gear")
 * .font(.title2).foregroundStyle(.tint)` is still a label consisting of one
 * symbol and nothing else. A second view, a container, or a symbol name that is
 * an identifier rather than a string literal all return null: in the last case
 * this file cannot name the symbol, and a finding that cannot quote the
 * identifier it is warning about is not worth reading.
 */
function loneSymbolName(body: string): string | null {
  const trimmed = body.trim();
  const named = /^Image\(\s*systemName\s*:\s*"([^"\\]*)"/.exec(trimmed);
  if (!named) return null;
  let i = matchBalanced(trimmed, trimmed.indexOf("("), "(", ")");
  if (i === -1) return null;
  while (i < trimmed.length) {
    const modifier = /^\s*\.[A-Za-z_][A-Za-z0-9_]*\s*/.exec(trimmed.slice(i));
    if (!modifier) return null;
    i += modifier[0].length;
    if (trimmed[i] === "(") {
      const after = matchBalanced(trimmed, i, "(", ")");
      if (after === -1) return null;
      i = after;
    }
  }
  return named[1];
}

/**
 * `.font(.system(size: N))` and `Font.system(size: N, …)` — a bare point size
 * with no text style behind it. The capture is the number, so the message can
 * quote the size the file actually wrote.
 */
const FIXED_FONT_SIZE = /\.system\(\s*size\s*:\s*(\d+(?:\.\d+)?)/g;

/**
 * `NavigationView` as a type name. `\b` on both sides is what keeps
 * `NavigationViewStyle` and `.navigationViewStyle(_:)` out — the trailing
 * boundary fails on the first, and the leading capital fails on the second.
 */
const NAVIGATION_VIEW = /\bNavigationView\b/g;

/**
 * A colour written as numbers rather than resolved from a resource:
 * SwiftUI's `Color(red:green:blue:)`, UIKit's `UIColor(red:…)`, AppKit's
 * `NSColor(red:…)` and Xcode's `#colorLiteral(…)`.
 *
 * The optional `(?:UI|NS)` prefix sits inside the alternation rather than
 * beside it so `UIColor(red:` is one match, not two: `UIColor` ends in the
 * seven characters `Color(`, and a bare `\bColor\(` would have matched the tail
 * of it as well — except that `\b` fails between `I` and `C`, which is what
 * makes this correct rather than lucky. AppKit's `NSColor` is matched alongside
 * UIKit's because this rule is not platform-scoped and a macOS target writes
 * the AppKit spelling; every initialiser the brief names still matches exactly
 * as specified.
 */
const COLOR_LITERAL = /#colorLiteral\s*\(|\b(?:UI|NS)?Color\(\s*red\s*:/g;

/** `Button` as a type name — never `ButtonStyle`, never `MyButton`. */
const BUTTON = /\bButton\b/g;

/**
 * The Swift half of `audit_apple_ui`.
 *
 * Reads each file's source with its comments masked and returns one finding per
 * matching line. Reads nothing from disk, fetches nothing; `files` is whatever
 * the caller already gathered.
 *
 * `platform` gates one rule and one rule only. `fixed-font-size` is iOS-family
 * scoped because Apple states verbatim that "macOS doesn't support Dynamic
 * Type" — a fixed point size on a Mac target is not a Dynamic Type failure, it
 * is how the built-in macOS text styles themselves resolve. A null verdict
 * (signals absent, or conflicting) does not run it either: a Dynamic Type
 * finding on a project that turns out to be macOS is a confident wrong answer
 * about code that is correct for the platform it targets. The other three rules
 * are platform-agnostic, and the gate is the typed verdict — nothing here
 * matches a platform *string*, which is what keeps `Mac Catalyst` from ever
 * being read as `macOS`.
 *
 * Read the block comment above this function before adding a rule: the licence
 * to report an absence stops at the configuration half of this file.
 */
export function appleSwiftRules(
  files: Array<{ path: string; source: string }>,
  platform: PlatformVerdict,
): LintFinding[] {
  const out: LintFinding[] = [];
  const dynamicType = platform.platform === "ios";

  for (const file of files) {
    if (!SWIFT_PATH.test(file.path)) continue;
    const masked = maskComments(file.source, file.path);
    const lineOf = lineLookup(masked);
    const found: LintFinding[] = [];

    // ── fixed-font-size ─────────────────────────────────────────────────────
    if (dynamicType) {
      FIXED_FONT_SIZE.lastIndex = 0;
      for (let m = FIXED_FONT_SIZE.exec(masked); m; m = FIXED_FONT_SIZE.exec(masked)) {
        found.push({
          line: lineOf(m.index),
          severity: "warning",
          rule: "fixed-font-size",
          message: `\`.font(.system(size: ${m[1]}))\` sets a point size directly: it takes a bare \`CGFloat\`, with no text style behind it to scale against. Apple's rule is stated plainly — "To add support for Dynamic Type in your app, you use text styles" — and Dynamic Type is a system-level feature on iOS and iPadOS. This line is reported because the platform signals for this project resolved to iOS; the identical line on a macOS target is not, since "macOS doesn't support Dynamic Type" and the built-in macOS text styles resolve to fixed points themselves.`,
          fix: `Use a text style — \`.font(.body)\`, \`.font(.headline)\`, \`.font(.caption)\` — so the size follows the reader's setting. Where a specific face is required, \`Font.custom(_:size:relativeTo:)\` scales relative to a named text style, and \`@ScaledMetric(relativeTo:)\` scales the padding and frames around it so the container grows too. If this size is deliberate and the view has been checked at the AX5 size, nothing needs to change.`,
          doc: "apple-accessibility",
        });
      }
    }

    // ── navigationview-deprecated ───────────────────────────────────────────
    NAVIGATION_VIEW.lastIndex = 0;
    for (let m = NAVIGATION_VIEW.exec(masked); m; m = NAVIGATION_VIEW.exec(masked)) {
      found.push({
        line: lineOf(m.index),
        severity: "warning",
        rule: "navigationview-deprecated",
        message: `\`NavigationView\` appears on this line. Apple's reference page for it carries \`deprecatedAt: 27.0\` on every platform it lists — iOS, iPadOS, Mac Catalyst, macOS, tvOS, visionOS and watchOS — with a deprecation summary reading "Use \`NavigationStack\` and \`NavigationSplitView\` instead." The deprecation is invisible in the rendered documentation page's prose; it lives in that page's own JSON metadata, which is where this was read from.`,
        fix: `Replace it with \`NavigationStack\` for a push hierarchy, or \`NavigationSplitView\` for a sidebar-and-detail layout; Apple's "Migrating to New Navigation Types" article covers the conversion, including replacing \`NavigationLink(destination:)\` with a value-plus-\`navigationDestination(for:)\` pair. \`NavigationStack\` is also one of the standard containers that adopts Liquid Glass automatically on a rebuild against the latest SDKs, so the migration and the redesign are the same piece of work.`,
        doc: "apple-hig-liquid-glass",
      });
    }

    // ── hardcoded-color-literal ─────────────────────────────────────────────
    COLOR_LITERAL.lastIndex = 0;
    for (let m = COLOR_LITERAL.exec(masked); m; m = COLOR_LITERAL.exec(masked)) {
      const written = m[0].startsWith("#") ? "#colorLiteral(…)" : `${m[0].replace(/\s*$/, "")}…)`;
      found.push({
        line: lineOf(m.index),
        severity: "info",
        rule: "hardcoded-color-literal",
        message: `\`${written}\` writes a colour as numbers on this line. A colour in an Apple app is normally a resource rather than a literal: \`Color(_:bundle:)\` loads "a color from a color set stored in an Asset Catalog", and "the system determines which color within the set to use based on the environment at render time". A literal has no light, dark or increased-contrast variant to resolve to, so it renders the same value in every appearance and under Increase Contrast. This says nothing about the colour's contrast ratio — that depends on what it is drawn against, which this line does not carry.`,
        fix: `Move the value into a colorset in \`Assets.xcassets\` and reference it as \`Color("Name")\`, giving it light, dark and increased-contrast variants — or reach for a system semantic colour (\`.primary\`, \`.secondary\`, \`labelColor\`, \`windowBackgroundColor\`, \`controlAccentColor\`), which carries those variants already and follows the user's accent. If this literal is deliberately fixed — a brand swatch reproduced exactly, a chart series, a value that must not adapt — it is doing what it was written to do.`,
        doc: "apple-accessibility",
      });
    }

    // ── symbol-as-only-button-label ─────────────────────────────────────────
    //
    // Two shapes reach the label closure: `Button(action:) { label }`, where the
    // trailing closure is the label, and `Button { action } label: { label }`,
    // where it is the second. Anything else — an unbalanced brace, a label
    // holding more than one view, a symbol named by a variable — emits nothing.
    BUTTON.lastIndex = 0;
    for (let m = BUTTON.exec(masked); m; m = BUTTON.exec(masked)) {
      let i = m.index + "Button".length;
      const skipSpace = () => {
        while (i < masked.length && /\s/.test(masked[i])) i++;
      };
      skipSpace();
      if (masked[i] === "(") {
        const afterArgs = matchBalanced(masked, i, "(", ")");
        if (afterArgs === -1) continue;
        i = afterArgs;
        skipSpace();
      }
      if (masked[i] !== "{") continue;
      const afterFirst = matchBalanced(masked, i, "{", "}");
      if (afterFirst === -1) continue;
      let body = masked.slice(i + 1, afterFirst - 1);

      let j = afterFirst;
      while (j < masked.length && /\s/.test(masked[j])) j++;
      if (masked.startsWith("label:", j)) {
        j += "label:".length;
        while (j < masked.length && /\s/.test(masked[j])) j++;
        if (masked[j] !== "{") continue;
        const afterLabel = matchBalanced(masked, j, "{", "}");
        if (afterLabel === -1) continue;
        body = masked.slice(j + 1, afterLabel - 1);
      }

      const symbol = loneSymbolName(body);
      if (symbol === null) continue;
      found.push({
        line: lineOf(m.index),
        severity: "info",
        rule: "symbol-as-only-button-label",
        message: `This \`Button\`'s entire label is one \`Image(systemName: "${symbol}")\`, so the name VoiceOver speaks for it is derived from the symbol rather than written for a listener. SF Symbols do carry automatic labels — "the \`checkmark.seal.fill\` symbol is labeled 'Verified' by default" — but in Apple's own worked example that derivation produced the raw identifier \`slider.vertical.3\` on a button initialised with the title "Edit Budgets", and Apple's explanation was simply that "the accessibility label is being derived from the SF Symbol". The defect to look for is a wrong label rather than a missing one, and a well-chosen symbol may speak perfectly well — so this is a risk to check, not a fault found.`,
        fix: `Turn VoiceOver on and listen to this control; Apple's instruction is "if you're relying on a symbol's default label, it's important to check that it accurately describes your interface". If what it speaks is not what the button does, name it: \`Label("…", systemImage: "${symbol}").labelStyle(.iconOnly)\` keeps the icon-only appearance while the title still speaks, and \`.accessibilityLabel("…")\` on the \`Image\` or the \`Button\` does the same. If it already reads correctly, nothing needs to change.`,
        doc: "apple-accessibility",
      });
    }

    found.sort((a, b) => a.line - b.line);
    out.push(...found);
  }

  return out;
}
