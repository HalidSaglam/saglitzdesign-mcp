import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = join(__dirname, "..", "..");

/**
 * Spawn the built server on stdio and connect a client to it. This is the only
 * place in the suite that does so — `server.test.ts` calls it from its
 * `beforeAll` rather than keeping its own copy, so "what does the live server
 * register?" has one implementation and cannot be answered two ways.
 *
 * The caller owns the returned client and must close it; `server.test.ts` holds
 * one open for its whole run, `liveToolNames` below opens and closes its own.
 *
 * `dist/` is what ships, so `dist/` is what this boots. `npm test` builds
 * first. If it has not, the connect throws and collection fails loudly — there
 * is deliberately no fallback to a hand-written list, because a hand-written
 * list is the defect this helper exists to remove.
 */
export async function connectLiveServer(
  clientName: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, "dist", "index.js")],
    stderr: "ignore",
  });
  const client = new Client({ name: clientName, version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  return { client, transport };
}

/**
 * The registered tool names, read off the running server.
 *
 * A test that wants to know which tools exist has three places it could look:
 * the server, `src/index.ts`, or a list written by hand. The third went stale
 * at 33 registrations while 34 shipped, so only the first is offered here.
 *
 * Memoised per module instance, which under Vitest's default isolation means
 * per test file: two files that both call this pay two spawns. That is the
 * cost of the guarantee, and one spawn is about a second.
 */
let cached: Promise<string[]> | undefined;

export function liveToolNames(): Promise<string[]> {
  cached ??= (async () => {
    const { client } = await connectLiveServer("saglitzdesign-live-tools");
    try {
      return (await client.listTools()).tools.map((t) => t.name);
    } finally {
      await client.close();
    }
  })();
  return cached;
}
