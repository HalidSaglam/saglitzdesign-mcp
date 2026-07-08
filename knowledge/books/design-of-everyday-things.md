---
id: design-of-everyday-things
title: "The Design of Everyday Things — Interaction Fundamentals (Don Norman)"
category: book
platform: both
tags: [interaction-design, usability, feedback, mental-models, error-prevention]
sources: ["The Design of Everyday Things (Don Norman, revised ed. 2013)"]
updated: 2026-07-08
---

# The Design of Everyday Things — Applied to Screens

Norman's core claim: when people fail to use something, it is the design's fault, not the user's. Every UI decision should answer two questions the user is silently asking: **"What can I do here?"** and **"What just happened?"** The frameworks below turn that into enforceable rules.

## 1. Affordances — what an element actually allows

An affordance is the relationship between the user and what an object lets them do (a button affords pressing, a text field affords typing). On screens, affordances are virtual, so they only work if they are perceivable.

**Rules:**
- Every interactive element must *look* interactive. Buttons need a shape/fill/border that separates them from static text; links need a persistent visual difference (color and/or underline), not hover-only styling — hover doesn't exist on touch devices.
- Never make non-interactive elements look clickable (e.g., underlined headings, card-like boxes that do nothing). False affordances erode trust in real ones.
- Match the control to the interaction it affords: sliders for continuous ranges, steppers for small integer ranges, toggles for binary state, dropdowns for 5+ mutually exclusive options, radio buttons for 2–5 visible options.
- On touch: anything tappable must meet minimum target size (~44×44pt iOS / 48×48dp Android) — a visually small icon can keep its size but must get a larger hit area.

## 2. Signifiers — the perceivable clue

Norman later split "affordance" from "signifier": the signifier is the *signal* that communicates the affordance. Most usability failures are missing signifiers, not missing capability.

**Rules:**
- If a surface scrolls, show partial content cut off at the fold ("peek") so users know more exists. Never end a scrollable region at a clean visual boundary that looks like the end.
- If content is swipeable (carousels, tab views, list actions), show dots, arrows, a peeking next card, or a one-time hint. Invisible gestures are undiscoverable by default.
- Placeholder text is a weak signifier that disappears on focus — always pair inputs with persistent labels.
- Disabled states must look disabled (reduced contrast, no pointer cursor) AND explain why when the reason isn't obvious (tooltip or helper text: "Add at least one item to continue").
- Icons alone are signifiers only for a handful of universal meanings (search, close, home, settings, play). For anything else, add a text label or use text only.

## 3. Mapping — controls should relate spatially/logically to their effects

Good mapping = the relationship between control and outcome is obvious from layout alone (stove knobs arranged like the burners).

**Rules:**
- Place controls next to the thing they affect: an "Edit" button on the card it edits, not in a global toolbar; volume/zoom controls oriented in the direction of the change (up = more).
- Keep list-item actions inside the list item; keep page-level actions at page level. Users infer scope from position.
- Order form fields in the order users think about the data (name → address → payment), and order wizard steps in causal order.
- Sliders and progress: left/low = less/earlier, right/high = more/later (mirror for RTL locales).
- In settings screens, the toggle's label must describe the ON state ("Enable notifications", not "Notification behavior") so the mapping between switch position and outcome is unambiguous.

## 4. Feedback — every action gets an immediate, proportionate response

**Rules:**
- Acknowledge every user action within ~100ms: pressed states on buttons, ripple/highlight on tap, immediate optimistic UI where safe.
- For operations 0.1–1s: subtle inline spinner. 1–10s: progress indicator with the button disabled and labeled ("Saving…"). >10s: progress bar with estimate or step count, and let the user leave/cancel.
- Confirm outcomes, not just receipt: after "Save", show "Saved" (toast, checkmark, or updated timestamp). After delete, show the item gone plus an Undo affordance.
- Feedback must be proportionate: don't use a modal dialog to confirm a trivial success; don't use a 2-second toast to report a destructive failure. Errors deserve louder, more persistent feedback than successes.
- Never leave a dead click. If an action can't complete, say why, right where the user acted.

## 5. Conceptual models — the story the UI tells about how it works

Users build a mental model from the interface itself (the "system image"). If the UI implies the wrong model, users will make systematic, repeated errors.

**Rules:**
- Decide the model first, then design to express it. Is it a document you edit and save, or a live-synced canvas? Files-and-folders or a search-first pool? Make one model visible and consistent everywhere.
- If saving is automatic, kill the Save button and show sync state ("All changes saved"). A Save button in an autosaving app teaches a false model and creates anxiety.
- Use metaphors users already have (cart, inbox, trash-with-restore) and then honor them completely — a "trash" that permanently deletes immediately violates the model it advertises.
- Surface system state that the model depends on: online/offline, draft vs. published, filtered vs. full list. Hidden state is the top source of "the app is broken" reports.
- Consistency is model-preservation: the same gesture/icon/word must mean the same thing on every screen.

## 6. The Seven Stages of Action — a checklist for any flow

Norman's cycle: (1) form the goal → (2) plan → (3) specify the action → (4) perform it → (5) perceive the result → (6) interpret it → (7) evaluate against the goal.

