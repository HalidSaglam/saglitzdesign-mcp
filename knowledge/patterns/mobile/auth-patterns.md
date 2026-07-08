---
id: mobile-auth-patterns
title: "Mobile Login & Social Sign-In Patterns"
category: pattern
platform: mobile
tags: [auth, login, social-sign-in, sso, forms]
sources:
  - "https://mobbin.com/screens/3a993e71-e6d1-49bc-9451-495fca570e36"
  - "https://mobbin.com/screens/faef2f5a-0953-470e-b56b-38a4c3ccd789"
  - "https://mobbin.com/screens/08780534-efa2-4feb-a429-6bbb525e59aa"
  - "https://mobbin.com/screens/7336baf0-22a8-4e07-be82-59bd383432a4"
  - "https://mobbin.com/screens/62f02032-d47e-49ff-9bef-1424e97d00ac"
  - "https://mobbin.com/screens/71bd698f-b9a5-4943-8f1f-1753ea918739"
  - "https://mobbin.com/screens/f12af768-77c6-45cd-b71a-bce949365de4"
updated: 2026-07-08
---

# Mobile Login with Social Sign-In (iOS)

Based on real screens from Reddit, Balance, Strava, MyFitnessPal, Vocabulary, IMDb, and Airalo on Mobbin.

## Observed patterns

### Social-first layout (most common)
- [Reddit](https://mobbin.com/screens/3a993e71-e6d1-49bc-9451-495fca570e36): close X top-left, "Sign up" link top-right, large "Log in" title, legal microcopy ("By continuing, you agree to our User Agreement and Privacy Policy") directly under the title, then three **identical outlined pill buttons** — brand icon left-aligned, label centered: "Continue with Google", "Continue with Apple", "Continue with Login Link". Below: an "OR" divider with hairlines, filled gray Username/Password fields (password has an eye toggle), a "Forgot password?" link, and a full-width "Continue" button at the bottom that sits **disabled (washed-out gradient)** until fields are valid.
- [Strava](https://mobbin.com/screens/08780534-efa2-4feb-a429-6bbb525e59aa): nav bar with "< Back" and centered "Log In" title; Facebook button filled in brand blue on top, Google and Apple as white outlined buttons beneath — all full-width, same height, stacked with tight equal gaps; then a grouped Email/Password field pair and "Forgot Password".
- [Airalo](https://mobbin.com/screens/f12af768-77c6-45cd-b71a-bce949365de4): presented as a **bottom sheet** with a Log in / Sign up segmented tab underline at the top. Social options are three compact **icon-only pills in a row** (Apple, Google, Facebook), followed by Email + Password outlined fields, "Forgot password", a disabled "Log in" pill, and a secondary "Log in with SSO" text link.

### Email-first layout
- [MyFitnessPal](https://mobbin.com/screens/7336baf0-22a8-4e07-be82-59bd383432a4): labeled Email/Password fields on top, a filled blue "Log In" button, "Forgot password?" link, then an "OR" divider and three white card-style social buttons (Google, Apple, Facebook) with icon + centered label. Reassurance microcopy at the very bottom: "We will never post anything without your permission."

### Minimal / value-framed layout
- [Vocabulary](https://mobbin.com/screens/62f02032-d47e-49ff-9bef-1424e97d00ac) frames sign-in as a benefit, not a gate: mascot illustration, headline "Keep your data safe", subcopy explaining that an account preserves favorites and settings across devices. Only two options: black "Sign in with Apple" pill first, white outlined "Sign in with Google" second. Legal microcopy in small centered gray text at the bottom.
- [Balance](https://mobbin.com/screens/faef2f5a-0953-470e-b56b-38a4c3ccd789): three stacked full-width rectangles each filled with the provider's brand color (Apple black, Facebook blue, Email teal) — bold but visually noisy; the three competing brand colors give no clear primary.
- [IMDb](https://mobbin.com/screens/71bd698f-b9a5-4943-8f1f-1753ea918739): "Returning customer?" heading over a uniform list of white rounded rows, each with a brand icon and left-aligned label (IMDb, Amazon, Google, Apple) — treating providers as a neutral choice list.

### Cross-app constants
- Social buttons are always **full-width (or equal-width), ~48–56pt tall, pill or 8–12pt rounded**, stacked vertically with equal spacing, and use the provider's official icon.
- "Continue with X" / "Sign in with X" wording — never bare brand names.
- Apple is always present and usually first or second (App Store requirement when third-party login is offered).
- Email/password is positioned as the fallback below an "OR" divider (Reddit, MyFitnessPal, Strava, Airalo).
- Legal agreement copy appears on the login screen itself, in small gray text near the title (Reddit) or the bottom (Vocabulary).

## Design rules derived

**Do**
1. Offer 2–4 social providers max; include Sign in with Apple whenever any social login exists (App Store Review 4.8).
2. Make every social button the same shape, width, and height; differentiate providers by icon + label, not by size.
3. Use "Continue with [Provider]" labels — "Continue" works for both new and returning users.
4. Give the recommended provider the only filled/high-contrast treatment (black Apple pill in Vocabulary); render the rest outlined.
5. Separate social options from email/password with a hairline "OR" divider.
6. Include: "Forgot password?" link near the password field, a show/hide eye toggle on password, and a route to the opposite mode (Sign up link in the nav or a tab pair like Airalo).
7. Keep the email/password submit button disabled until inputs are plausibly valid, like Reddit and Airalo.
8. Put agreement microcopy ("By continuing you agree to…") on the auth screen with linked Terms/Privacy.
9. Add one line of trust reassurance when a provider raises privacy fears (MyFitnessPal's "We will never post anything without your permission").
10. If auth is optional, frame it around the user's benefit ("Keep your data safe" — Vocabulary) and keep it skippable.

**Don't**
1. Don't fill every button with its provider's brand color (Balance) — the screen loses a visual hierarchy and a primary action.
2. Don't hide email login entirely if your audience includes users without the offered social accounts.
3. Don't use icon-only social pills (Airalo) unless space is critical; labels remove ambiguity and help accessibility.
4. Don't place legal text where it interrupts the field → CTA flow; above the title or below the CTA are the observed safe zones.

## Anti-patterns seen

- **Brand-color soup** (Balance): three saturated brand-filled buttons of equal weight; no primary action, poor scalability when providers are added.
- **Duplicate affordances** (Strava): "Log In" appears both as a disabled nav-bar button and as the implicit form action — two competing submit locations.
- **Ultra-low-contrast disabled CTA** (Reddit): the disabled gradient "Continue" is so faint it can read as decorative; disabled states should stay legible.
- **No sign-up escape hatch on screen** (IMDb, Balance): returning-user screens without a visible "create account" path strand new users behind the back button.
