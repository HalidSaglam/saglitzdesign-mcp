---
component: search
description: A search field with a leading icon, a clear button once there is text, and a cancel affordance that dismisses the keyboard.
---

# Search

## Required states
idle (placeholder visible), focused, typed (clear appears), cancelled, loading results, zero-results.

## Accessibility
- A single labelled field. Placeholder is not the label — use `<label>` / `aria-label` / `.searchable` prompt.
- Clear is a button with an accessible name ("Clear"), visible only when the field is non-empty.
- Cancel (touch) dismisses search and the keyboard and returns focus to the trigger.
- Suggestions, if present, are a listbox owned by the field (`aria-controls` + `aria-activedescendant`). Escape closes them first, then cancels search.

## SaglitzDesign rules
- Leading search icon is decorative (`aria-hidden`) once the field has a name.
- Targets ≥44px / 44pt / 48dp for clear and cancel.
- Native: SwiftUI `.searchable`; Compose Material 3 `SearchBar` / `DockedSearchBar`.
- Reduced motion: no expand animation, just the field.
