---
id: ios-app-design
title: "iOS App Design — Complete Guide"
category: design-language
platform: mobile
tags: [ios, apple, hig, navigation, app-store]
sources: ["https://developer.apple.com/design/human-interface-guidelines/tab-bars", "https://developer.apple.com/design/human-interface-guidelines/toolbars", "https://developer.apple.com/design/human-interface-guidelines/sidebars", "https://developer.apple.com/design/human-interface-guidelines/split-views", "https://developer.apple.com/design/human-interface-guidelines/search-fields", "https://developer.apple.com/design/human-interface-guidelines/layout", "https://developer.apple.com/design/human-interface-guidelines/multitasking", "https://developer.apple.com/design/human-interface-guidelines/modality", "https://developer.apple.com/design/human-interface-guidelines/going-full-screen", "https://developer.apple.com/design/human-interface-guidelines/designing-for-ios", "https://developer.apple.com/design/human-interface-guidelines/accessibility", "https://developer.apple.com/design/human-interface-guidelines/alerts", "https://developer.apple.com/design/human-interface-guidelines/popovers", "https://developer.apple.com/design/human-interface-guidelines/buttons", "https://developer.apple.com/design/human-interface-guidelines/sheets", "https://developer.apple.com/design/human-interface-guidelines/widgets", "https://developer.apple.com/design/human-interface-guidelines/live-activities", "https://developer.apple.com/design/human-interface-guidelines/app-shortcuts", "https://developer.apple.com/design/human-interface-guidelines/app-icons", "https://developer.apple.com/design/human-interface-guidelines/playing-haptics", "https://developer.apple.com/design/human-interface-guidelines/typography", "https://developer.apple.com/documentation/swiftui/tabbarminimizebehavior", "https://developer.apple.com/documentation/swiftui/tabviewstyle/sidebaradaptable", "https://developer.apple.com/documentation/swiftui/view/tabviewbottomaccessory(content:)", "https://developer.apple.com/documentation/swiftui/localizedstringkey", "https://developer.apple.com/documentation/swiftui/text/init(_:tablename:bundle:comment:)", "https://developer.apple.com/documentation/swiftui/view/presentationdetents(_:)", "https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedinterfaceorientations", "https://developer.apple.com/documentation/uikit/uiviewcontroller/supportedinterfaceorientations", "https://developer.apple.com/documentation/uikit/uiviewcontroller/prefersinterfaceorientationlocked", "https://developer.apple.com/documentation/uikit/uiscenesizerestrictions", "https://developer.apple.com/documentation/xcode/exporting-localizations", "https://developer.apple.com/documentation/xcode/build-settings-reference", "https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key", "https://developer.apple.com/videos/play/wwdc2021/10220/", "https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer", "https://developer.apple.com/videos/play/wwdc2025/323/", "https://developer.apple.com/videos/play/wwdc2025/284/", "https://developer.apple.com/videos/play/wwdc2025/278/", "https://developer.apple.com/videos/play/wwdc2025/275/", "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/", "https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/", "https://developer.apple.com/app-store/product-page-optimization/", "https://developer.apple.com/app-store/custom-product-pages/", "https://developer.apple.com/app-store/in-app-events/", "https://developer.apple.com/app-store/review/guidelines/"]
updated: 2026-08-15
---

# iOS App Design — Complete Guide (iOS 26 era)

Structural, app-level guide for iPhone/iPad apps in the Liquid Glass era. For the material itself (glass variants, lensing, `.glassEffect`), see `apple-hig-liquid-glass`. This doc covers what to build: anatomy, navigation, orientation, controls, system surfaces, icon, and App Store presence.

*Quotation convention: wording inside quote marks is Apple's, unaltered. Typographic apostrophes and quote marks are normalised to straight ones, nested quotations are shown in single marks, and an excerpt beginning mid-sentence drops its leading connective without ellipsis. Where a claim is this document's reading rather than Apple's wording, it says so. Where Apple stops, this document says where.*

## 1. App anatomy — choose ONE primary structure

- **Flat (tab bar)** — 2–5 peer sections. The default for most consumer apps. Never hide the tab bar when navigating deeper; never use a tab as an action button.
- **Hierarchical (navigation stack)** — drill-down lists (Settings, Mail). Combine with tabs: each tab owns its own stack, and switching tabs preserves each stack's state.
- **Modal** — self-contained tasks that interrupt the flow (compose, edit, onboarding). Always provide Cancel (top-leading) and a confirm verb (top-trailing); never trap the user.
- Support **swipe-from-left-edge back** everywhere; never override it. Re-tapping the current tab pops its stack to root (and scrolls to top on second tap).
- Deep-link every screen (universal links + App Intents) — widgets, Spotlight, and notifications all need stable routes into the hierarchy.

### Tab bar (iOS 26)

Apple's one-line scope: "**Use a tab bar to support navigation, not to provide actions.** If you need to provide controls that act on elements in the current view, use a toolbar instead." *(HIG › Tab bars)*

The four rules Apple states as requirements, in Apple's words:

- "**Make sure the tab bar is visible when people navigate to different sections of your app.** If you hide the tab bar, people can forget which area of the app they're in. **The exception is when a modal view covers the tab bar**, because a modal is temporary and self-contained."
- "**Don't disable or hide tab bar buttons, even when their content is unavailable.** Having tab bar buttons available in some cases but not others makes your app's interface appear unstable and unpredictable. **If a section is empty, explain why its content is unavailable.**"
- "**Include tab labels to help with navigation.** A tab label appears beneath or beside a tab bar icon… **Use single words whenever possible.**"
- "**Avoid overflow tabs.** If horizontal space limits the number of visible tabs, the trailing tab becomes a More tab in iOS and iPadOS, revealing the remaining items in a separate list. **The More tab makes it harder for people to reach and notice content on tabs that are hidden, so limit scenarios in your app where this can happen.**"

