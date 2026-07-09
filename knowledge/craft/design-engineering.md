---
id: design-engineering
title: "Design Engineering — Clean Code for UI, Done Right"
category: craft
platform: both
tags: [frontend, css-architecture, semantic-html, tokens-in-code, components]
sources: ["https://developer.mozilla.org/en-US/docs/Web/HTML/Element", "https://www.w3.org/WAI/ARIA/apg/", "https://csswizardry.com/2018/11/itcss-and-skillshare/", "https://developer.mozilla.org/en-US/docs/Web/CSS/@layer", "https://tailwindcss.com/docs/styling-with-utility-classes", "https://www.patterns.dev/react/compound-pattern/", "https://www.smashingmagazine.com/2021/08/compound-components-react/"]
updated: 2026-07-09
---

# Design Engineering — Clean Code for UI, Done Right

There is a craft that sits between "designer" and "engineer": building interfaces that are correct, accessible, maintainable, and faithful to the design. This is design engineering, and it has its own standards.

**A note on "Clean Code."** When people say "clean code" they usually mean Robert C. Martin's book — small functions, SOLID, dependency inversion, elaborate class hierarchies. That guidance is a poor fit for UI. Interfaces are declarative, composition-driven, and dominated by state, layout, and the DOM/render tree — not by the OO abstractions Clean Code optimizes for. Applying it literally produces over-abstracted component factories, premature indirection, and worse UI code. The real discipline for interfaces is **design-engineering craft**: semantic markup, sane CSS architecture, tokens in code, and composition. That is what this doc covers.

## Semantic & accessible HTML

The DOM is the accessibility API. Get the elements right and most accessibility is free; get them wrong and no amount of ARIA rescues it.

- **Use the correct element for the job.** `<button>` for actions, `<a href>` for navigation, `<input>`/`<select>`/`<textarea>` for form data, `<label>` bound to every control, `<table>` for tabular data. A `<div onClick>` is not a button — it is missing focusability, keyboard activation, and role. Native elements ship behavior, focus management, and semantics you would otherwise reimplement (badly).
- **Landmarks and document structure.** Wrap regions in `<header>`, `<nav>`, `<main>` (one per page), `<aside>`, `<footer>`. Use one `<h1>` and a logical, unskipped heading order — screen-reader users navigate by headings and landmarks. Structure is navigation.
- **Lists are lists.** Groups of repeated items belong in `<ul>`/`<ol>`/`<li>` so assistive tech announces count and position.
- **ARIA as a last resort.** The first rule of ARIA is: don't use ARIA if a native element does the job. ARIA adds semantics but zero behavior — `role="button"` still needs your own keyboard handling and focus. Reach for ARIA only for patterns HTML cannot express (tabs, comboboxes, live regions, disclosure state via `aria-expanded`), and follow the WAI-ARIA Authoring Practices for the full keyboard contract.
- **Focus and state.** Never remove focus outlines without replacing them; use `:focus-visible`. Reflect state in the accessibility tree: `aria-expanded`, `aria-current`, `aria-invalid`, `aria-live` for async updates. Manage focus on route changes and when opening/closing dialogs.
- **Forms deserve extra care.** Every input has a programmatically associated `<label>` (wrapping or `for`/`id`). Group related controls in `<fieldset>` with a `<legend>`. Tie error messages to inputs with `aria-describedby` and mark invalid fields `aria-invalid`. Do not rely on placeholder text as a label — it vanishes on input and fails contrast.
- **Images and media.** Meaningful images get real `alt`; decorative images get `alt=""` so screen readers skip them. Never encode information in color alone.
- **Test the keyboard and the reader.** Tab through every flow; if you cannot reach or operate something with the keyboard, it is broken. Spot-check with a screen reader (VoiceOver, NVDA) — the announced experience is the real one for many users. Automated checks (axe) catch the obvious; manual checks catch the rest.

## CSS architecture

CSS has no module system by default; discipline is the architecture. The goal is predictable specificity and no arms race.

