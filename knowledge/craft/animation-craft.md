---
id: animation-craft
title: "Animation Craft — Motion That Separates Great Interfaces from Slop"
category: craft
platform: both
tags: [animation, motion, easing, springs, interruptibility, css, web]
sources:
  - "https://emilkowal.ski/ui/great-animations"
  - "https://emilkowal.ski/ui/7-practical-animation-tips"
  - "https://emilkowal.ski/ui/agents-with-taste"
  - "https://animations.dev/"
  - "https://motion.dev/docs/react-transitions"
  - "https://developer.apple.com/design/human-interface-guidelines/motion"
  - "https://web.dev/articles/animations-guide"
  - "https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style"
  - "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion"
updated: 2026-07-09
---

# Animation Craft — Motion That Separates Great Interfaces from Slop

This is the deep-craft companion to [[motion-microinteractions]]. That doc gives you the durations and easing table to memorize; this one gives you the judgment and the fine detail that separate motion that feels designed from motion that feels generated. Almost every "off" animation you have ever seen is one of a small number of mistakes: wrong easing, animating the wrong property, starting from zero, ignoring where the element came from, or blocking the user mid-flight. Fix those and interfaces feel calm, fast, and physical. Ignore them and they feel like slop.

Default posture: **when in doubt, animate less and animate faster.** A missing animation is neutral. A wrong or slow one is actively worse than none.

---

## 1. The animation decision framework

Before writing a single transition, answer four questions in order. If any answer is weak, do not animate.

1. **Should this animate at all?** Motion has to earn its place. Animate state changes, things entering or leaving, and spatial reorganization. Do **not** animate actions the user repeats dozens of times a day or triggers from the keyboard — a menu that springs open every keystroke becomes friction, not delight. Emil Kowalski's rule of thumb: the more often an interaction happens, the less (and faster) it should animate, until it should not animate at all.
2. **What is the purpose?** Every animation serves one of three jobs: **feedback** ("I heard you" — press states, toggles, validation), **continuity** ("this came from there" — shared-element transitions, expanding cards, a sheet sliding from the edge it will return to), or **delight** ("this product has a soul" — used sparingly, on moments that matter). If you cannot name which one, delete it.
3. **What easing?** Determined by direction of motion (see section 2). This is not a taste call; it is a rule.
4. **How fast?** Fast. Keep interface animation under ~300ms; most micro-interactions live at 100–200ms. A 180ms dropdown reads as responsive; the same dropdown at 400ms reads as sluggish even though both are "smooth." Perceived speed beats measured smoothness.

**Worked example — a dropdown menu.** (1) Should it animate? Yes: it appears and disappears, and a jump-cut is jarring. (2) Purpose? Continuity — it should look like it grows out of its trigger. (3) Easing? Enter `ease-out`, exit `ease-in` and faster. (4) How fast? ~180ms enter, ~120ms exit. Result: scale from 0.95 + fade, `transform-origin` at the trigger, GPU-only properties, interruptible. Every choice fell out of the framework — none was a guess. That is the difference between craft and decoration.

---

## 2. Easing rules (not optional, not taste)

Easing communicates physics. The human eye reads acceleration as intent, so the wrong curve reads as *broken* even when the user cannot say why. Bind easing to the **direction of motion**:

- **Enter → `ease-out`.** Fast start, gentle landing. The element arrives quickly (responsive) and settles softly (natural). This is the single most important rule: entrances should decelerate into place.
- **Exit → `ease-in`, and faster than the enter (~2/3 the duration).** Things leaving should accelerate away and get out of the way. A dismissal that lingers feels like the UI is arguing with you.
- **Move / reposition → `ease-in-out`.** An element traveling from one on-screen position to another accelerates out of rest and decelerates into rest, like any physical object that starts and stops.
- **Never `linear` for UI.** Linear motion has no acceleration, so it reads as mechanical and dead. Reserve it for genuinely continuous, non-physical motion: spinners, indeterminate progress, marquees.

**Why the wrong easing reads as broken:** `ease-in` on an *entrance* means the element crawls in slowly, then whips to a stop — the eye expects deceleration on arrival and gets acceleration, so the motion feels like it snapped or glitched at the end. Same magnitude, same duration, opposite feeling. The curve is the message.

