---
id: design-systems-methodology
title: "Design Systems Methodology — Atomic Design, Patterns, Tokens & Governance"
category: process
platform: both
tags: [design-system, atomic-design, components, governance, tokens]
sources: ["https://atomicdesign.bradfrost.com/chapter-2/", "https://bradfrost.com/blog/post/atomic-web-design/", "https://www.smashingmagazine.com/design-systems-book/", "https://alistapart.com/article/design-systems-the-hard-parts/", "https://www.designtokens.org/tr/2025.10/format/", "https://www.componentgallery.com/blog/component-api-design/", "https://bradfrost.com/blog/post/a-design-system-governance-process/"]
updated: 2026-07-09
---

# Design Systems Methodology

A design system is not a component library. It is the shared language, principles, tokens, components, and governance that let a team ship coherent product faster than they could ad hoc. Build the system to serve the product, never the reverse. This doc is the method: how to structure it, how to design its components, how to layer its tokens, and how to run it as a living program.

Think of a design system as three concentric rings:

- **Foundations** — principles, tokens, and perceptual patterns (color, type, space, motion, shape). The shared vocabulary.
- **Components** — the functional building blocks that consume foundations.
- **Governance** — the operating model that keeps the first two ring honest over time.

A system that ships only components, with no principles above them and no governance around them, is a library. It will drift, fork, and rot. Everything below treats all three rings as first-class.

## Principles come before components

Before a single component, agree on principles — short, opinionated, testable statements that resolve arguments. Good principles are specific enough to say no. "Accessible" is not a principle; "every interactive element is reachable and operable by keyboard alone, with a visible focus state" is. "Clean" is not a principle; "we prefer whitespace and typographic hierarchy over borders and shadows for separation" is. Three to seven principles are plenty. They become the tie-breaker in every review and the north star for perceptual patterns. Write them down, publish them in the docs, and cite them in reviews — a principle nobody references is decoration.

## Atomic Design (Brad Frost)

Atomic Design is a mental model, not a rigid folder structure. It borrows chemistry's hierarchy to describe how small pieces compose into whole interfaces. The five stages are non-linear — they coexist and inform each other.

- **Atoms** — the smallest meaningful UI primitives. A label, an input, a button, an icon, a single color swatch, a font token in use. Atoms are abstract on their own but define the foundational look and feel. Example: `<Button>`, `<Input>`, `<Avatar>`, `<Badge>`.
- **Molecules** — small groups of atoms bonded to do one job. A search field is a label + input + button. A form row is a label + input + help text + error slot. Molecules are the first level where a component has a clear, reusable purpose. Keep them single-responsibility.
- **Organisms** — relatively complex, distinct sections built from molecules and atoms. A site header (logo + nav + search + account menu), a product card grid, a comment thread, a checkout summary. Organisms are recognizable UI regions and are where brand personality becomes concrete.
- **Templates** — page-level skeletons that place organisms into a layout. Templates focus on structure and content hierarchy, not final content. They are the wireframe made real: "header here, two-column body, sidebar, footer."
- **Pages** — templates filled with real, representative content. Pages are where you test whether the system holds up: real product names that are too long, empty states, error states, 200 rows instead of 3. Pages feed corrections back down to atoms and molecules.

A concrete walk-up, one feature: a color token and a font token (atoms) style a `<Label>` and an `<Input>` (atoms). Bound with help text and an error slot, they form a `FormField` (molecule). A stack of `FormField`s plus a submit `<Button>` and a heading becomes a `SignupForm` (organism). Dropped into a centered single-column `AuthLayout` (template) and filled with the real signup copy, validation errors, and a loading state, it becomes the Signup **page** — where you discover the error text wraps to three lines and feed that fix back down to `FormField`.

Practical guidance:
- Do not obsess over which bucket a component belongs to. The value is the compose-up / test-down loop, not taxonomy debates.
- Build the system from **real content and real edge cases**, not lorem ipsum. Pages exist precisely to surface what abstract atoms hide.
- Atoms map cleanly to tokens and primitives; organisms map to product features. Keep the boundary between "system-owned" (atoms/molecules) and "product-owned" (some organisms/templates) explicit.
- Atomic Design is orthogonal to your folder structure and to any framework. It is a way of thinking about composition and testing, not a directory convention to enforce.

