import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  appleConfigRules, appleSwiftRules, appleReport, readAppleConfig,
  APPLE_NOT_VISIBLE, APPLE_PREAMBLE, APPLE_CLOSING,
} from "../dist/apple.js";
import { inferPlatform } from "../dist/appleconfig.js";
import { loadKnowledge, findDoc } from "../dist/knowledge.js";

type Config = Parameters<typeof appleConfigRules>[0]["config"];
type Verdict = Parameters<typeof appleConfigRules>[0]["platform"];

const EMPTY_CONFIG: Config = {
  keys: new Map(),
  entitlements: new Set<string>(),
  colorSets: [],
  surfaces: { plist: [], buildSettings: [], entitlements: [], assetCatalogs: [] },
  unparsed: [],
};

const base = { config: EMPTY_CONFIG, platform: { platform: null, signals: [], conflicted: false } as Verdict };

const withConfig = (patch: Partial<Config>) => ({ ...base, config: { ...base.config, ...patch } });
const ids = (f: ReturnType<typeof appleConfigRules>) => f.map((x) => x.rule).sort();

const MACOS: Verdict = { platform: "macos", signals: ["import AppKit in any Swift file"], conflicted: false };
const IOS: Verdict = { platform: "ios", signals: ["import UIKit in any Swift file"], conflicted: false };
const CONFLICTED: Verdict = { platform: null, signals: ["#if os(macOS) and #if os(iOS) both present"], conflicted: true };

describe("colorset-no-dark-variant", () => {
  it("reports a colorset with no dark variant", () => {
    const r = appleConfigRules(withConfig({ colorSets: [{ path: "Assets.xcassets/Brand.colorset/Contents.json", hasDarkVariant: false }] }));
    expect(ids(r)).toEqual(["colorset-no-dark-variant"]);
  });

  it("stays silent on a colorset that has one", () => {
    const r = appleConfigRules(withConfig({ colorSets: [{ path: "x/Ink.colorset/Contents.json", hasDarkVariant: true }] }));
    expect(r).toEqual([]);
  });

  it("names the colorset's path, so a project with several says which one", () => {
    const r = appleConfigRules(withConfig({
      colorSets: [
        { path: "Assets.xcassets/Brand.colorset/Contents.json", hasDarkVariant: false },
        { path: "Assets.xcassets/Ink.colorset/Contents.json", hasDarkVariant: true },
        { path: "Assets.xcassets/Accent.colorset/Contents.json", hasDarkVariant: false },
      ],
    }));
    expect(r).toHaveLength(2);
    expect(r[0].message).toContain("Assets.xcassets/Brand.colorset/Contents.json");
    expect(r[1].message).toContain("Assets.xcassets/Accent.colorset/Contents.json");
  });

  it("fires whatever the platform is — a custom colour needs both appearances on either", () => {
    const cfg = { colorSets: [{ path: "A.colorset/Contents.json", hasDarkVariant: false }] };
    expect(ids(appleConfigRules({ ...withConfig(cfg), platform: MACOS }))).toContain("colorset-no-dark-variant");
    expect(ids(appleConfigRules({ ...withConfig(cfg), platform: IOS }))).toContain("colorset-no-dark-variant");
  });
});

describe("uirequiresfullscreen-deprecated", () => {
  it("reports UIRequiresFullScreen, which Apple deprecated at 26.0", () => {
    const r = appleConfigRules(withConfig({ keys: new Map<string, string | boolean | string[]>([["UIRequiresFullScreen", true]]) }));
    expect(ids(r)).toContain("uirequiresfullscreen-deprecated");
  });

  // TN3192 spells it with a lowercase `s` inside a `codeVoice` node — the one
  // place a rule author copies from. A rule that matched only the canonical
  // spelling would be silent on a plist copied from there.
  it("reports the lowercase spelling too, and says it is not the key the system reads", () => {
    const r = appleConfigRules(withConfig({ keys: new Map<string, string | boolean | string[]>([["UIRequiresFullscreen", true]]) }));
    expect(ids(r)).toEqual(["uirequiresfullscreen-deprecated"]);
    expect(r[0].message).toContain("UIRequiresFullScreen");
  });

  it("reports each spelling separately when a project declares both", () => {
    const r = appleConfigRules(withConfig({
      keys: new Map<string, string | boolean | string[]>([["UIRequiresFullScreen", true], ["UIRequiresFullscreen", true]]),
    }));
    expect(r).toHaveLength(2);
  });

  // The key is a declaration, not a value judgement: `false` still puts the
  // deprecated key in the plist, and the deprecation summary says to remove it.
  it("fires on the key's presence, not on its value", () => {
    const r = appleConfigRules(withConfig({ keys: new Map<string, string | boolean | string[]>([["UIRequiresFullScreen", false]]) }));
    expect(ids(r)).toEqual(["uirequiresfullscreen-deprecated"]);
  });

  it("says nothing about a project that does not declare it", () => {
    expect(ids(appleConfigRules(withConfig({ keys: new Map<string, string | boolean | string[]>([["CFBundleDisplayName", "Receipts"]]) })))).toEqual([]);
  });
});

describe("sandbox-absent-macos", () => {
  it("says nothing about the sandbox when the platform is unknown", () => {
    const r = appleConfigRules(base);
    expect(ids(r)).not.toContain("sandbox-absent-macos");
  });

  it("names the sandbox only once the platform is known to be macOS", () => {
    const r = appleConfigRules({ ...base, platform: MACOS });
    expect(ids(r)).toContain("sandbox-absent-macos");
  });

  it("says nothing about the sandbox on iOS, where Apple states no such requirement", () => {
    expect(ids(appleConfigRules({ ...base, platform: IOS }))).not.toContain("sandbox-absent-macos");
  });

  it("stays silent when the signals conflicted, even though one of them was macOS", () => {
    expect(ids(appleConfigRules({ ...base, platform: CONFLICTED }))).not.toContain("sandbox-absent-macos");
  });

  it("stays silent when the entitlement is present", () => {
    const cfg = withConfig({ entitlements: new Set(["com.apple.security.app-sandbox"]) });
    expect(ids(appleConfigRules({ ...cfg, platform: MACOS }))).not.toContain("sandbox-absent-macos");
  });

  // Apple requires the sandbox for Mac App Store distribution and scopes the
  // requirement to that channel. The finding must name the channel rather than
  // assert the project is misconfigured.
  it("names the Mac App Store rather than asserting a defect", () => {
    const r = appleConfigRules({ ...base, platform: MACOS }).find((f) => f.rule === "sandbox-absent-macos")!;
    expect(r.severity).toBe("info");
    expect(r.message).toContain("Mac App Store");
    expect(r.message).toContain("rather than a defect");
    // The one "must" allowed is inside Apple's own channel-scoped sentence.
    // Every other imperative form would be this rule addressing the project.
    expect(r.message).not.toMatch(/\b(violat|misconfigur|non-compliant|you must add|must be sandboxed|required for every|every macOS app)/i);
    // And the remedy is conditional on a channel the audit cannot see.
    expect(r.fix).toMatch(/^If /);
  });

  // "We read the entitlements file and the key was not in it" and "there was no
  // entitlements file to read" are different facts with different next actions.
  // A message that reads the same for both leaves the reader unable to tell
  // whether the audit looked and found nothing, or never looked.
  it("names the entitlements file it read, when there was one", () => {
    const cfg = withConfig({
      surfaces: { plist: [], buildSettings: [], entitlements: ["Receipts/Receipts.entitlements"], assetCatalogs: [] },
    });
    const r = appleConfigRules({ ...cfg, platform: MACOS }).find((f) => f.rule === "sandbox-absent-macos")!;
    expect(r.message).toContain("Receipts/Receipts.entitlements");
    expect(r.message).not.toContain("No entitlements file was among the surfaces read");
  });

  it("says so instead when no entitlements file was read at all", () => {
    const r = appleConfigRules({ ...base, platform: MACOS }).find((f) => f.rule === "sandbox-absent-macos")!;
    expect(r.message).toContain("No entitlements file was among the surfaces read");
  });

  it("names every entitlements file when a project has more than one", () => {
    const cfg = withConfig({
      surfaces: { plist: [], buildSettings: [], entitlements: ["App/App.entitlements", "Helper/Helper.entitlements"], assetCatalogs: [] },
    });
    const r = appleConfigRules({ ...cfg, platform: MACOS }).find((f) => f.rule === "sandbox-absent-macos")!;
    expect(r.message).toContain("App/App.entitlements");
    expect(r.message).toContain("Helper/Helper.entitlements");
    expect(r.message).toContain("files read here");
  });
});

