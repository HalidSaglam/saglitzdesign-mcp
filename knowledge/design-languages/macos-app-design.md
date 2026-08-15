---
id: macos-app-design
title: "macOS App Design — Complete Guide"
category: design-language
platform: macos
tags: [macos, apple, hig, menu-bar, keyboard, windows]
sources: ["https://developer.apple.com/design/human-interface-guidelines/designing-for-macos", "https://developer.apple.com/design/human-interface-guidelines/accessibility", "https://developer.apple.com/design/human-interface-guidelines/the-menu-bar", "https://developer.apple.com/design/human-interface-guidelines/windows", "https://developer.apple.com/design/human-interface-guidelines/toolbars", "https://developer.apple.com/design/human-interface-guidelines/sidebars", "https://developer.apple.com/design/human-interface-guidelines/split-views", "https://developer.apple.com/design/human-interface-guidelines/panels", "https://developer.apple.com/design/human-interface-guidelines/sheets", "https://developer.apple.com/design/human-interface-guidelines/modality", "https://developer.apple.com/design/human-interface-guidelines/going-full-screen", "https://developer.apple.com/design/human-interface-guidelines/multitasking", "https://developer.apple.com/design/human-interface-guidelines/tab-bars", "https://developer.apple.com/design/human-interface-guidelines/widgets", "https://developer.apple.com/design/human-interface-guidelines/keyboards", "https://developer.apple.com/design/human-interface-guidelines/settings", "https://developer.apple.com/design/human-interface-guidelines/undo-and-redo", "https://developer.apple.com/design/human-interface-guidelines/drag-and-drop", "https://developer.apple.com/design/human-interface-guidelines/pointing-devices", "https://developer.apple.com/design/human-interface-guidelines/typography", "https://developer.apple.com/design/human-interface-guidelines/materials", "https://developer.apple.com/design/human-interface-guidelines/app-icons", "https://developer.apple.com/design/human-interface-guidelines/app-shortcuts", "https://developer.apple.com/design/human-interface-guidelines/mac-catalyst", "https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass", "https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer", "https://developer.apple.com/documentation/appkit/nsfilepromiseprovider", "https://developer.apple.com/documentation/appkit/nswindow/isrestorable", "https://developer.apple.com/documentation/appkit/nsapplicationdelegate/applicationsupportssecurerestorablestate(_:)", "https://developer.apple.com/documentation/appkit/nsapplicationdelegate/applicationshouldterminateafterlastwindowclosed(_:)", "https://developer.apple.com/documentation/swiftui/settings", "https://developer.apple.com/documentation/swiftui/menubarextra", "https://developer.apple.com/documentation/swiftui/window", "https://developer.apple.com/documentation/swiftui/commandgroup", "https://developer.apple.com/documentation/swiftui/scenerestorationbehavior", "https://developer.apple.com/documentation/swiftui/scene/windowresizability(_:)", "https://developer.apple.com/documentation/swiftui/scene/defaultsize(width:height:)", "https://developer.apple.com/documentation/swiftui/view/focusedscenevalue(_:_:)", "https://developer.apple.com/documentation/swiftui/view/inspector(ispresented:content:)", "https://developer.apple.com/documentation/swiftui/view/toolbar(id:content:)", "https://developer.apple.com/documentation/swiftui/view/help(_:)", "https://developer.apple.com/documentation/swiftui/view/fullscreencover(ispresented:ondismiss:content:)", "https://developer.apple.com/documentation/swiftui/pagetabviewstyle", "https://developer.apple.com/documentation/swiftui/insetgroupedliststyle", "https://developer.apple.com/documentation/swiftui/editbutton", "https://developer.apple.com/documentation/swiftui/view/hovereffect(_:)", "https://developer.apple.com/documentation/swiftui/view/statusbarhidden(_:)", "https://developer.apple.com/documentation/swiftui/view/navigationbartitledisplaymode(_:)", "https://developer.apple.com/documentation/swiftui/searchfieldplacement/navigationbardrawer", "https://developer.apple.com/documentation/swiftui/toolbaritemplacement/bottombar", "https://developer.apple.com/documentation/swiftui/toolbaritemplacement/navigationbarleading", "https://developer.apple.com/documentation/swiftui/view/tabviewbottomaccessory(content:)", "https://developer.apple.com/documentation/swiftui/view/presentationdetents(_:)", "https://developer.apple.com/documentation/swiftui/view/swipeactions(edge:allowsfullswipe:content:)", "https://developer.apple.com/documentation/swiftui/view/refreshable(action:)", "https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:)", "https://developer.apple.com/documentation/swiftui/tabview", "https://developer.apple.com/documentation/swiftui/localizedstringkey", "https://developer.apple.com/documentation/uikit/uiviewcontroller", "https://developer.apple.com/documentation/uikit/uitabbarcontroller", "https://developer.apple.com/documentation/uikit/uiscreen", "https://developer.apple.com/documentation/uikit/uidevice", "https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator", "https://developer.apple.com/videos/play/wwdc2021/10053/", "https://developer.apple.com/videos/play/wwdc2022/10076/", "https://support.apple.com/en-us/102650", "https://support.apple.com/guide/mail/keyboard-shortcuts-mlhlb94f262b/mac", "https://support.apple.com/guide/notes/keyboard-shortcuts-and-gestures-apd46c25187e/mac", "https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/"]
updated: 2026-08-15
---

# macOS App Design — Complete Guide (macOS Tahoe 26 era)

How to design a real Mac app — window anatomy, menus, keyboard, pointer, and the conventions that separate native apps from web wrappers. Liquid Glass material details live in `apple-hig-liquid-glass`; this doc is app-structural.

*Quotation convention: wording inside quote marks is Apple's, unaltered. Typographic apostrophes and quote marks are normalised to straight ones, nested quotations are shown in single marks, and an excerpt beginning mid-sentence drops its leading connective without ellipsis. Where a claim is this document's reading rather than Apple's wording, it says so. Where Apple stops, this document says where.*

## 1. Window anatomy & types

- **Main/document windows**: freely resizable, remember size/position per window, restore state on relaunch. Set a sensible minimum (~460×300 for utility apps); content must **reflow, not letterbox**, at any size. Default first-launch size: comfortable on a 13" display (~1100×700 max), roughly centered.
- **Title bar**: traffic lights top-leading (close ⌘W, minimize ⌘M, full screen ^⌘F; ⌥-hover zoom reveals tiling options). Document windows show a **proxy icon** beside the title (drag it to move/attach the file, ⌘-click it for the path popover) and an edited/dirty indicator for unsaved changes.
- **Window tabs**: document apps should support native tabbing (View → Show Tab Bar, ⌘⇧\ cycling, Window → Merge All Windows) for free via standard window classes.
- **Window levels**: normal windows only; avoid always-on-top unless the app is a utility whose whole point is floating (color picker, timer), and then make it a setting.
- **Unified toolbar** (the modern default): toolbar merges with the title bar, ~52pt tall. Toolbar items are icon-first SF Symbols (~24pt), grouped by function; in Tahoe related actions cluster into shared Liquid Glass capsules floating over content. Support **right-click → Customize Toolbar…** with drag-to-arrange, and graceful overflow (») when the window narrows.
- **Panels**: floating auxiliary windows (torn-off inspectors, color/font panels). Non-activating, closable with Esc where transient; HUD style only in media/full-screen contexts.
- **Alerts**: app-modal sheet (document-specific) or window (app-level): icon + bold message (~13pt bold) + informative text (11pt), buttons bottom-trailing with the default (Return) rightmost and Cancel (Esc) beside it. Max 3 buttons; destructive alerts get a safe default and a "Don't ask again" checkbox where repeat-confirmed.
- **Open/Save**: always the system `NSOpenPanel`/`NSSavePanel` (users rely on their sidebar favorites, search, and expanded/collapsed state). Never a custom file browser.