### The system / product boundary

The single most useful line to draw is between what the **system** owns and what a **product team** owns. A rough default: the system owns atoms, molecules, tokens, and generic organisms (header, footer, data table). Product teams own feature-specific organisms, templates, and pages, assembled from system parts. Get this boundary explicit and written down — most system friction is really an ownership dispute in disguise. When a product team needs an organism three times, that is the signal to promote it into the system through the contribution process.

## Functional vs perceptual patterns (Alla Kholmatova)

In *Design Systems* (Smashing Magazine), Kholmatova splits patterns into two kinds, and the split changes how you govern each.

- **Functional patterns** — tangible building blocks tied to behavior and content: buttons, cards, forms, menus, headers. They are relatively objective; two designers usually agree whether a card is a card. Govern these with clear names, defined states, and API contracts.
- **Perceptual patterns** — the intangible style layer that carries brand and mood: color, typography, spacing rhythm, shape/radius, iconography style, motion character, tone of voice, texture. These are subjective and emotional. Capture them as **tokens and principles**, and name them by the feeling or purpose ("calm," "confident," "energetic") so the team shares vocabulary.

**Loose vs strict systems.** Kholmatova frames systems on a spectrum:
- **Strict systems** — tightly controlled, small rule set, high consistency, centralized. Best for mature products, small surface area, or brand-critical work. Faster to keep coherent; slower to evolve; can feel constraining.
- **Loose systems** — flexible, principle-led, contribution-friendly, tolerant of local variation. Best for large orgs, many teams, exploratory products. Faster to evolve; harder to keep consistent; demands strong shared principles to avoid drift.
Pick the point on the spectrum deliberately per organization; most teams sit in the middle and tighten specific areas (color, spacing) while leaving others loose (marketing layouts).

A useful test for which patterns are which: if a designer can change it without asking anyone and no one would notice a brand shift, it is a functional detail. If changing it alters how the product *feels*, it is perceptual and belongs in tokens and principles under tighter control.

## Component API design

A component's API is a product for developers. Bad APIs leak into every consumer and are expensive to change. Design them with the same care as the visuals.

- **Composition over configuration.** Prefer small composable parts over one mega-component with dozens of props. A `<Card>` that accepts `<Card.Header>`, `<Card.Body>`, `<Card.Footer>` slots ages far better than a `<Card>` with `title`, `subtitle`, `imageUrl`, `showFooter`, `footerAlign`... configuration.
- **Props, variants, slots — use the right tool:**
  - *Variants* for a closed set of visual/semantic modes: `variant="primary | secondary | ghost"`, `size="sm | md | lg"`. One prop, mutually exclusive values.
  - *Slots / children* for arbitrary content injection (icon before label, custom footer). Slots keep the component open without new props.
  - *Props* for discrete data and behavior: `disabled`, `loading`, `onPress`.
- **Sensible defaults.** The most common usage should require the least code. `<Button>Save</Button>` should already be correct — medium size, primary intent only if that is the common case, accessible by default.
- **Avoid boolean explosion.** Multiple booleans encode a state machine badly: `isPrimary`, `isSecondary`, `isDanger` can be set contradictorily. Collapse mutually-exclusive booleans into a single enum variant. Rule of thumb: if two booleans should never both be true, they are one variant prop.
- **Name for intent, not appearance.** `variant="danger"` survives a rebrand; `variant="red"` does not.
- **Keep the surface small and orthogonal.** Every prop is a permanent contract and a combinatorial test case. Fewer, well-chosen props beat exhaustive configurability.
- **Every interactive component defines its full state set.** Default, hover, focus-visible, active, disabled, loading, error, selected — as applicable. A component is not "done" until each state is designed, tokenized, and documented. Missing states are where real products fall apart.

Worked example — the same button, badly and well:

```tsx
// Bad: boolean explosion + appearance names + no state contract
<Button isPrimary isSmall isRed showIcon iconLeft label="Delete" />

// Good: one variant enum, one size enum, slots for content, intent naming
<Button variant="danger" size="sm">
  <Icon name="trash" /> Delete
</Button>
```

`isPrimary` + `isRed` can contradict; `variant="danger"` cannot. The slot (`children`) removes `showIcon`/`iconLeft`/`label` entirely and lets any content in. This API has fewer props, no illegal states, and survives a rebrand.

