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
