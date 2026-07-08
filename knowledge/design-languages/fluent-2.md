---
id: fluent-2
title: "Microsoft Fluent 2 Design System"
category: design-language
platform: cross-platform
tags: [microsoft, fluent, windows, web, react, tokens, materials]
sources: ["https://fluent2.microsoft.design/", "https://fluent2.microsoft.design/design-tokens", "https://fluent2.microsoft.design/elevation", "https://fluent2.microsoft.design/material", "https://fluent2.microsoft.design/motion", "https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/materials", "https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic", "https://learn.microsoft.com/en-us/fluent-ui/web-components/design-system/design-tokens"]
updated: 2026-07-08
---

# Microsoft Fluent 2 — Essentials

Fluent 2 is Microsoft's current cross-platform design system (web/React, Windows/WinUI, iOS, Android, macOS), powering Microsoft 365, Teams, and Windows 11. It is the most token-driven of the big-three design languages and the strongest reference for enterprise/productivity UI. Internally ~293 Microsoft design teams use it, with component usage ~4× Fluent 1.

## Principles

Fluent's pillars: **Light, Depth, Motion, Material, Scale** — a softened, dimensional evolution of the flat Metro lineage. Fluent 2 adds a "one Microsoft" coherence goal: the same semantic token resolves to platform-appropriate values everywhere, so a Dialog feels native on Windows, web, and mobile without redesign.

- **Clarity over spectacle**: Fluent motion and materials communicate spatial relationships and state; they are quieter than M3 Expressive or Liquid Glass.
- **Accessibility as baseline**: 4.5:1 text contrast, full keyboard/focus-visible support, and high-contrast theme variants are built into the token system, not bolted on.

## Token architecture (the heart of Fluent 2)

Two primary layers (plus per-component overrides):

1. **Global tokens** — context-free raw values: hex colors (e.g., a full color ramp per hue), font sizes, line heights, weights, border radii, stroke widths, animation curves/durations. Named by what they *are* (`colorPaletteBlueForeground2` style ramps).
2. **Alias (semantic) tokens** — meaning-bearing mappings consumed by components: `colorNeutralForeground1`, `colorBrandBackground`, `colorNeutralStroke1`, `colorStatusDangerBackground1`. Theming (light, dark, high contrast, brand) works by re-mapping alias tokens only.
3. **Component tokens** — local overrides (e.g., a button's specific radius) that resolve to aliases.

Rule: **components consume aliases, never globals**. This is the pattern to copy in any design system.

## Core specs

**Corner radius** (global tokens): 2 / 4 / 6 / 8 / 12 / circular. Buttons and rectangular controls default to **4px**; elements under ~32px drop to 2px to stay proportional; cards commonly 8px; circular for avatars/pills.

**Spacing**: a horizontal + vertical spacing ramp based on a 4px grid — tokens at 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32 (spacingHorizontalXXS…XXXL). Use the ramp; never arbitrary pixel values.

**Elevation / shadow**: a generated shadow ramp named by blur size — shadow2, shadow4, shadow8, shadow16, shadow28, shadow64 (shadow2 ≈ 2px blur … shadow64 ≈ 64px blur). Mapping guidance: shadow2–4 for rest-state cards/inputs, shadow8 for dropdowns/tooltips, shadow16 for panels/popovers, shadow28–64 for dialogs and top-level surfaces. Each has a `brand` variant for tinted shadows.

**Typography**: Segoe UI Variable on Windows; web ramp (Fluent UI React): Caption2 10px, Caption1 12px, Body1 14px (the default), Subtitle2 16px, Subtitle1 20px, Title3 24px, Title2 28px, Title1 32px, LargeTitle 40px, Display 68px — weights Regular/Medium/Semibold/Bold. Body text default is **14px** (denser than iOS/Android — appropriate for productivity software).

**Motion** (Fluent UI React motion tokens): durations `ultraFast` 50ms, `faster` 100ms, `fast` 150ms, `normal` 200ms, `gentle` 250ms, `slow` 300ms, `slower` 400ms, `ultraSlow` 500ms. Curves: `accelerate`/`decelerate` cubic-beziers plus `easyEase` for small state changes. Guidance: micro state changes 50–150ms; component enter/exit 150–300ms; large surface transitions 300–500ms with decelerate-in, accelerate-out. Windows adds **connected animations** (shared-element transitions with velocity matching).

## Materials

Fluent supports four surface materials (Windows-first, with graceful fallbacks elsewhere):

| Material | Nature | Use for |
|---|---|---|
| **Solid** | Opaque | Content surfaces, anything scrolling; web default |
| **Mica** | Opaque, subtly tinted by the user's desktop wallpaper; cheap to render | App/window background layers on Windows 11 (replaced Acrylic for primary surfaces) |
| **Acrylic** | Semi-transparent frosted blur | **Transient, light-dismiss surfaces only**: flyouts, context menus, tooltips |
| **Smoke** | Dimming scrim | Behind modal dialogs to de-emphasize the app |

Cross-platform rule: the same Dialog uses Acrylic on Windows (real-time compositor blur), a solid fill with subtle texture on web (backdrop-filter is a performance risk), and platform-native materials on iOS/Android. Material is a *token decision*, not a per-screen decision.

## Components

~40+ code-aligned components (Fluent UI React v9, Fluent UI Web Components, WinUI 3, Fluent UI iOS/Android): Button (primary/outline/subtle/transparent; 24/32/40px heights small/medium/large), Input, Combobox, DataGrid, Dialog, Drawer, Menu, Persona/Avatar, Badge, Card, Toast, Teaching Popover, Tree, TabList. Figma UI kits ("Fluent 2 Core" web/iOS/Android + the design-language variables file) are code-aligned so design/dev handoff is 1:1.

**Interaction states**: every control defines rest / hover / pressed / focused / disabled via alias tokens — hover states matter far more here than in mobile-first systems. Focus indicators are 2px `colorStrokeFocus2` rings, always visible on keyboard focus.

## Do / Don't

**Do**
- Theme exclusively by swapping alias-token values (light/dark/high-contrast/brand).
- Keep body text at 14px and density high for data-heavy productivity screens; use the spacing ramp to loosen consumer-facing surfaces.
- Reserve Acrylic for transient surfaces; use Mica (or solid) for persistent backgrounds.
- Use shadow ramp + stroke (`colorNeutralStroke1`/`stroke2`) together to define surface edges in dark mode.

**Don't**
- Don't hardcode hex/px — everything visible should trace to a token.
- Don't use Acrylic on large scrolling content or on web without a solid fallback.
- Don't invent new elevation values outside the shadow ramp.
- Don't remove focus rings or hover states — Fluent targets keyboard/mouse parity.

## When to use Fluent 2

- **Best fit**: enterprise software, productivity tools, admin dashboards, data-dense B2B apps, anything in or adjacent to the Microsoft 365/Windows ecosystem, Teams apps (required look), Power Platform.
- **Good fit**: cross-platform desktop-first products wanting a mature, accessible, token-complete system (Fluent UI React v9 is production-grade and tree-shakeable).
- **Poor fit**: expressive consumer mobile brands (choose M3 Expressive on Android, HIG/Liquid Glass on iOS); marketing sites (Fluent's density and neutrality read corporate).
- Fluent 2's token layering is the **reference architecture** to imitate even when not using Fluent visuals — see design-tokens-theming.md.
