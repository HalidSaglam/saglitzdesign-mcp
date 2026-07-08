---
id: material-3
title: "Material 3 & Material 3 Expressive"
category: design-language
platform: mobile
tags: [android, material, motion, color, shape, compose, wear-os]
sources: ["https://m3.material.io/blog/building-with-m3-expressive", "https://m3.material.io/blog/m3-expressive-motion-theming", "https://m3.material.io/styles/shape/corner-radius-scale", "https://m3.material.io/styles/motion/", "https://supercharge.design/blog/material-3-expressive", "https://android-developers.googleblog.com/2025/08/introducing-material-3-expressive-for-wear-os.html", "https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/", "https://developer.android.com/develop/ui/compose/designsystems/material3", "https://proandroiddev.com/material-3-expressive-design-a-new-era-9ea77959a262"]
updated: 2026-07-08
---

# Material 3 & Material 3 Expressive

Material 3 (M3) is Google's design system for Android, Wear OS, and the web. **Material 3 Expressive** (announced May 2025, rolled out through 2025–2026 with Android 16 and Wear OS 6) is its current evolution: springier motion, bolder shapes and color, and a set of new components. Google backed it with 46 research studies and 18,000+ participants; expressive designs tested as both preferred and *more usable* across age groups. As of 2026, M3 Expressive is the default look-and-feel target for new Android apps.

## Core principles

1. **Personal** — Dynamic color derives an app's scheme from the user's wallpaper; apps adapt to the person, not the other way around.
2. **Adaptive** — Layouts, type, and motion scale across phone, foldable, tablet, Wear OS, and web via tokens and window size classes.
3. **Expressive** — Shape, motion, and color are used to create emphasis and emotional resonance, not just decoration. Emphasis should map to importance: the most expressive treatment goes to the most important action on screen.

## Color system

- **Dynamic color**: schemes are generated from a source color (wallpaper or brand seed) into tonal palettes (primary, secondary, tertiary, neutral, neutral-variant, error), each with tone steps 0–100.
- **Roles, not hexes**: always style with roles (`primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`, `surface`, `surfaceContainer[Low/High/Highest]`, `outline`, etc.). Never hardcode hex values in components.
- Expressive pushes **higher saturation and more tonal contrast** between surfaces. Use the `surfaceContainer` ladder to build depth without shadows.
- Apps may enforce brand colors (static scheme) while still honoring light/dark and contrast preferences. Support the user-selectable **contrast levels** (standard, medium, high).

**Do**
- Generate light + dark schemes from one seed color; verify on-color contrast (tone delta ≥ 40 between container and on-container roles, e.g., tone 90 container / tone 10 on-container).
- Use `tertiary` for expressive accent moments (badges, hero highlights).

**Don't**
- Don't mix dynamic color with hardcoded brand hexes in the same surface hierarchy.
- Don't use `error` roles for anything but errors/destructive actions.

## Shape system

M3 corner radius scale (tokens, dp):

| Token | Radius |
|---|---|
| none | 0dp |
| extra-small | 4dp |
| small | 8dp |
| medium | 12dp |
| large | 16dp |
| large-increased | 20dp |
| extra-large | 28dp |
| extra-large-increased | 32dp |
| extra-extra-large | 48dp |
| full | fully rounded (pill/circle) |

- Typical mapping: chips/small controls → small; cards → medium; FABs/nav drawers → large; bottom sheets/dialogs → extra-large; buttons → full (pill) by default in Expressive.
- **Expressive shape library**: 35 new non-rectangular shapes (cookie/flower/scallop variants) available in Compose (`MaterialShapes`) and the Figma Material Shapes library. Use them for avatars, loading indicators, and decorative emphasis — not for tap targets whose bounds users must predict.
- **Shape morphing** is built in: animate one shape to another to signal state (e.g., button square→circle on selection; loading indicator morphing between waveforms). Morphs should ride on spatial spring tokens (below).

## Motion: the physics system

Expressive replaces the old easing + duration model with a **spring physics motion system**. Springs are defined by stiffness (speed/energy) and damping ratio (bounce decay; 1.0 = no bounce, lower = more overshoot).

- **Two motion schemes**:
  - **Expressive scheme** (recommended default): lower damping, visible overshoot/bounce. Use for hero moments, navigation transitions, key interactions.
  - **Standard scheme**: high damping, minimal bounce. Use for utilitarian/dense productivity surfaces.
- **Two token families × three speeds** (fast / default / slow):
  - **Spatial tokens** — position, size, orientation, shape changes. Configured to allow overshoot.
  - **Effect tokens** — color, opacity, elevation changes. Critically damped: never bounce color or alpha.