**Use as an audit on every key task:**
1. **Goal:** Does the screen help users recognize what they can accomplish here? (Clear page title, value-oriented empty states.)
2. **Plan:** Are the available options visible without exploration? (Don't bury the primary path in an overflow menu.)
3. **Specify:** Is the next step unambiguous? (One clearly primary CTA per view.)
4. **Perform:** Is the action low-effort and forgiving? (Big targets, sensible defaults, autofill.)
5. **Perceive:** Is there visible change after acting?
6. **Interpret:** Does the change use the user's vocabulary? ("Order placed", not "Transaction 201 committed".)
7. **Evaluate:** Can users tell the goal is done and what's next? (Confirmation screens with next-step links.)

If a support ticket or usability failure exists, locate which stage broke and fix that stage — don't redesign the whole flow.

## 7. Gulf of Execution & Gulf of Evaluation

- **Gulf of Execution** = the gap between what users want to do and how the UI lets them do it. Bridge it with signifiers, constraints, conventions, and fewer steps. Symptom: "How do I…?" questions.
- **Gulf of Evaluation** = the gap between what the system did and the user's ability to tell. Bridge it with feedback and clear state display. Symptom: "Did it work?" questions and double-submissions.

**Rule:** classify every usability complaint into one of the two gulfs; the fix category follows automatically (execution → clearer controls/fewer steps; evaluation → better feedback/state visibility).

## 8. Constraints and forcing functions

**Rules:**
- Prevent invalid input structurally instead of validating after the fact: date pickers over free-text dates, max-length enforced live, disable "Submit" only when structural requirements are unmet (and say what's missing).
- Use forcing functions for high-risk actions: require typing the project name to delete it; require scrolling terms before accepting only when legally necessary (otherwise it's just friction).
- Interlocks: don't allow step B before step A completes (grey out "Pay" until an address exists — with an explanation).
- Reserve confirmations for genuinely destructive, hard-to-undo actions. Over-confirming trains reflexive "OK"-clicking, which defeats the one confirmation that matters.

## 9. Errors: slips vs. mistakes — different causes, different fixes

- **Slips** = right intention, wrong execution (fat-fingered the wrong button, typo). Users know the goal; their hand failed.
- **Mistakes** = wrong intention from a wrong mental model (user deletes "archive" thinking it's a duplicate).

**Fix slips with:**
- Bigger/better-separated targets; never place destructive and primary actions adjacent (keep "Delete" away from "Save"; separate them spatially and by color).
- Undo everywhere possible — undo beats confirmation because it doesn't interrupt the 99% correct case.
- Inline validation that catches typos (email format, card checksum) at field-exit, not at submit.

**Fix mistakes with:**
- Better conceptual models and clearer labels ("Archive (you can restore later)" vs. bare icon).
- Previews of consequences: "This will remove 34 files for 5 team members."
- Error messages that teach: state what happened, why, and the exact next step, in plain language. Never blame ("Invalid input") without direction.

**Universal error rules:** preserve the user's work through any error (never clear a form on failed submit); log-friendly but human-first wording; make recovery a one-click path.

## 10. Knowledge in the world vs. in the head

Don't require memorization — put the needed knowledge in the interface.

**Rules:**
- Recognition over recall: show recent items, autocomplete, visible menu options instead of command syntax; show format examples inside/next to inputs ("MM/YY").
- Persist context across steps: in a checkout, keep the cart summary visible; in a wizard, show completed steps and their values.
- Shortcuts (knowledge in the head) are for experts — always keep a discoverable in-the-world path to the same action.

## 11. Worked example — applying the framework to a "delete account" flow

- **Affordance/signifier:** "Delete account" lives in Settings → Account, styled as a quiet destructive (red text) row — findable, but not adjacent to routine actions.
- **Mapping:** the control sits inside the Account section it affects, at the bottom (last-resort position matches last-resort meaning).
- **Conceptual model:** the screen explains the model before the action: "Your data is kept for 30 days, then permanently erased." No hidden state.
- **Constraints/forcing function:** the confirm button stays disabled until the user types their account email — a slip becomes structurally impossible.
- **Feedback:** after confirming, an explicit outcome screen ("Your account is scheduled for deletion on Aug 7") plus an email — evaluation gulf closed.
- **Error design:** the 30-day window is the undo; the confirmation email contains a one-click "Cancel deletion" link. Mistakes remain recoverable even after the forcing function passed.

Use this pattern of reasoning for any high-stakes flow: walk each concept in order and check it has a concrete answer.

## 12. Discoverability and understanding — the two-question test

Norman reduces good design to two properties. Run both as a final gate on every screen:

- **Discoverability:** can users figure out what actions are possible and where to perform them, purely from looking? If any core action requires being told, add signifiers or restructure.
- **Understanding:** can users tell what everything means, how the product is meant to be used, and what all the indicators say? If any icon, state, or number needs explanation, label it or remove it.

A screen that passes both needs no onboarding tour. Treat a required tour as a symptom, not a feature.

## Quick audit checklist

- [ ] Every interactive element visibly interactive; nothing non-interactive looks clickable
- [ ] Scroll/swipe/hidden content is signified
- [ ] Controls sit next to what they affect; labels describe the ON/positive state
- [ ] Every action acknowledged <100ms; every outcome confirmed; system state always visible
- [ ] One consistent conceptual model; no false metaphors; no hidden state
- [ ] Destructive actions: separated from primary actions, undoable, consequence-previewed
- [ ] Error messages: what happened + why + next step; work is never lost
- [ ] Nothing requires memory that the screen could carry instead
- [ ] Every complaint triaged to a gulf (execution vs. evaluation) and a stage (1–7) before fixing
- [ ] High-stakes flows use constraints/forcing functions plus a recovery window, not just a confirm dialog
- [ ] Screens pass the two-question test (discoverability + understanding) without a tour
