---
id: web-pricing-sections
title: "Website Pricing Section Patterns"
category: pattern
platform: web
tags: [pricing, plans, comparison, conversion]
sources:
  - "https://mobbin.com/sites/sections/5125964c-8b12-49cc-b037-8e052fc553f9"
  - "https://mobbin.com/sites/sections/af28a0bd-bca7-461c-881b-23e85ec3c674"
  - "https://mobbin.com/sites/sections/7506bd76-c42f-431d-8478-8f477d4ba895"
  - "https://mobbin.com/sites/sections/8fb5fbc1-d28e-4109-a136-08a08db99d2f"
  - "https://mobbin.com/sites/sections/d845ba92-3fe4-4968-9a69-d5ae6e0a4237"
  - "https://mobbin.com/sites/sections/1c1738fa-6ce1-47e6-b749-8d52442dba8d"
  - "https://mobbin.com/sites/sections/13aa6320-cc57-4952-916c-95b0a74300c0"
updated: 2026-07-08
---

# Website Pricing Section Patterns

Derived from Mobbin section screenshots of Clerk, Chronicle, Framer, Qatalog,
Equals, Maze, and Sprig (July 2026 research pass).

## Observed patterns

### 1. Three-column card grid is the default
[Chronicle](https://mobbin.com/sites/sections/af28a0bd-bca7-461c-881b-23e85ec3c674)
(Free $0 / Pro $15 / Team $30),
[Maze](https://mobbin.com/sites/sections/1c1738fa-6ce1-47e6-b749-8d52442dba8d)
(Free / paid / Professional+), and
[Sprig](https://mobbin.com/sites/sections/13aa6320-cc57-4952-916c-95b0a74300c0)
(Free / Starter / Enterprise) all use three equal-width cards with identical
internal structure: plan name → price → feature checklist → CTA. Equal card
heights and aligned baselines make scanning horizontal.

### 2. Two-plan split when the sell is simple
[Qatalog](https://mobbin.com/sites/sections/8fb5fbc1-d28e-4109-a136-08a08db99d2f)
shows just Pro ($15/mo per user, blue "Start your trial" button) and
Enterprise (no price, black "Book a demo" button), each with a one-line
persona description ("For scaling teams…", "For established organizations…")
and an "Includes Pro, plus:" delta list. Enterprise cards consistently swap
price for "Book a demo".

### 3. The recommended-plan highlight
[Chronicle](https://mobbin.com/sites/sections/af28a0bd-bca7-461c-881b-23e85ec3c674)
tags Pro with a "Popular" badge and gives only that card a filled white
button (others get outlined buttons) — on a dark theme this single inversion
is enough to steer choice.
[Framer](https://mobbin.com/sites/sections/7506bd76-c42f-431d-8478-8f477d4ba895)
color-codes each tier's CTA (blue → purple → black) and renders the entry
plan as a fully saturated purple gradient card.
[Qatalog](https://mobbin.com/sites/sections/8fb5fbc1-d28e-4109-a136-08a08db99d2f)
pins a "14 days free trial" badge on the recommended plan.

### 4. Delta feature lists ("Everything in X, plus…")
Chronicle ("Everything in Free, plus:"), Maze ("All Free features, plus:",
"All Professional features, plus:"), Sprig ("Everything in Free, plus",
"Everything in Starter, plus") and Qatalog ("Includes Pro, plus:") all avoid
repeating shared features. Checkmark bullets, 5–8 items per card, grouped
under small-caps or bold section labels when lists get long
([Equals](https://mobbin.com/sites/sections/d845ba92-3fe4-4968-9a69-d5ae6e0a4237)
groups by "Queries", "Connectors" with per-group check/cross marks, using a
monospace face that matches its spreadsheet product).

### 5. Price typography and billing toggle
Price is the largest element on the card: Chronicle and
[Clerk](https://mobbin.com/sites/sections/5125964c-8b12-49cc-b037-8e052fc553f9)
set "$0"/"$25" in display size with "per month"/"per user / month" in small
muted text beside it. Chronicle adds a "Pay annually (save 20%)" toggle above
the grid. Clerk leads the whole section with a value headline ("Pricing that
scales with you") plus a generosity line ("10,000 monthly active users free")
before any cards, and sells add-ons as separate priced line items
("Enhanced authentication add-on — $100/mo").

### 6. Escape hatches below the grid
Maze closes with a centered outlined "Compare all features" button linking to
the full matrix; Framer follows the card grid with a separate "Business Plan"
band for larger organizations; Equals ends each column with its own CTA
("Get started" ×2, "Request a demo" for the top tier). Sprig differentiates
CTA labels per tier: "Create Account" / "Start Free Trial" / "Book a Demo".

## Design rules derived

**Do**
- Default to 2–4 plans in equal-width cards; three is the sweet spot.
- Make price the dominant element; qualify it with a small unit label
  ("per user / month") and an annual-discount toggle where relevant.
- Highlight exactly one plan via badge + button treatment (filled vs
  outlined); leave the rest visually quiet.
- Write feature lists as deltas from the tier below; cap visible items at
  ~8 and group with labels beyond that.
- Give each tier a one-line "recommended for" persona sentence.
- Match CTA label to the tier's motion: self-serve tiers get "Try/Start
  free", enterprise gets "Book a demo" with no listed price.
- Offer a "Compare all features" link rather than showing the full matrix
  inline.
- Repeat the CTA at both top and bottom of tall cards (Sprig puts buttons
  at top; Equals at bottom of long lists — either works, be consistent).

**Don't**
- Don't highlight multiple plans or use equal-strength buttons everywhere —
  the user loses the default choice.
- Don't repeat identical features across all columns; use "Everything in X,
  plus".
- Don't hide the free tier's $0 price — top sites display it as proudly as
  paid prices.
- Don't mix billing periods across cards without a toggle clarifying which
  is shown.

## Anti-patterns

- **Wall-of-matrix pricing**: leading with a 40-row comparison table instead
  of cards. Equals shows long lists can work, but only with grouping, and
  Maze explicitly demotes the matrix behind a "Compare all features" click.
- **Priceless paid tiers**: hiding all numbers ("Contact us" on every plan)
  kills self-serve scanning; observed sites hide price only on the single
  enterprise tier.
- **Badge inflation**: "Most popular" + "Best value" + "Recommended" on
  different plans simultaneously — sampled sites use exactly one badge.
- **Cross-marks as shaming**: long columns of ✗ on cheaper plans (Equals
  grays them out instead, keeping the tone informative, not punitive).
- **Inconsistent card anatomy**: shuffling the order of name/price/features
  between columns breaks horizontal comparison scanning.
