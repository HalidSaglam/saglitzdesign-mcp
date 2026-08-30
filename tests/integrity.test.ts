import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadKnowledge, findDoc, platformMatches } from "../dist/knowledge.js";
import { CATEGORIES, PLATFORMS, DESIGN_LANGUAGES, REVIEW_MAP, FOCUS_MAP, ROADMAPS, STALE_DAYS, APPLE_DOC_IDS, isSourceEnforced } from "../dist/catalog.js";
import { loadRecipes } from "../dist/recipes.js";
import { loadExamples } from "../dist/examples.js";
import { securityReport, HEADER_SOURCE_TOKENS, HEADER_SOURCES_SENTENCE, HEADER_METHOD_NAMES } from "../dist/security.js";
import { PROMPT_NAMES } from "../dist/prompts.js";
import { liveToolNames, liveDisclosureTools } from "./helpers/liveServer.js";

// Structural guarantees for the curated content. These are the checks that
// would have caught the v0.14.0 bug where roadmaps referenced pattern docs by
// an id that did not exist, so those docs silently vanished from every
// roadmap and checklist without any error.

const root = join(__dirname, "..");
const docs = loadKnowledge(join(root, "knowledge"));

/** Derived, never mirrored: a hand-written copy went stale at 33 while 34 shipped,
 *  under a comment claiming another file proved it complete. Nothing did. */
const TOOL_NAMES = new Set(await liveToolNames());

/** Derived the same way, off the same spawn: the tools whose `outputSchema`
 *  declares a `notVisible` property. */
const DISCLOSURE_TOOLS = await liveDisclosureTools();

/**
 * The document count this suite asserts, in one place rather than repeated at
 * each assertion. `loads every markdown document` pins it to what `knowledge/`
 * actually holds, and the README count check reads the same constant, so the
 * two can never disagree about what the number is.
 *
 * It is not a single point of edit, and an earlier draft of this comment said
 * it was. Adding a document means editing this line *and* every README sentence
 * stating the count — today four in `README.md` and one in `skills/README.md`.
 * They are deliberately not cited by line: this comment named `README.md:159`
 * until the whole-branch review, and Task 7 had inserted a section above it two
 * commits earlier, so the citation pointed at the `design_lint` tool row, which
 * states no count at all. `states document and tool counts` finds and quotes
 * every one of them on failure; that is the address that cannot go stale. The
 * coupling itself is working as intended: the point of the check is that
 * published prose cannot drift from the base.
 *
 * Bumping this number reports all of those sentences in one failure, each
 * quoted — `states document and tool counts` collects offenders rather than
 * asserting inside its loop, precisely so the edit is enumerated in one run
 * instead of serialized across one re-run per sentence.
 */
const DOC_COUNT = 96;

