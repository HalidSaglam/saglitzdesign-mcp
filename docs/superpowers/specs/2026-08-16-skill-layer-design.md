# The skill layer — design

**Date:** 2026-08-16
**Target release:** v0.26.0
**Status:** approved, ready for implementation

## Why

The server has two registers and only one of them is maintained.

**MCP is pull:** an agent asks, the server answers. **A skill is push:** the
guidance is in the agent's context before anyone asks. Six skills already ship —
`clean-interface-design`, `landing-page-conversion`, `design-review`,
`motion-and-animation`, `apple-platform-design`, `design-system-audit` — and none
has been touched since **v0.15.0**, ten releases ago.

The drift is measured, not suspected:

- The root `README.md` says "Five skills" and lists five; **six directories
  exist** (`design-system-audit` is missing from the list). `skills/README.md`
  lists all six correctly, so exactly one surface is wrong.
- `skills/README.md` says "83 documents" and "26 tools". The live server reports
  **96 documents and 34 tools**.
- `skills/apple-platform-design/SKILL.md` predates the v0.24.0 Apple correction.
  Dynamic Type appears three times: line 33 is **correctly** scoped under "iOS
  specifics"; line 15 ("Core HIG principles") and line 50 (the porting checklist)
  are unscoped, in a skill whose own description covers macOS — and v0.24.0
  established from Apple's own words that **macOS does not support Dynamic Type**.
  The correction reached the knowledge base and never reached the skill.
- The same file's "full depth" pointer names five documents and no auditor, so it
  knows nothing of `apple-accessibility`, `apple-shipping-readiness`, or any of
  the seven auditors.

And the largest gap is not drift at all: **the entire enforcement half of the
product is invisible from the skill register.** Seven auditors shipped between
v0.20.0 and v0.25.0. All six skills give advice; not one mentions verification.

## The rule that shapes the design

**A restatement is a second surface that goes stale silently.**

That is what happened here, and it is why the central design question was *does
the skill layer restate the knowledge base, or point at it?* The answer chosen is
neither extreme: **the skills stay hand-written and standalone — that is their
whole value — and a drift check makes the classes of staleness that can be
detected fail loudly.**

**What is honestly testable, and what is not.** No test can decide whether a
condensed paragraph contradicts the document it condenses. Three things can be
tested, and this package builds exactly those three:

1. **Referential** — every document, tool and count a skill names is checked
   against the live registry.
2. **Form** — the absolute-absence guard is extended over `skills/`, so skills
   are held to the same narrowing-claim standard as everything else.
3. **A contradiction corpus** — every fact the knowledge base has *corrected*
   becomes an entry, and no skill may state it in the shape that was corrected.

The corpus is seeded with the one that caused this package: macOS and Dynamic
Type. **It carries a standing rule: every future knowledge correction adds an
entry.** This is the same mechanism as `ABSENCE_FORMS`, which grew the same way
and for the same reason.

The disclosure discipline applies to the guard itself: **it must name what it
does not catch**, in the test's own comment, the way the absence-form guard does.

## Scope

**In:**

- **The plugin layer.** `.claude-plugin/plugin.json`, `.mcp.json`, `commands/`
  (the eight workflow prompts as slash commands), and `marketplace.json`.
- **The drift check**, in all three parts above.
- **Refreshing the six skills** to v0.25.0, including every count and pointer.
- **A seventh skill for the auditors** — the enforcement half, currently unnamed
  anywhere in the skill register.

**Out:**

- **Generating skills from the knowledge base.** Rejected: generated prose reads
  worse than the hand-written skills, and the terse, opinionated voice is the
  reason a skill earns its place in a context window.
- **Turning the skills into thin routers that require the MCP.** Rejected: a
  skill that does nothing without the server has given up the one property that
  makes it a skill.
- **Rewriting knowledge documents.** The skills are brought to the documents, not
  the other way round.
- **Creating the marketplace repository.** This package produces the catalog file;
  where it is hosted is Halid's call and needs no code.

## The plugin

