import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadKnowledge, findDoc, platformMatches } from "../dist/knowledge.js";
import { CATEGORIES, PLATFORMS, DESIGN_LANGUAGES, REVIEW_MAP, FOCUS_MAP, ROADMAPS, STALE_DAYS, APPLE_DOC_IDS, isSourceEnforced } from "../dist/catalog.js";
import { loadRecipes } from "../dist/recipes.js";
import { loadExamples } from "../dist/examples.js";
import { securityReport, HEADER_SOURCE_TOKENS, HEADER_SOURCES_SENTENCE } from "../dist/security.js";
import { liveToolNames } from "./helpers/liveServer.js";

// Structural guarantees for the curated content. These are the checks that
// would have caught the v0.14.0 bug where roadmaps referenced pattern docs by
// an id that did not exist, so those docs silently vanished from every
// roadmap and checklist without any error.

const root = join(__dirname, "..");
const docs = loadKnowledge(join(root, "knowledge"));

/** Derived, never mirrored: a hand-written copy went stale at 33 while 34 shipped,
 *  under a comment claiming another file proved it complete. Nothing did. */
const TOOL_NAMES = new Set(await liveToolNames());

/**
 * The document count, in one place. `loads every markdown document` pins it to
 * what `knowledge/` actually holds, and the README checks read it from here, so
 * a package that adds a document updates this line and nothing else — and a
 * package that loses one is told by both checks at once.
 */
const DOC_COUNT = 96;

