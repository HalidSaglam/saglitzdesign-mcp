---
id: iconography
title: "Iconography — Choosing and Using an Icon System"
category: craft
platform: both
tags: [icons, iconography, phosphor, lucide, sf-symbols, material-symbols, consistency]
sources: ["https://phosphoricons.com", "https://lucide.dev", "https://heroicons.com", "https://tabler.io/icons", "https://fonts.google.com/icons", "https://developer.apple.com/sf-symbols/", "https://solariconset.com", "https://www.nngroup.com/articles/icon-usability/", "https://m3.material.io/styles/icons/overview"]
updated: 2026-07-13
---

# Iconography — Choosing and Using an Icon System

Icons are a design system in miniature: get them consistent and they make a product feel considered; mix families, weights, or metaphors and everything looks unfinished. This is how to pick one icon system and use it well. It complements [[clean-app-design]] (one icon family is a core clean-design rule) and the machine-picked recommendation in the `suggest_icon_library` tool. We recommend libraries and how to use them — we don't bundle icon assets; install the chosen set in your own project.

## The single most important rule

**Pick ONE icon family and one default weight, and hold it across the entire product.** The most common reason an interface looks amateur is mixed icons — a Lucide outline next to a Font Awesome solid next to an emoji. A consistent set is worth more than a "better" icon here and there. Choose for coverage and style first; never swap families to get one missing glyph — request it, draw it in the same style, or pick a different metaphor from your set.

## Choosing a library

Decide by **platform first**, then vibe and coverage.

### Platform-native (use these by default on their platform)
- **SF Symbols** (Apple — iOS, iPadOS, macOS, watchOS): ~6,900 symbols, 9 weights × 3 scales, monochrome/hierarchical/palette/multicolor rendering, symbol-effect animations. Aligns optically with San Francisco and inherits Dynamic Type. Apple-platform only, not redistributable. Using a web icon set on iOS/macOS almost always looks off. See [[ios-app-design]], [[macos-app-design]], [[apple-hig-liquid-glass]].
- **Material Symbols** (Google — Android, Material 3, web): variable font with weight/fill/grade/optical-size axes and outlined/rounded/sharp styles. Animate the fill axis for selected nav states. The right default on Android. See [[material-3]], [[android-app-design]].

### Open-source web sets
- **Lucide** (ISC, ~1,600): the modern web/SaaS default. One clean 2px-stroke weight; ships with shadcn/ui. Reach here first for dashboards and product UI.
- **Phosphor** (MIT, ~9,000 = 1,500 × 6 weights incl. duotone): the most flexible set. One family can be airy (thin/light) or bold and branded, with a duotone weight for personality. Best when the product needs character.
- **Solar** (CC BY 4.0, ~1,200): the "premium app" look; Bold Duotone reads as expensive. Attribution required.
- **Heroicons** (MIT, ~300): by the Tailwind team; optically-tuned size variants (outline/solid/mini/micro). Small but high-quality; pairs with Tailwind.
- **Tabler** (MIT, ~5,900): Lucide-style stroke with much broader coverage — great for data-dense admin panels.
- **Remix Icon** (Apache 2.0, ~3,000): large, neutral, matched line/fill pairs, good brand-glyph coverage.
- **Radix Icons** (MIT, ~300): crisp 15px icons for dense developer tooling.

**Coverage check before committing:** list the 15–20 icons your product actually needs (including the obscure ones — "merge", "sync conflict", "webhook") and confirm the set has them. A beautiful set missing a third of your glyphs will force inconsistency later.

## Licensing (check before you ship)
Most sets above are MIT / Apache / ISC — free to use and redistribute, typically with the license notice retained. **Solar is CC BY 4.0 — it requires visible attribution** (an about/licenses screen). **SF Symbols are Apple-platform-only and not redistributable** — don't rasterize and ship them on the web or Android. When in doubt, read the license; keep a `NOTICE`/licenses screen listing your icon set. See [[ethical-design]] for the broader "respect licenses" stance.

