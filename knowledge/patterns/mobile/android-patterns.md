---
id: android-patterns
title: "Android Conventions & Top-App Patterns"
category: pattern
platform: mobile
tags: [android, material, conventions, top-apps]
sources: ["https://9to5google.com/2025/11/17/google-material-3-expressive-redesign/", "https://9to5google.com/2025/05/14/material-3-expressive-navigation/", "https://9to5google.com/2025/05/18/material-3-expressive-toolbars/", "https://www.androidpolice.com/whatsapp-revamped-material-design-3-ui-reaching-few-beta-testers/", "https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/", "https://m3.material.io/components/navigation-bar", "https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back", "https://developer.android.com/about/versions/16/behavior-changes-16", "https://developer.android.com/docs/quality-guidelines/core-app-quality"]
updated: 2026-07-08
---

# Android Conventions & Top-App Patterns (2026)

How real top Android apps structure themselves, where they follow Material 3 (Expressive) vs go brand-custom, and the Android-specific conventions iOS-first designers miss. Companion to `android-app-design` (system rules, dp specs) and the general M3 doc (visual language).

## 1. How top apps actually structure navigation

**The consensus: 3–5 bottom destinations + a FAB for the single primary action + drawer only for overflow hierarchies.**

- **Gmail** — 2-tab bottom bar (Mail, Meet) + modal drawer for labels + "Compose" extended FAB that collapses on scroll. M3 Expressive wave: search app bar with the avatar outside the pill, conversation list wrapped in rounded surface containers.
- **Phone by Google** — the M3 Expressive flagship redesign: bottom tabs *reduced* from four to three (Home = Favorites + Recents merged, Keypad promoted to its own tab, Voicemail), contacts relocated to a drawer. Lesson: Google merges destinations rather than adding a fifth tab.
- **Files by Google** — navigation rail on large screens, animated M3 carousel + category grid on phones. Rail-on-tablet is now the expected large-screen answer, not a stretched bottom bar.
- **Google Calendar** — **FAB menu**: the FAB expands into stacked, labeled pill actions (Event, Task, Out of office, Birthday). This is the sanctioned replacement for speed-dial mini-FAB stacks.
- **Google Drive / Wallet** — oversized M3E "large FAB" for the hero action; **Clock / Pixel Screenshots** — rounded-square FAB variant. FAB shape/size is now an expression axis, position is not.
- **Google Meet / Messages / Chat** — content in rounded "container" groupings (cards-as-list-sections), M3E's most visible signature.
- **WhatsApp** — spent a decade on top swipe-tabs, then moved to a 4-tab bottom bar (Chats, Updates, Communities, Calls) + per-tab FAB (new chat, camera). Follows M3 structurally (bottom nav, FAB, rounded menus, M3 switches, Material ripple) but keeps brand green and **skips dynamic color**. Its Android and iOS builds now deliberately converge on structure while keeping components platform-native.
- **Telegram** — the classic Android-divergent app: hamburger **drawer** navigation on Android vs bottom tabs on iOS. Almost entirely custom-drawn UI, yet deeply Android-native in behavior: system back everywhere (with predictive back support), themed monochrome icon, long-press context menus, in-chat haptic ticks, Android sharesheet. Proof that "custom skin, native skeleton" works.
- **Spotify** — fully brand-custom (own dark surfaces, Circular type, zero M3 components, no dynamic color) with a 3-tab bottom bar (Home, Search, Your Library; a Create/Premium tab appears in some markets) + persistent now-playing bar docked above the nav bar. Still honors the skeleton: system back, edge-to-edge, adaptive icon, MediaStyle notifications, 48dp targets.
- **Airbnb** — near pixel-identical cross-platform brand system, 5-tab bottom bar (Explore, Wishlists, Trips, Messages, Profile). Behaviors are swapped per platform: Android build uses system back, Android sharesheet, native date pickers in places, snackbar-style feedback.
- **Revolut** — custom fintech design system, 5 bottom tabs, and *bottom sheets for nearly every action* (transfers, details, confirmations) — a house style that happens to be the most Android-idiomatic pattern available.

