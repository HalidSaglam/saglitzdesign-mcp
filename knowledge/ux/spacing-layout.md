---
id: spacing-layout
title: "Spacing, Grids & Layout"
category: ux
platform: both
tags: [spacing, grid, layout, whitespace, responsive]
sources: ["https://m3.material.io/foundations/layout/understanding-layout/overview", "https://developer.apple.com/design/human-interface-guidelines/layout"]
updated: 2026-07-08
---

# Spacing, Grids & Layout

## The 8-point system

All spacing, sizes, and positions on an 8px grid; 4px for fine adjustments (icon padding, tight label gaps).

Canonical scale: **4, 8, 12, 16, 24, 32, 48, 64, 96, 128**.

| Token | Use |
|---|---|
| 4 | icon↔label gap, chip padding |
| 8 | related elements (label↔input) |
| 12–16 | component internal padding; between fields |
| 24 | between component groups; card padding (roomy) |
| 32–48 | between subsections |
| 64–96(–128) | between page sections (marketing) |

**Proximity is grouping**: spacing must encode hierarchy — gap within a group < gap between groups, always. Most "cluttered" designs violate this, not the amount of content.

## Screen margins & containers

- Mobile app: 16px side margins (20–24px roomier feel); iOS safe areas + Android gesture insets always respected.
- Web content container: 1140–1280px max-width for marketing; prose max 65–72ch; dashboards can go fluid with 24px gutters.
- Section vertical padding (marketing): 80–120px desktop, 48–64px mobile.

## Grids

- Web: 12-column, 24px (desktop) / 16px (mobile) gutters. Columns for alignment discipline — content blocks span 6/8/12, not arbitrary widths.
- Mobile app: single column with consistent margins; 2-column card grids for galleries/dashboards (8–12px gap).
- Breakpoints (practical): 640 / 768 / 1024 / 1280. Design mobile-first; at each breakpoint reflow (stack→2-col→3-col), don't just shrink.
- Vertical rhythm: consistent section spacing multiplied from the same scale; align baselines across columns.

## Layout patterns that work

- **F-pattern** for text-heavy pages (front-load first two paragraphs & left edge); **Z-pattern** for sparse hero layouts (logo → nav → visual → CTA).
- Alternating image/text rows ("zig-zag") for feature sections — cap at 3–4 before it gets monotonous; break with a full-width band or bento grid.
- Bento grids: mixed-size tiles in one gap system; every tile same radius/gap; 1–2 hero tiles max.
- Split-screen hero: 50/50 or 60/40 copy/visual; copy side carries the CTA above the fold.
- Sticky sidebar/summary (checkout, docs TOC) after content exceeds viewport.

## Alignment rules

- Pick one left edge per screen region and never violate it by 1–2px — "almost aligned" reads as sloppy faster than unaligned.
- Optical alignment beats mathematical: icons/triangles need 1–2px nudges; text baseline alignment over bounding-box centering.
- Don't center-align multi-line body text or forms; center is for short display content.

## Density modes

- Consumer/marketing: generous (1.5–2× the spacing you first try).
- Productivity/data tools: compact rows (32–40px), 8–12px paddings — but keep grouping ratios intact.
- If offering both, make density a token multiplier, not a redesign.

## Anti-patterns

- Random values (13px, 18px, 27px) — every off-scale value is future inconsistency.
- Equal spacing everywhere (no hierarchy — the "gray soup" layout).
- Full-width text lines on desktop (>90ch), content hugging viewport edges on mobile.
- Horizontal page scroll at any breakpoint; fixed heights that clip translated/longer text.
