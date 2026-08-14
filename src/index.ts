#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute, resolve, basename, delimiter } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import { loadKnowledge, mergeKnowledge, searchKnowledge, sections, findDoc, platformMatches, type KnowledgeDoc } from "./knowledge.js";
import { CATEGORIES, PLATFORMS, DESIGN_LANGUAGES, REVIEW_MAP, FOCUS_MAP, ROADMAPS, STALE_DAYS } from "./catalog.js";
import { loadExamples, searchExamples, imageMime } from "./examples.js";
import { registerPrompts } from "./prompts.js";
import {
  generateTokens, validateColors, DEFAULT_SPACING, DEFAULT_RADII, DEFAULT_FONT_SIZES, DEFAULT_FONT_FAMILIES,
  type TokenSpec, type TokenFormat,
} from "./tokens.js";
import { contrastReport, contrastRatio, type ContrastPair, type TapTarget } from "./a11y.js";
import { loadRecipes, recipeText, RECIPE_TOKEN_ROLES } from "./recipes.js";
import { generateColorSystem, colorSystemReport, suggestAccessibleColor } from "./color.js";
import { suggestFontPairing, fontPairingReport } from "./fonts.js";
import { suggestIconLibrary, iconLibraryReport } from "./icons.js";
import { typeScaleReport } from "./typescale.js";
import { elevationReport } from "./elevation.js";
import { motionReport, MOTION_IDS, type MotionStack } from "./motion.js";
import { designLintReport } from "./lint.js";
import { uxCopyReport } from "./uxcopy.js";
import { designSystemAuditReport } from "./dsaudit.js";
import { layoutSystemReport, type LayoutPreset } from "./layout.js";
import { compareDesignLanguages, COMPARE_TOPICS, COMPARE_PLATFORMS, type CompareTopic, type ComparePlatform } from "./compare.js";
import { decodePng, PngError, MAX_BYTES } from "./png.js";
import { measure } from "./screenshot.js";
import { renderMarkdown, renderHtml } from "./report.js";
import { importTokensReport } from "./importtokens.js";
import { projectAuditReport } from "./project.js";
import { securityReport, HEADER_SOURCES_SENTENCE } from "./security.js";
import { genericReport } from "./generic.js";
import { seoReport, SEO_CAPABILITIES } from "./seo.js";
import { perfReport, PERF_CAPABILITIES } from "./perf.js";
import { createDesignSystem, type DSPlatform } from "./designsystem.js";
import { normalizeHex } from "./tokens.js";

// knowledge/ sits next to dist/ (repo root) both in dev (tsx) and after build
const here = dirname(fileURLToPath(import.meta.url));
const knowledgeDir = [join(here, "..", "knowledge"), join(here, "..", "..", "knowledge")].find(existsSync);
if (!knowledgeDir) {
  console.error("SaglitzDesign: knowledge/ directory not found");
  process.exit(1);
}
const builtinDocs = loadKnowledge(knowledgeDir);

// A team's own design rules cannot live inside the installed package — npm
// update wipes it — so they point at their own directory instead. Multiple
// paths are allowed, separated the way PATH is on this platform.
const userDirs = (process.env.SAGLITZDESIGN_KNOWLEDGE_DIR ?? "")
  .split(delimiter)
  .map((p) => p.trim())
  .filter(Boolean);

const userDocs = userDirs.flatMap((dir) => {
  if (!existsSync(dir)) {
    console.error(`SaglitzDesign: SAGLITZDESIGN_KNOWLEDGE_DIR points at "${dir}", which does not exist — skipping it.`);
    return [];
  }
  return loadKnowledge(dir, "user");
});

const { docs, overridden, unknownCategories } = mergeKnowledge(builtinDocs, userDocs);
const examplesDir = join(knowledgeDir, "examples");
const examples = loadExamples(examplesDir);
const repoRoot = join(knowledgeDir, "..");
const recipes = loadRecipes(join(repoRoot, "recipes"));

/** Single source of truth for the version: package.json ships in every install. */
function packageVersion(): string {
  for (const candidate of [join(here, "..", "package.json"), join(here, "..", "..", "package.json")]) {
    try {
      const v = JSON.parse(readFileSync(candidate, "utf8"))?.version;
      if (typeof v === "string" && v) return v;
    } catch {
      /* try the next candidate */
    }
  }
  return "0.0.0";
}

const server = new McpServer({
  name: "saglitzdesign",
  version: packageVersion(),
});

function docHeader(d: KnowledgeDoc): string {
  // Say plainly when a document is the team's own — an agent quoting a house
  // rule as though it were sourced platform guidance would be misleading.
  const origin = d.origin === "user" ? " · **your team's document**" : "";
  return `# ${d.title}\n_id: ${d.id} · category: ${d.category} · platform: ${d.platform} · tags: ${d.tags.join(", ")}${origin}_\n`;
}

function fullDoc(d: KnowledgeDoc): string {
  const src = d.sources.length ? `\n\n**Sources:** ${d.sources.join(" · ")}` : "";
  return `${docHeader(d)}\n${d.body}${src}`;
}

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}


// Every tool here is read-only, deterministic (same input → same output), and
// closed-world (reads only bundled local files; no network/external calls).
// Registering with these MCP annotations + a human title makes that contract
// explicit to clients and evaluators. All tools go through this wrapper.
const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function tool(
  name: string,
  description: string,
  schema: Record<string, unknown>,
  cb: (args: any) => unknown,
  outputSchema?: Record<string, unknown>,
) {
  const title = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (server.registerTool as (n: string, c: unknown, cb: unknown) => unknown)(
    name,
    {
      title,
      description,
      inputSchema: schema,
      ...(outputSchema ? { outputSchema } : {}),
      annotations: { title, ...READONLY_ANNOTATIONS },
    },
    cb,
  );
}

/**
 * The shape every structured auditor declares and returns. One constant,
 * because each tool describing the same structure for itself is one more thing
 * to keep in step; and the descriptions matter — an `outputSchema` is
 * documentation an agent reads before it ever calls the tool.
 *
 * It sits up here beside `tool()` rather than beside its first user because
 * `const` is not hoisted: every registration below is a call executed at module
 * load, so a schema declared further down the file is in its temporal dead zone
 * when the earliest tool that passes it is registered.
 */
const AUDIT_OUTPUT_SCHEMA = {
  findings: z
    .array(
      z.object({
        rule: z.string().describe("Stable rule id, e.g. 'canonical-not-absolute' or 'lazy-hero'."),
        severity: z.enum(["error", "warning", "info"]).describe("How the rule grades this finding."),
        message: z.string().describe("The fact about the source that made the rule fire."),
        fix: z.string().describe("What to change, specifically."),
        doc: z.string().describe("Knowledge-base id backing the claim — read it with get_design_doc."),
        file: z.string().optional().describe("Path relative to the audited directory, when a directory was audited."),
        line: z.number().int().optional().describe("1-based line within that file."),
      }),
    )
    .describe("Every finding, in the order the markdown report lists them."),
  summary: z
    .object({
      error: z.number().int(),
      warning: z.number().int(),
      info: z.number().int(),
    })
    .describe("Counts by severity. Always agrees with `findings` — it is derived from the same list."),
  notVisible: z
    .array(z.string())
    .describe(
      "What this audit structurally could not check, one limitation per entry. Read it as a peer of `findings`: "
      + "silence on a subject named here is this tool's reach, not a clean result. Nothing any of these tools reports is measured.",
    ),
};

// ── Tool 1: list ─────────────────────────────────────────────────────────────
tool(
  "list_design_knowledge",
  "List the knowledge-base index (design languages, UI components, UX, craft, books, process, marketing, SEO, GEO, patterns). Returns every document grouped by category — each with its id, title, platform, and tags. Use this first to discover what's available and get exact ids; then read one with get_design_doc, or search by need with search_design_knowledge.",
  {
    category: z.enum(CATEGORIES).optional().describe("Filter to one category, e.g. 'component', 'ux', 'marketing'. Omit for all."),
    platform: z.enum(PLATFORMS).optional().describe("Filter to one platform: 'mobile', 'web', or 'macos' (docs marked 'both' are always included). Omit for all."),
  },
  async ({ category, platform }) => {
    const filtered = docs.filter(
      (d) => (!category || d.category === category) && platformMatches(d.platform, platform),
    );
    const byCategory = new Map<string, KnowledgeDoc[]>();
    for (const d of filtered) {
      byCategory.set(d.category, [...(byCategory.get(d.category) ?? []), d]);
    }
    const lines: string[] = [`SaglitzDesign knowledge base — ${filtered.length} documents\n`];
    for (const [cat, list] of byCategory) {
      lines.push(`## ${cat}`);
      for (const d of list) {
        lines.push(`- **${d.id}** — ${d.title} (${d.platform}) [${d.tags.join(", ")}]`);
      }
      lines.push("");
    }
    return text(lines.join("\n"));
  },
);