**Takeaway:** nobody credible ships top-tab primary navigation anymore; everyone ships bottom bar + FAB; the drawer survives only as a secondary surface (labels, accounts, contact overflow). Brand-custom *visuals* are fine — brand-custom *behavior* (back, share, insets, targets) is not.

## 2. FAB patterns

- One FAB per screen, bottom-right, **16dp** from edges and above nav-bar insets. Standard **56dp**; M3E medium **80dp** / large **96dp** for hero actions; rounded-square variant acceptable.
- The FAB is the screen's single most important **creative** action: compose, add, record, scan. It is never search, never filter, never navigation, never "more".
- 2–6 related actions → **FAB menu** (FAB morphs into labeled pills, scrim behind, back dismisses). Never stack bare mini-FABs; never use a bottom sheet as a fake FAB menu.
- Extended FAB (icon + label) at rest, collapsing to circular while scrolling (Gmail Compose). On expanded widths the FAB relocates into the navigation rail's top slot.
- FAB may hide on scroll-down and return on scroll-up, but must never permanently cover content: lists under a FAB need ~**88–96dp** bottom content padding.
- If a screen has no natural primary creation action, it gets no FAB. Symmetry is not a reason.

## 3. Bottom sheets

- Android's workhorse surface. Where iOS splits into action sheets, popovers, and half-modals, Android apps (Maps, Google Pay, Revolut, the sharesheet itself) use one component.
- **Modal sheet** — one task or choice set:
  - Drag handle **32×4dp** centered in a 48dp hit area; top corner radius **28dp**; scrim behind.
  - Dismiss three ways, all mandatory: drag down, scrim tap, **system back** (predictive back animates the sheet down with the drag).
  - First actionable element within thumb reach; primary CTA pinned above `ime`/nav insets.
- **Standard (persistent) sheet** — the Maps pattern: collapsed peek (~72–120dp showing a title/summary) → half-expanded → full; content behind stays interactive. At full expansion it may morph into a full-screen surface with its own top app bar.
- Rules: never stack sheets on sheets; a flow that outgrows one step becomes a full screen; sheet content scrolls internally only after the sheet is fully expanded.

## 4. Search patterns

- The M3 pattern: a **search bar** (pill in the app-bar slot) that expands into a **search view** — full-screen on compact — with recent queries and suggestions; predictive back collapses it back into the pill. Gmail, Keep, Chat, and Password Manager all adopted this in the 2025 M3E wave.
- Search as a **destination** (Spotify, YouTube, Play Store): a bottom-nav tab whose screen leads with the search field plus browse/category content — use when discovery is a core loop.
- Search as a **tool** (Contacts, Settings, Files): a magnifier icon action expanding in place — use when search is occasional.
- Conventions: recent queries with per-row delete, live results where cheap, voice input affordance in Google-adjacent contexts, keyboard action = Search. One back press closes the keyboard; the next collapses the search view.

## 5. Settings

- Android settings are a **full-screen preference list**, not iOS inset-grouped tables: section headers (~14sp, primary color), rows 56–72dp with optional 24dp leading icon, title + supporting text, trailing M3 switch for toggles.
- Row grammar (mirror system Settings): tap-through rows open sub-screens (← Up returns); toggle rows flip in place; **split rows** (tap to configure + independent switch) for enable-and-configure items.
- Entry point: avatar menu or ⋮ overflow in the top app bar → Settings. Settings is never a bottom-nav destination.
- Include the Android-expected set:
  - **Notifications** — deep-link to system channel settings (`ACTION_APP_NOTIFICATION_SETTINGS`) rather than rebuilding toggles.
  - **Theme** — System default / Light / Dark, defaulting to System.
  - **Language** — per-app language (Android 13+ `LocaleManager`), surfaced both in-app and in system settings.
  - Storage/data-saver controls where relevant.
- Destructive account actions last, visually separated; About with version + open-source licenses at the bottom. Add settings search once the tree exceeds ~2 levels (Google-app standard).

## 6. Android-specific patterns iOS designers miss

