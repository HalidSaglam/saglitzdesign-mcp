---
id: fintech-trust
title: "Fintech Design — Trust, Money Data & Sensitive Flows"
category: pattern
platform: both
tags: [fintech, finance, trust, money, kyc, security, transactions]
sources: ["https://www.nngroup.com/articles/trustworthy-design/", "https://www.nngroup.com/articles/progressive-disclosure/", "https://baymard.com/checkout-usability", "https://stripe.com/guides/strong-customer-authentication", "https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html", "https://developer.apple.com/design/human-interface-guidelines/privacy", "https://m3.material.io/foundations/content-design/style-guide", "https://www.w3.org/WAI/tutorials/forms/"]
updated: 2026-07-23
---

# Fintech Design — Trust, Money Data & Sensitive Flows

In a finance app, trust is the product. A user hands you their identity, their money, and their assumption that a displayed number is correct — and every one of those is revocable the instant the interface feels careless, opaque, or wrong. This doc is prescriptive: how to earn and keep that trust through security cues, honest money display, low-friction-but-rigorous verification, and calm handling of high-stakes actions where a single misread digit or accidental tap has real financial consequences. Nothing here is legal advice; treat regulatory display as a design constraint you implement with counsel, not a spec you invent.

## Trust as the core currency

Trust is built from thousands of small consistencies, not one hero badge. Design for it deliberately:

- **Credibility signals, earned not claimed.** Show what a user can verify: the legal entity name, the regulator/registration where you are actually licensed, deposit-protection scheme membership (e.g. FSCS/FDIC-equivalent) *only where it genuinely applies*, and a real support channel with a human path. A padlock glyph proves nothing; a working "Contact us" and a status page prove a lot.
- **Transparency over reassurance.** State fees, exchange rates, transfer timing, and who holds the money *before* the user commits, not in a footnote after. Surprise is the fastest way to lose a finance user ([[ethical-design]]).
- **Consistency reads as safety.** Stable navigation, unchanging money formatting, and predictable confirmation flows all say "this system is under control." Visual polish matters here beyond aesthetics — sloppy alignment or a mis-rounded total makes users doubt the ledger behind it.
- **Compliance display, done plainly.** Regulatory disclosures (risk warnings, APR, "capital at risk," licensing statements) must be legible, not buried in 8px grey. Present the required text at a real reading size, near the action it governs — a disclosure the user cannot read protects no one and signals contempt.

## Onboarding & KYC

Identity verification (KYC/AML) is unavoidable friction — the goal is to make it feel purposeful, not hostile. See [[onboarding-permission-priming]] for priming high-cost asks.

- **Explain the "why" at the moment of the ask.** Before requesting an ID scan or SSN, say plainly why it is required ("Regulations require us to verify your identity before you can move money") and what happens to the data. Users tolerate friction they understand.
- **Progressive disclosure of the burden.** Let people explore value before hitting the hardest steps. Collect identity data in the smallest sequential chunks that make sense, with a visible step indicator ([[progressive-disclosure]] via [[onboarding-permission-priming]]). Never dump a 20-field compliance form on screen one.
- **Reduce document-capture drop-off.** ID/selfie steps are the biggest bleed point. Use live camera guidance (edge-detection frame, "hold steady," glare/blur warnings), auto-capture over manual, and instant client-side quality checks so users fail fast and retry, rather than submitting a blurry photo and waiting minutes for a rejection.
- **Save state and allow resume.** Verification often stalls (user must find a document, waits on a review). Persist progress, support pause/resume, and communicate async review status honestly ("Usually under 2 minutes" — and mean it). Never silently reset a completed step.
- **Design the pending and rejected states first.** "Under review" and "We couldn't verify this" are core screens, not edge cases. Give a specific, non-blaming reason and a concrete next action ([[forms-inputs]]).

## Displaying money

Money display is where correctness and craft meet. Getting a number wrong — even visually — is a trust-ending event.

- **Never truncate or clip an amount.** A balance must always render in full. Design containers that grow or wrap; never let `$1,240,…` or an ellipsis eat a digit. Reserve width for the largest plausible value and for multi-currency symbols.
- **Use tabular (monospaced) figures for all amounts.** Enable `font-variant-numeric: tabular-nums` so digits share a fixed advance width. This makes columns of numbers align cleanly and stops values from "jumping" as they update. **Right-align numeric columns**, decimal-aligned, so magnitudes compare at a glance ([[data-visualization]]).
- **Format per locale, correctly.** Currency symbol placement, grouping separators, and decimal marks vary by locale — use the platform's number/currency formatter (e.g. `Intl.NumberFormat`), never hand-rolled string concatenation. Show the currency code (USD, EUR) whenever more than one currency is in play, or when ambiguity is possible ($ ≠ US$).
- **Rounding is a policy, not a display choice.** Compute in minor units (integer cents) to avoid floating-point drift; round only for display, and make displayed rounding consistent with the actual charged/settled amount. If you round a total for readability, ensure the components still sum to it — visible arithmetic that doesn't add up destroys trust.
- **State: positive, negative, pending, zero.** Distinguish credits, debits, and pending/held funds with more than color. Use an explicit sign or label (`+£20.00`, `−£20.00`, "Pending"), and never rely on red/green alone to carry gain/loss ([[accessibility]], [[color-systems]]). A zero or empty balance deserves a deliberate, calm treatment, not a bare "0".