// ── Tool 2: search ───────────────────────────────────────────────────────────
tool(
  "search_design_knowledge",
  "Search the whole knowledge base with a natural-language query — UI components, UX, accessibility, typography, color, motion, conversion, copywriting, SEO/GEO, platform design languages, craft standards, distilled design & marketing books, roadmaps, and real-world app/site patterns. Returns the top-matching documents, each with its single most relevant section excerpted and its id. Use for open-ended 'how should I…' questions; if you already know the id use get_design_doc, to browse everything use list_design_knowledge.",
  {
    query: z.string().describe("What you need guidance on, e.g. 'primary button size mobile', 'pricing page layout', 'dark mode colors', 'llms.txt'"),
    category: z.enum(CATEGORIES).optional().describe("Restrict to one category"),
    platform: z.enum(PLATFORMS).optional().describe("Restrict to one platform"),
    limit: z.number().int().min(1).max(10).optional().describe("Max results (default 5)"),
  },
  async ({ query, category, platform, limit }) => {
    const results = searchKnowledge(docs, query, { category, platform, limit });
    if (results.length === 0) {
      return text(`No matches for "${query}". Try broader terms, or call list_design_knowledge to see available topics.`);
    }
    const out = results.map(
      (r) =>
        `${docHeader(r.doc)}\n**Most relevant section:**\n${r.excerpt}\n\n_Full doc: get_design_doc(id: "${r.doc.id}")_`,
    );
    return text(out.join("\n\n---\n\n"));
  },
);

// ── Tool 3: get full doc ─────────────────────────────────────────────────────
tool(
  "get_design_doc",
  "Fetch one knowledge-base document in full by its id. Returns the whole document — title, metadata, prescriptive body, and cited sources. Ids come from list_design_knowledge or search_design_knowledge; if the id is unknown it suggests near matches.",
  {
    id: z.string().describe("Exact document id, e.g. 'buttons', 'material-3', 'accessibility', 'geo-tactics-checklist'. Get ids from list_design_knowledge or search results."),
  },
  async ({ id }) => {
    const doc = findDoc(docs, id);
    if (!doc) {
      const near = searchKnowledge(docs, id, { limit: 3 }).map((r) => r.doc.id);
      return text(`No document with id "${id}".${near.length ? ` Did you mean: ${near.join(", ")}?` : ""} Use list_design_knowledge to browse.`);
    }
    return text(fullDoc(doc));
  },
);

// ── Tool 4: component guidance ───────────────────────────────────────────────
tool(
  "get_component_guidance",
  "Get expert guidance for designing one UI component or screen pattern (button, form, navigation, card, modal, hero, pricing page, onboarding, paywall, checkout, empty state, dashboard…). Returns the most relevant docs in full — specs, states, sizing, anti-patterns, and real-world patterns from top apps/sites. Use when designing a specific element; for copy-paste code use get_component_recipe, for annotated screenshots use get_design_examples.",
  {
    component: z.string().describe("Component or pattern name, e.g. 'primary button', 'signup form', 'bottom tab bar', 'hero section', 'paywall'."),
    platform: z.enum(PLATFORMS).optional().describe("Target platform ('mobile' | 'web' | 'macos') — strongly recommended so guidance matches the platform's conventions."),
  },
  async ({ component, platform }) => {
    const compResults = searchKnowledge(docs, component, { platform, category: "component", limit: 2 });
    const patternResults = searchKnowledge(docs, component, { platform, category: "pattern", limit: 2 });
    const generalResults = searchKnowledge(docs, component, { platform, limit: 2 });
    const seen = new Set<string>();
    const picked: typeof compResults = [];
    for (const r of [...compResults, ...patternResults, ...generalResults]) {
      if (picked.length >= 3) break;
      if (!seen.has(r.doc.id)) {
        seen.add(r.doc.id);
        picked.push(r);
      }
    }
    if (picked.length === 0) {
      return text(`No guidance found for "${component}". Call list_design_knowledge to see covered components and patterns.`);
    }
    const out = picked.map((r) => fullDoc(r.doc));
    return text(out.join("\n\n═══════════════════════\n\n"));
  },
);

// ── Tool 5: design language ──────────────────────────────────────────────────
tool(
  "get_design_language",
  "Fetch the full reference document for one modern design language or platform design system (Material 3, Apple HIG/Liquid Glass, iOS/Android/macOS, Apple Intelligence, visionOS, Fluent 2, 2026 web trends, design tokens). Returns the complete spec — rules, do/don't lists, numbers, and examples — for the chosen system. Use when you need the authoritative platform baseline before designing; for a specific component use get_component_guidance, and to plan a whole project use get_design_roadmap.",
  {
    language: z
      .enum(DESIGN_LANGUAGES)
      .describe("Which reference to fetch. e.g. 'material-3' (Android/Material), 'apple-hig-liquid-glass' or 'ios-app-design' (iOS), 'macos-app-design', 'visionos-spatial-design' (Vision Pro), 'web-trends-2026', 'design-tokens-theming'."),
  },
  async ({ language }) => {
    const doc = findDoc(docs, language);
    if (!doc) return text(`Reference "${language}" is not loaded in the knowledge base yet.`);
    return text(fullDoc(doc));
  },
);

// ── Tool 6: design review checklist ─────────────────────────────────────────
tool(
  "design_review_checklist",
  "Generate a structured design-review checklist for a project type (mobile app, website, landing page, dashboard), assembled from the knowledge base: key rules and anti-patterns per area. Use it to audit an existing design or as acceptance criteria for a new one.",
  {
    project_type: z.enum(["mobile-app", "macos-app", "website", "landing-page", "dashboard"]).describe("What is being reviewed"),
    focus: z.enum(["all", "ui", "ux", "accessibility", "seo", "geo", "conversion", "copywriting"]).optional().describe("Narrow the review to one dimension (default: all)"),
  },
  async ({ project_type, focus }) => {
    const focusFn = FOCUS_MAP[focus ?? "all"];
    const ids = REVIEW_MAP[project_type];
    const curated = ids.map((id) => findDoc(docs, id)).filter((d): d is KnowledgeDoc => !!d && focusFn(d));
    // A team's document joins the checklist by asking to, via `review:` in its
    // frontmatter — the difference between their rules being searchable and
    // their rules being enforced. Theirs go first: house rules win.
    const opted = docs.filter((d) => d.origin === "user" && d.review.includes(project_type) && focusFn(d));
    const seen = new Set<string>();
    const picked = [...opted, ...curated].filter((d) => !seen.has(d.id) && seen.add(d.id));
    if (picked.length === 0) return text("No checklist sections available for that combination.");

    const lines: string[] = [
      `# Design review checklist — ${project_type}${focus && focus !== "all" ? ` (focus: ${focus})` : ""}`,
      `Walk each area below. For full guidance on any area, call get_design_doc with its id.\n`,
    ];
    for (const doc of picked) {
      lines.push(`## ${doc.title}  \`(${doc.id})\``);
      const secs = sections(doc);
      const anti = secs.find((s) => /anti-pattern/i.test(s.heading));
      const checklist = secs.find((s) => /checklist|rules|hard requirements/i.test(s.heading));
      if (checklist) lines.push(`**Check:**\n${checklist.content}`);
      if (anti) lines.push(`**Reject if you see:**\n${anti.content}`);
      if (!checklist && !anti) {
        lines.push(secs.slice(0, 1).map((s) => `**${s.heading}:**\n${s.content.slice(0, 500)}`).join("\n"));
      }
      lines.push("");
    }
    return text(lines.join("\n"));
  },
);

// ── Tool 7: design roadmap ───────────────────────────────────────────────────

