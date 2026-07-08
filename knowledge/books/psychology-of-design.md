---
id: psychology-of-design
title: "Design Psychology — Perception, Memory, Motivation (Weinschenk + Universal Principles)"
category: book
platform: both
tags: [psychology, gestalt, attention, memory, motivation, decision-making]
sources: ["100 Things Every Designer Needs to Know About People (Susan Weinschenk, 2011)", "Universal Principles of Design (Lidwell, Holden & Butler, 2003)"]
updated: 2026-07-08
---

# Design Psychology — The ~25 Most Actionable Findings

How people perceive, attend, remember, read, decide, err, and stay motivated — each finding stated as a rule an interface can obey. Grouped by cognitive function.

## Perception (Gestalt, applied)

**1. Proximity is your strongest free grouping tool.** Elements near each other are perceived as related — before borders, boxes, or color. Rule: encode relationships with spacing first (label near its input, actions near their object); reach for containers only when proximity is exhausted. Corollary: accidental proximity creates false relationships — a stray button near the wrong card will be read as belonging to it.

**2. Similarity groups across distance.** Same color/shape/size = same kind of thing, even far apart. Rule: keep one visual treatment per role (all links alike, all destructive actions alike, all metadata alike) so users learn the system once. Never reuse a role's treatment for something unrelated.

**3. Common region and connectedness override proximity.** A box or a connecting line beats spacing. Rule: use cards/containers to force grouping when layout constraints break proximity — and never draw a container around unrelated things.

**4. Closure and continuity: people complete patterns.** A partially visible card implies scrollability; aligned elements imply a sequence. Rule: deliberately cut content at the fold/edge to signify "more"; keep alignment lines clean because users will follow them — a misaligned element reads as either broken or intentionally separate.

**5. Figure/ground: people parse foreground vs. background instantly.** Rule: modals need a dimmed scrim to read as foreground; keep background decoration low-contrast so it never competes with content for figure status.

