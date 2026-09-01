import { describe, it, expect } from "vitest";
import { designLint } from "../dist/lint.js";
import { analyzeCopy } from "../dist/uxcopy.js";
import { createDesignSystem } from "../dist/designsystem.js";
import { RECIPE_TOKEN_ROLES } from "../dist/recipes.js";

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
    for (const marker of ["Acme — design system starter", "## 2. Color", "## 3. Typography", "## 4. Icons", "## 5. Elevation", "## 6. Layout", "## 7. Tokens", "## 8. Components", "## 9. Build checklist"]) {
      expect(ds, marker).toContain(marker);
    }
    expect(ds).toMatch(/@theme|--color-/); // web → tailwind/css tokens
  });

  it("includes a layout layer suited to the platform", () => {
    const web = createDesignSystem("#4F46E5", "modern saas dashboard", "web");
    expect(web).toMatch(/12 columns/);
    expect(web).toMatch(/65ch/);
    expect(web).toContain("generate_layout_system");

    const ios = createDesignSystem("#4F46E5", "premium fintech app", "ios");
    expect(ios).toMatch(/44×44pt/);
    expect(ios).toMatch(/Dynamic Type/);
    expect(ios).not.toMatch(/12 columns/); // a column grid is not how iOS lays out

    const android = createDesignSystem("#4F46E5", "material android app", "android");
    expect(android).toMatch(/48×48dp/);
  });

  it("closes the loop by pointing at its own auditors", () => {
    const ds = createDesignSystem("#4F46E5", "modern saas dashboard", "web");
    expect(ds).toContain("audit_design_system");
    expect(ds).toContain("design_lint");
    expect(ds).toContain("audit_generic_design");
  });

  it("opens with a direction card the agent can leave, not a dump of layers", () => {
    const ds = createDesignSystem("#4F46E5", "modern saas dashboard", "web", "Acme");
    expect(ds).toMatch(/^# Acme — design system starter[\s\S]*## Direction[\s\S]*## 1\. Foundations/m);
    expect(ds).toContain("Inter as the only family");
    expect(ds).toContain("rounded-2xl");
    expect(ds).toContain("eyebrow");
    expect(ds).toContain("ai-default-aesthetic");
    expect(ds).toMatch(/\*\*Type:\*\*/);
    expect(ds).toMatch(/\*\*Signature:\*\*/);
  });

  it("states the stock-region fact when the seed sits in indigo/violet/purple, and not otherwise", () => {
    const indigo = createDesignSystem("#4F46E5", "modern saas dashboard", "web");
    expect(indigo).toMatch(/this seed sits \d+° from Tailwind `indigo-500`/i);
    expect(indigo).toContain("#615fff");
    const teal = createDesignSystem("#059669", "material android app", "android");
    expect(teal).not.toMatch(/this seed sits /i);
    const ibm = createDesignSystem("#0F62FE", "modern saas dashboard", "web");
    expect(ibm).not.toMatch(/this seed sits /i);
  });

  it("derives one signature move from the vibe instead of a generic wow list", () => {
    expect(createDesignSystem("#059669", "modern saas dashboard", "web")).toMatch(/Density over chrome/);
    expect(createDesignSystem("#e11d48", "editorial luxury magazine", "web")).toMatch(/oversized display line/i);
    expect(createDesignSystem("#e11d48", "premium fintech app", "ios")).toMatch(/tabular numbers/i);
  });

  it("does not bind a brand-surface vibe to Inter as the only family", () => {
    const ds = createDesignSystem("#059669", "modern saas", "web");
    expect(ds).not.toMatch(/\*\*Type:\*\* \*\*Inter\*\* \/ \*\*Inter\*\*/);
  });

  it("still binds a dashboard vibe to Inter, and an iOS vibe to the system stack", () => {
    expect(createDesignSystem("#4F46E5", "modern saas dashboard", "web")).toMatch(/\*\*Type:\*\* \*\*Inter\*\* \/ \*\*Inter\*\*/);
    expect(createDesignSystem("#e11d48", "premium fintech app", "ios")).toMatch(/\*\*Type:\*\* \*\*system-ui\*\*/);
  });

  it("lists the recipes the server actually ships, not the pre-parity subset", () => {
    const web = createDesignSystem("#4F46E5", "modern saas dashboard", "web");
    for (const c of ["list-row", "navigation", "search", "select", "table", "tooltip", "form", "pagination", "skeleton", "badge", "breadcrumb"]) {
      expect(web, c).toContain("`" + c + "`");
    }
    const ios = createDesignSystem("#e11d48", "premium fintech app", "ios");
    for (const c of ["navigation", "search", "select", "modal", "tabs", "tooltip"]) {
      expect(ios, c).toContain("`" + c + "`");
    }
  });
  it("switches token output by platform", () => {
    expect(createDesignSystem("#e11d48", "premium fintech app", "ios")).toContain("Tokens.swift");
    expect(createDesignSystem("#059669", "material android app", "android")).toContain("Tokens.kt");
  });
});

