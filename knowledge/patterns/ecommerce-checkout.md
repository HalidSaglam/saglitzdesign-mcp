---
id: ecommerce-checkout
title: "E-commerce & Checkout — Cart, Payment & Conversion"
category: pattern
platform: both
tags: [ecommerce, checkout, cart, payment, conversion, abandonment]
sources: ["https://baymard.com/lists/cart-abandonment-rate", "https://baymard.com/blog/checkout-flow-average-form-fields", "https://www.nngroup.com/articles/ecommerce-checkout/", "https://www.shopify.com/enterprise/blog/shopping-cart-abandonment", "https://docs.stripe.com/payments/checkout", "https://web.dev/learn/forms/autofill", "https://baymard.com/blog/guest-checkout"]
updated: 2026-07-23
---

# E-commerce & Checkout — Cart, Payment & Conversion

Checkout is the highest-leverage surface in commerce: Baymard Institute's aggregated research puts the average documented cart-abandonment rate at ~70%, and its large-scale usability studies attribute most of it to fixable design, not lost intent. Roughly half of abandonments are "just browsing," but of the rest the leading causes are **unexpected extra costs (~48%), forced account creation (~24%), a long/complicated checkout (~18%), inability to see the order total up front (~16%), and distrust of the payment step (~18%)**. The whole flow below optimizes for one thing: removing friction and surprise between "I want this" and "it's ordered." See [[conversion-ux]] for the funnel above this and [[ethical-design]] for what NOT to do.

## Product detail page (PDP)

The PDP has to sell the item and pre-answer every hesitation before the cart.

- **Imagery**: 5–8 images minimum, one showing scale/context (in-use, on a body, in a room), plus zoom (pinch on mobile, hover-zoom on desktop). Include short video for apparel/complex products. Never ship a PDP with a single stock render.
- **Price clarity**: show the current price prominently; if discounted, show the reference price and the saving. State the currency and whether tax is included (legally required in most of the EU/UK). No hidden "+ fees at checkout" surprises.
- **Add-to-cart**: one unmistakable primary button, sticky on mobile scroll. After add, confirm with an inline toast or slide-in mini-cart — never bounce the user to a full cart page and break browsing momentum. See [[buttons]].
- **Variant selection**: use swatches/segmented controls, not tiny dropdowns, for color/size. Show which variants are out of stock (disabled, not hidden) and reflect the selected variant in the image and price. Block add-to-cart until required variants are chosen, with an inline prompt ("Select a size").
- **Trust signals**: shipping estimate ("Free delivery, arrives Tue 28th"), returns window, stock status, and a size guide where relevant — placed near the buy button, not buried in tabs.
- **Reviews**: aggregate star rating near the title; full reviews lower down with rating distribution, verified-purchase badges, helpfulness sorting, and photos. Show the count honestly; do not fabricate or filter negatives (see [[trust]]).
- **Answer objections in place**: delivery speed, return ease, sizing/fit, materials, and compatibility are the questions that stall a purchase. Surface them near the buy box or in a Q&A block rather than forcing a support ticket.

## Cart

- **Mini-cart vs cart page**: a slide-in mini-cart (drawer) confirms the add and lets users keep shopping — best default. Keep a full cart page for review and editing; deep-link both to checkout.
- **Editing**: allow quantity change and remove directly in the cart with instant total updates and an undo affordance. Persist the cart across sessions/devices for logged-in users.
- **Show totals early**: display the **full order total including estimated shipping and tax before checkout begins** — an early shipping/tax estimator (by ZIP/postcode) directly attacks the #1 abandonment cause. Never reveal fees only on the final step.
- **Cross-sells done right**: relevant, genuinely complementary items ("frequently bought with"), clearly secondary to the checkout CTA — never a full-screen interstitial that blocks progress. One tasteful module, not a wall.

## Checkout flow

### One-page vs multi-step

Both convert well when done right — the choice is less important than field count and clarity. A **single accordion page** feels short and keeps context (best when the flow is genuinely small). A **multi-step flow** (Information → Shipping → Payment) lets you validate incrementally, capture email early (enabling abandonment recovery), and reduce per-screen cognitive load. Avoid a *long* single page that scrolls forever, and avoid a multi-step flow with more than 3–4 steps. Whichever you pick, make every prior step reviewable and editable without losing entered data.

