---
id: refactoring-ui
title: "Refactoring UI — Tactical Visual Design (Wathan & Schoger)"
category: book
platform: both
tags: [visual-design, hierarchy, spacing, color, typography, polish]
sources: ["Refactoring UI (Adam Wathan & Steve Schoger, 2018)"]
updated: 2026-07-08
---

# Refactoring UI — Tactical Visual Design Tricks

The book's thesis: you don't need innate artistic talent to make interfaces look professional — you need a bag of concrete, repeatable tactics. These are those tactics, stated as rules with before/after framing.

## 1. Starting a design

- **Start with a feature, not a layout.** Don't design the shell (navbar, sidebar, footer) first — design the actual thing the app does ("book a flight": two fields, date, button). The shell falls out of the features, never the reverse.
- **Detail comes later.** Sketch at low fidelity (thick marker, grayscale wireframe) so you can't fuss over fonts and shadows before the flow works. Hold the color.
- **Don't design too much.** Design a screen, build it, then design the next. Real data and real constraints will invalidate speculative screens ("work in cycles").
- **Design the smallest useful version.** If a feature has an optional nice-to-have (comments with attachments), ship the core (comments) first; don't let the enhancement block the design.
- **Choose a personality deliberately** and express it through consistent choices: font (serif = elegant/classic, rounded sans = playful, neutral sans = plain/professional), color (blue = safe, gold = premium, pink = playful), border radius (none = serious, large = friendly — pick one scale and never mix), and language tone. Personality drift (mixed radii, mixed tones) reads as amateur instantly.
- **Limit your choices in advance.** Define systems — a type scale, a spacing scale, a color palette, a shadow scale — then pick from the system instead of the infinite continuum. Deciding among 8 font sizes is fast; deciding among 1–100px is paralysis. If you're ever nudging by 1px, you're missing a system.

## 2. Hierarchy is everything

The single highest-leverage idea: most UIs look bad because everything competes. **Deliberately de-emphasize most things so the few important things win.**

- **Size is not the only (or best) lever.** Instead of huge primary text and tiny secondary text, use **weight and color**: dark high-contrast for primary content, medium grey for secondary, lighter grey for tertiary. Two or three text colors + two font weights (normal ~400/500, bold 600/700) cover almost everything. Before: 24px title / 12px meta. After: 18px semibold dark title / 14px regular grey meta — calmer and clearer.
- **Never use grey text on colored backgrounds** by lowering opacity alone if it looks washed out; instead hand-pick a color with the same hue as the background, lighter and less saturated. On a blue button, "grey" text should be light blue.
- **Emphasize by de-emphasizing.** If an element (e.g., active nav item) won't stand out, don't make it louder — make its siblings quieter (grey the inactive items). Competing-loudness is the default failure mode; subtraction is the fix.
- **Labels are a last resort.** "Name: Erin Lindford / Phone: (555) 765-4321" wastes hierarchy on labels. Most data is self-evident from format (email, price, name) or context. When clarity needs help, fold the label into the value ("12 left in stock", "3 bedrooms") — and when labels are truly needed (dense data-heavy pages, settings), style them as secondary, not as the loud element.
- **Semantics ≠ visual hierarchy.** An `<h1>` doesn't have to be huge; section titles often act as labels and should be small. Style by role in the visual hierarchy, not by HTML tag.
- **Balance weight and contrast.** Icons are visually "heavy" next to text — soften them (lighter grey) to balance. Thin borders that feel too faint: don't darken them, thicken them; too-heavy bold text at small sizes: reduce contrast instead of weight.
- **Actions have hierarchy too.** Per screen: one primary action (solid, high contrast), secondary actions (outline or soft background), tertiary (link-styled). **Destructive ≠ automatically big and red** — if delete isn't the primary action, make it a quiet secondary/tertiary control and save the big red button for the confirmation step.

## 3. Layout and spacing

