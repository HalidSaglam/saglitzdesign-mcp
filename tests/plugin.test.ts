import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPT_METADATA, type PromptMeta } from "../dist/prompts.js";
import { loadKnowledge } from "../dist/knowledge.js";
import { renderAllCommands } from "../scripts/generate-commands.mjs";
import { liveToolNames, liveDisclosureTools } from "./helpers/liveServer.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));

describe("the plugin manifest", () => {
  const pkg = readJson("package.json");

  it("carries the package version", () => {
    expect(readJson(".claude-plugin/plugin.json").version).toBe(pkg.version);
  });

  it("names the plugin and the marketplace exactly", () => {
    expect(readJson(".claude-plugin/plugin.json").name).toBe("saglitzdesign");
    expect(readJson(".claude-plugin/marketplace.json").name).toBe("saglitz");
  });

  /**
   * Every number in the plugin description, held against the thing it counts.
   *
   * This description is the first and often the only sentence about this plugin
   * a user reads — `claude plugin details` prints it, and a marketplace listing
   * shows it before anything is installed. Nothing held it. A review falsified
   * all four numbers at once, to "9000 documents, 3 tools, forty auditors and
   * one workflow", and the whole suite and `preflight-release` stayed green.
   *
   * Each number is read from a live source, never from a constant here:
   * `knowledge/` as `loadKnowledge` returns it, and the tools, the disclosure
   * tools and the prompts as the running server registers them. A count written
   * out in this file would be the same hand-written mirror that went stale at 33
   * tools while 34 shipped.
   *
   * "auditors" is the set of tools whose `outputSchema` declares `notVisible` —
   * which is what the description's own clause says they are, tools that publish
   * what they could not see. It is deliberately not "tools whose name starts
   * with `audit_`": that set has nine members today, so the same word under the
   * other reading would make the sentence false. The description is worded to
   * name the predicate rather than leave a reader to pick one.
   *
   * The last assertion is the one that keeps this from rotting: every digit run
   * in the description has to belong to a claim matched above, so a fifth number
   * added later cannot slip in unheld. A word-spelled number ("seven auditors",
   * which is how this description read until 0.26.0) is matched too — dropping
   * the digits would otherwise be a way to leave a count unguarded.
   */
  it("states no number in the plugin description that a live source does not hold", async () => {
    const description: string = readJson(".claude-plugin/plugin.json").description;
    const WORDS: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };
    const live: Record<string, number> = {
      documents: loadKnowledge(join(root, "knowledge")).length,
      tools: (await liveToolNames()).length,
      auditors: (await liveDisclosureTools()).length,
      workflows: PROMPT_METADATA.length,
    };
    // Non-vacuity, and it is not decoration: every one of these comes off a
    // spawn or a directory read, so a helper that started returning nothing
    // would otherwise let the description claim zero of everything.
    for (const [kind, n] of Object.entries(live)) {
      expect(n, `nothing live counts ${kind}`).toBeGreaterThan(0);
    }
    const NOUNS = Object.keys(live).join("|");
    // Up to two words between the number and its noun, for "96 knowledge
    // documents" and "7 of them auditors".
    const CLAIM = new RegExp(String.raw`\b(?:(\d+)|(${Object.keys(WORDS).join("|")}))\b(?:\s+\w+){0,2}?\s+(${NOUNS})\b`, "gi");
    const claims = [...description.matchAll(CLAIM)];
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const m of claims) {
      const kind = m[3].toLowerCase();
      seen.add(kind);
      const claimed = m[1] !== undefined ? Number(m[1]) : WORDS[m[2].toLowerCase()];
      if (claimed !== live[kind]) problems.push(`"${m[0]}" — ${kind} is ${live[kind]}`);
    }
    expect(problems, "the plugin description states a count the server does not").toEqual([]);
    expect([...seen].sort(), "a counted noun vanished from the description").toEqual(Object.keys(live).sort());
    // Every digit run has to have been one of the matched claims. Without this
    // the guard covers the four numbers that happen to be here today and says
    // nothing about a fifth.
    const held = new Set(claims.map((m) => m[1]).filter(Boolean));
    const unheld = [...description.matchAll(/\d+/g)].map((m) => m[0]).filter((n) => !held.has(n));
    expect(unheld, "a number in the plugin description that nothing checks").toEqual([]);
  });

  // The plugin travels as a git checkout, and that decides what may be declared
  // here. Skills and commands are files, so they arrive intact. `dist/` does
  // not: it is gitignored, nothing builds it on install, and a checkout carries
  // no `node_modules` either — so a server declared as a path inside the plugin
  // fails twice over, once because the entry file is absent and again because
  // `@modelcontextprotocol/sdk` would be unresolvable even if it were not. The
  // server is a published package, so it has to be fetched as one.
  it("declares the server against the published package, not a path inside the checkout", () => {
    const server = readJson(".claude-plugin/plugin.json").mcpServers?.saglitzdesign;
    expect(server).toBeDefined();
    expect(server.command).toBe("npx");
    const all = [server.command, ...(server.args ?? [])].join(" ");
    // Read the package name rather than repeating it: this is the one string
    // that decides whether the plugin fetches this server or somebody else's.
    expect(all).toContain(pkg.name);
    // …and it must carry a registry spec, not the bare name. This plugin's root
    // *is* this package, `bin` and all, so when the working directory is the
    // plugin checkout `npx saglitzdesign-mcp` resolves the local bin — which
    // points into the gitignored `dist/` that a checkout does not have — and
    // exits `command not found` without ever reaching the registry. A version
    // spec forces the fetch. `@latest` keeps the auto-updating behaviour and is
    // the form verified to boot from inside the checkout and outside it alike.
    expect(all).toContain(`${pkg.name}@`);
    // `${CLAUDE_PLUGIN_ROOT}` resolves into the checkout, which is precisely
    // the thing that cannot supply a runnable server.
    expect(all).not.toContain("CLAUDE_PLUGIN_ROOT");
  });

  // `.mcp.json` is this repository's own project-scoped config and predates the
  // plugin by every commit. Claude Code reads a plugin's in-directory
  // `.mcp.json` as well, so one file would answer to both roles — and a
  // `${CLAUDE_PLUGIN_ROOT}` path written for the plugin is left unsubstituted in
  // project scope, which breaks the dev config rather than serving two masters.
  // Declaring the server in plugin.json keeps the two apart.
  //
  // It is also the confound to know about before measuring anything about MCP
  // command names in this working tree: this file registers a *bare*
  // `saglitzdesign` server, so `/mcp__saglitzdesign__<prompt>` resolves from it
  // whether or not a plugin is loaded, and a probe run from the repository root
  // will report that the plugin's `plugin_<plugin>_` prefix does not apply. It
  // did, and the report was wrong. Probe from a directory with no `.mcp.json`,
  // or pass `--strict-mcp-config`.
  it("leaves .mcp.json to the project, not to the plugin", () => {
    expect(JSON.stringify(readJson(".mcp.json"))).not.toContain("CLAUDE_PLUGIN_ROOT");
  });

  // Two fields decide whether the marketplace loads at all, and getting them
  // wrong fails quietly: an unknown key is ignored at load time, so a manifest
  // listing its plugins under the wrong name presents as an empty marketplace
  // rather than as an error. The file is also only discovered under
  // `.claude-plugin/`. This asserts the shape the loader requires — it is not a
  // stand-in for `claude plugin validate`, which is the authority on the schema.
  it("gives the marketplace the owner and plugins list the loader requires", () => {
    const market = readJson(".claude-plugin/marketplace.json");
    expect(market.owner).toBeTypeOf("object");
    expect(Array.isArray(market.plugins)).toBe(true);
    const entry = market.plugins.find((p: { name: string }) => p.name === "saglitzdesign");
    expect(entry).toBeDefined();
    expect(entry.version).toBe(pkg.version);
    // The plugin is this same repository, so the entry points at its own root.
    expect(entry.source).toBe("./");
  });
});

