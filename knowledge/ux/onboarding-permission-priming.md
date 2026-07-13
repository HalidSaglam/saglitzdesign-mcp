---
id: onboarding-permission-priming
title: "Onboarding & Permission Priming — Activation and Asking for Permissions"
category: ux
platform: mobile
tags: [onboarding, activation, permissions, priming, notifications, att, time-to-value]
sources: ["https://developer.apple.com/design/human-interface-guidelines/privacy", "https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications", "https://developer.apple.com/documentation/apptrackingtransparency", "https://developer.apple.com/app-store/user-privacy-and-data-use/", "https://developer.android.com/training/permissions/requesting", "https://developer.android.com/develop/ui/views/notifications/notification-permission", "https://www.nngroup.com/articles/mobile-app-onboarding/", "https://amplitude.com/blog/time-to-value-drives-user-retention", "https://documentation.onesignal.com/docs/en/ios-provisional-push-notifications"]
updated: 2026-07-13
---

# Onboarding & Permission Priming — Activation and Asking for Permissions

First-run onboarding has two jobs: get the user to first value fast (activation) and earn the OS permissions your product actually needs. This doc is the activation-and-permissions companion to [[onboarding-paywall]], which covers the onboarding→paywall monetization flow — read that for hard-paywall vs. freemium sequencing and trial timing. Here we focus on time-to-value mechanics and the permission-priming pattern. See [[mobile-ux]] for platform ergonomics and [[hooked-retention]] for the notification-driven habit loop.

## Define activation before you design onboarding

Activation is not "finished the tour" or "checked every box." It is the moment the user experiences the core value — the **aha moment** — and understands the product solves their problem.

1. Name your activation event as a concrete, measurable action tied to the outcome the user came for (e.g., "created and shared first board," "logged 3 meals," "played first track"). Not "viewed dashboard."
2. Instrument it as your north-star activation metric. SaaS activation rates average ~30–36%; a 25% lift in activation can drive ~34% more MRR over 12 months.
3. Reverse-engineer onboarding backward from that event: every screen either moves the user toward it or gets cut.

## Time-to-value: target first value in under 60 seconds

Elite products deliver the aha moment in under 5 minutes; the median is far slower (industry TTV often measured in hours). On mobile, aim for **meaningful first value inside 60 seconds** of first open. Users who reach value within ~15 minutes are several times more likely to retain.

- **Defer account creation.** Let people use the product before signing up. If auth is required, offer SSO / Sign in with Apple / passkeys first and ask only for email + one factor. Push profile fields to progressive profiling (see [[conversion-ux]]).
- **Do-it, don't tell-it.** Replace passive coach-mark tours with an interactive first task the user completes for real. "Show, then let them do" beats a carousel of screenshots.
- **Progressive over upfront.** Introduce features contextually, the first time each is relevant — not as a 5-slide tour up front that users swipe past. Upfront value props are fine (1–3 slides max); upfront feature tours are not.
- **Kill setup friction.** Pre-fill smart defaults, skip optional steps, allow "Skip for now." Every required field or screen before value is a drop-off point.

## Empty states, sample data, and momentum

A blank first screen is a dead end. Design the empty state as an onboarding surface (see [[mobile-ux]] and [[ux-writing]]).

- Seed **sample/demo data** or a starter template so the product looks alive and the user learns by editing rather than creating from zero.
- Every empty state = one-line explanation + one obvious primary action. No dead ends.
- Use a **checklist / progress** widget for multi-step setup: 3–5 items, first item pre-completed to exploit the endowed-progress effect, visible completion percentage. Remove it once done — don't nag past activation.
- Celebrate the first win (subtle micro-interaction, not a blocking modal) to confirm the aha moment landed.

## The permission-priming pattern (never ask cold)

**Rule: never fire an OS permission dialog cold.** On iOS the system prompt for a given permission can typically be shown **only once** — a cold "Don't Allow" is effectively permanent and can only be reversed in Settings, where almost nobody goes. Protect that single shot with a pre-permission primer you fully control.

