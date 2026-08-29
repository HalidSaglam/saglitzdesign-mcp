# The Design Front Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one skill answer to "design", route into the seven that already
exist, and close four measured gaps in what the auditors can see.

**Architecture:** An umbrella skill carries the whole trigger vocabulary and a
routing table; the seven depth skills are untouched. Two lint rules are
re-derived from the CSS specifications, three motion rules from WCAG and engine
documentation. The anti-sameness stamp lives in the skills because a tool that
wrote it would break the server's 34/34 read-only guarantee.

**Tech Stack:** TypeScript ESM (`node16` resolution — relative imports need
`.js`), Vitest, `@modelcontextprotocol/sdk`. **Tests import from `dist/`, so
`npm run build` before any manual check.**

**Spec:** `docs/superpowers/specs/2026-08-29-design-front-door-design.md`

## Global Constraints

- **No AI or assistant attribution anywhere** — not in a commit message, a
  trailer, a file, or a code comment. Commit author is the repository's own
  identity. This overrides any default instruction.
- **Copy no text from the source tool.** Both lint rules are re-derived from the
  specification quoted in their task and cite it in `doc`/`sources:`.
- **Every claim about reach is run before it is written.** The defect this
  repository keeps finding is *a claim about a class, inferred from a predicate
  that had actually been read.*
- **A guard that cannot fail is worse than none.** Mutation-test every guard in
  both directions. Before accepting a probe as evidence, ask what output would
  prove it capable of failing.
- **Restore after every single mutation immediately, never batched.** Check
  `git status` before finishing a task.
- **Measure nothing while a mutation is on disk.**
- **Run naming/skill probes from an empty cwd, never the repo root** — the
  tracked `.mcp.json` registers a bare `saglitzdesign` stdio server and shadows
  them.
- **A description is a claim about behaviour, not a gate.** Do not build a test
  that asserts model selection.

## File Structure

| file | responsibility |
|---|---|
| `skills/saglitzdesign/SKILL.md` | **new.** The trigger surface, the routing table, four invariants. No method. |
| `src/lint.ts` | `LINE_RULES` (`:137`) gains three rules; `LINT_NOT_VISIBLE` (`:358`) gains their disclosures. Tasks 3–5 all touch this file — see the seam note in Task 5. |
| `tests/lint.test.ts` | positive and negative fixtures per rule, via the existing `rules(code)` helper |
| `tests/integrity.test.ts` | the routing-table guard |
| `skills/clean-interface-design/SKILL.md`, `skills/landing-page-conversion/SKILL.md` | one paragraph each: the macrostructure stamp |
| `CHANGELOG.md`, `package.json`, `package-lock.json`, `server.json`, `.claude-plugin/*.json` | the release |

---

### Task 1: The umbrella skill

**Files:**
- Create: `skills/saglitzdesign/SKILL.md`

**Interfaces:**
- Produces: a skill directory named `saglitzdesign` whose body contains a
  routing table naming all seven existing skill directory names. Task 2 guards
  exactly that.

- [ ] **Step 1: List the seven depth skills from disk, not from memory**

```bash
ls -d skills/*/ | xargs -n1 basename | grep -v '^saglitzdesign$'
```
Expected: `apple-platform-design clean-interface-design design-review design-system-audit landing-page-conversion motion-and-animation ship-quality-gate`

- [ ] **Step 2: Read what the seven already claim, so the umbrella does not contradict them**

```bash
for f in skills/*/SKILL.md; do
  echo "── $(basename $(dirname $f))"
  awk '/^description:/{sub(/^description: */,"");print;exit}' "$f"
done
```

The umbrella's description must be a **superset** of these in vocabulary and must
not promise anything none of them delivers.

- [ ] **Step 3: Verify the skills CLI tolerates the frontmatter you are about to write**

The other seven carry a `sources:` field. Confirm it still installs — and note
that the CLI counts **directories**, so a probe must be `skills/<dir>/SKILL.md`,
never a loose file:

```bash
mkdir -p /tmp/skprobe && cp -r skills /tmp/skprobe/ 2>/dev/null
npx skills@latest add ./ --dry-run 2>&1 | head -20 || echo "record what the CLI actually does"
```
Record the exact output in your report. If the CLI rejects an unknown field,
stop and report rather than dropping `sources:`.

