---
component: table
description: A semantic data table with a caption, column headers, and a selected-row indicator that is not colour alone.
---

# Table

## Required states
default, row hover/focus, selected row, empty, loading, sorted column.

## Accessibility
- Web: a real `<table>` with `<caption>`, `<th scope="col">`, and row headers where the first cell names the row (`scope="row"`). Do not rebuild this with divs.
- Keyboard: Tab to the table; arrow keys move between cells or rows if it is an interactive grid (`role="grid"`). A read-only table is just a table.
- Selected row: `aria-selected` plus a leading bar or checkbox — never a background tint alone.
- Native: iOS `List` / `Table` (Mac). Compose: a scrollable column of rows, or `LazyColumn`. Don't fake a spreadsheet on a phone.

## SaglitzDesign rules
- One accent for the selected indicator and sort caret.
- Numeric columns are tabular/right-aligned. Don't truncate the identifying column.
- Empty and loading are first-class; don't leave a blank `<tbody>`.
