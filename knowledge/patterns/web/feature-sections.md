---
id: web-feature-sections
title: "Website Feature Section Patterns (Grids & Bento)"
category: pattern
platform: web
tags: [features, bento, grid, screenshots, product-marketing]
sources:
  - "https://mobbin.com/sites/sections/7295b73f-1281-49d3-99dd-3701cae70072"
  - "https://mobbin.com/sites/sections/54ba196c-c979-4564-a54a-c02a23e8e8f7"
  - "https://mobbin.com/sites/sections/3f148051-6eff-401c-bc33-113cc1d2e964"
  - "https://mobbin.com/sites/sections/011f833e-b660-43b2-abce-affa60297789"
  - "https://mobbin.com/sites/sections/a37dec6a-3829-46e4-b3df-a5cb16185f55"
  - "https://mobbin.com/sites/sections/9038df26-d13c-4c95-98d5-62ba4fd5fad3"
  - "https://mobbin.com/sites/sections/a0b1fcee-ed8b-4709-a230-d750ca54c280"
updated: 2026-07-08
---

# Website Feature Section Patterns (Grids & Bento)

Derived from Mobbin section screenshots of Better Stack, Square, Fibery,
Eventbrite, PamPam, Attio, and Jitter (July 2026 research pass).

## Observed patterns

### 1. Bento/card grid with cropped UI vignettes
[Better Stack](https://mobbin.com/sites/sections/7295b73f-1281-49d3-99dd-3701cae70072)
runs a 3×2 dark bento grid under the headline "That's just the tip of the
iceberg": each rounded card holds a cropped, simplified product-UI vignette
on top, then a bold feature name ("Screenshots and error logs", "Incident
audit timeline") and a 1–2 sentence description. Card borders are a subtle
1px lighter-than-background stroke.
[Attio](https://mobbin.com/sites/sections/9038df26-d13c-4c95-98d5-62ba4fd5fad3)
uses the identical dark 3×2 recipe but with *abstracted wireframe
illustrations* of the UI (gray boxes, dashed outlines) instead of real
screenshots — schematic drawings keep visual noise low while still implying
the interface.

### 2. Alternating media + copy rows
[Square](https://mobbin.com/sites/sections/54ba196c-c979-4564-a54a-c02a23e8e8f7)
lists four features as horizontal rows separated by hairline dividers: small
lifestyle photo left, bold feature title + short paragraph + "Learn more +"
link right. Photography (real merchants using the product) replaces UI
shots because the product is physical. One section headline
("Seamless selling from one location to one hundred") frames all rows.

### 3. Icon-led capability index (many features, low depth)
[Fibery](https://mobbin.com/sites/sections/3f148051-6eff-401c-bc33-113cc1d2e964)
shows a 4-column grid of ~16 features, each just a small colored icon + name
("Map view", "Whiteboards", "Automation Rules") with occasional "new"
badges. [PamPam](https://mobbin.com/sites/sections/a37dec6a-3829-46e4-b3df-a5cb16185f55)
does a calmer 2-column version: each item is a soft rounded icon tile + name
+ one-line description ("AI chat — Find places with AI"). This pattern says
"we have breadth" rather than explaining any one feature.

### 4. 2×2 benefit grid, icon + heading + paragraph
[Jitter](https://mobbin.com/sites/sections/a0b1fcee-ed8b-4709-a230-d750ca54c280)
uses a 2×2 grid; each cell has a small outlined pastel icon, a 2-line bold
benefit heading ("Make professional-quality animations in no time"), and a
~40-word paragraph. No imagery at all — copy does the persuading, whitespace
keeps it airy.

### 5. Four-up screenshot columns
[Eventbrite](https://mobbin.com/sites/sections/011f833e-b660-43b2-abce-affa60297789)
tops the section with four columns, each a floating product screenshot above
a centered feature name ("Embedded checkout", "Scheduled payouts") and a
short paragraph — then transitions directly into a dark testimonial band,
pairing capability with proof.

### Copy & rhythm observations
- Feature titles are noun phrases or imperative benefits, 2–6 words.
- Descriptions are 15–45 words; Better Stack's pattern ("We don't just tell
  you that your service went down. We also tell you why.") shows
  conversational tone works inside cards.
- Dark-theme bento (Better Stack, Attio) is favored by dev/data tools;
  light, warm palettes (PamPam, Jitter, Square) by consumer/creative tools.
- Grids are strict: consistent card padding, equal gutters (~24px), aligned
  title baselines across a row.

## Design rules derived

**Do**
- Pick the pattern by information depth: bento cards for 4–6 differentiated
  features with visuals; alternating rows for 3–5 features needing longer
  stories; icon index for 10+ shallow capabilities; 2×2 icon+copy for pure
  benefit messaging.
- Crop and simplify product screenshots to the one region that proves the
  feature — never paste full-window screenshots into cards.
- Keep every card structurally identical: media → title → description, with
  the same padding and type sizes.
- Frame the grid with one section headline that makes an aggregate claim;
  let cards carry specifics.
- On dark bento grids, use 1px low-contrast borders and slight card
  elevation instead of shadows.
- Use "Learn more" links per row (Square) only when deeper pages exist;
  otherwise omit links to keep cards non-interactive and calm.
- Consider schematic/wireframe illustrations (Attio) when real UI is too
  dense to read at card size.

**Don't**
- Don't mix media types (photo, screenshot, icon, illustration) within one
  grid — every sampled grid is internally homogeneous.
- Don't exceed ~2 sentences of description inside a card.
- Don't let cards vary in height within a row; pad copy to balance.
- Don't add a CTA button inside every card; the section-level CTA or row
  "Learn more" link suffices.

## Anti-patterns

- **Full-app screenshots at thumbnail size**: unreadable UI crammed into a
  card; top sites crop to a single component or redraw schematically.
- **Feature-count vanity grids with paragraph depth**: 16-item indexes must
  stay one-line (Fibery, PamPam); giving each of 16 items a paragraph
  produces a wall of text.
- **Zig-zag rows without dividers or consistent image sizing** — Square's
  version works because photos are uniform in size and each row is separated
  by a hairline rule.
- **Icon soup**: decorative icons that don't map to the feature named (all
  sampled icon grids use literal, recognizable glyphs: map pin for Map view,
  chart for Charts).
- **Repeating body copy across cards** (visible as a flaw even in Jitter,
  where two cells reuse the same paragraph) — each card must earn distinct
  copy or be cut.
