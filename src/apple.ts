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
//  3. **Nothing inferred inherits the licence.** `hardened-runtime-absent-macos`
//     is the case that proves it: the Hardened Runtime has no entitlement of
//     its own — it is a build capability, and only its *exception* entitlements
//     (`com.apple.security.cs.*`) appear in an entitlements file. So that rule
//     may not say the capability is off. It says what it read, names the
//     channel that needs it, and says the capability itself was not visible.
//
// Every platform-scoped rule checks `platform` first and returns nothing when
// it is null. `inferPlatform` returns null whenever the signals do not settle
// the question, and a macOS-only finding on a project that turns out to be iOS
// is not a near miss — it is a confident wrong answer about code that is
// correct for the platform it actually targets.

import type { LintFinding } from "./lint.js";
import type { ConfigRead, PlatformVerdict } from "./appleconfig.js";

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
  /** Prefix of the Hardened Runtime's exception entitlements. */
  hardenedRuntimeExceptionPrefix: "com.apple.security.cs.",
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
 * - **Whether the Hardened Runtime is enabled.** Not in any surface read here;
 *   see `hardened-runtime-absent-macos` below.
 * - **The distribution channel.** Nothing in a project's configuration states
 *   whether it ships through the Mac App Store, with Developer ID, or not at
 *   all. Both macOS rules below are conditional on a channel and say so; they
 *   do not know which one applies.
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
  // The platform check comes before either rule, once. A null verdict — the
  // signals were absent, or they conflicted — means neither runs. Firing a
  // macOS distribution rule at an iOS project is not a slightly wrong finding;
  // it is a finding about a requirement that does not exist for that project.
  if (platform.platform !== "macos") return out;

  if (!config.entitlements.has(ENTITLEMENT.appSandbox)) {
    push({
      severity: "info",
      rule: "sandbox-absent-macos",
      message: `No \`${ENTITLEMENT.appSandbox}\` entitlement was found in this macOS project's entitlements. Apple's sandbox requirement is scoped to one channel — "To distribute a macOS app through the Mac App Store, you must enable the App Sandbox capability" — and the Review Guidelines repeat it at 2.4.5(i) for apps distributed via the Mac App Store. For other distribution channels Apple states the requirement on neither of those pages, so this is a fact about the Mac App Store channel rather than a defect in the project.`,
      fix: `If this app is destined for the Mac App Store, add the App Sandbox capability in Xcode's Signing & Capabilities tab — Xcode writes \`${ENTITLEMENT.appSandbox}\` into the entitlements file for you, then add only the resource entitlements the app actually uses. If it ships outside the store, no change is needed on the strength of this finding.`,
      doc: "apple-shipping-readiness",
    });
  }

  // The Hardened Runtime is a build capability, not an entitlement, so its
  // presence cannot be read from anything this function receives. What *can* be
  // read is a `com.apple.security.cs.*` exception, which is meaningless unless
  // the capability is on and so is positive evidence of it — and the App
  // Sandbox entitlement, which points at the one channel Apple names as not
  // needing notarization at all: "you aren't required to notarize software that
  // you distribute through the Mac App Store". Both are reasons to stay silent.
  // Neither their absence nor this finding says the capability is off; the
  // message says so in as many words, because a reader who takes this for "the
  // Hardened Runtime is disabled" has been told something nothing here checked.
  //
  // Known miss, in the direction of silence: a Developer ID app that is *also*
  // sandboxed still needs notarization, and this rule says nothing about it.
  // That is the trade for not firing on every correctly configured Mac App
  // Store app, and silence is the safer side of it for an `info`.
  const hasHardenedRuntimeException = [...config.entitlements].some((e) => e.startsWith(ENTITLEMENT.hardenedRuntimeExceptionPrefix));
  if (!hasHardenedRuntimeException && !config.entitlements.has(ENTITLEMENT.appSandbox)) {
    push({
      severity: "info",
      rule: "hardened-runtime-absent-macos",
      message: `Nothing in this macOS project's entitlements indicates the Hardened Runtime: there is no \`${ENTITLEMENT.hardenedRuntimeExceptionPrefix}*\` exception entitlement, and no \`${ENTITLEMENT.appSandbox}\` pointing at the Mac App Store instead. The capability is a build setting, not an entitlement, so whether it is enabled is not visible in the surfaces read here — this is a note about the channel, not a reading of the target. It matters because "To upload a macOS app to be notarized, you must enable the Hardened Runtime capability", and Developer ID distribution requires notarization.`,
      fix: `If this app ships with Developer ID, confirm the Hardened Runtime capability is enabled on the app and command-line targets in Xcode's Signing & Capabilities tab, and add exception entitlements only where a specific capability needs one. If it ships through the Mac App Store, notarization does not apply and neither does this note.`,
      doc: "apple-shipping-readiness",
    });
  }

  return out;
}
