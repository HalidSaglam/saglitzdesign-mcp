---
component: tabs
description: Accessible tabs with roving tabindex, arrow-key navigation, an active indicator, and a deep-linking note.
---

# Tabs

Use for switching between peer views of the same context. For navigation between
pages, use links, not tabs.

## Required states
For each tab: default, hover, focus-visible, selected, disabled.
The selected tab has an **active indicator** (underline bar) AND `aria-selected`
— never encode selection by color alone.

## Accessibility (WAI-ARIA tabs pattern)
- Container `role="tablist"` (add `aria-label`), each tab `role="tab"`, each panel `role="tabpanel"`.
- Wire relationships both ways: tab `aria-controls` -> panel `id`; panel `aria-labelledby` -> tab `id`.
- Selected tab has `aria-selected="true"`; others `false`.
- **Roving tabindex**: only the selected tab has `tabindex="0"`; the rest `tabindex="-1"`.
  Tab key enters/leaves the tablist as one stop; arrows move between tabs.
- **Keyboard**:
  - Left/Right (or Up/Down for vertical) move focus AND select (automatic activation).
  - Home/End jump to first/last.
  - Focus wraps at the ends.
- Each `tabpanel` is focusable via `tabindex="0"` (so keyboard users reach panel content) and
  labelled by its tab.

## Sizing
- Tab hit area ≥ 44px tall. Indicator is 2px, aligned to the tab's bottom edge.

## Deep-linking
- Tabs are deep-linkable: sync the active tab to the URL hash or a `?tab=` query
  param. On mount, read it to set the initial tab; on change, `history.replaceState`
  so back/forward isn't polluted. Keep tab ids URL-safe. (See the React example's note.)

## SaglitzDesign rules
- One selected tab at a time; automatic activation keeps it a single decision.
- Visible focus ring, ≥44px targets, contrast ≥ 4.5:1 on labels.
- Only animate transform/opacity (the indicator slides via transform); ease-out.