Prefer a tuned custom cubic-bezier over the CSS keyword defaults (the built-in `ease-out` is weak). A punchier curve such as `cubic-bezier(0.16, 1, 0.3, 1)` gives entrances the responsive-then-soft feel most polished apps use. Keep one or two house curves as tokens rather than inventing a new bezier per component (see [[design-tokens-theming]]).

A correct enter/exit pair in CSS:

```css
/* enter: quick in, soft landing */
.panel { transition: opacity .2s cubic-bezier(.16,1,.3,1),
                     transform .2s cubic-bezier(.16,1,.3,1); }
/* exit: faster, accelerate away */
.panel[data-state="closed"] { transition-duration: .13s;
                              transition-timing-function: ease-in; }
```

Note the exit is ~2/3 the enter duration and flips to `ease-in`. Same element, two curves, because the direction of travel changed.

---

## 3. Springs — when physics beats fixed durations

Fixed-duration tweens describe *how long* something takes. Springs describe *how it moves* — a mass on a spring settling toward a target. Springs feel natural because that is literally how objects come to rest in the real world, and they are **interruptible by construction**: a spring is defined by its current position and velocity, so it can be redirected at any instant without a visible seam.

**Reach for a spring when:**
- The motion is **gesture-driven** — a sheet dragged by a finger, a card swiped away. The spring inherits the gesture's velocity so the release feels like a continuation of the throw, not a separate canned animation. This **velocity handoff** is the thing fixed durations physically cannot do.
- The element can be **interrupted or reversed** mid-flight (a toggle mashed rapidly, a menu opened and closed).
- You want a lively, physical, "expressive" character (iOS system motion and Material 3 Expressive are both spring-based).

**Reach for a fixed-duration tween when:** you need a precise, predictable end time (choreographed sequences, staggered lists where timing must line up), or a simple opacity crossfade where physics adds nothing.

**Configuring a spring** (Motion / Framer Motion terms):
- **Physics form:** `stiffness` (higher = snappier, more sudden), `damping` (the opposing force; lower = more oscillation/wobble, 0 = never settles), `mass` (higher = heavier, more sluggish).
- **Perceptual form:** `bounce` (0 = no overshoot, ~1 = very bouncy) plus `duration` or, better, `visualDuration` (when it *looks* settled). These are easier to reason about because you describe the feel, not the forces.
- The two forms are mutually exclusive — setting `stiffness`/`damping`/`mass` overrides `bounce`/`duration`.

Good defaults: UI springs want **low or no bounce** (0–0.2). Visible overshoot is delightful on a like button and wrong on a settings panel. Match bounce to how playful the moment should be.

Practical starting points (Motion perceptual form):

| Use | bounce | visualDuration | Feel |
|---|---|---|---|
| Dropdown / popover / menu | 0 – 0.1 | ~0.2s | Snappy, no wobble |
| Sheet / drawer / modal | 0.1 – 0.2 | ~0.35s | Physical, settles softly |
| Toggle / like / reaction | 0.3 – 0.5 | ~0.3s | Playful, a little overshoot |
| Gesture release (drag-to-dismiss) | 0.1 – 0.2 | inherit velocity | Continues the throw |

Tune by feel, not by spec sheet: change one value, watch it, adjust. Springs reward iteration precisely because there is no single "correct" number — there is only the number that feels right in context.

---

## 4. Interruptibility & perceived performance

An animation the user cannot redirect is a small hostage situation. The whole point of motion is to make software feel *responsive*, and nothing is less responsive than an interface that says "wait, I'm animating."

