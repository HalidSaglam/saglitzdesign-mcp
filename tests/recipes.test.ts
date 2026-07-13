import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadRecipes, recipeText } from "../dist/recipes.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const recipes = loadRecipes(join(root, "recipes"));

describe("loadRecipes", () => {
  it("loads the component recipes", () => {
    expect(recipes.length).toBeGreaterThanOrEqual(9);
  });
  it("each recipe has a spec and at least one stack", () => {
    for (const r of recipes) {
      expect(r.spec.length, r.component).toBeGreaterThan(0);
      expect(r.stacks.length, r.component).toBeGreaterThan(0);
    }
  });
  it("stacks come from the known set", () => {
    const allowed = new Set(["react-tailwind", "html-css", "swiftui", "compose"]);
    for (const r of recipes) {
      for (const s of r.stacks) expect(allowed.has(s.stack), `${r.component}: ${s.stack}`).toBe(true);
    }
  });
  it("includes the core components", () => {
    const names = new Set(recipes.map((r) => r.component));
    for (const c of ["button", "input", "modal", "toast", "card"]) expect(names.has(c), c).toBe(true);
  });
});

describe("recipeText", () => {
  it("renders spec + a specific stack as fenced code", () => {
    const button = recipes.find((r) => r.component === "button")!;
    const out = recipeText(button, "react-tailwind");
    expect(out).toContain("## react-tailwind");
    expect(out).toContain("```tsx");
  });
  it("notes when a stack is unavailable", () => {
    const r = recipes[0];
    const out = recipeText(r, "nonexistent-stack");
    expect(out).toContain("No code for stack");
  });
});
