---
id: wwdc-design-principles
title: "WWDC Design Principles (Fluid Interfaces, Liquid Glass, Typography, Haptics)"
category: design-language
platform: both
tags: [apple, wwdc, fluid-interfaces, motion, principles, materials, haptics]
sources: ["https://developer.apple.com/videos/play/wwdc2018/803/", "https://developer.apple.com/videos/play/wwdc2020/10175/", "https://developer.apple.com/videos/play/wwdc2025/219/", "https://developer.apple.com/videos/play/wwdc2025/356/", "https://developer.apple.com/videos/play/wwdc2025/359/", "https://developer.apple.com/videos/play/wwdc2026/250/", "https://developer.apple.com/videos/play/wwdc2019/520/", "https://developer.apple.com/videos/play/wwdc2019/223/", "https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator"]
updated: 2026-07-09
---

# WWDC Design Principles

Apple's WWDC design talks are the most rigorous public treatment of interaction craft that exists. This doc distills the principles into concrete rules you can apply on **Apple platforms** (iOS, iPadOS, macOS) and, wherever the physics or the reasoning transfers, on the **web**. Serve these as design law: when a motion, layout, or feedback decision is ambiguous, resolve it against the rule here.

The five sources that matter: *Designing Fluid Interfaces* (WWDC 2018, session 803) for how interactive motion should behave; *Principles of Great Design* (WWDC 2026, session 250) and the *new design system* talks (WWDC 2025, sessions 356/359/219) for the vocabulary to reason with; *The Details of UI Typography* (WWDC 2020, session 10175) for type; and the *Core Haptics* sessions (WWDC 2019, sessions 520/223) plus UIKit's feedback generators for multimodal feedback.

---

## 1. Designing Fluid Interfaces (WWDC 2018) — the core

A fluid interface feels like an extension of the user's mind: thought and gesture happen in parallel, with no perceptible seam between intent and result. The brain is exquisitely sensitive to latency and to anything that stops tracking the hand. These principles are how you earn that feeling.

### Response and kill latency
The brain notices delay everywhere — on tap, on press, on the first frame of a drag. Any lag adds mental burden and breaks the sense of connection. **Rule:** hunt down and eliminate delay at every touch point. Nothing should wait on a network call, a layout pass, or an animation's "start" before acknowledging the touch. The interface responds on the very first frame, always.
- **Web:** respond to `pointerdown`, not `click`. Never gate the first visual acknowledgement behind a fetch — show the pressed/active state immediately, then reconcile with data. Budget interaction latency (INP) under ~200ms; treat anything the user can *feel* as a bug.

### Direct manipulation — 1:1 finger tracking
While dragging, the content stays glued to the finger at the exact point it was grabbed. The moment content and touch stop moving together, we notice instantly and the illusion dies. **Rule:** track the grab point, not the object's center — an object picked up by its corner keeps that corner under the finger. Preserve the offset for the whole gesture.
- **Web:** on drag, translate by `pointer.delta`, not to the pointer's absolute position. Avoid `transition` on the property you're dragging — it introduces lag against the finger. Drive the drag frame-perfectly, apply easing only on release.

### Interruptibility — the single most important principle
**Animations must be redirectable mid-flight and must never block input.** Human bodies constantly change direction; a fluid interface honors that by letting the user grab, reverse, or divert any animation while it is playing. An app can be mid-launch and get pulled back into multitasking; a swipe home can peek, hesitate, and return. If an animation locks out touch until it finishes, it is broken — no matter how pretty it is.
- **Rule:** every transition is a suspended, seizable state, not a fire-and-forget clip. The current position and velocity of an in-flight animation are always readable and always adoptable by a new gesture.
- **Web:** never use non-interruptible CSS keyframe animations for anything the user might want to reverse. Use the Web Animations API (`animation.currentTime`, `.playbackRate`, `.cancel()`) or a spring library (Framer Motion, React Spring) that hands off from the running animation's live value and velocity. A sheet the user is dismissing must be re-grabbable halfway down.

### Behavior over animation — springs, not fixed-duration curves
Design the *behavior* of motion, not a timeline. Fixed-duration bezier curves have a hard start and end and cannot absorb an interruption gracefully. Springs are continuous, always ready to move, and settle naturally. Apple exposes two designer-friendly spring parameters: **damping** (0–100%, controls overshoot — 100% = no bounce, lower = more oscillation) and **response** (how quickly the value reaches target). Avoid thinking in "durations" at all — it reinforces artificial endpoints.
- **Rule:** utility transitions that shouldn't wobble use high damping (near 100%); gesture-driven, playful motion uses lower damping so it has character. Motion that will be interrupted *must* be a spring so it can redirect from any state.
- **Web:** prefer spring-based motion for interactive elements. In CSS, `linear()` easing can approximate a spring, but true interruptible springs come from JS animation libs. Reserve fixed cubic-beziers for non-interruptible, decorative one-shots (a badge pop, a checkmark draw).