// Regression suite for the tag-aware linter. Every case here failed (or fired
// falsely) with the earlier line-by-line implementation: Prettier splits JSX
// attributes across lines, so a per-line rule cannot see whether `alt` is
// present, and `outline: none` can only be judged against the whole snippet.
describe("design_lint — formatting must not change the verdict", () => {
  const rules = (code: string) => [...new Set(designLint(code).map((f) => f.rule))].sort();

  it("accepts a multi-line <img> that has alt", () => {
    expect(rules('<img\n  src="/hero.png"\n  alt="Product screenshot"\n/>')).toEqual([]);
  });

  it("still flags a multi-line <img> without alt", () => {
    expect(rules('<img\n  src="/hero.png"\n  className="w-full"\n/>')).toEqual(["img-no-alt"]);
  });

  it("does not guess when attributes arrive via a spread", () => {
    expect(rules('<img src="/a.png" {...rest} />')).toEqual([]);
  });

  it("accepts a multi-line icon button that has aria-label", () => {
    expect(rules('<button\n  aria-label="Delete"\n>\n  <TrashIcon />\n</button>')).toEqual([]);
  });

  it("flags a multi-line icon-only button", () => {
    expect(rules('<button\n  className="p-2"\n>\n  <TrashIcon />\n</button>')).toEqual(["icon-button-no-label"]);
  });

  it("accepts a multi-line button with a real text label", () => {
    expect(rules('<button\n  className="btn"\n>\n  Save changes\n</button>')).toEqual([]);
  });

  it("flags a multi-line clickable div", () => {
    expect(rules("<div\n  onClick={go}\n  className=\"card\"\n>x</div>")).toContain("clickable-div");
  });

  it("flags outline:none when nothing replaces the focus ring", () => {
    expect(rules(".btn:focus { outline: none; }")).toEqual(["outline-none"]);
  });

  it("accepts outline:none paired with a visible :focus-visible style", () => {
    expect(rules(".btn:focus{outline:none}\n.btn:focus-visible{outline:2px solid var(--ring)}")).toEqual([]);
    expect(rules("a:focus{outline:none}\na:focus-visible{box-shadow:0 0 0 3px #99f}")).toEqual([]);
  });

  it("reads Tailwind outline-none with any variant prefix", () => {
    expect(rules('<button className="focus:outline-none">Save changes</button>')).toEqual(["outline-none"]);
    expect(rules('<a className="md:focus:outline-none">Read the docs</a>')).toEqual(["outline-none"]);
    expect(rules('<button className="focus:outline-none focus-visible:ring-2">Save changes</button>')).toEqual([]);
  });

  it("flags a form control with no way to attach a label", () => {
    expect(rules('<input type="email" placeholder="Email" />')).toEqual(["control-no-label"]);
    expect(rules('<label for="e">Email</label><input id="e" type="email" />')).toEqual([]);
  });

  it("reports one finding per rule per line", () => {
    const findings = designLint('<img src="/a.png"><img src="/b.png">');
    expect(findings.filter((f) => f.rule === "img-no-alt").length).toBe(1);
  });
});