// The Hardened Runtime is a build capability (`ENABLE_HARDENED_RUNTIME`), not
// an entitlement, and it is in none of the four surfaces read here. Two further
// facts kill every substitute keyed on absence: Xcode "automatically adds the
// Hardened Runtime capability" to a new macOS app from a template, and the
// capability "doesn't affect the operation of most apps" — so "macOS, no
// `com.apple.security.cs.*` exception declared" is the shape of a correctly
// configured hardened app, not of a missing capability. A rule on that fires
// where it has no evidence and is silent where it has some. The fact goes to
// the disclosure list; these tests keep it out of `findings`.
describe("no rule claims the Hardened Runtime is absent", () => {
  it("emits nothing at all for a macOS project with no entitlements", () => {
    expect(appleConfigRules({ ...base, platform: MACOS }).filter((f) => /hardened/i.test(f.rule))).toEqual([]);
  });

  it("emits nothing for a macOS project that declares an exception entitlement either", () => {
    const cfg = withConfig({ entitlements: new Set(["com.apple.security.cs.allow-jit"]) });
    expect(appleConfigRules({ ...cfg, platform: MACOS }).filter((f) => /hardened/i.test(f.rule))).toEqual([]);
  });

  // The contradiction that proved the substitute wrong: `device.audio-input` is
  // itself a Hardened Runtime entitlement (Resource Access › Audio Input), so a
  // rule keying only on `cs.*` would have called this project's Hardened
  // Runtime invisible in the same breath as another rule naming it.
  it("never calls the Hardened Runtime invisible on a project that declares one of its Resource Access entitlements", () => {
    const cfg = withConfig({ entitlements: new Set(["com.apple.security.device.audio-input"]) });
    const r = appleConfigRules({ ...cfg, platform: MACOS });
    expect(ids(r)).toEqual(["microphone-entitlement-mismatch", "sandbox-absent-macos"]);
    expect(r.some((f) => /Nothing .* indicates the Hardened Runtime/i.test(f.message))).toBe(false);
  });

  // The words "Hardened Runtime" are allowed and correct where they name an
  // Xcode path — the microphone rule does exactly that. What no message may do
  // is state anything about whether the capability is *enabled*, in either
  // direction, since nothing here read it.
  it("makes no claim about whether the capability is enabled, in any message it does emit", () => {
    const claims = /\bhardened runtime\b[^.]{0,80}\b(is|isn't|is not|was|wasn't|not) (?:not )?(?:enabled|disabled|on|off|absent|missing|present)|\b(?:no|not) .{0,40}\bhardened runtime\b/i;
    const everyMessage = [
      ...appleConfigRules({ ...base, platform: MACOS }),
      ...appleConfigRules({ ...withConfig({ entitlements: new Set(["com.apple.security.device.audio-input"]) }), platform: MACOS }),
      ...appleConfigRules({ ...withConfig({ entitlements: new Set(["com.apple.security.cs.allow-jit"]) }), platform: MACOS }),
    ];
    expect(everyMessage.length).toBeGreaterThan(0);
    for (const f of everyMessage) {
      expect(claims.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });
});

describe("microphone-entitlement-mismatch", () => {
  it("reports one microphone entitlement without its twin", () => {
    const r = appleConfigRules(withConfig({ entitlements: new Set(["com.apple.security.device.microphone"]) }));
    expect(ids(r)).toContain("microphone-entitlement-mismatch");
  });

  it("reports the Hardened Runtime identifier without its App Sandbox twin", () => {
    const r = appleConfigRules(withConfig({ entitlements: new Set(["com.apple.security.device.audio-input"]) }));
    expect(ids(r)).toContain("microphone-entitlement-mismatch");
  });

  it("stays silent when both are declared", () => {
    const r = appleConfigRules(withConfig({
      entitlements: new Set(["com.apple.security.device.microphone", "com.apple.security.device.audio-input"]),
    }));
    expect(ids(r)).not.toContain("microphone-entitlement-mismatch");
  });

  it("stays silent when neither is declared", () => {
    expect(ids(appleConfigRules(base))).not.toContain("microphone-entitlement-mismatch");
  });

  it("names the identifier that is missing, not just the one that is there", () => {
    const r = appleConfigRules(withConfig({ entitlements: new Set(["com.apple.security.device.microphone"]) }))
      .find((f) => f.rule === "microphone-entitlement-mismatch")!;
    expect(r.message).toContain("com.apple.security.device.microphone");
    expect(r.fix).toContain("com.apple.security.device.audio-input");
  });

  it("fires whatever the platform verdict is — the pair is not platform-scoped here", () => {
    const cfg = withConfig({ entitlements: new Set(["com.apple.security.device.audio-input"]) });
    expect(ids(appleConfigRules({ ...cfg, platform: MACOS }))).toContain("microphone-entitlement-mismatch");
    expect(ids(appleConfigRules({ ...cfg, platform: CONFLICTED }))).toContain("microphone-entitlement-mismatch");
  });
});

describe("the rules Apple's own documentation says must not exist", () => {
  // The single most tempting rule in this package. From the plist alone it is a
  // false-positive generator: Xcode writes purpose strings into
  // `INFOPLIST_KEY_*` build settings and localised values into
  // `InfoPlist.xcstrings`, so a key absent from `Info.plist` is not a purpose
  // string the project lacks. From source it is a lower bound, because
  // third-party SDKs create the obligation too. It belongs in the disclosure
  // list, not in `findings`.
  it("writes no missing-purpose-string rule", () => {
    const r = appleConfigRules({
      ...withConfig({
        keys: new Map<string, string | boolean | string[]>([["CFBundleDisplayName", "Receipts"]]),
        entitlements: new Set(["com.apple.security.device.microphone", "com.apple.security.device.audio-input"]),
        surfaces: { plist: ["Info.plist"], buildSettings: [], entitlements: ["App.entitlements"], assetCatalogs: [] },
      }),
      platform: IOS,
    });
    expect(r).toEqual([]);
  });

  // The HIG explicitly permits a single-orientation app, so a declared
  // orientation set is not a finding however narrow it is.
  it("writes no orientation rule", () => {
    const r = appleConfigRules(withConfig({
      keys: new Map<string, string | boolean | string[]>([["UISupportedInterfaceOrientations", ["UIInterfaceOrientationPortrait"]]]),
    }));
    expect(r).toEqual([]);
  });
});

describe("the shape every finding leaves in", () => {
  const everything = [
    ...appleConfigRules({
      ...withConfig({
        keys: new Map<string, string | boolean | string[]>([["UIRequiresFullScreen", true]]),
        colorSets: [{ path: "Assets.xcassets/Brand.colorset/Contents.json", hasDarkVariant: false }],
        entitlements: new Set(["com.apple.security.device.microphone"]),
      }),
      platform: MACOS,
    }),
  ];

  it("fires every rule in the table at once, so the checks below are not vacuous", () => {
    expect(ids(everything)).toEqual([
      "colorset-no-dark-variant",
      "microphone-entitlement-mismatch",
      "sandbox-absent-macos",
      "uirequiresfullscreen-deprecated",
    ]);
  });

  it("gives every finding a message, a fix and a doc", () => {
    for (const f of everything) {
      expect(f.message, f.rule).toBeTruthy();
      expect(f.fix, f.rule).toBeTruthy();
      expect(f.doc, f.rule).toBeTruthy();
    }
  });

  // `LintFinding.line` is required, and configuration findings have no line to
  // give: a missing entitlement is a fact about a file's absence of a key, not
  // about a position in it. 0 is the agreed "no line", never a real line 1.
  it("reports line 0, because a configuration fact has no line", () => {
    for (const f of everything) expect(f.line, f.rule).toBe(0);
  });

  it("uses only the three declared severities", () => {
    for (const f of everything) expect(["error", "warning", "info"]).toContain(f.severity);
  });

  // `designLint` (src/lint.ts) and `genericVisualRules` (src/generic.ts) both
  // end by keeping one finding per `rule`+`line` pair. That is correct for a
  // scanner walking a file and wrong for these rules, which emit N findings per
  // rule at the constant line 0 — one per colorset, one per spelling. Routing
  // these through that filter silently collapses them and tells the reader
  // about one colorset out of three. This pins the multi-instance contract so
  // the hazard is a visible fact of the module rather than a surprise in Task 5.
  it("emits several findings of one rule at the same line, which a rule+line deduper would eat", () => {
    const many = appleConfigRules(withConfig({
      colorSets: [
        { path: "A.colorset/Contents.json", hasDarkVariant: false },
        { path: "B.colorset/Contents.json", hasDarkVariant: false },
        { path: "C.colorset/Contents.json", hasDarkVariant: false },
      ],
      keys: new Map<string, string | boolean | string[]>([["UIRequiresFullScreen", true], ["UIRequiresFullscreen", true]]),
    }));
    expect(many).toHaveLength(5);
    expect(new Set(many.map((f) => f.rule)).size).toBe(2);
    expect(new Set(many.map((f) => f.line))).toEqual(new Set([0]));

    // The house idiom, applied here, would lose three of the five.
    const seen = new Set<string>();
    const deduped = many.filter((f) => {
      const key = `${f.rule}:${f.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    expect(deduped).toHaveLength(2);

    // Deduplicating by message is safe: every finding here is distinct.
    expect(new Set(many.map((f) => f.message)).size).toBe(5);
  });

  // The absence licence is bounded: these rules may say a key or an entitlement
  // is not declared, because a plist either carries it or does not. They may
  // not say Apple publishes no requirement — that is a claim about every Apple
  // surface at once, and one fetch has killed it five times in this project.
  it("never states an absence in the unbounded form", () => {
    const forbidden = /\bapple (?:publishes|states|specifies|documents|has|assigns|requires) no\b|\bapple is silent\b|\bapple does not (?:publish|state|specify|document)\b/i;
    for (const f of everything) {
      expect(forbidden.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });

  // Nothing here has read the built product, the entitlements the signed binary
  // actually carries, or the channel this project ships through.
  it("never claims a shipped or signed outcome", () => {
    const forbidden = /\b(will be rejected|app review will|your app is not sandboxed|fails notarization|will fail notarization|guarantee)\b/i;
    for (const f of everything) {
      expect(forbidden.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });
});

// Both files are individually right about `UIRequiresFullScreen` — the platform
// verdict rests only on the capital-`S` key the system actually reads, while
// the rule matches the lowercase form too so a plist copied from TN3192's
// `codeVoice` node is not passed over. The divergence has an observable
// consequence on one input, so it is pinned here rather than described in prose.
describe("the spelling divergence between inferPlatform and the rules", () => {
  const swiftSources: Array<{ path: string; source: string }> = [];
  const keys = (k: string) => new Map<string, string | boolean | string[]>([[k, true], ["LSMinimumSystemVersion", "14.0"]]);

  it("lets the lowercase spelling through to a macOS verdict, because the platform reader ignores it", () => {
    const v = inferPlatform({ keys: keys("UIRequiresFullscreen"), entitlements: new Set(), swiftSources });
    expect(v.platform).toBe("macos");
    expect(v.conflicted).toBe(false);
    // …and the rules still report the key, so nothing is lost by that silence.
    const r = appleConfigRules({ ...withConfig({ keys: keys("UIRequiresFullscreen") }), platform: v });
    expect(ids(r)).toEqual(["sandbox-absent-macos", "uirequiresfullscreen-deprecated"]);
  });

  it("conflicts on the canonical spelling, which the platform reader does count as an iOS signal", () => {
    const v = inferPlatform({ keys: keys("UIRequiresFullScreen"), entitlements: new Set(), swiftSources });
    expect(v.platform).toBeNull();
    expect(v.conflicted).toBe(true);
    // The same project, spelled correctly, gets no macOS-scoped finding — the
    // platform gate holds, and only the platform-agnostic rule fires.
    const r = appleConfigRules({ ...withConfig({ keys: keys("UIRequiresFullScreen") }), platform: v });
    expect(ids(r)).toEqual(["uirequiresfullscreen-deprecated"]);
  });
});

// ── the Swift rules ─────────────────────────────────────────────────────────
//
// Everything below states a presence. There is deliberately no test asserting
// that a rule fires on "a control with no accessibility label" or "a file that
// never respects Reduce Motion", because a line-based reader cannot see either:
// a modifier on a parent covers its children, and the check may live in another
// file entirely. What a line can prove is what it itself writes.

const IOS_SWIFT: Verdict = { platform: "ios", signals: ["import UIKit in any Swift file"], conflicted: false };
const swift = (source: string, platform: Verdict = IOS_SWIFT, path = "V.swift") =>
  appleSwiftRules([{ path, source }], platform);
const swiftIds = (source: string, platform: Verdict = IOS_SWIFT, path = "V.swift") =>
  swift(source, platform, path).map((f) => f.rule);

describe("fixed-font-size", () => {
  it("reports a fixed point size on iOS", () => {
    expect(swiftIds(`Text("Hi").font(.system(size: 17))`)).toContain("fixed-font-size");
  });

  it("stays silent on macOS, which has no Dynamic Type", () => {
    expect(swiftIds(`Text("Hi").font(.system(size: 17))`, MACOS)).not.toContain("fixed-font-size");
  });

  it("stays silent when the platform is unknown", () => {
    expect(swiftIds(`Text("Hi").font(.system(size: 17))`, { platform: null, signals: [], conflicted: false })).not.toContain("fixed-font-size");
  });

  it("stays silent when the signals conflicted, even though one of them was iOS", () => {
    expect(swiftIds(`Text("Hi").font(.system(size: 17))`, CONFLICTED)).not.toContain("fixed-font-size");
  });

  it("leaves a text style alone", () => {
    expect(swiftIds(`Text("Hi").font(.body)`)).toEqual([]);
  });

  it("reports the size it found, and reports a fractional one too", () => {
    expect(swift(`Text("Hi").font(.system(size: 17.5, weight: .semibold))`)[0].message).toContain("17.5");
  });

  it("names iOS as the reason it spoke, so a reader can see the gate", () => {
    expect(swift(`Text("Hi").font(.system(size: 17))`)[0].message).toMatch(/macOS doesn't support Dynamic Type/);
  });
});

describe("navigationview-deprecated", () => {
  it("reports NavigationView on any platform", () => {
    expect(swiftIds(`NavigationView { List { } }`, { platform: null, signals: [], conflicted: false })).toContain("navigationview-deprecated");
    expect(swiftIds(`NavigationView { List { } }`, MACOS)).toContain("navigationview-deprecated");
  });

  it("leaves NavigationStack alone", () => {
    expect(swiftIds(`NavigationStack { List { } }`, { platform: null, signals: [], conflicted: false })).toEqual([]);
  });

  it("leaves NavigationSplitView and the view modifier alone", () => {
    expect(swiftIds(`NavigationSplitView { S() } detail: { D() }.navigationViewStyle(.stack)`)).toEqual([]);
  });

  it("quotes the deprecation summary Apple ships in the page's JSON metadata", () => {
    const f = swift(`NavigationView { List { } }`)[0];
    expect(f.message).toContain("27.0");
    expect(f.fix).toContain("NavigationStack");
    expect(f.fix).toContain("NavigationSplitView");
  });
});

describe("hardcoded-color-literal", () => {
  it("reports the SwiftUI component initialiser", () => {
    expect(swiftIds(`let brand = Color(red: 0.1, green: 0.2, blue: 0.3)`)).toEqual(["hardcoded-color-literal"]);
  });

  it("reports the UIKit and AppKit initialisers, and Xcode's colour literal", () => {
    expect(swiftIds(`let a = UIColor(red: 1, green: 0, blue: 0, alpha: 1)`)).toEqual(["hardcoded-color-literal"]);
    expect(swiftIds(`let b = NSColor(red: 1, green: 0, blue: 0, alpha: 1)`)).toEqual(["hardcoded-color-literal"]);
    expect(swiftIds(`let c = #colorLiteral(red: 1, green: 0, blue: 0, alpha: 1)`)).toEqual(["hardcoded-color-literal"]);
  });

  it("reports `UIColor(red:` once, not twice — the name ends in `Color(`", () => {
    expect(swiftIds(`let a = UIColor(red: 1, green: 0, blue: 0, alpha: 1)`)).toHaveLength(1);
  });

  it("leaves an asset-catalog colour and a semantic colour alone", () => {
    expect(swiftIds(`Text("Hi").foregroundStyle(Color("Brand")).background(Color.secondary)`)).toEqual([]);
    expect(swiftIds(`view.backgroundColor = .systemBackground`)).toEqual([]);
  });

  it("names the initialiser it matched, so the reader knows which one fired", () => {
    expect(swift(`let a = #colorLiteral(red: 1, green: 0, blue: 0, alpha: 1)`)[0].message).toContain("#colorLiteral");
  });

  // `COLOR_LITERAL` allows `\s` between `Color(`, `red` and `:`, and `\s`
  // matches a newline — so the Xcode/SwiftFormat idiom of wrapping a long
  // argument list used to put a raw newline inside the quoted text. The
  // markdown bullet broke at it and `findings[].message` carried it on the
  // wire.
  it.each([
    ["Color", "SwiftUI"],
    ["UIColor", "UIKit"],
    ["NSColor", "AppKit"],
  ])("quotes a wrapped %s( initialiser on one line, with no newline in the message", (type) => {
    const found = swift(`let brand = ${type}(\n    red: 0.10,\n    green: 0.20,\n    blue: 0.30\n)\n`);
    expect(found).toHaveLength(1);
    expect(found[0].message).not.toMatch(/[\n\r]/);
    expect(found[0].message).toContain(`\`${type}(red:…)\``);
    // The line the match starts on, unchanged by the collapsing.
    expect(found[0].line).toBe(1);
  });

  it("renders a wrapped initialiser as one markdown bullet", () => {
    const root = project({ "Sources/V.swift": `import SwiftUI\nlet brand = Color(\n    red: 0.10,\n    green: 0.20,\n    blue: 0.30\n)\n` });
    const r = appleReport(root);
    const bullet = r.text.split("\n").find((l) => l.includes("hardcoded-color-literal"))!;
    expect(bullet).toContain("`Color(red:…)` starts on this line.");
    // The whole sentence is on the bullet's own line rather than spilling into
    // a sibling paragraph after it.
    expect(bullet).toContain("resolving one from a resource");
    expect(r.structured.findings[0].message).not.toMatch(/[\n\r]/);
  });

  it("still quotes an unwrapped initialiser exactly as it always did", () => {
    expect(swift(`let a = Color(red: 0.1, green: 0.2, blue: 0.3)`)[0].message).toContain("`Color(red:…)`");
  });
});

describe("symbol-as-only-button-label", () => {
  it("reports a lone system symbol as a button's label", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: "slider.vertical.3") }`)).toContain("symbol-as-only-button-label");
  });

  it("leaves a button with a text label alone", () => {
    expect(swiftIds(`Button(action: go) { Text("Edit Budgets") }`)).toEqual([]);
  });

  it("leaves a Label alone, whose title still speaks under .iconOnly", () => {
    expect(swiftIds(`Button(action: go) { Label("Edit Budgets", systemImage: "slider.vertical.3").labelStyle(.iconOnly) }`)).toEqual([]);
  });

  it("reads the trailing `label:` closure, not the action closure", () => {
    expect(swiftIds(`Button { go() } label: { Image(systemName: "gear") }`)).toContain("symbol-as-only-button-label");
    expect(swiftIds(`Button { Image(systemName: "gear").renderingMode(.template) } label: { Text("Settings") }`)).toEqual([]);
  });

  it("still fires when the symbol carries modifiers — it is still the whole label", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear").font(.title2).foregroundStyle(.tint) }`))
      .toContain("symbol-as-only-button-label");
  });

  it("stays quiet when the label holds more than the symbol", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear"); Text("Settings") }`)).toEqual([]);
    expect(swiftIds(`Button(action: go) { HStack { Image(systemName: "gear") } }`)).toEqual([]);
  });

  it("stays quiet when the symbol name is not a literal this file can read", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: symbolName) }`)).toEqual([]);
  });

  // The rule's sentence is that the spoken name is *derived* rather than
  // written. A modifier on the same line that writes it, or that takes the
  // element out of VoiceOver, falsifies that sentence — and it is a presence in
  // the characters the rule already has, not a parent it cannot see.
  it("stays quiet when the symbol carries a written label, a value, or is hidden", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear").accessibilityLabel("Settings") }`)).toEqual([]);
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear").accessibilityHidden(true) }`)).toEqual([]);
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear").accessibilityValue("3") }`)).toEqual([]);
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear").font(.title2).accessibilityLabel("Settings") }`)).toEqual([]);
  });

  it("stays quiet when the label is written on the Button rather than the symbol", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear") }.accessibilityLabel("Settings")`)).toEqual([]);
    expect(swiftIds(`Button { go() } label: { Image(systemName: "gear") }.accessibilityLabel("Settings")`)).toEqual([]);
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear") }.padding(8).accessibilityLabel("Settings")`)).toEqual([]);
  });

  // Combining the children of a button whose only child is the symbol still
  // yields the symbol's derived label, so this one changes nothing.
  it("still fires under accessibilityElement(children:), which writes no name", () => {
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear") }.accessibilityElement(children: .combine)`))
      .toContain("symbol-as-only-button-label");
  });

  // Taking the rule's own advice has to end the finding. Before the override
  // check, the fix advised `.accessibilityLabel(…)` and the identical finding
  // came straight back — a loop the reader could not exit.
  it("goes quiet once the reader applies the fix it printed", () => {
    const before = `Button(action: go) { Image(systemName: "gear") }`;
    expect(swiftIds(before)).toContain("symbol-as-only-button-label");
    const advice = swift(before)[0].fix;
    expect(advice).toContain(".accessibilityLabel");
    expect(swiftIds(`Button(action: go) { Image(systemName: "gear").accessibilityLabel("Settings") }`)).toEqual([]);
  });

  it("is info, and names the risk rather than asserting a defect", () => {
    const f = swift(`Button(action: go) { Image(systemName: "slider.vertical.3") }`)[0];
    expect(f.severity).toBe("info");
    expect(f.message).toContain("slider.vertical.3");
    expect(f.message).toMatch(/derived from the SF Symbol/);
    // Apple documents automatic labels, so the message may not say there is none.
    expect(f.message).not.toMatch(/\b(no|missing|without an?) accessibility label\b|\bunlabell?ed\b/i);
  });
});

