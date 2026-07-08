---
id: macos-app-design
title: "macOS App Design — Complete Guide"
category: design-language
platform: macos
tags: [macos, apple, hig, menu-bar, keyboard, windows]
sources: ["https://developer.apple.com/design/human-interface-guidelines/the-menu-bar", "https://developer.apple.com/design/human-interface-guidelines/windows", "https://developer.apple.com/design/human-interface-guidelines/toolbars", "https://developer.apple.com/design/human-interface-guidelines/keyboards", "https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/", "https://pfandrade.me/blog/mac-assed-swiftui-app/", "https://daringfireball.net/2020/11/sketch_mac_app_mac_apps", "https://www.sketch.com/blog/part-of-your-world-why-we-re-proud-to-build-a-truly-native-mac-app/", "https://evilmartians.com/chronicles/how-to-make-absolutely-any-app-look-like-a-macos-app", "https://successfulsoftware.net/2025/09/26/updating-application-icons-for-macos-26-tahoe-and-liquid-glass/", "https://zenn.dev/usagimaru/articles/b2a328775124ef", "https://troz.net/post/2025/swiftui-mac-2025/", "https://www.macrumors.com/2025/09/24/all-the-new-macos-tahoe-features/"]
updated: 2026-07-08
---

# macOS App Design — Complete Guide (macOS Tahoe 26 era)

How to design a real Mac app — window anatomy, menus, keyboard, pointer, and the conventions that separate native apps from web wrappers. Liquid Glass material details live in `apple-hig-liquid-glass`; this doc is app-structural.

## 1. Window anatomy & types

- **Main/document windows**: freely resizable, remember size/position per window, restore state on relaunch. Set a sensible minimum (~460×300 for utility apps); content must **reflow, not letterbox**, at any size. Default first-launch size: comfortable on a 13" display (~1100×700 max), roughly centered.
- **Title bar**: traffic lights top-leading (close ⌘W, minimize ⌘M, full screen ^⌘F; ⌥-hover zoom reveals tiling options). Document windows show a **proxy icon** beside the title (drag it to move/attach the file, ⌘-click it for the path popover) and an edited/dirty indicator for unsaved changes.
- **Window tabs**: document apps should support native tabbing (View → Show Tab Bar, ⌘⇧\ cycling, Window → Merge All Windows) for free via standard window classes.
- **Tiling (Tahoe)**: windows tile to halves/quarters by dragging to screen edges, via the ⌥-hover zoom-button menu, and Window → Move & Resize shortcuts. Apps must behave at exactly 50%/25% of common displays — check 720pt-wide layouts.
- **Window levels**: normal windows only; avoid always-on-top unless the app is a utility whose whole point is floating (color picker, timer), and then make it a setting.
- **Unified toolbar** (the modern default): toolbar merges with the title bar, ~52pt tall. Toolbar items are icon-first SF Symbols (~24pt), grouped by function; in Tahoe related actions cluster into shared Liquid Glass capsules floating over content. Support **right-click → Customize Toolbar…** with drag-to-arrange, and graceful overflow (») when the window narrows.
- **Panels**: floating auxiliary windows (torn-off inspectors, color/font panels). Non-activating, closable with Esc where transient; HUD style only in media/full-screen contexts.
- **Alerts**: app-modal sheet (document-specific) or window (app-level): icon + bold message (~13pt bold) + informative text (11pt), buttons bottom-trailing with the default (Return) rightmost and Cancel (Esc) beside it. Max 3 buttons; destructive alerts get a safe default and a "Don't ask again" checkbox where repeat-confirmed.
- **Open/Save**: always the system `NSOpenPanel`/`NSSavePanel` (users rely on their sidebar favorites, search, and expanded/collapsed state). Never a custom file browser.

### Sidebar (source list)
- Leading column, translucent (sidebar material — in Tahoe it refracts the desktop/content behind). Width 220–320pt, user-resizable, collapsible via toolbar button and `⌃⌘S`.
- Rows: 24pt (small), 28pt (medium/default), 32pt (large), following the user's "Sidebar icon size" setting in System Settings. Section headers: 11pt semibold, secondary label color.
- Sidebar icons take the **accent color**; never hardcode row icon colors unless brand-critical (Finder-style multicolor is acceptable).
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
| Sidebar width | 220–320pt, resizable; collapse via ⌃⌘S |
| Sidebar rows | 24 / 28 / 32pt (small / medium / large) |
| Inspector width | ~250–280pt fixed |
| Table/list rows | 24–28pt |
| Body text | 13pt (11pt small controls, 10pt mini) |
| Push button (regular) | ~22pt tall; large ~28pt |
| Minimum click target | ~24×24pt (pointer precision > touch) |
| Form/content margins | 20pt; 8pt between related controls |
| Alert width | ~260pt content column |

