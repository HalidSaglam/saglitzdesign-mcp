---
id: motion-microinteractions
title: "Motion & Micro-interactions"
category: ux
platform: both
tags: [motion, animation, easing, micro-interactions, transitions]
sources: ["https://m3.material.io/styles/motion/overview", "https://developer.apple.com/design/human-interface-guidelines/motion"]
updated: 2026-07-08
---

# Motion & Micro-interactions

Motion exists to explain (where did this come from?), confirm (did that work?), and delight (sparingly). If an animation does none of these, delete it.

## Duration & easing (memorize)

| Interaction | Duration | Easing |
|---|---|---|
| Micro feedback (press, toggle, hover) | 100–150ms | ease-out |
| Small component (dropdown, tooltip, chip) | 150–200ms | ease-out |
| Medium (modal, sheet, drawer enter) | 250–300ms | ease-out / emphasized decelerate |
| Exit animations | ~2/3 of enter (dismiss fast) | ease-in |
| Screen transitions | 300–350ms | standard curve |
| Large/expressive (hero, celebration) | 400–600ms | spring |

- **Enter: ease-out** (fast start, gentle landing). **Exit: ease-in.** **Move: ease-in-out.** Never `linear` for UI (only for spinners/progress).
- Springs (natural, interruptible) are the modern default on mobile — iOS springs, Material 3 Expressive physics. Gesture-driven motion must track the finger 1:1 and be interruptible mid-flight.
- Nothing UI-blocking longer than ~400ms; users forgive slow apps less than plain ones.

## What to animate

- **Only `transform` and `opacity`** (GPU-composited). Animating width/height/top/margin causes jank; if layout must move, use FLIP or `scale` illusions.
- Enter pattern: fade + 8–16px rise + optional 0.97→1 scale. Exit: fade + slight fall/scale.
- Stagger list entrances 20–40ms/item, cap total ≤400ms, first screenful only.
- Skeletons: shimmer 1–1.5s cycle; crossfade skeleton→content (~200ms).

## Micro-interactions worth building

1. Button press (scale 0.97 / ripple) — every tappable.
2. Toggle thumb slide + track color (~150ms).
3. Success moments: checkmark draw-in, brief confetti for milestone completions only.
4. Pull-to-refresh with progressive indicator.
5. Like/save: bounce + color pop (the Twitter-heart pattern).
6. Input focus: border color + subtle ring transition (~150ms).
7. Number changes: count-up/odometer for stats.
8. Toast: slide+fade in, auto-dismiss 4–6s with pause on hover.

Celebration budget: one big moment per flow (onboarding done, first success). Confetti everywhere = confetti nowhere.

## Page & scroll motion (web)

- Scroll-driven reveals: subtle (fade + ≤24px translate), once per element, never hide content from users who don't scroll perfectly.
- Parallax: ≤10–15% speed differential, hero only; disable for `prefers-reduced-motion`.
- Sticky/scroll-linked storytelling for marketing only; never scroll-jack (override native scroll speed/direction).
- View Transitions API for page-to-page continuity on web; shared-element transitions on mobile for list→detail (hero image morph).

## Reduced motion (mandatory)

`prefers-reduced-motion: reduce` → kill translation/scale/parallax/auto-play; keep opacity crossfades ≤200ms; keep progress indicators. iOS/Android expose the same setting — respect it natively.

## Anti-patterns

- Animation on every scroll tick; elements flying in from all four directions.
- >400ms blocking transitions between routine screens; easing `ease` everywhere by default.
- Looping attention-seeking animation near reading content (wiggling badges).
- Layout-shifting animation (bouncing accordions pushing content); spinners for <300ms operations (flash).
- Same celebration for trivial and major actions.
