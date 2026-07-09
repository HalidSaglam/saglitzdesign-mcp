---
name: apple-platform-design
description: Design iOS, iPadOS, and macOS apps that feel native, in the Liquid Glass era. Use when building or reviewing Apple-platform UI — navigation, controls, sheets, materials, typography, haptics — or deciding what must change when porting from web/Android. Covers Apple's HIG, the Liquid Glass design language (iOS 26 / macOS Tahoe), fluid-interface principles, and "Mac-assed" native conventions.
---

# Apple Platform Design

Apple apps feel native because they respect platform conventions, use system materials and motion, and get the small physical details right. Copying a web or Android design onto iOS/macOS reads as foreign instantly.

> Full depth is in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`): docs `apple-hig-liquid-glass`, `ios-app-design`, `macos-app-design`, `wwdc-design-principles`, and `get_design_language`.

## Core HIG principles

- **Hierarchy, harmony, consistency** — content-first (defer to content), clear focus, familiar patterns.
- Respect system conventions: back gestures, share sheet, context menus, Dynamic Type, safe areas. Don't reinvent them.

## Liquid Glass (iOS 26 / macOS Tahoe)

- Translucent, layered materials convey hierarchy — the *navigation layer* floats in glass over content. Use it for chrome (tab bars, toolbars, sheets), not everywhere.
- Capsule controls; content shows through with adaptive tint. Verify contrast/legibility over busy content (add a scrim if needed); adoption should be tasteful, not a gimmick.

## Fluid-interface principles (WWDC "Designing Fluid Interfaces")

- **Response:** kill latency — respond to touch instantly.
- **Direct manipulation:** 1:1 finger tracking during gestures.
- **Interruptibility (most important):** every animation is redirectable mid-flight.
- **Behavior over animation:** use springs; hand off gesture velocity into the release; project momentum to where the gesture is going.
- **Rubber-banding** at boundaries; symmetric, anchored motion paths.

## iOS specifics

- Bottom tab bar for 3–5 top destinations (icon + label, filled active). Navigation stack with working edge-swipe back. Sheets/detents for tasks; push for drill-down.
- Touch targets ≥44pt; body text ≥17pt; support Dynamic Type up to accessibility sizes.
- Haptics: light impact for selections/toggles, success/error notification haptics — pair with motion + sound. Never on scroll.
- App Store: the first 3 screenshots are the biggest conversion lever (captioned narrative), plus icon (Icon Composer, light/dark/tinted) and preview video.

## macOS specifics ("Mac-assed")

- Full menu bar with real, discoverable commands; standard keyboard shortcuts; full keyboard access.
- Resizable windows, multiple windows, proper selection semantics, undo everywhere, a document model where it fits.
- Sidebar (source list) + toolbar + inspector; density suited to a pointer, not a finger.
- Ship path: Developer ID signing + notarization. Electron/Catalyst ports that ignore these feel non-native.

## Typography (WWDC "The Details of UI Typography")

- SF Pro with optical sizing; tracking and leading that change with size. Use the system text styles (Large Title, Title, Body, Caption) rather than arbitrary sizes.

## Porting checklist (web/Android → Apple)

Change: navigation model (tab bar + stacks, not hamburger), back behavior (edge swipe), controls (native pickers/switches/sheets), typography (SF + Dynamic Type), share/context menus, haptics, materials, and safe-area handling. Brand and layout can stay; system integrations must be native-correct.