The repository is already in plugin layout — `skills/` sits at the root, which is
where a Claude Code plugin expects it. What is added is thin:

| File | Contents |
| --- | --- |
| `.claude-plugin/plugin.json` | The manifest. `name`, `version`, `description`, `author`, `repository`, `license`, `keywords`. |
| `.mcp.json` | The server, launched via `${CLAUDE_PLUGIN_ROOT}` so the bundled copy runs rather than a global one. |
| `commands/*.md` | Eight slash commands, one per prompt. |
| `marketplace.json` | The catalog, named `saglitz`. |

**The version is a sixth preflight surface.** `plugin.json`'s version must equal
`package.json`'s. `npm run preflight` currently checks five surfaces
(`package.json`, `package-lock.json` ×2, `server.json` ×2, `CHANGELOG.md`); the
manifest joins them, so a release cannot ship a plugin claiming a version the
package does not.

**The eight commands** are `build_landing_page`, `build_website`,
`build_mobile_app_ui`, `critique_screenshot`, `review_paywall`, `design_review`,
`redesign`, `port_to_platform`.

**One collision to resolve:** `design_review` is both a prompt name and a skill
name (`design-review`). The command and the skill must be distinguishable to a
reader who sees both offered; the implementation decides how, and the decision is
recorded rather than left to chance.

**The marketplace name is `saglitz`, and it is deliberately independent of the
repository that hosts it.** Users type `claude plugin install saglitzdesign@saglitz`
after a one-time `marketplace add`. Moving the catalog to a branded repository
later changes the one-time command and leaves the install command untouched.

## The source binding

Each `SKILL.md` declares, in its own frontmatter, the knowledge document ids it
condenses. The binding lives in the file it binds, so it moves when the file
moves — the alternative, a central `sources.json`, is a second surface that can
drift from the skills it maps, which is the defect this package exists to close.

**Task 1 must verify, by running the tool, that `npx skills@latest add` tolerates
an unknown frontmatter field** before the field ships. If it does not, the
binding moves into the body under a fixed heading, and the check reads it there.
This is a fact about someone else's parser and is not assumed.

## Distribution, and what it means for updates

The three channels behave differently, and the package must not blur them:

- **`npx -y saglitzdesign-mcp`** — updates itself. Verified: npx re-resolves the
  `latest` dist-tag on each run even when the cached range already satisfies it.
- **A clone** — manual `git pull && npm install && npm run build`.
- **`npx skills@latest add`** — **copies** into the user's agent. A copy does not
  update; re-running the command is the only refresh.

The plugin adds a fourth: marketplace plugins are cached under
`~/.claude/plugins/cache/` and update through the plugin system rather than npm.

**Therefore the release notes must tell skill users to re-run the add command.**
Nothing else reaches them, and this is the first release where that matters,
because it is the first release that changes a skill.

## Testing

- Every referential claim in every skill and in both READMEs resolves against the
  live registry — document ids, tool names, and counts. The three known-stale
  numbers are pinned so they cannot regress.
- The absence-form guard runs over `skills/`.
- The contradiction corpus fails on a planted unscoped restatement of a corrected
  fact, and its comment names its own blind spots.
- **Every guard is mutation-tested**: break the thing it protects, confirm the
  test fails, restore. A guard that cannot fail is worse than none, and this
  branch found three of those in the package before it.
- The plugin manifest is validated by parsing it, not by reading it: version
  equality with `package.json` is asserted, and `npm run smoke` is extended to
  confirm the packed artefact and the manifest agree.
- The eight commands each resolve to a prompt that exists.

## Out of scope for this spec, tracked

The long-tail source migration merged with the knowledge freshness sweep;
`audit_project` integration for the newer auditors; package D2 (generators,
measurers, knowledge-reader metadata); the seven false disclosure sentences open
in `SECURITY_NOT_VISIBLE` and `GENERIC_NOT_VISIBLE`; extending the absence-form
guard past the Apple documents, whose design is recorded at
`docs/superpowers/2026-08-16-extending-the-absence-guard.md`; and, last at Halid's
request, the iOS/macOS security layer.
