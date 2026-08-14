import { describe, it, expect } from "vitest";
import {
  auditStructuredFrom, renderNotVisibleSection, assembleAuditReport,
  designLint, designLintReport, LINT_NOT_VISIBLE, LINT_PREAMBLE, LINT_CLOSING,
} from "../dist/lint.js";

/** Rule ids `designLint` produced for a snippet, deduped and sorted. */
const rules = (code: string): string[] =>
  [...new Set(designLint(code).map((f) => f.rule))].sort();

describe("shared audit primitives", () => {
  const findings = [
    { rule: "a", severity: "error" as const, message: "m1", fix: "f1", doc: "d1", line: 3 },
    { rule: "b", severity: "info" as const, message: "m2", fix: "f2", doc: "", line: 9, file: "x.css" },
  ];

  it("derives the summary from the findings it was given", () => {
    const s = auditStructuredFrom({ findings, notVisible: ["one"] });
    expect(s.summary).toEqual({ error: 1, warning: 0, info: 1 });
    expect(s.findings.map((f) => f.rule)).toEqual(["a", "b"]);
    expect(s.notVisible).toEqual(["one"]);
  });

  it("applies the fallback filename only where a finding carries none", () => {
    const s = auditStructuredFrom({ findings, notVisible: ["one"], file: "fallback.css" });
    expect(s.findings.map((f) => f.file)).toEqual(["fallback.css", "x.css"]);
  });

  it("renders one bullet per entry, under the standard heading", () => {
    expect(renderNotVisibleSection("Pre.", ["one", "two"], "Close.")).toEqual([
      "## Not visible to this audit", "", "Pre.", "", "- one", "- two", "", "Close.",
    ]);
  });

  it("leaves assembleAuditReport's output byte-identical", () => {
    const r = assembleAuditReport({
      heading: "H", scanned: "S", findings, preamble: "Pre.", notVisible: ["one"], closing: "Close.",
    });
    expect(r.text).toContain("## Not visible to this audit");
    expect(r.structured).toEqual(auditStructuredFrom({ findings, notVisible: ["one"] }));
  });

  it("renders the whole report byte-for-byte", () => {
    const r = assembleAuditReport({
      heading: "H",
      scanned: "S",
      notes: ["A note."],
      findings: [
        { rule: "a", severity: "error", message: "m1", fix: "f1", doc: "d1", line: 3 },
        { rule: "b", severity: "warning", message: "m2", fix: "f2", doc: "", line: 9, file: "x.css" },
        { rule: "c", severity: "info", message: "m3", fix: "f3", doc: "d3", line: 1 },
      ],
      preamble: "Pre.",
      notVisible: ["one", "two — with an em dash and `backticks`"],
      closing: "Close.",
      file: "fallback.css",
    });
    expect(r.text).toMatchInlineSnapshot(`
      "# H

      S

      A note.

      **1 error · 1 warning · 1 info**

      ## Errors

      - **a** (line 3) — m1
        - Fix: f1
        - Read: \`get_design_doc("d1")\`

      ## Warnings

      - **b** (line 9) — x.css: m2
        - Fix: f2

      ## Notes

      - **c** (line 1) — m3
        - Fix: f3
        - Read: \`get_design_doc("d3")\`

      ## Not visible to this audit

      Pre.

      - one
      - two — with an em dash and \`backticks\`

      Close."
    `);
  });

  it("renders the whole report byte-for-byte when there is nothing not visible", () => {
    const r = assembleAuditReport({
      heading: "H",
      scanned: "S",
      findings: [],
      preamble: "Pre.",
      notVisible: [],
      closing: "Close.",
    });
    expect(r.text).toMatchInlineSnapshot(`
      "# H

      S

      **0 error · 0 warning · 0 info**

      No findings in what was read.

      ## Not visible to this audit

      Pre.


      Close."
    `);
  });
});

