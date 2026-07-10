---
component: button
description: A single-action trigger with clear variant hierarchy and a stable loading state.
---

# Button

## Variants
- **primary** — the one high-emphasis action per view. Filled, brand color.
- **secondary** — supporting action. Outline / muted fill.
- **ghost** — low-emphasis, text-only until hover.
- **destructive** — irreversible/negative actions. Red, still requires confirmation upstream.

## Sizes
- `sm` — 32px min height (compact toolbars only)
- `md` — 44px (default; meets the ≥44px touch target)
- `lg` — 52px (primary CTAs)
Horizontal padding scales with size; icon-only buttons must stay ≥44px square.

## Required states
default, hover, focus-visible, active (pressed), disabled, loading.
- **loading**: show a spinner, set `aria-busy="true"`, disable interaction, and KEEP THE BUTTON WIDTH FIXED so layout never jumps. Label text is visually hidden but preserved for screen readers.
- **disabled**: `disabled` attribute + reduced opacity; never rely on color alone.

## Accessibility
- Real `<button>` element; `type` defaults to `button` (opt into `submit`).
- Visible `focus-visible` ring (2px, offset) — never remove the outline.
- Icon-only buttons require `aria-label`.
- Contrast ≥ 4.5:1 for label text in every variant.
- Keyboard: Enter/Space activate (native).

## SaglitzDesign rules
- One primary action per view — enforce in composition, not the component.
- Labels are **verb-first**: "Save changes", "Delete project", "Send invite" — never "OK", "Submit", "Yes".
- Only animate `transform`/`opacity`; transitions ease-out on enter, ease-in on exit.
- Design every state; disabled and loading are not afterthoughts.
