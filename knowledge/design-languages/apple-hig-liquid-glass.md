---
id: apple-hig-liquid-glass
title: "Apple HIG & Liquid Glass (iOS 26)"
category: design-language
platform: mobile
tags: [ios, apple, hig, liquid-glass, swiftui, materials, accessibility]
sources: ["https://developer.apple.com/documentation/technologyoverviews/liquid-glass", "https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass", "https://developer.apple.com/design/human-interface-guidelines/materials", "https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)", "https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views", "https://developer.apple.com/documentation/swiftui/glasseffectcontainer", "https://developer.apple.com/documentation/swiftui/glass", "https://developer.apple.com/design/human-interface-guidelines/typography", "https://developer.apple.com/design/human-interface-guidelines/layout", "https://developer.apple.com/design/human-interface-guidelines/buttons", "https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility", "https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/"]
updated: 2026-08-15
---

# Apple Human Interface Guidelines & Liquid Glass (iOS 26)

Introduced at WWDC 2025, **Liquid Glass** is Apple's biggest visual redesign since iOS 7 — a dynamic material combining the optical properties of glass with a sense of fluidity, rendered with specular highlights, refraction, and translucency. It ships across **iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, and tvOS 26**, unifying the platforms for the first time. In 2026 it is the mandatory baseline: apps rebuilt against the latest SDKs get it automatically, and the compatibility opt-out (`UIDesignRequiresCompatibility`) is explicitly temporary — the system ignores the key once you build for iOS/iPadOS/macOS/tvOS 27 or later.

## Three governing principles

Apple frames Liquid Glass adoption as establishing **hierarchy**, creating **harmony**, and maintaining **consistency** across devices and platforms.

