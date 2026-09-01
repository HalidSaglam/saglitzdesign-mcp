---
component: badge
description: A short status or count label. Colour is never the only signal; a pill, not a gradient.
---

# Badge

## Variants
neutral, accent, danger. Count (numeric) uses tabular figures.

## Required states
default, with count, empty (hide it — a "0" badge is noise unless the count itself is the job).

## Accessibility
- Text is the name. An icon-only badge needs `aria-label`.
- Contrast ≥ 4.5:1 for the label against the pill.
- Don't use colour alone for status — "Due" in the accent pill, "Overdue" in the danger pill, both with the word.
- Native: SwiftUI `Capsule` label or `.badge()` on a tab. Compose: `Badge` / `BadgedBox` for counts; a small `Surface` for a status word.

## SaglitzDesign rules
- One radius: the pill (`rounded-full` / 9999px). Don't mix with `rounded-2xl`.
- No gradient fill, no `animate-pulse`. Accent is house indigo; danger is red; default is neutral.
- Keep it short — one or two words, or a count.
