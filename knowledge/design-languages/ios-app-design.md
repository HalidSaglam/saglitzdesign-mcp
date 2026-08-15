---
id: ios-app-design
title: "iOS App Design — Complete Guide"
category: design-language
platform: mobile
tags: [ios, apple, hig, navigation, app-store]
sources: ["https://developer.apple.com/design/human-interface-guidelines/tab-bars", "https://developer.apple.com/design/human-interface-guidelines/toolbars", "https://developer.apple.com/design/human-interface-guidelines/buttons", "https://developer.apple.com/design/human-interface-guidelines/sheets", "https://developer.apple.com/design/human-interface-guidelines/widgets", "https://developer.apple.com/design/human-interface-guidelines/live-activities", "https://developer.apple.com/design/human-interface-guidelines/app-shortcuts", "https://developer.apple.com/design/human-interface-guidelines/app-icons", "https://developer.apple.com/design/human-interface-guidelines/playing-haptics", "https://developer.apple.com/design/human-interface-guidelines/typography", "https://developer.apple.com/documentation/swiftui/tabbarminimizebehavior", "https://developer.apple.com/documentation/swiftui/view/tabviewbottomaccessory(content:)", "https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer", "https://developer.apple.com/videos/play/wwdc2025/323/", "https://developer.apple.com/videos/play/wwdc2025/284/", "https://developer.apple.com/videos/play/wwdc2025/278/", "https://developer.apple.com/videos/play/wwdc2025/275/", "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/", "https://developer.apple.com/app-store/product-page-optimization/", "https://developer.apple.com/app-store/custom-product-pages/", "https://developer.apple.com/app-store/in-app-events/", "https://developer.apple.com/app-store/review/guidelines/"]
updated: 2026-08-15
---

# iOS App Design — Complete Guide (iOS 26 era)

Structural, app-level guide for iPhone/iPad apps in the Liquid Glass era. For the material itself (glass variants, lensing, `.glassEffect`), see `apple-hig-liquid-glass`. This doc covers what to build: anatomy, navigation, controls, system surfaces, icon, and App Store presence.

## 1. App anatomy — choose ONE primary structure

- **Flat (tab bar)** — 2–5 peer sections. The default for most consumer apps. Never hide the tab bar when navigating deeper; never use a tab as an action button.
- **Hierarchical (navigation stack)** — drill-down lists (Settings, Mail). Combine with tabs: each tab owns its own stack, and switching tabs preserves each stack's state.
- **Modal** — self-contained tasks that interrupt the flow (compose, edit, onboarding). Always provide Cancel (top-leading) and a confirm verb (top-trailing); never trap the user.
- Support **swipe-from-left-edge back** everywhere; never override it. Re-tapping the current tab pops its stack to root (and scrolls to top on second tap).
- Deep-link every screen (universal links + App Intents) — widgets, Spotlight, and notifications all need stable routes into the hierarchy.

