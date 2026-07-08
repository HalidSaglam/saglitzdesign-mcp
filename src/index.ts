#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { loadKnowledge, searchKnowledge, sections, type KnowledgeDoc } from "./knowledge.js";
import { loadExamples, searchExamples, imageMime } from "./examples.js";

// knowledge/ sits next to dist/ (repo root) both in dev (tsx) and after build
const here = dirname(fileURLToPath(import.meta.url));
const knowledgeDir = [join(here, "..", "knowledge"), join(here, "..", "..", "knowledge")].find(existsSync);
if (!knowledgeDir) {
  console.error("SaglitzDesign: knowledge/ directory not found");
  process.exit(1);
}
const docs = loadKnowledge(knowledgeDir);
const examplesDir = join(knowledgeDir, "examples");
const examples = loadExamples(examplesDir);

const server = new McpServer({
  name: "saglitzdesign",
  version: "0.3.1",
});

function docHeader(d: KnowledgeDoc): string {
  return `# ${d.title}\n_id: ${d.id} · category: ${d.category} · platform: ${d.platform} · tags: ${d.tags.join(", ")}_\n`;
}

function fullDoc(d: KnowledgeDoc): string {
  const src = d.sources.length ? `\n\n**Sources:** ${d.sources.join(" · ")}` : "";
  return `${docHeader(d)}\n${d.body}${src}`;
}

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

const CATEGORIES = ["design-language", "component", "ux", "seo", "geo", "pattern", "craft", "book", "process"] as const;
const PLATFORMS = ["mobile", "web", "macos"] as const;

