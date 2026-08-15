# Sourcing Apple's claims — what the next implementer needs before writing a rule

Written at the close of the `feat/apple-knowledge-sourcing` branch, for whoever
builds `audit_apple_ui` (package E2) or edits the six Apple knowledge documents.

This is not a changelog. It is the set of things that cost this package a
correction to learn, each of which will cost the next one the same correction if
it is not read first. Everything below was verified against a live primary
source; where a claim rests on a specific page, the page is named so you can
re-check it rather than trust this file.

The single most useful sentence in it: **five of this package's defects were not
research failures.** Every one was verified diligently against a live page at
the time it was written. They were failures of *which surface was searched* and
of *how the sentence was formed*. Those are the two halves of this document.

---

## 1. Apple's claims live on six surfaces, and none contains the others

A fact absent from the surface you checked is not a fact Apple has not
published. This package published five false "Apple doesn't say X" claims, each
one from searching exactly one surface fewer than the fact needed.

| # | Surface | How to read it | What it uniquely holds |
|---|---|---|---|
| 1 | HIG and documentation pages | `https://developer.apple.com/tutorials/data/<path>.json` | **the specification tables** |
| 2 | API reference | same JSON form, under the correct parent path | per-symbol availability and behaviour |
| 3 | WWDC transcripts | `https://developer.apple.com/videos/play/<year>/<id>/`, read the `sentence`-classed spans | mechanisms and worked examples stated nowhere else |
| 4 | A page's own JSON metadata | `metadata.platforms[]`, `deprecatedAt`, `deprecationSummary` | deprecations invisible in the rendered page |
| 5 | Server-rendered HTML | `support.apple.com`, `developer.apple.com/help/…` — plain fetch | end-user documentation, e.g. published keyboard shortcuts |
| 6 | This repository's `knowledge/` directory | `grep` | a sibling document that already answered it correctly |

`developer.apple.com` renders client-side. A plain fetch of a HIG page returns a
`<title>` and nothing else, so **the `tutorials/data/*.json` form is not an
optimisation, it is the only way to read the page.** A path that returns the SPA
shell instead of JSON means *that path* does not exist.

**It does not mean the page does not exist, and reading it that way produced one
of the five false absences.** `prefersInterfaceOrientationLocked` returns the
shell under `documentation/uikit/uiwindowscene/` and returns real JSON under
`documentation/uikit/uiviewcontroller/` — where the document being written had
itself said the property is overridden. Before concluding a symbol is
undocumented, try the other parents it could hang from.

Surface 6 is the cheapest and was the last one anyone thought to check. One
cross-document contradiction in this package — a macOS click-target claim — was
already answered correctly by a document written earlier *in the same package*.
Grep `knowledge/` first; it costs a second.

### The extractor limit that hid ten figures

**Apple's specifications live in table nodes, not in the prose, and some table
nodes sit inside a `tabNavigator` node that a walk over the page's top-level
`content[]` never reaches.**

This is a tooling limit, not a search-effort one, and it defeated three
consecutive rounds of careful verification. HIG › Layout carries eight tvOS grid
tables inside `tabNavigator`, one per tab; a top-level walk finds none of them.
HIG › Typography's twelve per-Dynamic-Type-step tables live there too — the
iOS/iPadOS **Large (default)** step, the one every "34pt" claim depends on, is
`tabs[3]`, not top-level content.

Recurse into every `table` node wherever it sits, including inside
`tabNavigator` tabs and `row`/`column` containers. A table can be several levels
below the section that names it.

> "Absent from a grep of the prose" is not "absent from the page."

### The WWDC corpus is enumerable but not searchable

- `developer.apple.com/search/?type=Videos` is client-rendered and returns a
  shell with **zero** `/videos/play/` links. Keyword search is unusable.
- `developer.apple.com/videos/all-videos/` **is server-rendered**: one fetch
  (~4.6 MB) yields ~1,700–1,850 unique `/videos/play/<year>/<id>` URLs with
  their titles in the initial HTML.

So the workflow is: enumerate from `all-videos`, grep the titles, fetch the
candidate transcripts, read the `sentence`-classed spans. Unlike the
tutorials-data pages, transcripts are in the initial HTML.

Two claims in this package were confirmed *unpublished* rather than merely
*unfound* only because the corpus was swept this way. Until you have done that
sweep, you have not earned the word "unpublished".

---

## 2. The sentence rule — scoped, never absolute

This is the durable half. It outranks everything else here.

```
"Apple publishes no X"                 a claim about every Apple surface at
                                       once. One fetch kills it, and one did,
                                       five times.

"Not found on <pages>, having          a claim about the search. A missed
 searched <surfaces>"                  surface makes it incomplete rather than
                                       false, and correcting it means adding a
                                       page rather than reversing an assertion.
```

The two forms differ by **grammatical subject**. "Apple assigns no shortcut" has
Apple as the subject and is unbounded. "The HIG's standard-shortcut table
contains no sidebar entry" has a page as the subject and is finite, checkable
and correctable.

