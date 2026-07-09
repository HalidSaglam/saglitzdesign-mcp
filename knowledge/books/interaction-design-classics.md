---
id: "interaction-design-classics"
title: "Interaction Design Classics: Cooper, Tidwell, and the Rules They Imply"
category: "book"
platform: "both"
tags: [interaction-design, cooper, about-face, personas, patterns, goal-directed]
updated: "2026-07-09"
sources:
  - "https://en.wikipedia.org/wiki/Alan_Cooper_(software_designer)"
  - "https://www.dubberly.com/articles/alan-cooper-and-the-goal-directed-design-process.html"
  - "https://en.wikipedia.org/wiki/Sovereign_application"
  - "https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/"
  - "https://www.designsystems.com/jenifer-tidwell-creator-of-a-pattern-language-for-ui-design/"
  - "https://www.goodreads.com/book/show/6553458-seductive-interaction-design"
---

# Interaction Design Classics

Two books define the discipline of interaction design as distinct from visual design: Alan
Cooper's *About Face* and Jenifer Tidwell's *Designing Interfaces*. Cooper tells you how to
decide what a product should do and how it should behave; Tidwell gives you a named catalog
of solutions to recurring interaction problems. This document distills both into concrete
rules an AI design assistant applies to current web and mobile UI. A third, Stephen
Anderson's *Seductive Interaction Design*, contributes a few motivation rules at the end.

## Part 1 — Alan Cooper, *About Face*

### Design toward goals, not tasks
A goal is an end state the user wants ("be confident the invoice is correct"); a task is a
step toward it ("click Save"). Goals are stable; tasks are disposable artifacts of the
current design. Design for the goal and you are free to eliminate tasks entirely.

Rules:
- Frame every feature by the user's end goal, then ask "what is the fewest steps that reach
  it?" Automate or remove steps that exist only because of how software used to work.
- Never make the user do work the software could do. If the system knows something, do not
  ask for it.
- Judge a flow by whether it advances a goal, not by how many capabilities it exposes.

### Personas, used correctly
Cooper invented personas as a design tool, not a marketing artifact. A persona is a precise,
named, research-grounded archetype of a user with specific goals — a device for making design
decisions and for ending "elastic user" arguments where "the user" conveniently wants
whatever the arguer wants.

Rules:
- Design for one **primary persona** per interface. You cannot serve everyone with one layout;
  pick the persona whose goals the product exists to serve and satisfy them fully.
- Make personas specific and goal-driven, not demographic filler. "Maria, a clinic scheduler
  who must never double-book a room" drives decisions; "35–44, urban" does not.
- Use the persona to arbitrate: "Would Maria understand this? Does it serve her goal?" If a
  feature serves no persona's goal, it is a candidate to cut.

### Idioms beat metaphors
Metaphors (the desktop, the trash can) do not scale and trap you into imitating physical
limits. Most of what users know, they learned — idioms like scrollbars, tabs, and hamburger
menus are not metaphors for anything; users simply learned them once and now know them.

Rules:
- Do not force a real-world metaphor onto a digital interaction. Prefer a clean idiom the
  user learns once and reuses everywhere.
- Lean on established platform idioms (pull-to-refresh, swipe-to-delete, the platform back
  gesture) rather than inventing novel visuals that must be re-learned.
- Skeuomorphism for its own sake is a metaphor trap; use it only when the resemblance
  genuinely teaches the control.

### Design for the perpetual intermediate
Users are rarely permanent beginners (they graduate quickly) and rarely become experts (most
never do). The largest, most stable group is the perpetual intermediate.

Rules:
- Optimize the default experience for intermediates: keep advanced power accessible but out
  of the way, and keep beginner scaffolding dismissible rather than permanent.
- Provide onboarding and tooltips that a beginner can lean on and an intermediate can ignore
  — never wall the main flow behind a tutorial.
- Offer accelerators (keyboard shortcuts, bulk actions) for the emerging expert without
  cluttering the primary path.

### Excise and navigation reduction
Excise is work the interface imposes that does not advance the user's goal — extra
navigation, bookkeeping, confirming, and hunting. Cooper's mandate: eliminate excise.

Rules:
- Cut navigation steps. Every screen the user must pass through to reach their goal is a tax.
  Flatten hierarchies; surface the common destination directly.
- Remove unnecessary confirmations. Prefer a reversible action with undo over a modal "Are
  you sure?" that trains users to click through blindly.
- Eliminate "software bookkeeping" — do not make users manage files, states, or settings the
  system could manage itself. Autosave rather than prompt to save.
- Remember state so users never re-enter what they already gave you.

### Flow and direct manipulation
People do their best work in flow — an undisturbed, deeply engaged state. The interface's job
is to preserve it. Direct manipulation (dragging the thing itself, editing in place) keeps
users in flow better than mediated dialogs.

Rules:
- Prefer editing in place and dragging the actual object over opening a separate dialog to
  describe the change.
- Do not interrupt flow with unsolicited modals, popups, or notifications during a focused
  task. Batch or defer non-urgent interruptions.