## Transactions & statements

The transaction list is the app's ledger of record — it must be scannable, searchable, and unambiguous. See [[data-visualization]] for density and table craft.

- **One row, three anchors.** Each transaction reads left-to-right as *who/what* (merchant, with icon/logo), *when* (date), and *how much* (right-aligned, signed amount). Keep the amount the strongest element in the row.
- **Running balance where it helps.** For accounts (not cards), an optional running-balance column lets users reconcile. Make it toggleable; it adds density that some users want and others find noisy.
- **Filter, search, and categorize.** Provide search (merchant, amount, note), date-range and type filters, and clear category tags. Auto-categorization must be *editable* — users will correct it, and letting them builds trust in the numbers.
- **Detail, receipt, and dispute paths.** Tapping a transaction opens full detail: exact timestamp, status, fees, FX rate applied, reference/ID, and a "Report a problem / dispute" affordance. Attach receipts where possible.
- **Density with breathing room.** Finance users scan long lists; support comfortable and compact modes, sticky date/month headers, and clear separation between settled and pending sections.

## Sensitive actions: transfers, payments, confirmations

Moving money is often irreversible. Design these flows to slow the user down *just enough* to be sure, without inducing anxiety ([[ethical-design]]).

- **Review-before-commit is mandatory.** Every transfer/payment ends on an explicit review screen restating recipient, exact amount, currency, fees, arrival time, and source account. This is the last honest chance to catch a wrong digit — make it prominent, not a formality.
- **Confirm high-value or new-payee actions harder.** Step up authentication (biometric/passkey or 2FA) for first-time payees, large amounts, or changes to security settings. Strong Customer Authentication (SCA) requires two independent factors for many payments — treat it as a UX layer, not just a compliance checkbox.
- **Undo windows where the rail allows.** If a transfer can be canceled before it settles, offer a clearly-timed "Cancel this transfer" window. Don't fake reversibility you don't have.
- **Warn precisely about irreversibility.** When an action truly can't be undone (crypto send, instant push payment, wire), say so in plain words at the point of action — "This can't be reversed once sent" — and require a deliberate confirm. Never confirmshame or rush it.
- **Guard against fraud coercion.** For risky transfers, calm, specific warnings ("Is someone asking you to move this money?") reduce authorized-push-payment scams without treating the user as a suspect.

## Data viz for finance

Charts for balances, spending, and portfolios must inform, never flatter. Honesty here is a compliance and trust issue, not just taste ([[data-visualization]]).

- **Axis honesty.** Baselines for bar charts start at zero. If a line chart uses a non-zero axis to show detail, label it clearly and never use it to exaggerate a gain. Never invert or truncate axes to make performance look better.
- **Show loss as plainly as gain.** Portfolio and P/L views must render down-periods with equal clarity. Pair color with sign, arrows, or labels so gain/loss survives grayscale and colorblind vision ([[accessibility]]).
- **Encode uncertainty and time honestly.** Distinguish actual vs projected balances; mark pending/settled; state the time range and whether figures include fees. Round consistently between chart and underlying table.
- **Don't over-visualize.** A precise number often beats a chart. Use viz for trends and comparison, exact figures for the numbers that matter.

## Security UX

Security should feel like the default, not a chore the user opts into.

- **Biometric / passkey first.** Offer Face ID / fingerprint / passkeys for unlock and step-up, with a reliable fallback (PIN/passcode) — never biometric-only. Follow platform privacy conventions for how you request and explain it ([[onboarding-permission-priming]]).
- **Mask sensitive data by default.** Hide full card numbers, account numbers, and balances by default where shoulder-surfing is a risk; provide an explicit reveal (tap-to-show, auto-re-mask). Never log or copy full PANs to analytics.
- **Session timeout, gracefully.** Auto-lock after inactivity and on backgrounding; on return, restore context so the user isn't dumped to home. Warn before timing out mid-flow so in-progress input isn't lost.
- **Secure by default.** Notifications for every money movement and every security-setting change, opt-out not opt-in. Device/session management screen. No sensitive data in screenshots/app-switcher previews (blur on background).

## Errors & empty states in a high-stakes context

A wrong number matters, so errors must be precise and recoverable ([[forms-inputs]], [[ux-writing]]).

