---
id: android-app-design
title: "Android App Design — Complete Guide"
category: design-language
platform: mobile
tags: [android, material, navigation, play-store, adaptive]
sources: ["https://developer.android.com/about/versions/16/behavior-changes-16", "https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture", "https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back", "https://developer.android.com/develop/ui/views/layout/use-window-size-classes", "https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout", "https://m3.material.io/components/navigation-bar/specs", "https://developer.android.com/develop/ui/compose/system/icon_design_adaptive", "https://developer.android.com/develop/ui/views/launch/splash-screen", "https://developer.android.com/docs/quality-guidelines/widget-quality", "https://android-developers.googleblog.com/2025/03/introducing-widget-quality-tiers.html", "https://developer.android.com/docs/quality-guidelines/large-screen-app-quality", "https://support.google.com/googleplay/android-developer/answer/9866151", "https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/"]
updated: 2026-07-08
---

# Android App Design — Complete Guide (Android 16 / Material 3 Expressive era)

Structural, app-level guide for Android apps. The general Material 3 system (color roles, shape scale, motion springs, component visuals) lives in the M3 doc — this covers what Android itself demands: app anatomy, system gestures, insets, adaptive layouts, icons, widgets, notifications, and Play Store presence.

Baseline assumptions for 2026: targetSdk 36 (Android 16), Jetpack Compose, Material 3 Expressive components rolling out across Google's own apps since September 2025 (Pixel Android 16 QPR1 onward).

## 1. App anatomy — pick navigation by window size class, not device

Android apps are trees of destinations, not stacks of screens. Choose ONE top-level pattern and let it adapt:

- **Navigation bar (bottom)** — 3–5 peer destinations, compact width (< 600dp). The default for phones.
  - M3 Expressive "flexible" bar: shorter container (**64dp** vs the classic 80dp).
  - Active indicator pill **≥ 56×32dp** around a **24dp** icon; label **12sp**, always visible for ≤ 4 destinations (selected-only labels allowed at 5, but avoid).
  - Horizontal variant (icon beside label in a wider pill) for wider compact windows.
  - Icons: outlined when inactive, filled when active (Material Symbols pairs).
- **Navigation rail (side)** — the same 3–7 destinations at medium/expanded width (≥ 600dp).
  - Collapsed rail **96dp** wide, destinations stacked vertically, top slot for FAB or menu button.
  - M3 Expressive adds an **expanded rail** (~**220dp**, icon + label rows) that replaces the standard drawer as the wide-screen navigation surface.
- **Navigation drawer (modal)** — M3 Expressive **deprecates the standard (persistent) drawer**; keep a *modal* drawer only for 7+ destinations or account/label/workspace hierarchies (Gmail labels, Phone app contacts). Sheet width ≤ **360dp**, item height **56dp**, active item gets a full-width shape pill.
- **Bottom app bar** — largely superseded by the M3E docked toolbar; don't build new UI on it.
- **Rule: bar ↔ rail must mirror each other.** Same destinations, same order, same icons. The app swaps between them as the window resizes (fold/unfold, split-screen, desktop window) — never show both at once.
- Tabs (primary/secondary) subdivide content *within* a destination — never use tabs as top-level app navigation (the pre-2015 pattern WhatsApp finally abandoned).
- Each bottom-bar destination keeps its **own back stack**; switching destinations preserves state (`saveState`/`restoreState` in Navigation). Re-selecting the current destination pops its stack to root.
- Deep-link every content screen (App Links + `navDeepLink`). Widgets, notifications, shortcuts, and the sharesheet all need stable routes in.