1. **System back everywhere** — an OS-level gesture closes sheets, menus, dialogs, search, selection modes, and the keyboard. Every surface needs a defined back behavior; iOS only has explicit dismiss affordances, so ports routinely ship broken back.
2. **Long-press is a first-class verb** — app icon → shortcuts (≈4, pinnable to home screen); list items → multi-select mode (checkboxes + contextual action bar with batch actions) rather than iOS swipe-to-delete; text → selection handles + context menu. Wherever iOS uses swipe rows or haptic-touch menus, Android expects long-press.
3. **The sharesheet is bidirectional** — send via `Intent.createChooser` (direct-share contact targets, copy, nearby, your custom action row) and *receive* by registering intent filters so your app appears in other apps' sheets. iOS-first teams design only the outbound half, often as custom UI. Don't.
4. **Overflow menu (⋮)** — the top app bar carries 2–3 icon actions; everything else lives in the trailing three-dot menu (M3E menus: bigger radius, grouped sections with gaps). Don't invent a "•••"-triggered bottom sheet for four text items.
5. **Snackbar + UNDO** — the Android idiom for reversible actions: delete immediately, offer UNDO for ~4s. No confirmation dialogs for undoable operations.
6. **Ripple feedback** — every touchable shows a ripple. Even fully custom apps (Spotify, Telegram) keep it; suppressing it makes an Android UI feel dead.
7. **Home-screen presence** — widgets, themed icon, pinned shortcuts: Android users compose your app onto their launcher. This surface has no iOS design source; budget for it.
8. **Per-tab state restoration** — leaving and re-entering a bottom tab restores its scroll position and stack (YouTube, Play Store). Resetting to root reads as data loss.
9. **Intent interop** — "Open with", default-app roles, App Links from notifications/widgets/search: every content screen needs a stable deep-link route with a sane synthesized Up stack.
10. **Predictive-back choreography** — surfaces shrink/slide *with the drag* (peek-and-cancel), not vanish on release. Cross-screen shared elements tracking the gesture are the current polish bar.
11. **System pickers over custom ones** — photo picker (no storage permission), Credential Manager for sign-in (passkeys + Google sign-in in one sheet), system autofill. Custom equivalents now read as both lazy and invasive.
12. **Custom Tabs, not embedded WebView chrome** — external links open in Chrome Custom Tabs themed to your app; a hand-rolled in-app browser with custom toolbar is an anti-pattern.

## 7. Lists, content, and feedback conventions

- **Pull-to-refresh** — M3 loading indicator (the M3E shape-morphing spinner) descending under the drag; only on feeds where new-at-top content actually arrives. Not a substitute for live updates.
- **Swipe actions exist on Android too, but differently**: one action per direction, full-row swipe with a colored background + icon revealed (Gmail archive/delete pattern), always with an UNDO snackbar. Not iOS-style multi-button reveal stacks — multi-action belongs in long-press selection or the ⋮ row menu.
- **Section grouping (M3 Expressive)** — list items grouped into rounded surface containers with small gaps between groups (Gmail, Messages, system Settings). This replaced full-bleed divider-separated lists as the modern Android look.
- **Empty states** — illustration or large glyph + one-line explanation + the same action the FAB offers. Never a blank screen; never a spinner as a permanent resident.
- **Loading** — prefer content-shaped placeholders (skeletons) for feeds, the M3 loading indicator for discrete waits, and determinate progress whenever length is knowable. Show cached content immediately and refresh behind it (offline-first is a core-quality expectation).
- **Errors** — inline at the point of failure with a Retry affordance; snackbar for transient global failures; full-screen error state only when the whole destination is unusable.
- **Selection** — long-press starts multi-select, tap extends it, count + batch actions in the contextual top bar, back exits. Checkbox avatars (tap avatar to select, Gmail-style) are the discoverability booster.

## 8. Onboarding, permissions, and auth patterns

