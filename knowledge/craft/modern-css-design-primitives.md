---
id: modern-css-design-primitives
title: "Modern CSS Design Primitives — What the Browser Now Does For You"
category: craft
platform: web
tags: [css, tokens, dark-mode, color, contrast, baseline, container-queries, anchor-positioning]
sources: ["https://web.dev/baseline/2026", "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/contrast-color", "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark", "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix", "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning", "https://web.dev/blog/interop-2026", "https://www.w3.org/TR/css-overflow-3/#overflow-properties", "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow"]
updated: 2026-08-03
---

# Modern CSS Design Primitives

A design system written in 2022 hand-rolls things the browser now does natively: a second set of dark-mode variables, a Sass function for tints, a build step to pick text colour. Several of those jobs moved into CSS, and the ones that did are interoperable now, not "coming soon".

This is what changed, what it replaces, and — the part most write-ups skip — where each one stops being enough.

## Colour

### `light-dark()` — one token, both themes

Baseline since May 2024. It collapses the two-block token file into one.

```css
:root {
  color-scheme: light dark;                       /* required, or it does nothing */
  --surface: light-dark(#ffffff, #0a0a0b);
  --text:    light-dark(#171717, #fafafa);
}
```

`color-scheme: light dark` is not optional. Without it the function silently returns its first argument, which looks like "dark mode is broken on one element" and is very hard to spot. Set it once on `:root`.

It takes images and gradients too, so a light/dark hero or icon no longer needs a media query.

**Where it stops:** it resolves at used-value time, so you cannot read the resolved colour back in JS, and you cannot use it to feed a build step. If a token has to be exported to iOS or Android, keep the two values separately and let `generate_design_tokens` emit the platform files.

### `color-mix()` — derive instead of declare

Baseline widely available since May 2023, and the most under-used of the three.

```css
--primary: #4f46e5;
--primary-hover:  color-mix(in oklab, var(--primary), black 12%);
--primary-subtle: color-mix(in oklab, var(--primary), white 88%);
--border:         color-mix(in oklab, var(--text), transparent 88%);
```

Mix `in oklab` or `in oklch` rather than `in srgb`: sRGB mixing darkens and desaturates through the middle, which is why a hand-made hover state so often looks muddy. Percentages normalise — omit one and it becomes `100% − other`; if they total under 100% the remainder becomes transparency.

**Where it stops:** derived hover and subtle states are still unverified colours. A `color-mix()` result can fall below contrast just as easily as a hand-picked one. Run the pair through `audit_accessibility`.

### `contrast-color()` — and its real limits

Baseline newly available since April 2026. Pass a colour, get back the one of `white` or `black` that contrasts with it more.

```css
.badge { background: var(--brand); color: contrast-color(var(--brand)); }
```

Read that definition again, because the name oversells it. It returns **only white or black** — never a tinted or nudged colour — and MDN is explicit that WCAG AA contrast "is not capable of producing clearly readable text in all cases". Its own worked example is royal blue `#2277d3`, where the function returns black, and black on that blue is not readable at small sizes.

So it is genuinely useful for surfaces that are clearly light or clearly dark, and it is a trap for mid-tones — which is exactly where brand colours live.

**The rule:** use it for on-colour text over light or dark fills, and verify anything mid-tone. When neither black nor white clears the threshold, `fix_contrast` is the tool for the job: it holds hue and saturation and moves lightness until the pair passes, which returns a colour that still looks like your brand. `contrast-color()` cannot do that by design.

### `oklch()` for the ramp itself

Perceptually uniform lightness means a ramp built by stepping `L` actually looks evenly spaced, which `hsl()` does not. If you are generating scales rather than picking them, work in OKLCH. `generate_color_system` does the equivalent and verifies every pair while it goes.

## Layout and sizing

