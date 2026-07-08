---
id: web-hero-sections
title: "Website Hero Section Patterns"
category: pattern
platform: web
tags: [hero, landing, cta, headline, signup]
sources:
  - "https://mobbin.com/sites/sections/8aefc8b7-fe79-4dfa-b0ce-9aa1677e4e45"
  - "https://mobbin.com/sites/sections/8fdb8f57-192b-43e5-b448-532203ec444d"
  - "https://mobbin.com/sites/sections/86f504e1-5a41-4a12-9683-b6e6b9672111"
  - "https://mobbin.com/sites/sections/d008689a-c73f-4513-a760-25a93ef6f043"
  - "https://mobbin.com/sites/sections/e727f26d-79e1-49d9-9ed7-f6590091ec8d"
  - "https://mobbin.com/sites/sections/5f84e90e-f4ae-48e5-bdb0-9b0b9b303f03"
  - "https://mobbin.com/sites/sections/edb14076-5e1f-48d8-ba26-5e5e43f9a9b0"
updated: 2026-07-08
---

# Website Hero Section Patterns

Derived from Mobbin section screenshots of Analogue Agency, ClickUp, Proton,
Passionfroot, Retool, Figma, and Mural (July 2026 research pass).

## Observed patterns

### 1. Center-stacked hero: headline → subhead → single CTA
[Passionfroot](https://mobbin.com/sites/sections/d008689a-c73f-4513-a760-25a93ef6f043)
is the canonical example: a two-line serif headline ("Where creators do brand
deals"), one short sans subhead, and a single dark pill button ("Start for
Free →") — all center-aligned on a warm cream background. Floating, tilted
product-UI fragments (payment card, chart, calendar) sit at the edges of the
canvas, decorating without competing with the copy.
[Retool](https://mobbin.com/sites/sections/e727f26d-79e1-49d9-9ed7-f6590091ec8d)
uses the same skeleton for its bottom CTA band: small "BETA" pill badge above,
one bold headline ("Get up and running in seconds"), one purple button —
nothing else.

### 2. Headline + inline email capture (single-field signup)
[ClickUp](https://mobbin.com/sites/sections/8fdb8f57-192b-43e5-b448-532203ec444d)
puts a bold left-aligned headline ("Let's make the world more productive,
together.") beside a one-field form: "Enter your work email" input with an
attached purple "Get Started" button, on a white card over a subtle dotted
texture. [Analogue Agency](https://mobbin.com/sites/sections/8aefc8b7-fe79-4dfa-b0ce-9aa1677e4e45)
does the compact version inside a saturated blue rounded card: two-line value
promise, email field + white "Sign Up" pill. Rule of thumb: email capture
heroes ask for exactly one field.

### 3. Oversized statement typography as the hero itself
[Figma](https://mobbin.com/sites/sections/5f84e90e-f4ae-48e5-bdb0-9b0b9b303f03)
fills a flat yellow band with a giant black grotesque headline ("Creative
tools meet the internet.") — no imagery at all; type occupies ~60% of the
viewport width and the brand color does the visual work.
[Mural](https://mobbin.com/sites/sections/edb14076-5e1f-48d8-ba26-5e5e43f9a9b0)
inverts hierarchy: a small kicker line ("Work better for better work") over an
enormous "Get started" serif wordmark rendered inside a yellow sticky-note
graphic on a violet field — the CTA literally *is* the hero art.

### 4. Split-tone editorial hero
[Proton](https://mobbin.com/sites/sections/86f504e1-5a41-4a12-9683-b6e6b9672111)
uses a mission-style headline with two-color emphasis: the second line
("privacy and digital freedom") switches to the brand purple while the first
line stays near-black. Body copy is constrained to a narrow ~560px column,
centered. The nav keeps the account CTA (filled purple pill "Create a free
account") even on content pages.

### 5. Nav CTA mirrors hero CTA
In every capture the top-right nav carries the same conversion action as the
hero: Retool ("Start for free", blue), Figma ("Get started for free", black),
Mural ("Sign up, free forever", black), Passionfroot ("Get access →", black),
Proton ("Create a free account", purple). Secondary auth ("Log in"/"Sign in")
sits to its left as plain text or a ghost button.

### Copy style
- Headlines are 3–8 words, benefit- or vision-led, sentence case, often ending
  with a period (Figma, Passionfroot-adjacent style).
- Subheads are one sentence, ~12–20 words, in a muted gray.
- CTA labels lead with a verb and de-risk: "Start for free", "Get started for
  free", "Sign up, free forever". "Free" appears in almost every primary CTA.

### Visual rhythm
- Generous vertical padding: headline blocks float in whitespace roughly 2–3×
  the headline height above and below.
- One accent color per hero; buttons are solid fills with high contrast
  against the field (white-on-blue, black-on-yellow, white-on-black).
- Rounded-rectangle / pill buttons everywhere; no outlined primary CTAs.

## Design rules derived

**Do**
- Lead with one headline (3–8 words), one subhead (≤20 words), one primary
  CTA. Center-stack unless pairing with a form or screenshot.
- Repeat the primary CTA verbatim in the top-right of the nav.
- Include a risk-reducer in or near the CTA ("free", "no credit card",
  "free forever").
- If capturing email in the hero, use a single input joined to the button as
  one visual unit.
- Pick one saturated brand color and let it dominate either the background
  (Figma, Mural, Analogue) or the button (ClickUp, Retool, Proton) — not both.
- Keep decorative product imagery tilted/cropped at the edges so the copy
  column stays clean (Passionfroot).
- Constrain hero copy to a readable measure (~50–65ch for subheads).

**Don't**
- Don't put two competing primary buttons in the hero; a secondary action, if
  present, should be text or ghost style.
- Don't ask for more than an email address in a hero form.
- Don't run headlines longer than two lines at desktop width.
- Don't layer copy over busy photography — every observed hero uses flat
  color, subtle texture, or heavily muted imagery behind text.

## Anti-patterns

- **Feature-dump heroes**: cramming bullet lists or 3+ paragraphs above the
  fold. Top sites defer detail to feature sections.
- **Vague CTA labels** ("Submit", "Learn more") as the primary action — the
  observed set is uniformly verb-first and outcome-specific.
- **Carousel/slider heroes**: absent from all sampled top-tier sites; one
  static message wins.
- **Low-contrast buttons**: every sampled CTA passes obvious contrast against
  its background; avoid tonal (same-hue, low-delta) primary buttons.
- **Orphaned signup**: hero CTA present but missing from the nav, forcing
  users to scroll back up after reading — top sites never do this.
