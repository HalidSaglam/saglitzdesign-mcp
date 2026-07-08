---
id: buttons
title: "Buttons — Complete Design Guide"
category: component
platform: both
tags: [buttons, cta, interaction, touch-targets, states]
sources: ["https://m3.material.io/components/buttons", "https://developer.apple.com/design/human-interface-guidelines/buttons", "https://www.nngroup.com/articles/button-states-communicate-interaction/"]
updated: 2026-07-08
---

# Buttons — Complete Design Guide

Buttons are the single highest-leverage component in any interface. Get hierarchy, sizing, states, and labels right and most flows fix themselves.

## Button hierarchy (use exactly one primary per view)

| Level | Use | Visual treatment |
|---|---|---|
| Primary (filled) | The one main action of the screen | Solid brand/accent fill, highest contrast |
| Secondary (tonal/outlined) | Alternative or supporting action | Tonal fill or 1–1.5px outline, no fill |
| Tertiary (text/ghost) | Low-emphasis actions, cancel, links | Text only, accent color |
| Destructive | Delete/remove/irreversible | Red/danger color; confirm irreversible actions |

Rules:
- **One primary button per screen/section.** Two side-by-side filled buttons destroy hierarchy.
- Never style "Cancel" as prominently as the confirm action; make it text/ghost.
- In dialogs: primary action on the right (iOS/web convention), destructive action colored red even when primary.
- Don't use disabled primary buttons as form gatekeepers when avoidable — prefer enabled button + inline validation on submit. If you must disable, explain why nearby.

## Sizing & touch targets

- **Minimum touch target: 44×44pt (iOS), 48×48dp (Android/Material), 24×24px CSS minimum (WCAG 2.2 AA), 44px recommended for web.**
- Comfortable mobile button height: 48–56px full-width primary CTA; desktop web: 40–48px.
- Horizontal padding: ≥16–24px; text never touches edges.
- Full-width primary buttons on mobile below ~480px viewport; intrinsic-width buttons on desktop.
- Spacing between adjacent tappable buttons: ≥8px (Material recommends 8dp; more if targets are small).
- Bottom-fixed mobile CTAs: respect safe-area insets (`env(safe-area-inset-bottom)`), add a subtle top gradient/border to separate from scrolling content.

## Shape & radius

- Radius communicates brand: 4–8px = neutral/enterprise, 10–16px = friendly product default, fully rounded (pill) = consumer/mobile-first (current dominant trend in iOS apps and modern SaaS).
- Be consistent: one radius scale across all buttons; pill buttons pair with pill inputs.
- Material 3 default: fully rounded (pill); Material 3 Expressive allows shape-morph on press (round → slightly squarer).
- iOS/Liquid Glass: capsule buttons, translucent materials for controls overlaying content.

## States (all are mandatory)

1. **Default** — resting.
2. **Hover** (web/desktop) — darken/lighten fill ~4–8%, or elevate slightly. Cursor: pointer.
3. **Focus-visible** — 2px outline offset 2px, high-contrast ring. Never remove focus outlines; style them.
4. **Active/pressed** — darken ~10–12% and/or scale to 0.97–0.98 (100–150ms). Mobile: pressed state must be visible under the finger (ripple on Android, opacity/scale on iOS).
5. **Disabled** — reduced opacity (~38–50%) or gray fill; keep text readable (don't drop below 3:1 if the label must be read). `cursor: not-allowed` is optional; never keep hover effects.
6. **Loading** — replace label with spinner OR keep label + inline spinner; **keep button width fixed** (reserve space) to avoid layout shift; disable further clicks; announce via `aria-busy`.

## Labels & microcopy

- **Verb-first, specific:** "Create account", "Save changes", "Start free trial" — never "Submit", "OK", "Yes/No" alone.
- Match the label to the outcome: button says what happens next.
- 1–3 words ideal; sentence case (Material, most modern products) — avoid ALL CAPS (worse readability; dated).
- Destructive confirms: repeat the object — "Delete 3 files", not "Confirm".
- Icons: leading icon only when it adds meaning (e.g., ⬇ Download). Icon-only buttons require `aria-label` and a tooltip on web.

## Color & contrast

- Label-to-fill contrast: **≥4.5:1** (WCAG AA normal text; ≥3:1 for ≥18.66px bold/24px).
- Button fill vs background: ≥3:1 for the button to read as a control (WCAG non-text contrast).
- Don't rely on color alone for destructive vs primary — differentiate with label + placement.
- Dark mode: desaturate/darken brand fills slightly; avoid pure-saturated fills that vibrate on dark backgrounds.

## Placement conventions

- Mobile: primary CTA bottom of screen (thumb zone); avoid top corners for frequent actions.
- Forms (web): primary aligned with the form fields' left edge (single-column forms) or right-aligned in modals/wizards; "Back" left, "Next/Submit" right.
- Sticky CTAs: use when the form/page is long; ensure they never cover inputs being edited (keyboard-aware on mobile).

## Motion

- Press feedback: 100ms in, 150–200ms out; ease-out on release.
- Never animate layout-affecting properties on press (use transform/opacity).
- Respect `prefers-reduced-motion`: replace scale/ripple with opacity change.

## Anti-patterns (reject in reviews)

- Two or more filled primary buttons competing on one view.
- "Click here" / "Submit" / "OK" labels.
- Ghost buttons as the sole CTA on imagery (low contrast, low affordance).
- Buttons that look like links and links that look like buttons used interchangeably — navigation = link (`<a>`), action = button (`<button>`).
- Tiny (<40px) touch targets packed together in mobile toolbars.
- Loading state that swaps to a different-width element (layout jump).
- Disabled button with no explanation of what's missing.
