---
id: product-design-roadmap
title: "Product Design Roadmap — From Idea to Shipped Interface"
category: process
platform: both
tags: [process, roadmap, workflow, discovery, wireframe, design-system, testing]
sources: ["Synthesized from Norman, Krug, Dunford, Refactoring UI, Apple HIG, Material 3, NN/g research methods"]
updated: 2026-07-08
---

# Product Design Roadmap — From Idea to Shipped Interface

The canonical sequence for designing a website or app well. Phases overlap in practice, but **skipping a phase always resurfaces as rework**. Each phase lists its exit criteria — don't advance without them.

## Phase 0 — Discovery & Strategy

**Goal:** know who this is for, what job it does, and how success is measured — before any pixels.

1. Define the target user in one sentence (role + situation + goal). "Everyone" is not an answer.
2. Write the core job-to-be-done: "When [situation], I want to [motivation], so I can [outcome]."
3. Positioning (Dunford method): list real competitive alternatives (including "do nothing/spreadsheet"), isolate unique attributes, translate to value, pick the segment that cares most, choose the market category to frame it.
4. Define 1 primary success metric (activation, purchase, retention) + 2-3 guardrails.
5. Competitive teardown: walk 3-5 competitors' core flows; note conventions (follow them — Jakob's Law) and gaps (your differentiation budget).

**Exit criteria:** one-sentence positioning statement, primary persona, primary metric, list of conventions to respect.

## Phase 1 — Information Architecture & Flows

**Goal:** the skeleton — what exists and how users move.

1. Content/feature inventory → group into a sitemap or app map (aim: ≤5 top-level destinations for apps).
2. Map the 2-3 critical user flows end-to-end (entry → aha → conversion/retention loop) as flow diagrams. Every screen must justify its place in a flow.
3. Choose navigation architecture per platform: web navbar/sidebar, iOS tab bar + stacks, macOS sidebar + menus (see `navigation`, `ios-app-design`, `macos-app-design`).
4. Trunk test each key screen on paper: can a user tell what site/app this is, where they are, and what they can do here?

**Exit criteria:** sitemap/app map, critical flow diagrams, chosen nav pattern.

## Phase 2 — Wireframes & Content

**Goal:** layout and words, zero styling. Content before chrome.

1. Write the real copy first — headlines, CTAs, empty states, errors (see `ux-writing`, `storybrand-copywriting`). Lorem ipsum hides layout failures.
2. Lo-fi wireframes for each screen in the critical flows: hierarchy via size/position only (grayscale — Refactoring UI discipline).
3. One primary action per screen; place it per platform ergonomics (thumb zone / F-pattern).
4. Design the edge states NOW: empty, loading, error, offline, long-content, zero-results. They're half the screens of a real product.
5. Hallway-test the wireframes with 3-5 people (Krug method: "what is this? what would you do first?").

**Exit criteria:** wireframes for every state of critical flows, real copy, one round of test feedback applied.

## Phase 3 — Design System Foundations

**Goal:** decide the visual language once, as tokens — before designing all screens.

1. Type scale + families (see `typography`), spacing scale (8pt — `spacing-layout`), color ramps + semantic tokens with dark mode (`color-systems`, `design-tokens-theming`), radius/elevation scale, motion durations/easings (`motion-microinteractions`).
2. Pick the platform design language baseline: Material 3 (Android/web-app), Apple HIG/Liquid Glass (iOS/macOS), or a custom web system — customize from it, don't fight it.
3. Build the core component set first: button set, inputs, list/card, nav shell, modal/sheet, toast (specs in `buttons`, `forms-inputs`, `cards-lists-modals`).
4. Verify accessibility at the token level: every text/surface pairing ≥4.5:1, focus ring defined (`accessibility`).

**Exit criteria:** token sheet + core components that pass contrast; one screen fully assembled from them as proof.

## Phase 4 — High-Fidelity Design

**Goal:** apply the system to every screen; add craft.

1. Design the hardest, densest screen first (it stress-tests the system); the marketing hero LAST (it's the most fun and least structural).
2. Apply hierarchy passes (Refactoring UI): de-emphasize secondary content rather than enlarging primary; labels last resort; align everything to the grid.
3. Craft pass per screen: optical alignment, spacing rhythm, consistent radii/shadows, real content stress test (longest German string, 1-item list, 10k-item list) — see `visual-craft-standards`.
4. Motion spec for key transitions and micro-interactions; reduced-motion variants.
5. Responsive/adaptive: mobile-first breakpoints for web; size classes for iOS; window resizing for macOS.

**Exit criteria:** all critical-flow screens hi-fi in all states, on all target sizes; passes the squint test (primary action pops) and grayscale test.

## Phase 5 — Prototype & Validate

**Goal:** catch failures while they're cheap.

1. Clickable prototype of the critical flows.
2. 5-user usability test per iteration (NN/g: 5 users find ~85% of issues); task-based, think-aloud; measure completion, not opinions.
3. Accessibility audit: keyboard-only pass, screen-reader pass on core flow, contrast sweep, 200% zoom / largest Dynamic Type.
4. Design review against `design_review_checklist` for the project type.

**Exit criteria:** critical tasks completed unaided by ≥4/5 testers; a11y audit clean; checklist violations resolved or accepted deliberately.

## Phase 6 — Build Handoff & Quality

**Goal:** ship what was designed, not an approximation.

1. Handoff = tokens + components + states + motion specs + copy doc, not just flat mocks.
2. Performance budget agreed with engineering: LCP <2.5s, INP <200ms, CLS <0.1 (web); 60fps scroll, <2s cold start (apps) — design decisions (images, fonts, animation) must respect it (`seo-for-designers`).
3. Design QA on real builds/devices before release: spacing, states, motion, dark mode, smallest supported screen.

**Exit criteria:** design QA sign-off on staging/TestFlight build.

## Phase 7 — Launch, Measure, Iterate

**Goal:** the design is a hypothesis; production data is the test.

1. Instrument the critical flows (funnel steps, drop-off, rage-clicks/dead-taps).
2. Watch week-1: activation rate, funnel drop-offs, support tickets, store reviews — each is a design bug report.
3. Iterate in the same system: fixes go through tokens/components so consistency survives.
4. Quarterly: re-run the heuristic audit and refresh against platform updates (new HIG/Material releases).

## Per-platform overlays

- **Website/landing:** interleave `marketing-website-roadmap` (positioning → copy → SEO/GEO are load-bearing phases, not afterthoughts).
- **iOS app:** Phase 3 baseline = `ios-app-design` + `apple-hig-liquid-glass`; add App Store asset design (icon, screenshots) as a Phase 6 deliverable.
- **macOS app:** Phase 1 must include menu bar + keyboard shortcut map; multi-window/document model decided before wireframes (`macos-app-design`).
- **Cross-platform:** design tokens shared; navigation/controls per-platform native (`design-tokens-theming`).

## Anti-patterns (process smells)

- Starting in high-fidelity ("designing the hero first").
- Lorem ipsum surviving past Phase 2; edge states designed "later" (= never).
- Design system built after 40 screens exist (retrofit costs 3×).
- Usability testing once, at the end, as theater.
- Handoff as a Figma link with no states or tokens.
- Redesigning visuals when the funnel problem is positioning or copy.
