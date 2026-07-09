---
id: clean-app-design
title: "Clean App Design — How to Design Calm, Uncluttered Interfaces"
category: craft
platform: both
tags: [minimal, clean, whitespace, radius, restraint, fonts, icons]
sources: ["https://github.com/lauridskern/open-runde", "https://vercel.com/font", "https://rsms.me/inter/", "https://github.com/480-Design/Solar-Icon-Set", "https://lucide.dev/", "https://phosphoricons.com/", "https://heroicons.com/", "https://www.nngroup.com/articles/whitespace/"]
updated: 2026-07-09
---

# Clean App Design

Clean design is not "add less stuff." It is a set of disciplined constraints that make an interface feel calm, confident, and easy to act in. The rules below are the working cheat-sheet. Apply them as defaults; break them only with a reason.

Clean is not the same as boring. A calm interface can still have a strong point of view — a distinctive accent, confident type, a memorable empty state. The discipline is in *where* the personality goes: concentrate it in one or two deliberate moments and keep everything around them quiet, rather than spreading decoration evenly until nothing stands out.

## The core rules

### (a) One accent color and its soft tints
Pick a single accent color. Use it — and only it — for the things that matter: primary actions, active states, selection, focus, key data. Everything else is neutral (a ramp of grays or near-grays). Generate the accent's soft tints (a light background wash, a hover shade, a subtle border) rather than introducing a second hue. A second competing color halves the impact of the first. When every element is colorful, nothing is emphasized. Reserve additional colors strictly for semantic meaning (success/warning/danger), not decoration. See [[color-systems]].

### (b) Whitespace is a feature — give everything room to breathe
Whitespace (negative space) is not wasted space; it is the primary tool for grouping, hierarchy, and calm. Generous padding inside cards and buttons, real gaps between sections, wide margins around content — these read as quality and confidence. Cramped UI reads as cheap and stressful. When something feels off, the fix is usually more space, not more styling. Increase line-height and section spacing before you add borders or shadows to separate things. Use proximity as your grouping tool: related items sit close, unrelated items get a clear gap. A consistent spacing scale (e.g. 4, 8, 12, 16, 24, 32, 48) keeps the rhythm even — pick from the scale, never eyeball arbitrary pixel values. See [[spacing-layout]].

### (c) One consistent corner radius everywhere
Choose a single radius and apply it consistently across cards, buttons, inputs, images, and icon containers. Mixed radii (sharp inputs next to very round cards next to pill buttons) look accidental. Pick one value that matches the product's personality — small (4-8px) for precise/professional, medium (10-14px) for friendly/modern, large for playful — and hold it. If you nest, use the concentric-radius relationship (outer radius = inner radius + padding) so corners stay parallel, but keep it to one base value.

### (d) Two or three type sizes, not five
A limited type scale is what makes an interface feel deliberate. Most clean apps need only: a body size, one larger size for headings/emphasis, and optionally one smaller size for metadata/captions. Create hierarchy with **weight and color**, not with a ladder of five nearly-equal sizes (14/15/16/18px is muddy). Fewer sizes with real contrast beats many sizes with subtle contrast. See [[typography]].

### (e) A clean geometric font
Use a clean, geometric or humanist sans-serif with even proportions and a calm rhythm. Recommended default:
- **Open Runde** — a free, open-source (SIL Open Font License) soft-rounded variant of Inter, available in Regular, Medium, Semibold, Bold. Its rounded terminals feel friendly and modern without being childish — an excellent free stand-in for SF Pro Rounded. Ideal for consumer apps that want warmth.

Other strong, freely usable options:
- **System fonts** (`system-ui` → SF Pro on Apple, Segoe/Roboto elsewhere) — zero load cost, native feel, always the safe default for product UI.
- **Inter** (Rasmus Andersson, OFL) — the workhorse neutral UI sans; superb legibility at small sizes.
- **Geist** (Vercel + Basement Studio, OFL) — modern geometric Swiss-influenced sans with a matching mono; clean and slightly technical.

