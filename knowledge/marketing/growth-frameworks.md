---
id: growth-frameworks
title: "Growth Frameworks — Loops, AARRR, PLG & Retention Math"
category: marketing
platform: both
tags: [growth, growth-loops, aarrr, plg, retention, virality]
sources: ["https://www.reforge.com/blog/growth-loops", "https://amplitude.com/blog/pirate-metrics-framework", "https://posthog.com/product-engineers/aarrr-pirate-funnel", "https://www.news.aakashg.com/p/ultimate-guide-growth-loops", "https://openviewpartners.com/product-led-growth/"]
updated: 2026-07-09
---

# Growth Frameworks — Loops, AARRR, PLG & Retention Math

How growth actually compounds, how to measure it, and how design decisions move the numbers. This is the strategy layer above the tactical conversion work in `conversion-ux.md`, the retention mechanics in `hooked-retention.md`, and the first-run design in `onboarding-paywall.md`.

The one-line thesis (Brian Balfour / Reforge): **funnels run out of fuel; loops compound.** Build the loop first, then optimize the funnel inside it.

---

## Part 1 — Funnels vs. Growth Loops

### Why funnels leak

The classic funnel is linear: pour traffic in the top, some fraction survives each stage, a trickle converts at the bottom. It is a useful *measurement* mental model, but a dangerous *strategy* model, because it implies growth = "pour more in the top." That reasoning has two failure modes:

- **It runs out of fuel.** Every acquisition source saturates. Channels get more expensive as you scale them (auction-based ad platforms literally raise your CPA as you spend more). A funnel with no reinvestment mechanism needs ever-larger top-of-funnel spend just to hold flat — a treadmill, not a flywheel.
- **It hides where growth comes from.** Funnels treat the output (a new user) as an endpoint. The fastest-growing products treat that new user as an *input* to the next cycle of acquisition.

### What a loop is

A growth loop is a closed system where the **output of one cycle becomes the input to the next**. The canonical shape has three beats:

1. **Input** — a new or returning user, or new content/data they produce.
2. **Action / process** — the user does something inside the product that has an external side effect.
3. **Output that feeds back** — that side effect brings in (or reactivates) more users, who become the next input.

Because each turn of the loop generates more inputs than it consumed, growth accelerates without proportionally more top-of-funnel spend. The compounding is the whole point. A funnel adds; a loop multiplies.

Practical framing for SaglitzDesign work: **before designing screens, name the product's primary loop in one sentence** — "User publishes a page → page ranks/gets shared → visitors sign up to make their own → publish more pages." If you cannot write that sentence, the growth model is "buy traffic forever," and design should optimize the funnel hard (see `conversion-ux.md`) while the business finds a loop.

---

## Part 2 — The Four Loop Types

Reforge and Aakash Gupta's syntheses converge on four families. Most durable products run **one dominant loop plus one or two supporting loops**. Trying to run all four at once dilutes focus.

