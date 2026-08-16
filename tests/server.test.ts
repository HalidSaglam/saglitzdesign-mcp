import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { encodePng, canvasRows } from "./helpers/pngFixture.js";
import { connectLiveServer } from "./helpers/liveServer.js";

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
  // Directory only — this tool has no snippet mode, because half its rules and
  // the platform verdict all come from configuration files. The fixture is a
  // small iOS project carrying one finding from each half, so the `file` probe
  // below has a Swift finding to find and the summary probe has something to
  // count.
  audit_apple_ui: { path: join(root, "tests", "fixtures", "apple", "ios-findings") },
};

/** Every tool that declares an outputSchema. */
const STRUCTURED_TOOLS = [
  "audit_seo_geo", "audit_performance", "design_lint", "audit_security", "audit_generic_design", "audit_project",
  "audit_apple_ui",
];

/**
 * Properties a tool's outputSchema declares beyond the three every structured
 * auditor shares (`findings`, `notVisible`, `summary`). Two tools have them:
 * `audit_generic_design` also returns `score`, the same itemised number
 * `genericReport`'s markdown prints, and `scan`; `audit_project` returns a
 * wider `scan` of its own. `scan` is what tells a caller reading only
 * structuredContent that a directory audit was truncated — the markdown's cap
 * sentence otherwise has no structured counterpart. Read by the shared
 * schema-shape test below so that test can stay one assertion instead of
 * forking into a per-tool copy.
 */
const EXTRA_SCHEMA_PROPS: Record<string, string[]> = {
  audit_generic_design: ["score", "scan"],
  audit_project: ["scan"],
  audit_apple_ui: ["scan"],
};

/**
 * Same idea, but for `required`: `audit_generic_design`'s `scan` is present
 * only in directory mode (a snippet has no scan to report), so it is declared
 * `.optional()` and correctly absent from `required` even though it is a real
 * property. A test that reused EXTRA_SCHEMA_PROPS for both checks would demand
 * it be required and fail against the schema's own, deliberately looser,
 * contract. `audit_project` has no snippet mode — every call scans a directory
 * — so its `scan` is required, and that difference is the point of keeping the
 * two tables apart.
 */
const EXTRA_REQUIRED_PROPS: Record<string, string[]> = {
  audit_generic_design: ["score"],
  audit_project: ["scan"],
  // Required for the same reason audit_project's is: no snippet mode, so every
  // successful call scanned a directory and there is no shape in which the
  // block is legitimately absent.
  audit_apple_ui: ["scan"],
};

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
  // Spawned through the shared helper rather than inline, so `liveToolNames`
  // (used by integrity.test.ts to derive the tool set) and this file boot the
  // server exactly one way.
  ({ client, transport } = await connectLiveServer("saglitzdesign-tests"));
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

/**
 * Recover the exact `notVisible` bullets `renderNotVisibleSection` printed,
 * so a drift test can compare the rendered markdown against
 * `structuredContent.notVisible` as sets, in both directions.
 *
 * `renderNotVisibleSection` (src/lint.ts) prints:
 *   "## Not visible to this audit", "", preamble, "",
 *   ...notVisible.map(entry => `- ${entry}`), "", closing
 *
 * Naively grabbing every line starting with "- " is not enough:
 * `GENERIC_NOT_VISIBLE` (src/generic.ts) has entries that wrap over several
 * physical lines — the entry string itself contains its own `\n  `
 * continuations — so a single bullet can span multiple lines, only the first
 * of which starts with "- ". This walks the section line by line, starts a
 * new bullet on a line beginning "- ", and folds every following line back
 * onto it (rejoined with "\n", the same separator the entry already carries)
 * until either the next "- " line or the blank line that ends the list —
 * `renderNotVisibleSection` always pushes that blank line before `closing`,
 * which is what stops this from swallowing the closing sentence too.
 *
 * This assumes no entry's own text begins a line with "- " (which would be
 * read as a new bullet) and no preamble/closing line does either (which
 * would be read as bullet noise before the list starts) — checked by hand
 * against all six NOT_VISIBLE tables and their preambles/closings; none do.
 */
