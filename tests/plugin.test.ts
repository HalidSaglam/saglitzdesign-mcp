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