Pick one family for the whole app (a pairing at most: one for headings, one for body). Load only the weights you use.

### (f) One cohesive icon set — one family, one weight
Icons must look like siblings. Choose a single icon family and a single weight/style, and never mix sets. Recommended default:
- **Solar (Duotone)** — a free, large icon library by 480 Design (7,000+ icons across Bold, Linear, Outline, Bold Duotone, Line Duotone, and Broken styles). The icons are MIT-licensed / CC BY 4.0, with heavy corner-smoothing that pairs beautifully with a rounded font like Open Runde. Use one of its styles (e.g. Line Duotone) throughout.

Other cohesive free sets:
- **Lucide** (ISC license) — the community successor to Feather; clean, consistent stroke icons, huge coverage, first-class React/Vue/Svelte packages.
- **Phosphor** (MIT) — flexible family with six weights (thin → fill); pick exactly one weight and stay there.
- **Heroicons** (MIT, by the Tailwind team) — outline + solid pairs designed to sit with Inter/system UI.

Rule: **one icon family, one weight.** Consistent stroke width, corner style, and optical size across every icon is what makes UI feel professionally made. Match the icon style to the font: rounded icons (Solar) with a rounded font (Open Runde), crisp stroke icons (Lucide, Heroicons) with a neutral sans (Inter, Geist, system). Size icons on the same scale as your text and give them the accent color only when they mark something actionable — otherwise keep them the same neutral as adjacent text.

### (g) Guide the user toward action without making them think
The best landing pages and app screens don't just look good — they guide users toward action without making them think. This is Krug's core law ("Don't Make Me Think"): every screen should make the next step obvious. Reduce choices, make the primary action visually unmistakable, remove any question the user has to stop and answer. Clean layout and clear hierarchy are in service of conversion — a calm screen with one obvious path outperforms a busy screen with five. See [[conversion-ux]].

## Restraint as a skill

Restraint is the hardest and most valuable design skill. New designers add; experienced designers subtract. Anyone can add — a gradient, a shadow, another badge, one more color. Knowing what to leave out is what separates polished products from cluttered ones. Treat every added element as a cost. The instinct to decorate is almost always wrong; the instinct to simplify is almost always right.

### The "remove until it breaks" pass
Before shipping a screen, do a subtraction pass: remove elements, borders, colors, and decorations one at a time until the design stops working — then add back only the last thing you removed. Most screens survive losing far more than designers expect. Ask of each element: does this help the user act or understand? If not, it goes. Apply the same pass to words: cut labels, helper text, and headings to the shortest version that still reads clearly. Fewer words is fewer things to process.

### One primary action per screen
Each screen (or each clear context) should have exactly **one** primary action — the single most important thing the user can do — styled unmistakably in the accent color. Everything else is secondary (ghost/text buttons) or tertiary. Two competing primary buttons means neither is primary, and the user has to think. Demote, don't duplicate. This scales to sections too: a card or a modal each get their own single primary action within their own context, but a screen should never present two full-weight accent buttons side by side asking for equal attention.

### Borders vs shadows — pick one
To separate a surface from its background, use **either** a subtle border **or** a soft shadow — not both, and rarely a hard version of either. Borders read as precise and flat; shadows read as soft and layered. Choose one separation language and apply it consistently across cards, menus, and inputs. Stacking heavy borders and heavy shadows makes UI feel noisy and dated. When in doubt, prefer whitespace or a faint background tint over any divider at all. If you do use shadows, keep them soft and low-contrast (large blur, low opacity, small offset) and use elevation consistently — a bigger shadow means "closer to the user," so a dropdown sits above a card sits above the page.

