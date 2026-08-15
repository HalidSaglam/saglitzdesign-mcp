// Curated catalogue data: the category/platform vocabularies, the per-project
// review checklists, the phased roadmaps, and the per-category freshness
// thresholds. Kept out of index.ts so it can be validated by tests without
// starting a server — tests/integrity.test.ts asserts that every doc id
// referenced here actually exists in the knowledge base.

import type { KnowledgeDoc } from "./knowledge.js";

export const CATEGORIES = ["design-language", "component", "ux", "seo", "geo", "pattern", "craft", "book", "process", "marketing", "security"] as const;
export const PLATFORMS = ["mobile", "web", "macos"] as const;

/**
 * The reference systems get_design_language serves. This is an orchestration
 * surface in its own right: a doc listed here is reachable by name even when no
 * project-type roadmap covers its platform (Fluent 2 → Windows, visionOS →
 * Vision Pro).
 */
export const DESIGN_LANGUAGES = [
  "material-3",
  "apple-hig-liquid-glass",
  "ios-app-design",
  "android-app-design",
  "macos-app-design",
  "apple-intelligence-design",
  "visionos-spatial-design",
  "wwdc-design-principles",
  "fluent-2",
  "web-trends-2026",
  "design-tokens-theming",
] as const;

// ── design_review_checklist ──────────────────────────────────────────────────
export const REVIEW_MAP: Record<string, string[]> = {
  "mobile-app": [
    "mobile-ux", "ios-app-design", "android-app-design", "android-patterns", "apple-intelligence-design",
    "apple-accessibility",
    "buttons", "forms-inputs", "navigation", "search-design", "mobile-navigation-home", "cards-lists-modals",
    "mobile-empty-states-buttons", "mobile-settings-lists",
    "principles-heuristics", "accessibility", "typography", "color-systems",
    "spacing-layout", "motion-microinteractions", "animation-craft", "wwdc-design-principles", "visual-craft-standards",
    "clean-app-design", "iconography", "brand-on-native-platforms", "interaction-design-classics", "ux-writing", "naming-features-and-labels", "i18n-localization",
    "onboarding-permission-priming", "ai-product-ux", "app-store-optimization", "ethical-design", "fintech-trust",
    "ai-feature-security",
  ],
  "macos-app": [
    "macos-app-design", "apple-hig-liquid-glass", "apple-accessibility", "apple-intelligence-design", "buttons", "forms-inputs",
    "cards-lists-modals", "principles-heuristics", "accessibility", "typography",
    "color-systems", "spacing-layout", "wwdc-design-principles", "animation-craft", "visual-craft-standards",
    "ux-writing", "i18n-localization",
  ],
  website: [
    "conversion-ux", "storybrand-copywriting", "value-proposition-jtbd", "buttons", "forms-inputs", "navigation",
    "information-architecture", "web-hero-sections", "web-feature-sections", "web-pricing-sections", "web-social-proof-footer",
    "principles-heuristics", "accessibility", "typography", "color-systems", "spacing-layout",
    "motion-microinteractions", "animation-craft", "visual-craft-standards", "ai-default-aesthetic", "clean-app-design", "iconography",
    "modern-css-design-primitives", "ux-writing", "naming-features-and-labels", "i18n-localization",
    "technical-seo", "on-page-seo", "seo-for-designers", "geo-tactics-checklist", "analytics-experimentation",
    "ethical-design", "ecommerce-checkout", "web-security-headers", "frontend-attack-surface",
    "privacy-consent-and-tracking",
  ],
  "landing-page": [
    "conversion-ux", "storybrand-copywriting", "value-proposition-jtbd", "influence-persuasion", "psychology-of-design",
    "web-hero-sections", "web-feature-sections", "web-social-proof-footer", "web-landing-signup", "buttons",
    "typography", "color-systems", "spacing-layout", "visual-craft-standards", "ai-default-aesthetic", "clean-app-design", "iconography",
    "seo-for-designers", "on-page-seo", "geo-tactics-checklist", "accessibility", "ethical-design",
    "privacy-consent-and-tracking",
  ],
  dashboard: [
    "navigation", "search-design", "web-dashboards", "cards-lists-modals", "data-visualization", "design-systems-methodology",
    "information-architecture", "theming-off-the-shelf", "principles-heuristics", "typography", "color-systems", "spacing-layout", "accessibility",
    "buttons", "forms-inputs", "visual-craft-standards", "ai-default-aesthetic", "clean-app-design", "iconography", "ux-writing",
    "i18n-localization", "ai-product-ux", "ethical-design", "web-security-headers", "auth-and-session-ux",
    "frontend-attack-surface", "ai-feature-security",
  ],
};