tool(
  "get_design_roadmap",
  "The SaglitzDesign roadmap: a phased, expert design process for a given project type (website, landing page, iOS app, Android app, macOS app, SaaS web app). Each phase has a goal and the exact knowledge-base docs to consult. Use this FIRST when starting any design project, then fetch phase docs as you reach them.",
  {
    project_type: z.enum(["website", "landing-page", "ios-app", "android-app", "macos-app", "saas-web-app"]).describe("What is being designed"),
  },
  async ({ project_type }) => {
    const rm = ROADMAPS[project_type];
    const lines: string[] = [
      `# SaglitzDesign roadmap — ${project_type}`,
      "",
      rm.intro,
      "",
      `**Full written guides:** ${rm.fullGuides.map((g) => `get_design_doc("${g}")`).join(", ")}`,
      "",
    ];
    for (const phase of rm.phases) {
      lines.push(`## ${phase.title}`);
      lines.push(`**Goal / exit criteria:** ${phase.goal}`);
      // Resolve to real doc ids so the roadmap always cites ids get_design_doc accepts.
      const available = [...new Set(phase.docs.map((id) => findDoc(docs, id)?.id).filter(Boolean))];
      lines.push(`**Consult:** ${available.map((id) => `\`${id}\``).join(", ")}`);
      lines.push("");
    }
    lines.push("_Fetch any doc with get_design_doc(id). Audit finished work with design_review_checklist._");
    return text(lines.join("\n"));
  },
);

// ── Tool 8: SEO / GEO guide ──────────────────────────────────────────────────
tool(
  "seo_geo_guide",
  "SEO and GEO expertise for websites — classic SEO (technical, on-page, design-impact) and GEO, Generative Engine Optimization for AI answer engines (ChatGPT, Perplexity, Google AI Overviews, llms.txt, citations). Returns the full relevant guide docs, optionally narrowed to a topic. Use when planning or auditing a site's discoverability; pair with get_design_roadmap('website') for the full process.",
  {
    scope: z.enum(["seo", "geo", "both"]).describe("Which discipline: 'seo' (classic search), 'geo' (AI answer engines), or 'both'."),
    topic: z.string().optional().describe("Optional narrower topic, e.g. 'core web vitals', 'llms.txt', 'structured data'. Omit to get the full guides."),
  },
  async ({ scope, topic }) => {
    const cats = scope === "both" ? ["seo", "geo"] : [scope];
    let picked = docs.filter((d) => cats.includes(d.category));
    if (topic) {
      const hits = new Set(
        cats.flatMap((c) => searchKnowledge(docs, topic, { category: c, limit: 2 }).map((r) => r.doc.id)),
      );
      const narrowed = picked.filter((d) => hits.has(d.id));
      if (narrowed.length > 0) picked = narrowed;
    }
    if (picked.length === 0) return text("No SEO/GEO docs loaded yet.");
    return text(picked.map(fullDoc).join("\n\n═══════════════════════\n\n"));
  },
);

// ── Tool 9: visual design examples ──────────────────────────────────────────
// The screenshot library is a LOCAL-ONLY asset: the images are third-party
// (Mobbin) and are deliberately excluded from the published npm package. A
// published install therefore serves the curated annotations + source links.
// Detect which mode we're in once, so the tool can say so instead of implying
// images are always returned.
const bundledImages = examples.filter((e) => e.image && existsSync(join(examplesDir, e.image))).length;
const IMAGES_BUNDLED = bundledImages > 0;

tool(
  "get_design_examples",
  IMAGES_BUNDLED
    ? "Fetch REAL screenshot examples of a design pattern from top apps and websites (curated from Mobbin). Returns the actual images plus notes on what each does well — use these as visual references when designing paywalls, onboarding, auth, navigation, checkout, settings, empty states, heroes, pricing, features, social proof, signup pages, dashboards and footers."
    : "Fetch curated real-world examples of a design pattern from top apps and websites (paywalls, onboarding, auth, navigation, checkout, settings, empty states, heroes, pricing, features, social proof, signup, dashboards, footers). Returns, for each example, the app/site, what it does well, and a source link to view the screenshot. NOTE: this installation does not bundle the screenshot images (they are third-party assets, excluded from the published package), so the notes and links are returned WITHOUT inline images — open the links, or use your own browser tool, if you need to see them.",
  {
    query: z.string().describe("Pattern to see examples of, e.g. 'paywall', 'pricing section', 'dark hero', 'empty state'"),
    platform: z.enum(["mobile", "web"]).optional().describe("'mobile' for iOS app screens, 'web' for website examples"),
    limit: z.number().int().min(1).max(6).optional().describe("Max examples to return (default 4; images are large)"),
  },
  async ({ query, platform, limit }) => {
    // examples are stored with platform "ios" | "web"; map "mobile"→"ios"
    const mapped = platform === "mobile" ? "ios" : platform;
    const hits = searchExamples(examples, query, { platform: mapped, limit: limit ?? 4 });
    if (hits.length === 0) {
      const patterns = [...new Set(examples.map((e) => e.pattern))].sort().join(", ");
      return text(`No visual examples match "${query}". Available patterns: ${patterns || "(example library is empty)"}.`);
    }
    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
    if (!IMAGES_BUNDLED) {
      content.push({
        type: "text",
        text:
          `**${hits.length} curated example(s) for "${query}" — annotations + source links only.**\n` +
          "_This installation does not bundle the screenshot images (third-party assets are not redistributed). " +
          "Open a source link, or use a browser tool, to see the actual screen._",
      });
    }
    for (const e of hits) {
      content.push({
        type: "text",
        text: `### ${e.title}\n${e.description}\n_Pattern: ${e.pattern} · Platform: ${e.platform} · Source: ${e.mobbin_url}_`,
      });
      const imagePath = e.image ? join(examplesDir, e.image) : "";
      if (imagePath && existsSync(imagePath)) {
        try {
          const data = readFileSync(imagePath).toString("base64");
          content.push({ type: "image", data, mimeType: imageMime(e.image) });
        } catch {
          content.push({ type: "text", text: `(image unreadable — view it at ${e.mobbin_url})` });
        }
      } else if (IMAGES_BUNDLED) {
        // Library is present but this one entry has no file — worth saying.
        content.push({
          type: "text",
          text: `(screenshot missing from the local library — view it at ${e.mobbin_url})`,
        });
      }
    }
    return { content };
  },
);

// ── Tool 10: knowledge freshness ─────────────────────────────────────────────

tool(
  "knowledge_freshness",
  "Report how fresh each knowledge document is (age since last verification vs its category's staleness threshold). Use this to decide which docs need re-research; refresh workflow is documented in the repo's /refresh-knowledge command.",
  {
    only_stale: z.boolean().optional().describe("Return only docs past their staleness threshold (default false)"),
  },
  async ({ only_stale }) => {
    const now = Date.now();
    const rows = docs
      .map((d) => {
        const ageDays = Math.floor((now - new Date(d.updated).getTime()) / 86_400_000);
        const threshold = STALE_DAYS[d.category] ?? 365;
        return { d, ageDays, threshold, stale: ageDays > threshold };
      })
      .filter((r) => !only_stale || r.stale)
      .sort((a, b) => (b.ageDays / b.threshold) - (a.ageDays / a.threshold));
    if (rows.length === 0) return text("All documents are within their freshness thresholds. ✅");
    const staleCount = rows.filter((r) => r.stale).length;
    const lines = [
      `# Knowledge freshness — ${docs.length} docs, ${staleCount} stale`,
      "",
      "| doc | category | updated | age (days) | threshold | status |",
      "|---|---|---|---|---|---|",
      ...rows.map((r) =>
        `| ${r.d.id} | ${r.d.category} | ${r.d.updated} | ${r.ageDays} | ${r.threshold} | ${r.stale ? "⚠️ STALE" : "ok"} |`,
      ),
    ];
    return text(lines.join("\n"));
  },
);

// ── Tool 11: generate design tokens ──────────────────────────────────────────
tool(
  "generate_design_tokens",
  "Turn a design-token spec (semantic colors + optional spacing/radius/type scales) into REAL, ready-to-use artifact files: CSS custom properties, Tailwind v4 @theme, SwiftUI, Jetpack Compose, and W3C DTCG JSON. Deterministic — outputs code, not advice. Use it to give a project one source of truth across web, iOS and Android. Pair with audit_accessibility to verify the palette's contrast.",
  {
    name: z.string().optional().describe("Token set / brand name (default 'Brand')"),
    colors: z.record(z.string()).describe("Semantic color roles → hex. e.g. {\"primary\":\"#4F46E5\",\"onPrimary\":\"#FFFFFF\",\"surface\":\"#0A0A0B\",\"textPrimary\":\"#F5F5F5\",\"danger\":\"#EF4444\"}"),
    format: z.enum(["css", "tailwind", "swiftui", "compose", "dtcg", "all"]).optional().describe("Output format (default 'all')"),
    spacing: z.array(z.number()).optional().describe("px spacing scale (default 8pt scale 2..96)"),
    radii: z.record(z.number()).optional().describe("radius name→px (default sm/md/lg/xl/full; use 9999 for pill)"),
    fontSizes: z.record(z.number()).optional().describe("type scale name→px (default xs..4xl)"),
    fontFamilies: z.record(z.string()).optional().describe("font role→stack (default sans/mono)"),
  },
  async ({ name, colors, format, spacing, radii, fontSizes, fontFamilies }) => {
    const bad = validateColors(colors);
    if (bad.length) return text(`Invalid hex value(s): ${bad.join(", ")}. Use #RGB, #RRGGBB, or #RRGGBBAA.`);
    if (Object.keys(colors).length === 0) return text("Provide at least one color role in `colors`.");
    const spec: TokenSpec = {
      name: name || "Brand",
      colors,
      spacing: spacing && spacing.length ? spacing : DEFAULT_SPACING,
      radii: radii && Object.keys(radii).length ? radii : DEFAULT_RADII,
      fontSizes: fontSizes && Object.keys(fontSizes).length ? fontSizes : DEFAULT_FONT_SIZES,
      fontFamilies: fontFamilies && Object.keys(fontFamilies).length ? fontFamilies : DEFAULT_FONT_FAMILIES,
    };
    return text(generateTokens(spec, (format as TokenFormat) ?? "all"));
  },
);