### Motion, quietly
Clean interfaces move calmly. Keep transitions short (roughly 150-250ms), ease them naturally, and animate only `transform` and `opacity` so motion stays smooth. Motion should clarify — where a panel came from, that an action registered — never decorate. One considered transition beats five bouncy ones. Always honor reduced-motion preferences and drop non-essential animation for those users.

## Anti-pattern list (avoid)

- Multiple accent colors competing for attention; color used decoratively instead of meaningfully.
- Cramped layouts with no breathing room; content edge-to-edge against containers.
- Mixed corner radii across cards, buttons, and inputs.
- Five nearly-identical type sizes doing the work that weight and color should do.
- Mixing icon sets, or mixing weights within one set.
- Two or more primary buttons on the same screen.
- Both a hard border and a heavy drop shadow on the same card.
- Heavy drop shadows, harsh gradients, and glow effects used to add "polish."
- Pure black (#000) text/backgrounds and fully saturated colors — soften to near-black and slightly desaturated tones.
- Decorative elements that carry no information (filler icons, redundant dividers, empty flourishes).
- Making the user stop and think: unclear primary action, ambiguous labels, too many choices at once.
- Inconsistent spacing eyeballed per-element instead of pulled from a fixed scale.
- Long, redundant microcopy where a few words would do.
- Motion that decorates rather than clarifies, or that ignores reduced-motion preferences.
- Fully saturated accent tints on dark backgrounds instead of softened ones.
- Filling empty space out of discomfort instead of trusting whitespace to do its job.

## Pre-ship checklist

Run every screen through this before calling it done:

- [ ] Exactly one accent color; extra colors are semantic (success/warning/danger) only.
- [ ] One primary action, unmistakable; everything else demoted.
- [ ] One corner radius across cards, buttons, inputs, and icon containers.
- [ ] Two or three type sizes; hierarchy carried by weight and color.
- [ ] One font family; only the weights actually used are loaded.
- [ ] One icon family, one weight, sized on the text scale.
- [ ] Separation by whitespace first; if not, either a border or a shadow, never both.
- [ ] Generous, consistent spacing pulled from a fixed scale.
- [ ] Ran the "remove until it breaks" pass; nothing decorative survived.
- [ ] The next step is obvious without the user having to think.

## Color depth without a second hue

Clean does not mean flat-gray. Build depth from a neutral ramp and the accent's tints, not from more colors:

- **Text** — a near-black (not pure #000) for primary text, a mid-gray for secondary, a lighter gray for tertiary/placeholder. Three text weights of gray create hierarchy with zero extra color.
- **Surfaces** — background, card, and raised surface as three subtly different neutrals; separate them with tone, not always a border.
- **Accent** — the solid accent for actions, a soft tint for its hover/active, and a very light wash for selected rows or highlighted regions.
That is a complete, calm palette: one accent, its tints, and a neutral ramp.

## Dark mode, cleanly

Do not simply invert. Use elevated dark surfaces (slightly lighter grays for raised elements, never pure black backgrounds for large areas), soften the accent so it is not harsh on dark, and avoid pure-white text (use an off-white). Keep the same single-accent, one-radius, tiny-scale discipline — dark mode is a token swap on the semantic layer, not a redesign.

## When to break these rules

These are defaults, not dogma. Break one only deliberately and locally, never by accident:

- A data-dense dashboard may need tighter spacing and more color to encode meaning — but keep the color *systematic* (categorical/sequential), not decorative.
- A marketing or brand moment may justify a bold second color or a display font — confine it to that surface and keep the product UI quiet.
- A playful consumer app can lean into motion and rounder shapes — still pick one radius, one accent, one motion character.
The test is always: does this break serve the user or the brand's real intent, or is it just decoration sneaking back in?

## The through-line

Clean design = a single accent, generous whitespace, one radius, a tiny type scale, one font, one icon family at one weight, one obvious action per screen, and one separation language. Everything else is restraint. Related: [[quieter]] · [[color-systems]] · [[typography]] · [[spacing-layout]] · [[conversion-ux]].