- Give immediate, visible feedback to every manipulation so the user stays oriented.
- Make actions reversible so users can explore without fear; undo protects flow better than
  confirmation dialogs do.

### Postures: match the interface to how it is used
Cooper classifies applications by posture — the amount of attention they command — and each
posture demands a different design.

- **Sovereign** — apps that own the user's full attention for long stretches (an IDE, an
  email client, a design tool, a spreadsheet). Rules: optimize for the intermediate; use
  screen real estate fully; make controls compact and dense because the user learns them;
  use a conservative, muted visual style that does not fatigue over hours; support keyboard
  and shortcuts heavily.
- **Transient** — apps invoked briefly for a single job, then dismissed (a settings panel, a
  calculator, a share sheet, a file-picker). Rules: make function obvious at a glance; use
  larger, clearly labeled controls; carry no assumption of learning; remember the user's last
  choices so the brief visit is even briefer.
- **Daemonic** — background processes with no routine UI (a sync service, a backup agent).
  Rules: stay silent and invisible in normal operation; surface UI only when the user must
  decide something or when something failed; make that surfaced UI transient and clear.

Apply posture to modern surfaces: a dashboard app is sovereign, a modal or bottom sheet is
transient, a background sync indicator is daemonic. Design each to its posture, not to a
single house style.

## Part 2 — Jenifer Tidwell, *Designing Interfaces*

Tidwell reframed interaction design as a **pattern language**: a catalog of proven, named
solutions to recurring problems. The value is a shared vocabulary and reuse — reach for the
named pattern rather than reinventing. Apply these as current UI rules.

- **One-window drilldown.** Show a list and its detail in the same frame; selecting an item
  replaces or reveals detail in place rather than launching a new window. Modern form:
  master-detail / list-detail layouts, split views on tablets, and route-driven detail panes.
  Rule: keep the user oriented in one context instead of spawning windows.
- **Two-panel selector (master-detail).** List on the left/top, detail on the right/bottom,
  updating live on selection. Rule: use for browsing collections where the user compares and
  moves quickly between items (mail, settings, admin tables).
- **Wizard.** Break a long, novel, or infrequent task into ordered steps with a clear
  progress indicator. Rule: use only when the task is genuinely sequential and unfamiliar;
  do not wizard-ize a task experienced users repeat — that becomes excise. Always show which
  step of how many, allow going back, and preserve entered data across steps.
- **Hub and spoke.** A central home from which users go out to a task and return to the hub
  to choose the next. Rule: this is the native mobile pattern (a home screen of features);
  keep the hub reachable from every spoke, and make the return obvious.
- **Escape hatch.** Every screen the user can get into must offer a clear, reliable way out —
  a Cancel, a Back, a Home, a way to abandon a flow without penalty. Rule: never trap the
  user; a visible escape hatch on modals, wizards, and dead ends prevents the "how do I get
  out of this?" panic. Reversibility beats confirmation.
- **Good defaults (smart prefill).** Prefill fields with the most likely value so the common
  case needs no input. Rule: default to what the user most probably wants — infer from
  context, prior entries, or account data — while keeping every default editable. A good
  default turns a form into a confirmation.
- **Forgiving format.** Let a single input accept many formats and normalize them for the
  user. Rule: accept "(555) 123-4567", "5551234567", and "555.123.4567" for a phone field;
  parse dates and amounts flexibly. Do the cleanup in software; never reject input the system
  could reasonably interpret.
- **Deep-linked state.** Make application state addressable by URL so a specific view, filter,
  or record can be bookmarked, shared, and reopened exactly. Rule: encode meaningful state
  (selected item, active filters, tab, search query) in the URL; the back button and a shared
  link must both restore the exact view. This is table stakes for modern web apps.
- **Responsive disclosure / progressive disclosure.** Show the common controls; reveal
  advanced options on request. Rule: start simple, let power surface on demand — never dump
  every option at once.

Pattern-language discipline: when a problem recurs, name the pattern and apply the known
solution consistently across the product. Consistency of pattern is itself usability.

## Part 3 — Stephen Anderson, *Seductive Interaction Design* (motivation layer)

Cooper and Tidwell make products usable; Anderson makes them wanted. A few rules:

- **Aesthetics build trust.** The aesthetic-usability effect is real: users perceive
  attractive interfaces as easier to use and forgive their flaws more readily. Visual polish
  is a usability investment, not a vanity one.
- **Design for the emotional arc, not just the task.** Reduce anxiety at risky moments
  (payment, deletion, first use) with reassurance and reversibility; add small moments of
  delight at completion. Motivation, not just function, drives repeat use.
- **Use progress and small wins.** Visible progress (a completeness meter, a checklist, an
  onboarding streak) exploits the drive to close open loops and pulls users through a flow.
  Deploy sparingly and honestly — never fake progress or manufacture false scarcity.

## Applying all three

For any interface: define the primary persona and their goal (Cooper), choose the posture and
strip excise from the path to that goal (Cooper), assemble the flow from named, consistent
patterns with escape hatches and good defaults (Tidwell), and shape the emotional arc so the
experience is trusted and worth returning to (Anderson). Usability first; seduction second;
never seduction as a substitute for either.