export const FOCUS_MAP: Record<string, (d: KnowledgeDoc) => boolean> = {
  all: () => true,
  ui: (d) => ["component", "design-language", "craft"].includes(d.category) || ["typography", "color-systems", "spacing-layout", "motion-microinteractions"].includes(d.id),
  ux: (d) => ["ux", "component"].includes(d.category) || d.id === "ux-writing",
  accessibility: (d) => d.id === "accessibility",
  seo: (d) => d.category === "seo",
  geo: (d) => d.category === "geo",
  security: (d) => d.category === "security",
  conversion: (d) => ["conversion-ux", "storybrand-copywriting", "influence-persuasion", "positioning-messaging"].includes(d.id) || d.category === "pattern",
  copywriting: (d) => ["ux-writing", "storybrand-copywriting", "positioning-messaging"].includes(d.id),
};

// ── get_design_roadmap ───────────────────────────────────────────────────────
export interface RoadmapPhase {
  title: string;
  goal: string;
  docs: string[];
}
export interface Roadmap {
  intro: string;
  fullGuides: string[];
  phases: RoadmapPhase[];
}

export const CORE_FOUNDATION = ["typography", "color-systems", "spacing-layout", "design-tokens-theming"];
export const CORE_CRAFT = ["visual-craft-standards", "typography-craft", "grid-typography-classics", "animation-craft", "emotional-design", "refactoring-ui"];
export const CORE_VALIDATE = ["design-critique-scoring", "accessibility", "principles-heuristics", "dont-make-me-think", "design-of-everyday-things"];