### What Apple says about windows, in Apple's words

- **Two kinds.** "A *primary* window presents the main navigation and content of an app, and actions associated with them." "An *auxiliary* window presents a specific task or area in an app. Dedicated to one experience, an auxiliary window doesn't allow navigation to other app areas, and it typically includes a button people use to close it after completing the task." *(HIG › Windows)*
- **Three states, and they look different on purpose.** *Main* — "The frontmost window that people view… There can be only one main window per app." *Key* — "Also called the *active window*, the key window accepts people's input… Although the front app's main window is usually the key window, another window — such as a panel floating above the main window — might be key instead." *Inactive* — "A window that's not in the foreground." Apple's consequence for custom drawing: "**Make sure custom windows use the system-defined appearances.** People rely on the visual differences between windows to help them identify the foreground window and know which window will accept their input. When you use system-provided components, a window's background and button appearances update automatically when the window changes state; **if you use custom implementations, you need to do this work yourself.**" Apple also notes that inactive windows "don't use materials", which is why a hand-rolled translucent title bar reads wrong the moment the window loses focus.
- **Don't draw your own chrome.** "**Avoid creating custom window UI.** System-provided windows look and behave in a way that people understand and recognize. Avoid making custom window frames or controls, and don't try to replicate the system-provided appearance. Doing so without perfectly matching the system's look and behavior can make your app feel broken."
- **Don't invent a word for it.** "**Use the term *window* in user-facing content.** The system refers to app windows as *windows* regardless of type. Using different terms — including *scene*, which refers to window implementation — is likely to confuse people."
- **When to open one.** "Opening content in a separate window is great for helping people multitask or preserve context… However, opening new windows excessively creates clutter and can make navigating your app more confusing. **Avoid opening new windows as default behavior unless it makes sense for your app.**" Apple's suggested affordance is "a command in a context menu or in the File menu" (`OpenWindowAction`).
- **Bottom bars are a trap.** "**Avoid putting critical information or actions in a bottom bar, because people often relocate a window in a way that hides its bottom edge.**" The sidebar page repeats it for sidebars. This is the sourced reason an iOS bottom action bar cannot simply be moved down the Mac window.
- **Full screen is the person's choice.** "**Always let people choose when to enter full-screen mode.** Prefer letting people use your window's Enter Full Screen button, View menu item, or the Control-Command-F keyboard shortcut. **Avoid offering a custom menu of window modes.**" And: "**If necessary, adjust your layout in full-screen mode, but don't programmatically resize your window.**" *(HIG › Going full screen)*

### State restoration

The HIG does not specify restoration; the framework references do, and they are what a rule can cite.

- `NSWindow.isRestorable` (AppKit, macOS 10.7+): "A Boolean value indicating whether the window configuration is preserved between application launches." Apple's default and its instruction: "By default, the value of this property is `true` if the window's `styleMask` property includes the `NSTitledWindowMask` flag. For other windows, the value is `false`." — and "**Windows should be preserved between launch cycles to maintain interface continuity for the user.** During subsequent launch cycles, the system tries to recreate the window and restore its configuration to the preserved state. Configuration data is updated as needed and saved automatically by the system." If you enable it, "you should also specify a restoration class for the window using the `restorationClass` property."
- `NSApplicationDelegate.applicationSupportsSecureRestorableState(_:)` (macOS 12+) is the secure-coding opt-in for that state.
- SwiftUI's equivalent is per scene: `Scene.restorationBehavior(_:)` (macOS 15+, iOS 18+) taking a `SceneRestorationBehavior`. Apple's example is the *opt-out* case — a "Network Connection Test" window marked `.restorationBehavior(.disabled)` — so the default is that scenes restore, and `.disabled` is the deliberate exception for a window nobody wants back on launch.
- `NSApplicationDelegate.applicationShouldTerminateAfterLastWindowClosed(_:)` is the switch behind "closing the last window quits the app". A document app that quits when its last window closes has answered `true` where the Mac convention is `false`; Apple documents the hook without prescribing a value, so state the convention as convention, not as Apple's rule.

### Sidebar (source list)
- Leading column, translucent (sidebar material — in Tahoe it refracts the desktop/content behind). Width 220–320pt by convention, user-resizable. Collapsible — Apple's published affordances are "a show/hide button or… Show Sidebar and Hide Sidebar commands to your app's View menu" *(HIG › Sidebars, macOS)*. **The HIG's standard-shortcut table assigns the toggle no key**; the two keys Apple does publish for it live in end-user documentation rather than developer guidance — ⌥⌘S for the Finder sidebar *(Apple Support › Mac keyboard shortcuts)* and ⌃⌘S for the Mail sidebar *(Mail User Guide › Keyboard shortcuts)*. See §3.
- Rows: 24pt (small), 28pt (medium/default), 32pt (large) by convention. Apple's published statement is qualitative: "A sidebar's row height, text, and glyph size depend on its overall size, which can be small, medium, or large. **You can set the size programmatically, but people can also change it by selecting a different sidebar icon size in General settings.**" *(HIG › Sidebars, macOS)* Section headers: 11pt semibold, secondary label color — convention, not published.
- Sidebar icons take the accent color, and Apple ties this to a system setting: "By default, sidebar icons use your app's accent color. **In macOS, people can change the system accent color, which applies to all apps. When they do this, they expect all sidebar icons to appear in that color, so make sure your sidebar icons display the color people choose.**" Fixed colors are allowed sparingly — "if you use them sparingly, fixed colors can help clarify the meaning of an icon or draw attention to it", Apple's example being Mail's yellow VIP icon.
- Apple's two structural limits: "**In general, show no more than two levels of hierarchy in a sidebar.** When a data hierarchy is deeper than two levels, consider using a split view interface that includes a content list between the sidebar items and detail view." And "**Avoid hiding the sidebar by default to ensure that it remains discoverable**" — while still offering the toggle, "in macOS, you can include a show/hide button or add Show Sidebar and Hide Sidebar commands to your app's View menu."
- macOS-specific: "**Consider automatically hiding and revealing a sidebar when its container window resizes.**" And, as with the window bottom bar, "Avoid putting critical information or actions at the bottom of a sidebar. People often relocate a window in a way that hides its bottom edge."
- Sidebar = top-level navigation/collections only, not a junk drawer. Support drag-in (drop to add to a collection), context menus on every row, inline rename on Return, and reordering.

### Split views & inspector
- Standard layout: sidebar | content | **inspector** (trailing, fixed ~250–280pt, toggled by a toolbar button and `⌃⌥⌘I`/`⌥⌘I` convention). The inspector shows properties of the current selection and updates live — no Apply button, ever.
- Give every column a minimum width and let the content column absorb slack. Column dividers are draggable with a wider invisible hit area (~10pt); double-click a divider to reset.
- Content density: macOS body text is **13pt** (system scale: largeTitle 26 · title1 22 · title2 17 · title3 15 · headline 13 bold · body 13 · callout 12 · subheadline 11 · footnote 10 · caption 10). Controls come in large/regular/small/mini — regular (~22pt-tall buttons) for most UI. Do NOT ship 44pt iOS-density controls on the Mac.

