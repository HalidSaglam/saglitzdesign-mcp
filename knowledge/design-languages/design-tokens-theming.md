---
id: design-tokens-theming
title: "Cross-Platform Design Tokens & Theming"
category: design-language
platform: cross-platform
tags: [tokens, theming, dtcg, style-dictionary, dark-mode, multi-brand, figma]
sources: ["https://www.designtokens.org/tr/2025.10/format/", "https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/", "https://styledictionary.com/info/dtcg/", "https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676", "https://www.alwaystwisted.com/articles/design-token-naming-conventions", "https://fluent2.microsoft.design/design-tokens", "https://docs.tokens.studio/manage-settings/token-format", "https://zeroheight.com/blog/whats-new-in-the-design-tokens-spec/"]
updated: 2026-07-08
---

# Cross-Platform Design Tokens & Theming — Best Practices

Design tokens are named, platform-agnostic design decisions (color, spacing, type, motion, elevation) stored as data and transformed into per-platform outputs (CSS variables, Swift, Kotlin, Compose, Flutter). They are how one brand ships coherently to web, iOS, Android, and desktop — and how dark mode, high contrast, and multi-brand theming become a value swap instead of a redesign.

## The standard: W3C DTCG 2025.10

The Design Tokens Community Group (Adobe, Google, Microsoft, Figma, Shopify, Salesforce, et al.) shipped the **first stable Design Tokens spec (2025.10) in October 2025**. Treat it as the interchange format.

- **Format**: JSON; files use `.tokens` / `.tokens.json`; media type `application/design-tokens+json`.
- **Token syntax**: `"$value"` (required), `"$type"` (required unless inherited from a group), optional `"$description"`, `"$extensions"`, `"$deprecated"`.
- **Types**: color, dimension (px/rem), fontFamily, fontWeight (1–1000 or keywords), duration (ms/s), cubicBezier, number; **composites**: typography, shadow (single or array), border, transition, gradient, strokeStyle.
- **Color**: modern color spaces supported via `colorSpace` + `components` notation (not just hex) — relevant for P3/OKLCH pipelines.
- **Aliases**: `{group.token}` curly-brace references (chainable), plus JSON-Pointer `$ref` for sub-property access into composites.
- **Groups**: hierarchical, can set `$type` for children; `$extends` allows group inheritance with deep-merge overrides.
- Supported by Figma, Tokens Studio, Style Dictionary, Terrazzo, Penpot, Sketch, Supernova, zeroheight.

Example:
```json
{
  "color": {
    "$type": "color",
    "brand": { "500": { "$value": "#6750A4" } },
    "action": { "primary": { "$value": "{color.brand.500}" } }
  }
}
```

## The three-tier architecture (non-negotiable)

Every mature system (Fluent 2, Material, Carbon) uses layered tokens:

1. **Primitive / global tokens** — raw values, named by what they *are*: `blue-500`, `space-4`, `radius-md`, `font-size-300`. No semantic meaning, never consumed directly by components.
2. **Semantic / alias tokens** — named by *intent*: `color-text-primary`, `color-surface-raised`, `color-action-danger`, `space-inset-card`. They map to primitives. **This is the theming layer.**
3. **Component tokens** (optional) — local decisions: `button-radius`, `card-padding`. Map to semantics; use only where components need controlled divergence.

Rules:
- Components consume **semantic (or component) tokens only** — never primitives, never raw hexes.
- Primitives hold values; semantics hold intent; component tokens hold local UI decisions. Keep each layer doing one job.
- Alias chains should resolve in ≤ 2–3 hops; deeper chains become undebuggable.

## Naming convention

Most widespread and recommended: **kebab-case, ordered general → specific**: `category-concept-property-variant-state-scale`.

- `color-text-primary`, `color-text-on-brand`, `color-bg-danger-hover`, `spacing-inline-md`, `shadow-elevation-high`.
- Primitives named by appearance (`red-100`); semantics named by role/intent, never by value — `color-action-primary`, not `color-blue-button`. If a token name contains a color word or a pixel number at the semantic tier, the name is wrong.
- Include **state** (`-hover`, `-pressed`, `-disabled`, `-focus`) and **on-color pairs** (`surface` / `on-surface`) systematically.
- Pick one taxonomy, document it, and enforce it with linting in CI.