describe("design_lint does not punish the correct focus idiom", () => {
  const rules = (code: string) => [...new Set(designLint(code).map((f) => f.rule))].sort();

  it("accepts :focus:not(:focus-visible) — the recommended pointer-focus pattern", () => {
    // Found on a real site: flagging this teaches people to ignore the linter.
    expect(rules("#main:focus:not(:focus-visible) { outline: none; }")).toEqual([]);
  });

  it("accepts it with whitespace and other declarations in the rule", () => {
    expect(rules("a:focus:not( :focus-visible ) {\n  outline: none;\n  color: red;\n}")).toEqual([]);
  });

  it("still flags a plain :focus that kills the outline", () => {
    expect(rules("#main:focus { outline: none; }")).toEqual(["outline-none"]);
  });

  it("still flags a bare rule with no focus qualification at all", () => {
    expect(rules(".btn { outline: none; }")).toEqual(["outline-none"]);
  });
});

describe("create_design_system hands its palette to the recipes", () => {
  // The seam that was loose: the flagship produced a verified 23-role palette
  // and the recipe tool ignored it unless the agent copied values across by
  // hand — and two of the roles the recipes need did not exist at all.
  const ds = () => createDesignSystem("#0F62FE", "modern saas dashboard", "web", "Acme");

  it("names the status colours it now generates", () => {
    expect(ds()).toMatch(/\*\*Status:\*\* danger/);
  });

  it("shows the exact payload to pass to get_component_recipe", () => {
    const out = ds();
    expect(out).toContain('"component"');
    expect(out).toContain('"tokens"');
    expect(out).toContain('"scales"');
    for (const ramp of ["neutral", "primary", "danger"]) {
      expect(out, ramp).toContain(`"${ramp}"`);
    }
  });

  it("offers a payload whose roles the recipe tool actually accepts", () => {
    const payload = JSON.parse(ds().split("```json")[1].split("```")[0]);
    for (const role of Object.keys(payload.tokens)) {
      expect(RECIPE_TOKEN_ROLES, `${role} is not a role get_component_recipe understands`).toContain(role);
    }
  });

  it("tells the caller to send ramps, because roles alone miss the dark theme", () => {
    expect(ds()).toMatch(/miss every shade a dark theme uses/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Four false negatives, all from reading raw attribute text.
//
// `design_lint` located an attribute name with `(^|[\s{])name\s*=`, and
// whitespace inside *another* attribute's value satisfies that. Every instance
// silenced a real a11y finding — a report that reads clean when it is not,
// which is the one direction these modules refuse.
// ─────────────────────────────────────────────────────────────────────────────
describe("design_lint — an attribute name is only a name where a name can appear", () => {
  const ruleIds = (code: string) => designLint(code).map((f) => f.rule);

  it("still flags an image with no alt when another value merely says alt=", () => {
    expect(ruleIds(`<img src="hero.jpg" title="see alt=foo">`)).toContain("img-no-alt");
  });

  it("still flags an unlabelled control when a placeholder merely says id=", () => {
    expect(ruleIds(`<input type="text" placeholder="e.g. id=1234">`)).toContain("control-no-label");
  });

  it("still flags an icon button when a data attribute merely says aria-label=", () => {
    expect(ruleIds(`<button data-hint="add aria-label=Close"><svg /></button>`)).toContain("icon-button-no-label");
  });

  it("still flags a clickable div when a data attribute merely says role=", () => {
    expect(ruleIds(`<div onClick={go} data-hint="add role=button">x</div>`)).toContain("clickable-div");
  });

  it("reads an input's type at a name position, not from a placeholder", () => {
    // `type=hidden` inside the placeholder must not exempt a real text input.
    expect(ruleIds(`<input type="text" placeholder="e.g. type=hidden">`)).toContain("control-no-label");
  });

  it("keeps every genuine suppression: a real alt, a real role, a real label, a spread", () => {
    expect(ruleIds(`<img src="a.png" alt="">`)).not.toContain("img-no-alt");
    expect(ruleIds(`<img {...props} />`)).not.toContain("img-no-alt");
    expect(ruleIds(`<div onClick={go} role="button" tabIndex={0}>x</div>`)).not.toContain("clickable-div");
    expect(ruleIds(`<button aria-label="Close"><svg /></button>`)).not.toContain("icon-button-no-label");
    expect(ruleIds(`<input type="text" id="email">`)).not.toContain("control-no-label");
  });
});
