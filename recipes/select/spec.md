---
component: select
description: A labelled listbox or native select — one value, keyboard-complete, error as text not colour.
---

# Select

## Required states
closed, open, selected, disabled, error.

## Accessibility
- Always a visible label, never placeholder-as-label.
- Web: native `<select>` is the default. A custom widget is `role="combobox"` + listbox, Arrow keys move, Enter/Space commit, Escape closes, typeahead allowed.
- The selected option is `aria-selected`; the trigger announces the current value.
- Error is supporting text plus `aria-invalid` / `aria-describedby`, not a red border alone.
- Native: SwiftUI `Picker`; Compose `ExposedDropdownMenuBox`. Targets ≥44 / 48.

## SaglitzDesign rules
- One primary accent. Open list uses a 1px border and a check or filled row (shape), not colour alone.
- Don't ship a custom combobox when a native select would do.