describe("knowledge base metadata", () => {
  it("loads every markdown document", () => {
    // An equality, not a floor. The floor sat at 83 through thirteen documents
    // being added and could not have noticed one being deleted, which is the
    // failure it was written to catch.
    expect(docs.length).toBe(DOC_COUNT);
  });

  it("has unique ids", () => {
    const dupes = docs.map((d) => d.id).filter((id, i, all) => all.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("uses only declared categories", () => {
    const allowed = new Set<string>(CATEGORIES);
    const bad = docs.filter((d) => !allowed.has(d.category)).map((d) => `${d.id}:${d.category}`);
    expect(bad).toEqual([]);
  });

  it("uses only platform values the filters understand", () => {
    const concrete = new Set<string>(PLATFORMS);
    const universal = ["both", "cross-platform"];
    const bad = docs
      .filter((d) => !concrete.has(d.platform) && !universal.includes(d.platform))
      .map((d) => `${d.id}:${d.platform}`);
    expect(bad).toEqual([]);
  });

  it("gives every doc a title and an ISO `updated` date", () => {
    const bad = docs
      .filter((d) => !d.title || !/^\d{4}-\d{2}-\d{2}$/.test(d.updated))
      .map((d) => `${d.id}:${d.updated}`);
    expect(bad).toEqual([]);
  });

  it("has a staleness threshold for every category in use", () => {
    const missing = [...new Set(docs.map((d) => d.category))].filter((c) => !(c in STALE_DAYS));
    expect(missing).toEqual([]);
  });

  it("declares a security category with documents in it", () => {
    expect(CATEGORIES).toContain("security");
    const sec = docs.filter((d) => d.category === "security");
    expect(sec.length).toBeGreaterThan(0);
  });

  it("gives every category a staleness threshold", () => {
    const missing = [...CATEGORIES].filter((c) => STALE_DAYS[c] === undefined);
    expect(missing).toEqual([]);
  });
});

describe("catalogue references resolve", () => {
  it("every doc id in REVIEW_MAP exists", () => {
    const dangling: string[] = [];
    for (const [project, list] of Object.entries(REVIEW_MAP)) {
      for (const id of list) if (!findDoc(docs, id)) dangling.push(`${project} → ${id}`);
    }
    expect(dangling).toEqual([]);
  });

  it("every doc id in ROADMAPS exists", () => {
    const dangling: string[] = [];
    for (const [project, rm] of Object.entries(ROADMAPS)) {
      for (const id of rm.fullGuides) if (!findDoc(docs, id)) dangling.push(`${project}/guides → ${id}`);
      for (const phase of rm.phases) {
        for (const id of phase.docs) if (!findDoc(docs, id)) dangling.push(`${project}/${phase.title} → ${id}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("roadmap ids are canonical (resolve to themselves, no aliasing needed)", () => {
    const aliased: string[] = [];
    for (const [project, rm] of Object.entries(ROADMAPS)) {
      for (const phase of rm.phases) {
        for (const id of phase.docs) {
          const resolved = findDoc(docs, id);
          if (resolved && resolved.id !== id) aliased.push(`${project} → ${id} (real: ${resolved.id})`);
        }
      }
    }
    expect(aliased).toEqual([]);
  });

  it("every roadmap project type yields non-empty phases", () => {
    for (const [project, rm] of Object.entries(ROADMAPS)) {
      expect(rm.phases.length, project).toBeGreaterThan(0);
      for (const phase of rm.phases) {
        const resolved = phase.docs.map((id) => findDoc(docs, id)).filter(Boolean);
        expect(resolved.length, `${project} / ${phase.title}`).toBeGreaterThan(0);
      }
    }
  });

  it("every design language in the get_design_language enum exists", () => {
    const missing = DESIGN_LANGUAGES.filter((id: string) => !findDoc(docs, id));
    expect(missing).toEqual([]);
  });

  it("every FOCUS_MAP filter matches at least one doc", () => {
    for (const [focus, fn] of Object.entries(FOCUS_MAP)) {
      expect(docs.some((d) => fn(d)), focus).toBe(true);
    }
  });

  it("no knowledge doc is orphaned from every checklist and roadmap", () => {
    const referenced = new Set<string>();
    const note = (id: string) => {
      const d = findDoc(docs, id);
      if (d) referenced.add(d.id);
    };
    for (const list of Object.values(REVIEW_MAP)) list.forEach(note);
    for (const rm of Object.values(ROADMAPS)) {
      rm.fullGuides.forEach(note);
      rm.phases.forEach((p) => p.docs.forEach(note));
    }
    // Docs with their own dedicated surface don't need a roadmap slot:
    // seo/geo are served wholesale by seo_geo_guide, and every design language
    // is addressable by name through get_design_language.
    const languages = new Set<string>(DESIGN_LANGUAGES);
    const exempt = (d: (typeof docs)[number]) =>
      d.category === "seo" || d.category === "geo" || languages.has(d.id);
    const orphans = docs.filter((d) => !referenced.has(d.id) && !exempt(d)).map((d) => d.id);
    expect(orphans).toEqual([]);
  });
});

describe("security documents are reachable from the workflows", () => {
  it("puts security in every web-facing review checklist", () => {
    for (const key of ["website", "landing-page", "dashboard"]) {
      const list = REVIEW_MAP[key] ?? [];
      const hasSecurity = list.some((id) => docs.find((d) => d.id === id)?.category === "security");
      expect(`${key}:${hasSecurity}`).toBe(`${key}:true`);
    }
  });

  it("puts security in every web-facing roadmap", () => {
    for (const key of ["website", "landing-page", "saas-web-app"]) {
      const ids = (ROADMAPS[key]?.phases ?? []).flatMap((p) => p.docs);
      const hasSecurity = ids.some((id) => docs.find((d) => d.id === id)?.category === "security");
      expect(`${key}:${hasSecurity}`).toBe(`${key}:true`);
    }
  });

  it("references all five security documents, not just the one that satisfies the orphan check", () => {
    const referenced = new Set<string>();
    for (const list of Object.values(REVIEW_MAP)) list.forEach((id) => referenced.add(id));
    for (const rm of Object.values(ROADMAPS)) {
      rm.fullGuides.forEach((id) => referenced.add(id));
      rm.phases.forEach((p) => p.docs.forEach((id) => referenced.add(id)));
    }
    const unreferenced = docs
      .filter((d) => d.category === "security" && !referenced.has(d.id))
      .map((d) => d.id);
    expect(unreferenced).toEqual([]);
  });
});

describe("cross-links inside the knowledge base resolve", () => {
  it("every [[wiki-link]] points at a real doc", () => {
    const broken: string[] = [];
    for (const doc of docs) {
      for (const m of doc.body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
        if (!findDoc(docs, m[1])) broken.push(`${doc.id} → [[${m[1]}]]`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every get_design_doc(\"id\") suggestion in a doc resolves", () => {
    const broken: string[] = [];
    for (const doc of docs) {
      for (const m of doc.body.matchAll(/get_design_doc\("([a-z0-9-]+)"\)/g)) {
        if (!findDoc(docs, m[1])) broken.push(`${doc.id} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("id + platform resolution", () => {
  it("resolves platform-prefixed pattern docs from their bare name", () => {
    expect(findDoc(docs, "onboarding-paywall")?.id).toBe("mobile-onboarding-paywall");
    expect(findDoc(docs, "hero-sections")?.id).toBe("web-hero-sections");
    expect(findDoc(docs, "dashboards")?.id).toBe("web-dashboards");
  });

  it("resolves an exact id unchanged, and is case-insensitive", () => {
    expect(findDoc(docs, "buttons")?.id).toBe("buttons");
    expect(findDoc(docs, "Buttons")?.id).toBe("buttons");
  });

  it("returns undefined for a genuinely unknown id", () => {
    expect(findDoc(docs, "no-such-doc-xyz")).toBeUndefined();
  });

  it("treats cross-platform docs as matching every platform filter", () => {
    const crossPlatform = docs.filter((d) => d.platform === "cross-platform");
    expect(crossPlatform.length).toBeGreaterThan(0);
    for (const d of crossPlatform) {
      for (const p of PLATFORMS) expect(platformMatches(d.platform, p), `${d.id}/${p}`).toBe(true);
    }
  });

  it("still excludes a concrete platform that does not match", () => {
    expect(platformMatches("mobile", "web")).toBe(false);
    expect(platformMatches("web", "web")).toBe(true);
    expect(platformMatches("mobile", undefined)).toBe(true);
  });
});

describe("bundled assets", () => {
  it("loads every component recipe with at least one stack", () => {
    const recipes = loadRecipes(join(root, "recipes"));
    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) expect(Object.keys(r.stacks).length, r.component).toBeGreaterThan(0);
  });

  it("gives every design example a pattern and a source link", () => {
    const examples = loadExamples(join(root, "knowledge", "examples"));
    expect(examples.length).toBeGreaterThan(0);
    const bad = examples.filter((e) => !e.pattern || !e.mobbin_url).map((e) => e.id);
    expect(bad).toEqual([]);
  });
});

describe("skills distribution", () => {
  // skills/ ships separately via `npx skills add` and is not exercised by the
  // server, so nothing else would notice it drifting away from the tool set.
  const skillsDir = join(root, "skills");
  const names = readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const read = (n: string) => readFileSync(join(skillsDir, n, "SKILL.md"), "utf8");

  it("ships every skill with valid frontmatter whose name matches its directory", () => {
    expect(names.length).toBeGreaterThanOrEqual(5);
    for (const n of names) {
      const body = read(n);
      expect(body.startsWith("---\n"), n).toBe(true);
      expect(body.match(/^name: (.+)$/m)?.[1], n).toBe(n);
      const description = body.match(/^description: (.+)$/m)?.[1] ?? "";
      expect(description.length, `${n}: description`).toBeGreaterThan(40);
    }
  });

  it("never points at a tool that does not exist", () => {
    const phantom: string[] = [];
    for (const n of names) {
      for (const m of read(n).matchAll(/`([a-z][a-z0-9_]{4,})`/g)) {
        if (/^(get|search|list|design|audit|generate|create|suggest|fix|compare|seo)_/.test(m[1]) && !TOOL_NAMES.has(m[1])) {
          phantom.push(`${n} → ${m[1]}`);
        }
      }
    }
    expect(phantom).toEqual([]);
  });

  it("lists every skill in the skills README", () => {
    const readme = readFileSync(join(skillsDir, "README.md"), "utf8");
    const missing = names.filter((n) => !readme.includes(n));
    expect(missing).toEqual([]);
  });

  it("counts every skill directory, not at least five of them", () => {
    const rootReadme = readFileSync(join(root, "README.md"), "utf8");
    const skillsReadme = readFileSync(join(skillsDir, "README.md"), "utf8");
    // A floor passed while the root README said five and six shipped. An
    // equality is the only shape that notices a seventh skill being added.
    for (const [label, text] of [["README.md", rootReadme], ["skills/README.md", skillsReadme]]) {
      const stated = /\b(?:(\d+)|(Five|Six|Seven|Eight|Nine|Ten))\s+skills\b/i.exec(text);
      expect(stated, `${label} states no skill count`).toBeTruthy();
      const WORDS: Record<string, number> = { five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const claimed = stated![1] ? Number(stated![1]) : WORDS[stated![2].toLowerCase()];
      expect(claimed, `${label} skill count`).toBe(names.length);
    }
  });

  it("names every skill in both READMEs", () => {
    for (const [label, path] of [["README.md", join(root, "README.md")], ["skills/README.md", join(skillsDir, "README.md")]]) {
      const text = readFileSync(path, "utf8");
      expect(names.filter((n) => !text.includes(n)), label).toEqual([]);
    }
  });

  it("states document and tool counts that match the live registry", () => {
    const texts: [string, string][] = [
      ["README.md", readFileSync(join(root, "README.md"), "utf8")],
      ["skills/README.md", readFileSync(join(skillsDir, "README.md"), "utf8")],
    ];
    for (const [label, text] of texts) {
      for (const m of text.matchAll(/\b(\d+)\s+(documents?|knowledge documents?|tools?)\b/g)) {
        const expected = /tool/.test(m[2]) ? TOOL_NAMES.size : DOC_COUNT;
        expect(Number(m[1]), `${label}: "${m[0]}"`).toBe(expected);
      }
    }
  });
});

describe("release metadata is in sync", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));

  it("server.json carries the package.json version everywhere", () => {
    expect(manifest.version).toBe(pkg.version);
    for (const p of manifest.packages ?? []) expect(p.version, p.identifier).toBe(pkg.version);
  });

  it("server.json identifies the same npm package, and mcpName matches", () => {
    expect(manifest.packages?.[0]?.identifier).toBe(pkg.name);
    expect(pkg.mcpName).toBe(manifest.name);
  });

  it("keeps the registry description within the 100-char limit", () => {
    expect(manifest.description.length).toBeLessThanOrEqual(100);
  });
});

// Security guidance is only worth shipping if it is traceable to a standard or a
// first-party vendor doc. Blog-tier sourcing is how confidently-wrong security
// advice spreads, so the allowlist is enforced rather than merely documented.
//
// The allowlist's own comment always said "a standard or a first-party vendor
// doc". The list never said which a given host was, so a host that is neither
// could sit in it unnoticed, and hosts that plainly qualified were missing
// because the list was written for one category. Naming the tiers makes both
// visible, and lets `security` hold a stricter line than the rest.
//
// `standard` holds standards bodies and regulators, plus the platform-neutral
// references that track them rather than any one vendor's product — MDN,
// web.dev, caniuse. `vendor` holds first-party documentation of the system
// being described, including a browser vendor's own docs for its own engine.
// MDN is platform-neutral and stays in `standard`; hacks.mozilla.org is
// Mozilla's own engineering blog about Firefox, so it sits in `vendor` for the
// same reason webkit.org and developer.chrome.com do.
//
// support.apple.com is Apple's end-user documentation of Apple's own systems,
// which is what `vendor` is defined to hold — the audience differs from
// developer.apple.com, the first-party-ness does not. It earns its place: the
// only source for a Mac keyboard shortcut Apple ships but never states in the
// HIG (Option-Command-S for the Finder sidebar) is an end-user article, and a
// rule that reads only the HIG would tell an app that binds it that it invented
// the key. Note that a source living in prose because no tier admits it is a
// source no assertion can check — frontmatter is what these checks see.
const SOURCE_TIERS = {
  standard: new Set([
    "w3.org", "w3c.github.io", "whatwg.org", "html.spec.whatwg.org",
    "datatracker.ietf.org", "rfc-editor.org", "developer.mozilla.org",
    "web.dev", "caniuse.com",
    "owasp.org", "cheatsheetseries.owasp.org",
    "genai.owasp.org", "fidoalliance.org", "passkeys.dev",
    "edpb.europa.eu", "ico.org.uk", "kvkk.gov.tr", "eur-lex.europa.eu",
    "cppa.ca.gov",
  ]),
  vendor: new Set([
    "developer.apple.com", "apple.com", "support.apple.com",
    "developer.chrome.com", "developers.google.com", "webkit.org",
    "hacks.mozilla.org",
    "nextjs.org", "docs.astro.build", "svelte.dev", "vite.dev",
  ]),
  research: new Set([
    "nngroup.com", "baymard.com", "lawsofux.com",
  ]),
} as const;

const tierOf = (host: string): keyof typeof SOURCE_TIERS | null => {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const [tier, hosts] of Object.entries(SOURCE_TIERS)) {
    if (hosts.has(h)) return tier as keyof typeof SOURCE_TIERS;
  }
  return null;
};

/**
 * The one operation in this file that can *throw* rather than fail. 33 sources
 * across 20 documents are not URLs at all — whole `book`, `craft`, `process`
 * and `marketing` categories cite book titles like "Breakthrough Advertising
 * (Eugene Schwartz)" — and `new URL(...)` on one of those raises a TypeError
 * that aborts the run and names neither the document nor the source. None of
 * those documents is in the Apple or security sets today, so nothing throws;
 * that is one `category:` or `APPLE_DOC_IDS` edit away from being untrue, and
 * the failure it produces would be a stack trace rather than a finding.
 *
 * So every check that reads a source goes through here and gets `null` for a
 * source it cannot parse, which the caller reports as a named offender.
 */
const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

describe("the source tiers", () => {
  it("puts every host in exactly one tier", () => {
    const seen = new Map<string, string[]>();
    for (const [tier, hosts] of Object.entries(SOURCE_TIERS)) {
      for (const h of hosts) seen.set(h, [...(seen.get(h) ?? []), tier]);
    }
    expect([...seen].filter(([, tiers]) => tiers.length > 1)).toEqual([]);
  });

  it("resolves a host with or without its www prefix", () => {
    expect(tierOf("developer.apple.com")).toBe("vendor");
    expect(tierOf("www.nngroup.com")).toBe("research");
    expect(tierOf("example.invalid")).toBeNull();
  });

  it("resolves a host regardless of case", () => {
    expect(tierOf("DEVELOPER.APPLE.COM")).toBe("vendor");
  });

  it("keeps security documents on standard and vendor sources only", () => {
    const offenders: string[] = [];
    for (const d of docs.filter((x) => x.category === "security")) {
      for (const url of d.sources ?? []) {
        const host = hostOf(url);
        if (host === null) {
          offenders.push(`${d.id}: unparseable source ${url}`);
          continue;
        }
        const tier = tierOf(host);
        if (tier !== "standard" && tier !== "vendor") offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// The Apple guides make platform claims — bar heights, adoption rules, what a
// system API does — that only Apple can settle. A blog restating Apple is one
// transcription error away from being wrong, and nothing downstream can tell the
// difference, so these documents are held to Apple's own pages plus the tiers.
// Tasks adding further Apple documents add their ids to that list — and `covers
// every Apple design-language document` below fails until they do. The list is
// pinned from both sides: it may only grow (`never enforces fewer Apple
// documents`), and every id in it must still match the predicate (`keeps every
// listed document inside the predicate`), so enforcement cannot be dropped by
// editing frontmatter.
//
// It is imported from `src/catalog.ts` rather than declared here because the
// server prints which side of the boundary each document sits on, and two
// definitions of "enforced" would drift apart silently.

/**
 * What makes a document Apple's to answer for, derived from the document rather
 * than from the list. Anchoring the membership check to this is the whole point:
 * a check that reads APPLE_DOC_IDS and compares it back to APPLE_DOC_IDS passes
 * no matter which id you delete, so it cannot notice a document quietly leaving
 * enforcement — which is exactly the failure the list exists to prevent.
 */
const isAppleDoc = (d: (typeof docs)[number]) =>
  d.category === "design-language" && (d.tags ?? []).includes("apple");

describe("Apple documents are sourced to Apple", () => {
  const appleDocs = () => docs.filter((d) => APPLE_DOC_IDS.includes(d.id));

  it("names an id that exists for every entry", () => {
    const phantom = APPLE_DOC_IDS.filter((id) => !docs.some((d) => d.id === id));
    expect(phantom).toEqual([]);
  });

  it("covers every Apple design-language document", () => {
    const unenforced = docs.filter(isAppleDoc).filter((d) => !APPLE_DOC_IDS.includes(d.id));
    expect(unenforced.map((d) => d.id)).toEqual([]);
  });

  // `covers every Apple design-language document` is one-sided: it walks from the
  // predicate to the list, so it only notices a document the predicate still
  // claims. Delete a document's `apple` tag and the predicate stops claiming it,
  // and that check goes quiet — delete the id too and every check goes quiet,
  // because both sides of the comparison shrank together. The two assertions
  // below close each direction.
  //
  // Round-trip: every listed id must still satisfy the predicate. This is what
  // fails when a tag is removed on its own — the id stays, the predicate drops it,
  // and the disagreement is now visible instead of silent.
  it("keeps every listed document inside the predicate that defines them", () => {
    const escaped = APPLE_DOC_IDS
      .map((id) => docs.find((d) => d.id === id))
      .filter((d): d is (typeof docs)[number] => Boolean(d))
      .filter((d) => !isAppleDoc(d))
      .map((d) => `${d.id} (category: ${d.category}, tags: ${(d.tags ?? []).join("|")})`);
    expect(escaped).toEqual([]);
  });

  // Floor: enforcement may grow, never shrink. This is what fails when a tag and
  // its id are removed together — the only mutation both other checks survive,
  // since it leaves nothing on either side to disagree about. Raise the number
  // when a task adds a document; never lower it to make a suite pass.
  it("never enforces fewer Apple documents than it does today", () => {
    expect(APPLE_DOC_IDS.length).toBeGreaterThanOrEqual(6);
  });

  it("cites no source outside the tiers", () => {
    const offenders: string[] = [];
    for (const d of appleDocs()) {
      for (const url of d.sources ?? []) {
        const host = hostOf(url);
        if (host === null) offenders.push(`${d.id}: unparseable source ${url}`);
        else if (tierOf(host) === null) offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("carries at least one developer.apple.com source each", () => {
    const thin = appleDocs()
      .filter((d) => !(d.sources ?? []).some((u) => hostOf(u) === "developer.apple.com"))
      .map((d) => d.id);
    expect(thin).toEqual([]);
  });

  it("cites at least three sources each", () => {
    expect(appleDocs().filter((d) => (d.sources ?? []).length < 3).map((d) => d.id)).toEqual([]);
  });

  // The accessibility document is what E2's rules will cite when they flag a
  // fixed font size, an unlabelled icon button, an undersized hit region or an
  // ungated animation. A rule that cites a document which no longer makes the
  // claim is worse than no rule, so the four subjects are pinned here.
  it("apple-accessibility states the Dynamic Type and tap-target facts E2 will cite", () => {
    const d = docs.find((x) => x.id === "apple-accessibility");
    expect(d, "document is missing").toBeDefined();
    const body = d!.body.toLowerCase();
    for (const term of ["dynamic type", "voiceover", "reduce motion", "contrast"]) {
      expect(body, `does not mention ${term}`).toContain(term);
    }
  });

  // The macOS guide is what E2's platform-fit rules will cite when they flag an
  // iOS-shaped app shipped on the Mac — no menu bar commands, no keyboard
  // shortcuts, a sheet where a window belongs. Pinning the subjects here means a
  // rule can never cite a document that has stopped naming what it flags.
  it("macos-app-design names the platform-fit subjects E2 will cite", () => {
    const d = docs.find((x) => x.id === "macos-app-design");
    expect(d, "document is missing").toBeDefined();
    const body = d!.body.toLowerCase();
    for (const term of ["menu bar", "toolbar", "keyboard shortcut", "window", "sidebar"]) {
      expect(body, `does not mention ${term}`).toContain(term);
    }
  });

  // A "hardcoded string" rule written from web instinct would flag `Text("Hello")`
  // — which SwiftUI already localizes, because the literal becomes a
  // LocalizedStringKey. The myth-check is the document E2 has to read before
  // writing that rule, so the term it turns on is pinned.
  it("ios-app-design records the localization myth-check", () => {
    const d = docs.find((x) => x.id === "ios-app-design");
    expect(d, "document is missing").toBeDefined();
    expect(d!.body).toMatch(/LocalizedStringKey/);
  });

  // Same contract for the shipping document: E2's shipping rules will match on
  // the literal key and entitlement names it publishes, so a rule citing this
  // doc must be able to find the subject it names.
  it("apple-shipping-readiness names the plist and entitlement keys E2 will cite", () => {
    const d = docs.find((x) => x.id === "apple-shipping-readiness");
    expect(d, "document is missing").toBeDefined();
    for (const key of ["Info.plist", "entitlement", "sandbox", "icon"]) {
      expect(d!.body.toLowerCase(), `does not mention ${key}`).toContain(key.toLowerCase());
    }
  });
});

// This package has published five false absence claims, and the last two were
// each introduced by the fix for the previous one — same author, same session,
// same fact. The cause is not the research; every round verified against live
// pages. The cause is the sentence form.
//
//   "Apple publishes no X"   — a claim about every Apple surface at once. One
//                              fetch kills it, and one did, five times.
//   "Not found on [pages],   — a claim about the search. A missed surface makes
//    having searched         it incomplete rather than false, and correcting it
//    [surfaces]"             means adding a page rather than reversing an
//                            assertion.
//
// The previous rounds identified this correctly, wrote it into both documents'
// parentheticals, and then wrote three more absolutes anyway. Correcting each
// instance by hand is what did not work, so the form is enforced here instead.
//
// Two kinds of absolute are legitimate, and a guard that fires on them would be
// worse than no guard:
//
//   1. Apple's own words. "macOS doesn't support Dynamic Type" is Apple's
//      sentence. A document that declares wording inside quote marks to be
//      Apple's, unaltered, gets its quoted spans blanked before matching — and
//      the convention that makes this safe is stated in the document itself
//      rather than assumed here.
//
//      That exemption is *earned per document*, not granted to the set. It was
//      granted to the set once, and it was unearned in two of the six:
//      `apple-hig-liquid-glass` and `wwdc-design-principles` declare no
//      convention and use quote marks for paraphrase and scare-quotes
//      ("I understood you", "durations", "tick", "pour"), so a false absolute
//      wrapped in quote marks in either one passed. Adding the convention line
//      to those two would have closed the hole by publishing a false statement
//      — their quoted spans are not Apple's verbatim wording — so the blanking
//      is keyed on the declaration instead. A document that later adopts the
//      convention gains the exemption by saying so, in the document, where a
//      reader can check it against the quotes around it.
//   2. A claim scoped to a named page or table: "the HIG's standard-shortcut
//      table contains no sidebar entry". This one survived every review while
//      its absolute twin failed on the first fetch, and the reason is
//      grammatical — its *subject* is a page, not Apple. That is what the
//      patterns below key on. An absence claim with Apple as its subject is
//      unbounded; the same claim with a named page as its subject is a finite,
//      checkable, correctable statement.
//
// Emphasis markers are stripped before matching, because `Apple does **not**
// publish` is the same sentence and slipped past a first draft of this check.
const ABSENCE_VERBS = [
  "publish", "publishes", "published",
  "assign", "assigns", "assigned",
  "define", "defines", "defined",
  "state", "states", "stated",
  "document", "documents", "documented",
  "specify", "specifies", "specified",
  "give", "gives", "given", "gave",
  "list", "lists", "listed",
  "provide", "provides", "provided",
  "carry", "carries", "carried",
  "name", "names", "named",
  "say", "says", "said",
  "ship", "ships", "shipped",
  "mention", "mentions", "mentioned",
  "record", "records", "recorded",
  "declare", "declares", "declared",
].join("|");

// Words that introduce a different grammatical subject. If one appears between
// "Apple" and the negated verb, Apple is no longer the thing doing the
// not-publishing, and the sentence is the scoped form we want people writing.
const NEW_SUBJECT = [
  "\\.", "\\bthe\\b", "\\bits\\b", "\\ba\\b", "\\ban\\b", "\\bthis\\b", "\\bthat\\b",
  "\\bthese\\b", "\\bthose\\b", "\\bHIG\\b", "\\bpage\\b", "\\btable\\b",
  "\\bsection\\b", "\\bguidelines\\b",
].join("|");
const GAP = `(?:(?!${NEW_SUBJECT})[^.\\n]){0,80}?`;
// `Apple` is matched case-sensitively so document ids like `apple-accessibility`
// are not read as the subject of the next clause.
const APPLE = "(?<![\\w-])Apple(?![\\w-])";

const ABSENCE_FORMS: { name: string; re: RegExp }[] = [
  {
    name: "Apple as the subject of a negated publication verb",
    re: new RegExp(`${APPLE}${GAP}\\b(?:${ABSENCE_VERBS})\\s+(?:no|none|nothing|nowhere)\\b`, "g"),
  },
  {
    name: "Apple does not <publication verb>",
    re: new RegExp(`${APPLE}${GAP}\\b(?:does\\s+not|doesn't|do\\s+not|don't)\\s+(?:${ABSENCE_VERBS})\\b`, "g"),
  },
  {
    // "Apple never publishes", "It never states" — absolute across time as well
    // as surface. Requires a preceding word so the imperative "Never ship …"
    // (advice to the reader, not a claim about Apple) does not match.
    name: "<subject> never <publication verb>",
    re: new RegExp(`\\b\\w+\\s+never\\s+(?:${ABSENCE_VERBS})\\b`, "gi"),
  },
  {
    name: "<publication verb> nowhere",
    re: new RegExp(
      `\\b(?:${ABSENCE_VERBS}|appear|appears|appeared|reconcile|reconciles|reconciled)` +
      `\\s+(?:it\\s+|them\\s+|the\\s+two\\s+)?nowhere\\b`, "gi"),
  },
  {
    // "on no Apple page", "on any Apple page" — the same universal claim with
    // the quantifier moved. "…on any Apple page searched" is the scoped form
    // and is what the exception admits.
    name: "any/every/no Apple page",
    re: /\b(?:any|every|no|all)\s+Apple\s+(?:page|pages|surface|surfaces|document|documents|documentation|source|sources)\b(?!\s+(?:searched|checked|read|fetched|listed))/gi,
  },
  {
    // An exhaustive claim about what a page contains. This is the one that
    // produced the fifth defect: `ios-app-design` said HIG › Layout's "only pt
    // figures" were two, and the page carried eight more tables inside a
    // `tabNavigator` node the render walk never reached. "The pt figures found
    // there are …" says the same thing without claiming to have seen the whole
    // page, and is always available.
    name: "exhaustive claim about a page's contents",
    re: /\b(?:its|their|whose|the)\s+only\s+[\w-]*\s*(?:figures?|numbers?|counts?|entr(?:y|ies)|mentions?|rows?|statements?)\b|\bonly\s+[\w-]+\s+(?:on|in)\s+(?:the|that|this)\s+(?:page|table|document)\b|\bcontains\s+exactly\b/gi,
  },
];

// WHAT THIS GUARD DOES NOT CATCH. Read this before concluding from a green
// suite that the Apple documents contain no false absence claim — they contain
// none *in the forms below the line*, which is a narrower statement.
//
// This project's characteristic defect is a check that reads as a guarantee and
// is not, and this file spends 80 lines describing the guard's design and its
// two legitimate exceptions without once saying what it misses. So: the
// following all pass today, every one of them measured against the patterns
// above rather than reasoned about.
//
//   "no shortcut is assigned by Apple"        passive voice — Apple is the
//                                             agent, not the grammatical
//                                             subject, and the patterns key on
//                                             the subject
//   "Cupertino publishes no …"                a synonym subject; the APPLE
//                                             token is literal
//   "Apple was searched thoroughly. No        an absolute split across two
//    minimum is published."                   sentences — GAP stops at `\.`
//   "Apple publishes no minimum."             a *fabricated* quotation in a
//    (inside quote marks, in a document       document that declares the
//    that declares the convention)            convention: blanked, and nothing
//                                             here checks the words are Apple's
//   "Apple has no published minimum"          `has`/`is` are not publication
//   "Apple is silent on the minimum"          verbs, and adding them would fire
//                                             on ordinary prose
//   "Apple does not appear to publish X"      the hedge separates `does not`
//                                             from the verb
//   "apple publishes no minimum"              APPLE is case-sensitive on
//                                             purpose, so the id
//                                             `apple-accessibility` is not read
//                                             as a subject; lowercase prose
//                                             escapes with it
//   an absolute inside a fenced code block    fences are skipped by design; the
//                                             fence-parity assertion only
//                                             guarantees they are balanced
//
// Every historical defect in this package landed in a form the patterns catch,
// which is why the guard is worth having. It is a regression guard against a
// good-faith author reaching for a familiar sentence — not an adversarial
// filter, and not a substitute for reading the source.
//
// One known over-match, zero occurrences today: the APPLE token matches the
// "Apple" in *Apple Watch*, *Apple Music* and *Apple Store*, so
// "Apple Watch publishes no complication size" would be reported with Apple as
// its subject. Narrowing the token would cost more than it saves — the sentence
// is one a person should rewrite anyway — but a future hit that looks spurious
// is probably this.

/** The declaration that earns a document the quotation exemption, matched in
 *  the document's own text so the exemption cannot be granted from here. */
const QUOTE_CONVENTION = /^\s*\*?Quotation convention:/m;

/**
 * One line, reduced to what the patterns see. `blankQuotes` is the earned
 * exemption; emphasis is always stripped, because `Apple does **not** publish`
 * is the same sentence and evaded three rounds of grepping.
 */
const scanLine = (line: string, blankQuotes: boolean) =>
  (blankQuotes ? line.replace(/"[^"]*"/g, (m) => " ".repeat(m.length)) : line)
    .replace(/[*_`]/g, " ");

/** Every absence form matching a line, as `[name, matched text]` pairs. */
const absenceHits = (line: string, blankQuotes: boolean): [string, string][] => {
  const scanned = scanLine(line, blankQuotes);
  const hits: [string, string][] = [];
  for (const form of ABSENCE_FORMS) {
    form.re.lastIndex = 0;
    const m = form.re.exec(scanned);
    if (m) hits.push([form.name, m[0].replace(/\s+/g, " ").trim()]);
  }
  return hits;
};

describe("the quotation exemption is earned per document", () => {
  const absolute = 'Apple publishes no minimum for this control.';

  it("catches a bare absolute either way", () => {
    expect(absenceHits(absolute, true).length).toBeGreaterThan(0);
    expect(absenceHits(absolute, false).length).toBeGreaterThan(0);
  });

  it("exempts a quoted absolute only where the convention is declared", () => {
    expect(absenceHits(`"${absolute}"`, true)).toEqual([]);
    expect(absenceHits(`"${absolute}"`, false).length).toBeGreaterThan(0);
  });

  it("reads the declaration out of the document rather than a list here", () => {
    const declaring = APPLE_DOC_IDS
      .map((id) => docs.find((d) => d.id === id))
      .filter((d): d is (typeof docs)[number] => Boolean(d))
      .filter((d) => QUOTE_CONVENTION.test(readFileSync(d.path, "utf8")))
      .map((d) => d.id);
    // Not pinned to a fixed set — a document adopting the convention should be
    // able to gain the exemption without editing this file. What is pinned is
    // that the exemption is a minority privilege rather than a blanket one, so
    // granting it back to the whole set is a visible change.
    expect(declaring.length).toBeLessThan(APPLE_DOC_IDS.length);
    expect(declaring.length).toBeGreaterThan(0);
  });
});

describe("the Apple documents state absences in the scoped form", () => {
  it("uses no absolute absence construction outside a quotation", () => {
    const offenders: string[] = [];
    for (const id of APPLE_DOC_IDS) {
      const doc = docs.find((d) => d.id === id);
      if (!doc) continue; // `names an id that exists for every entry` owns this
      // Read the file rather than `doc.body` so a failure names the line a
      // person can open, frontmatter included.
      const source = readFileSync(doc.path, "utf8");
      const blankQuotes = QUOTE_CONVENTION.test(source);
      const lines = source.split("\n");
      let inFence = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
        if (inFence) continue;
        for (const [name, matched] of absenceHits(lines[i], blankQuotes)) {
          offenders.push(`${id}:${i + 1} [${name}] "${matched}"`);
        }
      }
      // An unclosed fence would exempt everything after it, silently — the same
      // shape as the defect this whole check exists to catch.
      expect(inFence, `${id}: unbalanced code fence`).toBe(false);
    }
    expect(
      offenders,
      "absolute absence claim — say what the search found on the pages named, not what Apple publishes",
    ).toEqual([]);
  });
});

// `**Sources:**` used to print identically for all 96 documents, which made a
// document whose citations are asserted on look exactly like one whose
// citations are not. Today that is 11 enforced against 85 unenforced, and 66 of
// the 85 would fail the tiers if the assertion were extended to them — so
// identical presentation is not a neutral omission, it flatters the majority.
// The migration is a later package; the disclosure is not.
describe("the sourcing boundary is disclosed rather than implied", () => {
  it("enforces exactly the Apple set and the security category", () => {
    const enforced = docs.filter(isSourceEnforced).map((d) => d.id).sort();
    const expected = [
      ...APPLE_DOC_IDS,
      ...docs.filter((d) => d.category === "security").map((d) => d.id),
    ].sort();
    expect(enforced).toEqual(expected);
  });

  it("leaves most of the base unenforced, which is the fact worth stating", () => {
    // Not a target to hit — a measurement that keeps the README's claim honest.
    // When the migration package lands, this flips and the sentence changes.
    expect(docs.filter((d) => !isSourceEnforced(d)).length).toBeGreaterThan(0);
  });

  it("prints which side of the boundary a document sits on", () => {
    const indexSrc = readFileSync(join(root, "src", "index.ts"), "utf8");
    expect(indexSrc).toContain("isSourceEnforced");
    expect(indexSrc).toContain("not yet checked against the source allowlist");
  });

  it("says so in the README too, where the count lives", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    expect(readme).toMatch(/not yet/i);
    expect(readme).toContain("11");
  });
});

describe("security documents cite permitted sources only", () => {
  it("uses no blog-tier source", () => {
    const offenders: string[] = [];
    for (const d of docs.filter((x) => x.category === "security")) {
      for (const url of d.sources ?? []) {
        const host = hostOf(url);
        if (host === null) {
          offenders.push(`${d.id}: unparseable source ${url}`);
          continue;
        }
        const tier = tierOf(host);
        if (tier !== "standard" && tier !== "vendor") {
          offenders.push(`${d.id}: ${host}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("cites at least three sources per document", () => {
    const thin = docs
      .filter((d) => d.category === "security")
      .filter((d) => (d.sources ?? []).length < 3)
      .map((d) => d.id);
    expect(thin).toEqual([]);
  });
});

// Three surfaces describe what audit_security can read, for three different
// readers: the report's "Not visible to this audit" block (a human), the MCP
// tool description (the client, deciding whether to call the tool at all), and
// the README's tool table. They drifted once — the README was brought up to
// date and the machine-facing description was not, which is the worse half to
// miss: an agent reading the short list will not reach for this tool on a Nuxt
// or Remix project.
describe("every surface that lists audit_security's header sources lists all of them", () => {
  const securitySrc = readFileSync(join(root, "src", "security.ts"), "utf8");
  const indexSrc = readFileSync(join(root, "src", "index.ts"), "utf8");
  // The README uses non-breaking hyphens in its tool table; normalise them so
  // a token like "meta http-equiv" is compared on its content, not its glyphs.
  const readme = readFileSync(join(root, "README.md"), "utf8").replace(/‑/g, "-");
  const readmeRow = readme.split("\n").find((l) => l.includes("**`audit_security`**")) ?? "";

  const notVisible = securityReport({ root: join(root, "does-not-exist-so-only-the-boilerplate-renders") }).text;

  it("the README has an audit_security row to check", () => {
    expect(readmeRow).not.toBe("");
  });

  it("the tool description is built from the shared constant, not a copy of it", () => {
    expect(indexSrc).toContain("HEADER_SOURCES_SENTENCE");
    expect(HEADER_SOURCE_TOKENS.length).toBeGreaterThan(0);
  });

  it.each(HEADER_SOURCE_TOKENS.map((t) => [t]))(
    "%s is named in the tool description, the report and the README", (token) => {
      expect(HEADER_SOURCES_SENTENCE, "MCP tool description").toContain(token);
      expect(notVisible, "report's Not visible block").toContain(token);
      expect(readmeRow, "README tool table row").toContain(token);
    });
});