- **Immediate feedback (<100ms).** The response to any input must begin essentially now. Press states, hover changes, and the first frame of a transition should feel instant; save the longer motion for the payload, not the acknowledgement.
- **Animations must be redirectable.** If a user opens a menu and immediately closes it, the close must interrupt the open from wherever it currently is — not wait for the open to finish, and not snap. Springs do this natively; CSS transitions do it well; keyframe (`@keyframes`) animations do it badly because they run start-to-finish on a fixed timeline.
- **Prefer CSS transitions over keyframes for interruptible UI.** A `transition` animates *from the current computed value*, so a change of target mid-flight is handled gracefully. Keyframes restart from frame zero and jump. Use keyframes only for looping, non-interactive motion (spinners, ambient effects).
- **Optimistic UI.** For actions that will almost certainly succeed (liking, sending, toggling), animate to the success state immediately and reconcile with the server in the background. The animation sells the speed; the network catches up quietly.
- **Continuity through shared elements.** When one view becomes another — a grid thumbnail expanding to a detail view, a card becoming a full screen — animate the *same* element between positions rather than cross-dissolving two separate things. The eye tracks the object and understands the spatial relationship ("this is that, bigger"). This is Apple's core motion idea: motion should reinforce where things live and where they come from, so a sheet slides from the edge it will dismiss to, and a pushed screen enters from the trailing edge it came from. Direction carries meaning; do not animate an entrance from a direction the element will not exit toward.

---

## 5. Component craft rules (the little things agents get wrong)

These are the details that most often mark generated UI as slop. Treat them as hard rules.

