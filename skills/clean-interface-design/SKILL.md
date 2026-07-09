---
name: clean-interface-design
description: Design clean, calm, uncluttered interfaces that don't read as templated AI output. Use when building or restyling any UI (web, iOS, Android, macOS) and it needs visual hierarchy, restraint, spacing discipline, one clear primary action, and a cohesive look. Covers accent color, whitespace, corner radius, type scale, fonts, icons, borders-vs-shadows, and the "remove until it breaks" pass.
---

# Clean Interface Design

Most "AI-looking" UI fails the same way: too many colors, too many type sizes, inconsistent radii, no clear primary action, and no breathing room. Fix those and almost anything looks intentional.

> Full depth (specs, contrast math, tokens, real screenshots) is available via the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`) — tools `search_design_knowledge`, `generate_design_tokens`, `audit_accessibility`, and docs `clean-app-design`, `color-systems`, `typography`, `spacing-layout`, `visual-craft-standards`.

## The rules that do most of the work

1. **One accent color + its soft tints.** Pick a single brand/accent hue. Use it for the primary action and key highlights only (~10% of the surface). Everything else is a neutral ramp. Scarcity is what makes the accent pop.
2. **Whitespace is a feature.** Give elements room to breathe; when unsure, add more space, not more UI. Grouping is communicated by space — gap *within* a group must be smaller than gap *between* groups.
3. **One corner radius system.** Pick a radius and apply it consistently to cards, inputs, buttons, and icon containers. Don't mix 4px cards with 16px buttons. Pill buttons pair with pill inputs.
4. **Two or three type sizes, not five.** A tight scale (e.g. 14 / 16 / 24) with weight and color for hierarchy reads far cleaner than five sizes. Express hierarchy with **size + weight + color (3 opacity levels)**, not more fonts.
5. **One clean font.** A single quality family is enough. Good geometric/neutral options: system fonts (SF/Segoe/Roboto), **Inter**, **Geist**, **Open Runde** (free, rounded-geometric). Two families max — a distinctive display + a workhorse body.
6. **One icon family, one weight.** Use a single cohesive set at a single stroke/weight. Good free sets: **Solar** (incl. duotone), **Lucide**, **Phosphor**, **Heroicons**. Never mix icon families.
7. **Borders OR shadows — pick one.** Choose one system to separate surfaces (borders read better in dark mode; soft shadows on light). Don't stack a border and a shadow and a fill on the same card.
8. **One primary action per view.** Exactly one filled/high-emphasis button per screen or section. Everything else is secondary (tonal/outline) or tertiary (text). Two filled buttons side by side destroy hierarchy.

## Color & contrast

- 60‑30‑10: ~60% neutral surface, ~30% secondary, ~10% accent.
- Body text contrast ≥ 4.5:1; large text / UI elements ≥ 3:1. Don't ship gray-on-gray "because aesthetic."
- Dark mode is not inversion: dark gray surfaces (never pure black behind text), desaturate accents slightly, separate raised surfaces with a subtle lighter border.

## The restraint pass (do this before shipping)

1. **Remove until it breaks.** Delete every element, border, shadow, and color that isn't doing a job. Stop just before the design stops working.
2. **Squint test.** Blur your eyes — the primary action should be the first thing you see.
3. **Align everything** to one grid / one left edge. "Almost aligned" reads as sloppy faster than unaligned.
4. **Real content stress test** — longest string, empty state, 1 item, 100 items.

## Landing pages specifically

The best landing pages don't just look good — they **guide the user toward action without making them think.** One primary CTA, a clear value-first headline, proof near the CTA, and a single obvious path down the page. (See the SaglitzDesign `conversion-ux` and `clean-app-design` docs, and the `build_landing_page` workflow.)

## Anti-patterns

- Multiple accent colors; the accent used for 30% of the screen.
- Five type sizes; three fonts; ALL-CAPS everywhere for hierarchy.
- Mixed corner radii; border + shadow + fill stacked on one card.
- Two competing primary buttons; "Submit"/"Click here" labels.
- Mixed icon families or weights.
- No empty/loading/error states designed.
