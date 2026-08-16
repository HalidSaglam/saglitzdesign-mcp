import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { appleConfigRules, appleSwiftRules } from "../dist/apple.js";
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
