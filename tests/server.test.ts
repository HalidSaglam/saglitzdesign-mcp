import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { encodePng, canvasRows } from "./helpers/pngFixture.js";

// End-to-end smoke test over the real stdio server. Everything else in the
// suite tests pure functions; this is the layer that proves the 23 tools are
// actually registered, described, and callable — the wiring that unit tests
// cannot see.

const root = join(__dirname, "..");

// A PNG with pixels we chose, written where the server can read it.
const fixtureDir = mkdtempSync(join(tmpdir(), "saglitz-shot-"));
const fixturePath = join(fixtureDir, "fixture.png");
writeFileSync(fixturePath, encodePng({
  width: 60, height: 60, colorType: 2, bitDepth: 8,
  rows: canvasRows(60, 60, [255, 255, 255], [{ x: 10, y: 10, w: 40, h: 10, rgb: [17, 24, 39] }]),
}));

/**
 * One representative call per tool. Adding a tool without adding a case here
 * fails the "every tool has a smoke case" test — that is deliberate.
 */
const SMOKE: Record<string, Record<string, unknown>> = {
  list_design_knowledge: {},
  search_design_knowledge: { query: "primary button size mobile" },
  get_design_doc: { id: "buttons" },
  get_component_guidance: { component: "primary button", platform: "mobile" },
  get_design_language: { language: "material-3" },
  design_review_checklist: { project_type: "landing-page" },
  get_design_roadmap: { project_type: "ios-app" },
  seo_geo_guide: { scope: "geo" },
  get_design_examples: { query: "paywall", limit: 1 },
  knowledge_freshness: { only_stale: true },
  generate_design_tokens: { colors: { primary: "#4F46E5" }, format: "css" },
  audit_accessibility: { contrast_pairs: [{ foreground: "#6B7280", background: "#FFFFFF" }] },
  get_component_recipe: { component: "button", stack: "react-tailwind" },
  generate_color_system: { brand_color: "#4F46E5" },
  suggest_font_pairing: { intent: "modern SaaS dashboard", limit: 2 },
  fix_contrast: { foreground: "#9CA3AF", background: "#FFFFFF" },
  suggest_icon_library: { intent: "clean developer tool", limit: 2 },
  generate_type_scale: { base: 16, ratio: 1.25 },
  generate_elevation_system: { levels: 4 },
  generate_motion: { animation: "fade-in", stack: "css" },
  design_lint: { code: '<img src="/a.png" />' },
  audit_ux_copy: { text: "We are excited to announce our revolutionary new synergistic platform." },
  create_design_system: { brand_color: "#4F46E5", vibe: "modern SaaS dashboard", platform: "web" },
  audit_design_system: { code: ":root{--a:#fff}\n.a{color:#111;border-radius:4px}\n.b{color:#112;border-radius:5px}" },
  generate_layout_system: { preset: "marketing-site" },
  compare_design_languages: { topic: "navigation" },
  measure_screenshot: { path: fixturePath, format: "both" },
  import_design_tokens: { source: ":root{--color-primary:#4f46e5;--color-surface:#ffffff}", format: "css" },
  audit_project: { path: join(root, "recipes") },
  audit_security: { code: `<script src="https://cdn.example.com/a.js"></script>` },
  audit_generic_design: { code: `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"><h3>🚀 Fast</h3></div>` },
  audit_seo_geo: {
    code: `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main><h1>A</h1><h1>B</h1><img src="/a.png"></main></body></html>`,
    filename: "index.html",
  },
  audit_performance: {
    code: `<!doctype html><html lang="en"><head><script src="/js/tag.js"></script></head><body><main><img src="/hero.jpg" alt="Hero" loading="lazy" fetchpriority="high"></main></body></html>`,
    filename: "index.html",
  },
};

/** Every tool that declares an outputSchema. */
const STRUCTURED_TOOLS = ["audit_seo_geo", "audit_performance", "design_lint", "audit_security"];

/**
 * Does this tool take a `path`, and so can it be handed a bad one? Declaring
 * an outputSchema is what makes those tools answer that with an error result
 * rather than prose, and their descriptions have to say so; `design_lint`
 * takes only a snippet, has no path to get wrong, and must not be made to
 * claim otherwise.
 *
 * Read off the advertised input schema rather than listed by hand. A hand-kept
 * list is a silent opt-out: drop a name from it and the description assertion
 * simply stops running instead of failing, which is the failure mode this
 * whole suite exists to prevent. Deriving it also asserts the premise —
 * `design_lint` is exempt because its schema has no `path`, and if one is ever
 * added the assertion starts applying to it on its own.
 */