### Velocity handoff
When the finger lifts, the gesture's velocity flows *into* the release animation — the object keeps the speed and direction the hand gave it. A flick and a slow drag to the same endpoint should feel different because they carry different momentum. **Rule:** capture the gesture's velocity history and seed the spring's initial velocity with it; don't reset to zero on release.
- **Web:** read pointer velocity from the last few move events (or `movementX/Y`) and pass it as `initialVelocity` to your spring. A dismissed sheet flicked hard should fly out; nudged gently, it should ease.

### Momentum projection
Animate to where the gesture is *going*, not where the finger happened to lift. Project the resting point from current position and velocity, then animate there. Apple's projection formula: `projected = current + (velocity² / (2 × decelerationRate))` — the same deceleration model as scrolling. FaceTime's picture-in-picture uses this: a light flick projects the window's momentum to a corner and snaps there, which makes a tiny gesture feel powerful.
- **Rule:** for snap-to-target interactions (corners, pages, detents), compute the target from projected momentum, then spring to it. This is what makes flick gestures feel amplified and satisfying.
- **Web:** for carousels, bottom sheets with detents, or snap scrolling, project the fling and pick the target detent from the projected position — don't snap to the nearest one at lift-off.

### Spatial consistency
Objects enter and exit along symmetric, memorable paths so the user builds a spatial model of the app. If a view slides in from the right, the back gesture sends it out to the right — never in from the right and out the bottom. Origins are anchored: things grow out of the control that spawned them and collapse back into it.
- **Rule:** every push has a symmetric pop; every present has a symmetric dismiss. Menus, popovers, and sheets morph out of and back into their trigger.
- **Web:** mirror enter/exit transforms. A modal that scales up from a button's rect should scale back down into it. Keep transform-origin anchored to the source element.

### Hint in the gesture's direction
Motion should grow toward its final state and toward the finger, so the result feels predicted rather than surprising. A Control Center module expands up and out toward the touch before it fully opens. The interface leans in the direction the user is already heading.
- **Rule:** during a gesture, preview the destination by moving partway toward it in the gesture's direction; don't wait for release to reveal intent.

### Rubber-banding — soft boundaries
At the edge of scrollable or draggable content, resist elastically instead of hitting a hard wall. Rubber-banding always signals "I understood you" and keeps the interface feeling alive; a dead stop is indistinguishable from a frozen app. **Rule:** past a boundary, apply diminishing (roughly logarithmic) resistance and spring back on release.
- **Web:** implement resistance on overscroll for custom scroll/drag surfaces (`overscroll-behavior` for native scroll; manual damping like `offset * 0.3` beyond the edge for custom drags). Never let a draggable element hit an abrupt, unacknowledged stop.

### Spring tuning starting points
Apple hides mass/stiffness behind two dials — damping (overshoot) and response (speed to target). Use these as defaults, then tune by feel:

| Interaction | Damping | Response | Feel |
|---|---|---|---|
| Utility transition (nav push, tab switch) | ~100% (no bounce) | fast (~0.3s) | crisp, businesslike |
| Sheet / drawer present | ~85% | medium (~0.4s) | slight settle, alive |
| Gesture-driven flick to target | ~75–80% | derived from velocity | playful, momentum-led |
| Playful pop (badge, reaction) | ~60–70% | quick | bouncy, characterful |

SwiftUI: `.spring(response:dampingFraction:)` or the semantic `.bouncy` / `.smooth` / `.snappy` presets. Web: Framer Motion `type: "spring"` with `stiffness`/`damping`, or React Spring `config`. Never express interruptible motion as a fixed `duration`.

> Cross-reference [[motion-microinteractions]] and [[animation-craft]] for fuller spring tuning tables and implementation patterns; those docs turn these principles into numbers.

---

## 2. Principles of Great Design (WWDC 2026) + the new design system (WWDC 2025)

Apple's annual design talks give you a *vocabulary* to reason with — not a formula. Principles sometimes pull against each other, and resolving that tension with judgment is the job. Use these words when critiquing or defending a design.

