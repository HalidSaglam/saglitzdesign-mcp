---
id: mobile-navigation-home
title: "Mobile Home Feed & Bottom Tab Navigation Patterns"
category: pattern
platform: mobile
tags: [navigation, tab-bar, home-feed, cards, skeleton-loading]
sources:
  - "https://mobbin.com/screens/27c8555f-f63a-40f5-b83f-ab2c62472421"
  - "https://mobbin.com/screens/857360ff-cae6-4b2c-a198-9929531590ec"
  - "https://mobbin.com/screens/5da431f9-f050-424c-92b9-40522bb7cccb"
  - "https://mobbin.com/screens/cae51397-2fa9-4e28-9426-ee99b8cfe395"
  - "https://mobbin.com/screens/07a2eeb8-1f5f-46d9-bbba-f8c56a989025"
  - "https://mobbin.com/screens/53fd138d-3c0b-4832-824b-657e6563e36b"
  - "https://mobbin.com/screens/ecf0ad43-2bdc-4950-af5d-774b414a4a48"
updated: 2026-07-08
---

# Home Feed with Bottom Tab Navigation (iOS)

Based on real screens from Reddit, Medium, BuzzFeed, and Neverthink on Mobbin.

## Observed patterns

### Tab bar anatomy
- [BuzzFeed](https://mobbin.com/screens/07a2eeb8-1f5f-46d9-bbba-f8c56a989025) runs the classic 5-tab bar: Home, News, Shopping, Quizzes, Search — outline icons **with text labels**, active tab tinted in the brand gradient/purple, inactive tabs gray, on a white bar above the home indicator.
- [Medium](https://mobbin.com/screens/cae51397-2fa9-4e28-9426-ee99b8cfe395) uses 4 icon-only tabs (home, search, bookmarks, profile avatar); the active tab is the filled icon variant, inactive are outlines. Its [dark-mode home](https://mobbin.com/screens/857360ff-cae6-4b2c-a198-9929531590ec) keeps the identical structure — tab bar sits on the dark surface with the same filled/outline logic.
- [Reddit](https://mobbin.com/screens/27c8555f-f63a-40f5-b83f-ab2c62472421) uses 5 icon-only tabs with a **center "+" create tab**; active = filled black glyph.
- [Neverthink](https://mobbin.com/screens/ecf0ad43-2bdc-4950-af5d-774b414a4a48) reduces to 3 tabs (profile, grid/browse, favorites) with the middle browse tab active in cyan — viable only because the app has very few top-level areas.
- Home/primary feed is always the **first (leftmost) tab and the launch tab**.

### Header zone above the feed
- Medium: large-title "Home" top-left with a notification bell top-right (bell carries a green unread dot in dark mode).
- Reddit: compact header with avatar (status-dotted) left, full-width search field center, coin/reward icon right.
- BuzzFeed: centered brand logo, settings gear left, "Sign In" text button right.
- The header scrolls away or condenses; the tab bar never moves.

### Second-level navigation: horizontal chips/tabs under the header
- Medium's [light feed](https://mobbin.com/screens/cae51397-2fa9-4e28-9426-ee99b8cfe395): a horizontally scrollable chip row — leading "+" chip to add topics, "For you" as a filled dark pill (selected), "Following" and topic chips ("Immigration") as light gray pills.
- Reddit: text tabs "News · Home · Popular" with an underline indicator on the active one.
- BuzzFeed: scrollable underline tabs ("Recently Viewed, Latest, Trending, …") including a yellow "NEW" badge chip; its [quiz feed](https://mobbin.com/screens/53fd138d-3c0b-4832-824b-657e6563e36b) shows the same strip scrolled mid-list (Health, LGBTQ, Music…), with the active item underlined in purple.
- This chip/underline strip is the standard way to fork one feed into personalized/temporal variants without new tabs.

### Feed content layout
- Medium's list cell: author byline row (tiny avatar + name + publication) → bold 2–3 line headline → gray metadata row (date, read time) → small square thumbnail right-aligned; bookmark and overflow "…" actions per cell. Text leads, image supports.
- BuzzFeed uses a 2-column card grid: large image on top, headline below, category badge ("QUIZ") overlaid on the image corner.
- Medium (dark) shows a green circular **compose FAB** floating above the tab bar, bottom-right — creation kept out of the cell layout.
- Neverthink uses a full-bleed media player pinned top with a channel grid beneath — feed-as-player variant.

### Loading states
- Medium's [skeleton screen](https://mobbin.com/screens/5da431f9-f050-424c-92b9-40522bb7cccb) mirrors the real cell geometry exactly: gray avatar circle, headline bars, thumbnail block — header, chip row, and tab bar all render immediately.
- BuzzFeed's skeleton does the same with gray card blocks in the grid; Reddit shows a centered branded spinner with chrome (search, tabs, tab bar) already interactive. Skeletons that preserve layout read as faster than spinners.

## Design rules derived

**Do**
1. Use 3–5 bottom tabs; put the primary feed first and land there on launch.
2. Pair icons with labels unless the icons are unambiguous (home, search, profile); when going icon-only, use filled-vs-outline plus tint to mark the active tab.
3. Keep the tab bar persistent and stationary; scroll or collapse the header instead.
4. Reserve the tab bar for top-level destinations; feed variants (For you / Following / topics) belong in a horizontal chip or underline-tab row directly under the header.
5. Make the selected chip visually inverted (filled dark pill vs light gray pills, per Medium) — underline alone is weak at chip size.
6. In feed cells, lead with the headline; keep thumbnails small and right-aligned for text-first content, or use image-top card grids for visual content.
7. Give every cell a metadata line (source, time, engagement) in ~12–13pt gray, and an overflow "…" for per-item actions.
8. Put creation behind a FAB (Medium) or a dedicated center tab (Reddit) — never buried in a menu if it's the core action.
9. Ship skeleton screens matching the final layout; render header, chips, and tab bar instantly while content loads.
10. Badge sparingly: a small dot on the bell (Medium) or one "NEW" chip (BuzzFeed) — single-point notifications, not counts everywhere.

**Don't**
1. Don't exceed 5 tabs or hide tabs behind a "More" item at this nav level.
2. Don't move top-level destinations into the chip row or vice versa — the two rows have distinct jobs.
3. Don't block the whole screen with a spinner when chrome could already be interactive (Reddit's spinner is the weakest loading pattern seen here).
4. Don't mix underline tabs and pill chips in the same strip; pick one selected-state language.

## Anti-patterns seen

- **Unlabeled ambiguous tabs** (Neverthink): a grid icon and heart with no labels force guessing; fine at 3 tabs, hostile at 5.
- **Auth action stranded in the header** (BuzzFeed's "Sign In" top-right): easy to miss; sign-in prompts convert better contextually (on save/comment attempts).
- **Chip row overflow with no affordance** (BuzzFeed): the category strip cuts off mid-word ("Coronavi…") — acceptable, but only because truncation itself signals scrollability; avoid ending strips exactly at a chip boundary.
- **Spinner-only first paint** (Reddit): perceived load time is worse than skeleton equivalents in the same corpus.