### Tables & outlines
- Real tables have: sortable click-able column headers, draggable column resize/reorder, alternating row backgrounds for wide tables, type-select, multi-column sort indicators, and a context menu on headers to show/hide columns.
- Rows 24–28pt; text truncates with middle-ellipsis for file paths, tail elsewhere; tooltips reveal full truncated values on hover.
- Double-click = open/act; single click = select; Return = rename (Finder convention) or activate (list-of-actions convention) — pick the family your app belongs to and be consistent.

### Metrics quick reference

| Element | Spec |
|---|---|
| Unified toolbar height | ~52pt (compact style ~38pt) |
| Toolbar symbols | ~24pt SF Symbols, regular weight |
| Sidebar width | 220–320pt, resizable; collapse via a View-menu command — the HIG's standard-shortcut table carries no entry for the toggle (§3) |
| Sidebar rows | 24 / 28 / 32pt (small / medium / large) |
| Inspector width | ~250–280pt fixed |
| Table/list rows | 24–28pt |
| Body text | 13pt (11pt small controls, 10pt mini) |
| Push button (regular) | ~22pt tall; large ~28pt |
| Control size | **28×28pt default, 20×20pt minimum** — Apple's published figures |
| Form/content margins | 20pt; 8pt between related controls |
| Alert width | ~260pt content column |

**Which of these numbers are Apple's.**

*Published, and citable as such:* the menu bar height (24 pt, HIG › The menu bar); the macOS body size (13 pt) and recommended minimum (10 pt) and the full macOS text-style scale (HIG › Typography); the split-view thin divider width — "The thin divider measures one point in width" (HIG › Split views, macOS); and **macOS control size: 28×28 pt default, 20×20 pt minimum**, from the table under "Offer sufficiently sized controls" in HIG › Accessibility › Mobility, which gives a default and a minimum for every platform (iOS/iPadOS 44×44 / 28×28; macOS 28×28 / 20×20; tvOS 66×66 / 56×56; visionOS 60×60 / 28×28; watchOS 44×44 / 28×28). The same page publishes spacing: "it works well to add about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding works well around the element's visible edges." Apple's force is advisory — its instruction is "**Strive to meet** the recommended minimum control size for each platform to ensure controls and menus are comfortable for all when tapping and clicking" — so a macOS control below 20×20 pt is a finding **with a published Apple figure behind it**, which is more than a stylistic note and less than a violation. See `apple-accessibility` for the full treatment.

*Published only qualitatively — which means the numbers in the table above are still convention:* sidebar row height and glyph size follow a small/medium/large setting people change in General settings, and HIG › Sidebars states that without attaching **a point value to any of the three**. So the 24 / 28 / 32pt row heights above are measured, not quoted, and fall under the catch-all below like anything else this note gives no Apple figure for.

