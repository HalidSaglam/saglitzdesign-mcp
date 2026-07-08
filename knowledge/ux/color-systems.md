---
id: color-systems
title: "Color Systems — Palettes, Semantics, Dark Mode"
category: ux
platform: both
tags: [color, palette, dark-mode, semantic-tokens, contrast]
sources: ["https://m3.material.io/styles/color/system", "https://developer.apple.com/design/human-interface-guidelines/color"]
updated: 2026-07-08
---

# Color Systems — Palettes, Semantics, Dark Mode

## Building a product palette

- **60-30-10**: ~60% neutral surfaces, ~30% secondary/structural, ~10% accent. Accent is scarce by design — that scarcity is what makes CTAs pop.
- One brand/accent hue + full neutral ramp + 4 semantic hues (success green, warning amber, danger red, info blue).
- Build ramps of 10–12 steps per hue (50→950). Generate in a perceptual space (OKLCH) so steps are visually even; keep hue slightly shifting across the ramp (warmer lights, cooler darks) to avoid dead grays.
- Neutrals: tint them toward the brand hue 1–3% saturation — pure gray reads lifeless next to a colored accent.
- Test every pairing you actually use: accent-on-surface, text-on-accent, border-on-surface at 3:1/4.5:1.

## Semantic tokens (never hardcode hex in components)

Two layers:
1. **Primitives**: `blue-600`, `gray-100` … (raw ramps)
2. **Semantic roles**: `bg/surface`, `bg/surface-raised`, `bg/accent`, `text/primary`, `text/secondary`, `text/on-accent`, `border/default`, `border/focus`, `state/success|warning|danger`

Components consume only semantic roles → dark mode and theming become a token swap, not a redesign.

## Dark mode (rules, not inversion)

- Surfaces: dark gray (#0A0A0B–#1C1C1E range), **never pure black** behind text (halation); elevation = lighter surface, not shadow.
- Desaturate accents ~10–20% and lighten them; saturated brights vibrate on dark.
- Text: white at 87–92% opacity primary, 60% secondary — pure #FFF body text is harsh.
- Shadows barely work — use borders (`+6–8%` white overlay) to separate raised surfaces.
- Semantic colors need dark-mode variants (lighter red/green for 4.5:1 on dark surfaces).
- Images/illustrations: dim slightly (~90% opacity) or provide dark variants.
- Respect the OS setting (`prefers-color-scheme`) and offer a manual override that persists.

## Psychology & context (use lightly)

- Blue = trust/finance-tech default (also the most overused); green = growth/health/money; red = urgency/danger — reserve for destructive & errors in-product; purple = premium/creative; orange/yellow = energy/attention, weak for text.
- Cultural check for global products (white/red/gold meanings vary).
- Category convention beats psychology: fintech ≈ blue/green + dark premium; health ≈ calm greens/blues; food ≈ warm reds/oranges.

## Practical rules

- Red/danger only ever means destructive or error in-product. Don't use it for badges/accents.
- Links: one link color, underline in body prose.
- Charts: 6-hue max categorical palette, colorblind-safe (test deuteranopia), consistent series colors across the product.
- Gradients: same-hue or adjacent-hue only (blue→violet fine, blue→orange muddy); subtle in UI, bolder allowed in marketing heroes.
- White space is a color: default to more surface, less ink.

## Anti-patterns

- Accent color used for 30% of the screen (nothing pops).
- Text on gradients/images without scrim.
- Dark mode as naive inversion (pure black + neon saturated accents).
- Six different blues drifting across a product because values were hardcoded per-component.
