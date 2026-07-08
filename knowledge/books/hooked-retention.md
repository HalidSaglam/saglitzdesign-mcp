---
id: hooked-retention
title: "Hooked & Habit Design — Retention Mechanics for Apps"
category: book
platform: mobile
tags: [retention, habits, onboarding, notifications, engagement, ethics]
sources: ["Hooked (Nir Eyal)", "Indistractable (Nir Eyal)"]
updated: 2026-07-08
---

# Hooked & Habit Design — Retention Mechanics for Apps

Eyal's Hook Model: products form habits by cycling users through **Trigger → Action →
Variable Reward → Investment**. Each pass strengthens the association between the user's
internal itch and your product as the scratch. Habits form when a behavior occurs with
enough **frequency** and **perceived utility**; low-frequency products (used monthly or less)
should NOT chase habit loops — they need scheduled-trigger retention instead (see Part 4).

**Foundational question before designing any loop (Eyal's own test):** Does the product
materially improve the user's life, and would the maker use it themselves? Habit design on top
of genuine value = facilitation. Habit design substituting for value = exploitation.

---

## Part 1 — The Four Phases, Applied

### Phase 1: Trigger

**External triggers** (designer-controlled) start the loop; **internal triggers** (emotions,
routines, situations) sustain it. The endgame: the user's own feeling — boredom, uncertainty,
FOMO, loneliness, "did anyone reply?" — cues the app without any notification.

Design rules:
- Identify the target internal trigger FIRST and write it down: "When the user feels [emotion/
  situation], they open [app] to [relief]." All external triggers should rehearse exactly that pairing.
- External trigger ladder (move users up it):
  1. **Paid** (ads — acquisition only, never retention economics),
  2. **Earned** (press, featuring — spiky, unreliable),
  3. **Relationship** (invites, shares — the only viral trigger; design share moments at peak-reward points),
  4. **Owned** (notifications, email, badges, home-screen icon — requires permission, drives the habit).
- Notification design: every notification must carry the internal trigger's payload — information
  the user actually itched for ("Anna replied"), not the app itching for the user ("We miss you!").
- Time notification permission requests: ask AFTER demonstrating one clear reward moment, with a
  pre-permission screen explaining the specific value ("Get notified the second a client pays you").
  Never ask on first launch — a denied iOS prompt is nearly unrecoverable.

### Phase 2: Action

The simplest behavior done in anticipation of reward (open app, pull to refresh, tap a card).
Fogg's model governs it: Behavior happens when **Motivation + Ability + Prompt** converge.
Ability (simplicity) is the cheapest lever — simplicity along six factors: time, money, physical
effort, brain cycles, social deviance, non-routineness.

Design rules:
- Count the steps from trigger to reward; remove every removable one. Each screen, field, or
  decision between notification-tap and payoff bleeds users.
- The core action should be doable in seconds: one thumb, no typing where a tap will do,
  defaults over choices.
- Cold-start rule: the app must show something rewarding even before the user has data/friends
  (curated content, sample project, instant demo mode).
- Login friction is habit poison: biometric auth, magic links, stay-signed-in by default.

### Phase 3: Variable Reward

Predictable rewards get boring; variability sustains engagement (the slot-machine mechanic —
and precisely where ethical risk concentrates). Three reward types; strong products combine two or three:

- **Rewards of the Tribe** (social): likes, replies, mentions, leaderboard moves, community
  recognition. Variable because people are variable.
- **Rewards of the Hunt** (resources/information): feeds, search results, deals, new content,
  matching (jobs, dates, flights). Variable because the next scroll might be the good one.
- **Rewards of the Self** (mastery/completion): streaks, levels, inbox-zero, skill progress,
  personal records. Variable because your own performance varies.

Design rules:
- Map your product's natural reward type; don't bolt on foreign ones (badges on a tax app = noise).
- Preserve genuine variability: perfectly predictable digests train ignoring; overly random
  feeds train distrust. The reward must stay connected to what the user came for.
- **Autonomy requirement:** rewards must arrive within the user's chosen pursuit. Users who feel
  controlled (reactance) abandon; frame everything as serving their goal, not the metric.
- Finite-use rule: give the loop natural stopping points (caught-up markers, "you're all done"
  states). Infinite variability without closure is the manipulation signature.

### Phase 4: Investment

The user puts something IN — effort, data, content, reputation, followers, money — which
(a) improves the product for them (stored value), and (b) loads the next trigger.

Stored-value mechanics (each raises switching costs honestly, by making the product better):
- **Content**: playlists, boards, notes, uploaded files.
- **Data**: preferences, history, training the recommendations ("the more you use it, the better it gets").
- **Followers/reputation**: audience, reviews earned, karma, verified status.
- **Skill**: learned workflows, shortcuts, mastery of the tool.
- **Customization**: configured dashboards, integrations connected, routines set.

Design rules:
- Ask for investment AFTER the variable reward, never before — reciprocity plus the moment of
  peak satisfaction ("Loved that workout? Save it to your plan").
- Keep each investment tiny; sequence them across sessions (bit of profile now, one preference next time).
- Load the next trigger inside the investment: following someone creates future notifications;
  setting a goal creates future progress alerts; posting invites future replies.

