---
id: design-handoff
title: "Design Handoff — Figma-to-Code & Design–Dev Collaboration"
category: process
platform: both
tags: [handoff, figma, dev-mode, tokens, code-connect, collaboration, specs]
sources: ["https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode", "https://www.figma.com/dev-mode/", "https://www.figma.com/code-connect-docs/", "https://help.figma.com/hc/en-us/articles/32131076476823-Add-dev-resources-in-Dev-Mode", "https://www.nngroup.com/articles/design-handoff/", "https://storybook.js.org/docs/writing-docs/design-integrations", "https://www.designtokens.org/tr/2025.10/format/", "https://help.figma.com/hc/en-us/articles/1500009860581-Create-and-manage-variables"]
updated: 2026-07-23
---

# Design Handoff — Figma-to-Code & Design–Dev Collaboration

Handoff is not an event; it is a continuous state. The moment you picture a fixed line where design "finishes" and engineering "starts," you have already lost — that line is where intent leaks, edge cases get invented on the fly, and the built product quietly diverges from the design. Good handoff means the design and the code share one vocabulary (tokens and components), engineers are in the room before a screen is "done," and the design file is a living reference rather than a spec dropped over a wall. This doc is the method: how to run collaboration, what Figma Dev Mode actually gives you, how tokens and Code Connect make redlines obsolete, and what to check before and after build.

## The anti-pattern: throwing files over the wall

The failed model is linear and one-directional: a designer perfects a static comp, exports a spec, hands it off, and disappears. Engineering then reverse-engineers intent from pixels, guesses at states nobody drew, and ships something plausible but wrong. The designer sees it in QA, files fifty nitpicks, and the relationship sours. Every symptom — surprise edge cases, mismatched spacing, "that's not what I meant" — traces back to the same root: design and engineering treated as sequential phases instead of one collaboration with a shared source of truth.

The fix is structural, not attitudinal:

- **Involve engineers early.** Bring a developer into design reviews while the design is still cheap to change. They will flag technical constraints, existing components to reuse, and states you forgot before the comp is "final."
- **Shared language, not translation.** When the design system's tokens and components are the same names on both sides, handoff stops being translation and becomes lookup. See [[design-systems-methodology]] and [[design-tokens-theming]].
- **The file is a conversation.** Design is versioned, annotated, and revisited. "Ready for dev" is a status you set, not a folder you email.

## Figma Dev Mode

Dev Mode is the engineer's view of a Figma file — a read-and-inspect surface tuned for building, not designing. Treat it as the primary handoff interface.

- **Inspect and measure.** Select any layer to read exact sizing, position, padding, gaps, and spacing between elements. Hover to measure distances between any two objects. This kills the "what's the padding here?" question.
- **Tokens and variables.** Dev Mode surfaces the **variables** bound to a layer — color, spacing, radius, typography — by their token name, not their raw value. An engineer sees `color/surface/raised`, not `#1B1F24`. This is the single most important handoff feature: it exposes the semantic decision, not the literal pixel.
- **Code snippets and settings.** Dev Mode generates starter CSS/iOS/Android snippets and can be configured to map values to your codebase's units and token names. Snippets are a starting point, never paste-and-ship.
- **Dev resources.** Attach links directly to a frame or component — the Storybook story, the GitHub component, the ticket, the spec doc — so the code lives one click from the design.
- **Ready for dev.** Mark a section or frame **Ready for dev** to signal it has cleared review and is stable to build. Engineers filter the file to only these. Changing a "ready" frame should notify, not silently drift.
- **Annotations and measurements.** Add persistent annotations to layers to capture intent, behavior, and properties (including the specific variables/properties applied) so the reasoning travels with the design.

## Design tokens as the shared contract

Tokens are the handoff contract. When a color, space, or type decision exists as a named variable in Figma and the same name resolves to a value in code, there is nothing to "hand off" — both sides reference the same decision. This is the mechanism that makes everything else work.

