---
id: on-page-seo
title: "On-Page SEO 2026"
category: seo
platform: web
tags: [titles, meta-descriptions, headings, internal-linking, eeat, entity-seo, ai-overviews, local-seo]
sources: ["https://developers.google.com/search/docs/fundamentals/creating-helpful-content", "https://developers.google.com/search/docs/appearance/title-link", "https://mrs.digital/blog/entity-seo/", "https://thefrankagency.com/blog/entity-seo-guide/", "https://eseospace.com/blog/how-ai-overviews-impact-seo-2026/", "https://www.stackmatix.com/blog/aeo-seo-geo", "https://www.surmado.com/blog/answer-engine-optimization-aeo-geo-guide", "https://naturallinks.net/blog/seo-checklist/"]
updated: 2026-07-08
---

# On-Page SEO 2026

On-page SEO in 2026 optimizes for three consumers at once: Google's classic ranking systems, Google AI Overviews / AI Mode, and third-party answer engines (ChatGPT, Perplexity, Claude). The same fundamentals serve all three — clear structure, verifiable expertise, entity clarity, and directly quotable answers.

## 1. Title Tags

**Rules:**
- One unique `<title>` per page, **50–60 characters** (~580 px) so it doesn't truncate.
- Primary keyword/topic in the **first half**; brand at the end: `Web Design for Startups | Saglitz Design`.
- Write for click-through, not keyword density. Titles are a strong relevance signal AND your SERP ad copy.
- Match search intent type: transactional pages get action words ("Hire", "Pricing", "Get"), informational pages get question/outcome phrasing ("How to…", "…Explained").
- Google rewrites ~60% of titles it considers poor. Mismatched H1/title, keyword stuffing, and boilerplate ("Home") trigger rewrites — keep title and H1 semantically aligned (not necessarily identical).

**Don't:** stuff multiple keywords with pipes, ALL-CAPS, emoji, year-spam ("Best X 2026 2025"), or duplicate titles across pages.

## 2. Meta Descriptions

- **150–160 characters.** Not a ranking factor; purely CTR. Google rewrites them often — a good one earns being kept.
- Formula: *what the page delivers + differentiator + soft CTA*. Include the primary keyword (it gets bolded in SERPs).
- Every indexable page gets a unique one. Duplicates are worse than none (Google will generate from content).
- For pages targeting AI Overviews, front-load a one-sentence direct answer — descriptions sometimes feed snippet/citation selection.

## 3. Heading Hierarchy

- Exactly **one `<h1>`** per page, stating the page's core topic. Multiple H1s won't tank you, but one is the clean signal for both Google and LLMs parsing structure.
- Strict nesting: H1 → H2 → H3. Never skip levels for styling reasons — style with CSS, structure with semantics.
- H2s should read as a table of contents; each H2 section should be able to stand alone as an extractable answer (AI Overviews lift individual sections, not whole pages).
- Put question-phrased H2s (`How much does a website redesign cost?`) directly above a 40–60 word direct answer, then elaborate. This is the featured-snippet and AI-citation pattern.
- Headings are not decoration: don't wrap taglines, buttons, or card labels in `<h*>` just for font size.

## 4. Internal Linking

The most underused on-page lever. Rules:

- Every important page: **≥ 3 internal links pointing to it** from relevant pages. Zero incoming links = orphan = barely indexed.
- **Descriptive anchor text**: "our web design pricing" not "click here" / "learn more". Anchors tell Google (and screen readers) what the target is about.
- Hub-and-spoke topic clusters: pillar page (`/web-design/`) links to every subtopic (`/web-design/ecommerce/`, `/web-design/portfolio-sites/`); every subtopic links back to the pillar and to 2–3 siblings.
- Link from high-authority pages (homepage, top blog posts) to pages you want to rank.
- Keep global nav lean (≤ ~7 top items); use contextual in-body links for the long tail — in-content links carry more weight than footer/nav boilerplate.
- Plain `<a href>` HTML links only (see technical-seo.md §2).
- Quarterly: crawl for orphans and pages > 3 clicks deep; fix with new contextual links.

## 5. E-E-A-T (Experience, Expertise, Authoritativeness, Trust)

E-E-A-T is not a direct score; it's the pattern Google's systems and quality raters reward. **Trust is the most important member.** Make it machine-verifiable:

- **Bylines everywhere:** real author name linked to a bio page with credentials, photo, and `sameAs` links (LinkedIn etc.). Back it with `Person`/`author` structured data.
- **Show first-hand experience:** original screenshots, project photos, real numbers from your own work ("we cut LCP from 4.1 s to 1.8 s on this client build"). This is the "E" that AI-generated content cannot fake and that post-Helpful-Content systems reward.
- **About + Contact pages** with a physical address, email, and phone. Anonymous sites are structurally distrusted in YMYL-adjacent niches.
- **Cite sources** with outbound links to authoritative references. Outbound linking to good sources is a quality signal, not "leaking PageRank".
- **Dates:** show published AND updated dates truthfully; update decaying content instead of republishing with fake fresh dates.
- **AI-assisted content is allowed** if it meets these standards: human-reviewed, experience-injected, accurate, and adds value beyond what an LLM would generate from scratch. Pure unedited AI output at scale matches Google's "scaled content abuse" spam policy — don't ship it.

