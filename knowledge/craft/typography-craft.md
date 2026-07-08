---
id: typography-craft
title: "Typography Craft — Typesetting Beyond the Basics"
category: craft
platform: both
tags: [typography, typesetting, fonts, hierarchy, opentype]
sources: ["impeccable design skill (local)"]
updated: 2026-07-08
---

# Typography Craft — Typesetting Beyond the Basics

Typography carries most of the information on any screen. Good typography is invisible; bad typography is distracting. The goal is never "fancier" — it is clearer, more readable, more intentional.

## Scale and hierarchy

- **The classic mistake: too many sizes, too close together.** 14/15/16/18px is muddy hierarchy. Use fewer sizes with more contrast.
- **Five sizes cover most products:**

| Role | Typical size | Use |
|---|---|---|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem | Body |
| lg | 1.25–1.5rem | Subheadings, lead text |
| xl+ | 2–4rem | Headlines, hero |

- **Commit to one ratio:** 1.25 (major third), 1.333 (perfect fourth), or 1.5 (perfect fifth).
- **Register split:** app/product UI uses a **fixed rem scale with a tighter 1.125–1.2 ratio** (dense layouts need close steps and spatial predictability — no major app design system uses fluid type in product UI). Brand/marketing surfaces use **fluid `clamp()` headings with ≥1.25 ratio between steps**; a flat 1.1× scale reads as uncommitted.
- **Weight roles are fixed and few:** 3–4 weights max (e.g. Regular body, Medium labels, Semibold/Bold headings). Same role = same weight everywhere. Load only the weights you use.
- Hierarchy should combine size + weight + color + space — never size alone.

## Vertical rhythm

Line-height is the base unit for ALL vertical spacing. 16px body at 1.5 = 24px; vertical margins and gaps should be multiples of 24px. Text and space sharing one mathematical foundation creates subconscious harmony.

## Measure and leading

- **45–75 characters per line** for body; set `max-width: 65ch` on text containers (use `ch` units, not px).
- **Leading scales inversely with measure:** narrow columns take tighter line-height, wide columns need more. Headings 1.1–1.2; body 1.5–1.7.
- **Light-on-dark needs compensation on three axes, not one.** Light text on dark reads thinner and tighter. Fix all three: line-height +0.05–0.1, letter-spacing +0.01–0.02em, and optionally step body weight up one notch (400 → 450/500, or in reverse, use 350 instead of 400 for large light-on-dark body text since it reads heavier).
- **Paragraph rhythm: space between paragraphs OR first-line indent. Never both.** Digital defaults to space; long-form editorial can justify indent-only.

## Fluid type done right

- `clamp(min, preferred, max)` with a viewport-relative middle term plus a rem offset (e.g. `clamp(2rem, 5vw + 1rem, 4rem)`) so it never collapses at small widths.
- **Bound the ratio: max ≤ ~2.5 × min.** Wider ranges break browser zoom/reflow and make large viewports feel like shouting.
- **Body text stays fixed even on marketing pages** — the cross-viewport size delta is too small to justify fluidity.
- **Scale container width and font-size together** so effective measure stays in the 45–75ch band at every viewport.

## Font selection — the anti-reflex procedure

Run this for every brand-register project; never skip:

1. Write **three concrete brand-voice words** — physical-object words ("warm, mechanical, opinionated"), not "modern" or "elegant."
2. List the three fonts you'd reach for by reflex. If any are training-data defaults, reject them.
3. Browse a real catalog (Google Fonts, Pangram Pangram, Future Fonts, Klim, ABC Dinamo, Velvetyne) hunting the brand as a *physical object*: a museum caption, a 1970s terminal manual, a fabric label, a concert poster. Reject the first thing that merely "looks designy."
4. Cross-check: "elegant" is not necessarily serif; "technical" is not necessarily sans; "warm" is not automatically Fraunces. If the final pick matches the original reflex, start over.

**Reflex-reject list (saturated defaults — look further for greenfield work):** Fraunces, Newsreader, Lora, Crimson (all cuts), Playfair Display, Cormorant (all cuts), Syne, IBM Plex (Mono/Sans/Serif), Space Mono, Space Grotesk, Inter, DM Sans, DM Serif (Display/Text), Outfit, Plus Jakarta Sans, Instrument Sans, Instrument Serif.

**Reflex-reject aesthetic lane:** the editorial-typographic cliché — italic display serif + small tracked mono labels + ruled columns + monochrome restraint — is the second-order trap. Unless the brief is literally a magazine, skip it.

These lists govern **new choices**. An existing brand identity that already ships one of these fonts wins — don't second-guess shipped identity.

**Anti-reflexes worth defending against:**
- A technical brief does NOT need a serif "for warmth" — tech tools should look like tech tools.
- A premium brief does NOT need the trendy expressive serif; premium can be Swiss-modern, neo-grotesque, quiet humanist, even monospace.
- A children's product does NOT need a rounded display font — kids' books use real type.
- The most "modern" move is not using the font everyone else uses.
- **System fonts are underrated:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` loads instantly and reads natively. Legitimate wherever performance > personality.

## Pairing

- **You usually don't need a second font.** One family in committed weights beats a timid display+body pair. Add a second only for genuine contrast.
- When pairing, contrast on multiple axes: serif+sans (structure), geometric+humanist (personality), condensed display + wide body (proportion).
- **Never pair similar-but-not-identical fonts** (two geometric sans) — tension without hierarchy.
- Lane conventions: editorial/luxury → display serif + sans body; tech/fintech → one committed sans with tight tracking and strong internal weight contrast; consumer/food/travel → humanist sans + script or display serif; studios/agencies → rule-breaking (mono-only, display-only) is welcome.
- Hard ceiling: 2–3 families per project.

## Web font loading

- `font-display: swap` for visibility; **`optional`** when zero layout shift matters more than showing the branded font on slow networks (falls back if the font misses a ~100ms budget).
- **Metric-matched fallback** kills the reflow jump — define a fallback `@font-face` over a local font with metric overrides (tools like Fontaine compute these automatically):

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;        /* scale to match x-height */
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 10%;
}
body { font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif; }
```

