---
component: empty-state
description: The three-part empty state (icon → headline → explanation → one primary CTA) with first-use, no-results, and error variants.
---

# Empty State

A screen has data, is loading, has an error, or is empty — empty is a designed
state, not a blank area. Structure: **visual slot → headline → explanation → one CTA**.

## Variants
- **first-use** — nothing exists yet. Encouraging headline + the primary "create" CTA.
- **no-results** — a filter/search returned nothing. Echo the **query** back, and offer a
  **"Clear search"** action so users aren't stuck. (The query is user-controlled — always
  render it as text, never as HTML.)
- **error** — the fetch failed. Neutral explanation + a **"Try again"** retry CTA. Distinct from
  empty: don't tell users "nothing here" when the request actually broke.

## Required states
Each variant is itself a state. The CTA has default/hover/focus-visible/active.
Optionally a `loading` retry (spinner in the button, `aria-busy`).

## Accessibility
- The block is a labelled region: `role="region"` or a landmark with an `aria-labelledby`
  pointing at the headline. Decorative icon/illustration is `aria-hidden="true"`.
- Error variant announces politely: wrap it in `role="status"` (or `aria-live="polite"`)
  so screen-reader users learn the load failed.
- Headline is a real heading (`<h2>`/`<h3>`) at the right level for the page.
- One primary action only; any secondary action is clearly lower emphasis and never competes.

## Sizing
- Centered column, `max-width ~ 28rem`, generous vertical padding. CTA ≥ 44px tall.

## SaglitzDesign rules
- **One primary action** — never two equal CTAs in an empty state.
- Explanation is one short sentence; headline is a noun/benefit, not "No data".
- Visible focus, ≥44px targets, contrast ≥ 4.5:1.
- Only animate transform/opacity; ease-out on enter.
