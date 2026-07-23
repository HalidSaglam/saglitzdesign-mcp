#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { loadKnowledge, searchKnowledge, sections, type KnowledgeDoc } from "./knowledge.js";
import { loadExamples, searchExamples, imageMime } from "./examples.js";
import { registerPrompts } from "./prompts.js";
import {
  generateTokens, validateColors, DEFAULT_SPACING, DEFAULT_RADII, DEFAULT_FONT_SIZES, DEFAULT_FONT_FAMILIES,
  type TokenSpec, type TokenFormat,
} from "./tokens.js";
import { contrastReport, contrastRatio, type ContrastPair, type TapTarget } from "./a11y.js";
import { loadRecipes, recipeText } from "./recipes.js";
import { generateColorSystem, colorSystemReport, suggestAccessibleColor } from "./color.js";
import { suggestFontPairing, fontPairingReport } from "./fonts.js";
import { suggestIconLibrary, iconLibraryReport } from "./icons.js";
import { typeScaleReport } from "./typescale.js";
import { elevationReport } from "./elevation.js";
import { motionReport, MOTION_IDS, type MotionStack } from "./motion.js";
import { designLintReport } from "./lint.js";
import { uxCopyReport } from "./uxcopy.js";
import { createDesignSystem, type DSPlatform } from "./designsystem.js";
import { normalizeHex } from "./tokens.js";

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
const repoRoot = join(knowledgeDir, "..");
const recipes = loadRecipes(join(repoRoot, "recipes"));