### Tab bar (iOS 26)
- Floating **Liquid Glass capsule**, inset from screen edges (~21pt sides/bottom), no longer a full-width 49pt strip. Selected tab gets a glass highlight capsule.
- 2–5 tabs on iPhone. Icons: SF Symbols at ~25×25pt with 10pt labels; always label tabs.
- **Minimize-on-scroll** (`tabBarMinimizeBehavior`): where the tab bar has an attached accessory, it can minimize and pull the accessory inline when a person scrolls down; tapping a tab or scrolling back to the top restores it. Enable for content-first feeds; skip for tool-like apps.
- **Search tab** (`Tab(role: .search)`): a tab bar can carry a dedicated search tab at its trailing end. Use it whenever search is a top-level destination (App Store, Music, Maps pattern).
- **Bottom accessory** (`tabViewBottomAccessory`): a persistent app-wide view (e.g., Music's Now Playing). It sits above a normal-size tab bar and displays inline when the bar is collapsed — read `tabViewBottomAccessoryPlacement` and adapt its content to the two placements. Use for global state, not per-tab actions.
- On iPad, the tab bar renders in the top bar and can morph into a sidebar (`tabViewStyle(.sidebarAdaptable)`).

### Navigation bar
- Compact bar: 17pt semibold centered title, 44pt-high touch region. **Large title: 34pt bold**, left-aligned, collapses to compact on scroll; prefer large titles at root level, compact when pushed.
- Content scrolls **under** the glass bar; iOS 26 applies a scroll-edge effect (progressive blur/fade) automatically — never paint an opaque bar background.
- Back button shows the previous screen's title (or chevron alone if long). Top-trailing: max 2–3 actions; overflow into a `...` pull-down menu.
- Bottom toolbars: group related actions into shared glass capsules; keep destructive actions out of easy-thumb reach.
- Design for the thumb zone: primary actions in the bottom half of the screen on iPhone; the top corners are the most expensive real estate to reach.

### iPad: split views & size classes
- **Two/three-column split**: sidebar ~320pt, supplementary column ~375pt, remainder content. Collapse to a stacked navigation stack in compact width (Slide Over, 1/3 split).
- Design for regular AND compact width — an iPad app is judged by its compact behavior. Support Stage Manager: free window resizing, sensible 320pt-class minimum width.
- Support hardware keyboard (arrow/Tab navigation, ⌘-shortcuts surfaced in the shortcut HUD via holding ⌘) and pointer hover effects (`.hoverEffect`) — iPad users increasingly run trackpads.
- iPadOS 26 windows behave Mac-like (free resize, tiling, a menu-bar-style command surface) — an iPad layout that only works at exactly full-screen is now a defect.
- Use popovers, context menus, and multi-column layouts on iPad rather than stretching the iPhone layout; a stretched iPhone UI at 12.9" is the most common iPad review complaint.

### Sheets, popovers, full-screen covers
- **Sheet** = default modal. Detents: `.medium` (~half screen) and `.large`; show the 36×5pt grabber when resizable. iOS 26 sheets are glass at partial height and become opaque when expanded; corner radii are concentric with the display.
- **Popover**: iPad/regular-width only (min ~320pt wide), anchored to its trigger with an arrow; it becomes a sheet in compact width — design content to survive both.
- **Full-screen cover**: only for immersive tasks (camera, video, onboarding). Everything else is a sheet.
- **Alerts**: 270pt-wide, max 2–3 buttons, title ≤ ~1 line; destructive choice styled `.destructive`, Cancel on the left/bottom. Use confirmation dialogs (action sheets) for choices with more options.
- Mark unsaved-changes sheets non-dismissable-by-swipe (`interactiveDismissDisabled`) and confirm discard instead of silently losing input.

### Bar & container metrics — quick reference

| Element | Spec |
|---|---|
| Status bar / Dynamic Island region | ~54–59pt top safe area on Face ID iPhones |
| Compact navigation bar | 44pt bar height; 17pt semibold title |
| Large-title region | adds ~52pt (34pt bold title) above content at scroll top |
| Tab bar (legacy metric) | 49pt + 34pt home-indicator inset; iOS 26 renders as inset floating capsule |
| Bottom toolbar | 44pt + home-indicator inset |
| Sheet grabber | 36×5pt, centered, 5pt from top |
| Popover minimum width | ~320pt (regular width only) |
| Alert width | 270pt fixed |
| List row minimum | 44pt; 60pt with subtitle; 76pt with thumbnail |
| Default layout margins | 16pt compact / 20pt+ regular; 8pt spacing grid |
| Home indicator | 34pt inset — keep interactive elements above it |

## 2. Standard controls — when to use each

| Control | Use when | Don't |
|---|---|---|
| Segmented control | 2–5 mutually exclusive **views/filters** | actions or on/off states; >5 segments |
| Toggle/Switch | Instant binary setting, takes effect immediately | needing a confirm step |
| Menu picker (`.menu`) | Choose 1 of 5–15 options inline in a form | long scrolling lists — use a pushed list |
| Wheel picker | Dates/times, multi-component values | single short lists |
| Stepper | Small precise increments (1–10 range) | large ranges — use slider or text field |
| Slider | Continuous ranges where exact value is secondary | values users must type precisely |
| Context menu | Secondary actions on **content** (long-press/haptic touch) | primary actions — must exist elsewhere too |
| Pull-down menu | Multiple actions from one button (`...`, Sort, Add variants) | selection state — use pop-up/picker instead |
| Swipe actions | Frequent row actions in lists (delete, archive, flag) | as the ONLY way to reach an action |

- **Touch targets: 44×44pt minimum**, 60pt for primary CTAs. List rows ≥44pt. Spacing between tappables ≥8pt.
- iOS 26 buttons are **capsule-shaped** by default; sizes mini/small/regular/large (large ≈ 50pt tall). One `.borderedProminent` (tinted) button per view; the rest bordered/plain.
- Context menus and menus **morph out of their source control** in iOS 26 (glass); keep menus ≤ ~8 items, group with separators, destructive items last with `role: .destructive`.
- Swipe actions: leading edge = positive (read/pin), trailing edge = negative, destructive action outermost with full-swipe to commit. Max 3 per side. Always mirror them in a context menu or edit mode.
- **Pull-to-refresh** (`refreshable`) for user-initiated feed updates; never as the only sync mechanism.
- Text fields: correct `keyboardType`, `textContentType` (enables AutoFill/one-time codes), and `submitLabel`; never block paste in credential fields.

### Search placement (iOS 26)
- On iPhone the search field **bottom-aligns** above the keyboard/tab bar for reachability (`searchable` in the toolbar, or the search tab role); on iPad it sits top-trailing in the navigation bar.
- On focus, show recent searches + suggestions immediately; filter live per keystroke where the dataset allows; support search tokens/scopes for structured filtering.
- Don't put a search bar at the top of an iPhone screen and a search tab at the bottom — pick one entry point.

### Lists & forms
- Inset-grouped is the default list style; plain lists for long indexes (with section index bar for A–Z datasets). Rows: 44pt single-line, ~60pt with subtitle, disclosure chevron only when a push follows.
- Forms group related settings with 11–13pt uppercase section headers and footnote explanations under the group, not inline placeholder text.
- Every list needs its states designed: **empty** (`ContentUnavailableView`: symbol + title + one-line guidance + optional CTA), **loading** (skeleton/redacted, never a full-screen spinner over 300ms), **error** (retry affordance).

## 3. iOS 26 structural rules (beyond the material)

- Bars, tab bars, sheets get Liquid Glass **automatically** when built with Xcode 26 against system components. Do not re-tint, re-background, or fake them — custom opaque bar backgrounds break scroll-edge effects and look legacy.
- Keep the glass layer thin: fewer bars, actions grouped into capsules, icons over text labels in toolbars, system spacing between groups.
- **Concentric corner radii**: nested containers derive radius from parent radius minus inset. Cards near the screen edge should use the container-relative shape, not hardcoded 12pt.
- Tint sparingly: one accent color on glass for the single most important action; monochrome SF Symbols elsewhere.
- Use semantic colors (`label`, `secondaryLabel`, `systemBackground`, `systemGroupedBackground`, system tint colors) so dark mode, increased contrast, and glass adaptation come free. Standard layout margins: 16pt (compact) / 20pt+ (regular); design on an 8pt spacing grid.
- Test every screen over worst-case content (white background, busy photos) and with Reduce Transparency / Increase Contrast enabled — the system swaps glass for opaque surfaces and your layout must survive. Also verify Reduce Motion: replace parallax/spring travel with crossfades.

## 4. System surfaces: widgets, Live Activities, App Intents

### Widgets
- Sizes: small (~170×170pt), medium (~364×170pt), large (~364×382pt), extraLarge (iPad); lock-screen accessories: circular, rectangular, inline. Content margins ~16pt (11pt tight).
- A widget is a **glanceable view of one piece of information + one deep link** (small = whole-widget tap target; medium/large may have multiple `Link` areas). Not a mini app, no scrolling, no video.
- Must render correctly in **tinted and clear modes** (iOS 26 Home Screen styles): rely on template/vibrant rendering, avoid full-bleed brand color backgrounds and baked-in photos as the only signal.
- Interactive widgets can host buttons/toggles backed by App Intents — do the action in place, don't just launch the app.
- Design for StandBy (full-color, viewed from 1–2m — bigger type, higher contrast) and CarPlay (iOS 26 pushes widgets there); use `containerBackground(for: .widget)` so the system can strip backgrounds per context.

### Live Activities
- Surfaces: Lock Screen banner (max height ~160pt), Dynamic Island **compact** (leading + trailing slivers around the sensor), **minimal** (tiny circle when multiple activities run), **expanded** (max ~160pt tall). Design all four states.
- Content = live status of one user-initiated event (delivery, ride, score, timer). Hard rules: no ads, no static promos; end promptly when the event ends; 12-hour max lifetime.
- Keep Lock Screen presentation legible on any wallpaper: use the system background material or a deliberate brand background with tested contrast; respect `activitySystemActionForegroundColor`.
- Live Activities appear on Apple Watch Smart Stack and CarPlay automatically — check that compact leading/trailing views carry meaning alone (icon + number beats text).

### App Intents
- Model every core action and entity as an App Intent: this is the design surface for Siri, Spotlight, Shortcuts, Action button, Control Center, widgets, and Apple Intelligence.
- iOS 26 adds **interactive snippets**: small glass result cards with buttons that appear in Spotlight/Siri/Visual Intelligence. Design them like a medium widget: one clear state, 1–2 actions, no navigation.
- **Controls** (Control Center / Lock Screen / Action button): one symbol + short label + one intent. Provide a real toggle state for toggles.
- Naming: intents use verb-first natural phrases ("Log Water", "Start Focus Timer"); entities need a display representation (title, subtitle, image) that reads well in system UI you don't control.

## 5. App icon (iOS 26)

- Author one **layered Icon Composer file** (ships with the latest Xcode); people choose default, dark, clear, or tinted Home Screen icons, and the system generates any variant you don't provide.
- Structure: a background layer (solid or gradient, full-bleed and opaque) plus foreground layers, organised into **a maximum of four groups**. The system adds the glass — specular highlights, refraction, translucency, and the corner masking. **Remove** blurs, shadows, and baked specular/opacity/translucency settings before export, and never export the canvas mask.
- Keep the icon's core visual features the same across all four appearances; don't swap elements in and out per variant, or people lose track of your app when they switch appearance.
- Prefer clearly defined edges over soft feathered ones, vary opacity between foreground layers for depth, and prefer vector (SVG/PDF) over raster so layers stay crisp at every size.
- Include text only when it's essential to the brand — it doesn't localize or support accessibility. Prefer illustration to photography, avoid replicating standard UI components or screenshots, and never reproduce Apple hardware.
- Canvas 1024×1024 for iPhone and iPad (1088×1088 for Apple Watch); start from Apple's icon template so you get the current grid, shape, and canvas size. Keep primary content centred so masking doesn't truncate it.
- Alternate icons are allowed (settings-driven) but each needs its own dark, clear, and tinted variants and each is subject to App Review; keep them closely related to your content.

## 6. App Store presence (design-side ASO)

- **Screenshots**: 1–10 per localization; required master size 1320×2868 (6.9" portrait); Apple downscales for smaller iPhones. iPad: 2064×2752 (13"). Flattened PNG or JPEG, no alpha.
- **Screenshots must show the app in use** — "not merely the title art, login page, or splash screen" is a review requirement, not a style preference. Text and image overlays are explicitly allowed (e.g. to show an input mechanism). So: front-load the working product, never open on a logo.
- One background system across the set; sequential panorama layouts are fine but each frame must stand alone. Localize captions AND the UI language shown for top markets.
- Caption copy: concrete outcomes ("Split bills in seconds"), not hype. Review rejects metadata packed with irrelevant phrases, prices, or terms that aren't specific to the metadata type.
- **Preview videos** may only use video screen captures of the app itself; narration and video or text overlays are allowed to explain what the footage alone doesn't. Design for muted autoplay.
- Use **Product Page Optimization** to test alternate icons, screenshots, and previews — up to three treatments against your baseline. Apple's own advice is to weigh *how many elements you change in a treatment* so you can tell which one moved the result, and to wait for a treatment to beat or lose to the baseline at ≥90% confidence before acting. Treatment assets can themselves appear in search results and on the Today, Games, and Apps tabs.
- **Custom Product Pages**: up to 70 additional versions of the page, each with its own URL, varying screenshots, promotional text, and previews — one per campaign, character, or feature, with optional keywords and a deep link.
- **In-app events** get their own 16:9 event card (1920×1080 minimum, up to 3840×2160): a ≤30-character title-case name and a ≤50-character sentence-case short description. They surface on the product page, in search results, and in curated selections on the Today, Games, and Apps tabs — design them like mini campaign posters, consistent with the app's visual system.
- App name ≤30 chars; the subtitle carries the value proposition. The icon must stay recognizable at search-result size next to competitors.

## 7. Launch, first run, permissions

- **Launch screen**: a static skeleton of the first real screen (backgrounds + bar placeholders). No logos, taglines, or spinners — the goal is perceived instant launch.
- First-run: get to value in ≤3 screens or zero (learn by doing with contextual tips). Never front-load a tutorial carousel; never demand account creation before showing value unless the app is inherently account-based (and then offer Sign in with Apple).
- **Permissions in context**: ask at the moment of need, preceded by your own one-line explainer of the benefit; a cold triple-prompt (notifications + tracking + location) at launch is the top uninstall trigger. Purpose strings must state the concrete benefit.
- Ask for ratings (`SKStoreReviewController`) only after a success moment, never on launch; ask for notifications only after demonstrating what they'll contain (or use provisional authorization to deliver quietly first).
- Notifications you send are UI too: lead with the payload not the app name, support rich attachments, group threads via `threadIdentifier`, and set interruption levels honestly (time-sensitive only when truly time-sensitive).

## 8. Haptics vocabulary

| Haptic | Meaning | Example |
|---|---|---|
| `.success` (notification) | Flow completed | payment done, upload finished |
| `.warning` (notification) | Attention, recoverable | form invalid on submit |
| `.error` (notification) | Action failed | auth failure, cannot process |
| Impact `.light/.medium/.heavy` | Physical collision/snap of UI | drag hits a snap point, card docks |
| Impact `.soft/.rigid` | Squishy vs crisp variants | pull-to-refresh engage / lock |
| Selection | Value change while scrubbing | picker wheel, segmented drag, slider ticks |

Rules:
- Use system semantics — users have learned these meanings; misusing them (success haptic on every tap) dilutes the vocabulary.
- Always pair haptics with a visible change; a haptic without visuals reads as a glitch.
- Reserve success/warning/error for **flow completion**, not in-flight steps; use selection/impact for continuous interactions.
- `prepare()` the generator just before likely use to kill first-fire latency; never fire haptics for passive events the user didn't cause; respect the system haptics toggle.
- In SwiftUI use `.sensoryFeedback(_:trigger:)`; for custom textures (games, pro tools) design Core Haptics patterns (AHAP) but keep the system vocabulary for UI semantics.

## 9. Dynamic Type

Default (Large) text styles: largeTitle 34pt · title1 28 · title2 22 · title3 20 · headline 17 semibold · body 17 · callout 16 · subheadline 15 · footnote 13 · caption1 12 · caption2 11.

- Use **text styles, never fixed sizes**; custom fonts via `UIFontMetrics` / `.custom(_:size:relativeTo:)` so they scale with the user's setting.
- Support the full range: the 5 accessibility sizes scale body 17pt up to 53pt (~310%). Test at AX5; the minimum bar is no truncation or overlap at XXL.
- At accessibility sizes: switch horizontal stacks to vertical (`ViewThatFits` / `dynamicTypeSize` checks), let text wrap (`lineLimit(nil)`), swap icon+label rows to stacked layouts, and let tap targets grow with content.
- Never clamp below `.xxLarge` for body content; clamping is acceptable only for giant display numerals and tab bar labels the system already handles.
- SF Pro tracks automatically (Text ≤19pt looser, Display ≥20pt tighter); don't add manual letter-spacing to system text. SF Symbols scale with their paired text style — use `imageScale` and symbol weights, not fixed-size PNGs.

## 10. Accessibility beyond Dynamic Type

- **VoiceOver**: every interactive element needs a label (what it is), a value (its state), and traits; group composite rows (`accessibilityElement(children: .combine)`) so a card reads as one sentence, not five stops. Custom gestures need `accessibilityAction` equivalents.
- **Contrast**: 4.5:1 minimum for text, 3:1 for large text/icons — check labels sitting on glass over worst-case content. Never encode meaning in color alone; pair with a symbol or text.
- **Reduce Motion**: replace parallax, springs with large travel, and zoom transitions with crossfades (`accessibilityReduceMotion`). **Reduce Transparency / Increase Contrast**: system swaps glass for opaque — verify custom overlays follow.
- **Button Shapes / Bold Text / On-Off labels**: system settings that restyle standard controls — another reason to avoid fully custom controls.
- Target: full app usable with VoiceOver + AX5 text + Reduce Motion simultaneously; run the Accessibility Inspector audit per screen.

## 11. Ship checklist

- [ ] One structure: tabs (2–5, labeled) or stack; edge-swipe back works everywhere
- [ ] No custom bar backgrounds; scroll-edge effect intact; capsule tab bar behaviors configured
- [ ] Search placed per iOS 26 pattern (bottom-aligned field or search tab role)
- [ ] All controls system-standard; 44pt targets; swipe actions mirrored elsewhere
- [ ] Empty/loading/error states designed for every list
- [ ] Widget/Live Activity/App Intent surfaces designed incl. tinted/clear modes
- [ ] Layered Icon Composer icon, ≤4 groups, default/dark/clear/tinted all checked at small sizes
- [ ] Screenshots show the app in use (never splash or login), 1320×2868 masters; preview video is app footage and mute-friendly
- [ ] Launch screen = first-screen skeleton; permissions asked in context with explainers
- [ ] Haptics semantic and paired with visuals; Dynamic Type passes at AX5; Reduce Motion/Transparency verified