function notVisibleBulletsIn(markdown: string): string[] {
  const headingIdx = markdown.indexOf("## Not visible to this audit");
  if (headingIdx === -1) return [];
  const lines = markdown.slice(headingIdx).split("\n");
  const firstBullet = lines.findIndex((l) => l.startsWith("- "));
  if (firstBullet === -1) return [];
  const bullets: string[] = [];
  let current: string | null = null;
  for (let i = firstBullet; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") break; // the blank line renderNotVisibleSection puts before `closing`
    if (line.startsWith("- ")) {
      if (current !== null) bullets.push(current);
      current = line.slice(2);
    } else if (current !== null) {
      current += `\n${line}`;
    }
  }
  if (current !== null) bullets.push(current);
  return bullets;
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

  // The README's headline count was written by hand and pinned by nothing:
  // integrity.test.ts checks one tool's row and the document count, never the
  // count against the registrations. It went stale the moment a 34th tool was
  // registered, and would have gone stale again on the 35th. Read off the live
  // server rather than off the source, so it is the advertised number that is
  // checked.
  it("agrees with the tool count the README advertises", async () => {
    const readme = await import("node:fs").then((fs) => fs.readFileSync(join(root, "README.md"), "utf8"));
    const claimed = /·\s*(\d+)\s+tools\s*·/.exec(readme);
    expect(claimed, "README no longer states a tool count in the expected shape").toBeTruthy();
    expect(Number(claimed![1])).toBe(toolNames.length);
  });

  it("gives the newest tool a row in the README's tool table", async () => {
    const readme = await import("node:fs").then((fs) => fs.readFileSync(join(root, "README.md"), "utf8"));
    const missing = toolNames.filter((n) => !readme.includes(`\`${n}\``));
    expect(missing, "registered but absent from the README").toEqual([]);
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
      const expectedProps = ["findings", "notVisible", "summary", ...(EXTRA_SCHEMA_PROPS[name] ?? [])].sort();
      const expectedRequired = ["findings", "notVisible", "summary", ...(EXTRA_REQUIRED_PROPS[name] ?? [])].sort();
      expect(Object.keys(schema.properties ?? {}).sort()).toEqual(expectedProps);
      expect((schema.required ?? []).sort()).toEqual(expectedRequired);
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

    // A description that lists `file` among the fields it returns is making a
    // claim a caller will plan around. design_lint listed it and emits it on
    // nothing: it takes a snippet and neither a `filename` nor a `path`, so
    // no finding it can produce has a path to carry. The probe below hands
    // each tool the path input it declares — a snippet auditor called without
    // a filename legitimately has nothing to put in `file`, which is not the
    // same as never having anything.
    it(`${name} emits \`file\` if, and only if, its description says it does`, async () => {
      const { tools } = await client.listTools();
      const tool = tools.find((t) => t.name === name)!;
      const claimed = /findings \([^)]*\bfile\b[^)]*\)/.test(tool.description ?? "");
      const inputs = Object.keys((tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {});
      const args = inputs.includes("filename")
        ? { ...SMOKE[name], filename: "probe.html" }
        : SMOKE[name];
      const result = (await client.callTool({ name, arguments: args })) as {
        structuredContent?: { findings: Array<{ file?: string }> };
      };
      const emitted = result.structuredContent!.findings.some((f) => typeof f.file === "string");
      expect(emitted, `${name}: description ${claimed ? "claims" : "does not claim"} \`file\``).toBe(claimed);
    }, 20_000);

    it(`${name} carries a non-empty notVisible list that exactly matches the markdown's bullets`, async () => {
      const result = (await client.callTool({ name, arguments: SMOKE[name] })) as {
        structuredContent?: { notVisible: string[] };
        content?: Array<{ type: string; text?: string }>;
      };
      const notVisible = result.structuredContent!.notVisible;
      expect(notVisible.length, name).toBeGreaterThan(4);
      const body = textOf(result);
      // Set equality, both directions. `toContain` alone only proves
      // notVisible ⊆ markdown — it would stay green if the markdown printed
      // an extra bullet that bypassed the shared array entirely (e.g. one
      // appended straight to a report's template), which is exactly the
      // drift `assembleAuditReport`/`renderNotVisibleSection` exist to make
      // impossible. Comparing the sorted rendered bullets against the sorted
      // structured array catches drift in either direction.
      const rendered = notVisibleBulletsIn(body);
      expect([...rendered].sort(), name).toEqual([...notVisible].sort());
      // The claim every structured auditor makes from source, in whichever of
      // its own several forms applies. The page/source readers (seo/perf/lint,
      // and audit_project, whose list opens on the same sentence) say in their
      // notVisible array that they measure nothing rendered.
      // audit_security says it in its preamble instead, which renders inside
      // the "## Not visible to this audit" section but is not itself a member
      // of the notVisible array. Both disclosure lists predate this suite and
      // are pinned byte-for-byte against what they rendered before returning
      // structured output, so each keeps its own wording here rather than
      // adopting another tool's phrase to pass this assertion — but the check
      // still has to be scoped to that section specifically, not to the whole
      // body, or it would pass just as well if the sentence were moved
      // somewhere else in the report entirely (e.g. into the scan-summary
      // line), which is not the same claim landing in the same place.
      //
      // For audit_security that leaves the section check reading the
      // preamble, which is rendered prose — it says nothing at all about
      // `notVisible`, and a run that emptied every entry of meaning would
      // still satisfy it. (Set equality does not save it either: both sides
      // render from the same array, so it is trivially true.) So the array
      // is asserted on separately, against the claim security's list
      // actually carries. It is not "nothing is measured" — security reads
      // source like the rest, but the limit its list exists to disclose is
      // narrower and sharper: a *missing* header here is a statement about
      // how far this audit can see, not about the site. Both halves of that
      // disclosure — the unrecognised-shape half and the truncated-scan half
      // — are load-bearing, and each is what makes a "missing" finding
      // readable as a limit rather than a verdict.
      if (name === "audit_security") {
        const notVisibleSection = body.slice(body.indexOf("## Not visible to this audit"));
        expect(notVisibleSection).toMatch(/makes no request to your site/i);
        const joined = notVisible.join(" ");
        expect(joined).toMatch(/a "missing" finding above is about this audit's reach, not about your site/i);
        expect(joined).toMatch(/a truncated scan cannot prove absence/i);
      } else if (name === "audit_generic_design") {
        expect(notVisible.join(" ")).toMatch(/none of that is visible from source text/i);
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

// Same protocol violation, same fix, for the other auditor that gained an
// outputSchema in this pass: a bad or missing path used to come back as
// ordinary prose, which a caller expecting structuredContent has no way to
// tell apart from a real, empty audit.
describe("audit_generic_design answers a bad or missing path as an error, not an empty audit", () => {
  it("returns an error result, not an empty audit, for a path that is not a directory", async () => {
    const result = (await client.callTool({
      name: "audit_generic_design",
      arguments: { path: join(root, "package.json") },
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns an error result for a path that does not exist", async () => {
    const result = (await client.callTool({
      name: "audit_generic_design",
      arguments: { path: "/nonexistent-xyz" },
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns an error result when neither path nor code is given", async () => {
    const result = (await client.callTool({
      name: "audit_generic_design",
      arguments: {},
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  // The genuinely successful side of the same guard: a real audit still
  // carries structuredContent, so the isError fix above did not overreach
  // into the tool's normal, no-error path.
  it("still returns structuredContent for a real audit", async () => {
    const result = (await client.callTool({
      name: "audit_generic_design",
      arguments: SMOKE.audit_generic_design,
    })) as { isError?: boolean; structuredContent?: unknown };
    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent).toBeTruthy();
  });
});

// audit_project is the third tool to make this change, and the only one whose
// every call takes a path — it has no snippet mode to fall back to, so a bad
// path is the whole of its error surface. Before it declared an outputSchema
// both of these came back as ordinary prose with isError unset, which a caller
// expecting structuredContent cannot tell from a real audit of an empty
// directory.
describe("audit_project answers a bad path as an error, not an empty audit", () => {
  it("returns an error result, not an empty audit, for a path that is not a directory", async () => {
    const result = (await client.callTool({
      name: "audit_project",
      arguments: { path: join(root, "package.json") },
    })) as { isError?: boolean; structuredContent?: unknown; content?: Array<{ type: string; text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result)).toMatch(/is a file, not a directory/);
  });

  it("returns an error result for a path that does not exist", async () => {
    const result = (await client.callTool({
      name: "audit_project",
      arguments: { path: "/nonexistent-xyz" },
    })) as { isError?: boolean; structuredContent?: unknown; content?: Array<{ type: string; text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result)).toMatch(/There is no directory at/);
  });

  // The genuinely successful side of the same guard, including the branch that
  // finds nothing to audit: an empty directory is a real, successful audit and
  // must still carry structuredContent — with a scan saying it read nothing,
  // which is exactly what tells the caller apart from the error cases above.
  it("still returns structuredContent for a real audit", async () => {
    const result = (await client.callTool({
      name: "audit_project",
      arguments: SMOKE.audit_project,
    })) as { isError?: boolean; structuredContent?: { scan?: { filesRead?: number } } };
    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent).toBeTruthy();
    expect(result.structuredContent!.scan!.filesRead).toBeGreaterThan(0);
  }, 20_000);

  it("returns a successful, structured audit for a directory with no design source", async () => {
    const empty = mkdtempSync(join(tmpdir(), "saglitz-empty-project-"));
    const result = (await client.callTool({
      name: "audit_project",
      arguments: { path: empty },
    })) as {
      isError?: boolean;
      structuredContent?: { scan: { filesRead: number }; findings: unknown[]; notVisible: string[] };
    };
    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent!.scan.filesRead).toBe(0);
    expect(result.structuredContent!.findings).toEqual([]);
    expect(result.structuredContent!.notVisible.length).toBeGreaterThan(4);
    rmSync(empty, { recursive: true, force: true });
  }, 20_000);
});

// audit_apple_ui is directory-only and the first tool here with no snippet
// mode at all — `code` is declared solely so that passing it is answered with
// an explanation of why a snippet cannot work rather than with a bare schema
// rejection, which tells a caller nothing. All four shapes below must be error
// results with no structuredContent; the two successful cases after them prove
// the guard did not overreach into the normal path.
describe("audit_apple_ui is directory-only and says so", () => {
  it("returns an error result for a `code` argument, naming configuration as the reason", async () => {
    const result = (await client.callTool({
      name: "audit_apple_ui",
      arguments: { code: 'import SwiftUI\nNavigationView { Text("x") }\n' },
    })) as { isError?: boolean; structuredContent?: unknown; content?: Array<{ type: string; text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    const body = textOf(result);
    expect(body).toMatch(/no snippet mode/i);
    expect(body).toMatch(/configuration is the backbone/i);
    expect(body).toMatch(/information property list/i);
  });

  it("returns an error result for a path that does not exist", async () => {
    const result = (await client.callTool({
      name: "audit_apple_ui",
      arguments: { path: "/nonexistent-apple-xyz" },
    })) as { isError?: boolean; structuredContent?: unknown; content?: Array<{ type: string; text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result)).toMatch(/There is no directory at/);
  });

  it("returns an error result for a path that is a file, and says why one file cannot do", async () => {
    const result = (await client.callTool({
      name: "audit_apple_ui",
      arguments: { path: join(root, "package.json") },
    })) as { isError?: boolean; structuredContent?: unknown; content?: Array<{ type: string; text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    const body = textOf(result);
    expect(body).toMatch(/is a file, not a directory/);
    expect(body).toMatch(/no single-file mode/i);
  });

  it("returns an error result when nothing at all is passed", async () => {
    const result = (await client.callTool({
      name: "audit_apple_ui",
      arguments: {},
    })) as { isError?: boolean; structuredContent?: unknown; content?: Array<{ type: string; text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result)).toMatch(/Pass `path`/);
  });

  it("still returns structuredContent for a real audit", async () => {
    const result = (await client.callTool({
      name: "audit_apple_ui",
      arguments: SMOKE.audit_apple_ui,
    })) as {
      isError?: boolean;
      structuredContent?: { scan: { filesRead: number }; findings: Array<{ file?: string; line?: number }> };
    };
    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent).toBeTruthy();
    expect(result.structuredContent!.scan.filesRead).toBeGreaterThan(0);
    // Both halves reached the wire: a configuration finding with no file, and
    // a Swift finding carrying one.
    expect(result.structuredContent!.findings.some((f) => f.file === undefined)).toBe(true);
    expect(result.structuredContent!.findings.some((f) => typeof f.file === "string")).toBe(true);
  }, 20_000);

  // An empty directory is a real, successful audit and must still carry
  // structuredContent — with a scan saying it read nothing, which is exactly
  // what tells the caller apart from the four error cases above.
  it("returns a successful, structured audit for an empty directory", async () => {
    const empty = mkdtempSync(join(tmpdir(), "saglitz-empty-apple-"));
    const result = (await client.callTool({
      name: "audit_apple_ui",
      arguments: { path: empty },
    })) as {
      isError?: boolean;
      structuredContent?: { scan: { filesRead: number }; findings: unknown[]; notVisible: string[] };
    };
    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent!.scan.filesRead).toBe(0);
    expect(result.structuredContent!.findings).toEqual([]);
    expect(result.structuredContent!.notVisible.length).toBeGreaterThan(4);
    rmSync(empty, { recursive: true, force: true });
  }, 20_000);
});

// The cross-cutting gate: every task above added its own coverage as it wired
// up structured output for one more tool, but nothing yet asserts the six as
// a set — that this exact list, no more and no fewer, advertises a schema,
// and that the two invariants (structuredContent present, the two registers
// in agreement) hold across all of them read together rather than tool by
// tool. This is the C2-style check: two tool descriptions once advertised a
// capability that did not exist, and the fix was an assertion over the whole
// advertised set, not a per-tool spot check that a dropped tool could slip
// past silently. SMOKE already carries a minimal, real argument set for
// every registered tool, so it doubles as the sample-args table here rather
// than duplicating one.
describe("the structured auditors, asserted together", () => {
  it("advertises an outputSchema on exactly the findings-producing auditors", async () => {
    const { tools } = await client.listTools();
    const withSchema = tools.filter((t) => t.outputSchema).map((t) => t.name).sort();
    expect(withSchema).toEqual([...STRUCTURED_TOOLS].sort());
  });

  it("returns structuredContent from every tool that advertises a schema", async () => {
    for (const name of STRUCTURED_TOOLS) {
      const r = (await client.callTool({ name, arguments: SMOKE[name] })) as {
        structuredContent?: {
          notVisible: string[];
          summary: { error: number; warning: number; info: number };
          findings: unknown[];
        };
      };
      expect(r.structuredContent, name).toBeDefined();
      expect(r.structuredContent!.notVisible.length, name).toBeGreaterThan(0);
      const { error, warning, info } = r.structuredContent!.summary;
      expect(error + warning + info, name).toBe(r.structuredContent!.findings.length);
    }
  });

  it("the notVisible array and the markdown's bullets are the same set, for every tool", async () => {
    for (const name of STRUCTURED_TOOLS) {
      const r = (await client.callTool({ name, arguments: SMOKE[name] })) as {
        structuredContent?: { notVisible: string[] };
        content?: Array<{ type: string; text?: string }>;
      };
      const notVisible = r.structuredContent!.notVisible;
      // Both directions, per tool: every structured entry renders as a
      // bullet, and every rendered bullet is a structured entry. A one-way
      // `toContain` check would stay green if a report's markdown template
      // printed an extra "Not visible" bullet straight from a string
      // literal, bypassing `notVisible` entirely — which is the drift this
      // package's one-array-two-renderings rule exists to rule out.
      const rendered = notVisibleBulletsIn(textOf(r));
      expect([...rendered].sort(), name).toEqual([...notVisible].sort());
    }
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
