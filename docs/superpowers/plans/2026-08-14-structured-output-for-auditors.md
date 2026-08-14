# Structured Output for the Audit Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `design_lint`, `audit_security`, `audit_generic_design` and `audit_project` the same `outputSchema` + `structuredContent` contract that `audit_seo_geo` and `audit_performance` already have, so all six findings-producing auditors speak one language — and bump the SDK to 1.30.

**Architecture:** `src/lint.ts` already owns `AuditStructured`, `AuditReport` and `assembleAuditReport`. Task 1 splits the two halves of `assembleAuditReport` into reusable pieces so an auditor can produce the structured half and the "Not visible" markdown section *from the same array* without adopting `assembleAuditReport`'s report layout. Each subsequent task converts one auditor's report function from `string` to `AuditReport`, wires its registration in `src/index.ts`, and — where the tool has no disclosures today — writes them.

**Tech Stack:** TypeScript ESM (`node16` resolution — relative imports need `.js`), Zod 3, `@modelcontextprotocol/sdk`, Vitest. Tests import from `dist/`, so `npm test` runs `tsc` first.

## Global Constraints

- **No rule changes behaviour.** No rule id, severity, `doc` id, message or fix text may change. This package adds a channel; it does not alter what any rule decides.
- **No existing markdown changes.** Every touched tool's current text output is pinned byte-for-byte. The single exception: `design_lint` and `audit_project` gain a "Not visible to this audit" section, which is new text and is the point of the package.
- **An empty `notVisible` is forbidden.** It reads as "nothing was invisible", which is false for all four tools.
- **Every `notVisible` sentence is verified by constructing the case it describes and running the tool.** Package C shipped four false disclosures; every one was caught by running, none by reading. A sentence that cannot be demonstrated is not written.
- **A declared `outputSchema` is binding.** Every successful result must carry conforming `structuredContent`. Paths that today return a prose error as a successful result must return `isError: true` and no `structuredContent`.
- No new runtime dependency. No network call. `.js` extensions on relative imports.
- **No AI/assistant attribution** in any commit message, code comment, or documentation. Commit author must be the user's own identity.
- Do not weaken or delete an existing test.

---

### Task 1: Shared primitives, and the SDK bump

**Files:**
- Modify: `src/lint.ts:388-457` (split `assembleAuditReport`)
- Modify: `package.json` (SDK `^1.29.0` → `^1.30.0`)
- Test: `tests/lint.test.ts`

**Interfaces:**
- Consumes: `AuditFinding`, `AuditStructured`, `AuditReport`, `LintFinding` — all already exported from `src/lint.ts`.
- Produces:
  - `auditStructuredFrom(input: { findings: Array<LintFinding & { file?: string }>; notVisible: string[]; file?: string }): AuditStructured`
  - `renderNotVisibleSection(preamble: string, notVisible: string[], closing: string): string[]` — returns markdown lines, no trailing blank.
  - `assembleAuditReport` keeps its exact current signature and output, now composed from the two above.

- [ ] **Step 1: Write the failing test**

Add to `tests/lint.test.ts`:

```ts
import { auditStructuredFrom, renderNotVisibleSection, assembleAuditReport } from "../dist/lint.js";

describe("shared audit primitives", () => {
  const findings = [
    { rule: "a", severity: "error" as const, message: "m1", fix: "f1", doc: "d1", line: 3 },
    { rule: "b", severity: "info" as const, message: "m2", fix: "f2", doc: "", line: 9, file: "x.css" },
  ];

  it("derives the summary from the findings it was given", () => {
    const s = auditStructuredFrom({ findings, notVisible: ["one"] });
    expect(s.summary).toEqual({ error: 1, warning: 0, info: 1 });
    expect(s.findings.map((f) => f.rule)).toEqual(["a", "b"]);
    expect(s.notVisible).toEqual(["one"]);
  });

  it("applies the fallback filename only where a finding carries none", () => {
    const s = auditStructuredFrom({ findings, notVisible: ["one"], file: "fallback.css" });
    expect(s.findings.map((f) => f.file)).toEqual(["fallback.css", "x.css"]);
  });

  it("renders one bullet per entry, under the standard heading", () => {
    expect(renderNotVisibleSection("Pre.", ["one", "two"], "Close.")).toEqual([
      "## Not visible to this audit", "", "Pre.", "", "- one", "- two", "", "Close.",
    ]);
  });

  it("leaves assembleAuditReport's output byte-identical", () => {
    const r = assembleAuditReport({
      heading: "H", scanned: "S", findings, preamble: "Pre.", notVisible: ["one"], closing: "Close.",
    });
    expect(r.text).toContain("## Not visible to this audit");
    expect(r.structured).toEqual(auditStructuredFrom({ findings, notVisible: ["one"] }));
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/lint.test.ts`
Expected: FAIL — `auditStructuredFrom is not a function`.

- [ ] **Step 3: Split the two halves out of `assembleAuditReport`**

In `src/lint.ts`, add above `assembleAuditReport`:

```ts
/**
 * The structured half of an audit, built from the findings array the report is
 * built from. Kept separate from `assembleAuditReport` because an auditor may
 * need this half without adopting that function's report layout — four of them
 * have their own, and changing nine tools' markdown to share one renderer is a
 * different change than giving them all one machine contract.
 */
export function auditStructuredFrom(input: {
  findings: Array<LintFinding & { file?: string }>;
  notVisible: string[];
  file?: string;
}): AuditStructured {
  const { findings, notVisible } = input;
  return {
    findings: findings.map((f): AuditFinding => {
      const file = f.file ?? input.file;
      return {
        rule: f.rule,
        severity: f.severity,
        message: f.message,
        fix: f.fix,
        doc: f.doc ?? "",
        ...(file ? { file } : {}),
        line: f.line,
      };
    }),
    summary: {
      error: findings.filter((f) => f.severity === "error").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
    notVisible,
  };
}

/**
 * The markdown rendering of the same `notVisible` array the structured half
 * carries. One array, two renderings: a disclosure list typed separately from
 * the field that reports it will drift, and when it does neither reader can
 * tell which one is lying.
 */
export function renderNotVisibleSection(
  preamble: string,
  notVisible: string[],
  closing: string,
): string[] {
  return [
    "## Not visible to this audit",
    "",
    preamble,
    "",
    ...notVisible.map((entry) => `- ${entry}`),
    "",
    closing,
  ];
}
```

Then rewrite `assembleAuditReport`'s tail to use them. Replace the block from `lines.push("## Not visible to this audit", ...)` through the `const structured: AuditStructured = {...}` literal with:

```ts
  lines.push(...renderNotVisibleSection(input.preamble, notVisible, input.closing));

  const structured = auditStructuredFrom({ findings, notVisible, file: input.file });
```

Leave the `summary` const above it in place — the report body reads it.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, and the existing `seo`/`perf` suites must be untouched — they pin `assembleAuditReport`'s output and are the proof this split changed nothing.

- [ ] **Step 5: Bump the SDK**

```bash
npm install @modelcontextprotocol/sdk@^1.30.0
npm test && npm run preflight && npm run smoke
```
Expected: all pass. 1.30 adds only `server/sseKeepAlive.js` and `shared/mediaType.js`, both SSE/HTTP; this server is stdio-only, so nothing should move.

- [ ] **Step 6: Commit**

```bash
git add src/lint.ts tests/lint.test.ts package.json package-lock.json
git commit -m "refactor: one place builds an audit's structured half, one builds its disclosure section"
```

---

### Task 2: `design_lint`

**Files:**
- Modify: `src/lint.ts:336-386` (`designLintReport`)
- Modify: `src/index.ts:655` (registration)
- Test: `tests/lint.test.ts`