- **ITCSS (Harry Roberts).** Inverted Triangle CSS orders your stylesheet from least specific / widest reach to most specific / narrowest reach: **Settings** (tokens/variables) → **Tools** (mixins, functions) → **Generic** (reset, normalize) → **Elements** (bare tag styles) → **Objects** (layout patterns, unstyled) → **Components** (styled UI) → **Utilities** (single-purpose overrides, highest specificity). Because specificity only ever increases down the file, the cascade works with you instead of against you.
- **Utility-first / Tailwind — the tradeoff.** Utility classes (`flex gap-4 rounded-lg`) colocate styling with markup, eliminate naming fatigue, keep CSS from growing unbounded, and make deletion safe (delete the markup, delete the styles). Costs: verbose class strings, styling logic living in templates, and a real dependence on the design-token config being the single source of truth. Use utilities for the 90% of one-off layout/spacing; extract a component (or `@apply`/component class) when a pattern repeats and needs a name and a contract. Do not hardcode arbitrary values — utilities must resolve to your tokens or the system leaks.
- **Cascade layers (`@layer`).** Modern CSS `@layer` lets you define explicit precedence bands (`@layer reset, base, components, utilities;`) independent of specificity or source order. This tames specificity wars structurally: a component-layer rule never accidentally loses to a base-layer selector, and you stop reaching for `!important`. Pairs naturally with ITCSS's ordering.
- **Avoiding specificity wars.** Keep selectors flat and single-class (`.card__title`, not `nav ul li a span`). Do not nest deeply. Reserve IDs for anchors, not styling. Treat `!important` as a smell everywhere except intentional utility layers. Low, uniform specificity means any rule can be overridden predictably.
- **BEM or a naming convention** (`block__element--modifier`) still earns its keep in non-utility codebases: it keeps selectors single-class and self-documenting, which is exactly what keeps specificity flat.

## Layout & responsive craft

- **Use the right layout primitive.** Flexbox for one-dimensional rows/columns and distribution; CSS Grid for two-dimensional layouts and page structure. Reach for `gap` before margins to space children — it never collapses and needs no last-child cleanup.
- **Design intrinsically.** Prefer content-driven sizing (`min()`, `max()`, `clamp()`, `minmax()`, `fit-content`) and container queries over a pile of width breakpoints. Components should adapt to the space they are given, not to the viewport globally.
- **Mobile-first.** Author base styles for small screens, then layer enhancements up with `min-width` queries. It produces simpler, additive CSS than desktop-first overrides.
- **Respect user preferences.** Honor `prefers-reduced-motion`, `prefers-color-scheme`, and `prefers-contrast`. These are accessibility, not polish.

## Tokens in code

The design system's token tiers must survive the trip into CSS. Represent them as custom properties so theming is a runtime value swap.

```css
:root {
  /* primitive — raw values, never used directly by components */
  --blue-500: #3b82f6;
  --space-4: 1rem;
  --radius-md: 10px;

  /* semantic — intent, aliased to primitives; where theming happens */
  --color-action-primary: var(--blue-500);
  --color-text-default: #111827;
  --surface-inset: var(--space-4);
}
[data-theme="dark"] {
  --color-action-primary: var(--blue-400);
  --color-text-default: #f9fafb;
}
.button--primary {
  /* component — scoped, aliased to semantic */
  --button-bg: var(--color-action-primary);
  background: var(--button-bg);
  border-radius: var(--radius-md);
}
```

- Components read **semantic** and **component** variables only — never primitives.
- Dark mode, high contrast, and brand switches are alternate mappings on the semantic tier; components change nothing.
- Custom properties cascade and are dynamic, so a theme swap on `:root`/`[data-theme]` reflows instantly with no rebuild. Keep the canonical tokens in DTCG JSON and generate this CSS, don't hand-maintain both.

## Component composition patterns

The maintainability of UI code lives or dies on composition. Prefer open, composable components over configurable monoliths.

**React**
- **Composition over props.** Accept `children` and let callers assemble structure instead of encoding every layout as a prop. A `<Card>` with slots beats a `<Card>` with fifteen `show*`/`*Align` props.
- **Compound components.** Expose a family that shares implicit state via context: `<Tabs><Tabs.List><Tabs.Tab/></Tabs.List><Tabs.Panel/></Tabs>`. The parent owns state; children read it from context. This gives a clean, declarative API with no prop-drilling and flexible markup order.
- **Headless UI.** Libraries like Radix Primitives, React Aria, and Headless UI ship behavior, state, and accessibility with zero styling. You supply the visuals (your tokens); they supply the correct keyboard interactions, focus management, and ARIA. This is the highest-leverage pattern for accessible custom components — never rebuild a combobox or dialog by hand.
- **State colocation.** Keep state as close to where it is used as possible; lift it only when genuinely shared. Co-located state is easier to reason about, delete, and test than a bloated global store.

**SwiftUI (brief).** The same instincts apply idiomatically: small composable `View` structs, `@ViewBuilder` closures as the native "slots" mechanism, `ViewModifier`s for reusable styling, and `@State`/`@Binding`/`@Observable` for colocated-then-lifted state. Prefer composing views over passing many configuration flags.

**Jetpack Compose (brief).** Composables that take content trailing lambdas (`content: @Composable () -> Unit`) are the slot pattern; hoist state upward (`value` + `onValueChange`) to keep composables stateless and reusable; use `Modifier` chains for styling rather than boolean parameters.

A headless-plus-tokens sketch, so the pattern is concrete:

```tsx
// Behavior + a11y from the headless primitive; visuals from your tokens.
import * as Dialog from "@radix-ui/react-dialog";

function ConfirmDialog({ children, trigger }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">{children}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
// .dialog-content reads only semantic/component tokens:
// background: var(--surface-raised); border-radius: var(--radius-md);
```

Radix supplies focus trapping, `Escape` to close, scroll locking, and the correct ARIA. You supply only tokenized styling. This is strictly better than a hand-rolled modal.

## State and data flow

- **Colocate, then lift.** Start state in the component that uses it; lift to the nearest common ancestor only when two components must share it. Global stores are for genuinely global concerns (auth, theme), not convenience.
- **Separate server state from UI state.** Server cache (React Query / SWR / RSC) is not the same as ephemeral UI state (open/closed, hovered, form draft). Conflating them creates stale-data and over-render bugs. Let a data layer own fetching, caching, and revalidation; let components own interaction state.
- **Derive, don't duplicate.** Compute values from existing state during render instead of storing a second copy that can desync. The fewer independent state atoms, the fewer illegal states.
- **Make illegal states unrepresentable.** Model status as one discriminated union (`idle | loading | error | success`) rather than three loose booleans that can contradict — the same anti-boolean-explosion rule from component APIs, applied to state.

## Comparing CSS methodologies

There is no single winner; match the approach to the codebase:

- **Utility-first (Tailwind)** — fastest iteration, bounded CSS size, safe deletion; cost is verbose markup. Best for product teams shipping many screens against a token config.
- **ITCSS + BEM** — explicit architecture, self-documenting classes, framework-agnostic; cost is naming discipline and more files. Best for large, long-lived, multi-team stylesheets.
- **CSS Modules / scoped styles** — locally scoped class names, no global collisions; pairs well with component frameworks.
- **CSS-in-JS** — colocated, dynamic, prop-driven styles; watch runtime cost and prefer zero-runtime/compiled variants. The industry has broadly moved toward compiled or utility approaches for performance.
Whatever the choice, the invariant holds: values come from tokens, specificity stays flat, and dead styles are easy to remove.

## Craft checklist

Before shipping UI code, confirm:

- Semantic elements throughout; ARIA only where HTML cannot express the pattern.
- One `<h1>`, logical heading order, real landmarks.
- Every control labeled; every interactive element keyboard-operable with a visible `:focus-visible` state.
- No hardcoded colors, spacing, or radii — semantic/component tokens only.
- Selectors flat and low-specificity; no stray `!important`; layers/utilities intentional.
- Composition over configuration; no boolean explosion; state colocated then lifted.
- Layout shift guarded, animations on `transform`/`opacity`, fonts loaded without invisible text.
- User preferences (motion, color scheme, contrast) honored.

## Naming, colocation, and maintainability

- **Name for intent, not implementation.** `PrimaryAction`, `--color-text-danger`, `useCheckoutTotals` — not `BlueButton`, `--red`, `useData2`.
- **Colocate what changes together.** Component, its styles, its tests, and its stories live side by side. When you delete the feature you delete the folder, cleanly.
- **One responsibility per component.** If a component both fetches data and renders three unrelated regions, split it. Small, single-purpose, well-named components compose; god-components accrete.
- **Delete fearlessly.** Utility-first CSS, colocated state, and slot-based composition all exist so that removing UI is safe. Dead-code confidence is a maintainability feature, not an afterthought.
- **Match markup to the design, not the mock's grouping.** Semantic structure first, then style — never wrap everything in `<div>`s that mirror the Figma layer tree.

## Performance is part of the craft

Perceived quality is inseparable from how the interface performs. Design engineering owns this, not "the backend."

- **Ship less.** Code-split by route, lazy-load below-the-fold and heavy widgets, and tree-shake. The fastest component is the one you didn't send.
- **Protect the main thread.** Keep interactions responsive; move heavy work off the critical path. Jank in a hover or scroll reads as cheapness no matter how good the visuals are.
- **Guard the layout.** Reserve space for images and async content (`width`/`height`, `aspect-ratio`) to avoid layout shift. Use skeletons or the design's own empty state, not spinners that reflow.
- **Animate the cheap properties.** Prefer `transform` and `opacity` (compositor-friendly) over animating layout properties like `width`, `top`, or `margin`.
- **Load fonts deliberately.** Subset, preload the critical face, and use `font-display: swap` (or `optional`) so text is never invisible while a font loads.

## The through-line

Correct elements, flat and layered CSS, tokens not magic numbers, and composition over configuration. Design engineering is the craft of making an interface that is faithful to the design, usable by everyone, fast, and cheap to change — the opposite of the over-abstracted "clean code" that general software advice would push you toward for UI.