- [ ] **Step 4: Write the skill**

`skills/saglitzdesign/SKILL.md`. Frontmatter:

```yaml
---
name: saglitzdesign
description: <~900 chars — see below>
sources: <the knowledge docs this skill's invariants come from>
---
```

The description must contain, in natural prose rather than a keyword dump:
verbs (design, redesign, build, restyle, improve, critique, review, audit,
simplify, polish, make bolder, make quieter, animate); surfaces (landing page,
marketing site, dashboard, app screen, component, form, onboarding, empty state,
paywall, settings); topics (visual hierarchy, typography, colour, spacing,
layout, motion, accessibility, design tokens, UX copy); platforms (web, iOS,
Android, macOS). It must end with the boundary: **not for pure functionality** —
"make the form work", "add sorting to the table" must not fire it.

Body, in this order:
1. One sentence saying what this skill is: the door into a design system that
   can prove its claims.
2. **The routing table** — seven rows, sign → skill name, defaulting to
   `clean-interface-design`.
3. **Four invariants**: generate the system before the pixels; bind every value
   to a token; run the deterministic auditors at the close; ground every number
   claimed in a measured output.
4. A pointer to the MCP tools and the eight commands for depth.

**It must not restate the build/review/port method.** That lives once in
`src/prompts.ts` and `commands/` is generated from it.

- [ ] **Step 5: Check it against the four existing skill guards**

```bash
npm run build && npx vitest run tests/integrity.test.ts
```
Expected: PASS. If the `sources:` binding guard fails, your ids do not resolve —
fix the ids, not the guard. If the absolute-absence guard fires, you wrote a
sentence of the form `<subject> never/does not <publication verb>`; reword it.

- [ ] **Step 6: Commit**

```bash
git add skills/saglitzdesign
git commit -m "feat: one skill that answers to design, and routes into the seven"
```

---

### Task 2: The routing guard, and the trigger measurement

**Files:**
- Modify: `tests/integrity.test.ts`

**Interfaces:**
- Consumes: `skills/saglitzdesign/SKILL.md` from Task 1.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Add to `tests/integrity.test.ts`. Derive both sides from disk — never a
hand-written list, which is the drift class the tool-name guard closed:

```ts
describe("the umbrella skill routes into every depth skill", () => {
  const umbrella = join(skillsDir, "saglitzdesign", "SKILL.md");
  const depth = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "saglitzdesign")
    .map((e) => e.name)
    .sort();

  // Equality in both directions. A skill added without a routing row is
  // unreachable through the door; a row naming a directory that does not
  // exist sends the reader nowhere. Neither fails without this.
  it("names every depth skill, and names nothing else", () => {
    const body = readFileSync(umbrella, "utf8");
    const named = depth.filter((n) => body.includes(n));
    expect(named).toEqual(depth);

    const invented = [...body.matchAll(/`([a-z][a-z-]{4,})`/g)]
      .map((m) => m[1])
      .filter((n) => n.includes("-") && !depth.includes(n))
      .filter((n) => existsSync(join(skillsDir, n)) === false && /^[a-z]+(-[a-z]+)+$/.test(n));
    // Any hyphenated backticked token that looks like a skill name but is not
    // one is reported, so a renamed skill leaves a dangling row.
    expect(invented.filter((n) => body.includes(`→ \`${n}\``))).toEqual([]);
  });

  it("states the boundary that keeps it off pure functionality", () => {
    const fm = readFileSync(umbrella, "utf8").split("---")[1] ?? "";
    expect(fm.toLowerCase()).toMatch(/not for|does not cover|beyond/);
  });
});
```

- [ ] **Step 2: Run it and confirm each assertion fails for its own reason**

Run: `npx vitest run tests/integrity.test.ts -t "umbrella"`
Expected: PASS if Task 1 was done correctly. **If it passes immediately, prove
it can fail** before moving on — see Step 3.

- [ ] **Step 3: Mutation-test, both directions, restoring after each**

```bash
# a) a depth skill the table does not name
mkdir -p skills/zz-probe && printf -- '---\nname: zz-probe\ndescription: probe\n---\n# p\n' > skills/zz-probe/SKILL.md
npx vitest run tests/integrity.test.ts -t "umbrella"   # MUST FAIL
rm -rf skills/zz-probe