Sequence for every sensitive permission:

1. **Context** — user hits a moment where the permission obviously helps (just-in-time; see below).
2. **Primer screen (your UI)** — plain-language value: "Turn on notifications to get an alert when your order ships." Two buttons: "Not now" and "Turn on." This costs you nothing — a "Not now" here is reversible; you can re-ask later.
3. **System prompt** — trigger the real OS dialog **only for users who tapped "Turn on."** Users who declined the primer never burn their one system prompt.
4. **Graceful denial** — if they deny at the OS level, don't block the app. Degrade gracefully and remember the choice.
5. **Path to Settings** — later, at another value moment, show in-app messaging explaining what they're missing and deep-link straight to your app's Settings page (`UIApplication.openSettingsURLString` on iOS; app settings intent on Android).

This double opt-in structure routinely lifts opt-in rates 20–40 points versus cold prompting.

## Personalization questions: earn value, don't extract it

A short "help us set this up" survey is fine — but only if each answer visibly changes the product.

- Keep it to 1–3 questions, each with tappable choices (no free text), and a visible progress indicator.
- Every answer must **do something the user can see** (pick a goal → the app pre-loads a matching template). If an answer changes nothing, cut the question.
- Don't disguise a marketing-attribution question ("Where did you hear about us?") as personalization; if you must ask, mark it skippable and put it last.
- These screens can double as commitment escalation before a [[onboarding-paywall]] moment, but never before the user has seen any value.

## When to ask: just-in-time, tied to the feature

- Ask at the exact moment the user acts on the feature that needs it — tapping "Add photo" is when you ask for Photos, not at launch.
- **Never batch permissions at launch.** A wall of prompts on first open is the highest-denial pattern there is.
- Ask for the **minimum** permission that does the job, and only when the payoff is concrete and immediate.

## Per-permission playbook — iOS

- **Push notifications.** Two viable paths. (a) *Explicit:* prime, then request `alert/badge/sound` at a value moment (not day-one launch). (b) *Provisional:* request `.provisional` silently at first launch — notifications arrive quietly in Notification Center with no banners/sound, no dialog burned. After the user values them, prompt in-app to upgrade to full delivery. Note: once the user has explicitly allowed or denied, you can no longer switch to provisional — choose the strategy up front.
- **Location.** Request **When In Use** first, tied to a map/nearby feature. Only after the user has experienced value should you call `requestAlwaysAuthorization()` to request the **Always** upgrade — iOS grants that one-time upgrade prompt only from a prior "When In Use" state, and later re-shows a system confirmation. Never open with an Always request.
- **Camera / Microphone / Photos.** Ask at point of use. For Photos, prefer **limited photo access** (or the PHPicker, which needs no permission at all) rather than demanding full-library access.
- **Contacts.** Almost never needed at onboarding. Prime with a clear benefit ("find friends already here") and offer a manual-invite alternative; many users will (rightly) decline.
- **App Tracking Transparency (ATT).** Show a pre-prompt explaining the value exchange, then the system `requestTrackingAuthorization` dialog, at a high-value moment (e.g., after first meaningful action) — not on first launch. Apple rules: your pre-prompt may **not** offer incentives, may not imply a benefit for allowing, must not preempt or restyle the buttons, and the purpose string must be honest and match the pre-prompt. Keep the `NSUserTrackingUsageDescription` string to 2–3 plain sentences that echo the pre-prompt.

## Per-permission playbook — Android

- **Notifications (Android 13+, `POST_NOTIFICATIONS`).** Runtime permission required. Declare it in the manifest and request it — but prime first with your own rationale screen at a value moment, not on cold launch. If you target 13+ you control timing; if you target 12 or lower the system may auto-prompt on first activity launch, so raise the target and gate it yourself.
- **Location.** The dialog offers **Approximate** vs **Precise** and Allow-once / While-using / Deny. Request `ACCESS_COARSE_LOCATION` unless the feature genuinely needs precise; request background location separately and later, never bundled.
- **Rationale UI.** When `shouldShowRequestPermissionRationale()` returns true (the user previously denied once), show an explanatory screen before re-requesting.
- **"Don't ask again."** A second denial is treated as permanent — the system won't show the dialog again. From that point, your only path is in-app messaging that deep-links to the app's system Settings screen. Spend your two shots wisely by priming first.

