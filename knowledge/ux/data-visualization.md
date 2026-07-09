---
id: "data-visualization"
title: "Data Visualization: Charts, Dashboards, and Telling the Truth with Numbers"
category: "ux"
platform: "both"
tags: [dataviz, charts, dashboards, tufte, storytelling-with-data]
updated: "2026-07-09"
sources:
  - "https://www.edwardtufte.com/notebook/chartjunk/"
  - "https://en.wikipedia.org/wiki/Edward_Tufte"
  - "https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html"
  - "https://www.storytellingwithdata.com/"
  - "https://www.goodreads.com/book/show/26535513-storytelling-with-data"
  - "https://blog.datawrapper.de/colorblind-check/"
  - "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric"
---

# Data Visualization

A chart is an argument, not decoration. Every visualization you produce must make one
point faster than the same numbers in a paragraph would. If it does not, remove it. This
document is the ruleset an AI design assistant applies whenever it draws a chart, builds a
KPI tile, or lays out a dashboard. Where a `dataviz` skill is available in the environment,
defer to it for palette generation and validation — the rules below are the underlying
principles it operationalizes.

## Part 1 — Tufte: the structural foundation

Edward Tufte established the measurable grammar of honest, high-density graphics. Treat
these as non-negotiable defaults.

### Maximize the data-ink ratio
Data-ink is the ink (pixels) that would change if the data changed. Everything else is
non-data-ink. Tufte's ratio is data-ink divided by total ink; push it toward 1 by erasing
non-data-ink first, then erasing redundant data-ink.

- Delete heavy gridlines; if you keep any, make them faint (a light gray, low opacity) so
  they recede behind the marks.
- Remove chart borders, boxes, and background fills.
- Drop tick marks that duplicate a label already present.
- Do not outline bars or add drop shadows. A filled bar needs no stroke.
- Direct-label lines and bars at their end instead of drawing a heavy axis and a legend.

Caveat: data-ink minimization is a heuristic, not a religion. A little redundant ink (a
value label, a reference line) that speeds comprehension is worth its cost. Never strip a
chart so bare that it becomes a puzzle.

### Eliminate chartjunk
Chartjunk is Tufte's term for graphical elements that carry no information or actively
obscure it: moiré vibration patterns, gratuitous 3-D extrusion, decorative clip-art, faux
textures, and "ducks" (charts styled into pictures). Rules:

- Never render a chart in 3-D. 3-D distorts area and hides marks behind other marks.
- No gradients, bevels, or glows on bars, slices, or points.
- No background images behind plotted data.
- Color and shape must encode data, never mood.

### Small multiples
When you must compare many series or many categories, do not overplot them onto one busy
chart. Repeat a small, identical chart once per category in a grid — same axes, same scale,
same encoding. The reader learns the shape once, then scans. Small multiples beat a single
crowded chart and beat animation for comparison, because everything is visible at once.

- Keep every panel on an identical scale; a shared scale is what makes them comparable.
- Sort panels by a meaningful order (magnitude, geography, time), never alphabetically by
  default.
- Keep each panel small; the power is in the array, not the individual.

### Graphical integrity and the lie factor
The lie factor is the size of the effect shown in the graphic divided by the size of the
effect in the data. Honest graphics sit at 1.0.

- Bar and column charts must start their value axis at zero. Truncating a bar axis inflates
  differences — a classic lie-factor violation.
- Line charts may use a non-zero baseline because they encode change via slope, not area —
  but label the axis clearly and never imply a false floor.
- Keep area proportional to value. Never scale an icon or bubble by its height when the eye
  reads its area (that squares the distortion).
- One axis, one scale. No dual y-axes unless unavoidable, and if used, make the pairing
  explicit — dual axes let you manufacture almost any correlation.

### Sparklines
A sparkline is a word-sized, axis-free line or bar chart embedded inline in text, a table
cell, or a KPI tile. Use them to show trend and variation next to the current value without
spending layout space. Show the latest point (a dot) and optionally a shaded normal band.
They are ideal in dense tables and metric rows.

## Part 2 — Knaflic: the storytelling layer

Tufte makes a chart honest and dense. Cole Nussbaumer Knaflic's *Storytelling with Data*
makes it land with a business audience. Apply this layer on top of Tufte.

### Declutter relentlessly
Every element added to a view spends the audience's cognitive load. Before shipping a chart,
remove: chart borders, gridlines, redundant axis labels, data markers you do not need,
legends you can replace with direct labels, and background shading. Ask of each pixel:
"does removing this lose information?" If not, remove it.

### Focus attention with preattentive attributes
The eye processes certain properties — color, size, position, intensity, orientation,
enclosure — before conscious attention. Use them deliberately to point at the one thing that
matters:

- Gray everything, then color the single series or bar the story is about. One accent color
  against neutral gray is the single most powerful move in business dataviz.
- Use bold weight or larger size on the number the audience should remember.
- Reserve red and green for genuinely good/bad semantics, and never rely on them alone (see
  accessibility below).
- Do not use color decoratively. If more than one hue is "important," nothing is.

### Annotate the insight
A chart titled "Revenue by Quarter" makes the reader do the work. Instead, write the takeaway
as the title: "Revenue fell 12% after the Q3 price change." Add a short annotation directly
on the relevant point or region. The words carry the conclusion; the chart is the evidence.
State the "so what" in the title; support it in the marks.