export const ROADMAPS: Record<string, Roadmap> = {
  website: {
    intro: "Marketing/company website. Order matters: positioning → copy → structure/SEO → design → CRO loop. Upstream fixes beat downstream polish.",
    fullGuides: ["marketing-website-roadmap", "product-design-roadmap"],
    phases: [
      { title: "1. Positioning & strategy", goal: "One positioning statement, one conversion goal, clear value prop, brand direction", docs: ["positioning-messaging", "value-proposition-jtbd", "branding-identity", "marketing-website-roadmap"] },
      { title: "2. Message & copy", goal: "Homepage narrative + proof inventory before wireframes", docs: ["storybrand-copywriting", "influence-persuasion", "psychology-of-design", "ux-writing"] },
      { title: "3. Architecture & SEO/GEO foundations", goal: "Page map by search intent; rendering, schema, llms.txt planned", docs: ["information-architecture", "on-page-seo", "technical-seo", "geo-tactics-checklist", "navigation"] },
      { title: "4. Wireframe & visual design", goal: "Real copy in layouts; conversion patterns; clean craft pass", docs: ["conversion-ux", "web-hero-sections", "web-feature-sections", "web-pricing-sections", "web-landing-signup", "web-social-proof-footer", "ecommerce-checkout", "clean-app-design", "web-trends-2026", "modern-css-design-primitives", "design-engineering", "i18n-localization", "ai-default-aesthetic", ...CORE_FOUNDATION, ...CORE_CRAFT] },
      { title: "5. Build, performance & hardening", goal: "CWV budget met; semantic, extractable HTML; security headers set and the injection sinks swept before launch, not after an audit", docs: ["seo-for-designers", "design-engineering", "modern-css-design-primitives", "accessibility", "motion-microinteractions", "web-security-headers", "frontend-attack-surface"] },
      { title: "6. Launch & growth loop", goal: "Instrumented funnel; growth loops; one-variable tests; GEO visibility; distribution; honest conversion", docs: ["marketing-website-roadmap", "growth-frameworks", "analytics-experimentation", "geo-fundamentals", "content-distribution", "email-marketing", "email-html-development", "ad-creative", "ethical-design", "privacy-consent-and-tracking", "design-critique-scoring"] },
    ],
  },
  "landing-page": {
    intro: "Single conversion-focused page. Condensed website roadmap: one goal, one narrative, ruthless proof.",
    fullGuides: ["marketing-website-roadmap"],
    phases: [
      { title: "1. Offer & message", goal: "Value prop + headline/subhead/CTA + risk reducers written first", docs: ["positioning-messaging", "value-proposition-jtbd", "branding-identity", "storybrand-copywriting", "conversion-ux"] },
      { title: "2. Page narrative", goal: "Hero → proof → benefits → objections → final CTA", docs: ["conversion-ux", "web-hero-sections", "web-feature-sections", "web-social-proof-footer", "web-landing-signup", "influence-persuasion", "psychology-of-design"] },
      { title: "3. Design & craft", goal: "CTA pops (squint test); clean & mobile-first", docs: ["buttons", ...CORE_FOUNDATION, "clean-app-design", "web-trends-2026", "visual-craft-standards", "ai-default-aesthetic", "refactoring-ui"] },
      { title: "4. Performance, SEO/GEO & launch", goal: "Lighthouse ≥90; schema + answer-first content; funnel instrumented; paid creative aligned; consent banner and tracking scripts reviewed before launch", docs: ["seo-for-designers", "on-page-seo", "geo-tactics-checklist", "ad-creative", "accessibility", "privacy-consent-and-tracking"] },
    ],
  },
  "ios-app": {
    intro: "iOS app, HIG/Liquid Glass era. Native navigation and platform conventions are non-negotiable; App Store presence is part of the design.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & positioning", goal: "Persona, job-to-be-done, success metric, competitor teardown", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & flows", goal: "≤5 tab destinations; critical flows mapped; trunk test", docs: ["information-architecture", "navigation", "search-design", "ios-app-design", "mobile-navigation-home"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; empty/loading/error/offline designed; permission priming planned", docs: ["ux-writing", "naming-features-and-labels", "mobile-empty-states-buttons", "onboarding-permission-priming", "i18n-localization", "dont-make-me-think"] },
      { title: "4. Design system on HIG baseline", goal: "Tokens + core components; Dynamic Type; dark mode", docs: ["apple-hig-liquid-glass", "ios-app-design", "apple-accessibility", "apple-intelligence-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "All states, all sizes; clean & calm; motion + haptics; reduced motion", docs: ["mobile-ux", "buttons", "forms-inputs", "cards-lists-modals", "clean-app-design", "brand-on-native-platforms", "ai-product-ux", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Monetization & key flows", goal: "Onboarding/paywall/auth/checkout patterns; pricing & growth loops; honest, non-dark-pattern flows", docs: ["mobile-onboarding-paywall", "onboarding-permission-priming", "paywall-benchmarks", "pricing-strategy", "mobile-auth-patterns", "mobile-checkout-payments", "mobile-settings-lists", "hooked-retention", "growth-frameworks", "ethical-design"] },
      { title: "7. Validate, list & ship", goal: "5-user tests; a11y audit; App Store listing (ASO) + assets; activation instrumented", docs: [...CORE_VALIDATE, "app-store-optimization", "ad-creative", "analytics-experimentation", "ios-app-design"] },
    ],
  },
  "android-app": {
    intro: "Android app on Material 3 (Expressive). Same skeleton as iOS but Material navigation, shapes and motion physics.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & positioning", goal: "Persona, job-to-be-done, success metric", docs: ["product-design-roadmap", "positioning-messaging"] },
      { title: "2. IA & flows", goal: "Nav bar destinations; critical flows; predictive back correct", docs: ["information-architecture", "android-app-design", "navigation", "search-design", "mobile-navigation-home"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; all edge states; permission priming planned", docs: ["ux-writing", "naming-features-and-labels", "mobile-empty-states-buttons", "onboarding-permission-priming", "i18n-localization", "dont-make-me-think"] },
      { title: "4. Design system on M3 baseline", goal: "Dynamic color, shape scale, motion springs, dark theme, edge-to-edge", docs: ["material-3", "android-app-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "All states/sizes; clean & calm; 60fps; reduced motion", docs: ["mobile-ux", "buttons", "forms-inputs", "cards-lists-modals", "clean-app-design", "brand-on-native-platforms", "ai-product-ux", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Monetization & key flows", goal: "Onboarding/paywall/auth/checkout patterns; pricing & growth loops; Android conventions; honest flows", docs: ["android-patterns", "mobile-onboarding-paywall", "onboarding-permission-priming", "paywall-benchmarks", "pricing-strategy", "mobile-auth-patterns", "mobile-checkout-payments", "mobile-settings-lists", "hooked-retention", "growth-frameworks", "ethical-design"] },
      { title: "7. Validate, list & ship", goal: "Usability tests; a11y (TalkBack); Play Store listing (ASO) + assets; activation instrumented", docs: [...CORE_VALIDATE, "app-store-optimization", "ad-creative", "analytics-experimentation", "android-app-design"] },
    ],
  },
  "macos-app": {
    intro: "macOS app. Keyboard-first, menu bar complete, multi-window sane, resizable everything — that's what 'native' means on Mac.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & app model", goal: "Document-based vs shoebox vs utility decided; persona + metric", docs: ["product-design-roadmap", "macos-app-design"] },
      { title: "2. IA: windows, menus, shortcuts", goal: "Window anatomy, full menu bar map, shortcut table BEFORE wireframes", docs: ["macos-app-design", "navigation"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real copy; empty/error/loading; resizing behavior per pane", docs: ["ux-writing", "cards-lists-modals", "mobile-empty-states-buttons", "i18n-localization", "dont-make-me-think"] },
      { title: "4. Design system on macOS HIG", goal: "Tokens; density for desktop; dark mode; Liquid Glass adoption", docs: ["macos-app-design", "apple-hig-liquid-glass", "apple-accessibility", "apple-intelligence-design", ...CORE_FOUNDATION] },
      { title: "5. Hi-fi design & craft", goal: "Pointer+keyboard interactions; drag & drop; undo everywhere", docs: ["buttons", "forms-inputs", "motion-microinteractions", ...CORE_CRAFT] },
      { title: "6. Validate & ship", goal: "Keyboard-only pass; VoiceOver; multi-window/multi-display QA", docs: CORE_VALIDATE },
    ],
  },
  "saas-web-app": {
    intro: "SaaS product UI (dashboard/app shell). Density, navigation clarity, data-viz and empty states decide perceived quality; pricing & growth loops decide the business.",
    fullGuides: ["product-design-roadmap"],
    phases: [
      { title: "1. Discovery & jobs", goal: "Core workflows ranked; jobs-to-be-done; success metric per workflow", docs: ["product-design-roadmap", "value-proposition-jtbd", "positioning-messaging"] },
      { title: "2. IA & app shell", goal: "Sidebar structure, command palette, breadcrumbs", docs: ["information-architecture", "navigation", "search-design", "web-dashboards"] },
      { title: "3. Wireframes, copy & edge states", goal: "Real data shapes; empty/loading/error/zero-results for every view", docs: ["ux-writing", "cards-lists-modals", "mobile-empty-states-buttons", "i18n-localization"] },
      { title: "4. Design system & data-viz", goal: "Token system + governance; density mode; tables/forms/charts standardized", docs: ["design-systems-methodology", "theming-off-the-shelf", "data-visualization", ...CORE_FOUNDATION, "forms-inputs", "buttons"] },
      { title: "5. Hi-fi & craft", goal: "Dense screens first; keyboard support; dark mode; clean & maintainable; hardened at the header level, across sign-in, session and account-recovery flows, and at the injection sinks in the client code", docs: [...CORE_CRAFT, "clean-app-design", "design-engineering", "ai-product-ux", "motion-microinteractions", "principles-heuristics", "web-security-headers", "auth-and-session-ux", "frontend-attack-surface", "ai-feature-security"] },
      { title: "6. Pricing, onboarding & retention", goal: "Value-based pricing; time-to-value <60s; activation instrumented; honest, non-manipulative flows", docs: ["pricing-strategy", "web-pricing-sections", "mobile-onboarding-paywall", "hooked-retention", "growth-frameworks", "conversion-ux", "email-marketing", "ethical-design"] },
      { title: "7. Validate & iterate", goal: "Task-based tests; heuristic score; clean design→dev handoff; metrics + experiments", docs: [...CORE_VALIDATE, "design-handoff", "analytics-experimentation"] },
    ],
  },
};

// ── knowledge_freshness ──────────────────────────────────────────────────────
export const STALE_DAYS: Record<string, number> = {
  // Security guidance rots dangerously rather than merely going out of style: a
  // reader who believes a stale claim thinks they are covered when they are not.
  // Hence the tightest threshold in the table.
  security: 90,
  seo: 120, geo: 120, "design-language": 240, pattern: 300,
  component: 365, ux: 365, craft: 365, book: 730, process: 365, marketing: 240,
};
