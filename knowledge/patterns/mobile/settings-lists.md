---
id: mobile-settings-lists
title: "Mobile Settings & Grouped List Patterns"
category: pattern
platform: mobile
tags: [settings, lists, grouped-lists, toggles, information-architecture]
sources:
  - "https://mobbin.com/screens/3f573b95-4bbb-4978-957e-56178543e8e7"
  - "https://mobbin.com/screens/1402efff-5fe3-487c-8137-a3a96cc81f1a"
  - "https://mobbin.com/screens/bc43b8c8-3c94-4e67-912e-da5e9f8e4de5"
  - "https://mobbin.com/screens/2ead27ba-ec0e-4818-b14f-037748c06cef"
  - "https://mobbin.com/screens/2110f6a5-e7d0-4fd8-a7d0-f081913dfaac"
  - "https://mobbin.com/screens/ad5aa6e3-c55c-441c-ac9e-691473e07f92"
  - "https://mobbin.com/screens/d10c285d-ab1d-472b-a5e3-e69f6069c66f"
updated: 2026-07-08
---

# Settings Screens with Grouped Lists (iOS)

Based on real screens from Base, Deepstash, Meta AI, NGL, Binance, TextNow, and Linktree on Mobbin.

## Observed patterns

### Grouping and section headers
- Every screen groups rows under short section headers. [Deepstash](https://mobbin.com/screens/1402efff-5fe3-487c-8137-a3a96cc81f1a) uses uppercase gray micro-headers (SUBSCRIPTION / CONTENT / ACCOUNT); [Binance](https://mobbin.com/screens/2110f6a5-e7d0-4fd8-a7d0-f081913dfaac) uses sentence-case gray labels (General / Appearance / Payment); [TextNow](https://mobbin.com/screens/ad5aa6e3-c55c-441c-ac9e-691473e07f92) puts uppercase headers on tinted separator bands (PROFILE / NOTIFICATIONS / VOICE / LOOK AND FEEL); [NGL](https://mobbin.com/screens/2ead27ba-ec0e-4818-b14f-037748c06cef) even gives each header its own small icon (🔔 Preferences, ⚠️ Safety controls).
- Groups run 3–8 rows; semantically ordered with the most-used (subscription, notifications, preferences) at the top and legal/support/danger items at the bottom.

### Two container styles
- **Edge-to-edge rows with hairline dividers**: [Base](https://mobbin.com/screens/3f573b95-4bbb-4978-957e-56178543e8e7), Binance, TextNow — classic iOS grouped-table look.
- **Inset rounded cards per group**: NGL and [Meta AI](https://mobbin.com/screens/bc43b8c8-3c94-4e67-912e-da5e9f8e4de5) wrap each group in a rounded card on a tinted background; [Linktree](https://mobbin.com/screens/d10c285d-ab1d-472b-a5e3-e69f6069c66f) uses flat rows with thin outlined leading icons on an off-white page. Both styles coexist in top apps; the card style reads more "product-branded", the flat style more native.

### Row anatomy (the universal grammar)
- Label left; **current value right in gray** + chevron for navigable choices: Base "Language — English - US ›", Binance "Currency — USD ›", "Mode & Theme — System & Glacier White ›", TextNow "Notification Sound — Alert 3 ›" (value tinted red as its accent), Meta AI "…›" rows.
- **Toggles inline** for binary settings — TextNow's green switches for "Perks Notifications", "Email Notifications"; no navigation for on/off decisions.
- **Two-line rows** when a setting needs explanation: Base pairs the bold label with a lighter one-line description ("Appearance Mode — Light, dark, or match your device").
- **Visual previews** where words fail: Base shows the actual theme color as a small blue swatch in the "Theme" row; Binance shows red/green arrows for "Color Preference".
- Leading icons are optional: Deepstash, NGL, Meta AI, and Linktree use small monochrome outline icons per row; Base and Binance omit them entirely — both work, but each app is internally consistent.
- Row height ~44–56pt, one setting per row, full-row tap target.

### Status surfaced in the list
- Deepstash shows subscription state inline: "My subscription: Pro" with a shield icon at the very top. TextNow shows counts in labels ("Blocked Numbers (0)") and values like "Call Forwarding — Off ›". The list is a dashboard, not just a menu.

### Navigation chrome
- Back chevron (Base, Binance, TextNow, NGL, Linktree) or close X (Deepstash) plus a title — centered "Settings" (TextNow, NGL, Linktree) or large-title left-aligned (Binance's big "Settings", Base's "Display"). No other header actions; settings headers stay minimal.

## Design rules derived

**Do**
1. Group every setting under a 1–2 word section header; never render one undifferentiated list.
2. Follow the row grammar strictly: label left → (optional gray value) → chevron for drill-ins; label left → switch for booleans. Users decode this instantly.
3. Show the current value in the row itself (language, currency, theme, sound) so users never drill in just to check state.
4. Use a second, lighter description line only for genuinely ambiguous settings (Base's appearance row) — not on every row.
5. Order groups by frequency of use; push About/Terms/Support/Sign out to the last group.
6. If using leading icons, use them on every row at one consistent size and stroke weight (Linktree, NGL); if not, use none (Base, Binance).
7. Render tiny previews for visual settings — color swatch, theme thumbnail — instead of describing them.
8. Keep rows ≥44pt with the entire row tappable, and one setting per row.
9. Surface account/subscription status at the top of the settings root (Deepstash's "My subscription: Pro").
10. Pick one container style (inset cards or edge-to-edge hairline rows) for the whole settings tree.

**Don't**
1. Don't hide binary settings behind a chevron and a detail page — inline the switch.
2. Don't use chevrons on rows that trigger immediate actions (share, sign out); chevron promises navigation.
3. Don't let section headers grow into sentences; 1–3 words, consistently cased.
4. Don't mix value-accent colors arbitrarily — TextNow's red values read as warnings even when they're neutral state.

## Anti-patterns seen

- **Accent-colored value text** (TextNow's red "Alert 3" / "Off"): brand red on a value column mimics an error state; reserve red for destructive or alert semantics.
- **Overloaded root list** (TextNow, Binance): 6+ groups on one endless scroll with no search; past ~25 rows a settings search field or a two-level IA is warranted.
- **Ambiguous rows without values** (Linktree's "Social", "SEO"): bare labels with chevrons give no scent of what's inside; a gray value or count would fix it.
- **Header-icon noise** (NGL): icons on both section headers *and* every row double the visual vocabulary without adding information.
