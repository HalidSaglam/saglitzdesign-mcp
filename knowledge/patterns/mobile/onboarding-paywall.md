---
id: mobile-onboarding-paywall
title: "Mobile Onboarding & Paywall Patterns"
category: pattern
platform: mobile
tags: [onboarding, paywall, conversion, personalization, free-trial, subscription]
sources:
  - "https://mobbin.com/flows/7ffbd4f0-78d1-49be-bf0d-9c90cac00e8c"
  - "https://mobbin.com/flows/2959b3ec-3a19-475e-82b4-47762857b3a4"
  - "https://mobbin.com/flows/5df9112e-cba3-41a0-bad1-cf6ea08161e6"
  - "https://mobbin.com/flows/744ab3a0-fb8c-4d6c-83c3-e4389eeb9916"
  - "https://mobbin.com/flows/43df4d6b-29ef-484e-98bc-2164e5c193b7"
  - "https://mobbin.com/flows/f04eeefd-deae-48eb-b2af-cb249490247a"
  - "https://mobbin.com/flows/afe2cc2a-7672-43f7-b75c-15c1ff369a52"
  - "https://mobbin.com/flows/97217110-f239-4169-a82b-e92df6c3b23b"
  - "https://mobbin.com/flows/671e3f4d-bd4d-4d0e-b229-fec56d4e215f"
  - "https://mobbin.com/flows/d55019e6-7b8a-4bbd-bc64-7682bb183689"
  - "https://mobbin.com/flows/e6e28fb7-a294-4b88-b03e-1617e967e47b"
  - "https://mobbin.com/flows/aa956b58-fb2c-40b5-a9af-ca313fb252ba"
updated: 2026-07-08
---

# Mobile Onboarding & Paywall Patterns (iOS)

Based on real flows from Brilliant, Nibble, UNIQLO, Wanderlog, Vocabulary, Alma, Apple News, CapWords, Jobber, and bless. on Mobbin.

## Observed patterns — personalization onboarding

