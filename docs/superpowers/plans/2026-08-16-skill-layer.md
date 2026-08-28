# Skill Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the MCP server, its six (soon seven) skills and its eight workflow prompts as one installable Claude Code plugin, and make the drift that left the skills ten releases stale fail loudly instead of silently.

**Architecture:** The repository is already in plugin layout — `skills/` sits at the root where a plugin expects it — so the plugin layer is four small declarative files. The substance of this package is the drift check: three testable classes (referential, form, contradiction corpus) added to the `describe("skills distribution")` block that already exists in `tests/integrity.test.ts` and that let all three known drifts through.

**Tech Stack:** TypeScript ESM (`node16` resolution — relative imports keep `.js` extensions), Vitest, `@modelcontextprotocol/sdk`. Tests import from `dist/`, so `npm test` runs `tsc` first and a source-only edit silently no-ops in any manual check.

## Global Constraints

- **No new runtime dependency, no network call at runtime.** Verification steps in this plan may use the network; shipped code may not.
- **No AI/assistant attribution anywhere** — no `Co-Authored-By` trailer, no "Generated with" line, in commits, code comments, skills, READMEs or the CHANGELOG. Naming Claude as a product (`claude mcp add`, "works with Claude Code") is correct and already present.
- **Narrowing claims only.** Never a completeness claim, never a closed enumeration presented as exhaustive, never a count where an open qualifier will do. `tests/integrity.test.ts` rejects absolute-absence sentence forms.
- **Every guard is mutation-tested**: break the thing it protects, confirm the test fails, restore. A guard that cannot fail is worse than none — this repository has shipped four of those.
- **Verify by running, never by reading.** Reproduce every quoted input before acting on it. Run `npm run build` before any manual check.
- **Re-read your own new prose against the new behaviour** before committing, including prose written in the same commit.
- **No existing test may be weakened or deleted.** Replacing a floor with an equality is strengthening and is required by Task 1; removing an assertion is not.
- Marketplace name is exactly `saglitz`. Plugin name is exactly `saglitzdesign`.
- Target release **v0.26.0**. Current version is 0.25.0; live counts are **34 tools, 8 prompts, 106 resources, 96 knowledge documents, 6 skill directories**.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `tests/integrity.test.ts` (modify) | The drift check, all three parts. Extends the existing `describe("skills distribution")` block at line 254. |
| `skills/*/SKILL.md` (modify ×6) | Refreshed content; new `sources:` frontmatter field. |
| `skills/ship-quality-gate/SKILL.md` (create) | The seventh skill — the enforcement half. |
| `skills/README.md`, `README.md` (modify) | Counts and skill lists brought to the live numbers. |
| `.claude-plugin/plugin.json` (create) | Plugin manifest. |
| `.mcp.json` (create) | Server declaration for the plugin. |
| `commands/*.md` (create ×8) | The eight prompts as slash commands. |
| `marketplace.json` (create) | The catalog, named `saglitz`. |
| `tests/plugin.test.ts` (create) | Manifest validity, version equality, command↔prompt agreement. |
| `scripts/preflight-release.mjs` (modify) | `plugin.json` as a sixth version surface. |

> **Corrected after Task 6**, for the three rows above it falsifies: `.mcp.json`
> is **not** part of the plugin (it is this repository's project-scoped dev
> config, and was never created by this package); the catalog ships at
> `.claude-plugin/marketplace.json`, not at the root; and the manifests are a
> **fourth version surface**, with preflight printing seven ✓ lines in total.
> The full correction is at the head of Task 6.

---

### Task 1: Make the existing skill guards bite

The three guards in `tests/integrity.test.ts:254-289` were in place while all three known drifts shipped. Each has a shape that cannot catch the drift it was written for. Fix the guards first, then the drift they expose.

**Files:**
- Modify: `tests/integrity.test.ts:19-28` (the `TOOL_NAMES` mirror), `:254-289` (the skills block), `:32` (the document floor)
- Modify: `README.md` (the "Five skills" sentence), `skills/README.md` (the "83 documents" / "26 tools" sentence)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a `liveToolNames()` helper other tasks may reuse, and the guarantee that any count stated about documents, tools or skills in either README equals the live number.

- [ ] **Step 1: Reproduce the defect before changing anything**

Run:
```bash
node -e "
const fs=require('fs');
const s=fs.readFileSync('tests/integrity.test.ts','utf8');
const names=[...s.match(/const TOOL_NAMES = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/\"([a-z_]+)\"/g)].map(x=>x[1]);
console.log('TOOL_NAMES:', names.length, 'has audit_apple_ui:', names.includes('audit_apple_ui'));
"
```
Expected: `TOOL_NAMES: 33 has audit_apple_ui: false`.

