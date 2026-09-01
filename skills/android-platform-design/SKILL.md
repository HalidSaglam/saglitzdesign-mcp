---
name: android-platform-design
description: "Design Android apps that feel native on Material 3 (Expressive), including adaptive navigation, predictive back, edge-to-edge insets, dynamic color, and TalkBack-facing details. Use when building or reviewing Android UI — Compose screens, navigation bar vs rail, dark theme, Play presence — or deciding what must change when porting from web or iOS."
sources: material-3, android-app-design, android-patterns, accessibility, mobile-ux, brand-on-native-platforms
---

# Android Platform Design

Android apps feel native because they use Material 3 roles rather than hexes, respect the system back gesture, draw edge-to-edge with real WindowInsets, and adapt navigation by window size class — not by "phone vs tablet". Copying an iOS tab bar or a web hamburger onto Android reads as a port.

> Full depth is in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`). Related documents include `material-3`, `android-app-design`, `android-patterns`, `accessibility`, `mobile-ux` and `brand-on-native-platforms`; useful tools include `audit_android_ui` (point it at the Android module directory — it reads the manifest, resource XML and Compose; directory only, no snippet mode), `get_design_language`, `compare_design_languages` (what to port from iOS and what not to) and `get_component_recipe(component, "compose")` for real Compose code; and the `/saglitzdesign:build_mobile_app_ui` and `/saglitzdesign:port_to_platform` workflows.

## Core Material 3 principles

- **Roles, not hexes.** Style with `primary`, `onPrimary`, `surfaceContainer…`. A hardcoded `Color(0xFF…)` has no light, dark or contrast-level variant.
- **Type is roles too.** Display / Headline / Title / Body / Label, each small/medium/large. Body Large is 16sp/24. A bare `fontSize = 17.sp` does not scale with the user's font size the way a style does.
- **Shape and motion are tokens.** Expressive springs for spatial change; effect tokens (no bounce) for colour and opacity. Respect Reduce Motion by falling back to the standard scheme or fades.
- **Dynamic color is a runtime extraction.** Honor light/dark and contrast levels even when the brand scheme is static.

## Navigation — window size class, not device

- Compact (< 600dp): bottom **navigation bar**, 3–5 destinations, icon + label, outlined inactive / filled active. Active indicator is a pill (shape), not colour alone.
- Medium/expanded: the same destinations become a **navigation rail**. Bar and rail must mirror each other — same order, same icons. Never show both at once.
- Modal drawer only for 7+ destinations or account/label hierarchies. M3 Expressive deprecates the persistent drawer.
- Each destination keeps its own back stack. Re-selecting the current destination pops to root.
- Tabs subdivide content *inside* a destination. They are not top-level app navigation.

## Back, insets, dark theme

- Predictive back is on by default for apps targeting Android 16. `onBackPressed()` is no longer called. Migrate to `OnBackPressedCallback` / Compose `PredictiveBackHandler`. The manifest opt-out is a crutch.
- Edge-to-edge is mandatory at SDK 36: `windowOptOutEdgeToEdgeEnforcement` is ignored. Apply WindowInsets per surface (top app bar consumes statusBars, scrolling content pads navigationBars, FABs offset by ime). Never hardcode 24dp/48dp.
- Dark theme is required. Tone-shifted palettes; default "System default". A `values/themes.xml` without a `values-night/` twin is a configuration gap, not a taste choice.
- Touch targets ≥48dp. Text that must stay readable uses sp, not dp.

## TalkBack and Play

- Every icon-only control has a content description. Decorative images are hidden from TalkBack. State (selected, expanded, error) is in semantics, not colour alone.
- Adaptive icon (safe zone), short name, and the first Play Store screenshots are the conversion surface — captioned narrative, not chrome.

## Porting checklist (web/iOS → Android)

Change: navigation model (bar ↔ rail, not hamburger or iOS tab chrome), back (system gesture, predictive, not a top-left chevron labelled with the previous title), controls (M3 pickers, switches, sheets), type (Material roles, 16sp body, 48dp targets), insets, and dark theme. Brand colour can seed a scheme; hexes in components cannot stay.