## Re-engagement after denial

- Do **not** re-fire the system prompt in a loop — on both platforms it won't show again once permanently denied.
- Re-ask via **your own in-app UI** at a later, higher-value moment, and route "Enable" straight to the OS Settings page for your app via deep link.
- Frame around what the user gains, not what you need (see [[ux-writing]]): "Get notified the moment your ride arrives" beats "Enable notifications."

## Measuring onboarding

- **Activation rate** — % of new users who hit the activation event (set a time window, e.g., within 24h or within session 1).
- **Onboarding completion rate** and **drop-off per step** — funnel each screen to find the leak; the biggest drop is usually a permission wall or a required signup.
- **Time-to-value (TTV)** — median time from first open to activation event; drive it down.
- **Permission opt-in rate per permission** — track primer-accept and system-accept separately so you can tune the primer copy.
- **Day-1 / Day-7 / Day-30 retention** split by activated vs. non-activated to prove the activation event is the right one.
- **Segment the funnel** by acquisition source and platform (iOS vs. Android) — permission and activation behavior differ sharply, and an aggregate number hides the leak.
- A/B test one variable at a time (primer copy, step order, skip vs. required) rather than reskinning the whole flow; onboarding changes compound, so ship small and measure to activation, not to tap-through.

## Checklist

- [ ] Activation event named, instrumented, and used to scope onboarding.
- [ ] First meaningful value reachable in <60s; account creation deferred or SSO-only.
- [ ] Onboarding is "do-it" (interactive first task), not a passive tour; value props ≤3 slides.
- [ ] Empty states seeded with sample/demo data or templates; every empty state has one clear action.
- [ ] Setup checklist (3–5 items) with endowed progress; removed after completion.
- [ ] Every OS permission has a pre-primer screen; system dialog fires only after opt-in.
- [ ] All permissions requested just-in-time at the feature, never batched at launch.
- [ ] iOS push uses explicit-primed or provisional strategy (chosen up front).
- [ ] iOS Location asks When-In-Use first; Always only after value, via upgrade prompt.
- [ ] ATT pre-prompt is compliant (no incentives, no button restyling); purpose string matches.
- [ ] Android 13+ notification permission primed; targetSdk raised so you control timing.
- [ ] Denial handled gracefully with a deep link to Settings and later in-app re-ask.
- [ ] Activation rate, per-step drop-off, TTV, and per-permission opt-in tracked.

## Anti-patterns

- **Cold permission prompts on first launch** — the single biggest cause of permanent denials; burns your one iOS shot.
- **Permission wall** — stacking several system dialogs back-to-back before the user has seen any value.
- **Requesting Always location or full Photos access up front** when When-In-Use / limited / a picker would do.
- **ATT dark patterns** — offering rewards for allowing, implying a benefit, or restyling to obscure "Ask App Not to Track" (App Store rejection risk).
- **Re-firing a dead system prompt** hoping it reappears — it won't after permanent denial; use in-app + Settings deep link.
- **Upfront feature tour** — a swipe-through carousel users skip; teach features contextually instead.
- **Mandatory signup before any value** — forcing account creation on screen one tanks activation.
- **Blank empty states** with no data, no guidance, and no action — a dead end on the most fragile screen.
- **Never removing the onboarding checklist**, nagging users long past activation.
- **Optimizing tour completion instead of the activation event** — a completed tour is not value delivered.

See also: [[onboarding-paywall]], [[mobile-ux]], [[conversion-ux]], [[hooked-retention]], [[ux-writing]], [[ios-app-design]], [[android-app-design]], [[principles-heuristics]].
