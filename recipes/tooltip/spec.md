---
component: tooltip
description: A short label that appears on hover and keyboard focus, dismissed with Escape, and never the only way to name a control.
---

# Tooltip

## Required states
hidden, shown (hover), shown (focus), dismissed (Escape).

## Accessibility
- Tooltips supplement a visible name; they do not replace `aria-label` on an icon-only control. If the only name is the tooltip, use a visually hidden label instead and skip the tooltip.
- Web: the trigger is focusable. The bubble is `role="tooltip"` referenced by `aria-describedby`. Escape hides it. It does not steal focus.
- Appear on hover *and* keyboard focus. A hover-only tooltip is invisible to keyboard users.
- Native: SwiftUI `.help("…")` (pointer) plus `accessibilityHint` where needed. Compose `TooltipBox`.
- Do not put essential instructions only in a tooltip.

## SaglitzDesign rules
- The bubble has a solid surface and a small caret (shape), not a colour wash on the trigger.
- The caret, if branded, uses the primary accent; body text is neutral.
- Reduced motion: no delay animation, just show/hide.
- Delay ~300ms on hover so a mouse passing through does not flash it; no delay on focus.