The comment above that Set reads *"Mirrors the registered tool set; server.test.ts proves this list is complete."* Confirm for yourself that it does not — `grep -n "TOOL_NAMES" tests/server.test.ts` returns nothing. The claim is false and must be deleted, not reworded.

- [ ] **Step 2: Write the failing tests**

Add to the `describe("skills distribution")` block. Note `names` and `read` already exist in that scope.

```ts
  it("counts every skill directory, not at least five of them", () => {
    const rootReadme = readFileSync(join(root, "README.md"), "utf8");
    const skillsReadme = readFileSync(join(skillsDir, "README.md"), "utf8");
    // A floor passed while the root README said five and six shipped. An
    // equality is the only shape that notices a seventh skill being added.
    for (const [label, text] of [["README.md", rootReadme], ["skills/README.md", skillsReadme]]) {
      const stated = /\b(?:(\d+)|(Five|Six|Seven|Eight|Nine|Ten))\s+skills\b/i.exec(text);
      expect(stated, `${label} states no skill count`).toBeTruthy();
      const WORDS: Record<string, number> = { five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const claimed = stated![1] ? Number(stated![1]) : WORDS[stated![2].toLowerCase()];
      expect(claimed, `${label} skill count`).toBe(names.length);
    }
  });

  it("names every skill in both READMEs", () => {
    for (const [label, path] of [["README.md", join(root, "README.md")], ["skills/README.md", join(skillsDir, "README.md")]]) {
      const text = readFileSync(path, "utf8");
      expect(names.filter((n) => !text.includes(n)), label).toEqual([]);
    }
  });

  it("states document and tool counts that match the live registry", () => {
    const texts: [string, string][] = [
      ["README.md", readFileSync(join(root, "README.md"), "utf8")],
      ["skills/README.md", readFileSync(join(skillsDir, "README.md"), "utf8")],
    ];
    for (const [label, text] of texts) {
      for (const m of text.matchAll(/\b(\d+)\s+(documents?|knowledge documents?|tools?)\b/g)) {
        const expected = /tool/.test(m[2]) ? TOOL_NAMES.size : docs.length;
        expect(Number(m[1]), `${label}: "${m[0]}"`).toBe(expected);
      }
    }
  });
```

- [ ] **Step 3: Run them and confirm each fails for the stated reason**

Run: `npx vitest run tests/integrity.test.ts -t "skills distribution"`
Expected: three failures — `README.md skill count: expected 5 to be 6`; `skills/README.md: "83 documents": expected 83 to be 96`; `skills/README.md: "26 tools": expected 26 to be 34`.

If the second and third do not fail, the count regex missed the sentence — print the file and fix the regex before proceeding. A guard that does not fire here has not been shown to work.

- [ ] **Step 4: Replace the stale mirror with the live registry**

Delete the hand-written `TOOL_NAMES` Set at `tests/integrity.test.ts:19-28` **and its comment**, and derive the set from the same place `server.test.ts` reads. Import the registry rather than re-listing it:

```ts
/** Derived, never mirrored: a hand-written copy went stale at 33 while 34 shipped,
 *  under a comment claiming another file proved it complete. Nothing did. */
const TOOL_NAMES = new Set(await liveToolNames());
```

Implement `liveToolNames()` in `tests/helpers/` alongside whatever `server.test.ts` already uses to enumerate tools; read that file first and reuse its mechanism rather than inventing a second one. If `server.test.ts` boots the server over stdio, do the same here; if it imports a registry export, import it.

- [ ] **Step 5: Fix the three drifts**

- `README.md`: "Five skills" → "Six skills", and add `design-system-audit` to the list beside the other five.
- `skills/README.md`: "83 documents" → "96 documents"; "26 tools" → "34 tools".

Do not hand-count. Run the server and read the numbers off it:
```bash
npm run build && node -e "
const {spawn}=require('child_process');const p=spawn('node',['dist/index.js']);let b='';
p.stdout.on('data',d=>b+=d);
p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'x',version:'1'}}})+'\n');
setTimeout(()=>p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})+'\n'),300);
setTimeout(()=>{for(const l of b.trim().split('\n')){try{const r=JSON.parse(l);if(r.id===2)console.log('tools',r.result.tools.length)}catch{}};p.kill()},1500);
"
```

- [ ] **Step 6: Replace the document floor with an equality**

