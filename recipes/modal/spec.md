---
component: modal
description: An accessible dialog that traps focus, closes on Escape, and returns focus to its trigger.
---

# Modal

## Required states
closed, opening (enter), open, closing (exit).
- Enter: backdrop fades in, panel scales/translates up — ease-out.
- Exit: reverse — ease-in. Both respect `prefers-reduced-motion` (fade only, or none).

## Accessibility
- `role="dialog"` + `aria-modal="true"`.
- Labelled by its title via `aria-labelledby`; optional `aria-describedby` for body copy.
- **Focus trap**: Tab/Shift+Tab cycle within the dialog only. On open, focus moves to the first focusable element (or the panel). On close, focus **returns to the trigger**.
- **Escape** closes the dialog.
- **Backdrop click** closes ONLY non-destructive dialogs. For destructive/confirm flows, disable backdrop-close so a click can't discard work.
- Background content is inert (`inert`/`aria-hidden`) and does not scroll.

## Layout / actions
- One primary action; it sits on the **right** of the footer, secondary/cancel to its left.
- Close "X" in the top-right has an `aria-label`; all targets ≥ 44px.
- Max-width ~28rem for confirmations; panel scrolls internally if content overflows.

## SaglitzDesign rules
- One primary action per dialog; labels are verb-first ("Delete project", "Save and close").
- Only animate `transform`/`opacity`; ease-out enter, ease-in exit.
- Visible focus on every interactive element; design the closing state too.
- The html-css version uses the native `<dialog>` element for the backdrop + top-layer.