**Interfaces:**
- Consumes: `auditStructuredFrom`, `renderNotVisibleSection` from Task 1; `AUDIT_OUTPUT_SCHEMA` already exists at `src/index.ts:934`.
- Produces: `designLintReport(code: string): AuditReport` — was `string`. `LINT_NOT_VISIBLE: string[]` exported from `src/lint.ts`.

`design_lint` discloses nothing today, so its list is written from scratch. **Do not invent the sentences.** Derive them:

1. Read the six rules and list what each one structurally cannot see.
2. For each candidate, construct the input that demonstrates it and run `designLintReport` on it.
3. Keep only sentences whose demonstration you actually ran; each becomes a test.

Known starting points, each of which you must confirm or discard by running:
- It takes a single snippet, so anything declared in another file — a stylesheet, a design token, a parent component's props — is invisible.
- It reads source, so nothing computed at runtime or by a framework is visible.
- `<svelte:head>`-style namespaced elements: `:` is not a tag-name character (see `PERF_NOT_VISIBLE`'s entry — check whether the same holds here).
- Whether a rule's silence means "checked and clean" or "never reached", per rule.

- [ ] **Step 1: Write the failing test**

```ts
it("returns both registers, and the disclosure list is not empty", () => {
  const r = designLintReport(`<img src="a.png">`);
  expect(r.structured.findings.some((f) => f.rule === "img-no-alt")).toBe(true);
  expect(r.structured.notVisible.length).toBeGreaterThan(0);
  expect(r.text).toContain("## Not visible to this audit");
});

it("renders every disclosure entry as its own bullet", () => {
  const r = designLintReport(`<div></div>`);
  for (const entry of r.structured.notVisible) expect(r.text).toContain(`- ${entry}`);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/lint.test.ts`
Expected: FAIL — `r.structured is undefined` (the function still returns a string).

- [ ] **Step 3: Write `LINT_NOT_VISIBLE`, one sentence at a time, each demonstrated**

For each sentence, first write a test that builds the case and asserts what the tool does, run it, and only then write the sentence to match what you observed:

```ts
it("says nothing about a class defined in another file", () => {
  const r = designLintReport(`<div class="btn">Go</div>`);
  expect(r.structured.findings).toEqual([]);
});
```

Then add the matching entry to `LINT_NOT_VISIBLE` in `src/lint.ts`. Follow `PERF_NOT_VISIBLE`'s house style: a bold lead phrase, then what is not seen and what its silence therefore means.

- [ ] **Step 4: Convert `designLintReport` to return `AuditReport`**

Keep the existing body that builds `lines`. Append the disclosure section and return both registers:

```ts
export function designLintReport(code: string): AuditReport {
  const findings = designLint(code);
  // ... existing line-building, unchanged ...
  lines.push(...renderNotVisibleSection(LINT_PREAMBLE, LINT_NOT_VISIBLE, LINT_CLOSING));
  return { text: lines.join("\n"), structured: auditStructuredFrom({ findings, notVisible: LINT_NOT_VISIBLE }) };
}
```

Define `LINT_PREAMBLE` and `LINT_CLOSING` beside `LINT_NOT_VISIBLE`. The closing must not imply that silence elsewhere is a pass.

- [ ] **Step 5: Wire the registration**

At `src/index.ts:655`, change the callback's return from `text(designLintReport(code))` to:

```ts
    const { text: body, structured } = designLintReport(code);
    return { ...text(body), structuredContent: structured };
```

and pass `AUDIT_OUTPUT_SCHEMA` as `tool()`'s fifth argument. Add to the description, matching the wording the two v0.22.0 tools use verbatim:

> "Returns markdown plus structured output: findings (rule, severity, message, fix, doc, file, line), a severity summary, and a machine-readable `notVisible` list of what it could not check. "

- [ ] **Step 6: Pin the pre-existing markdown**

Add a test asserting the report body *above* the disclosure section is unchanged:

```ts
it("leaves the findings half of the report exactly as it was", () => {
  const r = designLintReport(`<img src="a.png"><div onClick={go}>x</div>`);
  const body = r.text.split("## Not visible to this audit")[0];
  expect(body).toMatchSnapshot();
});
```

Generate the snapshot on the *pre-change* code if it is still in your working tree; otherwise generate it, then verify by `git stash`-ing your change and re-running.

- [ ] **Step 7: Run everything and commit**

```bash
npm test && npm run preflight
git add src/lint.ts src/index.ts tests/
git commit -m "feat: design_lint returns structured findings and says what it cannot see"
```

---

### Task 3: `audit_security`

**Files:**
- Modify: `src/security.ts:1356` (`NOT_VISIBLE` prose → array), `src/security.ts:1369` (`securityReport`)
- Modify: `src/index.ts:835` (registration and error paths)
- Test: `tests/security.test.ts`

**Interfaces:**
- Consumes: `auditStructuredFrom`, `renderNotVisibleSection`.
- Produces: `securityReport(input): AuditReport` — was `string`. `SECURITY_NOT_VISIBLE: string[]` exported.

The content already exists as a prose template literal. This is a container change, not a writing task — **the rendered markdown must come out byte-identical.**

- [ ] **Step 1: Pin the current output first**

Before changing anything:

```ts
it("renders the same disclosure section it rendered before the split", () => {
  expect(securityReport({ source: `<div dangerouslySetInnerHTML={{__html: x}} />`, filename: "a.tsx" }))
    .toMatchSnapshot();
});
```

Run `npx vitest run tests/security.test.ts` to write the snapshot against the *current* code. Commit the snapshot on its own so the diff proves the split changed nothing.

- [ ] **Step 2: Split `NOT_VISIBLE` into an array**

Convert the template literal at `src/security.ts:1356` into `export const SECURITY_NOT_VISIBLE: string[]`, one entry per bullet, preserving each entry's text exactly. Extract the section's opening sentence into `SECURITY_PREAMBLE` and its closing into `SECURITY_CLOSING`.

- [ ] **Step 3: Return both registers**

```ts
export function securityReport(input: { source?: string; filename?: string; root?: string }): AuditReport {
  // ... existing body, unchanged, building `lines` and `findings` ...
  lines.push(...renderNotVisibleSection(SECURITY_PREAMBLE, SECURITY_NOT_VISIBLE, SECURITY_CLOSING));
  return { text: lines.join("\n"), structured: auditStructuredFrom({ findings, notVisible: SECURITY_NOT_VISIBLE, file: input.filename }) };
}
```

- [ ] **Step 4: Verify the snapshot still matches**

Run: `npx vitest run tests/security.test.ts`
Expected: PASS with **no snapshot update**. If the snapshot differs, the split lost or gained whitespace — fix the split, never the snapshot.

- [ ] **Step 5: Fix the error path**

`src/index.ts:857` currently returns `text(...)` for "is a file, not a directory" as a *successful* result. With a schema declared that is a protocol violation. Change it and the `!path && !code` branch above it to `return { ...text(...), isError: true };`, matching `audit_seo_geo`'s handling at `src/index.ts:977-993` exactly — including the `statSync` `try/catch` for a path that does not exist, which `audit_security` does not currently have.

- [ ] **Step 6: Test the error path**

```ts
it("returns an error result, not an empty audit, for a path that is not a directory", async () => {
  const r = await callTool("audit_security", { path: "package.json" });
  expect(r.isError).toBe(true);
  expect(r.structuredContent).toBeUndefined();
});

it("returns an error result for a path that does not exist", async () => {
  const r = await callTool("audit_security", { path: "/nonexistent-xyz" });
  expect(r.isError).toBe(true);
  expect(r.structuredContent).toBeUndefined();
});
```

Use the existing tool-calling helper in `tests/server.test.ts`; if there is none, follow the pattern that suite already uses to invoke a registered tool.

- [ ] **Step 7: Wire the schema and commit**

Pass `AUDIT_OUTPUT_SCHEMA` to `tool()` and add the same structured-output sentence to the description.

```bash
npm test && npm run preflight
git add src/security.ts src/index.ts tests/
git commit -m "feat: audit_security returns its findings and disclosures as data"
```

---

### Task 4: `audit_generic_design`

**Files:**
- Modify: `src/generic.ts:836` (`GENERIC_NOT_VISIBLE` prose → array), `src/generic.ts:918` (`genericReport`)
- Modify: `src/index.ts:867` (registration, error paths, extended schema)
- Test: `tests/generic.test.ts`

**Interfaces:**
- Consumes: `auditStructuredFrom`, `renderNotVisibleSection`, `genericScore` (already at `src/generic.ts:813`).
- Produces: `genericReport(input): AuditReport & { structured: GenericStructured }`, where

```ts
export interface GenericStructured extends AuditStructured {
  score: { total: number; items: Array<{ weight: number; rule: string; evidence: string }> };
}
```

The score is already itemised in the markdown — this task moves the same itemisation into the structured half. **It must be the same object the markdown is rendered from**, not a recomputation.

- [ ] **Step 1: Pin the current output, then split the prose**

Exactly as Task 3 Steps 1-2, against `src/generic.ts:836`. Snapshot first, on its own commit.

- [ ] **Step 2: Write the failing test for the score field**

```ts
it("carries the same itemised score the markdown prints", () => {
  const r = genericReport({ source: `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"></div>`, filename: "Hero.tsx" });
  expect(r.structured.score.total).toBeGreaterThan(0);
  for (const item of r.structured.score.items) {
    expect(r.text).toContain(item.rule);
    expect(r.text).toContain(String(item.weight));
  }
  expect(r.structured.score.items.reduce((n, i) => n + i.weight, 0)).toBe(r.structured.score.total);
});

