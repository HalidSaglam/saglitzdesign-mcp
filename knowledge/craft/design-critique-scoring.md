---
id: design-critique-scoring
title: "Design Critique & Scoring — How Experts Judge Quality"
category: craft
platform: both
tags: [critique, heuristics, scoring, delight, brand, motion]
sources: ["impeccable design skill (local)"]
updated: 2026-07-08
---

# Design Critique & Scoring — How Experts Judge Quality

A rigorous critique is scored, prioritized, specific, and honest. Vague feedback wastes everyone's time; "consider exploring…" is banned language. This file gives the rubric, the report structure, and the judgment calls (delight vs restraint, brand expression) that separate a design director's review from a checklist run.

## The scoring rubric: Nielsen's 10, scored 0–4

Score each heuristic 0–4. **Be honest: a 4 means genuinely excellent, not "good enough." Most real interfaces score 20–32 total.**

### 1. Visibility of system status

Check for: loading indicators on async operations, confirmation of actions (save/submit/delete), progress on multi-step processes, current-location cues (breadcrumbs, active states), inline validation feedback.

| Score | Criteria |
|---|---|
| 0 | No feedback; user is guessing what happened |
| 1 | Rare feedback; most actions produce no visible response |
| 2 | Partial; some states communicated, major gaps remain |
| 3 | Good; most operations give clear feedback, minor gaps |
| 4 | Every action confirms; progress is always visible |

### 2. Match between system and real world

Check for: familiar terminology (no unexplained jargon), information in the order users expect, recognizable icons/metaphors, audience-appropriate domain language, natural reading flow.

| Score | Criteria |
|---|---|
| 0 | Pure tech jargon, alien to users |
| 1 | Mostly confusing; requires domain expertise to navigate |
| 2 | Mixed; some plain language, jargon leaks through |
| 3 | Mostly natural; occasional term needs context |
| 4 | Speaks the user's language fluently throughout |

### 3. User control and freedom

Check for: undo/redo, cancel on forms and modals, clear paths back to safety, easy clearing of filters/search/selections, escape from multi-step processes.

| Score | Criteria |
|---|---|
| 0 | Users get trapped; no way out without refreshing |
| 1 | Difficult exits; obscure paths to escape |
| 2 | Main flows have escape, edge cases don't |
| 3 | Users can exit and undo most actions |
| 4 | Undo, cancel, back, and escape everywhere |

### 4. Consistency and standards

Check for: one term per concept, same action = same result everywhere, platform conventions followed, visual consistency (color/type/spacing/components), same gesture = same behavior.

| Score | Criteria |
|---|---|
| 0 | Feels like different products stitched together |
| 1 | Many inconsistencies; similar things look/behave differently |
| 2 | Main flows match, details diverge |
| 3 | Mostly consistent; occasional harmless deviation |
| 4 | Cohesive system, fully predictable behavior |

### 5. Error prevention

Check for: confirmation before destructive actions, constraints preventing invalid input (pickers, dropdowns), smart defaults, labels that prevent misunderstanding, autosave and draft recovery.

| Score | Criteria |
|---|---|
| 0 | Errors easy to make; no guardrails anywhere |
| 1 | Few safeguards; some inputs validated, most aren't |
| 2 | Common errors caught, edge cases slip |
| 3 | Most error paths blocked proactively |
| 4 | Errors nearly impossible through smart constraints |

### 6. Recognition rather than recall

Check for: visible options (not buried menus), contextual help (tooltips, inline hints), recents and history, autocomplete/suggestions, labels on icons (no icon-only navigation).

| Score | Criteria |
|---|---|
| 0 | Heavy memorization; users must remember paths and commands |
| 1 | Mostly recall; many hidden features, few visible cues |
| 2 | Main actions visible, secondary features hidden |
| 3 | Most things discoverable, few memory demands |
| 4 | Everything discoverable; users never memorize |

### 7. Flexibility and efficiency of use

Check for: keyboard shortcuts for common actions, customization, recents and favorites, bulk/batch actions, power features that don't complicate the basics.

| Score | Criteria |
|---|---|
| 0 | One rigid path; no shortcuts or alternatives |
| 1 | Limited flexibility; few alternatives to the main path |
| 2 | Basic keyboard support, limited bulk actions |
| 3 | Keyboard nav, some customization |
| 4 | Multiple paths, power features, customizable |

### 8. Aesthetic and minimalist design

Check for: only necessary information per step, hierarchy that directs attention, purposeful color and emphasis, no decorative clutter competing for attention.

| Score | Criteria |
|---|---|
| 0 | Overwhelming; everything competes equally |
| 1 | Cluttered; hard to find what matters |
| 2 | Main content clear, periphery noisy |
| 3 | Focused design, minor visual noise |
| 4 | Every element earns its pixel |

