---
id: seo-for-designers
title: "SEO for Designers 2026"
category: seo
platform: web
tags: [core-web-vitals, layout-shift, font-loading, image-optimization, mobile-first, accessibility]
sources: ["https://web.dev/articles/vitals", "https://web.dev/articles/optimize-cls", "https://web.dev/articles/font-best-practices", "https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing", "https://www.uxpin.com/studio/blog/web-design-seo-key-principles/", "https://www.uxpin.com/studio/blog/ux-seo-guide/", "https://www.modernwebseo.com/en/blog/seo-friendly-web-design-guide/", "https://www.elegantthemes.com/blog/design/web-design-and-seo"]
updated: 2026-07-08
---

# SEO for Designers 2026

Every design decision — hero media, font choice, navigation pattern, animation — becomes a Core Web Vitals number, a crawlability property, or an accessibility signal. This file maps design choices to their SEO consequences with hard rules. Thresholds referenced: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile of real users (see technical-seo.md).

## 1. Layout Stability (CLS) — Design Rules

CLS ≤ 0.1 means the page visually budges almost not at all after first paint. Shifts are caused by *designed* elements arriving late.

**Rules:**
- **Reserve space for everything that loads late.** Images, videos, iframes, embeds, ad slots, testimonial carousels: fixed `aspect-ratio` or explicit `width`/`height` in the design spec, always.
```css
.hero-media { aspect-ratio: 16 / 9; width: 100%; }
img { max-width: 100%; height: auto; } /* with width/height attrs in HTML */
```
- **Cookie banners and promo bars:** design them as `position: fixed` overlays (bottom sheet) or reserve their height in the layout. Never let them push the page down on arrival.
- **No content injected above the fold after load** — late-loading announcement bars are the single most common CLS failure.
- **Skeleton screens must match final content dimensions exactly** — a skeleton that's shorter than the loaded card causes the shift it was meant to prevent.
- **Carousels/accordions/tabs:** size the container to the tallest state, or animate `transform` (compositor-only) rather than `height`/`top`. `transform`/`opacity` animations never count toward CLS; layout-property animations do.
- **Buttons/badges with dynamic text** ("3 items"): min-width so digits changing doesn't reflow neighbors.
- Design review gate: load the page on throttled 4G and watch — anything that visibly jumps fails the design, not just the build.

## 2. Font Loading — Typography Without the SEO Tax

Web fonts are a top cause of both CLS (swap reflow) and slow LCP (text is often the LCP element).

**Rules:**
- **Max 2 font families, ≤ 4 total weights/styles.** Every weight is a network file. Prefer a variable font when you need > 2 weights of one family.
- **Self-host WOFF2.** Third-party font CDNs add a connection; Google Fonts via CSS link is slower than self-hosting and has privacy implications in the EU.
- **Preload the primary text font:**
```html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```
- **`font-display: swap`** so text is never invisible (FOIT kills LCP). Then neutralize the swap-reflow with fallback metric matching:
```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-display: swap;
}
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
}
body { font-family: "Inter", "Inter Fallback", sans-serif; }
```
  (`size-adjust`/`ascent-override` tuned so the fallback occupies identical space → zero font-swap CLS. Tools: Fontaine, next/font does this automatically.)
- **Subset fonts** to used character sets (latin) — often 70%+ smaller.
- Decorative display fonts used once in the hero: consider an SVG wordmark or accept system-font fallback on slow connections.
- **Don't** load icon fonts (Font Awesome as font) — use inline SVG icons; icon fonts are a render-blocking request and an accessibility problem.

## 3. Images & Media — The LCP Discipline

The hero image is usually the LCP element; the design decision about it *is* the performance decision.

**Rules:**
- **Formats:** AVIF first, WebP fallback, via `<picture>` or content negotiation. JPEG only as last resort; PNG only for UI screenshots needing lossless; SVG for logos/icons/illustrations.
- **Hero/LCP image:** `fetchpriority="high"`, never `loading="lazy"`, preloaded if it's a CSS background. Target ≤ 200 KB for a full-bleed hero (AVIF makes this achievable at 1920 px).
- **Everything below the fold:** `loading="lazy" decoding="async"`.
- **Responsive sizing:** export/serve multiple widths with `srcset` + `sizes`; never ship a 2400 px image into a 400 px slot:
```html
<img src="/work/case-800.avif"
     srcset="/work/case-400.avif 400w, /work/case-800.avif 800w, /work/case-1600.avif 1600w"
     sizes="(max-width: 768px) 100vw, 50vw"
     width="1600" height="1000"
     alt="Redesigned checkout flow for Acme, mobile and desktop views"
     loading="lazy" decoding="async">
```
- **Alt text on every meaningful image:** describe content and function, include keywords only when natural. Decorative images: `alt=""` (empty, not missing).
- **Descriptive filenames:** `bakery-website-redesign-hero.avif`, not `IMG_4021-final-v3.png`.
- **Background video heroes:** muted, `preload="none"` or poster-first, compressed ≤ 2–3 MB, with a static image fallback on mobile/reduced-data. Autoplaying video must never be the LCP bottleneck — the poster image can be the LCP element instead.
- Text as text, never baked into images — invisible to search, AI engines, and translation.

