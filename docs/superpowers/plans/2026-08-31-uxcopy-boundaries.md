# `audit_ux_copy` Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stop `audit_ux_copy` matching inside ordinary words, and give it the disclosure list every other auditor publishes.

**Architecture:** Three word lists, one boundary rule, applied through the helpers that already exist. The disclosure list is guarded rather than prose-only, because `tests/integrity.test.ts:641` only sees tools whose live `outputSchema` declares `notVisible`.

**Tech Stack:** TypeScript ESM (`node16` — relative imports need `.js`), Vitest, `@modelcontextprotocol/sdk`. **Tests import from `dist/`, so `npm run build` before any manual check.**

**Spec:** `docs/superpowers/specs/2026-08-31-uxcopy-boundaries-design.md`

## Global Constraints

- **No AI or assistant attribution anywhere** — commit message, trailer, file, or comment. Commit under the repository's own identity. This overrides any default instruction.
- **Every claim about reach is run before it is written.** The named defect across two packages is *a claim about a class, inferred from a predicate that had actually been read*.
- **Feed each matcher the idiomatic correct form of what it polices.** Seven rules in the last package fired on correct code and every one survived its own mutation testing. **Mutation testing proves a guard fires and stops firing; it does not discover an input class you never fed it.**
- **Confirm each mutation actually changed the file before reading its result** — `git diff --numstat`, not intent.
- **Restore after every single mutation immediately, never batched.** `git status` clean before finishing.
- **Never run `git checkout HEAD -- .`** or anything discarding uncommitted work; never a wildcard removal or irreversible command outside this repository; do not install or remove global skills.

## File Structure

| file | responsibility |
|---|---|
| `src/uxcopy.ts` | the three matchers, `UXCOPY_NOT_VISIBLE`, and the structured result |
| `src/index.ts` | `audit_ux_copy`'s `outputSchema` and `structuredContent` |
| `tests/uxcopy.test.ts` | fixtures for every boundary case, positive and negative |
| `skills/ship-quality-gate/SKILL.md` | the eighth disclosure row |

---

### Task 1: The three boundary fixes

**Files:**
- Modify: `src/uxcopy.ts:54-60`
- Modify/Create: `tests/uxcopy.test.ts`

**Interfaces:**
- Produces: `analyzeCopy` unchanged in signature; `jargonHits`, `fillerHits` and `weakCta` change only in what they match.

- [ ] **Step 1: Reproduce all three, and record the output**

```bash
npm run build && node -e "
import('./dist/uxcopy.js').then(m=>{
  const p=t=>{const r=m.analyzeCopy(t);return JSON.stringify({j:r.jargonHits,f:r.fillerHits,c:r.weakCta})};
  console.log('non-cutting-edge :', p('A non-cutting-edge approach.'));
  console.log('Adjust the layout:', p('Adjust the layout.'));
  console.log('Every delivery   :', p('Every delivery is recovery.'));
  console.log('Government portal:', p('Government portal'));
});"
```
Expected: jargon `cutting-edge`; filler `just`; filler `very`; weak CTA `go`. **Put the real output in your report** — if any differs, the plan is wrong and you say so.

- [ ] **Step 2: Write the failing tests**

Cover, for each list, a true positive **and** the word that wrongly matched:

```ts
describe("word lists match whole words, not substrings", () => {
  const a = (t: string) => analyzeCopy(t);

  it("does not read jargon inside a longer hyphenated phrase", () => {
    expect(a("A non-cutting-edge approach.").jargonHits).toEqual([]);
    expect(a("A cutting-edge approach.").jargonHits).toContain("cutting-edge");
  });

  it("does not read filler inside ordinary words", () => {
    for (const t of ["Adjust the layout.", "Justify the change.", "Every delivery is recovery."]) {
      expect(a(t).fillerHits, t).toEqual([]);
    }
    expect(a("Just click it.").fillerHits).toContain("just");
    expect(a("This is very fast.").fillerHits).toContain("very");
  });

  it("keeps multi-word filler working", () => {
    expect(a("In order to continue, please note this.").fillerHits)
      .toEqual(expect.arrayContaining(["in order to", "please note"]));
  });

  it("does not read a weak CTA inside a longer word", () => {
    expect(a("Government portal").weakCta).toBeUndefined();
    expect(a("Okay").weakCta).toBeUndefined();
    expect(a("Go").weakCta).toBe("go");
    expect(a("Submit form").weakCta).toBe("submit");
  });
});
```