- Top Android apps front-load value, not forms: WhatsApp = phone verify then straight into Chats; Spotify/Revolut ≤ 3 screens before content. Skippable everything, progress via dots or a progress bar — never a back-trap (system back must exit onboarding backwards).
- **Permissions in context, one at a time**: camera permission when the user taps the camera, notifications after the first thing worth notifying about exists. Precede sensitive asks (location, contacts) with a one-screen rationale *only* when the benefit isn't obvious; handle "don't ask again" with a settings deep link, never a nag loop.
- Use the **system photo picker** (no permission dialog at all) instead of requesting media/storage access — requesting broad storage now looks hostile and triggers Play review friction.
- **Sign-in**: Credential Manager sheet (passkeys + saved passwords + Google sign-in unified) as the primary path; email forms as fallback with autofill hints set. Biometric re-auth (`BiometricPrompt`) for sensitive in-app actions — Revolut-style fintech UX expects it.
- Account switching: avatar in the top app bar → account sheet (Google apps pattern), including on-avatar swipe-to-switch where multi-account is core.

## 9. Follow-Material vs brand-custom: the decision grid

| Layer | Follow M3 strictly | Brand-custom acceptable |
|---|---|---|
| Navigation structure (bar/rail, back, stacks) | Always | Never |
| System surfaces (sharesheet, notifications, splash, IME, pickers) | Always | Never |
| Insets, targets, ripple, state restore | Always | Never |
| Components (buttons, sheets, dialogs, switches) | Default choice | OK with equal affordances (WhatsApp, Telegram) |
| Color | Dynamic color for utilities/tools | Brand palette for brand-led apps (Spotify) — still via M3 roles, still dark-theme |
| Typography | Roboto + M3 scale default | Brand font fine; keep sp units and 200% scaling |
| Motion | M3 springs, shared axis, container transform | Brand motion OK if predictive back still tracks the finger |
| Iconography | Material Symbols default | Custom set fine on the 24dp grid |

Rule of thumb: the further a layer sits from *system interaction*, the more brand freedom you have. Visual skin: free. Component behavior: constrained. System behavior: zero freedom.

## 10. Do / Don't

**Do**
- 3–5 bottom destinations; merge before adding a fifth (Phone by Google precedent)
- FAB for the one primary creative action; FAB menu for a related cluster
- Bottom sheets for choices and single-step tasks; promote to full screens beyond that
- UNDO snackbars instead of confirm dialogs for anything reversible
- Long-press → selection mode with a contextual action bar for batch operations
- Dynamic color for tools and utilities; deliberate role-mapped brand palette otherwise
- Test with 3-button navigation enabled — a large minority still uses it and it eats bottom space differently
- Per-app language, 200% font scale, TalkBack pass on the top 5 flows
- Real tablet layouts (rail + two-pane) — Play's large-screen tiers gate store placement

**Don't**
- Ship iOS "‹ Back" labels, centered-only titles, segmented controls, iOS switches, or SF Symbols on Android
- Intercept back for "Are you sure you want to exit?" — predictive back breaks it, and on SDK 36 your legacy interception isn't even called
- Use toasts for anything actionable or important; use dialogs for anything undoable
- Put navigation in a FAB, or add FABs for symmetry
- Build custom share UI or custom in-app browser chrome (sharesheet + Custom Tabs exist)
- Lock portrait — Android 16 overrides restrictions on ≥ 600dp displays anyway
- Half-adopt dynamic color (brand primary on wallpaper-tinted surfaces clashes randomly)
- Rebuild system surfaces "for brand consistency" — users chose their launcher, keyboard, and wallpaper; respect it

## 11. Anti-patterns (instant "iOS port" tells)

