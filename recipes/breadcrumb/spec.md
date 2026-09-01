---
component: breadcrumb
description: A short trail that names the current page to assistive tech, not colour alone.
---

# Breadcrumb

## Required states
root (the trail hides — you are home), mid-depth, deep (collapse the middle, keep first and last).

## Accessibility
- Web: `<nav aria-label="Breadcrumb">` wrapping an ordered list. Ancestors are links; the current page is text with `aria-current="page"`, not a link to itself.
- Separators are `aria-hidden`. Do not announce "slash" or "greater than" between items.
- Targets ≥44px / 44pt / 48dp on every ancestor link.
- Native: iOS uses the back button + title, not a trail. This recipe is a compact path for nested settings (Account › Billing) on iPad/macOS and Android. The last item is not tappable and carries a selected trait.

## SaglitzDesign rules
- Start with Home (or the section root). The last item is the page you are on, in a heavier weight — never colour alone.
- Keep it short. Four or more levels: show first, an ellipsis, last two.
- No pill, no gradient, no `rounded-2xl` card around the trail.
- Marketing pages that ship a trail also ship `BreadcrumbList` JSON-LD; this recipe is the visible trail, not the schema.