- **Never animate from `scale(0)`.** Start entrances around `scale(0.9)`–`scale(0.95)`. Real objects have volume even at rest; a deflated balloon still has a shape. Growing from literal nothing looks like a bug. The same applies to opacity paired with scale — fade in over a small scale, not from a point.
- **Make popovers, tooltips, dropdowns, and menus origin-aware.** Set `transform-origin` to the trigger so the surface appears to *grow out of* the thing that spawned it, not out of its own geometric center. Radix and similar libraries expose this as a CSS variable (e.g. `--radix-dropdown-menu-content-transform-origin`) — bind `transform-origin` to it. A menu that scales from the wrong corner is the single most common "uncanny" popover tell.
- **Skip the delay on subsequent tooltips.** The first tooltip in a group should wait (so hovering across a toolbar isn't a strobe of tooltips); once one has shown, the next should appear instantly. Detect the "already in tooltip mode" state (e.g. a `data-instant` attribute) and set `transition-duration: 0ms` for follow-ups.
- **Use blur to mask imperfect transitions.** When two states don't morph cleanly, a brief `filter: blur(2px)` during the transition hides the seam and reads as motion blur — a cheap, convincing way to bridge visual gaps. Remove it at rest.
- **Animate entrances with `@starting-style`.** Modern CSS can transition an element as it appears — even from `display: none` — by declaring its pre-render values in `@starting-style`, transitioning `opacity`/`transform`, and adding `transition-behavior: allow-discrete` so `display` itself can participate. This gives you enter animations without JS mount hooks. Remember the element returns to its *default* state on exit, not the starting state.
- **Only animate `transform` and `opacity`.** These are GPU-composited and stay at 60fps even under main-thread load. Animating `width`, `height`, `top`, `left`, `margin`, or anything that triggers layout forces reflow every frame and jank. Need a size change? Animate `transform: scale()` or `translate`. Add `will-change: transform` (sparingly) on elements about to animate to avoid first-frame jitter — but do not leave it on everything.
- **`translateY` with `%` for content-relative motion.** A sheet that should slide fully off its own height uses `translateY(100%)`, not a hardcoded pixel value — it adapts to the element's size. Percentages on `translate` are relative to the element itself.
- **Remember `scale()` scales children too.** Scaling a container scales its text and padding with it, which can look like a zoom rather than a reveal. When you want the box to grow but the contents to stay crisp, animate size a different way (e.g. clip/height with `@starting-style`, or counter-scale the child).
- **Use 3D transforms for depth.** `perspective` + `rotateX/rotateY` and translation on the Z axis give real depth (cards flipping, layered stacks) that a flat `scale` cannot. Use deliberately; depth is a strong signal.
- **Scale the press target for feedback.** A `scale(0.97)` on `:active` gives instant, physical "I felt that" feedback on buttons and cards — cheap and universally understood. Keep it small; a big squash reads as a toy.
- **Never let an entrance block interaction.** Content should be usable the instant it is meaningfully visible. Do not gate clicks behind the end of a 300ms enter, and do not stagger a long list so far that the last item arrives seconds later — cap total stagger (e.g. 30ms × items, ceiling ~300ms) or the pattern turns into a wait.

---

## 6. Animation vocabulary — say exactly what you want

Vague requests ("make it smoother," "add a nice animation") produce slop because the tool guesses. Precise vocabulary produces the result you pictured. Use these terms when directing an AI assistant or design tool:

- **Direction & lifecycle:** *enter / exit / mount / unmount / reposition.* ("Animate the **enter** with ease-out over 200ms; **exit** faster with ease-in.")
- **Easing:** the curve keyword or bezier — *ease-out, ease-in, ease-in-out, linear,* or a named token / `cubic-bezier(...)`. Name the curve, don't say "smooth."
- **Spring terms:** *stiffness, damping, mass,* or *bounce / visualDuration,* plus *velocity handoff* for gesture continuation. ("Low-bounce spring, ~0.15, visualDuration 250ms.")
- **Origin:** *transform-origin at the trigger / origin-aware / grows from the top-left.* This alone fixes most popover motion.
- **Orchestration:** *stagger* (offset each item in a list by N ms), *sequence / choreography* (ordered steps), *delay,* *parallel vs. sequential.* ("Stagger the list children 30ms, ease-out.")
- **Property:** *transform only, opacity crossfade, translateY 100%, scale from 0.95* — naming the property prevents layout-animating slop.
- **Feel:** *snappy, subtle, playful, restrained, physical, instant.* Pair a feel word with concrete numbers so it is not left to interpretation.
- **Performance guardrails:** *transform/opacity only, GPU-composited, 60fps, interruptible, honors reduced motion.* State these as constraints and the tool cannot hand you layout-thrashing slop.

A good instruction looks like: *"Dropdown enter: scale from 0.95 + fade in, transform-origin at the trigger, ease-out 180ms; exit: fade out 120ms ease-in. No bounce."* That leaves nothing to guess.

---

## 7. Reduced motion — honor the preference

A meaningful share of users get motion sickness, vestibular symptoms, or distraction from movement. Respect `prefers-reduced-motion: reduce`. **Reduced motion does not mean no motion** — it means no *movement*. Replace slides, zooms, and parallax with **crossfades** (opacity) and near-instant state changes. Keep essential feedback (a fade to confirm success) but drop travel, spring bounce, and large transforms.

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  /* then re-enable gentle opacity crossfades where they carry meaning */
}
```

The blanket reset above is a floor, not the finished job — go back and restore the crossfades that still communicate. Motion libraries expose a `useReducedMotion()` hook so you can swap a slide for a fade in JS as well as CSS.

Test it: toggle the OS "Reduce Motion" setting (macOS: Accessibility → Display; iOS: Accessibility → Motion) and walk the core flows. Parallax, auto-playing carousels, and large zoom transitions are the usual offenders. Accessibility here is not a nice-to-have — for some users, unmanaged motion causes real nausea.

---

## Quick self-check before shipping an animation

- Does it serve feedback, continuity, or delight? If not → cut it.
- Enter = ease-out? Exit = ease-in and faster? Move = ease-in-out? No linear?
- Under ~300ms (most under 200ms)?
- Only `transform` / `opacity` animated? 60fps under load?
- Can the user interrupt or reverse it mid-flight?
- Does it start from ~0.95, not 0, and grow from the trigger origin?
- Does it degrade to a crossfade under `prefers-reduced-motion`?
- If it repeats dozens of times a day, is it fast enough to never annoy — or cut entirely?
- Does spring bounce match the moment (playful vs. restrained), and is it 0 where wobble would look cheap?

If every answer is yes, the motion will read as designed, not generated. The bar for shipping an animation is not "does it look cool once" — it is "will it still feel right the thousandth time."

---

**Related:** [[motion-microinteractions]] (durations/easing table, the basics) · [[wwdc-design-principles]] (Apple's motion philosophy and depth) · [[clean-app-design]] (restraint and when *not* to animate) · [[design-tokens-theming]] (easing curves and durations as tokens) · [[design-engineering]] (implementing motion in production code)
