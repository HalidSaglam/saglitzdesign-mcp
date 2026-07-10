---
component: toast
description: A transient, non-blocking notification that announces politely and auto-dismisses.
---

# Toast

## Variants
success, error, info. Each pairs an icon with a color; never rely on color alone — include an icon and text.

## Required states
enter (slide + fade in), visible, paused (on hover/focus), exit (fade out), dismissed.
- **Auto-dismiss** after a timeout (default ~5s; errors may persist longer or require manual close).
- **Pause on hover and on keyboard focus** within the toast; resume on leave/blur so users have time to read and act.

## Accessibility
- Live region: `aria-live="polite"` + `role="status"` for success/info; use `role="alert"` (assertive) for errors.
- The region container is present in the DOM before toasts appear so updates are announced.
- Dismiss button has an `aria-label` ("Dismiss notification") and is ≥ 44px.
- Focusable content stays reachable; toasts never steal focus.
- Text contrast ≥ 4.5:1 on the toast background.

## Motion
- Enter: translateY/opacity, **ease-out**. Exit: opacity (+ small translate), **ease-in**.
- Only animate `transform`/`opacity`.
- `prefers-reduced-motion`: no slide — appear/disappear via opacity only (or instantly).

## SaglitzDesign rules
- Non-blocking and dismissible; one action at most, verb-first ("Undo", "View order").
- Stack newest-first, bottom or top corner; cap simultaneous toasts (~3).
- Design the paused and exit states, not just the entrance.
