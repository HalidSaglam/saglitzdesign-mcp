---
component: navigation
description: A labelled tab bar for compact widths and a matching sidebar for dashboards — active state is a shape, not colour alone.
---

# Navigation

## Required states
default, selected, hover/focus, disabled (a destination that is not yet available).

## Accessibility
- Compact (web/mobile): a `nav` with `aria-label`, each destination a link or button. The selected item has `aria-current="page"` (or `aria-selected` in a tablist). Icon + visible label; icon-only is not this recipe.
- Sidebar (web app): same destinations in a complementary landmark. Selected item has an accent bar (shape) plus `aria-current="page"`.
- Keyboard: Tab moves between destinations; the selected one is in the tab order. Targets ≥44px / 44pt / 48dp.
- Native: iOS `TabView` (3–5 items, label always on); Android `NavigationBar` compact / `NavigationRail` at medium width — same destinations, never both at once.

## SaglitzDesign rules
- 3–5 top-level destinations. Nouns, 1–2 words.
- Active state is a filled icon plus an indicator bar or pill — never colour alone.
- One primary create action, if any, is a FAB / prominent button, not a sixth tab.
- Respect `prefers-reduced-motion`; indicator movement is transform/opacity only.