// ── Tool 12: accessibility audit ─────────────────────────────────────────────
tool(
  "audit_accessibility",
  "Deterministic design-time accessibility checks: WCAG 2.2 color-contrast ratios for text/UI color pairs, and minimum tap/target sizes per platform (iOS 44pt, Android 48dp, web 24px min / 44 recommended). Returns exact ratios, pass/fail, and fixes — the machine-verifiable slice of a11y you can run before code. For keyboard/screen-reader/Dynamic Type checks, see get_design_doc('accessibility').",
  {
    contrast_pairs: z.array(z.object({
      foreground: z.string().describe("text/element hex"),
      background: z.string().describe("background hex"),
      label: z.string().optional().describe("what this is, e.g. 'body text on surface'"),
      large_text: z.boolean().optional().describe("true if ≥24px or ≥18.66px bold (threshold drops to 3:1)"),
      ui_component: z.boolean().optional().describe("true for non-text UI: borders, icons, focus rings (3:1)"),
    })).optional().describe("Color pairs to check for contrast"),
    tap_targets: z.array(z.object({
      label: z.string().optional(),
      width: z.number().describe("width in pt/dp/px"),
      height: z.number().describe("height in pt/dp/px"),
      platform: z.enum(["ios", "android", "web"]).optional().describe("default web"),
    })).optional().describe("Interactive targets to check for minimum size"),
  },
  async ({ contrast_pairs, tap_targets }) => {
    const pairs = (contrast_pairs ?? []) as ContrastPair[];
    const targets = (tap_targets ?? []) as TapTarget[];
    if (pairs.length === 0 && targets.length === 0) {
      return text("Provide `contrast_pairs` and/or `tap_targets` to audit. Example: {\"contrast_pairs\":[{\"foreground\":\"#6B7280\",\"background\":\"#FFFFFF\",\"label\":\"muted text\"}]}");
    }
    return text(contrastReport(pairs, targets));
  },
);

// ── Tool 13: component recipe ────────────────────────────────────────────────
tool(
  "get_component_recipe",
  "Get production-ready, accessible reference CODE for a UI component in a chosen stack (react-tailwind, html-css, swiftui, compose) — not advice, actual copy-paste code with all states, ARIA/accessibility, keyboard support and correct motion, grounded in the SaglitzDesign specs. Use when you need to actually build a button, input, modal, toast, card, switch, tabs, empty-state, or list-row. Pair with get_component_guidance (the design rationale) and generate_design_tokens (the theme).",
  {
    component: z.string().describe("Component name, e.g. 'button', 'input', 'modal', 'toast', 'card', 'switch', 'tabs', 'empty-state', 'list-row'"),
    stack: z.enum(["react-tailwind", "html-css", "swiftui", "compose"]).optional().describe("Target stack. Omit to get the spec + all available stacks."),
    tokens: z.record(z.string()).optional().describe(
      "Your colours, so the code comes back in them instead of the house palette. Roles: " +
      RECIPE_TOKEN_ROLES.join(", ") +
      ". Pass the values create_design_system or generate_color_system produced, e.g. {\"primary\":\"#0F62FE\",\"primaryHover\":\"#0043CE\"}. Omit to get the recipe as written.",
    ),
    scales: z.record(z.record(z.string())).optional().describe(
      "Your ramps, keyed by step — {\"neutral\":{\"50\":\"#…\",…,\"950\":\"#…\"},\"primary\":{…},\"danger\":{…}} — exactly the `neutral`, `primary` and `danger` scales generate_color_system returns. Swapped step for step, which is what themes the dark-mode shades too; role tokens alone leave those behind.",
    ),
  },
  async ({ component, stack, tokens, scales }) => {
    if (recipes.length === 0) {
      return text("No component recipes are installed in this build.");
    }
    const key = component.trim().toLowerCase().replace(/\s+/g, "-");
    let r = recipes.find((x) => x.component === key);
    if (!r) {
      // fuzzy: contains
      r = recipes.find((x) => x.component.includes(key) || key.includes(x.component));
    }
    if (!r) {
      return text(`No recipe for "${component}". Available components: ${recipes.map((x) => x.component).join(", ")}.`);
    }
    return text(recipeText(r, stack, tokens, scales));
  },
);

// ── Tool 14: generate color system ───────────────────────────────────────────
tool(
  "generate_color_system",
  "Turn ONE brand color into a complete, accessibility-verified palette: a 50–950 tonal scale, a cohesive brand-tinted neutral ramp, and full light + dark semantic tokens (background, surface, border, text, primary/onPrimary, subtle, focus ring). Every text/UI pair is checked against WCAG 2.2 and auto-adjusted to pass. Deterministic — outputs a real palette, not advice. Feed the result into generate_design_tokens, then audit_accessibility.",
  {
    brand_color: z.string().describe("The brand / primary color as hex, e.g. '#4F46E5' or '#e11d48'"),
  },
  async ({ brand_color }) => {
    if (!normalizeHex(brand_color)) {
      return text(`"${brand_color}" is not a valid hex color. Use #RGB, #RRGGBB, or #RRGGBBAA (e.g. #4F46E5).`);
    }
    const sys = generateColorSystem(brand_color);
    return text(colorSystemReport(brand_color, sys));
  },
);

// ── Tool 15: suggest font pairing ────────────────────────────────────────────
tool(
  "suggest_font_pairing",
  "Recommend production-ready font pairings for a brand/product from an intent or vibe (e.g. 'modern SaaS dashboard', 'luxury editorial', 'bold marketing landing', 'native iOS app', 'developer tool'). Returns matched heading + body (+ mono) with ready-to-paste CSS stacks, weights, source, the reason each pairing works, pairing rules, and a suggested type scale. Deterministic curated recommendations, not generic advice. Pair with generate_design_tokens to emit the fonts as tokens.",
  {
    intent: z.string().describe("The product/brand vibe or use case, e.g. 'trustworthy fintech dashboard', 'playful consumer app', 'minimal portfolio', 'AI developer product'"),
    limit: z.number().int().min(1).max(6).optional().describe("How many pairings to return (default 3)"),
  },
  async ({ intent, limit }) => {
    const matches = suggestFontPairing(intent, { limit: limit ?? 3 });
    return text(fontPairingReport(intent, matches));
  },
);

// ── Tool 16: fix contrast ────────────────────────────────────────────────────
tool(
  "fix_contrast",
  "Repair a failing color pair: given a foreground and background hex, compute the NEAREST accessible color (hue & saturation preserved, lightness nudged) that meets the WCAG 2.2 target — not just a pass/fail report. Use when audit_accessibility flags a pair and you need the corrected value to ship. For a full pass/fail audit use audit_accessibility; to build a whole palette use generate_color_system.",
  {
    foreground: z.string().describe("Foreground/text hex to adjust, e.g. '#9CA3AF'"),
    background: z.string().describe("Background hex it sits on, e.g. '#FFFFFF'"),
    target: z.number().min(1).max(21).optional().describe("Target contrast ratio (default 4.5 = AA normal text; use 3 for large text/UI, 7 for AAA)"),
    adjust: z.enum(["auto", "foreground", "background"]).optional().describe("Which color to move (default 'foreground' — the text)"),
  },
  async ({ foreground, background, target, adjust }) => {
    const fg = normalizeHex(foreground), bg = normalizeHex(background);
    if (!fg || !bg) return text(`Invalid hex. foreground="${foreground}", background="${background}". Use #RGB / #RRGGBB.`);
    const goal = target ?? 4.5;
    const current = +contrastRatio(fg, bg).toFixed(2);
    const which = adjust ?? "foreground";
    const lines = [
      `# fix_contrast — target ≥ ${goal}:1`,
      "",
      `Current: \`${fg}\` on \`${bg}\` → **${current}:1** ${current >= goal ? "✅ already passes" : "❌ fails"}`,
    ];
    if (current >= goal) {
      lines.push("", "No change needed.");
      return text(lines.join("\n"));
    }
    if (which === "background") {
      const r = suggestAccessibleColor(bg, fg, { target: goal });
      lines.push("", `**Fixed background:** \`${r.hex}\` → **${r.ratio.toFixed(2)}:1** ${r.reached ? "✅" : "⚠️ closest achievable"} (lightness Δ ${r.lightnessDelta})`);
    } else {
      const r = suggestAccessibleColor(fg, bg, { target: goal });
      lines.push("", `**Fixed foreground:** \`${r.hex}\` → **${r.ratio.toFixed(2)}:1** ${r.reached ? "✅" : "⚠️ closest achievable"} (lightness Δ ${r.lightnessDelta})`);
      if (!r.reached) {
        const rb = suggestAccessibleColor(bg, fg, { target: goal });
        lines.push(`\n_Foreground alone can't reach the target from this hue. Also adjusting the background to \`${rb.hex}\` gives ${rb.ratio.toFixed(2)}:1._`);
      }
    }
    lines.push("", "_Hue & saturation preserved; only lightness moved. Re-verify with audit_accessibility._");
    return text(lines.join("\n"));
  },
);