## Sizing and optical alignment
- **Size icons to the text they sit with** — roughly 1×–1.25× the cap height of adjacent type. Common UI sizes: 16px (dense/inline), 20px (default body), 24px (comfortable/toolbar). Set these as tokens, not one-offs. See [[typography]], [[design-tokens-theming]].
- **Use size-specific variants, don't scale.** Heroicons mini/micro and SF Symbols scales are drawn for small sizes; a shrunk 24px icon looks muddy at 16px.
- **Optically center, don't box-align.** Icons rarely look centered when their bounding box is centered — nudge for visual balance, especially triangles/play/arrows.
- **Keep stroke width consistent** with your set (usually ~2px at 24px). Don't place a 1.5px-stroke icon beside a 2px one.

## Weight, fill, and state
- **Default weight matches your type weight.** A bold heading font pairs with heavier icons; a light UI pairs with regular/light.
- **Fill/solid = active or selected; outline = default.** Use the state pair the set provides (Lucide+filled equivalents, Material fill axis, SF `.fill` variants, Remix line/fill) rather than signalling state with color alone — color-only state fails for color-blind users.
- **Reserve duotone/multicolor** (Phosphor duotone, Solar Bold Duotone, SF palette/multicolor) for accents, feature highlights, and empty states — not every list row. Overused, it turns noisy. See [[clean-app-design]].

## Accessibility
- **Decorative icons:** `aria-hidden="true"` (web) / hide from the accessibility tree, so screen readers don't announce them.
- **Icon-only controls need an accessible name:** `aria-label` on the button (web), `accessibilityLabel` (SwiftUI), `contentDescription` (Android). A bare icon button is invisible to assistive tech.
- **Never rely on an icon alone** to carry critical meaning — pair with a text label, or ensure the metaphor is unambiguous and learnable. Ambiguous icons (hamburger vs. kebab vs. meatball, "share" glyphs) benefit from labels. See [[accessibility]], [[ux-writing]].
- **Respect tap targets:** the icon can be small, but the hit area must meet minimums (iOS 44pt, Android 48dp, web 24px+). Pad the control, not the glyph.

## Performance
- **Tree-shake / import per-icon.** Import `{ Search } from 'lucide-react'`, never the whole set. Shipping thousands of unused SVGs bloats the bundle and hurts LCP. See [[technical-seo]], [[design-engineering]].
- **Inline SVG for critical UI** (crisp, themeable via `currentColor`); an icon webfont is fine for large Material/Symbol use but blocks on font load — subset it.
- **Theme with `currentColor`** so icons inherit text color and dark-mode automatically. See [[color-systems]].

## Checklist
- [ ] Exactly ONE icon family across the product; one default weight/stroke.
- [ ] Platform-native chosen where it applies (SF Symbols on Apple, Material Symbols on Android).
- [ ] Coverage verified against a real list of the icons the product needs.
- [ ] License understood; attribution provided if required (e.g. Solar CC BY); no SF Symbols shipped off-Apple.
- [ ] Icon sizes are tokens (16/20/24…), sized to adjacent text; size-specific variants used, not scaled.
- [ ] Stroke width consistent; icons optically centered.
- [ ] State shown with fill/outline variants, not color alone.
- [ ] Decorative icons `aria-hidden`; icon-only buttons have accessible names.
- [ ] Hit areas meet platform minimums even when the glyph is small.
- [ ] Icons imported per-glyph / tree-shaken; themed via `currentColor`.

## Anti-patterns
- **Mixing icon families** (or two stroke widths) in one product — the #1 tell of an unpolished UI.
- **Swapping in a foreign icon** because your set lacks one glyph — breaks consistency for a single node.
- **Scaling a 24px icon down to 16px** instead of using a size-tuned variant — muddy edges.
- **Icon-only buttons with no accessible label** — invisible to screen readers, ambiguous to everyone.
- **Signalling active state with color only** (no fill/shape change) — fails for color-blind users.
- **Duotone/multicolor everywhere** — personality becomes noise; nothing reads as emphasis.
- **Emoji as UI icons** — inconsistent cross-platform rendering, wrong metaphors, no weight control.
- **Importing the entire icon package** — needless bundle bloat and slower loads.
- **Shipping SF Symbols on web/Android**, or Solar without attribution — license violations.
- **Decorative icons announced by screen readers** — clutter and confusion; hide them.
