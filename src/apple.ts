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

import {
  type LintFinding, type AuditReport, type AuditStructured,
  auditStructuredFrom, renderNotVisibleSection,
} from "./lint.js";
import {
  type ConfigRead, type PlatformVerdict, COLORSET_CONTENTS,
  readPlist, readEntitlements, readBuildSettingKeys, readAssetCatalog, inferPlatform,
} from "./appleconfig.js";
import { maskComments } from "./scan.js";
import { scanProject, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "./project.js";

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
 * Walks a chain of `.name(…)` / `.name` modifier segments from `from`, greedily,
 * returning the names in order and the index just past the last one it could
 * read. Stops — rather than fails — at the first text that is not a segment, so
 * a caller that needs the chain to cover everything checks `end` itself.
 */
function modifierChain(src: string, from: number): { names: string[]; end: number } {
  const names: string[] = [];
  let i = from;
  for (;;) {
    const segment = /^\s*\.([A-Za-z_][A-Za-z0-9_]*)\s*/.exec(src.slice(i));
    if (!segment) return { names, end: i };
    let next = i + segment[0].length;
    if (src[next] === "(") {
      const after = matchBalanced(src, next, "(", ")");
      if (after === -1) return { names, end: i };
      next = after;
    }
    names.push(segment[1]);
    i = next;
  }
}

/**
 * The modifiers whose presence falsifies `symbol-as-only-button-label` outright,
 * on the very line the rule is reading.
 *
 * The rule's sentence is that the name VoiceOver speaks is *derived from the
 * symbol rather than written*. Each of these writes it, or removes the element
 * from VoiceOver entirely, so the sentence is false wherever one appears — and
 * unlike the parent-modifier and other-file cases this module refuses to guess
 * at, this one is a **presence** in the characters the rule already has in hand.
 * Not checking it would also have made the rule's own `fix` a loop: it advises
 * `.accessibilityLabel(…)`, and before this the identical finding came back
 * unchanged after the reader took the advice.
 *
 * `accessibilityElement(children:)` is deliberately **not** here. Combining the
 * children of a button whose only child is the symbol still yields the symbol's
 * derived label, so it does not falsify anything.
 */
const ACCESSIBILITY_OVERRIDES = new Set(["accessibilityLabel", "accessibilityHidden", "accessibilityValue"]);

/**
 * The literal symbol name when `body` is nothing but one `Image(systemName:)`
 * expression whose modifiers leave the spoken name derived, or null.
 *
 * A trailing chain of presentation modifiers is allowed — `Image(systemName:
 * "gear").font(.title2).foregroundStyle(.tint)` is still a label consisting of
 * one symbol and nothing else. A second view, a container, a chain carrying an
 * `ACCESSIBILITY_OVERRIDES` member, or a symbol name that is an identifier
 * rather than a string literal all return null. In the last case this file
 * cannot name the symbol, and a finding that cannot quote the identifier it is
 * warning about is not worth reading.
 */
function loneSymbolName(body: string): string | null {
  const trimmed = body.trim();
  const named = /^Image\(\s*systemName\s*:\s*"([^"\\]*)"/.exec(trimmed);
  if (!named) return null;
  const afterInit = matchBalanced(trimmed, trimmed.indexOf("("), "(", ")");
  if (afterInit === -1) return null;
  const chain = modifierChain(trimmed, afterInit);
  if (chain.end !== trimmed.length) return null;
  if (chain.names.some((name) => ACCESSIBILITY_OVERRIDES.has(name))) return null;
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
          message: `\`.font(.system(size: ${m[1]}))\` appears on this line. That form takes a bare \`CGFloat\` and has no text style behind it to scale against. Apple's rule is stated plainly — "To add support for Dynamic Type in your app, you use text styles" — and Dynamic Type is a system-level feature on iOS and iPadOS. This line is reported because the platform signals for this project resolved to iOS; the identical line on a macOS target is not, since "macOS doesn't support Dynamic Type" and the built-in macOS text styles resolve to fixed points themselves.`,
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
        message: `\`NavigationView\` appears on this line. All seven platform rows on Apple's reference page for it — iOS, iPadOS, Mac Catalyst, macOS, tvOS, visionOS and watchOS — carry \`deprecatedAt: 27.0\`, and the page's deprecation summary names \`NavigationStack\` and \`NavigationSplitView\` as the replacements; read from that page's \`metadata.platforms[]\` and \`deprecationSummary\`. Every row also carries \`deprecated: false\`, so the deprecation lands *at* 27.0 — and nothing read here is this project's deployment target, so how soon that matters is a question this finding does not answer.`,
        fix: `Replace it with \`NavigationStack\` for a push hierarchy, or \`NavigationSplitView\` for a sidebar-and-detail layout; Apple's "Migrating to new navigation types" article covers the conversion. \`NavigationStack\` is also one of the standard containers that adopts Liquid Glass automatically on a rebuild against the latest SDKs, so the migration and the redesign are the same piece of work.`,
        doc: "apple-hig-liquid-glass",
      });
    }

    // ── hardcoded-color-literal ─────────────────────────────────────────────
    COLOR_LITERAL.lastIndex = 0;
    for (let m = COLOR_LITERAL.exec(masked); m; m = COLOR_LITERAL.exec(masked)) {
      // Every run of whitespace inside the match is removed, not just the
      // trailing one. `COLOR_LITERAL` allows `\s` between `Color(`, `red` and
      // `:`, and `\s` matches a newline — so the Xcode/SwiftFormat idiom of
      // wrapping a long argument list put a raw newline inside the message.
      // The markdown bullet broke at it (everything after rendered as a
      // sibling paragraph outside the list) and `findings[].message` carried
      // it on the wire. Collapsing gives the canonical single-line spelling of
      // the form, `Color(red:…)`, from either layout; the match and the line
      // number were already right and are untouched.
      const written = m[0].startsWith("#") ? "#colorLiteral(…)" : `${m[0].replace(/\s+/g, "")}…)`;
      found.push({
        line: lineOf(m.index),
        severity: "info",
        rule: "hardcoded-color-literal",
        message: `\`${written}\` starts on this line. That form writes a colour as numbers rather than resolving one from a resource, and a colour in an Apple app is normally a resource: \`Color(_:bundle:)\` loads "a color from a color set stored in an Asset Catalog", and "the system determines which color within the set to use based on the environment at render time". A literal has no light, dark or increased-contrast variant to resolve to, so it renders the same value in every appearance and under Increase Contrast. This says nothing about the colour's contrast ratio — that depends on what it is drawn against, which this line does not carry.`,
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
    //
    // An `ACCESSIBILITY_OVERRIDES` modifier suppresses the finding from either
    // of two positions, because the spoken name can be written in either: on the
    // symbol inside the closure (handled in `loneSymbolName`) or on the whole
    // `Button` expression after it (handled here). Both are characters on the
    // line the rule already read — this is not the module guessing at a parent
    // it cannot see, it is the module declining to ignore what it can.
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
      let buttonEnd = afterFirst;

      let j = afterFirst;
      while (j < masked.length && /\s/.test(masked[j])) j++;
      if (masked.startsWith("label:", j)) {
        j += "label:".length;
        while (j < masked.length && /\s/.test(masked[j])) j++;
        if (masked[j] !== "{") continue;
        const afterLabel = matchBalanced(masked, j, "{", "}");
        if (afterLabel === -1) continue;
        body = masked.slice(j + 1, afterLabel - 1);
        buttonEnd = afterLabel;
      }

      const symbol = loneSymbolName(body);
      if (symbol === null) continue;
      const outer = modifierChain(masked, buttonEnd);
      if (outer.names.some((name) => ACCESSIBILITY_OVERRIDES.has(name))) continue;
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

// ═══════════════════════════════════════════════════════════════════════════
// The report
// ═══════════════════════════════════════════════════════════════════════════

/**
 * File extensions this audit opens.
 *
 * `.swift` is the only source language read. `.plist` covers an `Info.plist`
 * wherever it sits plus any other property list a target carries;
 * `.entitlements` is the same XML shape read for a different purpose.
 * Everything else an Xcode project contains — `.m`, `.h`, `.storyboard`,
 * `.xib`, `.xcstrings`, `.metal`, the asset catalog's images — is never
 * opened, and the disclosure list says so.
 */
export const APPLE_EXTENSIONS = [".swift", ".plist", ".entitlements"];

/**
 * Files matched by name or path tail rather than extension, which
 * `scanProject` reads before any of the extension matches.
 *
 * All three are configuration, which is the backbone of this audit: an
 * `Info.plist` whose keys settle the platform, the `project.pbxproj` Xcode
 * writes `INFOPLIST_KEY_*` into, and the `Contents.json` inside every
 * colorset. Being read first is what stops a project with four hundred Swift
 * files from spending its whole budget before reaching the plist that decides
 * which platform-scoped rules may run at all.
 *
 * **The third is a path tail, not a basename, and that is the whole point.**
 * `Contents.json` alone was the shipped spelling, and in an Xcode asset
 * catalog that basename is one file per asset *entry* — every imageset,
 * appiconset, symbolset, dataset and group has one — so the match scaled with
 * an app's image count while `readAssetCatalog` accepted only the colorsets
 * among them. On an ordinary iOS app with 400 imagesets the useless 399 filled
 * the file budget and not one Swift file was opened: `Platform: iOS …
 * Platform-scoped rules ran` above `0 error · 0 warning · 0 info`, on a
 * project whose own `ContentView.swift` carried two findings. That is the same
 * shape `APPLE_SKIP_DIRS` below exists to prevent, re-entering through the
 * catalog. `.colorset/Contents.json` asks for exactly the members this audit
 * can use — `COLORSET_CONTENTS`, the pattern `readAppleConfig` then routes on,
 * so the two cannot disagree about which files were worth opening.
 */
export const APPLE_FILENAMES = ["Info.plist", "project.pbxproj", ".colorset/Contents.json"];

/**
 * Where an Xcode project's *dependencies* live, added to `scanProject`'s own
 * skip list for this audit only.
 *
 * `SKIP_DIRS` already carries `node_modules` and `vendor` for the same reason,
 * and these are the Apple analogues; leaving them in produced three separate
 * failures on one clean app with `Pods/` and `Carthage/` beside it, none of
 * which a disclosure sentence would have fixed:
 *
 *  1. **Every finding was about somebody else's code.** Five of five came from
 *     vendored source — `uirequiresfullscreen-deprecated` attributed to "this
 *     project's configuration" from a pod's `Info.plist`, and
 *     `navigationview-deprecated` twice inside two vendored libraries.
 *  2. **A dependency decided the app had no platform.** A pod's
 *     `INFOPLIST_KEY_LSMinimumSystemVersion` is a macOS signal; against the
 *     app's own iOS signals it made the verdict `conflicted`, and both
 *     platform-scoped rules then went silent on code the user did write.
 *  3. **A dependency starved the scan.** `Carthage` sorts before most app
 *     directories, so 420 vendored Swift files exhausted the file cap and the
 *     app's own `ContentView.swift` — carrying both a `NavigationView` and a
 *     `.font(.system(size: 17))` — was never opened. The report read
 *     `Platform: iOS … Platform-scoped rules ran` above `0 error · 0 warning ·
 *     0 info`, which is the worst shape this whole module exists to avoid.
 *
 * `.build` and `.swiftpm` need no entry: `scanProject` skips every directory
 * whose name begins with a dot. A Swift package's sources vendored under some
 * other name are not covered by this list and are disclosed instead.
 */
export const APPLE_SKIP_DIRS = ["Pods", "Carthage", "DerivedData"];

/** `project.pbxproj`, at any depth. */
const PBXPROJ = /(^|\/)project\.pbxproj$/;
const ENTITLEMENTS_PATH = /\.entitlements$/i;
const PLIST_PATH = /\.plist$/i;

/**
 * Fold the scanned files into the four configuration surfaces
 * `appleConfigRules` and `inferPlatform` read.
 *
 * **A path that could not be parsed never enters `surfaces`.** The two arrays
 * are independent — nothing in `ConfigRead` relates `unparsed` to `surfaces`
 * — so a path listed in both would let `sandbox-absent-macos` say "the
 * entitlements file read here — `App.entitlements` — declares no
 * `com.apple.security.app-sandbox`" about a binary plist whose contents this
 * process never saw. That is a fabricated fact with a real filename attached
 * to it, which is worse than silence. `readPlist` already distinguishes "read,
 * and empty" from "not read"; this function is where that distinction is
 * spent, by routing the second to `unparsed` and returning before the surface
 * is recorded. The colorset branch does the same with its own `JSON.parse`,
 * because `readAssetCatalog` skips a malformed `Contents.json` silently and
 * a caller that only called it could not tell a skipped file from a directory
 * holding no colorsets at all.
 *
 * **Every surface is merged across every file of its kind, and neither merge
 * carries a target.** Keys go into one flat map, first writer winning; the
 * entitlement identifiers three lines above go into one `Set`. Both are real
 * widenings and both are disclosed: a workspace with an app target and a share
 * extension has two `Info.plist`s, and a key declared by either reads here as
 * declared by "this project". The entitlements `Set` is the half that was
 * undisclosed until v0.25.0, and two of the four configuration rules read it —
 * so on the standard macOS shape of an app beside an XPC service or a login
 * item, `microphone-entitlement-mismatch` fires over a pair split across two
 * files that are each correct alone, and one target's `app-sandbox` keeps
 * `sandbox-absent-macos` off the other. Nothing in `ConfigRead` carries a
 * target, so there is no shape in which this function could report which one;
 * what it can do, and does, is name every file it merged in `surfaces`.
 */
export function readAppleConfig(files: Array<{ path: string; source: string }>): ConfigRead {
  const keys = new Map<string, string | boolean | string[]>();
  const entitlements = new Set<string>();
  const surfaces: ConfigRead["surfaces"] = { plist: [], buildSettings: [], entitlements: [], assetCatalogs: [] };
  const unparsed: string[] = [];
  const colorSetFiles: Array<{ path: string; source: string }> = [];

  for (const file of files) {
    if (ENTITLEMENTS_PATH.test(file.path)) {
      if (readPlist(file.source) === null) {
        unparsed.push(file.path);
        continue;
      }
      surfaces.entitlements.push(file.path);
      for (const id of readEntitlements(file.source)) entitlements.add(id);
      continue;
    }
    if (PLIST_PATH.test(file.path)) {
      const parsed = readPlist(file.source);
      if (parsed === null) {
        unparsed.push(file.path);
        continue;
      }
      surfaces.plist.push(file.path);
      for (const [key, value] of parsed) if (!keys.has(key)) keys.set(key, value);
      continue;
    }
    if (PBXPROJ.test(file.path)) {
      surfaces.buildSettings.push(file.path);
      for (const [key, value] of readBuildSettingKeys(file.source)) if (!keys.has(key)) keys.set(key, value);
      continue;
    }
    if (COLORSET_CONTENTS.test(file.path)) {
      try {
        JSON.parse(file.source);
      } catch {
        unparsed.push(file.path);
        continue;
      }
      surfaces.assetCatalogs.push(file.path);
      colorSetFiles.push(file);
    }
  }

  return { keys, entitlements, colorSets: readAssetCatalog(colorSetFiles), surfaces, unparsed };
}

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

export const APPLE_PREAMBLE =
  "This walks the directory you named, reads the configuration and Swift files it can open, and runs static rules over their text. It builds nothing, resolves no import, evaluates no build setting, renders nothing and measures nothing. It cannot see:";

/**
 * What `audit_apple_ui` structurally cannot see.
 *
 * Every entry below was written *after* running `appleReport` on a directory
 * built to demonstrate it, and every demonstration is kept as a test in
 * `tests/apple.test.ts`. That order is the method, not a preference: four
 * earlier rounds in this package each wrote a sentence off the code rather
 * than off a run, and a reviewer running the case found the discrepancy every
 * time.
 *
 * **Every sentence is scoped to what was searched.** "Not found in the files
 * named, having searched these surfaces" — never "the project does not do X",
 * and never "Apple does not publish X". v0.24.0 shipped six false absence
 * claims and the defect was the sentence form rather than the effort: an
 * unbounded absence is falsified by one fetch or one unread file, where a
 * scoped one is made *incomplete* by the same discovery and is corrected by
 * naming another surface rather than by reversing an assertion.
 * `tests/integrity.test.ts` rejects the unbounded form in the Apple
 * documents; this list is held to the same standard by a test of its own.
 */
export const APPLE_NOT_VISIBLE: string[] = [
  "**Nothing here is measured, and nothing is rendered.** No contrast ratio is computed, no tap target sized, no simulator launched, no screenshot taken, no build run. `colorset-no-dark-variant` fired on a `Brand.colorset` whose single colour is `(0.18, 0.35, 0.85)` and said nothing whatever about how that colour reads against anything, and `hardcoded-color-literal` fired on `Color(red: 0.10, green: 0.20, blue: 0.30)` without computing a ratio from it either. Not one number in this report came from a rendered pixel. `audit_accessibility` computes a contrast ratio, from the pairs you hand it rather than from anything found in a file, and `measure_screenshot` is the only tool here that looks at a rendered frame.",

  "**A file this scan never opened.** It opens `.swift`, `.plist` and `.entitlements` files, plus `Info.plist` and `project.pbxproj` matched by name and `*.colorset/Contents.json` matched by the end of its path — and stops there. In a directory holding `Base.lproj/Main.storyboard`, `Base.lproj/Launch.xib`, `Legacy/LegacyVC.m`, `InfoPlist.xcstrings` and `Sources/V.swift.txt` beside one `Sources/V.swift`, the scan read two files: the plist and the `.swift`. A screen laid out in Interface Builder, a view controller written in Objective-C, and a Swift file saved under any other suffix are each outside what was read — the live `NavigationView` in that `V.swift.txt` drew nothing. An asset-catalog member that is not a colorset is outside it too, and is not opened at all: a run with `Assets.xcassets/Contents.json` and `Assets.xcassets/AppIcon.appiconset/Contents.json` beside one Swift file counted one file read and zero colorsets.",

  "**A directory the walk never enters** — a fixed skip list, plus every directory whose name begins with a dot. `Pods`, `Carthage` and `DerivedData` are on that list for this audit specifically, beside the shared `node_modules`, `vendor`, `build` and the rest; SwiftPM's `.build` and `.swiftpm` are skipped for their leading dot. **Nothing inside a dependency is audited, in either direction.** On a clean app with `Pods/` and `Carthage/` beside it, every finding came from `Ledger/ContentView.swift` and none from either — a pod's `Info.plist` declaring `UIRequiresFullScreen` drew nothing, two vendored `NavigationView`s drew nothing, and a pod's own `INFOPLIST_KEY_LSMinimumSystemVersion` did not reach the platform verdict. Read that as coverage rather than as a clean bill on your dependencies: this audit says nothing about them at all. **It is a name test, not a provenance test, so it drops your own code if you keep it under one of those names** — a project whose own `Pods/MyOwnCode.swift` held a `NavigationView` came back `filesRead: 1`, \"Swift source: none read\" and no findings, with nothing in the report body marking the skip. Pointing the tool straight at that directory audits it normally, because the root you name is never itself name-checked.",

  "**Vendored source under a directory name that is not on that list.** The list is names, not provenance, and nothing consults `.gitignore` or a lockfile. A library checked into `Vendor/Lib/View.swift` — capital `V`, which the shared lowercase `vendor` entry does not match — was read as though a person on the team had written it, and its `NavigationView` was reported against that path. Check the file a finding names before acting on it — every Swift finding carries its path, in the markdown bullet and in `structuredContent.findings[].file`. Do not read it off the surfaces list above: that list names at most ten paths per kind (with an exact count, and an \"…and N more\" tail beyond it), and on a project of 14 Swift files the one the finding named was in the untruncated remainder rather than in the ten.",

  `**Whatever the scan stopped short of.** It reads at most ${MAX_FILES} files and at most ${kb(MAX_TOTAL_BYTES)} in total, with nothing exempt — configuration counts against both — stopping at the *first* file that would cross either line and leaving everything the walk had not yet reached unread rather than sampled. Configuration is read *before* any Swift file, which is priority and not exemption, and both halves of that showed up in a pair of runs: a project of 406 Swift files beside one \`Info.plist\` was read to ${MAX_FILES} files with the plist among them, and the \`NavigationView\` in the Swift file that sorted last was not reported; a project of 500 colorsets beside one Swift file spent the entire budget on colorsets, drew ${MAX_FILES} \`colorset-no-dark-variant\` findings, and reported \`Swift source: none read\`. \`scan.hitFileCap\` was true in both, and while either cap flag is true no absence in \`findings\` covers the part that was never opened — the markdown says so in a single **Capped:** line that is easy to read past.`,

  `**A file over ${kb(MAX_FILE_BYTES)}, which is skipped whole rather than truncated.** It is never opened, so nothing above is claimed about anything inside it, and the scan carries on with the rest. A \`Sources/Huge.swift\` past that cap whose second line was \`NavigationView { Text("x") }\` produced no finding, and the small Swift file beside it was read normally. The line above names at most five such files and counts the rest: with six over the cap it read \"Skipped 6 file(s) … , …and 1 more\", so the sixth is counted but not named. \`scan.skippedLarge\` carries every one of them by path.`,

  "**Anything reached through a symbolic link.** The walk descends into real directories and reads real files, and a directory entry that is a symlink is neither, so it is stepped over — silently: a skipped link is counted in neither `scan.unreadable` nor `scan.skippedLarge`, and nothing in the report mentions it. A linked directory holding a `NavigationView` and a linked `Sources/LinkedV.swift` holding another both drew nothing, while the real Swift file beside them was audited normally. A workspace whose packages are linked into the tree you audit is outside what was read for this reason; point the tool at the directory the files really live in, since the path you pass is followed whether or not it is itself a link.",

  "**A configuration file that could not be parsed.** A binary plist (the `bplist00` magic) and anything without a `<plist>`/`<dict>` structure come back as \"not read\" rather than as an empty result, and a `Contents.json` that is not valid JSON is treated the same way. Such a path is kept out of the surfaces list entirely and named in the **Could not be parsed** line above instead — which is what stopped `sandbox-absent-macos`, on a macOS project whose only `App.entitlements` was a binary plist, from naming that file as one it had read: it said \"No entitlements file was among the surfaces read here\" instead, where the same project written as XML draws a message naming the file. A binary `Info.plist` beside a Swift file took the platform verdict to \"not determined\" and silenced every platform-scoped rule with it.",

  "**A plist value outside the small subset this reader covers.** It reads `<string>`, `<true/>`, `<false/>` and an `<array>` of direct `<string>` children; a key whose value is a `<dict>`, an `<integer>`, a `<real>`, a `<date>` or `<data>` is walked past and dropped rather than represented with a guessed type, and an `<array>` of `<dict>`s comes back as an empty array. A `UIRequiresFullScreen` nested one dictionary down inside `NSAppTransportSecurity` drew no finding, and a `CFBundleURLTypes` array of dicts came back holding nothing. The dropped-key rule reaches the platform signals too: `UILaunchScreen` written as a `<dict>` contributed no signal in a run here, where the same key as a `<string>` produced `Platform: iOS` on the identical Swift file. That particular loss is usually covered rather than fatal — the Xcode 12–14 template writes `UILaunchScreen` as a dict *and* `UISupportedInterfaceOrientations` as an array of strings, and a plist carrying both was still read as iOS off the second one — but a plist whose only iOS evidence is a dict-valued key has none this reader can use.",

  "**Everything in a `project.pbxproj` other than `INFOPLIST_KEY_*`.** That prefix is the only thing read out of the file; the rest of the build configuration is not parsed. In a `project.pbxproj` carrying `ENABLE_HARDENED_RUNTIME = YES`, `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` and `PRODUCT_NAME = \"Ledger\"` beside three `INFOPLIST_KEY_*` settings, the three prefixed settings were read — `INFOPLIST_KEY_UIRequiresFullScreen` produced both a finding and the iOS verdict — and the other three were outside what was read. The prefix is also stripped literally, so a build setting arrives under whatever name follows it: `INFOPLIST_KEY_UILaunchScreen_Generation` becomes the key `UILaunchScreen_Generation`, and `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone` becomes `UISupportedInterfaceOrientations_iPhone`. Three suffixed spellings are recognised as iOS signals by name — `UILaunchScreen_Generation`, `UISupportedInterfaceOrientations_iPhone` and `UISupportedInterfaceOrientations_iPad` — because they are what a default project actually writes; only those three, and only as an exact set.",

  "**Which target a declaration belongs to — a key or an entitlement alike.** Keys from every plist and every `project.pbxproj` in the tree are merged into one map, and the entitlement identifiers from every `.entitlements` file into one set, because nothing in the four surfaces read here carries a target. An app target with `App/Info.plist` and a share extension with `ShareExtension/Info.plist` produced one `uirequiresfullscreen-deprecated` finding, phrased as a fact about \"this project's configuration\", when the key had been declared by the extension alone. The entitlements set does the same, in both directions, and an app beside an XPC service, a login item, a Sparkle updater or a Safari extension is the ordinary macOS shape for meeting it: a sandboxed app's `Ledger/Ledger.entitlements` beside a hardened helper's `Helper/Helper.entitlements` — each correct alone — drew `microphone-entitlement-mismatch` over a pair that appears in neither file, and in the other direction the app's `com.apple.security.app-sandbox` was enough to keep `sandbox-absent-macos` off a helper file carrying none. The surfaces list above names every plist and every entitlements file that went into them, which is the only place in this report where the distinction survives; two entitlements paths on that line mean two files were unioned.",

  "**Localised values, and every localisation surface.** `InfoPlist.xcstrings` — where Xcode puts a localised `NSCameraUsageDescription` — is not among the file shapes this scan opens, and neither is a `.strings` file nor the contents of an `.lproj` directory. A project carrying an `InfoPlist.xcstrings` with an `NSCameraUsageDescription` inside it read two files here, and that was not one of them. A value declared only there is absent from this audit's view of the project rather than from the project.",

  "**Whether the Hardened Runtime is enabled.** It is a build capability, `ENABLE_HARDENED_RUNTIME`, rather than an entitlement, so it is carried by none of the four surfaces read here, and there is deliberately no rule for it in either direction. A macOS project with `ENABLE_HARDENED_RUNTIME = YES` in its `project.pbxproj` produced one finding, `sandbox-absent-macos`, and nothing about the runtime; a macOS project declaring the exception entitlement `com.apple.security.cs.disable-library-validation` produced that same one finding and nothing about the runtime either. Two facts from Apple's own documentation are why no rule is keyed on a *missing* exception: Xcode \"automatically adds the Hardened Runtime capability\" to a new macOS app from a template, and the capability \"doesn't affect the operation of most apps\" — so \"macOS, no exception entitlement declared\" is the shape of a correctly configured hardened app rather than of a missing one. What is readable here, if a rule is ever wanted, is a *declared* `com.apple.security.cs.*` exception.",

  "**Purpose strings, in both directions.** No rule here reports a missing `NS…UsageDescription`, and the silence is not a verdict on a project's purpose strings. From the plist alone the check is a false-positive generator, because Xcode writes the same value into an `INFOPLIST_KEY_NSCameraUsageDescription` build setting and a localised one into `InfoPlist.xcstrings`: a project declaring it only as a build setting was run here, the key was picked up out of `project.pbxproj`, and a rule reading the plist alone would have called it missing on a project that is correct. From Swift source it is a lower bound, because a third-party SDK creates the obligation as surely as a first-party call does — an iOS project calling `AVCaptureDevice.requestAccess(for: .video)` with no usage description anywhere drew nothing here, and a project whose only camera access sits inside a vendored framework has nothing in its own source to find.",

  "**Every platform-scoped rule, whenever the platform line above does not name a platform.** `fixed-font-size` runs on an iOS verdict only and `sandbox-absent-macos` on a macOS one only; both stay silent on a null verdict, and null is the correct answer whenever the signals are absent or point both ways rather than a failure to be worked around. One `Sources/V.swift` — `.font(.system(size: 17))` on one line, `NavigationView` on the next — drew `fixed-font-size` on a project carrying an iOS signal and drew it on neither of two projects without one: a project with no signal at all, and a project where `LSMinimumSystemVersion` and `UILaunchStoryboardName` conflicted. All three drew `navigationview-deprecated`, which is not platform-scoped. Read the platform line before reading any silence here as a result.",

  "**Whether a Swift file is missing something.** No rule here claims an absence in Swift source, and two properties of the language are why: a modifier applied to a parent covers its children, so a label seven lines above a control is invisible to a reader working one line at a time; and the code that satisfies a requirement — a Reduce Motion check, a `@ScaledMetric`, a `dynamicTypeSize` — may live in another file entirely. The consequence is visible in the findings rather than only in their absence: `symbol-as-only-button-label` fired on a `Button` whose enclosing `VStack` carried both `.accessibilityLabel(\"Refresh the ledger\")` and `.accessibilityElement(children: .combine)`, because those modifiers are on the parent and the rule reads the line. That finding is a risk to check with VoiceOver, which is what its own text says, and never a report that a label is missing.",

  "**A Swift file whose comment masking went wrong, which reads exactly like a file with nothing to find.** `maskComments` tracks quotes per character rather than tokenizing, so Swift string interpolation can expose a comment marker inside a literal as live code, and a well-formed comment later in the file then lets the nesting walk through and blank the real code in between. A file whose second line was `let label = \"a\\(f(\"open /*\")) still\"` and whose fifth line held a live `NavigationView` produced no findings at all — that `NavigationView` had been masked to whitespace before any rule saw it. There is no signal for this anywhere in the output. A rule going quiet on a file containing an interpolated string with a `/*` or `//` inside it may be meeting this gap rather than finding nothing; it is pinned as a known, unfixed gap in `tests/scan.test.ts`.",

  "**The shapes the Swift rules do not match, which a clean run says nothing about.** `fixed-font-size` matches the SwiftUI `.system(size:)` form only, so `UIFont.systemFont(ofSize: 17)` and `Font.custom(\"Inter\", fixedSize: 17)` — which carry the same documented cost to Dynamic Type — are outside it. `hardcoded-color-literal` wants a `red:` argument label, so a project's own hex initialiser, `Color(hex: \"#FF3B30\")`, is outside it. `symbol-as-only-button-label` needs the symbol name as a string literal, so `Image(systemName: symbol)` with a variable is outside it — and it needs the label written inside the closure it reads, so a `Button(action: {}) { content }` whose label closure is a bare identifier is outside it too: the symbol sits in whatever `content` resolves to, and this reader does not follow an identifier to its definition. That second shape is what `recipes/card/swiftui.swift` writes, and a run here drew nothing on it where the same symbol written inline in the label closure drew the finding. One iOS file carrying all five of those lines drew zero findings here. A clean result on a UIKit target, or on a codebase with its own colour and symbol helpers, is coverage rather than restraint.",

  "**The difference between code and a string that looks like code.** `maskComments` blanks comments and leaves string contents in place, so a rule matching a type name matches it inside a literal too: `Text(\"NavigationView is deprecated\")` drew `navigationview-deprecated` against that line. Rare in practice, and stated here so a finding against a line of prose is not a surprise.",

  "**A key spelling this reader has not been taught.** `GENERATE_INFOPLIST_FILE = YES` has been Xcode's default since 13, so a new project has no `Info.plist` and every key arrives out of `project.pbxproj` — where Xcode splits two iOS families by idiom and generation. Those three spellings (`UISupportedInterfaceOrientations_iPhone`, `UISupportedInterfaceOrientations_iPad`, `UILaunchScreen_Generation`) are matched by name, so a default SwiftUI-lifecycle iOS app with no `Info.plist` and no `import UIKit` anywhere reads as `Platform: iOS` and `fixed-font-size` fires on it. Anything outside that set produces no signal rather than a guessed one: a project whose only iOS-shaped keys were `UIApplicationSceneManifest_Generation` and `UIApplicationSupportsIndirectInputEvents` came back `not determined`, with `fixed-font-size` silent on a `.font(.system(size: 17))` sitting in the file beside them.",

  "**A colorset that declares no colour value.** An entry counts as a colour when it carries a `color` object; a colorset carrying none is left out of the result entirely, the same way an unparseable one is, and draws no finding in either direction. Xcode's project template writes exactly that shape for `AccentColor` — `{\"colors\":[{\"idiom\":\"universal\"}]}`, an idiom and nothing else, meaning \"use the system accent\" — and a default project carrying only that colorset produced zero findings here. It is still listed above as an asset-catalog colorset that was read, because it was; it simply contributed nothing. A colorset holding a real value under some shape this reader does not recognise would be dropped the same way and would look identical.",

  "**A path this process could not open.** A directory it may not list and a file it may not read are both recorded, stepped over, and the audit continues without them. `chmod 000` on a `Secret/` directory holding a `NavigationView` produced no finding and a **Could not be opened at all: `Secret`** line above; `scan.unreadable` carries every such path, and the line above names at most five. Nothing under an unopened path was audited, so an empty findings list covers the part of the tree that was readable and no more.",

  "**A file that is not UTF-8 text.** Every file is decoded as UTF-8 and the result is handed to the rules whatever it looks like. A `Sources/Utf16.swift` saved as UTF-16, whose second line was a live `NavigationView`, produced no finding, while the UTF-8 file beside it was audited normally — and it counts as read in every register: it is named in the surfaces list above, its bytes count towards the byte cap, and it appears in neither `scan.unreadable` nor `scan.skippedLarge`. This one is invisible everywhere except in the finding it did not produce.",

  "**What a colorset resolves to.** `hasDarkVariant` is a reading of a declaration, not of a colour. A `Brand.colorset` declaring a `luminosity: dark` appearance whose dark components are byte-for-byte its light ones drew no finding, which is correct — the declaration is there — and settles nothing about whether the two appearances differ, whether either is legible against what it is drawn on, or what happens under Increase Contrast. The colour components are never compared here at all.",
];

export const APPLE_CLOSING =
  "An empty findings list here means no rule this audit runs matched the text of the files that were read — not that the project is sound, and not that it was all read. `scan` says how much of it was, and the platform line above says which of the rules were allowed to run at all.";

/**
 * The structured half of `audit_apple_ui`, on top of what every structured
 * auditor carries: what the scan actually reached.
 *
 * The same six fields, meaning the same things and read off the same
 * `scanProject` result, that `audit_project` and `audit_generic_design`
 * declare — so a caller that learned the block from one tool can read it from
 * this one. Required rather than optional, as it is for `audit_project`: this
 * tool has no snippet mode, so every call scanned a directory and there is no
 * shape in which the block is legitimately absent.
 */
export interface AppleStructured extends AuditStructured {
  scan: {
    filesRead: number;
    scannedBytes: number;
    skippedLarge: string[];
    hitFileCap: boolean;
    hitByteCap: boolean;
    unreadable: string[];
  };
}


/**
 * How a finding is rendered, and why line 0 is printed as no line at all.
 *
 * The configuration rules emit at the sentinel `NO_LINE`, which is 0 because
 * a real plist line is 1-based and can never collide with it. Printing
 * `(line 0)` beside "this project's entitlements file declares no App Sandbox
 * entitlement" would invite a reader to open the file and look at a line that
 * does not exist; the fact has no position, and the rendering says so by
 * omission. The Swift findings carry a real 1-based line and print it.
 */
function renderFinding(f: LintFinding & { file?: string }): string[] {
  const where = f.line > 0 ? ` (line ${f.line})` : "";
  const lines = [`- **${f.rule}**${where} — ${f.file ? `${f.file}: ` : ""}${f.message}`, `  - Fix: ${f.fix}`];
  if (f.doc) lines.push(`  - Read: \`get_design_doc("${f.doc}")\``);
  return lines;
}

/**
 * The whole of `audit_apple_ui`: scan a directory, read its four
 * configuration surfaces, infer the platform, run both halves of this file's
 * rules, and return the result in both registers.
 *
 * **The findings are never routed through a `${rule}:${line}` deduper.** Three
 * sites in this codebase end that way — `lint.ts`, `genericVisualRules` and
 * `genericCopyRules` in `generic.ts` — which is correct for a scanner walking
 * a file and wrong for these: `appleConfigRules` deliberately emits one
 * finding per colorset and one per `UIRequiresFullScreen` spelling, all at the
 * constant line 0, and that filter takes five findings to two on a project
 * with three flat colorsets. Pinned by a test.
 *
 * `appleSwiftRules` is called once per file rather than once with all of them
 * so each finding can carry the path it came from. The function loops over its
 * `files` argument independently, so the findings are identical either way;
 * what differs is that this one knows which file produced which.
 */
export function appleReport(root: string): AuditReport & { structured: AppleStructured } {
  const scan = scanProject(root, APPLE_EXTENSIONS, APPLE_FILENAMES, APPLE_SKIP_DIRS);
  const files = scan.files.map((f) => ({ path: f.path, source: f.source }));

  const config = readAppleConfig(files);
  const swiftFiles = files.filter((f) => SWIFT_PATH.test(f.path));
  const platform = inferPlatform({ keys: config.keys, entitlements: config.entitlements, swiftSources: swiftFiles });

  const findings: Array<LintFinding & { file?: string }> = [
    ...appleConfigRules({ config, platform }),
  ];
  for (const file of swiftFiles) {
    for (const f of appleSwiftRules([file], platform)) findings.push({ ...f, file: file.path });
  }

  const structured: AppleStructured = {
    ...auditStructuredFrom({ findings, notVisible: APPLE_NOT_VISIBLE }),
    scan: {
      filesRead: scan.files.length,
      scannedBytes: scan.scannedBytes,
      skippedLarge: scan.skippedLarge,
      hitFileCap: scan.hitFileCap,
      hitByteCap: scan.hitByteCap,
      unreadable: scan.unreadable,
    },
  };

  const lines: string[] = ["# Apple UI audit", ""];
  lines.push(`\`${root}\` — ${scan.files.length} file(s), ${kb(scan.scannedBytes)} scanned.`, "");

  // Which surfaces were actually read, named. Without this a reader has no way
  // to tell "the entitlements file declares no sandbox entitlement" from "no
  // entitlements file was among the files read", and the second read as the
  // first is the failure this whole module is built around.
  // Named, but not all of them: a 400-file Swift target would otherwise print
  // 400 backticked paths into the middle of the report and bury the platform
  // line and the findings under them. The count is always exact, and
  // `structuredContent.scan.filesRead` carries the total independently.
  const SHOWN = 10;
  const surfaceLines: string[] = [];
  const name = (label: string, paths: string[]) => {
    if (!paths.length) return surfaceLines.push(`- ${label}: none read`);
    const shown = paths.slice(0, SHOWN).map((p) => `\`${p}\``).join(", ");
    const rest = paths.length > SHOWN ? `, …and ${paths.length - SHOWN} more` : "";
    return surfaceLines.push(`- ${label} (${paths.length}): ${shown}${rest}`);
  };
  name("Information property lists", config.surfaces.plist);
  name("Build settings (`INFOPLIST_KEY_*` only)", config.surfaces.buildSettings);
  name("Entitlements", config.surfaces.entitlements);
  name("Asset catalog colorsets", config.surfaces.assetCatalogs);
  name("Swift source", swiftFiles.map((f) => f.path));
  lines.push("**Surfaces read:**", "", ...surfaceLines, "");

  if (config.unparsed.length) {
    lines.push(
      `**Could not be parsed, and therefore not read at all:** ${config.unparsed.map((p) => `\`${p}\``).join(", ")}. `
      + `Nothing above is claimed about anything inside them, in either direction — a key that would have been declared there is absent from this audit's view of the project, not absent from the project.`,
      "",
    );
  }
  // A path this process may not open reads exactly like a directory holding
  // nothing to report unless the report says otherwise. `scan.unreadable`
  // carried these from the first version; the markdown did not, so a
  // permissions problem was invisible to anyone reading the prose.
  if (scan.unreadable.length) {
    lines.push(
      `**Could not be opened at all:** ${scan.unreadable.slice(0, 5).map((p) => `\`${p}\``).join(", ")}`
      + `${scan.unreadable.length > 5 ? `, …and ${scan.unreadable.length - 5} more` : ""}. `
      + `A directory this process may not list and a file it may not read are both stepped over and the audit continues, so anything under them was not audited. \`scan.unreadable\` carries all ${scan.unreadable.length}.`,
      "",
    );
  }
  if (scan.hitFileCap) lines.push(`**Capped:** the ${MAX_FILES}-file cap was reached, so later files were not read.`, "");
  if (scan.hitByteCap) lines.push(`**Capped:** the ${kb(MAX_TOTAL_BYTES)} total-bytes cap was reached, so later files were not read.`, "");
  if (scan.skippedLarge.length) {
    // Same shape as the two lines above it: at most five named, an exact count,
    // and an explicit tail rather than a full stop that reads like the end of
    // the list. `scan.skippedLarge` carries the rest.
    lines.push(
      `**Skipped ${scan.skippedLarge.length} file(s) over ${kb(MAX_FILE_BYTES)}**, unopened: ${scan.skippedLarge.slice(0, 5).map((p) => `\`${p}\``).join(", ")}`
      + `${scan.skippedLarge.length > 5 ? `, …and ${scan.skippedLarge.length - 5} more` : ""}.`,
      "",
    );
  }

  // The platform line. Every platform-scoped rule is silent on a null verdict,
  // so a reader who cannot see the verdict cannot tell a rule that found
  // nothing from a rule that was never allowed to run.
  lines.push(
    platform.platform
      ? `**Platform: ${platform.platform === "ios" ? "iOS" : "macOS"}**, inferred from ${platform.signals.length} signal(s): ${platform.signals.map((s) => `\`${s}\``).join(", ")}. Platform-scoped rules ran.`
      : `**Platform: not determined**${platform.conflicted ? " — the signals pointed both ways" : ""}. Signals seen: ${platform.signals.length ? platform.signals.map((s) => `\`${s}\``).join(", ") : "none"}. **Every platform-scoped rule stayed silent**, so their silence here is the gate rather than a result.`,
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

  lines.push(...renderNotVisibleSection(APPLE_PREAMBLE, APPLE_NOT_VISIBLE, APPLE_CLOSING));

  return { text: lines.join("\n"), structured };
}
