---
id: technical-seo
title: "Technical SEO 2026"
category: seo
platform: web
tags: [core-web-vitals, structured-data, crawling, javascript-seo, hreflang, sitemaps]
sources: ["https://web.dev/articles/vitals", "https://developers.google.com/search/docs/appearance/core-web-vitals", "https://developers.google.com/search/updates", "https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites", "https://www.debugbear.com/blog/technical-seo-checklist", "https://www.stackmatix.com/blog/javascript-rendering-seo-best-practices", "https://seomator.com/blog/crawl-to-refer-ratio-ai-crawlers-llm-bots", "https://www.linkgraph.com/blog/hreflang-implementation-guide/"]
updated: 2026-07-08
---

# Technical SEO 2026

Technical SEO in 2026 has two audiences: Google's crawler/renderer **and** AI crawlers (GPTBot, ClaudeBot, PerplexityBot) that now account for roughly half of all crawler traffic and **do not execute JavaScript**. Everything below assumes both.

## 1. Core Web Vitals — Current Official Thresholds

Google evaluates each metric at the **75th percentile** of real-user (CrUX field) data, segmented by mobile and desktop. All three must be "Good" for the page to pass.

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | 200–500 ms | > 500 ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 |

- INP replaced FID in March 2024. FID is dead — ignore any guidance referencing it.
- **Myth check (verified July 2026):** several SEO blogs claim Google lowered the LCP "Good" threshold to 2.0 s in a "March 2026 update." Google's official docs (web.dev and Search Central, last updated Dec 2025) still state **2.5 s**. Treat 2.5 s as the pass line, but target ≤ 2.0 s LCP and ≤ 150 ms INP as a competitive buffer — thresholds are graded on field data you don't fully control (slow devices, slow networks).
- CWV is a ranking signal, but a modest tiebreaker — it will not rescue thin content, and great content ranks despite mediocre vitals. Fix vitals for UX and conversion first, rankings second.

### LCP quick wins
- The LCP element is usually the hero image or H1. Serve it from your own origin, in AVIF/WebP, **never lazy-loaded**, with `fetchpriority="high"`.
- `<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">` for CSS background heroes.
- TTFB budget: ≤ 800 ms. Use CDN + edge caching; LCP can't be good if the HTML is slow.
- Inline critical CSS; defer non-critical CSS and all non-essential JS.

### INP quick wins
- Break long tasks (> 50 ms) with `scheduler.yield()` / `setTimeout` chunking.
- Minimize third-party scripts; load tag managers and chat widgets after interaction or with `defer`.
- Give instant visual feedback on tap (CSS `:active` states) even if work continues async.
- Avoid re-rendering huge DOM trees on input; keep DOM under ~1,400 nodes where possible.

### CLS quick wins
- Explicit `width`/`height` (or `aspect-ratio`) on ALL images, videos, iframes, embeds, ads.
- Reserve space for ads/banners with `min-height` placeholders.
- Never inject content above existing content (cookie bars: use `position: fixed`, or reserve space).
- Fonts: see the font-loading rules in `seo-for-designers.md`.

## 2. Crawlability & Indexing

### Checklist
- [ ] `robots.txt` at root; blocks only genuinely private paths. Never block CSS/JS — Google must render the page.
- [ ] One canonical protocol+host: force HTTPS and one of www/non-www via 301.
- [ ] Every important page reachable within **3 clicks** of the homepage.
- [ ] No orphan pages (pages with zero internal links).
- [ ] Return proper status codes: 404/410 for gone, 301 for moved, no "soft 404s" (200 with empty content).
- [ ] Redirect chains ≤ 1 hop; no redirect loops.
- [ ] Paginated archives: self-canonical each page, plain `<a href>` links between pages (`rel=prev/next` is ignored by Google but harmless).
- [ ] Faceted/filter URLs: `noindex` or canonicalize to the base category; block crawl-trap parameter combinations in robots.txt.
- [ ] Monitor Search Console → Pages report monthly for "Crawled – currently not indexed" spikes (usually a quality/duplication signal, not technical).

