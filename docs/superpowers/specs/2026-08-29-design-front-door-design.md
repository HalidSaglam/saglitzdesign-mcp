# The design front door — spec

**Date:** 2026-08-29 · **Target:** v0.27.0 · **Status:** approved

## The problem, measured

Seven skills ship. Each is narrowly scoped by task and each carries a
description of 381–465 characters. Two competing skills installed alongside them
claim the whole design surface in one file:

| skill | trigger surface | shape |
|---|---|---|
| `impeccable` | ~1010 chars | one skill: 14 verbs, 10 page types, ~20 topics |
| `ui-ux-pro-max` | ~1080 chars | one skill: Actions / Projects / Elements / Styles / Topics |
| `frontend-design` (Anthropic) | ~205 chars | one skill, narrow |
| **ours** | 381–465 × 7 | **seven narrow skills, no shared door** |

The deficit is not length. It is that **nothing here answers to "design".** A
user who says "make this dashboard better" may match `clean-interface-design` or
`landing-page-conversion` or neither, while a single competing skill claims all
of it. Seven narrow skills lose to one broad skill on a contested trigger.

**What is not the problem:** the skills are already self-sufficient. Six of the
seven are 42–64 lines with exactly **one** line pointing at the MCP;
`ship-quality-gate` is the only MCP-dependent one (16 of 64 lines), which is
correct for a skill about running the auditors. "People want skills, not MCP" is
already answered on the content side.

## What ships

### 1. An umbrella skill — `skills/saglitzdesign/`

~70 lines, three parts:

**Description (~900 chars).** The entire auto-activation surface. Verbs,
surfaces, topics, platforms — and a closing boundary: **not for pure
functionality.** "Make the form work" and "add sorting to the table" must not
fire it. The trigger is *a design decision being made*, not a frontend file
being touched.

**A routing table.** Seven rows, sign → depth skill, defaulting to
`clean-interface-design`.

**Four invariants** that hold whichever depth is chosen: generate the system
before the pixels; bind every value to a token; run the deterministic auditors
at the close; ground every number claimed in a measured output.

**It does not restate the method.** The build/review/port method lives once in
`src/prompts.ts`, and `commands/` is generated from it. A third copy is the drift
surface the v0.26.0 package spent eight tasks closing.

### 2. Two lint rules, re-derived from the specifications

Both were found in another tool. **No text is copied**; each is re-derived from
the normative source and cited there. Verified against the specs, quoted:

**Rule A — a bare `1fr` track carrying an image.** CSS Grid Level 1 §7.2.1:
*"When appearing outside a minmax() notation, implies an automatic minimum (i.e.
minmax(auto, <flex>))."*

The rule must be narrower than the tool it came from. §7.2.1 defines the `auto`
minimum as *"the largest minimum size (specified by min-width/min-height) of the
grid items occupying the grid track"*, and whether it equals the content-based
minimum is governed by **§6.6**, whose conditions depend on properties of the
item. So "a bare `1fr` always floors at the image's width" is **false**. The
finding is scoped to what the source shows, and `notVisible` states that §6.6's
conditions cannot be read from the declaration.

Note: `src/layout.ts:162` already *emits* `minmax(0, 1fr)`. The generator knows
the rule; the auditor does not.

**Rule B — `overflow-x: hidden` on `html`/`body`.** CSS Overflow Level 3 §3.1:
`hidden` — *"the content must still be scrollable programmatically … and the box
is therefore still a scroll container"*; `clip` — *"forbids scrolling entirely,
through any mechanism, and therefore the box is not a scroll container."*

What the quote proves is **"it becomes a scroll container."** That this breaks a
`position: sticky` descendant is a second inference needing its own citation
(CSS Position 3). The finding claims only the first unless the second is sourced.

### 3. Motion rules — the sourced subset only

`src/` today contains **zero** motion lint rules. `src/motion.ts` generates
easing tokens correctly and `compare.ts` mentions `prefers-reduced-motion`, but
nothing audits for either. Three rules ship, two are refused:

| rule | justification | verdict |
|---|---|---|
| keyframes/transforms with no `prefers-reduced-motion` cover | WCAG 2.1 SC 2.3.3, Media Queries L5 — normative accessibility | ship |
| animating `width`/`height`/`top`/`left`/`margin`/`padding` | triggers layout/paint rather than compositing — engine documentation | ship |
| `transition: all` | a superset of the above: animates layout properties you did not intend | ship, on that justification |
| uniform `hover:scale-105` | "boring" | **refused — taste** |
| bouncy `cubic-bezier` on UI | "tasteless" | **refused — taste** |

The two refusals are the loudest claims in the source tool and carry no source
at all. Selling taste as a rule is what this project's knowledge standard exists
to prevent.

### 4. The macrostructure stamp — in the skills, never in a tool

The mechanism worth taking from elsewhere is not a rule: the generator stamps
which page shape it used into the CSS it writes, keeps a short project-local log,
and the next run must pick a different one. It attacks sameness **across**
outputs, which no rule reading a single file can see.

**It cannot be a tool.** All 34 tools declare `readOnlyHint: true` and
`openWorldHint: false` — measured on the wire, 34/34. One tool writing to the
user's disk makes "this server reads and never writes" false, and that sentence
is currently true and checkable.

The constraint supplies the design: **the agent writes the stamp, not a tool.**
The agent is already writing the CSS; a first-line comment costs nothing. Two
skills — `clean-interface-design` and `landing-page-conversion` — gain a
paragraph: look for a prior stamp before writing, pick a different shape, leave
your own. No tool writes anything and the guarantee holds.

## What is guarded, and what is only measured

**Guarded (deterministic):**
- The routing table names all seven depth skills and every name it uses exists on
  disk — equality in both directions, so an eighth skill that never joins the
  table goes red.
- All five lint rules — `grid-track-no-min` and `overflow-hidden-root` from
  deliverable 2, and the three motion rules from deliverable 3: positive and
  negative fixtures, plus their `notVisible` entries. (This bullet said "both
  lint rules" while the same spec's own deliverable 3 added three more; the
  five shipped with fixtures and disclosures, so nothing shipped wrong — the
  spec section was incomplete relative to its own deliverables.)
- The four existing skill guards cover the new skill automatically because they
  walk `skills/`. **The umbrella must carry `sources:`** or the binding guard
  passes vacuously on it.

**Measured, not guarded:** whether Claude chooses this skill over a competitor.
That is model behaviour; it is established by running real requests and counting,
and reported as a rate. Its scope is narrow and must be stated as such: it
measures one machine's installed skill set, not the world. Another user has no
`impeccable`, or has five rivals.

**A description is a claim about behaviour. Calling a number a gate is the
defect this project keeps finding; it will not be introduced here.**

## Out of scope

The 21-theme palette catalogue (adopting another tool's taste as fixed OKLCH
values is the blog-tier import the standard rejects; `generate_color_system`
derives from the brief instead); the three-equal-column card-grid rule (already
implemented and deliberately removed after it fired on nav links, pricing tiers
and KPI tiles); an eyebrow auto-fail (the source tool admits it contradicts two
of its own reference documents); and a six-axis model self-score
(`design_review_checklist` already owns that judgement and is honest about it).

## Provenance

The source tool is MIT and legally compatible, but the licence is not the binding
constraint — provenance is. Every URL in its skill directory is an asset vendor;
**no design rule in it carries a primary source**, and it states its own
provenance as "the consensus of the anti-AI-slop design field". So: copy no text,
re-derive the two spec-backed rules from the specifications and cite those, and
take the stamp as a mechanism, which is an architecture and needs no source.
