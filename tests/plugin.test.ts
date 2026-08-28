import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPT_METADATA, type PromptMeta } from "../dist/prompts.js";
import { renderAllCommands } from "../scripts/generate-commands.mjs";

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
// `server:prompt` alias exists only for remote http/sse servers, so it does not
// exist for this one. `commands/*.md` give each workflow a name a user can
// actually type: a plugin's file commands are namespaced `/<plugin>:<command>`,
// verified against v2.1.250 by installing a scratch command and running it
// (`/saglitzdesign:zzprobe` ran; `/zzprobe` answered "Unknown command").
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
   * Every markdown file this repository puts in front of a reader — human or
   * agent — found by walking rather than by listing. Listing is what let the
   * first version of this guard cover `skills/<dir>/SKILL.md` and miss
   * `skills/README.md`, the file that ships to the skills.sh registry: the
   * defect this whole task exists to close could be reintroduced there, and in
   * `CHANGELOG.md`, with every test green (measured, both files).
   *
   * The set is the four directories whose markdown reaches a user plus the two
   * root files: `knowledge/` is served to the model by the tools, `docs/` ships
   * in the npm tarball, `commands/` is the generated menu text itself, and
   * `skills/` is read aloud by an agent. Nothing here enumerates a file.
   */
  const documentedMarkdown = (): string[] => {
    const walk = (rel: string) =>
      readdirSync(join(root, rel), { recursive: true })
        .map(String)
        .map((p) => p.split(sep).join("/"))
        .filter((p) => p.endsWith(".md"))
        .map((p) => `${rel}/${p}`);
    return ["README.md", "CHANGELOG.md", ...walk("skills"), ...walk("commands"), ...walk("docs"), ...walk("knowledge")];
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
    for (const required of ["README.md", "skills/README.md", "skills/design-review/SKILL.md", "commands/design_review.md"]) {
      expect(files, "the walk stopped seeing a file it must cover").toContain(required);
    }
    const offenders: string[] = [];
    for (const rel of files) {
      const text = readFileSync(join(root, rel), "utf8");
      // The slash has to open the token, or every URL and every relative path
      // becomes a hit: `https://saglitz.com/services/redesign` and
      // `node scripts/redesign` both end in a workflow name, and both are
      // legitimate prose. The lookbehind requires the character before the
      // slash to be something no path or URL puts there — measured across all
      // 134 files of the surface above, where it is the difference between one
      // false positive (`knowledge/geo/geo-tactics-checklist.md`) and none.
      for (const m of text.matchAll(/(?<![A-Za-z0-9_./:-])\/([A-Za-z0-9_:-]+)/g)) {
        const token = m[1];
        const bare = token.slice(token.lastIndexOf(":") + 1);
        if (!workflows.has(bare)) continue;
        if (token !== `${plugin}:${bare}`) offenders.push(`${rel}: /${token}`);
        else if (!listCommands().includes(`${bare}.md`)) offenders.push(`${rel}: /${token} has no command file`);
      }
    }
    expect(offenders, "workflow references that name a command Claude Code does not register").toEqual([]);
  });
});
