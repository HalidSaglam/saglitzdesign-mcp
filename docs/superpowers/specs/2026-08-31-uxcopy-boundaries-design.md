# `audit_ux_copy` — boundaries and a disclosure list

**Date:** 2026-08-31 · **Target:** v0.28.0 · **Status:** approved

## The problem, measured

`src/uxcopy.ts` is 107 lines and matches three word lists three different ways.
All three are wrong, and two of them are the exact vacuity the v0.27.0 package
spent four fix rounds removing from the **test suite** — live in `src/`, shipped,
and user-facing.

| list | line | mechanism | measured false positives |
|---|---|---|---|
| `FILLER` | `:55` | `lower.includes(f)` — **no boundary at all** | `just` → adjust, adjusted, adjustment, justify, justified · `very` → every, everyone, delivery, recovery |
| `WEAK_CTA` | `:60` | `startsWith(c)` | `ok` → okay · `go` → government, going · `enter` → entered, entering · `continue` → continued · `submit` → submitted |
| `JARGON` | `:54` | `` `\b${j}\b` `` | 5 of 22 entries are hyphenated, so `cutting-edge` matches inside `non-cutting-edge` — a phrase meaning the opposite |

`FILLER` is the worst: `just` and `very` are substrings of ordinary English.

## The second defect: nothing is disclosed

Seven tools declare a `notVisible` list in their `outputSchema` — `design_lint`,
`audit_project`, `audit_security`, `audit_generic_design`, `audit_seo_geo`,
`audit_performance`, `audit_apple_ui`. `audit_ux_copy` declares none, and
returns markdown only: no `outputSchema`, no `structuredContent`.

So its limits are named nowhere, and an agent cannot chain its findings the way
it can chain every other auditor's.

**This decides the scope.** `tests/integrity.test.ts:641` asserts set equality
between the tools whose live `outputSchema` mentions `notVisible` and the rows
of `ship-quality-gate`'s table. A prose-only disclosure would not enter that set
— it would be an eighth disclosure that nothing holds, sitting beside seven that
are held. The guarded form is the only coherent one.

## What ships

**1. Three boundary fixes.** Each list matched by the same rule: the entry is
bounded by characters that cannot be part of it. Multi-word entries (`please
note`, `in order to`, `click here`) must keep working — the boundary is at the
ends of the phrase, not at each space.

`WEAK_CTA`'s `startsWith` is **deliberate and stays**: "Submit form" is a weak
CTA and should fire. What is missing is a boundary after the match, so `go`
matches `Go now` and not `Government portal`.

**2. `UXCOPY_NOT_VISIBLE`, an `outputSchema`, and `structuredContent`** — the
shape the other seven use, via the existing `auditStructuredFrom` /
`renderNotVisibleSection` helpers rather than a new one.

**3. The `ship-quality-gate` row the guard will demand.** Adding the eighth
disclosure tool makes `tests/integrity.test.ts:641` fail until the skill's table
names it. That is the guard working, not an obstacle.

## What the disclosure must say

Written from what the code does, not from what a copy auditor sounds like it
should do. At minimum, each verified before it is written:

- The lists are **closed**: jargon, filler and weak CTAs not on them are not
  found, and the lists are English-only.
- `isLikelyCta` is `wordCount <= 5 && sentCount === 1`, so a longer weak CTA is
  never tested as one.
- Readability is Flesch/Kincaid over a **syllable heuristic**, not a dictionary.
- Passive voice is a regex over `be` + a participle ending in `ed`/`en`, so
  irregular participles are missed and the false positives that shape admits are
  ours.
- Whatever the three boundary fixes still cannot see, stated after they are
  written rather than guessed at now.

## Out of scope

Expanding the word lists; a dictionary-based syllable count; a real
part-of-speech pass for passive voice. Each is a different tool, not a fix to
this one.