`tests/integrity.test.ts:32` reads `expect(docs.length).toBeGreaterThanOrEqual(83)`. A floor cannot notice a document being deleted, which is the failure it exists to catch. Change to `expect(docs.length).toBe(96)` and put the number in one place the READMEs' check also reads, so a document added in a later package updates one constant.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. Record the count; the baseline before this task is **1586**.

- [ ] **Step 8: Mutation-test all four guards**

For each, break it, run `npx vitest run tests/integrity.test.ts`, confirm failure, restore:

1. `README.md` "Six skills" → "Five skills" → count test fails.
2. Delete `design-system-audit` from `skills/README.md`'s table → naming test fails.
3. `skills/README.md` "96 documents" → "83 documents" → registry test fails.
4. Delete a knowledge document → the equality at `:32` fails (the floor would not have).

If any planted defect does not fail a test, that guard is not wired to what it claims to protect.

- [ ] **Step 9: Commit**

```bash
git add tests/integrity.test.ts tests/helpers README.md skills/README.md
git commit -m "test: derive the tool set instead of mirroring it, and count skills exactly"
```

---

### Task 2: The source binding

Each skill declares the knowledge documents it condenses, in its own frontmatter. The binding must survive the skills CLI, which is someone else's parser — that is verified by running it, not assumed.

**Files:**
- Modify: `skills/*/SKILL.md` (six files, frontmatter only)
- Modify: `tests/integrity.test.ts` (the skills block)

**Interfaces:**
- Consumes: `TOOL_NAMES` and `docs` from Task 1.
- Produces: a `sources:` frontmatter field on every skill, parsed as a comma-separated list of knowledge document ids; Task 3 and Task 5 rely on it existing.

- [ ] **Step 1: Verify the skills CLI tolerates an unknown frontmatter field**

This gates the whole task's design. Run it before writing anything:

```bash
cd /tmp && rm -rf skilltest && mkdir skilltest && cd skilltest
cp -R /Users/halidsaglam/Desktop/Businesses/SaglitzDesign/skills ./skills
printf '%s\n' '---' 'name: probe' 'description: A probe skill long enough to satisfy the description length assertion in the integrity suite.' 'sources: clean-interface-design, ai-default-aesthetic' '---' '' '# Probe' > skills/probe-SKILL.md
npx skills@latest add ./skills 2>&1 | tail -20
```

Record the exact output in your report. **If the CLI rejects or strips the unknown field**, abandon the frontmatter design and put the binding in the body under a fixed `## Sources` heading instead, adjusting Step 3's parser to read it there. Either way, state in your report which branch you took and quote the run that decided it.

- [ ] **Step 2: Write the failing test**

```ts
  it("binds every skill to knowledge documents that exist", () => {
    const ids = new Set(docs.map((d) => d.id));
    const problems: string[] = [];
    for (const n of names) {
      const declared = read(n).match(/^sources: (.+)$/m)?.[1];
      if (!declared) { problems.push(`${n}: no sources declared`); continue; }
      for (const id of declared.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (!ids.has(id)) problems.push(`${n} → ${id}`);
      }
    }
    expect(problems).toEqual([]);
  });
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run tests/integrity.test.ts -t "binds every skill"`
Expected: FAIL, six entries of the form `<skill>: no sources declared`.

- [ ] **Step 4: Add the binding to all six skills**

Read each skill and pick the documents it actually condenses — do not guess from the name. `list_design_knowledge` or `loadKnowledge(join(root,"knowledge"))` gives the live id list. For example, `apple-platform-design` condenses at least `apple-hig-liquid-glass`, `ios-app-design`, `macos-app-design`, `wwdc-design-principles`, `apple-intelligence-design`, `apple-accessibility` and `apple-shipping-readiness` — the last two were added in v0.24.0 and the skill does not yet know them.

Frontmatter shape:
```yaml
sources: apple-hig-liquid-glass, ios-app-design, macos-app-design
```

- [ ] **Step 5: Run the test and the suite**

Run: `npx vitest run tests/integrity.test.ts` then `npm test`
Expected: PASS.

- [ ] **Step 6: Mutation-test**

Change one skill's `sources:` to name `no-such-document`; confirm the test fails naming that skill and that id; restore. Then delete a `sources:` line entirely; confirm the "no sources declared" branch fires; restore.

- [ ] **Step 7: Commit**

```bash
git add skills tests/integrity.test.ts
git commit -m "test: bind every skill to the documents it condenses"
```

---

### Task 3: The contradiction corpus

The mechanism at the heart of this package. It cannot decide whether a skill contradicts a document; it can decide whether a skill repeats a fact the knowledge base has already corrected.

