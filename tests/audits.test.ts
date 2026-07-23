import { describe, it, expect } from "vitest";
import { designLint } from "../dist/lint.js";
import { analyzeCopy } from "../dist/uxcopy.js";
import { createDesignSystem } from "../dist/designsystem.js";

describe("design_lint", () => {
  it("flags the classic anti-patterns", () => {
    const code = [
      '<img src="a.png">',
      '<button><svg /></button>',
      '.x { outline: none; font-size: 14px; }',
      '<div onClick={go}>hi</div>',
    ].join("\n");
    const rules = designLint(code).map((f) => f.rule);
    expect(rules).toContain("img-no-alt");
    expect(rules).toContain("icon-button-no-label");
    expect(rules).toContain("outline-none");
    expect(rules).toContain("px-font-size");
    expect(rules).toContain("clickable-div");
  });
  it("does not flag clean, tokenized code", () => {
    const code = [
      '<img src="a.png" alt="A cat">',
      '<button aria-label="Close"><svg /></button>',
      '.x { color: var(--color-primary); font-size: 1rem; }',
    ].join("\n");
    expect(designLint(code)).toHaveLength(0);
  });
  it("does not flag outline:none when paired with focus", () => {
    expect(designLint(".btn:focus { outline: none; box-shadow: 0 0 0 2px blue; }").filter((f) => f.rule === "outline-none")).toHaveLength(0);
  });
  it("reports 1-indexed line numbers", () => {
    const f = designLint('\n\n<img src="x">');
    expect(f[0].line).toBe(3);
  });
});

describe("audit_ux_copy", () => {
  it("scores easy copy high and hard copy low", () => {
    const easy = analyzeCopy("You can turn this on any time. It takes one tap.");
    const hard = analyzeCopy("Leverage our seamless synergy to utilize best-in-class robust functionality.");
    expect(easy.fleschReadingEase).toBeGreaterThan(hard.fleschReadingEase);
    expect(hard.jargonHits.length).toBeGreaterThan(2);
  });
  it("flags filler and weak CTAs", () => {
    expect(analyzeCopy("Just simply click here").fillerHits).toContain("just");
    expect(analyzeCopy("Submit").weakCta).toBe("submit");
    expect(analyzeCopy("Start free trial").weakCta).toBeUndefined();
  });
  it("detects user- vs company-focus", () => {
    const c = analyzeCopy("We built our platform so we can grow our business.");
    expect(c.weCount).toBeGreaterThan(c.youCount);
  });
  it("detects passive voice", () => {
    expect(analyzeCopy("The file was uploaded by the system.").passiveHits.length).toBeGreaterThan(0);
  });
});

describe("create_design_system", () => {
  it("assembles a coherent foundation with all layers", () => {
    const ds = createDesignSystem("#4F46E5", "modern saas dashboard", "web", "Acme");
    for (const marker of ["Acme — design system starter", "## 2. Color", "## 3. Typography", "## 4. Icons", "## 5. Elevation", "## 6. Tokens", "## 7. Components", "## 8. Build checklist"]) {
      expect(ds, marker).toContain(marker);
    }
    expect(ds).toMatch(/@theme|--color-/); // web → tailwind/css tokens
  });
  it("switches token output by platform", () => {
    expect(createDesignSystem("#e11d48", "premium fintech app", "ios")).toContain("Tokens.swift");
    expect(createDesignSystem("#059669", "material android app", "android")).toContain("Tokens.kt");
  });
});
