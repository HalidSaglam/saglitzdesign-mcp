# Apple knowledge and a tiered source standard — design

**Date:** 2026-08-15
**Target release:** v0.24.0
**Status:** approved, ready for implementation

## Why

The server was used on a real macOS app and the agent's own reading found design
gaps it did not report. The measured cause was not thin knowledge — **no auditor
reads `.swift` at all**, so the server can generate SwiftUI (`Tokens.swift`,
Swift recipes, SwiftUI motion) and cannot check what it generated. The "design +
ship quality gate" positioning stops at the web boundary, and that boundary is
invisible to anyone who asks the server about an app.

Closing it needs an auditor. This package is not that auditor. It is the
knowledge the auditor will cite, and the sourcing standard that makes the
citation worth anything.

## The rule that shapes the whole design

**Write the document before the rule it backs.**

The security package paid for this lesson and it is recorded: verifying claims
against live sources corrected three planned rules before a line of tool code
existed — an absent `Referrer-Policy` is not a finding, browsers imply `noopener`
on anchors while `window.open()` still does not, and Next.js 16 renamed
`middleware.ts` to `proxy.ts`.

The Apple documents are currently half blog-sourced. Writing rules against them
would bake that in, and a rule whose `doc` points at a document that does not
make its claim is the exact defect the generic-design package found and fixed on
its own branch. So the documents come first, and they come with their sources
verified.

## What the measurement showed

Enforcing the existing allowlist across the whole knowledge base:

- **81 documents. 57 would fail.** 150 unpermitted hosts, 336 citations.

That number is misleading in a way worth stating, because it changes the work.
The largest "offenders" are `developer.apple.com` (68 citations),
`m3.material.io` (19), `developer.android.com` (13), `fluent2.microsoft.design`
(6), `tailwindcss.com` (6), `ui.shadcn.com` (4), `designtokens.org` (4),
`lucide.dev` (3), `heroicons.com` (3), `learn.microsoft.com` (3). These are
first-party documentation of the systems being described — precisely what the
allowlist's own comment calls permitted ("traceable to a standard or a
first-party vendor doc"). They fail only because the list was written for the
security category, whose sources are standards bodies.

So the work is not "fix 57 documents". It is: name the tiers the list always
implied, admit the vendor docs, and migrate the genuinely blog-tier remainder.

## The tiered allowlist, enforced on every document

Three tiers, and the tier carries meaning rather than merely granting passage:

| Tier | What it is | Examples |
|---|---|---|
| `standard` | Standards bodies and regulators | `w3.org`, `whatwg.org`, `datatracker.ietf.org`, `edpb.europa.eu`, `cppa.ca.gov`, `kvkk.gov.tr` |
| `vendor` | First-party documentation of the system being described | `developer.apple.com`, `developer.android.com`, `m3.material.io`, `learn.microsoft.com`, `fluent2.microsoft.design`, `tailwindcss.com`, `ui.shadcn.com`, `lucide.dev`, `heroicons.com`, `designtokens.org`, `rsms.me`, `figma.com`, `nextjs.org`, `svelte.dev` |
| `research` | Organisations publishing original research | `nngroup.com`, `baymard.com`, `lawsofux.com` |

Everything else fails, and is replaced with a primary equivalent or the claim it
backed is removed.

**`research` carries an obligation the other two do not.** A document citing a
research source must attribute it in the prose — "NN/g's research found …", not
"the rule is …". A usability finding and a specification are different kinds of
claim, and a reader deciding whether to follow advice needs to know which one
they are being handed. This is enforced by a test, not left to good intentions.

**Security keeps the stricter line.** Documents in the `security` category may
cite `standard` and `vendor` only. A security claim resting on research-tier
sourcing would be a regression, and the whole reason that allowlist exists is
that blog-tier sourcing is how confidently-wrong security advice spreads.

**The test flips last.** Extending the assertion from `category === "security"`
to every document makes 57 documents its subject at once. The migration lands
first; the widened test lands with the commit that makes it pass. A package that
breaks its own net teaches nothing.

## Apple knowledge, sized to what the auditor will need

The three current documents total roughly 500 lines and cannot back the four rule
areas the auditor will cover. Two new, three deepened:

| Document | State | What it will have to back |
|---|---|---|
| `apple-accessibility` | **new** | Dynamic Type, VoiceOver labelling, tap targets, Reduce Motion, contrast |
| `macos-app-design` | deepen | menu bar, windows, toolbars, keyboard, sidebar/inspector |
| `ios-app-design` | deepen | navigation, tab bars, orientation, widgets |
| `apple-hig-liquid-glass` | re-source | the current design language |
| `apple-shipping-readiness` | **new** | `Info.plist` purpose strings, entitlements, sandbox, icon sets |

Every Apple document must carry at least one `developer.apple.com` source. The
13 blog-tier Apple citations found in the current three — `createwithswift.com`
(4), `daringfireball.net`, `macrumors.com`, `zenn.dev`, `pfandrade.me`,
`evilmartians.com`, `conor.fyi`, `blakecrosley.com`, `appfollow.io` and the rest
— are replaced with their primary equivalents or dropped with the claims they
supported.

## Myth-checks are part of the deliverable

House style since the security package, and load-bearing here because the
auditor's rule-writer will carry web intuitions into a platform where they are
wrong. Each document records the mistakes a reader is likely to arrive with.

The first one is already known: **`Text("Hello")` in SwiftUI is already
localizable** — the literal is a `LocalizedStringKey` by default. A "hardcoded
string" rule written from web instinct would flag correct code.

Documents state what is true, and name the plausible wrong belief beside it.

## Scope

**In:** the tiered allowlist and its enforcement across all 81 documents; the
source migration; two new Apple documents; three deepened or re-sourced ones;
myth-checks.

**Out:**

- **`audit_apple_ui`.** The auditor is package E2. No rule, no tool, no
  `.swift` scanning lands here.
- **Rewriting non-Apple documents' prose.** Where a non-Apple document cites a
  source that fails the new tiers, the citation is replaced or the claim it
  backed is removed — that is source work, not a rewrite.
- **Fetching anything at runtime.** The server stays offline. Sources are
  verified while writing, and the `updated:` date records when.

## Testing

- The allowlist assertion runs over **every** document, not the `security`
  category alone.
- A test that each source's host resolves to exactly one tier, so a host cannot
  be silently promoted by being listed twice.
- A test that a document citing a `research` host attributes it in the prose.
- A test that `security`-category documents cite `standard` and `vendor` only.
- A test that every Apple document carries at least one `developer.apple.com`
  source.
- The existing per-document minimum of three sources continues to hold.

## Out of scope for this spec, tracked

Package E2 (`audit_apple_ui`), the skill layer that follows it, package D2
(generators, measurers, knowledge-reader metadata), the knowledge freshness
sweep, and `audit_project` integration for the newer auditors.

Seven disclosure sentences known to be false remain open in
`SECURITY_NOT_VISIBLE` and `GENERIC_NOT_VISIBLE`, deferred from v0.23.0 with a
scoping note: they should be closed as one "un-pin and demonstrate" task rather
than as eight sentence edits.