**Files:**
- Modify: `tests/integrity.test.ts`
- Modify: `skills/apple-platform-design/SKILL.md`

**Interfaces:**
- Consumes: `names`, `read` from the skills block.
- Produces: `CORRECTED_FACTS`, the array every future knowledge correction appends to.

- [ ] **Step 1: Reproduce the live contradiction**

```bash
grep -n -i "dynamic type" skills/apple-platform-design/SKILL.md
grep -n -i "doesn't support Dynamic Type" knowledge/design-languages/apple-accessibility.md
```
Expected: three hits in the skill (lines 15, 33, 50) and Apple's own sentence in the knowledge base. Line 33 sits under `## iOS specifics` and is **correct**. Lines 15 and 50 are unscoped, in a skill whose description covers macOS.

- [ ] **Step 2: Write the failing test**

```ts
  // Every correction the knowledge base has made becomes an entry here, so a
  // skill cannot go on repeating a fact we have already fixed elsewhere.
  //
  // WHAT THIS DOES NOT CATCH, measured rather than assumed: a contradiction we
  // have not yet corrected anywhere (the corpus is a record of past fixes, not a
  // model of the domain); a claim spread across two sentences; a paraphrase that
  // avoids the matched words; and a correct scoped use that happens to sit under
  // the wrong heading, which `scope` cannot see because it only reads headings.
  const CORRECTED_FACTS: { fact: string; re: RegExp; scope: RegExp; source: string }[] = [
    {
      fact: "macOS does not support Dynamic Type",
      re: /Dynamic Type/i,
      scope: /^##\s.*\b(iOS|iPadOS|iPhone|iPad)\b/i,
      source: "apple-accessibility",
    },
  ];

  it("never restates a corrected fact outside the scope the correction gave it", () => {
    const problems: string[] = [];
    for (const n of names) {
      const lines = read(n).split("\n");
      let heading = "";
      lines.forEach((line, i) => {
        if (/^##\s/.test(line)) heading = line;
        for (const c of CORRECTED_FACTS) {
          if (c.re.test(line) && !c.scope.test(heading)) {
            problems.push(`${n}:${i + 1} restates "${c.fact}" under "${heading || "(no heading)"}" — see ${c.source}`);
          }
        }
      });
    }
    expect(problems).toEqual([]);
  });
```

- [ ] **Step 3: Run it and confirm it fails on exactly the two unscoped lines**

Run: `npx vitest run tests/integrity.test.ts -t "corrected fact"`
Expected: FAIL with two entries — line 15 under `## Core HIG principles` and line 50 under `## Porting checklist (web/Android → Apple)`. Line 33 must **not** appear; if it does, `scope` is wrong and the guard would force correct work to be rewritten.

- [ ] **Step 4: Fix the two lines**

Line 15 currently reads:
> `- Respect system conventions: back gestures, share sheet, context menus, Dynamic Type, safe areas. Don't reinvent them.`

Rewrite so the Dynamic Type clause is scoped to the platforms that have it, e.g.:
> `- Respect system conventions: back gestures, share sheet, context menus, safe areas. Don't reinvent them. On iOS and iPadOS, Dynamic Type is one of them; macOS has no equivalent.`

Line 50 carries `typography (SF + Dynamic Type)` in a web/Android → Apple checklist. Scope it the same way. **Verify the replacement against the knowledge base rather than inventing the macOS half** — `apple-accessibility` states what macOS does instead.

- [ ] **Step 5: Refresh the same file's stale pointer**

Line 10 names five documents and no auditor. Add `apple-accessibility` and `apple-shipping-readiness`, and name `audit_apple_ui`. **This is the step Task 1 makes possible** — before Task 1, the stale `TOOL_NAMES` mirror would have rejected `audit_apple_ui` as a phantom tool. Confirm that is no longer true by running the suite.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/integrity.test.ts` then `npm test`
Expected: PASS.

- [ ] **Step 7: Mutation-test the corpus, both directions**

1. Add `Support Dynamic Type everywhere.` under `## macOS specifics` in any skill → the test must fail naming that line. Restore.
2. Move the *correct* line 33 usage under a non-iOS heading → must fail. Restore.
3. Add a second entry to `CORRECTED_FACTS` for a fact no skill states, run the suite → must still pass, proving the guard does not fire on absence. Restore.

- [ ] **Step 8: Commit**

```bash
git add tests/integrity.test.ts skills/apple-platform-design/SKILL.md
git commit -m "test: stop a skill repeating a fact the knowledge base already corrected"
```

---

### Task 4: The absence-form guard over `skills/`

**Files:**
- Modify: `tests/integrity.test.ts`