# b) a row naming a skill that does not exist
perl -0pi -e 's/`clean-interface-design`/`clean-interface-designs`/' skills/saglitzdesign/SKILL.md
npx vitest run tests/integrity.test.ts -t "umbrella"   # MUST FAIL
git checkout -- skills/saglitzdesign/SKILL.md

# c) the boundary sentence removed
```
Record the exact output of each. Restore immediately after each one, not at the
end. Confirm `git status` is clean before continuing.

- [ ] **Step 4: Measure the trigger — a number, not a gate**

This is **not** a test and must not become one. From an empty directory, with
the repository's skills installed, run a set of real requests and record which
skill the model reaches for:

```bash
cd "$(mktemp -d)"
for p in "make this dashboard better" "design a landing page for a CRM" \
         "why does this page look cheap" "is this ready to ship" \
         "the spacing feels off" "add sorting to the table"; do
  echo "── $p"
  claude -p "$p" --allowedTools Skill 2>&1 | grep -iEo 'saglitzdesign|impeccable|ui-ux-pro-max|frontend-design' | head -1
done
```

Report the rate. **State its scope explicitly:** it measures the skill set
installed on this machine, not the world — another user has no `impeccable`, or
has five rivals. The last prompt is the negative control: it should *not* reach
for us.

- [ ] **Step 5: Commit**

```bash
git add tests/integrity.test.ts
git commit -m "test: hold the umbrella to the skills it claims to route into"
```

---

### Task 3: Lint rule — a bare `1fr` grid track

**Files:**
- Modify: `src/lint.ts` (`LINE_RULES` at `:137`, `LINT_NOT_VISIBLE` at `:358`)
- Modify: `tests/lint.test.ts`

**Interfaces:**
- Consumes: the `LineRule` interface at `src/lint.ts:67` —
  `{ id: string; severity: "error"|"warning"|"info"; test: (line: string, full: string) => boolean; message: string; fix: string; doc?: string }`
- Produces: rule id `grid-track-no-min`. Tasks 4 and 5 add sibling rules to the
  same array.

- [ ] **Step 1: Read the specification, do not take it from this plan**

Fetch https://www.w3.org/TR/css-grid-1/ §7.2.1 and §6.6. The normative sentence
is: *"When appearing outside a minmax() notation, implies an automatic minimum
(i.e. minmax(auto, <flex>))."* §7.2.1 also defines the `auto` minimum as *"the
largest minimum size (specified by min-width/min-height) of the grid items
occupying the grid track"*, with §6.6 governing when that equals the
content-based minimum.

**This bounds the claim.** "A bare `1fr` always floors at the image's width" is
false. Write the message accordingly.

- [ ] **Step 2: Write the failing test**

Add to `tests/lint.test.ts`, using the existing `rules(code)` helper:

```ts
describe("grid-track-no-min", () => {
  it("fires on a bare 1fr track in a snippet that renders an image", () => {
    expect(rules(`
      <div class="g"><img src="a.png" alt="a"></div>
      <style>.g { display: grid; grid-template-columns: 1fr 1fr; }</style>
    `)).toContain("grid-track-no-min");
  });

  it("does not fire when the track already carries a minimum", () => {
    expect(rules(`
      <div class="g"><img src="a.png" alt="a"></div>
      <style>.g { display: grid; grid-template-columns: minmax(0, 1fr) 1fr; }</style>
    `)).not.toContain("grid-track-no-min");
  });

  it("does not fire on a grid with no image in the snippet", () => {
    expect(rules(`.g { display: grid; grid-template-columns: 1fr 1fr; }`))
      .not.toContain("grid-track-no-min");
  });

  it("does not fire on a fixed track", () => {
    expect(rules(`
      <img src="a.png" alt="a">
      <style>.g { grid-template-columns: 200px 200px; }</style>
    `)).not.toContain("grid-track-no-min");
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npm run build && npx vitest run tests/lint.test.ts -t "grid-track-no-min"`
Expected: FAIL — the first assertion, because no rule produces that id.

- [ ] **Step 4: Add the rule to `LINE_RULES`**

```ts
  {
    id: "grid-track-no-min",
    severity: "info",
    // CSS Grid Level 1 §7.2.1: a <flex> outside minmax() "implies an automatic
    // minimum (i.e. minmax(auto, <flex>))". That auto minimum is the largest
    // min-width/min-height of the items in the track, and §6.6 decides when it
    // becomes the content-based minimum — so a wide item CAN floor the track
    // above its share. Whether it does here is not readable from the
    // declaration, which is why this is `info` and why LINT_NOT_VISIBLE says so.
    // `minmax(0, 1fr)` removes the condition entirely at no cost; src/layout.ts
    // already emits that form.
    test: (l, full) =>
      /grid-template-(columns|rows)\s*:[^;]*(^|[\s,(])1fr/.test(l) &&
      !/minmax\s*\(\s*0/.test(l) &&
      /<img[\s>]/.test(full),
    message:
      "A bare `1fr` track resolves to `minmax(auto, 1fr)`, so an item with a large " +
      "intrinsic width can hold the track above its share (CSS Grid 1 §7.2.1, §6.6). " +
      "This snippet renders an image.",
    fix: "Write `minmax(0, 1fr)` for tracks that carry images or other wide intrinsic content.",
    doc: "responsive-layout",
  },
```

If `responsive-layout` is not a real knowledge id, run
`node -e "import('./dist/knowledge.js').then(m=>console.log(Object.keys(m.loadKnowledge('knowledge'))))"`
and pick one that exists — the `doc` field is checked by an existing suite.

- [ ] **Step 5: Add the disclosure**

To `LINT_NOT_VISIBLE`:

```ts
  `Whether a bare \`1fr\` track actually overflows: §6.6's automatic-minimum conditions depend on the grid item's own properties, and the declaration does not carry them. A \`grid-track-no-min\` finding is a robustness note, not a proven overflow.`,
```

- [ ] **Step 6: Run the tests**

Run: `npm run build && npx vitest run tests/lint.test.ts && npm test`
Expected: PASS.

- [ ] **Step 7: Mutation-test**

Drop the `<img` clause from `test` → the third assertion must fail. Drop the
`minmax\(\s*0` clause → the second must fail. Restore after each, immediately.

- [ ] **Step 8: Commit**

```bash
git add src/lint.ts tests/lint.test.ts
git commit -m "feat(lint): flag a bare 1fr track where an image can floor it"
```

---

### Task 4: Lint rule — `overflow-x: hidden` on `html`/`body`

**Files:**
- Modify: `src/lint.ts`
- Modify: `tests/lint.test.ts`

**Interfaces:**
- Consumes: the same `LineRule` interface as Task 3.
- Produces: rule id `overflow-hidden-root`.

- [ ] **Step 1: Read the specification**

Fetch https://www.w3.org/TR/css-overflow-3/ §3.1. `hidden`: *"the content must
still be scrollable programmatically … and the box is therefore still a scroll
container."* `clip`: *"forbids scrolling entirely, through any mechanism, and
therefore the box is not a scroll container."*

**What this proves is that the box becomes a scroll container.** That this breaks
a `position: sticky` descendant is a *second* inference and needs its own source
(CSS Position 3). Either cite that too, or claim only the first. Do not smuggle
the second in as though the quote covered it.

- [ ] **Step 2: Write the failing test**

```ts
describe("overflow-hidden-root", () => {
  it("fires on overflow-x: hidden under a body selector", () => {
    expect(rules(`body { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
  });

  it("fires under html and :root too", () => {
    expect(rules(`html { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
    expect(rules(`:root { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
  });

  it("does not fire on an ordinary element", () => {
    expect(rules(`.carousel { overflow-x: hidden; }`)).not.toContain("overflow-hidden-root");
  });

  it("does not fire when clip is already used", () => {
    expect(rules(`body { overflow-x: clip; }`)).not.toContain("overflow-hidden-root");
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npm run build && npx vitest run tests/lint.test.ts -t "overflow-hidden-root"`
Expected: FAIL.

- [ ] **Step 4: Implement**

The selector is on an earlier line than the declaration, so the rule needs
`full`. `src/security.ts` already scans back to the nearest statement boundary —
read that helper before writing a new one.

```ts
  {
    id: "overflow-hidden-root",
    severity: "warning",
    // CSS Overflow Level 3 §3.1: `hidden` keeps the box "still a scroll
    // container" (only the UI is suppressed; programmatic scrolling remains),
    // while `clip` "forbids scrolling entirely … and therefore the box is not a
    // scroll container". On the root that difference is load-bearing, because a
    // scroll container is what descendants position against.
    test: (l, full) => {
      if (!/overflow(-x)?\s*:\s*hidden/.test(l)) return false;
      const at = full.indexOf(l);
      const before = at < 0 ? full : full.slice(0, at);
      const open = before.lastIndexOf("{");
      if (open < 0) return false;
      const sel = before.slice(before.lastIndexOf("}", open) + 1, open);
      return /(^|[\s,])(html|body|:root)\s*$/.test(sel.trim().replace(/\s+/g, " "));
    },
    message:
      "`overflow: hidden` on the root still makes it a scroll container — only the " +
      "scrolling UI is suppressed (CSS Overflow 3 §3.1). `overflow: clip` is not a " +
      "scroll container at all.",
    fix: "Use `overflow-x: clip` on `html`/`body`, and fix the element that actually overflows.",
    doc: "responsive-layout",
  },
```

- [ ] **Step 5: Add the disclosure**

```ts
  `What is overflowing: this reads the declaration, not the layout, so it cannot say which element exceeds the viewport — only that the root was made a scroll container to hide it.`,
```

- [ ] **Step 6: Run the tests**

Run: `npm run build && npx vitest run tests/lint.test.ts && npm test`
Expected: PASS.

- [ ] **Step 7: Mutation-test**

Change `(html|body|:root)` to `(html|body|:root|\.[a-z]+)` → the "ordinary
element" assertion must fail. Remove the `clip` distinction from the message and
confirm nothing catches it — that is a known blind spot; record it rather than
pretending otherwise. Restore immediately after each.

- [ ] **Step 8: Commit**

```bash
git add src/lint.ts tests/lint.test.ts
git commit -m "feat(lint): the root is still a scroll container under overflow: hidden"
```

---

### Task 5: Motion rules — the sourced subset

**Files:**
- Modify: `src/lint.ts`
- Modify: `tests/lint.test.ts`

**Interfaces:**
- Consumes: the same `LineRule` interface.
- Produces: rule ids `motion-no-reduced-cover`, `animates-layout-property`,
  `transition-all`.

**Seam note — read before starting.** Tasks 3, 4 and 5 all append to
`LINE_RULES` and `LINT_NOT_VISIBLE`. The v0.26.0 package's sharpest defect class
was *a later task falsifying an earlier task's shipped sentence*. Before you
write a comment that says what the lint suite covers, re-read the two rules
added just before yours and make sure your sentence is still true beside them.

- [ ] **Step 1: Establish that the gap is real, rather than assuming it**

```bash
grep -rn 'transition-all\|prefers-reduced-motion\|animates' src/lint.ts | head
```
Expected: no matches. `src/motion.ts` *generates* correct easing and
`src/compare.ts:318` mentions reduced motion, but nothing audits for either.
Record what you found.

- [ ] **Step 2: Write the failing tests**

```ts
describe("motion rules", () => {
  it("flags a keyframe animation with no reduced-motion cover", () => {
    expect(rules(`
      @keyframes slide { from { transform: translateY(8px); } to { transform: none; } }
      .card { animation: slide 200ms ease-out; }
    `)).toContain("motion-no-reduced-cover");
  });

  it("does not flag it when the file honours the preference", () => {
    expect(rules(`
      @keyframes slide { from { transform: translateY(8px); } to { transform: none; } }
      .card { animation: slide 200ms ease-out; }
      @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
    `)).not.toContain("motion-no-reduced-cover");
  });

  it("flags animating a layout property", () => {
    expect(rules(`.a { transition: width 200ms ease; }`)).toContain("animates-layout-property");
    expect(rules(`.b { transition: opacity 200ms ease; }`)).not.toContain("animates-layout-property");
  });

  it("flags transition: all and its Tailwind spelling", () => {
    expect(rules(`.a { transition: all 200ms ease; }`)).toContain("transition-all");
    expect(rules(`<div class="transition-all duration-200"></div>`)).toContain("transition-all");
  });
});
```

- [ ] **Step 3: Run and confirm they fail**

Run: `npm run build && npx vitest run tests/lint.test.ts -t "motion rules"`
Expected: FAIL.

- [ ] **Step 4: Implement the three rules**

```ts
  {
    id: "motion-no-reduced-cover",
    severity: "warning",
    // WCAG 2.1 SC 2.3.3 (Animation from Interactions) and Media Queries Level 5,
    // which defines the feature. This is an accessibility rule, not a taste one.
    test: (l, full) =>
      /(^|[\s;{])animation\s*:|@keyframes\s/.test(l) &&
      !/prefers-reduced-motion/.test(full),
    message:
      "An animation with nothing honouring `prefers-reduced-motion` in the same source.",
    fix: "Add `@media (prefers-reduced-motion: reduce) { … }` reducing or removing the movement — do not remove the feedback entirely.",
    doc: "accessibility",
  },
  {
    id: "animates-layout-property",
    severity: "warning",
    // Animating a property that participates in layout forces layout and paint
    // on every frame, where transform/opacity are composited. Sourced to engine
    // rendering documentation, not to taste.
    test: (l) =>
      /transition(-property)?\s*:[^;]*\b(width|height|top|left|right|bottom|margin|padding)\b/.test(l) ||
      /@keyframes[^{]*\{[^}]*\b(width|height|top|left)\s*:/.test(l),
    message:
      "Animating a layout property forces layout and paint each frame; `transform` and `opacity` are composited.",
    fix: "Animate `transform` / `opacity` instead — `translate` for position, `scale` for size.",
    doc: "motion-microinteractions",
  },
  {
    id: "transition-all",
    severity: "info",
    // A superset of the rule above: `all` animates properties you did not
    // choose, layout ones included. The justification is that consequence, not
    // that the shorthand is inelegant.
    test: (l) => /transition\s*:\s*all\b/.test(l) || /(^|["'\s])transition-all(["'\s]|$)/.test(l),
    message:
      "`transition: all` animates every property that changes, including layout properties you did not intend.",
    fix: "Name the properties: `transition: opacity 200ms ease, transform 200ms ease`.",
    doc: "motion-microinteractions",
  },
```

Verify both `doc` ids exist before committing (see Task 3 Step 4).

- [ ] **Step 5: Add the disclosures**

```ts
  `Whether an animation is actually reduced: \`motion-no-reduced-cover\` looks for the media feature anywhere in the source it was given, so a project honouring the preference in a separate stylesheet reads as uncovered here.`,
  `Runtime motion: anything animated from JavaScript, a motion library, or SwiftUI is invisible to this — it reads CSS declarations only.`,
```

- [ ] **Step 6: Run everything**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 7: Mutation-test each of the three**

Positive and negative for each, restoring immediately after each single
mutation. Then check the seam: re-read the comments Tasks 3 and 4 added and
confirm none of them is now false.

- [ ] **Step 8: Commit**

```bash
git add src/lint.ts tests/lint.test.ts
git commit -m "feat(lint): three motion rules with sources, and none without one"
```

---

### Task 6: The macrostructure stamp

**Files:**
- Modify: `skills/clean-interface-design/SKILL.md`
- Modify: `skills/landing-page-conversion/SKILL.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Confirm the constraint that shapes this**

```bash
npm run build && node -e "
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
const {StdioClientTransport}=require('@modelcontextprotocol/sdk/client/stdio.js');
(async()=>{const t=new StdioClientTransport({command:process.execPath,args:['dist/index.js'],stderr:'ignore'});
const c=new Client({name:'p',version:'0'},{capabilities:{}});await c.connect(t);
const {tools}=await c.listTools();
console.log(tools.length, tools.filter(x=>x.annotations?.readOnlyHint===true).length);
await c.close();})();"
```
Expected: `34 34`. **This is why the stamp is not a tool.** One tool writing to
the user's disk makes "this server reads and never writes" false.

- [ ] **Step 2: Write the paragraph**

The same substance in both skills, worded for each one's context. It must say:

- Before writing CSS, look for a prior stamp comment in the project's existing
  stylesheets.
- If one is there, choose a **different** page shape and a different navigation
  and footer treatment.
- Leave your own stamp as the first line of the CSS you write, naming the shape
  you chose.

Give the stamp a concrete, greppable form, e.g.
`/* saglitzdesign · macrostructure: <name> */`, and name a small set of shapes
so "different" is decidable rather than a matter of taste.

**The agent writes the stamp. No tool writes anything.** Say that in the skill,
because a reader will otherwise expect a tool to do it.

- [ ] **Step 3: Check both skills still pass the four guards**

Run: `npm run build && npx vitest run tests/integrity.test.ts`
Expected: PASS. The absolute-absence guard is the one most likely to fire on new
prose — if it does, you wrote `<subject> never <publication verb>`.

- [ ] **Step 4: Commit**

```bash
git add skills/clean-interface-design skills/landing-page-conversion
git commit -m "feat(skills): stamp the page shape so the next run picks another"
```

---

### Task 7: Release v0.27.0

**Files:**
- Modify: `package.json`, `package-lock.json`, `server.json`,
  `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
  `CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: every earlier task.

- [ ] **Step 1: Bump every surface**

`npm version minor --no-git-tag-version` writes `package.json` and
`package-lock.json`; `scripts/sync-version.mjs` handles `server.json` — read it
first rather than assuming its coverage. The two `.claude-plugin/` manifests are
**not** on that path. Preflight is the check, not your memory:

```bash
npm run build && node scripts/preflight-release.mjs
```
It prints seven lines. All must say 0.27.0.

- [ ] **Step 2: Write the CHANGELOG entry**

Every sentence narrowing. It must state:
- the umbrella skill and what fires it — **and what does not**;
- the two lint rules **with their specification sections**, and the limit of
  each (`grid-track-no-min` is a robustness note, not a proven overflow;
  `overflow-hidden-root` proves scroll-container status, not a sticky failure,
  unless you sourced that);
- the three motion rules, and that two candidate rules were refused for having
  no source;
- the stamp, and that no tool writes it;
- **that skill users must re-run `npx skills@latest add HalidSaglam/saglitzdesign-mcp`.**
  A skill is copied into the agent, so nothing else reaches them. Note that
  v0.15.0 also modified existing skills — this is not the first such release,
  and the previous plan said it was.

- [ ] **Step 3: Update the README's skill section**

It lists the skills. There are eight directories now, one of which is the door.
Say which is which.

- [ ] **Step 4: Every gate**

```bash
npm run build && npm test && node scripts/preflight-release.mjs && npm run smoke
claude plugin validate .
```
Expected: all PASS.

- [ ] **Step 5: Read the new prose against the new behaviour**

Open each thing your sentences describe and check the sentence against the
thing. Then sweep your own draft for the named generator: for every "only",
"never", "always", "no X does Y" and bare cardinality, name the predicate you
read and ask whether it bounds the class your sentence claims.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: v0.27.0 — a door that answers to design, and five rules with sources"
```

Do **not** tag or push. The user releases.

---

## Self-Review

**Spec coverage.** Umbrella skill → Task 1. Routing guard → Task 2. Trigger
measurement, explicitly not a gate → Task 2 Step 4. Rule A (Grid §7.2.1/§6.6) →
Task 3. Rule B (Overflow §3.1) → Task 4. The three sourced motion rules and the
two refusals → Task 5. The stamp, and why it cannot be a tool → Task 6. Release →
Task 7. **No gaps.**

**Placeholder scan.** No "TBD", no "add appropriate error handling", no "similar
to Task N". Every code step carries its code. Two steps deliberately defer to a
measurement rather than asserting: Task 1 Step 3 (what the skills CLI does with
an unknown frontmatter field) and Task 3/5 Step 4's `doc` id check — both name
the command that decides and require its output in the report.

**Type consistency.** All three tasks that touch `src/lint.ts` use the
`LineRule` shape at `src/lint.ts:67` — `test: (line: string, full: string) =>
boolean`, `doc?: string`. Task 4 is the only one that uses the `full` parameter
for selector context; Tasks 3 and 5 use it for presence checks. `rules(code)` in
`tests/lint.test.ts` is the existing helper at the top of that file, not a new
one. Rule ids are distinct: `grid-track-no-min`, `overflow-hidden-root`,
`motion-no-reduced-cover`, `animates-layout-property`, `transition-all`.
