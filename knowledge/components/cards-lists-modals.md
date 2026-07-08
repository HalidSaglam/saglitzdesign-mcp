---
id: cards-lists-modals
title: "Cards, Lists, Modals & Sheets — Design Guide"
category: component
platform: both
tags: [cards, lists, modals, bottom-sheets, tables, empty-states]
sources: ["https://m3.material.io/components/cards", "https://developer.apple.com/design/human-interface-guidelines/sheets", "https://www.nngroup.com/articles/cards-component/"]
updated: 2026-07-08
---

# Cards, Lists, Modals & Sheets

## Cards

- A card = one self-contained object with one primary destination. If the whole card is tappable, make the whole card the link (stretched link) and don't nest competing tap targets except explicit secondary actions (⋯ menu, like).
- Internal padding 16–24px; consistent radius (12–16px modern default); either a subtle border **or** a soft shadow — pick one system-wide (borders read better in dark mode; shadows on light).
- Card grids: equal heights per row; clamp titles/descriptions (2–3 lines) instead of letting content dictate ragged heights.
- Don't card everything: cards separate heterogeneous objects. Homogeneous, scannable data belongs in lists or tables — card-grids of identical rows waste 40%+ of space.

## Lists (mobile)

- Row anatomy: leading visual (icon/avatar) → title + optional 1-line subtitle → trailing meta/chevron/control.
- Row height: 44–56px single-line, 64–72px two-line; full-bleed divider or 16px-inset divider — consistent.
- Chevron (›) only when the row navigates; a control (switch) and navigation never share a row.
- Swipe actions: max 2 per side, destructive full-swipe requires confirm or undo; always provide a non-gesture alternative (edit mode, ⋯ menu).
- Infinite lists: skeleton rows on first load, spinner row on pagination, pull-to-refresh where content updates; preserve scroll position on back-navigation.

## Tables (web)

- Left-align text, right-align numbers, align headers with their column data.
- Row hover highlight + entire-row click when rows navigate; sticky header past one viewport; sortable columns show direction arrow.
- Responsive: priority columns + horizontal scroll inside the table container, or collapse to cards below ~640px. Never let the page itself scroll horizontally.

## Modals (dialogs)

- Use a modal only for: confirmations of destructive/irreversible actions, short focused tasks (≤1 screen of content), required decisions. Everything else: inline, page, or drawer.
- Anatomy: title (states the decision), body (consequence), actions right-aligned — primary right, cancel as text/ghost left of it.
- Width 400–560px for confirmations; never nest modals; dim backdrop (~40–60% black); clicking backdrop closes non-destructive modals, Escape always closes.
- Focus management: trap focus inside, focus first meaningful element on open, return focus to the trigger on close. `role="dialog"` + `aria-modal="true"` + labelled title.
- Destructive confirms: name the object and consequence ("Delete 'Q3 Report'? This can't be undone."), destructive button in red, never make destructive the default-focused action.

## Bottom sheets (mobile)

- Default mobile container for filters, pickers, share, secondary tasks — thumb-reachable, keeps context visible.
- Grabber handle at top; detents (medium/large) for progressive content; drag-down and scrim-tap to dismiss; content scrolls only when expanded to full detent.
- Non-modal sheets (e.g., music mini-player, maps) may persist; modal sheets must block and dim.

## Empty states

Every list/collection needs a designed empty state with three parts:
1. **What this is** (one line, human tone, optional lightweight illustration/icon)
2. **Why it's empty / what value it will hold**
3. **A CTA to fill it** ("Create your first project")

Distinguish: first-use empty (educate + CTA), cleared/zero state (positive confirmation — "All caught up"), no-search-results (show the query, offer to clear/adjust filters), error state (apologize, explain, retry).

## Anti-patterns

- Modal-on-load (newsletter popups before content is read), modals for content that should be pages (no URL).
- Cards inside cards; shadows on shadows.
- Lists where every row opens a modal instead of a detail view.
- Empty screens that are literally blank or show a spinner forever.
- Bottom sheets that open at full-screen height for two options.
