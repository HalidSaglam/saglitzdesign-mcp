import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * The registered tool names, read off the running server over stdio — the same
 * mechanism `server.test.ts` uses in its `beforeAll`, deliberately, so there is
 * one way to ask this question rather than two that can disagree.
 *
 * A test that wants to know which tools exist has three places it could look:
 * the server, `src/index.ts`, or a list written by hand. The third went stale
 * at 33 registrations while 34 shipped, so only the first is offered here.
 * `dist/` is what ships and what `server.test.ts` boots, so it is what this
 * boots too; `npm test` builds before running.
 *
 * Memoised: the process spawn costs about a second, and every caller in a run
 * wants the same answer.
 */
let cached: Promise<string[]> | undefined;

export function liveToolNames(): Promise<string[]> {
  cached ??= (async () => {
    const root = join(__dirname, "..", "..");
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(root, "dist", "index.js")],
      stderr: "ignore",
    });
    const client = new Client({ name: "saglitzdesign-live-tools", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    try {
      return (await client.listTools()).tools.map((t) => t.name);
    } finally {
      await client.close();
    }
  })();
  return cached;
}