describe("what the Swift rules read, and what they refuse to read", () => {
  it("never fires on commented-out code", () => {
    expect(swiftIds(`// Text("Hi").font(.system(size: 17))`)).toEqual([]);
    expect(swiftIds(`/* NavigationView { } */`)).toEqual([]);
    expect(swiftIds(`let a = 1 // #colorLiteral(red: 1, green: 0, blue: 0, alpha: 1)`)).toEqual([]);
  });

  // Swift block comments nest; a flat scanner stops at the first `*/` and lets
  // the rest of the commented-out region back in as live code.
  it("honours Swift's nested block comments", () => {
    expect(swiftIds(`/* outer /* inner */ NavigationView { } */`)).toEqual([]);
  });

  // The masker's extension gate is `.swift`, case-insensitively. A path that
  // does not end there is never masked, so this module does not read it at all
  // rather than reading it unmasked.
  it("reads only paths that end in .swift, in any case", () => {
    expect(swiftIds(`NavigationView { }`, IOS_SWIFT, "V.SWIFT")).toEqual(["navigationview-deprecated"]);
    expect(swiftIds(`NavigationView { }`, IOS_SWIFT, "V.swift.txt")).toEqual([]);
    expect(swiftIds(`NavigationView { }`, IOS_SWIFT, "Package.resolved")).toEqual([]);
  });

  it("carries a real 1-based line, never the configuration rules' line 0", () => {
    const src = ["import SwiftUI", "", "NavigationView {", "  Text(\"Hi\").font(.system(size: 17))", "}"].join("\n");
    const f = swift(src);
    expect(f.find((x) => x.rule === "navigationview-deprecated")!.line).toBe(3);
    expect(f.find((x) => x.rule === "fixed-font-size")!.line).toBe(4);
    expect(f.every((x) => x.line > 0)).toBe(true);
  });

  it("emits one finding per occurrence, at its own line", () => {
    const src = ["NavigationView {", "  NavigationView { }", "}"].join("\n");
    const f = swift(src);
    expect(f).toHaveLength(2);
    expect(f.map((x) => x.line)).toEqual([1, 2]);
    // Distinct lines, so the codebase's `rule:line` dedupe idiom is safe here —
    // unlike the configuration rules above, which all sit at line 0.
    expect(new Set(f.map((x) => `${x.rule}:${x.line}`)).size).toBe(2);
  });

  it("walks every file it is handed, and says nothing about an empty list", () => {
    const many = appleSwiftRules([
      { path: "A.swift", source: `NavigationView { }` },
      { path: "B.swift", source: `Text("Hi").font(.system(size: 12))` },
    ], IOS_SWIFT);
    expect(many.map((f) => f.rule).sort()).toEqual(["fixed-font-size", "navigationview-deprecated"]);
    expect(appleSwiftRules([], IOS_SWIFT)).toEqual([]);
  });

  // `maskComments` mishandles nested Swift string interpolation: the inner
  // literal's opening quote closes what its per-line tracker believes is the
  // outer string, exposing the interpolated text as live code. It is disclosed
  // in `src/scan.ts` and pinned there; this records the consequence a rule here
  // sees, so a silent rule on such a file is recognised rather than debugged.
  it("meets the known string-interpolation gap in the masker rather than working around it", () => {
    const src = `let s = "a\\(f("open /*")) still"\nNavigationView { }\n/* a real comment */`;
    expect(swiftIds(src)).toEqual([]);
    // The same file without the interpolation reports the container it contains.
    expect(swiftIds(`let s = "plain"\nNavigationView { }\n/* a real comment */`)).toEqual(["navigationview-deprecated"]);
  });
});