**Interfaces:**
- Consumes: the existing `ABSENCE_FORMS`, `scanLine`, `absenceHits` machinery at `tests/integrity.test.ts:604-745`. Read it before extending it; it strips emphasis first and honours a per-document quotation convention.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

```ts
  it("holds every skill to the same narrowing-claim standard as the knowledge base", () => {
    const hits: string[] = [];
    for (const n of [...names.map((n) => join(skillsDir, n, "SKILL.md")), join(skillsDir, "README.md")]) {
      const text = readFileSync(n, "utf8");
      text.split("\n").forEach((line, i) => {
        for (const [form, span] of absenceHits(line, false)) hits.push(`${n}:${i + 1} [${form}] ${span}`);
      });
    }
    expect(hits).toEqual([]);
  });
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/integrity.test.ts -t "narrowing-claim"`
Expected: either PASS (no live hits) or a list. **Do not assume which.** If it passes, the guard is not yet shown to work — Step 4 proves it.

- [ ] **Step 3: Fix any hits**

Rewrite each into the scoped form: "not found in X, having looked at Y". Never add an exemption; never reword a sentence into something false to satisfy a regex.

- [ ] **Step 4: Mutation-test**

Plant `Apple publishes no guidance on this.` into one skill; confirm the test fails naming the file, line and form; restore. Then plant a *scoped* twin — `Not found on the HIG pages read here.` — and confirm it does **not** fire, so the guard distinguishes the two shapes rather than banning the topic.

- [ ] **Step 5: Commit**

```bash
git add tests/integrity.test.ts skills
git commit -m "test: hold the skills to the knowledge base's narrowing-claim standard"
```

---

### Task 5: The seventh skill — `ship-quality-gate`

Seven auditors shipped between v0.20.0 and v0.25.0 and the skill register is silent on all of them. This skill is also the real test of Tasks 1–4: it is new prose written under all four guards.

**Files:**
- Create: `skills/ship-quality-gate/SKILL.md`
- Modify: `README.md`, `skills/README.md` (the counts Task 1 pinned now move 6 → 7)

**Interfaces:**
- Consumes: `sources:` (Task 2), the corpus (Task 3), the absence guard (Task 4), the count equality (Task 1).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Enumerate the seven auditors from the live server, not from memory**

Run the `tools/list` snippet from Task 1 Step 5 and filter to the auditors. Expected set: `design_lint`, `audit_project`, `audit_security`, `audit_generic_design`, `audit_seo_geo`, `audit_performance`, `audit_apple_ui`. For each, read its description off the wire and its disclosure list out of `src/` — the skill must describe what each **cannot** see, not only what it catches.

- [ ] **Step 2: Write the skill**

Frontmatter carries `name: ship-quality-gate`, a `description` over 40 characters that says when to reach for it, and `sources:` naming the documents the auditors cite. Body covers: what each auditor reads, what it deliberately does not (audits report what is *authored*, not what is *measured*), that every one reports a `notVisible` list and why a clean report is not a guarantee, and how to run them.

Keep the register of the existing six: terse, opinionated, no padding.

- [ ] **Step 3: Update both READMEs to seven**

Add the row to `skills/README.md`'s table and to the root `README.md` list, and change both counts from six to seven.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS. Every guard from Tasks 1–4 now applies to prose written after them. If any fires, the skill is wrong — fix the skill, not the guard.

- [ ] **Step 5: Mutation-test the count equality against the new skill**

Revert one README to "Six skills"; confirm Task 1's test fails; restore. This proves the equality tracks growth rather than being pinned to a number that happened to be right once.

- [ ] **Step 6: Commit**

```bash
git add skills README.md
git commit -m "feat: a skill for the enforcement half, which the register never mentioned"
```

---

### Task 6: The plugin manifest

