---
id: mobile-empty-states-buttons
title: "Mobile Empty States & Bottom Primary Button Patterns"
category: pattern
platform: mobile
tags: [empty-state, illustration, cta, buttons, primary-action]
sources:
  - "https://mobbin.com/screens/763e2666-87c9-41d6-a155-c13d050a18db"
  - "https://mobbin.com/screens/9a3f8ab3-581b-4995-9fd0-65fa1f091fb7"
  - "https://mobbin.com/screens/c041a22d-8521-4351-8a41-18892e7e795c"
  - "https://mobbin.com/screens/15181740-6713-4946-b348-777d27483d2f"
  - "https://mobbin.com/screens/7e5f69c8-bf8b-4a66-99dc-c811a1aeded7"
  - "https://mobbin.com/screens/1ecb8058-f083-42c9-980a-ae3eb46e3eab"
  - "https://mobbin.com/screens/66f2bada-95e8-483f-a261-8f3cb8a9c135"
  - "https://mobbin.com/screens/ae92be67-4594-414c-886d-9cf56f0cf30e"
  - "https://mobbin.com/screens/860f329c-21e8-476d-8e4d-d232aa8e1c7a"
  - "https://mobbin.com/screens/bd5ce18a-a93a-44ea-a69e-f2b41207605c"
  - "https://mobbin.com/screens/3066c4ce-b6c8-4ee5-ac94-6d81a4d1cc2e"
  - "https://mobbin.com/screens/706d47e1-6f7c-4318-bb98-927e66bb744d"
  - "https://mobbin.com/screens/f230bb20-7010-4c79-9a3f-4cef18995b31"
  - "https://mobbin.com/screens/dcf90bfd-070e-42cf-967a-1853377516f4"
updated: 2026-07-08
---

# Empty States & Bottom Primary Actions (iOS)

Based on real screens from Collect, Shake Shack, Lex, Coursera, Grab, Demo, Shop, Greg, Google Gemini, Apple Wallet, Weverse, Deepstash, and Snapchat on Mobbin.

## Observed patterns — empty states