- **Figma variables → code tokens.** Model color, spacing, radius, and type as Figma **variables**, layered primitive → semantic → component, and export them to the same DTCG token graph the code consumes. One source of truth; platforms generate downstream. See [[design-tokens-theming]].
- **Name for intent, in sync.** `color/action/primary`, not `blue-500`. The token name must be identical in Figma and code — a token whose name differs across the boundary is a token that will drift. See [[design-systems-methodology]].
- **Theming is a value swap.** Light/dark, brand, and density variants live as alternate mappings of the same semantic tokens. If a mode change requires touching components, the tokens are layered wrong.
- **Never hand-edit downstream.** The generated CSS/Swift/Kotlin is an artifact; edit the source token file and regenerate. Two hand-maintained token sets always diverge.

## Component parity

The second half of the contract is components. Each Figma component should map to exactly one coded component, with matching names, matching variants, and every state accounted for.

- **Code Connect.** Figma's Code Connect links a Figma component to its real code counterpart so Dev Mode shows *your* actual component code — correct import, prop names, and usage — instead of generic generated markup. Maintain `.figma.ts`/`.figma.tsx` mappings alongside the components; wire variant props (`variant`, `size`, `state`) to Figma properties so the inspected snippet reflects reality.
- **Naming alignment.** The Figma component name, the coded component name, and the Storybook story should read the same. Divergent names are the most common source of "which button is this?"
- **Variants and props match.** A Figma variant set (`variant=primary|secondary|ghost`, `size=sm|md|lg`) must map one-to-one onto the coded component's props. If Figma has a variant the code cannot express (or vice versa), that is a parity bug to fix, not to paper over.
- **States are documented, not implied.** Every interactive component ships with **hover, focus-visible, active, disabled, loading, error, selected, and empty** designed and named — as applicable. The happy-path-only comp is where real products break on contact. See [[accessibility]] for focus and state semantics.

## Specs that actually matter

With tokens and components carrying the visual contract, the spec's job narrows to what pixels cannot express: behavior, responsiveness, and intent. Annotate:

- **Spacing and sizing** — as tokens (`space/inset/md`), not measured pixels. Dev Mode reads them; you annotate only where the intent is non-obvious.
- **Responsive behavior and breakpoints** — how the layout reflows, what stacks, what hides, what stays fixed, at which breakpoints. Static comps at three widths beat one comp plus a guess.
- **Typography and color** — as type and color tokens, with the semantic role (`text/default`, `heading/lg`), not raw hex and px.
- **Motion specs** — trigger, duration, easing, and property for transitions and micro-interactions. "Fade in" is not a spec; "opacity 0→1, 160ms, ease-out, on mount" is. See [[design-engineering]] for the implementation contract.
- **Edge, empty, and error states** — the empty list, the failed request, the 200-row table, the name that wraps to three lines. Draw them; do not leave them to engineering improvisation.
- **Content and i18n behavior** — how text truncates vs. wraps, pluralization, longest-string tolerance, RTL mirroring, and dynamic-type/text-scaling behavior. See [[ux-writing]].
- **Accessibility annotations** — focus order, labels, roles, landmark structure, and contrast intent, captured as annotations on the frame. See [[accessibility]].

## Redlines are mostly dead

Manually drawn redlines — arrows and measurements pasted onto a comp — are a relic of the era before Dev Mode and tokens. When measurements are inspectable and values are named variables, redlining spacing is busywork that goes stale the moment the design moves. Stop annotating *what is measurable* and start annotating *what is not*:

- **Intent** — why this element exists, why this hierarchy, what the user is trying to accomplish here.
- **Behavior** — what happens on tap, on submit, on error, on slow network, on no data.
- **Interaction and motion** — gestures, transitions, focus movement, loading choreography.

If an annotation restates a number Dev Mode already shows, delete it. If it captures a decision that would otherwise live only in the designer's head, keep it.

## After the build: design QA

Handoff is not done at "ready for dev" — it closes after implementation review. Once built, diff the running UI against the design.

- **Design vs. implementation diffing.** Compare the live build to the Figma frame side by side (visual regression tools like Chromatic, or manual overlay) and log deltas as tickets, prioritized — not every 1px shift is a defect, but systematic drift is.
- **Review the states, not just the screen.** Walk hover/focus/disabled/loading/error/empty in the real build. Screens pass the eye test while their states rot.
- **Close the loop.** Fixes that reveal a design gap (the error text really does wrap to three lines) feed back into the file and the system, not just the ticket.

