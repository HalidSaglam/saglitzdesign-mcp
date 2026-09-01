---
component: skeleton
description: A static loading placeholder that matches content shape, with no pulse or shimmer.
---

# Skeleton

## Required states
loading (placeholder visible, content not), ready (placeholder gone). Reduced motion is the same as loading — there is no animation to disable.

## Accessibility
- A region with `role="status"`, `aria-busy="true"`, and an accessible name ("Loading invoices"). Do not leave unlabeled gray boxes.
- Placeholder bars are `aria-hidden`. The name on the region is the announcement.
- Native: SwiftUI `.redacted(reason: .placeholder)` on the real layout; Compose: gray boxes in the same slots. Do not invent a CSS pulse on a phone.

## SaglitzDesign rules
- Shape matches the content (a table skeleton looks like rows, not three identical cards).
- No `animate-pulse`, no `animate-shimmer`, no infinite opacity loop. Named in `ai-default-aesthetic`; measured by `audit_generic_design` `stock-pulse-skeleton` at three or more hits.
- Neutral fill only (a mid-light gray / system fill). No indigo pulse.
- When data arrives, replace the region; don't fade the bars on a loop.