---

## Part 2 — Onboarding as Hook Rehearsal

Onboarding's job: run the user through ONE full hook cycle as fast as possible, and identify
your "aha" action (the behavior correlated with retention) — then design onboarding to cause it.

Prescriptive sequence:
1. **Promise recall** (screen 1): restate the outcome that made them install — in their words, one line.
2. **Personalize as commitment**: 1-3 quick-tap questions ("What's your goal?") — investment
   that tailors the first reward AND commits the user (see influence-persuasion.md).
3. **First reward within ~60 seconds**: deliver a real taste of the core reward before any
   account wall where the platform allows; if signup must come first, make it 1-tap (Apple/Google).
4. **Permission asks in context**: notifications after first reward; other permissions at the
   moment of relevant use, each with a value-framed pre-prompt.
5. **First investment**: one small act of stored value (save, follow, connect, configure) before
   session 1 ends — users who invest in session 1 return at far higher rates.
6. **Load the return trigger**: end session 1 with a reason to come back that the USER set
   ("We'll remind you Tuesday — your chosen practice day").
- Day 1-7 lifecycle: each early notification/email should re-run the loop toward the aha action,
  not announce features. Kill generic "welcome day 3" content.

---

## Part 3 — Notification & Engagement Ethics

Notifications are borrowed attention; the budget is small and non-refundable.

Rules:
1. **User-value test per notification type:** would the user thank you for this interruption?
   "Your ride is here" passes. "Someone might have posted" fails.
2. **Granular controls, honest defaults:** per-category toggles, easy mute/snooze, digest options.
   Defaulting everything ON and burying settings is a dark pattern that buys short-term DAU with
   permission-revocation and uninstalls.
3. **Respect rhythm:** quiet hours by default, timezone-aware, frequency caps per day. Batch
   low-urgency items into digests.
4. **No fabricated urgency or social pressure:** fake "X is waiting for you," ghost activity,
   streak-shame notifications ("Don't lose your streak!" at 11pm targets anxiety, not value).
5. **Re-permission gracefully:** if a user ignores 10 in a row, offer to reduce frequency —
   voluntary retention beats resented retention (resentment shows up as uninstall, not as a metric you watch).

**Streaks & gamification ethics:** streaks reward showing up (fine) but punish life (not fine).
Ethical versions: streak freezes/repair, weekly targets instead of daily perfection, celebrate
totals not just consecutive runs. If missing a day produces guilt disproportionate to the
product's value, the mechanic is extracting, not serving.

---

## Part 4 — When Habit Loops Are Appropriate vs. Manipulative

**Eyal's Manipulation Matrix** — two questions: Does it materially improve the user's life?
Would the maker use it themselves?

| | Maker uses it | Maker wouldn't use it |
|---|---|---|
| **Improves life** | **Facilitator** — build hooks confidently | **Peddler** — you're guessing; validate before hooking |
| **Doesn't improve life** | **Entertainer** — fine, but fleeting; keep monetization honest | **Dealer** — exploitation; do not build |

**Use full habit loops when:** the product's value genuinely compounds with frequent use
(fitness, learning, communication, finance tracking, creative tools) AND natural frequency is
weekly-or-better. Habit here = user's goal achieved with less friction.

**Do NOT use habit loops when:**
- Natural frequency is low (tax software, booking, insurance). Chasing DAU here produces spam.
  Instead: **scheduled-trigger retention** — calendar-based re-engagement at genuinely relevant
  moments ("your renewal is in 30 days"), excellent transactional messaging, and being flawlessly
  findable at the next need (SEO/App Store presence as the "trigger").
- Engagement is the cost, not the value (the user's goal is to spend LESS time — automation,
  utilities). Retention metric should be task success + return-at-need, not session length.
- The variable reward drifts from user goals to pure time-on-app (infinite feeds without
  caught-up states, autoplay chains, engagement-bait recommendations). That's the Dealer quadrant.

**Red flags an implementation crossed the line:**
- Users report regret after sessions ("I wasted an hour") — regret is the anti-metric of ethical habit design.
- Loops rely on anxiety (FOMO mechanics, decaying scores, expiring streaks) rather than reward.
- Removing the mechanic would drop engagement but users would be happier.
- You track and celebrate metrics you would hide from users.

**Disengagement design (mark of a Facilitator):** caught-up states, session summaries, usage
insights, easy pause/export/delete, one-tap unsubscribe. Products confident in their value make
leaving easy — which itself builds the trust that keeps people.

---

## Quick-Reference Checklist (per feature/loop)

1. Internal trigger named and written down? (emotion → app → relief)
2. Steps from trigger to reward minimized? (count them)
3. Reward type matches product nature (Tribe/Hunt/Self)? Genuine variability with stopping points?
4. Investment asked after reward, tiny, and loads the next trigger?
5. Notification passes the "would they thank you" test, with honest defaults and controls?
6. Manipulation Matrix quadrant = Facilitator (or consciously Entertainer)?
7. Frequency fit: is this a habit product, or should it use scheduled-trigger retention instead?
8. Regret check: would heavy users endorse their own usage pattern?