## Tools landscape

- **Figma Dev Mode** — the primary inspect/handoff surface: measurements, variables, dev resources, ready-for-dev, annotations, Code Connect.
- **Code Connect** — maps Figma components to real code so Dev Mode shows your actual components and props.
- **Storybook** — the living component workshop and docs; link stories as dev resources so design and built component sit one click apart.
- **Zeplin** — legacy dedicated handoff/spec tool; largely superseded by Dev Mode for teams already in Figma, though still used where design and inspection are deliberately separated.
- **AI-assisted design-to-code** — Dev Mode and third-party tools can generate component code from a frame. Treat output as a *draft*: it ignores your existing components, invents one-off markup, hardcodes values instead of tokens, and misses states and accessibility. Use it to scaffold, then reconcile against your system, tokens, and Code Connect mappings before it lands.

## Collaboration & process

- **Naming conventions** — one vocabulary across Figma layers, tokens, components, and stories. Agree it once, enforce it in review.
- **Documentation** — component usage, states, and a11y notes live with the component (Storybook / docs), linked from Figma as dev resources. Undocumented components get reinvented.
- **Async communication** — annotations, dev resources, and ready-for-dev status let engineers self-serve across time zones without a synchronous handoff meeting per screen.
- **Feedback loops** — design reviews before build, design QA after; both feed the token/component system so the same gap is not rediscovered on the next feature.

## Checklist

Definition of ready — a frame is ready for dev only when:

- [ ] Marked **Ready for dev** in Dev Mode; the section has cleared design + a11y review.
- [ ] All colors, spacing, radius, and type are bound to **variables/tokens**, not raw values.
- [ ] Components used are **library components** mapped via **Code Connect** (names match code).
- [ ] Variants and props in the design map one-to-one to the coded component.
- [ ] Every applicable **state** is designed: hover, focus-visible, active, disabled, loading, error, selected, **empty**.
- [ ] **Responsive behavior** is shown (comps or annotations) at the real breakpoints.
- [ ] **Motion** is specced: trigger, property, duration, easing.
- [ ] **Content/i18n** behavior is defined: truncation vs. wrap, longest string, RTL, text scaling.
- [ ] **Accessibility** annotated: focus order, labels, roles, landmarks, contrast intent.
- [ ] **Dev resources** attached: Storybook story, code component, ticket, spec.
- [ ] Annotations capture **intent and behavior**, not re-stated measurements.
- [ ] A named owner exists to answer questions during build.

Definition of done — after build:

- [ ] Live UI diffed against the Figma frame; deltas triaged.
- [ ] All states verified in the running build, not just the default screen.
- [ ] Tokens confirmed (no hardcoded values crept in); a11y and keyboard checked.
- [ ] Design gaps discovered in QA fed back into the file and the system.

## Anti-patterns

- **Throwing files over the wall** — a static comp emailed as a finished spec, engineers left to reverse-engineer intent. Handoff is continuous collaboration, not a delivery.
- **Engineers involved only at handoff** — constraints, reuse opportunities, and missing states surface too late to be cheap. Bring them into design review.
- **Hardcoded values in the design** — raw hex/px instead of variables, so there is no token contract and every value is a manual translation that drifts.
- **Divergent names** — the Figma component, the code component, and the Storybook story all named differently; nobody can tell which is which.
- **Happy-path-only comps** — no empty, error, loading, or edge states drawn, so engineering invents them and design rejects them in QA.
- **Manual redlines that restate measurements** — busywork that goes stale the instant the design moves; annotate intent and behavior instead.
- **Two sources of truth for tokens** — hand-maintained values in both design and code that inevitably diverge; generate downstream from one DTCG source.
- **Ship-and-forget** — no design QA after build, so implementation drift accumulates release over release unnoticed.
- **Trusting AI-generated code verbatim** — pasting design-to-code output that ignores your components, hardcodes values, and skips states and a11y.
- **"Ready for dev" that keeps changing** — marking frames ready and then silently editing them, so engineers build a moving target.