// ---------------------------------------------------------------------------
// The eight slash commands
//
// The workflows are MCP prompts, and an MCP prompt served over stdio is
// registered as `mcp__<server>__<prompt>` — with a `plugin_<plugin>_` prefix on
// the server name once the server arrives through a plugin. The short
// `server:prompt` alias goes to first-party Anthropic connectors only. The gate
// is a conjunction, read out of the binary at v2.1.250 and re-read unchanged at
// v2.1.251: `d = (type==="http"||type==="sse") && rA(url)` and `aliases: d ?
// [...] : undefined`, where `rA` wants `https:`, a host of exactly
// `api.anthropic.com`, and a pathname starting `/v1/design/`. Being remote is
// necessary and nowhere near sufficient, so no server a user installs gets one —
// stdio or remote. (This comment said the alias "exists only for remote http/sse
// servers" until the whole-branch review. `46dfe79` struck that clause from the
// README as a class claim inferred from its true negative half, touched this
// file in the same commit, and left the identical sentence standing here.)
// `commands/*.md` give each workflow a name a user can actually type: a plugin's
// file commands are namespaced `/<plugin>:<command>`, verified against v2.1.250
// by installing a scratch command and running it (`/saglitzdesign:zzprobe` ran;
// `/zzprobe` answered "Unknown command").
//
// `design_review` (this command) and `design-review` (the skill) are different
// names and do not collide; the documented precedence rule is about a skill and
// a command sharing one name. Their descriptions still have to say which is
// which, because a user reading the menu will not weigh the hyphen.
describe("the workflow slash commands", () => {
  const commandsDir = join(root, "commands");
  // Read lazily and tolerate the directory being absent: a missing `commands/`
  // is exactly what the set-equality test exists to report, and a scandir throw
  // during collection would take the whole file's tests down with it instead.
  //
  // The walk is the load-bearing part. Claude Code registers a command in a
  // subdirectory under the directory name — `commands/sub/rogue.md` is
  // `/saglitzdesign:sub:rogue`, measured — so a non-recursive listing leaves a
  // live slash command in this plugin's namespace that nothing in the repository
  // can see. `recursive: true` returns nested paths (`sub/rogue.md`), which will
  // not match any `<workflow>.md`, so the set-equality test below reports it.
  const listCommands = (): string[] =>
    existsSync(commandsDir)
      ? readdirSync(commandsDir, { recursive: true })
          .map(String)
          .map((f) => f.split(sep).join("/"))
          .filter((f) => f.endsWith(".md"))
          .sort()
      : [];

  /** The `description:` from a command file's frontmatter, or null. */
  const frontmatterDescription = (file: string): string | null => {
    const text = readFileSync(join(commandsDir, file), "utf8");
    const block = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!block) return null;
    const line = block[1].split("\n").find((l) => l.startsWith("description:"));
    if (!line) return null;
    const value = line.slice("description:".length).trim();
    return value.startsWith('"') ? JSON.parse(value) : value;
  };

  it("ships exactly one command per registered workflow, and no others", () => {
    const expected = PROMPT_METADATA.map((p: PromptMeta) => `${p.name}.md`).sort();
    // Set equality in both directions: a workflow with no command is a workflow
    // nobody can type, and a command with no workflow is a slash command that
    // renders a prompt the server no longer serves.
    expect(listCommands()).toEqual(expected);
  });

  it("carries each workflow's registered description verbatim", () => {
    for (const p of PROMPT_METADATA as PromptMeta[]) {
      // Read from the live export, never from a second copy of the text: the
      // menu entry and the MCP client's listing describe one workflow, and two
      // hand-maintained descriptions of one thing are a drift surface.
      expect(frontmatterDescription(`${p.name}.md`), p.name).toBe(p.description);
    }
  });

  it("is byte-identical to what the generator produces now", () => {
    // Without this the generator is a one-time convenience: a hand-edit to a
    // generated file would be invisible, and so would a prompt body that
    // changed after the commands were last written.
    for (const { file, content } of renderAllCommands()) {
      expect(readFileSync(join(commandsDir, file), "utf8"), file).toBe(content);
    }
  });

  /**
   * The markdown a reader — human or agent — receives through one of the three
   * install channels or a clone of this repository: seven directories walked
   * whole, plus the four root documents. Walked rather than listed. Listing is
   * what let the first version of this guard cover `skills/<dir>/SKILL.md` and
   * miss `skills/README.md`, the file that ships to the skills.sh registry: the
   * defect this whole task exists to close could be reintroduced there, and in
   * `CHANGELOG.md`, with every test green (measured, both files).
   *
   * Why each directory is here — one criterion each, and none of them "it is
   * markdown": `knowledge/` is served to the model by the tools; `recipes/` is
   * read into `Recipe.spec` by `src/recipes.ts` and handed back by
   * `get_component_recipe`, and `files:` names it, so it reaches a reader by
   * both routes; `commands/` is the generated menu text itself; `skills/` is
   * read aloud by an agent; `docs/`, `scripts/` and `.claude/` are tracked and
   * so travel in the plugin checkout, and `scripts/regenerate-examples.md` is
   * additionally named in `files:`. Nothing here enumerates a file inside those
   * directories.
   *
   * This is NOT every markdown file in the repository, and the sentence at the
   * top of this block claimed it was until the whole-branch review — a class
   * claim inferred from the four directories that had been read, while
   * `recipes/` satisfied both of the criteria that sentence gave and was
   * excluded anyway. What stays outside is one directory and only one, measured
   * rather than assumed (`find . -name '*.md'` less `node_modules`, `.git` and
   * `dist`): `.superpowers/`, the gitignored review scaffolding, which reaches
   * no reader through any channel. (No file count here: this comment is written
   * from inside that directory's own review, so any number it stated would be
   * wrong by one before the commit landed.) `tests/` and `src/` are outside
   * because they hold no markdown at all, not because a rule excludes them. If
   * a directory of prose ever does reach a reader, it belongs in the list
   * below, and this paragraph is the standard it has to meet.
   *
   * That `docs/` clause said "ships in the npm tarball" until 0.26.0 and was
   * false: `files:` does not list `docs`, and `npm pack --dry-run` reports zero
   * entries under it. The reason to walk it stands either way — 19 of its files
   * are tracked, and a plugin installed from git carries every tracked file —
   * but the reason given was not the true one.
   */
  const documentedMarkdown = (): string[] => {
    const walk = (rel: string) =>
      readdirSync(join(root, rel), { recursive: true })
        .map(String)
        .map((p) => p.split(sep).join("/"))
        .filter((p) => p.endsWith(".md"))
        .map((p) => `${rel}/${p}`);
    return [
      "README.md", "CHANGELOG.md", "NOTICE.md", "RELEASING.md",
      ...walk("skills"), ...walk("commands"), ...walk("docs"), ...walk("knowledge"),
      ...walk("recipes"), ...walk("scripts"), ...walk(".claude"),
    ];
  };

  it("gives every documented workflow a name a user can actually type", () => {
    // The six sentences this guards once wrote each workflow as a bare
    // `/design_review`, which is not a name Claude Code registers for a stdio
    // MCP server. The rule, not the list: any `/`-prefixed token in the docs
    // whose final segment is a registered workflow name must be written as the
    // plugin-namespaced command — `/saglitzdesign:design_review` — and that
    // command file must exist.
    const plugin = readJson(".claude-plugin/plugin.json").name;
    const workflows = new Set(PROMPT_METADATA.map((p: PromptMeta) => p.name));
    const files = documentedMarkdown();
    // Non-vacuity, and the reason the walk can be trusted: a renamed directory
    // or a `recursive` option that stopped working would return nothing and
    // leave this test green with every sentence unread. The files that must be
    // covered are named as a subset, so anything else the walk finds is covered
    // too — which is the point of walking instead of listing.
    for (const required of [
      "README.md", "skills/README.md", "skills/design-review/SKILL.md", "commands/design_review.md",
      // Named because they are the two the old sentence claimed and the old
      // walk missed: if either directory drops out of the walk again, this goes
      // red instead of going quiet.
      "recipes/button/spec.md", "scripts/regenerate-examples.md",
    ]) {
      expect(files, "the walk stopped seeing a file it must cover").toContain(required);
    }
    const offenders: string[] = [];
    for (const rel of files) {
      const text = readFileSync(join(root, rel), "utf8");
      // The slash has to open the token, or every URL and every relative path
      // becomes a hit: `https://saglitz.com/services/redesign` and
      // `node scripts/redesign` both end in a workflow name, and both are
      // legitimate prose. Both of those have a *letter* before the slash, so
      // `[A-Za-z0-9]` alone kills them; `.` is here for `./redesign`. Measured
      // across all 146 files of the surface above: this class reports zero
      // offenders and the unguarded regex reports two — the citation in
      // `knowledge/geo/geo-tactics-checklist.md` and, since 0.26.0, the
      // CHANGELOG's own `./redesign` describing this very exclusion. (The
      // comment said "one" until the whole-branch review; the second arrived
      // when Task 8 wrote about the guard inside the surface the guard walks.)
      //
      // The class is deliberately no wider than that. An earlier version also
      // excluded `_`, `:` and `-`, which bought nothing measurable (zero
      // offenders either way) and silently swallowed `Type:/design_review` and
      // `workflow-/design_review`. Both now fail. `/` stays in the class, and
      // that one is not decoration: without it `https://redesign.com/pricing`
      // matches on the second slash of the protocol and reports `/redesign` —
      // measured, and the kind of citation `knowledge/` accumulates. Nobody
      // writes a slash command directly after a slash, so `/` costs no reach.
      // `.../design_review` is the one shape that still slips through, and it
      // is the honest price of allowing `./x`.
      for (const m of text.matchAll(/(?<![A-Za-z0-9./])\/([A-Za-z0-9_:-]+)/g)) {
        // `_/design_review_` is ordinary markdown italics, and its closing `_`
        // is a legal character inside a workflow name, so the match swallows it
        // and the lookup for `design_review_` misses. No registered workflow
        // ends in `_`, so trailing ones are always emphasis, never name. This
        // is the shape the guard exists for — the six original sentences,
        // written in italics instead of ticks — and no lookbehind reaches it,
        // because the defect is on the closing end of the token. (`*italics*`
        // need no handling: `*` is not in the token class.)
        const token = m[1].replace(/_+$/, "");
        const bare = token.slice(token.lastIndexOf(":") + 1);
        if (!workflows.has(bare)) continue;
        if (token !== `${plugin}:${bare}`) offenders.push(`${rel}: /${token}`);
        else if (!listCommands().includes(`${bare}.md`)) offenders.push(`${rel}: /${token} has no command file`);
      }
    }
    expect(offenders, "workflow references that name a command Claude Code does not register").toEqual([]);
  });
});
