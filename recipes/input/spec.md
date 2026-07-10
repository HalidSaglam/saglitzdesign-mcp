---
component: input
description: A labeled text field with helper text and an accessible error state.
---

# Input

## Required states
default, focus (visible ring), filled, disabled, error, read-only.
- **error**: red border + helper text becomes an error message, wired via `aria-invalid="true"` and `aria-describedby` pointing at the message. Never signal errors with color alone — always show text.
- Helper text and error message share the same `id` slot so screen readers announce whichever is present.

## Accessibility
- Every field has a **visible** `<label>` bound with `htmlFor`/`id`. No placeholder-as-label.
- `aria-describedby` links the input to helper/error text.
- Required fields: `required` attribute + a visible "(required)" or "(optional)" hint; do not rely on the asterisk alone.
- Correct `type` (email/tel/url/password) and `autocomplete` tokens for browser autofill.
- Focus ring is 2px, offset, always visible on keyboard focus.
- Disabled fields still meet contrast for their label.

## Sizing
- Control height ≥ 44px (touch target).
- **Font size ≥ 16px on mobile** so iOS Safari does not zoom on focus.
- Comfortable horizontal padding (12–14px); label sits above the field.

## SaglitzDesign rules
- Design every state — error and disabled are first-class, not afterthoughts.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for the border against the background.
- Visible focus always; only animate `transform`/`opacity` (here: border/ring color, ease-out).
- Label copy is concise and specific ("Work email", not "Email address field").