**6. People see what they expect (and miss what they don't).** Perception is pattern-matching against experience. Rule: put things where conventions predict (logo top-left, search top-right, primary action bottom-right of a dialog on desktop). Users will also miss changes outside their focus (change blindness) — never update important state silently in a screen corner; bring the change to the point of attention.

**7. Peripheral vision decides where to look next — and notices motion.** Rule: page-level "gist" is formed from the whole layout, not the part being read; keep peripheral areas calm. Use motion/animation only for the one thing that must attract attention; ambient animation (auto-carousels, looping banners) steals attention perpetually and gets banner-blindness in return.

**8. Faces get looked at first, and gaze direction steers attention.** Rule: use faces sparingly and deliberately; if a photo's subject looks toward the CTA or key text, users look there too. A face looking off-page drags attention off-page.

## Attention

**9. Attention is selective and goal-filtered.** Users on a task filter out everything that doesn't look task-relevant — including your important notice, if it looks like an ad (banner blindness). Rule: critical information must appear in the task's path, styled like content, not like promotion.

**10. Salience is zero-sum.** Every highlighted element reduces every other element's chance of being seen. Rule: budget one focal point per screen; audit by squinting/blurring — whatever survives the blur is what users will see first, and it had better be the right thing.

**11. Sustained attention is short; interruptions are costly.** Rule: design flows resumable (autosave drafts, keep place in wizards); front-load the essential step; assume ~7–10 minutes of focus for any continuous task before minds wander.

## Memory

**12. Working memory holds ~3–4 chunks, briefly.** (The classic "7±2" overstates it; Weinschenk: design for 3–4.) Rules: never make users carry information between screens — repeat it (show the plan being paid for on the payment screen); chunk long strings (card numbers as 4-4-4-4, phone as 3-3-4); limit menus and option lists to scannable groups rather than one flat wall.

**13. Recognition beats recall — always.** Rule: pickers over blank fields, recent/frequent items surfaced, autocomplete everywhere, previews instead of remembered names. Any UI that asks "what was it called?" should ask "is it one of these?" instead.

**14. Memory is reconstructive and error-prone.** Users misremember what they did and what the app said. Rule: keep history visible (order history, activity logs, "last edited" stamps); never rely on users remembering a warning shown once.

**15. People forget, so repeat and remind.** Rule: onboarding lessons decay in days — reinforce by contextual hints on Nth use, not a one-shot tour. Progressive disclosure beats a front-loaded manual: reveal complexity exactly when it becomes relevant (Universal Principles: "progressive disclosure").

## Reading

**16. Reading on screen is scanning in an F/zigzag pattern, driven by headings.** Rules: front-load keywords in headings, links, and list items; the first 2 words of a line carry most of the scan value; one idea per paragraph, meaningful subheads every few paragraphs.

**17. Reading ability ≠ reading preference: keep it simple.** Even expert users prefer plain language. Rules: aim for ~grade 6–8 reading level in UI copy; active voice; verbs on buttons ("Save changes", not "OK"); avoid ALL CAPS for running text (it slows reading and reads as shouting — fine for short labels).

**18. Legibility mechanics matter more than font aesthetics.** Rules: body text ≥16px on the web, adequate contrast (WCAG 4.5:1), line length 45–75 characters, real paragraphs spacing. Weinschenk: hard-to-read fonts make the *task itself* feel harder — perceived difficulty transfers from typography to product.

## Decision-making

**19. More choices = fewer decisions (choice overload).** People say they want more options and choose more readily from fewer. Rules: 3–5 options at any decision point; if the catalog is genuinely large, decide *for* the user first (defaults, "most popular" badge, a recommended tier) and let them override. Hick's Law (Universal Principles): decision time grows with number and complexity of options — split big decisions into sequenced small ones.

**20. Defaults are decisions you make for the user — most users keep them.** Rules: default every field you responsibly can; make the default the safest and most common choice; never default users into hard-to-reverse or costly options (dark-pattern territory).

**21. Most decisions are unconscious and feel-driven, then rationalized.** Social proof, scarcity, and framing move behavior more than specs. Rules (used ethically): show real usage evidence ("2,341 teams use this") near decisions; frame prices/values against an anchor (show the annual saving next to monthly price); only state true scarcity.

**22. People are loss-averse and value what they own (endowment).** Rules: free trials work because leaving becomes a loss — show users what they've built/accumulated when they consider downgrading; frame preservation ("Keep your 14 projects") over acquisition. Never weaponize this into guilt ("confirm-shaming").

## Errors and safety

**23. People will make errors — design forgiveness, not blame (Universal Principles: "forgiveness").** Rules: undo > confirmation; confirmations reserved for the irreversible; preserve all user input through failures; constrain inputs so wrong entries are impossible (pickers, masks, live formatting). Error messages: say what happened, why, and the one next step — near the field, in plain language, without red-shouting the entire form.

**24. When stressed, people tunnel.** Under time pressure or after an error, users see less of the screen and read less. Rules: error-state screens must be radically simpler than normal screens — one message, one action; put recovery controls exactly where the eye already is; never add promotional content to error/empty states.

## Motivation and engagement

**25. Progress is motivating; the closer the goal, the harder people work (goal-gradient).** Rules: show progress bars for multi-step flows; pre-fill some progress ("Profile 20% complete — you signed up!") because artificial head-starts measurably increase completion; break long journeys into visible stages with completion checkmarks.

**26. Dopamine rewards seeking and anticipation, and variable rewards hook hardest.** Unpredictable rewards (new content, likes, surprises) drive checking behavior more than fixed ones. Rules: use ethically — celebrate genuine achievements (first project shipped) with small delightful moments; do NOT engineer compulsive variable-reward loops (endless feeds, streak anxiety) into productivity tools; give users natural stopping points.

**27. Small commitments grow into big ones.** People act consistently with prior actions. Rules: ask for tiny first steps (one field, not a 12-field signup); defer heavy asks (full profile, payment details) until after the user has experienced value; sequence onboarding as an escalating ladder of micro-commitments.

**28. Intrinsic beats extrinsic: mastery, autonomy, connection.** Rules: show users their own skill growth (stats, streaks-as-history not streaks-as-threat); let users customize and control their space (autonomy); make social features about genuine connection (collaboration, sharing) — leaderboards motivate the top 10% and demotivate the rest.

**29. People are inherently lazy (least effort) — and that's fine.** Users satisfice and do the minimum needed. Rules: don't build for the thorough user who reads everything; make the lazy path the correct path (safe defaults, one-click common actions, smart suggestions). If the right behavior requires effort, redesign until it doesn't.

**30. Aesthetic–usability effect (Universal Principles).** Attractive interfaces are perceived as easier to use and are forgiven more faults. Rule: visual polish is not vanity — it buys user patience and trust; but never use it to paper over a broken flow, because the effect delays complaints, not failures.

## Cross-cutting Universal Principles worth enforcing

- **Fitts's Law:** time-to-target depends on distance and size. Big, close targets for frequent actions; screen edges/corners are "infinite" targets on desktop; thumb-zone (bottom of screen) for primary mobile actions; tiny far-away targets only for actions you want to slow down (destructive).
- **Performance load:** every bit of cognitive or physical work reduces completion. Audit each flow: remove a field, a step, a decision, a read — repeatedly.
- **80/20:** 20% of features drive 80% of use. Give that 20% the prime placement and polish budget; move the rest behind progressive disclosure.
- **Consistency (internal > external):** matching your own app's patterns matters most; matching platform conventions second; being novel is a cost you must justify.
- **Confirmation + constraint pairing:** the safest systems combine constraints (can't do it wrong), good defaults (right without thinking), forgiveness (undo), and only then confirmation (last resort).

## Applying the findings to common screens

**Sign-up / onboarding:**
- Minimize the first ask (#27): email + password or SSO only; everything else deferred until it gates a real feature.
- Show a progress head start (#25) if setup has steps; celebrate the first real success (#26), not account creation.
- Teach in context (#15): tooltips on first encounter with each feature, never a 6-slide upfront tour.

**Forms:**
- One column, top-aligned labels (scan pattern, #16); chunk long forms into titled sections of 3–5 fields (#12).
- Constrain and format inputs live (#23); default everything defensible (#20).
- Errors inline, adjacent, single-next-step; simplify the screen when errors appear (#24).

**Pricing pages:**
- 3 tiers, one visually recommended (#19, #20, #21); anchor with the highest tier positioned first or the saving framed against monthly (#21).
- Social proof adjacent to the decision, specific and true (#21); trial framed so accumulated work is what users would lose by leaving (#22) — without guilt copy.

**Dashboards:**
- One focal metric per view (#10); peripheral areas static (#7); tables use recognition aids (icons, colors + labels, not color alone).
- Respect 3–4 chunks (#12): group KPIs, don't line up twelve equal tiles.

**Feeds / content apps:**
- Variable reward dynamics apply whether you want them or not (#26) — add natural stopping points ("You're all caught up") in tools meant to respect time.
- Faces in thumbnails capture attention (#8); use deliberately, budget salience (#10).

**Error and empty states:**
- Tunneled users (#24): one sentence, one button, recovery in the eye's current position.
- Empty states are motivation moments (#25, #27): tiny first step, visible path, no dead ends.

## Five more findings worth enforcing

**31. People form mental models from the first exposure and resist updating them.** The first screen teaches users how the whole product works. Rule: make the first-run experience structurally representative of the real product — a wizard-style onboarding for a canvas-style tool teaches the wrong model.

**32. Multitasking is a myth; task-switching is expensive.** Rule: one task per screen; never require users to consult another screen/app mid-flow (show the code, don't make them fetch it); minimize notifications during active flows.

**33. People respond to computers socially.** Polite, human wording gets cooperation; machine-speak gets abandonment. Rule: write UI copy as a competent, brief human would speak ("We couldn't save that — try again?" not "Error 4092: operation failed"); reciprocity works — give value before asking (show the report preview before requesting the email).

**34. Feedback timing shapes perceived speed.** Perceived wait, not actual wait, drives satisfaction; uncertain waits feel longer than known waits, and occupied time passes faster. Rule: skeleton screens over spinners; determinate progress over indeterminate whenever possible; do work optimistically and reconcile in the background.

**35. Anecdote beats data; stories beat statistics.** People process narratives more deeply and remember them longer. Rule: lead with the concrete case ("Maria's team shipped 2× faster"), support with the number; structure onboarding and marketing pages as a story (situation → struggle → resolution) rather than a feature matrix.

## Ethical line

Weinschenk's findings describe how people work; several (scarcity, variable rewards, loss aversion, commitment escalation) power dark patterns when aimed at the business's goal instead of the user's. Rule of thumb: a technique is legitimate when it helps users do what they already came to do faster and with more confidence; it is a dark pattern when it manufactures a goal, hides a cost, or exploits a bias against the user's interest. An assistant applying this file should refuse the latter framing and propose the honest equivalent.

## Quick audit checklist

- [ ] Grouping by proximity/similarity is deliberate; no accidental groups; one treatment per role
- [ ] One focal point per screen; passes the squint test; nothing important styled like an ad
- [ ] No screen requires remembering anything from a previous screen; recognition over recall throughout
- [ ] Headings/links front-loaded with keywords; UI copy ~grade 6–8; buttons are verbs
- [ ] ≤5 options per decision; sensible safe defaults everywhere; big decisions split into small ones
- [ ] Undo over confirm; inputs constrained; error states simplified and tunnel-vision-friendly
- [ ] Progress visible with a head start; first asks tiny; lazy path = correct path
- [ ] Frequent actions big and near (thumb zone / edges); rarely-needed complexity progressively disclosed
- [ ] Waits made determinate/occupied (skeletons, progress); copy human and story-led
- [ ] Every persuasion technique passes the ethics test: helps the user's existing goal, hides nothing
