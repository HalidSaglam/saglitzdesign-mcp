# Extending the absence-form guard beyond the Apple knowledge documents

Written at the close of the `feat/audit-apple-ui` branch (v0.25.0), for whoever
picks this up. It is a deferred piece of work with a design already settled and
verified — recorded here so the next implementer does not re-derive it, and does
not re-litigate the one decision that looks wrong until you read why.

**Status: deferred, deliberately. Not a defect in v0.25.0.** Everything below
was measured against the tree at that release; re-run each command before acting
on it rather than trusting this file.

---

## 1. What the guard covers today, and what it does not

`tests/integrity.test.ts` defines six `ABSENCE_FORMS` regex families that reject
absolute-absence constructions — "Apple publishes no X", "<subject> never
<publication verb>", "any/every/no Apple page", and three more — with two earned
exceptions (a per-document quotation convention, and a claim whose grammatical
subject is a named page rather than Apple). The block from `WHAT THIS GUARD DOES
NOT CATCH` onward names its own blind spots, which is the standard the rest of
this file is held to.

**It runs over `APPLE_DOC_IDS` only.** Six knowledge documents. It does not read:

| Surface | Reader | Gated today |
|---|---|---|
| The six Apple knowledge documents | a person, via `get_design_doc` | **yes** |
| `CHANGELOG.md` | a person choosing whether to upgrade | no |
| `README.md` | a person choosing whether to install | no |
| The seven `*_NOT_VISIBLE` lists in `src/` | **a machine**, via `structuredContent.notVisible` | no |

The seven lists are `APPLE_NOT_VISIBLE` (`src/apple.ts`), `GENERIC_NOT_VISIBLE`
(`src/generic.ts`), `LINT_NOT_VISIBLE` (`src/lint.ts`), `SEO_NOT_VISIBLE`
(`src/seo.ts`), `PROJECT_NOT_VISIBLE` (`src/project.ts`), `PERF_NOT_VISIBLE`
(`src/perf.ts`) and `SECURITY_NOT_VISIBLE` (`src/security.ts`). That the
machine-facing surface is the ungated one is the strongest argument for doing
this work at all: it is the same asymmetry that
`describe("every surface that lists audit_security's header sources…")` exists
to catch, one layer up.

## 2. The design to use

1. **Gate the CHANGELOG entry for the version in `package.json` only** — read
   the version, slice the `## [<version>]` section, scan that. History stays
   frozen, every new entry is gated as it is written, and no shipped prose needs
   rewording to turn the check on.
2. **Gate the whole README**, which is live prose that is rewritten freely.
3. **Gate the seven `*_NOT_VISIBLE` lists**, iterating the exported arrays
   rather than the source text, so an entry built by template is scanned as the
   string a caller actually receives.
4. **Then** fix the one live sentence this turns up, by rewriting rather than by
   exempting.

Steps 1–3 are independent and can land separately. Step 4 must not be skipped —
see §4.

## 3. The one sentence it turns up, and why it is not a defect

Running all six `ABSENCE_FORMS` over `CHANGELOG.md` and `README.md` at v0.25.0
produces exactly one hit in each, and both are the same sentence:

```
src/seo.ts:1341   { rules: ["hreflang-not-reciprocal"], text: "an hreflang set that never lists the page itself" }
README.md:141     …in the audit_seo_geo tool-table row
CHANGELOG.md      …in the v0.22.0 entry, quoting the same capability table
```

It is a **true positive for the pattern and a false positive for the doctrine.**
The doctrine exists because an absence claim with an unbounded subject is
falsified by one fetch. This sentence's subject is a finite artefact inside the
user's own document, which the tool read in full — structurally the *scoped*
form the guard's own comment blesses, not the unbounded form it hunts.

Three candidate rewrites, each run against the `<subject> never <publication
verb>` pattern rather than reasoned about:

```
"an hreflang set that never lists the page itself"   HIT   -> "that never lists"
"an hreflang set with no self-referential entry"     clean
"an hreflang set that omits the page itself"         clean
```

Either clean form says the same thing. Prefer the second: `omits` keeps the
sentence's shape and reads the way the finding message does.

## 4. Two decisions that will look wrong later, recorded with their reasons

**Do not add an exemption for the hreflang sentence.** An opt-out list is the
one thing a guard whose entire value is having no opt-outs cannot afford: this
project's characteristic defect is a check that reads as a guarantee and is not,
and the first exemption is what converts this guard into one. Rewrite the
sentence instead. It costs one word.

**Do not gate the markdown without also gating the `*_NOT_VISIBLE` strings in
source.** The hreflang sentence lives in `src/seo.ts` and is *rendered* into
both the README row and the tool description; a guard extended to markdown alone
would report the rendering and leave the source it came from unchecked, and
would go green the moment the README was reworded while the shipped string
stayed wrong. That is a half-gate of exactly the kind this project keeps paying
for.

## 5. Why it was not done in v0.25.0

The release was cut and green, and step 4 means editing prose shipped in
v0.22.0. Doing that inside a release commit whose subject is a different feature
would bury a doctrinal change in a feature diff. It is small, it is specified
here, and it wants its own commit.