// ── Tool 1: list ─────────────────────────────────────────────────────────────
server.tool(
  "list_design_knowledge",
  "List every document in the SaglitzDesign knowledge base (design languages, UI components, UX, SEO, GEO, real-world patterns). Use this first to see what expertise is available, then fetch docs with get_design_doc.",
  {
    category: z.enum(CATEGORIES).optional().describe("Filter by category"),
    platform: z.enum(PLATFORMS).optional().describe("Filter by platform (docs marked 'both' always included)"),
  },
  async ({ category, platform }) => {
    const filtered = docs.filter(
      (d) =>
        (!category || d.category === category) &&
        (!platform || d.platform === "both" || d.platform === platform),
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
server.tool(
  "search_design_knowledge",
  "Search the design knowledge base with a natural-language query. Covers web, iOS, Android and macOS design: UI components (buttons, forms, navigation…), UX principles, accessibility, typography, color, spacing, motion, conversion, copywriting, SEO, GEO (AI-search optimization), design languages (Material 3, Apple HIG/Liquid Glass, Fluent 2, iOS/macOS app design), expert craft standards, distilled classic design & marketing books (Norman, Krug, Refactoring UI, Cialdini, StoryBrand, Positioning, Hooked…), design-process roadmaps, and real-world patterns researched from top apps/sites (Mobbin). Returns the best-matching docs with the most relevant section excerpted.",
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
server.tool(
  "get_design_doc",
  "Fetch one knowledge-base document in full by its id (ids come from list_design_knowledge or search results).",
  {
    id: z.string().describe("Document id, e.g. 'buttons', 'material-3', 'geo-tactics-checklist'"),
  },
  async ({ id }) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) {
      const near = searchKnowledge(docs, id, { limit: 3 }).map((r) => r.doc.id);
      return text(`No document with id "${id}".${near.length ? ` Did you mean: ${near.join(", ")}?` : ""} Use list_design_knowledge to browse.`);
    }
    return text(fullDoc(doc));
  },
);

// ── Tool 4: component guidance ───────────────────────────────────────────────
server.tool(
  "get_component_guidance",
  "Expert guidance for designing a specific UI component or screen pattern (button, form, navigation, card, modal, hero section, pricing page, onboarding, paywall, checkout, empty state, dashboard…). Combines component specs with real-world patterns observed in top apps and websites.",
  {
    component: z.string().describe("Component or pattern name, e.g. 'primary button', 'signup form', 'bottom tab bar', 'hero section', 'paywall'"),
    platform: z.enum(PLATFORMS).optional().describe("Target platform — strongly recommended"),
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
server.tool(
  "get_design_language",
  "Full reference for a modern design language / platform design system: Material 3 (& Expressive), Apple HIG + Liquid Glass, deep iOS / Android / macOS app design guides, Fluent 2, 2026 web design trends, or design-token/theming architecture.",
  {
    language: z
      .enum(["material-3", "apple-hig-liquid-glass", "ios-app-design", "android-app-design", "macos-app-design", "fluent-2", "web-trends-2026", "design-tokens-theming"])
      .describe("Which design language / platform reference to fetch"),
  },
  async ({ language }) => {
    const doc = docs.find((d) => d.id === language);
    if (!doc) return text(`Reference "${language}" is not loaded in the knowledge base yet.`);
    return text(fullDoc(doc));
  },
);

// ── Tool 6: design review checklist ─────────────────────────────────────────
const REVIEW_MAP: Record<string, string[]> = {
  "mobile-app": [
    "mobile-ux", "ios-app-design", "android-app-design", "android-patterns",
    "buttons", "forms-inputs", "navigation", "cards-lists-modals",
    "principles-heuristics", "accessibility", "typography", "color-systems",
    "spacing-layout", "motion-microinteractions", "visual-craft-standards", "ux-writing",
  ],
  "macos-app": [
    "macos-app-design", "apple-hig-liquid-glass", "buttons", "forms-inputs",
    "cards-lists-modals", "principles-heuristics", "accessibility", "typography",
    "color-systems", "spacing-layout", "visual-craft-standards", "ux-writing",
  ],
  website: [
    "conversion-ux", "storybrand-copywriting", "buttons", "forms-inputs", "navigation",
    "principles-heuristics", "accessibility", "typography", "color-systems", "spacing-layout",
    "motion-microinteractions", "visual-craft-standards", "ux-writing",
    "technical-seo", "on-page-seo", "seo-for-designers", "geo-tactics-checklist",
  ],
  "landing-page": [
    "conversion-ux", "storybrand-copywriting", "influence-persuasion", "buttons",
    "typography", "color-systems", "spacing-layout", "visual-craft-standards",
    "seo-for-designers", "on-page-seo", "geo-tactics-checklist", "accessibility",
  ],
  dashboard: [
    "navigation", "cards-lists-modals", "principles-heuristics", "typography",
    "color-systems", "spacing-layout", "accessibility", "buttons", "forms-inputs",
    "visual-craft-standards", "ux-writing",
  ],
};

const FOCUS_MAP: Record<string, (d: KnowledgeDoc) => boolean> = {
  all: () => true,
  ui: (d) => ["component", "design-language", "craft"].includes(d.category) || ["typography", "color-systems", "spacing-layout", "motion-microinteractions"].includes(d.id),
  ux: (d) => ["ux", "component"].includes(d.category) || d.id === "ux-writing",
  accessibility: (d) => d.id === "accessibility",
  seo: (d) => d.category === "seo",
  geo: (d) => d.category === "geo",
  conversion: (d) => ["conversion-ux", "storybrand-copywriting", "influence-persuasion", "positioning-messaging"].includes(d.id) || d.category === "pattern",
  copywriting: (d) => ["ux-writing", "storybrand-copywriting", "positioning-messaging"].includes(d.id),
};

server.tool(
  "design_review_checklist",
  "Generate a structured design-review checklist for a project type (mobile app, website, landing page, dashboard), assembled from the knowledge base: key rules and anti-patterns per area. Use it to audit an existing design or as acceptance criteria for a new one.",
  {
    project_type: z.enum(["mobile-app", "macos-app", "website", "landing-page", "dashboard"]).describe("What is being reviewed"),
    focus: z.enum(["all", "ui", "ux", "accessibility", "seo", "geo", "conversion", "copywriting"]).optional().describe("Narrow the review to one dimension (default: all)"),
  },
  async ({ project_type, focus }) => {
    const focusFn = FOCUS_MAP[focus ?? "all"];
    const ids = REVIEW_MAP[project_type];
    const picked = ids.map((id) => docs.find((d) => d.id === id)).filter((d): d is KnowledgeDoc => !!d && focusFn(d));
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
interface RoadmapPhase {
  title: string;
  goal: string;
  docs: string[];
}
interface Roadmap {
  intro: string;
  fullGuides: string[];
  phases: RoadmapPhase[];
}

const CORE_FOUNDATION = ["typography", "color-systems", "spacing-layout", "design-tokens-theming"];
const CORE_CRAFT = ["visual-craft-standards", "typography-craft", "refactoring-ui"];
const CORE_VALIDATE = ["design-critique-scoring", "accessibility", "principles-heuristics", "dont-make-me-think"];

const ROADMAPS: Record<string, Roadmap> = {
  website: {
    intro: "Marketing/company website. Order matters: positioning → copy → structure/SEO → design → CRO loop. Upstream fixes beat downstream polish.",
    fullGuides: ["marketing-website-roadmap", "product-design-roadmap"],
    phases: [
      { title: "1. Positioning & strategy", goal: "One positioning statement, one conversion goal", docs: ["positioning-messaging", "marketing-website-roadmap"] },
      { title: "2. Message & copy", goal: "Homepage narrative + proof inventory before wireframes", docs: ["storybrand-copywriting", "influence-persuasion", "ux-writing"] },
      { title: "3. Architecture & SEO/GEO foundations", goal: "Page map by search intent; rendering, schema, llms.txt planned", docs: ["on-page-seo", "technical-seo", "geo-tactics-checklist", "navigation"] },
      { title: "4. Wireframe & visual design", goal: "Real copy in layouts; conversion patterns; craft pass", docs: ["conversion-ux", "hero-sections", "pricing-sections", "landing-signup", ...CORE_FOUNDATION, ...CORE_CRAFT] },
      { title: "5. Build & performance", goal: "CWV budget met; semantic, extractable HTML", docs: ["seo-for-designers", "accessibility", "motion-microinteractions"] },
      { title: "6. Launch & CRO loop", goal: "Instrumented funnel; one-variable tests; GEO visibility tracking", docs: ["marketing-website-roadmap", "geo-fundamentals", "design-critique-scoring"] },
    ],
  },
  "landing-page": {
    intro: "Single conversion-focused page. Condensed website roadmap: one goal, one narrative, ruthless proof.",
    fullGuides: ["marketing-website-roadmap"],
    phases: [
      { title: "1. Offer & message", goal: "Headline/subhead/CTA + risk reducers written first", docs: ["positioning-messaging", "storybrand-copywriting", "conversion-ux"] },
      { title: "2. Page narrative", goal: "Hero → proof → benefits → objections → final CTA", docs: ["conversion-ux", "hero-sections", "social-proof-footer", "influence-persuasion"] },
      { title: "3. Design & craft", goal: "CTA pops (squint test); mobile-first", docs: ["buttons", ...CORE_FOUNDATION, "visual-craft-standards", "refactoring-ui"] },
      { title: "4. Performance, SEO/GEO & launch", goal: "Lighthouse ≥90; schema + answer-first content; funnel instrumented", docs: ["seo-for-designers", "on-page-seo", "geo-tactics-checklist", "accessibility"] },
    ],
  },
  "ios-app": {
    intro: "iOS app, HIG/Liquid Glass era. Native navigation and platform conventions are non-negotiable; App Store presence is part of the design.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & positioning", goal: "Persona, job-to-be-done, success metric, competitor teardown", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & flows", goal: "≤5 tab destinations; critical flows mapped; trunk test", docs: ["navigation", "ios-app-design", "navigation-home"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; empty/loading/error/offline designed", docs: ["ux-writing", "empty-states-buttons", "dont-make-me-think"] },
      { title: "4. Design system on HIG baseline", goal: "Tokens + core components; Dynamic Type; dark mode", docs: ["apple-hig-liquid-glass", "ios-app-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "All states, all sizes; motion + haptics spec; reduced motion", docs: ["mobile-ux", "buttons", "forms-inputs", "cards-lists-modals", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Patterns for key flows", goal: "Onboarding/paywall/auth/checkout follow proven patterns", docs: ["onboarding-paywall", "auth-patterns", "checkout-payments", "settings-lists", "hooked-retention"] },
      { title: "7. Validate & ship", goal: "5-user tests; a11y audit; App Store assets; design QA on device", docs: [...CORE_VALIDATE, "ios-app-design"] },
    ],
  },
  "android-app": {
    intro: "Android app on Material 3 (Expressive). Same skeleton as iOS but Material navigation, shapes and motion physics.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & positioning", goal: "Persona, job-to-be-done, success metric", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & flows", goal: "Nav bar destinations; critical flows; predictive back correct", docs: ["android-app-design", "navigation", "navigation-home"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; all edge states", docs: ["ux-writing", "empty-states-buttons", "dont-make-me-think"] },
      { title: "4. Design system on M3 baseline", goal: "Dynamic color, shape scale, motion springs, dark theme, edge-to-edge", docs: ["material-3", "android-app-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "All states/sizes; 60fps; reduced motion", docs: ["mobile-ux", "buttons", "forms-inputs", "cards-lists-modals", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Patterns for key flows", goal: "Onboarding/paywall/auth/checkout via proven patterns; Android conventions respected", docs: ["android-patterns", "onboarding-paywall", "auth-patterns", "checkout-payments", "settings-lists", "hooked-retention"] },
      { title: "7. Validate & ship", goal: "Usability tests; a11y (TalkBack); Play Store assets", docs: [...CORE_VALIDATE, "android-app-design"] },
    ],
  },
  "macos-app": {
    intro: "macOS app. Keyboard-first, menu bar complete, multi-window sane, resizable everything — that's what 'native' means on Mac.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & app model", goal: "Document-based vs shoebox vs utility decided; persona + metric", docs: ["product-design-roadmap", "macos-app-design"] },
      { title: "2. IA: windows, menus, shortcuts", goal: "Window anatomy, full menu bar map, shortcut table BEFORE wireframes", docs: ["macos-app-design", "navigation"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; empty/error/loading; resizing behavior per pane", docs: ["ux-writing", "cards-lists-modals", "dont-make-me-think"] },
      { title: "4. Design system on macOS HIG", goal: "Tokens; density for desktop; dark mode; Liquid Glass adoption", docs: ["macos-app-design", "apple-hig-liquid-glass", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "Pointer+keyboard interactions; drag & drop; undo everywhere", docs: ["buttons", "forms-inputs", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Validate & ship", goal: "Keyboard-only pass; VoiceOver; multi-window/multi-display QA", docs: CORE_VALIDATE },
    ],
  },
  "saas-web-app": {
    intro: "SaaS product UI (dashboard/app shell). Density, navigation clarity and empty states decide perceived quality.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & jobs", goal: "Core workflows ranked; success metric per workflow", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & app shell", goal: "Sidebar structure, command palette, breadcrumbs", docs: ["navigation", "dashboards"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real data shapes; empty/loading/error/zero-results for every view", docs: ["ux-writing", "cards-lists-modals", "empty-states-buttons"] },
      { title: "4. Design system", goal: "Tokens incl. density mode; tables/forms/charts standardized", docs: [...CORE_FOUNDATION, "forms-inputs", "buttons"] },
      { title: "5. Hi-fi & craft", goal: "Dense screens first; keyboard support; dark mode", docs: [...CORE_CRAFT, "motion-microinteractions", "principles-heuristics"] },
      { title: "6. Onboarding & retention", goal: "Time-to-value <60s; activation instrumented", docs: ["onboarding-paywall", "hooked-retention", "conversion-ux"] },
      { title: "7. Validate & iterate", goal: "Task-based tests; heuristic score; funnel review cadence", docs: CORE_VALIDATE },
    ],
  },
};

server.tool(
  "get_design_roadmap",
  "The SaglitzDesign roadmap: a phased, expert design process for a given project type (website, landing page, iOS app, Android app, macOS app, SaaS web app). Each phase has a goal and the exact knowledge-base docs to consult. Use this FIRST when starting any design project, then fetch phase docs as you reach them.",
  {
    project_type: z.enum(["website", "landing-page", "ios-app", "android-app", "macos-app", "saas-web-app"]).describe("What is being designed"),
  },
  async ({ project_type }) => {
    const rm = ROADMAPS[project_type];
    const known = new Set(docs.map((d) => d.id));
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
      const available = phase.docs.filter((id) => known.has(id));
      lines.push(`**Consult:** ${available.map((id) => `\`${id}\``).join(", ")}`);
      lines.push("");
    }
    lines.push("_Fetch any doc with get_design_doc(id). Audit finished work with design_review_checklist._");
    return text(lines.join("\n"));
  },
);

// ── Tool 8: SEO / GEO guide ──────────────────────────────────────────────────
server.tool(
  "seo_geo_guide",
  "Search-optimization expertise for websites: classic SEO (technical, on-page, design-impact) and GEO — Generative Engine Optimization for AI answer engines (ChatGPT, Perplexity, Google AI Overviews). Returns the full relevant guides.",
  {
    scope: z.enum(["seo", "geo", "both"]).describe("Which discipline"),
    topic: z.string().optional().describe("Optional narrower topic, e.g. 'core web vitals', 'llms.txt', 'structured data'"),
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
server.tool(
  "get_design_examples",
  "Fetch REAL screenshot examples of a design pattern from top apps and websites (curated from Mobbin). Returns the actual images plus notes on what each does well — use these as visual references when designing paywalls, onboarding, auth, navigation, checkout, settings, empty states, heroes, pricing, features, social proof, signup pages, dashboards and footers.",
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
      } else {
        content.push({
          type: "text",
          text: `(screenshot not bundled in this installation — view it at ${e.mobbin_url})`,
        });
      }
    }
    return { content };
  },
);

// ── Tool 10: knowledge freshness ─────────────────────────────────────────────
const STALE_DAYS: Record<string, number> = {
  seo: 120, geo: 120, "design-language": 240, pattern: 300,
  component: 365, ux: 365, craft: 365, book: 730, process: 365, marketing: 240,
};

server.tool(
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

// ── start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`SaglitzDesign MCP server running — ${docs.length} knowledge docs loaded from ${knowledgeDir}`);