const takesPath = (tool: { inputSchema?: { properties?: Record<string, unknown> } }): boolean =>
  "path" in (tool.inputSchema?.properties ?? {});

let client: Client;
let transport: StdioClientTransport;
let toolNames: string[] = [];

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, "dist", "index.js")],
    stderr: "ignore",
  });
  client = new Client({ name: "saglitzdesign-tests", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  toolNames = (await client.listTools()).tools.map((t) => t.name);
}, 30_000);

afterAll(async () => {
  await client?.close();
});

function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  return (result.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

describe("server handshake", () => {
  it("registers every tool exactly once", () => {
    expect(toolNames.length).toBe(new Set(toolNames).size);
    expect(toolNames.length).toBeGreaterThanOrEqual(23);
  });

  it("registers the prompt workflows", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(7);
    for (const p of prompts) expect(p.description, p.name).toBeTruthy();
  });

  it("gives every tool a title, a description and read-only annotations", async () => {
    const { tools } = await client.listTools();
    for (const t of tools) {
      expect(t.description?.length ?? 0, t.name).toBeGreaterThan(40);
      expect(t.annotations?.title, t.name).toBeTruthy();
      expect(t.annotations?.readOnlyHint, t.name).toBe(true);
      expect(t.annotations?.openWorldHint, t.name).toBe(false);
      // Only the tools in STRUCTURED_TOOLS declare an outputSchema. For every
      // other tool the wrapper's conditional spread must keep the key absent —
      // not present-as-undefined — so this checks the real wire
      // representation, not the wrapper's arguments.
      expect("outputSchema" in t, t.name).toBe(STRUCTURED_TOOLS.includes(t.name));
    }
  });

  it("reports the package version", async () => {
    const pkg = JSON.parse(
      await import("node:fs").then((fs) => fs.readFileSync(join(root, "package.json"), "utf8")),
    );
    expect(client.getServerVersion()?.version).toBe(pkg.version);
  });
});

describe("every tool answers a representative call", () => {
  it("has a smoke case for every registered tool", () => {
    const missing = toolNames.filter((n) => !(n in SMOKE));
    expect(missing).toEqual([]);
  });

  for (const [name, args] of Object.entries(SMOKE)) {
    it(`${name} returns usable content`, async () => {
      if (!toolNames.includes(name)) return; // tool not in this build
      const result = (await client.callTool({ name, arguments: args })) as {
        isError?: boolean;
        content?: Array<{ type: string; text?: string }>;
      };
      expect(result.isError ?? false, name).toBe(false);
      expect((result.content ?? []).length, name).toBeGreaterThan(0);
      const body = textOf(result);
      // Guard against the silent-empty-answer failure mode: a tool that
      // "succeeds" while telling the caller it found nothing.
      expect(body.length, name).toBeGreaterThan(40);
      expect(body.toLowerCase(), name).not.toMatch(/^no (matches|guidance|document|recipe|visual examples)/);
    }, 20_000);
  }
});