1. **iOS back chevron top-left as the only exit** + broken system back — the #1 tell. Fix: ← Up in the app bar, predictive back on every surface.
2. **Non-adaptive icon** — legacy square art shrunk into a white circle by the launcher; no monochrome layer, so themed home screens show it as the broken odd-one-out.
3. **No dark theme / no dynamic-color decision** — a permanently white-branded screen inside a dark-themed OS.
4. **Opaque status-bar strip or hardcoded 24dp inset** — a visible seam up top, content trapped above the gesture area below. Edge-to-edge is enforced at SDK 36; unhandled insets = overlapping UI, not a stylistic choice.
5. **iOS action sheets and centered alerts with stacked full-width buttons** where Android expects bottom sheets and M3 dialogs (text buttons, bottom-right, confirm rightmost).
6. **Custom splash activity with a 2–3s brand hold** — produces a double splash on Android 12+; ads or tips on launch are worse.
7. **Toast-driven UX** — errors and confirmations that TalkBack users and anyone glancing away simply miss.
8. **Tabs reset on return** — bottom destinations that lose scroll/stack when revisited read as data loss.
9. **Stretched phone UI on tablets/foldables** — letterboxed portrait lock or 900dp-wide single-column forms; fails adaptive quality tiers and tanks tablet store placement.
10. **`vibrate(100)` buzzes on taps** — semantic `HapticFeedbackConstants` or nothing.
11. **Play screenshots with iOS chrome** (Dynamic Island, iOS status bar/keyboard) — credibility killer and policy risk.
12. **One default notification channel for everything** — the first promo push gets your transactional messages blocked too.
13. **Login walls before value + custom sign-in forms** — Android expects Credential Manager (passkeys/Google sign-in) and autofill-friendly fields.

## 12. Motion & transition conventions (as top apps use them)

- **Forward navigation** — shared-axis X (siblings/steps) or fade-through (bottom-tab switches). Container transform for card → detail (Play Store, Photos): the tapped surface *becomes* the next screen. No iOS push-from-right slides.
- **Back navigation** — mirrors forward, but must track the predictive-back drag: scale-down + reveal for cross-screen, sheet-follows-finger for sheets, search view collapsing into its bar. Release-to-cancel must restore state losslessly.
- **Bottom-tab switches** — fade-through (~200ms), never horizontal slides (tabs are peers, not a sequence); content swipe-between-tabs is reserved for secondary tabs within a destination.
- **M3 Expressive motion** — spring-based (expressive/standard motion schemes) rather than duration curves: FAB → FAB menu morph, shape-morphing loading indicator, container grouping expand/collapse. Use springs for user-initiated spatial changes, plain fades for content refresh.
- **List changes animate** — item add/remove/reorder with `animateItem`-style placement animation and the UNDO snackbar timed to match; instant list jumps read as glitches.
- **Duration discipline** — small component changes ~100–200ms, screen transitions ~300–400ms, nothing user-blocking above ~500ms; honor "Remove animations" (reduced motion) by collapsing to fades.
- **Brand motion** (Spotify's crossfades, Telegram's message pops, Revolut's card flips) layers *on top* of these skeleton transitions — it never replaces back-gesture tracking or state restoration.

## 13. Quick reference numbers

- Nav bar **64dp** (M3E flexible; classic 80dp) · indicator pill ≥ 56×32dp · icon 24dp · label 12sp
- Nav rail **96dp** collapsed / ~220dp expanded · modal drawer ≤ 360dp · drawer/list row 56dp
- Top app bar 64 / 112 / 152dp (small/medium/large) · FAB 56 / 80 / 96dp with 16dp margins
- Touch targets ≥ **48×48dp** · sheet drag handle 32×4dp · sheet top radius 28dp
- Breakpoints: **600dp** (bar→rail, phones end) · **840dp** (expanded, two-pane) · **1200dp** (large)
- List bottom padding with FAB ≈ 88–96dp · readable text measure ≤ ~640dp
- Settings rows 56–72dp · section headers ~14sp · overflow menu ⋮ after 2–3 app-bar actions
- Snackbar duration ~4s (matches UNDO window) · tab-switch fade ~200ms · screen transition 300–400ms
- Standard sheet peek ~72–120dp · notification small icon 24dp white-on-transparent
- Minimum text 12sp, body 16sp, all type in sp · icons on the 24dp Material Symbols grid

Cross-reference: dp specs and system rules in `android-app-design`; M3 color/shape/motion tokens in the Material 3 doc; iOS equivalents in `ios-app-design` for porting comparisons.