### Top app bar
- Small top app bar **64dp** tall; medium **112dp**; large **152dp**, collapsing to small on scroll (collapse behavior via `TopAppBarScrollBehavior`).
- Title is **left-aligned** by default (a center-aligned variant exists, but left is the Android convention — don't import iOS centering reflexively).
- Up affordance is a **← arrow** (not a chevron, never with a text label). Up goes to the logical parent; system back can differ (see §2).
- 2–3 icon actions max on the trailing side; everything else in the ⋮ overflow menu.
- M3 Expressive search app bar: full-width pill search field in the app bar slot, hamburger/avatar sitting *outside* the pill (Gmail/Keep/Chat 2025 pattern).
- Contextual action bar replaces the top app bar during multi-select: long-press enters selection, bar shows count + batch actions, back/✕ exits.

## 2. Back: predictive, system-wide, non-negotiable

- Back is a **system gesture** (edge swipe from either side, or the 3-button back triangle). Every screen, sheet, dialog, menu, and selection mode must respond to it. There is no "screen without back" on Android.
- **Predictive back is enabled by default** for apps targeting Android 16 (API 36): back-to-home, cross-activity, and cross-task animations play as the user drags.
  - `onBackPressed()` is no longer called and `KEYCODE_BACK` is not dispatched for these apps — legacy back interception silently breaks.
  - Migrate to `OnBackPressedCallback` / Compose `PredictiveBackHandler`; the manifest opt-out (`android:enableOnBackInvokedCallback="false"`) is a temporary crutch, not a strategy.
- Design rule: the user must be able to **peek** — during the drag, the current surface scales down (to ~90%) revealing the destination beneath, and releasing either commits or cancels. Consequences:
  - The back destination must be computed *before* the gesture commits.
  - No "Are you sure you want to exit?" dialogs on back — reserve interception for genuine unsaved-data loss, and even then prefer auto-save/draft.
  - No back that navigates *forward*, no back-traps on onboarding or paywalls.
- Back vs Up: back follows the user's actual history (and can cross apps); Up stays inside your hierarchy. From a deep link, Up goes to the parent with a synthesized stack; back returns to the referring app.
- In-app dismissal order for one back press: keyboard → open menu/dialog → bottom sheet → search view → selection mode → current destination.
- In-app predictive back should animate too: sheets slide down with the drag, search views collapse back into their bar, list-detail returns to the list. Compose `NavHost` + `SearchBar` + M3 sheets support this natively — custom surfaces must implement `PredictiveBackHandler` progress.
- Shared-element transitions between destinations that track the back drag are the current polish bar (Google apps, Telegram).

## 3. Edge-to-edge & insets — mandatory, not a style choice

- Targeting SDK 35 (Android 15) forced edge-to-edge with an opt-out attribute; **targeting SDK 36 disables the opt-out** (`windowOptOutEdgeToEdgeEnforcement` is deprecated and ignored on Android 16 devices). Your app *will* draw behind the status bar and the navigation area.
- Status bar and gesture nav bar are **transparent**. System icon contrast is your responsibility (`WindowInsetsControllerCompat.isAppearanceLightStatusBars` per screen, or per-theme).
- Never hardcode inset heights (the old 24dp status bar / 48dp nav bar assumptions). Real values vary with display cutouts, foldable postures, 3-button vs gesture nav, and font/display scaling — always read `WindowInsets`.
- Apply insets **per surface**, not as one global padding:
  - Top app bar consumes `statusBars` + `displayCutout` (its container extends under the status bar; its content sits below).
  - Scrolling content: content scrolls *under* the transparent nav bar, with bottom `contentPadding` so the last item can clear it.
  - Bottom nav bar / docked toolbars: container extends to screen bottom, content padded by `navigationBars` insets.
  - FABs and bottom sheets offset by `navigationBars`; text fields and sheet CTAs by `ime` insets (keyboard).
  - Compose `Scaffold` wires most of this via `contentWindowInsets` — don't fight it with manual spacers.
- 3-button navigation still matters (roughly a third of users): the bar region is taller and opaque-feeling; verify no bottom UI collides. Test every screen in both modes.
- Let imagery, maps, and feeds flow full-bleed behind system bars; keep *interactive* elements out of inset regions and away from bottom-corner gesture zones.
- Gesture conflicts: horizontal carousels/sliders near screen edges fight the back gesture — inset them, or use `systemGestureExclusionRects` sparingly (max ~200dp of exclusion is honored).
- Status-bar scrim hacks (gradient "protection" overlays) are deprecated styling; rely on tonal surfaces and scroll-under elevation change instead.

## 4. Adaptive layouts — window size classes, not "phone vs tablet"

- Classify by **window**, not device. Width classes: **compact < 600dp**, **medium 600–840dp**, **expanded 840–1200dp**, **large 1200–1600dp**, **extra-large ≥ 1600dp** (height classes exist separately).
- Split-screen puts flagship phones into compact-or-smaller; an unfolded Fold is medium/expanded; a phone in landscape is compact-height. Design to classes and you cover foldables, tablets, ChromeOS, and desktop windowing in one pass.
- Canonical adaptive layouts (the Compose Material 3 adaptive library implements them):
  - **List-detail** — list pane + detail pane side-by-side at expanded+; compact shows one pane at a time with predictive back between panes.
  - **Supporting pane** — primary content + contextual secondary pane (comments, filters, now-playing queue).
  - **Feed** — responsive grid (`LazyVerticalGrid(columns = Adaptive(minSize = 240.dp))` style) that reflows column count.
- Pane sizing: common splits are a fixed **360dp** list + fluid detail, or 50/50. Readable text measure caps at ~**640dp**; center a form on a 900dp window, never stretch it full-bleed.
- Navigation adapts with layout: bottom bar (compact) → rail (medium) → expanded rail (expanded+), per §1.
- Foldables: observe `FoldingFeature` — in tabletop posture (half-folded, hinge horizontal) put content on the top half and controls on the bottom; never place critical UI across the hinge in dual-pane postures. Trifolds add a second hinge — the same rules apply per fold.
- **Android 16 ignores orientation, aspect-ratio, and resizability restrictions on displays ≥ 600dp.** Portrait-locking is no longer a shipping strategy — on tablets/foldables your locked app gets resized anyway. Fix the layouts.
- State must survive rotation, folding, window resize, and process death (`rememberSaveable`, SavedStateHandle). A resize that loses a half-written form fails core app quality.
- Play ranks and badges by **adaptive/large-screen quality tiers** (Tier 2 "optimized" = layouts + input support; Tier 1 "differentiated" = multitasking, drag-and-drop, stylus, posture support). Tablet/foldable/ChromeOS store placement depends on it.
- Support keyboard/mouse basics at Tier 2: focus states, Enter/Escape handling, hover states, right-click context menus where natural.

## 5. Dynamic color & theming in practice

- Material You: the system extracts tonal palettes from the user's wallpaper. Opt in with `dynamicColorScheme(context)` and fall back to your brand `ColorScheme` below API 31.
- Practical stance by app type:
  - **Utilities and Google-adjacent tools** — adopt dynamic color fully; users expect the app to match their device.
  - **Strong consumer brands** (Spotify, Airbnb, banks) — keep brand color for primary actions and identity moments; optionally map neutrals/surfaces to dynamic tones.
  - **Never half-adopt** — brand-green buttons floating on wallpaper-pink dynamic surfaces reads as broken.
- Whatever the palette source, always design through **M3 color roles** (primary, secondary, surfaceContainer levels, onSurfaceVariant, outline…), never raw hex in components. Roles are what make dynamic color, dark theme, and contrast settings work for free.
- Dark theme is required, not optional: tone-shifted palettes, not inverted colors; elevation expressed by lighter surfaceContainer levels, not shadows. Default theme setting = "System default".
- Test the same screens against 4–5 wallpapers × light/dark. Users can also select medium/high contrast schemes (Android 14+) — role-driven UI adapts automatically; hardcoded exceptions don't.
- App icon, widget, and splash should participate: themed icon (§6), dynamic-color widget backgrounds (§8), splash background from theme (§7).

## 6. App icon — adaptive + themed, no exceptions

- Adaptive icon: **108×108dp** canvas, separate **background** and **foreground** layers (vectors preferred). The outer 18dp ring on each side exists for launcher parallax/resize effects.
- Keep all critical content inside the **66dp** central safe zone — OEM launchers mask to circle, squircle, rounded square, etc. Never bake your own outline shape, mask, or drop shadow into the layers.
- **Themed (monochrome) icon** — Android 13+: provide a `<monochrome>` layer.
  - Single flat glyph, roughly the foreground silhouette, drawn in one color (the system tints to the wallpaper palette, light and dark).
  - Keep the glyph inside the center safe zone with comfortable margin; no gradients, no wordmarks, no fine detail.
  - Missing themed icon = your icon is the untinted odd-one-out (or a dull auto-generated tint) on themed home screens — a top "unmaintained app" signal in 2026.
- Legacy square PNG icons get shrunk into a white circle by modern launchers — instant abandonware look.
- Long-press **app shortcuts** (static + dynamic; ~4 shown, pinnable to home screen): each needs an icon built on the shortcut template (24dp glyph on a themed circular plate) and a clear 1–2 word label. Treat shortcuts as designed entry points (Compose, Search, Scan…), not an afterthought.

## 7. Splash screen — system API only

- Android 12+ shows a system splash for every cold start whether you design one or not. Use the **SplashScreen API** (`Theme.SplashScreen` / `installSplashScreen()`); a custom splash *activity* now produces an awkward double splash.
- Element specs:
  - Icon without a background plate: **288×288dp** canvas, visible glyph within a **192dp** diameter circle.
  - Icon with its own background plate: **240×240dp**, glyph within a **160dp** circle.
  - Optional branding image: **200×80dp**, bottom-center — use sparingly; Google's guidance treats it as discouraged-but-supported.
  - Window background: one color, themed for light/dark (use your surface or brand tone).
- Default (and correct) behavior is reusing your adaptive icon — verify it survives the circular crop.
- Animated vector icon allowed; total splash presence should stay ≤ **1000ms** on warm hardware. Never add artificial delay; never show ads, tips, or marketing on the splash.
- Hold with `setKeepOnScreenCondition { !uiReady }` only until first real content frame; use the exit listener to animate the icon into your UI (shared-element style) for a premium feel.

## 8. Widgets (Glance)

- Build with **Jetpack Glance** (Compose-style API compiling to RemoteViews). Widgets got a 2025 push: a dedicated widget discovery surface and badge on Play, plus **quality tiers** (Tier 1 differentiated / Tier 2 standard / Tier 3 low) scored on layout, color, discovery, and content.
- Visual rules:
  - Corner radius from `@android:dimen/system_app_widget_background_radius` (capped **28dp**); inner containers use outer radius − padding.
  - Use the dynamic-color widget theme (`@style/Theme.DeviceDefault.DayNight` / Glance `GlanceTheme`) so the widget sits naturally on any wallpaper, light and dark.
  - **16dp** internal padding; touch targets ≥ **48dp**; text at sp so it scales.
- Responsive, not scaled: define size buckets via `SizeMode.Responsive` (e.g. 2×1, 2×2, 4×2, 4×4 — launcher grid cells vary ~57–70dp so design to dp breakpoints, not cells). Content reflows between buckets; nothing stretches.
- Use the canonical Glance layouts (Google publishes them) as Tier-1 scaffolds: they encode correct padding, radius, and reflow.
- Every widget needs: a real-content preview (the API 35 generated-preview path keeps it honest), a deep-link tap action on every meaningful element (never just "opens app home"), and designed empty/loading/error/sign-in states.
- Configuration screen only when genuinely needed; prefer sensible defaults + reconfigure via long-press.

## 9. Notifications

- **Channels are mandatory** (API 26+): one channel per user-meaningful category (messages, mentions, promos, playback, reminders…), each with honest default importance. Users block channels, not the whole app — if you segment honestly, one annoying campaign doesn't kill your transactional notifications.
- Runtime permission (Android 13+): ask in context after demonstrating value (e.g., after the user follows something), never as a cold-start popup. Design the pre-permission moment.
- Small icon: **24dp**, pure white-on-transparent silhouette — the system tints it; colored or detailed icons render as grey blobs. Accent color via `setColor`. Large icon (avatar, album art) is a separate ≥ 48dp slot.
- Use semantic **styles**, don't rebuild layouts:
  - `MessagingStyle` for anything conversational — unlocks conversation space ranking, bubbles, per-person avatars, and direct reply.
  - `BigPictureStyle` / `BigTextStyle` / `InboxStyle` for media, long text, digests.
  - `MediaStyle` for playback — Android 13+ ignores custom media layouts; the system template with actions is the design.
  - Android 16 **ProgressStyle / Live Updates** for trackable ongoing events (delivery, rideshare, navigation) — points on a progress tracker, promoted status-bar chip.
- Max 3 action buttons, verb labels (Reply, Archive, Snooze — never "OK"). Group bursts with a summary notification. Every notification deep-links to the exact relevant screen, with correct Up/back from there.
- Never: notification-as-ad (Play policy violation), persistent "app is running" noise without user value, or re-posting to defeat a user's swipe-dismiss.

## 10. Haptics

- Use **semantic constants**, not raw vibration: `HapticFeedbackConstants.CONFIRM`, `REJECT`, `LONG_PRESS`, `KEYBOARD_TAP`, `CLOCK_TICK`/`SEGMENT_TICK` and `SEGMENT_FREQUENT_TICK` (pickers, sliders), `TOGGLE_ON`/`TOGGLE_OFF`, `GESTURE_START`/`GESTURE_END`, `DRAG_START`. These route to device-tuned effects.
- `vibrate(100)`-style duration buzzes are the #1 cheap-feeling tell on Android. Don't.
- Compose: `LocalHapticFeedback.current.performHapticFeedback(HapticFeedbackType...)`. Richer feedback via `VibrationEffect` predefined effects (CLICK, TICK, DOUBLE_CLICK, HEAVY_CLICK) and composition primitives (`PRIMITIVE_CLICK`, `PRIMITIVE_TICK`, ramps) on capable hardware — check `areAllPrimitivesSupported()` and degrade gracefully.
- Where haptics belong: long-press entering selection, drag-and-drop pickup/drop, slider detents and picker ticks, pull-to-refresh threshold, toggle flips, success/failure of biometric or payment confirms, error shakes.
- Where they don't: every tap, scroll ticks on ordinary lists, passive content, marketing moments.
- Android haptic hardware quality varies enormously — haptics must be decorative reinforcement, never the only feedback channel; respect the system "touch feedback" setting (semantic constants do this automatically).

## 11. Play Store listing (ASO)

- **App icon**: 512×512 PNG, 32-bit with alpha. Upload a full-bleed square — Play applies its own mask (~20% corner radius) and drop shadow. Keep key content centered; no baked shadows, no badges, no "#1 / Best" claims (rejection risk).
- **Feature graphic**: 1024×500 JPG or 24-bit PNG (no alpha). Required for a promo video and for many promotional placements; it sits behind the play button and in curated collections. Keep the logo + one message in the central safe area (edges crop on some surfaces); design it as a poster, not a screenshot collage; readable at thumbnail size.
- **Screenshots**: 2–8 per form factor (phone, 7" tablet, 10" tablet, ChromeOS; Wear and TV where applicable).
  - Promotional-surface eligibility: **≥ 4** screenshots at **≥ 1080px**, aspect 16:9 (landscape) or 9:16 (portrait). Practical standard: 1080×1920 or 1080×2400 portrait.
  - The first 2–3 frames carry nearly all conversion: one message per frame, short benefit caption (≤ ~6 words) at the top, UI below; the actual app UI must appear (policy).
  - Ship **real tablet screenshots showing tablet layouts** — stretched phone shots hurt large-screen store placement and signal a lazy port.
  - No competitor references, ranking claims, time-limited offers ("50% off this week"), or "Install now" CTAs baked into imagery. Add alt text to every asset.
- **Promo video**: a public YouTube URL; first 5 seconds must work muted; landscape; no ads on the video.
- Listing text: title ≤ **30 chars**; short description ≤ **80 chars** (benefit + primary keyword — it's the only text above the fold); full description ≤ 4000 (first ~3 lines show pre-expansion). Keyword stuffing is penalized; natural phrasing indexes fine.
- Iterate with Play's built-in **store listing experiments** (A/B on icon, graphics, descriptions) and custom store listings per country/audience — don't redesign on opinion.

## 12. Porting iOS → Android: what MUST change

1. **Back**: delete the top-left "‹ Back" chevron+label; use an ← Up arrow in the app bar and support system/predictive back on every surface. Never make an in-content button the only exit.
2. **Navigation metaphors**: iOS tab bar → M3 navigation bar (rail ≥ 600dp); iOS large-title header → M3 medium/large collapsing top app bar; push-from-right transitions → Material shared-axis / fade-through with predictive-back support.
3. **Controls**: SF Symbols → Material Symbols (24dp grid); iOS switch → M3 switch (with check icon); segmented control → segmented buttons / button group; UIDatePicker wheels → M3 date/time pickers (calendar + clock dial); UIAlertController → M3 dialog (text buttons bottom-right, confirming action rightmost) or a bottom sheet when there are 3+ options.
4. **Action sheets and half-modals → bottom sheets** with a 32×4dp drag handle, drag-to-dismiss, scrim tap, and back-to-dismiss.
5. **Share**: system sharesheet (`Intent.createChooser`) with your optional custom actions row — never a fully custom share UI. Also *receive*: register intent filters so your app appears in other apps' sheets.
6. **Typography**: SF Pro → Roboto / Roboto Flex (or brand font) on the M3 type scale; body 16sp, minimum 12sp; sizes in **sp** and layouts that survive 200% font scale (Android 14 non-linear scaling).
7. **Feedback**: toasts are legacy — snackbars (optional single action, ~4s) for transient results; inline validation for forms; dialogs only for blocking decisions.
8. **Touch**: 48×48dp minimum targets; ripple on everything tappable (never suppress it); long-press affordances where iOS uses swipe rows or context menus.
9. **System integration has no iOS source to port** — adaptive + themed icon, app shortcuts, widgets, splash API, notification channels, predictive back, edge-to-edge, dynamic color decision. These must be designed fresh, not skipped.
10. **Store assets**: never reuse iOS screenshots (iOS status bar, Dynamic Island, iOS keyboard) on Play — credibility loss and policy risk.

## 13. Ship checklist

- [ ] Nav bar (compact) ↔ rail (medium+) mirror; per-tab back stacks preserved; re-tap pops to root
- [ ] Predictive back animates on every screen and sheet; no back-traps; ships targeting SDK 36 without the opt-out flag
- [ ] Edge-to-edge verified: gesture nav, 3-button nav, display cutout, keyboard open, light + dark status icons
- [ ] Every screen works at compact AND expanded width; no orientation lock; state survives fold/rotate/resize
- [ ] Dynamic color stance chosen deliberately; all color through M3 roles; dark theme + contrast settings pass
- [ ] Adaptive icon with monochrome layer; app shortcuts designed; SplashScreen API, ≤ 1s hold
- [ ] Widgets responsive with dynamic color, deep-link taps, empty/error states
- [ ] Notification channels segmented; 24dp white small icon; MessagingStyle for chat; permission asked in context
- [ ] Semantic haptics only; 48dp targets; TalkBack + 200% font scale pass on core flows
- [ ] Play listing: 512 icon, 1024×500 feature graphic, ≥ 4 phone screenshots at 1080px+, real tablet shots, alt text
