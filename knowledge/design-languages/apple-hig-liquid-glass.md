---
id: apple-hig-liquid-glass
title: "Apple HIG & Liquid Glass (iOS 26)"
category: design-language
platform: mobile
tags: [ios, apple, hig, liquid-glass, swiftui, materials, accessibility]
sources: ["https://developer.apple.com/documentation/technologyoverviews/liquid-glass", "https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)", "https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/", "https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/", "https://www.conor.fyi/writing/liquid-glass-reference", "https://www.learnui.design/blog/ios-design-guidelines-templates.html", "https://blakecrosley.com/blog/liquid-glass-swiftui-patterns", "https://www.createwithswift.com/exploring-a-new-visual-language-liquid-glass/"]
updated: 2026-07-08
---

# Apple Human Interface Guidelines & Liquid Glass (iOS 26)

Introduced at WWDC 2025, **Liquid Glass** is Apple's biggest visual redesign since iOS 7 — a dynamic translucent material that reflects and refracts its surroundings ("lensing"), with specular highlights that respond to device motion. It ships across **iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, and tvOS 26**, unifying the platforms for the first time. In 2026 it is the mandatory baseline: apps compiled with Xcode 26 get it automatically, and the compatibility opt-out (`UIDesignRequiresCompatibility`) expires with iOS 27.

## Three governing principles (iOS 26 HIG)

1. **Hierarchy** — Controls float on a distinct functional layer *above* content. Glass elevates and distinguishes navigation from the content beneath it; bars and controls shrink, hide, or simplify as the user scrolls to keep content primary.
2. **Harmony** — Software geometry aligns with hardware: **concentric corner radii** (nested elements share a center so radii step down consistently toward the screen's rounded corners), capsule-shaped controls, and materials that echo the device.
3. **Consistency** — Adopt platform conventions; the design adapts continuously across window sizes and displays rather than being redesigned per breakpoint.

## The material

- Liquid Glass performs real-time **lensing** (light bending), specular highlights, adaptive shadows, and adapts its tint to the content behind it and to light/dark mode. It is *not* a static blur.
- **Two variants**:
  - **`.regular`** (default) — adaptive, most legible; use for nearly everything: toolbars, tab bars, buttons, floating controls.
  - **`.clear`** — more transparent and visually rich; only when **all** of: it sits over media-rich content, a dimming layer won't hurt the content, the foreground symbols/text are bold and bright, and the glass shape is simple. Typical use: playback controls over video/photos.
  - `Glass.identity` disables the effect conditionally (not a third visual style).
- Glass is **interactive**: `.interactive()` adds press scaling, bounce, shimmer, and touch-point illumination.

## The one rule that matters most

**Liquid Glass is exclusively for the navigation/control layer floating above content. Never apply it to content itself** — no glass lists, cards, table cells, or media containers. Content stays on opaque or standard-material surfaces; glass-on-glass stacking is explicitly discouraged (glass cannot sample other glass, and it muddles hierarchy).

## System behavior to design around

- **Tab bar**: now an inset floating capsule (inset ~21pt from left/right/bottom), 2–5 destinations, with Search often split into its own trailing "island." It can minimize on scroll.
- **Navigation bar**: large title (34pt bold) collapses to compact (17pt semibold) on scroll; content scrolls *under* the glass bars with edge blur/fade.
- **Toolbars**: related actions group into shared glass capsules; icons preferred over text labels; system spacing groups/separates actions.
- **Sheets & menus**: partial-height sheets are glass and become opaque when expanded; menus/popovers morph out of the buttons that spawn them.
- Home Screen icons/widgets are layered glass; ship a **layered app icon** (Icon Composer) so the system can render light/dark/clear/tinted variants.

## Typography & layout (iOS 26 quick specs)

| Element | Spec |
|---|---|
| Large page title | SF Pro 34pt Bold |
| Compact title / primary button | 17pt Semibold / 17pt Regular |
| Body & list items | 17pt Regular |
| Secondary text | 15pt Regular (60–70% opacity secondary label color) |
| Caption/tertiary | 13pt Regular |
| Tab bar labels | 11pt Regular |
| Minimum tap target | 44×44pt |
| Home indicator reserve | 21pt |
| Reference canvas | 390×844pt (check up to 440×956pt) |

iOS styles text with **weight and color rather than size or case**. Use Dynamic Type text styles (LargeTitle…Caption2), never fixed sizes, and SF Pro / SF Symbols throughout.

## Adoption guidance (SwiftUI)

- Basic: `view.glassEffect()` → regular variant in a capsule shape. Parameters: glass type, shape, enabled.
- **Group every set of glass elements in a `GlassEffectContainer(spacing:)`** — it provides a shared sampling region, correct rendering, and enables morphing between elements. Skipping it causes inconsistent sampling and worse performance.
- **Morphing**: declare a `@Namespace`, tag views with `.glassEffectID(_:in:)`, wrap state changes in `withAnimation(.bouncy)`. Morphs are kinetic — gate them on Reduce Motion.
- **Tint sparingly**: `.glassEffect(.regular.tint(.accent).interactive())` — tint only the primary call-to-action; tinting everything destroys hierarchy.
- Standard bars/controls (TabView, NavigationStack, toolbars, buttons with `.buttonStyle(.glass)`) adopt Liquid Glass automatically on recompile — prefer system components over custom glass.
- Pre-iOS-26 fallback: `.ultraThinMaterial` with a subtle gradient overlay.

## Accessibility & performance

- The system adapts glass automatically to **Reduce Transparency** (more frosting), **Increase Contrast**, **Reduce Motion**, and Low Power Mode. Do not bypass with custom opacity.
- Read `accessibilityReduceTransparency` / `accessibilityReduceMotion` when using custom glass; swap to `Glass.identity` or solid fills where glass adds no value. Apple's own apps became more aggressive about this after 26.4.
- Performance: glass rendering is GPU-heavy — use containers, let glass rest in steady states, avoid continuous animation, and test on iPhone 11–13-class devices. Early third-party measurements showed meaningful battery cost when overused.
- Legibility: always test glass controls over the busiest content your app can show, in both light and dark mode; prefer bold SF Symbols over thin glyphs on glass.

## Do / Don't summary

**Do**
- Reserve glass for the floating navigation/control layer; keep content opaque.
- Use system components first; recompile with Xcode 26 before customizing.
- Follow concentric corner geometry; capsules for controls.
- Group glass in containers; use morphing to connect related states.
- Respect all accessibility dials automatically.

**Don't**
- Don't put glass on lists, cards, or media content.
- Don't stack glass on glass or scroll glass under glass.
- Don't use `.clear` outside bold, media-rich contexts with dimming.
- Don't tint decoratively or hardcode colors that ignore background adaptation.
- Don't ship kinetic glass morphs without a Reduce Motion fallback.

## When to use

- **Native iOS/iPadOS/macOS apps**: adopt fully — it is the platform standard; fighting it reads as dated or non-native.
- **Cross-platform apps**: mirror the *structure* (floating capsule nav, content-first hierarchy) on iOS builds; do not export literal glass to Android (use Material 3 there).
- **Web**: glassmorphism-style headers/modals can echo the aesthetic, but treat it as inspiration, not a spec (see web-trends-2026.md for performance limits of `backdrop-filter`).