1. **Hierarchy** — Controls float on a distinct functional layer *above* content. Glass elevates and distinguishes navigation from the content beneath it; bars and controls shrink, hide, or simplify as the user scrolls to keep content primary.
2. **Harmony** — Software geometry aligns with hardware: **concentric corner radii** (nested elements share a center so radii step down consistently toward the screen's rounded corners), capsule-shaped controls, and materials that echo the device.
3. **Consistency** — Adopt platform conventions; the design adapts continuously across window sizes and displays rather than being redesigned per breakpoint.

## The material

- Liquid Glass combines the optical properties of glass with a sense of fluidity: it blurs the content behind it, reflects the color and light of surrounding content, and reacts to touch and pointer input in real time. It is *not* a static blur.
- **Two variants**:
  - **`.regular`** (default) — adaptive, most legible; use for nearly everything: toolbars, tab bars, buttons, floating controls.
  - **`.clear`** — highly translucent; use for components floating over visually rich backgrounds such as photos and video. If the underlying content is bright, add a **dark dimming layer at 35% opacity**; if it is already dark, or you use AVKit's standard playback controls (which dim for you), you don't need one.
  - `Glass.identity` leaves content unaffected, as if no glass effect were applied — a conditional off switch, not a third visual style.
- Glass is **interactive**: `.interactive()` makes a custom component react to touch and pointer input with the same responsive reactions `.buttonStyle(.glass)` gives standard buttons.

## The one rule that matters most

**Liquid Glass is exclusively for the navigation/control layer floating above content. Never apply it to content itself** — no glass lists, cards, table cells, or media containers. Content stays on standard materials; Apple's stated exception is a content-layer control with a transient interactive element (a slider or toggle knob), which takes on glass only while a person is using it. Apply glass effects sparingly even in the control layer, and avoid overcrowding or layering Liquid Glass elements on top of each other.

## System behavior to design around

- **Tab bar**: now an inset floating capsule (inset ~21pt from left/right/bottom), with Search often split into its own trailing island. It can minimize on scroll. **2–5 destinations is a sound working default, not a published count** — the tab-bars page states no number for iPhone, and the figure it does give ("aim for a default list of five or fewer") is scoped to *customizable iPad* tab bars. The enforceable rule is the overflow one: write a rule against a More tab appearing, never against a tab count. See `ios-app-design` §1 and its myth-check 1.
- **Navigation bar**: large title (34pt) collapses to compact (17pt semibold) on scroll; content scrolls *under* the glass bars with edge blur/fade.
- **Toolbars**: related actions group into shared glass capsules; icons preferred over text labels; system spacing groups/separates actions.
- **Sheets & menus**: partial-height sheets are glass and become opaque when expanded; menus/popovers morph out of the buttons that spawn them.
- Home Screen icons/widgets are layered glass; ship a **layered app icon** (Icon Composer) so the system can render light/dark/clear/tinted variants.

## Typography & layout (iOS 26 quick specs)

| Element | Spec |
|---|---|
| Large page title | SF Pro 34pt Regular (Bold is Apple's emphasized weight) |
| Compact title | 17pt Semibold (Headline) |
| Body & list items | 17pt Regular (Body) |
| Primary button label | 17pt Regular — **convention**; HIG › Buttons sizes buttons by height (Mini 28 / Small 32 / Regular 44 / Large 52 / Extra large 64 pt), not by label size |
| Secondary text | 15pt Regular (Subhead; use the secondary label color) |
| Caption/tertiary | 13pt Regular is **Footnote**; Caption 1 is 12pt and Caption 2 is 11pt |
| Tab bar labels | ~10pt — **convention**, not an Apple step (see `ios-app-design` §1) |
| Minimum hit region | 44×44pt (visionOS 60×60pt) — *(HIG › Buttons)*. **This row is iOS/iPadOS; do not carry 44pt to a Mac target**, where the drawn control default is 28×28pt and the minimum 20×20pt. See `apple-accessibility` §3 |
| Reference canvas | 390×844pt (iPhone 16e/14/13/12 class); check up to 440×956pt (iPhone 17 Pro Max / 16 Pro Max) |

**Which rows are Apple's, and which are not.** The type sizes above are the iOS/iPadOS **Large (default)** Dynamic Type step from HIG › Typography, and only for the five rows that name an Apple text style — Large Title (34/41), Headline (17/22), Body (17/22), Subhead (15/20), Footnote (13/18). The primary button's label size and the tab bar's label size are marked convention above because they are working defaults rather than rows on that page; `ios-app-design` §1 lists the tab bar's label size among the figures not found on the Apple pages it searched. Do not report a deviation from a convention as a HIG violation. Use Dynamic Type text styles (LargeTitle…Caption2), never fixed sizes, and SF Pro / SF Symbols throughout — the styles carry weight and leading for every size, and SF Symbols weight-match adjacent text automatically.

## Adoption guidance (SwiftUI)

- Basic: `view.glassEffect()` → regular variant in a capsule shape. Parameters: glass type, shape, enabled.
- **Group every set of glass elements in a `GlassEffectContainer(spacing:)`** — SwiftUI renders the contained effects together, which improves rendering performance and lets the shapes blend into and morph out of one another. The larger the container's `spacing`, the sooner shapes blend as they approach; a spacing larger than the interior `HStack`/`VStack` spacing makes them blend at rest.
- **Morphing**: declare a `@Namespace`, tag views with `.glassEffectID(_:in:)`, and animate the state change. `matchedGeometry` is the default transition for effects inside the container's spacing; use `materialize` for effects farther apart. Morphs are kinetic — gate them on Reduce Motion.
- **Tint sparingly**: `.glassEffect(.regular.tint(.accent).interactive())` — a tint suggests prominence, so use it on the primary call-to-action only; tinting everything destroys hierarchy.
- Standard bars/controls (TabView, NavigationStack, toolbars, buttons with `.buttonStyle(.glass)`) adopt Liquid Glass automatically once you rebuild with the latest Xcode and SDKs — prefer system components over custom glass.
- `glassEffectUnion(id:namespace:)` merges several views into one effect capsule at rest, for views built dynamically or living outside a layout container.

## Accessibility & performance

> The full treatment of Dynamic Type, VoiceOver labelling, hit regions versus control sizes, Reduce Motion and contrast — with the per-platform figures and the two Apple pages that disagree about 44pt — is in [[apple-accessibility]]. This document covers only what the material itself changes. Note in particular that **macOS does not support Dynamic Type**, so a type rule written from the table above is iOS/iPadOS-only.

- Both glass variants change appearance in response to system settings — a person's preferred look for Liquid Glass, and the accessibility settings that reduce transparency or increase contrast. Do not bypass this with custom opacity.
- Read `accessibilityReduceTransparency` / `accessibilityReduceMotion` when using custom glass; swap to `Glass.identity` or solid fills where glass adds no value.
- Performance: creating too many glass containers, and applying effects to views outside a container, degrades rendering. Limit how many Liquid Glass effects are onscreen at once, and profile after rebuilding against the latest SDKs.
- Legibility: the regular variant blurs and adjusts the luminosity of what's behind it, and scroll edge effects blur and fade background content further — but still test glass controls over the busiest content your app can show, in both light and dark mode. Use the regular variant wherever background content could hurt legibility or the component carries a lot of text (alerts, sidebars, popovers).

## Do / Don't summary

**Do**
- Reserve glass for the floating navigation/control layer; keep content opaque.
- Use system components first; recompile with Xcode 26 before customizing.
- Follow concentric corner geometry; capsules for controls.
- Group glass in containers; use morphing to connect related states.
- Respect all accessibility dials automatically.

**Don't**
- Don't put glass on lists, cards, or media content.
- Don't overcrowd the control layer or layer glass elements on top of each other.
- Don't use `.clear` outside media-rich contexts, and dim bright content behind it.
- Don't tint decoratively or hardcode colors that ignore background adaptation.
- Don't ship kinetic glass morphs without a Reduce Motion fallback.

## When to use

- **Native iOS/iPadOS/macOS apps**: adopt fully — it is the platform standard; fighting it reads as dated or non-native.
- **Cross-platform apps**: mirror the *structure* (floating capsule nav, content-first hierarchy) on iOS builds; do not export literal glass to Android (use Material 3 there).
- **Web**: glassmorphism-style headers/modals can echo the aesthetic, but treat it as inspiration, not a spec (see web-trends-2026.md for performance limits of `backdrop-filter`).
