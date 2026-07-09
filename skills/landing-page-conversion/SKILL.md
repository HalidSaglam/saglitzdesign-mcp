---
name: landing-page-conversion
description: Build or improve landing pages and marketing sites that convert, not just look good. Use when writing a hero, structuring a page, choosing a CTA, adding social proof, or diagnosing why a page isn't converting. Covers positioning, copy-first workflow, the above-the-fold contract, page narrative, CTAs, trust, and pricing — grounded in StoryBrand, Cialdini, and conversion research.
---

# Landing Page Conversion

A beautiful page with unclear positioning converts worse than a plain page with sharp positioning. Fix upstream first: **positioning → copy → structure → design → speed.**

> Full depth (frameworks, real examples, benchmarks) is in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`): docs `conversion-ux`, `storybrand-copywriting`, `value-proposition-jtbd`, `influence-persuasion`, `growth-frameworks`, and the `/build_landing_page` workflow.

## Order of operations

1. **Positioning first.** One sentence: for [segment] who [struggle], [product] is the [category] that [key value], unlike [alternative]. Decide the ONE conversion goal of the page.
2. **Value proposition.** Map the customer's job-to-be-done (functional/social/emotional) to your value. This becomes the headline.
3. **Copy before layout.** Write the real headline, subhead, CTA, and section copy before designing. Never design with lorem ipsum.
4. **Then design & build**, then optimize.

## The above-the-fold contract

In ~5 seconds a visitor must answer: **What is this? Who's it for? Why care? What do I do next?**

- **Headline:** outcome-focused, specific, ≤10 words. "Ship your app in days, not months" — not "Welcome" or "Empower your workflow."
- **Subhead:** 1–2 lines on how/who.
- **One primary CTA**, value-forward: "Start free trial", "Get the template" — never "Submit".
- **Risk reducers** next to it: "Free · No credit card · Cancel anytime."
- **Real product visual** (screenshot/video) beats abstract illustration.
- **Proof strip** (logos / rating / count) right under the hero.

## Page narrative (proven order)

Hero (promise + CTA + proof) → problem / how-it-works (3 steps) → benefit sections (benefit-led headings, features as evidence) → deep social proof (named testimonials with faces + results) → pricing (if self-serve) → objections / FAQ → final CTA → footer.

Repeat the CTA every ~1.5–2 viewport heights. Every CTA on the page points to the **same** action.

## Persuasion, ethically (Cialdini)

- **Social proof:** specific numbers ("12,483 teams" > "thousands"); named testimonials with photo + role + concrete result.
- **Authority:** security/compliance badges near signup/payment; real credentials.
- **Scarcity:** only if real. Fake countdowns and confirm-shaming convert once and destroy trust.

## CTA & form rules

- The CTA must be the highest-contrast element in its viewport (squint test).
- Signup = email + password or SSO only. Ask for the rest later. Multi-step beats one long form.
- Show value before the wall (free tier, interactive demo, sample output).

## Diagnosing low conversion

Check in this order: **positioning → offer/headline → proof → friction (form/speed) → design.** Fix the biggest funnel drop-off first; test one variable at a time (headline/offer tests move more than button color). Speed is CRO — every second of load costs conversions.

## Anti-patterns

- Designing the hero before positioning exists.
- Carousel heroes (slide 2+ is never seen); "Learn more" as the primary CTA.
- Anonymous testimonials; hidden pricing on a self-serve product.
- Newsletter modal before the visitor reads anything.
- Multiple competing CTAs; jargon headlines.
