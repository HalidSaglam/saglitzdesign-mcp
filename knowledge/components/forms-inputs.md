---
id: forms-inputs
title: "Forms & Inputs — Design Guide"
category: component
platform: both
tags: [forms, inputs, validation, labels, mobile-keyboard]
sources: ["https://www.nngroup.com/articles/form-design-white-space/", "https://m3.material.io/components/text-fields", "https://developer.apple.com/design/human-interface-guidelines/text-fields"]
updated: 2026-07-08
---

# Forms & Inputs — Design Guide

Forms are where products lose users. Every field must earn its place.

## Structure

- **Single column always** (multi-column forms cause skipped fields and eye-path zigzag). Exception: tightly-related pairs (First/Last name, City/ZIP, MM/YY + CVC).
- Order fields easiest → hardest; ask for sensitive data (phone, payment) last.
- Group related fields with headings and 24–32px group spacing; 16–24px between fields.
- Cut every field you can derive, default, or postpone. Each removed field measurably raises completion.
- Long forms: split into steps (wizard) with a progress indicator; 3–6 fields per step beats one 20-field page.

## Labels & placeholders

- **Always visible labels above the field** (not placeholder-as-label — it vanishes on focus, kills recall, fails accessibility).
- Floating labels (Material filled/outlined fields) are acceptable; top-aligned static labels test fastest.
- Placeholders only for format examples ("name@company.com"), in muted color, never required info.
- Mark **optional** fields ("Optional" suffix) rather than starring required ones when most fields are required.
- Label ↔ input programmatic association is mandatory (`<label for>`, `aria-labelledby`).

## Input ergonomics

- Input height: 44–56px mobile, 40–48px desktop; text ≥16px on mobile (prevents iOS zoom-on-focus).
- Use correct types/attributes: `type="email|tel|url|number"`, `inputmode`, `autocomplete` (huge mobile win: `autocomplete="email"`, `"one-time-code"`, `"cc-number"`…).
- Show the right mobile keyboard per field; never force numeric entry on a text keyboard.
- Support paste everywhere, especially OTP and password fields.
- Password fields: show/hide toggle; show requirements up front as a live checklist, not after failure.

## Validation

- **Validate on blur (or on submit), never on every keystroke while the user is still typing** — except live-positive confirmation (username availability, password checklist).
- "Reward early, punish late": once a field was marked invalid, re-validate on each keystroke so the error clears immediately when fixed.
- Error messages: below the field, red text + icon (not color alone), specific and actionable — "Enter a valid email like name@domain.com", never "Invalid input".
- On submit with errors: scroll/focus to the first error; summarize count for screen readers (`aria-live`).
- Never clear the form on error. Never.

## Selection controls

- ≤5 mutually-exclusive options: radio group / segmented control. 6+: select/dropdown or searchable combobox.
- Multi-select ≤7: checkboxes; more: multi-select combobox with chips.
- Toggles/switches: only for instant-effect settings (no Save button); checkboxes for form consent/choices requiring submit.
- Date input: use platform date pickers on mobile; on web allow typed entry alongside the picker.

## Anti-patterns

- Placeholder-only labels; ALL-CAPS labels; centered-text inputs.
- Resetting scroll or clearing fields after a validation error.
- Disabling paste in password/OTP fields.
- Dropdowns for 2–4 options, or for well-known sets better typed (country of residence when most users are one country — default it).
- Inline "success" checkmarks on every trivially-valid field (noise).
- CAPTCHAs before any user investment; put friction after intent is shown.
