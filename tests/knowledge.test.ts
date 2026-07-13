import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadKnowledge, searchKnowledge, sections } from "../dist/knowledge.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docs = loadKnowledge(join(root, "knowledge"));

describe("loadKnowledge", () => {
  it("loads the full knowledge base", () => {
    expect(docs.length).toBeGreaterThanOrEqual(70);
  });
  it("every doc has id, title, category and body", () => {
    for (const d of docs) {
      expect(d.id, d.path).toBeTruthy();
      expect(d.title).toBeTruthy();
      expect(d.category).toBeTruthy();
      expect(d.body.length).toBeGreaterThan(0);
    }
  });
  it("ids are unique", () => {
    const ids = docs.map((d) => d.id);
    expect(new Set(ids).size, `duplicate ids: ${ids.filter((v, i) => ids.indexOf(v) !== i)}`).toBe(ids.length);
  });
  it("categories stay within the registered enum", () => {
    const allowed = new Set(["design-language", "component", "ux", "seo", "geo", "pattern", "craft", "book", "process", "marketing"]);
    for (const d of docs) expect(allowed.has(d.category), `${d.id}: ${d.category}`).toBe(true);
  });
});

describe("searchKnowledge", () => {
  it("ranks a title match highly", () => {
    const r = searchKnowledge(docs, "accessibility", { limit: 3 });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].doc.id).toContain("accessibility");
  });
  it("respects the category filter", () => {
    const r = searchKnowledge(docs, "button", { category: "component", limit: 5 });
    for (const hit of r) expect(hit.doc.category).toBe("component");
  });
  it("returns an empty array for an empty query", () => {
    expect(searchKnowledge(docs, "   ", { limit: 3 })).toHaveLength(0);
  });
  it("produces a non-empty excerpt", () => {
    const [top] = searchKnowledge(docs, "typography", { limit: 1 });
    expect(top.excerpt.length).toBeGreaterThan(0);
  });
});

describe("sections", () => {
  it("splits a doc on ## headings", () => {
    const doc = docs.find((d) => d.body.includes("\n## "));
    expect(doc).toBeTruthy();
    expect(sections(doc!).length).toBeGreaterThan(0);
  });
});
