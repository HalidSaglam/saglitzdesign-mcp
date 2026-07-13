---
id: app-store-optimization
title: "App Store Optimization (ASO) — Store Visibility & Install Conversion"
category: marketing
platform: mobile
tags: [aso, app-store, google-play, screenshots, keywords, conversion]
sources: ["https://developer.apple.com/app-store/product-page-optimization/", "https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization/", "https://developer.apple.com/documentation/storekit/skstorereviewcontroller", "https://developer.apple.com/app-store/ratings-and-reviews/", "https://play.google.com/console/about/store-listing-experiments/", "https://www.apptweak.com/en/aso-blog/how-to-optimize-your-app-screenshots", "https://www.apptweak.com/en/aso-blog/play-store-keyword-research", "https://www.mobileaction.co/blog/product-page-optimization/", "https://splitmetrics.com/blog/app-store-screenshots-aso-guide/"]
updated: 2026-07-13
---

# App Store Optimization (ASO) — Store Visibility & Install Conversion

ASO is the craft of getting your app found (visibility) and getting the finder to install (conversion). It splits cleanly into two loops that need different skills: a **keyword/metadata loop** that wins impressions in search and browse, and a **creative/conversion loop** — icon, screenshots, previews, ratings — that turns those impressions into installs. Treat the store product page as a landing page and optimize it like one. ASO is where paid and organic acquisition both land, so it compounds every other channel: better conversion lowers effective CPI on every ad you run. Pair this with [[value-proposition-jtbd]] (what to say) and [[onboarding-paywall]] (what happens after the tap).

## The Two Stores Are Different Machines

- **App Store (Apple)** ranks on an explicit, structured keyword index. You feed it discrete fields; it matches queries against them. Precision game.
- **Google Play** ranks on semantic NLP over your whole listing plus behavioral signals (install/retention/engagement). Relevance-and-naturalness game — you write for humans and the algorithm infers keywords.
- Consequence: never copy-paste one store's metadata into the other. Apple rewards a dense comma-separated keyword field; Play penalizes keyword stuffing and rewards clean, readable prose.

## Metadata & Keywords — App Store

- **App name / title (30 chars):** highest-weighted indexed field. Format: `Brand: primary keyword` (e.g. `Acme: Habit Tracker`). Every word is indexed and ranked heaviest here.
- **Subtitle (30 chars):** second-highest weight. Put your #2 keyword or a value modifier. **Never repeat a word already in the title** — Apple indexes both fields, so duplicates burn characters for zero gain.
- **Keyword field (100 chars):** hidden from users. Single words, comma-separated, **no spaces after commas** (a space wastes a character). Don't use plurals (Apple auto-matches), don't repeat title/subtitle words, drop "app"/"free"/your category name (Apple adds these). This gives you ~160 indexed characters total (30+30+100).
- **Promotional text (170 chars):** editable without a new build, NOT indexed. Use for timely value ("New: dark mode"), not keywords.
- **Description:** NOT indexed for search on the App Store. Write it for conversion and readability, not keywords. First 2-3 lines show above "more" — front-load the value proposition.
- Note (2025+): Apple's algorithm now OCR-reads **text baked into screenshots** and treats it as a supplementary discovery signal — another reason captions matter for ranking, not just conversion.

## Metadata & Keywords — Google Play

- **Title (30 chars):** indexed, heaviest weight. `Brand - Primary Keyword`.
- **Short description (80 chars):** heavily indexed AND shown above the fold. Write one action-oriented sentence that reads naturally while carrying your top 2 keywords (e.g. "Track habits, build streaks, and hit your goals every day"). This is prime real estate.
- **Long description (4000 chars):** fully indexed. Write natural prose; target ~2-3% keyword density for your top 2-3 terms. Do not stuff, do not repeat the short description verbatim, do not paste keyword lists — Play's NLP demotes it and misleading terms risk rejection.
- **Review replies are indexed** by Google Play — replying with relevant, natural language adds keyword surface and signals engagement.
- Behavioral signals (install rate, retention, uninstalls, ratings) feed ranking, so conversion and quality directly boost visibility here in a way they don't on Apple.

### Keyword research (both stores)
- Start from search intent: what phrases does your target user type, and what job are they hiring the app for ([[value-proposition-jtbd]])?
- Score candidates on **relevance × traffic (search volume) × difficulty (competition)**. Chase mid-tail terms where you can realistically rank, not just the highest-volume head term.
- Mine competitor listings, autosuggest, and review language for real user vocabulary. Tools: AppTweak, Sensor Tower, App Radar, MobileAction, ASOMobile.
- Re-run quarterly; keyword difficulty and seasonality shift. This mirrors [[technical-seo]] keyword strategy — same discipline, tighter character budgets.

## The App Icon

