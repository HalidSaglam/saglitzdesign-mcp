# `audit_apple_ui` — design

**Date:** 2026-08-16
**Target release:** v0.25.0
**Status:** approved, ready for implementation

## Why

The server was used on a real macOS app and the agent's own reading found design
gaps it did not report. The measured cause was never thin knowledge — **no
auditor reads `.swift` at all**. The server generates SwiftUI (`Tokens.swift`,
Swift recipes, SwiftUI motion blocks) and cannot check what it generated. The
"design + ship quality gate" positioning stops at the web boundary, and that
boundary is invisible to anyone who asks the server about an app.

v0.24.0 built the knowledge this auditor cites: two new Apple documents, three
re-sourced, two deepened, every claim traced to a primary source. This package
is the auditor.

## The rule that shapes the whole design

**Report what is provable. Stay silent on what is merely inferable.**

Configuration is structured data, so absence is provable there: an asset
catalog's `Contents.json` either declares a dark appearance for a colour or it
does not. Swift source is not, so it yields **presence facts only**. "This line
sets a fixed point size" is provable. "This view has no accessibility label" is
not — a modifier applied to a parent covers its children, and no line-based
reader can see that.

This is the same rule the security package arrived at — never claim an absence
you cannot prove — applied to a language where the proof is much harder to get.

## What v0.24.0 established, and this package must not relitigate

The handover at `docs/superpowers/2026-08-15-sourcing-apple-claims.md` is
binding input. The findings that change a rule's shape:

- **macOS does not support Dynamic Type.** Every Dynamic Type rule is iOS-family
  only. Firing one on Mac code would flag correct work.
- **A tab bar on macOS is not an availability violation**, and neither are
  `presentationDetents`, `swipeActions`, `refreshable` or `sensoryFeedback` —
  all exist on macOS. These may be design findings citing a HIG page; they may
  never be availability findings.
- **`Mac Catalyst` and `macOS` are distinct strings** in `platforms[].name`. A
  substring match on `Mac` marks every iOS-only symbol as macOS-available and
  finds nothing.
- **The SF Symbol defect is a *wrong* label, not a missing one.** Apple
  documents that symbols carry automatic labels; the failure Apple demonstrates
  is a raw identifier being spoken.
- **44 pt and the control-size table are different claims.** `hig/buttons` gives
  44×44 as a general hit-region rule with visionOS as its only exception;
  `hig/accessibility` gives per-platform control sizes, macOS 28×28 default and
  20×20 minimum. A 44 pt rule applied to a drawn macOS control measures the
  wrong thing.
- **`UIRequiresFullScreen` has two spellings**, and the lowercase-s form sits
  inside a `codeVoice` node — which is what a rule author copies from.
- **One Xcode checkbox, two microphone entitlements.** A rule knowing one misses
  every project configured the other way.

## Scope

**In:** a new `audit_apple_ui` tool, directory-only, returning the same
structured contract the other six auditors return.

**Out:**

- **Snippet mode.** A snippet carries no configuration, so no platform can be
  inferred and no configuration rule can run — the tool would be silent on
  almost everything while looking like it had checked. A snippet argument
  returns an error result explaining why.
- **Any claim requiring the view hierarchy at runtime**, whether a parent's
  modifier covers a child, or what a symbol's curated description actually is.
- **Rewriting the knowledge documents.** They were verified in v0.24.0; this
  package cites them.
- **Xcode project semantics beyond reading keys.** `project.pbxproj` is read for
  `INFOPLIST_KEY_*` settings and nothing else.

## Three readers

### 1. Configuration — where the rules live

Most rules belong here, because absence is provable here.

- **`Info.plist` *and* `INFOPLIST_KEY_*` build settings.** Modern Xcode projects
  frequently ship **no `Info.plist` at all**; the keys live in build settings in
  `project.pbxproj`, and localised values in `InfoPlist.xcstrings`. **A
  plist-only rule produces false positives on exactly the projects Xcode
  generates today.** Both surfaces are read. Where neither is readable, that
  goes in `notVisible` — never into a finding.
- **Entitlements** — App Sandbox and hardened runtime, and the two microphone
  identifiers that mean the same checkbox.
- **Asset catalogs (`Contents.json`)** — the most reliable rule class in the
  package. A `colorset` with no dark appearance variant is plain JSON, and the
  absence is a fact.

### 2. Swift source — presence facts only

Line-level matches that are true of the text regardless of what surrounds them:
a fixed point size, a deprecated API, a hardcoded colour literal, and the SF
Symbol case Apple itself demonstrates.

**No rule here claims an absence.** Not "this control has no label" — a parent
may supply it. Not "this file never respects Reduce Motion" — the check may be
in another file.

### 3. Platform inference — and silence when it fails

Inferred from configuration: App Sandbox in entitlements, plist and build-
setting keys, `LSMinimumSystemVersion`, `import UIKit` versus `import AppKit`,
`#if os(macOS)`.

**Where the signals conflict or are absent, no platform-specific rule runs**,
and `notVisible` says so. Given how much of the knowledge is platform-scoped,
this is the difference between a tool that is useful and one that flags correct
work.

## Output

The contract the other six auditors share, from v0.23.0: `findings`, `summary`,
`notVisible`, plus `scan` reporting what was read. `audit_apple_ui` is the
seventh auditor and speaks the same language, so an agent can dispatch on it
without knowing which it called.

## `notVisible` will be this package's longest list, and that is correct

Most of Swift is invisible to this reader: modifiers applied to a parent,
anything decided at runtime, the parts of `project.pbxproj` not read, and every
project whose platform could not be determined.

**v0.24.0's sentence rule is binding.** Write "not found in the files named,
having searched these surfaces" — never "the project does not do X". Six false
absence claims shipped in that package, each written while verifying diligently;
the defect was the sentence form, not the effort, and a test in
`tests/integrity.test.ts` now rejects the absolute form in the Apple documents.
This package's disclosure list is held to the same standard.

Every sentence is verified by constructing the case it describes and running the
tool. A sentence that cannot be demonstrated is not written.

## Testing

- **The repository's nine SwiftUI recipes are a free correct-work matrix.** They
  are written to the standard the knowledge documents describe —
  `accessibilityElement(children: .combine)`, `accessibilityReduceMotion`,
  44 pt targets. Every one must return zero findings.
- **A deliberately broken project** asserting a specific finding set, so the
  matrix proves it can tell the difference.
- **One iOS project and one macOS project**, each asserting that the other
  platform's rules stayed silent.
- **A platform-ambiguous project**, asserting that every platform-specific rule
  is silent and that `notVisible` says why. This is the fixture that stops the
  inference from guessing.
- **A project with no `Info.plist`**, keys in build settings only, asserting no
  false absence.
- Every `notVisible` sentence demonstrated by a test that builds the case and
  runs the tool.
- Every rule's `doc` id resolving to a document that makes its claim, by the
  two-way vocabulary check the generic-design package arrived at.

## Out of scope for this spec, tracked

The skill layer that follows this package; the long-tail source migration merged
with the knowledge freshness sweep; `audit_project` integration for the newer
auditors; package D2 (generators, measurers, knowledge-reader metadata); and the
seven false disclosure sentences still open in `SECURITY_NOT_VISIBLE` and
`GENERIC_NOT_VISIBLE`, to be closed as one "un-pin and demonstrate" task.
