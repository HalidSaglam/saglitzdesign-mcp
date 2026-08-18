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
