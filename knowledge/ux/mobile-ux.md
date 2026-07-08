---
id: mobile-ux
title: "Mobile App UX — Platform Rules & Ergonomics"
category: ux
platform: mobile
tags: [mobile, thumb-zone, gestures, ios, android, onboarding]
sources: ["https://developer.apple.com/design/human-interface-guidelines/", "https://m3.material.io/", "https://www.nngroup.com/articles/mobile-ux/"]
updated: 2026-07-08
---

# Mobile App UX — Platform Rules & Ergonomics

## Thumb-zone design

- Bottom third of the screen = easy reach; top corners = hardest. On 6.1–6.9" phones, one-handed use dominates.
- Primary actions, tab bars, key CTAs → bottom. Destructive actions → out of accidental-tap zones.
- Top of screen: titles, status, search (with pull-down or bottom-sheet alternatives in reach-heavy apps).
- FABs: bottom-right (Material); avoid covering list content actions.

## Platform respect (don't ship one design to both)

| Concern | iOS | Android |
|---|---|---|
| Back | Top-left back + edge-swipe | System back gesture/button — must always work correctly |
| Nav bar | Tab bar 49pt + safe area | Navigation bar 80dp |
| Typography | SF Pro, Dynamic Type | Roboto/brand, sp units |
| Sheets | Detent sheets, capsule buttons | Bottom sheets, M3 shapes |
| Settings | Grouped inset lists | Preference lists |
| Share/context | Share sheet, context menus (long-press preview) | Share sheet, ⋮ menus |

Core brand and layout can match; navigation, gestures, pickers, and system integrations must be native-correct.

## Gestures

- Every gesture needs a visible alternative (swipe-to-delete → edit mode / ⋯ menu).
- Standard gestures only: swipe back, pull-to-refresh, long-press context, pinch zoom on media. Custom gestures need onboarding and rarely stick.
- Don't fight system gestures: keep interactive elements out of edge-swipe zones and the home-indicator area.

## Onboarding & first-run

- Time-to-value is the metric: get users to the core "aha" in <60 seconds. Defer signup until value is shown when possible.
- Skip intro carousels or cap at 3 screens with Skip; contextual education (tooltips at first encounter) beats upfront tours.
- Personalization questions: only if answers visibly change the experience; show progress; ≤5 steps.
- Permissions: ask in context with a pre-permission explainer screen (notifications after user does something worth notifying about — never on cold start). Each cold-start permission dialog costs conversions.
- Sign-in: offer Apple/Google SSO first (one-tap), email fallback; passkeys are the 2026 default recommendation.

## Performance = UX

- Cold start <2s to interactive content; show branded splash → skeleton, never splash → blank.
- 60fps scrolling is non-negotiable; janky lists read as "cheap app".
- Offline: cache last content, queue writes, explicit offline banner + retry. Airplane-mode test every core flow.
- Images progressive/lazy; interactions respond <100ms (optimistic UI for likes/saves).

## Mobile-specific patterns

- Keyboard management: scroll focused input above keyboard; "Done/Next" return-key flow through forms; dismiss on scroll or tap-out.
- Notifications: transactional > promotional; batch digests; deep-link every notification to its exact content.
- App Store touchpoints: request review only after a success moment, cap frequency; never interrupt a task.
- Haptics: light impact for selections/toggles, success/error notification haptics — subtle, never on scroll.
- Text: minimum tap targets 44pt; body 16–17pt; support Dynamic Type up to accessibility sizes without truncation.

## Anti-patterns

- Web-view wrappers that ignore platform navigation.
- Login wall before demonstrating any value (unless product truly requires it).
- Interstitial ads/paywalls mid-task; notification permission dialog at first launch.
- Hiding core actions behind long-press with no hint.
- Splash screens >2s; forced app tours; blocking "rate us" dialogs.
- Bottom sheets/keyboards covering the input being edited.
