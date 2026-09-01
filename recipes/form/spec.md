---
component: form
description: A short form with labeled fields, an accessible error, a primary submit, and a marketing opt-in that defaults to off.
---

# Form

## Required states
idle, submitting, error on a field, success, disabled. Marketing / newsletter opt-in is **unchecked** at rest.

## Accessibility
- A real `<form>` (web) / `Form` (SwiftUI) / column of fields (Compose). Submit is a `<button type="submit">` or the platform equivalent — never a `<div>`.
- Every field has a visible label. Placeholder is not the label.
- One error at a time is announced (`role="alert"` / `aria-invalid` + `aria-describedby`). Never colour alone.
- Required vs optional is written next to the label, not as an asterisk-only hint.
- Autocomplete tokens on email, name, organisation.

## SaglitzDesign rules
- One primary submit. Verb-first ("Create account", never "Submit").
- Marketing opt-in is a checkbox that starts **off**. Pre-ticking it is a named tell in `ethical-design` / `audit_ethical_design`.
- Decline / skip copy, if present, is "No thanks" — never confirmshaming.
- Native: SwiftUI `Form` + `Toggle`; Compose `OutlinedTextField` + `Checkbox`. Don't fake a web form on a phone.
