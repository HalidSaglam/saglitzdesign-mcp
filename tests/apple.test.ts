import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { appleConfigRules } from "../dist/apple.js";
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