// ── Tool 17: suggest icon library ────────────────────────────────────────────
tool(
  "suggest_icon_library",
  "Recommend the right icon library for a product from an intent/vibe/platform (e.g. 'minimal SaaS dashboard', 'friendly consumer app with personality', 'iOS app', 'Android Material app', 'dense admin panel'). Returns matched open-source (or platform-native) icon systems with license, install command, coverage, the reason each fits, usage rules, and universal icon best-practices. Deterministic curated guidance — icons are NOT bundled; install the chosen library in your own project. Pair with suggest_font_pairing and generate_color_system.",
  {
    intent: z.string().describe("Product vibe / platform / use case, e.g. 'clean developer tool', 'premium fintech app', 'iOS native app', 'Material 3 Android app', 'data-dense dashboard'"),
    limit: z.number().int().min(1).max(6).optional().describe("How many libraries to return (default 3)"),
  },
  async ({ intent, limit }) => {
    const matches = suggestIconLibrary(intent, { limit: limit ?? 3 });
    return text(iconLibraryReport(intent, matches));
  },
);

// ── Tool 18: generate type scale ─────────────────────────────────────────────
tool(
  "generate_type_scale",
  "Generate a modular typographic scale from a base size and ratio: named steps (xs…6xl) with sizes, line-heights, letter-spacing, and optional fluid clamp() that scales display type down on small screens. Emits CSS custom properties and a Tailwind v4 @theme block. Deterministic real output. Pair with suggest_font_pairing and generate_design_tokens.",
  {
    base: z.number().min(10).max(24).optional().describe("Base body size in px (default 16)"),
    ratio: z.number().min(1.05).max(2).optional().describe("Modular ratio (default 1.25). Common: 1.2 minor-third, 1.25 major-third, 1.333 perfect-fourth, 1.5, 1.618 golden"),
    steps: z.number().int().min(3).max(7).optional().describe("Named steps above base (default 7 → up to 6xl)"),
    fluid: z.boolean().optional().describe("Emit fluid clamp() for headings (default true)"),
  },
  async ({ base, ratio, steps, fluid }) => text(typeScaleReport({ base, ratio, steps, fluid })),
);

// ── Tool 19: generate elevation system ───────────────────────────────────────
tool(
  "generate_elevation_system",
  "Generate a cohesive elevation / box-shadow ramp (layered ambient + direct light) with semantic level names (flat…modal), as CSS custom properties and Tailwind @theme, plus dark-mode guidance. Deterministic. Use one shadow token per level instead of hand-tuning shadows per component.",
  {
    levels: z.number().int().min(2).max(8).optional().describe("Number of raised levels (default 5)"),
    hue: z.string().optional().describe("Optional shadow tint as 'H S%' e.g. '220 40%' for a cool cast (default neutral black)"),
    strength: z.number().min(0.5).max(1.5).optional().describe("Opacity multiplier 0.5–1.5 (default 1)"),
  },
  async ({ levels, hue, strength }) => text(elevationReport({ levels, hue, strength })),
);

// ── Tool 20: generate motion ─────────────────────────────────────────────────
tool(
  "generate_motion",
  "Generate a motion system: easing tokens (decelerate/accelerate/standard/spring as cubic-beziers), duration tokens, and ready-to-paste keyframe animations (fade-in, slide-up, scale-in, spring-pop, shimmer) in CSS, Framer Motion, or SwiftUI — grounded in the animation-craft rules (ease-out on enter, small distances, never scale(0), honor reduced-motion). Deterministic real code.",
  {
    animation: z.enum(["all", ...MOTION_IDS] as [string, ...string[]]).optional().describe("Which animation to emit (default all)"),
    stack: z.enum(["css", "framer-motion", "swiftui", "all"]).optional().describe("Target stack (default css)"),
  },
  async ({ animation, stack }) => text(motionReport(animation === "all" ? undefined : animation, (stack as MotionStack) ?? "css")),
);

// ── Tool 21: design lint ─────────────────────────────────────────────────────
tool(
  "design_lint",
  "Lint a snippet of HTML / CSS / JSX / Tailwind for design & accessibility anti-patterns: hardcoded colors instead of tokens, px font-sizes, removed focus outlines, images without alt, clickable divs, icon-only buttons without labels, positive tabindex, ad-hoc radii, !important overuse. Returns findings with line numbers, severity, and fixes. "
    + "It reads source and does not measure anything: nothing is rendered, no contrast ratio is computed and no tap target is sized, so no finding is or can be a visual or an accessibility verdict. "
    + "Returns markdown plus structured output: findings (rule, severity, message, fix, doc, file, line), a severity summary, and a machine-readable `notVisible` list of what it could not check. "
    + "Fast static design-time check — not a replacement for a full audit. Complements design_review_checklist.",
  {
    code: z.string().describe("The HTML/CSS/JSX/Tailwind snippet to lint"),
  },
  async ({ code }) => {
    const { text: body, structured } = designLintReport(code);
    return { ...text(body), structuredContent: structured };
  },
  AUDIT_OUTPUT_SCHEMA,
);

// ── Tool 22: audit UX copy ───────────────────────────────────────────────────
tool(
  "audit_ux_copy",
  "Audit UI / marketing copy objectively: readability (Flesch reading ease + grade level), average sentence length, passive voice, jargon/hype words, filler, user-focus ('you' vs 'we'), and weak CTAs. Returns metrics plus specific flagged phrases and fixes. The machine-checkable slice of UX writing — pair with get_design_doc('ux-writing') for voice/tone judgment.",
  {
    text: z.string().describe("The copy to audit (a headline, paragraph, button label, error message, or full page copy)"),
  },
  async ({ text: copy }) => text(uxCopyReport(copy)),
);

// ── Tool 23: create design system (flagship orchestrator) ────────────────────
tool(
  "create_design_system",
  "THE one-call foundation. Turn a brand color + product vibe + platform into a complete, coherent design-system starter: accessibility-verified color (light+dark), a matched font pairing, an icon library, a modular type scale, an elevation ramp, ready-to-paste design tokens (CSS/Tailwind or SwiftUI/Compose), the components to build, and a build checklist — all generated to work together. Use this FIRST when someone says 'design/build me a website/app' to lay the foundation, then get_component_recipe for each component and get_design_roadmap for the full process.",
  {
    brand_color: z.string().describe("Brand / primary color as hex, e.g. '#4F46E5'"),
    vibe: z.string().describe("Product vibe / use case, e.g. 'modern SaaS dashboard', 'premium fintech app', 'bold marketing site', 'minimal portfolio'"),
    platform: z.enum(["web", "ios", "android", "all"]).optional().describe("Target platform (default web) — picks icon set and token output"),
    name: z.string().optional().describe("Brand/token name (default 'Brand')"),
  },
  async ({ brand_color, vibe, platform, name }) => {
    if (!normalizeHex(brand_color)) {
      return text(`"${brand_color}" is not a valid hex color. Use #RGB, #RRGGBB, or #RRGGBBAA (e.g. #4F46E5).`);
    }
    return text(createDesignSystem(brand_color, vibe, (platform as DSPlatform) ?? "web", name || "Brand"));
  },
);

// ── Tool 24: audit design system ─────────────────────────────────────────────
tool(
  "audit_design_system",
  "Measure how systematic an existing UI really is: paste CSS / SCSS / Tailwind / JSX source and get a consistency score plus the sprawl behind it — how many distinct colors, font sizes, radii, shadows and spacing values it actually uses, which colors are near-duplicates nobody can tell apart, which spacing is off the 4pt grid, token adoption, stray font families, !important and magic z-index. Returns a consolidation plan wired to the generators. Use it before a redesign, on an inherited codebase, or to prove a design system is (or isn't) being followed. Deterministic static analysis; complements design_lint (per-line anti-patterns) with a whole-codebase view.",
  {
    code: z.string().describe("The stylesheet / token file / component source to audit. Concatenate several files to audit them together."),
  },
  async ({ code }) => text(designSystemAuditReport(code)),
);