**The eight principles (WWDC 2026, session 250):**
1. **Purpose** — Build with intention. Deciding what *not* to build matters as much as what you ship. Every feature spends the user's time, attention, and trust.
2. **Agency** — Keep people in control: offer choices, allow exploration at their own pace, and provide forgiveness (easy undo, confirmation on destructive actions).
3. **Responsibility** — Act in the user's interest. Respect privacy, ask only for what you need when you need it, anticipate harm (especially in AI features), protect safety with previews and confirmations.
4. **Familiarity** — Build on what people already know: honest metaphors, established conventions, and consistency (things that look the same behave the same).
5. **Flexibility** — People use things in unique ways and contexts. Support diverse abilities, personalization, and each platform's strengths.
6. **Simplicity** — Strip the unnecessary so the core purpose shines. Concise language, clear hierarchy, every element earning its place. Occasionally simplicity means *adding* context for a confident decision.
7. **Craft** — Meticulous detail builds trust: beautiful typography, responsive animation, solid performance. People can tell when you care.
8. **Delight** — The natural result of getting the rest right. Name the emotion you want the user to feel and reinforce it throughout; delight is not confetti, it is considered care.

**The material-era heuristics (WWDC 2025, sessions 356/219/359)** — the older triad still governs layout and remains the fastest lens for structural critique:
- **Hierarchy** — Controls live on a functional layer above content; the eye is guided by size, weight, spacing, and depth. See [[apple-hig-liquid-glass]].
- **Harmony** — Software geometry echoes hardware: concentric corner radii, capsule controls, materials that match the device.
- **Consistency** — Adopt platform conventions; adapt continuously across sizes rather than redesigning per breakpoint.
- **Deference / content-first** — The interface steps back so content is the hero. Chrome shrinks, hides, or simplifies as the user engages with content.
- **Depth** — Translucency and layering communicate what is in front of what, and where you are in a navigational stack.

**Rule:** when you can't say *which* of these a design element serves, that element probably shouldn't exist. Every control should answer to at least one principle.
- **Web:** these map cleanly. Deference = restrained chrome and generous whitespace; hierarchy = a real type scale and deliberate contrast; consistency = a design-token system, not one-off values (see [[ios-app-design]] for structural parallels).

---

## 3. The Details of UI Typography (WWDC 2020)

Great UI type is not one font scaled up and down — the letterforms themselves change shape with size. San Francisco ships as a **variable font** with an optical-size axis.

- **Optical sizing.** SF interpolates continuously between its Text and Display designs across roughly 17–28pt (no hard jump at 20pt anymore). Small sizes get sturdier strokes and more open spacing for legibility; large sizes get tighter, more refined forms. On Apple platforms this is automatic — do not fight it. **Web:** use `font-optical-sizing: auto` with a variable font, or manually set `font-variation-settings: 'opsz' <size>` to match the rendered point size; never freeze one optical master across all sizes.
- **Tracking changes with size.** Letter spacing is not a constant — small text needs looser tracking, large text tighter. Apple publishes per-size tracking tables for SF. Use the tracking API (which correctly disables conflicting features like ligatures), not manual kerning. **Web:** apply size-specific `letter-spacing` — slightly positive for small/caption text, slightly negative for large headings. A single `letter-spacing` value across the scale is a tell of amateur type.
- **Leading (line height).** Respect system defaults; adjust only for exceptional cases — increase for scripts with tall ascenders/descenders, tighten on space-constrained surfaces like watchOS. **Web:** unitless `line-height` (~1.4–1.6 for body, tighter ~1.05–1.2 for display). Line height should loosen as measure widens and tighten as type grows.
- **Text styles + Dynamic Type.** Always compose hierarchy from named text styles (LargeTitle, Title, Headline, Body, Caption…), never hardcoded point sizes, so text scales with the user's accessibility setting. Emphasize with weight/color, not size or caps. **Web:** use a fixed modular type scale in `rem`, respect the user's root font size, and never disable zoom.

See [[typography-craft]] for the full cross-platform scale and pairing guidance.

---

## 4. Materials & Depth (Liquid Glass talks)

Translucency is a **hierarchy tool**, not decoration. A translucent material samples what's behind it, which tells the eye "this floats above content" and communicates layering and location in a stack. Liquid Glass (WWDC 2025) applies this to the entire control layer.

- **When to use it:** on the navigation and control layer that floats above content — bars, toolbars, tab bars, floating action controls, sheets, popovers. The material lifts chrome off the content plane.
- **When NOT to use it:** never on content itself — no glass lists, cards, table cells, or media containers. Content stays on opaque or standard surfaces. Don't stack glass on glass (it can't sample other glass and it muddles hierarchy). Reserve the more transparent `.clear` variant for bold controls over media with a dimming layer.
- **Rule:** if translucency isn't earning a hierarchy or layering distinction, make the surface opaque. Depth must mean something.
- **Web:** `backdrop-filter: blur()` can echo the aesthetic for headers and modals, but it is GPU-expensive and degrades on low-end devices — treat it as inspiration, not spec, and always provide an opaque fallback. Full material rules live in [[apple-hig-liquid-glass]] and [[web-trends-2026]].

