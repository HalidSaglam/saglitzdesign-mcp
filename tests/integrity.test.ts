import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadKnowledge, findDoc, platformMatches } from "../dist/knowledge.js";
import { CATEGORIES, PLATFORMS, DESIGN_LANGUAGES, REVIEW_MAP, FOCUS_MAP, ROADMAPS, STALE_DAYS } from "../dist/catalog.js";
import { loadRecipes } from "../dist/recipes.js";
import { loadExamples } from "../dist/examples.js";
import { securityReport, HEADER_SOURCE_TOKENS, HEADER_SOURCES_SENTENCE } from "../dist/security.js";

// Structural guarantees for the curated content. These are the checks that
// would have caught the v0.14.0 bug where roadmaps referenced pattern docs by
// an id that did not exist, so those docs silently vanished from every
// roadmap and checklist without any error.

const root = join(__dirname, "..");
const docs = loadKnowledge(join(root, "knowledge"));

/** Mirrors the registered tool set; server.test.ts proves this list is complete. */
const TOOL_NAMES = new Set([
  "list_design_knowledge", "search_design_knowledge", "get_design_doc", "get_component_guidance",
  "get_design_language", "design_review_checklist", "get_design_roadmap", "seo_geo_guide",
  "get_design_examples", "knowledge_freshness", "generate_design_tokens", "audit_accessibility",
  "get_component_recipe", "generate_color_system", "suggest_font_pairing", "fix_contrast",
  "suggest_icon_library", "generate_type_scale", "generate_elevation_system", "generate_motion",
  "design_lint", "audit_ux_copy", "create_design_system", "audit_design_system",
  "generate_layout_system", "compare_design_languages", "measure_screenshot", "import_design_tokens", "audit_project",
  "audit_security", "audit_generic_design", "audit_seo_geo", "audit_performance",
]);

describe("knowledge base metadata", () => {
  it("loads every markdown document", () => {
    expect(docs.length).toBeGreaterThanOrEqual(83);
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
    "developer.apple.com", "apple.com",
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
        const tier = tierOf(new URL(url).hostname);
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
// Tasks adding further Apple documents add their ids here.
const APPLE_DOC_IDS = ["macos-app-design", "ios-app-design", "apple-hig-liquid-glass"];

describe("Apple documents are sourced to Apple", () => {
  const appleDocs = () => docs.filter((d) => APPLE_DOC_IDS.includes(d.id));

  it("finds every Apple document", () => {
    expect(appleDocs().map((d) => d.id).sort()).toEqual([...APPLE_DOC_IDS].sort());
  });

  it("cites no source outside the tiers", () => {
    const offenders: string[] = [];
    for (const d of appleDocs()) {
      for (const url of d.sources ?? []) {
        if (tierOf(new URL(url).hostname) === null) offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("carries at least one developer.apple.com source each", () => {
    const thin = appleDocs()
      .filter((d) => !(d.sources ?? []).some((u) => new URL(u).hostname.replace(/^www\./, "") === "developer.apple.com"))
      .map((d) => d.id);
    expect(thin).toEqual([]);
  });

  it("cites at least three sources each", () => {
    expect(appleDocs().filter((d) => (d.sources ?? []).length < 3).map((d) => d.id)).toEqual([]);
  });
});

describe("security documents cite permitted sources only", () => {
  it("uses no blog-tier source", () => {
    const offenders: string[] = [];
    for (const d of docs.filter((x) => x.category === "security")) {
      for (const url of d.sources ?? []) {
        let host: string;
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
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