// ── Tool 25: generate layout system ──────────────────────────────────────────
tool(
  "generate_layout_system",
  "Generate the layout foundation the other generators leave out: breakpoints (with what changes at each), container max-widths, edge padding, a column grid, an intrinsic auto-fit card grid, container queries, and a fluid section-rhythm scale — as CSS custom properties and a Tailwind v4 @theme block, plus the rules that matter more than the numbers (design narrow-first, cap the measure at 45–75ch, prefer intrinsic layout to media queries). Deterministic real code. Pair with generate_type_scale and generate_design_tokens.",
  {
    preset: z.enum(["marketing-site", "web-app", "docs", "mobile-first"]).optional().describe("Layout archetype (default 'marketing-site'): 'web-app' for a dense app shell with a sidebar, 'docs' for a three-zone documentation layout, 'mobile-first' for a 4→12 column phone-first grid"),
    max_width: z.number().int().min(480).max(2560).optional().describe("Max content width in px (default depends on preset: 960–1440)"),
    columns: z.number().int().min(2).max(24).optional().describe("Grid columns (default 12, or 4 for mobile-first)"),
    gutter: z.number().int().min(4).max(64).optional().describe("Gutter between columns in px (default 16–32 by preset)"),
    container_queries: z.boolean().optional().describe("Include a container-query example so components respond to their own width (default true)"),
  },
  async ({ preset, max_width, columns, gutter, container_queries }) =>
    text(
      layoutSystemReport({
        preset: preset as LayoutPreset | undefined,
        maxWidth: max_width,
        columns,
        gutter,
        containerQueries: container_queries,
      }),
    ),
);

// ── Tool 26: compare design languages ────────────────────────────────────────
tool(
  "compare_design_languages",
  "Compare how iOS (HIG/Liquid Glass), Android (Material 3), macOS and the web each solve ONE design problem — navigation, buttons, modals/sheets, typography, color, elevation, motion, forms, lists, icons, search or settings. Returns a side-by-side table of the concrete conventions per platform, the rules for porting a design between them, and an explicit 'do NOT port' list. Use when building the same product on more than one platform, or when deciding whether a pattern that works on one platform belongs on another.",
  {
    topic: z.enum(COMPARE_TOPICS as unknown as [string, ...string[]]).describe("The surface to compare, e.g. 'navigation', 'buttons', 'modals-sheets', 'motion'"),
    platforms: z.array(z.enum(["ios", "android", "macos", "web"])).optional().describe("Which platforms to include as columns (default all four). e.g. ['ios','android'] for a mobile-only comparison"),
  },
  async ({ topic, platforms }) =>
    text(
      compareDesignLanguages(
        topic as CompareTopic,
        (platforms as ComparePlatform[] | undefined)?.length ? (platforms as ComparePlatform[]) : COMPARE_PLATFORMS,
      ),
    ),
);

// ── Tool 27: measure a screenshot ────────────────────────────────────────────
// The only tool that reads a file the caller names. It still makes no network
// call and writes nothing — it decodes one PNG and reports what the pixels say.
tool(
  "measure_screenshot",
  "Measure a real screenshot from its actual pixels — the exact palette and how many distinct colours it really uses, true WCAG contrast ratios for the colour pairs on screen, whitespace/density, and structural detections (left-edge alignment, vertical rhythm, off-grid gaps) each carrying a confidence level. Returns a markdown measurement and, on request, a self-contained HTML report you can save, open and share. PNG only. Reads the local file you name; makes no network call. Use it before critiquing a UI so the review cites measured numbers instead of impressions; pair with fix_contrast for failing pairs and audit_design_system for the codebase behind the screen.",
  {
    path: z.string().describe("Path to a .png screenshot. Absolute paths are strongly preferred — a relative path is resolved against the server's working directory, which is usually not your project folder."),
    scale: z.number().int().min(1).max(3).optional().describe("Device pixel ratio of the screenshot (default 1). Pass 2 for a Retina/2× capture so lengths are reported in logical px instead of image px."),
    format: z.enum(["markdown", "html", "both"]).optional().describe("'markdown' (default) for the measurement text, 'html' for a self-contained report document to save and open, 'both' for each."),
    max_colors: z.number().int().min(4).max(24).optional().describe("How many palette clusters to list (default 12)."),
  },
  async ({ path, scale, format, max_colors }) => {
    const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      return text(`There is no file at \`${abs}\`. Pass an absolute path to the .png screenshot.`);
    }
    if (!stat.isFile()) return text(`\`${abs}\` is not a file. Pass the path to a .png screenshot.`);
    if (stat.size > MAX_BYTES) {
      return text(`\`${abs}\` is ${(stat.size / 1048576).toFixed(1)} MB; the limit is 25 MB. Export a smaller PNG.`);
    }

    let report;
    try {
      const img = decodePng(readFileSync(abs));
      report = measure(img, { name: basename(abs), scale: scale as 1 | 2 | 3 | undefined, maxColors: max_colors });
    } catch (err) {
      if (err instanceof PngError) return text(`Could not read \`${basename(abs)}\`: ${err.message}`);
      return text(`Could not read \`${basename(abs)}\` as a PNG image.`);
    }

    const md = renderMarkdown(report);
    const want = format ?? "markdown";
    if (want === "markdown") return text(md);

    const html = renderHtml(report, {
      version: packageVersion(),
      measuredAt: new Date().toISOString().slice(0, 10),
    });
    const htmlBlock =
      "<!-- saglitzdesign:report:html -->\n" +
      "Save the document below as a .html file and open it in a browser — it is fully self-contained.\n\n" +
      html;

    return {
      content: want === "html"
        ? [{ type: "text" as const, text: htmlBlock }]
        : [{ type: "text" as const, text: md }, { type: "text" as const, text: htmlBlock }],
    };
  },
);

// ── Tool 28: import design tokens ────────────────────────────────────────────
// The inverse of generate_design_tokens, for the majority of projects that
// already have a design system and do not want a second one.
tool(
  "import_design_tokens",
  "Read an EXISTING design system and convert it: paste CSS custom properties (a Tailwind v4 @theme block, a shadcn :root block, plain CSS), a W3C DTCG token file, or a theme object as JSON, and get back the roles it names, the semantic roles it is missing, a WCAG contrast check on the pairs it defines, and the whole set re-emitted as CSS / Tailwind / SwiftUI / Compose / DTCG. The inverse of generate_design_tokens — use it to take a web theme to iOS or Android, to audit an inherited system, or to see what a third-party theme leaves undefined. Only NAMED tokens are read; a bare hex inside a rule carries no role and is never imported as one (use audit_design_system to count those). JavaScript configs are never evaluated.",
  {
    source: z.string().describe("The token source: CSS custom properties, DTCG JSON, or a theme object as JSON. The format is detected automatically."),
    format: z.enum(["css", "tailwind", "swiftui", "compose", "dtcg", "all"]).optional().describe("Format to re-emit in (default 'all'). Use 'swiftui' or 'compose' to take a web theme to native."),
    name: z.string().optional().describe("Token set / brand name for the emitted artifacts (default 'Imported')"),
  },
  async ({ source, format, name }) => text(importTokensReport(source, (format as TokenFormat) ?? "all", name || "Imported")),
);

// ── Tool 29: audit a whole project ───────────────────────────────────────────
tool(
  "audit_project",
  "Audit a real codebase instead of a pasted snippet: point it at a directory and it walks the design source, runs the design/accessibility lint over every file, and scores the whole thing for consistency — how many distinct colours, type sizes, radii, shadows and spacings the project actually uses, and which colours are indistinguishable duplicates. Returns findings ranked worst-file-first with file:line, plus an explicit list of what it did not look at. Cross-file drift is the thing a single-file lint cannot see, which is the point of this tool. Reads only the directory you name; makes no network call. Pair with measure_screenshot for the rendered result and audit_ux_copy for the words.",
  {
    path: z.string().describe("Directory to audit. Absolute paths are strongly preferred — a relative path is resolved against the server's working directory, which is usually not your project folder."),
    extensions: z.array(z.string()).optional().describe("Override which file extensions are scanned, e.g. ['.tsx','.css','.js']. Defaults to CSS/SCSS/HTML/JSX/TSX/Vue/Svelte/Astro; .js and .ts are excluded by default because most are logic, not UI."),
  },
  async ({ path, extensions }) => {
    const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      return text(`There is no directory at \`${abs}\`. Pass an absolute path to the folder you want audited.`);
    }
    if (!stat.isDirectory()) {
      return text(`\`${abs}\` is a file, not a directory. Use design_lint for a single file, or pass its parent folder.`);
    }
    return text(projectAuditReport(abs, extensions?.length ? extensions : undefined));
  },
);