describe("design_lint returns both registers", () => {
  it("returns both registers, and the disclosure list is not empty", () => {
    const r = designLintReport(`<img src="a.png">`);
    expect(r.structured.findings.some((f) => f.rule === "img-no-alt")).toBe(true);
    expect(r.structured.notVisible.length).toBeGreaterThan(0);
    expect(r.text).toContain("## Not visible to this audit");
  });

  it("renders every disclosure entry as its own bullet", () => {
    const r = designLintReport(`<div></div>`);
    for (const entry of r.structured.notVisible) expect(r.text).toContain(`- ${entry}`);
  });

  it("returns the notVisible list it printed, entry for entry", () => {
    const r = designLintReport(`<img src="a.png">`);
    expect(r.structured.notVisible).toEqual(LINT_NOT_VISIBLE);
  });

  it("discloses just as much when there is nothing to report", () => {
    const r = designLintReport(`<p>Hello</p>`);
    expect(r.structured.findings).toEqual([]);
    expect(r.structured.summary).toEqual({ error: 0, warning: 0, info: 0 });
    expect(r.structured.notVisible).toEqual(LINT_NOT_VISIBLE);
    expect(r.text).toContain("✅ No design anti-patterns detected");
    expect(r.text).toContain("## Not visible to this audit");
  });

  it("derives the summary from the same findings the markdown lists", () => {
    const r = designLintReport(`<img src="a.png">\n<div onClick={go}>x</div>\n.a { border-radius: 6px; }`);
    expect(r.structured.summary).toEqual({ error: 1, warning: 1, info: 1 });
    expect(r.structured.findings.map((f) => f.rule)).toEqual(["img-no-alt", "clickable-div", "magic-number-radius"]);
    for (const f of r.structured.findings) expect(r.text).toContain(`\`${f.rule}\``);
  });

  it("carries every finding's line number and doc into the structured half", () => {
    const { structured } = designLintReport(`\n\n<img src="a.png">`);
    expect(structured.findings[0]).toMatchObject({ rule: "img-no-alt", line: 3, doc: "accessibility" });
  });

  it("closes without implying that silence elsewhere is a pass", () => {
    const r = designLintReport(`<div></div>`);
    expect(r.text).toContain(LINT_PREAMBLE);
    expect(r.text.endsWith(LINT_CLOSING)).toBe(true);
    expect(LINT_CLOSING).toMatch(/not a design review and not an accessibility audit/i);
  });

  // Step 6 of the brief: the findings half of this report predates the
  // structured contract and is pinned byte-for-byte against the string the
  // pre-change `designLintReport` returned, so that adding the disclosure
  // section cannot quietly reword a table, a fix line or the closing italic.
  it("leaves the findings half of the report exactly as it was", () => {
    const r = designLintReport(`<img src="a.png"><div onClick={go}>x</div>`);
    const body = r.text.split("## Not visible to this audit")[0];
    expect(body).toMatchInlineSnapshot(`
      "# Design lint

      **2 finding(s)** — 1 error · 1 warning · 0 info

      | line | sev | rule | issue |
      |---|---|---|---|
      | 1 | 🔴 | \`img-no-alt\` | <img> without an alt attribute — invisible/opaque to screen readers. |
      | 1 | 🟡 | \`clickable-div\` | Clickable <div> without a role — not focusable or announced as interactive. |

      ## Fixes
      - **L1 \`img-no-alt\`:** Add alt="" for decorative images, or a descriptive alt for meaningful ones. → get_design_doc("accessibility")
      - **L1 \`clickable-div\`:** Use a <button> (or add role="button", tabIndex={0}, and key handlers). → get_design_doc("accessibility")

      _Regex/tag-scanner based — high-signal but not exhaustive, and it cannot see values that arrive via props or a spread. A fast design-time pass, not a replacement for a full review or a real a11y audit (axe/keyboard/screen-reader)._

      "
    `);
  });

  it("leaves the clean-run half of the report exactly as it was", () => {
    const r = designLintReport(`<div></div>`);
    const body = r.text.split("## Not visible to this audit")[0];
    expect(body).toMatchInlineSnapshot(`
      "# Design lint

      ✅ No design anti-patterns detected in this snippet.

      _Static checks only (hardcoded values, focus/alt/labels, semantics). Still verify visually and with a keyboard + screen reader. See design_review_checklist for a full audit._

      "
    `);
  });
});