## 4. Mobile-First Indexing — Parity Is Non-Negotiable

Google indexes and ranks from the **mobile rendering** of your site. Whatever the mobile design hides, SEO loses.

**Rules:**
- **Content parity:** the mobile design must contain the same content, headings, structured data, and internal links as desktop. "Simplified" mobile pages that drop sections drop rankings.
- Content in accordions/tabs on mobile is fine and fully indexed — as long as it's in the DOM (HTML present, visually collapsed), not fetched on click.
- **Tap targets ≥ 48×48 px** with ≥ 8 px spacing; body text ≥ 16 px without zooming; no horizontal scroll at 360 px width.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` — absence makes the page "not mobile friendly" outright.
- No intrusive interstitials on mobile entry (full-screen popups before content) — explicitly penalized. Design email-capture as inline sections, exit-intent (desktop), or small dismissible banners.
- Design mobile-first in Figma: the 375–414 px frame is the canonical design, desktop is the enhancement.
- Hamburger menus are fine for crawling (links must be in HTML), but every strategic page should also have contextual in-body links (see on-page-seo.md §4).

## 5. Accessibility ↔ SEO Overlap

Accessibility work is SEO work — the same semantics feed screen readers, Googlebot, and LLM crawlers:

| Accessibility practice | SEO effect |
|---|---|
| Semantic landmarks (`<header> <nav> <main> <footer> <article>`) | Cleaner content extraction, better AI parsing |
| Correct heading outline | Section-level ranking & AI Overview citation |
| Alt text | Image search + image context for page relevance |
| Descriptive link text | Anchor-text relevance signals |
| Color contrast ≥ 4.5:1, visible focus states | Engagement/UX quality, lower pogo-sticking |
| Captions/transcripts for video | Indexable text for otherwise opaque media |
| `prefers-reduced-motion` respected | Lower INP/CLS risk from heavy animation |

- Buttons for actions, links (`<a href>`) for navigation — misuse breaks both keyboard users and crawlers.
- One page language declared: `<html lang="en-GB">` — feeds translation, screen readers, and international targeting.

## 6. Design Patterns That Hurt SEO (Avoid / Replace)

| Anti-pattern | Why it hurts | Replace with |
|---|---|---|
| Full-page preloader/splash animation | Delays LCP by its full duration | Instant content, subtle entrance animation |
| Text embedded in hero images | Invisible to search/AI | Real text over image (`<h1>` + CSS) |
| Infinite scroll only | Deep items never crawled | Infinite scroll + paginated URLs (`/work/page/2/`) |
| Mega "app-like" SPA portfolio with client-only routes | Empty HTML to AI crawlers, delayed Google indexing | SSG/SSR (Astro, Next) |
| Hover-only content reveals | No tap equivalent, content risk on mobile index | Click-to-expand with content in DOM |
| Carousel as sole home for key messages | Slides 2+ barely seen or crawled | Stacked sections; carousel for gallery only |
| Scroll-jacking / heavy parallax libraries | Main-thread cost → INP failures | CSS scroll-driven animations, `transform`-only effects |
| PDF for service/pricing info | Poor mobile UX, weak indexing | HTML page (PDF as secondary download) |
| Thin "gallery-only" portfolio pages | No text = nothing to rank | Case studies: problem → process → measurable result |
| Custom cursors/heavy WebGL on every page | JS weight, INP, battery | Reserve for one showcase page, not sitewide |

## 7. Design-Phase SEO Checklist (before handoff)

- [ ] Every image/media block in the mockup has defined aspect ratio + max file-size budget noted
- [ ] Hero: LCP element identified; image ≤ 200 KB AVIF plan; no text baked in
- [ ] Fonts: ≤ 2 families, weights listed, variable font considered, fallback metrics planned
- [ ] Heading levels annotated in the design (H1/H2/H3), one H1 per page
- [ ] Mobile frames designed first; content parity with desktop confirmed
- [ ] Tap targets ≥ 48 px; body ≥ 16 px; contrast ≥ 4.5:1
- [ ] Cookie/promo banners designed as non-shifting overlays
- [ ] Nav + footer link map matches the site's internal-linking plan
- [ ] No intrusive mobile interstitials in the flow
- [ ] Animations specified as `transform`/`opacity`; reduced-motion variant defined
- [ ] Empty/loading states sized identically to loaded states
- [ ] Each template's target query + H1 + title documented alongside the mockup

## 8. Performance Budget (per page template, 2026 defaults)

| Budget item | Target |
|---|---|
| HTML document | ≤ 50 KB |
| Total CSS | ≤ 100 KB (critical CSS inlined ≤ 15 KB) |
| JS shipped to client | ≤ 200 KB compressed (marketing pages ≤ 100 KB) |
| Hero image | ≤ 200 KB AVIF |
| Total page weight (first load) | ≤ 1.5 MB mobile |
| Web fonts | ≤ 2 files, ≤ 120 KB total |
| Third-party scripts | ≤ 3, all deferred |
| Field LCP / INP / CLS | ≤ 2.0 s / ≤ 150 ms / ≤ 0.05 (buffer under official 2.5 s / 200 ms / 0.1) |

Budgets are design constraints, not engineering afterthoughts: if the concept needs 4 fonts and a 4 MB video, the concept fails the budget review.