- **Preload only the critical weight** — usually the regular body weight above the fold. Preloading everything costs more than it saves.
- **Variable font when you need 3+ weights/styles**: one file is smaller than three statics, gives fractional weights, and pairs with `font-optical-sizing: auto`. For 1–2 weights, static files are fine.

## OpenType features and rendering polish

Most developers don't know these exist — using them is a visible craft signal:

```css
.data-table   { font-variant-numeric: tabular-nums; }   /* numbers align in columns */
.fraction     { font-variant-numeric: diagonal-fractions; }
abbr          { font-variant-caps: all-small-caps; }     /* real small caps for abbreviations */
code          { font-variant-ligatures: none; }          /* ligatures off in code */
body          { font-kerning: normal; font-optical-sizing: auto; }
h1, h2, h3    { text-wrap: balance; }                    /* even heading line lengths */
article p     { text-wrap: pretty; }                     /* fewer orphans in prose */
```

- **ALL-CAPS tracking is mandatory:** capitals sit too tight at default spacing. Add 5–12% letter-spacing (`0.05em`–`0.12em`) to all-caps labels, eyebrows, small headings. Real small caps take the same treatment, slightly gentler.
- Letter-spacing direction: open for small/uppercase text, default-or-tight for large display sizes.
- Check a font's feature support at Wakamai Fondue before relying on it.

## Widows, orphans, breaks

- No single word stranded on the last line of a heading (`text-wrap: balance` handles most cases).
- Stable line breaks at every viewport — a heading that rewraps into nonsense at one width is a defect.
- Hyphenation only where language and column width justify it.

## Token architecture

Name tokens semantically — `--text-body`, `--text-heading` — never by value (`--font-size-16`). A complete type token set includes: font stacks, size scale, weights, line-heights, and letter-spacing.

## Accessibility floors

- **Body ≥16px / 1rem.** Smaller strains eyes and fails WCAG on mobile.
- **Use rem/em, never px, for font sizes** — px ignores user browser settings.
- **Never disable zoom** (`user-scalable=no`). If layout breaks at 200% zoom, fix the layout.
- Text links need padding/line-height producing 44px+ tap targets.
- Never decorative/display fonts for body text; never all-caps body copy (caps are for short labels and headings).

## Expressive vs quiet type

- **Quiet (product UI):** one well-tuned family, system stacks legitimate, fixed rem scale, hierarchy via weight and space. The type should disappear into the task.
- **Expressive (brand):** typographic risk is a permission — enormous display sizes, unexpected italic cuts, mixed cases, a single oversize word as a hero, hand-drawn headlines. Fluid scale, ≥1.25 ratio, committed contrast.
- **Bolder without slop:** dramatic size jumps (3–5×), extreme weight pairs (900 with 200), condensed/extended widths, monospace as a deliberate accent — never as lazy "developer" costume on a non-technical brand.
- **Quieter without mush:** step weights down (900→600, 700→500), reduce scale jumps, add typographic air — but keep anchors. Some elements must still be unmistakably dominant.

## Assessing existing typography — where to look first

1. **Font choices:** invisible defaults in use (Inter, Roboto, Arial, Open Sans, bare system stack on a brand surface)? Does the face match the brand voice? More than 2–3 families?
2. **Hierarchy:** heading vs body vs caption distinguishable at a glance? Sizes too close together? Weight contrast strong enough (Medium vs Regular is barely visible)?
3. **Scale:** one committed ratio or arbitrary sizes? Right sizing strategy for the register (fixed rem for app UI, fluid clamp for marketing headings)?
4. **Readability:** measure 45–75ch? Leading tuned to measure and context? Contrast sufficient?
5. **Consistency:** same role, same treatment, everywhere? Weights used by defined role? Letter-spacing intentional rather than default-everywhere?

## Hard bans

- More than 2–3 font families per project
- Arbitrary sizes off the scale; body text below 16px
- Decorative/display fonts as body text; all-caps body copy
- `px` font sizes; `user-scalable=no`
- Inter/Roboto/Open Sans by default where personality matters
- Pairing similar-but-not-identical faces (two geometric sans)
- Skipping fallback stacks; ignoring FOUT/FOIT
- Monospace as lazy "developer" shorthand on a non-technical brand

## Typography defect checklist

- [ ] Sizes come from one committed scale; no near-duplicate sizes
- [ ] Register-appropriate sizing (fixed rem in app UI; bounded clamp on brand headings)
- [ ] Measure 45–75ch; leading tuned per context; light-on-dark compensated on all three axes
- [ ] Same role styled identically everywhere; ≤3–4 weights loaded
- [ ] No FOUT jump (metric-matched fallback) and no invisible-text FOIT
- [ ] tabular-nums on data; tracking on all-caps; balance/pretty wrapping applied
- [ ] Body ≥16px in rem; zoom works to 200%; contrast passes WCAG
- [ ] Font choice justifiable in one sentence of brand voice — not a reflex default