- **Guest checkout is mandatory.** Forced account creation is one of the top abandonment causes (~24%). Offer guest checkout as the default/equal path; let users create an account *after* purchase by just setting a password on the confirmation (their data is already captured). Express wallet buttons (Apple Pay/Shop Pay) sidestep the whole account question.
- **Steps**: one accordion/single-page flow or a short 3-step flow (Information → Shipping → Payment) both test well. What matters is *perceived* length and momentum, not a religious "one page" rule. Baymard finds the average checkout is ~12–14 fields; the ideal is closer to **6–8 for guests**.
- **Progress indication**: for multi-step, show a clear step indicator with completed steps summarized and editable (click to jump back). For single-page, use section headers with a persistent order summary.
- **Persistent order summary**: keep the itemized total, shipping, and tax visible throughout (sidebar on desktop, collapsible on mobile). No total should ever change without the user seeing why.
- Remove global nav and distractions from the checkout; keep only the logo (linking to cart), trust cues, and support.

## Checkout forms

Field minimization and correct input behavior are the difference between a 6-field and a 14-field checkout. Cross-link [[forms-inputs]] and [[ux-writing]].

- **Cut fields**: single full-name field where locale allows; drop "Company," "Address line 2," and "Confirm email" unless truly needed (collapse them behind a link). Default billing = shipping with a single checkbox.
- **Autofill/autocomplete**: set correct `autocomplete` tokens on every field (`email`, `given-name`, `family-name`, `street-address`, `postal-code`, `cc-number`, `cc-exp`, `cc-csc`, `tel`). This lets browsers and password managers one-tap fill and measurably lifts completion. See [web.dev autofill].
- **Address handling**: offer address autocomplete/lookup (postcode or typeahead) to collapse 5 fields into 1–2; localize field labels and order (ZIP vs postcode, state optional). Validate against a real address service where stakes are high.
- **Mobile keyboards**: use `inputmode` and `type` correctly — `type="email"`, `inputmode="numeric"` + `autocomplete="cc-number"` for card, `inputmode="numeric"` for ZIP/CVC. Never make users hunt for the "@" or digits. See [[mobile-ux]].
- **Inline validation**: validate on blur, not on every keystroke; confirm success (green check) and explain errors specifically at the field ("Enter a valid postcode," not "Invalid"). Preserve all entered data on error — never clear the form.
- **Error recovery**: on a declined payment or validation failure, keep the user on the same step, keep their data, and say exactly what to fix. Ambiguous errors at payment are a top abandonment trigger.

## Payment

- **Methods**: offer major cards **plus digital wallets** (Apple Pay, Google Pay, Shop Pay/PayPal) — wallets are often the fastest path and dominate mobile. Where relevant to your audience, offer BNPL (Klarna/Afterpay) and local methods (iDEAL, SEPA, Pix) — missing a customer's preferred method is a silent abandonment cause.
- **Express checkout**: surface wallet buttons at the *top* of checkout (and on the PDP/cart) so returning wallet users skip forms entirely. Stripe/Shopify express-checkout elements handle this in a few lines.
- **PCI trust cues**: card fields hosted by the processor (Stripe Elements etc.), an https lock, recognizable card/wallet brand marks, and a short reassurance line ("Payments are encrypted and secure"). Trust dips at the payment step cause ~18% of abandonment — visible security cues directly counter it.
- **Formatting help**: auto-format and auto-advance card number/expiry/CVC; show the detected card brand; accept spaces and pasted numbers.
- **BNPL placement**: if you offer Buy-Now-Pay-Later, show the installment breakdown ("4 × $18.75") on the PDP and cart, not as a surprise upsell at payment. Present it as one payment option among equals, with terms honestly stated — never nudge users into credit they didn't seek (see [[ethical-design]]).
- **Saved cards & wallets**: for returning logged-in users, default to their saved payment method with a one-tap change option; never re-collect data you already have.

## Cost transparency

The single biggest fixable abandonment cause is **unexpected cost at the end**. Counter it end-to-end:

- Show shipping cost (or a real estimate) and tax **on the PDP and cart**, not first at payment.
- State any handling/service fees, minimums, or import duties up front.
- If you offer free shipping above a threshold, show progress ("You're $12 from free shipping").
- The number the user sees in the cart should equal the number they pay — no last-step surprises.

## Trust & security (no dark patterns)

- Badges and reassurance where doubt peaks: security/encryption at payment, a plain-language return policy and guarantee near the CTA, and honest stock/shipping info.
- **Do NOT use fake urgency or scarcity** — invented countdown timers, fake "3 left / 12 people viewing," or confirm-shaming ("No thanks, I like paying full price"). These are dark patterns: they win one order and destroy LTV, brand, and increasingly violate FTC/EU-DSA rules. Real, accurate scarcity only. See [[ethical-design]] and [[influence-persuasion]] for the ethical line between genuine and manipulative persuasion.

## Post-purchase

- **Confirmation**: immediate on-screen confirmation with order number, itemized summary, total charged, shipping address, and expected delivery date. Offer the one-tap "set a password to save this" account creation here.
- **Order tracking**: email/SMS receipt instantly; provide order status and tracking links. Proactive shipping updates reduce "where is my order" support load and build repeat trust.
- **Recovery, done ethically**: capturing email early enables abandoned-cart reminders. Keep them helpful (a saved cart, a genuine question answered) rather than manipulative — no fake "your cart expires in 10 minutes" pressure. Set expectations for returns and next steps clearly in the confirmation copy (see [[ux-writing]]).
- **Next action**: on confirmation, offer a clear, low-pressure next step (track order, continue shopping, create account) rather than dead-ending the user.

## Mobile commerce specifics

Mobile is the majority of traffic and typically the *lower* converting device — design mobile-first.

- Sticky add-to-cart and sticky checkout CTA; thumb-reachable primary actions.
- Wallet/express buttons prominent — they are mobile's superpower for skipping typing.
- Big tap targets (≥44px), numeric keyboards for numeric fields, minimal typing, address autocomplete.
- Fast: image weight and slow checkout JS cost conversions directly. Lazy-load below-fold PDP media.

## Key metrics

- **Cart abandonment rate** (~70% industry average per Baymard — benchmark against it).
- **Checkout abandonment / completion rate** (narrower, more actionable than cart rate).
- **Add-to-cart rate**, **checkout-start rate**, **payment success rate**, and **average order value**.
- Instrument **field-level drop-off** in checkout to find the specific field killing you.
- **Repeat-purchase and return rate** to catch dark-pattern damage that vanity conversion metrics hide — a flow that wins the first order but tanks retention is a net loss.
- Test one change at a time; removing a field or exposing costs earlier typically moves numbers more than cosmetic tweaks.

## Checklist

- [ ] Order total incl. shipping + tax visible before checkout starts (early estimator in cart).
- [ ] Guest checkout offered as an equal/default path; account creation optional and post-purchase.
- [ ] Express wallet buttons (Apple Pay/Google Pay/etc.) at top of checkout, PDP, and cart.
- [ ] Checkout ≤ ~8 fields for guests; billing defaults to shipping; needless fields cut.
- [ ] Correct `autocomplete`, `type`, and `inputmode` on every field; address autocomplete enabled.
- [ ] Inline, on-blur validation with specific errors; form data preserved on any failure.
- [ ] Persistent, itemized order summary throughout; the shown total equals the charged total.
- [ ] PDP has 5+ images with zoom, clear price, swatch variants, reviews, shipping/returns info.
- [ ] Security/encryption cues and a plain return policy visible at the payment step.
- [ ] Immediate confirmation screen + email with order number, total, and delivery estimate.

## Anti-patterns

- Hiding shipping, tax, or fees until the final step (the #1 abandonment cause).
- Forcing account creation before purchase; no guest path.
- Fake urgency/scarcity, countdown timers, "X people viewing," or confirm-shaming (dark patterns).
- A single blurry PDP image, dropdown-only variants, or hidden out-of-stock states.
- Clearing the form on a validation or payment error; vague "Invalid input" messages.
- Missing digital wallets / customers' preferred payment methods.
- Full-screen cross-sell interstitials that block the path to pay.
- Card fields not correctly typed/autocompleted — forcing manual entry on mobile.
- A cart total that changes at the last step with no explanation.