### Loading, progress, empty states

- Empty views: centered symbol + one-line explanation + the action that fills the view ("Create your first project", drag-and-drop hint). Never a blank white pane.
- Progress: determinate bars whenever total is knowable; indeterminate spinners (16pt inline, 32pt view-level) only briefly. Long operations belong in a non-blocking progress UI with Cancel — never a modal that locks the window for minutes.
- Errors: inline where the problem is (form field, row badge) with recovery wording; alerts only for blocking failures. Include the failing detail ("Couldn't save 'Report.md' — disk full"), not error codes.

## 2. The menu bar

The menu bar is the app's **complete command inventory**. Rule: *every* feature must be reachable from a menu item, even if it also exists as a toolbar button or gesture — this is what makes features discoverable (Help-menu search finds them), user-remappable (custom shortcuts in System Settings → Keyboard), and AppleScript/accessibility-visible.

Standard order and contents:

| Menu | Contains |
|---|---|
| **App menu** (bold app name) | About [App], Settings… (⌘,), Services, Hide [App] (⌘H), Hide Others (⌥⌘H), Quit (⌘Q) |
| **File** | New (⌘N), Open (⌘O), Open Recent ▸, Close (⌘W), Save (⌘S), Duplicate (⇧⌘S), Rename…, Move To…, Export…, Page Setup, Print (⌘P) |
| **Edit** | Undo (⌘Z) / Redo (⇧⌘Z), Cut/Copy/Paste (⌘X/⌘C/⌘V), Paste and Match Style (⌥⇧⌘V), Delete, Select All (⌘A), Find ▸ (⌘F/⌘G/⌘E), Spelling, AutoFill, Emoji & Symbols |
| **Format** (content-editing apps) | Font ▸ (⌘B/⌘I/⌘U), Text ▸ (alignment), styles |
| **View** | Show/Hide Sidebar (⌃⌘S), Show/Hide Inspector, view options (as ⌘1/⌘2… where view modes exist), Show/Hide Toolbar, Enter Full Screen (^⌘F) |
| **Window** | Minimize (⌘M), Zoom, Move & Resize ▸ (Tahoe tiling), Bring All to Front, open-window list |
| **Help** | [App] Help (⌘?), searchable — the search field auto-indexes every menu item |

- Menu items: **verb-first Title Case**; trailing ellipsis (…) when the item requires further input before acting (opens a dialog); no ellipsis for immediate actions. Toggles either check-mark or flip their title ("Show Sidebar"/"Hide Sidebar") — never both.
- Make items **dynamic**: "Undo Rename", "Paste 3 Items"; disabled (dimmed), not hidden, when inapplicable. Hold ⌥ to reveal alternates (Close → Close All, ⌥⌘W).
- Submenus max one level deep; group with separators by task, ~7±2 items per group.
- **Menu bar extras** (status items): only for background/global utilities with always-on value (VPN state, capture, now-playing). Template (monochrome) icon that adapts to the transparent Tahoe menu bar; menu on click; make the extra optional via a setting. Never make an extra the app's only UI unless it's a true menu-bar utility — and then still provide Settings and Quit in its menu.

## 3. Keyboard-first design

- Ship the standard set plus shortcuts on every high-frequency action. Convention: primary modifier ⌘; add ⇧ for inverse/variant; ⌥ for alternate; ⌃ sparingly (heavily used by the system). Glyph display order: ⌃⌥⇧⌘ + key.

### Standard shortcut vocabulary (users assume these)

