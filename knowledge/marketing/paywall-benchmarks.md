---
id: paywall-benchmarks
title: "Paywall & Onboarding Conversion Benchmarks (2026)"
category: marketing
platform: mobile
tags: [paywall, subscription, onboarding, conversion, revenuecat, trial, retention]
sources: ["https://www.revenuecat.com/state-of-subscription-apps/", "https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/", "https://www.revenuecat.com/blog/engineering/android-paywall-gap/"]
updated: 2026-07-08
---

# Paywall & Onboarding Conversion Benchmarks (2026)

Real benchmarks from RevenueCat's *State of Subscription Apps 2026* (115k+ apps, $16B+ tracked revenue). Use these to judge whether a paywall/onboarding is competitive — not vibes.

## Headline numbers

| Metric | Benchmark | Implication |
|---|---|---|
| Hard paywall (signup gate) conversion | **~10.7%** install→trial/purchase | ~5× freemium |
| Freemium (optional paywall) conversion | **~2.1%** | Higher reach, far lower conversion |
| Day-60 revenue per install (hard vs freemium) | **$3.09 vs $0.38** | ~8× |
| Trial length 17–32 days → trial-start→paid | **42.5%** | Longer trials convert better |
| Trial length <4 days → trial-start→paid | **25.5%** | …yet **46.5% of apps use ≤4-day trials** (mistake) |
| Share of 3-day-trial cancellations on Day 0 | **55%** (84% by Day 1) | The first session decides everything |
| iOS Day-35 subscriber retention (median) | **~2.6%** of installs | |
| Android Day-35 (median) | **~0.9%** | Android lags ~3× |
| Android involuntary (billing-failure) churn | **~2.2× iOS** | Dunning/grace-period handling matters |

## Design rules derived

1. **Choose the model deliberately.** Hard paywall ≈5× conversion and ≈8× RPI — default to it unless the product's value genuinely requires free exploration first (network/UGC/virality). Freemium is a reach play, not a revenue play.
2. **Longer trials win.** Move to 14–30 day trials; ≤4-day trials leave ~40% relative conversion on the table. Pair with a **trial reminder** before charge (trust + fewer chargebacks).
3. **Win Day 0.** 55% of cancels happen the first day → the onboarding must deliver the "aha" and the paywall must state value + price clearly in session one. Instrument Day-0 retention as the leading indicator.
4. **Show value before the wall when possible**, but don't bury the paywall — hard-paywall apps that clearly present the offer up front convert best.
5. **Paywall anatomy that converts** (from `onboarding-paywall` pattern): benefit checklist (≤6 concrete benefits), 1–2 plan cards with the recommended one badged, trial timeline ("today → day 12 reminder → day 14 charge"), price + terms disclosed right next to the CTA, restore-purchases link, single primary CTA.
6. **Android: fix involuntary churn.** Grace periods, account hold, billing-retry, and clear payment-update prompts — 2.2× iOS involuntary churn is mostly a dunning-design problem, not intent.
7. **Personalized onboarding lifts paywall conversion** only when answers visibly change the experience or the paywall framing; ≤5 steps with a progress indicator.

## Review rubric (score a paywall against this)

- [ ] Model fits the product (hard vs freemium) — justified, not accidental
- [ ] Trial length ≥14 days (or a deliberate reason it's shorter)
- [ ] Pre-charge trial reminder scheduled
- [ ] Single primary CTA; price + billing terms adjacent to it
- [ ] ≤6 concrete benefits, recommended plan badged
- [ ] Restore purchases + terms/privacy links present
- [ ] Day-0 activation designed (aha before or at the wall)
- [ ] Android: grace period + billing-retry + payment-update UX
- [ ] Trust microcopy ("cancel anytime", "you won't be charged until…")

## Anti-patterns

- ≤4-day trials by default (industry's most common, costly mistake).
- Freemium chosen "to be nice" when the product could hard-gate — leaves ~5× on the table.
- Paywall with hidden/unclear price, or price far from the CTA.
- No trial reminder → surprise charges → chargebacks + 1-star reviews.
- Ignoring Android billing failures (treating churn as intent when it's involuntary).
- Multi-step personalization that never changes anything downstream.