- **Start with too much white space, then remove.** Dense-by-default reads cramped; generous-by-default reads designed. Only densify deliberately (dashboards, tables where overview is the point).
- **Use a spacing/sizing scale** with multiplicative steps, e.g. 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Adjacent values must differ by a clearly visible ratio (~≥25%); linear 2px steps create indistinguishable choices.
- **You don't have to fill the whole screen.** A 600px-wide form on a 1400px canvas is correct — don't stretch content to the viewport. If a component needs to be small, design it small; spreading a simple form across the full width before: long input rows floating apart; after: narrow centered column, instantly scannable. Likewise, don't shrink the whole design to fit mobile — cut or stack, don't scale.
- **Grids are useful, guides not gospel.** Fixed-width sidebars beat percentage columns (a sidebar shouldn't grow because the screen did). Max-widths beat fluid everything. Let content determine size ("give it what it needs"), then use the grid for alignment.
- **Relative sizing doesn't scale.** Don't define everything in em-of-parent; large elements should shrink faster than small ones across breakpoints (a hero headline drops from 48 to 30px; body stays 16). Same for buttons: bigger buttons need proportionally more padding, small buttons proportionally less.
- **Ambiguous spacing is a bug.** Groups must be closer to their own parts than to neighbors: a heading closer to the text below it than to the section above; a form label closer to its input than to the previous field; list-item spacing greater than intra-item line-height. If grouping is unclear, fix space before adding borders.

## 4. Text

- **Type scale:** hand-pick a fixed set (e.g. 12, 14, 16, 18, 20, 24, 30, 36, 48px) rather than a mathematical ratio that yields fractional sizes. Use px/rem, not em, so sizes don't compound.
- **Font selection heuristics:** for UI, favor neutral sans-serifs with tall x-height; ≥5 weights available is a decent proxy for quality; when unsure, crib font choices from sites you admire; system font stack is a safe default.
- **Line length: 45–75 characters** (~20–35em). Even inside a wide card, constrain paragraph width.
- **Baseline-align mixed sizes** (a big number next to a small unit) rather than center-aligning.
- **Line height is proportional to both size and width:** small text and wide columns need more (up to ~2.0 at 12–14px in wide layouts); large headlines need less (~1.1–1.3). Never one global line-height.
- **Links in UI:** most UI "links" don't need blue+underline; use weight/color subtly, since half the interface is clickable anyway. Reserve loud link styling for links inside prose.
- **Alignment:** left-align by default; right-align numbers in tables (compares magnitudes); center only short, independent blocks. Justify only with hyphenation enabled.
- **Letter-spacing:** tighten slightly on large headlines (fonts are spaced for body sizes); widen for ALL-CAPS labels.

## 5. Color

- **Work in HSL**, not hex — hue/saturation/lightness map to how humans reason about color.
- **You need more colors than you think:** ~8–10 shades of grey, 5–10 shades of the primary, and 5–10 shades of each accent/semantic color (red destructive, yellow warning, green positive) — defined up front, not improvised per screen.
- **Build a shade scale:** pick the base (works as a button background) first, then the darkest (text) and lightest (tinted background) ends, then fill gaps to ~9 steps. Don't generate shades by lightness alone: **as a color lightens, reduce saturation compensation is needed; as it darkens or lightens away from base, increase saturation** to avoid washing out. For brighter perceived shades without white-wash, **rotate hue toward the nearest bright hue** (yellow, cyan, magenta); darker: rotate toward red, green, blue. Never rotate more than ~20–30°.
- **Greys don't have to be grey:** cool greys = saturate with blue; warm greys = saturate with yellow/orange. Pick a temperature and use it everywhere.
- **Accessible doesn't have to be ugly:** to hit 4.5:1 on colored backgrounds, flip the contrast — instead of white text on medium blue, use dark blue text on light blue background. Same for badges/alerts.
- **Never rely on color alone** to convey meaning (colorblind users): pair with icons, text, or position; for positive/negative use contrast (grey vs. red) not just red/green.

## 6. Depth: shadows, layers, borders

- **Light comes from above.** Raised elements (buttons): subtle lighter top edge, small dark shadow below. Inset elements (wells, checked checkboxes, inputs): slightly darker top inner shadow.
- **Define a shadow scale (~5 levels)** and map elevation to meaning: small tight shadows for buttons/cards, medium for dropdowns, large soft for modals. Shadows also serve interaction: increase shadow while dragging; a button pressing down loses its shadow.
- **Two-part shadows look best:** one larger soft ambient shadow + one tighter darker direct shadow; the tight one fades first as elevation increases.
- **Flat designs can still have depth:** lighter = closer, darker = recessed; short vertical offset solid shadows keep depth without gradients.
- **Overlap elements to create layers:** cards straddling two background colors, avatars overlapping a stack (with a background-colored ring to fake a border), an image extending past its card. Overlap instantly reads as "designed."
- **Fewer borders:** before reaching for a 1px line, try a box-shadow, different background colors between sections, or simply more spacing. Border-everything is the #1 cluttered-UI smell.

## 7. Images

- **Use good photos or none.** A mediocre phone snapshot destroys otherwise-good design; use professional stock or real professional photography, or design a no-photo layout.
- **Text over images needs a treatment:** darken overlay, lower image contrast, colorize (desaturate + primary-color multiply), or a soft text-shadow "glow". Never raw white text on a raw photo.
- **Everything has an intended size:** icons designed at 16–24px look chunky and amateur scaled to 3×; instead, keep the icon small inside a colored shape/container. Screenshots shrunk to fit look illegibly dense — take them at small viewport widths, crop to the relevant portion, or draw simplified representations. Favicons enlarged look terrible — recreate simple flat versions.
- **User-generated content:** control the shape (center-crop into fixed containers) and prevent background bleed (a subtle inner shadow/ring instead of a border keeps white logos from disappearing on white cards).

## 8. Finishing touches — cheap polish

- **Supercharge the defaults:** replace list bullets with icons (checkmarks for features, arrows for links), style blockquotes as designed testimonial cards, make checkboxes/radios brand-colored custom controls, promote quotes' quotation marks into graphic elements.
- **Add color with accent borders:** a 3–4px colored border on top of a card, left of an alert, under the active tab, or a full-width page top strip — big polish for zero artistic skill.
- **Decorate backgrounds:** change background color per section, use a subtle gradient (two hues ≤30° apart), a low-contrast repeating pattern or texture, or a few simple geometric shapes anchored to corners — keeps long pages from feeling monotonous.
- **Design empty states deliberately:** they're a first impression. Image/illustration + one-line explanation + prominent CTA; hide the unusable chrome (filters, tabs) until there's content to act on.
- **Fewer borders** (again — it's the highest-frequency fix): spacing, background shifts, and shadows almost always beat lines.
- **Think outside the "expected" component:** a dropdown can be a rich multi-column panel with icons and sections; a table can embed avatars, stacked primary/secondary text, and colored status pills instead of one string per column; radio buttons for plans can be selectable cards.

## 9. Working method

- **Steal deliberately:** when a screen feels off, find a well-designed product solving the same problem and identify *specifically* what they do differently (spacing, shade count, weight contrast).
- **Iterate by subtraction first:** most "make it pop" problems are actually "everything else is too loud."
- **Rebuild your systems as you go:** every one-off value (a 13px font, a #454A52 grey) is a future inconsistency; fold it into the scale or remove it.

## 10. Before → after quick reference

Concrete transformations to apply mechanically when reviewing a screen:

- **Loud metadata:** Before — dates/IDs in the same dark 16px as titles. After — 14px, mid-grey; titles unchanged. The list suddenly has hierarchy.
- **Label-heavy detail view:** Before — "Email: jane@x.com / Role: Admin". After — jane@x.com in dark text, "Admin" as a small tinted pill; labels deleted.
- **Everything bordered:** Before — cards with borders inside a bordered panel with divider lines. After — borders removed, groups separated by background shade + spacing; one shadow on the outer card.
- **Stretched form:** Before — full-width inputs across a 1200px page. After — 480–640px centered column; related short fields (city/postcode) share a row.
- **Buried primary action:** Before — three identical grey buttons. After — one solid primary, one ghost secondary, "Delete" demoted to a red text link.
- **Cramped card:** Before — 8px padding everywhere. After — 24px padding, 12px between internal elements; same content feels premium.
- **Muddy hero text on photo:** Before — white text directly on image. After — image darkened 40% or brand-color multiply; text now readable and on-brand.
- **Giant scaled icon:** Before — 24px icon scaled to 72px in a feature grid. After — 24px icon centered in a 48–64px tinted circle.
- **Wall-of-text table:** Before — 8 plain text columns. After — key column gets two-line primary/secondary stacking, status becomes a colored badge, numbers right-aligned, low-value columns dropped.
- **Timid headline:** Before — 20px grey heading over 16px grey body. After — 30px, weight 700, near-black heading; body stays 16px mid-grey. Contrast, not decoration.

## 11. Component-level recipes

**Buttons:**
- Padding grows non-linearly with size: large CTA ≈ 16×32px padding; default ≈ 10×20; small ≈ 6×12 with a smaller font. Never one padding token for all sizes.
- Hierarchy per screen: solid primary, soft/outline secondary, link tertiary; icon-only buttons get tooltips and generous hit areas.

**Forms:**
- Labels: small (13–14px), medium grey, 4–8px above the input — the input's content is the star, not the label.
- Group related fields on one row only when they form one mental unit (first/last name, city/postcode).
- Helper text below the field in caption style; error text replaces helper, same slot, red only for the message and border — don't repaint the whole field group.

**Cards:**
- Padding scales with card size (small card 16px, large 24–32px); internal hierarchy: image → title (semibold, dark) → metadata (small, grey) → action.
- Prefer shadow + background over border; hover raises elevation one step.

**Navigation:**
- Active item: contrast (dark text, tinted background, or accent indicator bar) while siblings are mid-grey — de-emphasize to emphasize in its purest form.
- Section labels in sidebars: 11–12px letterspaced caps, light grey — present but nearly silent.

**Tables:**
- Header row: caption-style (small, grey, medium weight, optionally caps) so data outweighs headers.
- Row height ≥ 44–48px with 12–16px cell padding; zebra stripes or generous spacing, not both plus borders.
- Emphasize one scan column (usually the first): darker and slightly heavier than the rest.

**Modals:**
- One job per modal; title (H3-scale), body (regular grey), actions right-aligned (desktop) with primary outermost; lg shadow, scrim at ~50% black; max-width ~480–560px for confirmations.

## 12. Decision defaults (when unsure, pick these)

- Body text 16px; secondary 14px; captions/labels 12–13px letterspaced caps or 13px grey.
- Weights: 400/500 for body, 600/700 for emphasis and headings — skip anything lighter than 400 on screens.
- Spacing: default gap between unrelated blocks 24–32px; related items 8–12px; card padding 16–24px.
- Border radius: pick 4–6px (neutral-professional) or 10–16px (friendly) across the whole product.
- Greys: slightly cool-tinted 9-step ramp; text uses steps ~900/700/500 on white.
- Shadows: sm for interactive resting elements, md for popovers, lg for modals — nothing else.
- One accent color doing the primary-action job everywhere; semantic red/yellow/green reserved for meaning.

## Quick audit checklist

- [ ] Systems exist and are obeyed: type scale, spacing scale, grey scale, shadow scale, color shades
- [ ] Hierarchy via weight/color, not size alone; secondary content visibly quieter; one primary action per screen
- [ ] Labels only where data isn't self-evident; labels styled quiet
- [ ] Whitespace generous; grouping unambiguous (closer-within than between); content not stretched to fill
- [ ] Line length 45–75ch; line-height varies with size; numbers right-aligned in tables
- [ ] Colors in HSL with full shade ramps; no color-only meaning; contrast flipped (dark-on-light) where needed
- [ ] Light-from-above depth; two-part shadows on a 5-step scale; borders replaced by space/shadow/background where possible
- [ ] Empty states designed; accent borders/background sections used for cheap polish; no scaled-up icons or shrunken screenshots