- Token values are device-class dependent (watch vs phone vs tablet) so "fast" feels fast in context — reference tokens, never raw spring constants.
- Motion is interruptible and gesture-driven: dismissing a notification drags neighbors with it; springs pick up velocity from the gesture. Pair meaningful physical events with haptics.
- Legacy easing tokens still exist (`md.sys.motion.easing.standard` cubic-bezier(0.2, 0, 0, 1), emphasized variants; durations short1 50ms → extra-long4 1000ms) for platforms without spring support.

**Do**: use spatial tokens for anything that moves or morphs; effect tokens for fades/recolors; respect "reduce motion" by falling back to the standard scheme or fades.
**Don't**: don't apply bounce to opacity/color; don't hand-tune spring constants per component; don't make bounce so strong it delays task completion.

## Typography

- Type scale roles: **Display, Headline, Title, Body, Label**, each in small/medium/large. Default face: Roboto / Roboto Flex (variable).
- Expressive adds **emphasized** styles (heavier weights, tighter tracking) for hero text, and encourages larger, bolder headlines paired with variable-font weight animation.
- Body text baseline: Body Large = 16sp/24 line height. Labels (buttons): Label Large = 14sp, medium weight.

## New & updated components (Expressive, 2025–2026)

Five headline new components plus updates:

- **Button groups** — containers applying coordinated shape/width/motion to sets of buttons or icon buttons; buttons squish and reshape on press. Work with all button sizes XS–XL. Use for segmented actions and filter rows.
- **FAB menu** — replaces speed-dial/stacked mini-FABs. Opens from any FAB size/color style; large, high-contrast items. Max ~6 actions.
- **Loading indicator** — a morphing-shape indicator for waits **under 5 seconds** and pull-to-refresh; replaces most indeterminate circular progress uses. For longer waits keep determinate linear/circular progress.
- **Split button** — leading action + trailing menu button that spins and morphs when activated. Five sizes (matching button sizes), four styles: elevated, filled, tonal, outlined.
- **Toolbars (docked & floating)** — the **bottom app bar is deprecated**; replace with the shorter, more flexible **docked toolbar**, or a **floating toolbar** for contextual actions. Toolbars can hold buttons, icon buttons, text, and can pair with a FAB.
- **Updated**: buttons now come in 5 sizes (XS–XL) with selectable round/square shapes and press morphs; app bars are more customizable (larger flexible titles); progress indicators gained wavy variants; carousels, expanded navigation rail, and grouped list "gap" styling (contained lists with gaps between groups, per late-2025 menu/list redesigns).

## Component quick specs

- Minimum touch target: **48×48dp** (visual element may be smaller).
- Common button height: 40dp (medium); XS 32dp up to XL 96dp in Expressive sizing.
- FAB: 56dp (default), 40dp (small), 96dp+ (large/extended variants); large radius or full shape.
- Elevation levels: 0 / 1 (+1dp) / 2 (+3dp) / 3 (+6dp) / 4 (+8dp) / 5 (+12dp) — prefer tonal surface color over shadow for depth in dark theme.
- Standard nav: navigation bar (bottom, 3–5 destinations), navigation rail (medium+ widths), navigation drawer (expanded widths).

## When to use Material 3 Expressive

- **Use fully** for consumer Android apps, media/social/lifestyle products, Wear OS apps (Expressive is the Wear OS 6 default), and anywhere brand warmth and engagement matter.
- **Use the standard motion scheme + restrained shapes** for productivity, enterprise, finance dashboards, and dense data UIs — Expressive components still apply, but dial emphasis down.
- **Avoid** forcing M3 visuals on iOS builds of cross-platform apps; map tokens to platform-appropriate equivalents instead (see design-tokens-theming.md).
- Adopt via Jetpack Compose `androidx.compose.material3` (Expressive APIs in material3 1.4+ / `MaterialExpressiveTheme`), MDC-Android, or Material Web components.

## Migration checklist (M3 → M3 Expressive)

1. Swap bottom app bars for docked toolbars; replace speed-dial FABs with FAB menu.
2. Adopt spring motion scheme tokens; delete hardcoded durations/easings.
3. Re-map corner radii to the new scale; opt pill buttons into shape-morph press states.
4. Enable dynamic color with a brand-seeded fallback scheme; test all three contrast levels.
5. Replace small indeterminate spinners with the loading indicator where waits < 5s.
6. Audit reduced-motion behavior: springs → fades, morphs → crossfades.
