---
id: influence-persuasion
title: "Influence & Persuasion — Cialdini Applied to Design"
category: book
platform: both
tags: [persuasion, social-proof, marketing, conversion, ethics]
sources: ["Influence (Robert Cialdini)", "Pre-Suasion (Robert Cialdini)"]
updated: 2026-07-08
---

# Influence & Persuasion — Cialdini Applied to Web & App Design

Cialdini identified seven universal levers of compliance. People use mental shortcuts to decide;
each principle is a shortcut you can honestly trigger — or dishonestly exploit. This file gives,
for each principle: the mechanism, concrete design/copy patterns, and the ethical line.

**Master rule:** Persuasion is ethical when the claim is TRUE and the user would endorse the
tactic if they saw how it worked. If a pattern only converts because the user misunderstood
something, it is a dark pattern. Never fabricate; only amplify what is real.

---

## 1. Reciprocity

**Mechanism:** People feel obligated to return favors. Giving first — genuinely and without
immediate demand — creates goodwill that converts later.

**Design patterns:**
- Give real value BEFORE the email gate: free tool, calculator, template, audit, generous free tier.
- Order matters: deliver the value, THEN ask. "Here's your result → want it emailed / want more?"
- Content strategy: publish your best material free; the ask (signup, trial) comes after the reader got something.
- Free trial without credit card = a gift; credit-card-required trial reads as a trap and weakens reciprocity.
- Onboarding: get the user to their first win before asking for permissions, referrals, or upgrades.
- Personalize the gift where possible — a tailored report beats a generic PDF.

**Copy templates:**
- "Free [tool/template/report] — no email required." (the "no email required" line itself builds trust)
- Post-value ask: "Glad that helped. Want [next-level thing]? It takes 30 seconds."

**Dark-pattern line:** Fake gifts with hidden costs ("free" that auto-enrolls in billing),
gifts that guilt-trip ("we gave you X, so you owe us"), or gating the promised value after
the user already paid attention. The gift must be real and unconditional.

---

## 2. Commitment & Consistency

**Mechanism:** People act consistently with prior commitments, especially small, voluntary,
public, or effortful ones. Small yes → bigger yes.

**Design patterns:**
- Multi-step forms: start with the easiest, lowest-stakes question (e.g., "What's your goal?"),
  ask for email/payment LAST. Each completed step is a micro-commitment.
- Quiz/configurator funnels: users who invested answers rarely abandon at the results gate.
- Onboarding: ask users to state a goal ("I want to save $200/mo") and reflect it back later
  ("You said you wanted X — here's your progress").
- Progress bars on signup/checkout: visible progress makes abandoning feel like a loss.
- Ask for the tiny thing first: "Try one free lesson" beats "Start your fitness journey."
- App stores: "Continue" onboarding flows before the paywall — users who set up a profile convert better.

**Copy templates:**
- Step-1 question: "What are you trying to [achieve]?" (identity/goal, not contact info)
- Reflection: "Because you chose [X], we recommend [Y]."

