---
component: list-row
description: A settings/list row — leading icon, title with optional subtitle, and a single trailing accessory (chevron OR control, never both).
---

# List Row

## Grammar
`[leading icon] → title (+ optional subtitle) → [trailing accessory]`
The trailing slot is exactly ONE of:
- **navigation** — a chevron. The whole row is tappable and pushes a new screen.
- **control** — a switch, checkmark, or value+chevron. The control owns the interaction.

Never show a chevron AND a switch: a row is either "go somewhere" or "change a value
here", not both. Mixing them makes the tap target ambiguous.

## Required states
default, pressed (navigation rows only), disabled, selected (checkmark), on/off (switch).
- **navigation**: whole row highlights on press; a spring/opacity feedback, respect Reduce Motion.
- **switch**: the row itself is not tappable — only the switch toggles; label is the switch's name.

## Sizing
- Single-line row ≥ 44pt / 48dp tall; two-line row grows with Dynamic Type / sp.
- Leading icon in a fixed-width column so titles align across rows.

## Accessibility
- Navigation row: one element combining icon + title + "button" trait; chevron is decorative.
- Switch row: label is bound to the switch (`.accessibilityLabel` / `contentDescription`);
  state announced as on/off. Minimum 48dp control target.
- Never rely on color alone for selection — pair with a checkmark or switch state.

## Platform notes
- SwiftUI: use inside `List`; `.swipeActions` for delete/archive (leading/trailing edges),
  destructive uses `role: .destructive`. `NavigationLink` supplies the chevron automatically.
- Compose: Material 3 `ListItem` with `leadingContent`/`trailingContent`; wrap in
  `SwipeToDismissBox` for swipe actions. Switch rows: toggle via `Modifier.toggleable` on the
  row with `role = Role.Switch`, not a separate click.