---

## 5. Multimodal feedback — motion + sound + haptics

The most satisfying interactions fire **motion, sound, and haptics together, time-aligned to the same physical event** (WWDC 2019 Core Haptics, sessions 520/223). A switch that clicks visually, audibly, and in the hand at the same instant feels real. Misaligned channels feel cheap.

**The iOS haptics vocabulary** (use these deliberately, sparingly — overuse deadens them):
- **Impact** (`UIImpactFeedbackGenerator`) — physical collision/contact. Styles: **light**, **medium**, **heavy** for weight; **soft** (rounded, cushioned) and **rigid** (sharp, hard). Use when something snaps into place, hits a boundary, or two things make contact. Match the style to the visual weight of the event.
- **Selection** (`UISelectionFeedbackGenerator`) — a subtle "tick" as a value changes. Use for pickers, sliders crossing steps, segmented controls — one tick per discrete change.
- **Notification** (`UINotificationFeedbackGenerator`) — outcome of an operation. Types: **success**, **warning**, **error**. Use to confirm the *result* of an action (payment done, validation failed), not routine navigation.
- **Custom** (`Core Haptics` / `CHHapticEngine` + AHAP files) — when you need bespoke patterns, precise timing, or haptics synchronized with audio. Reach for this only when the standard generators can't express the event.

**Pick the right haptic:**

| Event | Generator / type | Example |
|---|---|---|
| Element snaps into a slot / hits an edge | Impact — soft/medium/heavy by weight | Card locks to grid; drag hits boundary |
| Discrete value crosses a step | Selection — one tick per step | Picker wheel; slider passing a notch |
| Operation succeeds | Notification — success | Payment confirmed; item saved |
| Operation blocked / invalid | Notification — warning / error | Form validation fails; wrong passcode |
| Custom textured or audio-synced feel | Core Haptics (CHHapticEngine / AHAP) | Game recoil; a metered "pour" |

**Rules:** prepare a generator before the moment it fires (lower latency); tie the haptic to the exact frame the visual event lands; don't narrate every tap — reserve haptics for moments of consequence or physical metaphor. **Web:** the Vibration API (`navigator.vibrate`) is crude, unsupported on iOS Safari, and not a substitute — lean on motion and sound instead, and keep both optional/respectful. See [[motion-microinteractions]] for pairing feedback to interaction states.

---

## 6. Reduced motion & accessibility — how fluid motion degrades

Fluid motion is a default, not a mandate. It must degrade gracefully when the user asks for less.

- **Respect the setting.** On Apple platforms, read `accessibilityReduceMotion` (SwiftUI `@Environment(\.accessibilityReduceMotion)`). On the web, honor `@media (prefers-reduced-motion: reduce)`.
- **What to cut:** large positional slides, scale/zoom transitions, parallax, spring bounce/overshoot, and continuous or looping motion — these can trigger vestibular discomfort. Replace with a quick cross-fade or an instant state change.
- **What to keep:** the *functional* result and, critically, **interruptibility and direct manipulation** — a drag still tracks the finger, a sheet still dismisses. Reduced motion means calmer transitions, not a frozen or less-controllable interface.
- **Rule:** design the reduced-motion path deliberately, as a first-class variant — never let it fall back to something broken or jarring. Also honor Reduce Transparency (swap materials for opaque fills) and Increase Contrast; the system does much of this automatically for standard components, so prefer system components.
- **Legibility over effect:** always test motion and materials against the busiest content and in both light and dark. If an effect ever costs legibility or control, the effect loses. See [[accessibility]] for the full checklist.

---

## Quick decision rules

- First frame acknowledges every touch. No delay, ever.
- Content stays glued to the finger during a drag; ease only on release.
- If an animation can't be grabbed and reversed mid-flight, redesign it as a spring.
- Seed release animations with the gesture's velocity; project momentum to the target.
- Enter and exit along symmetric, anchored paths.
- Every element answers to at least one design principle, or it's cut.
- Type changes shape with size — optical sizing, size-specific tracking, system text styles.
- Translucency must signal hierarchy; otherwise go opaque.
- Fire motion, sound, and haptics on the same frame; use haptics sparingly.
- Ship a deliberate reduced-motion path that keeps control and cuts vestibular motion.

## Related

[[apple-hig-liquid-glass]] · [[ios-app-design]] · [[motion-microinteractions]] · [[animation-craft]] · [[typography-craft]] · [[accessibility]] · [[web-trends-2026]]