### 9. Error recognition, diagnosis, and recovery

Check for: plain-language errors (no codes), specific problem named ("Email is missing @" not "Invalid input"), actionable recovery, errors near their source, form contents preserved.

| Score | Criteria |
|---|---|
| 0 | Cryptic errors: codes, jargon, or silence |
| 1 | Vague "Something went wrong" with no guidance |
| 2 | Names the problem but not the fix |
| 3 | Identifies problem and offers next steps |
| 4 | Pinpoints issue, suggests fix, preserves user work |

### 10. Help and documentation

Check for: searchable help, contextual help (tooltips, inline hints, tours), task-focused organization (not feature-organized), concise scannable content, access without leaving context.

| Score | Criteria |
|---|---|
| 0 | No help available anywhere |
| 1 | Help exists but hard to find or irrelevant |
| 2 | FAQ/docs exist, not contextual |
| 3 | Searchable, mostly task-focused |
| 4 | Right info at the right moment, in context |

### Total score bands (out of 40)

| Range | Rating | Meaning |
|---|---|---|
| 36–40 | Excellent | Minor polish only; ship it |
| 28–35 | Good | Solid foundation; address weak areas |
| 20–27 | Acceptable | Significant improvement needed before users are happy |
| 12–19 | Poor | Major UX overhaul; core experience broken |
| 0–11 | Critical | Redesign; unusable as-is |

## Issue severity: P0–P3

Tag every individual finding:

| Priority | Name | Definition | Action |
|---|---|---|---|
| P0 | Blocking | Prevents task completion entirely | Fix immediately |
| P1 | Major | Significant difficulty or confusion | Fix before release |
| P2 | Minor | Annoyance with a workaround | Fix next pass |
| P3 | Polish | Nice-to-fix, no real user impact | If time permits |

**Tie-breaker:** "Would a user contact support about this?" If yes, it's at least P1.

## Critique method

- **Run two independent assessments** and keep them isolated until synthesis: (A) a design review with fresh eyes, (B) mechanical/automated checks (linters, detectors, browser evidence). Automated output must not anchor the design judgment — finish A before reading B. Then weave, don't concatenate: note where they agree, what the machine caught that the eye missed, and which machine findings are false positives.
- **Evaluate on screen, not just in source.** Viewable targets require actual visual inspection at multiple viewports.
- Automated results are **defect evidence only** — a clean scan is never proof the design is good.

### Report structure (in this order)

1. **Design health score** — the 10-heuristic table with per-row key issue, total /40, and rating band.
2. **Anti-patterns verdict first** — the opening question: *would someone say "AI made this" without hesitation?* Cover layout sameness, generic composition, template tells, missed personality.
3. **Overall impression** — brief gut reaction and the single biggest opportunity.
4. **What's working** — 2–3 genuine strengths and *why* they work (credibility requires acknowledging strengths specifically).
5. **Priority issues** — 3–5 max, ordered by impact, each with: **[P?] What** (named clearly) · **Why it matters** (harm to users/goals) · **Fix** (concrete, actionable).
6. **Persona red flags** — walk 2–3 relevant user archetypes (e.g. power user, first-timer) through the primary action and name exactly what breaks for each: "No keyboard shortcuts; primary action takes 8 clicks" — never generic persona prose.
7. **Minor observations** — quick smaller notes.
8. **Questions to consider** — provocations that unlock better solutions: "What if the primary action were more prominent?" "Does this need to feel this complex?" "What would a confident version look like?"

### Critique voice rules

- Be direct; don't soften criticism — honest feedback ships great design.
- Be specific: "the submit button," never "some elements."
- Always pair what's wrong with why it matters to users.
- Give concrete fixes; cut hedging language entirely.
- Prioritize ruthlessly — if everything is important, nothing is.
- Track score across re-critiques to show trend; don't invent defects to demonstrate iteration. "First pass clean" is a valid verdict.

## Cognitive load scoring (fold into the review)

Use the 8-item checklist (single focus; ≤4-item chunks; visual grouping; clear hierarchy; one decision at a time; ≤4 visible options per decision; no cross-screen memory demands; progressive disclosure). **0–1 failures = low load · 2–3 = moderate · 4+ = critical.** Flag every decision point with >4 simultaneous options. Also assess the emotional journey: peak-end rule, emotional valleys, reassurance at high-stakes moments.

## Judging interaction quality

