---
id: accessibility
title: "Accessibility (WCAG 2.2) — Practical Guide"
category: ux
platform: both
tags: [a11y, wcag, contrast, keyboard, screen-readers, aria]
sources: ["https://www.w3.org/WAI/WCAG22/quickref/", "https://webaim.org/resources/contrastchecker/"]
updated: 2026-07-08
---

# Accessibility — Practical Guide (WCAG 2.2 AA baseline)

Accessibility is a design constraint, not a QA pass. Target WCAG 2.2 AA.

## Contrast (memorize these)

- Normal text: **≥4.5:1** against background.
- Large text (≥24px, or ≥18.66px bold): **≥3:1**.
- Non-text UI (borders of inputs, icons, focus rings, button fills vs page): **≥3:1**.
- Placeholder text, disabled elements: exempt, but keep placeholders ~4.5:1 anyway if they carry format info.
- Don't put text on busy imagery without a scrim/overlay (40–60% black or gradient).

## Color independence

Never encode meaning in color alone: pair with icon, label, or pattern (error = red + icon + message; chart series = color + shape/label; links in body text = underline, not just color).

## Keyboard (web) — hard requirements

- Everything operable by keyboard; logical tab order following visual order.
- `:focus-visible` ring on every interactive element: ≥2px, ≥3:1 contrast, offset from element.
- Skip-to-content link first in tab order. Escape closes overlays. Arrow keys within composite widgets (menus, tabs, radio groups).
- No keyboard traps; focus never lands on invisible elements.
- WCAG 2.2 additions: focus not fully obscured by sticky headers/footers; dragging operations need a click alternative.

## Touch & pointer

- Targets ≥24×24 CSS px absolute minimum (WCAG 2.2), 44–48px recommended.
- Gesture-only functions (swipe, pinch, long-press) need visible single-tap alternatives.

## Semantics & ARIA

- Native elements first: `<button>`, `<a>`, `<nav>`, `<main>`, `<label>` — ARIA is a repair tool, not a replacement ("No ARIA is better than bad ARIA").
- One `<h1>` per page; heading levels never skip; headings describe structure, not styling.
- Images: meaningful → descriptive `alt`; decorative → `alt=""`.
- Icon-only buttons: `aria-label`. Live updates (toasts, validation, cart count): `aria-live="polite"`.
- Forms: programmatic label association; errors referenced via `aria-describedby`; `aria-invalid` on failed fields.

## Motion & media

- Respect `prefers-reduced-motion`: disable parallax, large movement, auto-playing animation; keep opacity/color transitions.
- No flashing >3 times/second. Auto-playing carousels/video need pause controls (or better: don't autoplay).
- Video: captions; audio: transcripts.

## Text & zoom

- Base body ≥16px; support 200% zoom / iOS-Android Dynamic Type without loss of content or horizontal scroll.
- Use relative units (rem) for font sizes on web; test at 320px-wide viewport equivalent.
- Line length 45–75 characters; line-height ≥1.5 body text.

## Quick audit checklist

1. Tab through the page — reachable, visible focus, sane order?
2. Grayscale screenshot — does meaning survive?
3. Contrast-check text, buttons, inputs, focus rings.
4. Screen reader pass (VoiceOver/NVDA) on the core flow.
5. 200% zoom + 320px viewport — usable, no horizontal scroll?
6. Forms: labels, error announcement, keyboard submit.
7. `prefers-reduced-motion` honored?