describe("knowledge base metadata", () => {
  it("loads every markdown document", () => {
    // An equality, not a floor. The floor sat at 83 through thirteen documents
    // being added and could not have noticed one being deleted, which is the
    // failure it was written to catch.
    expect(docs.length).toBe(DOC_COUNT);
  });

  it("has unique ids", () => {
    const dupes = docs.map((d) => d.id).filter((id, i, all) => all.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("uses only declared categories", () => {
    const allowed = new Set<string>(CATEGORIES);
    const bad = docs.filter((d) => !allowed.has(d.category)).map((d) => `${d.id}:${d.category}`);
    expect(bad).toEqual([]);
  });

  it("uses only platform values the filters understand", () => {
    const concrete = new Set<string>(PLATFORMS);
    const universal = ["both", "cross-platform"];
    const bad = docs
      .filter((d) => !concrete.has(d.platform) && !universal.includes(d.platform))
      .map((d) => `${d.id}:${d.platform}`);
    expect(bad).toEqual([]);
  });

  it("gives every doc a title and an ISO `updated` date", () => {
    const bad = docs
      .filter((d) => !d.title || !/^\d{4}-\d{2}-\d{2}$/.test(d.updated))
      .map((d) => `${d.id}:${d.updated}`);
    expect(bad).toEqual([]);
  });

  it("has a staleness threshold for every category in use", () => {
    const missing = [...new Set(docs.map((d) => d.category))].filter((c) => !(c in STALE_DAYS));
    expect(missing).toEqual([]);
  });

  it("declares a security category with documents in it", () => {
    expect(CATEGORIES).toContain("security");
    const sec = docs.filter((d) => d.category === "security");
    expect(sec.length).toBeGreaterThan(0);
  });

  it("gives every category a staleness threshold", () => {
    const missing = [...CATEGORIES].filter((c) => STALE_DAYS[c] === undefined);
    expect(missing).toEqual([]);
  });
});

describe("catalogue references resolve", () => {
  it("every doc id in REVIEW_MAP exists", () => {
    const dangling: string[] = [];
    for (const [project, list] of Object.entries(REVIEW_MAP)) {
      for (const id of list) if (!findDoc(docs, id)) dangling.push(`${project} → ${id}`);
    }
    expect(dangling).toEqual([]);
  });

  it("every doc id in ROADMAPS exists", () => {
    const dangling: string[] = [];
    for (const [project, rm] of Object.entries(ROADMAPS)) {
      for (const id of rm.fullGuides) if (!findDoc(docs, id)) dangling.push(`${project}/guides → ${id}`);
      for (const phase of rm.phases) {
        for (const id of phase.docs) if (!findDoc(docs, id)) dangling.push(`${project}/${phase.title} → ${id}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("roadmap ids are canonical (resolve to themselves, no aliasing needed)", () => {
    const aliased: string[] = [];
    for (const [project, rm] of Object.entries(ROADMAPS)) {
      for (const phase of rm.phases) {
        for (const id of phase.docs) {
          const resolved = findDoc(docs, id);
          if (resolved && resolved.id !== id) aliased.push(`${project} → ${id} (real: ${resolved.id})`);
        }
      }
    }
    expect(aliased).toEqual([]);
  });

  it("every roadmap project type yields non-empty phases", () => {
    for (const [project, rm] of Object.entries(ROADMAPS)) {
      expect(rm.phases.length, project).toBeGreaterThan(0);
      for (const phase of rm.phases) {
        const resolved = phase.docs.map((id) => findDoc(docs, id)).filter(Boolean);
        expect(resolved.length, `${project} / ${phase.title}`).toBeGreaterThan(0);
      }
    }
  });

  it("every design language in the get_design_language enum exists", () => {
    const missing = DESIGN_LANGUAGES.filter((id: string) => !findDoc(docs, id));
    expect(missing).toEqual([]);
  });

  it("every FOCUS_MAP filter matches at least one doc", () => {
    for (const [focus, fn] of Object.entries(FOCUS_MAP)) {
      expect(docs.some((d) => fn(d)), focus).toBe(true);
    }
  });

  it("no knowledge doc is orphaned from every checklist and roadmap", () => {
    const referenced = new Set<string>();
    const note = (id: string) => {
      const d = findDoc(docs, id);
      if (d) referenced.add(d.id);
    };
    for (const list of Object.values(REVIEW_MAP)) list.forEach(note);
    for (const rm of Object.values(ROADMAPS)) {
      rm.fullGuides.forEach(note);
      rm.phases.forEach((p) => p.docs.forEach(note));
    }
    // Docs with their own dedicated surface don't need a roadmap slot:
    // seo/geo are served wholesale by seo_geo_guide, and every design language
    // is addressable by name through get_design_language.
    const languages = new Set<string>(DESIGN_LANGUAGES);
    const exempt = (d: (typeof docs)[number]) =>
      d.category === "seo" || d.category === "geo" || languages.has(d.id);
    const orphans = docs.filter((d) => !referenced.has(d.id) && !exempt(d)).map((d) => d.id);
    expect(orphans).toEqual([]);
  });
});

describe("security documents are reachable from the workflows", () => {
  it("puts security in every web-facing review checklist", () => {
    for (const key of ["website", "landing-page", "dashboard"]) {
      const list = REVIEW_MAP[key] ?? [];
      const hasSecurity = list.some((id) => docs.find((d) => d.id === id)?.category === "security");
      expect(`${key}:${hasSecurity}`).toBe(`${key}:true`);
    }
  });

  it("puts security in every web-facing roadmap", () => {
    for (const key of ["website", "landing-page", "saas-web-app"]) {
      const ids = (ROADMAPS[key]?.phases ?? []).flatMap((p) => p.docs);
      const hasSecurity = ids.some((id) => docs.find((d) => d.id === id)?.category === "security");
      expect(`${key}:${hasSecurity}`).toBe(`${key}:true`);
    }
  });

  it("references all five security documents, not just the one that satisfies the orphan check", () => {
    const referenced = new Set<string>();
    for (const list of Object.values(REVIEW_MAP)) list.forEach((id) => referenced.add(id));
    for (const rm of Object.values(ROADMAPS)) {
      rm.fullGuides.forEach((id) => referenced.add(id));
      rm.phases.forEach((p) => p.docs.forEach((id) => referenced.add(id)));
    }
    const unreferenced = docs
      .filter((d) => d.category === "security" && !referenced.has(d.id))
      .map((d) => d.id);
    expect(unreferenced).toEqual([]);
  });
});

describe("cross-links inside the knowledge base resolve", () => {
  it("every [[wiki-link]] points at a real doc", () => {
    const broken: string[] = [];
    for (const doc of docs) {
      for (const m of doc.body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
        if (!findDoc(docs, m[1])) broken.push(`${doc.id} → [[${m[1]}]]`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every get_design_doc(\"id\") suggestion in a doc resolves", () => {
    const broken: string[] = [];
    for (const doc of docs) {
      for (const m of doc.body.matchAll(/get_design_doc\("([a-z0-9-]+)"\)/g)) {
        if (!findDoc(docs, m[1])) broken.push(`${doc.id} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("id + platform resolution", () => {
  it("resolves platform-prefixed pattern docs from their bare name", () => {
    expect(findDoc(docs, "onboarding-paywall")?.id).toBe("mobile-onboarding-paywall");
    expect(findDoc(docs, "hero-sections")?.id).toBe("web-hero-sections");
    expect(findDoc(docs, "dashboards")?.id).toBe("web-dashboards");
  });

  it("resolves an exact id unchanged, and is case-insensitive", () => {
    expect(findDoc(docs, "buttons")?.id).toBe("buttons");
    expect(findDoc(docs, "Buttons")?.id).toBe("buttons");
  });

  it("returns undefined for a genuinely unknown id", () => {
    expect(findDoc(docs, "no-such-doc-xyz")).toBeUndefined();
  });

  it("treats cross-platform docs as matching every platform filter", () => {
    const crossPlatform = docs.filter((d) => d.platform === "cross-platform");
    expect(crossPlatform.length).toBeGreaterThan(0);
    for (const d of crossPlatform) {
      for (const p of PLATFORMS) expect(platformMatches(d.platform, p), `${d.id}/${p}`).toBe(true);
    }
  });

  it("still excludes a concrete platform that does not match", () => {
    expect(platformMatches("mobile", "web")).toBe(false);
    expect(platformMatches("web", "web")).toBe(true);
    expect(platformMatches("mobile", undefined)).toBe(true);
  });
});

describe("bundled assets", () => {
  it("loads every component recipe with at least one stack", () => {
    const recipes = loadRecipes(join(root, "recipes"));
    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) expect(Object.keys(r.stacks).length, r.component).toBeGreaterThan(0);
  });

  it("gives every design example a pattern and a source link", () => {
    const examples = loadExamples(join(root, "knowledge", "examples"));
    expect(examples.length).toBeGreaterThan(0);
    const bad = examples.filter((e) => !e.pattern || !e.mobbin_url).map((e) => e.id);
    expect(bad).toEqual([]);
  });
});

/**
 * A minimal, explicitly scoped check that a skill's frontmatter would not
 * break the real YAML parser the `skills` CLI installs it with. That CLI
 * silently *skips* a file whose frontmatter fails to parse — confirmed live
 * (`npx skills@latest add ./ --dry-run` reported "Found 7 skills" against a
 * tree holding eight `SKILL.md` files, with a `⚠ Skipped … YAML parse error`
 * line naming the broken one) and independently against a real parser
 * (Python's PyYAML) — so a broken skill ships with the product's own install
 * channel silently dropping it, while every guard in this suite that reads
 * `SKILL.md` with a regex stays green, because none of them parses YAML.
 *
 * THIS IS NOT A YAML PARSER, and does not claim the reach of one. This
 * repository declares no YAML dependency (`dependencies` are
 * `@modelcontextprotocol/sdk` and `zod`; the frontmatter reader in
 * `src/knowledge.ts` is a hand-rolled per-line parser, not a spec-compliant
 * one either) and this check keeps that shape rather than pull in a library
 * to validate one field on one file.
 *
 * What it assumes: every frontmatter line is a flat, single-line
 * `key: value` pair — true of all eight skills' frontmatter today, and true
 * of nothing this check does not itself verify. A line that is not shaped
 * that way — a block-scalar opener (`|`/`>`), a nested mapping, a list item,
 * a flow collection (`[...]`/`{...}`) — is reported as *unrecognized* rather
 * than silently accepted; this check does not know whether such a line is
 * valid YAML, so it refuses to guess and fails loud instead.
 *
 * For each recognized `key: value` line, and only when the value is
 * unquoted (does not start with `"` or `'`), it enforces exactly the three
 * plain-scalar rules that would otherwise truncate or break the value:
 *   - no `: ` (colon-space) inside the value — this is the exact defect
 *     shipped: `… even unasked: porting …` reads as a second mapping key
 *     opening where none is allowed, and the real parser raises "nested
 *     mappings are not allowed in compact mappings" at that point.
 *   - the value does not end in `:` — the same rule, at the line's boundary.
 *   - no ` #` inside the value — a space-hash pair opens a YAML comment
 *     outside quotes, silently truncating everything after it. Nothing
 *     shipped trips this today; it is checked because it is the same class
 *     of bug in a different character.
 * A value that starts with `"` or `'` is checked only for a balanced,
 * matching closing quote of the same character — internal escaping
 * (`\"`, `''`) is NOT validated, so a quoted value with a mismatched
 * internal escape could still pass this check.
 *
 * NOTHING ELSE IS CHECKED. Every other way a plain scalar can break YAML —
 * a leading indicator character (`[`, `{`, `&`, `*`, `!`, `%`, `@`, a
 * backtick, a leading `-` or `?` followed by space), tabs used for
 * indentation, anchors, aliases, directives, multi-document markers, or any
 * other corner of the grammar — is not evaluated here at all. A green run of
 * this check means "parses under the narrow shape this repository's
 * frontmatter actually uses," not "is valid YAML."
 */
function frontmatterYamlProblems(text: string): string[] {
  const problems: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s(.*)$/);
    if (!m) {
      problems.push(`unrecognized frontmatter line, not a flat "key: value" pair: ${JSON.stringify(line)}`);
      continue;
    }
    const value = m[2];
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      if (!(value.length >= 2 && value.endsWith(quote))) {
        problems.push(`quoted value missing its closing ${quote}: ${JSON.stringify(line)}`);
      }
      continue;
    }
    if (value.includes(": ")) problems.push(`unquoted value contains ": " (opens a nested mapping): ${JSON.stringify(line)}`);
    if (value.endsWith(":")) problems.push(`unquoted value ends in ":" (opens a nested mapping): ${JSON.stringify(line)}`);
    if (value.includes(" #")) problems.push(`unquoted value contains " #" (opens a YAML comment): ${JSON.stringify(line)}`);
  }
  return problems;
}

describe("skills distribution", () => {
  // skills/ ships separately via `npx skills add` and is not exercised by the
  // server, so nothing else would notice it drifting away from the tool set.
  const skillsDir = join(root, "skills");
  const names = readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const read = (n: string) => readFileSync(join(skillsDir, n, "SKILL.md"), "utf8");

  it("ships every skill with valid frontmatter whose name matches its directory", () => {
    expect(names.length).toBeGreaterThanOrEqual(5);
    for (const n of names) {
      const body = read(n);
      expect(body.startsWith("---\n"), n).toBe(true);
      expect(body.match(/^name: (.+)$/m)?.[1], n).toBe(n);
      const description = body.match(/^description: (.+)$/m)?.[1] ?? "";
      expect(description.length, `${n}: description`).toBeGreaterThan(40);
    }
  });

  // See `frontmatterYamlProblems` above for exactly what this does and does
  // not check, and why: a plain-scalar break here means the `skills` CLI
  // silently drops the file, and nothing else in this suite parses YAML.
  it("keeps every skill's frontmatter parseable under the shape the skills CLI expects", () => {
    const problems: string[] = [];
    for (const n of names) {
      const frontmatter = read(n).split(/^---$/m)[1] ?? "";
      for (const p of frontmatterYamlProblems(frontmatter)) problems.push(`${n}: ${p}`);
    }
    expect(problems).toEqual([]);
  });

  /**
   * The `sources:` frontmatter binds a skill to the base documents it condenses,
   * so a later check can hold the skill against something that moves.
   *
   * What this asserts is narrow: every id a skill names resolves to a document
   * `loadKnowledge` returns, and every skill names at least one. It does not
   * judge whether the list is the *right* list — from the file alone, an id the
   * skill should have named but did not is indistinguishable from a skill that
   * genuinely condenses fewer documents, so this check cannot separate them.
   *
   * A declaration is judged by what it parses to, never by how the line looks:
   * whatever yields zero ids declares nothing and is reported. `sources: , ,` is
   * the case that motivated the rule — it satisfies a test for the field being
   * present, then loops zero times and finds no problem to report.
   *
   * Read from the frontmatter alone, sliced at the second `---`, so no body line
   * opening `sources: ` can stand in for a field the frontmatter never had.
   */
  it("binds every skill to knowledge documents that exist", () => {
    const ids = new Set(docs.map((d) => d.id));
    const problems: string[] = [];
    for (const n of names) {
      const frontmatter = read(n).split(/^---$/m)[1] ?? "";
      const declared = frontmatter.match(/^sources: (.+)$/m)?.[1] ?? "";
      const named = declared.split(",").map((s) => s.trim()).filter(Boolean);
      if (named.length === 0) { problems.push(`${n}: no sources declared`); continue; }
      for (const id of named) {
        if (!ids.has(id)) problems.push(`${n} → ${id}`);
      }
    }
    expect(problems).toEqual([]);
  });

  // POLICY: a correction the knowledge base makes should be entered here, so
  // that no skill goes on repeating a fact we have already fixed elsewhere.
  // That is the standing rule this corpus is kept under — it is not a claim
  // about the corpus's current state, which blind spot 1 below measures and
  // finds short of it.
  //
  // An entry is a rule about headings, not a list of them. A heading path
  // licenses a corrected fact only when it names a platform the fact still
  // applies to (`scope`) AND names none of the platforms the correction took it
  // away from (`excluded`). The second half is not belt-and-braces: with `scope`
  // alone, `## Liquid Glass (iOS 26 / macOS Tahoe)` — a heading in the very file
  // this guard was written for — was a standing permission zone, because a
  // heading that names both platforms satisfies a test for either one, and the
  // corrected sentence walked straight back in under it.
  //
  // The path is every heading above the line at any level, so a `### macOS
  // notes` nested inside `## iOS specifics` withdraws the permission its parent
  // gave, while a neutral `### Details` leaves it standing.
  //
  // A fenced block (``` or ~~~, CommonMark's two spellings) clears the path for
  // its duration and restores it at the close, so a `#` line inside a fence can
  // neither grant a permission nor inherit one, and the lines inside a fence are
  // still scanned — against no heading, which denies. An unclosed fence
  // therefore withholds permission from everything after it rather than freezing
  // the last permission it saw. That direction is deliberate, and every clause
  // of the fence rules below is justified by an input this guard reads wrongly
  // without it — each was confirmed by reverting it alone and watching that
  // input flip. Not all of them were *added* after such an input: the `{3,}`
  // run length has been there since fence handling was introduced. Three
  // earlier versions of this matcher each let a `#` line that exists only
  // inside a code block grant a permission to prose outside it, and one prose
  // line that is not a fence at all cost every line after it its heading
  // path.
  //
  // The indent allowance is CommonMark's three spaces, for headings as well as
  // fences, and it is not a safety margin in either direction. A fence indented
  // four spaces or more is not a fence — correctly, since CommonMark reads it
  // as indented code — but a `#` line at column 0 after it is then a heading
  // and can grant. The matching allowance on headings closes a gap that ran in
  // the silent direction: while headings were recognised at column 0 only,
  // `  ### macOS notes` did not withdraw the permission its parent gave, so two
  // spaces of indent defeated the nested-heading rule above. Both measured.
  //
  // WHAT THIS DOES NOT CATCH, measured rather than assumed:
  //
  // 1. A corrected fact that has no entry here. The probe was "enforce a 44×44
  //    pt minimum control size on every Apple platform" — a claim the knowledge
  //    base *has* corrected, in `apple-accessibility`'s Myth-check table, which
  //    carries twelve rows against this corpus's one. Nothing keeps the corpus
  //    in step with the corrections the knowledge base publishes: a correction
  //    binds skills only once somebody enters it. Which of those rows are worth
  //    guarding is a judgement, and it is deliberately not made here.
  // 2. A claim spread across two lines — the scan is per-line.
  // 3. A paraphrase that avoids the words `re` matches.
  // 4. A line whose own prose scopes the fact correctly but which sits under a
  //    heading path that does not. This is the false-positive direction, not a
  //    miss: the only scope this reads is the headings.
  //
  // 3 and 4 compound, and the compound bounds what the corpus can be trusted
  // for. The excluded platform's own section may not use the matched words at
  // all — that is the rule above working as intended — so the other half of a
  // correction has to be written as a paraphrase, and a paraphrase is item 3.
  // The prose this guard *forces into existence* is prose it structurally cannot
  // check: the macOS bullet in apple-platform-design can be replaced with its
  // own negation, in the same register, and this test still passes.
  //
  // Each of the four was run against this guard rather than reasoned about.
  // They are blind spots it is known to have, not the set of blind spots it has.
  const CORRECTED_FACTS: { fact: string; re: RegExp; scope: RegExp; excluded: RegExp; source: string }[] = [
    {
      fact: "macOS does not support Dynamic Type",
      re: /Dynamic Type/i,
      scope: /\b(iOS|iPadOS|iPhone|iPad)\b/i,
      // The names this repository's headings actually use for the platform the
      // correction excluded. `\bmac\b` does not match "macOS" — no word boundary
      // between the "c" and the "O" — so both spellings are listed. Any other
      // word for the platform leaks, and the nearest instance is one word away
      // from shipping: rewrite the live heading `## Liquid Glass (iOS 26 /
      // macOS Tahoe)` to `(iOS 26 / Tahoe)` and this guard goes silent on the
      // exact sentence it was written to catch. Measured, and in the silent
      // direction — so an entry's `excluded` has to name every spelling the
      // headings might use, and nothing here checks that it does.
      excluded: /\b(macOS|Mac)\b/i,
      source: "apple-accessibility",
    },
  ];

  it("never restates a corrected fact outside the scope the correction gave it", () => {
    const problems: string[] = [];
    for (const n of names) {
      let path: string[] = [];
      let outside: string[] = [];
      let openFence: string | null = null; // the opening run itself, not just its character
      read(n).split("\n").forEach((line, i) => {
        // CommonMark §4.5's two rules, each written out in full rather than a
        // clause at a time — three rounds of this test shipped one more clause
        // of these two sentences and a comment claiming the sentence was done.
        //
        // OPENS: a run of three or more backticks or tildes, indented at most
        // three spaces, and — for a backtick run only — followed by text
        // containing no backtick, because a backtick fence's info string may
        // not contain one. Without that clause the prose line
        // "```js `x` is a code span, not a fence" opened a block that never
        // closed, and every line after it in the file lost its heading path.
        //
        // CLOSES: the same character as the opener, at least as long as it,
        // and followed only by spaces or tabs. Each of the three matters and
        // each was added after an input the version without it read wrongly:
        // without the character clause a ``` closed a ~~~ block; without the
        // length clause a ``` line *inside* a ```` block closed it; without
        // the trailing clause a ```js line closed a ```text block, and in all
        // three the `#` lines of that code were then read as real headings.
        // `openFence` holds the whole opening run because the length clause
        // needs it.
        //
        // §4.5 says more than this, and the remainder splits in two. How an
        // info string is interpreted and how content indentation is stripped do
        // not bear on which lines sit inside a block, so nothing here needs
        // them. **Container scoping does**, and it is not implemented: a fence
        // opened inside a list item is closed by the end of that container,
        // while this matcher is flat and will pair a list-item fence with a
        // document-level one. A hand-built document doing exactly that — a
        // parser confirms the trailing bullet is real prose outside every code
        // block, and the `#` above it is code — is silent here. A limit stated,
        // not closed: no skill ships a fence today, and closing it means a
        // block-container parser rather than a line matcher.
        //
        // The info capture is deliberately not anchored with `$`: `.` does not
        // match a carriage return, so on a CRLF file an anchored capture makes
        // every fence line fail to match at all, and a `#` inside a code block
        // becomes a heading again. Every skill is LF today; measured, not
        // assumed — see the report.
        const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)/);
        const info = fence?.[2] ?? "";
        if (fence && openFence === null && (fence[1][0] === "~" || !info.includes("`"))) { openFence = fence[1]; outside = path; path = []; }
        else if (fence && openFence !== null && fence[1][0] === openFence[0] && fence[1].length >= openFence.length && /^[ \t]*$/.test(info)) { openFence = null; path = outside; }
        else if (openFence === null) {
          const h = line.match(/^ {0,3}(#{1,6})\s/);
          if (h) { path.length = h[1].length - 1; path[h[1].length - 1] = line; }
        }
        const where = path.filter(Boolean).join(" › ") || "(no heading)";
        for (const c of CORRECTED_FACTS) {
          const licensed = c.scope.test(where) && !c.excluded.test(where);
          if (c.re.test(line) && !licensed) {
            problems.push(`${n}:${i + 1} restates "${c.fact}" under "${where}" — see ${c.source}`);
          }
        }
      });
    }
    expect(problems).toEqual([]);
  });

  // `design_review` is the name of a *prompt* (and of a `/saglitzdesign:` slash
  // command), not of a tool, and it matches this guard's `design_` prefix — so
  // a skill that correctly backticks the eight workflow names would be told it
  // points at a phantom tool. The server has two named surfaces; this guard
  // knew about one. `PROMPT_NAMES` is real, so it is not a phantom: the
  // umbrella's own workflow list is held to `PROMPT_NAMES` exactly, by
  // "names the eight workflows exactly as the server serves them" below.
  it("never points at a tool that does not exist", () => {
    const real = new Set([...TOOL_NAMES, ...PROMPT_NAMES]);
    const phantom: string[] = [];
    for (const n of names) {
      for (const m of read(n).matchAll(/`([a-z][a-z0-9_]{4,})`/g)) {
        if (/^(get|search|list|design|audit|generate|create|suggest|fix|compare|seo)_/.test(m[1]) && !real.has(m[1])) {
          phantom.push(`${n} → ${m[1]}`);
        }
      }
    }
    expect(phantom).toEqual([]);
  });

  // Vacuity control for the guard above, in the shape the review found it in:
  // the eight workflow names are the ones most likely to be mistyped in a
  // skill, and before this round none of the three existing guards read them.
  it("a mistyped workflow name would be caught, not excused as a prompt", () => {
    const real = new Set([...TOOL_NAMES, ...PROMPT_NAMES]);
    expect(real.has("design_review")).toBe(true);
    expect(real.has("design_reviw")).toBe(false);
    expect(real.has("audit_project")).toBe(true);
    expect(real.has("audit_projekt")).toBe(false);
  });

  /**
   * The auditors that publish a disclosure list, and the skill that catalogues
   * them, held equal as sets.
   *
   * The left side comes off the running server: a tool publishes a disclosure
   * list when its `outputSchema` declares `notVisible`. Seven do. The right side
   * is the first column of `ship-quality-gate`'s table, which is the one place
   * in `skills/` that enumerates them. Neither side is written out here.
   *
   * WHAT THIS CANNOT CATCH, and it is much the larger half: **a row that is
   * present and wrong.** This compares two sets of names and reads not one word
   * of the prose beside them. Three sentences in the first draft of that skill
   * overstated an auditor's reach — `audit_security` "infers header state from
   * wherever your stack declares it" against a closed list of recognised
   * declaration shapes, `audit_project` "every lint rule over every file"
   * against a lint half that is still per-file, `design_lint` "line by line"
   * against rules that read the whole snippet — and each of the three
   * contradicted a `notVisible` entry that was already in `src/` when the
   * sentence was written. This test passes on all three, and would pass on a
   * row whose description was blank. The only thing that catches a wrong
   * sentence is running the tool and reading its array against the paraphrase,
   * which is how these three were found and what `LINT_NOT_VISIBLE`'s own
   * header prescribes.
   *
   * So what it does catch is narrow, and worth having for it: an eighth auditor
   * shipping with no row, a row for a tool that stopped publishing a list, and a
   * tool renamed on one side only.
   *
   * The skill is named here, which is a hand-written coupling of one string. A
   * union over every skill's tables was the alternative and is worse: it would
   * go green the moment a second skill grew a tool table, and this equality
   * would then be asserting something it does not mean. If this skill is renamed
   * the read below throws, which is the loud direction.
   */
  it("keeps the disclosure-tool catalogue in step with the tools that publish one", () => {
    const table = read("ship-quality-gate");
    const rows = [...table.matchAll(/^\| `([a-z][a-z0-9_]+)` \|/gm)].map((m) => m[1]);
    // Non-vacuity: a table reshaped so the matcher finds nothing would leave
    // both lists empty against a seven-element left side, but a left side that
    // also went empty would make the equality trivially true.
    expect(DISCLOSURE_TOOLS.length, "no tool declares a `notVisible` output").toBeGreaterThan(0);
    expect([...new Set(rows)].sort()).toEqual([...DISCLOSURE_TOOLS].sort());
  });

  /**
   * These two README-coverage checks (this one and "names every skill in
   * both READMEs" below) ask a different question than the umbrella's
   * routing guard does, so they need a different derivation, not the same
   * regex copied over. The umbrella's routing table is a rigid grid — one
   * name per cell, nothing else in it — so parsing cells is the right tool.
   * A README is free-form prose: a skill name can sit inside a bullet, a
   * sentence, bold text, or a backticked span, with no cell boundary to
   * anchor on. What both checks actually assert is narrower than "the text
   * contains this name somewhere" (which is what `.includes()` gave them,
   * and is the same vacuity the routing guard exists to avoid). What they
   * mean is "the name appears as itself" — not embedded inside some other,
   * longer identifier, on either side.
   *
   * FOUR ROUNDS OF ONE CHARACTER CLASS, and why there is no fifth. Each
   * earlier fix widened a single boundary expression, closed exactly the case
   * it had been shown, and was then described as closing renames in general:
   *
   *   - `\bname\b` closed `design-reviews`, but a hyphen is non-word to JS
   *     regex, so `\b` finds a ready-made boundary at the very hyphen that
   *     `design-review-legacy` introduces — the natural rename shape here,
   *     since every skill directory is already hyphen-separated.
   *   - `(?<![a-z0-9-])` closed the hyphen-joined and digit-appended cases,
   *     but not `design-review_legacy`.
   *   - `(?<![\w-])` closed that one and broke ordinary markdown: `_design-
   *     review_`, an italic mention, was reported as a missing skill.
   *
   * The last round is the informative one. One expression was being asked to
   * do two jobs — separate name characters from non-name characters, *and*
   * survive markdown syntax — and `_` belongs to both alphabets at once: it
   * is a character a directory name may contain, and it is emphasis
   * punctuation in the page the name is looked for in. No single class can
   * serve both, which is why widening it yielded three holes and then a false
   * alarm.
   *
   * SO THE TWO JOBS ARE SPLIT. The page is reduced to the identifiers it
   * names; the name is then looked up in that set.
   *
   *   1. Normalise emphasis away. Only `_` needs handling: `*` and a backtick
   *      are not name characters, so the tokeniser in step 2 already treats
   *      them as separators and `**design-review**` needs no preparation. An
   *      underscore is blanked exactly where CommonMark reads emphasis rather
   *      than an identifier — the intraword rule, which is the distinction
   *      this check needs: `_design-review_` is italic (blanked, so the name
   *      is seen), `design-review_legacy` is one word (kept, so it is not).
   *      Blanked to a space rather than deleted, as `plain()` and `scanLine`
   *      do below, so a mark cannot silently join its two neighbours.
   *   2. Tokenise into identifier-shaped runs — letter, digit, underscore,
   *      hyphen — and ask whether the name is one of them. Membership, not
   *      adjacency: a name embedded in a longer identifier is simply a
   *      different token, absent in every direction at once, with no
   *      lookaround left to widen.
   *
   * The split earns something no boundary class could: a skill directory
   * named with an underscore works. `_design_review_` in a README is emphasis
   * around the identifier `design_review`, and step 1 blanks the outer two
   * marks while keeping the inner one, because that is what the intraword
   * rule says about each of them.
   *
   * WHAT THIS STILL DOES NOT COVER, as a class rather than as the characters
   * that happen to have been tried: a rename glued to the name by anything
   * that is *not* a letter, digit, underscore or hyphen splits into two
   * tokens, and the bare name is then found in one of them.
   * `design-review.legacy` is the readable member of that class; a zero-width
   * space as the join and an emphasis mark used as glue (`design-review*x`)
   * are the unreadable ones. A name written with a leading or trailing
   * underscore is in it too, since step 1 reads that as emphasis by design.
   * None is closed here, because closing them means putting punctuation back
   * into the token class, which is the direction the previous four rounds
   * went. What is covered is the class with a plausible authoring path: a
   * rename that is itself a well-formed identifier.
   *
   * Neither check reads meaning. A name is "named" if the page contains it as
   * a token anywhere — including inside a sentence saying it was removed.
   */
  const identifiersIn = (text: string) =>
    new Set(text.replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, " ").match(/[\p{L}\p{N}_-]+/gu) ?? []);
  const mentionsSkillName = (text: string, name: string) => identifiersIn(text).has(name);

  it("lists every skill in the skills README", () => {
    const readme = readFileSync(join(skillsDir, "README.md"), "utf8");
    const missing = names.filter((n) => !mentionsSkillName(readme, n));
    expect(missing).toEqual([]);
  });

  const WORDS: Record<string, number> = { five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const SKILL_COUNT = /\b(?:(\d+)|(five|six|seven|eight|nine|ten))\s+skills\b/gi;

  it("counts every skill directory, not at least five of them", () => {
    const rootReadme = readFileSync(join(root, "README.md"), "utf8");
    const skillsReadme = readFileSync(join(skillsDir, "README.md"), "utf8");
    // A floor passed while the root README said five and six shipped. An
    // equality is the only shape that notices a seventh skill being added.
    //
    // Every occurrence, not the first: a page can state the count twice, and a
    // draft of this check that stopped at the first match let a second, wrong
    // sentence ("All nine skills are MIT-licensed") sit below a correct one.
    for (const [label, text] of [["README.md", rootReadme], ["skills/README.md", skillsReadme]]) {
      const stated = [...text.matchAll(SKILL_COUNT)];
      expect(stated.length, `${label} states no skill count`).toBeGreaterThan(0);
      for (const m of stated) {
        // `m[1] !== undefined`, not `m[1] ?`: "0 skills" is a number this should
        // assert on, and a truthiness test sends it down the word branch to
        // throw a TypeError instead.
        const claimed = m[1] !== undefined ? Number(m[1]) : WORDS[m[2].toLowerCase()];
        expect(claimed, `${label}: "${m[0]}"`).toBe(names.length);
      }
    }
  });

  it("names every skill in both READMEs", () => {
    for (const [label, path] of [["README.md", join(root, "README.md")], ["skills/README.md", join(skillsDir, "README.md")]]) {
      const text = readFileSync(path, "utf8");
      expect(names.filter((n) => !mentionsSkillName(text, n)), label).toEqual([]);
    }
  });

  /**
   * Every place a README states how many documents or how many tools ship.
   *
   * Two shapes, because the pages write the count both ways:
   *
   *   "96 curated knowledge documents"                number, then the noun,
   *   "34 tools"                                      with up to three words of
   *   "Of the 96 documents"                           description in between
   *
   *   "One knowledge document in full (96 of them)"   noun first, count in a
   *                                                   trailing parenthesis
   *
   * The first draft required the digit to sit directly against the noun, and so
   * missed two of the seven count statements on these pages — README's opening
   * banner, the first number a reader sees, and the resources table's "in full
   * (96 of them)". A review changed both to 83 with the suite still green.
   * (Quoted rather than cited by line. Both citations here read `README.md:159`
   * and had been stale since Task 7 inserted a section above that line: 159 is
   * now the `design_lint` row, which states no count.)
   *
   * The second draft widened the gap but spelled it `[\w-]+`, which admits
   * neither `*` nor `,`, so `**83** curated knowledge documents` and
   * `83 curated, versioned knowledge documents` both dropped back out of view
   * — a *false* number surviving, not merely an unwatched one.
   *
   * The lesson each time was the same, and is the one this whole task is about:
   * the draft was checked for numbers it wrongly caught and never for count
   * statements it missed.
   *
   * Hence `plain()`. It normalises **exactly six marks** — `*`, `_`, backtick,
   * `,`, em dash, en dash — and nothing else. It blanks them to spaces rather
   * than deleting them because a mark can be the only thing separating the
   * number from its noun: `**83**documents` blanks to `83  documents` and is
   * read, while deleting gives `83documents` and is not. (Measured both ways;
   * on today's files the two are indistinguishable, so this is about the
   * sentences someone may write next. It is the same reason `scanLine` blanks
   * further down this file.)
   *
   * WHAT THIS DOES NOT SEE. Three classes, the first of them a rule rather than
   * a list, because a list here would read as a boundary and is not one:
   *
   *   1. ANY OTHER PUNCTUATION between the number and its noun hides the count
   *      entirely — the gap is spelled `[\w-]+`, which admits no punctuation at
   *      all beyond the hyphen, and only those six marks are normalised away
   *      before matching. `83 curated/versioned knowledge documents` survives
   *      with a false 83, and that is not a contrived shape: the banner line
   *      itself already writes `8 build/review/port workflows` in exactly that
   *      idiom. Parentheses, quotation marks, ampersands and a markdown link
   *      wrapped round the number behave the same way.
   *
   *      This is deliberately not closed by adding marks to `plain()`. Blanking
   *      `(` and `)` would destroy `COUNT_AFTER_NOUN`'s own `(96 of them)`
   *      anchor, and each further mark widens the clause-break over-catch below.
   *      Treat it as a boundary to know when writing these sentences, not a gap
   *      awaiting one more pass.
   *
   *   2. More than three words of description before the noun: "83 curated and
   *      carefully versioned knowledge documents".
   *
   *   3. A count written in words: "eighty-three curated knowledge documents".
   *
   * Each of the three is measured against these patterns rather than reasoned
   * about, and a sentence reworded into any of them leaves the guard silently,
   * *taking any wrong number in it along*. The non-vacuity assertion below does
   * not save that case: it fires only when a whole file stops stating a count,
   * and README.md states its document count four times.
   *
   * WHAT IT OVER-CATCHES, same method. Blanking punctuation lets a number bind
   * across a clause break to a later noun: "8 workflows — the tools are
   * separate" is reported as an "8 tools" claim. That is the cost of the
   * blanking, and it is the cost worth paying, because it is *loud* — someone
   * rewrites a sentence — where the failure it replaces was silent: a false 83
   * on the banner, shipped, with the suite green.
   *
   * This is a regression guard over two files, not a reader of English.
   */
  const plain = (text: string) => text.replace(/[*_`,—–]/g, " ");
  const COUNT_BEFORE_NOUN = /\b(\d+)(?:\s+[\w-]+){0,3}?\s+(documents?|tools?)\b/g;
  const COUNT_AFTER_NOUN = /\b(documents?|tools?)\b[^.\n]{0,80}?\((\d+) of them\)/g;

  /**
   * "The other 85 documents are curated but not yet checked" is a true sentence
   * about *part* of the set, and a guard that forces every number beside the
   * noun to equal the total makes it unwritable. Partitives are recognised from
   * the sentence's own words rather than from a marker an author could attach
   * to anything — and they are not waved through: a part is still asserted to
   * be smaller than the whole, so the exemption cannot be used to state a wrong
   * total in partitive clothing.
   *
   * It knows four words. A true subset phrased without one of them — "11
   * documents have their sources checked", "11 of the 96 documents have …" —
   * is read as a total and still cannot be written. That is a known cost of
   * keeping the exemption keyed on visible grammar rather than on a marker.
   */
  const PARTITIVE = /\b(?:other|another|remaining|rest\s+of(?:\s+the)?)\s*$/i;

  type CountClaim = { kind: "documents" | "tools"; number: number; matched: string; partitive: boolean };

  const countClaims = (text: string): CountClaim[] => {
    const claims: CountClaim[] = [];
    for (const m of text.matchAll(COUNT_BEFORE_NOUN)) {
      claims.push({
        kind: /tool/.test(m[2]) ? "tools" : "documents",
        number: Number(m[1]),
        matched: m[0],
        partitive: PARTITIVE.test(text.slice(Math.max(0, m.index! - 24), m.index!)),
      });
    }
    for (const m of text.matchAll(COUNT_AFTER_NOUN)) {
      claims.push({
        kind: /tool/.test(m[1]) ? "tools" : "documents",
        number: Number(m[2]),
        matched: m[0],
        partitive: false,
      });
    }
    return claims;
  };

  it("states document and tool counts that match the live registry", () => {
    const texts: [string, string][] = [
      ["README.md", readFileSync(join(root, "README.md"), "utf8")],
      ["skills/README.md", readFileSync(join(skillsDir, "README.md"), "utf8")],
    ];
    // Collected and asserted once, rather than a loop of `expect`s: a failing
    // `expect` aborts the test, so a loop reports the first wrong sentence and
    // hides the rest — a document added to the base would have to be found one
    // re-run at a time. Every count statement on both pages is judged in one
    // run and the whole list is printed, which is also the idiom the rest of
    // this file uses.
    const offenders: string[] = [];
    for (const [label, text] of texts) {
      const claims = countClaims(plain(text));
      // `matchAll` over nothing asserts nothing, so a file that stops stating a
      // count — by deleting the number, or by rewording past the patterns —
      // would go quiet rather than fail. Both READMEs advertise both numbers
      // today; requiring them here is what turns "the count is right" into "the
      // count is stated and right", the same non-vacuity `server.test.ts` keeps
      // over the README's tool count.
      //
      // Per file, not per sentence, and that boundary is real: this fires when
      // skills/README.md drops "34 tools" and takes the tool guard with it, and
      // does not fire when one of README.md's four document sentences is
      // reworded out of view — including out of view with a wrong number in it.
      // Pinning individual sentences would mean listing them here, and a
      // hand-written list of sentences is the mirror this task exists to
      // delete. The doc-block above states the shapes that escape.
      for (const kind of ["documents", "tools"] as const) {
        if (!claims.some((c) => c.kind === kind && !c.partitive)) {
          offenders.push(`${label}: states no ${kind} count in a shape this check can see`);
        }
      }
      for (const c of claims) {
        const total = c.kind === "tools" ? TOOL_NAMES.size : DOC_COUNT;
        if (c.partitive) {
          if (c.number >= total) offenders.push(`${label}: "${c.matched}" — a part not smaller than the whole (${total})`);
        } else if (c.number !== total) {
          offenders.push(`${label}: "${c.matched}" — should be ${total}`);
        }
      }
    }
    expect(offenders, "a README count no longer agrees with what ships").toEqual([]);
  });

  /**
   * The narrowing-claim standard the Apple documents are held to, applied to
   * the skills that condense them.
   *
   * The rule is one rule: an absence is stated as what a search found, not as
   * what Apple publishes. "Apple publishes no minimum" is a claim about every
   * page Apple has, which no reading of a few of them supports; "not found in
   * X, having looked at Y" says the part that was established. The forms are
   * `ABSENCE_FORMS` further down this file, shared verbatim — this test adds no
   * pattern of its own, and gains every pattern added there. The reason to
   * extend it here is that a skill is read by an agent that will repeat what it
   * says, so a sentence a reader would have discounted gets restated as fact.
   *
   * Scope: every markdown file under `skills/`, found by walking the directory
   * rather than by listing the files here, frontmatter included (measured — an
   * absolute planted in a `description:` is reported). Today that walk finds
   * every skill's `SKILL.md` plus `skills/README.md`, and nothing else. It
   * found six `SKILL.md` when it replaced the list, so it changed no result
   * then — and then `ship-quality-gate` arrived two commits later and the walk
   * covered it with no edit here, which is the whole point of walking. (This
   * clause said "exactly the six" until the whole-branch review, two commits
   * after the seventh skill shipped: a bare cardinality gone stale in the
   * comment of a guard that exists to stop bare cardinalities. It states no
   * count now, so there is none to go stale.) It is written this way because
   * the guard's name asserts a class — every skill — and a skill that grows a
   * `reference.md`
   * would otherwise leave the guard behind with nothing noticing. Measured both
   * ways: an absolute planted in a new `reference.md` was silent under the list
   * and is reported under the walk, and one nested at
   * `apple-platform-design/refs/deep.md` is reported too. That second one is a
   * measurement of today's walk, not a property the clause below asserts:
   * nothing here pins the depth. The clause names a depth-1 `README.md` and
   * depth-2 `SKILL.md`, so a walk capped at two path segments satisfies it
   * while missing a nested directory whole — measured green, with the absolute
   * in `refs/deep.md` unseen. The same limit takes the other boundary: coverage
   * keys on the `.md` extension, so a `.mdx` beside a skill is not scanned, and
   * the clause cannot notice because it only pins the files that must be
   * covered, never the ones that must not be missed.
   *
   * Stricter than the Apple guard in two deliberate ways, both measured rather
   * than reasoned about:
   *
   *   NO QUOTATION EXEMPTION. `blankQuotes` is `false` for every file rather
   *   than read per file. That exemption is earned by a document declaring
   *   `Quotation convention:` in its own text, and no skill declares one, so
   *   `false` and a per-file read agree on everything that ships today. Where
   *   they would diverge — a skill that adopts the convention later — the
   *   hard-coded `false` reports the quoted absolute instead of passing it.
   *   Measured: the convention line and a quoted absolute planted together
   *   still fire. That is the loud direction, and a skill quoting Apple on what
   *   Apple does not publish is a sentence worth stopping at rather than one to
   *   wave through.
   *
   *   NO FENCE SKIPPING. The Apple guard skips fenced blocks; this scans them.
   *   No `SKILL.md` ships a fence and `skills/README.md` ships two `bash`
   *   install blocks, so the difference is reachable only by planting, which is
   *   how it was measured: an absolute planted inside the README's install
   *   fence is reported. Scanning inside a fence can only over-report, and the
   *   alternative is a second copy of the fence matcher the corrected-fact
   *   corpus above maintains.
   *
   * WHAT THIS DOES NOT CATCH. Each measured against the live guard by planting
   * the input and watching it stay silent — not reasoned about, and not a
   * complete list of what escapes:
   *
   *   1. Every form `ABSENCE_FORMS` misses, which is the dominant one. Those
   *      are written out above the patterns themselves — passive voice, a
   *      synonym for the subject, an absolute split across two sentences,
   *      `has no published`, a hedge between `does not` and the verb, lowercase
   *      `apple` — and that list applies here unchanged. A green run of this
   *      test means the skills carry no absolute *in the forms the patterns
   *      match*, which is narrower than carrying none.
   *   2. A claim split across two lines. `Apple publishes\nno guidance on this.`
   *      is silent; the scan is per line, as the corpus above is.
   *   3. A verb outside `ABSENCE_VERBS`, a fixed list of sixteen lemmas in 49
   *      inflections. A synonym escapes however absolute the sentence is:
   *      `Apple offers no guidance on this.` is silent while `provides` fires,
   *      and `Apple's documentation contains no minimum.` is silent the same
   *      way.
   *   4. A negation that does not sit where forms 1 and 2 look for it. Both
   *      require `no|none|nothing|nowhere` immediately *after* the verb, so
   *      `Nothing in Apple's docs defines a minimum.` is silent even though
   *      `defines` is in the list and does follow `Apple` — the negation is in
   *      front of the verb instead. `Apple's docs define no minimum.` fires:
   *      same verb, negation moved. `There is no Apple guidance on this.` is
   *      silent for the plainer reason that no publication verb follows `Apple`
   *      at all. Neither is a fact about which word is the grammatical subject
   *      — see the next paragraph.
   *
   * THE `NEW_SUBJECT` GAP, which is one mechanism with two directions and is
   * the thing to understand before trusting a green run. Forms 1 and 2 allow up
   * to 80 characters between `Apple` and the negated verb, but the gap stops
   * dead at any token in `NEW_SUBJECT` — a literal list: `.`, `the`, `its`,
   * `a`, `an`, `this`, `that`, `these`, `those`, `HIG`, `page`, `table`,
   * `section`, `guidelines`. It is not a test of whether the grammatical
   * subject changed; it is that list of strings. Nor does form 1 require Apple
   * to be the subject, whatever its name says — all three of these fire with
   * Apple as an object:
   *     `The screenshots from Apple carry no watermark.`
   *     `We wrote to Apple, who publishes no minimum.`
   *     `A note beside Apple says nothing about it.`
   * What the forms require is the token `Apple`, then a gap no `NEW_SUBJECT`
   * token truncates, then a negated publication verb. Measured, all three. So:
   *
   *   LOUD, on any inflection of a `NEW_SUBJECT` noun that the list does not
   *   spell. `\bpage\b` truncates the gap and `pages` does not, so a scoped
   *   sentence that keeps Apple in front is reported:
   *     `Apple's own pages read here carry no such guidance.`  fires
   *     `Apple's own page read here carries no such guidance.` silent
   *   Apple sits in the identical position in both, so it is not the subject
   *   that decides. All five nouns were probed in both spellings and every pair
   *   splits the same way — and the split follows the list, not the number:
   *   `guidelines` is the entry, so the *singular* `guideline` is what fires,
   *   as `HIGs`, `tables` and `sections` do. The rewrite is to move the subject
   *   onto the search itself — "no such guidance was found on the HIG pages
   *   read here" — which is the shape the standard wants anyway.
   *
   *   SILENT, and this is the direction that matters, on an interposed article
   *   or possessive. Four of these five plainly absolute sentences escape, with
   *   Apple as the subject of every one:
   *     `Apple, in the HIG, publishes no minimum.`                       silent
   *     `Apple in its documentation publishes no minimum.`               silent
   *     `Apple on this point publishes no minimum.`                      silent
   *     `Apple, across the whole of its documentation, publishes no minimum.`
   *                                                                     silent
   *     `Apple, anywhere at all, publishes no minimum.`                   fires
   *   None of them is blind spot 1's "split across two sentences" case, so the
   *   delegation there does not cover them.
   *
   * `ABSENCE_FORMS` is deliberately not widened to close either direction. It
   * is shared with the Apple-document guard above, so a change to it lands on
   * both corpora at once and is its own task with its own blast radius. What
   * this comment owes a later author is the mechanism and both of its
   * directions, not a quiet fix.
   */
  it("holds every skill to the same narrowing-claim standard as the knowledge base", () => {
    const files = readdirSync(skillsDir, { recursive: true })
      .map(String)
      .filter((p) => p.endsWith(".md"))
      .map((p) => join(skillsDir, p));
    // Non-vacuity. A walk that returned nothing — a renamed directory, a
    // `recursive` option that stops working — would leave `hits` empty and this
    // test green, which is the failure it exists to prevent. Asserted as a
    // superset, not an equality: the files that must be covered are named, and
    // anything else the walk finds is covered too rather than forbidden, which
    // is the whole point of walking instead of listing.
    for (const required of [...names.map((n) => join(skillsDir, n, "SKILL.md")), join(skillsDir, "README.md")]) {
      expect(files, "the walk stopped seeing a file it must cover").toContain(required);
    }
    const hits: string[] = [];
    for (const n of files) {
      const text = readFileSync(n, "utf8");
      text.split("\n").forEach((line, i) => {
        for (const [form, span] of absenceHits(line, false)) hits.push(`${n}:${i + 1} [${form}] ${span}`);
      });
    }
    expect(hits).toEqual([]);
  });

  // The pair the guard is defined by, kept as a test so both directions survive
  // a later edit to `ABSENCE_FORMS`. The two sentences carry the same claim
  // about the same subject matter and differ only in form, so a guard that went
  // quiet on the first — or loud on the second — would be banning the topic
  // rather than the shape, and the check above would go on passing either way.
  it("reports the absolute form and not its scoped twin", () => {
    expect(absenceHits("Apple publishes no guidance on this.", false).length).toBeGreaterThan(0);
    expect(absenceHits("No guidance on this was found on the HIG pages read here.", false)).toEqual([]);
  });
});

/**
 * The umbrella skill (`skills/saglitzdesign/SKILL.md`) claims to be the front
 * door into the seven depth skills. This holds it to that claim from both
 * sides, derived off disk rather than a hand-written list on either side —
 * the drift class the tool-name guard above already closed once.
 *
 * The routing table is read by parsing its rows, not by searching the body
 * for each directory name as a substring. A substring test passes vacuously
 * when a row is renamed to a string that contains another skill's name —
 * `clean-interface-designs` still contains `clean-interface-design` — which
 * is the same defect recorded against an earlier package's `text.includes(n)`
 * (a name that is a prefix of another passes vacuously), reintroduced here in
 * the brief this test was written from and ruled out before landing.
 *
 * Task 1 chose a regular row syntax for exactly this reason: a markdown table
 * row whose cells include one that is a single backticked directory name and
 * nothing else. `routedSkillNames` finds that cell by splitting each `|`
 * row on `|` and matching each cell on its own — not by anchoring the whole
 * line to require the name in the *last* cell, which broke two ways a review
 * demonstrated: an extra column appended after the name cell (the anchor to
 * end-of-line no longer reaches), and a digit in the directory name (an
 * earlier `[a-z][a-z-]*` character class excluded it). Per-cell matching on
 * `` `[a-z][a-z0-9-]*` `` fixes both — position within the row no longer
 * matters, and digits are allowed — while still refusing a cell that mixes
 * the name with other text (`Uses \`npx\` here` is not a bare name cell), so
 * a description that happens to backtick an unrelated word is not mistaken
 * for a route. Confirmed against the real file to extract exactly the seven
 * rows it ships today — no more, no fewer.
 */
function routedSkillNames(body: string): string[] {
  const names: string[] = [];
  for (const line of body.split("\n")) {
    if (!/^\|.*\|\s*$/.test(line)) continue; // not a table row
    for (const cell of line.split("|")) {
      const m = cell.trim().match(/^`([a-z][a-z0-9-]*)`$/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

describe("the umbrella skill routes into every depth skill", () => {
  const skillsDir = join(root, "skills");
  const umbrella = join(skillsDir, "saglitzdesign", "SKILL.md");
  const depth = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "saglitzdesign")
    .map((e) => e.name)
    .sort();

  it("names every depth skill in a routing row, and names no other directory", () => {
    const body = readFileSync(umbrella, "utf8");
    const routed = routedSkillNames(body).sort();
    // Equality in both directions: a depth skill with no routing row is
    // unreachable through the door (caught by `depth` having an entry
    // `routed` lacks); a row naming a directory that does not exist sends the
    // reader nowhere (caught the other way round).
    expect(routed).toEqual(depth);
  });

  it("states the boundary that keeps it off pure functionality", () => {
    const fm = readFileSync(umbrella, "utf8").split("---")[1] ?? "";
    expect(fm.toLowerCase()).toMatch(/not for|does not cover|beyond/);
  });

  // Whole-branch review, Minor: the umbrella names all eight workflows, and
  // nothing checked the names. Three guards existed and this fell between all
  // of them — `routedSkillNames` above guards the seven *skill* names, the
  // tool guard elsewhere in this file inspects only backticked snake_case
  // names whose prefix is in its own allowlist (`design_review` would have
  // been reported as a phantom tool, and four of the eight would have escaped
  // on their prefix), and `scripts/preflight-release.mjs` checks `commands/`
  // against `src/prompts.ts`. A skill naming a *prompt* was guarded by none.
  // A typo in any of the eight shipped silently.
  it("names the eight workflows exactly as the server serves them", () => {
    const body = readFileSync(umbrella, "utf8");
    // Scoped to the list itself, between the two em dashes that bracket it —
    // not to the paragraph, and not to the file. A whole-file sweep would be
    // satisfied by any backticked name anywhere, which is the vacuity this
    // guard exists to avoid.
    const list = /eight guided workflows — (.+?) — which drive/s.exec(body);
    expect(list, "the workflow list has moved or been reworded").toBeTruthy();
    const named = [...list![1].matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
    expect(named.sort()).toEqual([...PROMPT_NAMES].sort());
  });

  // …and that they are not tools, which is the other half of the claim: the
  // sentence tells a reader they cannot be called by name.
  it("none of the eight is a tool name", () => {
    expect(PROMPT_NAMES.filter((p) => TOOL_NAMES.has(p))).toEqual([]);
  });
});

describe("release metadata is in sync", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));

  it("server.json carries the package.json version everywhere", () => {
    expect(manifest.version).toBe(pkg.version);
    for (const p of manifest.packages ?? []) expect(p.version, p.identifier).toBe(pkg.version);
  });

  it("server.json identifies the same npm package, and mcpName matches", () => {
    expect(manifest.packages?.[0]?.identifier).toBe(pkg.name);
    expect(pkg.mcpName).toBe(manifest.name);
  });

  it("keeps the registry description within the 100-char limit", () => {
    expect(manifest.description.length).toBeLessThanOrEqual(100);
  });
});

// Security guidance is only worth shipping if it is traceable to a standard or a
// first-party vendor doc. Blog-tier sourcing is how confidently-wrong security
// advice spreads, so the allowlist is enforced rather than merely documented.
//
// The allowlist's own comment always said "a standard or a first-party vendor
// doc". The list never said which a given host was, so a host that is neither
// could sit in it unnoticed, and hosts that plainly qualified were missing
// because the list was written for one category. Naming the tiers makes both
// visible, and lets `security` hold a stricter line than the rest.
//
// `standard` holds standards bodies and regulators, plus the platform-neutral
// references that track them rather than any one vendor's product — MDN,
// web.dev, caniuse. `vendor` holds first-party documentation of the system
// being described, including a browser vendor's own docs for its own engine.
// MDN is platform-neutral and stays in `standard`; hacks.mozilla.org is
// Mozilla's own engineering blog about Firefox, so it sits in `vendor` for the
// same reason webkit.org and developer.chrome.com do.
//
// support.apple.com is Apple's end-user documentation of Apple's own systems,
// which is what `vendor` is defined to hold — the audience differs from
// developer.apple.com, the first-party-ness does not. It earns its place: the
// only source for a Mac keyboard shortcut Apple ships but never states in the
// HIG (Option-Command-S for the Finder sidebar) is an end-user article, and a
// rule that reads only the HIG would tell an app that binds it that it invented
// the key. Note that a source living in prose because no tier admits it is a
// source no assertion can check — frontmatter is what these checks see.
const SOURCE_TIERS = {
  standard: new Set([
    "w3.org", "w3c.github.io", "whatwg.org", "html.spec.whatwg.org",
    "datatracker.ietf.org", "rfc-editor.org", "developer.mozilla.org",
    "web.dev", "caniuse.com",
    "owasp.org", "cheatsheetseries.owasp.org",
    "genai.owasp.org", "fidoalliance.org", "passkeys.dev",
    "edpb.europa.eu", "ico.org.uk", "kvkk.gov.tr", "eur-lex.europa.eu",
    "cppa.ca.gov",
  ]),
  vendor: new Set([
    "developer.apple.com", "apple.com", "support.apple.com",
    "developer.chrome.com", "developers.google.com", "webkit.org",
    "hacks.mozilla.org",
    "nextjs.org", "docs.astro.build", "svelte.dev", "vite.dev",
  ]),
  research: new Set([
    "nngroup.com", "baymard.com", "lawsofux.com",
  ]),
} as const;

const tierOf = (host: string): keyof typeof SOURCE_TIERS | null => {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const [tier, hosts] of Object.entries(SOURCE_TIERS)) {
    if (hosts.has(h)) return tier as keyof typeof SOURCE_TIERS;
  }
  return null;
};

/**
 * The one operation in this file that can *throw* rather than fail. 55 sources
 * across 19 documents are not URLs at all — a hand-written pair that had
 * drifted in both directions since it was written, which is why the count is
 * now asserted below rather than only stated here — whole `book`, `craft`, `process`
 * and `marketing` categories cite book titles like "Breakthrough Advertising
 * (Eugene Schwartz)" — and `new URL(...)` on one of those raises a TypeError
 * that aborts the run and names neither the document nor the source. None of
 * those documents is in the Apple or security sets today, so nothing throws;
 * that is one `category:` or `APPLE_DOC_IDS` edit away from being untrue, and
 * the failure it produces would be a stack trace rather than a finding.
 *
 * So every check that reads a source goes through here and gets `null` for a
 * source it cannot parse, which the caller reports as a named offender.
 */
const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

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

  it("resolves a host regardless of case", () => {
    expect(tierOf("DEVELOPER.APPLE.COM")).toBe("vendor");
  });

  // The count `hostOf`'s comment states, asserted rather than only written
  // down. The pair in that comment was hand-typed and had drifted in *both*
  // directions by the time anyone re-measured it — 33/20 stated against 55/19
  // measured — which is the same failure this file fixed elsewhere by deriving
  // a number instead of writing one. A range rather than an equality: the
  // point is that the class is large and non-empty (so `hostOf`'s
  // throw-instead-of-fail guard is load-bearing, not theoretical), not that it
  // is frozen at today's figure.
  it("the non-URL source class is real and roughly the size hostOf's comment claims", () => {
    const offenders = docs.flatMap((d) => (d.sources ?? []).filter((u) => hostOf(u) === null).map(() => d.id));
    const documents = new Set(offenders);
    expect(offenders.length).toBeGreaterThanOrEqual(40);
    expect(offenders.length).toBeLessThanOrEqual(80);
    expect(documents.size).toBeGreaterThanOrEqual(12);
    expect(documents.size).toBeLessThanOrEqual(30);
    // And the comment's own numbers must sit inside the band it is checked
    // against, so a future edit cannot restate a figure this test would reject.
    const stated = readFileSync(join(__dirname, "integrity.test.ts"), "utf8")
      .match(/(\d+) sources\n \* across (\d+) documents are not URLs at all/);
    expect(stated, "hostOf's comment no longer states a count in the expected shape").toBeTruthy();
    expect(Number(stated![1])).toBe(offenders.length);
    expect(Number(stated![2])).toBe(documents.size);
  });

  it("keeps security documents on standard and vendor sources only", () => {
    const offenders: string[] = [];
    for (const d of docs.filter((x) => x.category === "security")) {
      for (const url of d.sources ?? []) {
        const host = hostOf(url);
        if (host === null) {
          offenders.push(`${d.id}: unparseable source ${url}`);
          continue;
        }
        const tier = tierOf(host);
        if (tier !== "standard" && tier !== "vendor") offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// The Apple guides make platform claims — bar heights, adoption rules, what a
// system API does — that only Apple can settle. A blog restating Apple is one
// transcription error away from being wrong, and nothing downstream can tell the
// difference, so these documents are held to Apple's own pages plus the tiers.
// Tasks adding further Apple documents add their ids to that list — and `covers
// every Apple design-language document` below fails until they do. The list is
// pinned from both sides: it may only grow (`never enforces fewer Apple
// documents`), and every id in it must still match the predicate (`keeps every
// listed document inside the predicate`), so enforcement cannot be dropped by
// editing frontmatter.
//
// It is imported from `src/catalog.ts` rather than declared here because the
// server prints which side of the boundary each document sits on, and two
// definitions of "enforced" would drift apart silently.

/**
 * What makes a document Apple's to answer for, derived from the document rather
 * than from the list. Anchoring the membership check to this is the whole point:
 * a check that reads APPLE_DOC_IDS and compares it back to APPLE_DOC_IDS passes
 * no matter which id you delete, so it cannot notice a document quietly leaving
 * enforcement — which is exactly the failure the list exists to prevent.
 */
const isAppleDoc = (d: (typeof docs)[number]) =>
  d.category === "design-language" && (d.tags ?? []).includes("apple");

describe("Apple documents are sourced to Apple", () => {
  const appleDocs = () => docs.filter((d) => APPLE_DOC_IDS.includes(d.id));

  it("names an id that exists for every entry", () => {
    const phantom = APPLE_DOC_IDS.filter((id) => !docs.some((d) => d.id === id));
    expect(phantom).toEqual([]);
  });

  it("covers every Apple design-language document", () => {
    const unenforced = docs.filter(isAppleDoc).filter((d) => !APPLE_DOC_IDS.includes(d.id));
    expect(unenforced.map((d) => d.id)).toEqual([]);
  });

  // `covers every Apple design-language document` is one-sided: it walks from the
  // predicate to the list, so it only notices a document the predicate still
  // claims. Delete a document's `apple` tag and the predicate stops claiming it,
  // and that check goes quiet — delete the id too and every check goes quiet,
  // because both sides of the comparison shrank together. The two assertions
  // below close each direction.
  //
  // Round-trip: every listed id must still satisfy the predicate. This is what
  // fails when a tag is removed on its own — the id stays, the predicate drops it,
  // and the disagreement is now visible instead of silent.
  it("keeps every listed document inside the predicate that defines them", () => {
    const escaped = APPLE_DOC_IDS
      .map((id) => docs.find((d) => d.id === id))
      .filter((d): d is (typeof docs)[number] => Boolean(d))
      .filter((d) => !isAppleDoc(d))
      .map((d) => `${d.id} (category: ${d.category}, tags: ${(d.tags ?? []).join("|")})`);
    expect(escaped).toEqual([]);
  });

  // Floor: enforcement may grow, never shrink. This is what fails when a tag and
  // its id are removed together — the only mutation both other checks survive,
  // since it leaves nothing on either side to disagree about. Raise the number
  // when a task adds a document; never lower it to make a suite pass.
  it("never enforces fewer Apple documents than it does today", () => {
    expect(APPLE_DOC_IDS.length).toBeGreaterThanOrEqual(6);
  });

  it("cites no source outside the tiers", () => {
    const offenders: string[] = [];
    for (const d of appleDocs()) {
      for (const url of d.sources ?? []) {
        const host = hostOf(url);
        if (host === null) offenders.push(`${d.id}: unparseable source ${url}`);
        else if (tierOf(host) === null) offenders.push(`${d.id}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("carries at least one developer.apple.com source each", () => {
    const thin = appleDocs()
      .filter((d) => !(d.sources ?? []).some((u) => hostOf(u) === "developer.apple.com"))
      .map((d) => d.id);
    expect(thin).toEqual([]);
  });

  it("cites at least three sources each", () => {
    expect(appleDocs().filter((d) => (d.sources ?? []).length < 3).map((d) => d.id)).toEqual([]);
  });

  // The accessibility document is what E2's rules will cite when they flag a
  // fixed font size, an unlabelled icon button, an undersized hit region or an
  // ungated animation. A rule that cites a document which no longer makes the
  // claim is worse than no rule, so the four subjects are pinned here.
  it("apple-accessibility states the Dynamic Type and tap-target facts E2 will cite", () => {
    const d = docs.find((x) => x.id === "apple-accessibility");
    expect(d, "document is missing").toBeDefined();
    const body = d!.body.toLowerCase();
    for (const term of ["dynamic type", "voiceover", "reduce motion", "contrast"]) {
      expect(body, `does not mention ${term}`).toContain(term);
    }
  });

  // The macOS guide is what E2's platform-fit rules will cite when they flag an
  // iOS-shaped app shipped on the Mac — no menu bar commands, no keyboard
  // shortcuts, a sheet where a window belongs. Pinning the subjects here means a
  // rule can never cite a document that has stopped naming what it flags.
  it("macos-app-design names the platform-fit subjects E2 will cite", () => {
    const d = docs.find((x) => x.id === "macos-app-design");
    expect(d, "document is missing").toBeDefined();
    const body = d!.body.toLowerCase();
    for (const term of ["menu bar", "toolbar", "keyboard shortcut", "window", "sidebar"]) {
      expect(body, `does not mention ${term}`).toContain(term);
    }
  });

  // A "hardcoded string" rule written from web instinct would flag `Text("Hello")`
  // — which SwiftUI already localizes, because the literal becomes a
  // LocalizedStringKey. The myth-check is the document E2 has to read before
  // writing that rule, so the term it turns on is pinned.
  it("ios-app-design records the localization myth-check", () => {
    const d = docs.find((x) => x.id === "ios-app-design");
    expect(d, "document is missing").toBeDefined();
    expect(d!.body).toMatch(/LocalizedStringKey/);
  });

  // Same contract for the shipping document: E2's shipping rules will match on
  // the literal key and entitlement names it publishes, so a rule citing this
  // doc must be able to find the subject it names.
  it("apple-shipping-readiness names the plist and entitlement keys E2 will cite", () => {
    const d = docs.find((x) => x.id === "apple-shipping-readiness");
    expect(d, "document is missing").toBeDefined();
    for (const key of ["Info.plist", "entitlement", "sandbox", "icon"]) {
      expect(d!.body.toLowerCase(), `does not mention ${key}`).toContain(key.toLowerCase());
    }
  });
});

// This package has published five false absence claims, and the last two were
// each introduced by the fix for the previous one — same author, same session,
// same fact. The cause is not the research; every round verified against live
// pages. The cause is the sentence form.
//
//   "Apple publishes no X"   — a claim about every Apple surface at once. One
//                              fetch kills it, and one did, five times.
//   "Not found on [pages],   — a claim about the search. A missed surface makes
//    having searched         it incomplete rather than false, and correcting it
//    [surfaces]"             means adding a page rather than reversing an
//                            assertion.
//
// The previous rounds identified this correctly, wrote it into both documents'
// parentheticals, and then wrote three more absolutes anyway. Correcting each
// instance by hand is what did not work, so the form is enforced here instead.
//
// Two kinds of absolute are legitimate, and a guard that fires on them would be
// worse than no guard:
//
//   1. Apple's own words. "macOS doesn't support Dynamic Type" is Apple's
//      sentence. A document that declares wording inside quote marks to be
//      Apple's, unaltered, gets its quoted spans blanked before matching — and
//      the convention that makes this safe is stated in the document itself
//      rather than assumed here.
//
//      That exemption is *earned per document*, not granted to the set. It was
//      granted to the set once, and it was unearned in two of the six:
//      `apple-hig-liquid-glass` and `wwdc-design-principles` declare no
//      convention and use quote marks for paraphrase and scare-quotes
//      ("I understood you", "durations", "tick", "pour"), so a false absolute
//      wrapped in quote marks in either one passed. Adding the convention line
//      to those two would have closed the hole by publishing a false statement
//      — their quoted spans are not Apple's verbatim wording — so the blanking
//      is keyed on the declaration instead. A document that later adopts the
//      convention gains the exemption by saying so, in the document, where a
//      reader can check it against the quotes around it.
//   2. A claim scoped to a named page or table: "the HIG's standard-shortcut
//      table contains no sidebar entry". This one survived every review while
//      its absolute twin failed on the first fetch, and the reason is
//      grammatical — its *subject* is a page, not Apple. That is what the
//      patterns below key on. An absence claim with Apple as its subject is
//      unbounded; the same claim with a named page as its subject is a finite,
//      checkable, correctable statement.
//
// Emphasis markers are stripped before matching, because `Apple does **not**
// publish` is the same sentence and slipped past a first draft of this check.
const ABSENCE_VERBS = [
  "publish", "publishes", "published",
  "assign", "assigns", "assigned",
  "define", "defines", "defined",
  "state", "states", "stated",
  "document", "documents", "documented",
  "specify", "specifies", "specified",
  "give", "gives", "given", "gave",
  "list", "lists", "listed",
  "provide", "provides", "provided",
  "carry", "carries", "carried",
  "name", "names", "named",
  "say", "says", "said",
  "ship", "ships", "shipped",
  "mention", "mentions", "mentioned",
  "record", "records", "recorded",
  "declare", "declares", "declared",
].join("|");

// Words that introduce a different grammatical subject. If one appears between
// "Apple" and the negated verb, Apple is no longer the thing doing the
// not-publishing, and the sentence is the scoped form we want people writing.
const NEW_SUBJECT = [
  "\\.", "\\bthe\\b", "\\bits\\b", "\\ba\\b", "\\ban\\b", "\\bthis\\b", "\\bthat\\b",
  "\\bthese\\b", "\\bthose\\b", "\\bHIG\\b", "\\bpage\\b", "\\btable\\b",
  "\\bsection\\b", "\\bguidelines\\b",
].join("|");
const GAP = `(?:(?!${NEW_SUBJECT})[^.\\n]){0,80}?`;
// `Apple` is matched case-sensitively so document ids like `apple-accessibility`
// are not read as the subject of the next clause.
const APPLE = "(?<![\\w-])Apple(?![\\w-])";

const ABSENCE_FORMS: { name: string; re: RegExp }[] = [
  {
    name: "Apple as the subject of a negated publication verb",
    re: new RegExp(`${APPLE}${GAP}\\b(?:${ABSENCE_VERBS})\\s+(?:no|none|nothing|nowhere)\\b`, "g"),
  },
  {
    name: "Apple does not <publication verb>",
    re: new RegExp(`${APPLE}${GAP}\\b(?:does\\s+not|doesn't|do\\s+not|don't)\\s+(?:${ABSENCE_VERBS})\\b`, "g"),
  },
  {
    // "Apple never publishes", "It never states" — absolute across time as well
    // as surface. Requires a preceding word so the imperative "Never ship …"
    // (advice to the reader, not a claim about Apple) does not match.
    name: "<subject> never <publication verb>",
    re: new RegExp(`\\b\\w+\\s+never\\s+(?:${ABSENCE_VERBS})\\b`, "gi"),
  },
  {
    name: "<publication verb> nowhere",
    re: new RegExp(
      `\\b(?:${ABSENCE_VERBS}|appear|appears|appeared|reconcile|reconciles|reconciled)` +
      `\\s+(?:it\\s+|them\\s+|the\\s+two\\s+)?nowhere\\b`, "gi"),
  },
  {
    // "on no Apple page", "on any Apple page" — the same universal claim with
    // the quantifier moved. "…on any Apple page searched" is the scoped form
    // and is what the exception admits.
    name: "any/every/no Apple page",
    re: /\b(?:any|every|no|all)\s+Apple\s+(?:page|pages|surface|surfaces|document|documents|documentation|source|sources)\b(?!\s+(?:searched|checked|read|fetched|listed))/gi,
  },
  {
    // An exhaustive claim about what a page contains. This is the one that
    // produced the fifth defect: `ios-app-design` said HIG › Layout's "only pt
    // figures" were two, and the page carried eight more tables inside a
    // `tabNavigator` node the render walk never reached. "The pt figures found
    // there are …" says the same thing without claiming to have seen the whole
    // page, and is always available.
    name: "exhaustive claim about a page's contents",
    re: /\b(?:its|their|whose|the)\s+only\s+[\w-]*\s*(?:figures?|numbers?|counts?|entr(?:y|ies)|mentions?|rows?|statements?)\b|\bonly\s+[\w-]+\s+(?:on|in)\s+(?:the|that|this)\s+(?:page|table|document)\b|\bcontains\s+exactly\b/gi,
  },
];

// WHAT THIS GUARD DOES NOT CATCH. Read this before concluding from a green
// suite that the Apple documents contain no false absence claim — they contain
// none *in the forms below the line*, which is a narrower statement.
//
// This project's characteristic defect is a check that reads as a guarantee and
// is not, and this file spends 80 lines describing the guard's design and its
// two legitimate exceptions without once saying what it misses. So: the
// following all pass today, every one of them measured against the patterns
// above rather than reasoned about.
//
//   "no shortcut is assigned by Apple"        passive voice — Apple is the
//                                             agent, not the grammatical
//                                             subject, and the patterns key on
//                                             the subject
//   "Cupertino publishes no …"                a synonym subject; the APPLE
//                                             token is literal
//   "Apple was searched thoroughly. No        an absolute split across two
//    minimum is published."                   sentences — GAP stops at `\.`
//   "Apple publishes no minimum."             a *fabricated* quotation in a
//    (inside quote marks, in a document       document that declares the
//    that declares the convention)            convention: blanked, and nothing
//                                             here checks the words are Apple's
//   "Apple has no published minimum"          `has`/`is` are not publication
//   "Apple is silent on the minimum"          verbs, and adding them would fire
//                                             on ordinary prose
//   "Apple does not appear to publish X"      the hedge separates `does not`
//                                             from the verb
//   "apple publishes no minimum"              APPLE is case-sensitive on
//                                             purpose, so the id
//                                             `apple-accessibility` is not read
//                                             as a subject; lowercase prose
//                                             escapes with it
//   an absolute inside a fenced code block    fences are skipped by design; the
//                                             fence-parity assertion only
//                                             guarantees they are balanced
//
// Every historical defect in this package landed in a form the patterns catch,
// which is why the guard is worth having. It is a regression guard against a
// good-faith author reaching for a familiar sentence — not an adversarial
// filter, and not a substitute for reading the source.
//
// One known over-match, zero occurrences today: the APPLE token matches the
// "Apple" in *Apple Watch*, *Apple Music* and *Apple Store*, so
// "Apple Watch publishes no complication size" would be reported with Apple as
// its subject. Narrowing the token would cost more than it saves — the sentence
// is one a person should rewrite anyway — but a future hit that looks spurious
// is probably this.

/** The declaration that earns a document the quotation exemption, matched in
 *  the document's own text so the exemption cannot be granted from here. */
const QUOTE_CONVENTION = /^\s*\*?Quotation convention:/m;

/**
 * One line, reduced to what the patterns see. `blankQuotes` is the earned
 * exemption; emphasis is always stripped, because `Apple does **not** publish`
 * is the same sentence and evaded three rounds of grepping.
 */
const scanLine = (line: string, blankQuotes: boolean) =>
  (blankQuotes ? line.replace(/"[^"]*"/g, (m) => " ".repeat(m.length)) : line)
    .replace(/[*_`]/g, " ");

/** Every absence form matching a line, as `[name, matched text]` pairs. */
const absenceHits = (line: string, blankQuotes: boolean): [string, string][] => {
  const scanned = scanLine(line, blankQuotes);
  const hits: [string, string][] = [];
  for (const form of ABSENCE_FORMS) {
    form.re.lastIndex = 0;
    const m = form.re.exec(scanned);
    if (m) hits.push([form.name, m[0].replace(/\s+/g, " ").trim()]);
  }
  return hits;
};

describe("the quotation exemption is earned per document", () => {
  const absolute = 'Apple publishes no minimum for this control.';

  it("catches a bare absolute either way", () => {
    expect(absenceHits(absolute, true).length).toBeGreaterThan(0);
    expect(absenceHits(absolute, false).length).toBeGreaterThan(0);
  });

  it("exempts a quoted absolute only where the convention is declared", () => {
    expect(absenceHits(`"${absolute}"`, true)).toEqual([]);
    expect(absenceHits(`"${absolute}"`, false).length).toBeGreaterThan(0);
  });

  it("reads the declaration out of the document rather than a list here", () => {
    const declaring = APPLE_DOC_IDS
      .map((id) => docs.find((d) => d.id === id))
      .filter((d): d is (typeof docs)[number] => Boolean(d))
      .filter((d) => QUOTE_CONVENTION.test(readFileSync(d.path, "utf8")))
      .map((d) => d.id);
    // Not pinned to a fixed set — a document adopting the convention should be
    // able to gain the exemption without editing this file. What is pinned is
    // that the exemption is a minority privilege rather than a blanket one, so
    // granting it back to the whole set is a visible change.
    expect(declaring.length).toBeLessThan(APPLE_DOC_IDS.length);
    expect(declaring.length).toBeGreaterThan(0);
  });
});

describe("the Apple documents state absences in the scoped form", () => {
  it("uses no absolute absence construction outside a quotation", () => {
    const offenders: string[] = [];
    for (const id of APPLE_DOC_IDS) {
      const doc = docs.find((d) => d.id === id);
      if (!doc) continue; // `names an id that exists for every entry` owns this
      // Read the file rather than `doc.body` so a failure names the line a
      // person can open, frontmatter included.
      const source = readFileSync(doc.path, "utf8");
      const blankQuotes = QUOTE_CONVENTION.test(source);
      const lines = source.split("\n");
      let inFence = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
        if (inFence) continue;
        for (const [name, matched] of absenceHits(lines[i], blankQuotes)) {
          offenders.push(`${id}:${i + 1} [${name}] "${matched}"`);
        }
      }
      // An unclosed fence would exempt everything after it, silently — the same
      // shape as the defect this whole check exists to catch.
      expect(inFence, `${id}: unbalanced code fence`).toBe(false);
    }
    expect(
      offenders,
      "absolute absence claim — say what the search found on the pages named, not what Apple publishes",
    ).toEqual([]);
  });
});

// `**Sources:**` used to print identically for all 96 documents, which made a
// document whose citations are asserted on look exactly like one whose
// citations are not. Today that is 11 enforced against 85 unenforced, and 66 of
// the 85 would fail the tiers if the assertion were extended to them — so
// identical presentation is not a neutral omission, it flatters the majority.
// The migration is a later package; the disclosure is not.
describe("the sourcing boundary is disclosed rather than implied", () => {
  it("enforces exactly the Apple set and the security category", () => {
    const enforced = docs.filter(isSourceEnforced).map((d) => d.id).sort();
    const expected = [
      ...APPLE_DOC_IDS,
      ...docs.filter((d) => d.category === "security").map((d) => d.id),
    ].sort();
    expect(enforced).toEqual(expected);
  });

  it("leaves most of the base unenforced, which is the fact worth stating", () => {
    // Not a target to hit — a measurement that keeps the README's claim honest.
    // When the migration package lands, this flips and the sentence changes.
    expect(docs.filter((d) => !isSourceEnforced(d)).length).toBeGreaterThan(0);
  });

  it("prints which side of the boundary a document sits on", () => {
    const indexSrc = readFileSync(join(root, "src", "index.ts"), "utf8");
    expect(indexSrc).toContain("isSourceEnforced");
    expect(indexSrc).toContain("not yet checked against the source allowlist");
  });

  it("says so in the README too, where the count lives", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    expect(readme).toMatch(/not yet/i);
    expect(readme).toContain("11");
  });
});

describe("security documents cite permitted sources only", () => {
  it("uses no blog-tier source", () => {
    const offenders: string[] = [];
    for (const d of docs.filter((x) => x.category === "security")) {
      for (const url of d.sources ?? []) {
        const host = hostOf(url);
        if (host === null) {
          offenders.push(`${d.id}: unparseable source ${url}`);
          continue;
        }
        const tier = tierOf(host);
        if (tier !== "standard" && tier !== "vendor") {
          offenders.push(`${d.id}: ${host}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("cites at least three sources per document", () => {
    const thin = docs
      .filter((d) => d.category === "security")
      .filter((d) => (d.sources ?? []).length < 3)
      .map((d) => d.id);
    expect(thin).toEqual([]);
  });
});

// Four surfaces describe what audit_security can read, for four different
// readers: the report's "Not visible to this audit" block (a human), the MCP
// tool description (the client, deciding whether to call the tool at all), the
// README's tool table, and `ship-quality-gate`'s row for the tool (an agent,
// which will repeat what it says aloud). They drifted once — the README was
// brought up to date and the machine-facing description was not, which is the
// worse half to miss: an agent reading the short list will not reach for this
// tool on a Nuxt or Remix project.
//
// They drifted a second time, and the fourth surface is why it is checked here
// now. The skill shipped saying header state is read "only in five recognised
// declaration shapes", inferred from `RECOGNISED_SHAPES.length` in
// `src/security.ts` — which is five semicolon-joined *prose groups*, whose
// third group alone names five shapes. A guard whose name asserts "every
// surface" while its body checks three of four is the shape this file exists
// to stop, so the surface is the whole set or the name is wrong.
//
// **The direction this guard does not cover.** The first `it.each` below
// iterates `HEADER_SOURCE_TOKENS` and asserts `token ∈ surface`. It never
// asserts `surface ⊆ tokens`, so a surface naming a shape the array does not
// is invisible here — and the array's own omission of Fastify's
// `reply.header`, `headers.set` and `headers.append`, three shapes the report
// bullet named and the extractor reads, therefore passed every run of this
// guard until they were added. Nor is the converse enforceable as prose: of
// the 26 backticked spans in that bullet,
// four match no token — `headers()`, `key`, `value` and the object-literal
// example `{ "Content-Security-Policy": "…" }` — and all four are correct
// text, grammar rather than sources. "Every backticked span is a token"
// therefore fails on a bullet that is right (measured on this tree).
//
// What *is* enforced in the other direction is the axis that drift ran along.
// `HEADER_METHOD_NAMES` is code, not prose, and the second `it.each` asserts
// every method name in it is named by some token; dropping `reply.header` or
// `res.setHeader` from the array now goes red. Dropping a *file* token
// (`firebase.json`, `kit.csp`) still does not — nothing enumerates the
// extractor's file reach — and neither does dropping one of two tokens that
// name the same method (`res.set` / `headers.set`).
describe("every surface that lists audit_security's header sources lists all of them, and the array names every call shape the extractor accepts", () => {
  const securitySrc = readFileSync(join(root, "src", "security.ts"), "utf8");
  const indexSrc = readFileSync(join(root, "src", "index.ts"), "utf8");
  // The README uses non-breaking hyphens in its tool table; normalise them so
  // a token like "meta http-equiv" is compared on its content, not its glyphs.
  const readme = readFileSync(join(root, "README.md"), "utf8").replace(/‑/g, "-");
  const readmeRow = readme.split("\n").find((l) => l.includes("**`audit_security`**")) ?? "";
  // The agent-facing surface: `ship-quality-gate`'s table row for the tool.
  // Row-scoped rather than whole-file, for the same reason the README is: a
  // token named anywhere else in a long document would satisfy the check
  // without the row a reader of that row ever seeing it.
  const skill = readFileSync(join(root, "skills", "ship-quality-gate", "SKILL.md"), "utf8").replace(/‑/g, "-");
  // A *table row*, not merely the first line that mentions the tool. The
  // locator used to be "first line containing `audit_security`", which is the
  // `full.indexOf(l)` shape this repository has already been bitten by once:
  // it silently resolved to whichever line came first, so a paragraph added
  // above the table — one was, in the fix round that rewrote this skill's
  // opening — became "the row", and twenty-two token assertions failed
  // against prose that was never supposed to carry them.
  const skillRow = skill.split("\n").find((l) => l.trimStart().startsWith("|") && l.includes("`audit_security`")) ?? "";

  // Scoped to its own bullet for the same reason the README and the skill are
  // scoped to their rows: a token satisfied by some other sentence of the
  // report is a token nobody was actually told about. A bare `proxy` token
  // would be satisfied by "reverse proxy" in the CDN bullet, which says the
  // opposite of what the token would be claiming — measured with
  // `firebase.json` moved out of the shapes bullet and into that one: the
  // whole-report check passes, this one fails.
  const notVisible = securityReport({ root: join(root, "does-not-exist-so-only-the-boilerplate-renders") }).text;
  const shapesBullet = notVisible.split("\n").find((l) => l.includes("Header shapes it does not recognise")) ?? "";

  it("the README and the skill each have an audit_security row to check", () => {
    expect(readmeRow, "README tool table row").not.toBe("");
    expect(skillRow, "ship-quality-gate table row").not.toBe("");
    expect(shapesBullet, "report's recognised-shapes bullet").not.toBe("");
  });

  it("the tool description is built from the shared constant, not a copy of it", () => {
    expect(indexSrc).toContain("HEADER_SOURCES_SENTENCE");
    expect(HEADER_SOURCE_TOKENS.length).toBeGreaterThan(0);
  });

  it.each(HEADER_SOURCE_TOKENS.map((t) => [t]))(
    "%s is named in the tool description, the report, the README and the skill", (token) => {
      expect(HEADER_SOURCES_SENTENCE, "MCP tool description").toContain(token);
      expect(shapesBullet, "report's recognised-shapes bullet").toContain(token);
      expect(readmeRow, "README tool table row").toContain(token);
      expect(skillRow, "skills/ship-quality-gate/SKILL.md tool table row").toContain(token);
    });

  // `HEADER_METHOD_NAMES` is what `isHeaderDeclarationContext` actually
  // accepts as a header-setting call. A name in it that no token spells out is
  // reach the four surfaces above cannot describe, however faithfully they
  // mirror the array — `append` and `header` were both in that state, which is
  // what let a Fastify project's `reply.header("Content-Security-Policy", …)`
  // be read while every surface implied it was not.
  it.each([...HEADER_METHOD_NAMES].map((m) => [m]))(
    "the .%s( call shape the extractor accepts is named by some token", (method) => {
      const naming = HEADER_SOURCE_TOKENS.filter(
        (t) => (t.split(".").pop() ?? "").toLowerCase() === method);
      expect(naming, `no HEADER_SOURCE_TOKENS entry ends in .${method}`).not.toEqual([]);
    });
});