// ── Tool 30: audit security ──────────────────────────────────────────────────
tool(
  "audit_security",
  "Audit a web project or snippet for security defects a frontend actually ships: missing or weak Content-Security-Policy, absent HSTS, unpinned cross-origin scripts, mixed content, credentials in localStorage, secret-named NEXT_PUBLIC_/VITE_ variables, unsandboxed third-party iframes, wildcard postMessage, raw-HTML sinks with no sanitiser, production source maps and un-ignored .env files. "
    + `${HEADER_SOURCES_SENTENCE}. `
    + "It reads source and does not measure anything: it makes no request to your site, tests no live endpoint, and no finding is or can be a penetration-test or vulnerability-scan result — so do not call it expecting one. "
    + "Returns markdown plus structured output: findings (rule, severity, message, fix, doc, file, line), a severity summary, and a machine-readable `notVisible` list of what it could not check. "
    + "A missing or non-directory path is returned as an error result, not as an empty audit. "
    + "Pair with audit_project for design drift and audit_accessibility for WCAG.",
  {
    path: z.string().optional().describe("Directory to audit. Absolute paths are strongly preferred. Required for configuration and header rules — a snippet cannot show them."),
    code: z.string().optional().describe("A single snippet to audit instead of a directory. Source rules only."),
    filename: z.string().optional().describe("Filename for the snippet, e.g. 'page.html' or 'Page.tsx'. Some rules depend on it: an inline onclick is a defect in HTML and normal JSX in a .tsx file."),
  },
  async ({ path, code, filename }) => {
    if (!path && !code) {
      return {
        ...text("Pass `path` for a project audit, or `code` for a single snippet. A project audit is the useful one — header and CSP rules need configuration files."),
        isError: true,
      };
    }
    if (path) {
      const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
      let stat;
      try {
        stat = statSync(abs);
      } catch {
        return { ...text(`There is no directory at \`${abs}\`. Pass an absolute path to the folder you want audited.`), isError: true };
      }
      if (!stat.isDirectory()) {
        return { ...text(`\`${abs}\` is a file, not a directory. Pass its parent folder, or use \`code\` for a single snippet.`), isError: true };
      }
      const { text: body, structured } = securityReport({ root: abs });
      return { ...text(body), structuredContent: structured };
    }
    const { text: body, structured } = securityReport({ source: code, filename });
    return { ...text(body), structuredContent: structured };
  },
  AUDIT_OUTPUT_SCHEMA,
);

// The shape `audit_generic_design` declares on top of every other structured
// auditor's `AUDIT_OUTPUT_SCHEMA` — the score `genericScore` computes,
// itemised exactly the way `genericReport`'s markdown prints it. See
// `GenericStructured` in generic.ts, which this is the wire-schema mirror of.
const GENERIC_OUTPUT_SCHEMA = {
  ...AUDIT_OUTPUT_SCHEMA,
  score: z
    .object({
      total: z.number().int().describe("0-100. Counts distinct signals, never occurrences — a page with forty stock cards carries the same one signal as a page with three."),
      items: z.array(
        z.object({
          weight: z.number().int().describe("What this rule contributed. Each rule contributes at most once."),
          rule: z.string().describe("The rule that contributed it."),
          evidence: z.string().describe("What was found, and where."),
        }),
      ).describe("Every point in `total`, itemised. There is no opaque number: a reader can disagree with one line rather than with a verdict."),
    })
    .describe("The generic-design score, itemised. Not a quality judgement — it counts documented defaults that were left unchanged."),
};

// ── Tool 31: audit generic design ────────────────────────────────────────────
tool(
  "audit_generic_design",
  "Audits a web project or snippet for the specific defaults generated interfaces reach for: the stock Tailwind indigo/violet/purple gradient (as classes, hex, or OKLCH), Inter/Roboto/Open Sans/DM Sans/Plus Jakarta Sans as the only declared typeface on a brand surface, emoji standing in for icons, the rounded-2xl + shadow-lg + border card recipe repeated across a page, gradient-filled heading text, an eyebrow label over every heading, the backdrop-blur + white/10 glassmorphism recipe, stock hype-opener copy ('unlock the power of', 'say goodbye to', …), stacked filler adverbs ('seamlessly', 'effortlessly', …), and a page whose every call to action is drawn from the stock set ('Get Started', 'Learn More'). "
    + "Every finding is a fact about the source text — a class name, a phrase, a repeated structure — never a judgement about whether the result is good design; it reports facts, not taste, so pair it with design_review_checklist or get_design_doc(\"design-critique-scoring\") for actual critique. "
    + "It reads source and does not measure anything: it makes no network request, renders nothing, and no finding is or can be a rendered-output or aesthetic judgement. "
    + "Returns markdown plus structured output: findings (rule, severity, message, fix, doc, file, line), a severity summary, a machine-readable `notVisible` list of what it could not check, and a 0-100 score itemised to the same rule, weight and evidence the markdown prints — each rule counts once no matter how many times it fires, so a long page never scores higher purely for its length. "
    + "In directory mode it does not read story, test or fixture files (*.stories.*, *.story.*, *.spec.*, *.test.*, __fixtures__/, __mocks__/), whose job is to demonstrate a component rather than ship a surface; it reports how many it skipped. The copy rules match English only, so a page in another language is scored by the visual rules alone. "
    + "A missing or non-directory path is returned as an error result, not as an empty audit. "
    + "Pair with audit_project for design drift and design_review_checklist for critique.",
  {
    path: z.string().optional().describe("Directory to audit. Absolute paths are strongly preferred."),
    code: z.string().optional().describe("A single snippet to audit instead of a directory."),
    filename: z.string().optional().describe("Filename for the snippet, e.g. 'page.html' or 'Page.tsx'. Some rules — the typeface check in particular — use it to tell a landing page from a dashboard."),
  },
  async ({ path, code, filename }) => {
    if (!path && !code) {
      return {
        ...text("Pass `path` for a project audit, or `code` for a single snippet."),
        isError: true,
      };
    }
    if (path) {
      const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
      let stat;
      try {
        stat = statSync(abs);
      } catch {
        return { ...text(`There is no directory at \`${abs}\`. Pass an absolute path to the folder you want audited.`), isError: true };
      }
      if (!stat.isDirectory()) {
        return { ...text(`\`${abs}\` is a file, not a directory. Pass its parent folder, or use \`code\` for a single snippet.`), isError: true };
      }
      const { text: body, structured } = genericReport({ root: abs });
      return { ...text(body), structuredContent: structured };
    }
    const { text: body, structured } = genericReport({ source: code, filename });
    return { ...text(body), structuredContent: structured };
  },
  GENERIC_OUTPUT_SCHEMA,
);

// ── Tools 32 & 33: audit SEO/GEO and performance ─────────────────────────────
//
// The first two tools here to return structured output; `design_lint` above
// now returns it too, and the rest of the audit surface is following. Most of
// this server answers a person reading markdown; these also answer an agent
// chaining `audit → fix`, which needs the findings as fields and — just as
// much — needs `notVisible`, the machine-readable account of what was never
// checked. A caller that reads silence as a clean bill is the failure these
// modules were written against, and prose alone cannot stop it.

/**
 * A tool description's list of what it checks, built from the auditor's own
 * capability table rather than written beside it.
 *
 * Both audit descriptions once advertised checks that did not exist and omitted
 * rules that did. A caller reads a tool description the way they read the
 * `notVisible` list — as a statement of reach — so "it looked and found
 * nothing" and "it never looked" have to be distinguishable from the blurb too.
 * Composing the sentence from the table makes an unbacked claim a compile
 * error's worth of impossible, and the suites assert the mapping both ways.
 */
const advertised = (capabilities: Array<{ text: string }>): string => {
  const items = capabilities.map((c) => c.text);
  // Semicolons, not commas: several entries carry commas of their own, and a
  // comma-joined list of them reads as one run-on sentence in which no reader
  // can tell where one check ends and the next begins.
  return items.length > 1
    ? `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`
    : items.join("");
};

tool(
  "audit_seo_geo",
  `Audit a page, a component or a whole web project for the SEO and GEO signals that are actually in the source: ${advertised(SEO_CAPABILITIES)}. `
    + "It reads source and does not measure anything: no request is made to your site, nothing is rendered, and no finding is or can be a Core Web Vitals result, an indexing status or a ranking outcome — so do not call it expecting a vitals or ranking report. "
    + "Absence is only ever claimed where it can be proven — a self-contained HTML document, or a whole directory — and a scan that hits its cap downgrades every absence claim to an unconfirmed note. "
    + "Returns markdown plus structured output: findings (rule, severity, message, fix, doc, file, line), a severity summary, and a machine-readable `notVisible` list of what it could not check. "
    + "A missing or non-directory path is returned as an error result, not as an empty audit. "
    + "Pair with audit_performance for the delivery signals, audit_ux_copy for whether the writing earns the click, and seo_geo_guide for the guidance behind the rules.",
  {
    path: z.string().optional().describe("Directory to audit. Absolute paths are strongly preferred. This is the useful mode — robots.txt, llms.txt, sitemap and project-wide metadata rules all need a directory."),
    code: z.string().optional().describe("A single snippet to audit instead of a directory. Page rules only."),
    filename: z.string().optional().describe("Filename for the snippet, e.g. 'index.html' or 'page.tsx'. Load-bearing: a plain HTML file carries its whole <head> and can prove metadata absent, a framework component cannot."),
  },
  async ({ path, code, filename }) => {
    if (!path && !code) {
      return {
        ...text("Pass `path` for a project audit, or `code` for a single snippet. A project audit is the useful one — robots.txt, llms.txt, sitemap and project-wide metadata rules all need a directory."),
        isError: true,
      };
    }
    if (path) {
      const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
      let stat;
      try {
        stat = statSync(abs);
      } catch {
        return { ...text(`There is no directory at \`${abs}\`. Pass an absolute path to the folder you want audited.`), isError: true };
      }
      if (!stat.isDirectory()) {
        return { ...text(`\`${abs}\` is a file, not a directory. Pass its parent folder, or use \`code\` for a single snippet.`), isError: true };
      }
      const { text: body, structured } = seoReport({ root: abs });
      return { ...text(body), structuredContent: structured };
    }
    const { text: body, structured } = seoReport({ source: code, filename });
    return { ...text(body), structuredContent: structured };
  },
  AUDIT_OUTPUT_SCHEMA,
);

