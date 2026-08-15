# Apple Knowledge and a Tiered Source Standard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Apple documents sources worth citing, and replace the single flat source allowlist with three tiers that mean something — so package E2's `audit_apple_ui` can cite a document that both makes its claim and rests on a primary source.

**Architecture:** `tests/integrity.test.ts` owns the allowlist. It becomes three named sets — `standard`, `vendor`, `research` — with a host permitted to appear in exactly one. Enforcement runs on the `security` and Apple documents only, because those are the sets whose sources are or are being made correct; widening it further is one line and belongs to the migration package. Two new Apple documents are written from primary sources; three existing ones are deepened or re-sourced.

**Tech Stack:** Markdown knowledge documents with YAML frontmatter (`id`, `title`, `category`, `platform`, `tags`, `sources`, `updated`); TypeScript ESM; Vitest. Tests import from `dist/`, so `npm test` runs `tsc` first.

## Global Constraints

- **Every claim is verified against a live primary source before it is written.** The security package corrected three planned rules this way before any tool code existed. Use WebFetch/WebSearch while writing; record the verification date in `updated:`.
- **A source that cannot be verified is not cited, and the claim it would have backed is not written.**
- **Every Apple document carries at least one `developer.apple.com` source.**
- **A host belongs to exactly one tier.** `standard` = standards bodies and regulators. `vendor` = first-party documentation of the system being described. `research` = organisations publishing original research.
- **A document citing a `research` host attributes it in the prose** — "NN/g's research found …", never "the rule is …".
- **`security`-category documents cite `standard` and `vendor` only.**
- **Minimum three sources per document**, for `security` and Apple documents alike.
- **Myth-checks are part of each document**: name the plausible wrong belief beside the true statement. `Text("Hello")` in SwiftUI is already localizable — a "hardcoded string" rule written from web instinct would flag correct code.
- No rule, no tool, no `.swift` scanning lands in this package. `audit_apple_ui` is E2.
- No new runtime dependency. No network call at runtime. `.js` extensions on relative imports.
- Do not weaken or delete an existing test.
- **No AI/assistant attribution** in any commit message, code comment, or document. Commit author must be the user's own identity.

---

### Task 1: The three tiers