## Token layering (W3C DTCG: primitive → semantic → component)

Tokens are the perceptual layer made into data. The W3C Design Tokens Community Group format reached its **first stable version (2025.10) in October 2025** — treat it as the interchange standard (JSON, `$value`/`$type`, `{group.token}` aliases). Layer tokens in three tiers so a theme change is a value swap, not a refactor:

1. **Primitive (global/reference) tokens** — the raw palette and scales. `color.blue.500`, `space.4 = 16px`, `font.size.300`. No meaning, just values. Never reference these directly in components.
2. **Semantic (system/alias) tokens** — decisions with intent, aliased to primitives. `color.action.primary → {color.blue.500}`, `color.text.default`, `color.surface.raised`, `space.inset.md`. Components consume this layer. Dark mode, high contrast, and multi-brand live here as alternate mappings.
3. **Component tokens** — the most specific, scoped to one component, aliased to semantic tokens. `button.primary.background → {color.action.primary}`, `card.radius → {radius.md}`. Optional, but they give designers safe local control without touching semantics.

Naming discipline within the tiers matters as much as the tiers themselves. A workable pattern is `category.concept.property.variant.state`, e.g. `color.action.background.primary.hover`. Be consistent about order and vocabulary across the whole system — inconsistent token names cost more than any other single documentation gap.

Chain: component → semantic → primitive. Consumers touch semantic and component tiers only. This is exactly what **SaglitzDesign's `generate_design_tokens` tool** emits — DTCG-compliant JSON with the three tiers wired as aliases, ready for Style Dictionary / Terrazzo to transform into CSS variables, Swift, Kotlin, and Compose. Feed it your brand primitives and intent map; it returns the layered graph so platforms stay in sync from one source of truth. Keep the tool's output as the canonical token file and generate platform artifacts from it — never hand-edit the downstream CSS or Swift.

## Governance & contribution

A design system without governance rots into a graveyard of stale components. Governance is the operating model that keeps it trustworthy.

- **Versioning (semver).** Publish the system as versioned packages. *Major* = breaking API/visual change (removed prop, renamed token). *Minor* = additive (new component, new variant). *Patch* = fixes. Communicate breaking changes with migration notes and codemods where possible. Note that a *visual* change can be breaking even when the code API is unchanged — a restyled component that shifts layout in consumers is a major-worthy event; treat perceptual changes with the same rigor as API changes.
- **Release cadence and changelog.** Ship on a predictable rhythm with a human-readable changelog. Consumers plan upgrades around a cadence they can trust; surprise breaking releases erode adoption faster than slow ones.
- **Contribution process.** Define how a new pattern enters the system: propose → review → design + a11y + eng review → document → release. Frost's model distinguishes centralized (a core team owns everything) from federated/distributed (product teams contribute, core team curates). Most scaled orgs run a **hybrid**: core team owns foundations and review; product teams propose and build.
- **Review gates.** Every contribution passes design review (does it fit perceptual patterns), engineering review (API quality, tokens used not hardcoded values), and accessibility review (keyboard, contrast, ARIA, focus).
- **Deprecation.** Never silently delete. Mark tokens/components `$deprecated` (DTCG supports this), keep them working for at least one major cycle, document the replacement, and provide a migration path. Track deprecated usage to know when it is safe to remove.
- **Documentation is part of "done."** A component ships only with usage guidelines, do/don't examples, props reference, accessibility notes, and live examples. Undocumented components get misused or reinvented.
- **Adoption metrics.** Measure whether the system is actually used: percentage of UI built from system components vs one-offs, number of hardcoded values vs tokens, coverage across teams, time-to-ship for new screens, count of "detached" or overridden instances. Adoption — not component count — is the real health metric.

Every documented component should answer, at minimum:

- **What it is and when to use it** — plus explicit "when NOT to use it / use X instead."
- **Anatomy** — labeled parts and slots.
- **Props / variants reference** — with defaults and allowed values.
- **States** — visual for each interaction and status state.
- **Accessibility** — keyboard interactions, roles, focus behavior, contrast notes.
- **Do / Don't** — two or three concrete misuse examples caught early.
- **Live, editable examples** — in Storybook or an equivalent, not screenshots.

### The maturity curve