tool(
  "audit_performance",
  `Audit a page, a component or a whole web project for the performance signals that are actually in the source: ${advertised(PERF_CAPABILITIES)}. `
    + "It reads source and does not measure anything: Core Web Vitals are 75th-percentile field data from real devices, this loads nothing and times nothing, and no finding is or can be an LCP, INP or CLS verdict — so do not call it expecting a vitals report. "
    + "Its hero rules are deliberately narrow (the first image inside <main>, with the header logo and the mid-article diagram structurally excluded), which means some pages get no hero finding at all; that limitation and the others are returned explicitly rather than left to read as a clean result. "
    + "Returns markdown plus structured output: findings (rule, severity, message, fix, doc, file, line), a severity summary, and a machine-readable `notVisible` list of what it could not check. "
    + "A missing or non-directory path is returned as an error result, not as an empty audit. "
    + "Pair with audit_seo_geo for the crawl and answer-engine signals, and measure_screenshot for the rendered result.",
  {
    path: z.string().optional().describe("Directory to audit. Absolute paths are strongly preferred. Every file is audited on its own — a stylesheet in another file does not size an image in this one, even when both are scanned."),
    code: z.string().optional().describe("A single snippet to audit instead of a directory."),
    filename: z.string().optional().describe("Filename for the snippet, e.g. 'index.html', 'Page.tsx' or 'styles.css'. Some rules depend on it: a stylesheet and a component are read differently."),
  },
  async ({ path, code, filename }) => {
    if (!path && !code) {
      return {
        ...text("Pass `path` for a project audit, or `code` for a single snippet. A project audit reads the stylesheets beside your markup, which a snippet cannot show."),
        isError: true,
      };
    }
    if (path) {
      const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
      let stat;
      try {
        stat = statSync(abs);
      } catch {
        return { ...text(`There is no directory at \`${abs}\`. Pass an absolute path to the folder you want audited.`), isError: true };
      }
      if (!stat.isDirectory()) {
        return { ...text(`\`${abs}\` is a file, not a directory. Pass its parent folder, or use \`code\` for a single snippet.`), isError: true };
      }
      const { text: body, structured } = perfReport({ root: abs });
      return { ...text(body), structuredContent: structured };
    }
    const { text: body, structured } = perfReport({ source: code, filename });
    return { ...text(body), structuredContent: structured };
  },
  AUDIT_OUTPUT_SCHEMA,
);

// ── resources ────────────────────────────────────────────────────────────────
// Tools are how an agent *asks*; resources are how a human *browses*. Exposing
// the knowledge base as resources lets clients @-mention a document directly
// (Claude Desktop, Cursor) and gives id autocompletion via completion/complete,
// without spending a tool call.

const DOC_URI = (id: string) => `saglitzdesign://doc/${id}`;
const RECIPE_URI = (component: string) => `saglitzdesign://recipe/${component}`;

function knowledgeIndexMarkdown(): string {
  const byCategory = new Map<string, KnowledgeDoc[]>();
  for (const d of docs) byCategory.set(d.category, [...(byCategory.get(d.category) ?? []), d]);
  const lines = [
    "# SaglitzDesign knowledge index",
    "",
    `${docs.length} documents · ${byCategory.size} categories · ${recipes.length} component recipes`,
    "",
  ];
  for (const [cat, list] of [...byCategory].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## ${cat} (${list.length})`);
    for (const d of list) lines.push(`- \`${d.id}\` — ${d.title} · ${d.platform} · updated ${d.updated}`);
    lines.push("");
  }
  lines.push("_Read one with the `saglitzdesign://doc/<id>` resource, or the get_design_doc tool._");
  return lines.join("\n");
}

server.registerResource(
  "knowledge-index",
  "saglitzdesign://index",
  {
    title: "SaglitzDesign knowledge index",
    description: "Every knowledge document grouped by category, with its id, platform and last-verified date.",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: knowledgeIndexMarkdown() }],
  }),
);

server.registerResource(
  "design-doc",
  new ResourceTemplate("saglitzdesign://doc/{id}", {
    list: async () => ({
      resources: docs.map((d) => ({
        uri: DOC_URI(d.id),
        name: d.id,
        title: d.title,
        description: `${d.category} · ${d.platform}${d.tags.length ? ` · ${d.tags.join(", ")}` : ""}`,
        mimeType: "text/markdown",
      })),
    }),
    complete: {
      id: async (value: string) => {
        const q = value.trim().toLowerCase();
        const ids = docs.map((d) => d.id);
        if (!q) return ids.slice(0, 100);
        const starts = ids.filter((id) => id.startsWith(q));
        const contains = ids.filter((id) => !id.startsWith(q) && id.includes(q));
        return [...starts, ...contains].slice(0, 100);
      },
    },
  }),
  {
    title: "Design knowledge document",
    description: "One full knowledge-base document — prescriptive rules, numbers, anti-patterns and cited sources.",
    mimeType: "text/markdown",
  },
  async (uri, { id }) => {
    const doc = findDoc(docs, String(id));
    if (!doc) throw new Error(`No design document with id "${id}". See saglitzdesign://index for the full list.`);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: fullDoc(doc) }] };
  },
);

server.registerResource(
  "component-recipe",
  new ResourceTemplate("saglitzdesign://recipe/{component}", {
    list: async () => ({
      resources: recipes.map((r) => ({
        uri: RECIPE_URI(r.component),
        name: r.component,
        title: `${r.component} recipe`,
        description: r.description || `Production-ready ${r.component} code — ${r.stacks.map((s) => s.stack).join(", ")}`,
        mimeType: "text/markdown",
      })),
    }),
    complete: {
      component: async (value: string) =>
        recipes.map((r) => r.component).filter((c) => c.startsWith(value.trim().toLowerCase())).slice(0, 100),
    },
  }),
  {
    title: "Component recipe",
    description: "Accessible reference implementation of a UI component, with its spec and every available stack.",
    mimeType: "text/markdown",
  },
  async (uri, { component }) => {
    const key = String(component).trim().toLowerCase();
    const r = recipes.find((x) => x.component === key);
    if (!r) throw new Error(`No component recipe for "${component}". Available: ${recipes.map((x) => x.component).join(", ")}.`);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: recipeText(r) }] };
  },
);

// ── prompts (user-invocable build/review/redesign workflows) ─────────────────
registerPrompts(server as never, {
  brief: z
    .string()
    .optional()
    .describe("What to build/review, in your words (audience, offer, stack, URL…). Optional — the workflow will ask for anything missing."),
});

// ── start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
// "ready on stdio", not "running": a log line that says only "running" reads as
// "serving" to anyone who deployed this somewhere, and the process will then sit
// on stdin forever without ever explaining why nothing can reach it.
const startup = [`SaglitzDesign MCP server ready on stdio — ${docs.length} knowledge docs (${builtinDocs.length} built in`];
if (userDocs.length) startup.push(`, ${userDocs.length} from ${userDirs.join(", ")}`);
startup.push(`) from ${knowledgeDir}`);
console.error(startup.join(""));

// A TTY on stdin means a person started this by hand rather than an MCP client
// wiring up a pipe. The server is working correctly and will now wait forever,
// which looks exactly like a hang — so say what it is waiting for.
if (process.stdin.isTTY) {
  console.error(
    "SaglitzDesign: no MCP client is connected — this server speaks MCP over stdio and is now " +
    "waiting for one on standard input. It has no HTTP endpoint and cannot be hosted remotely; " +
    "it is meant to be launched by your MCP client. See the README for configuration. (Ctrl-C to quit.)",
  );
}

// Never take a built-in document out of the base quietly: a team that shadows
// `buttons` should see that they did, and so should anyone debugging why the
// guidance changed.
if (overridden.length) {
  console.error(`SaglitzDesign: your documents replace ${overridden.length} built-in one(s): ${overridden.join(", ")}`);
}
if (unknownCategories.length) {
  console.error(
    `SaglitzDesign: category "${unknownCategories.join('", "')}" is outside the known vocabulary — ` +
    "those documents are searchable and readable, but category filters will not find them.",
  );
}