// Every sentence in LINT_NOT_VISIBLE was written after running the linter on
// the input below it, and these are those runs. The assertion order is the one
// that keeps the pair honest: first what the tool does, then that the sentence
// says it. A sentence with no demonstration here does not belong in the list.
describe("what design_lint cannot see — one demonstration per disclosure entry", () => {
  const notVisible = LINT_NOT_VISIBLE.join("\n");

  it("has an entry for every demonstration below, and no empty list", () => {
    expect(LINT_NOT_VISIBLE.length).toBe(14);
    for (const entry of LINT_NOT_VISIBLE) expect(entry.startsWith("**")).toBe(true);
  });

  it("1. renders and measures nothing: no contrast, no spacing rhythm", () => {
    expect(rules(`.a { color: #777777; background: #888888; }`)).toEqual(["hardcoded-color"]);
    expect(rules(`.a { padding: 13px 27px; margin-top: 7px; }`)).toEqual([]);
    expect(notVisible).toMatch(/Nothing here is measured, and nothing is rendered/);
    expect(notVisible).toMatch(/contrast ratio is computed/i);
  });

  it("2. a class defined in another file, and both directions of that on outline-none", () => {
    expect(designLint(`<div class="btn">Go</div>`)).toEqual([]);
    // The replacement lives elsewhere; the removal is still reported.
    expect(rules(`.btn { outline: none; }`)).toEqual(["outline-none"]);
    // The removal lives elsewhere; the markup is silent.
    expect(designLint(`<button className="btn">Go</button>`)).toEqual([]);
    expect(notVisible).toMatch(/Anything declared in another file/);
    expect(notVisible).toMatch(/both directions/i);
  });

  it("3. outline-none is switched off snippet-wide by any focus replacement", () => {
    expect(rules(`.a:focus { outline: 2px solid blue; }\n.b { outline: none; }`)).toEqual([]);
    expect(rules(`.b { outline: none; }`)).toEqual(["outline-none"]);
    // A Tailwind focus utility on an unrelated element does it too.
    expect(rules(`<button className="focus:ring-2">Save</button>\n<div className="outline-none">b</div>`)).toEqual([]);
    expect(rules(`<div className="outline-none">b</div>`)).toEqual(["outline-none"]);
    expect(notVisible).toMatch(/snippet-wide and selector-blind/i);
  });

  it("3b. outline-none reads three spellings and misses every other way to kill a ring", () => {
    // What it does match.
    expect(rules(`.a { outline: none; }`)).toEqual(["outline-none"]);
    expect(rules(`.a { outline: 0; }`)).toEqual(["outline-none"]);
    expect(rules(`<div className="outline-none">x</div>`)).toEqual(["outline-none"]);
    // Every one of these removes the focus ring just as completely, and is silent.
    for (const css of [
      `.a { outline-style: none; }`,
      `.a { outline-width: 0; }`,
      `.a { outline: transparent; }`,
      `.a { outline: 2px solid transparent; }`,
      // `\b` fails between the `0` and the `p`, so the `0` spelling with a unit escapes.
      `.a { outline: 0px; }`,
      `<div className="outline-0">x</div>`,
    ]) expect(designLint(css), css).toEqual([]);
    expect(notVisible).toMatch(/outline-style: none/);
    expect(notVisible).toMatch(/only `error` rule/i);
  });

  it("4. a tag that carries a spread", () => {
    expect(designLint(`<img {...props} src="a.png">`)).toEqual([]);
    expect(designLint(`<div {...rest} onClick={go}>x</div>`)).toEqual([]);
    expect(designLint(`<input {...register("x")} />`)).toEqual([]);
    expect(designLint(`<button {...p}><Icon/></button>`)).toEqual([]);
    // The same four without the spread all fire.
    expect(rules(`<img src="a.png">`)).toEqual(["img-no-alt"]);
    expect(rules(`<div onClick={go}>x</div>`)).toEqual(["clickable-div"]);
    expect(rules(`<input />`)).toEqual(["control-no-label"]);
    expect(rules(`<button><Icon/></button>`)).toEqual(["icon-button-no-label"]);
    expect(notVisible).toMatch(/A tag that carries a spread/);
  });

  it("5. run-time values — silent for the line rules, a false positive for icon-button-no-label", () => {
    expect(designLint(`const c = "#ff0000";\n<div style={{ color: c }}>x</div>`)).toEqual([]);
    expect(designLint(`<div tabIndex={n}>x</div>`)).toEqual([]);
    expect(rules(`<div tabIndex={5}>x</div>`)).toEqual(["positive-tabindex"]);
    // The other direction: the expression is erased before the name is measured.
    expect(rules(`<button>{label}</button>`)).toEqual(["icon-button-no-label"]);
    expect(notVisible).toMatch(/only exists at run time/i);
    expect(notVisible).toMatch(/errs the other way/i);
  });

  it("5b. icon-button-no-label's threshold: under two letters or digits fires", () => {
    // A digit, a symbol and a single CJK character are all "unlabelled".
    expect(rules(`<button>3</button>`)).toEqual(["icon-button-no-label"]);
    expect(rules(`<button>×</button>`)).toEqual(["icon-button-no-label"]);
    expect(rules(`<button>好</button>`)).toEqual(["icon-button-no-label"]);
    expect(rules(`<button>了</button>`)).toEqual(["icon-button-no-label"]);
    // Two of anything alphanumeric passes, in any script.
    expect(designLint(`<button>Go</button>`)).toEqual([]);
    expect(designLint(`<button>12</button>`)).toEqual([]);
    expect(designLint(`<button>好的</button>`)).toEqual([]);
    expect(notVisible).toMatch(/Fewer than two letters or digits/i);
    expect(notVisible).toMatch(/a whole word/i);
  });

  it("6. a tag rule matches the literal name, lowercased — so components spelling an element ARE graded", () => {
    // A component whose name spells an element is graded as that element,
    // even though the wrapper almost certainly supplies the missing attribute.
    expect(rules(`<Button onClick={go}><Icon/></Button>`)).toEqual(["icon-button-no-label"]);
    expect(rules(`<Input type="email" />`)).toEqual(["control-no-label"]);
    expect(rules(`<Select><option>a</option></Select>`)).toEqual(["control-no-label"]);
    expect(rules(`<Textarea />`)).toEqual(["control-no-label"]);
    expect(rules(`<Div onClick={go}>x</Div>`)).toEqual(["clickable-div"]);
    expect(rules(`<Span onClick={go}>x</Span>`)).toEqual(["clickable-div"]);
    expect(rules(`<Li onClick={go}>x</Li>`)).toEqual(["clickable-div"]);
    expect(rules(`<Section onClick={go}>x</Section>`)).toEqual(["clickable-div"]);
    expect(rules(`<Image src="/a.png" />`)).toEqual(["img-no-alt"]);
    expect(rules(`<IMG src="a.png">`)).toEqual(["img-no-alt"]);
    // It goes quiet only when the name is on this very line.
    expect(designLint(`<Button aria-label="Save"><Icon/></Button>`)).toEqual([]);
    // And in the other direction: a name that spells nothing is unreachable.
    for (const src of [
      `<Avatar src="/a.png" />`,
      `<IconButton icon="save" />`,
      `<TextField placeholder="Email" />`,
      `<Pressable onClick={go}>x</Pressable>`,
    ]) expect(designLint(src), src).toEqual([]);
    // The plain-HTML lists are narrow too.
    for (const src of [
      `<a onClick={go}>x</a>`,
      `<p onClick={go}>x</p>`,
      `<td onClick={go}>x</td>`,
      `<article onClick={go}>x</article>`,
      `<a role="button" href="/x"><Icon /></a>`,
    ]) expect(designLint(src), src).toEqual([]);
    expect(notVisible).toMatch(/the literal name, lowercased/i);
    expect(notVisible).toMatch(/cuts both ways/i);
  });

  it("6b. clickable-div only recognises React's and HTML's onClick spelling", () => {
    expect(rules(`<div onClick={go}>x</div>`)).toEqual(["clickable-div"]);
    expect(rules(`<div onclick="go()">x</div>`)).toEqual(["clickable-div"]);
    // Four advertised stacks, every clickable div silent.
    for (const src of [
      `<div @click="go">x</div>`,
      `<div v-on:click="go">x</div>`,
      `<div on:click={go}>x</div>`,
      `<div (click)="go()">x</div>`,
      `<div x-on:click="go">x</div>`,
      `<div @click.prevent="go">x</div>`,
    ]) expect(designLint(src), src).toEqual([]);
    expect(notVisible).toMatch(/any syntax but React's or HTML's/i);
    expect(notVisible).toContain("on:click");
  });

  it("7. a namespaced element is graded as its prefix — and <svelte:head> costs nothing here", () => {
    expect(designLint(`<svg:image href="/a.png" />`)).toEqual([]);
    expect(designLint(`<xhtml:img src="/a.png" />`)).toEqual([]);
    expect(designLint(`<html:input type="text" />`)).toEqual([]);
    // The unprefixed spellings of the same three do fire.
    expect(rules(`<image href="/a.png" />`)).toEqual(["img-no-alt"]);
    expect(rules(`<img src="/a.png" />`)).toEqual(["img-no-alt"]);
    expect(rules(`<input type="text" />`)).toEqual(["control-no-label"]);
    // No rule here looks for a <head>, so a Svelte head is only an unknown tag
    // and its contents are graded exactly as they would be outside it.
    expect(rules(`<svelte:head>\n<img src="a.png">\n</svelte:head>`)).toEqual(["img-no-alt"]);
    expect(notVisible).toMatch(/graded as its prefix/i);
    expect(notVisible).toContain("<svelte:head>");
    expect(notVisible).toMatch(/tag-name character/i);
  });

  it("8. commented-out code — skipped by the line rules, graded by the tag rules", () => {
    expect(designLint(`// color: #ff0000;`)).toEqual([]);
    expect(designLint(`/* color: #ff0000; */`)).toEqual([]);
    expect(designLint(` * color: #ff0000;`)).toEqual([]);
    expect(rules(`<!-- <img src="a.png"> -->`)).toEqual(["img-no-alt"]);
    expect(rules(`{/* <img src="a.png"> */}`)).toEqual(["img-no-alt"]);
    expect(rules(`<!-- .b { outline: none } -->`)).toEqual(["outline-none"]);
    // The line-rule guard is about where the line starts, not what it contains.
    expect(rules(`color: #ff0000; // fix later`)).toEqual(["hardcoded-color"]);
    expect(rules(`/*\ncolor: #ff0000;\n*/`)).toEqual(["hardcoded-color"]);
    expect(notVisible).toMatch(/Commented-out code/i);
  });

  it("9. a CSS declaration split across lines — line rules only, not the tag rules", () => {
    expect(designLint(`.a {\n  font-size:\n    14px;\n}`)).toEqual([]);
    expect(designLint(`.a {\n  color:\n    #ff0000;\n}`)).toEqual([]);
    expect(rules(`.a { font-size: 14px; }`)).toEqual(["px-font-size"]);
    // The tag rules scan the whole snippet, so Prettier's wrapping is harmless.
    expect(rules(`<img\n  src="a.png"\n  className="x"\n/>`)).toEqual(["img-no-alt"]);
    expect(rules(`<div\n  className="x"\n  onClick={go}\n>x</div>`)).toEqual(["clickable-div"]);
    expect(notVisible).toMatch(/split across lines/i);
  });

  it("10. spellings the two value rules were not written for", () => {
    for (const css of [
      `.a { color: rgb(255, 0, 0); }`,
      `.a { background: hsl(0 100% 50%); }`,
      `.a { color: oklch(0.7 0.1 20); }`,
      `.a { color: red; }`,
      `:root { --brand: #ff0000; }`,
      `.a { box-shadow: 0 1px 2px #00000033; }`,
    ]) expect(designLint(css), css).toEqual([]);
    expect(rules(`.a { color: #ff0000; }`)).toEqual(["hardcoded-color"]);

    expect(designLint(`<div style={{ fontSize: "14px" }}>x</div>`)).toEqual([]);
    expect(designLint(`.a { font: 14px/1.5 sans-serif; }`)).toEqual([]);

    // Tailwind arbitrary values, which is where hardcoding actually happens.
    expect(designLint(`<div className="bg-[#ff0000]">x</div>`)).toEqual([]);
    expect(designLint(`<div className="text-[14px]">x</div>`)).toEqual([]);
    expect(designLint(`<div className="rounded-[6px]">x</div>`)).toEqual([]);
    // important-overuse is blind to Tailwind's important modifier too.
    expect(designLint(`<div className="!text-red-500">x</div>`)).toEqual([]);
    expect(rules(`.a { color: red !important; }`)).toEqual(["important-overuse"]);
    expect(notVisible).toMatch(/Spellings a line rule was not written for/i);
    expect(notVisible).toMatch(/arbitrary-value syntax/i);
    expect(notVisible).toMatch(/important modifier/i);
  });

  it("11a. fixed-height-text does not mean fixed — min-height and max-height fire", () => {
    // The pattern is a word-boundary `height:`, and `-` is a word boundary.
    expect(rules(`.a { min-height: 40px; }`)).toEqual(["fixed-height-text"]);
    expect(rules(`.a { max-height: 200px; }`)).toEqual(["fixed-height-text"]);
    // Which means the rule flags the `min-height` its own fix text recommends.
    expect(designLint(`.a { min-height: 40px; }`)[0].fix).toContain("min-height");
    // line-height escapes only because `line` is on the suppressor list.
    expect(designLint(`.a { line-height: 40px; }`)).toEqual([]);
    expect(notVisible).toMatch(/does not mean \*fixed\*/i);
    expect(notVisible).toMatch(/flags its own advice/i);
  });

  it("11. the two info rules stand down for a word anywhere on the line", () => {
    expect(rules(`.card { height: 40px; }`)).toEqual(["fixed-height-text"]);
    for (const css of [
      `.timeline { height: 40px; }`,
      `.headline { height: 40px; }`,
      `.inline-flex { height: 40px; }`,
    ]) expect(designLint(css), css).toEqual([]);
    // `border-radius` beside the height contains "border", so the height note goes.
    expect(rules(`.a { height: 40px; border-radius: 4px; }`)).toEqual(["magic-number-radius"]);

    expect(rules(`.card { border-radius: 8px; }`)).toEqual(["magic-number-radius"]);
    expect(designLint(`.rounded-card { border-radius: 8px; }`)).toEqual([]);
    expect(designLint(`.a { border-radius: 8px; color: var(--c); }`)).toEqual([]);
    expect(notVisible).toMatch(/stands down when the line contains/i);
    expect(notVisible).toMatch(/substring/i);
  });

  it("12. whether a label, a role or a name actually resolves", () => {
    // An id alone satisfies control-no-label; nothing looks for the <label for>.
    expect(designLint(`<input id="email" type="email">`)).toEqual([]);
    expect(designLint(`<label for="nope">Email</label><input id="email">`)).toEqual([]);
    // A wrapping label is correct and still draws the warning.
    expect(rules(`<label>Email <input type="email"></label>`)).toEqual(["control-no-label"]);
    // Any role satisfies clickable-div, plausible or not, key handlers or not.
    expect(designLint(`<div role="presentation" onClick={go}>x</div>`)).toEqual([]);
    // The two naming rules read presence, never content.
    expect(designLint(`<img src="a.png" alt="image">`)).toEqual([]);
    expect(designLint(`<img src="a.png" alt="a.png">`)).toEqual([]);
    expect(designLint(`<button aria-label="button"><Icon/></button>`)).toEqual([]);
    expect(designLint(`<button aria-label=""><Icon/></button>`)).toEqual([]);
    expect(notVisible).toMatch(/actually resolves/i);
    expect(notVisible).toMatch(/wrapping label/i);
    expect(notVisible).toMatch(/All four grade the presence of an attribute and never its content/i);
  });

  it("13. the count is findings, not defects — one per rule per line", () => {
    expect(designLint(`<img src=a><img src=b><img src=c>`)).toHaveLength(1);
    expect(designLint(`<img src=a>\n<img src=b>`)).toHaveLength(2);
    expect(designLint(`.a { color: #fff; background: #000; }`)).toHaveLength(1);
    expect(notVisible).toMatch(/How many defects a snippet has/i);
    expect(notVisible).toMatch(/findings, not defects/i);
  });
});