## 6. Content Quality Signals

- **Intent match beats length.** No minimum word count exists. A pricing page that answers in 300 words outranks a 2,000-word essay that buries it.
- One page = one search intent. If a page targets two intents, split it; if two pages target one intent, merge them (cannibalizing pages dilute each other).
- Answer-first structure: conclusion in the first 100 words, details after (inverted pyramid). Users, featured snippets, and AI extraction all prefer it.
- Original information gain: data, opinions, examples, comparisons that don't exist elsewhere. "Same info, rewritten" is the profile the Helpful Content system demotes.
- Scannability: short paragraphs (2–4 lines), bullet lists, comparison tables, descriptive subheads. Tables and lists are disproportionately quoted by AI Overviews.
- Prune or consolidate zombie pages (no traffic, no links, no purpose, 12+ months). Site-wide quality is assessed in aggregate.

## 7. Entity SEO

Google and LLMs rank *entities* (things with defined attributes and relationships), not strings. Make your brand and topics unambiguous:

- **Define your entity home:** one canonical About/Organization page stating who you are, what you do, where, for whom. All profiles link to it.
- **`Organization`/`Person` schema with `sameAs`** arrays connecting your site to LinkedIn, Crunchbase, Wikipedia/Wikidata (if eligible), social profiles — this is how the Knowledge Graph reconciles your identity.
- **Consistent naming everywhere:** same brand name, description, and category across your site, GBP, directories, and socials. Inconsistency fragments the entity.
- Use related entities in content: a page about "web design" that naturally covers wireframes, Figma, responsive layout, accessibility, and conversion signals topical depth to entity-based systems.
- Topical authority = covering a topic cluster completely, not publishing one viral post. Map the cluster before writing.

## 8. Optimizing for AI Overviews & Answer Engines (AEO/GEO)

Ranking #1 no longer guarantees the click; being **cited** is the new visibility layer. AI Overviews sources correlate heavily with top-10 organic results, so classic SEO remains the entry ticket. Then:

- Direct-answer blocks: question H2 + concise 40–60 word answer + supporting detail.
- Quotable, self-contained sentences with claims + numbers ("Design agencies charge £3,000–£15,000 for a marketing site in 2026") get lifted verbatim.
- Publish statistics, original research, definitions, and step lists — the formats LLMs cite most.
- Ensure full server-rendered HTML (AI crawlers don't run JS — see technical-seo.md §3/§8).
- Track: Search Console impressions vs clicks divergence (zero-click growth), plus brand mentions inside ChatGPT/Perplexity answers.
- Expect lower CTR on pure-informational queries; weight content strategy toward queries where users still click (transactional, local, comparison, tools).

## 9. Local SEO Essentials

For any business serving a geographic area:

- **Google Business Profile (GBP)** is the #1 local ranking asset:
  - Exact legal business name — **no keyword stuffing** (2026 enforcement actively suspends profiles for it, especially contractors/locksmiths/movers).
  - Correct primary category + all applicable secondary categories; complete every field (hours, services, attributes, description).
  - 10+ real, high-resolution photos (interior/exterior/work); add new ones monthly.
  - Reply to every review; steady review velocity beats a one-time burst. Never buy reviews.
  - Post updates/offers monthly; keep holiday hours current.
- **NAP consistency:** identical Name/Address/Phone on site footer, GBP, and major directories/citations.
- **LocalBusiness schema** on the contact/location page (see technical-seo.md §4 example).
- **Location pages** for each service area: unique local content (projects in that city, local testimonials, directions) — not find-and-replace city-name doorways, which are a spam policy violation.
- Embed a Google Map, list service areas, and use locally phrased headings ("Web Design in Manchester").
- Local link signals: chamber of commerce, local press, sponsorships, supplier/partner pages.

## 10. On-Page Checklist (per page, pre-publish)

- [ ] Unique title 50–60 chars, keyword first, brand last
- [ ] Unique meta description 150–160 chars with direct answer + CTA
- [ ] One H1; logical H2/H3 outline; question-phrased H2s where intent is informational
- [ ] First 100 words answer the query directly
- [ ] Primary keyword in H1, first paragraph, and URL slug (short, hyphenated, lowercase)
- [ ] 3–8 contextual internal links out (descriptive anchors); ≥ 3 internal links pointing in
- [ ] 1–3 outbound citations to authoritative sources
- [ ] Author byline → bio page with credentials + Person schema
- [ ] Relevant schema type added and validated
- [ ] Images: descriptive filenames, alt text, dimensions set (see seo-for-designers.md)
- [ ] Published/updated dates visible and truthful
- [ ] Content exists in raw server HTML (curl test)
- [ ] No other page on the site targets the same intent