- The icon is your most-repeated brand asset — it appears in search results, charts, ads, and on the home screen. Design it as part of [[branding-identity]], not in isolation.
- Rules: one clear focal element, bold silhouette, high contrast, legible at 1024×1024 down to ~48×48. No fine detail, no long text, no photographs. Fill the canvas — Apple applies the rounded-rect mask automatically (don't pre-round or add your own transparency).
- Platform difference: Apple auto-masks to a superellipse (squircle); Play supports adaptive icons (foreground + background layers, system-applied shape). Design for both masks.
- Test it: the icon is a legitimate A/B variable in Apple PPO and Play experiments. A distinctive color that pops against the store's background often beats a "prettier" but lower-contrast mark. Small, high-frequency changes (color, focal object) move CVR measurably.

## Screenshots & App Previews — The Biggest Conversion Lever

Screenshots move install conversion more than any other single element. ~90% of visitors never scroll past the third screenshot, so **the first 2-3 images decide the install.**

- **Show value, not raw UI.** Each screenshot pairs an in-app frame with a short benefit caption (the "annotated" style). Captioned/annotated sets consistently outconvert bare screenshots.
- **Caption hierarchy:** one big benefit headline per screenshot (3-5 words, readable in ~1 second), optional supporting line. Lead with outcomes ("Sleep better tonight"), not features ("Configurable alarm engine").
- **First frame = your hero.** Treat it like an ad hook: strongest benefit + strongest visual. Assume the viewer sees only the first 1.5 screenshots in the gallery preview ("above the fold").
- **Build a narrative** across the set: hook → core benefit → proof/social proof → secondary features → CTA. Each screenshot earns the swipe to the next.
- **Orientation:** portrait for phone apps (matches browsing context); landscape for games/media where it reflects real use. Don't mix unless intentional.
- **Dimensions (2025-2026):** Apple now requires only the **6.9" iPhone** set (1290×2796 / 1320×2868 portrait) plus a 13" iPad set for iPad apps; older 5.5"/6.5" sizes are no longer required — Apple scales down. Up to **10 screenshots** per localization. PNG or JPEG; PNG preferred for crisp text. Google Play: min 2, up to 8 screenshots, plus a required 1024×500 **feature graphic**.
- **App previews / video (App Store):** up to **3 videos**, 15-30s each, autoplay **muted** in the gallery — so the first frame (poster) and on-screen captions must carry meaning with no sound. Show real in-app footage (Apple requires device capture). Play allows one YouTube promo video. Video can lift CVR but a weak video can hurt — test it, don't assume.

## Ratings & Reviews

- Volume and average rating both drive conversion: apps above **~4.2 stars** convert materially better, and star count/rating are shown right in search results.
- **Prompt at a moment of success.** iOS: `SKStoreReviewController.requestReview` (or the `RequestReviewAction` in SwiftUI); Android: Play In-App Review API. Both show a native, in-context dialog with no app exit.
- **Timing rules:** only after the user has hit a genuine win (completed a task, finished onboarding, achieved a milestone), never on launch or mid-flow, and only for engaged users (multiple sessions, 7+ days installed). Never interrupt a paywall or error.
- **Frequency:** the OS caps prompts to **3 per user per 365 days** and won't re-show for the same version — you cannot force it, so spend those prompts on your happiest moments. Never gate features behind a rating or bribe for stars (both violate policy).
- **Respond to reviews**, especially negative ones: ~70% of users who get a reply revise their rating upward on Play, replies are public trust signals, and on Play they're indexed for keywords. Make in-app support easy to find so frustration routes to you, not to a 1-star.

## Conversion Rate Optimization (Product Page)

- **App Store — Product Page Optimization (PPO):** native A/B test of up to **3 treatments vs. original** for icon, screenshots, and preview video; served to a random % of visitors, results in App Analytics. Run one variable-set at a time; wait for statistical significance before promoting a winner.
- **App Store — Custom Product Pages (CPP):** up to **70** distinct pages, each with its own screenshots/previews/promo text, deep-linkable for specific campaigns or audiences (e.g. one page per ad concept). Now organically searchable and (since mid-2025) assignable different keywords. Apple reports large CVR lifts when traffic hits a well-matched CPP vs. the default page — match the page to the ad's promise ([[ad-creative]]).
- **Google Play — Store Listing Experiments:** A/B test icon, screenshots, feature graphic, short/long description with live traffic and built-in significance reporting. Also supports custom store listings by country, install-state, and audience.
- **Funnel:** think **impressions → product page views → installs.** Metadata/keywords fix the top; creative fixes the bottom. Diagnose which is weak before optimizing — high impressions + low CVR is a creative problem; low impressions is a keyword/ranking problem. See [[conversion-ux]] for the underlying CRO discipline.

## Featured, Categories, Events & Promo Content

- **Category choice** affects both browse discovery and chart eligibility — pick the most relevant, least-saturated category you legitimately fit.
- **Editorial featuring** (App Store Today tab, Play editorial) is human-curated: strong design, platform-tech adoption (latest OS features, widgets, Live Activities), accessibility, and a timely story help. Pitch via App Store Connect / Play Console.
- **In-App Events (App Store):** time-bound event cards (challenges, premieres, competitions) that surface in search/browse and on your page with their own art and copy — a discovery + re-engagement surface. **Promotional Content (Play)** offers analogous LiveOps cards.
- Events and promo cards appear on both original and treatment pages during PPO tests, so they don't interfere with A/B reads.

## Localization Is ASO

- Localizing metadata is one of the highest-ROI ASO moves: each localized listing adds indexed keyword surface AND lifts conversion in that market. Apple indexes keywords across localizations (e.g. en-US, en-GB, en-AU each add space), so localize even for English variants to multiply keyword coverage.
- **Translate AND culturally adapt** — screenshots, captions, value props, color, and social proof should fit local expectations, not be machine-translated word-for-word. Research keywords natively per market; direct translations miss how locals actually search.
- Prioritize markets by revenue potential and download volume, then expand.

## Measuring ASO

- **Core metrics:** conversion rate (page views → installs), impressions, product page views, keyword rankings, share of category, and downstream retention/ARPU (visibility means nothing if installs churn).
- **Sources:** App Store Connect App Analytics + Google Play Console give first-party impression/CVR/keyword-ish data; third-party tools (AppTweak, Sensor Tower, MobileAction, App Radar) estimate keyword rank, volume, and difficulty and track competitors.
- Always tie an experiment to one metric and a significance threshold before shipping. Feed learnings into [[analytics-experimentation]].

## ASO Connects to Onboarding & the Paywall

- The store page sets an expectation; onboarding and the paywall must pay it off. A promise made in screenshots ("hit your goals in 5 minutes a day") should be the exact promise onboarding delivers — mismatch spikes uninstalls and refunds and tanks Play's ranking.
- Align the CPP/ad narrative → screenshots → onboarding → paywall as one continuous message. See [[onboarding-paywall]] for post-install activation and [[paywall-benchmarks]] for what converts after the install.
- Post-install activation and D1/D7 retention feed back into Play ranking and into your ability to fund paid UA — so ASO conversion and lifecycle design are one system, not two.

## Checklist

- [ ] Title uses `Brand: primary keyword` within 30 chars; subtitle carries #2 keyword with zero word overlap.
- [ ] Apple keyword field: 100 chars, single words, no spaces after commas, no plurals, no title/subtitle repeats, no "app/free/category".
- [ ] Play short description: one natural, action-oriented sentence with top 2 keywords; long description ~2-3% density, no stuffing.
- [ ] Keyword list scored on relevance × volume × difficulty; mid-tail terms targeted; refreshed within the last quarter.
- [ ] Icon legible and distinctive at small sizes; canvas filled; designed for both Apple mask and Play adaptive layers.
- [ ] First 2-3 screenshots lead with benefit captions and the hero visual; full set tells a narrative.
- [ ] Screenshots meet current 6.9" iPhone (+ iPad) requirements; captions readable in ~1 second.
- [ ] App preview video's muted first frame communicates value without sound.
- [ ] Review prompt fires only at a success moment via SKStoreReviewController / Play In-App Review API for engaged users.
- [ ] Negative reviews get timely, personal replies; in-app support is easy to find.
- [ ] At least one PPO/CPP or Play experiment running, with a defined metric and significance bar.
- [ ] Metadata + screenshots localized (and culturally adapted) for top markets, including English variants.
- [ ] Store promise matches onboarding and paywall promise end to end.

## Anti-patterns

- **Keyword stuffing / duplication** — repeating words across Apple's title, subtitle, and keyword field, or cramming keyword blocks into Play's description. Wastes budget or triggers demotion.
- **Copying metadata between stores** — Apple's dense keyword field vs. Play's natural-language NLP need opposite approaches.
- **Bare UI screenshots** with no captions or narrative — huge missed conversion; users don't decode raw screens.
- **Burying the value** — putting brand fluff or a slow logo intro in screenshot 1; assuming users scroll past #3 (they don't).
- **Prompting for reviews at launch, on error, or repeatedly** — wastes the OS-capped prompts and annoys users into 1-stars.
- **Gating features behind a rating or bribing for stars** — violates Apple and Google policy; risks removal.
- **Optimizing keywords when the real problem is CVR** (or vice versa) — diagnose the impressions→page-views→installs funnel first.
- **Shipping A/B "winners" without significance** — small samples lie; promote only past your threshold.
- **Machine-translating listings** without cultural or keyword adaptation — reads foreign and misses how locals search.
- **A store promise the app doesn't keep** — inflated screenshots spike uninstalls, refunds, and (on Play) sink ranking.