describe("structured output (outputSchema)", () => {
  // Written when no registered tool declared an outputSchema and the wrapper's
  // positive path could only be exercised on a throwaway server. Two real
  // tools declare one now, and the describe below proves both directions
  // against the production server — but this keeps the wrapper's contract
  // isolated from the tools that happen to use it: `outputSchema` spread in
  // only when given, and the key genuinely absent otherwise. tools/list on
  // this mini server is just as much the real wire representation as the
  // production server's — it is what an MCP client actually sees, not the
  // wrapper's JS arguments.
  it("advertises an outputSchema only for the tool that declared one", async () => {
    const testServer = new McpServer({ name: "outputschema-probe", version: "0.0.0" });

    function registerLikeProduction(
      name: string,
      description: string,
      schema: Record<string, unknown>,
      cb: (args: any) => unknown,
      outputSchema?: Record<string, unknown>,
    ) {
      const title = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return (testServer.registerTool as (n: string, c: unknown, cb: unknown) => unknown)(
        name,
        {
          title,
          description,
          inputSchema: schema,
          ...(outputSchema ? { outputSchema } : {}),
          annotations: { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        cb,
      );
    }

    registerLikeProduction(
      "probe_with_schema",
      "Test-only tool that declares a structured outputSchema.",
      {},
      () => ({ content: [{ type: "text", text: "ok" }], structuredContent: { ok: true } }),
      { ok: z.boolean() },
    );
    registerLikeProduction(
      "probe_without_schema",
      "Test-only tool that declares no outputSchema, like the other 31.",
      {},
      () => ({ content: [{ type: "text", text: "ok" }] }),
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const probeClient = new Client({ name: "outputschema-probe-client", version: "1.0.0" }, { capabilities: {} });
    await Promise.all([testServer.connect(serverTransport), probeClient.connect(clientTransport)]);

    try {
      const { tools } = await probeClient.listTools();
      const withSchema = tools.find((t) => t.name === "probe_with_schema");
      const withoutSchema = tools.find((t) => t.name === "probe_without_schema");

      expect(withSchema?.outputSchema).toBeTruthy();
      expect(withSchema?.outputSchema).toMatchObject({
        type: "object",
        properties: { ok: { type: "boolean" } },
      });

      expect(withoutSchema).toBeTruthy();
      expect("outputSchema" in (withoutSchema as object)).toBe(false);
    } finally {
      await probeClient.close();
      await testServer.close();
    }
  });
});

// The two audit tools are the first structured output this server ships. The
// probe above proves the wrapper's shape on a throwaway server; this proves it
// on the real one — that the schema reaches `tools/list`, that the payload
// actually validates against the schema as declared, and that the summary
// agrees with the findings it summarises.
describe("the structured auditors return validated structured output", () => {
  /**
   * A minimal JSON Schema check, over the subset the declared schema uses:
   * object/array/string/number/integer/boolean, `required`, `enum`. Written by
   * hand rather than pulled in, because this repository ships no runtime
   * dependency it does not need — and validating against the *advertised*
   * schema is the point, so a hand-copied expectation would not do.
   */
  function schemaErrors(schema: any, value: unknown, path = "$"): string[] {
    if (!schema || typeof schema !== "object") return [];
    const errors: string[] = [];
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
    }
    switch (schema.type) {
      case "object": {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
          return [...errors, `${path}: expected object, got ${JSON.stringify(value)}`];
        }
        const obj = value as Record<string, unknown>;
        for (const key of schema.required ?? []) {
          if (!(key in obj)) errors.push(`${path}.${key}: required but missing`);
        }
        for (const [key, sub] of Object.entries(schema.properties ?? {})) {
          if (key in obj) errors.push(...schemaErrors(sub, obj[key], `${path}.${key}`));
        }
        break;
      }
      case "array": {
        if (!Array.isArray(value)) return [...errors, `${path}: expected array`];
        value.forEach((item, i) => errors.push(...schemaErrors(schema.items, item, `${path}[${i}]`)));
        break;
      }
      case "string":
        if (typeof value !== "string") errors.push(`${path}: expected string`);
        break;
      case "integer":
        if (!Number.isInteger(value)) errors.push(`${path}: expected integer`);
        break;
      case "number":
        if (typeof value !== "number") errors.push(`${path}: expected number`);
        break;
      case "boolean":
        if (typeof value !== "boolean") errors.push(`${path}: expected boolean`);
        break;
      default:
        break;
    }
    return errors;
  }

  it("validates the hand-written checker against a payload it must reject", () => {
    const schema = {
      type: "object",
      required: ["a"],
      properties: { a: { type: "array", items: { type: "string" } } },
    };
    expect(schemaErrors(schema, { a: ["ok"] })).toEqual([]);
    expect(schemaErrors(schema, { a: [1] }).length).toBeGreaterThan(0);
    expect(schemaErrors(schema, {}).length).toBeGreaterThan(0);
  });

  for (const name of STRUCTURED_TOOLS) {
    it(`${name} advertises an outputSchema describing findings, summary and notVisible`, async () => {
      const { tools } = await client.listTools();
      const schema = tools.find((t) => t.name === name)?.outputSchema as any;
      expect(schema, name).toBeTruthy();
      expect(schema.type).toBe("object");
      expect(Object.keys(schema.properties ?? {}).sort()).toEqual(["findings", "notVisible", "summary"]);
      expect((schema.required ?? []).sort()).toEqual(["findings", "notVisible", "summary"]);
      const finding = schema.properties.findings.items;
      expect((finding.required ?? []).sort()).toEqual(["doc", "fix", "message", "rule", "severity"]);
      expect(finding.properties.severity.enum.sort()).toEqual(["error", "info", "warning"]);
    });

    it(`${name} returns structuredContent that validates against that schema`, async () => {
      const { tools } = await client.listTools();
      const schema = tools.find((t) => t.name === name)?.outputSchema as any;
      // `client.callTool` validates structuredContent against the cached
      // schema itself and throws when it does not match, so reaching the
      // assertions below is already half the proof.
      const result = (await client.callTool({ name, arguments: SMOKE[name] })) as {
        isError?: boolean;
        structuredContent?: Record<string, unknown>;
        content?: Array<{ type: string; text?: string }>;
      };
      expect(result.isError ?? false, name).toBe(false);
      expect(result.structuredContent, name).toBeTruthy();
      expect(schemaErrors(schema, result.structuredContent), name).toEqual([]);
    }, 20_000);

    it(`${name} returns a summary that agrees with its own findings`, async () => {
      const result = (await client.callTool({ name, arguments: SMOKE[name] })) as {
        structuredContent?: {
          findings: Array<{ severity: string }>;
          summary: { error: number; warning: number; info: number };
          notVisible: string[];
        };
      };
      const structured = result.structuredContent!;
      const count = (s: string) => structured.findings.filter((f) => f.severity === s).length;
      expect(structured.summary).toEqual({
        error: count("error"), warning: count("warning"), info: count("info"),
      });
      expect(structured.findings.length, `${name} should find something in its smoke case`).toBeGreaterThan(0);
    }, 20_000);

    it(`${name} carries a non-empty notVisible list, every entry of which is in the prose`, async () => {
      const result = (await client.callTool({ name, arguments: SMOKE[name] })) as {
        structuredContent?: { notVisible: string[] };
        content?: Array<{ type: string; text?: string }>;
      };
      const notVisible = result.structuredContent!.notVisible;
      expect(notVisible.length, name).toBeGreaterThan(4);
      const body = textOf(result);
      for (const entry of notVisible) expect(body, `${name}: ${entry}`).toContain(entry);
      // The claim every structured auditor makes from source, in whichever of
      // its own two forms applies: the page/source readers (seo/perf/lint) say
      // in their notVisible array that they measure nothing rendered;
      // audit_security says in its preamble (rendered into `body`, ahead of
      // its own array) that it reads local files only and makes no request to
      // the site it is auditing. Its disclosure list predates this suite and
      // is pinned byte-for-byte against what it rendered before returning
      // structured output, so it keeps its own wording here rather than
      // adopting the other tools' phrase to pass this assertion.
      if (name === "audit_security") {
        expect(body).toMatch(/makes no request to your site/i);
      } else {
        expect(notVisible.join(" ")).toMatch(/Nothing here is measured/i);
      }
    }, 20_000);

    it(`${name}'s description tells a client it reads source and does not measure`, async () => {
      const { tools } = await client.listTools();
      const tool = tools.find((t) => t.name === name)!;
      const description = tool.description ?? "";
      expect(description.length, name).toBeGreaterThan(40);
      expect(description, name).toMatch(/reads (?:your )?source/i);
      expect(description, name).toMatch(/does not measure|measures nothing|no measurement/i);
      // A path-taking auditor answers a bad path with an error result rather
      // than prose — a consequence of declaring an outputSchema — and a caller
      // should learn that from the description rather than from a surprise.
      // A snippet-only auditor has no path to get wrong and must not say it does.
      if (takesPath(tool)) {
        expect(description, name).toMatch(/error result, not as an empty audit/i);
      } else {
        expect(description, name).not.toMatch(/error result, not as an empty audit/i);
      }
    });
  }
});

// Declaring an outputSchema makes a "successful" text-only result a protocol
// violation: a caller expecting structuredContent gets none, and nothing
// tells it the audit never ran. audit_security answered these paths with
// ordinary prose before it gained an outputSchema; now it must answer them as
// errors instead, matching audit_seo_geo and audit_performance.
describe("audit_security answers a bad or missing path as an error, not an empty audit", () => {
  it("returns an error result, not an empty audit, for a path that is not a directory", async () => {
    const result = (await client.callTool({
      name: "audit_security",
      arguments: { path: join(root, "package.json") },
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns an error result for a path that does not exist", async () => {
    const result = (await client.callTool({
      name: "audit_security",
      arguments: { path: "/nonexistent-xyz" },
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns an error result when neither path nor code is given", async () => {
    const result = (await client.callTool({
      name: "audit_security",
      arguments: {},
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });
});

describe("resources", () => {
  it("exposes every knowledge doc as a readable resource", async () => {
    const { resources } = await client.listResources();
    expect(resources.length).toBeGreaterThanOrEqual(83);
    const buttons = resources.find((r) => r.uri.endsWith("/buttons"));
    expect(buttons).toBeTruthy();
    const read = await client.readResource({ uri: buttons!.uri });
    expect(String(read.contents[0]?.text ?? "").length).toBeGreaterThan(200);
  }, 20_000);
});

describe("completions", () => {
  it("autocompletes document ids, prefix matches first", async () => {
    const { completion } = await client.complete({
      ref: { type: "ref/resource", uri: "saglitzdesign://doc/{id}" },
      argument: { name: "id", value: "butt" },
    });
    expect(completion.values).toContain("buttons");
    expect(completion.values[0]).toBe("buttons");
  });

  it("autocompletes recipe component names", async () => {
    const { completion } = await client.complete({
      ref: { type: "ref/resource", uri: "saglitzdesign://recipe/{component}" },
      argument: { name: "component", value: "to" },
    });
    expect(completion.values).toContain("toast");
  });
});

describe("input validation", () => {
  it("rejects an invalid hex instead of emitting a broken palette", async () => {
    const result = (await client.callTool({
      name: "generate_color_system",
      arguments: { brand_color: "not-a-color" },
    })) as { content?: Array<{ type: string; text?: string }> };
    expect(textOf(result)).toMatch(/not a valid hex/i);
  });

  it("suggests near matches for an unknown doc id", async () => {
    const result = (await client.callTool({
      name: "get_design_doc",
      arguments: { id: "buttonz" },
    })) as { content?: Array<{ type: string; text?: string }> };
    expect(textOf(result)).toMatch(/no document with id/i);
  });

  it("resolves a bare pattern id through the alias fallback", async () => {
    const result = (await client.callTool({
      name: "get_design_doc",
      arguments: { id: "hero-sections" },
    })) as { content?: Array<{ type: string; text?: string }> };
    expect(textOf(result)).toMatch(/id: web-hero-sections/);
  });
});

describe("measure_screenshot", () => {
  it("returns a markdown measurement and an HTML document", async () => {
    const result = (await client.callTool({
      name: "measure_screenshot",
      arguments: { path: fixturePath, format: "both" },
    })) as { content?: Array<{ type: string; text?: string }> };
    const blocks = (result.content ?? []).map((c) => c.text ?? "");
    expect(blocks[0]).toContain("Screenshot measurement");
    expect(blocks[0]).toContain("#111827");
    expect(blocks.join("\n")).toContain("<!-- saglitzdesign:report:html -->");
    expect(blocks.join("\n")).toContain("<!doctype html>");
  }, 20_000);

  it("returns only markdown by default", async () => {
    const result = (await client.callTool({
      name: "measure_screenshot",
      arguments: { path: fixturePath },
    })) as { content?: Array<{ type: string; text?: string }> };
    expect(result.content).toHaveLength(1);
    expect(result.content![0].text).not.toContain("<!doctype html>");
  }, 20_000);

  it("explains a missing file by naming the resolved path", async () => {
    const result = (await client.callTool({
      name: "measure_screenshot",
      arguments: { path: "does-not-exist.png" },
    })) as { content?: Array<{ type: string; text?: string }> };
    expect(result.content![0].text).toMatch(/no file at/i);
    expect(result.content![0].text).toContain("does-not-exist.png");
  }, 20_000);

  it("tells the user to convert a JPEG rather than failing obscurely", async () => {
    const jpeg = join(fixtureDir, "fake.jpg");
    writeFileSync(jpeg, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]));
    const result = (await client.callTool({
      name: "measure_screenshot",
      arguments: { path: jpeg },
    })) as { content?: Array<{ type: string; text?: string }> };
    expect(result.content![0].text).toMatch(/PNG/);
  }, 20_000);
});