### 1. Viral / referral loops
User action exposes the product to non-users, who become users, who expose more.
- **Word-of-mouth / inherent virality:** using the product *requires* pulling others in — Zoom (you send a link to meet), Calendly (recipients see it to book), Figma/Docs (collaboration invites), WhatsApp (messaging a non-user). The exposure is the core action; nothing feels like "marketing."
- **Incentivized referral:** give-get rewards (Dropbox's "invite a friend, both get storage"; Uber/PayPal credits). Effective but decays as the incentive commoditizes; guard against fraud.
- **Design levers:** the share/invite moment must sit at the **peak-reward point** (tie to `hooked-retention.md` Investment phase — invite *after* the aha, never before), the invite artifact must carry obvious value to the recipient, and the recipient's landing → activation path must be frictionless (`conversion-ux.md`).

### 2. Content loops
User (or the product) generates content that gets indexed or shared, pulling in visitors who create more content.
- **UGC + SEO:** Reddit, Quora, Stack Overflow, Pinterest, TripAdvisor, G2 — every answer/review is a new indexable page ranking for long-tail queries; searchers arrive, some contribute, adding more pages. (Cross-reference the GEO/SEO docs — in 2026 this loop increasingly feeds AI answer engines, not just Google.)
- **Programmatic / aggregation content:** Zapier's "connect X to Y" pages, Zillow listings — the product mints pages from structured data or integrations.
- **Design levers:** low-friction content creation, templates/prompts that lower the blank-page cost, canonical shareable URLs, fast indexable pages, empty states that nudge the first contribution.

### 3. Paid loops
Revenue from acquired users funds the acquisition of more users — the loop closes through the **P&L**, not the product.
- Works only when **contribution margin per user (over the payback window) exceeds CAC** and the payback period is short enough to reinvest. e-commerce and many transactional apps live here.
- Not "lesser" — it is highly scalable *while* LTV:CAC holds — but it is the loop most exposed to channel saturation and rising ad costs, so it wants a second loop (viral/content) reducing blended CAC over time.
- **Design levers:** landing-page conversion rate and time-to-value directly widen the margin that funds the loop; every point of activation lift shortens payback.

### 4. Sales loops
Revenue and usage fund a sales/marketing motion that lands more accounts, whose usage/expansion funds more sales capacity.
- Classic B2B: land-and-expand, where seat/usage expansion inside won accounts (net revenue retention >100%) compounds without new logos. Often paired with a **PLG bottom-up loop** feeding qualified accounts to sales (product-led sales).
- **Design levers:** in-product expansion prompts, admin/seat-invite flows, usage dashboards that surface value to the buyer, and product-qualified-lead (PQL) signals routed to sales.

**Picking the dominant loop** (heuristic):
- Product needs collaborators to function → viral (inherent).
- Users naturally produce searchable/shareable artifacts → content.
- High-margin transactions, no inherent sharing → paid.
- High ACV, multi-stakeholder buying → sales (usually + PLG feeder).

---

## Part 3 — AARRR: The Measurement Layer

Dave McClure's **Pirate Metrics** (2007) is the instrumentation that tells you *which part of the loop is broken*. Five stages — **A A R R R**:

| Stage | Question | Example metric | Where design moves it |
|---|---|---|---|
| **Acquisition** | How do people find us? | traffic, installs, signups by channel | landing page clarity, hero/CTA (`conversion-ux.md`), app-store/paywall model (`onboarding-paywall.md`) |
| **Activation** | Do they reach first value? | % hitting the "aha"/setup-complete event | onboarding sequence, time-to-value, empty states, cold-start content (`hooked-retention.md` Part 2) |
| **Retention** | Do they come back? | D1/D7/D30 return, weekly active, cohort curves | habit loop (Trigger→Action→Reward→Investment), honest notifications, disengagement design (`hooked-retention.md`) |
| **Referral** | Do they bring others? | K-factor, invites sent, viral cycle time | share/invite moments at peak reward, invite artifact value |
| **Revenue** | Do they pay? | trial→paid, ARPU, LTV, expansion | paywall/pricing design, plan packaging (`pricing-strategy.md`, `paywall-benchmarks.md`) |

Note ordering: McClure deliberately does **not** put Revenue last-because-least — the letters are a memory device, not a priority order. In practice the highest-leverage stages for most early products are **Activation and Retention**, because they gate everything downstream (Part 4).

**How to use it with loops:** the loop tells you the *strategy*; AARRR tells you *where the strategy is failing*. A viral loop with great Acquisition and Referral but broken Retention will spin down no matter how many invites go out. Instrument every stage as an event and read **cohorts**, not aggregate averages — averages hide the retention cliff.

---

## Part 4 — The Leaky-Bucket Principle (Retention Gates Everything)

Growth = **new users − churned users**. If the bucket leaks faster than you pour, no acquisition budget wins. This is the single most important idea in the doc:

- **High virality + low retention still fails.** A big K-factor pushes users *into* a bucket with a hole in it; you get a spike and a collapse (the trajectory of most "viral" apps that vanished). Retention is what makes every *other* metric compound — retained users have more sessions (more acquisition surface for the loop), more opportunities to refer, and more revenue.
- **Retention is the ceiling on LTV**, and LTV is the ceiling on how much you can spend to acquire. So retention silently sets your maximum viable CAC — it caps the paid loop too.
- **Sequence accordingly.** Do not pour acquisition spend into a product with a flattening-toward-zero retention curve. Fix Activation and Retention until cohort curves *flatten above zero* (a stable retained core), then scale acquisition. Retention curves that asymptote to a flat line = product-market fit signal; curves that decay to zero = a bucket with no bottom.

Design implication: the retention work in `hooked-retention.md` (habit loops for high-frequency products, scheduled-trigger retention for low-frequency ones) and the Day-0 activation focus in `paywall-benchmarks.md` (55% of trial cancels happen on Day 0) are **growth infrastructure**, not polish.

---

## Part 5 — Viral Coefficient (K-factor) Math

The **K-factor** measures how many *new* users each existing user generates through the viral loop:

```
K = i × c
  i = average number of invites sent per user
  c = conversion rate of an invite into a new active user
```

- **K = 1** → each user brings exactly one new user → theoretically self-sustaining (borderline).
- **K > 1** → true exponential growth (rare and usually temporary — invite lists exhaust).
- **K < 1** → the loop *amplifies* other acquisition but does not sustain alone. This is the realistic, valuable case: a K of 0.5 means every 100 paid signups bring 50 more free ones, effectively cutting blended CAC by a third. Most sustainable "viral" products live at K = 0.2–0.7 and pair virality with another loop.

**Viral cycle time (`ct`) matters as much as K.** The same K compounds far faster if a loop completes in a day vs. a month — halving cycle time can beat raising K. Design to shorten the time from a user's first value to their first successful invite: prompt the share at the peak-reward moment, make the invite one tap, make the recipient's activation instant.

**Watch for vanity K.** Invites *sent* is not invites *converted*; measure `c` on activation (reached first value), not on signup. A high `i` with near-zero `c` is a spam loop that burns goodwill and inbox reputation.

---

## Part 6 — Product-Led Growth (PLG)

PLG makes **the product itself the primary acquisition, activation, and expansion engine** — the loop runs through product usage rather than a sales team or ad budget. It underpins viral, content, and product-led-sales loops.

Core mechanics:
- **Self-serve:** a user can sign up, reach value, and pay without talking to a human. Removes the sales bottleneck and lets acquisition scale with product, not headcount.
- **Time-to-value (TTV) is the north star.** The faster a new user hits the aha, the higher activation → retention → referral → revenue. Ruthlessly compress setup; use templates, sample data, and instant demo modes (see `hooked-retention.md` cold-start rule). TTV is where design has the most direct revenue leverage in a PLG model.
- **Freemium or free-trial front door** lets users experience value before paying — choose deliberately (the freemium-vs-trial-vs-reverse-trial decision lives in `pricing-strategy.md` and `paywall-benchmarks.md`; hard paywalls convert ~5× freemium but freemium fuels top-of-loop reach).
- **Product-Qualified Leads (PQLs):** instead of marketing-qualified leads from form fills, PLG routes users who hit *usage* thresholds (invited 3 teammates, used core feature N times, hit a plan limit) to expansion or sales. Usage is a far stronger buying signal than a downloaded whitepaper.
- **In-product growth surfaces:** upgrade prompts at the moment of hitting a limit, invite flows, empty-state nudges, and contextual paywalls — design owns all of these.

PLG is not universal: high-ACV, security-heavy, or deeply-configured enterprise products may need sales-led motions. Many 2026 winners run **hybrid** — PLG bottom-up feeding a sales loop for expansion (mirrors the hybrid pricing shift in `pricing-strategy.md`).

---

## Part 7 — Picking the Right Loop for a Product

A decision procedure for SaglitzDesign engagements:

1. **Diagnose natural behavior, don't impose a loop.** Does using the product *inherently* expose it to others (→ viral)? Produce searchable/shareable artifacts (→ content)? Generate high-margin transactions (→ paid)? Involve multi-stakeholder buying (→ sales)? Force-fitting a referral program onto a product with no sharing moment produces a dead loop.
2. **Check the retention floor first.** No loop is worth building until cohort retention flattens above zero. Fix the bucket before choosing a faucet (Part 4).
3. **Match loop to frequency.** High-frequency products can sustain viral/content loops driven by habitual usage; low-frequency products (`hooked-retention.md` Part 4) lean on paid or sales loops plus scheduled-trigger retention — don't chase DAU where the natural rhythm is monthly.
4. **Pick ONE dominant loop, instrument it with AARRR, find the constraint.** Optimize the single weakest stage of the dominant loop before adding a second loop. A loop growing at a real 5%/week compounds enormously; scattering effort across four half-built loops grows nothing.
5. **Add a second loop for defensibility/efficiency,** not novelty — typically a content or viral loop layered onto a paid loop to drive blended CAC down over time.

---

## Quick-Reference Checklist

1. Can you state the product's dominant growth loop in one sentence (input → action → output that feeds back)? If not, you're on the acquisition treadmill.
2. Is the loop type matched to the product's *natural* behavior, not imposed?
3. Do cohort retention curves flatten **above zero**? (If not, stop acquisition spend and fix Activation/Retention first.)
4. Is AARRR instrumented as events, read by cohort — with the single weakest stage identified?
5. For viral loops: is K measured on *activated* invitees (not signups), and is the invite prompted at peak reward with a one-tap flow and short cycle time?
6. For PLG: is time-to-value ruthlessly minimized, and are PQLs defined on usage thresholds?
7. Is retention treated as growth infrastructure (link to `hooked-retention.md`), not polish?
8. Does the pricing/paywall model (`pricing-strategy.md`, `paywall-benchmarks.md`) fit the loop — freemium for reach-driven loops, hard paywall for revenue-driven ones?
