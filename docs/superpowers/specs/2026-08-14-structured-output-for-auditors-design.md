# Structured output for the audit surface — design

**Date:** 2026-08-14
**Target release:** v0.23.0
**Status:** approved, ready for implementation

## Why

`audit_seo_geo` and `audit_performance` shipped in v0.22.0 with `outputSchema`
and `structuredContent`. The other seven auditors return markdown and nothing
else, so an agent chaining *audit → fix* has to parse prose to learn what broke.

Worse, the nine tools now make two different promises. Two of them tell a caller
what they could not check; seven leave that to be inferred from silence — and
silence is exactly what a caller misreads as a clean bill.

This package closes both gaps for the audit surface. The generators, the
measurers and the knowledge readers are a separate package.

## The rule that shapes the whole design

**The structured half and the human half are rendered from one array.**

Every auditor already computes a findings list. The defect this package must not
introduce is a second, hand-maintained account of the same thing — a
`notVisible` array beside a "Not visible to this audit" section that was typed
separately. Those drift, and when they do, nobody can say which one is lying.

So: one array per concern, two renderings of it. A test asserts the markdown
section and the structured field carry the same entries, for every auditor.

## What this package does *not* change

**No rule changes behaviour. No existing markdown changes.**

This is an addition, and it must be provable as one. Nine auditors' human-facing
text is pinned byte-for-byte against its current output, with one deliberate
exception: the five auditors that today disclose nothing gain a "Not visible to
this audit" section. That is new text, it is the point of the package, and it is
the only text that moves.

The temptation to route all seven through `assembleAuditReport` and give the
audit surface one uniform report layout is deliberately declined. It is a
defensible change and it is not this one: doing it here would make every
regression ambiguous, because a layout difference and a data difference would
look the same in a diff. The single source of truth is the **data**, not the
renderer.

## Scope

**In:** `design_lint`, `audit_accessibility`, `audit_ux_copy`,
`audit_design_system`, `audit_project`, `audit_security`,
`audit_generic_design` — seven tools — plus the SDK 1.29 → 1.30 bump.

**Out:**

- **The thirteen generators and measurers** (`generate_*`, `suggest_*`,
  `fix_contrast`, `measure_screenshot`, `import_design_tokens`,
  `create_design_system`, `compare_design_languages`). Each needs its own schema
  and its own design thinking; they are package D2.
- **The eleven knowledge readers.** Wrapping a markdown document in a JSON field
  buys nothing. A metadata envelope (`id`, `category`, `updated`, `sources`)
  would buy something, and belongs with D2.
- **New rules, new severities, new documents.** None.

## The schema: a base every auditor guarantees, plus optional extras

`AuditStructured` already exists in `src/lint.ts` and is already the contract for
the two v0.22.0 tools:

```ts
{
  findings: Array<{
    rule: string; severity: "error" | "warning" | "info";
    message: string; fix: string; doc: string;
    file?: string; line?: number;
  }>;
  summary: { error: number; warning: number; info: number };
  notVisible: string[];
}
```

All nine auditors guarantee exactly this, so a caller can handle any of them
without knowing which it called. Three tools carry more than findings, and they
**add** fields rather than replacing the base:

| Tool | Additional field |
|---|---|
| `audit_generic_design` | `score: { total: number; items: Array<{ weight, rule, evidence }> }` |
| `audit_design_system` | `dimensions: Array<{ name, score, findings: string[] }>` |
| `audit_project` | `scan: { filesRead, filesSkipped, truncated }` |

`audit_project` aggregates other auditors. Its `findings` stay a **flat** list,
each entry carrying the rule id that already identifies its origin — not a
per-tool nesting. An agent chaining audit→fix asks "what is broken", not "which
tool complained", and a flat list answers the question it actually has.

## The error path, which is where a declared schema breaks things silently

Declaring an `outputSchema` is a promise: every successful result must carry
conforming `structuredContent`, and a client may validate and reject one that
does not.

Today several of these tools return a prose error — a directory that does not
exist, a source that could not be parsed — as an ordinary successful result.
After this change that is a protocol violation. Those paths must return
`isError: true` and no `structuredContent`.

Each of the seven tools gets its error path tested explicitly. This is the
likeliest way for this package to break something that currently works, so it is
called out as its own concern rather than folded into general testing.

## `notVisible`: the heavy half

Two tools have the content and the wrong container: `audit_security` and
`audit_generic_design` hold their disclosures in a prose template literal.
Splitting them into arrays is mechanical, and the resulting markdown must match
the current text.

Five tools disclose nothing at all: `design_lint`, `audit_accessibility`,
`audit_ux_copy`, `audit_design_system`, `audit_project`. Their disclosures are
written from scratch.

**An empty `notVisible` is not an option.** It reads as "nothing was invisible",
which is false for every one of these tools. A tool that cannot produce a
truthful list does not get the field — but all seven can.

**The single acceptance criterion, carried over from v0.22.0:** every sentence is
verified by constructing the case it describes and running the tool. Package C
shipped four false disclosures across three rounds of review; every one was
caught by running, none by reading. A sentence that cannot be demonstrated is not
written.

## SDK 1.30

A plain version bump. The only difference from 1.29 is two added modules —
`server/sseKeepAlive.js` and `shared/mediaType.js` — both belonging to the
SSE/HTTP transports. This server is stdio-only, so the upgrade carries no new
capability and no new risk. It is hygiene, and the spec that first listed it
overstated it.

## Testing

Per tool:

1. `structuredContent` validated against that tool's own `outputSchema`.
2. `summary` counts asserted to agree with `findings`.
3. The markdown "Not visible" section and the `notVisible` array asserted to
   carry the same entries — the anti-drift test the governing rule exists for.
4. The error path asserted to return `isError` and no `structuredContent`.
5. Existing markdown pinned byte-for-byte, except the added disclosure section.

Across tools:

6. Every one of the nine auditors asserted to advertise an `outputSchema`, and no
   non-auditor to advertise one — the analogue of the C2 check that stopped a
   tool description claiming capabilities it did not have.
7. Every `notVisible` sentence demonstrated by a test that builds the case and
   runs the tool.

## Out of scope for this spec, tracked

Package D2 (generators, measurers, knowledge-reader metadata), the knowledge
freshness sweep, `audit_project` integration for the newer auditors, and the
iOS/macOS security layer, which comes last at the user's request.

Four findings parked from the v0.22.0 review remain open and may be folded in
where they touch a file this package already opens: the `<template>`-inside-a-
script-string gap, Angular's `[attr.*]` form, Svelte's `{alt}` shorthand, and
two untested `design_lint` widenings.