The evidence is not anecdotal. Within this package, a true scoped sentence was
**replaced by a false absolute one — same author, same session, same fact.** The
scoped form at `macos-app-design:359` survived four review rounds; its absolute
twin at `:200` failed on the first fetch. Three separate false absolutes were
each introduced *by the fix for the previous one*. Careful writing was tried and
did not work, which is why the form is now enforced by a test
(`tests/integrity.test.ts` › "the Apple documents state absences in the scoped
form") rather than left to diligence.

**Read that test's limits comment before trusting it.** It catches plain
absolutes, table cells and headings. It does not catch passive voice, a synonym
subject, an absolute split across two sentences, a fabricated quotation, "Apple
has no X", "Apple is silent on X", "Apple does not appear to publish X",
lowercase `apple`, or an absolute inside a fenced code block. It is a regression
guard against a good-faith author, not an adversarial filter.

**E2's disclosure list will be built almost entirely from absence claims.** Write
every one of them in the scoped form from the start.

---

## 3. Facts that change the shape of a rule

Each of these makes an obvious rule wrong. They are ordered by how much damage
the obvious version does.

### 3.1 A tab bar on macOS is not an availability violation

Neither are `presentationDetents`, `swipeActions`, `refreshable` or
`sensoryFeedback`. Verified from `metadata.platforms[]` on each symbol's own
reference page:

| Symbol | macOS since |
|---|---|
| `TabView` | 10.15 |
| `presentationDetents(_:)` | 13.0 |
| `swipeActions(edge:allowsFullSwipe:content:)` | 12.0 |
| `refreshable(action:)` | 12.0 |
| `sensoryFeedback(_:trigger:)` | 14.0 |

HIG › Tab bars adds "No additional considerations for macOS". These may be
**design** findings citing a HIG page. They may never be **availability**
findings. The quotable macOS requirement in this area is the Mac Catalyst
reachability rule: top-level items must appear in the View menu.

### 3.2 `Mac Catalyst` and `macOS` are distinct strings

In `metadata.platforms[].name` they are two different platforms. A substring
match on `"Mac"` marks every iOS-only symbol as macOS-available, and a matcher
built that way **finds nothing and looks clean**. Compare the full string.

### 3.3 macOS does not support Dynamic Type

HIG › Typography states it verbatim: "macOS doesn't support Dynamic Type."
Corroborated from a second angle — the Larger Text Accessibility Nutrition Label
lists iOS, tvOS, visionOS and watchOS, and its overview page says in prose "This
label isn't supported on Mac", while VoiceOver, Sufficient Contrast and Reduced
Motion all do list macOS.

**Every Dynamic Type rule must be iOS/iPadOS-scoped.** A shipped document once
claimed macOS gained it in Sonoma; it did not.

### 3.4 The SF Symbol defect is a *wrong* label, not a missing one

SF Symbols carry automatic default accessibility labels — WWDC21 session 10119:
"the `checkmark.seal.fill` symbol is labeled 'Verified' by default". Apple's own
worked example ends with a button initialised with "Edit Budgets" announcing
`slider.vertical.3`, because "the accessibility label is being derived from the
SF Symbol".

So the rule inverts. "Icon in a button ⇒ missing label" **false-positives on
correct code**. The checkable defect is a raw dotted identifier being spoken
aloud, and that can be an *error* rather than a suggestion.

Key on the **observable outcome**, never a presumed mechanism. Apple states the
derivation; it does not state the fallback rule, and an earlier draft of
`apple-accessibility` asserted that mechanism in three places on its own
authority.

Related, same class: SwiftUI does label some things automatically.
`.labelStyle(.iconOnly)` — "The title of the label is still used for non-visual
descriptions, such as VoiceOver" — and `Image("name")` is documented as a
*labeled* image whose label is the asset name.

### 3.5 44 pt means two different things, and they part company on macOS

- HIG › Buttons: "a button needs a hit region of at least 44x44 pt — in
  visionOS, 60x60 pt". A **hit region**, with exactly one platform exception.
- HIG › Accessibility › Mobility, in a table node: per-platform **control
  sizes**, default and minimum — iOS/iPadOS 44×44 / 28×28, macOS 28×28 / 20×20,
  tvOS 66×66 / 56×56, visionOS 60×60 / 28×28, watchOS 44×44 / 28×28.

Different measurements. On iOS they coincide, so the distinction stays invisible
until you cross to macOS — where a 44 pt rule on a drawn control **flags every
native Mac toolbar**. Apple reconciles the two pages nowhere;
`apple-accessibility` §3 names the tension rather than resolving it, and the
enforceable Mac target is a 20×20 pt control inside a 44×44 pt hit region.

Apple's force here is advisory throughout: "**Strive to meet** the recommended
minimum control size for each platform." Published figures to cite, not
thresholds the OS enforces.

### 3.6 Apple's contrast table is not WCAG 1.4.3

They do not coincide. WCAG's 3:1 band is large-scale text ("at least 18 point or
14 point bold"); Apple's row is `All | Bold | 3:1` with **no size floor**. 11 pt
bold at 3:1 passes Apple and fails WCAG.

Any E2 report must name which standard it is applying. Reporting "fails
contrast" without naming the standard is not a finding.

### 3.7 SF Text / SF Display at 20 pt is an optical size boundary

It is **not** a minimum text size, and it is exactly the kind of plausible
number a rule author repurposes as one. San Francisco interpolates continuously
between its Text and Display designs; 20 pt is where the optical master
switches.

Swept against the full transcript corpus: no per-weight minimum text size
exists, and no iOS centre-to-centre or edge-to-edge tap-target minimum exists
either. WWDC20 10640 only restates the HIG's 12 pt / 24 pt padding.

### 3.8 `UIRequiresFullScreen` has two spellings, and one of them is a trap

Measured in TN3192's raw JSON: **18 occurrences of `UIRequiresFullScreen`
(capital S)** against **1 of `UIRequiresFullscreen` (lowercase s)**. The
lowercase form sits inside a `codeVoice` node — rendered as code, which is
exactly where a rule author copies from — reading "Starting in iPadOS 26,
`UIRequiresFullscreen` and its associated compatibility mode are …".

The canonical key is capital-S: the reference page's `metadata.title` is
`UIRequiresFullScreen`, and `UIRequiresFullScreenIgnoredStartingWithVersion` and
`INFOPLIST_KEY_UIRequiresFullScreen` follow it.

**A rule matching only the lowercase form never fires, and a rule that never
fires is indistinguishable from a clean codebase.** Match both.

While you are there: the key's deprecation at **26.0** is invisible in the
rendered page and lives only in `metadata.platforms[].deprecatedAt` and
`deprecationSummary` — surface 4 above.

### 3.9 One Xcode checkbox, two microphone entitlements

Both pages live and were re-fetched:

- `com.apple.security.device.microphone` — "enable the App Sandbox capability in
  Xcode and under Hardware select Audio Input"
- `com.apple.security.device.audio-input` — "first enable the Hardened Runtime
  capability in Xcode, and then under Resource Access, select Audio Input"

Same checkbox label, two identifiers, two different capabilities. A rule that
knows one misses every project configured the other way.

### 3.10 A purpose-string rule is a lower bound, and false-positives from the plist

Both directions, and E2 needs both:

- **From source, it is a lower bound.** Third-party SDKs create the obligation
  too, so the set of purpose strings a project *needs* is larger than the set
  its own code implies. Never report "no further strings required".
- **From the plist alone, it produces false positives.** Xcode writes
  `INFOPLIST_KEY_*` build settings and `InfoPlist.xcstrings` instead of plist
  entries, so a missing key in `Info.plist` is not a missing purpose string.

Also false, and both would produce findings: not every `NS…UsageDescription` is
required (`NSLocalNetworkUsageDescription` is "should"; the Desktop/Downloads
keys are "optional, but highly recommended"), and **the App Store has no
orientation requirement** — the HIG explicitly permits a single-orientation app.

---

## 4. Two more traps worth thirty seconds each

**Finding a plausible table is not finding the right one.** HIG › Icons carries a
512/256/128/32/16 @1x+@2x list. The surrounding prose scopes it to *document*
icons, not app icons. It is right there, and taking it would have been easy and
wrong.

**A host allowlist cannot catch link rot.** `hig/navigation-bars` 404s and 301s
to `hig/toolbars`, but the host stays `developer.apple.com`, so every source
assertion passes. Fetch the citations, do not just tier them. Relatedly: a claim
you cannot put in `sources:` is a claim no test can defend — when the honest
citation has nowhere to live, fix the tier rather than the sentence.

---

## 5. What is enforced today, and what is not

`src/catalog.ts` holds `APPLE_DOC_IDS` and `isSourceEnforced`. **11 of 96
documents** have their `sources:` checked against the tiers: the six Apple
design-language guides plus the five `security` documents. The other 85 are
curated but unchecked, and 66 of them would fail today across 282 citations and
133 distinct hosts plus a bucket for 55 sources that are not URLs at all
(book titles, mostly). That migration is its own package.

Two things to know before you extend it:

1. `apple-intelligence-design` and `visionos-spatial-design` are Apple-*topic*
   documents that sit **outside** the enforced set, because the predicate keys on
   the bare `apple` tag and neither carries it. If E2 cites them, it is citing
   unvetted sources.
2. The enforcement list is pinned from both sides — it may only grow, and every
   id in it must still satisfy the predicate — so a document cannot leave
   enforcement by having its tag or its id removed. Adding an Apple document
   means adding its id, and the suite fails until you do.

---

## 6. The failure mode this project keeps shipping

A check that reads as a guarantee and is not.

It has shipped in three forms here: a guard that could not fail, a guard that
fired on correct prose, and a comment describing a guard's design at length
while never stating what it misses. The absence-form guard now carries its own
measured blind spots in the comment beside it, and the source boundary is
printed next to every document the server serves, for the same reason.

When E2 ships a rule, state what it does not check, in the place a person reads
the rule — not in a report, and not in a workspace file that gets deleted with
the branch.