it("scores a page carrying no signal at 0, with no score items", () => {
  const r = genericReport({ source: `<article><h1>A quiet page</h1></article>`, filename: "page.tsx" });
  expect(r.structured.score).toEqual({ total: 0, items: [] });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run tests/generic.test.ts`
Expected: FAIL — `r.structured is undefined`.

- [ ] **Step 4: Return both registers with the score attached**

Have `genericReport` build the score once, render the markdown from it, and pass the same object into the structured half.

- [ ] **Step 5: Extend the schema in `src/index.ts`**

```ts
const GENERIC_OUTPUT_SCHEMA = {
  ...AUDIT_OUTPUT_SCHEMA,
  score: z
    .object({
      total: z.number().int().describe("0-100. Counts distinct signals, never occurrences — a page with forty stock cards carries the same one signal as a page with three."),
      items: z.array(
        z.object({
          weight: z.number().int().describe("What this rule contributed. Each rule contributes at most once."),
          rule: z.string().describe("The rule that contributed it."),
          evidence: z.string().describe("What was found, and where."),
        }),
      ).describe("Every point in `total`, itemised. There is no opaque number: a reader can disagree with one line rather than with a verdict."),
    })
    .describe("The generic-design score, itemised. Not a quality judgement — it counts documented defaults that were left unchanged."),
};
```

Pass it as `tool()`'s fifth argument at `src/index.ts:867`.

- [ ] **Step 6: Fix the error paths**

`src/index.ts:890` returns a non-directory error as a successful result. Change it and the `!path && !code` branch to `isError: true`, and add the `statSync` `try/catch` for a nonexistent path, matching `audit_seo_geo`. Test both, as in Task 3 Step 6.

- [ ] **Step 7: Run everything and commit**

```bash
npm test && npm run preflight
git add src/generic.ts src/index.ts tests/
git commit -m "feat: audit_generic_design returns its findings, disclosures and itemised score as data"
```

---

### Task 5: `audit_project`

**Files:**
- Modify: `src/project.ts:194` (`projectAuditReport`)
- Modify: `src/index.ts:812` (registration, error paths, extended schema)
- Test: `tests/project.test.ts`

**Interfaces:**
- Consumes: `auditStructuredFrom`, `renderNotVisibleSection`, `ScanResult` (already at `src/project.ts:40`).
- Produces: `projectAuditReport(root, extensions?): AuditReport & { structured: ProjectStructured }`, where

```ts
export interface ProjectStructured extends AuditStructured {
  scan: { filesRead: number; scannedBytes: number; skippedLarge: string[]; hitFileCap: boolean; hitByteCap: boolean; unreadable: string[] };
}
```

`audit_project` aggregates. Its `findings` stay a **flat** list — each entry already carries the rule id that identifies its origin, and an agent chaining audit→fix asks "what is broken", not "which tool complained".

`audit_project` discloses nothing today. Its list is written from scratch, by the same demonstrate-then-write procedure as Task 2. The caps make its blind spots unusually concrete and unusually important — a truncated scan is exactly the case where silence is not a clean bill.

Known starting points, each to confirm or discard by running:
- `MAX_FILES` (400), `MAX_TOTAL_BYTES` (3 MB) and `MAX_FILE_BYTES` (500 KB): what a hit cap means for every absence claim in the report.
- `unreadable` and `skippedLarge`: files that were never opened.
- The default extension set excludes `.js` and `.ts`; whatever lives only there is invisible.
- `audit_project` runs a subset of the auditors — establish by reading which, and disclose the ones it does *not* run, since a caller may reasonably assume a project audit is all of them.

- [ ] **Step 1: Write the failing test for `scan`**

```ts
it("reports what the scan actually read, beside the findings", () => {
  const r = projectAuditReport(process.cwd() + "/recipes");
  expect(r.structured.scan.filesRead).toBeGreaterThan(0);
  expect(r.structured.scan.hitFileCap).toBe(false);
  expect(r.structured.notVisible.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/project.test.ts`
Expected: FAIL — `r.structured is undefined`.

- [ ] **Step 3: Write `PROJECT_NOT_VISIBLE`, demonstrating each sentence**

For the cap entries, build a fixture directory that actually trips the cap and assert what the report says, then write the sentence to match. A cap sentence written from the constant rather than from a run is the exact failure this constraint exists to prevent.

- [ ] **Step 4: Return both registers**

Append the disclosure section to the existing `lines`, and return `{ text, structured }` with `scan` populated from the `ScanResult` the audit already produced.

- [ ] **Step 5: Extend the schema and fix the error paths**

```ts
const PROJECT_OUTPUT_SCHEMA = {
  ...AUDIT_OUTPUT_SCHEMA,
  scan: z
    .object({
      filesRead: z.number().int().describe("How many files were actually opened and read."),
      scannedBytes: z.number().int(),
      skippedLarge: z.array(z.string()).describe("Files past the per-file byte cap. Never read, so nothing above is claimed about them."),
      hitFileCap: z.boolean().describe("True when some source files were not read. Every absence claim in `findings` is unconfirmed while this is true."),
      hitByteCap: z.boolean(),
      unreadable: z.array(z.string()).describe("Files that could not be opened."),
    })
    .describe("What the scan reached. Read it before trusting any absence claim: a capped scan looked at part of the project."),
};
```

`src/index.ts:827` returns a non-directory error as a successful result — change it to `isError: true`, and add the nonexistent-path `try/catch`. Test both.

- [ ] **Step 6: Run everything and commit**

```bash
npm test && npm run preflight
git add src/project.ts src/index.ts tests/
git commit -m "feat: audit_project returns its findings, its disclosures and what the scan reached"
```

---

### Task 6: The cross-cutting gate, docs, and v0.23.0

**Files:**
- Test: `tests/server.test.ts`, `tests/integrity.test.ts`
- Modify: `README.md`, `CHANGELOG.md`, `package.json`, `server.json`

**Interfaces:**
- Consumes: everything above.
- Produces: no new source interfaces.

- [ ] **Step 1: Assert exactly the right tools advertise a schema**

This is the analogue of the C2 check that caught two tool descriptions claiming capabilities that did not exist.

```ts
const STRUCTURED_TOOLS = [
  "design_lint", "audit_security", "audit_generic_design",
  "audit_project", "audit_seo_geo", "audit_performance",
];

it("advertises an outputSchema on exactly the findings-producing auditors", async () => {
  const { tools } = await client.listTools();
  const withSchema = tools.filter((t) => t.outputSchema).map((t) => t.name).sort();
  expect(withSchema).toEqual([...STRUCTURED_TOOLS].sort());
});

it("returns structuredContent from every tool that advertises a schema", async () => {
  for (const name of STRUCTURED_TOOLS) {
    const r = await callTool(name, SAMPLE_ARGS[name]);
    expect(r.structuredContent, name).toBeDefined();
    expect(r.structuredContent.notVisible.length, name).toBeGreaterThan(0);
    const { error, warning, info } = r.structuredContent.summary;
    expect(error + warning + info, name).toBe(r.structuredContent.findings.length);
  }
});
```

Define `SAMPLE_ARGS` with a real, minimal argument set per tool.

- [ ] **Step 2: Assert the two registers never drift**

```ts
it("prints every notVisible entry in the markdown it returns", async () => {
  for (const name of STRUCTURED_TOOLS) {
    const r = await callTool(name, SAMPLE_ARGS[name]);
    for (const entry of r.structuredContent.notVisible) {
      expect(r.content[0].text, `${name}: ${entry.slice(0, 40)}`).toContain(entry);
    }
  }
});
```

- [ ] **Step 3: Run them and watch them pass**

Run: `npx vitest run tests/server.test.ts`
Expected: PASS. If the drift test fails for a tool, the disclosure array and the markdown were built separately — fix the tool, not the test.

- [ ] **Step 4: Update the docs**

`README.md`: mark the four tools as returning structured output. `CHANGELOG.md`: a `0.23.0` entry naming the four tools, the SDK bump, and the error-path change, which is the only behaviour a caller could notice. Bump `package.json` and `server.json` to `0.23.0`.

- [ ] **Step 5: Full verification**

```bash
npm test && npm run preflight && npm run smoke
```
Expected: all pass; preflight reports `0.23.0` consistent; smoke reports 33 tools.

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md package.json server.json tests/
git commit -m "docs: v0.23.0 — four more auditors answer an agent, not only a reader"
```

---

## Self-Review

**Spec coverage.** Governing rule (one array, two renderings) → Task 1 primitives + Task 6 Step 2 drift test. No-behaviour-change → Global Constraints + the snapshot pins in Tasks 2-3-4. Base schema for all six → Task 6 Step 1. Extra fields → Tasks 4 and 5. Error path → Tasks 3, 4, 5, each with its own test. `notVisible` written for `design_lint` and `audit_project` → Tasks 2 and 5, procedure specified rather than sentences supplied. Prose→array for the other two → Tasks 3 and 4. SDK 1.30 → Task 1 Step 5. Testing items 1-7 → distributed across the per-tool tasks and Task 6.

**Placeholders.** None: every step names its file, its command and its expected result. The two tasks that must produce prose specify the derivation procedure and the acceptance test, because supplying invented disclosure sentences here is precisely the failure the spec forbids.

**Type consistency.** `auditStructuredFrom` and `renderNotVisibleSection` are defined in Task 1 with the exact signatures Tasks 2-5 consume. `GenericStructured` and `ProjectStructured` both extend `AuditStructured`. `AUDIT_OUTPUT_SCHEMA` is the existing constant at `src/index.ts:934`; `GENERIC_OUTPUT_SCHEMA` and `PROJECT_OUTPUT_SCHEMA` spread it rather than redeclaring its members.
