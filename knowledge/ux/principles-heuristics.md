---
id: principles-heuristics
title: "UX Principles & Heuristics"
category: ux
platform: both
tags: [heuristics, usability, cognition, fitts-law, hicks-law]
sources: ["https://www.nngroup.com/articles/ten-usability-heuristics/", "https://lawsofux.com/"]
updated: 2026-07-08
---

# UX Principles & Heuristics

The evaluation backbone. Every design review should walk these.

## Nielsen's 10 heuristics (operationalized)

1. **Visibility of system status** — every action gets feedback within 100ms; loading >1s shows progress; background work shows state (saving…/saved).
2. **Match to the real world** — user vocabulary, not system vocabulary; natural ordering; familiar metaphors.
3. **User control & freedom** — undo > confirm; back always works; easy exit from every flow; cancel long operations.
4. **Consistency & standards** — internal consistency (one pattern per job) and platform conventions (don't reinvent share/back/tabs).
5. **Error prevention** — constraints over corrections: good defaults, disabled-invalid combinations explained, confirm irreversible, autosave.
6. **Recognition over recall** — show options, don't make users remember codes/paths; recently-used surfaces; visible state.
7. **Flexibility & efficiency** — shortcuts for experts (keyboard, gestures, command palette) that stay invisible to novices; smart defaults for everyone.
8. **Aesthetic & minimalist design** — every element competes for attention; cut what doesn't serve the current task.
9. **Help users recognize & recover from errors** — plain-language errors: what happened, why, what to do; preserve user input.
10. **Help & documentation** — contextual help at point of need (tooltips, inline hints) beats manuals.

## Behavioral laws to apply

- **Fitts's Law**: important targets = big and close. Thumb zone on mobile (bottom half); screen edges/corners on desktop are "infinite" targets.
- **Hick's Law**: decision time grows with options. Progressive disclosure; recommended defaults; 3-tier pricing not 7.
- **Jakob's Law**: users spend most time on other sites — meet conventions, spend novelty budget only on your core differentiator.
- **Miller's Law / chunking**: group into 5–7 chunks (phone numbers, card numbers, nav sections).
- **Peak–end rule**: invest in the flow's peak moment and its ending (success states, confirmations, celebrations).
- **Von Restorff**: the one visually-different element gets remembered — that's why one primary CTA works.
- **Doherty threshold**: keep system response <400ms to keep users in flow; use optimistic UI where safe.
- **Goal-gradient**: show progress; users accelerate near completion (progress bars start pre-filled ~10%).
- **Tesler's Law**: complexity is conserved — absorb it in the system (autodetect, defaults) rather than pushing to users.

## Cognitive load rules

- One primary job per screen. Screens that do everything do nothing.
- Progressive disclosure: advanced options behind "Show more"; wizard steps over mega-forms.
- Defaults do the work: 90% of users never change them — make defaults the recommended path.
- Blank-slate anxiety: never open on an empty canvas without a starting template/example.

## Feedback timing budget

| Delay | Requirement |
|---|---|
| <100ms | Feels instant; no indicator needed |
| 100ms–1s | Subtle feedback (button state), no spinner |
| 1–3s | Spinner/skeleton |
| >3s | Progress + explanation; allow cancel |
| >10s | Progress + time estimate; allow backgrounding + notify |

Skeletons beat spinners for content layout; optimistic UI (assume success, reconcile on failure) beats both for social actions.