**Dark-pattern line:** Manufactured commitment (pre-checked boxes claiming "I agree to receive
offers"), shame-based confirmshaming ("No thanks, I hate saving money"), or making cancellation
require re-committing through hostile flows. Commitments must be freely chosen and easy to reverse.

---

## 3. Social Proof

**Mechanism:** Under uncertainty, people copy what similar others do. Proof from "people like me"
beats proof from celebrities or big numbers alone.

**Design patterns & placement rules:**
- Place proof AT the point of decision, not only on a testimonials page: logos under the hero,
  a testimonial beside the pricing table, a review snippet next to the CTA button.
- Specificity beats volume: "4.8★ from 2,341 freelancers" > "loved by millions."
- Match proof to segment: show enterprise logos to enterprise visitors, indie testimonials to indies.
- Testimonial anatomy: full name + photo + role/company + a SPECIFIC outcome ("cut onboarding
  time from 3 days to 4 hours"), not "great product!"
- Numbers: show counts only when impressive ("Join 40,000 designers"); hide when small — low
  numbers are negative social proof. Same for review scores below ~4.3.
- App Store: screenshots featuring rating badges and press quotes; respond to reviews (visible responsiveness is proof).
- Case studies ordered: problem → intervention → measurable result → quote.

**Copy templates:**
- Hero subline: "Trusted by [N] [specific audience] at [recognizable names]."
- Near CTA: "[Name], [role]: '[specific measurable result].'"

**Dark-pattern line:** Fake reviews, fabricated "23 people are viewing this," invented purchase
notifications, cherry-picked ratings presented as averages. Also illegal in many jurisdictions.
Real-time activity feeds are fine ONLY if the data is real.

---

## 4. Authority

**Mechanism:** People defer to credible experts. Authority = expertise signals + trustworthiness
signals. Admitting a weakness before your strongest point paradoxically boosts credibility.

**Design patterns:**
- Credential placement: certifications, security badges (SOC 2, GDPR), and press logos belong
  near the moments of doubt — payment forms, data-permission prompts, pricing pages.
- Founder/team expertise: "Built by ex-[credible org] engineers" works when true and relevant.
- Content authority: publish original data, benchmarks, teardown analyses — cite your own research.
- Design itself is authority: typography, consistency, and polish are read as competence. A sloppy
  UI undermines every claim on the page.
- The trustworthy-weakness move: "We're not the cheapest — we're the most accurate." Concede a
  real minor drawback, then pivot to your strength.

**Copy templates:**
- "Rated [X] by [independent body]." / "Featured in [publications]."
- Weakness-pivot: "Not for [wrong audience]. Built specifically for [right audience]."

**Dark-pattern line:** Fake badges, invented awards, "as seen in" logos from paid placements
dressed as editorial, actor "doctors." Borrowed authority must be genuine and verifiable.

---

## 5. Liking

**Mechanism:** People say yes to those they like: similar to them, familiar, complimentary,
cooperative toward shared goals.

**Design patterns:**
- Write like the customer talks. Mirror the audience's vocabulary (mine reviews, support tickets,
  Reddit threads for verbatim phrases) — similarity through language.
- Show real humans: team photos, founder notes, signed emails. Faces increase trust and liking.
- Brand voice: warm, specific, occasionally imperfect beats corporate-neutral. Microcopy is a
  liking channel (error messages, empty states, loading text).
- About page is a conversion page: story, values, faces. Link it from checkout-adjacent doubt moments.
- Imagery: show people who look like the target segment using the product.

**Copy templates:**
- Empathy-first opener: "You've tried [thing they tried]. It didn't stick. Here's why."
- Founder note near pricing: "I built this because [genuine shared frustration]."

**Dark-pattern line:** Fake personalization ("Hey {first_name}, I was just thinking about you"),
simulated humans (bots posing as people), flattery scripts. Liking must come from genuine
resonance, not impersonation.

---

## 6. Scarcity

**Mechanism:** People value what is rare or disappearing; loss framing outweighs gain framing.
Scarcity works via FOMO — and misfires into distrust the instant it looks fake.

**Design patterns (ONLY when true):**
- Real limits: cohort start dates, limited seats, genuinely expiring launch pricing, inventory counts.
- Loss framing in copy: "Don't lose your 20% founding-member rate" > "Get 20% off."
- Deadline mechanics: show the actual date ("Price increases March 1"), not a cookie-reset countdown.
- Exclusivity as scarcity: waitlists and invite systems create honest scarcity when capacity is real.
- App pricing: grandfathering ("lock in this price before v2") is honest scarcity.

**Copy templates:**
- "[N] seats left for the [date] cohort."
- "Founding-member pricing ends [real date]. After that, $[higher price]."

**Dark-pattern line — the brightest line in this file:** Countdown timers that reset on refresh,
"only 2 left" on digital goods, evergreen "sales," fake deadlines. These convert short-term and
destroy trust permanently; sophisticated audiences screenshot and shame them. If the scarcity
isn't real, do not ship it.

---

## 7. Unity (Pre-Suasion's addition)

**Mechanism:** Beyond liking — shared identity. "One of us" (profession, location, values,
struggle) is the deepest lever. People don't just like their in-group; they self-persuade for it.

**Design patterns:**
- Identity-first headlines: "For indie iOS developers" outperforms generic benefit claims with
  that audience — name the tribe above the fold.
- Community as product surface: forums, Discord, user showcases; belonging drives retention.
- Co-creation: beta programs, feature voting, "built with our users" — co-creators become advocates.
- Values signaling when authentic: open-source, privacy-first, sustainability — stated plainly, proven with actions.
- Segment-specific landing pages per tribe rather than one generic page.

**Copy templates:**
- "Made by [tribe], for [tribe]."
- "Join [N] [tribe members] who [shared behavior]."

**Dark-pattern line:** Astroturfed community, appropriating identities/causes the brand doesn't
live, us-vs-them fear-mongering. Unity claims are audited hard by real members of the tribe.

---

## Pre-Suasion: The Moment Before the Message

Pre-Suasion's core insight: what a person attends to IMMEDIATELY BEFORE a request shapes their
response more than the request itself. Design controls attention sequence — use it.

**Application rules:**
1. **Prime the relevant frame before the ask.** Before a pricing page, show ROI/results content
   (achievement frame). Before a security product's CTA, show the threat landscape (safety frame).
2. **Openers set the channel.** A hero image of comfort primes comfort-seeking; an image of speed
   primes efficiency evaluation. Choose hero imagery by the mindset you need at the CTA.
3. **Questions are primes.** A pre-signup quiz asking "How much time do you lose to X weekly?"
   makes the cost of the problem salient before the solution appears.
4. **Section order is a persuasion decision.** Standard priming order for a landing page:
   problem salience → possibility (demo/outcome) → proof → offer → scarcity/urgency (if true) → CTA.
5. **Attention = importance.** Whatever you make prominent, users assume matters. Don't give
   prime real estate to secondary messages.
6. **The moment after "yes" is privileged.** Post-signup and post-purchase screens are peak
   receptivity: ask for the referral, the review, or the deeper commitment there — not before.

---

## Quick-Reference: Principle → Placement Map

| Page zone | Primary principles |
|---|---|
| Hero | Unity (name the tribe), Authority (one credibility marker) |
| Below hero | Social proof (logos/counts) |
| Feature sections | Reciprocity (show, teach, give), Pre-suasive ordering |
| Pricing | Authority (badges), Social proof (testimonial per tier), Scarcity (if true) |
| Checkout/signup | Commitment (progress), Authority (security), Liking (human microcopy) |
| Post-conversion | Reciprocity return-ask, Unity (welcome to the tribe), reviews/referrals |
| Onboarding | Commitment (goal-setting), Reciprocity (fast first win) |

## Ethics Checklist (run before shipping any persuasion pattern)

1. Is every factual element true and verifiable?
2. Would the user endorse this tactic if we explained it to them?
3. Does it still convert if the user is fully informed? (If not, it's deception.)
4. Is the reverse action (unsubscribe, cancel, decline) as easy as the forward action?
5. Are we amplifying a real strength, or manufacturing a false signal?

Fail any one → redesign the pattern.