### The universal 4-part stack (vertically centered)
Illustration → bold headline → 1–2 line gray explanation → single CTA.
- [Grab](https://mobbin.com/screens/1ecb8058-f083-42c9-980a-ae3eb46e3eab): character illustration, bold "No restaurant bookings yet", gray subcopy ("Explore top dining spots in your city and make a booking instantly!"), full-width green pill "Explore dining spots".
- [Coursera](https://mobbin.com/screens/7e5f69c8-bf8b-4a66-99dc-c811a1aeded7): simple line-art book icon over a soft blue blob, "You haven't enrolled in any courses (yet)", explanation, compact blue "Explore courses" button — centered, hugging its label.
- [Shake Shack](https://mobbin.com/screens/c041a22d-8521-4351-8a41-18892e7e795c): brand-voice headline "Say what?! Your bag is empty." with a stick-figure illustration in brand green on black, and a full-width green "Find a Location" CTA.
- [Lex](https://mobbin.com/screens/15181740-6713-4946-b348-777d27483d2f) frames the whole empty state inside a rounded card: mascot, "No saved posts", "You haven't saved any posts yet! Your saved posts will show up here.", small green "Go to feed" button.

### CTA routes to the filling action
Every observed CTA sends the user to the place where the empty collection gets filled — "Find a Location" (bag), "Explore courses" (enrollments), "Go to feed" (saved posts), "Explore dining spots" (bookings). None say generic "Get started".

### FAB + coach-mark variant
- [Collect's board view](https://mobbin.com/screens/763e2666-87c9-41d6-a155-c13d050a18db): "Looks a little empty in here / Tap the + to get started" with an orange tooltip bubble ("Tap to add content to this board") pointing directly at the orange "+" FAB. Its [My items screen](https://mobbin.com/screens/9a3f8ab3-581b-4995-9fd0-65fa1f091fb7) repeats the pattern with a blue tooltip and FAB.
- [Demo](https://mobbin.com/screens/66f2bada-95e8-483f-a261-8f3cb8a9c135): serif "Next up" headline, "To create your first project, just tap the '+' button below", coral "+" FAB centered at the bottom. When the creation control already exists on screen, the empty state teaches it rather than duplicating it.

### Tone and craft
- Headlines are short, human, and often optimistic ("(yet)" — Coursera; "Say what?!" — Shake Shack). Illustrations are brand-styled (mascots for Lex/Collect, brand-line-art for Shake Shack, human characters for Grab) — never generic stock clip-art. Explanations always say what *will* appear here.

## Observed patterns — primary action at bottom of screen

- **Full-width anchored pill**: [Weverse](https://mobbin.com/screens/706d47e1-6f7c-4318-bb98-927e66bb744d) pins a teal "Start Subscription" pill at the bottom, and it activates only after the "I have reviewed…" checkbox above it is ticked. [Deepstash](https://mobbin.com/screens/f230bb20-7010-4c79-9a3f-4cef18995b31) anchors a dark full-width "Continue" pill inside a bottom sheet. [Snapchat](https://mobbin.com/screens/dcf90bfd-070e-42cf-967a-1853377516f4) uses a slightly inset blue pill "📎 Attach to Snap" centered above the home indicator.
- **Compact corner pill for contextual actions**: [Google Gemini](https://mobbin.com/screens/bd5ce18a-a93a-44ea-a69e-f2b41207605c) puts a small blue "✓ Attach" pill bottom-right over dark content; [Greg](https://mobbin.com/screens/860f329c-21e8-476d-8e4d-d232aa8e1c7a) puts "Post ↑" bottom-right of a camera view; [Shop](https://mobbin.com/screens/ae92be67-4594-414c-886d-9cf56f0cf30e) ends a media toolbar with a purple "Next" pill on the right. Corner placement = "proceed with this content", full-width = "commit to this screen's single purpose".
- **Paired decision**: [Apple Wallet](https://mobbin.com/screens/3066c4ce-b6c8-4ee5-ac94-6d81a4d1cc2e) closes a terms sheet with "Disagree" as a gray/secondary pill on the left and "Agree" as the filled blue pill on the right — primary right, equal heights, both above the home indicator.
- Buttons keep high contrast against any content behind them (blue-on-black Gemini, white-on-dark Shop) and add an icon when the verb alone is ambiguous (📎 Attach, ✓, ↑).

## Design rules derived

**Do**
1. Build empty states as: brand illustration → ≤6-word bold headline → 1–2 line gray explanation of what will live here → exactly one CTA.
2. Name the CTA after the filling action and route straight there ("Explore courses", not "OK" or "Get started").
3. If the screen already has a create control (FAB, "+"), point at it with a one-time coach-mark tooltip instead of adding a second button.
4. Vertically center the stack; keep the illustration under ~40% of screen height so headline + CTA never fall below the fold.
5. Write in the product's voice and allow warmth ("(yet)") — the empty state is a first impression, not an error.
6. Anchor a screen's single commit action as a full-width pill (~50–56pt tall, 16–20pt side margins) above the home-indicator safe area.
7. Use compact corner pills only for contextual "proceed" actions layered over content (camera, preview, media).
8. Gate irreversible CTAs on explicit acknowledgment (Weverse's checkbox → enabled button), and show the disabled state clearly.
9. In two-button decisions, put the primary filled button on the right and the secondary as gray/ghost on the left, equal height (Apple Wallet).
10. Guarantee button contrast over any backdrop — solid fills or a scrim, never text-only floating on imagery.

**Don't**
1. Don't stack multiple CTAs in an empty state — one action, one destination.
2. Don't use generic stock illustrations that ignore the brand's palette and style.
3. Don't phrase emptiness as failure ("Nothing found", "No data") when the state is expected for new users.
4. Don't float a full-width primary button over scrollable legal/reading content without a scrim or edge — it will obscure the last lines (see Apple Wallet's terms text running beneath its buttons).

## Anti-patterns seen

- **Buttons overlapping content** ([Apple Wallet terms sheet](https://mobbin.com/screens/3066c4ce-b6c8-4ee5-ac94-6d81a4d1cc2e)): Disagree/Agree float over the final lines of the terms text with no gradient scrim — the content is partially unreadable at the decision point.
- **Explaining instead of doing** (Demo): the empty state says "tap the '+' button below" in prose; the Collect tooltip-pointing-at-FAB version is faster to parse.
- **Dead-feeling blank canvases** (Shop's editor): a nearly blank screen whose only guidance is a toolbar; pairing it with a first-run hint would remove the "now what?" moment.
- **Icon-only floating actions on busy imagery** (Greg's camera overlay): small labels over a live photo need heavier scrims to stay legible.
