---
id: marketing-website-roadmap
title: "Marketing Website Roadmap — Positioning to CRO Loop"
category: process
platform: web
tags: [process, roadmap, marketing, positioning, copywriting, seo, geo, cro]
sources: ["Synthesized from Dunford, Miller (StoryBrand), Cialdini, Ogilvy, Google Search documentation, GEO research"]
updated: 2026-07-08
---

# Marketing Website Roadmap — Positioning to CRO Loop

Marketing sites fail in this order: positioning → copy → structure → design → speed. Fix upstream first; a beautiful site with unclear positioning converts worse than an ugly one with sharp positioning.

## Phase 1 — Positioning (before any page exists)

1. Run the positioning exercise (`positioning-messaging`): alternatives → unique attributes → value → best-fit segment → market category.
2. Output one positioning statement: "For [segment] who [struggle], [product] is the [category] that [key value], unlike [alternative]."
3. Decide the ONE conversion goal of the site (trial signup / demo booking / purchase / waitlist). Every page will serve it.

**Exit:** positioning statement approved; primary conversion + metric defined.

## Phase 2 — Message & Copy architecture

1. Apply StoryBrand SB7 (`storybrand-copywriting`): customer = hero, product = guide; write the one-liner (problem → solution → success).
2. Draft the homepage narrative before wireframing: headline (outcome, ≤10 words) → subhead (how/who) → proof → 3 benefit blocks → objection/FAQ → final CTA.
3. Write CTAs value-forward ("Start my free trial"), define the risk-reducers next to them (free/no card/cancel anytime).
4. Collect proof assets NOW: named testimonials with results, logos, numbers, case studies (`influence-persuasion` — social proof + authority placement). Missing proof is a launch blocker, not a nice-to-have.

**Exit:** homepage copy doc + proof inventory.

## Phase 3 — Site architecture & SEO/GEO foundations

1. Page map from search + funnel logic: homepage, product/feature pages, pricing, use-case/persona pages, comparison pages ("X vs Y"), blog/resource hub, docs. Each page = one search intent = one primary keyword/entity (`on-page-seo`).
2. URL structure flat and readable; internal linking plan (hub-and-spoke).
3. GEO decisions up front (`geo-tactics-checklist`): answer-first page intros, FAQ blocks with real Q&A phrasing, llms.txt, schema plan (Organization, Product, FAQPage, Article), stats/citations in content.
4. Technical baseline (`technical-seo`): SSR/SSG rendering, CWV budget (LCP <2.5s / INP <200ms / CLS <0.1), sitemap, canonicals.

**Exit:** sitemap with intent per page; schema + rendering plan; performance budget.

## Phase 4 — Design & build

1. Wireframe with the real copy from Phase 2 (never design first, write later).
2. Follow conversion layout (`conversion-ux`): above-the-fold contract, CTA every 1.5-2 viewports, proof adjacency, pricing page patterns.
3. Visual system per `landing-signup` / `hero-sections` / `pricing-sections` patterns + brand direction; craft pass per `visual-craft-standards`.
4. Build with the SEO-for-designers rules (`seo-for-designers`): image discipline, font loading, zero CLS, semantic HTML (also the #1 GEO extractability factor).
5. Accessibility pass (`accessibility`) — overlaps ~70% with SEO/GEO quality signals.

**Exit:** staging site passing Lighthouse ≥90 perf/SEO/a11y, all copy real, analytics installed.

## Phase 5 — Launch checklist

1. Meta titles/descriptions per page; OG/Twitter cards; favicon set.
2. Schema validated; sitemap submitted (Search Console + Bing); llms.txt live; robots allows AI crawlers you want (GPTBot, ClaudeBot, PerplexityBot).
3. Analytics events on every CTA + funnel step; goal tracking verified end-to-end with a real test conversion.
4. 404 page designed; forms tested from mobile; thank-you/confirmation pages carry next steps.

## Phase 6 — CRO loop (forever)

Weekly/biweekly cadence:
1. Review funnel: traffic → scroll depth → CTA click → form start → completion. Fix the biggest drop-off, nothing else.
2. Test one variable at a time; headline/offer tests before button-color tests; ship winners into the design system.
3. Refresh proof quarterly (new numbers, logos, testimonials); refresh content for GEO freshness signals.
4. Monthly: check AI-engine visibility (brand mentions in ChatGPT/Perplexity/AI Overviews answers) alongside rankings (`geo-fundamentals` measurement loop).

## Anti-patterns

- Designing the hero before positioning exists ("we'll write copy into the design later").
- Launching without proof assets or with anonymous testimonials.
- Pricing hidden on a self-serve product; "Learn more" as the primary CTA.
- Treating SEO/GEO as a post-launch task — rendering and IA decisions are unfixable-cheap later.
- Redesigns driven by taste instead of funnel data; testing 5 changes at once.
