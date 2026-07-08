---
id: typography
title: "Typography — Scale, Pairing, Rhythm"
category: ux
platform: both
tags: [typography, fonts, type-scale, readability, variable-fonts]
sources: ["https://m3.material.io/styles/typography", "https://developer.apple.com/design/human-interface-guidelines/typography"]
updated: 2026-07-08
---

# Typography — Scale, Pairing, Rhythm

Typography is 90% of interface design. Most "this looks off" problems are type problems.

## Type scale (modern product default)

Build from 16px base with a ~1.2–1.25 ratio; round to sensible values:

| Token | Size / line-height | Use |
|---|---|---|
| display | 48–72px / 1.1, -2% tracking | Hero headlines (marketing) |
| h1 | 32–40px / 1.15–1.2 | Page title |
| h2 | 24–28px / 1.25 | Section |
| h3 | 20px / 1.3 | Subsection/card title |
| body-lg | 18px / 1.6 | Marketing body, intros |
| body | 16px / 1.5–1.6 | Default UI + reading text |
| body-sm | 14px / 1.45 | Secondary UI, table cells |
| caption | 12–13px / 1.4 | Meta, timestamps — never for primary content |

- Mobile: clamp display/h1 down ~30–40% (72→44, 40→28). Use CSS `clamp()` for fluid scaling.
- Never below 12px anywhere; never below 16px for mobile inputs (iOS zoom).
- Weights: 400 body, 500–600 UI emphasis/buttons, 600–700 headings. Avoid <400 under 18px.
- Hierarchy through **size + weight + color (3 levels: primary ~90% opacity, secondary ~60–65%, disabled ~38%)** — not through more fonts.

## Readability rules

- Line length: 45–75 characters (~60ch ideal); set `max-width: 65ch` on prose.
- Line height: inverse to size — body 1.5–1.6, headings 1.1–1.25.
- Letter-spacing: slightly negative on large headings (-1–2%), neutral body, +2–8% only for small ALL-CAPS labels.
- Left-align body text; center only short headings/blurbs (≤3 lines).
- Paragraphs: space between (8–12px) or indent — not both.
- Numbers in tables/timers: `font-variant-numeric: tabular-nums`.

## Font selection & pairing

- **One family is enough** for most products (headings via weight/size). Two max: distinctive heading + workhorse body.
- Safe modern UI families: Inter, Geist, SF Pro (iOS system), Roboto/Google Sans (Android), plus grotesques (Söhne-like) for brand.
- Pair by contrast, not similarity: geometric sans display + humanist sans body; serif display (editorial feel: Fraunces, Tiempos) + sans body.
- System font stacks are legitimate for apps: zero load cost, native feel.
- Platform: iOS uses SF Pro + Dynamic Type text styles (Large Title 34, Title1 28, Body 17, Caption 12); Material uses the 15-style role scale (Display/Headline/Title/Body/Label × L/M/S). Respect user font-size settings — support Dynamic Type / sp units.

## Web font performance (SEO-relevant)

- WOFF2 only; subset to used scripts; ≤2 families, ≤4 total weight files — or one variable font.
- `font-display: swap` (or `optional` for strict CLS); preload the primary text font; self-host (no third-party CSS blocking).
- Match fallback metrics (`size-adjust`, `ascent-override`) to kill layout shift.

## Anti-patterns

- 3+ typefaces; hierarchy expressed by ALL CAPS everywhere; justified text on web.
- Gray-on-gray body text below 4.5:1 "because aesthetic".
- Fixed px font sizes ignoring user preferences (use rem / Dynamic Type / sp).
- Thin (100–300) weights for UI text; decorative fonts for anything users must read fast.