- **Never guess or silently fail on money.** If a balance or transfer status can't be loaded, say so explicitly ("Couldn't load your balance — tap to retry") rather than showing a stale or zero value that the user might act on.
- **Validate money input inline and specifically.** "Amount exceeds available balance" beats "Invalid input." Prevent malformed amounts (letters, negative, too many decimals) at entry.
- **Empty states set expectations.** A new account with no transactions should explain what will appear and reassure ("Your transactions will show here"), not read as an error or a bug.
- **Fail safe, not silent.** For any ambiguous outcome ("Did my payment go through?"), give a definitive status and a way to check — never leave the user guessing about money.

## Accessibility for finance

Finance is high-stakes for everyone, and inaccessible finance excludes people from their own money ([[accessibility]]).

- **Screen readers must speak amounts correctly.** Ensure `−$1,240.50` is announced as "minus one thousand two hundred forty dollars and fifty cents," not "dash dollar one two four zero." Use proper markup, `aria-label` with a spelled-out value where needed, and test with VoiceOver/TalkBack.
- **Color-independent gain/loss.** Every up/down, credit/debit, positive/negative distinction must carry a non-color cue — sign, icon, or text (WCAG 1.4.1 Use of Color).
- **Contrast and target size.** Money and disclosures meet WCAG contrast minimums at real sizes; confirm buttons meet target-size guidance — a fat-finger tap on a live transfer is expensive.
- **Focus order and error association.** In transfer forms, keyboard focus order is logical and errors are programmatically tied to their fields.

## Tone: calm, precise, reassuring

Voice in finance is part of the security model ([[ux-writing]]).

- **Calm and factual, never hype.** "Your transfer is on its way. It'll arrive by Thursday." Not "🎉 Woohoo, money sent!!" Excitement around someone's money reads as unserious.
- **Precise about time and money.** Prefer concrete statements ("Arrives by 5pm Thursday," "£2.50 fee") over vague ones ("soon," "small fee").
- **Reassure without over-promising.** Acknowledge waits and reviews honestly; don't claim "instant" for something that takes a day. Own errors plainly and tell the user exactly what to do next.

## Checklist

- [ ] Legal entity, regulator/registration, and applicable deposit-protection stated where genuinely true; disclosures legible at real size near the action they govern.
- [ ] All amounts use tabular figures, right/decimal-aligned, and are never truncated or clipped.
- [ ] Currency formatting uses a locale-aware formatter; currency code shown whenever more than one currency is possible.
- [ ] Money computed in minor units; displayed rounding matches charged amount and components sum to shown totals.
- [ ] Positive / negative / pending / zero states distinguished by sign or label, not color alone.
- [ ] KYC explains *why* at the point of ask, chunks fields progressively, saves/resumes state, and has designed pending & rejected screens.
- [ ] Document capture has live guidance, auto-capture, and instant quality checks.
- [ ] Every transfer/payment ends on an explicit review screen restating payee, amount, currency, fee, and timing.
- [ ] Step-up auth (biometric/passkey or 2FA) on new payees, high values, and security-setting changes; SCA satisfied.
- [ ] Irreversible actions warn plainly in words; reversible ones offer a clearly-timed cancel window.
- [ ] Charts start bars at zero, label non-zero axes, and show loss as clearly as gain.
- [ ] Sensitive data masked by default with explicit reveal; session auto-locks with graceful restore.
- [ ] Money errors are explicit and recoverable — never a stale or zero fallback the user might act on.
- [ ] Screen readers announce amounts as spoken currency; gain/loss carries a non-color cue.
- [ ] Voice is calm, precise about time/money, and free of hype.

## Anti-patterns

- **Truncating or ellipsizing an amount** so a digit is hidden or ambiguous.
- **Proportional figures in tables** that make numbers wiggle and columns misalign.
- **Color-only gain/loss** — red/green with no sign, icon, or label.
- **Hand-rolled currency formatting** that breaks on locale, negative values, or large numbers.
- **Float arithmetic on money** producing totals whose parts don't sum.
- **Dumping the full KYC/compliance form on screen one** with no explanation of why data is needed.
- **Silent rejection** of an ID scan minutes later with no specific reason or retry path.
- **No review step** before a transfer, or a review screen so perfunctory users tap past it.
- **Faking reversibility** — implying a "cancel" exists for a rail that settles instantly.
- **Confirmshaming or rushing** an irreversible money action.
- **Dishonest axes** — truncated or inverted scales that flatter performance.
- **Micro-type disclosures** — required risk/APR/licensing text in unreadable grey.
- **Stale-value fallbacks** — showing a cached or zero balance when the real one failed to load.
- **Biometric-only auth** with no PIN fallback, locking users out of their own money.
- **Celebratory hype** around someone's money ("🎉 £5,000 sent!!").
