---
id: ai-default-aesthetic
title: "The AI-Default Aesthetic — What the Systems Ship"
category: craft
platform: web
tags: [craft, ai, defaults, tailwind, shadcn, typography, color, icons]
sources: ["https://tailwindcss.com/docs/colors", "https://ui.shadcn.com/docs/theming", "https://ui.shadcn.com/docs/installation", "https://rsms.me/inter/", "https://lucide.dev/", "https://heroicons.com/", "https://fonts.google.com/specimen/Inter", "https://tailwindcss.com/docs/box-shadow", "https://tailwindcss.com/docs/border-radius", "https://tailwindcss.com/docs/background-image", "https://tailwindcss.com/docs/animation"]
updated: 2026-09-01
---

# The AI-Default Aesthetic — What the Systems Ship

This is a catalogue of defaults, not a list of things to avoid. Every value below is what a named system actually ships, cited to that system's own documentation. Knowing the **name and origin** of a default is the actionable half: you cannot leave a default you cannot name, and "make it less generic" is not an instruction until you know which specific value you are being asked to move off.

The judgements stay with the reader. The measurements do not.

## Why defaults converge

A component system ships defaults so that scaffolding produces a working interface before anyone makes a decision — a radius scale, a shadow scale, a token file, an icon package. Generated code reaches for the documented default because the documented default is the best-attested value in the material the generator learned from. Neither step is a mistake; both are the systems working as designed. The consequence is arithmetic: unrelated products, built by unrelated teams, converge on the same handful of values, and none of those values was ever chosen for any of them.

## The palette

**Tailwind ships 26 ramps and designates none of them an accent.** `tailwindcss.com/docs/colors` lists them in this order — red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, then the neutrals slate, gray, zinc, neutral, stone, taupe, mauve, mist, olive — and states that "Every color in the default palette includes 11 steps, with 50 being the lightest, and 950 being the darkest". Values are authored in OKLCH: the page's own instruction is "Click to copy the OKLCH value or shift+click to copy the nearest hex value." Hex is the derived form, so hex below is labelled *nearest*.

**shadcn/ui's default theme has no hue at all.** `components.json` ships `"baseColor": "neutral"`, and the base colors on offer are Neutral, Stone, Zinc, Mauve, Olive, Mist and Taupe — every one a neutral ramp. In the full default theme scaffold, every token carries zero chroma except `--destructive` and the five chart tokens:

```css
--primary: oklch(0.205 0 0);          /* near-black, chroma 0 */
--primary-foreground: oklch(0.985 0 0);
--border: oklch(0.922 0 0);           /* .dark: oklch(1 0 0 / 10%) */
--destructive: oklch(0.577 0.245 27.325);
```

So a stock shadcn/ui app is greyscale. **Any hue in it was added by hand.** Which hue gets added is therefore a decision someone made, and it is the same decision most of the time.

**Indigo, violet and purple are three consecutive ramps.** Their 500 steps, verbatim from the palette:

| Token | OKLCH | Nearest hex |
|---|---|---|
| `indigo-500` | `oklch(58.5% 0.233 277.117)` | `#615fff` |
| `violet-500` | `oklch(60.6% 0.25 292.717)` | `#8e51ff` |
| `purple-500` | `oklch(62.7% 0.265 303.9)` | `#ad46ff` |
| `indigo-600` | `oklch(51.1% 0.262 276.966)` | `#4f39f6` |
| `purple-600` | `oklch(55.8% 0.288 302.321)` | `#9810fa` |
| `blue-500` | `oklch(62.3% 0.214 259.815)` | `#2b7fff` |

Two things follow from those numbers. `purple-500` and `violet-500` are the second and third highest-chroma 500 steps in the whole palette (only `fuchsia-500` at 0.295 is higher), and `indigo-500` is the darkest chromatic 500 step at 58.5% lightness. Measured against its 24 neighbours, this is the palette's most saturated and darkest corner — an accent taken from here is doing more work on the page than the same step of `sky` or `teal` would.

**Measure a gradient before shipping it.** The recurring pairs — `from-indigo-500 to-purple-600`, `from-blue-500 to-purple-600`, `from-purple-500 to-pink-500` — are neighbours on one ramp region:

- `indigo-500 → purple-600`: **25.2° of hue, 2.7 points of lightness.**
- `indigo-500 → purple-500`: 26.8° of hue, 4.2 points of lightness.
- `blue-500 → purple-600`: 42.5° of hue, 6.5 points of lightness.
- `purple-500 → pink-500`: 50.4° of hue, 2.9 points of lightness.

A pair under ~30° apart in OKLCH hue with under ~5 points of lightness change is one colour rendered twice, not a colour relationship. If the gradient is doing work, the endpoints can say what the work is; if they cannot, a flat fill is the honest version. See [[color-systems]] for building the ramp you actually want and [[modern-css-design-primitives]] for `color-mix()` and `oklch()` in the browser.

**Two version tells, both checkable against the installed docs.** Tailwind's current background-image utilities are spelled `bg-linear-to-t` … `bg-linear-to-tl`; `bg-gradient-to-*` is not among them. And the palette carries 286 values across its 26 ramps, none of which is `#6366f1` — the current `indigo-500` is `oklch(58.5% 0.233 277.117)`, nearest hex `#615fff`. Either string in a project running the current release is material older than the docs sitting beside it.

## The typeface

**Inter states its own ubiquity.** `rsms.me/inter` heads the family "The 21st century standard", describes it as "a workhorse of a typeface carefully crafted & designed for a wide range of applications, from detailed user interfaces to marketing & signage", and records that "Inter is one of the world's most used typefaces with applications ranging from computer interfaces, advertising & airports, to NASA instrumentation & medical equipment." Google Fonts ships it as a variable family under the OFL with two axes: `opsz` 14–32 (default 14) and `wght` 100–900. It is drawn for screens, and it is free — the two properties that make it the value a scaffold reaches for.

**The measurable part is not the face. It is how much of the face is in use.** Inter ships an optical-size axis, a true italic, and three dedicated designs at weights 100, 400 and 900. **Check whether the project sets any of them:** `opsz` left at its 14 default under a 64px headline, no `font-optical-sizing`, and two loaded weights means the family was installed rather than typeset — the same result you would get from any neutral grotesque.

**shadcn/ui names no font in its docs.** The theming page defines tokens for colour and radius only, and routes font selection to the scaffold: "Use shadcn/create to preview colors, radius, fonts, and icons, then generate a preset for your project." So the font in a shadcn project arrived with the template, not the library — nothing in the component layer depends on it, and swapping it breaks nothing.

[[typography-craft]] carries the reflex-reject list (Inter is on it), the anti-reflex selection procedure, and the loading rules. Use it for the replacement; do not re-derive them here.

## The component chrome

Tailwind ships the scales. It does not ship the card. Each part of `rounded-2xl border shadow-lg` is an independent pick — one of eight radius steps, one of seven shadow steps — so the combination is three decisions, not a preset.

**Radius** — `rounded-2xl` resolves to `var(--radius-2xl)`, documented as `1rem (16px)`. It is the sixth of eight named steps: `xs` 2px, `sm` 4px, `md` 6px, `lg` 8px, `xl` 12px, `2xl` 16px, `3xl` 24px, `4xl` 32px. There is no default radius utility; something typed `2xl`.

**Shadow** — `shadow-lg` resolves to `var(--shadow-lg)`, documented as:

```css
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

That is the fifth of seven steps (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`) — a 15px blur offset 10px down at 10% black, plus a tighter contact layer. It sits above the middle of the scale, not at it.

**shadcn/ui rebases the same class names.** Its scaffold sets `--radius: 0.625rem` and derives the scale from it, `--radius-2xl: calc(var(--radius) * 1.8)`. So `rounded-2xl` is **1rem (16px) in stock Tailwind and 1.125rem (18px) in a shadcn project** — one class name, two values, which is worth knowing before you compare two codebases by eye.

**The system part is the scale; the habit part is using one step of it.** A shadow scale exists to encode elevation: modal above popover above card. Applied at a single value to every surface, it encodes nothing and costs contrast — [[visual-craft-standards]] states the threshold ("Shadows must be subtle. If you can clearly see it, it's probably too strong") and carries the elevation and border rules. The check here is arithmetic, not taste: **count the distinct radius values and distinct shadow values in the file.** One of each on every surface means the scales are decoration, and the fix is to use two or three steps with meaning, or drop to `border` alone. See [[clean-app-design]] for surfaces that hold up without either.