### Structure: one question per screen, thin progress bar on top
- [Brilliant's onboarding](https://mobbin.com/flows/7ffbd4f0-78d1-49be-bf0d-9c90cac00e8c) uses a back chevron + slim green progress bar pinned to the top of every question screen. Each screen asks exactly one question ("How will learning fit into your day?") with 3–5 full-width rounded option cards, each prefixed by a small emoji/icon and a **bolded key phrase** followed by lighter descriptive text.
- [Nibble](https://mobbin.com/flows/5df9112e-cba3-41a0-bad1-cf6ea08161e6) does the same: thin green progress line, a "← Back" pill, an emoji + bold question headline top-left, and stacked white rounded option cards ("Male / Female / Other" with emoji). Multi-select questions show trailing checkboxes and instruction copy ("Choose up to 3 topics max").
- [UNIQLO](https://mobbin.com/flows/744ab3a0-fb8c-4d6c-83c3-e4389eeb9916) shows an explicit step counter ("1 / 3") centered in the nav bar with a "Skip" link at top-right. Category selection is a wrap-grid of outlined chips; selected chips get a heavier border.
- [Wanderlog](https://mobbin.com/flows/43df4d6b-29ef-484e-98bc-2164e5c193b7) uses a centered large question headline over stacked emoji-prefixed option cards on a soft gradient background, with "Skip" at top-right.

### CTA behavior
- The primary CTA is a full-width pill button pinned at the bottom (purple for Nibble, near-black for Brilliant and UNIQLO). It renders **disabled (gray)** until a valid selection is made — seen identically in Brilliant, Nibble, and UNIQLO.
- Vocabulary enforces "Select at least one option to continue" as helper text under the headline in its [goal-selection step](https://mobbin.com/flows/f04eeefd-deae-48eb-b2af-cb249490247a).

### Motivation interstitials between questions
- Wanderlog inserts an affirmation screen: "We like the way you travel! We'll use your answers to personalize your trips" — telling users *why* they answered questions.
- Brilliant shows "You'll fit right in" with playful illustration and social-proof copy before asking for account creation.
- [Nibble's setup flow](https://mobbin.com/flows/2959b3ec-3a19-475e-82b4-47762857b3a4) inserts a testimonial screen ("People love Nibble") with 5-star review speech bubbles before the paywall.

### Permission priming
- Both Nibble and UNIQLO show a **pre-permission screen** before the iOS notification prompt: a benefit-led headline ("Remember 3x more new information with visual learning" — Nibble; "Turn on push notifications to receive the latest news" — UNIQLO) plus a mock notification card or illustration. UNIQLO pairs a filled "CONTINUE" with an outlined "SKIP" of equal size.

### Account creation placed late
- Brilliant asks for the account only *after* the questionnaire: "Create a free account to discover your personalized learning path" — three icon-only pill buttons (Apple, Google, Facebook), a black "Continue with email" pill, and "Existing user? Log in" at the bottom.
- Vocabulary defers sign-in even further, letting users pick app icon, goals, and see a word before any account step.

## Observed patterns — paywalls

- [Alma's paywall](https://mobbin.com/flows/afe2cc2a-7672-43f7-b75c-15c1ff369a52) is the canonical layout, top to bottom: close X (top-right), app icon, serif headline ("Get the full Alma experience"), reassurance line ("Try free for 7 days. Cancel anytime."), star rating + review count, a checklist card of 5 concrete benefits, two plan cards (Yearly with "17% OFF" badge and check preselected vs Monthly), a full-width dark-green CTA ("Get started for free"), then a footer row of small links: Restore Purchases · Terms · Privacy · Redeem.
- [Brilliant](https://mobbin.com/flows/7ffbd4f0-78d1-49be-bf0d-9c90cac00e8c) uses the **trial-timeline pattern**: a vertical stepper ("Today: Get Premium access → Day 5: Trial reminder → Day 7: Trial ends") that defuses trial anxiety, plus anchored pricing with strikethrough ("~~$197.98~~ S$164.98 per year ($13.74 per month)") and a "Special discount applied" badge above a green "Start your 7-day free trial" pill.
- [CapWords](https://mobbin.com/flows/d55019e6-7b8a-4bbd-bc64-7682bb183689) puts two plan cards side by side with a "✱ Best Value ✱" badge on the free-trial option (preselected), an award credential ("Apple Design Award 2025 Winner"), a benefit checklist, a gradient CTA, and the exact renewal terms as fine print directly under the button ("Try 3 days free, then S$19.98/year"). Confetti plays on success.
- [Apple News+](https://mobbin.com/flows/97217110-f239-4169-a82b-e92df6c3b23b) presents the paywall as a modal sheet with a wall of recognizable publication logos as social proof and the auto-renew price ("Plan auto-renews for $12.99/month until canceled") in small gray text *above* the red "Get Started" CTA.
- [Jobber](https://mobbin.com/flows/e6e28fb7-a294-4b88-b03e-1617e967e47b) uses horizontally swipeable plan cards with per-plan feature checklists; [bless.](https://mobbin.com/flows/aa956b58-fb2c-40b5-a9af-ca313fb252ba) shows a benefit checklist over branded artwork and swaps the CTA to "You're already subscribed!" for active subscribers.

## Design rules derived

**Do**
1. Ask one question per screen; show progress (thin bar or "1/3" counter) and a back affordance on every step.
2. Render answers as full-width rounded cards (~56pt tall, 16pt side margins) with an emoji/icon prefix and the key phrase bolded; use chip grids only for many short multi-select options.
3. Keep the primary CTA a full-width pill pinned to the bottom safe area; disable it until the step is valid.
4. Offer "Skip" (top-right, low-emphasis text) on any question that isn't strictly required.
5. Insert a "here's what your answers unlock" interstitial before asking for account or payment — connect effort to value.
6. Prime notification permission with a benefit-led custom screen before the system dialog, and give Skip equal visual weight to Continue.
7. On paywalls: close X top-right, benefit checklist (concrete outcomes, not features), 2 plan options max with the preferred one preselected and badged ("Best Value" / "% OFF"), one CTA, and Restore Purchases + Terms + Privacy links.
8. State the full renewal price and trial length in plain text adjacent to the CTA (Brilliant, CapWords, Apple News all do this).
9. Use a trial timeline (Day 0 / reminder / charge date) for free trials — it is the strongest anxiety-reducing pattern observed.
10. Add social proof near the purchase decision: star rating + review count (Alma), testimonials (Nibble), logo wall (Apple News), or award badges (CapWords).

**Don't**
1. Don't ask for account creation before the personalization questionnaire — every strong flow defers it.
2. Don't enable the CTA before a selection exists; silent no-op taps erode trust.
3. Don't present more than ~2 pricing options on mobile; Jobber's horizontally scrolled multi-plan cards force pogo-sticking.
4. Don't hide the paywall dismiss affordance or delay its appearance.
5. Don't fire the iOS notification permission dialog cold, without a priming screen.

## Anti-patterns seen

- **Wall-of-legalese above the CTA** (CapWords second screen): a long gray paragraph of subscription terms pushes the CTA down and gets skipped; keep a one-line disclosure and link the rest.
- **Questionnaire length creep**: Vocabulary's 21-screen onboarding works only because each step is trivially fast; anything slower at that length would bleed users.
- **Low-contrast "Cancel"** (CapWords): the dismiss label is faint gray on a light gradient — technically present, practically hidden. Borderline dark pattern.
- **Truncated legal text mid-scroll** (Jobber): terms cut off behind the tab bar with no scroll affordance.