Systems mature in stages, and forcing a later stage too early is a common failure:

1. **Ad hoc** — shared styles, copy-paste components. Fine for one small team.
2. **Tokenized** — a real token file (foundations) even before formal components.
3. **Componentized** — versioned, documented components consuming tokens.
4. **Governed** — contribution process, review gates, deprecation policy, metrics.
5. **Multi-platform / multi-brand** — one token source transforms to web, iOS, Android; themes are value swaps.

Advance a stage only when the current one is genuinely felt as a constraint.

### What a mature system contains

A useful inventory to check completeness — foundations (principles, tokens, color/type/space/motion/elevation scales, iconography), functional components with full state sets and documented APIs, layout objects and templates, accessibility guidance baked into every component, contribution and deprecation processes, versioned packages with a changelog, and a living docs site with editable examples. Gaps in any of these are where the system quietly loses trust.

## When NOT to build a design system

A design system is a long-term investment with real ongoing cost. Do not build one when:

- **The product is pre-product-market-fit.** You will rip up the UI repeatedly. Formalizing patterns you are about to delete is waste. Use a lightweight token file and an off-the-shelf primitive library (Radix, shadcn/ui, native platform kits) and defer the system.
- **The surface is tiny.** A single-screen tool or landing page does not need governance, contribution processes, and versioned packages. A stylesheet and a few components suffice.
- **One team, one codebase, low change rate.** The coordination overhead of a "system" only pays off across multiple teams, products, or platforms. Below that threshold, shared components in the repo are enough.
- **You lack ownership.** A system with no dedicated maintainer and no governance decays faster than ad hoc UI, and now everyone distrusts it. If no one can own it, do not start it.
- **You would be building it speculatively.** Extract the system from real, repeated patterns you have already shipped. Build components on the second or third real need, not on the first guess. Premature abstraction is the most common design-system failure.
- **A capable off-the-shelf system already fits.** If Material, an Apple/HIG native kit, shadcn/ui, or a vendor system covers your needs, adopt and theme it rather than reinventing. Building your own is justified only when your brand or product constraints genuinely exceed what an existing system offers.

## Tooling pipeline

Keep one source of truth and generate everything else. A typical mature pipeline:

- **Source of truth** — DTCG token JSON (from `generate_design_tokens`) plus component source in a versioned package.
- **Token transform** — Style Dictionary or Terrazzo turns the DTCG file into CSS custom properties, Swift, Kotlin/Compose, and Flutter outputs.
- **Design tool sync** — Figma variables and Tokens Studio read/write the same DTCG file, so design and code share one token graph.
- **Component workshop** — Storybook (or equivalent) for isolated development, visual review, and living docs.
- **Quality gates in CI** — visual regression (Chromatic/Playwright), accessibility checks (axe), and type/lint so a broken contract fails the build, not production.

The rule: no platform artifact is hand-edited. If the CSS variables and the Swift constants can drift, they will. Generate both from the token source every build.

## Common failure modes

- **Library, not system** — components with no principles above them and no governance around them; drifts within a quarter.
- **Premature abstraction** — building the system before real, repeated patterns exist; you generalize the wrong things.
- **Speculative components** — shipping components no product actually needs "for completeness."
- **Hardcoded values** — components with raw hex/px instead of tokens; theming and rebrands become refactors.
- **Silent deletion** — removing tokens/components without deprecation, breaking consumers and destroying trust.
- **No owner** — a system nobody maintains decays faster than ad hoc UI and poisons adoption.
- **Consistency worship** — forcing strict uniformity where a loose, principle-led area would serve teams better.
- **Docs-as-afterthought** — components shipped without usage guidance, states, or a11y notes; they get misused and quietly reinvented.
- **Counting components as success** — celebrating inventory while real adoption (tokens used, one-offs replaced) stays flat.
- **Reinventing an off-the-shelf system** — building bespoke when Material, a native kit, or shadcn/ui would have fit and freed the team for product work.
- **Missing state coverage** — components designed only for their happy path, with no hover/focus/disabled/loading/error, so real UI breaks on contact.
- **Two sources of truth** — hand-maintained tokens in both design and code that inevitably drift; always generate downstream artifacts from one DTCG source.

Start with tokens and a handful of proven components. Let the system grow from real usage, govern it deliberately, and measure adoption over inventory.