> **Corrected after Task 6 ran.** Three things specified below were measured
> against the shipped Claude Code binary and do not hold. The steps are left as
> written; what shipped instead is here.
>
> **(a) `marketplace.json` goes in `.claude-plugin/`, and its list is keyed
> `plugins`.** Discovery only looks under `.claude-plugin/`; `owner` is
> required; and the `entries` key Step 3 specifies is *ignored at load time*, so
> the wrong key presents as an **empty marketplace rather than an error**. Step
> 1's `readJson("marketplace.json")` and Step 7's `git add … marketplace.json`
> are wrong for the same reason. `claude plugin validate .` is the authority
> here and rejects the file Step 3 writes.
>
> **(b) There is no `.mcp.json` step, and `${CLAUDE_PLUGIN_ROOT}` is not how the
> server is launched.** `.mcp.json` has been tracked since the initial commit as
> the *project-scoped* config for developing this repository, and in project
> scope `${CLAUDE_PLUGIN_ROOT}` is not substituted — the literal path does not
> resolve. Making one file serve both roles broke the repo's own dev config. The
> plugin declares its server **inline in `plugin.json`** as `npx -y
> saglitzdesign-mcp@latest`. Step 3's aside about "if the plugin ships without a
> built `dist/`" has an answer, and it is not a packaging question to note in a
> report: `dist/` is `.gitignore` line 2, a plugin checkout has neither `dist/`
> nor `node_modules/`, and copying `dist/` in still fails on
> `Cannot find package '@modelcontextprotocol/sdk'` because the build does not
> bundle dependencies. **The plugin could not have started its server.** Three
> gates were green while it could not.
>
> **(c) "The sixth preflight surface" is a fourth *version* surface**, and
> preflight prints **seven** ✓ lines, not eight: four version surfaces
> (`package.json`, `package-lock.json`, `server.json`, `.claude-plugin/` plugin
> + marketplace), the CHANGELOG entry, the generated commands, the tag check.
> Step 4's heading and Task 8's Step 4 both say otherwise.

**Files:**
- Create: `.claude-plugin/plugin.json`, `.mcp.json`, `marketplace.json`, `tests/plugin.test.ts`
- Modify: `scripts/preflight-release.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `.claude-plugin/plugin.json` with a `version` field Task 8 bumps, and `marketplace.json` whose `name` is `saglitz`.

- [ ] **Step 1: Write the failing test**

Create `tests/plugin.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));