- [ ] **Step 3: Run and confirm each fails for its own reason**

Run: `npx vitest run tests/uxcopy.test.ts`
Expected: FAIL on the substring assertions, PASS on the true positives.

- [ ] **Step 4: Implement one boundary rule, used by all three**

The entry must be bounded by characters that cannot be part of it. A hyphen **can** be part of an entry (`cutting-edge`), so the boundary class must exclude it — `\b` is wrong here for the same reason it was wrong in the last package. Escape each entry before interpolating; several contain a hyphen and future ones may contain a regex metacharacter.

`WEAK_CTA`'s `startsWith` behaviour stays — "Submit form" must still fire. Only the boundary after the match is added.

Write the helper once and use it in all three places rather than three near-copies.

- [ ] **Step 5: Feed it input it was not designed for**

At minimum: an entry at the very start and very end of the text; an entry followed by punctuation, a comma, a closing bracket, a quote; an entry inside a URL; an entry in capitals; a hyphenated entry with a hyphen on both sides; a multi-word entry split across a line break. Record what each does. **Anything genuinely wrong is a finding now, not after review.**

- [ ] **Step 6: Run the tests**

Run: `npm run build && npm test`
Expected: PASS. Report the count.

- [ ] **Step 7: Mutation-test the boundary in both directions**

Remove the leading boundary → the substring cases must fail. Remove the trailing one → same. Restore after each single mutation immediately, confirming the file changed first.

- [ ] **Step 8: Commit**

```bash
git add src/uxcopy.ts tests/uxcopy.test.ts
git commit -m "fix(uxcopy): match whole words, not substrings of ordinary English"
```

---

### Task 2: The disclosure list and structured output