**Files:**
- Modify: `tests/integrity.test.ts:313-341` (replace `PERMITTED_SOURCE_HOSTS` and the describe block around it)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SOURCE_TIERS: Record<"standard" | "vendor" | "research", Set<string>>` and `tierOf(host: string): "standard" | "vendor" | "research" | null`, both local to `tests/integrity.test.ts`. Later tasks add hosts to these sets and rely on `tierOf`.

Enforcement stays scoped to `security` in this task. It passes today, and widening it before the Apple sources are fixed would break the suite in a way that hides whether the tiers themselves are right.

- [ ] **Step 1: Write the failing test**

Add to `tests/integrity.test.ts`:

```ts
describe("the source tiers", () => {
  it("puts every host in exactly one tier", () => {
    const seen = new Map<string, string[]>();
    for (const [tier, hosts] of Object.entries(SOURCE_TIERS)) {
      for (const h of hosts) seen.set(h, [...(seen.get(h) ?? []), tier]);
    }
    expect([...seen].filter(([, tiers]) => tiers.length > 1)).toEqual([]);
  });

  it("resolves a host with or without its www prefix", () => {
    expect(tierOf("developer.apple.com")).toBe("vendor");
    expect(tierOf("www.nngroup.com")).toBe("research");
    expect(tierOf("example.invalid")).toBeNull();
  });

  it("keeps security documents on standard and vendor sources only", () => {
    const offenders: string[] = [];
    for (const d of docs.filter((x) => x.category === "security")) {
      for (const url of d.sources ?? []) {
        const tier = tierOf(new URL(url).hostname);
        if (tier !== "standard" && tier !== "vendor") offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integrity.test.ts`
Expected: FAIL — `SOURCE_TIERS is not defined`.

- [ ] **Step 3: Replace the flat list with the three tiers**

Replace `PERMITTED_SOURCE_HOSTS` at `tests/integrity.test.ts:313`. Every host currently in that set is a `standard` or a `vendor` host — sort them accordingly rather than dropping any. Then add the hosts this package needs:

```ts
// The allowlist's own comment always said "a standard or a first-party vendor
// doc". The list never said which a given host was, so a host that is neither
// could sit in it unnoticed, and hosts that plainly qualified were missing
// because the list was written for one category. Naming the tiers makes both
// visible, and lets `security` hold a stricter line than the rest.
const SOURCE_TIERS = {
  standard: new Set([
    "w3.org", "w3c.github.io", "whatwg.org", "html.spec.whatwg.org",
    "datatracker.ietf.org", "rfc-editor.org", "developer.mozilla.org",
    "web.dev", "developer.chrome.com", "developers.google.com", "webkit.org",
    "hacks.mozilla.org", "owasp.org", "cheatsheetseries.owasp.org",
    "genai.owasp.org", "fidoalliance.org", "passkeys.dev", "caniuse.com",
    "edpb.europa.eu", "ico.org.uk", "kvkk.gov.tr", "eur-lex.europa.eu",
    "cppa.ca.gov",
  ]),
  vendor: new Set([
    "developer.apple.com", "apple.com",
    "nextjs.org", "docs.astro.build", "svelte.dev", "vite.dev",
  ]),
  research: new Set([
    "nngroup.com", "baymard.com", "lawsofux.com",
  ]),
} as const;

const tierOf = (host: string): keyof typeof SOURCE_TIERS | null => {
  const h = host.replace(/^www\./, "");
  for (const [tier, hosts] of Object.entries(SOURCE_TIERS)) {
    if (hosts.has(h)) return tier as keyof typeof SOURCE_TIERS;
  }
  return null;
};
```

Note `apple.com` is listed for Apple's newsroom, which is first-party. Do not add the other vendor hosts (`m3.material.io`, `tailwindcss.com`, and the rest) — they belong to the migration package, and adding them here would imply an enforcement this package does not perform.

Rewrite the existing `describe("security documents cite permitted sources only")` to call `tierOf` instead of the old set. Its assertion and message stay as they are.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS. If a `security` document now fails, a host was mis-sorted — fix the tier, not the test.

- [ ] **Step 5: Commit**

```bash
git add tests/integrity.test.ts
git commit -m "test: name the three tiers the source allowlist always implied"
```

---

### Task 2: The Apple documents' sources

**Files:**
- Modify: `knowledge/design-languages/macos-app-design.md` (frontmatter `sources`, `updated`, and any prose whose only support was a dropped source)
- Modify: `knowledge/design-languages/ios-app-design.md` (same)
- Modify: `knowledge/design-languages/apple-hig-liquid-glass.md` (same)
- Modify: `tests/integrity.test.ts` (extend enforcement to Apple documents)

**Interfaces:**
- Consumes: `SOURCE_TIERS`, `tierOf` from Task 1.
- Produces: `APPLE_DOC_IDS: string[]` in `tests/integrity.test.ts`, listing the Apple documents the allowlist is enforced on. Tasks 3-5 add their new ids to it.

The three documents carry **13 blog-tier citations** between them: `createwithswift.com` ×4, `daringfireball.net`, `macrumors.com`, `zenn.dev`, `pfandrade.me`, `evilmartians.com`, `conor.fyi`, `blakecrosley.com`, `appfollow.io`, `troz.net`, `successfulsoftware.net`, `sketch.com`, `donnywals.com`, `learnui.design`.

For each: find the `developer.apple.com` page that makes the same claim and cite that instead. **Where no primary source makes the claim, delete the claim along with the citation** — do not keep prose whose only support was a blog. Say in your report which claims you removed and why; that list is the deliverable's honest half.

- [ ] **Step 1: Write the failing test**

```ts
const APPLE_DOC_IDS = ["macos-app-design", "ios-app-design", "apple-hig-liquid-glass"];

describe("Apple documents are sourced to Apple", () => {
  const appleDocs = () => docs.filter((d) => APPLE_DOC_IDS.includes(d.id));

  it("finds every Apple document", () => {
    expect(appleDocs().map((d) => d.id).sort()).toEqual([...APPLE_DOC_IDS].sort());
  });

  it("cites no source outside the tiers", () => {
    const offenders: string[] = [];
    for (const d of appleDocs()) {
      for (const url of d.sources ?? []) {
        if (tierOf(new URL(url).hostname) === null) offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("carries at least one developer.apple.com source each", () => {
    const thin = appleDocs()
      .filter((d) => !(d.sources ?? []).some((u) => new URL(u).hostname.replace(/^www\./, "") === "developer.apple.com"))
      .map((d) => d.id);
    expect(thin).toEqual([]);
  });

  it("cites at least three sources each", () => {
    expect(appleDocs().filter((d) => (d.sources ?? []).length < 3).map((d) => d.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integrity.test.ts`
Expected: FAIL on "cites no source outside the tiers", listing the 13 blog-tier URLs.

- [ ] **Step 3: Replace each blog citation with its primary equivalent**

Work one document at a time. For each blog URL, read the prose it supports, then find the Apple page that states the same thing — `developer.apple.com/design/human-interface-guidelines/…` for design claims, `developer.apple.com/documentation/…` for API claims. Verify by fetching the page, not by assuming the URL exists.

Set `updated:` to the date you verified.

- [ ] **Step 4: Run the test and the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add knowledge/design-languages/ tests/integrity.test.ts
git commit -m "docs: the Apple guides cite Apple, and drop what only a blog supported"
```

---

### Task 3: `apple-accessibility`

**Files:**
- Create: `knowledge/design-languages/apple-accessibility.md`
- Modify: `tests/integrity.test.ts` (add the id to `APPLE_DOC_IDS`)
- Modify: `src/catalog.ts:33-75` (`REVIEW_MAP`) and `src/catalog.ts:104-180` (`ROADMAPS`)

**Interfaces:**
- Consumes: `APPLE_DOC_IDS` from Task 2.
- Produces: the document id `apple-accessibility`, which E2's accessibility rules will cite.

This document backs four of E2's rule areas, so it must state each as a **fact a reader could check**, with the Apple page that says so:

- **Dynamic Type** — what breaks it. Fixed point sizes; fixed frame heights on text-bearing views; why `.font(.system(size:))` differs from `.font(.body)`.
- **VoiceOver labelling** — what an image or icon-only control needs, and what SwiftUI supplies on its own.
- **Tap targets** — the documented minimum, quoted with its source.
- **Reduce Motion** — the environment value, and what respecting it means.
- **Contrast** — the documented ratios, and where colour actually lives (asset catalogs), which is why source code alone cannot decide it.

Match `apple-hig-liquid-glass.md`'s frontmatter shape exactly, including how it spells `category` and `platform`; run the integrity suite to confirm the values are accepted rather than guessing.

- [ ] **Step 1: Write the failing test**

```ts
it("apple-accessibility states the Dynamic Type and tap-target facts E2 will cite", () => {
  const d = docs.find((x) => x.id === "apple-accessibility");
  expect(d, "document is missing").toBeDefined();
  const body = d!.body.toLowerCase();
  for (const term of ["dynamic type", "voiceover", "reduce motion", "contrast"]) {
    expect(body, `does not mention ${term}`).toContain(term);
  }
});
```

Add `"apple-accessibility"` to `APPLE_DOC_IDS` in the same commit, so Task 2's four assertions cover it too.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integrity.test.ts`
Expected: FAIL — "document is missing".

- [ ] **Step 3: Write the document from primary sources**

Every section states what is true and cites the Apple page that says it. Include a myth-check section; `Text("Hello")` being localizable by default belongs in Task 5's iOS document, so find this document's own — the likeliest is what SwiftUI labels automatically versus what it does not.

- [ ] **Step 4: Wire it into the catalogs**

Add `apple-accessibility` to `REVIEW_MAP`'s `ios` and `macos` entries in `src/catalog.ts`, and to the iOS roadmap's design-system phase and the macOS roadmap's equivalent.

- [ ] **Step 5: Run the suite and commit**

```bash
npm test
git add knowledge/ src/catalog.ts tests/integrity.test.ts
git commit -m "docs: apple-accessibility, sourced to Apple"
```

---

### Task 4: `apple-shipping-readiness`

**Files:**
- Create: `knowledge/design-languages/apple-shipping-readiness.md`
- Modify: `tests/integrity.test.ts` (add the id to `APPLE_DOC_IDS`)
- Modify: `src/catalog.ts` (`REVIEW_MAP`, `ROADMAPS`)

**Interfaces:**
- Consumes: `APPLE_DOC_IDS` from Task 2.
- Produces: the document id `apple-shipping-readiness`, which E2's shipping rules will cite.

What it must state, each with its Apple source:

- **`Info.plist` purpose strings** — which keys a capability requires, and what happens without them.
- **Entitlements** — App Sandbox and hardened runtime on macOS: what they are and when they are required.
- **Icon sets** — what a complete set is, per platform.
- **Orientation and iPad multitasking** — `UISupportedInterfaceOrientations`, `UIRequiresFullScreen`, and what each costs.

- [ ] **Step 1: Write the failing test**

```ts
it("apple-shipping-readiness names the plist and entitlement keys E2 will cite", () => {
  const d = docs.find((x) => x.id === "apple-shipping-readiness");
  expect(d, "document is missing").toBeDefined();
  for (const key of ["Info.plist", "entitlement", "sandbox", "icon"]) {
    expect(d!.body.toLowerCase(), `does not mention ${key}`).toContain(key.toLowerCase());
  }
});
```

Add `"apple-shipping-readiness"` to `APPLE_DOC_IDS` in the same commit.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integrity.test.ts`
Expected: FAIL — "document is missing".

- [ ] **Step 3: Write the document from primary sources**

Purpose-string keys and entitlement names must be quoted exactly as Apple spells them — E2 will match on those strings, so a transcription slip here becomes a rule that never fires.

- [ ] **Step 4: Wire it into the catalogs**

Add to `REVIEW_MAP`'s `ios` and `macos` entries and to both roadmaps' shipping phases.

- [ ] **Step 5: Run the suite and commit**

```bash
npm test
git add knowledge/ src/catalog.ts tests/integrity.test.ts
git commit -m "docs: apple-shipping-readiness, sourced to Apple"
```

---

### Task 5: Deepen `macos-app-design` and `ios-app-design`

**Files:**
- Modify: `knowledge/design-languages/macos-app-design.md`
- Modify: `knowledge/design-languages/ios-app-design.md`

**Interfaces:**
- Consumes: the tier sets and `APPLE_DOC_IDS`; both documents are already covered by Task 2's assertions.
- Produces: no new ids.

`macos-app-design` must carry enough for E2's platform-fit rules — the menu bar and what a Mac app is expected to put in it; window behaviour and restoration; toolbars; keyboard shortcuts; sidebar and inspector patterns; and **which iOS-only APIs and patterns do not belong on macOS**, since that is the rule area the user's own app exposed.

`ios-app-design` must carry navigation patterns, tab bars and their adaptation, orientation, and widgets.

Both get a myth-check section. `ios-app-design`'s includes: **`Text("Hello")` is already localizable in SwiftUI** — the literal is a `LocalizedStringKey` by default, so a "hardcoded string" rule written from web instinct would flag correct code.

- [ ] **Step 1: Write the failing test**

```ts
it("macos-app-design names the platform-fit subjects E2 will cite", () => {
  const body = docs.find((x) => x.id === "macos-app-design")!.body.toLowerCase();
  for (const term of ["menu bar", "toolbar", "keyboard shortcut", "window", "sidebar"]) {
    expect(body, `does not mention ${term}`).toContain(term);
  }
});

it("ios-app-design records the localization myth-check", () => {
  const body = docs.find((x) => x.id === "ios-app-design")!.body;
  expect(body).toMatch(/LocalizedStringKey/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integrity.test.ts`
Expected: FAIL on whichever terms are absent.

- [ ] **Step 3: Deepen both documents from primary sources**

Every added claim cites the Apple page that makes it. Update `updated:` on both.

- [ ] **Step 4: Run the suite and commit**

```bash
npm test
git add knowledge/design-languages/
git commit -m "docs: the macOS and iOS guides carry what the auditor will have to cite"
```

---

### Task 6: Release

**Files:**
- Modify: `README.md`, `CHANGELOG.md`, `package.json`, `server.json`
- Test: `tests/integrity.test.ts`, `tests/server.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: no new interfaces.

- [ ] **Step 1: Assert the document count and the new ids are reachable**

The knowledge base goes from 81 to 83 documents. Whatever existing test asserts the count or the index must be updated, and both new ids must be reachable through `list_design_knowledge` and `get_design_doc`. Find the existing assertions rather than adding parallel ones:

```bash
grep -rn "81\|documents\b" tests/integrity.test.ts tests/server.test.ts | head -20
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Update the docs**

`README.md`: the knowledge-base description and any count. `CHANGELOG.md`: a `0.24.0` entry naming the two new documents, the three re-sourced ones, the tiered allowlist, and — stated plainly — **the claims removed because only a blog supported them**. Bump `package.json` and `server.json` to `0.24.0`.

- [ ] **Step 4: Full verification**

```bash
npm test && npm run preflight && npm run smoke
```
Expected: all pass; preflight reports `0.24.0` consistent; smoke reports 33 tools and the new resource count.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md package.json server.json tests/
git commit -m "docs: v0.24.0 — the Apple guides are sourced to Apple"
```

---

## Self-Review

**Spec coverage.** Tiered allowlist → Task 1. `security` stricter line → Task 1 Step 1. Exactly-one-tier → Task 1. Apple source migration and the ≥1 `developer.apple.com` rule → Task 2. Three-source minimum extended to Apple docs → Task 2. `apple-accessibility` → Task 3. `apple-shipping-readiness` → Task 4. Deepening → Task 5. Myth-checks → Tasks 3, 4, 5, with the known one pinned by a test in Task 5. Release → Task 6.

**One spec item deliberately deferred within the plan:** the research-attribution test. No Apple or `security` document cites a `research` host, so a test asserting attribution would pass vacuously here and its first real subject arrives with the migration package. Writing a vacuous guard is the defect this project has now shipped three times, so the tier exists in Task 1 and its attribution test travels with the documents that need it. This is recorded rather than silently dropped.

**Placeholder scan.** None: every step names its file, its command and its expected result. Tasks 2-5 specify the derivation procedure — verify against a live Apple page, cite that page, delete what cannot be verified — because supplying invented citations here would be the exact failure the spec forbids.

**Type consistency.** `SOURCE_TIERS` and `tierOf` are defined in Task 1 with the signatures Tasks 2-5 consume. `APPLE_DOC_IDS` is introduced in Task 2 and extended by Tasks 3 and 4. The two new document ids are spelled `apple-accessibility` and `apple-shipping-readiness` throughout.