## The loading state

**Tailwind documents `animate-pulse` as a built-in.** `tailwindcss.com/docs/animation` ships four named animations — `spin`, `ping`, `pulse`, `bounce` — and describes `pulse` as a gentle fade: opacity 1 → 0.5 → 1 over two seconds, infinite. Generated interfaces reach for it as the loading state: a row of `h-4 w-full animate-pulse rounded-lg bg-neutral-200` blocks standing in for content that has not arrived.

The measurable part is the class, not the intent. A single `animate-pulse` on a live indicator is a choice. Three or more on placeholder blocks is the scaffold default. `get_component_recipe("skeleton")` is the static shape that does not use it; `prefers-reduced-motion` still applies if you add any motion later.

## The icons

Both stock sets ship a single default stroke weight for their primary cut, which is why they are interchangeable at a glance:

- **Lucide** (`lucide.dev`, v1.31.0) — "Beautiful & consistent icons", "Made by the community", **1768 icons**, ISC licence. The customiser on the homepage opens at **24px size, 2px stroke** — the shape shipped unless someone changes it.
- **Heroicons** (`heroicons.com`, v2.1.5) — "Beautiful hand-crafted SVG icons, by the makers of Tailwind CSS", **316 icons**, MIT licence, four cuts: Outline (**24×24, 1.5px stroke**), Solid, Mini, Micro.

The tell is not the set. It is every icon in the product sitting at the library's opening values, at one size, in one weight, one per feature card. [[iconography]] carries the selection, sizing and state rules — including the size-specific-variant rule that Heroicons Mini and Micro exist to satisfy.

**Emoji as icons is not a default of any system.** Neither set above ships an emoji; both ship SVG you control. An emoji renders in the platform's own colour-font (Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji), so it **cannot inherit stroke weight, optical size, or `currentColor`** from the design system, it changes shape per operating system, and screen readers announce it by its Unicode name (🚀 reads as "rocket"). Emoji in a features grid, in a heading, or as a bullet marker is a generation habit with no system behind it — which also makes it one of the cheapest things to remove.

## The copy

Recurring phrase families, catalogued so they can be matched rather than argued about:

| Family | Instances |
|---|---|
| Transformation verbs | "Transform your workflow", "Supercharge your", "Unlock the power of", "Elevate your", "Take X to the next level" |
| Effortlessness | "Seamlessly integrate", "effortlessly", "in just one click", "in seconds", "no code required" |
| Totality | "Everything you need to X", "All-in-one platform for", "The only X you'll ever need" |
| Modernity | "Built for the modern X", "The future of X is here", "X, reimagined" |
| Proof without a number | "Join thousands of teams", "Trusted by industry leaders", "Loved by developers worldwide" |
| Negate-then-assert | "Not just a tool — a teammate", "It's not about X. It's about Y." |
| The tricolon subhead | "Fast. Secure. Yours." — three noun phrases, three full stops |
| AI as the feature | "Powered by AI", "AI-powered insights", "Intelligent X, built in" |

Structural companions to the phrases: a subhead that restates the headline in longer words; every feature-card title cut to the same 2–4 word noun phrase; a tracked-uppercase eyebrow above every section without exception; and the CTA pair "Get started free" / "Book a demo" regardless of whether either exists.

The common property is **substitutability** — each line stays true if you swap in a competitor's product name, which means it carries no information about this one. [[ux-writing]] holds the voice rules and the AI-slop ban for in-product copy; [[design-critique-scoring]] holds the competitor-sentence test that scores this. Do not fix marketing copy from this page alone.

## Escaping a default is not the same as being bold

Swapping indigo for teal moves one ramp along a palette everyone shares. Swapping Inter for the next font on the same list swaps one default for a fresher one. Neither is a decision; both are a rename.

The question a default fails is not "is this common?" but "can you say what it is doing here?" A colour that carries a product's actual subject, a radius that matches the physical thing being represented, a face chosen against three brand-voice words — those survive the question, and they survive it whether or not anyone else uses them. [[visual-craft-standards]] sets the bar under "Making a design bolder": if someone would instantly believe "AI made this bolder", it failed. [[design-critique-scoring]]'s slop test sets the other end: the target is a visitor asking "how was this made?".

Novelty is not the exit. Intent is.