**Files:**
- Modify: `src/uxcopy.ts`
- Modify: `src/index.ts` (`audit_ux_copy`'s registration)
- Modify: `skills/ship-quality-gate/SKILL.md`
- Modify: `tests/uxcopy.test.ts`

**Interfaces:**
- Consumes: Task 1's matchers.
- Produces: `UXCOPY_NOT_VISIBLE: string[]`, exported; `audit_ux_copy` gains an `outputSchema` declaring `notVisible` and returns `structuredContent`.

- [ ] **Step 1: Read how the seven do it, and copy the shape, not the text**

```bash
grep -n 'NOT_VISIBLE\|auditStructuredFrom\|renderNotVisibleSection' src/lint.ts src/generic.ts src/apple.ts | head -20
```
Use the existing helpers. Do not write a new one.

- [ ] **Step 2: Write the failing guard test**

`tests/integrity.test.ts:641` already asserts set equality between the live disclosure tools and `ship-quality-gate`'s rows. Adding the eighth tool **makes it fail until the skill names it** — run it and watch that happen before you fix it. That failure is the specification for the skill edit.

- [ ] **Step 3: Write `UXCOPY_NOT_VISIBLE`**

Each entry stating something you verified in the code. The spec lists the minimum: closed English-only word lists; `isLikelyCta` is `wordCount <= 5 && sentCount === 1`; Flesch/Kincaid over a syllable **heuristic**; passive voice as a regex over `be` + `ed`/`en`, missing irregular participles; and whatever Task 1's boundary rule still cannot see, **written after Task 1 rather than guessed at**.

Every sentence narrowing. State the rule with one named instance, never a list of instances described as a class.

- [ ] **Step 4: Add the `outputSchema` and `structuredContent`**

Match the seven's shape. Verify on the wire:

```bash
npm run build && node -e "
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
const {StdioClientTransport}=require('@modelcontextprotocol/sdk/client/stdio.js');
(async()=>{const t=new StdioClientTransport({command:process.execPath,args:['dist/index.js'],stderr:'ignore'});
const c=new Client({name:'p',version:'0'},{capabilities:{}});await c.connect(t);
const {tools}=await c.listTools();
console.log(tools.filter(x=>JSON.stringify(x.outputSchema||{}).includes('notVisible')).map(x=>x.name).join(', '));
await c.close();})();"
```
Expected: the seven **plus** `audit_ux_copy`.

- [ ] **Step 5: Add the skill row**

`skills/ship-quality-gate/SKILL.md`'s table gains a row for `audit_ux_copy`, in the voice of its neighbours, saying what the tool reads and what its disclosure covers. Re-run the guard: it must go green.

- [ ] **Step 6: Confirm the tool's own annotations are unchanged**

All 34 tools declare `readOnlyHint: true` and `openWorldHint: false`. Adding an output schema must not disturb that:

```bash
node -e "…listTools…; console.log(tools.length, tools.filter(x=>x.annotations?.readOnlyHint===true).length)"
```
Expected: `34 34`.

- [ ] **Step 7: Every gate**

`npm run build && npm test`, `node scripts/preflight-release.mjs`, `npm run smoke`, `claude plugin validate .`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(uxcopy): publish what the copy audit cannot see, and its findings as data"
```

---

### Task 3: Release v0.28.0

**Files:**
- Modify: `package.json`, `package-lock.json`, `server.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `CHANGELOG.md`

- [ ] **Step 1: Bump every surface**

`npm version minor --no-git-tag-version` writes two; `scripts/sync-version.mjs` handles `server.json` — read it rather than assuming its coverage; the two `.claude-plugin/` manifests are not on that path. Preflight is the check.

- [ ] **Step 2: The CHANGELOG entry**

It must state: the three substring defects **with a measured example each**; that `WEAK_CTA`'s `startsWith` was kept deliberately; that `audit_ux_copy` now publishes a disclosure list and structured findings, making it the **eighth** such tool; and what the disclosure does not cover.

**Do not repeat a claim this repository has already had to retract:** that a release is the first to change a skill (v0.15.0 changed five), or that a count is checked by a suite without confirming it for the module in question.

- [ ] **Step 3: Every gate, then read the prose against the behaviour**

For every "only", "never", "always", "no X does Y" and bare cardinality in what you wrote: name the predicate you read, and ask whether it bounds the class the sentence claims.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: v0.28.0 — the copy audit stops matching inside words, and says what it cannot see"
```

Do **not** tag, publish, or push.

---

## Self-Review

**Spec coverage.** Three boundary fixes → Task 1. `UXCOPY_NOT_VISIBLE` + `outputSchema` + `structuredContent` → Task 2. The `ship-quality-gate` row the guard demands → Task 2 Step 5. Release → Task 3. The spec's "written after Task 1 rather than guessed at" is carried into Task 2 Step 3. **No gaps.**

**Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". Task 1 Step 4 deliberately states the constraint (the boundary class must exclude the hyphen, escaping required, `startsWith` preserved) and leaves the expression to the implementer, because the last package produced four wrong boundary expressions in a row and the fifth came from someone deriving it rather than copying one.

**Type consistency.** `analyzeCopy(text: string): CopyMetrics` is unchanged in signature across both tasks. `UXCOPY_NOT_VISIBLE` is `string[]`, matching `LINT_NOT_VISIBLE` and the other six. `auditStructuredFrom` and `renderNotVisibleSection` are the existing helpers in `src/lint.ts`, imported, not reimplemented.