describe("the plugin manifest", () => {
  const pkg = readJson("package.json");

  it("carries the package version", () => {
    expect(readJson(".claude-plugin/plugin.json").version).toBe(pkg.version);
  });

  it("names the plugin and the marketplace exactly", () => {
    expect(readJson(".claude-plugin/plugin.json").name).toBe("saglitzdesign");
    expect(readJson("marketplace.json").name).toBe("saglitz");
  });

  it("launches the bundled server, not a global one", () => {
    const mcp = readJson(".mcp.json");
    const server = Object.values(mcp.mcpServers)[0] as { command: string; args?: string[] };
    const all = [server.command, ...(server.args ?? [])].join(" ");
    expect(all).toContain("${CLAUDE_PLUGIN_ROOT}");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/plugin.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../.claude-plugin/plugin.json'`.

- [ ] **Step 3: Write the three files**

`.claude-plugin/plugin.json`:
```json
{
  "name": "saglitzdesign",
  "displayName": "SaglitzDesign",
  "version": "0.25.0",
  "description": "Design knowledge and a ship-quality gate for coding agents: 96 documents, 34 tools, seven auditors and eight workflows.",
  "author": { "name": "Saglitz Design", "url": "https://github.com/HalidSaglam" },
  "repository": "https://github.com/HalidSaglam/saglitzdesign-mcp",
  "license": "MIT",
  "keywords": ["design", "ui", "ux", "design-system", "accessibility", "seo"]
}
```
Leave `version` at `0.25.0` here; Task 8 bumps every surface together.

`.mcp.json`:
```json
{
  "mcpServers": {
    "saglitzdesign": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/bin.js"]
    }
  }
}
```
Confirm `dist/bin.js` is the real bin path — `package.json`'s `bin` field names it. If the plugin ships without a built `dist/`, say so in your report rather than papering over it; that is a genuine packaging question and the answer belongs in the report, not in a guess.

`marketplace.json`:
```json
{
  "name": "saglitz",
  "entries": [
    {
      "name": "saglitzdesign",
      "version": "0.25.0",
      "description": "Design knowledge and a ship-quality gate for coding agents.",
      "source": { "type": "github", "owner": "HalidSaglam", "repo": "saglitzdesign-mcp" }
    }
  ]
}
```

- [ ] **Step 4: Add the sixth preflight surface**

`scripts/preflight-release.mjs` currently checks `package.json`, `package-lock.json` (twice), `server.json` (twice) and `CHANGELOG.md`. Read how `server.json` is handled at line 58 and follow the same shape for `.claude-plugin/plugin.json` and `marketplace.json`'s entry version.

- [ ] **Step 5: Run everything**

Run: `npx vitest run tests/plugin.test.ts && npm test && npm run preflight`
Expected: all PASS; preflight reports the two new surfaces by name.

- [ ] **Step 6: Mutation-test**

Set `plugin.json`'s version to `0.24.0` → both the test and preflight must fail. Set `marketplace.json`'s `name` to `saglitzdesign` → the name test must fail. Remove `${CLAUDE_PLUGIN_ROOT}` from `.mcp.json` → the launch test must fail. Restore each.

- [ ] **Step 7: Commit**

```bash
git add .claude-plugin .mcp.json marketplace.json tests/plugin.test.ts scripts/preflight-release.mjs
git commit -m "feat: ship the server, its skills and its workflows as one plugin"
```

---

### Task 7: The eight slash commands

> **Corrected before Task 7 ran.** The premise below — hand-written command files
> that "invoke the corresponding MCP prompt" — was measured against the shipped
> Claude Code binary (v2.1.250) and does not hold. An MCP prompt's command name is
> `mcp__<server>__<prompt>`; the short `server:prompt` alias is emitted **only** for
> remote http/sse servers (`aliases: d ? [...] : undefined`, `d = (type==="http" ||
> type==="sse") && sT(url)`), so our stdio server gets none; and a plugin-installed
> server carries a `plugin_<plugin>_` prefix, making the real name
> `/mcp__plugin_saglitzdesign_saglitzdesign__build_landing_page`. Consequences:
> **(a)** six shipped sentences write these workflows as bare `/name` commands and
> are therefore false — four skill pointer lines plus `README.md:86` and `:105`;
> **(b)** the command bodies must be **generated** from `buildPromptText`, not
> hand-written, or the package ships two descriptions of one workflow; **(c)** the
> name test must read the live `PROMPT_NAMES` export, not a regex over
> `src/prompts.ts` — that is the drift class Task 1 closed for tool names; and
> **(d)** Step 5's `design_review` / `design-review` collision is not one, since the
> documented rule needs the *same* name. The executable version is
> `.superpowers/sdd/2026-08-16-skill-layer/task-7-brief.md`.


**Files:**
- Create: `commands/*.md` (eight files)
- Modify: `tests/plugin.test.ts`

**Interfaces:**
- Consumes: `tests/plugin.test.ts` from Task 6.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Read the eight prompts**

```bash
node -e "
const s=require('fs').readFileSync('src/prompts.ts','utf8');
console.log([...s.matchAll(/name:\s*\"([a-z_]+)\"/g)].map(x=>x[1]));"
```
Expected: `build_landing_page, build_website, build_mobile_app_ui, critique_screenshot, review_paywall, design_review, redesign, port_to_platform`.

- [ ] **Step 2: Write the failing test**

Add to `tests/plugin.test.ts`:

```ts
describe("the slash commands", () => {
  const promptNames = [...readFileSync(join(root, "src/prompts.ts"), "utf8")
    .matchAll(/name:\s*"([a-z_]+)"/g)].map((m) => m[1]);

  it("ships one command per prompt and no others", () => {
    const files = readdirSync(join(root, "commands")).filter((f) => f.endsWith(".md"));
    expect(files.map((f) => f.replace(/\.md$/, "")).sort()).toEqual([...promptNames].sort());
  });

  it("gives each command a description", () => {
    for (const f of readdirSync(join(root, "commands")).filter((f) => f.endsWith(".md"))) {
      const body = readFileSync(join(root, "commands", f), "utf8");
      expect(body.startsWith("---\n"), f).toBe(true);
      expect((body.match(/^description: (.+)$/m)?.[1] ?? "").length, f).toBeGreaterThan(20);
    }
  });
});
```

Add `readdirSync` to the `node:fs` import.

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run tests/plugin.test.ts`
Expected: FAIL — the `commands` directory does not exist.

- [ ] **Step 4: Write the eight commands**

One `.md` per prompt, named exactly after it, with frontmatter `description:` and a body that invokes the corresponding MCP prompt. Take each description from the prompt's own registration in `src/prompts.ts` rather than writing a new one — two descriptions of the same thing is the drift surface this package exists to close.

- [ ] **Step 5: Resolve the `design_review` collision**

`design_review` is a command and `design-review` is a skill. A user offered both must be able to tell them apart. Decide, and record the decision in your report with the reasoning: the command runs the server's structured review workflow; the skill is standalone critique guidance. Make each description say which, in its first clause.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/plugin.test.ts && npm test`
Expected: PASS.

- [ ] **Step 7: Mutation-test**

Delete one command file → the set-equality test must fail naming it. Add `commands/extra.md` → must fail the other way (this is why the test asserts equality, not inclusion). Blank one `description:` → the description test must fail. Restore each.

- [ ] **Step 8: Commit**

```bash
git add commands tests/plugin.test.ts
git commit -m "feat: the eight workflows as slash commands"
```

---

### Task 8: Release v0.26.0

**Files:**
- Modify: `package.json`, `package-lock.json`, `server.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `CHANGELOG.md`, `README.md`

> **Corrected after Task 6.** The catalog lives at `.claude-plugin/marketplace.json` (discovery expects that path) and its entry list is keyed `plugins`, not `entries` — the `entries` key this plan originally specified is *ignored at load time*, so it presents as an empty marketplace rather than an error. The plugin declares its MCP server **inline in `plugin.json`** against the published npm package (`npx -y saglitzdesign-mcp@latest`); `.mcp.json` is the repository's own project-scoped dev config and is **not** part of the plugin.

**Interfaces:**
- Consumes: every earlier task.
- Produces: the release.

- [ ] **Step 1: Bump the version everywhere**

Run: `npm version minor --no-git-tag-version` and confirm it writes `package.json` and `package-lock.json`. Then update `server.json` (two fields), `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`'s entry by hand, or extend `scripts/sync-version.mjs` if that is where `server.json` is already synced — read it first.

- [ ] **Step 2: Write the CHANGELOG entry**

It must state, in plain terms:
- the plugin, and the two commands a user types (`claude plugin marketplace add …`, then `claude plugin install saglitzdesign@saglitz`);
- the seventh skill and what it covers;
- **that skill users must re-run `npx skills@latest add HalidSaglam/saglitzdesign-mcp`** — a skill is copied into the agent, so nothing else reaches them, and this is the first release that changes a skill;
- what the drift check does and, explicitly, **what it does not catch**.

Every sentence narrowing, never a completeness claim. Run each factual claim before writing it.

- [ ] **Step 3: Add the plugin install section to the README**

Beside the existing `npx` and `claude mcp add` instructions, not replacing them — the three channels behave differently and the README must not blur them.

- [ ] **Step 4: Run every gate**

Run: `npm test && npm run preflight && npm run smoke`
Expected: all PASS. Preflight must report 0.26.0 across all eight surfaces (six from before plus the two added in Task 6). *(Corrected after Task 6: preflight prints **seven** ✓ lines — four version surfaces, the CHANGELOG entry, the generated commands, and the tag check.)*

- [ ] **Step 5: Re-read the new prose against the new behaviour**

The CHANGELOG describes guards written in Tasks 1–4 and files written in Tasks 6–7. Open each and check the sentence against the thing. This package's parent branch shipped a false sentence in exactly this step, twice.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: v0.26.0 — one plugin, a seventh skill, and a drift check that bites"
```

---

## Self-Review

**Spec coverage.** Plugin layer → Task 6 (manifest, `.mcp.json`, marketplace) and Task 7 (commands). Drift check part 1 referential → Tasks 1 and 2. Part 2 form → Task 4. Part 3 contradiction corpus → Task 3. Refreshing the six skills → Tasks 1 (counts), 2 (bindings), 3 (Apple content and pointer), 4 (any absence forms). Seventh skill → Task 5. Version as a preflight surface → Task 6 Step 4. The `design_review` collision → Task 7 Step 5. The skills-CLI frontmatter verification → Task 2 Step 1. Release notes telling skill users to re-run the add command → Task 8 Step 2. **One gap, and it was substituted rather than covered** *(recorded after Task 6)*: the spec's testing bullet asks that "`npm run smoke` is extended to confirm the packed artefact and the manifest agree", and `scripts/smoke-pack.mjs` is untouched on this branch (`git diff --stat main...HEAD -- scripts/` names only `generate-commands.mjs` and `preflight-release.mjs`). There is nothing there for smoke to compare: `npm pack --dry-run --json` reports 171 files and **zero** under `.claude-plugin/`, so the packed artefact does not carry the manifest. Preflight owns the version equality instead, and asserts it against the manifests on disk. The substitution is sound; announcing it as no gap was not.

**Placeholder scan.** No "TBD", no "add appropriate error handling", no "similar to Task N". Every code step carries the code. Two steps deliberately defer a decision to the implementer with instructions to record it rather than guess — Task 2 Step 1 (which branch the CLI forces) and Task 6 Step 3 (whether the plugin ships a built `dist/`); both name what to do in each case and require the deciding run to be quoted.

**Type consistency.** `TOOL_NAMES` is a `Set<string>` in Task 1 and used as `.size` in Task 1 and `.has()` in the pre-existing test. `names`/`read`/`skillsDir`/`docs`/`root` are the identifiers already in scope in `tests/integrity.test.ts:254-259` and `:15-16`. `sources:` is parsed identically in Tasks 2, 3 and 5. `readdirSync` is imported once in Task 7 Step 2.