- **Container style queries** (Baseline 2026) — react to a custom property on an ancestor, not just its width. This is how a component finally responds to *context* (`--density: compact`) rather than measuring pixels.
- **`field-sizing`** (Baseline 2026) — `field-sizing: content` makes an input or textarea grow with what is typed, which removes the most common piece of resize JavaScript in any form.
- **New font-relative units** `rcap`, `rch`, `rex`, `ric` (Baseline 2026) — root-relative versions of cap height, character width, x-height and ideograph width. `rch` is the honest unit for a measure: `max-width: 65rch` says what you mean, where `65ch` drifts with the element's own font.
- **`shape()`** (Baseline 2026) — responsive custom shapes for `clip-path`, in real CSS units rather than an SVG path's coordinate space.
- **`text-box`** trims the leading above and below a text block, so a heading's optical box matches its visual one. It is the fix for "why is there always extra space above my h1".
- **`overflow: clip` instead of `overflow: hidden` on the root.** These are not two spellings of the same thing. `hidden` makes the box a **scroll container** — it only suppresses the scrolling *UI*, and the box can still be scrolled programmatically or by focusing something outside the visible area, which is how a page that "has no horizontal scrollbar" still jumps sideways on focus. `clip` forbids scrolling entirely, so the box is **not** a scroll container. `hidden` on `html`/`body` also makes `position: sticky` stop working in descendants, because sticky positions against the nearest scroll container. Reach for `clip` (or `overflow-x: clip`), and fix whatever is actually overflowing rather than hiding it. Where you still need a fallback, write it as a fallback: either `overflow-x: hidden; overflow-x: clip;` in one block, or gate it with `@supports`.

## Structure and interaction

- **`@scope`** — style a subtree without inventing a BEM prefix, and stop the styles leaking. Useful when a design system and a legacy stylesheet share a page.
- **`:open` and `::details-content`** (Baseline 2026) — style a `<details>` in its open state, and animate its content. Disclosure UI without JavaScript.
- **View transitions** — cross-document and same-document animated state changes. Treat as motion, not decoration: everything in `animation-craft` still applies, including `prefers-reduced-motion`.
- **CSS anchor positioning** — tether a popover, tooltip or menu to its trigger with `anchor-name`, `position-anchor`, `position-area`, `anchor()`, `anchor-size()`, and fall back with `@position-try` / `position-try-fallbacks` when it would overflow. This is the native replacement for a positioning library. **Support is uneven at the time of writing** — unlike the features above, do not assume it is interoperable; check current support and keep a fallback.

## Checklist

- [ ] `color-scheme: light dark` set on `:root` before any `light-dark()` is used.
- [ ] Derived states built with `color-mix(in oklab, …)`, not hand-picked hexes.
- [ ] Every `contrast-color()` surface is clearly light or clearly dark; mid-tones verified with `audit_accessibility` and repaired with `fix_contrast`.
- [ ] Ramps generated in a perceptual space, not `hsl()`.
- [ ] Measure expressed in `rch` (or `ch` on the element that owns the text), capped at 45–75 characters.
- [ ] Inputs that should grow use `field-sizing: content` instead of a resize observer.
- [ ] Anything relying on anchor positioning has a checked fallback.
- [ ] The root uses `overflow: clip`, not `overflow: hidden` — or declares `hidden` only as an explicit fallback for it.
- [ ] Tokens that must reach iOS or Android kept as discrete values, not only as `light-dark()` pairs.

## Anti-patterns

- **Treating `contrast-color()` as an accessibility guarantee.** It returns black or white and nothing else, and its own documentation says WCAG AA does not guarantee readability. It is a convenience, not a verifier.
- **`light-dark()` without `color-scheme`.** Fails silently to the light value; the bug surfaces as one element that "didn't get dark mode".
- **Mixing in sRGB.** `color-mix(in srgb, …)` passes through a muddy middle. Use `oklab`/`oklch` unless you specifically want the sRGB path.
- **Replacing a token system with functions.** These compose values; they do not name them. A hover state still needs to be a token so it can be audited, exported and changed in one place — `audit_design_system` counts a `color-mix()` result the same as a hex.
- **Adopting a feature because it is new.** Everything above except anchor positioning is interoperable; anchor positioning is not yet, and a tooltip that lands off-screen in one browser is worse than a library.
- **Assuming a Baseline date means universal.** "Newly available" means the current versions of the core browsers. Users on older devices exist; decide deliberately whether they get the enhancement or the fallback.

See also: [[design-tokens-theming]], [[color-systems]], [[design-engineering]], [[accessibility]], [[animation-craft]], [[web-trends-2026]].
