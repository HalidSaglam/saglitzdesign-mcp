---
component: pagination
description: Previous / next plus numbered pages, with the current page named to assistive tech and disabled ends.
---

# Pagination

## Required states
first page (Previous disabled), middle, last page (Next disabled), single page (the control hides or disables both ends).

## Accessibility
- Web: `<nav aria-label="Pagination">` wrapping an ordered list of page links/buttons. The current page is `aria-current="page"`.
- Previous / Next are named ("Previous page", "Next page"), not icons alone.
- Targets ≥44px / 44pt / 48dp.
- Native: numbered pages are a web pattern. Prefer a cursor / "Load more" on long lists; ship a compact pager only for short, finite sets. Don't fake a spreadsheet pager on a phone.

## SaglitzDesign rules
- Current page is a filled accent *and* `aria-current` / selected trait — never colour alone.
- Don't invent "page 1 of 1,847" chrome when the list can grow; put the query in the URL on the web.
- Reduced motion: no page-flip animation, just the next set of rows.