- **Eight-state completeness** for every interactive element: default, hover, focus, active, disabled, loading, error, success. The common miss: hover designed without focus (keyboard users never see hover).
- Focus: `:focus-visible` ring 2–3px, offset, ≥3:1 contrast — `outline: none` without replacement is an automatic finding.
- Forms: visible labels (placeholders are not labels), validate on blur, errors below fields with `aria-describedby`.
- Destructive actions: **undo beats confirmation** — users click through confirms mindlessly. Confirmation only for irreversible/high-cost/batch operations.
- Overlays: `position: absolute` inside `overflow: hidden` clipping is the most common generated-code dropdown bug; arbitrary z-index (9999) instead of a semantic scale is a finding.
- Touch targets ≥44×44px; no hover-only functionality; gestures always have visible fallbacks.

## Judging motion

- **Durations — the 100/300/500 rule:** 100–150ms instant feedback (press, toggle) · 200–300ms state changes (menu, tooltip) · 300–500ms layout changes (modal, accordion) · 500–800ms entrances only. Anything >500ms for UI feedback is a defect. **Exits run ~75% of enter duration.**
- **Easing:** never plain `ease`; ease-out for entrances, ease-in for exits, ease-in-out for toggles. Expressive default: ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)`. **Bounce/elastic = automatic finding** — dated and amateurish; real objects decelerate, they don't boing.
- Stagger: ~50ms per item via `calc(var(--i) * 50ms)`, total capped (~500ms) — reduce per-item delay for long lists.
- Materials: transform/opacity are the reliable defaults; blur/filter/mask/clip-path are legitimate premium materials **if bounded to small areas and verified smooth in-browser**. Casually animating layout properties (width/height/top/left/margins) is a finding.
- `prefers-reduced-motion` support is **not optional** (vestibular disorders affect ~35% of adults over 40): crossfade instead of movement; keep functional indicators (progress, focus).
- Perceived performance: <80ms feels instant; skeletons beat spinners; optimistic UI for low-stakes actions only (never payments/destructive). Motion used to hide slow loading is a finding.

## Delight vs restraint — the judgment call

Delight is register-dependent:
- **Product register:** delight at specific *moments* (completion, first-time actions, error recovery, milestones), never spread across pages. Reliability carries the rest. Delight everywhere reads as noise.
- **Brand register:** delight may be distributed — copy voice, section transitions, discovery rewards, seasonal touches.

Rules for judging whether a delight moment is earned:
- **Amplifies, never blocks:** <1 second, skippable, never delays core functionality.
- **Context-appropriate:** celebrate success; empathize with errors (never playful during critical errors); banking ≠ gaming.
- **Survives repetition:** still pleasant on the 100th use; varied responses beat one looping animation.
- **Discovery beats announcement:** hidden details reward curiosity; don't fanfare every touch.
- **Ban AI-slop delight:** cliché loading jokes ("Herding pixels…"), stock confetti on trivial actions, whimsy hiding poor UX.
- Verdict test: if users notice the delight more than they notice completing their goal, it's overdone.

## Brand expression — evaluation tests

- **The slop test:** would anyone say "AI made that" without hesitation? The bar is a visitor asking "how was this made?" Average is no longer findable; restraint without intent reads as mediocre, not refined.
- **The aesthetic-lane test:** can the designer name the lane in one reference? ("Stripe-minimal," "acid-maximalism," "Klim specimen page.") Unnamed ambition becomes beige. Also check lane *fit*: editorial-magazine styling on a non-editorial brief is the wrong register within the register.
- **The competitor-sentence test:** describe the design in one sentence as a competitor would describe theirs. If that sentence fits the category's modal landing page, it fails.
- **Palette commitment:** palette IS voice — a named color strategy (drench, committed accent, full palette, monochrome restraint) executed without hedging. Beige-and-muted-slate on a brand brief ignores the register.
- **Imagery obligation:** briefs that imply imagery (restaurant, hotel, food, travel, fashion, photography, product) must ship imagery. Zero images is a bug, not restraint; colored blocks where a hero photo belongs are a P1.
- **Brand ban list (findings when present):** monospace as "technical" costume; big rounded icons above every heading; all-caps body copy; timid palette + average layout; repeated tiny uppercase tracked labels as section grammar; editorial-serif-by-default.
- **Brand permissions (don't penalize):** ambitious first-load choreography, one dominant idea per fold, enormous display type, unexpected color strategies, per-section art direction — when the voice demands them.
- Product-register inverse: bold theatrics in a tool ARE the finding; amplification belongs in hierarchy clarity, weight contrast, one sharper accent.

## After the critique

End with prioritized, actionable direction — not a raw list. Ask 2–4 targeted questions tied to actual findings (priority direction, intent vs accident on tonal issues, scope appetite), each with concrete options. Never generic "who is your audience?" questions. Map every priority issue to a concrete next action, and re-score after fixes to make progress visible.
