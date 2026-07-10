import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// Production-ready component recipes: real, accessible reference code per stack,
// grounded in the SaglitzDesign specs. Served by the get_component_recipe tool.

export interface RecipeStack {
  stack: string; // e.g. "react-tailwind"
  lang: string; // fenced-code language
  code: string;
}

export interface Recipe {
  component: string;
  description: string;
  spec: string; // the design spec (states, a11y, rules)
  stacks: RecipeStack[];
}

const EXT_TO_STACK: Record<string, { stack: string; lang: string }> = {
  ".tsx": { stack: "react-tailwind", lang: "tsx" },
  ".html": { stack: "html-css", lang: "html" },
  ".swift": { stack: "swiftui", lang: "swift" },
  ".kt": { stack: "compose", lang: "kotlin" },
};

function parseSpec(raw: string): { description: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { description: "", body: raw.trim() };
  let description = "";
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^description:\s*(.*)$/);
    if (kv) description = kv[1].trim().replace(/^["']|["']$/g, "");
  }
  return { description, body: raw.slice(m[0].length).trim() };
}

export function loadRecipes(recipesDir: string): Recipe[] {
  if (!existsSync(recipesDir)) return [];
  const recipes: Recipe[] = [];
  for (const entry of readdirSync(recipesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(recipesDir, entry.name);
    let spec = "";
    let description = "";
    const specPath = join(dir, "spec.md");
    if (existsSync(specPath)) {
      const parsed = parseSpec(readFileSync(specPath, "utf8"));
      spec = parsed.body;
      description = parsed.description;
    }
    const stacks: RecipeStack[] = [];
    for (const f of readdirSync(dir)) {
      const meta = EXT_TO_STACK[extname(f)];
      if (!meta) continue;
      try {
        stacks.push({ stack: meta.stack, lang: meta.lang, code: readFileSync(join(dir, f), "utf8").trimEnd() });
      } catch {
        /* skip */
      }
    }
    if (stacks.length === 0 && !spec) continue;
    recipes.push({ component: entry.name, description, spec, stacks: stacks.sort((a, b) => a.stack.localeCompare(b.stack)) });
  }
  return recipes.sort((a, b) => a.component.localeCompare(b.component));
}

export function recipeText(r: Recipe, stack?: string): string {
  const chosen = stack ? r.stacks.filter((s) => s.stack === stack) : r.stacks;
  const out: string[] = [`# ${r.component} — component recipe`];
  if (r.description) out.push(`\n_${r.description}_`);
  if (r.spec) out.push(`\n## Spec & rules\n${r.spec}`);
  if (chosen.length === 0) {
    out.push(`\n_No code for stack "${stack}". Available: ${r.stacks.map((s) => s.stack).join(", ") || "(none)"}._`);
  } else {
    for (const s of chosen) out.push(`\n## ${s.stack}\n\`\`\`${s.lang}\n${s.code}\n\`\`\``);
  }
  return out.join("\n");
}
