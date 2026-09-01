import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { PROMPT_NAMES, buildPromptText } from "../dist/prompts.js";
import { loadKnowledge, findDoc } from "../dist/knowledge.js";

// Prompts are prose that names tools and document ids. Nothing else in the
// codebase validates that prose, so a renamed tool or a mistyped doc id would
// ship as an instruction the agent cannot follow. These tests close that gap.

const docs = loadKnowledge(join(__dirname, "..", "knowledge"));

/** Every tool the server registers, mirrored from the smoke map in server.test.ts. */
const TOOL_NAMES = [
  "list_design_knowledge", "search_design_knowledge", "get_design_doc", "get_component_guidance",
  "get_design_language", "design_review_checklist", "get_design_roadmap", "seo_geo_guide",
  "get_design_examples", "knowledge_freshness", "generate_design_tokens", "audit_accessibility",
  "get_component_recipe", "generate_color_system", "suggest_font_pairing", "fix_contrast",
  "suggest_icon_library", "generate_type_scale", "generate_elevation_system", "generate_motion",
  "design_lint", "audit_ux_copy", "create_design_system", "audit_design_system",
  "generate_layout_system", "compare_design_languages", "measure_screenshot", "import_design_tokens", "audit_project",
  "audit_apple_ui", "audit_android_ui", "audit_generic_design", "audit_ethical_design",
];

const allText = PROMPT_NAMES.map((n: string) => buildPromptText(n, "a test brief")).join("\n\n");

/** Tool-call-shaped mentions: `name(` — the form the agent will actually invoke. */
function toolMentions(text: string): string[] {
  return [...new Set([...text.matchAll(/\b([a-z][a-z0-9_]{4,})\s*\(/g)].map((m) => m[1]))];
}

describe("prompt workflows", () => {
  it("registers the advertised workflows", () => {
    expect(PROMPT_NAMES).toContain("build_landing_page");
    expect(PROMPT_NAMES).toContain("build_dashboard");
    expect(PROMPT_NAMES).toContain("design_review");
    expect(PROMPT_NAMES).toContain("port_to_platform");
    expect(PROMPT_NAMES.length).toBeGreaterThanOrEqual(7);
    expect(new Set(PROMPT_NAMES).size).toBe(PROMPT_NAMES.length);
  });

  it("renders every workflow with and without a brief", () => {
    for (const name of PROMPT_NAMES) {
      expect(buildPromptText(name).length, name).toBeGreaterThan(800);
      expect(buildPromptText(name, "a SaaS invoicing tool"), name).toContain("a SaaS invoicing tool");
    }
  });

  it("never names a tool that does not exist", () => {
    const known = new Set(TOOL_NAMES);
    const phantom: string[] = [];
    for (const name of PROMPT_NAMES) {
      for (const mention of toolMentions(buildPromptText(name))) {
        // Only judge things that look like our tools; prose contains other words.
        if (/^(get|search|list|design|audit|generate|create|suggest|fix|compare|seo)_/.test(mention) && !known.has(mention)) {
          phantom.push(`${name} → ${mention}()`);
        }
      }
    }
    expect(phantom).toEqual([]);
  });

  it("never cites a knowledge document that does not exist", () => {
    const broken: string[] = [];
    for (const name of PROMPT_NAMES) {
      const text = buildPromptText(name);
      for (const m of text.matchAll(/get_design_doc\("([a-z0-9-]+)"\)/g)) {
        if (!findDoc(docs, m[1])) broken.push(`${name} → get_design_doc("${m[1]}")`);
      }
      for (const m of text.matchAll(/get_design_language\("([a-z0-9-]+)"\)/g)) {
        if (!findDoc(docs, m[1])) broken.push(`${name} → get_design_language("${m[1]}")`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("cites canonical doc ids, not aliases", () => {
    const aliased: string[] = [];
    for (const name of PROMPT_NAMES) {
      for (const m of buildPromptText(name).matchAll(/get_design_doc\("([a-z0-9-]+)"\)/g)) {
        const resolved = findDoc(docs, m[1]);
        if (resolved && resolved.id !== m[1]) aliased.push(`${name} → "${m[1]}" (real: ${resolved.id})`);
      }
    }
    expect(aliased).toEqual([]);
  });

  it("puts the whole server to work, not just the knowledge half", () => {
    const unused = TOOL_NAMES.filter((t) => !allText.includes(t));
    // knowledge_freshness is a maintenance tool; list_design_knowledge is for
    // browsing. Everything else should appear in at least one workflow.
    expect(unused.sort()).toEqual(["knowledge_freshness", "list_design_knowledge"]);
  });

  it("gates every build workflow on the deterministic auditors", () => {
    for (const name of ["build_landing_page", "build_website", "build_mobile_app_ui", "build_dashboard", "redesign", "port_to_platform"]) {
      const text = buildPromptText(name);
      expect(text, `${name}: verify gate`).toContain("Verify gate");
      for (const tool of ["design_lint", "audit_accessibility", "audit_design_system", "audit_ux_copy", "audit_generic_design"]) {
        expect(text, `${name}: ${tool}`).toContain(tool);
      }
      // QUALITY_BAR already names the tool; the gate must call it as a numbered step.
      expect(text, `${name}: ethical in verify gate`).toContain("**audit_ethical_design(code)**");
    }
  });

  it("tells build workflows to generate the foundation instead of inventing values", () => {
    for (const name of ["build_landing_page", "build_website", "build_mobile_app_ui", "build_dashboard"]) {
      const text = buildPromptText(name);
      expect(text, name).toContain("create_design_system");
      expect(text, name).toContain("get_component_recipe");
      expect(text, `${name}: foundation`).toMatch(/Foundation before pixels/);
    }
  });

  it("drives the porting workflow from the platform comparison", () => {
    const text = buildPromptText("port_to_platform");
    expect(text).toContain("compare_design_languages");
    expect(text).toMatch(/do NOT port/i);
  });

  it("builds a dashboard as a dense product surface, not a marketing page", () => {
    const text = buildPromptText("build_dashboard");
    expect(text).toContain('get_design_roadmap("saas-web-app")');
    expect(text).toContain("web-app");
    expect(text).toContain("web-dashboards");
    expect(text).toContain("get_component_recipe");
    expect(text).toMatch(/table/);
    expect(text).toMatch(/empty-state/);
    expect(text).toMatch(/Density over chrome|no hero gradient/i);
    expect(text).toContain('design_review_checklist("dashboard")');
  });
});

describe("workflows measure before they judge", () => {
  it("critique_screenshot measures the image first", () => {
    const text = buildPromptText("critique_screenshot");
    expect(text).toContain("measure_screenshot");
    expect(text).toMatch(/measure.*before|first/i);
  });

  it("design_review offers measurement for screenshots", () => {
    expect(buildPromptText("design_review")).toContain("measure_screenshot");
  });
});

describe("existing design systems are respected, not replaced", () => {
  it("build workflows import an existing theme before generating a new one", () => {
    for (const name of ["build_landing_page", "build_website", "build_mobile_app_ui", "build_dashboard"]) {
      const text = buildPromptText(name);
      expect(text, name).toContain("import_design_tokens");
      expect(text, `${name}: must not introduce a second system`).toMatch(/do NOT introduce a second one/);
    }
  });

  it("porting re-emits the existing tokens for the target platform", () => {
    expect(buildPromptText("port_to_platform")).toContain("import_design_tokens");
  });
});
