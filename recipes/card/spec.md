---
component: card
description: A content container with optional media, clamped title, body, footer actions, and an optional whole-card-clickable variant.
---

# Card

## Variants
- **static** — a passive container. Interactive elements (links, buttons) live inside the footer.
- **clickable** — the whole card is one target. Uses a "stretched link": a real `<a>`/`<button>` whose
  ::after pseudo-element covers the card. This gives ONE tap target over the whole surface without
  nesting focusable elements. Do NOT put other links/buttons inside a clickable card (nested tap
  targets break keyboard order and hit-testing); if you need secondary actions, use the static variant.

## Anatomy
- **media** (optional) — fixed aspect-ratio slot (16/9 default); `object-cover`, never distorts.
- **title** — clamped to 2 lines (`line-clamp-2`) so cards in a grid stay the same height.
- **body** — supporting text, optionally clamped to 3 lines.
- **footer** — actions (static variant only) or metadata.

## Required states
default, hover, focus-visible, active. Only the clickable variant is interactive.
- hover/active affect only `transform`/`box-shadow`/`opacity` — no layout shift.
- focus-visible ring is drawn on the CARD (via `:focus-within`) when the stretched link is focused.

## Accessibility
- Media `<img>` needs meaningful `alt` (or `alt=""` if decorative).
- Clickable card: the stretched link carries the accessible name (the title text); keyboard users
  Tab to it once and Enter activates. Hit area is the full card (≥44px).
- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large title text.

## SaglitzDesign rules
- **Border OR shadow, never both** — pick elevation (shadow) or containment (border) for the surface.
- Consistent radius via one token (`--card-radius`); media inherits the top corners.
- One primary action in the footer; secondary actions are lower emphasis.
- Only animate `transform`/`opacity`/`box-shadow`; ease-out on enter.
