---
name: motion-and-animation
description: Add motion and animation that feels great, not like slop. Use when animating any UI — transitions, hovers, presses, sheets, drawers, modals, page transitions, gestures — or when an animation feels "off". Covers the easing rules agents get wrong (ease-out for enter, ease-in for exit), springs, interruptibility, durations, component craft (never scale(0), origin-aware), and reduced motion. Grounded in Apple's fluid-interface talks and web animation best practice.
---

# Motion & Animation

Motion exists to explain (where did this come from?), confirm (did that work?), and occasionally delight. If an animation does none of those, delete it. The details compound — wrong easing or a scale(0) pop is the difference between "premium" and "cheap."

> Full depth is in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`): docs `animation-craft`, `motion-microinteractions`, `wwdc-design-principles`.

## Easing — the rule agents get wrong

- **Enter: ease-out** (fast start, gentle landing). Elements arriving decelerate.
- **Exit: ease-in**, and faster than the enter (~2/3 the duration). Dismiss quickly.
- **Move / reposition: ease-in-out.**
- **Never `linear`** for UI — only for spinners and continuous progress.

Using `ease-in` for an enter (or `ease` everywhere by default) makes motion feel broken even if users can't say why.

## Durations

- Micro feedback (press, toggle, hover): 100–150ms.
- Small components (dropdown, tooltip, chip): 150–200ms.
- Medium (modal, sheet, drawer): 200–300ms.
- Page/screen transitions: 300–350ms. Nothing UI-blocking past ~400ms.

## Springs (the modern default on mobile & rich UI)

- Prefer springs over fixed-duration curves for anything gesture-driven or that can be interrupted — they feel natural and are inherently interruptible.
- Tune with **bounce + duration** (Motion) or **stiffness / damping / mass**. Little to no bounce for functional UI; a touch of bounce for playful moments only.
- **Velocity handoff:** a gesture's release velocity should flow into the spring, and momentum should project to where the gesture was *going*.

## Interruptibility (the single most important principle — from Apple)

Animations must be redirectable mid-flight. If a user opens then immediately closes a sheet, it should reverse from its current position, never finish opening first. Use **CSS transitions over keyframes** for interruptible state, and springs that accept current velocity.

## Component craft (the little things)

- **Never animate from `scale(0)`** — start ~0.8–0.95 so it grows subtly, not from nothing.
- **Origin-aware** popovers/menus/tooltips: set `transform-origin` at the trigger so they expand *from* it.
- Skip tooltip open-delay on subsequent hovers within a group.
- Animate enter states with **`@starting-style`** (CSS) so elements can transition in on first paint.
- **Only animate `transform` and `opacity`** (GPU-composited). Never animate width/height/top/left/margin.
- Use a subtle **blur** to mask an imperfect transition.
- `translateY` with **%** for content-relative motion; remember `scale()` scales children too.
- Stagger list entrances ~20–40ms/item, cap total ≤400ms, first screenful only.

## Perceived performance

Respond to input in <100ms even if work continues async (press states, optimistic UI). A fast-feeling app beats a "correct but sluggish" one.

## Reduced motion (mandatory)

Honor `prefers-reduced-motion`: replace movement/scale/parallax with quick opacity crossfades (≤200ms); keep progress indicators. Never remove essential feedback entirely.

## Anti-patterns

- `ease` / `ease-in` on enters; `linear` for UI; the same duration for tiny and large changes.
- Animating layout properties (janky) or from `scale(0)`.
- Non-interruptible modals/sheets that must finish before reversing.
- Motion on every scroll tick; elements flying in from all directions.
- Ignoring `prefers-reduced-motion`.