### Do / Don't
- **Do** use real `<a href="/path">` anchors for all navigation. Buttons with click handlers and router `pushState` links are invisible to crawlers.
- **Do** keep URL structure flat, lowercase, hyphen-separated: `/services/web-design`, not `/index.php?cat=2&id=17`.
- **Don't** put indexable content behind login, infinite scroll without paginated URLs, or hover/tap-only reveals with no HTML fallback.
- **Don't** use meta refresh or JS redirects; use HTTP 301/302.

## 3. JavaScript Rendering

Google renders JS in a second wave (delayed, resource-limited). AI crawlers **read initial HTML only**. Rule of thumb for 2026:

> **If content matters for search or AI citation, it must exist in the server-rendered HTML response.**

- **Preferred:** SSG (static) or SSR (Next.js, Nuxt, Astro, SvelteKit) for all indexable routes. Hydrate for interactivity.
- **Acceptable:** hybrid/ISR — static shell with server-rendered content, client-side enhancement.
- **Avoid:** pure client-side rendering (CRA-style SPA) for anything you want ranked or cited. Dynamic rendering (serving bots a prerendered version) is officially deprecated as a long-term approach — treat as a temporary patch only.
- Metadata (title, meta description, canonical, structured data) must be server-rendered. Client-injected JSON-LD works for Google *if* rendering succeeds, but fails for AI crawlers — inject server-side.
- Test: `curl -s https://example.com/page | grep -i "your key phrase"` — if it's not in the raw HTML, AI engines can't see it.

## 4. Structured Data (Schema.org)

Use **JSON-LD in the `<head>` or body, server-rendered**. Validate with Google's Rich Results Test and Schema.org validator.

### Still-supported, high-value types (2026)
`Organization`, `LocalBusiness`, `Product` (+ `Offer`, `AggregateRating`), `Article`/`BlogPosting`, `BreadcrumbList`, `Person`, `WebSite`, `Event`, `JobPosting`, `Recipe`, `VideoObject`, `Review`.

### Deprecated — do NOT promise clients rich results from these
- `HowTo` rich results: removed 2023–2024.
- `FAQPage` rich results: restricted in 2023, fully retired for visual snippets by 2026.
- June 2025 removals: Course Info, Claim Review, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing (Book Actions was later reinstated).
- The markup itself is still valid schema.org and can aid entity understanding / AI comprehension — it just earns no SERP visual. Keep FAQPage markup if cheap; don't build strategy on it.

### Example: LocalBusiness + WebSite (design-agency baseline)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://example.com/#business",
  "name": "Saglitz Design",
  "url": "https://example.com/",
  "logo": "https://example.com/logo.png",
  "image": "https://example.com/studio.jpg",
  "telephone": "+44-20-0000-0000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1 Example St",
    "addressLocality": "London",
    "postalCode": "EC1A 1AA",
    "addressCountry": "GB"
  },
  "sameAs": [
    "https://www.linkedin.com/company/example",
    "https://www.instagram.com/example"
  ]
}
</script>
```

### Example: Article with author entity (E-E-A-T support)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How Layout Shift Kills Conversions",
  "datePublished": "2026-06-01",
  "dateModified": "2026-07-01",
  "author": {
    "@type": "Person",
    "name": "Jane Doe",
    "url": "https://example.com/about/jane-doe",
    "jobTitle": "Founder & Designer",
    "sameAs": ["https://www.linkedin.com/in/example"]
  },
  "publisher": { "@id": "https://example.com/#business" }
}
</script>
```

## 5. Canonicals