**Where Apple stops:** the tab-bars page gives **no numeric tab count**. "Use the appropriate number of tabs required to help people navigate your app… keep in mind that it's generally easier to navigate among fewer tabs." The one tab-count figure found on that page is for customizable iPad tab bars: "If you let people select their own tabs, **aim for a default list of five or fewer** to preserve continuity between compact and regular view sizes." (The other figures found there are tvOS geometry — "The height of a tab bar is 68 points, and its top edge is 46 points from the top of the screen" — which say nothing about iPhone.) So 2–5 is a sound working default and the *overflow* rule is the enforceable one — write a rule against the More tab appearing, not against a tab count.

- Appearance: on iOS "A tab bar floats above content at the bottom of the screen. Its items rest on a Liquid Glass background that allows content beneath to peek through." The inset capsule geometry (~21pt), a ~25pt icon and a ~10pt label are **convention**, not published specification — they are named here rather than in the §1 metrics table, which carries no tab-bar icon or label row, and they are listed among the unpublished figures under "Which of these numbers are Apple's".
- Badges: "a red oval containing white text and either a number or an exclamation point… **Reserve badges for critical information so you don't dilute their impact and meaning.**"
- Symbols: "Prefer filled symbols or icons for consistency with the platform." Apple notes the layout flips by context — "Tab bar icons appear above tab labels in compact views, whereas in regular views, the icons and labels appear side by side."
- Color: "**Avoid applying a similar color to tab labels and content layer backgrounds.** If your app already has bright, colorful content in the content layer, prefer a monochromatic appearance for tab bars, or choose an accent color with sufficient visual differentiation."
- **Minimize-on-scroll** (`TabBarMinimizeBehavior`, all platforms at 26.0): "For tab bars with an attached accessory, like the MiniPlayer in Music, you can choose to minimize the tab bar and move the accessory inline with it when a person scrolls down. **A person can exit the minimized state by tapping a tab or scrolling to the top of the view.**" Apple ties the behavior to an attached accessory; enable it for content-first feeds, skip it for tool-like apps *(this document's reading)*.
- **Search tab** (`Tab(role: .search)`): "A tab bar can include a dedicated search tab at the trailing end." See the search subsection below for Apple's two styles.
- **Bottom accessory** (`tabViewBottomAccessory`): a persistent app-wide view (Music's Now Playing). It sits above a normal-size tab bar and displays inline when the bar is collapsed — read `tabViewBottomAccessoryPlacement` and adapt to both placements. Availability is **iOS 26+, iPadOS 26+, Mac Catalyst 26+ only** — there is no macOS row, so this pattern does not cross to a native Mac app.

### Tab bar adaptation — iPad and beyond

- **iPad moves it to the top.** "The system displays a tab bar near the top of the screen. You can choose to have the tab bar appear as a fixed element, or with a button that converts it to a sidebar." Developer surfaces: `tabBarOnly` and `sidebarAdaptable` (`TabViewStyle.sidebarAdaptable`, iOS 18+/macOS 15+/visionOS 2+).
- **Apple's ordering of the choice**, from the sidebars page: "**Consider using a tab bar first.** A tab bar provides more space to feature content, and offers enough flexibility to navigate between many apps' main areas. If you need to expose more areas than fit in a tab bar, the tab bar's convertible sidebar-style appearance can provide access to content that people use less frequently." And from the tab-bars page: "**Prefer a tab bar for navigation.** If your app is more complex, you can provide the option to convert the tab bar to a sidebar." A rule that treats an iPad sidebar as the default has it backwards.
- **The adaptable style is one control, not two.** "When you use the `sidebarAdaptable` style of tab view to present a sidebar, you choose whether to display a sidebar or a tab bar when your app opens. **Both variations include a button that people can use to switch between them.** This style also adapts its appearance depending on the platform, and responds automatically to rotation and window resizing." To get a sidebar with no tab-bar toggle, Apple says use `NavigationSplitView` or `UISplitViewController` instead.
- **iPad customization:** "**Let people customize the tab bar.** In apps with a lot of sections that people might want to access, it can be useful to let people select items that they use frequently and add them to the tab bar, or remove items that they use less frequently." (`TabViewCustomization`.)
- **iPadOS 26 can put a toolbar alongside it:** "In iPadOS, a toolbar and a tab bar can coexist in the same horizontal space at the top of the view. This is particularly useful for layouts where you want to navigate between a few main app areas while keeping the full width of the window available for content." *(HIG › Toolbars, iPadOS)*
- **visionOS turns it vertical** and macOS is where the pattern changes shape — see `macos-app-design` §10 for the sourced Mac substitution and the View-menu requirement that comes with it.

### Navigation bar (which Apple now calls a toolbar)

Apple merged navigation-bar guidance into the Toolbars page in June 2025: "In iOS, a navigation-specific toolbar is sometimes called a navigation bar." Read the rules from there.

**Three placements, and what each is for** *(HIG › Toolbars, Item groupings)*:

- *Leading edge* — "Elements that let people return to the previous document and show or hide a sidebar appear at the far leading edge, followed by the view title. Next to the title, the toolbar can include a document menu that contains standard and app-specific commands that affect the document as a whole, such as Duplicate, Rename, Move, and Export. **To ensure that these items are always available, items on the toolbar's leading edge aren't customizable.**"
- *Center area* — "Common, useful controls appear in the center area, and the view title can appear here if it's not on the leading edge… **items in this section automatically collapse into the system-managed overflow menu when the window shrinks enough in size.**"
- *Trailing edge* — "important items that need to remain available, buttons that open nearby inspectors, an optional search field, and the More menu… **Items on the trailing edge remain visible at all window sizes.**"

**Rules attached to those placements:**

- "**Minimize the number of groups.** Too many groups of controls can make a toolbar feel cluttered and confusing, even with the added space on iPad and Mac. **In general, aim for a maximum of three.**" This is Apple's only number here — it counts *groups*, not buttons, and the old "max 2–3 trailing actions" is convention rather than specification.
- "**Keep actions with text labels separate.** Placing an action with a text label next to an action with a symbol can create the illusion of a single action with a combined text and symbol… Add separation by inserting fixed space between the buttons." (`fixedSpace`.)
- "**Use the `.prominent` style for key actions such as Done or Submit.** This separates and tints the action so there's a clear focal point. **Only specify one primary action, and put it on the trailing side of the toolbar.**"
- "**Prefer system-provided symbols without borders.** Borders (like outlined circle symbols) aren't necessary because the section provides a visible container, and the system defines hover and selection state appearances automatically."
- "**Use the standard Back and Close buttons.** Prefer the standard symbols for each, and **don't use a text label that says *Back* or *Close*.**"
- Overflow is the system's job: "The system automatically adds an overflow menu in macOS or iPadOS when items no longer fit. **Don't add an overflow menu manually, and avoid layouts that cause toolbar items to overflow by default.**" A More menu is for prioritised extras — "Try to include all actions in the toolbar if possible, and only add this menu if you really need it."

**Titles** *(HIG › Toolbars, Titles)*: "**Provide a useful title for each window.**" · "**Don't title windows with your app name.** Your app's name doesn't provide useful information about your content hierarchy." · "**Write a concise title.** Aim for a word or short phrase that distills the purpose of the window or view, and **keep the title under 15 characters long** so you leave enough room for other controls." Apple also allows an empty title area: "If titling a toolbar seems redundant, you can leave the title area empty."

**Large titles** *(HIG › Toolbars, iOS)*: "**Use a large title to help people stay oriented as they navigate and scroll.** By default, a large title transitions to a standard title as people begin scrolling the content, and transitions back to large when people scroll to the top." (`prefersLargeTitles`.) The 34pt and 17pt figures below come from the typography scale, not from the toolbars page — and note the weights Apple actually publishes there: Large Title is **Regular** with Bold as its emphasized weight, while Headline (the 17pt compact title) is **Semibold**. "34pt bold large title" is a convention, not Apple's row.

- Content scrolls **under** the glass bar; iOS 26 applies a scroll-edge effect automatically. Apple's instruction is subtractive: "**Reduce the use of toolbar backgrounds and tinted controls.** Any custom backgrounds and appearances you use might overlay or interfere with background effects that the system provides. Instead, use the content layer to inform the color and appearance of the toolbar, and use a `ScrollEdgeEffectStyle` when necessary."
- Corner radii come free from standard components: "By default, standard buttons, text fields, headers, and footers have corner radii that are concentric with bar corners. If you need to create a custom component, ensure that its corner radius is also concentric with the bar's corners."
- Hiding bars is allowed, conditionally: "**Consider temporarily hiding toolbars for a distraction-free experience.** If you support this, do so contextually when it makes the most sense, and **offer ways to reliably restore hidden interface elements.**"
- Design for the thumb zone: primary actions in the bottom half of the screen on iPhone; the top corners are the most expensive real estate to reach. *(This document's reading — Apple states the reachability rationale for iPad bottom/side controls on the Mac Catalyst page, but publishes no thumb-zone geometry.)*

### iPad: split views & size classes
- **Two/three-column split**: sidebar ~320pt, supplementary column ~375pt, remainder content. Collapse to a stacked navigation stack in compact width (Slide Over, 1/3 split).
- Design for regular AND compact width — an iPad app is judged by its compact behavior. Support Stage Manager: free window resizing, sensible 320pt-class minimum width.
- Support hardware keyboard (arrow/Tab navigation, ⌘-shortcuts surfaced in the shortcut HUD via holding ⌘) and pointer hover effects (`.hoverEffect`) — iPad users increasingly run trackpads.
- iPadOS 26 windows behave Mac-like (free resize, tiling, a menu-bar-style command surface) — an iPad layout that only works at exactly full-screen is now a defect.
- Use popovers, context menus, and multi-column layouts on iPad rather than stretching the iPhone layout; a stretched iPhone UI at 12.9" is the most common iPad review complaint.

### Orientation

Apple's position, stated once and plainly: "**Aim to support both portrait and landscape orientations.** People appreciate apps and games that work well in different device orientations, **but sometimes your experience needs to run in only portrait or only landscape.** When this is the case, you can rely on people trying both orientations before settling on the one you support — **there's no need to tell people to rotate their device.** If your app or game is landscape-only, make sure it runs equally well whether people rotate their device to the left or the right." *(HIG › Layout)*

So a portrait-only app is not a violation. What Apple asks for is that the choice be real and symmetric, and — separately, and far more strictly — that the layout adapt.

**Rotation is a size-class change, not a resize.** Apple's size-class table is the specification, and it does not say what most people assume:

| Device class | Portrait | Landscape |
|---|---|---|
| All iPads | Regular width, regular height | Regular width, regular height |
| iPhone Pro Max / Plus / Air, and 11 / XR | Compact width, regular height | **Regular width**, compact height |
| Every other iPhone (incl. 17, 17 Pro, 16, 16e, SE) | Compact width, regular height | **Compact width**, compact height |

*(HIG › Layout, iOS/iPadOS device size classes.)* Two consequences a rule can cite: a `NavigationSplitView` or any regular-width branch **appears on a large iPhone in landscape** and never on a small one, so a layout tested only on a non-Max iPhone has never run its own regular-width path; and *height* goes compact on every iPhone in landscape, which is what breaks large titles and tall forms.

**Declaring orientation.**

- `UISupportedInterfaceOrientations` — "The interface orientations supported by your app." Apple lists it for **iOS and iPadOS only**, and points to platform- and device-specific variants of the key for per-device answers.
- `UIViewController.supportedInterfaceOrientations` is the per-screen override (iOS 6+, Mac Catalyst, visionOS).
- **Locking orientation is now a temporary request, not a build setting.** Apple's replacement for the old opt-out is `UIViewController.prefersInterfaceOrientationLocked` (iOS 26+, iPadOS 26+, Mac Catalyst 26+), overridden on a view controller, with `setNeedsUpdateOfPrefersInterfaceOrientationLocked()` when it changes. Its scope is deliberately narrow — Apple's examples are "a driving game… when the device is expected to rotate for steering a vehicle or a camera app… during photo or video capture" — and it is **not guaranteed**: "The system does not guarantee that `prefersInterfaceOrientationLocked` preference will be honored. If honored, the preference to lock the interface orientation lasts while the view controller is visible." *(TN3192)*
- **Apple publishes exactly when the system will consider honouring it**, on the property's own reference page: "The default is `false`… **The system will consider locking the interface orientation when these conditions are true: The scene is centered on the screen · The scene is the same size as the screen · The scene is not occluded by another scene.** The system continuously monitors the state and when the app no longer satisfies the requirements, it disables the interface orientation lock." *(UIKit › `UIViewController.prefersInterfaceOrientationLocked`)* These three preconditions are the answer to "why isn't my lock working" — a windowed or side-by-side scene on iPadOS 26 satisfies none of them. Read the live state from `UIWindowScene.effectiveGeometry.isInterfaceOrientationLocked`; never assume the request took.
- `UIRequiresFullScreen`, the old iPad opt-out from multitasking and dynamic resizing, is **deprecated at 26.0** and "will be ignored in a future release". See `apple-shipping-readiness` for the key, its two spellings, and `UIRequiresFullScreenIgnoredStartingWithVersion`.
- `UISceneSizeRestrictions` expresses a minimum size but not an orientation: "The `UISceneSizeRestrictions` object **does not prohibit other resizing behavior like rotation.** When people rotate their device and the scene changes orientation, the scene's bounds will change as well, regardless of the preferences expressed through the `sizeRestrictions` property." *(TN3192)*

**Testing it.** "**Preview your app on multiple devices, using different orientations, localizations, and text sizes.** You can streamline the testing process by first testing versions of your experience that use the largest and the smallest layouts." *(HIG › Layout)* Apple's own listed adaptability axes are: different device screen sizes and orientations, Dynamic Island and camera controls, external displays / Display Zoom / resizable iPad windows, Dynamic Type changes, and locale-driven layout direction and text length.

### Sheets, popovers, full-screen covers
- **Sheet** = default modal, and iOS is one of only two platforms where it need not be: "In macOS, tvOS, visionOS, and watchOS, a sheet is always *modal*… **In iOS and iPadOS, a sheet can be either modal or *nonmodal*.** When a nonmodal sheet is onscreen, people use its functionality to affect the parent view without dismissing the sheet." Apple's example is Notes' formatting sheet. *(HIG › Sheets)*
- **Detents.** "The system defines two detents: *large* is the height of a fully expanded sheet and *medium* is about half of the fully expanded height. Sheets can have one or more custom detent values. **Sheets automatically support the large detent.** Adding the medium detent allows the sheet to rest at both heights, whereas **specifying only medium prevents the sheet from expanding to full height.**" Apple scopes the pattern — "Designed for iPhone, detents specify particular heights at which a sheet naturally rests" — and gives the judgement call: support medium "to allow progressive disclosure", but skip it when the content is more useful at full height, as Messages' and Mail's compose sheets are.
- **Grabber.** "**Include a grabber in a resizable sheet.** A grabber shows people that they can drag the sheet to resize it; **they can also tap it to cycle through the detents.** In addition to providing a visual indicator of resizability, a grabber also works with VoiceOver so people can resize the sheet without seeing the screen." (`prefersGrabberVisible`.) The 36×5pt geometry is convention; Apple describes the grabber as "a small horizontal indicator" without publishing its size.
- **Buttons.** "for sheets with a single view, **the Cancel button belongs on the leading edge of the top toolbar. When present, the Done button belongs on the trailing edge.**" And the pairing rule, added March 2026: "**Provide an alternative to the Done button.** If you provide a Done button, always pair it with a Cancel button… **Relying solely on the Done button implies that completing the task is the only way to exit the sheet, which can feel restrictive or misleading.** Avoid showing all three buttons — Cancel, Done, and Back — together." The Back button "isn't intended to dismiss a sheet".
- **One at a time.** "**Display only one sheet at a time from the main interface.** If something people do within a sheet results in another sheet appearing, close the first sheet before displaying the new one."
- **iPad style:** "**Prefer using the page or form sheet presentation styles in an iPadOS app.** Each style uses a default size for the sheet, centering its content on top of a dimmed background view."
- iOS 26 sheets are glass at partial height and become opaque when expanded; corner radii are concentric with the display.
- **Popover**: iPad/regular-width only (min ~320pt wide), anchored to its trigger with an arrow; it becomes a sheet in compact width — design content to survive both.
- **Full-screen cover**: only for immersive tasks (camera, video, onboarding). Everything else is a sheet.
- **Alerts**: 270pt-wide, max 2–3 buttons, title ≤ ~1 line; destructive choice styled `.destructive`, Cancel on the left/bottom. Use confirmation dialogs (action sheets) for choices with more options.
- Mark unsaved-changes sheets non-dismissable-by-swipe (`interactiveDismissDisabled`) and confirm discard instead of silently losing input.

### Bar & container metrics — quick reference

| Element | Spec |
|---|---|
| Status bar / Dynamic Island region | ~54–59pt top safe area on Face ID iPhones |
| Compact navigation bar | 44pt bar height; 17pt semibold title |
| Large-title region | adds ~52pt above content at scroll top — **convention**. The Large Title *text style* is Apple's: 34pt, **Regular** weight, 41pt leading, Bold as its emphasized weight, at the default Dynamic Type size |
| Tab bar (legacy metric) | 49pt + 34pt home-indicator inset; iOS 26 renders as inset floating capsule |
| Bottom toolbar | 44pt + home-indicator inset |
| Sheet grabber | 36×5pt, centered, 5pt from top — **convention** |
| Popover minimum width | ~320pt (regular width only) — **convention** |
| Alert width | 270pt fixed — **convention** |
| List row minimum | 44pt; 60pt with subtitle; 76pt with thumbnail |
| Default layout margins | 16pt compact / 20pt+ regular; 8pt spacing grid |
| Home indicator | 34pt inset — keep interactive elements above it |
| Control size | **44×44pt default, 28×28pt minimum** — Apple's published figures |

**Which of these numbers are Apple's.**

*Published, and citable as such:* **iOS/iPadOS control size — 44×44 pt default, 28×28 pt minimum**, from the table under "Offer sufficiently sized controls" in HIG › Accessibility › Mobility, which gives both figures for every platform. Note that Apple's 44×44 appears in two different roles — the general **hit-region** rule on HIG › Buttons, and the **control size** default here — and on iOS alone the two coincide, so the distinction stays invisible until you cross to macOS. `apple-accessibility` §3 sets out the conflict and deliberately leaves it where Apple leaves it; do not resolve it here. The same accessibility page publishes spacing: "it works well to add about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding works well around the element's visible edges." Apple's force on all of these is advisory — "**Strive to meet** the recommended minimum control size for each platform" — so treat them as published figures to cite, not as thresholds the OS enforces. The Dynamic Type scale (body 17 pt through the AX steps) and the recommended minimum text size (11 pt on iOS/iPadOS) are published in HIG › Typography — including the **Large Title** row of the iOS/iPadOS Dynamic Type table, which at the default (Large) size reads Regular weight, 34 pt, 41 pt leading, Bold emphasized. So the 34 pt in the table above is Apple's figure and the weight is **Regular**, not bold; only the *region height* the large title occupies is convention. Widget dimensions, margins (16 pt / 11 pt) and the 11 pt widget text floor are published in HIG › Widgets. Screen sizes and size classes are published in HIG › Layout.

*Not found on any Apple page searched:* the **sheet grabber's 36×5 pt** — Apple describes only "a small horizontal indicator"; the **popover minimum width** — HIG › Popovers carries no pt figure at all; the **alert width of 270 pt** — HIG › Alerts carries pt figures in a single sentence, and both of them (a 154 pt maximum height and a 16 pt corner radius) describe a *visionOS* accessory view; the tab bar's inset geometry, icon size and label size; the **status-bar / Dynamic Island safe area**, the **home-indicator 34 pt inset**, the **layout margins and 8 pt grid**, and the **list row heights**. HIG › Layout is the page that would carry the last four, and no iOS margin, safe-area, home-indicator or row-height figure was found on it: alongside its screen-size and size-class tables, every pt figure found there is tvOS's or visionOS's. Those are the tvOS overscan insets (60 pt top and bottom, 80 pt sides); **eight tvOS grid tables** giving unfocused content widths of 860 / 560 / 410 / 320 / 260 / 217 / 184 / 160 pt for two- through nine-column grids, each with 40 pt horizontal spacing and 100 pt minimum vertical spacing; and a visionOS button-spacing figure (60 pt between centers). Note two things about that list. The tvOS overscan insets sit under Apple's own lead-in "Adhere to the screen's safe area", so the page *does* carry a safe-area figure — for tvOS. And the eight grid tables live inside the page's `tabNavigator` node, one per tab: a walk over the page's top-level content nodes never reaches them, and an earlier revision of this note missed all eight for exactly that reason. Bar heights (44 pt compact, the 49 pt legacy tab bar, the large-title region) are long-standing platform metrics not found on any of the pages listed below.

Searched: HIG › Layout, Tab bars, Toolbars, Sheets, Popovers, Alerts, Search fields, Widgets, Accessibility and Typography (JSON, **recursing into every table node wherever it sits** — including inside `tabNavigator` tabs and `row`/`column` containers, since Apple's specifications live in table nodes and not in the prose, and a table can be nested several levels below the section that names it); the relevant SwiftUI and UIKit references plus their `metadata.platforms[]` and `deprecationSummary`; and the WWDC transcript corpus enumerated from `videos/all-videos/`.

**Everything in the table above that this note does not attach an Apple point figure to is a working convention** — good defaults, not specifications, whether or not it is named in the paragraphs above, and including the unpublished half of a row whose other half is Apple's (the large-title *region*, next to the published Large Title text style). **A rule must not report a deviation from a convention as a HIG violation.** The published figures are fair game.

*(Phrased as "not found on the pages searched" rather than "Apple does not publish" on purpose — see the matching note in `macos-app-design` §1.)*

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

- **Touch targets: 44×44pt.** Apple uses that figure two ways — "As a general rule, a button needs a hit region of at least 44x44 pt" *(HIG › Buttons)*, and 44×44 pt as the iOS/iPadOS **default control size**, against a published **minimum of 28×28 pt** *(HIG › Accessibility, Mobility)*. On iOS the two coincide, so 44×44 is the right number to design to, and Apple asks you to "strive to meet" the 28×28 minimum below it — advisory, not enforced. See `apple-accessibility` §3 — and do not carry the 44 pt figure to macOS, where the default is 28×28. 60pt for primary CTAs and ≥8pt between tappables are convention; Apple's published spacing guidance is about 12 pt of padding around bezelled elements and about 24 pt "around the element's visible edges" for unbezelled ones.
- iOS 26 buttons are **capsule-shaped** by default; sizes mini/small/regular/large (large ≈ 50pt tall). One `.borderedProminent` (tinted) button per view; the rest bordered/plain.
- Context menus and menus **morph out of their source control** in iOS 26 (glass); keep menus ≤ ~8 items, group with separators, destructive items last with `role: .destructive`.
- Swipe actions: leading edge = positive (read/pin), trailing edge = negative, destructive action outermost with full-swipe to commit. Max 3 per side. Always mirror them in a context menu or edit mode.
- **Pull-to-refresh** (`refreshable`) for user-initiated feed updates; never as the only sync mechanism.
- Text fields: correct `keyboardType`, `textContentType` (enables AutoFill/one-time codes), and `submitLabel`; never block paste in credential fields.

### Search placement (iOS 26)

Apple names **three** entry points on iPhone, not one: "There are three main places you can position the entry point for search: **as a tab in a tab bar**, **in a toolbar at the bottom or top of the screen**, **directly inline with content.** Where search makes the most sense depends on the layout, content, and navigation of your app." *(HIG › Search fields, iOS)*

- **As a tab**, in two styles. *Standard tab* — "Tapping the search tab navigates people to a search landing page with a search field at the top." Choose it "to provide suggestions, promote discovery, and encourage exploration". *Button appearance* — "displays the search tab as a separate button and allows people to start searching immediately… the keyboard immediately appears with the search field above it". Choose it "to help people quickly find what they need"; it "brings people directly back to their previous tab after they exit search".
- **In a toolbar.** Apple's default is the bottom: "**Place search at the bottom if there's room.** You can either add a search field to an existing toolbar, or as a new toolbar where search is the only item." (Settings is the search-only case; Mail and Notes share the bar.) Top is the exception: "**Place search at the top when it's important to defer to content at the bottom of the screen, or there's no bottom toolbar.**" Either way it animates into a field above the keyboard when tapped — "or at the top if there isn't space at the bottom".
- **Inline.** "**Place search as an inline field when its position alongside the content it searches strengthens that relationship.** When you need to filter or search within a single view, it can be helpful to have search appear directly next to content to illustrate that the search applies to it, rather than globally."
- **More than one search field is explicitly allowed.** Apple's inline guidance says the pattern "is useful **if your app has more than one search field** and if location plays a critical role in the scope of your search", and gives Music as the example: a search *tab* for the app, plus an inline field in the library. A rule asserting one entry point per app contradicts this. What Apple asks for instead is visual separation: "When at the top, position an inline search field above the list it searches, and **consider pinning it to the top toolbar when scrolling. This helps keep it distinct from search that appears in other locations.**"
- **iPad and Mac are guided together.** "The placement and behavior of the search field in iPadOS and macOS is similar. If your app is available on both iPad and Mac, try to keep the search experience as consistent as possible across both platforms." Default: "**Put a search field at the trailing side of the toolbar for many common uses**", or "**Include search at the top of the sidebar when filtering content or navigation there.**"
- **Auto-focus, with one exception:** "In a search field in a dedicated area, consider immediately focusing the field when a person navigates to the area… **An exception to this is on iPad when only a virtual keyboard is available, in which case it's better to leave the field unfocused to prevent the keyboard from unexpectedly covering the view.**"
- **Resizing:** "On iPad, the search field fluidly resizes with the app window like it does on Mac. However, **for compact views on iPad, it's important to ensure that search is available where it's most contextually useful.**"
- On focus, show recent searches + suggestions immediately; filter live per keystroke where the dataset allows; support search tokens/scopes for structured filtering. *(This document's reading.)*

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

**Sizes are per screen size, not per family.** Apple publishes a table of iOS dimensions keyed on the portrait screen size, and the range is wide:

| Screen (portrait, pt) | Small | Medium | Large | Circular | Rectangular | Inline |
|---|---|---|---|---|---|---|
| 430×932 (Pro Max class) | 170×170 | 364×170 | 364×382 | 76×76 | 172×76 | 257×26 |
| 393×852 / 390×844 | 158×158 | 338×158 | 338×354 | 72×72 | 160×72 | 234×26 |
| 375×812 | 155×155 | 329×155 | 329×345 | 72×72 | 157×72 | 225×26 |
| 320×568 | 141×141 | 292×141 | 292×311 | N/A | N/A | N/A |

*(HIG › Widgets, Specifications › iOS dimensions — abridged; the full table has ten rows.)* The familiar 170×170 is the **largest** iPhone small widget, not the universal one; the smallest is 141×141, a 17% difference. Apple's instruction follows from that: "**Supply content at appropriate sizes** to make sure that your widget looks great on every device and let the system resize or scale it as necessary. In iOS, the system ensures that your widget looks good on small devices by resizing the content you design for large devices… **for your production widget, use SwiftUI to ensure flexibility.**" Design to the table, ship a layout that does not depend on it.

**Which sizes exist where** *(HIG › Widgets, System family widgets)*: small, medium and large are supported on iPhone, iPad, Mac and Apple Vision Pro. **System extra large is "Not supported" on iPhone** — it is iPad, Mac and Vision Pro. Small is the only family that reaches StandBy and CarPlay. Accessory circular, inline and rectangular are iPhone and iPad Lock Screen plus Apple Watch; **accessory corner is Apple Watch only.**

- A widget is a **glanceable view of one piece of information + one deep link**. Apple: "**Replicating an app icon offers little additional value, and people may be less likely to keep it on their screens.**" · "**Prefer dynamic information that changes throughout the day.** If a widget's content never appears to change, people may not keep it in a prominent position." · "**Balance information density.** Sparse layouts can make the widget seem unnecessary, while overly dense layouts are less glanceable." · "**Avoid mirroring your widget's appearance within your app.** Including an element in your app that looks like your widget but doesn't behave like it can confuse people."
- "**Offer widgets in multiple sizes when doing so adds value.** Avoid expanding a smaller widget's content to simply fill a larger area. **It's more important to create one widget in the size that best represents the content than providing the widget in all sizes.**"
- **Rendering modes are the thing to test, and they differ by platform.** iPhone gets *full-color* (Home Screen, Today view, StandBy, CarPlay), *accented* (Home Screen, Today view) and *vibrant* (Lock Screen, and StandBy in low light). iPad drops StandBy/CarPlay. **Mac gets full-color and vibrant, with accented "Not supported"; Apple Watch has no vibrant mode.** In accented mode "the system removes the background and replaces it with a tinted color effect for a tinted appearance and a Liquid Glass background for a clear appearance", dividing views into an accent group and a primary group (`widgetAccentable(_:)`).
- **Color must not carry the meaning.** "**Convey meaning without relying on specific colors to represent information.** Widgets can appear monochromatic (with or without a custom tint color), and in watchOS, the system may invert colors depending on the watch face a person chooses." And on photography: "When a person chooses a tinted or clear appearance for their widgets, the system by default desaturates full-color images… **full-color images in these appearances draw special attention to the widget, which might make it feel as if the widget doesn't belong to the platform.**"
- **Margins:** "**In general, use standard margins to ensure legibility.** Use the standard margin width for widgets — **16 points for most widgets** — to avoid crowding their edges… If you need to use tighter margins… **setting margins of 11 points** can work well. Additionally, note that widgets use **smaller margins on the desktop on Mac and on the Lock Screen, including in StandBy.**" Corner radius comes from `ContainerRelativeShape`.
- **Text:** "**Avoid very small font sizes.** In general, display text using fonts at **11 points or larger.**" · "**Avoid rasterizing text.** Always use text elements and styles to ensure that your text scales well and to allow VoiceOver to speak your content." · "In iOS, iPadOS, and visionOS, **widgets support Dynamic Type sizes from Large to AX5**" when you use `Font` or `custom(_:size:)`.
- **No real-time updates.** "widgets periodically refresh their information but **don't support continuous, real-time updates**… **Offer Live Activities to show real-time updates.**" Animations for data changes: "standard and custom animations with a duration of **up to two seconds**".
- **Interactivity:** buttons and toggles backed by App Intents; "**When people interact with your widget in areas that aren't buttons or toggles, the interaction launches your app.**" Deep-link precisely — "**Ensure that a widget interaction opens your app at the right location.**" Note "**inline accessory widgets offer only one tap target.**"
- **Gallery copy is design too:** "**Write a succinct widget description.** Begin a description with an action verb… Avoid including unnecessary phrases that reference the widget itself, like 'This widget shows…', 'Use this widget to…', or 'Add this widget.'" And "**Group your widget's sizes together, and provide a single description.**"
- Design for StandBy — Apple's own framing is "scaled up so they fill the Lock Screen", with "**Limit usage of rich images or color to convey meaning in StandBy.** Instead, make use of the additional space by scaling up and rearranging text so people can glance at the widget content from a greater distance" and "**don't use background colors for your widget when it appears in StandBy**". Supporting StandBy is what gets you CarPlay: "By supporting StandBy, you also ensure your widgets work well in CarPlay." Use `containerBackground(for: .widget)` so the system can strip backgrounds per context.

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
- **Preview videos**: **15–30 seconds**, **up to 3** per localization, ≤500MB, portrait or landscape. They may only use video screen captures of the app itself; narration and video or text overlays are allowed to explain what the footage alone doesn't. The poster frame defaults to 5 seconds in — pick one deliberately. Design for muted autoplay.
- Use **Product Page Optimization** to test alternate icons, screenshots, and previews — up to three treatments against your baseline. Apple's own advice is to weigh *how many elements you change in a treatment* so you can tell which one moved the result, and to wait for a treatment to beat or lose to the baseline at ≥90% confidence before acting. Treatment assets can themselves appear in search results and on the Today, Games, and Apps tabs.
- **Custom Product Pages**: up to 70 additional versions of the page, each with its own URL, varying screenshots, promotional text, and previews — one per campaign, character, or feature, with optional keywords and a deep link.
- **In-app events** get their own 16:9 event card (1920×1080 minimum, up to 3840×2160): a ≤30-character title-case name and a ≤50-character sentence-case short description. They surface on the product page, in search results, and in curated selections on the Today, Games, and Apps tabs — design them like mini campaign posters, consistent with the app's visual system.
- App name ≤30 chars; the subtitle carries the value proposition. The icon must stay recognizable at search-result size next to competitors.

## 7. Launch, first run, permissions

- **Launch screen**: a static skeleton of the first real screen (backgrounds + bar placeholders). No logos, taglines, or spinners — the goal is perceived instant launch. It is also about to stop being optional: Apple's TN3192 states that to support resizable scenes an app "Provides a launch screen. **Starting in iOS 27 and iPadOS 27, a launch screen is required for App Store submission.**" (revision dated 2026-06-08; see TN3208 for the criteria).
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

## 11. Myth-checks — beliefs that produce false findings

### 11.1 `Text("Hello")` is already localizable

This is the one a "hardcoded string" rule written from web instinct gets wrong, and it would flag correct SwiftUI in every app it ran on.

Apple's `LocalizedStringKey` reference states the mechanism outright: "Initializers for several SwiftUI types — such as `Text`, `Toggle`, `Picker` and others — implicitly look up a localized string when you provide a string literal. **When you use the initializer `Text("Hello")`, SwiftUI creates a `LocalizedStringKey` for you and uses that to look up a localization of the `Hello` string.** This works because `LocalizedStringKey` conforms to `ExpressibleByStringLiteral`."

`Text`'s own initializer page says the same from the other end: "**When you initialize a text view with a string literal, the view triggers this initializer because it assumes you want the string localized**, even when you don't explicitly specify a table… If you haven't provided localization for a particular string, you still get reasonable behavior, because the initializer displays the key, which typically contains the unlocalized string." *(SwiftUI › `Text.init(_:tableName:bundle:comment:)`)* WWDC states it in one line: "when you use a `Text` with a string literal, it **automatically performs a localized string lookup in the main bundle**." *(WWDC21 › Localize your SwiftUI app)*

So `Text("Hello")` is not a finding. Apple's rule of thumb for which is which: "**As a general rule, use a string literal argument when you want localization, and a string variable argument when you don't.**"

**What actually is unlocalized**, all four sourced from the same pages:

1. **`Text(someStringVariable)`.** "If you initialize a text view with a string variable rather than a string literal, the view triggers the `init(_:)` initializer instead, **because it assumes that you don't want localization in that case.**" Apple's own example is a `Section(header: Text("Today"))` whose literal localizes while the `Text(message.title)` rows in the list do not. The deliberate fix when you *do* want it: `Text(LocalizedStringKey(someString))`.
2. **`Text(verbatim:)`.** "If you have a string literal that you don't want to localize, use the `init(verbatim:)` initializer instead." Correct code, by construction — never flag it.
3. **A custom view or function whose label parameter is typed `String`.** This is the real defect and the one worth a rule: "If you have custom views and methods that accept string literals, **you can make them localizable by using this type in place of `String`.** This way, literals that are passed as arguments to these views and functions are automatically extracted during the Xcode localization export process and then loaded from the bundle at runtime." *(WWDC21 › Localize your SwiftUI app)* A literal passed into `MyRow(title: String)` is invisible to the export; the same literal passed into `MyRow(title: LocalizedStringKey)` is not.
4. **String interpolation is fine.** "This also works for string interpolation, so that you can embed variables into your strings and they are automatically converted to format specifiers in the exported localizable strings files and catalog."

**Extraction depends on two build settings, and the default one does not cover item 3.** This is where a localization rule most often stops one step short:

- **Use Compiler to Extract Swift Strings** (`SWIFT_EMIT_LOC_STRINGS`) — "When enabled, the Swift compiler will be used to extract Swift string literal and interpolation `LocalizedStringKey` and `LocalizationKey` types during localization export." *(Xcode › Build settings reference)* Apple's export instructions make it a requirement, not an optimisation: "**To include all localizable text in your export, enable the Use Compiler to Extract Swift Strings build setting for your project.** This setting only impacts Swift strings. Objective-C string extraction works without any additional build settings." *(Xcode › Exporting localizations)*
- **Localized String SwiftUI Support** (`LOCALIZED_STRING_SWIFTUI_SUPPORT`) — "When enabled, literal strings in SwiftUI will be extracted during localization export. **This will only extract string literals in `Text()` initializers, unless `SWIFT_EMIT_LOC_STRINGS` is also enabled.**" *(Xcode › Build settings reference)*

Read together: with only the SwiftUI setting on, a literal passed to `Text()` is extracted and a literal passed to a custom view's `LocalizedStringKey` parameter is **not**. So item 3 is a two-part defect — the parameter must be typed `LocalizedStringKey`, *and* `SWIFT_EMIT_LOC_STRINGS` must be enabled — and an audit that checks only the type will pass a project whose strings never reach the translator.

One more fact a localization rule should know: `Text` renders Markdown from the localized string or the fallback key, but "doesn't support line breaks, soft breaks, or any style of paragraph- or block-based formatting like lists, block quotes, code blocks, or tables".

This applies identically on macOS: `LocalizedStringKey` is macOS 10.15+.

### 11.2 The rest

1. **"A tab bar must have 2–5 tabs."** The tab-bars page carries no such count (see §1). The enforceable rule is the overflow one — a More tab appearing is the failure Apple names.

2. **"Only one search entry point per app."** Apple's inline-search guidance says the pattern is useful "if your app has more than one search field", and Music ships both a search tab and an inline library filter. Flag the missing visual separation, not the second field.

3. **"Search must be at the bottom on iPhone."** "Place search at the bottom **if there's room**" — with a stated exception for deferring to bottom content, and two other legitimate placements.

4. **"Portrait-only is a violation."** "sometimes your experience needs to run in only portrait or only landscape". Apple asks that a landscape-only app work rotated either way, and that layouts adapt; it does not require both orientations.

5. **"Rotation just makes the screen wider."** On a Pro Max / Plus / Air iPhone, landscape is **regular width** — a different size class and often a different layout branch. On every other iPhone it stays compact. See the table in §1.

6. **"`UIRequiresFullScreen` locks orientation."** It is the iPad multitasking/resizing opt-out, deprecated at 26.0. Orientation lock is `prefersInterfaceOrientationLocked`, which the system may decline to honor.

7. **"Widgets are 170×170."** That is the Pro Max value in a ten-row table that bottoms out at 141×141.

8. **"Every widget must survive tinted and clear modes."** True on iPhone and iPad. **Not on Mac**, where Apple lists accented rendering as "Not supported".

9. **"The grabber is 36×5pt", "the alert is 270pt", "a popover is at least 320pt wide."** None of the three was found on any page searched: Apple describes the grabber only as "a small horizontal indicator"; HIG › Popovers carries no pt figure at all; and HIG › Alerts carries its pt figures in one sentence, both of them — a 154 pt maximum height and a 16 pt corner radius — describing a *visionOS* accessory view. The same goes for the status-bar safe area, the home indicator, the layout margins and the list row heights, none of which appear on HIG › Layout. See "Which of these numbers are Apple's" under the metrics table in §1 for the surfaces checked, before reporting any deviation as a HIG violation.

10. **"A sheet needs a Done button."** Apple's requirement runs the other way: a Done button must be *paired* with Cancel or Back. A sheet with only Done is the finding.

11. **"Control minimums are 44pt, everywhere."** 44×44 pt is Apple's general **hit-region** rule and the iOS/iPadOS default **control size** — two different measurements that happen to coincide on iOS. The published control-size *minimum* on iOS is 28×28 pt, and on macOS the default drops to 28×28 with a 20×20 minimum. Carrying 44 to the Mac would flag every native Mac toolbar. `apple-accessibility` §3 holds the full treatment.

12. **"`LocalizedStringKey` on the parameter is enough."** Not by itself: with only `LOCALIZED_STRING_SWIFTUI_SUPPORT` enabled, Apple extracts "only… string literals in `Text()` initializers, unless `SWIFT_EMIT_LOC_STRINGS` is also enabled". The type and the build setting are both required — see §11.1.

13. **"An orientation lock request is honoured."** Apple publishes three preconditions — the scene must be centered on the screen, the same size as the screen, and not occluded by another scene — and "continuously monitors the state", disabling the lock when they stop holding. On iPadOS 26 a windowed scene satisfies none. See §1.

## 12. Ship checklist

- [ ] One structure: labeled tabs (few enough that no More tab ever appears) or a stack; edge-swipe back works everywhere
- [ ] No custom bar backgrounds; scroll-edge effect intact; ≤3 toolbar groups; one `.prominent` action, trailing
- [ ] Search placed at one of Apple's three iOS entry points; multiple fields visually separated
- [ ] Orientation decided deliberately; regular-width landscape path exercised on a Pro Max–class iPhone
- [ ] Localization: no `String`-typed label parameters on custom views; `Text(verbatim:)` used where a literal is genuinely not translatable
- [ ] All controls system-standard; 44pt targets; swipe actions mirrored elsewhere
- [ ] Empty/loading/error states designed for every list
- [ ] Widget/Live Activity/App Intent surfaces designed incl. tinted/clear modes
- [ ] Layered Icon Composer icon, ≤4 groups, default/dark/clear/tinted all checked at small sizes
- [ ] Screenshots show the app in use (never splash or login), 1320×2868 masters; preview video is app footage and mute-friendly
- [ ] Launch screen = first-screen skeleton; permissions asked in context with explainers
- [ ] Haptics semantic and paired with visuals; Dynamic Type passes at AX5; Reduce Motion/Transparency verified
