---
id: geo-tactics-checklist
title: "GEO Tactics Checklist — Get Cited by AI Engines"
category: geo
platform: web
tags: [ai-search, llm, citations, llms-txt, schema, checklist]
sources: ["https://llmrefs.com/generative-engine-optimization", "https://searchengineland.com/guide/optimize-for-ai-crawlers", "https://llmstxt.org/", "https://developers.google.com/search/docs/appearance/ai-features", "https://nextgrowth.ai/geo-best-practices-ai-citations/", "https://totheweb.com/blog/beyond-seo-your-geo-checklist-mastering-content-creation-for-ai-search-engines/", "https://www.lumar.io/blog/best-practice/4-pillar-geo-strategy-framework-for-ai-search-visibility/", "https://authoritytech.io/curated/answer-engine-optimization-checklist-chatgpt-perplexity-claude-2026", "https://www.averi.ai/learn/the-definitive-guide-to-geo-get-cited-by-ai-in-2026"]
updated: 2026-07-08
---

# GEO Tactics Checklist — Get Cited by AI Engines (2026)

Prescriptive, in priority order. Apply to money pages first, then roll out sitewide.

## 1. Content structure — answer-first (highest leverage)

- [ ] **Open every page with a self-contained answer block**: 2–4 sentences, directly under the H1, that fully answers the page's core question and includes at least one specific statistic, date, or named entity. AI engines extract these as canonical passages.
- [ ] **One question per H2/H3 section.** Phrase headings as the actual questions users ask ("How much does a website redesign cost in 2026?"), answer in the section's first sentence, elaborate after.
- [ ] **Make every section standalone.** No "as mentioned above" — chunks are retrieved out of context. Repeat the subject noun instead of pronouns at section starts.
- [ ] Paragraphs ≤ 3 sentences. Use bullets, numbered steps, and comparison tables — pages with structured lists, quotes, and statistics show **30–40% higher AI visibility** (Princeton GEO study, confirmed by later industry studies).
- [ ] **Add a Q&A/FAQ block** (3–6 real questions from sales calls, Reddit, "People Also Ask") near the end of key pages.
- [ ] Include a **TL;DR or "Key takeaways"** bulleted summary near the top of long pages.

**Answer-first example (put this pattern under the H1):**

> **Bad:** "In today's fast-moving digital landscape, businesses of all sizes are asking how they can improve their online presence..."
>
> **Good:** "A small-business website redesign in 2026 typically costs £3,000–£12,000 and takes 4–8 weeks. The price is driven by three factors: page count, custom design vs. template, and CMS complexity. Below is a line-item breakdown based on 40 studio projects delivered in 2025."

## 2. Factual density — citations, statistics, quotes

- [ ] Every important claim carries a **number + named source + year**: "According to Semrush (2025), AI-referred visitors convert 4.4x higher than organic."
- [ ] Add **expert quotes with full attribution** (name, title, company). Unattributed quotes carry near-zero weight.
- [ ] Publish **original data** (surveys, benchmarks, case-study metrics). Original statistics are the most re-citable asset a brand can own — other sites cite you, and AI engines cite them citing you.
- [ ] Link out to authoritative primary sources; engines treat well-sourced pages as trustworthy synthesis candidates.
- [ ] Show **author bio with credentials** on every article (name, role, experience, LinkedIn). E-E-A-T still gates retrieval.

## 3. Entity clarity — make the brand machine-legible

- [ ] Use **one exact brand name spelling** everywhere (site, socials, directories, schema). Inconsistency splits the entity.
- [ ] Write a canonical one-sentence definition and reuse it verbatim on the homepage, About page, and schema `description`: "Example Studio is a web design studio that builds conversion-focused websites for small businesses."
- [ ] Create/claim entity homes: **Wikidata, Crunchbase, LinkedIn company page, Google Business Profile**, key industry directories — consistent name, description, URL, logo.
- [ ] Add `Organization` schema sitewide with `sameAs` links to every profile (see §5 snippet).
- [ ] Define niche jargon in plain words on first use; engines can't cite what they can't parse.

## 4. Off-site brand mentions (≈40% of GEO effort)

- [ ] **Find the pages AI already cites** for your target prompts (ask ChatGPT/Perplexity your 20 core buyer questions; log every cited URL). Get your brand into those exact pages: comment, contribute, request inclusion, or pitch listicle authors.
- [ ] Maintain honest, active presence on **Reddit and niche forums** — heavily weighted in ChatGPT and Perplexity training/retrieval. Genuine answers only; spam gets pruned and nukes trust.
- [ ] Collect reviews on **G2 / Trustpilot / Clutch / Google** — AI engines lean on review aggregators for "best X" prompts.
- [ ] Pitch **digital PR and data stories** to industry publications; a mention in one trusted article propagates into many AI answers.
- [ ] Target inclusion in "**best [category] 2026**" roundups — these dominate commercial-intent AI answers.

## 5. Schema markup for LLMs