| Shortcut | Action | Shortcut | Action |
|---|---|---|---|
| ⌘N | New window/document | ⌘Z / ⇧⌘Z | Undo / Redo |
| ⌘O | Open | ⌘X ⌘C ⌘V | Cut / Copy / Paste |
| ⌘W / ⌥⌘W | Close window / all | ⌥⇧⌘V | Paste and Match Style |
| ⌘S / ⇧⌘S | Save / Duplicate | ⌘A | Select All |
| ⌘P | Print | ⌘F / ⌘G / ⇧⌘G | Find / Next / Previous |
| ⌘Q | Quit | ⌘E | Use Selection for Find |
| ⌘, | Settings | ⌘B ⌘I ⌘U | Bold / Italic / Underline |
| ⌘M | Minimize | ⌘+ ⌘− ⌘0 | Zoom in / out / actual size |
| ⌘H / ⌥⌘H | Hide app / others | ⌘T | New tab (or Fonts panel in editors) |
| ⌘? | Help | ⇧⌘\ | Show all tabs |
| ^⌘F | Toggle full screen | ⌘R | Refresh/reload (where applicable) |
| ⌃⌘S | Toggle sidebar | ⌘⌫ | Delete / move to Trash |
| ⌘` | Cycle app windows | ⌘1…9 | View modes or tab jump |

- Other reserved/expected behaviors: Space = Quick Look (where previews make sense) · Esc = cancel/exit/stop editing · Return = default button, or inline rename in Finder-like lists · Delete removes selection · ⌘-click multi-select, ⇧-click range select · ⌘←→/↑↓ = line/document jumps in text · Tab/⇧Tab moves focus.
- **Full Keyboard Access** must work: everything focusable via Tab/arrow keys, visible accent-colored focus ring (system-drawn — never suppress it), no pointer-only features. Lists support type-select (typing jumps to the matching item).
- Text editing honors all system behaviors: ⌥-arrow word jumps, standard emacs bindings (⌃A/⌃E/⌃K), smart quotes/dashes settings, dictation, Password AutoFill, and the user's custom text replacements.
- Design "keyboard flows": the core loop of the app (triage mail, tag photos, move tasks) should be completable without touching the pointer. Power users judge the app on this within minutes.

## 4. Settings, About, onboarding

- **Settings window** (⌘, and App menu → "Settings…"): toolbar-style tab bar (`.preference` toolbar style) with icon+label tabs — never a sidebar, never fake tabs. General first, Advanced last. Fixed width; height animates per tab.
- **Changes apply instantly** — no OK/Apply/Cancel row. Non-resizable, not restorable, centers on the main screen on first open, ⌘W closes it.
- Settings content uses the form layout: right-aligned labels, left-aligned controls in a single column, 20pt content margins, related controls grouped with 8pt spacing and groups separated by 20pt. Keep it to what users actually need to change — the best Mac apps have shockingly few settings.
- **About window**: small fixed panel with icon, app name, version + build, copyright, optional scrolling Credits. Don't turn it into a marketing page; do link acknowledgements/licenses there.
- **Onboarding**: Mac apps mostly skip it. Acceptable patterns: a single welcome window (recents + "New Document" + template picker), or one-screen permission priming for tools needing Accessibility/Screen Recording/Full Disk access — explain why, deep-link to the exact System Settings pane, and detect the grant live so the user never hunts. Never a swipe-through carousel; never gate launch on login for a local tool.

## 5. macOS Tahoe 26 / Liquid Glass on the desktop

- Toolbars, sidebars, and menus are Liquid Glass: they refract the content and desktop behind them; content scrolls under bars with a scroll-edge effect (progressive blur). Don't paint opaque bar backgrounds and don't stack custom glass on system glass.
- The **menu bar is fully transparent** by default (users can restore a background in System Settings → Menu Bar); menu bar extras must be legible over any wallpaper — template icons only.
- Windows and controls use **concentric corner radii** aligned to the window's rounded corners; derive nested radii from the container, never hardcode. Controls lean capsule-shaped and slightly taller; menus/popovers morph out of the control that opened them.
- Adopt by compiling with Xcode 26 and *removing* customizations rather than adding any. Test with Reduce Transparency and Increase Contrast — glass falls back to opaque and layouts must survive.
- **App icon**: mandatory rounded-rectangle (squircle). Freeform icons that overflow the shape get auto-boxed onto a generic background and look broken. Author a layered **Icon Composer `.icon`** file (≤4 layer groups, 1024pt canvas, no baked shadows/gloss); the system renders Default, Dark, Clear Light/Dark, Tinted Light/Dark variants plus the glass depth. Keep legacy `.icns` only as a fallback for older macOS.
- Desktop hosts widgets and iPhone-style Controls; Spotlight runs App Intents actions directly — model core commands as App Intents on Mac too, and expose them to Shortcuts.
- Mac widgets follow the iOS widget rules (glanceable, deep-linking, tint/clear-mode safe) and additionally render on the desktop behind windows — verify legibility at reduced desktop opacity.
- The compatibility opt-out (`UIDesignRequiresCompatibility`) is temporary; treat Liquid Glass as the only target. Screenshots and marketing imagery should show the Tahoe appearance — pre-26 chrome instantly dates the product page.
- Full-height sidebars now extend behind the toolbar region; use the safe-area APIs rather than hardcoding a title-bar offset, and let the scroll-edge effect handle content/bar separation.

## 6. Typography, color, and materials

- System font is SF Pro at the 13pt-body scale (table above in §1); use text styles, not fixed sizes — macOS Sonoma+ supports Dynamic Type-like scaling in some contexts and larger text accessibility settings affect layouts.
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
2. **Resizable everything** — any window size works; panels collapse before content squishes; no fixed-canvas layouts; full screen and Tahoe window tiling behave.
3. **Multiple windows** — ⌘N opens another window/document; two projects side by side; state is per-window, not per-app. Closing the last window doesn't quit a document app.
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

## 10. Catalyst / SwiftUI multiplatform pitfalls

- **Never ship the iPad idiom raw.** Catalyst: choose "Optimize Interface for Mac" (native AppKit controls, correct density) over scaled-iPad (75% blur). SwiftUI: audit every screen on Mac — the framework shares defaults, not conventions.
- Replace iOS navigation furniture: tab bars → sidebar (or a toolbar-style switcher); navigation stacks → split view + selection; sheets presenting peer content → separate windows (`openWindow` / `WindowGroup`); swipe actions → context menus + menu bar commands; pull-to-refresh → ⌘R and automatic refresh.
- Build the menu bar deliberately (`Commands` API): SwiftUI gives a skeleton; every feature still needs a real menu item with a shortcut. Wire `focusedSceneValue`/`FocusedValue` so items enable/disable per the active window and selection.
- Known SwiftUI gaps to design around (2026): toolbar semantic placements (`.primaryAction` etc.) order items unpredictably — use explicit placements; drag sessions expose no source-side state (dimming dragged rows risks stuck UI when drops land outside the window); `.onMoveCommand` arrow-key handling is macOS-only; keyboard navigation while a TextField has focus needs manual handling; context-menu-open state isn't exposed, so focus rings around menu targets need workarounds.
- Drop to AppKit (`NSViewRepresentable`) without guilt for the fidelity-critical 10%: tables, text views, drag sources, and window management.
- Windowing in SwiftUI: use `Window` (single) vs `WindowGroup` (multi) deliberately, set `windowResizability(.contentSize)` for fixed utilities, `defaultSize`/`defaultPosition` for first launch, and `Settings { }` for the settings scene — it wires ⌘, and the menu item automatically.
- Electron/web-tech apps can still pass as Mac-like if they implement §9 behaviors (real menu bar via native APIs, keyboard set, context menus, density) — the tell is behavior, not the rendering engine. But default-configured wrappers fail every test above.
- Test the trifecta every release: full keyboard pass, resize pass (minimum size → full screen), menu-bar completeness pass.

## 11. Ship checklist

- [ ] Windows resizable, restorable, multi-window; sensible minimums; unified 52pt toolbar with Customize Toolbar…
- [ ] Sidebar/inspector follow source-list conventions; 13pt-scale density; real tables with sortable headers
- [ ] Every feature in the menu bar; verb-first names, ellipsis rules, dynamic Undo/Paste labels, ⌥-alternates
- [ ] Standard shortcut set + Full Keyboard Access + type-select all pass; core loop is pointer-free
- [ ] Settings: toolbar tabs, instant apply, ⌘,; standard About window
- [ ] Tahoe: no custom bar backgrounds, concentric radii, template menu-bar-extra icons, Icon Composer squircle icon with all variants
- [ ] Tooltips, right-click menus on every object, multi-item drag & drop with file promises
- [ ] Undo on every mutation; document model (if content app) with autosave + Versions + proxy icon
- [ ] System open/save panels, accent color, dark mode, Shortcuts/AppleScript surface
- [ ] Catalyst/SwiftUI audit: no iPad furniture, explicit toolbar placements, menus wired to window focus
- [ ] Empty/progress/error states designed; long work non-blocking with Dock progress
- [ ] Cold launch < 1s to a usable window; state restoration on relaunch verified