describe("the shape every Swift finding leaves in", () => {
  const FIXTURE = [
    `import UIKit`,
    `NavigationView {`,
    `  Text("Hi").font(.system(size: 17))`,
    `  Button(action: go) { Image(systemName: "slider.vertical.3") }`,
    `  Rectangle().fill(Color(red: 0.1, green: 0.2, blue: 0.3))`,
    `}`,
  ].join("\n");
  const everything = swift(FIXTURE);

  it("fires every rule in the table at once, so the checks below are not vacuous", () => {
    expect([...new Set(everything.map((f) => f.rule))].sort()).toEqual([
      "fixed-font-size",
      "hardcoded-color-literal",
      "navigationview-deprecated",
      "symbol-as-only-button-label",
    ]);
  });

  it("gives every finding a message, a fix and a doc", () => {
    for (const f of everything) {
      expect(f.message, f.rule).toBeTruthy();
      expect(f.fix, f.rule).toBeTruthy();
      expect(f.doc, f.rule).toBeTruthy();
    }
  });

  it("uses only the three declared severities, and the two the brief assigns", () => {
    for (const f of everything) expect(["error", "warning", "info"]).toContain(f.severity);
    const sev = Object.fromEntries(everything.map((f) => [f.rule, f.severity]));
    expect(sev).toEqual({
      "fixed-font-size": "warning",
      "navigationview-deprecated": "warning",
      "hardcoded-color-literal": "info",
      "symbol-as-only-button-label": "info",
    });
  });

  it("returns findings in line order", () => {
    expect(everything.map((f) => f.line)).toEqual([...everything.map((f) => f.line)].sort((a, b) => a - b));
  });

  // The licence these rules do not have. A modifier on a parent covers its
  // children and a check may live in another file, so no message here may claim
  // that something is absent from a control, a view, a file or a project.
  it("claims no absence a line cannot prove", () => {
    const forbidden =
      /\b(?:no|without an?|missing|lacks?|lacking) (?:an? )?accessibility ?label\b|\bunlabell?ed\b|\bnever (?:respects?|checks?|supports?|handles?|calls?)\b|\bdoes not (?:respect|check|support|handle)\b|\bthis (?:file|project|view|app) (?:has|declares|contains|does) no\b/i;
    for (const f of everything) {
      expect(forbidden.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });

  it("never states an absence in the unbounded form", () => {
    const forbidden = /\bapple (?:publishes|states|specifies|documents|has|assigns|requires) no\b|\bapple is silent\b|\bapple does not (?:publish|state|specify|document)\b/i;
    for (const f of everything) {
      expect(forbidden.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });

  it("never claims a shipped, signed or reviewed outcome", () => {
    const forbidden = /\b(will be rejected|app review will|fails notarization|will fail notarization|guarantee|will crash)\b/i;
    for (const f of everything) {
      expect(forbidden.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });

  // A shipped sentence here once asserted that `NavigationView`'s deprecation is
  // "invisible in the rendered documentation page's prose" and lives only in the
  // JSON. The rendered page carries an H1 reading "NavigationView Deprecated",
  // a seven-row Availability strip and a deprecated aside — the claim was false,
  // and it was false because the deprecation was fetched and the claim about how
  // it renders was not. Provenance ("read from `metadata.platforms[]`") is true
  // and stays; a claim about what a page shows a human is not this module's to
  // make from a JSON fetch.
  it("describes where it read a fact, never how Apple's page renders it", () => {
    const forbidden = /\binvisible in the rendered\b|\bdoes not appear in the (?:rendered|page's) (?:page|prose)\b|\blives only in\b|\bonly in the (?:page's )?JSON\b|\bnot (?:shown|visible) (?:in|on) the (?:rendered )?page\b/i;
    for (const f of everything) {
      expect(forbidden.test(`${f.message} ${f.fix}`), `${f.rule}: ${f.message} ${f.fix}`).toBe(false);
    }
  });

  // `deprecated: false` on every row: the deprecation lands *at* 27.0, and
  // nothing this module reads is the project's deployment target.
  it("does not present a future deprecation as one already in force", () => {
    const f = everything.find((x) => x.rule === "navigationview-deprecated")!;
    expect(f.message).toContain("deprecated: false");
    expect(f.message).toMatch(/deployment target/i);
  });

  // §3.2 of the sourcing note: `Mac Catalyst` and `macOS` are distinct strings
  // in Apple's availability data, and a matcher built on the substring `Mac`
  // marks every iOS-only symbol as macOS-available while looking clean. No rule
  // here reads a platform *string* at all — the gate is the typed verdict — so
  // the failure this pins is the one that would reintroduce string matching:
  // a verdict of `macos` must never satisfy an iOS-scoped rule, and no verdict
  // outside the two the type admits may reach one.
  it("gates on the typed verdict, never on a platform substring", () => {
    const line = `Text("Hi").font(.system(size: 17))`;
    expect(swiftIds(line, IOS_SWIFT)).toContain("fixed-font-size");
    expect(swiftIds(line, MACOS)).not.toContain("fixed-font-size");
    expect(swiftIds(line, { platform: null, signals: ["Mac Catalyst"], conflicted: false })).not.toContain("fixed-font-size");
  });
});

// Carried over from the generic-design and SEO packages, where a rule cited a
// real document that never made its claim. Resolution alone is not enough: the
// cited document has to actually carry the sentence the reader was just told.
describe("every doc a rule cites resolves and makes the rule's claim", () => {
  const docs = loadKnowledge(join(__dirname, "..", "knowledge"));

  const findings = [
    ...appleConfigRules({
      ...withConfig({
        keys: new Map<string, string | boolean | string[]>([["UIRequiresFullScreen", true]]),
        colorSets: [{ path: "Assets.xcassets/Brand.colorset/Contents.json", hasDarkVariant: false }],
        entitlements: new Set(["com.apple.security.device.microphone"]),
      }),
      platform: MACOS,
    }),
    ...swift([
      `import UIKit`,
      `NavigationView {`,
      `  Text("Hi").font(.system(size: 17))`,
      `  Button(action: go) { Image(systemName: "slider.vertical.3") }`,
      `  Rectangle().fill(Color(red: 0.1, green: 0.2, blue: 0.3))`,
      `}`,
    ].join("\n")),
  ];

  it("loads the knowledge base, so the checks below are not vacuous", () => {
    expect(docs.length).toBeGreaterThan(0);
  });

  // Each phrase is the sentence in the cited document that carries the rule's
  // claim, not a word that document merely happens to contain. A loose pattern
  // defeats the whole check: /sandbox/i matches most of
  // `apple-shipping-readiness`, so every rule here could have been re-pointed
  // at it and this test would still pass.
  const CLAIM_VOCABULARY: Record<string, RegExp> = {
    "colorset-no-dark-variant": /make sure to supply light and dark variants/i,
    "uirequiresfullscreen-deprecated": /remove `UIRequiresFullScreen` from your information property list/i,
    "sandbox-absent-macos": /To distribute a macOS app through the Mac App Store, you must enable the App Sandbox capability/i,
    "microphone-entitlement-mismatch": /Same checkbox label, two identifiers/i,
    // The Swift rules. Each pattern is the clause in the cited document that
    // carries the claim the finding makes, not a word the document happens to
    // contain — /Dynamic Type/i would match half of `apple-accessibility`.
    "fixed-font-size": /versus `\.font\(\.system\(size: 17\)\)`, which takes a bare `CGFloat` and no style to scale against/i,
    "navigationview-deprecated": /`NavigationView` is deprecated at 27\.0 on every platform Apple lists it for/i,
    "hardcoded-color-literal": /What source \*can\* show is a hardcoded literal — `Color\(red:green:blue:\)`, a hex initialiser — which is a legitimate finding/i,
    "symbol-as-only-button-label": /If you're relying on a symbol's default label, it's important to check that it accurately describes your interface/i,
  };

  it("fires every rule in the table, so no rule escapes the citation check", () => {
    const fired = new Set(findings.map((f) => f.rule));
    expect(Object.keys(CLAIM_VOCABULARY).filter((r) => !fired.has(r))).toEqual([]);
  });

  it("emits no rule the vocabulary table does not cover", () => {
    const undeclared = [...new Set(findings.map((f) => f.rule))].filter((r) => !(r in CLAIM_VOCABULARY));
    expect(undeclared).toEqual([]);
  });

  it("resolves every cited id", () => {
    const dangling = findings.filter((f) => !f.doc || !findDoc(docs, f.doc)).map((f) => `${f.rule} → ${f.doc}`);
    expect(dangling).toEqual([]);
  });

  it.each(Object.entries(CLAIM_VOCABULARY))("%s cites a document that actually makes the claim", (rule, vocabulary) => {
    const cited = findings.find((f) => f.rule === rule)?.doc;
    expect(cited, `${rule} emitted no doc id`).toBeTruthy();
    const doc = findDoc(docs, cited!);
    expect(doc, `${rule} → ${cited} does not resolve`).toBeTruthy();
    expect(vocabulary.test(doc!.body), `${cited} never carries ${vocabulary}`).toBe(true);
  });
});

// ── the report, the registers, and the disclosure list ──────────────────────
//
// Every sentence in `APPLE_NOT_VISIBLE` was written after running `appleReport`
// on a directory built to demonstrate it, and each of those runs is kept below.
// The order is the method rather than a preference: all four earlier tasks in
// this package wrote at least one sentence off the code instead of off a run,
// and a reviewer running the case found the discrepancy every time. A sentence
// with no test under it does not ship — `every notVisible entry has a
// demonstration below` fails the suite until one exists.

const FIXTURES = join(__dirname, "fixtures", "apple");

// `chmod 000` is a no-op for root, so the one test that depends on a path this
// process may not open is skipped there rather than left to fail. Same guard,
// same reason, as the two identical-technique tests in tests/project.test.ts.
const asRoot = typeof process.getuid === "function" && process.getuid() === 0;
const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway Xcode-shaped directory, written from a path → contents map. */
function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "saglitz-apple-"));
  temps.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

const plist = (inner: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n${inner}\n</dict>\n</plist>\n`;

/** Every rule id the run produced, in report order, with its line. */
const ruleLines = (root: string) =>
  appleReport(root).structured.findings.map((f) => `${f.rule}@${f.line}`);
const rules = (root: string) => appleReport(root).structured.findings.map((f) => f.rule);

/** The `- ` bullets of the rendered "Not visible to this audit" section. */
function renderedBullets(markdown: string): string[] {
  const heading = markdown.indexOf("## Not visible to this audit");
  if (heading === -1) return [];
  const lines = markdown.slice(heading).split("\n");
  const first = lines.findIndex((l) => l.startsWith("- "));
  if (first === -1) return [];
  const bullets: string[] = [];
  let current: string | null = null;
  for (let i = first; i < lines.length; i++) {
    if (lines[i] === "") break;
    if (lines[i].startsWith("- ")) {
      if (current !== null) bullets.push(current);
      current = lines[i].slice(2);
    } else if (current !== null) current += `\n${lines[i]}`;
  }
  if (current !== null) bullets.push(current);
  return bullets;
}

describe("appleReport returns both registers", () => {
  it("returns both registers and a non-empty disclosure list", () => {
    const r = appleReport(join(FIXTURES, "ios-clean"));
    expect(r.structured.notVisible.length).toBeGreaterThan(4);
    expect(r.text).toContain("## Not visible to this audit");
    expect(r.structured.scan.filesRead).toBeGreaterThan(0);
  });

  // Set equality in both directions. `toContain` alone would prove only
  // notVisible ⊆ markdown, and would stay green if the report printed a bullet
  // that bypassed the shared array — which is exactly the drift
  // `renderNotVisibleSection` exists to make impossible.
  it("prints every notVisible entry in the markdown it returns, and no other", () => {
    const r = appleReport(join(FIXTURES, "ios-findings"));
    const bullets = renderedBullets(r.text);
    expect([...bullets].sort()).toEqual([...r.structured.notVisible].sort());
    expect([...bullets].sort()).toEqual([...APPLE_NOT_VISIBLE].sort());
  });

  it("renders the shared preamble and closing around that list", () => {
    const r = appleReport(join(FIXTURES, "ios-clean"));
    const section = r.text.slice(r.text.indexOf("## Not visible to this audit"));
    expect(section).toContain(APPLE_PREAMBLE);
    expect(section).toContain(APPLE_CLOSING);
  });

  it("reports the same summary its own findings add up to", () => {
    const s = appleReport(join(FIXTURES, "ios-findings")).structured;
    const count = (sev: string) => s.findings.filter((f) => f.severity === sev).length;
    expect(s.summary).toEqual({ error: count("error"), warning: count("warning"), info: count("info") });
    expect(s.findings.length).toBeGreaterThan(0);
  });

  it("attributes every Swift finding to its file and leaves configuration findings unattributed", () => {
    const s = appleReport(join(FIXTURES, "ios-findings")).structured;
    const swiftRules = ["navigationview-deprecated", "fixed-font-size", "hardcoded-color-literal", "symbol-as-only-button-label"];
    for (const f of s.findings) {
      if (swiftRules.includes(f.rule)) expect(f.file, f.rule).toBe("Sources/ContentView.swift");
      else expect(f.file, f.rule).toBeUndefined();
    }
    expect(s.findings.some((f) => typeof f.file === "string")).toBe(true);
  });

  // The configuration rules emit at the sentinel line 0. Printing `(line 0)`
  // beside "this project's entitlements file declares no App Sandbox
  // entitlement" would invite a reader to open a line that does not exist.
  it("suppresses the line on a configuration finding and prints it on a Swift one", () => {
    const r = appleReport(join(FIXTURES, "ios-findings"));
    expect(r.text).not.toMatch(/\(line 0\)/);
    expect(r.text).not.toMatch(/\bL0\b/);
    expect(r.text).toMatch(/- \*\*uirequiresfullscreen-deprecated\*\* — /);
    expect(r.text).toMatch(/- \*\*navigationview-deprecated\*\* \(line 6\) — Sources\/ContentView\.swift: /);
    expect(r.structured.findings.find((f) => f.rule === "uirequiresfullscreen-deprecated")!.line).toBe(0);
  });

  // The house `${rule}:${line}` idiom would take five findings to two here,
  // and the reader would be told about one colorset out of three.
  it("routes nothing through a rule+line deduper", () => {
    const root = project({
      "Info.plist": plist("<key>UIRequiresFullScreen</key>\n<true/>\n<key>UIRequiresFullscreen</key>\n<true/>"),
      "Assets.xcassets/A.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal", color: { components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }] }),
      "Assets.xcassets/B.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal", color: { components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }] }),
      "Assets.xcassets/C.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal", color: { components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }] }),
    });
    const findings = appleReport(root).structured.findings;
    expect(findings).toHaveLength(5);
    expect(new Set(findings.map((f) => f.line))).toEqual(new Set([0]));
    const seen = new Set<string>();
    const deduped = findings.filter((f) => {
      const key = `${f.rule}:${f.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    expect(deduped).toHaveLength(2);
    expect(new Set(findings.map((f) => f.message)).size).toBe(5);
  });

  it("still returns both registers for an empty directory", () => {
    const r = appleReport(project({}));
    expect(r.structured.scan.filesRead).toBe(0);
    expect(r.structured.findings).toEqual([]);
    expect(r.structured.notVisible).toEqual(APPLE_NOT_VISIBLE);
    expect(r.text).toContain("No findings in what was read.");
    expect(r.text).toContain("## Not visible to this audit");
  });

  // Whether a rule was allowed to run is not recoverable from an empty
  // findings list, and every platform-scoped rule is gated on the verdict.
  it("names the platform verdict and the signals behind it", () => {
    expect(appleReport(join(FIXTURES, "ios-clean")).text)
      .toContain("**Platform: iOS**, inferred from 1 signal(s): `import UIKit in any Swift file`");
    expect(appleReport(project({ "Sources/V.swift": "let x = 1\n" })).text)
      .toContain("**Platform: not determined**. Signals seen: none. **Every platform-scoped rule stayed silent**");
  });

  it("names every surface it read, and says so when it read none of a kind", () => {
    const text = appleReport(join(FIXTURES, "ios-findings")).text;
    expect(text).toContain("- Information property lists (1): `Info.plist`");
    expect(text).toContain("- Entitlements: none read");
    expect(text).toContain("- Asset catalog colorsets (1): `Assets.xcassets/Brand.colorset/Contents.json`");
  });
});

// ── the fixture matrix ──────────────────────────────────────────────────────
//
// Six directories, and what the tool returns for each. Three must come back
// empty, one must come back with an exact set, and two exist to prove that a
// silence is the platform gate rather than a result.
//
// The correct-work half is thin, and deliberately so: this repository ships
// four SwiftUI recipes and no more, where the web matrices had dozens of pages
// to draw a clean run from. The weight therefore sits on `broken` — which
// asserts an exact set, so the matrix cannot pass by finding nothing —
// and on `ambiguous` and `no-plist`, which are the two shapes that decide
// whether this tool fires on correct code.
//
// Every fixture below is built from the shape Xcode actually writes rather than
// a simplified one. That is not a preference: the review of Task 5 found two
// Criticals precisely because the fixtures until then were hand-simplified. A
// default Xcode project has written **no `Info.plist` at all** since Xcode 13
// (`GENERATE_INFOPLIST_FILE = YES`), so `no-plist` — not `ios-clean` — is the
// commonest input this tool will ever meet; and Xcode's own default
// `AccentColor.colorset` declares no colour, so `macos-clean` and `no-plist`
// both carry that placeholder rather than a colorset invented for the test.

/**
 * `recipes-swiftui` is **not** a copy. The four shipped recipes are audited
 * where they live, so a change to one is caught by this suite instead of
 * drifting away from a duplicate that no longer resembles what the server
 * ships. Every other name resolves under `tests/fixtures/apple/`.
 */
const RECIPES = join(__dirname, "..", "recipes");
const fixtureRoot = (name: string) => (name === "recipes-swiftui" ? RECIPES : join(FIXTURES, name));
const fixture = (name: string) => appleReport(fixtureRoot(name));

/**
 * The complete set of rules that do not run until the verdict names a platform:
 * `fixed-font-size` on an iOS verdict, `sandbox-absent-macos` on a macOS one.
 * Named once so `ambiguous` below asserts over the whole set rather than over
 * whichever member someone remembered.
 */
const PLATFORM_SCOPED = ["fixed-font-size", "sandbox-absent-macos"];

describe("the fixture matrix: correct work draws nothing", () => {
  it.each(["recipes-swiftui", "ios-clean", "macos-clean"])("%s returns no findings", (name) => {
    expect(fixture(name).structured.findings).toEqual([]);
  });

  // An empty findings list is also what an empty directory returns. Each of the
  // three read real files, so none of them passed by having nothing to read.
  it.each([
    ["recipes-swiftui", 4],
    ["ios-clean", 3],
    // Five of the six files under it: the catalog's own root `Contents.json`
    // is not a colorset, so the scan does not open it.
    ["macos-clean", 5],
  ])("%s read %i file(s), so its clean result is not an empty directory's", (name, count) => {
    expect(fixture(name as string).structured.scan.filesRead).toBe(count);
  });
});

/**
 * The recipes to run under a forced verdict, **derived from the surfaces the
 * audit says it read** rather than listed again here.
 *
 * A second hardcoded list is a second thing to remember: a fifth recipe added
 * to `recipes/` would make the file-count tripwire below fail with a message
 * about a number, and bumping that number would leave the new recipe with no
 * forced-verdict coverage at all. Derived, it picks the fifth one up on its
 * own, and `EXPECTED_RECIPES` below is the assertion that the two agree —
 * failing by naming the list rather than a count.
 *
 * The surfaces line names at most ten paths before it truncates
 * (`…and N more`), so this derivation holds while `recipes/` stays under
 * eleven SwiftUI files; past that the `EXPECTED_RECIPES` check fails first.
 */
const RECIPE_PATHS = [...(
  appleReport(RECIPES).text.split("\n").find((l) => l.startsWith("- Swift source"))!
).matchAll(/`([^`]+)`/g)].map((m) => m[1]);

describe("the four SwiftUI recipes this repository ships", () => {
  const EXPECTED_RECIPES = ["button/swiftui.swift", "card/swiftui.swift", "input/swiftui.swift", "list-row/swiftui.swift"];
  const recipeSource = (path: string) => ({ path, source: readFileSync(join(RECIPES, path), "utf8") });

  it("audits all four in place, and draws nothing against any of them", () => {
    expect(RECIPE_PATHS).toEqual(EXPECTED_RECIPES);
    expect(fixture("recipes-swiftui").structured.findings).toEqual([]);
  });

  // Pointed at `recipes/`, the verdict is null: four SwiftUI files with no
  // configuration between them settle nothing, so `fixed-font-size` was never
  // allowed to run in the assertion above. That would make "the recipes are
  // clean" a weaker claim than it sounds, and running each recipe under both
  // verdicts closes that particular gap.
  //
  // What it closes is exactly one rule wide. These runs call `appleSwiftRules`,
  // whose only platform-gated rule is `fixed-font-size`; the other gated rule,
  // `sandbox-absent-macos`, is a configuration rule and is never reached from
  // here. Nothing below is evidence about it — a macOS verdict over a
  // configuration-less tree is precisely where it *does* fire, as the
  // `ambiguous` fixture demonstrates further down.
  it.each(RECIPE_PATHS)("%s is clean under an iOS verdict and under a macOS one", (path) => {
    expect(appleSwiftRules([recipeSource(path)], IOS)).toEqual([]);
    expect(appleSwiftRules([recipeSource(path)], MACOS)).toEqual([]);
  });

  // How much of `symbol-as-only-button-label` the correct-work half of the
  // matrix actually exercises, asserted rather than assumed — because the
  // review of this task found the report claiming four on-merit declines where
  // the code affords one.
  //
  // `list-row` and `input` contain no `Button` token at all, so the rule never
  // looks at them; `card`'s `Button(action: action) { content }` has a label
  // this reader cannot resolve, so it declines without inspecting a symbol.
  // `button/swiftui.swift` is the one recipe whose label the rule reads and
  // passes on merit. The two clean fixtures carry an icon-only button each to
  // widen that.
  it("is exercised by one recipe, not four — the other three carry no label it can read", () => {
    const source = (p: string) => readFileSync(join(RECIPES, p), "utf8");
    for (const p of ["list-row/swiftui.swift", "input/swiftui.swift"]) {
      expect(source(p), p).not.toMatch(/\bButton\b/);
    }
    expect(source("card/swiftui.swift")).toContain("Button(action: action) { content }");
    expect(appleSwiftRules([{ path: "C.swift", source: "Button(action: {}) { content }" }], IOS)).toEqual([]);
    // The one label the rule does read: a `ZStack` of `Text` and a
    // `ProgressView`, written inline in the closure. It declines because the
    // label holds more than a symbol — the same reason the constructed control
    // beside it declines, and the reason the rule exists to distinguish.
    expect(source("button/swiftui.swift")).toMatch(/Button\(action: action\) \{\n\s+ZStack \{/);
    expect(appleSwiftRules(
      [{ path: "C.swift", source: 'Button(action: {}) { ZStack { Text(title); Image(systemName: "gear") } }' }],
      IOS,
    )).toEqual([]);
  });

  // Stated rather than left implicit, so nobody reads the clean run above as
  // evidence that the iOS-scoped rule ran during it.
  it("names the verdict the in-place run actually had, which is none", () => {
    expect(fixture("recipes-swiftui").text).toContain("**Platform: not determined**. Signals seen: none.");
  });
});

// The correct-work half of the matrix would otherwise rest one recipe deep on
// `symbol-as-only-button-label` (see the test above). Each clean fixture
// carries an icon-only button the rule genuinely inspects — a label that is one
// SF Symbol and nothing else — and declines on merit because the spoken name is
// written rather than derived. The two fixtures use the two positions the rule
// accepts the written name in: on the `Image` inside the closure, and on the
// whole `Button` after it.
describe("the clean fixtures each carry an icon-only button the rule inspects", () => {
  const CLEAN_BUTTONS = [
    ["ios-clean", join("Sources", "ContentView.swift"), IOS],
    ["macos-clean", join("Ledger", "ContentView.swift"), MACOS],
  ] as const;

  it.each(CLEAN_BUTTONS)("%s writes a lone symbol label and still draws nothing", (name, file) => {
    const source = readFileSync(join(FIXTURES, name, file), "utf8");
    expect(source).toContain('Image(systemName: "arrow.clockwise")');
    expect(source).toContain('.accessibilityLabel("Refresh receipts")');
    expect(fixture(name).structured.findings).toEqual([]);
  });

  // …and the decline is the written label rather than a label the rule could
  // not read: strike the `.accessibilityLabel` out of the same bytes and the
  // finding appears, at the line the fixture's button sits on.
  it.each(CLEAN_BUTTONS)("%s draws the finding the moment the written label goes", (name, file, verdict) => {
    const source = readFileSync(join(FIXTURES, name, file), "utf8");
    const stripped = source.replace(/\n\s+\.accessibilityLabel\("Refresh receipts"\)/, "");
    expect(stripped, "the strip must actually change the source").not.toBe(source);
    expect(appleSwiftRules([{ path: file, source: stripped }], verdict).map((f) => f.rule))
      .toEqual(["symbol-as-only-button-label"]);
  });
});

describe("macos-clean: a clean Mac project, and no iOS rule on it", () => {
  // `sandbox-absent-macos` is the macOS-scoped rule, and the template
  // entitlements silence it by declaring the capability rather than by the
  // platform gate — which is the correct reason for a clean macOS project.
  it("infers macOS from three independent signals", () => {
    expect(fixture("macos-clean").text).toContain(
      "**Platform: macOS**, inferred from 3 signal(s): `com.apple.security.app-sandbox in entitlements`, `LSMinimumSystemVersion key present`, `import AppKit in any Swift file`. Platform-scoped rules ran.",
    );
  });

  // The fixture carries two `.font(.system(size: 13))` lines — 13pt being the
  // macOS system size — so this assertion is about a rule that had something to
  // match rather than about a file with nothing in it. macOS has no Dynamic
  // Type, so the identical line that is a finding on iOS is correct here, and a
  // `fixed-font-size` finding on Mac source would be a false positive by
  // construction.
  it("draws no fixed-font-size on Mac source that carries the exact line it matches", () => {
    const source = readFileSync(join(FIXTURES, "macos-clean", "Ledger", "ContentView.swift"), "utf8");
    expect(source).toContain(".font(.system(size: 13))");
    expect(fixture("macos-clean").structured.findings).toEqual([]);
    // …and the same source under an iOS verdict draws it twice, so the silence
    // above is the platform gate rather than a pattern that never matched.
    const onIOS = appleSwiftRules([{ path: "Ledger/ContentView.swift", source }], IOS);
    expect(onIOS.map((f) => `${f.rule}@${f.line}`)).toEqual(["fixed-font-size@14", "fixed-font-size@16"]);
  });

  // Limit 3 of the header comment, on a fixture rather than on a constructed
  // config: this project enables the Hardened Runtime in its build settings and
  // declares one of its exception entitlements, and no rule says anything about
  // it in either direction.
  it("says nothing about the Hardened Runtime it both enables and excepts", () => {
    const r = fixture("macos-clean");
    expect(readFileSync(join(FIXTURES, "macos-clean", "Ledger.xcodeproj", "project.pbxproj"), "utf8"))
      .toContain("ENABLE_HARDENED_RUNTIME = YES;");
    expect(readFileSync(join(FIXTURES, "macos-clean", "Ledger", "Ledger.entitlements"), "utf8"))
      .toContain("com.apple.security.cs.disable-library-validation");
    expect(r.text.slice(0, r.text.indexOf("## Not visible to this audit"))).not.toMatch(/hardened runtime/i);
  });
});

describe("the broken project draws exactly the expected set", () => {
  it("draws those six rules and no seventh", () => {
    expect(fixture("broken").structured.findings.map((f) => f.rule).sort()).toEqual([
      "colorset-no-dark-variant", "fixed-font-size", "microphone-entitlement-mismatch",
      "navigationview-deprecated", "symbol-as-only-button-label", "uirequiresfullscreen-deprecated",
    ]);
  });

  // One finding per defect, each at the position it belongs at: the three
  // configuration facts at the sentinel line 0, the three Swift facts at the
  // line that carries them.
  it("draws each exactly once, at its own line", () => {
    expect(fixture("broken").structured.findings.map((f) => `${f.rule}@${f.line}`)).toEqual([
      "colorset-no-dark-variant@0",
      "uirequiresfullscreen-deprecated@0",
      "microphone-entitlement-mismatch@0",
      "navigationview-deprecated@6",
      "fixed-font-size@9",
      "symbol-as-only-button-label@11",
    ]);
    expect(fixture("broken").structured.summary).toEqual({ error: 0, warning: 5, info: 1 });
  });

  it("reached an iOS verdict, which is what let the iOS-scoped rule run at all", () => {
    expect(fixture("broken").text).toContain("**Platform: iOS**, inferred from 3 signal(s)");
  });

  // The two rules the set deliberately excludes, and why each is correct to be
  // silent: the verdict is iOS, so the macOS distribution rule does not apply;
  // and the fixture's colour is `Color("Brand")`, a resource reference, which
  // is what `hardcoded-color-literal` exists to distinguish a literal from.
  it("excludes the macOS rule and the colour-literal rule, on their own merits", () => {
    const ids = fixture("broken").structured.findings.map((f) => f.rule);
    expect(ids).not.toContain("sandbox-absent-macos");
    expect(ids).not.toContain("hardcoded-color-literal");
    expect(readFileSync(join(FIXTURES, "broken", "Ledger", "ContentView.swift"), "utf8")).toContain('Color("Brand")');
  });
});

// The fixture that stops the platform inference from guessing. A SwiftUI
// package targeting both platforms has no configuration to settle the question
// and no `import UIKit`/`import AppKit` to fall back on, which is exactly the
// input where a guess would be most tempting and most damaging: macOS has no
// Dynamic Type, so a `fixed-font-size` finding on Mac source is a false
// positive by construction, and a guessed iOS verdict here would produce one.
describe("an ambiguous project runs no platform-specific rule and says so", () => {
  it("runs neither platform-scoped rule", () => {
    const ids = fixture("ambiguous").structured.findings.map((f) => f.rule);
    for (const rule of PLATFORM_SCOPED) expect(ids, rule).not.toContain(rule);
  });

  // …while the unscoped rule fires, so the two silences above are the gate and
  // not a run that read nothing.
  it("still reports what is not platform-scoped, so the silence is not an empty run", () => {
    expect(fixture("ambiguous").structured.findings.map((f) => `${f.rule}@${f.line}`))
      .toEqual(["navigationview-deprecated@11"]);
    expect(fixture("ambiguous").structured.scan.filesRead).toBe(2);
  });

  it("says in the report why every platform-scoped rule stayed silent", () => {
    expect(fixture("ambiguous").text).toContain(
      "**Platform: not determined**. Signals seen: none. **Every platform-scoped rule stayed silent**, so their silence here is the gate rather than a result.",
    );
  });

  it("says it in the disclosure list too, where a caller reading only the structured half will see it", () => {
    const r = fixture("ambiguous");
    expect(r.structured.notVisible.join(" ")).toMatch(/platform/i);
    expect(r.structured.notVisible.some((e) => e.includes(
      "Every platform-scoped rule, whenever the platform line above does not name a platform.",
    ))).toBe(true);
  });

  // Both halves of the gate, demonstrated on this fixture's own bytes: the
  // Swift file draws `fixed-font-size` the moment a verdict says iOS, and the
  // fixture's own (empty) configuration draws `sandbox-absent-macos` the moment
  // one says macOS. Neither rule is missing a pattern; both were held back.
  it("draws both of them the moment a verdict names a platform", () => {
    const source = readFileSync(join(FIXTURES, "ambiguous", "Sources", "DesignKit", "BadgeView.swift"), "utf8");
    const files = [{ path: "Sources/DesignKit/BadgeView.swift", source }];
    expect(appleSwiftRules(files, IOS).map((f) => `${f.rule}@${f.line}`))
      .toEqual(["navigationview-deprecated@11", "fixed-font-size@13"]);

    // `readAppleConfig` over the same files is what the report itself built:
    // a Swift path is no configuration surface, so this is the fixture's real
    // config, empty, with a macOS verdict put over it.
    const config = readAppleConfig(files);
    expect(config.surfaces).toEqual({ plist: [], buildSettings: [], entitlements: [], assetCatalogs: [] });
    expect(appleConfigRules({ config, platform: MACOS }).map((f) => f.rule)).toEqual(["sandbox-absent-macos"]);
  });
});

// `GENERATE_INFOPLIST_FILE = YES` has been Xcode's default since 13, so this —
// not `ios-clean` — is the shape a default project has today: no `Info.plist`
// anywhere, every key suffixed inside `project.pbxproj`, and a SwiftUI
// lifecycle with no `import UIKit` to infer from.
describe("finds keys that live only in build settings, and reports no false absence", () => {
  it("reports the key it found there", () => {
    expect(fixture("no-plist").structured.findings.map((f) => f.rule)).toEqual(["uirequiresfullscreen-deprecated"]);
  });

  it("read no information property list at all, and says so", () => {
    const text = fixture("no-plist").text;
    expect(text).toContain("- Information property lists: none read");
    expect(text).toContain("- Build settings (`INFOPLIST_KEY_*` only) (1): `Ledger.xcodeproj/project.pbxproj`");
  });

  it("infers iOS from the suffixed families, with no import UIKit anywhere to fall back on", () => {
    const text = fixture("no-plist").text;
    expect(text).toContain("**Platform: iOS**, inferred from 2 signal(s)");
    expect(text).toContain("`UIRequiresFullScreen or UISupportedInterfaceOrientations key present`");
    expect(text).toContain("`UILaunchScreen / UILaunchStoryboardName key present`");
    for (const swift of ["Ledger/ContentView.swift", "Ledger/LedgerApp.swift"]) {
      expect(readFileSync(join(FIXTURES, "no-plist", ...swift.split("/")), "utf8"), swift).not.toContain("import UIKit");
    }
  });

  // The false absence this fixture exists to rule out. A purpose string
  // declared only as a build setting is the case a plist-only reader calls
  // missing on a project that is correct; the key is found here, and no rule
  // reports anything about it.
  it("picks the purpose string out of the build settings and says nothing about it", () => {
    const config = readAppleConfig([{
      path: "Ledger.xcodeproj/project.pbxproj",
      source: readFileSync(join(FIXTURES, "no-plist", "Ledger.xcodeproj", "project.pbxproj"), "utf8"),
    }]);
    expect(config.keys.get("NSCameraUsageDescription")).toBe("Ledger photographs your receipts.");
    expect(config.keys.get("UIRequiresFullScreen")).toBe("YES");
    expect(config.surfaces.plist).toEqual([]);
  });

  // The load-bearing half of this guard is positive and exact: **one** finding,
  // named, and no other. A denylist of words and rule-id fragments cannot be the
  // guard — a future rule worded "is not declared", or named
  // `purpose-string-undeclared`, matches neither pattern below and would still
  // be a false absence on a correct project. Exactness catches it whatever it
  // calls itself. The regexes stay as a second signal, no longer as the only one.
  it("states no absence anywhere in the report body", () => {
    const r = fixture("no-plist");
    expect(r.structured.findings.map((f) => f.rule)).toEqual(["uirequiresfullscreen-deprecated"]);
    const body = r.text.slice(0, r.text.indexOf("## Not visible to this audit"));
    expect(body).not.toMatch(/declares no|was among the surfaces read|no Info\.plist|missing/i);
    expect(r.structured.findings.filter((f) => /absent|missing/i.test(f.rule))).toEqual([]);
  });
});

// A path that could not be parsed and a path that was read are independent
// arrays on `ConfigRead` with nothing relating them, so listing an unparsed
// path in `surfaces` would let `sandbox-absent-macos` name a file it never
// read as one it had read and found empty.
describe("an unparsed surface never reaches the surfaces list", () => {
  it("keeps a binary entitlements plist out of surfaces.entitlements", () => {
    const config = readAppleConfig([{ path: "App.entitlements", source: "bplist00 binary" }]);
    expect(config.surfaces.entitlements).toEqual([]);
    expect(config.unparsed).toEqual(["App.entitlements"]);
  });

  it("stops sandbox-absent-macos from naming a file it could not read", () => {
    const binary = project({
      "App.entitlements": "bplist00  binary",
      "Sources/App.swift": "import AppKit\nimport SwiftUI\n",
    });
    const message = appleReport(binary).structured.findings.find((f) => f.rule === "sandbox-absent-macos")!.message;
    expect(message).toContain("No entitlements file was among the surfaces read here");
    expect(message).not.toContain("App.entitlements");

    const readable = project({
      "App.entitlements": plist("<key>com.apple.security.network.client</key>\n<true/>"),
      "Sources/App.swift": "import AppKit\nimport SwiftUI\n",
    });
    expect(appleReport(readable).structured.findings.find((f) => f.rule === "sandbox-absent-macos")!.message)
      .toContain("The entitlements file read here — `App.entitlements` —");
  });

  it("keeps a malformed colorset out of surfaces.assetCatalogs and rules on the readable one beside it", () => {
    const root = project({
      "Assets.xcassets/Broken.colorset/Contents.json": "{ colors: [ }",
      "Assets.xcassets/Flat.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal", color: { components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }] }),
    });
    const r = appleReport(root);
    expect(rules(root)).toEqual(["colorset-no-dark-variant"]);
    expect(r.text).toContain("`Assets.xcassets/Flat.colorset/Contents.json`");
    expect(r.text).toContain("**Could not be parsed, and therefore not read at all:** `Assets.xcassets/Broken.colorset/Contents.json`");
  });
});

// ── one demonstration per disclosure sentence ───────────────────────────────
//
// Each `it` below is the run that produced the sentence beside it. The
// coverage test at the end of this block pairs them up by an excerpt, so a
// sentence added without a run — or a run whose sentence was later reworded
// past recognition — fails rather than passes quietly.

/** Excerpts, one per entry, in the order `APPLE_NOT_VISIBLE` declares them. */
const DEMONSTRATED = [
  "Nothing here is measured, and nothing is rendered.",
  "A file this scan never opened.",
  "A directory the walk never enters",
  "Vendored source under a directory name that is not on that list.",
  "Whatever the scan stopped short of.",
  "which is skipped whole rather than truncated.",
  "Anything reached through a symbolic link.",
  "A configuration file that could not be parsed.",
  "A plist value outside the small subset this reader covers.",
  "Everything in a `project.pbxproj` other than `INFOPLIST_KEY_*`.",
  "Which target a declaration belongs to — a key or an entitlement alike.",
  "Localised values, and every localisation surface.",
  "Whether the Hardened Runtime is enabled.",
  "Purpose strings, in both directions.",
  "Every platform-scoped rule, whenever the platform line above does not name a platform.",
  "Whether a Swift file is missing something.",
  "A Swift file whose comment masking went wrong",
  "The shapes the Swift rules do not match",
  "The difference between code and a string that looks like code.",
  "A key spelling this reader has not been taught.",
  "A colorset that declares no colour value.",
  "A path this process could not open.",
  "A file that is not UTF-8 text.",
  "What a colorset resolves to.",
];

describe("every notVisible entry has a demonstration", () => {
  it("pairs each entry with an excerpt, in order and one-to-one", () => {
    expect(DEMONSTRATED).toHaveLength(APPLE_NOT_VISIBLE.length);
    const unmatched = DEMONSTRATED.filter((excerpt, i) => !APPLE_NOT_VISIBLE[i].includes(excerpt));
    expect(unmatched).toEqual([]);
  });

  it("keeps the list the longest disclosure this server ships", () => {
    // Not a vanity number: this audit reads four configuration surfaces and a
    // language it can only read one line at a time, and each of those is its
    // own class of blind spot. A shrinking list here means a limit stopped
    // being disclosed, not that one stopped existing.
    expect(APPLE_NOT_VISIBLE.length).toBeGreaterThanOrEqual(24);
  });
});

describe("1. nothing is measured and nothing is rendered", () => {
  it("reports a flat colorset and a colour literal without computing anything about either", () => {
    const r = appleReport(join(FIXTURES, "ios-findings"));
    const colorset = r.structured.findings.find((f) => f.rule === "colorset-no-dark-variant")!;
    const literal = r.structured.findings.find((f) => f.rule === "hardcoded-color-literal")!;
    expect(colorset.message).not.toMatch(/\d+(\.\d+)?\s*:\s*1|contrast ratio of/i);
    expect(literal.message).toContain("says nothing about the colour's contrast ratio");
    expect(r.text).not.toMatch(/\d(\.\d+)?:1\b/);
  });
});

describe("2. a file this scan never opened", () => {
  it("reads the plist and the .swift, and none of the five shapes beside them", () => {
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Base.lproj/Main.storyboard": "<document><navigationController/></document>",
      "Base.lproj/Launch.xib": "<document/>",
      "Legacy/LegacyVC.m": '#import "LegacyVC.h"\n@implementation LegacyVC\n@end\n',
      "InfoPlist.xcstrings": JSON.stringify({ strings: {} }),
      "Sources/V.swift": "import SwiftUI\nimport UIKit\n",
      "Sources/V.swift.txt": 'import SwiftUI\nNavigationView { Text("x") }\n',
    });
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(2);
    expect(r.structured.findings).toEqual([]);
    expect(r.text).toContain("- Swift source (1): `Sources/V.swift`");
  });

  it("does not open an asset-catalog member that is not a colorset", () => {
    const root = project({
      "Assets.xcassets/Contents.json": JSON.stringify({ info: { author: "xcode", version: 1 } }),
      "Assets.xcassets/AppIcon.appiconset/Contents.json": JSON.stringify({ images: [{ idiom: "universal" }] }),
      "Sources/V.swift": "import SwiftUI\nimport UIKit\n",
    });
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(1);
    expect(r.text).toContain("- Asset catalog colorsets: none read");
    expect(r.text).toContain("- Swift source (1): `Sources/V.swift`");
  });

  // The colorsets are the half that must survive the narrowing: matching the
  // path tail rather than the basename has to keep reading the members this
  // audit can actually use, or C1's fix would have traded a starved scan for a
  // silent rule.
  it("still opens a colorset beside the members it skips", () => {
    const root = project({
      "Assets.xcassets/Contents.json": JSON.stringify({ info: { author: "xcode", version: 1 } }),
      "Assets.xcassets/AppIcon.appiconset/Contents.json": JSON.stringify({ images: [{ idiom: "universal" }] }),
      "Assets.xcassets/Brand.colorset/Contents.json": JSON.stringify({
        colors: [{ idiom: "universal", color: { "color-space": "srgb", components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }],
      }),
      "Sources/V.swift": "import SwiftUI\nimport UIKit\n",
    });
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(2);
    expect(r.text).toContain("- Asset catalog colorsets (1): `Assets.xcassets/Brand.colorset/Contents.json`");
    expect(rules(root)).toEqual(["colorset-no-dark-variant"]);
  });
});

describe("3. a directory the walk never enters", () => {
  it("reads none of build/, .build/, Pods/, Carthage/ or DerivedData/", () => {
    const body = plist("<key>UIRequiresFullScreen</key>\n<true/>");
    const root = project({
      "build/Info.plist": body,
      ".build/Info.plist": body,
      "Pods/Info.plist": body,
      "Carthage/Info.plist": body,
      "DerivedData/Info.plist": body,
      "Sources/V.swift": "import SwiftUI\nimport UIKit\n",
    });
    const r = appleReport(root);
    expect(rules(root)).toEqual([]);
    expect(r.text).toContain("- Information property lists: none read");
    expect(r.structured.scan.filesRead).toBe(1);
  });

  // The three failures the exclusion exists to prevent, on one clean app with
  // its dependencies checked in beside it. Before it, five of five findings
  // came from vendored code and neither platform-scoped rule could run.
  it("reports the app's own findings and nothing from Pods/, Carthage/ or DerivedData/", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj":
        "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\nINFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = \"UIInterfaceOrientationPortrait\";\n",
      "Ledger/ContentView.swift": 'import SwiftUI\nNavigationView {\n  Text("Hi").font(.system(size: 17))\n}\n',
      "Pods/Target Support Files/Alamofire/Info.plist": plist("<key>UIRequiresFullScreen</key>\n<true/>"),
      "Pods/Alamofire/Source/Session.swift": 'import SwiftUI\nNavigationView { Text("pod") }\n',
      // A pod's own macOS build setting, which used to collide with the app's
      // iOS signals and take the verdict to `conflicted`.
      "Pods/Pods.xcodeproj/project.pbxproj": "INFOPLIST_KEY_LSMinimumSystemVersion = 10.15;\n",
      "Carthage/Checkouts/Kingfisher/Sources/View.swift": 'import SwiftUI\nNavigationView { Text("carthage") }\n',
      "DerivedData/Build/Info.plist": plist("<key>UIRequiresFullScreen</key>\n<true/>"),
    });
    const r = appleReport(root);
    expect(ruleLines(root)).toEqual(["navigationview-deprecated@2", "fixed-font-size@3"]);
    for (const f of r.structured.findings) expect(f.file).toBe("Ledger/ContentView.swift");
    // The verdict survived the pod's macOS signal, so both rules could run.
    expect(r.text).toContain("**Platform: iOS**");
  });

  // The starvation case: vendored source sorts before the app's own directory,
  // so without the exclusion it exhausts the file cap first.
  it("does not let 420 vendored Swift files spend the file cap", () => {
    const files: Record<string, string> = {
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n",
      "Ledger/ContentView.swift": 'import SwiftUI\nNavigationView {\n  Text("Hi").font(.system(size: 17))\n}\n',
    };
    for (let i = 0; i < 420; i++) files[`Carthage/Checkouts/Lib/S${String(i).padStart(4, "0")}.swift`] = "import SwiftUI\nlet x = 1\n";
    const root = project(files);
    const r = appleReport(root);
    expect(r.structured.scan.hitFileCap).toBe(false);
    expect(r.structured.scan.filesRead).toBe(2);
    expect(ruleLines(root)).toEqual(["navigationview-deprecated@2", "fixed-font-size@3"]);
  });
});

describe("3c. the skip list is a name test, not a provenance test", () => {
  // The direction entry 3 previously asserted in prose with no run behind it:
  // a user who keeps their own code under one of those names loses it, and
  // nothing in the report body marks the loss.
  it("drops a project's own code kept under Pods/, with no signal in the report body", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n",
      "Pods/MyOwnCode.swift": 'import SwiftUI\nNavigationView { Text("mine") }\n',
    });
    const r = appleReport(root);
    expect(rules(root)).toEqual([]);
    expect(r.structured.scan.filesRead).toBe(1);
    expect(r.text).toContain("- Swift source: none read");
    // Not in `unreadable`, not in `skippedLarge`, not in the prose — the entry
    // in the disclosure list is the only place this is stated.
    expect(r.structured.scan.unreadable).toEqual([]);
    expect(r.structured.scan.skippedLarge).toEqual([]);
    const body = r.text.slice(0, r.text.indexOf("## Not visible to this audit"));
    expect(body).not.toContain("Pods");
  });

  // …and the escape hatch the entry offers: `walk(root)` never name-checks the
  // root it was given, so pointing the tool at the directory audits it.
  it("audits that same directory when the tool is pointed straight at it", () => {
    const outer = project({ "Pods/MyOwnCode.swift": 'import SwiftUI\nimport UIKit\nNavigationView { Text("mine") }\n' });
    const r = appleReport(join(outer, "Pods"));
    expect(r.structured.findings.map((f) => `${f.rule} ${f.file}`)).toEqual(["navigationview-deprecated MyOwnCode.swift"]);
  });
});

describe("3b. vendored source under a directory name that is not on that list", () => {
  // The remedy this entry offers has to hold on the projects big enough to have
  // vendored code beside their own. An earlier wording said "the surfaces list
  // above prints every Swift file that was read"; the list caps at ten names per
  // kind, so on 14 Swift files the one the finding named was in the remainder.
  // The entry now points at the finding's own path, which is what this pins.
  it("carries the path on the finding itself, where the capped surfaces list does not name it", () => {
    const files: Record<string, string> = {
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n",
    };
    for (let i = 0; i < 13; i++) files[`Sources/F${String(i).padStart(2, "0")}.swift`] = "import SwiftUI\nlet x = 1\n";
    files["Vendor/Lib/View.swift"] = 'import SwiftUI\nNavigationView { Text("vendored") }\n';
    const root = project(files);
    const r = appleReport(root);

    const surfaceLine = r.text.split("\n").find((l) => l.startsWith("- Swift source"))!;
    expect(surfaceLine).toContain("- Swift source (14):");
    expect(surfaceLine).toContain("…and 4 more");
    expect(surfaceLine).not.toContain("Vendor/Lib/View.swift");

    // …while the path the reader actually needs is on the finding, in both
    // registers.
    expect(r.structured.findings.map((f) => f.file)).toEqual(["Vendor/Lib/View.swift"]);
    expect(r.text).toContain("— Vendor/Lib/View.swift: ");
  });

  it("audits a library checked into Vendor/ as though a person on the team wrote it", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n",
      "Vendor/Lib/View.swift": 'import SwiftUI\nNavigationView { Text("vendored") }\n',
      "Ledger/ContentView.swift": "import SwiftUI\nimport UIKit\n",
    });
    const r = appleReport(root);
    expect(rules(root)).toEqual(["navigationview-deprecated"]);
    expect(r.structured.findings[0].file).toBe("Vendor/Lib/View.swift");
    expect(r.text).toContain("`Vendor/Lib/View.swift`");
  });
});

describe("4. whatever the scan stopped short of", () => {
  it("reads 400 of 406 Swift files and misses the NavigationView in the last of them", () => {
    const files: Record<string, string> = { "Info.plist": plist("<key>CFBundleName</key>\n<string>Big</string>") };
    for (let i = 0; i < 405; i++) files[`Sources/a${String(i).padStart(4, "0")}.swift`] = "import SwiftUI\nlet x = 1\n";
    files["Sources/zzz.swift"] = 'import SwiftUI\nNavigationView { Text("x") }\n';
    const root = project(files);
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(400);
    expect(r.structured.scan.hitFileCap).toBe(true);
    expect(r.structured.findings).toEqual([]);
    expect(r.text).toContain("**Capped:** the 400-file cap was reached");
    // Configuration is read first, which is the half of the sentence that
    // would be easiest to get wrong by reading the code.
    expect(r.text).toContain("- Information property lists (1): `Info.plist`");
  });

  // The other half of the same sentence: reading configuration first is
  // priority, not an exemption. 500 colorsets are all configuration, and they
  // stop at the cap like anything else — so the file count stays a real bound
  // and the report says the Swift file went unread rather than implying it was
  // clean.
  it("spends the whole budget on configuration when there is that much of it, and says so", () => {
    const colorset = JSON.stringify({
      colors: [{ idiom: "universal", color: { "color-space": "srgb", components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }],
    });
    const files: Record<string, string> = { "Sources/zzz.swift": 'import SwiftUI\nimport UIKit\nNavigationView { Text("x") }\n' };
    for (let i = 0; i < 500; i++) files[`Assets.xcassets/C${String(i).padStart(4, "0")}.colorset/Contents.json`] = colorset;
    const root = project(files);
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(400);
    expect(r.structured.scan.hitFileCap).toBe(true);
    expect(r.text).toContain("**Capped:** the 400-file cap was reached");
    expect(r.text).toContain("- Swift source: none read");
    expect(r.structured.findings).toHaveLength(400);
  });
});

// C1: `Contents.json` as a bare basename made the name match scale with an
// app's image count, and the name matches were exempt from both caps. On an
// ordinary iOS app the two together read 401 files and starved every Swift
// file in the project — `Platform: iOS … Platform-scoped rules ran` above
// `0 error · 0 warning · 0 info`, on a project carrying two real findings.
//
// Two independent guards, because the defect had two independent halves.
describe("an asset catalog cannot starve the Swift half of the scan", () => {
  const IOS_PLIST = plist("<key>UILaunchScreen</key>\n<string>LaunchScreen</string>");
  const VIEW = 'import SwiftUI\nstruct ContentView: View {\n  var body: some View {\n    NavigationView {\n      Text("hi").font(.system(size: 17))\n    }\n  }\n}\n';

  const appWithImagesets = (n: number) => {
    const files: Record<string, string> = { "Info.plist": IOS_PLIST, "Sources/ContentView.swift": VIEW };
    for (let i = 0; i < n; i++) {
      files[`Assets.xcassets/Img${String(i).padStart(4, "0")}.imageset/Contents.json`] =
        JSON.stringify({ images: [{ idiom: "universal" }], info: { version: 1, author: "xcode" } });
    }
    return project(files);
  };

  // The threshold that used to decide it: 398 imagesets reported both defects,
  // 399 reported none, 400 read 401 files.
  it.each([398, 399, 400])("reports both defects on an app with %i imagesets", (n) => {
    const root = appWithImagesets(n);
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(2);
    expect(r.structured.scan.hitFileCap).toBe(false);
    expect(rules(root)).toEqual(["navigationview-deprecated", "fixed-font-size"]);
    expect(r.text).toContain("- Swift source (1): `Sources/ContentView.swift`");
  });

  // The caps are bounds on everything, so no arrangement of files can read
  // past them. 500 name-matched configuration files is the arrangement that
  // could before.
  it("never reads past the file cap, however many files match by name or path", () => {
    const colorset = JSON.stringify({
      colors: [{ idiom: "universal", color: { "color-space": "srgb", components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }],
    });
    const files: Record<string, string> = { "Info.plist": IOS_PLIST };
    for (let i = 0; i < 500; i++) files[`Assets.xcassets/C${String(i).padStart(4, "0")}.colorset/Contents.json`] = colorset;
    const r = appleReport(project(files));
    expect(r.structured.scan.filesRead).toBeLessThanOrEqual(400);
    expect(r.structured.scan.hitFileCap).toBe(true);
  });

  it("never reads past the total-bytes cap, however many files match by name or path", () => {
    const pad = "x".repeat(30 * 1024);
    const files: Record<string, string> = { "Info.plist": IOS_PLIST };
    for (let i = 0; i < 200; i++) {
      files[`Assets.xcassets/C${String(i).padStart(4, "0")}.colorset/Contents.json`] = JSON.stringify({
        pad,
        colors: [{ idiom: "universal", color: { "color-space": "srgb", components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }],
      });
    }
    const r = appleReport(project(files));
    expect(r.structured.scan.scannedBytes).toBeLessThanOrEqual(3 * 1024 * 1024);
    expect(r.structured.scan.hitByteCap).toBe(true);
    expect(r.text).toContain("**Capped:** the 3072 KB total-bytes cap was reached");
  });
});

describe("5. a file over the per-file cap", () => {
  it("skips it whole, names it, and reads the small file beside it", () => {
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Sources/Huge.swift": 'import SwiftUI\nNavigationView { Text("x") }\n' + "// ".repeat(300 * 1024),
      "Sources/Small.swift": "import SwiftUI\nimport UIKit\n",
    });
    const r = appleReport(root);
    expect(r.structured.scan.skippedLarge).toEqual(["Sources/Huge.swift"]);
    expect(r.structured.findings).toEqual([]);
    expect(r.text).toContain("**Skipped 1 file(s) over 500 KB**, unopened: `Sources/Huge.swift`.");
    expect(r.text).toContain("- Swift source (1): `Sources/Small.swift`");
  });

  it("names at most five of them, so a sixth appears nowhere in the prose", () => {
    const files: Record<string, string> = { "Info.plist": plist("<key>CFBundleName</key>\n<string>Big</string>") };
    for (let i = 0; i < 6; i++) files[`Sources/Huge${i}.swift`] = 'import SwiftUI\nNavigationView { Text("x") }\n' + "// ".repeat(300 * 1024);
    const root = project(files);
    const r = appleReport(root);
    expect(r.structured.scan.skippedLarge).toHaveLength(6);
    expect(r.text).toContain("**Skipped 6 file(s) over 500 KB**");
    expect(r.text).toContain("`Sources/Huge4.swift`");
    // Counted but not named — the same shape the two lines above it use.
    expect(r.text).toContain(", …and 1 more.");
    expect(r.text).not.toContain("Sources/Huge5.swift");
  });
});

describe("6. anything reached through a symbolic link", () => {
  it("steps over a linked directory and a linked file, recording neither", () => {
    const linked = project({ "Deep/V.swift": 'import SwiftUI\nNavigationView { Text("x") }\n' });
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Sources/Real.swift": "import SwiftUI\nimport UIKit\n",
    });
    symlinkSync(join(linked, "Deep"), join(root, "Linked"));
    symlinkSync(join(linked, "Deep", "V.swift"), join(root, "Sources", "LinkedV.swift"));
    const r = appleReport(root);
    expect(r.structured.findings).toEqual([]);
    expect(r.structured.scan.filesRead).toBe(2);
    expect(r.structured.scan.unreadable).toEqual([]);
    expect(r.structured.scan.skippedLarge).toEqual([]);
  });
});

describe("7. a configuration file that could not be parsed", () => {
  it("takes the platform verdict to null when the plist that would have settled it is binary", () => {
    const swift = 'import SwiftUI\nText("Hi").font(.system(size: 17))\nNavigationView { Text("x") }\n';
    const binary = project({ "Info.plist": "bplist00 binary garbage", "Sources/V.swift": swift });
    const r = appleReport(binary);
    expect(r.text).toContain("**Platform: not determined**");
    expect(rules(binary)).toEqual(["navigationview-deprecated"]);
    expect(r.text).toContain("**Could not be parsed, and therefore not read at all:** `Info.plist`");
    expect(r.text).toContain("- Information property lists: none read");

    // The same project, readable, with a key the subset covers.
    const readable = project({
      "Info.plist": plist("<key>UILaunchStoryboardName</key>\n<string>LaunchScreen</string>"),
      "Sources/V.swift": swift,
    });
    expect(rules(readable).sort()).toEqual(["fixed-font-size", "navigationview-deprecated"]);
  });
});

describe("8. a plist value outside the reader's subset", () => {
  it("drops a dict-valued, an integer-valued and an array-of-dicts key, and never sees a key nested inside one", () => {
    const config = readAppleConfig([{
      path: "Info.plist",
      source: plist([
        "<key>NSAppTransportSecurity</key>",
        "<dict><key>UIRequiresFullScreen</key><true/></dict>",
        "<key>CFBundleVersion</key>",
        "<integer>42</integer>",
        "<key>CFBundleURLTypes</key>",
        "<array><dict><key>CFBundleURLSchemes</key><array><string>ledger</string></array></dict></array>",
      ].join("\n")),
    }]);
    expect([...config.keys.keys()]).toEqual(["CFBundleURLTypes"]);
    expect(config.keys.get("CFBundleURLTypes")).toEqual([]);
  });

  it("gets no iOS signal from a UILaunchScreen written as Xcode's template writes it, and one from the same key as a string", () => {
    const swift = 'import SwiftUI\nText("Hi").font(.system(size: 17))\n';
    const asDict = project({
      "Info.plist": plist("<key>UILaunchScreen</key>\n<dict>\n<key>UIColorName</key>\n<string>Launch</string>\n</dict>"),
      "Sources/V.swift": swift,
    });
    expect(appleReport(asDict).text).toContain("**Platform: not determined**");
    expect(rules(asDict)).toEqual([]);

    const asString = project({
      "Info.plist": plist("<key>UILaunchScreen</key>\n<string>LaunchScreen</string>"),
      "Sources/V.swift": swift,
    });
    expect(appleReport(asString).text).toContain("**Platform: iOS**");
    expect(rules(asString)).toEqual(["fixed-font-size"]);
  });

  // …and the loss is usually covered rather than fatal. The Xcode 12-14
  // template writes UILaunchScreen as a dict *and* UISupportedInterfaceOrientations
  // as an array of strings, so the verdict survives on the second signal. The
  // sentence says so, because a reader who took the dict case for the common
  // one would expect this template to come back undetermined. It does not.
  it("still reads the Xcode 12-14 template as iOS, off the sibling signal the dict case does not cost", () => {
    const root = project({
      "Info.plist": plist([
        "<key>UILaunchScreen</key>",
        "<dict/>",
        "<key>UISupportedInterfaceOrientations</key>",
        "<array><string>UIInterfaceOrientationPortrait</string></array>",
      ].join("\n")),
      "Sources/V.swift": 'import SwiftUI\nText("Hi").font(.system(size: 17))\n',
    });
    expect(appleReport(root).text).toContain("**Platform: iOS**");
    expect(rules(root)).toEqual(["fixed-font-size"]);
  });
});

describe("9. everything in a project.pbxproj other than INFOPLIST_KEY_*", () => {
  const pbxproj = [
    "// !$*UTF8*$!",
    "{ buildSettings = {",
    "    ENABLE_HARDENED_RUNTIME = YES;",
    "    CODE_SIGN_ENTITLEMENTS = App/App.entitlements;",
    '    PRODUCT_NAME = "Ledger";',
    "    INFOPLIST_KEY_UIRequiresFullScreen = YES;",
    '    INFOPLIST_KEY_NSCameraUsageDescription = "Ledger photographs your receipts.";',
    "    INFOPLIST_KEY_UILaunchScreen_Generation = YES;",
    "  };",
    "}",
  ].join("\n");

  it("reads the three prefixed settings and none of the three beside them", () => {
    const config = readAppleConfig([{ path: "Ledger.xcodeproj/project.pbxproj", source: pbxproj }]);
    expect([...config.keys.keys()].sort()).toEqual([
      "NSCameraUsageDescription", "UILaunchScreen_Generation", "UIRequiresFullScreen",
    ]);
    expect(config.keys.has("ENABLE_HARDENED_RUNTIME")).toBe(false);
    expect(config.keys.has("PRODUCT_NAME")).toBe(false);
    expect(config.keys.has("CODE_SIGN_ENTITLEMENTS")).toBe(false);
  });

  it("lets INFOPLIST_KEY_UIRequiresFullScreen produce both the finding and the iOS verdict", () => {
    const root = project({ "Ledger.xcodeproj/project.pbxproj": pbxproj });
    expect(rules(root)).toEqual(["uirequiresfullscreen-deprecated"]);
    expect(appleReport(root).text).toContain("**Platform: iOS**");
  });

  // The prefix is stripped literally, so a build setting arrives under whatever
  // name follows it — never under the unsuffixed key it resembles.
  it("reads INFOPLIST_KEY_UILaunchScreen_Generation under its own suffixed name", () => {
    const config = readAppleConfig([{ path: "project.pbxproj", source: "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n" }]);
    expect(config.keys.has("UILaunchScreen")).toBe(false);
    expect(config.keys.has("UILaunchScreen_Generation")).toBe(true);
    // …and that suffixed name is one of the three recognised as an iOS signal,
    // because it is what a default project actually writes.
    const root = project({ "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n" });
    expect(appleReport(root).text).toContain("**Platform: iOS**");
  });
});

describe("10. which target a declaration belongs to", () => {
  it("reports a key declared by the share extension alone as a fact about the project", () => {
    const root = project({
      "App/Info.plist": plist("<key>CFBundleDisplayName</key>\n<string>Ledger</string>"),
      "ShareExtension/Info.plist": plist("<key>UIRequiresFullScreen</key>\n<true/>"),
    });
    const r = appleReport(root);
    expect(rules(root)).toEqual(["uirequiresfullscreen-deprecated"]);
    expect(r.structured.findings[0].message).toContain("this project's configuration");
    // The surfaces list is the only place the distinction survives.
    expect(r.text).toContain("- Information property lists (2): `App/Info.plist`, `ShareExtension/Info.plist`");
  });

  // The other half of the same merge, undisclosed until v0.25.0: entitlement
  // identifiers are unioned across every `.entitlements` file too, and two of
  // the four configuration rules read that set. App + XPC service / login item
  // / Sparkle updater / Safari extension is a standard macOS shape.
  const MACOS_APP_AND_HELPER = {
    "Ledger/Ledger.entitlements": plist(`<key>${"com.apple.security.app-sandbox"}</key>\n<true/>`),
    "Helper/Helper.entitlements": plist(`<key>${"com.apple.security.device.audio-input"}</key>\n<true/>`),
    "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_LSMinimumSystemVersion = 14.0;\n",
    "Ledger/App.swift": "import AppKit\nimport SwiftUI\n",
  };

  it("draws a mismatch over a pair that appears in neither entitlements file", () => {
    const root = project(MACOS_APP_AND_HELPER);
    const r = appleReport(root);
    expect(rules(root)).toEqual(["microphone-entitlement-mismatch"]);
    expect(r.structured.findings[0].message).toContain("This project declares");
    // The remedy is on the surfaces line: both files are named there, and the
    // count says two went into the union.
    expect(r.text).toContain("- Entitlements (2): `Helper/Helper.entitlements`, `Ledger/Ledger.entitlements`");
  });

  it("runs the other way too: one file's app-sandbox covers the file beside it", () => {
    const root = project(MACOS_APP_AND_HELPER);
    expect(rules(root)).not.toContain("sandbox-absent-macos");

    // The same helper alone — the sandbox entitlement gone from the tree with
    // the app that declared it — is what the rule fires on. Without this the
    // assertion above would pass on a project the rule could never reach.
    const helperAlone = project({
      "Helper/Helper.entitlements": plist(`<key>${"com.apple.security.device.audio-input"}</key>\n<true/>`),
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_LSMinimumSystemVersion = 14.0;\n",
      "Ledger/App.swift": "import AppKit\nimport SwiftUI\n",
    });
    expect(rules(helperAlone)).toContain("sandbox-absent-macos");
  });
});

describe("11. localised values, and every localisation surface", () => {
  it("does not open InfoPlist.xcstrings, a .strings file, or an .lproj directory's contents", () => {
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "InfoPlist.xcstrings": JSON.stringify({
        strings: { NSCameraUsageDescription: { localizations: { en: { stringUnit: { value: "Photos of receipts" } } } } },
      }),
      "en.lproj/InfoPlist.strings": '"NSCameraUsageDescription" = "Photos of receipts";\n',
      "Sources/V.swift": "import SwiftUI\nimport UIKit\n",
    });
    const r = appleReport(root);
    expect(r.structured.scan.filesRead).toBe(2);
    // Above the disclosure section only — the disclosure list names both files
    // deliberately, which is the whole point of the entry this demonstrates.
    const body = r.text.slice(0, r.text.indexOf("## Not visible to this audit"));
    expect(body).not.toContain("InfoPlist.xcstrings");
    expect(body).not.toContain("InfoPlist.strings");
    expect(body).toContain("- Swift source (1): `Sources/V.swift`");
  });
});

describe("12. whether the Hardened Runtime is enabled", () => {
  it("says nothing about the runtime on a macOS project that enables it in its build settings", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": "ENABLE_HARDENED_RUNTIME = YES;\n",
      "Sources/App.swift": "import AppKit\nimport SwiftUI\n",
    });
    expect(rules(root)).toEqual(["sandbox-absent-macos"]);
    const r = appleReport(root);
    const section = r.text.slice(0, r.text.indexOf("## Not visible to this audit"));
    expect(section).not.toMatch(/hardened runtime/i);
  });

  it("says nothing about the runtime on a macOS project declaring one of its exception entitlements either", () => {
    const root = project({
      "App.entitlements": plist("<key>com.apple.security.cs.disable-library-validation</key>\n<true/>"),
      "Sources/App.swift": "import AppKit\nimport SwiftUI\n",
    });
    expect(rules(root)).toEqual(["sandbox-absent-macos"]);
    const r = appleReport(root);
    const section = r.text.slice(0, r.text.indexOf("## Not visible to this audit"));
    expect(section).not.toMatch(/hardened runtime/i);
  });
});

describe("13. purpose strings, in both directions", () => {
  it("reports nothing on an iOS project that opens the camera and declares no usage description anywhere", () => {
    const root = project({
      "Info.plist": plist("<key>UILaunchStoryboardName</key>\n<string>LaunchScreen</string>"),
      "Sources/Camera.swift": [
        "import SwiftUI",
        "import AVFoundation",
        "let device = AVCaptureDevice.default(for: .video)",
        "func ask() { AVCaptureDevice.requestAccess(for: .video) { _ in } }",
      ].join("\n"),
    });
    expect(rules(root)).toEqual([]);
    expect(appleReport(root).text).toContain("**Platform: iOS**");
  });

  it("picks a usage description up out of project.pbxproj, which is where a plist-only rule would have called it missing", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": 'INFOPLIST_KEY_NSCameraUsageDescription = "Ledger photographs your receipts.";\n',
      "Sources/V.swift": "import SwiftUI\nimport UIKit\n",
    });
    const config = readAppleConfig([{
      path: "Ledger.xcodeproj/project.pbxproj",
      source: 'INFOPLIST_KEY_NSCameraUsageDescription = "Ledger photographs your receipts.";\n',
    }]);
    expect(config.keys.get("NSCameraUsageDescription")).toBe("Ledger photographs your receipts.");
    expect(rules(root)).toEqual([]);
  });
});

describe("14. every platform-scoped rule when the verdict names no platform", () => {
  const swift = 'import SwiftUI\nText("Hi").font(.system(size: 17))\nNavigationView { Text("x") }\n';

  it("runs fixed-font-size on an iOS verdict", () => {
    const root = project({
      "Info.plist": plist("<key>UILaunchStoryboardName</key>\n<string>LaunchScreen</string>"),
      "Sources/V.swift": swift,
    });
    expect(rules(root).sort()).toEqual(["fixed-font-size", "navigationview-deprecated"]);
  });

  it("stays silent when there is no signal at all, and the unscoped rule still fires", () => {
    const root = project({ "Sources/V.swift": swift });
    expect(rules(root)).toEqual(["navigationview-deprecated"]);
    expect(appleReport(root).text).toContain("**Every platform-scoped rule stayed silent**");
  });

  it("stays silent when the signals point both ways, and says the verdict conflicted", () => {
    const root = project({
      "Info.plist": plist("<key>UILaunchStoryboardName</key>\n<string>LaunchScreen</string>\n<key>LSMinimumSystemVersion</key>\n<string>14.0</string>"),
      "Sources/V.swift": swift,
    });
    expect(rules(root)).toEqual(["navigationview-deprecated"]);
    expect(appleReport(root).text).toContain("**Platform: not determined** — the signals pointed both ways");
  });
});

describe("15. whether a Swift file is missing something", () => {
  it("fires symbol-as-only-button-label on a Button whose parent VStack carries the label", () => {
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Sources/V.swift": [
        "import SwiftUI",
        "var body: some View {",
        "  VStack {",
        '    Button(action: refresh) { Image(systemName: "arrow.clockwise") }',
        "  }",
        '  .accessibilityLabel("Refresh the ledger")',
        "  .accessibilityElement(children: .combine)",
        "}",
      ].join("\n"),
    });
    expect(ruleLines(root)).toEqual(["symbol-as-only-button-label@4"]);
    // …and the finding it emits is a risk to check, never a missing-label report.
    const f = appleReport(root).structured.findings[0];
    expect(f.message).toContain("this is a risk to check, not a fault found");
    expect(f.severity).toBe("info");
  });

  it("reports no absence in Swift at all — a file with no accessibility or Reduce Motion handling draws nothing", () => {
    const root = project({
      "Info.plist": plist("<key>UILaunchStoryboardName</key>\n<string>LaunchScreen</string>"),
      "Sources/V.swift": [
        "import SwiftUI",
        "struct Spinner: View {",
        "  var body: some View {",
        "    Circle().rotationEffect(.degrees(360)).animation(.linear.repeatForever(), value: true)",
        "  }",
        "}",
      ].join("\n"),
    });
    expect(rules(root)).toEqual([]);
  });
});

describe("16. a Swift file whose comment masking went wrong", () => {
  it("finds nothing in a file whose live NavigationView was masked by an interpolated comment marker", () => {
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Sources/V.swift": [
        "import SwiftUI",
        'let label = "a\\(f("open /*")) still"',
        "struct V: View {",
        "  var body: some View {",
        '    NavigationView { Text("x") }',
        "  }",
        "}",
        "/* an ordinary comment */",
        "let after = 1",
      ].join("\n"),
    });
    expect(rules(root)).toEqual([]);

    // The identical file without that one line reports the NavigationView, so
    // the silence above is the masking gap and not an unrelated mismatch.
    const control = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Sources/V.swift": [
        "import SwiftUI",
        "struct V: View {",
        "  var body: some View {",
        '    NavigationView { Text("x") }',
        "  }",
        "}",
        "/* an ordinary comment */",
        "let after = 1",
      ].join("\n"),
    });
    expect(rules(control)).toEqual(["navigationview-deprecated"]);
  });
});

describe("17. the shapes the Swift rules do not match", () => {
  it("draws nothing from an iOS file carrying all five of them", () => {
    const root = project({
      "Info.plist": plist("<key>UILaunchStoryboardName</key>\n<string>LaunchScreen</string>"),
      "Sources/V.swift": [
        "import SwiftUI",
        "import UIKit",
        "let f = UIFont.systemFont(ofSize: 17)",
        'let g = Font.custom("Inter", fixedSize: 17)',
        'let c = Color(hex: "#FF3B30")',
        'let symbol = isOn ? "pause.fill" : "play.fill"',
        "let b = Button(action: toggle) { Image(systemName: symbol) }",
        "let d = Button(action: toggle) { content }",
      ].join("\n"),
    });
    expect(appleReport(root).text).toContain("**Platform: iOS**");
    expect(rules(root)).toEqual([]);
  });

  // The fifth shape on its own, against the control that separates it from a
  // rule that simply never matches anything: the identical symbol written
  // inline in the label closure is reported, and reaching it through a
  // `content` property is not. This is the shape `recipes/card/swiftui.swift`
  // uses, which is why the recipes exercise this rule once rather than twice.
  it("reads a label closure written inline and not one reached through an identifier", () => {
    const view = (label: string) => [
      "import SwiftUI",
      "struct V: View {",
      "  var body: some View { Button(action: {}) { " + label + " } }",
      '  private var content: some View { Image(systemName: "gear") }',
      "}",
    ].join("\n");
    expect(appleSwiftRules([{ path: "V.swift", source: view("content") }], IOS)).toEqual([]);
    expect(appleSwiftRules([{ path: "V.swift", source: view('Image(systemName: "gear")') }], IOS)
      .map((f) => `${f.rule}@${f.line}`)).toEqual(["symbol-as-only-button-label@3"]);
  });
});

describe("18. the difference between code and a string that looks like code", () => {
  it("reports NavigationView written inside a string literal", () => {
    const root = project({
      "Info.plist": plist("<key>CFBundleName</key>\n<string>Ledger</string>"),
      "Sources/V.swift": 'import SwiftUI\nText("NavigationView is deprecated")\n',
    });
    expect(ruleLines(root)).toEqual(["navigationview-deprecated@2"]);
  });
});

describe("19. what a colorset resolves to", () => {
  it("passes a colorset whose declared dark value is identical to its light one", () => {
    const components = { red: "0.900", green: "0.900", blue: "0.900", alpha: "1.000" };
    const root = project({
      "Assets.xcassets/Brand.colorset/Contents.json": JSON.stringify({
        colors: [
          { idiom: "universal", color: { "color-space": "srgb", components } },
          { idiom: "universal", appearances: [{ appearance: "luminosity", value: "dark" }], color: { "color-space": "srgb", components } },
        ],
      }),
    });
    expect(rules(root)).toEqual([]);
  });
});

describe("20. a key spelling this reader has not been taught", () => {
  // GENERATE_INFOPLIST_FILE = YES has been Xcode's default since 13, so this is
  // the commonest input this audit will ever be pointed at: no Info.plist at
  // all, every key suffixed, and a SwiftUI-lifecycle app with no import UIKit
  // to fall back on. Before the suffixed families were matched it came back
  // `signals: []` and silenced every platform-scoped rule.
  const DEFAULT_PBXPROJ = [
    "// !$*UTF8*$!",
    "{ buildSettings = {",
    "    GENERATE_INFOPLIST_FILE = YES;",
    "    INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;",
    "    INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;",
    "    INFOPLIST_KEY_UILaunchScreen_Generation = YES;",
    '    INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft";',
    '    INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait";',
    "  };",
    "}",
  ].join("\n");

  it("reads a default Xcode iOS project as iOS, with no Info.plist and no import UIKit anywhere", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": DEFAULT_PBXPROJ,
      "Ledger/LedgerApp.swift": "import SwiftUI\n@main struct LedgerApp: App {\n  var body: some Scene { WindowGroup { ContentView() } }\n}\n",
      "Ledger/ContentView.swift": 'import SwiftUI\nstruct ContentView: View {\n  var body: some View { Text("Hi").font(.system(size: 17)) }\n}\n',
      "Ledger/Assets.xcassets/AccentColor.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal" }], info: { author: "xcode", version: 1 } }),
    });
    const r = appleReport(root);
    expect(r.text).toContain("**Platform: iOS**");
    expect(rules(root)).toEqual(["fixed-font-size"]);
    // Both suffixed families reached the verdict, not just one.
    expect(r.text).toContain("`UIRequiresFullScreen or UISupportedInterfaceOrientations key present`");
    expect(r.text).toContain("`UILaunchScreen / UILaunchStoryboardName key present`");
  });

  it("produces no signal at all from an iOS-shaped key outside that set", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj":
        "INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;\nINFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;\n",
      "Ledger/ContentView.swift": 'import SwiftUI\nText("Hi").font(.system(size: 17))\n',
    });
    expect(appleReport(root).text).toContain("**Platform: not determined**");
    expect(rules(root)).toEqual([]);
  });

  // The asymmetry a reader would otherwise guess backwards: the macOS template
  // writes a real .entitlements, so macOS was never the silent one.
  it("reads a default macOS project as macOS off its template entitlements", () => {
    const root = project({
      "Ledger/Ledger.entitlements": plist("<key>com.apple.security.app-sandbox</key>\n<true/>\n<key>com.apple.security.files.user-selected.read-only</key>\n<true/>"),
      "Ledger/LedgerApp.swift": "import SwiftUI\n@main struct LedgerApp: App {\n  var body: some Scene { WindowGroup { ContentView() } }\n}\n",
    });
    expect(appleReport(root).text).toContain("**Platform: macOS**");
  });
});

describe("21. a colorset that declares no colour value", () => {
  it("draws nothing on Xcode's default AccentColor placeholder", () => {
    const root = project({
      "Assets.xcassets/AccentColor.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal" }], info: { author: "xcode", version: 1 } }),
    });
    expect(rules(root)).toEqual([]);
    // It was read, and says so — it simply contributed no colorset.
    expect(appleReport(root).text).toContain("- Asset catalog colorsets (1): `Assets.xcassets/AccentColor.colorset/Contents.json`");
  });

  it("does not count an empty `color` array as a declared colour", () => {
    const root = project({
      "Assets.xcassets/Odd.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal", color: [] }] }),
    });
    expect(rules(root)).toEqual([]);
  });

  it("still reports a colorset beside it that does declare one", () => {
    const root = project({
      "Assets.xcassets/AccentColor.colorset/Contents.json": JSON.stringify({ colors: [{ idiom: "universal" }] }),
      "Assets.xcassets/Brand.colorset/Contents.json": JSON.stringify({
        colors: [{ idiom: "universal", color: { components: { red: "0.1", green: "0.2", blue: "0.3", alpha: "1" } } }],
      }),
    });
    const r = appleReport(root);
    expect(rules(root)).toEqual(["colorset-no-dark-variant"]);
    expect(r.structured.findings[0].message).toContain("Brand.colorset");
  });
});

describe("22. a path this process could not open", () => {
  it.skipIf(asRoot)("names the directory it could not list, and audits nothing under it", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n",
      "Ledger/ContentView.swift": "import SwiftUI\nimport UIKit\n",
      "Secret/Hidden.swift": 'import SwiftUI\nNavigationView { Text("x") }\n',
    });
    chmodSync(join(root, "Secret"), 0o000);
    try {
      const r = appleReport(root);
      expect(r.structured.scan.unreadable).toEqual(["Secret"]);
      expect(r.structured.findings).toEqual([]);
      expect(r.text).toContain("**Could not be opened at all:** `Secret`");
      expect(r.text).toContain("`scan.unreadable` carries all 1.");
    } finally {
      chmodSync(join(root, "Secret"), 0o755);
    }
  });
});

describe("23. a file that is not UTF-8 text", () => {
  it("reads a UTF-16 Swift file, finds nothing in it, and records the skip nowhere", () => {
    const root = project({
      "Ledger.xcodeproj/project.pbxproj": "INFOPLIST_KEY_UILaunchScreen_Generation = YES;\n",
      "Sources/Utf8.swift": 'import SwiftUI\nNavigationView { Text("y") }\n',
    });
    writeFileSync(join(root, "Sources", "Utf16.swift"), Buffer.from('import SwiftUI\nNavigationView { Text("x") }\n', "utf16le"));
    const r = appleReport(root);
    expect(r.structured.findings.map((f) => f.file)).toEqual(["Sources/Utf8.swift"]);
    // Read in every register, invisible in every register but the finding it
    // did not produce.
    expect(r.text).toContain("`Sources/Utf16.swift`");
    expect(r.structured.scan.filesRead).toBe(3);
    expect(r.structured.scan.unreadable).toEqual([]);
    expect(r.structured.scan.skippedLarge).toEqual([]);
  });
});

// The form, not the effort. v0.24.0 shipped six false absence claims and every
// round that corrected them by hand wrote more; the sentence form is what is
// enforced. These are the patterns `tests/integrity.test.ts` applies to the
// Apple documents, applied here to the disclosure list and to the report's own
// prose, plus two forms specific to this list: a claim about the project rather
// than about what was read, and a claim about how an Apple page renders.
describe("the disclosure list never states an absence in the unbounded form", () => {
  const ABSENCE_VERBS = [
    "publish", "publishes", "published", "assign", "assigns", "assigned",
    "define", "defines", "defined", "state", "states", "stated",
    "document", "documents", "documented", "specify", "specifies", "specified",
    "give", "gives", "given", "gave", "list", "lists", "listed",
    "provide", "provides", "provided", "carry", "carries", "carried",
    "name", "names", "named", "say", "says", "said", "ship", "ships", "shipped",
    "mention", "mentions", "mentioned", "record", "records", "recorded",
    "declare", "declares", "declared",
  ].join("|");
  const NEW_SUBJECT = [
    "\\.", "\\bthe\\b", "\\bits\\b", "\\ba\\b", "\\ban\\b", "\\bthis\\b", "\\bthat\\b",
    "\\bthese\\b", "\\bthose\\b", "\\bHIG\\b", "\\bpage\\b", "\\btable\\b",
    "\\bsection\\b", "\\bguidelines\\b",
  ].join("|");
  const GAP = `(?:(?!${NEW_SUBJECT})[^.\\n]){0,80}?`;
  const APPLE = "(?<![\\w-])Apple(?![\\w-])";

  const FORMS: Array<{ name: string; re: RegExp }> = [
    { name: "Apple as the subject of a negated publication verb", re: new RegExp(`${APPLE}${GAP}\\b(?:${ABSENCE_VERBS})\\s+(?:no|none|nothing|nowhere)\\b`, "g") },
    { name: "Apple does not <publication verb>", re: new RegExp(`${APPLE}${GAP}\\b(?:does\\s+not|doesn't|do\\s+not|don't)\\s+(?:${ABSENCE_VERBS})\\b`, "g") },
    { name: "<subject> never <publication verb>", re: new RegExp(`\\b\\w+\\s+never\\s+(?:${ABSENCE_VERBS})\\b`, "gi") },
    { name: "<publication verb> nowhere", re: new RegExp(`\\b(?:${ABSENCE_VERBS})\\s+(?:it\\s+|them\\s+)?nowhere\\b`, "gi") },
    { name: "any/every/no Apple page", re: /\b(?:any|every|no|all)\s+Apple\s+(?:page|pages|surface|surfaces|document|documents|documentation|source|sources)\b(?!\s+(?:searched|checked|read|fetched|listed))/gi },
    // Specific to this list: an absence claim whose subject is the audited
    // project rather than the files that were read. "The project does not
    // declare a dark variant" is unfalsifiable from a partial scan; "no dark
    // variant was found in the colorsets read here" is a claim about the search.
    { name: "an absence claimed of the project rather than of what was read", re: /\b(?:the|this|your)\s+(?:project|app|target|codebase)\s+(?:does\s+not|doesn't|has\s+no|never|declares\s+no|carries\s+no)\b/gi },
    // Carried over from Task 4: this module reads JSON and has no standing to
    // describe what a reader sees on Apple's rendered page.
    { name: "a claim about how an Apple page renders", re: /\binvisible in the rendered\b|\blives only in\b|\bonly in the (?:page's )?JSON\b|\bnot (?:shown|visible) (?:in|on) the (?:rendered )?page\b/gi },
  ];

  it.each(FORMS)("rejects $name", ({ re }) => {
    const offenders: string[] = [];
    for (const entry of APPLE_NOT_VISIBLE) {
      const stripped = entry.replace(/\*\*/g, "").replace(/\*/g, "");
      for (const m of stripped.matchAll(re)) offenders.push(`${m[0]} — in: ${entry.slice(0, 70)}…`);
    }
    expect(offenders).toEqual([]);
  });

  it("holds the preamble, the closing and the report's own prose to the same forms", () => {
    const r = appleReport(join(FIXTURES, "ios-findings"));
    const prose = [APPLE_PREAMBLE, APPLE_CLOSING, r.text.slice(0, r.text.indexOf("## Not visible to this audit"))]
      .join("\n").replace(/\*\*/g, "").replace(/\*/g, "");
    const offenders: string[] = [];
    for (const { re } of FORMS) for (const m of prose.matchAll(re)) offenders.push(m[0]);
    expect(offenders).toEqual([]);
  });

  // The scoped form is the one this list is supposed to be written in, so it
  // has to actually be present rather than merely not-absent.
  it("writes the scoped form, naming what was read", () => {
    const joined = APPLE_NOT_VISIBLE.join(" ");
    expect(joined).toMatch(/what was read/i);
    expect(joined).toMatch(/absent from this audit's view of the project rather than from the project/i);
    expect(joined).toMatch(/read here/i);
  });

  it("never claims a shipped, signed or reviewed outcome", () => {
    const forbidden = /\b(will be rejected|app review will|fails notarization|will fail notarization|guarantee)\b/i;
    for (const entry of APPLE_NOT_VISIBLE) expect(forbidden.test(entry), entry.slice(0, 60)).toBe(false);
  });
});