const server = new McpServer({
  name: "saglitzdesign",
  version: "0.14.0",
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

const CATEGORIES = ["design-language", "component", "ux", "seo", "geo", "pattern", "craft", "book", "process", "marketing"] as const;
const PLATFORMS = ["mobile", "web", "macos"] as const;

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

function tool(name: string, description: string, schema: Record<string, unknown>, cb: (args: any) => unknown) {
  const title = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (server.registerTool as (n: string, c: unknown, cb: unknown) => unknown)(
    name,
    { title, description, inputSchema: schema, annotations: { title, ...READONLY_ANNOTATIONS } },
    cb,
  );
}

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
    const doc = docs.find((d) => d.id === id);
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
      .enum(["material-3", "apple-hig-liquid-glass", "ios-app-design", "android-app-design", "macos-app-design", "apple-intelligence-design", "visionos-spatial-design", "wwdc-design-principles", "fluent-2", "web-trends-2026", "design-tokens-theming"])
      .describe("Which reference to fetch. e.g. 'material-3' (Android/Material), 'apple-hig-liquid-glass' or 'ios-app-design' (iOS), 'macos-app-design', 'visionos-spatial-design' (Vision Pro), 'web-trends-2026', 'design-tokens-theming'."),
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
    "mobile-ux", "ios-app-design", "android-app-design", "android-patterns", "apple-intelligence-design",
    "buttons", "forms-inputs", "navigation", "cards-lists-modals",
    "principles-heuristics", "accessibility", "typography", "color-systems",
    "spacing-layout", "motion-microinteractions", "animation-craft", "wwdc-design-principles", "visual-craft-standards",
    "clean-app-design", "iconography", "interaction-design-classics", "ux-writing",
    "onboarding-permission-priming", "app-store-optimization", "ethical-design", "fintech-trust",
  ],
  "macos-app": [
    "macos-app-design", "apple-hig-liquid-glass", "apple-intelligence-design", "buttons", "forms-inputs",
    "cards-lists-modals", "principles-heuristics", "accessibility", "typography",
    "color-systems", "spacing-layout", "wwdc-design-principles", "animation-craft", "visual-craft-standards", "ux-writing",
  ],
  website: [
    "conversion-ux", "storybrand-copywriting", "value-proposition-jtbd", "buttons", "forms-inputs", "navigation",
    "principles-heuristics", "accessibility", "typography", "color-systems", "spacing-layout",
    "motion-microinteractions", "animation-craft", "visual-craft-standards", "clean-app-design", "iconography", "ux-writing",
    "technical-seo", "on-page-seo", "seo-for-designers", "geo-tactics-checklist", "analytics-experimentation",
    "ethical-design", "ecommerce-checkout",
  ],
  "landing-page": [
    "conversion-ux", "storybrand-copywriting", "value-proposition-jtbd", "influence-persuasion", "buttons",
    "typography", "color-systems", "spacing-layout", "visual-craft-standards", "clean-app-design", "iconography",
    "seo-for-designers", "on-page-seo", "geo-tactics-checklist", "accessibility", "ethical-design",
  ],
  dashboard: [
    "navigation", "cards-lists-modals", "data-visualization", "design-systems-methodology",
    "principles-heuristics", "typography", "color-systems", "spacing-layout", "accessibility",
    "buttons", "forms-inputs", "visual-craft-standards", "clean-app-design", "iconography", "ux-writing", "ethical-design",
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
const CORE_CRAFT = ["visual-craft-standards", "typography-craft", "animation-craft", "refactoring-ui"];
const CORE_VALIDATE = ["design-critique-scoring", "accessibility", "principles-heuristics", "dont-make-me-think"];

const ROADMAPS: Record<string, Roadmap> = {
  website: {
    intro: "Marketing/company website. Order matters: positioning → copy → structure/SEO → design → CRO loop. Upstream fixes beat downstream polish.",
    fullGuides: ["marketing-website-roadmap", "product-design-roadmap"],
    phases: [
      { title: "1. Positioning & strategy", goal: "One positioning statement, one conversion goal, clear value prop", docs: ["positioning-messaging", "value-proposition-jtbd", "marketing-website-roadmap"] },
      { title: "2. Message & copy", goal: "Homepage narrative + proof inventory before wireframes", docs: ["storybrand-copywriting", "influence-persuasion", "ux-writing"] },
      { title: "3. Architecture & SEO/GEO foundations", goal: "Page map by search intent; rendering, schema, llms.txt planned", docs: ["on-page-seo", "technical-seo", "geo-tactics-checklist", "navigation"] },
      { title: "4. Wireframe & visual design", goal: "Real copy in layouts; conversion patterns; clean craft pass", docs: ["conversion-ux", "hero-sections", "pricing-sections", "landing-signup", "ecommerce-checkout", "clean-app-design", "design-engineering", ...CORE_FOUNDATION, ...CORE_CRAFT] },
      { title: "5. Build & performance", goal: "CWV budget met; semantic, extractable HTML", docs: ["seo-for-designers", "design-engineering", "accessibility", "motion-microinteractions"] },
      { title: "6. Launch & growth loop", goal: "Instrumented funnel; growth loops; one-variable tests; GEO visibility; honest conversion", docs: ["marketing-website-roadmap", "growth-frameworks", "analytics-experimentation", "geo-fundamentals", "ethical-design", "design-critique-scoring"] },
    ],
  },
  "landing-page": {
    intro: "Single conversion-focused page. Condensed website roadmap: one goal, one narrative, ruthless proof.",
    fullGuides: ["marketing-website-roadmap"],
    phases: [
      { title: "1. Offer & message", goal: "Value prop + headline/subhead/CTA + risk reducers written first", docs: ["positioning-messaging", "value-proposition-jtbd", "storybrand-copywriting", "conversion-ux"] },
      { title: "2. Page narrative", goal: "Hero → proof → benefits → objections → final CTA", docs: ["conversion-ux", "hero-sections", "social-proof-footer", "influence-persuasion"] },
      { title: "3. Design & craft", goal: "CTA pops (squint test); clean & mobile-first", docs: ["buttons", ...CORE_FOUNDATION, "clean-app-design", "visual-craft-standards", "refactoring-ui"] },
      { title: "4. Performance, SEO/GEO & launch", goal: "Lighthouse ≥90; schema + answer-first content; funnel instrumented", docs: ["seo-for-designers", "on-page-seo", "geo-tactics-checklist", "accessibility"] },
    ],
  },
  "ios-app": {
    intro: "iOS app, HIG/Liquid Glass era. Native navigation and platform conventions are non-negotiable; App Store presence is part of the design.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & positioning", goal: "Persona, job-to-be-done, success metric, competitor teardown", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & flows", goal: "≤5 tab destinations; critical flows mapped; trunk test", docs: ["navigation", "ios-app-design", "navigation-home"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; empty/loading/error/offline designed; permission priming planned", docs: ["ux-writing", "empty-states-buttons", "onboarding-permission-priming", "dont-make-me-think"] },
      { title: "4. Design system on HIG baseline", goal: "Tokens + core components; Dynamic Type; dark mode", docs: ["apple-hig-liquid-glass", "ios-app-design", "apple-intelligence-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "All states, all sizes; clean & calm; motion + haptics; reduced motion", docs: ["mobile-ux", "buttons", "forms-inputs", "cards-lists-modals", "clean-app-design", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Monetization & key flows", goal: "Onboarding/paywall/auth/checkout patterns; pricing & growth loops; honest, non-dark-pattern flows", docs: ["onboarding-paywall", "onboarding-permission-priming", "paywall-benchmarks", "pricing-strategy", "auth-patterns", "checkout-payments", "settings-lists", "hooked-retention", "growth-frameworks", "ethical-design"] },
      { title: "7. Validate, list & ship", goal: "5-user tests; a11y audit; App Store listing (ASO) + assets; activation instrumented", docs: [...CORE_VALIDATE, "app-store-optimization", "analytics-experimentation", "ios-app-design"] },
    ],
  },
  "android-app": {
    intro: "Android app on Material 3 (Expressive). Same skeleton as iOS but Material navigation, shapes and motion physics.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & positioning", goal: "Persona, job-to-be-done, success metric", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & flows", goal: "Nav bar destinations; critical flows; predictive back correct", docs: ["android-app-design", "navigation", "navigation-home"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; all edge states; permission priming planned", docs: ["ux-writing", "empty-states-buttons", "onboarding-permission-priming", "dont-make-me-think"] },
      { title: "4. Design system on M3 baseline", goal: "Dynamic color, shape scale, motion springs, dark theme, edge-to-edge", docs: ["material-3", "android-app-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "All states/sizes; clean & calm; 60fps; reduced motion", docs: ["mobile-ux", "buttons", "forms-inputs", "cards-lists-modals", "clean-app-design", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Monetization & key flows", goal: "Onboarding/paywall/auth/checkout patterns; pricing & growth loops; Android conventions; honest flows", docs: ["android-patterns", "onboarding-paywall", "onboarding-permission-priming", "paywall-benchmarks", "pricing-strategy", "auth-patterns", "checkout-payments", "settings-lists", "hooked-retention", "growth-frameworks", "ethical-design"] },
      { title: "7. Validate, list & ship", goal: "Usability tests; a11y (TalkBack); Play Store listing (ASO) + assets; activation instrumented", docs: [...CORE_VALIDATE, "app-store-optimization", "analytics-experimentation", "android-app-design"] },
    ],
  },
  "macos-app": {
    intro: "macOS app. Keyboard-first, menu bar complete, multi-window sane, resizable everything — that's what 'native' means on Mac.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & app model", goal: "Document-based vs shoebox vs utility decided; persona + metric", docs: ["product-design-roadmap", "macos-app-design"] },
      { title: "2. IA: windows, menus, shortcuts", goal: "Window anatomy, full menu bar map, shortcut table BEFORE wireframes", docs: ["macos-app-design", "navigation"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; empty/error/loading; resizing behavior per pane", docs: ["ux-writing", "cards-lists-modals", "dont-make-me-think"] },
      { title: "4. Design system on macOS HIG", goal: "Tokens; density for desktop; dark mode; Liquid Glass adoption", docs: ["macos-app-design", "apple-hig-liquid-glass", "apple-intelligence-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "Pointer+keyboard interactions; drag & drop; undo everywhere", docs: ["buttons", "forms-inputs", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Validate & ship", goal: "Keyboard-only pass; VoiceOver; multi-window/multi-display QA", docs: CORE_VALIDATE },
    ],
  },
  "saas-web-app": {
    intro: "SaaS product UI (dashboard/app shell). Density, navigation clarity, data-viz and empty states decide perceived quality; pricing & growth loops decide the business.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & jobs", goal: "Core workflows ranked; jobs-to-be-done; success metric per workflow", docs: ["product-design-roadmap", "value-proposition-jtbd", "positioning-messaging"] },
      { title: "2. IA & app shell", goal: "Sidebar structure, command palette, breadcrumbs", docs: ["navigation", "dashboards"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real data shapes; empty/loading/error/zero-results for every view", docs: ["ux-writing", "cards-lists-modals", "empty-states-buttons"] },
      { title: "4. Design system & data-viz", goal: "Token system + governance; density mode; tables/forms/charts standardized", docs: ["design-systems-methodology", "data-visualization", ...CORE_FOUNDATION, "forms-inputs", "buttons"] },
      { title: "5. Hi-fi & craft", goal: "Dense screens first; keyboard support; dark mode; clean & maintainable", docs: [...CORE_CRAFT, "clean-app-design", "design-engineering", "motion-microinteractions", "principles-heuristics"] },
      { title: "6. Pricing, onboarding & retention", goal: "Value-based pricing; time-to-value <60s; activation instrumented; honest, non-manipulative flows", docs: ["pricing-strategy", "onboarding-paywall", "hooked-retention", "growth-frameworks", "conversion-ux", "ethical-design"] },
      { title: "7. Validate & iterate", goal: "Task-based tests; heuristic score; clean design→dev handoff; metrics + experiments", docs: [...CORE_VALIDATE, "design-handoff", "analytics-experimentation"] },
    ],
  },
};

tool(
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
tool(
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
  },
  async ({ component, stack }) => {
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
    return text(recipeText(r, stack));
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
  "Lint a snippet of HTML / CSS / JSX / Tailwind for design & accessibility anti-patterns: hardcoded colors instead of tokens, px font-sizes, removed focus outlines, images without alt, clickable divs, icon-only buttons without labels, positive tabindex, ad-hoc radii, !important overuse. Returns findings with line numbers, severity, and fixes. Fast static design-time check — not a replacement for a full audit. Complements design_review_checklist.",
  {
    code: z.string().describe("The HTML/CSS/JSX/Tailwind snippet to lint"),
  },
  async ({ code }) => text(designLintReport(code)),
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
console.error(`SaglitzDesign MCP server running — ${docs.length} knowledge docs loaded from ${knowledgeDir}`);