### Charts to avoid
- **Pie and donut charts.** The eye compares angles and arc areas poorly. Anything beyond
  2–3 slices is unreadable, and you cannot rank slices reliably. Use a bar chart instead;
  if part-to-whole is truly the point and slices are few, a single stacked bar or a labeled
  bar chart still beats a pie.
- **3-D anything.** Covered above — it distorts and occludes.
- **Secondary y-axes**, dense legends the reader must ping-pong to, and rainbow categorical
  palettes where every category screams.

## Part 3 — Which chart, when

Choose the chart from the question being asked, not from novelty. The decision guide:

- **Categorical comparison (which is biggest?)** → horizontal bar chart, sorted by value.
  Horizontal bars fit long labels and rank cleanly. Start the axis at zero.
- **Trend over time** → line chart. For comparing the change between exactly two time points
  across many categories, use a slope chart. Time goes on the x-axis, left to right.
- **Correlation / relationship between two measures** → scatter plot. Add a trend line only
  when a relationship genuinely exists; note that correlation is not causation in the copy.
- **Part-to-whole** → stacked bar for a few components, but only when the total matters and
  components are few. Beyond ~4 segments, switch to small multiples or a plain sorted bar.
- **100% stacked bar** → use for composition share across categories, but warn: only the
  bottom segment shares a common baseline, so middle segments are hard to compare precisely.
  Prefer it for "share of total" framing, not exact reads.
- **Single number / KPI** → a large-type stat tile with the value, a short label, and a
  comparison (vs. prior period or target). Optionally a sparkline. Use when one number is
  the whole story.
- **Distribution** → histogram or box plot; for a single distribution a histogram, for
  comparing several a set of box plots or a strip/beeswarm.
- **Exact values matter, or the data is sparse and mixed** → a table. When the reader needs
  to look up a precise figure or the dataset is small and heterogeneous, a well-formatted
  table beats any chart. Right-align numbers, use tabular figures, and consider embedded
  sparklines or tiny bars in cells.

Rule of thumb: if you cannot name the single question the chart answers, you have not earned
the chart yet.

## Part 4 — Dashboard design

A dashboard is not a chart dump. It is a designed reading order.

### Inverted-pyramid layout
Lead with the conclusion, then supporting detail, then granular breakdowns. The most
important metric goes top-left, because left-to-right, top-to-bottom is the default scan path
in LTR locales (mirror for RTL). A viewer should get the headline in the first two seconds
without scrolling.

### Limit the tile count
Cap a single view at roughly 5–7 tiles. Beyond that, the viewer satisfices and ignores the
rest. If you have more to show, split into tabbed or linked views by audience or by question,
not one infinite wall. Resist dashboard sprawl — a dashboard that answers every possible
question answers no question well.

### Consistent encoding across the whole dashboard
- One metric, one color, everywhere. If "revenue" is teal in the top chart, it is teal in
  every chart. Inconsistent color encoding is the most common dashboard defect.
- Consistent number formats, date formats, and axis conventions across tiles.
- Align tiles to a grid; ragged edges read as broken.
- Group related tiles with whitespace and shared headers, not boxes and borders.

### Design the empty and loading states
Every tile needs a defined zero-data, loading, and error state. A blank tile looks broken;
show a skeleton while loading and an explicit "no data for this range" message otherwise.

## Part 5 — Accessible charts

A chart that only works for full-color vision is a broken chart.

- **Do not rely on color alone.** Roughly 1 in 12 men has a color-vision deficiency.
  Redundantly encode with position, shape, direct labels, or texture so the chart still reads
  in grayscale.
- **Use colorblind-safe palettes.** Prefer palettes validated for deuteranopia/protanopia
  (for example Okabe-Ito for categorical data, or ColorBrewer sequential/diverging ramps).
  Avoid the red/green pairing as the only distinction. Run the palette through a colorblind
  simulator before shipping.
- **Direct-label over legends.** A legend forces the eye to leave the data, memorize a
  color, and come back. Label lines at their end and segments in place wherever room allows.
  Reserve legends for when direct labeling truly will not fit.
- **Contrast.** Marks and text must meet contrast minimums against the background; faint gray
  data on white fails for low-vision users. Axis text should meet normal text contrast.
- **Provide a text alternative.** Charts need a concise alt text or an adjacent data table so
  screen-reader users get the same conclusion.
- **Do not encode meaning in hue alone for status** (good/bad); pair with an icon or word.

## Part 6 — Number formatting

Numbers in charts and tables are typography. Format them like a designer.

- **Tabular figures.** Use `font-variant-numeric: tabular-nums` (or a font's tabular
  figures) for any column or animated counter of numbers so digits align vertically and do
  not jitter. Proportional figures are fine in prose, wrong in tables.
- **Right-align numeric columns** so the ones, tens, and hundreds line up for scanning;
  left-align text columns.
- **Round to a decision-relevant precision.** Do not show $1,234,567.89 when the reader needs
  "$1.2M." Match precision to the decision, and keep precision consistent within a column.
- **Abbreviate large numbers** (K, M, B) consistently, and show full precision on hover or in
  a tooltip when exactness matters.
- **Always carry units** — currency symbols, %, per-unit — either on the axis title or the
  first value, not repeated noisily on every gridline.
- **Show comparison context** on KPIs: a bare number is meaningless; pair it with a delta vs.
  prior period or target, and color/arrow the delta (redundantly, not by color alone).
- **Localize** separators and currency by locale; 1,000.5 in en-US is 1.000,5 elsewhere.

## The one-line test

Before shipping any visualization, state its single takeaway in one sentence. If you cannot,
the chart is not done. If you can, put that sentence in the title.
