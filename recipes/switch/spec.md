---
component: switch
description: A toggle for instant-effect settings, with role=switch, a 44px hit area, and a reduced-motion-safe thumb slide.
---

# Switch

Use for settings that take effect **immediately** (no Save button). If the change
needs confirmation or a submit step, use a checkbox instead.

## Required states
default (on/off), hover, focus-visible, active (pressing), disabled, and the
two checked states. Every state must be distinguishable without color alone
(the thumb position encodes on/off; a check/track shape reinforces it).

## Accessibility
- `role="switch"` with `aria-checked="true|false"` on a real `<button>`.
- Keyboard: **Space and Enter** both toggle. `<button>` gives Space free; Enter is wired explicitly.
- Label association: wrap in a `<label>` or link with `aria-labelledby` / `aria-describedby`.
  Clicking the label toggles the switch. Do NOT rely on placeholder-style labels.
- Disabled: `disabled` attribute + `aria-disabled`; not focusable; reduced opacity.
- Contrast: the ON track vs OFF track and the thumb vs track both meet ≥ 3:1.

## Sizing
- Control is 52×32 (track), thumb 24px. The interactive target is padded to a
  **≥44×44px hit area** even though the visible track is smaller.

## Motion
- Only the thumb `transform: translateX()` and track `background-color` animate.
- Ease-out, ~150ms. Under `prefers-reduced-motion: reduce` the thumb **snaps**
  (no transition) — the state still reads correctly.

## SaglitzDesign rules
- Instant-effect only; label states the setting, not the action ("Email notifications", not "Toggle").
- ≥44px target, visible focus ring, design every state.
- Only animate transform/opacity(/color); ease-out on enter.
