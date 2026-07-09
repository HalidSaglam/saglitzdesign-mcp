---
name: design-review
description: Critique a UI (screenshot, live page, or code) like a rigorous senior designer — grounded, reproducible, element-citing, and ranked by severity. Use when someone asks "review this design", "what's wrong with this screen", or wants feedback on a mockup/site/app. Avoids the failure modes of typical AI critique (hallucinated issues, padded lists, critiquing the description instead of the pixels).
---

# Design Review

Most AI design feedback guesses: it flags issues inconsistently, pads the list to look thorough, and critiques a text description instead of the actual pixels. Do the opposite — a fixed rubric applied to what you actually see.

> Full rubric + checklists are in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`): docs `design-critique-scoring`, `accessibility`, `principles-heuristics`, tool `design_review_checklist`, and the `/critique_screenshot` and `/design_review` workflows.

## Method

1. **Look first, judge second.** Describe what you actually see — layout, hierarchy, the primary action, which states are shown. If you're unsure what an element is, say so; don't invent.
2. **Apply the fixed rubric.** Score each of Nielsen's 10 heuristics 0–4 (total /40). Use the same rubric every time so scores are reproducible. Bands: 34–40 excellent, 26–33 solid, 18–25 needs work, <18 rework.
3. **Cite specific elements.** Every finding points to a concrete element: "the secondary 'Learn more' button competes with the primary CTA — two filled buttons," not "improve hierarchy."
4. **No padding.** Report only real issues. If the screen is genuinely good, a short list is the correct answer.
5. **Rank by severity** P0→P3, each with one concrete fix and the rule it comes from.

## What to check (fast pass)

- **Hierarchy:** exactly one primary action per view? Does the important thing look most important? (squint test)
- **Spacing:** consistent scale? Grouping via space (within < between)? Aligned to one grid?
- **Type:** ≤2–3 sizes? Hierarchy via size/weight/color, not more fonts? Readable line length/height?
- **Color & contrast:** one accent used sparingly? Text ≥4.5:1, UI ≥3:1? Dark mode not naive inversion?
- **Consistency:** one radius system? Borders OR shadows? One icon family/weight?
- **States:** empty, loading, error, long-content, zero-results designed?
- **Copy:** verb-first buttons? Specific, human microcopy? No "Submit"/"Click here"?
- **Accessibility:** keyboard reachable, visible focus, tap targets ≥44pt, meaning not by color alone.
- **Motion (if any):** ease-out on enter, ease-in on exit, interruptible, respects reduced-motion.

## Severity guide

- **P0** — blocks the task or is inaccessible (unreadable contrast, broken flow, no primary action).
- **P1** — hurts conversion/usability (weak hierarchy, competing CTAs, missing error states).
- **P2** — craft/consistency (mixed radii, spacing off the scale, icon mismatch).
- **P3** — polish/delight (micro-interactions, refinements).

## Output format

Give the /40 score with a one-line note per heuristic, then findings ranked P0→P3 (element → problem → why, citing the rule → fix), then the 3 highest-impact changes. Tight and specific.