*Not found on any Apple page searched:* the unified-toolbar height, the toolbar symbol size, sidebar and inspector widths, table row heights, the alert width, push-button heights, and the form/content margins. Searched: HIG › Toolbars, Windows, Sidebars, Split views, Layout, Alerts and Accessibility (JSON, **including every table node**, since Apple's specifications live in table nodes and not in the prose); the `NSToolbar`, `NSSplitViewController` and `NavigationSplitView` references plus their `metadata.platforms[]` and `deprecationSummary`; and the WWDC transcript corpus enumerated from `videos/all-videos/`.

**Everything in the table above that this note does not attach an Apple point figure to is a working convention** measured from shipping Apple apps — good defaults, not specifications, whether or not it is named in the paragraphs above, and whether or not Apple describes it qualitatively. **A rule must not report a deviation from a convention as a HIG violation.** The published figures are fair game.

*(Phrased as "not found on the pages searched" rather than "Apple does not publish" on purpose: an absence claim is a claim about the search, not about Apple. Four absence claims in this package turned out to be wrong, each because one surface went unchecked. The scoped form makes a future correction a matter of adding a page rather than reversing an assertion.)*

### Loading, progress, empty states

- Empty views: centered symbol + one-line explanation + the action that fills the view ("Create your first project", drag-and-drop hint). Never a blank white pane.
- Progress: determinate bars whenever total is knowable; indeterminate spinners (16pt inline, 32pt view-level) only briefly. Long operations belong in a non-blocking progress UI with Cancel — never a modal that locks the window for minutes.
- Errors: inline where the problem is (form field, row badge) with recovery wording; alerts only for blocking failures. Include the failing detail ("Couldn't save 'Report.md' — disk full"), not error codes.

## 2. The menu bar

The menu bar is the app's **command inventory**, and Apple states the reason in the HIG rather than leaving it to convention: "People look in the menu bar when searching for app-specific commands, especially when using an app for the first time. Even when commands are available elsewhere in your app, it's important to list them in the menu bar. Putting commands in the menu bar makes them easier for people to find, lets you assign keyboard shortcuts to them, and makes them more accessible to people using Full Keyboard Access. **Excluding commands from the menu bar — even infrequently used or advanced commands — risks making them difficult for everyone to find.**" *(HIG › The menu bar, App-specific menus)*

The toolbar page states the same rule from the other side: "**Make every toolbar item available as a command in the menu bar.** Because people can customize the toolbar or hide it, it can't be the only place that presents a command." It also states the converse, which a completeness rule must not invert: "it doesn't make sense to provide a toolbar item for every menu item, because not all menu commands are important enough or used often enough to warrant space in the toolbar." *(HIG › Toolbars, macOS)*

### Order

Apple lists the top-level menus in this order, and this is the whole list it gives: **app name · File · Edit · Format · View · app-specific menus, if any · Window · Help.** macOS adds the Apple menu at the leading end (you "can't modify or remove it") and menu bar extras at the trailing end. Custom menus go **between View and Window** — "Aim to list app-specific menus in order from most to least general or commonly used." *(HIG › The menu bar, Anatomy and App-specific menus)*

Apple supplies a "short version of your app's name" for the app menu title, and prefers **one-word menu titles**: "One-word menu titles work especially well in the menu bar because they take little space and are easy for people to scan."

### What each standard menu holds

Apple publishes a table per menu naming the items and what each does. The load-bearing contents, in Apple's order:

| Menu | Items Apple lists |
|---|---|
| **App** (bold app name) | About *App* · Settings… · optional app-specific items · Services *(macOS only)* · Hide *App* *(macOS only)* · Hide Others *(macOS only)* · Show All *(macOS only)* · Quit *App* |
| **File** | New *Item* · Open · Open Recent · Close · Close Tab · Close File · Save · Save All · Duplicate · Rename… · Move To… · Export As… · Revert To · Page Setup… · Print… |
| **Edit** | Undo · Redo · Cut · Copy · Paste · Paste and Match Style · Delete · Select All · Find ▸ · Spelling and Grammar ▸ · Substitutions ▸ · Transformations ▸ · Speech ▸ · Start Dictation · Emoji & Symbols |
| **Format** *(formatted-text apps only)* | Font ▸ · Text ▸ |
| **View** | Show/Hide Tab Bar · Show All Tabs / Exit Tab Overview · Show/Hide Toolbar · Customize Toolbar · Show/Hide Sidebar · Enter/Exit Full Screen |
| **Window** | Minimize · Zoom · Show Previous Tab · Show Next Tab · Move Tab to New Window · Merge All Windows · Enter/Exit Full Screen · Bring All to Front · *open windows, listed alphabetically* |
| **Help** | Send *App* Feedback to Apple · *App* Help · additional items, after a separator |

*(HIG › The menu bar — App menu, File menu, Edit menu, Format menu, View menu, Window menu, Help menu.)* Apple adds **Start Dictation** and **Emoji & Symbols** to the bottom of the Edit menu automatically, so an app does not ship them itself.

Rules Apple attaches to these tables, in Apple's words:

- "**Always show the same set of menu items.** Keeping menu items visible helps people learn what actions your app supports, even if they're unavailable in the current context. **If a menu bar item isn't actionable, disable the action instead of hiding it from the menu.**"
- "**Support the default system-defined menus and their ordering.** In many cases, the system implements the functionality of standard menu items so you don't have to."
- "**Support the keyboard shortcuts defined for the standard menu items you include.** Define custom keyboard shortcuts only when necessary."
- "Ensure that each show/hide item title reflects the current state of the corresponding view. For example, when the toolbar is hidden, provide a Show Toolbar menu item; when the toolbar is visible, provide a Hide Toolbar menu item." — Apple specifies the **title flip**, not a check mark, for these.
- "**Provide a View menu even if your app supports only a subset of the standard view functions.** For example, if your app doesn't include a tab bar, toolbar, or sidebar, but does support full-screen mode, provide a View menu that includes only the Enter/Exit Full Screen menu item." Likewise: "**Provide a Window menu even if your app has only one window.** Include the Minimize and Zoom menu items so people using Full Keyboard Access can use the keyboard to invoke these functions."
- The View/Window split is explicit and easy to get backwards: the Window menu "doesn't help people customize the appearance of windows or close them" — customization is View, closing is File.
- **Where Apple stops:** the HIG does not state a maximum submenu depth, an items-per-group figure, or an ellipsis rule for the menu bar page. Apple's ellipsis convention lives on the File menu row for Open — "an ellipsis follows the command to indicate that more input is required" — and is stated there only.

### Dynamic menu items

Apple's name for the ⌥-reveals-an-alternate pattern is a **dynamic menu item**, and it calls the case rare: "In rare cases, it can make sense to present a dynamic menu item." Its three rules are:

- "**Avoid making a dynamic menu item the only way to accomplish a task.** Dynamic menu items are hidden by default."
- "**Use dynamic menu items primarily in menu bar menus.** Adding a dynamic menu item to contextual or Dock menus can make the item even harder for people to discover."
- "**Require only a single modifier key to reveal a dynamic menu item.**" (Developer surface: `isAlternate`.)

The ones the system itself defines: Close → Close All, Close Tab → Close Other Tabs, Duplicate → Save As, Minimize → Minimize All, Zoom → Zoom All, Quit → Quit and Keep Windows, Bring All to Front → Arrange in Front.

### Menu bar extras

- Apple's own framing is narrow: a menu bar extra "exposes app-specific functionality using an icon that appears in the menu bar when your app is running, even when it's not the frontmost app." SwiftUI surface: `MenuBarExtra` (macOS 13+, and **macOS only** — it exists on no other platform).
- "**Display a menu — not a popover — when people click your menu bar extra.** Unless the app functionality you want to expose is too complex for a menu, avoid presenting it in a popover."
- "**Let people — not your app — decide whether to put your menu bar extra in the menu bar.** Typically, people add a menu bar extra to the menu bar by changing a setting in an app's settings window."
- "**Avoid relying on the presence of menu bar extras.** The system hides and shows menu bar extras regularly, and you can't be sure which other menu bar extras people have chosen to display or predict the location of your menu bar extra." When space is tight, "the system prioritizes the display of menus and essential menu bar extras" — menus win.
- Icon: "Both interface icons and symbols use black and clear colors to define their shapes; the system can apply other colors to the black areas in each image so it looks good on both dark and light menu bars, and when your menu bar extra is selected. **The menu bar's height is 24 pt.**"
- Apple's suggested backstop is a Dock menu — "Consider exposing app-specific functionality in other ways, too. For example, you can provide a Dock menu that appears when people Control-click your app's Dock icon." Apple's reason: people can hide a menu bar extra or decline to use it, whereas a Dock menu is available whenever the app is running.

## 3. Keyboard-first design

Apple's definition: "A *keyboard shortcut* is a combination of a primary key and one or more modifier keys (Control, Option, Shift, and Command) that map to a specific command." *(HIG › Keyboards)*

- "**Respect standard keyboard shortcuts.** While using most apps, people generally expect to rely on the standard keyboard shortcuts that work in other apps and throughout the system."
- "**In general, don't repurpose standard keyboard shortcuts for custom actions.** Only consider redefining a standard shortcut if its action doesn't make sense in your experience." Apple's own example: an app with no text editing has no use for Italic, so ⌘I could become Get Info.
- "**Define custom keyboard shortcuts for only the most frequently used app-specific commands.** People appreciate using keyboard shortcuts for actions they perform frequently, but defining too many new shortcuts can make your app seem difficult to learn."

### Modifiers, in Apple's ranking

| Modifier | Apple's recommended usage |
|---|---|
| Command | "Prefer the Command key as the main modifier key in a custom keyboard shortcut." |
| Shift | "Prefer the Shift key as a secondary modifier that complements a related shortcut." |
| Option | "Use the Option modifier sparingly for less-common commands or power features." |
| Control | "**Avoid using the Control key as a modifier.** The system uses Control in many systemwide features and shortcuts, like moving focus or capturing screenshots." |

*(HIG › Keyboards, Custom keyboard shortcuts.)* Apple's stated display order is **Control, Option, Shift, Command** — "If you use more than one modifier key in a custom shortcut, always list them in this order" — which is the ⌃⌥⇧⌘ glyph order. Two more rules from the same section: "**Avoid adding Shift to a shortcut that uses the upper character of a two-character key**" (so Help is ⌘? not ⇧⌘/), and "**Avoid creating a new shortcut by adding a modifier to an existing shortcut for an unrelated command.**" The system localizes and mirrors shortcuts for you: "The system automatically localizes a shortcut's primary and modifier keys to support the currently connected keyboard; if your app or game switches to a right-to-left layout, the system automatically mirrors the shortcut."

### Standard shortcut vocabulary — the ones Apple publishes

Apple ships one table of these, headed "People expect each of the following standard keyboard shortcuts to perform the action listed in the table below." Every row here comes from that table; the descriptions are Apple's, abridged where its cell runs long.

| Shortcut | Apple's action | Shortcut | Apple's action |
|---|---|---|---|
| ⌘N | Open a new document | ⌘Z / ⇧⌘Z | Undo / Redo |
| ⌘O | Display a dialog for choosing a document to open | ⌘X ⌘C ⌘V | Cut / Copy / Paste |
| ⌘W | Close the active window | ⇧⌘V | Paste as (Paste as Quotation, for example) |
| ⇧⌘W | Close a file and its associated windows | ⌥⇧⌘V | Paste, applying the surrounding text's style |
| ⌥⌘W | Close all windows in the app | ⌘A / ⇧⌘A | Select all / Deselect all |
| ⌘S | Save a new document or save a version | ⌘F / ⌘G / ⇧⌘G | Find / Find next / Find previous |
| ⇧⌘S | Duplicate the active document, or Save As | ⌘E | Use the selection for a find operation |
| ⌘P / ⇧⌘P | Print / Page Setup | ⌥⌘F | Jump to the search field control |
| ⌘Q | Quit the app | ⌘B ⌘I ⌘U | Bold / Italic / Underline |
| ⌘, | Open the app's settings window | ⌘T | **Display the Fonts window** |
| ⌘M / ⌥⌘M | Minimize the active window / all of them | ⌥⌘T | **Show or hide a toolbar** |
| ⌘H / ⌥⌘H | Hide this app's windows / all other apps' | ⌥⌘I | **Display an inspector window** |
| ⌘? | Open the app's Help menu | ⌘I | Display an Info window |
| ⌃⌘F | Enter full screen | ⌘J | Scroll to a selection |
| ⌘` / ⇧⌘` | Activate the next / previous window in this app | ⌘. | Cancel an operation |
| ⌘− / ⇧⌘= | Decrease / increase the size of the selection | Esc | Cancel the current action or process |

*(HIG › Keyboards, Standard keyboard shortcuts.)* Full Keyboard Access ships its own reserved set in the same table: ⌃F2 moves focus to the menu bar, ⌃F3 to the Dock, ⌃F4 to the next window, ⌃F5 to the toolbar, ⌃F6 to the first or next panel, and ⌃Tab / ⌃⇧Tab move between control groups.

**Three of these are the ones a web-shaped app most often gets wrong**, and they are called out in bold above: ⌘T is the **Fonts window**, not New Tab; ⌥⌘T toggles the toolbar; ⌥⌘I opens an **inspector**. An app that binds ⌘T to a new tab is repurposing a standard shortcut — defensible under Apple's "if its action doesn't make sense in your experience" clause for an app with no fonts, and Safari does exactly this, but it is a repurposing and not the standard.

**What the HIG's standard table does not define.** These are widely used Mac conventions that the standard table does not contain, checked against the HIG keyboards page, the HIG menu bar page, the SwiftUI `keyboardShortcut(_:modifiers:)` reference, Apple's end-user shortcut documentation and the WWDC transcript corpus:

- **A sidebar toggle.** The View menu carries a "Show/Hide Sidebar" item, and **the HIG's standard-shortcut table assigns it no key** — the ~120-row table has no sidebar entry. Apple binds two different keys to it in its *end-user* documentation: "Option-Command-S : Hide or show the Sidebar in Finder windows" *(Apple Support › Mac keyboard shortcuts)*, and, in Mail's shortcut table, "Hide or show the Mail sidebar — Control-Command-S" *(Mail User Guide › Keyboard shortcuts)*. Notes' published shortcut list carries no sidebar toggle. So the accurate statement is that **⌥⌘S is Finder's and ⌃⌘S is Mail's, both published for users rather than for developers, and the HIG gives app developers no standard at all.** A rule must not assert either key as the HIG's, and must not tell an app that binds ⌥⌘S or ⌃⌘S that it invented the key.
- **A toolbar-customization, refresh (⌘R), delete-to-Trash (⌘⌫), view-mode (⌘1…9), or new-tab shortcut.**
- **Zoom-to-actual-size (⌘0) and content zoom (⌘+/⌘−).** Apple's ⌘− and ⇧⌘= change *the size of the selection*; ⌥⌘− and ⌥⌘= are the system's screen-zoom bindings, an accessibility feature, not content zoom.

For all of these, the sourced claim is the *menu item*, not the key. Write the rule against the menu.

- Other expected behaviors, from the same table and the pointing/selection pages: Esc cancels · ⌘. cancels an operation · ⇧-arrow extends the selection by a character, ⌥⇧-arrow by a word, ⇧⌘-arrow to the end of the line or document · ⌃-arrow "Move focus to another value or cell within a view, such as a table" · Tab/⇧Tab moves focus, ⌃Tab moves between control groups.
- **Full Keyboard Access** must work. Apple's scope statement: "Available in iOS, iPadOS, macOS, and visionOS, **Full Keyboard Access lets people navigate and activate windows, menus, controls, and system features using only the keyboard.**" It is the reason Apple gives for putting Minimize and Zoom in the Window menu at all, and for listing every command in the menu bar. Test it by turning it on in the Accessibility area of Settings.
- WWDC states the responder consequence a keyboard audit usually misses: "Because menu bar and key command actions are routed starting from the first responder, make sure that the views that would be the target of those actions can become first responder and can accept focus… Since a Mac app must rely less on direct manipulation of views, and more on the user selecting a view and then selecting an action from the main menu, the ability for more of your app's views to become first responder and focused becomes more important." *(WWDC21 › Qualities of a great Mac Catalyst app)* A view that cannot become first responder makes its own menu items permanently dim.
- Text editing honors all system behaviors: ⌥-arrow word jumps, standard emacs bindings (⌃A/⌃E/⌃K), smart quotes/dashes settings, dictation, Password AutoFill, and the user's custom text replacements.
- Design "keyboard flows": the core loop of the app (triage mail, tag photos, move tasks) should be completable without touching the pointer. Power users judge the app on this within minutes.

## 4. Settings, About, onboarding

- **Settings window**: reached from the Settings item in the **App menu** and by ⌘, — put it there, not in a window toolbar, where it would eat space meant for frequent commands. Document-level options go in the File menu instead.
- Navigate panes with a **noncustomizable toolbar** that stays visible and always shows which pane is active; people rely on a stable settings interface to find things. Update the window title to name the current pane (or "*App Name* Settings" when there's only one), and reopen on the pane last used.
- **Dim the minimize and maximize buttons.** ⌘, is fast enough that the window never needs to live in the Dock, and the window sizes itself to the current pane.
- Put only general, infrequently changed options here — people must suspend what they're doing to reach them. Anything task-specific (show/hide parts of a view, reorder a collection, filter a list) belongs in the screen it affects.
- **Minimize the number of settings.** Too many make the app feel less approachable and bury the one a person came for. Never restate a systemwide setting: a duplicate implies the system's own choice might not apply to you.
- **About window**: small fixed panel with icon, app name, version + build, copyright, optional scrolling Credits. Don't turn it into a marketing page; do link acknowledgements/licenses there.
- **Onboarding**: Mac apps mostly skip it. Acceptable patterns: a single welcome window (recents + "New Document" + template picker), or one-screen permission priming for tools needing Accessibility/Screen Recording/Full Disk access — explain why, deep-link to the exact System Settings pane, and detect the grant live so the user never hunts. Never a swipe-through carousel; never gate launch on login for a local tool.

## 5. macOS Tahoe 26 / Liquid Glass on the desktop

- Toolbars, sidebars, and menus are Liquid Glass: they refract the content and desktop behind them; content scrolls under bars with a scroll-edge effect (progressive blur). Don't paint opaque bar backgrounds and don't stack custom glass on system glass.
- The **menu bar is completely transparent** in Tahoe, which makes the display feel larger — and makes menu bar extras sit directly on the wallpaper. Define extras with black-and-clear shapes (an interface icon or SF Symbol) so the system can recolor them for light and dark bars and for the selected state. The menu bar is 24pt tall.
- Windows and controls use **concentric corner radii** aligned to the window's rounded corners; derive nested radii from the container, never hardcode. Controls lean capsule-shaped and slightly taller; menus/popovers morph out of the control that opened them.
- Adopt by compiling with Xcode 26 and *removing* customizations rather than adding any. Test with Reduce Transparency and Increase Contrast — glass falls back to opaque and layouts must survive.
- **App icon**: the system masks every layer edge to produce the final rounded-rectangle shape, so supply square, unmasked layers and keep content centred. **Irregularly shaped icons receive a system-provided background** — a freeform silhouette is no longer a Mac icon style. Author a layered **Icon Composer** file (max four groups, 1024×1024 canvas, blurs/shadows/specular removed before export); the system renders the default, dark, clear, and tinted appearances plus the glass depth. Adding the Icon Composer file replaces your icon asset catalog, and Xcode generates a similar-looking icon for earlier releases automatically — keep the asset catalog only if you want your *old* icon to appear there.
- Desktop and Dock host widgets that come to life in light or dark appearances. Model core commands as App Intents and expose them as App Shortcuts, which people reach through Siri, Spotlight, and the Shortcuts app.
- Mac widgets follow the iOS widget rules (glanceable, deep-linking) and "widgets use smaller margins on the desktop on Mac and on the Lock Screen" than the 16pt standard — verify legibility there. **But the Mac's rendering modes are not the iPhone's**: Apple's per-platform table gives Mac *full-color* on the Desktop and in Notification Center, *vibrant* on the Desktop, and **accented "Not supported"**. *(HIG › Widgets, Appearances)* So the tinted/clear Home Screen appearances a widget must survive on iPhone do not apply on the Mac; the contrast case to test there is the vibrant desktop rendering.
- The compatibility opt-out (`UIDesignRequiresCompatibility`) is temporary and the system ignores it once you build for macOS 27 or later; treat Liquid Glass as the only target. Screenshots and marketing imagery should show the Tahoe appearance — pre-26 chrome instantly dates the product page.
- Full-height sidebars now extend behind the toolbar region; use the safe-area APIs rather than hardcoding a title-bar offset, and let the scroll-edge effect handle content/bar separation.

## 6. Typography, color, and materials

- System font is SF Pro at the 13pt-body scale (table above in §1). Apple's *recommended minimum* text size on macOS is **10pt** — a legibility recommendation covering custom and system fonts alike, not a limit the OS enforces. **macOS does not support Dynamic Type** — unlike iOS, there is no user text-size dial to design against. Still use the built-in text styles rather than fixed sizes, so weights and leading come from the system.
- Semantic colors only: `labelColor`, `secondaryLabelColor`, `tertiaryLabelColor`, `windowBackgroundColor`, `controlBackgroundColor`, `separatorColor`, plus `controlAccentColor` for the user's chosen accent. Hardcoded hex breaks dark mode, accent settings, and increased-contrast mode.
- **Vibrancy**: text/symbols on sidebar and toolbar materials should use vibrant label colors (automatic with system components) so they modulate with the material — flat gray text on a vibrant sidebar is a port tell.
- Emphasis hierarchy: one accent-tinted control per context (default button); everything else neutral. Destructive menu/dialog actions in red only when they destroy data.
- Dark mode is a separate design pass: check shadow legibility, image assets with baked white backgrounds, and desaturated accent contrast.

## 7. Notifications, Dock, and background behavior

- Notifications go through the system Notification Center: title ≤ ~40 chars, actionable buttons where a one-click response exists, thread grouping, and correct interruption level. Never build an in-app toast system for OS-level events.
- **Dock badge**: a count of items needing attention (unread, failed) — not a marketing beacon; keep it accurate and clear it when the user has seen the items. Dock icon menu (right-click) should offer the app's quick actions (New Window, recent documents).
- Long-running work continues when windows close; reflect progress in the Dock icon (determinate progress bar) or a menu bar extra, not a blocking modal.
- Support **Sudden Termination** and login-item restraint: background helpers show up in System Settings → Login Items with your app's name — earn their place.

## 8. Pointer, trackpad, context menus, drag & drop

- **Hover is information**: tooltips on every toolbar icon and truncated label (~1s delay), row hover reveals inline affordances (subtle — the list shouldn't shimmer), ghost/toolbar buttons get a soft hover background. Standard push buttons do NOT react to hover — that's a web tell.
- Cursor stays default except: I-beam over editable/selectable text, pointing hand only for web-style links, resize arrows on dividers/edges, open-hand/closed-hand for pannable canvases.
- **Context menus everywhere**: right-click on any object offers its relevant actions — same names and shortcut glyphs as the menu bar. A context menu must never be the *only* home of an action.
- **Drag & drop is a first-class transport**: drag content out (text, images, files — provide file promises so drops materialize real files), accept drops in with a highlighted target (inset ring / row gap indicator), multi-item drags show a badge count, containers spring-load on hover, ⌥-drag copies. Every drag is cancelable with Esc; a failed drop animates back to source.
- Trackpad: honor system scroll elasticity/momentum, pinch-zoom where zoom exists, two-finger swipe-back where history exists, rotate where rotation exists; never hijack system gestures (Mission Control, Spaces swipes).

## 9. What makes an app "Mac-assed" (vs a web wrapper)

Concrete tells, in priority order:
1. **Density & metrics** — 13pt body, 24–28pt rows, mini/small controls where appropriate, compact padding. iOS-sized (17pt text / 44pt controls) chrome instantly reads as a port.
2. **Resizable everything** — any window size works; panels collapse before content squishes; no fixed-canvas layouts. Set a minimum *and* a maximum size so nothing overlaps at one extreme or breaks at the other, and support full-screen mode.
3. **Multiple windows** — ⌘N opens another window/document; two projects side by side; state is per-window, not per-app. Closing the last window conventionally doesn't quit a document app — the switch is `applicationShouldTerminateAfterLastWindowClosed(_:)`, which Apple documents without recommending a value, so this is convention rather than Apple's rule (see §1).
4. **Undo everywhere** — every mutating action goes through the undo stack with named entries ("Undo Move Card"), effectively unlimited depth, ⌘Z/⇧⌘Z. Confirmation dialogs are a smell; undo is the Mac answer to mistakes.
5. **Document model** (content apps) — real files users own in Finder: autosave + Versions (Revert To ▸ Browse All Versions…), Rename/Move via the title-bar menu, proxy-icon drag, Open Recent, Quick Look previews, correct UTI/file icons.
6. **Selection model** — click selects, ⌘-click toggles, ⇧-click extends, drag-marquee where spatial; selection in an inactive window turns gray, not accent-colored.
7. **System integration** — respects accent + highlight color, native dark mode, Shortcuts/AppleScript automation, Services menu, Share menu, Spotlight indexing, system notifications with actions, Handoff/Continuity where data syncs, Sudden Termination support.
8. **Instant** — cold-launches to a usable window in under a second; no splash screen, no loading shell, no "checking for updates" blocking launch.
9. **Text behaves** — content text is selectable and copyable; labels aren't; fonts render with system smoothing; find (⌘F) works in any long view.

Anti-patterns that scream wrapper:
- Custom-drawn traffic lights, title bar, or window chrome; in-window hamburger menu; bottom tab bars
- Hover effects on every element and web-style cursors (pointing hand on buttons)
- The browser context menu, or no context menus at all
- ⌘-shortcuts that exist nowhere in the menu bar; Esc and Return doing nothing in dialogs
- Electron-default 14px web fonts and 44pt touch paddings; scrollbars that ignore the system setting
- "Sign out" as the only File-menu item; update prompts rendered inside the window content
- Single fixed-size window; no state restoration; multi-second launch with a splash screen

## 10. Platform fit: what is iOS-only and does not belong on macOS

This is the section to cite when an app is iOS-shaped and shipped on the Mac. It separates three different failures, because they need three different remedies and only one of them is a compile error.

### A. Does not exist on macOS at all

Apple publishes each symbol's platform availability in the API reference. Every entry below lists iOS, iPadOS and **Mac Catalyst** but **not macOS** — Mac Catalyst is a separate platform from macOS in Apple's availability data, so "it builds for my Catalyst target" is not evidence that it exists in a native macOS app.

| Symbol | Apple lists it on | What it is |
|---|---|---|
| `fullScreenCover(isPresented:onDismiss:content:)` | iOS 14+, iPadOS, Mac Catalyst, tvOS, visionOS, watchOS | "Presents a modal view that covers as much of the screen as possible" |
| `PageTabViewStyle` (`.tabViewStyle(.page)`) | iOS 14+, iPadOS, Mac Catalyst, tvOS, visionOS, watchOS | paged swiping `TabView` |
| `InsetGroupedListStyle` (`.listStyle(.insetGrouped)`) | iOS 14+, iPadOS, Mac Catalyst, visionOS | the iOS Settings list look |
| `EditButton` | iOS 13+, iPadOS, Mac Catalyst, visionOS | "A button that toggles the edit mode environment value" |
| `hoverEffect(_:)` | iOS 13.4+, iPadOS, Mac Catalyst, tvOS, visionOS | the iPad pointer-hover effect |
| `navigationBarTitleDisplayMode(_:)` | iOS 14+, iPadOS, Mac Catalyst, visionOS, watchOS | large-vs-inline title |
| `SearchFieldPlacement.navigationBarDrawer` | iOS 15+, iPadOS, Mac Catalyst, visionOS, watchOS | "The search field appears in the navigation bar" |
| `ToolbarItemPlacement.bottomBar` | iOS 14+, iPadOS, Mac Catalyst, tvOS 18+, visionOS, watchOS 10+ | the iOS bottom toolbar |
| `tabViewBottomAccessory(content:)` | iOS 26+, iPadOS 26+, Mac Catalyst 26+ | the Now Playing–style persistent accessory |
| `statusBarHidden(_:)` | iOS 13+, iPadOS, Mac Catalyst, visionOS | **deprecated** — "Use `.toolbarVisibility(_, for: .statusBar)` instead" |
| `ToolbarItemPlacement.navigationBarLeading` | iOS 14+, iPadOS, Mac Catalyst, tvOS, visionOS | **deprecated** — "Use `topBarLeading` instead." |
| All of UIKit's app scaffolding — `UIViewController`, `UITabBarController`, `UIScreen`, `UIDevice`, `UIApplication.shared`, `UIImpactFeedbackGenerator` | iOS, iPadOS, Mac Catalyst (+ visionOS for some) | there is no macOS row on any of them |

The last two deprecations are invisible in the rendered documentation page's prose — they live in the page's own JSON metadata, which is where an audit should read them from.

### B. Exists on macOS, but the HIG puts a different pattern there

These compile. Apple's design guidance still points somewhere else, so the rule has to cite the HIG rather than an availability table — and has to be written as a design finding, not a build error.

| It compiles on macOS | What Apple's HIG says to do instead |
|---|---|
| `TabView` — macOS 10.15+, and HIG › Tab bars says "No additional considerations for macOS" | The Mac Catalyst page is the one that takes a position: "**If you use a tab bar in your iPad app, consider using a split view with a sidebar or a segmented control.**" A segmented control "can work well on the Mac if your app uses a flat navigation hierarchy", but "In general, using a split view instead of a tab bar works better than using a segmented control." Either way: "**Make sure people retain access to important tab-bar items in the Mac version of your app.** Regardless of whether you use a split view or a segmented control instead of a tab bar, be sure to give people quick access to top-level items by listing them in the macOS View menu." |
| `sheet(...)` — all platforms | "In a macOS experience, you might want to open a new window or let people enter full-screen mode instead of using a sheet. For example, **a self-contained task like editing a document tends to work well in a separate window**, whereas going full screen can help people view media." And for a repeated input/observe loop: "**Use a panel instead of a sheet if people need to repeatedly provide input and observe results.**" *(HIG › Sheets)* |
| `presentationDetents(_:)` — macOS 13+ | The HIG discusses detents only under **iOS, iPadOS**, and says "**Designed for iPhone**, detents specify particular heights at which a sheet naturally rests." A half-height draggable sheet on a Mac window is the API working and the pattern misapplied. |
| `swipeActions(...)` — macOS 12+ | macOS expects a context menu on every object: "**Mac users tend to expect every object in your app to offer a context menu of relevant actions.**" *(HIG › Mac Catalyst, Menus)* Swipe is not a Mac input. |
| `refreshable(action:)` — macOS 12+ | Pull-to-refresh has no pointer equivalent; the Mac answer is a menu command with a shortcut. Note that ⌘R does **not** appear in the HIG's standard-shortcut table (see §3) — cite the menu item, not the key. |
| A sheet dismissed from a top-leading Cancel | Apple states the dismissal convention per platform: "in iOS, iPadOS, and watchOS apps, people typically expect to find a button in the top toolbar or swipe down; **in macOS and tvOS apps, people expect to find a button in the main content view.**" *(HIG › Modality)* |
| Controls parked on the bottom or side screen edges | "**Relocate buttons from the side and bottom edges of the screen.** On iPad, placing buttons on these screen edges can help people reach them, but on a Mac, this ergonomic consideration doesn't apply. You may want to relocate these controls to other areas or put them in the toolbar of your macOS window." *(HIG › Mac Catalyst, Layout)* Reinforced by the windows page's bottom-bar warning above. |
| A single-column iPad layout stretched wide | "Divide a single column of content and actions into multiple columns." · "Present an inspector UI next to the main content instead of using a popover." · "**As much as possible, adopt a top-down flow.** Mac apps place the most important actions and content near the top of the window." *(HIG › Mac Catalyst, Layout)* |

### C. Exists only on macOS, so an iOS-shaped app simply never wrote it

The absence of these is the strongest signal that an iOS app was shipped on the Mac without a Mac pass. All availability is Apple's.

| Symbol | Availability | What its absence means |
|---|---|---|
| `Settings { }` scene | **macOS 11+, macOS only** | No ⌘, and no Settings item in the app menu — the scene wires both automatically |
| `MenuBarExtra` | **macOS 13+, macOS only** | No menu bar extra (only relevant for background utilities) |
| `Window` (single-instance scene) | **macOS 13+**, visionOS 26+ | Every window is a `WindowGroup`, or there is only one |
| `commands { }` / `CommandGroup` / `CommandMenu` | macOS 11+, iOS 14+ | The menu bar is whatever SwiftUI's skeleton gave you |
| `focusedSceneValue(_:_:)` / `FocusedValue` | macOS 12+, iOS 15+ | Menu items cannot enable and disable per active window and selection, so they are permanently on or permanently dim |
| `windowResizability(_:)`, `defaultSize(width:height:)` | macOS 13+, iOS 17+ | First-launch size and minimum size were never chosen |
| `Scene.restorationBehavior(_:)`, `NSWindow.isRestorable` | macOS 15+ / macOS 10.7+ | Nothing was decided about relaunch state |
| `toolbar(id:content:)` | macOS 11+ (all platforms) | The toolbar is not customizable, which the HIG asks for on macOS and iPadOS |
| `inspector(isPresented:content:)` | macOS 14+, iOS 17+ | Detail lives in a popover or a sheet instead of beside the content |
| `help(_:)` | macOS 13+ (all platforms) | No tooltips on toolbar icons |

### Catalyst and SwiftUI multiplatform pitfalls

- **Never ship the iPad idiom raw.** Apple: "Xcode defaults to the 'Scale Interface to Match iPad' setting, or *iPad idiom*… text and graphics may appear slightly less detailed because **iPadOS views and text scale down to 77% in macOS** when you use the iPad idiom. For example, the system scales text that uses the iPadOS baseline font size of 17pt down to 13pt in macOS." The Mac idiom "renders at 100% of its configured size, which can appear too large without adjustment", and Apple is explicit about the cost: "**When you adopt the Mac idiom, thoroughly audit your app's layout, and plan to make changes to it.**" Budget the audit rather than shipping the scaled build. *(HIG › Mac Catalyst, Choose an idiom)*
- Apple's own list of what an iPad app already has to have to be a good candidate: drag and drop, keyboard navigation and shortcuts, multitasking, and multiple windows — "By supporting multiple scenes on iPad, you also get support for multiple windows in the macOS version of your app." And its list of what makes an app unsuitable: an experience whose essentials need "gyroscope, accelerometer, or rear camera, frameworks like HealthKit or ARKit", or whose "primary function… is something like marking, handwriting, or navigation."
- Build the menu bar deliberately. WWDC's instruction is unambiguous: "If your app already supports keyboard shortcuts by returning key commands from its responders, **add these commands to the main menu using the menu builder API instead. Moving all your keyboard shortcuts to the main menu makes them discoverable even when they are not currently enabled.**" And: "**Actions performed with gestures on an iPad should also be accessible by selecting items from the main menu.**" *(WWDC21 › Qualities of a great Mac Catalyst app)*
- Gestures translate automatically, and that is the trap: Apple's table maps tap→click, touch-and-hold→click-and-hold, pan→click-and-drag. A gesture that survives translation is not thereby discoverable — it still needs the menu item above.
- Paging needs a pointer answer: "**Offer multiple ways to move between pages.** Mac users — especially those who interact using a pointing device or only the keyboard — appreciate Next and Previous buttons in addition to iPad or trackpad gestures that let them swipe between pages."
- Drop to AppKit (`NSViewRepresentable`) without guilt for the fidelity-critical 10%: tables, text views, drag sources, and window management. *(This document's reading, not Apple's wording.)*
- Electron/web-tech apps can still pass as Mac-like if they implement §9 behaviors (real menu bar via native APIs, keyboard set, context menus, density) — the tell is behavior, not the rendering engine. But default-configured wrappers fail every test above. *(This document's reading.)*
- Test the trifecta every release: full keyboard pass, resize pass (minimum size → full screen), menu-bar completeness pass.

## 11. Myth-checks — beliefs that produce false findings

Each of these is a plausible rule a reviewer would write from memory, and each one flags correct code. The correction is Apple's page, named.

1. **"A tab bar on macOS is a violation."** It is not, on Apple's own pages. `TabView` is macOS 10.15+, and HIG › Tab bars ends with "**No additional considerations for macOS.**" The position Apple actually takes is on the Mac Catalyst page — "consider using a split view with a sidebar or a segmented control" — and it is advisory ("consider"), with a segmented control explicitly acceptable "if your app uses a flat navigation hierarchy". **The hard, quotable requirement is the reachability one**: "be sure to give people quick access to top-level items by listing them in the macOS View menu." Write the rule against the missing View-menu items, not against the tab bar.

2. **"The Mac has no haptics."** `sensoryFeedback(_:trigger:)` is available on **macOS 14+**. What is missing is UIKit's generator family — `UIImpactFeedbackGenerator` lists iOS, iPadOS and Mac Catalyst, with no macOS row. So the accurate finding is "UIKit haptics API on a macOS target", not "haptics on a Mac".

3. **"`presentationDetents` is iOS-only."** It is **macOS 13+**. Availability is not endorsement: the HIG discusses detents only under iOS and iPadOS and calls them "Designed for iPhone". This one has to be a design finding with a HIG citation, never an availability finding.

4. **"Mac Catalyst availability means it works on macOS."** Apple lists **Mac Catalyst and macOS as separate platforms** in every availability block. `fullScreenCover`, `EditButton`, `InsetGroupedListStyle` and the whole of UIKit list Mac Catalyst and not macOS. An audit that treats the two as one will miss every entry in §10A.

5. **"⌃⌘S is the standard sidebar shortcut."** The HIG's standard-shortcut table contains no sidebar entry at all (see §3). The View menu item is standard; the key is not. The keys Apple publishes for the toggle live in end-user documentation instead — ⌥⌘S for the Finder sidebar *(Apple Support › Mac keyboard shortcuts)* and ⌃⌘S for the Mail sidebar *(Mail User Guide › Keyboard shortcuts)* — so an app binding either is matching an Apple app's own published key. Neither is a HIG violation, and neither is a HIG requirement.

6. **"⌘T means New Tab."** Apple's table says ⌘T "Display the Fonts window", and ⌥⌘T "Show or hide a toolbar". Safari's ⌘T is a documented-by-example repurposing, not the standard.

7. **"Mac widgets need to survive tinted and clear appearances."** Apple's rendering-mode table lists **accented as "Not supported"** on Mac. Full-color and vibrant are the Mac's modes.

8. **"macOS text should scale with Dynamic Type."** "macOS doesn't support Dynamic Type" — HIG › Typography, macOS. A macOS view that does not grow with a text-size setting is not a bug, because there is no such setting. See `apple-accessibility` for the full scoping, including the App Store Connect Larger Text label that "isn't supported on Mac".

9. **"`Text("Hello")` is a hardcoded string."** It is not: SwiftUI turns the literal into a `LocalizedStringKey` and looks it up. This holds identically on macOS — `LocalizedStringKey` is macOS 10.15+. The genuinely unlocalized case is a custom view whose label parameter is typed `String` rather than `LocalizedStringKey` — a literal passed into it is invisible to Xcode's export. `Text(someStringVariable)` is unlocalized by Apple's design, and `Text(verbatim:)` is the documented way to say so on purpose. Full sourcing in `ios-app-design` §11.1.

10. **"The unified toolbar is 52pt."** No macOS toolbar height was found on any Apple page searched — see the note under the metrics table in §1 for the surfaces checked, and for which numbers here are Apple's and which are convention.

11. **"Control-size minimums are a touch concern, so macOS has none."** macOS has one, and it is in the same table as the iOS 44×44: **28×28 pt default, 20×20 pt minimum** *(HIG › Accessibility, Mobility)*. Apple's framing is not touch-specific — "Controls that are too small are hard for many people to interact with and select" — and it publishes padding guidance alongside (about 12 pt around bezelled elements, about 24 pt around unbezelled ones). This is the one macOS metric in §1 that a rule *can* enforce against Apple's own number.

## 12. Ship checklist

- [ ] Windows resizable, restorable, multi-window; sensible minimums; unified toolbar (~52pt is convention, not published) with Customize Toolbar…
- [ ] Controls meet Apple's published macOS floor: 28×28pt default, 20×20pt minimum — and the **hit region** is the separate, larger measurement: `apple-accessibility` §3 gives "a 20×20 pt control inside a 44×44 pt hit region" as the target on Mac, since HIG › Buttons' general 44×44pt hit-region rule exempts only visionOS. Do not enforce 44pt on the drawn control
- [ ] Sidebar/inspector follow source-list conventions; 13pt-scale density; real tables with sortable headers
- [ ] Every feature in the menu bar; verb-first names, ellipsis rules, dynamic Undo/Paste labels, ⌥-alternates
- [ ] Standard shortcut set + Full Keyboard Access + type-select all pass; core loop is pointer-free
- [ ] Settings: App-menu item + ⌘,, stable pane toolbar, dimmed minimize/maximize, few settings; standard About window
- [ ] Tahoe: no custom bar backgrounds, concentric radii, template menu-bar-extra icons, Icon Composer squircle icon with all variants
- [ ] Tooltips, right-click menus on every object, multi-item drag & drop with file promises
- [ ] Undo on every mutation; document model (if content app) with autosave + Versions + proxy icon
- [ ] System open/save panels, accent color, dark mode, Shortcuts/AppleScript surface
- [ ] Catalyst/SwiftUI audit: no iPad furniture, edge-parked controls moved into the toolbar, menus wired to window focus
- [ ] Platform-fit pass (§10): nothing from list A in a native macOS target; every list-B pattern justified against its HIG page; `Settings`, `commands`, `focusedSceneValue`, `windowResizability` and a restoration decision all present
- [ ] Former tab-bar destinations listed in the View menu; every gesture-only action also a menu item
- [ ] Empty/progress/error states designed; long work non-blocking with Dock progress
- [ ] Cold launch < 1s to a usable window; state restoration on relaunch verified