## Theming mechanics

**Dark mode**: keep token *names* constant; swap the primitive each semantic token points to per theme. `color-surface-default` → `gray-50` (light) / `gray-900` (dark). Every component adapts automatically with zero component changes. Also re-map elevation: dark themes convey depth with lighter surfaces + subtle borders more than shadows.

**Multi-brand**: add a brand dimension — each brand supplies its own primitive palette + semantic mapping file; product code stays identical. Complex systems (brand × theme × density × contrast) manage these as separate token sets composed at build time (Tokens Studio "themes", Style Dictionary source layering). The stable DTCG spec deliberately left multi-file/theming composition to tooling — Style Dictionary and Tokens Studio are the de facto standard there.

**High contrast / accessibility themes**: treat as a first-class theme (Fluent does); also expose contrast *levels* (standard/medium/high) as Material 3 does.

## Cross-platform pipeline

Recommended toolchain (2026 standard):

1. **Source of truth**: DTCG JSON in the code repo (edited via Tokens Studio/Figma Variables sync, or hand-maintained). Version it, review it in PRs, changelog it.
2. **Transform**: **Style Dictionary** (v4+ has native DTCG support) or Terrazzo builds per-platform outputs:
   - Web → CSS custom properties (+ `@media (prefers-color-scheme)` and `[data-theme]` scopes), Tailwind config
   - iOS → Swift enums / asset catalogs
   - Android → Compose theme objects / XML resources
   - Flutter/React Native → Dart/TS theme maps
3. **Distribute**: publish as versioned packages (npm/SPM/Maven); CI regenerates on token change so design updates ship like dependency bumps.

**Unit strategy**: store dimensions unitless-or-rem-based where possible and transform per platform (px web, pt iOS, dp Android). Type scales: rem on web, Dynamic Type–compatible styles on iOS, sp on Android — map token *roles* (body, title) rather than raw sizes across platforms.

**Motion tokens**: store durations (ms) and easing (cubicBezier) as tokens; note Material 3 Expressive uses spring physics (stiffness/damping) which the DTCG spec doesn't yet model — keep springs in `$extensions` or platform-specific sets.

## Cross-platform theming judgment calls

- Tokenize the **brand layer** (color, type ramp, radius, spacing, motion feel) globally; let the **structural layer** (nav patterns, control anatomy) stay platform-native: Liquid Glass capsule bars on iOS, M3 toolbars on Android, Fluent density on Windows/web.
- Map semantic roles across systems rather than copying values: your `color-action-primary` feeds M3 `primary`, iOS tint color, Fluent `colorBrandBackground`.
- Radius/elevation vocabularies differ per platform (M3 full-pill vs Fluent 4px) — encode these as per-platform semantic overrides, not forks of the whole token set.

## Do / Don't

**Do**
- Adopt the DTCG format for anything new; migrate legacy token files with Style Dictionary/Tokens Studio converters.
- Design light + dark palettes simultaneously; validate 4.5:1 (text) and 3:1 (UI) contrast per theme in CI.
- Keep a published deprecation policy (`$deprecated` in spec) and semver your token package.
- Document every semantic token with `$description` — an AI or new hire should know usage from the token file alone.

**Don't**
- Don't let components reference primitives or raw values ("token laundering" via one-off component tokens counts).
- Don't encode values in semantic names (`color-primary-purple`), and don't create a token for every one-off — tokens are for *reused decisions*.
- Don't fork token files per platform by hand; generate everything from one source.
- Don't ship dark mode by CSS `filter: invert()` or ad-hoc overrides — it always breaks images, shadows, and brand color.

## When to invest

- **Always** (even solo projects): 2-tier tokens (primitives + semantics) as CSS variables — near-zero cost, enables dark mode later.
- **Multi-platform or multi-brand product**: full DTCG + Style Dictionary pipeline with versioned packages.
- **Overkill**: component-token tier and build pipelines for a single-page marketing site — semantics as CSS variables suffice.
