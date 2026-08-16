import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { appleConfigRules } from "../dist/apple.js";
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
});

describe("hardened-runtime-absent-macos", () => {
  it("stays silent when the platform is unknown", () => {
    expect(ids(appleConfigRules(base))).not.toContain("hardened-runtime-absent-macos");
  });

  it("stays silent on iOS", () => {
    expect(ids(appleConfigRules({ ...base, platform: IOS }))).not.toContain("hardened-runtime-absent-macos");
  });

  it("fires on a macOS project with neither the sandbox nor any hardened-runtime exception", () => {
    expect(ids(appleConfigRules({ ...base, platform: MACOS }))).toContain("hardened-runtime-absent-macos");
  });

  // A `com.apple.security.cs.*` entitlement is meaningless unless the Hardened
  // Runtime is on, so its presence is positive evidence of the capability —
  // the one thing about the capability this input can actually show.
  it("stays silent when a hardened-runtime exception entitlement is present", () => {
    const cfg = withConfig({ entitlements: new Set(["com.apple.security.cs.allow-jit"]) });
    expect(ids(appleConfigRules({ ...cfg, platform: MACOS }))).not.toContain("hardened-runtime-absent-macos");
  });

  // Apple: "you aren't required to notarize software that you distribute
  // through the Mac App Store" — and the Hardened Runtime is a notarization
  // prerequisite, so a sandboxed project has a documented reason for silence.
  it("stays silent when the App Sandbox entitlement points at the Mac App Store channel", () => {
    const cfg = withConfig({ entitlements: new Set(["com.apple.security.app-sandbox"]) });
    expect(ids(appleConfigRules({ ...cfg, platform: MACOS }))).not.toContain("hardened-runtime-absent-macos");
  });

  // The Hardened Runtime has no entitlement of its own — it is a build
  // capability. The finding must not claim to have read whether it is enabled.
  it("states that the capability itself is not visible in this input", () => {
    const r = appleConfigRules({ ...base, platform: MACOS }).find((f) => f.rule === "hardened-runtime-absent-macos")!;
    expect(r.severity).toBe("info");
    expect(r.message).toContain("not an entitlement");
    expect(r.message).toContain("notariz");
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
      "hardened-runtime-absent-macos",
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
    "hardened-runtime-absent-macos": /To upload a macOS app to be notarized, you must enable the Hardened Runtime capability/i,
    "microphone-entitlement-mismatch": /Same checkbox label, two identifiers/i,
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