Schema is the metadata layer engines use to verify who/what/when. Align it exactly with visible content (Google requirement). Priority types: `Organization`, `WebSite`, `Article`/`BlogPosting` (with dates + author), `FAQPage`, `HowTo`, `Product`/`Service` + `Review`, `BreadcrumbList`, `Person` for authors.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Website Redesign Costs in 2026: Full Breakdown",
  "description": "Line-item pricing for small-business website redesigns in 2026.",
  "author": { "@type": "Person", "name": "Jane Doe",
              "jobTitle": "Founder, Example Studio",
              "url": "https://example.com/about" },
  "publisher": { "@type": "Organization", "name": "Example Studio",
                 "url": "https://example.com",
                 "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" },
                 "sameAs": ["https://www.linkedin.com/company/example",
                            "https://www.crunchbase.com/organization/example"] },
  "datePublished": "2026-01-14",
  "dateModified": "2026-07-01"
}
</script>
```

- [ ] `datePublished` **and** `dateModified` on every article — ~65% of AI bot hits target content updated within the past year.
- [ ] `FAQPage` schema on pages with Q&A blocks; questions must match visible text verbatim.
- [ ] Validate with Google's Rich Results Test / schema.org validator after every template change.

## 6. llms.txt and machine-readable content

Status 2026: an emerging convention (llmstxt.org), adopted by many dev-tool and SaaS sites; large-scale tests show **no measurable citation lift yet** and Google says no AI text files are required — implement it as a cheap, low-risk hedge, never instead of items 1–5.

- [ ] Serve `/llms.txt` at the site root: markdown, H1 title, blockquote summary, H2 link sections.
- [ ] Optionally serve `/llms-full.txt` (full flattened content) and `.md` twins of key pages (`/pricing.md`).

```markdown
# Example Studio

> UK web design studio building conversion-focused websites for small
> businesses. Founded 2024. Services: web design, redesigns, GEO/SEO.

## Services
- [Web Design](https://example.com/services/web-design): Custom sites, 4–8 week delivery
- [Website Redesign](https://example.com/services/redesign): Pricing and process
- [GEO & SEO](https://example.com/services/geo): AI-search visibility services

## Resources
- [Pricing Guide 2026](https://example.com/pricing): Line-item costs
- [Case Studies](https://example.com/work): Results with metrics

## Optional
- [About](https://example.com/about)
```

## 7. Technical access — let AI bots in and feed them HTML

- [ ] **robots.txt allows**: `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Bingbot`. Blocking OAI-SearchBot/PerplexityBot removes you from those engines' citations entirely.
- [ ] **Check CDN/WAF settings** — Cloudflare blocks AI crawlers by default on new zones; explicitly allow the bots you want.
- [ ] **Server-render all citable content.** Most AI crawlers do not execute JavaScript; JS-injected content is invisible. Verify: `curl -A "GPTBot" https://yoursite.com/page` must contain the answer text.
- [ ] No paywalls/login walls/interstitials in front of content you want cited.
- [ ] XML sitemap with accurate `<lastmod>`, referenced from robots.txt.
- [ ] Fast TTFB and clean canonical URLs — AI crawlers have shallow budgets; speed = more pages fetched per session.
- [ ] Do NOT use `nosnippet` / restrictive `max-snippet` on pages you want in Google AI Overviews — snippet controls are Google's official opt-out mechanism for AI features.

## 8. Design & architecture rules (for the build itself)

- [ ] Semantic HTML5: `<main>`, `<article>`, `<section>`, `<nav>`, real `<h1>`–`<h3>` (single H1), `<table>` for tabular data, `<ul>/<ol>` for lists — never styled `<div>` soup. Heading hierarchy defines the chunk boundaries retrieval uses.
- [ ] High content-to-chrome ratio: answer content dominant in the DOM; minimal boilerplate above the first H1; no content trapped in carousels, tabs, or accordions that require JS to render into the DOM (accordions are fine if content is in the initial HTML).
- [ ] Text over images for facts: never put statistics, pricing, or key claims only inside images/infographics — provide the same data as HTML text or tables, with descriptive `alt`.
- [ ] Topic-cluster IA: one intent per URL, hub pages linking to spoke pages with descriptive anchor text, breadcrumbs + `BreadcrumbList` schema.
- [ ] Visible "Last updated: {date}" near the top of articles, backed by matching `dateModified` schema.

## 9. Freshness cadence

- [ ] Refresh top money pages **quarterly**: update stats to current-year sources, add a new section, revise the answer block. Citations to stale pages (>3 months on fast topics) drop sharply.
- [ ] Update the year in titles/H1s only when content genuinely reflects it — fake freshness is detectable and hurts trust.
- [ ] Keep publishing new pages targeting emerging conversational queries; Perplexity especially rewards recency.

## 10. Measurement loop (monthly)

- [ ] Maintain a fixed panel of 20–50 real buyer prompts; run across ChatGPT, Perplexity, Google AI Mode/AIO, Gemini. Log: brand mentioned? URL cited? which competitor won? description accurate?
- [ ] Track AI referrals in GA4: regex channel for `chatgpt.com|chat.openai.com|perplexity.ai|gemini.google.com|copilot.microsoft.com`; report sessions **and** conversion rate.
- [ ] Grep server logs for AI crawler hits (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) — rising crawl of a page usually precedes citations.
- [ ] Consider a tracking tool once manual sampling proves value: Otterly (entry-level), Peec AI (agencies, citation-gap analysis), Profound (enterprise), or Semrush AI Toolkit / Ahrefs Brand Radar add-ons.
- [ ] KPI set: AI share of voice, citation rate per page, mention accuracy, AI referral sessions + CVR, AIO impression/click divergence in Search Console.

## Anti-patterns — never do

- Keyword stuffing or "AI-optimized" gibberish appended for bots (the original GEO study found it does nothing or backfires).
- Blocking AI crawlers on marketing content "to protect IP" while expecting AI visibility.
- Schema that contradicts visible content (Google penalizes; engines distrust).
- Astroturfing Reddit/reviews — moderation removal plus brand-sentiment damage inside AI answers.
- Shipping citable content behind client-side rendering, infinite scroll, or JS-gated tabs.
- Chasing llms.txt or exotic markup before the answer-first content and entity basics are done.