- Every indexable page carries a **self-referencing** canonical: `<link rel="canonical" href="https://example.com/page/">`.
- Absolute URLs only, matching final protocol/host/trailing-slash exactly.
- One canonical tag per page — duplicates or conflicts cause Google to ignore all of them.
- Canonical is a *hint*, not a directive. Reinforce with matching internal links, sitemap URLs, and redirects.
- Don't canonicalize paginated page 2+ to page 1 (hides deep content); self-canonicalize each.
- Parameter variants (`?utm=`, sort, filter) → canonical to the clean URL.

## 6. Hreflang (International SEO)

~75% of international sites have hreflang errors. The three non-negotiables:

1. **Self-reference:** each page lists itself in its own hreflang set.
2. **Reciprocity (return tags):** if A points to B, B must point back to A. One-way tags are ignored.
3. **Valid codes:** ISO 639-1 language + optional ISO 3166-1 Alpha-2 region. `en-GB` ✓, `en-UK` ✗, `gb` alone ✗.

```html
<link rel="alternate" hreflang="en-gb" href="https://example.com/en-gb/" />
<link rel="alternate" hreflang="en-us" href="https://example.com/en-us/" />
<link rel="alternate" hreflang="de"    href="https://example.com/de/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/" />
```

- Always include `x-default` (global/language-picker fallback).
- hreflang targets must be indexable, 200-status, self-canonical URLs — never redirect or noindexed pages.
- Implementation options: HTML `<head>` tags (small sites), XML sitemap (large sites — easier to maintain), HTTP headers (PDFs).
- URL structure: subdirectories (`/de/`) are the default recommendation — consolidate authority on one domain. ccTLDs (`example.de`) give the strongest geo signal but split link equity. Avoid parameters (`?lang=de`).
- **Don't** auto-redirect users by IP to a locale version — Googlebot crawls mostly from the US and will never see other versions. Offer a banner/suggestion instead.
- Translate content properly; don't hreflang two identical English pages to `en-us`/`en-gb` unless there's genuine localization (currency, spelling, offers).

## 7. XML Sitemaps

- Include **only** canonical, indexable, 200-status URLs. No redirects, no noindexed pages, no parameter dupes.
- Max 50,000 URLs / 50 MB uncompressed per file; use a sitemap index for more.
- `<lastmod>` must be truthful (Google uses it; fake dates get ignored). Skip `changefreq`/`priority` — ignored.
- Reference it in robots.txt: `Sitemap: https://example.com/sitemap.xml` and submit in Search Console.
- Split by type (`sitemap-pages.xml`, `sitemap-posts.xml`, `sitemap-images.xml`) to isolate indexing problems per section.
- Image/video sitemaps (or `<image:image>` extensions) for media-heavy portfolio sites.

## 8. AI Crawlers & GEO (Generative Engine Optimization)

- AI/LLM crawlers now exceed traditional search crawlers in volume (~52% vs ~34% of crawler traffic, 2026 data).
- **Default: allow them.** Blocking GPTBot/ClaudeBot/PerplexityBot removes you from AI answers and citations. Block only for genuine licensing/competitive reasons.
- They read raw HTML only → SSR everything (see §3), keep clean heading hierarchy, use semantic HTML.
- `llms.txt` (a curated markdown index of key pages at `/llms.txt`): no confirmed ranking/citation effect yet, but zero-risk and ~30 minutes to create. Optional, low priority.
- Rate-limit abusive crawlers at CDN level rather than blanket robots.txt bans if server load is the concern.

## 9. Technical SEO Audit — Minimum Monthly Checks

1. Search Console: Pages (indexing), Core Web Vitals, and Crawl Stats reports.
2. Field CWV via CrUX (PageSpeed Insights) on top 10 templates — field data, not just Lighthouse lab scores.
3. Crawl the site (Screaming Frog/Sitebulb): broken links, redirect chains, missing/duplicate titles & canonicals, orphan pages.
4. Validate structured data on each template type.
5. `curl` key pages to confirm content + JSON-LD present in raw HTML.
6. Confirm sitemap URL count ≈ indexable URL count (large gaps = index bloat or coverage loss).
