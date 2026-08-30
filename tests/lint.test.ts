import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditStructuredFrom, renderNotVisibleSection, assembleAuditReport,
  designLint, designLintReport, LINT_NOT_VISIBLE, LINT_PREAMBLE, LINT_CLOSING,
  LINE_RULES, SOURCE_RULE_DOCS,
} from "../dist/lint.js";
import { layoutSystemReport } from "../dist/layout.js";
import { loadKnowledge, findDoc } from "../dist/knowledge.js";

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
    expect(LINT_NOT_VISIBLE.length).toBe(23);
    for (const entry of LINT_NOT_VISIBLE) expect(entry.startsWith("**")).toBe(true);
  });

  // Four false sentences have shipped in this list, and every one was the same
  // shape: a claim telling the reader what a *silence* means. The previous
  // guard pinned three retracted phrasings, and a reviewer defeated it with a
  // paraphrase — phrase pins cannot catch the next wording.
  //
  // So this is a shape check with a registry. Any sentence that pairs a word
  // from SILENCE with one from MEANING must be listed below together with a
  // test in this file that demonstrates it; an unregistered one fails, and
  // rewording a registered one makes the registry stale and also fails.
  //
  // What this does NOT do — measured, not assumed, because a guard whose
  // comment over-claims is the same defect as a disclosure that over-claims:
  //
  //   • It is not word-agnostic. The two vocabularies below ARE the mechanism,
  //     and one off-list word walks past it. Verified escapes: "guarantees",
  //     "proves", "a hush", "an empty result set", "when nothing is reported".
  //   • It does not span sentences. "These four often stay silent. That means
  //     the attribute was present." escapes — each half is clean alone.
  //     `Silent = clean.` escapes too, having no meaning verb at all.
  //   • `demonstratedBy` is checked to name a test that exists in this file,
  //     which is weaker than it sounds: it is not proof that the named test
  //     exercises the claim, only that the name is not invented.
  //   • It cannot tell a true meaning-claim from a false one, nor judge
  //     whether a registered one is adequately scoped. A human does that.
  //
  // What it does do is fail closed on an unregistered claim in the shapes it
  // covers — the step that was missing all four times. The rest is held by
  // the enumeration discipline in the entries themselves, and by the standing
  // rule this list now follows: write narrowing claims ("reads only X"), never
  // completeness claims ("these are the shapes that fire"). A narrowing claim
  // that is wrong under-promises; a completeness claim that is wrong invites a
  // reader to trust a gap that is not there. Four sweeps have not falsified a
  // narrowing claim here; the one completeness claim was false on first
  // outing, on `:root { --header-height: 64px; }`.
  const SILENCE = /\b(silence|silent|quiet|draws? nothing|reports? nothing|passes? silently)\b/i;
  const MEANING = /\b(means?|meaning|implies|imply|tells? you|amounts? to|is a verdict|is a pass|is a clean)\b/i;

  /** Sentences asserting something about what a silence means, each demonstrated. */
  const REGISTERED_SILENCE_CLAIMS: Array<{ fragment: string; demonstratedBy: string }> = [
    {
      fragment: "four demonstrated causes of silence, and only one of them is",
      demonstratedBy: "3c. outline-none's four causes of silence, isolated",
    },
    {
      fragment: "a silence from these four has at least four distinct causes",
      demonstratedBy: "12. whether a label, a role or a name actually resolves",
    },
  ];

  it("registers every claim it makes about what a silence means", () => {
    const unregistered: string[] = [];
    for (const entry of LINT_NOT_VISIBLE) {
      for (const sentence of entry.split(/(?<=[.!?])\s+(?=[A-Z`*(])/)) {
        if (!SILENCE.test(sentence) || !MEANING.test(sentence)) continue;
        if (REGISTERED_SILENCE_CLAIMS.some((c) => sentence.includes(c.fragment))) continue;
        unregistered.push(sentence.trim());
      }
    }
    expect(unregistered, "unregistered claim(s) about what a silence means").toEqual([]);
  });

  it("keeps every registered silence claim present, and names a test that exists", () => {
    const joined = LINT_NOT_VISIBLE.join("\n");
    const suite = readFileSync(new URL("./lint.test.ts", import.meta.url), "utf8");
    for (const c of REGISTERED_SILENCE_CLAIMS) {
      expect(joined, `registry is stale: ${c.fragment}`).toContain(c.fragment);
      // Weaker than it sounds — see the note above — but it does stop a
      // registry entry naming a test that was never written.
      expect(suite, `demonstratedBy names no test in this file: ${c.demonstratedBy}`)
        .toContain(`it("${c.demonstratedBy}`);
    }
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
    // The severity claim in that entry, counted from the tool rather than asserted:
    // outline-none and img-no-alt are the only two `error` rules there are.
    const errorRules = new Set(
      designLint(`<img src="a.png">\n.a { outline: none; }\n<div onClick={go}>x</div>\n<input />\n<button><Icon/></button>\n.a { color: #fff; font-size: 14px; }\n.b { border-radius: 6px; height: 40px; color: red !important; }\n<div tabIndex={5}>x</div>`)
        .filter((f) => f.severity === "error")
        .map((f) => f.rule),
    );
    expect([...errorRules].sort()).toEqual(["img-no-alt", "outline-none"]);
    expect(notVisible).toMatch(/one of only two `error` rules here — `img-no-alt` is the other/);
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
    // Scope: it stands those four down on that element, and nothing more.
    expect(rules(`<div {...p} className="outline-none">x</div>`)).toEqual(["outline-none"]);
    expect(rules(`<div {...p} style={{ color: "#ff0000" }} />`)).toEqual(["hardcoded-color"]);
    expect(notVisible).toMatch(/stands down those four rules on that element and nothing more/i);
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
    // The threshold only applies when nothing else names the button, so the
    // unconditional form of this claim ("fewer than two … fires") is false.
    expect(designLint(`<button title="Save">×</button>`)).toEqual([]);
    expect(designLint(`<button aria-label="Search">×</button>`)).toEqual([]);
    expect(designLint(`<button {...p}>×</button>`)).toEqual([]);
    expect(notVisible).toMatch(/With no `aria-label`, `aria-labelledby`, `title` or spread to name the button/);
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
    // "draws nothing" is true of these rules only — a line rule still reads the line.
    expect(rules(`<Avatar style={{ color: "#ff0000" }} />`)).toEqual(["hardcoded-color"]);
    expect(notVisible).toMatch(/draw nothing \*from the four rules keyed to element names\*/);
  });

  it("6b. clickable-div reads onClick/onclick — which handler syntaxes that misses", () => {
    expect(rules(`<div onClick={go}>x</div>`)).toEqual(["clickable-div"]);
    expect(rules(`<div onclick="go()">x</div>`)).toEqual(["clickable-div"]);
    for (const src of [
      `<div @click="go">x</div>`,          // Vue
      `<div v-on:click="go">x</div>`,      // Vue
      `<div (click)="go()">x</div>`,       // Angular
      `<div x-on:click="go">x</div>`,      // Alpine
      `<div @click.prevent="go">x</div>`,  // Alpine
      `<div on:click={go}>x</div>`,        // Svelte 4 — the legacy event directive
    ]) expect(designLint(src), src).toEqual([]);
    // Svelte 5's own syntax is an event *attribute*, and this rule reads it.
    // Verified against svelte.dev: `onclick={handler}` is current, `on:click`
    // is the legacy API kept for backwards compatibility. So "a div made
    // clickable in Svelte's own syntax is silent" is false for current Svelte.
    expect(rules(`<div onclick={go}>x</div>`)).toEqual(["clickable-div"]);
    expect(notVisible).toMatch(/a syntax `clickable-div` does not read/i);
    expect(notVisible).toContain("on:click");
    expect(notVisible).toMatch(/Svelte 5 replaced the event directive with an event attribute/i);
    expect(notVisible).not.toMatch(/Only the framework spelling is missed/i);
    // Nor is the handler spelling the only escape inside such a template.
    expect(designLint(`<template><article onclick="go()">x</article></template>`)).toEqual([]);
    expect(designLint(`<template><div role="button" onclick="go()">x</div></template>`)).toEqual([]);
    expect(designLint(`<template><div v-bind="attrs" onclick="go()">x</div></template>`)).toEqual([]);
    expect(rules(`<template><div onclick="go()">x</div></template>`)).toEqual(["clickable-div"]);
    expect(notVisible).toMatch(/three separate conditions do it as well/i);
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

  it("11a. fixed-height-text does not mean fixed — but it no longer reaches min/max-height", () => {
    // Was a word-boundary `height:`, and `-` is a word boundary, so the rule
    // fired on `min-height` — the floor its own fix text tells you to write,
    // and a value that cannot clip anything. `(?<![-\w])` closed it.
    expect(designLint(`.a { min-height: 40px; }`)).toEqual([]);
    expect(designLint(`.a { max-height: 200px; }`)).toEqual([]);
    // The fix text still recommends min-height; it just no longer flags it.
    expect(designLint(`.a { height: 40px; }`)[0].fix).toContain("min-height");
    // line-height is now excluded by the property match, not only by the
    // `line` suppressor — so the silence no longer rests on an accident.
    expect(designLint(`.a { line-height: 40px; }`)).toEqual([]);
    expect(designLint(`.a { LINE-height: 40px; }`)).toEqual([]);
    // The other half of the pattern: two-or-more-digit whole pixels, nothing else.
    for (const css of [
      `.a { height: 9px; }`,
      `.a { height: 40rem; }`,
      `.a { height: 100%; }`,
      `.a { height: 40vh; }`,
      `.a { height: 40.5px; }`,
    ]) expect(designLint(css), css).toEqual([]);
    expect(rules(`.a { height: 40px; }`)).toEqual(["fixed-height-text"]);
    expect(notVisible).toMatch(/does not mean \*fixed\*/i);
    expect(notVisible).toMatch(/firing on it was the rule flagging its own advice/i);
    expect(notVisible).toMatch(/two or more digits and a literal `px`/i);
    // The unit is literal and lower-case, so "two-or-more-digit whole pixels
    // are read" is false as an unconditional claim — these are exactly that.
    expect(designLint(`.a { height: 40PX; }`)).toEqual([]);
    expect(designLint(`.a { height: 40Px; }`)).toEqual([]);
    expect(designLint(`.a { height: calc(40px + 1rem); }`)).toEqual([]);
    expect(designLint(`.a { block-size: 40px; }`)).toEqual([]);
    expect(notVisible).toMatch(/matched literally and in lower case/i);
    // Narrowing phrasing, not a closed list — the round-4 completeness claim
    // was falsified by `:root { --header-height: 64px; }` (see 11d).
    expect(notVisible).toMatch(/a narrow slice of the ways a fixed height gets written/i);
    expect(notVisible).toMatch(/Shapes demonstrated to fire include/i);
    expect(notVisible).not.toMatch(/Only two-or-more-digit whole pixels are read at all/i);
  });

  it("10b. seven of the eight line rules are case-sensitive; positive-tabindex is not", () => {
    for (const css of [
      `.a { HEIGHT: 40px; }`,
      `.a { COLOR: #ff0000; }`,
      `.a { FONT-SIZE: 14px; }`,
      `.a { BORDER-RADIUS: 6px; }`,
      `.a { color: red !IMPORTANT; }`,
      `.a { Height: 40px; }`,
    ]) expect(designLint(css), css).toEqual([]);
    // Each lowercase form does fire, so case is the only difference above.
    expect(rules(`.a { height: 40px; }`)).toEqual(["fixed-height-text"]);
    expect(rules(`.a { color: #ff0000; }`)).toEqual(["hardcoded-color"]);
    expect(rules(`.a { font-size: 14px; }`)).toEqual(["px-font-size"]);
    expect(rules(`.a { border-radius: 6px; }`)).toEqual(["magic-number-radius"]);
    expect(rules(`.a { color: red !important; }`)).toEqual(["important-overuse"]);
    // positive-tabindex is excepted on only ONE of its two alternatives: the
    // HTML-attribute form is case-insensitive, the JSX brace form is not.
    for (const src of [`<div TABINDEX="5">x</div>`, `<div TabIndex="5">x</div>`, `<div TABINDEX=5>x</div>`, `<div tabindex="5">x</div>`])
      expect(rules(src), src).toEqual(["positive-tabindex"]);
    for (const src of [`<div TABINDEX={5}>x</div>`, `<div TabIndex={5}>x</div>`, `<div tabindex={5}>x</div>`])
      expect(designLint(src), src).toEqual([]);
    expect(rules(`<div tabIndex={5}>x</div>`)).toEqual(["positive-tabindex"]);
    expect(notVisible).toMatch(/10 of the 11 line rules are case-sensitive/i);
    // Tied to LINE_RULES.length rather than hand-typed, so a future line
    // rule can't silently make this sentence's count wrong the way it did
    // when grid-track-no-min shipped as the seventh: the sentence still said
    // "the six line rules" while the array already held seven. Now that the
    // three motion rules have shipped as the ninth, tenth and eleventh (all
    // case-sensitive), the stale "7 of the 8" text must not linger either.
    expect(notVisible).not.toMatch(/five of the six line rules/i);
    expect(notVisible).not.toMatch(/6 of the 7 line rules/i);
    expect(notVisible).not.toMatch(/7 of the 8 line rules/i);
    expect(notVisible).toMatch(/the partial exception, and only on one of its two alternatives/i);
    expect(notVisible).not.toMatch(/`positive-tabindex` is the one exception/i);
  });

  it("10c. the Tailwind spellings named include the height utilities", () => {
    expect(designLint(`<div className="h-[40px]">x</div>`)).toEqual([]);
    expect(designLint(`<div className="h-10">x</div>`)).toEqual([]);
    expect(notVisible).toContain("h-[40px]");
    expect(notVisible).toContain("h-10");
  });

  it("3c. outline-none's four causes of silence, isolated", () => {
    // 1. nothing was removed.
    expect(designLint(`.a { color: red; }`)).toEqual([]);
    // 2. something in the snippet looks like a replacement.
    expect(designLint(`.a:focus { outline: 2px solid blue; }\n.b { outline: none; }`)).toEqual([]);
    // 3. a spelling the pattern does not carry.
    expect(designLint(`.a { outline-style: none; }`)).toEqual([]);
    // 4. the deliberate pointer-focus exemption.
    expect(designLint(`a:focus:not(:focus-visible) { outline: none; }`)).toEqual([]);
    expect(designLint(`<div className="not-focus-visible:outline-none">x</div>`)).toEqual([]);
    // …against the one shape that does fire.
    expect(rules(`.a { outline: none; }`)).toEqual(["outline-none"]);
    expect(notVisible).toMatch(/four demonstrated causes of silence, and only one of them is/i);
    expect(notVisible).toMatch(/pointer-focus exemption/i);
  });

  it("11b. magic-number-radius reads whole pixels 1–999 — a square, a pill, 50% and 0.5rem all pass", () => {
    // Silent for two different reasons, and the disclosure separates them:
    // these two are not whole pixels …
    expect(designLint(`.a { border-radius: 50%; }`)).toEqual([]);
    expect(designLint(`.a { border-radius: 0.5rem; }`)).toEqual([]);
    // … and these are whole pixels the rule deliberately passes over, because
    // a squared corner and a pill are not ad-hoc radii. Both used to fire.
    expect(designLint(`.a { border-radius: 0; }`)).toEqual([]);
    expect(designLint(`.a { border-radius: 0px; }`)).toEqual([]);
    expect(designLint(`.a { border-radius: 9999px; }`)).toEqual([]);
    // The blunt threshold, stated in the disclosure and demonstrated here.
    expect(rules(`.a { border-radius: 999px; }`)).toEqual(["magic-number-radius"]);
    expect(designLint(`.a { border-radius: 1000px; }`)).toEqual([]);
    // …against the shape that still fires, so none of the above is vacuous.
    expect(rules(`.a { border-radius: 6px; }`)).toEqual(["magic-number-radius"]);
    expect(notVisible).toMatch(/a squared corner and a pill are the two least ad-hoc radii/i);
    expect(notVisible).toMatch(/whole pixels between 1 and 999 only/i);
  });

  it("10d. hardcoded-color is case-sensitive per branch, not per rule", () => {
    expect(designLint(`.a { COLOR: #ff0000; }`)).toEqual([]);            // bare-CSS branch: silent
    expect(rules(`<div style={{ COLOR: "#ff0000" }} />`)).toEqual(["hardcoded-color"]); // quoted-hex branch: fires
    expect(rules(`.a { color: #FF0000; }`)).toEqual(["hardcoded-color"]);
    expect(rules(`<div style={{ color: "#FF0000" }} />`)).toEqual(["hardcoded-color"]);
    expect(notVisible).toMatch(/case-sensitive per \*branch\* rather than per rule/i);
  });

  it("11c. fixed-height-text needs the digits straight after the colon — a quote blocks it", () => {
    expect(rules(`.a { height: 40px; }`)).toEqual(["fixed-height-text"]);
    expect(rules(`.a { height:40px; }`)).toEqual(["fixed-height-text"]);
    expect(rules(`.a { height :  40px; }`)).toEqual(["fixed-height-text"]);
    // Both of these are a lower-case `px` behind two digits — the quote is in the way.
    expect(designLint(`.a { height: "40px"; }`)).toEqual([]);
    expect(designLint(`<div style={{ height: "40px" }} />`)).toEqual([]);
    expect(notVisible).toMatch(/Nothing but whitespace may sit between the colon and the digits/i);
  });

  // `\b` matched after `--`, so all three value rules reached custom-property
  // *definitions* — the design tokens their own fix text sends you to write —
  // and each fired or not on nothing but whether the token's name happened to
  // end in a word it watched. `animates-layout-property` closed this class for
  // itself with a `(?<!outline-|--[\w-]*)` lookbehind; the other three now
  // carry the same exclusion, so the file treats one mechanism one way.
  it("11d. no value rule fires on a custom-property definition — the tokens they recommend", () => {
    for (const css of [
      `:root { --header-height: 64px; }`,
      `:root { --height: 40px; }`,
      `:root { --card-height: 40px; }`,
      `:root { --nav-height: 40px; }`,
      `:root { --border-radius: 8px; }`,
      `:root { --radius: 8px; }`,
      `:root { --brand-color: #ff0000; }`,
      `:root { --brand: #ff0000; }`,
      `:root { --border-color: #e5e7eb; }`,
      `@keyframes x { from { --card-width: 10px; } }\n@media (prefers-reduced-motion: reduce) { .a { animation: none; } }`,
    ]) expect(designLint(css), css).toEqual([]);
    // Vacuity control: the same three rules on real declarations, which is the
    // only difference between these lines and the ones above.
    expect(rules(`.a { height: 64px; }`)).toEqual(["fixed-height-text"]);
    expect(rules(`.a { border-radius: 8px; }`)).toEqual(["magic-number-radius"]);
    expect(rules(`.a { border-color: #e5e7eb; }`)).toEqual(["hardcoded-color"]);
    expect(notVisible).toContain("--header-height: 64px");
    expect(notVisible).toMatch(/`--brand: #ff0000`, `--brand-color: #ff0000`, `--border-color: #e5e7eb`/);
    // The retracted completeness claim may not come back.
    expect(notVisible).not.toMatch(/treat that as the list rather than as an example of a larger one/i);
    expect(notVisible).toMatch(/a sample rather than a closed list/i);
  });

  it("11e. the two suppressors are not parallel — only one is case-insensitive", () => {
    expect(designLint(`.a { height: 40px; BORDER: 1px solid; }`)).toEqual([]);
    expect(designLint(`.a { height: 40px; ICON: x; }`)).toEqual([]);
    expect(rules(`.ROUNDED-card { border-radius: 8px; }`)).toEqual(["magic-number-radius"]);
    expect(designLint(`.rounded-card { border-radius: 8px; }`)).toEqual([]);
    expect(notVisible).toMatch(/they are not parallel, though they read as though they were/i);
  });

  it("9b. commenting out a focus replacement silences a live outline-none", () => {
    expect(designLint(`<!-- .a:focus { outline: 2px solid blue; } -->\n.b { outline: none; }`)).toEqual([]);
    expect(rules(`.b { outline: none; }`)).toEqual(["outline-none"]);
    expect(notVisible).toMatch(/commenting out a \*focus replacement\* silences a real one/i);
  });

  // C1's sweep: the two universal claims about behaviour that survived being
  // tested. They stay in the prose unscoped because they can be demonstrated,
  // and these are the demonstrations.
  it("sweep: the universals that survived — outline-none's snippet-wide gate is total", () => {
    // "switches the rule off for every `outline: none` in it" — two of them, both gone.
    expect(designLint(`.z:focus { outline: 2px solid blue; }\n.a { outline: none; }\n.b { outline: none; }`)).toEqual([]);
    expect(designLint(`.a { outline: none; }\n.b { outline: none; }`)).toHaveLength(2);
    expect(notVisible).toMatch(/switches the rule off for every `outline: none` in the text/);
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
    expect(notVisible).toMatch(/These four read an attribute's presence rather than its content/i);
    // The entry may claim nothing about findings being real: three cases these
    // rules report are called correct markup elsewhere in this same list.
    expect(rules(`<label>Email <input type="email"></label>`)).toEqual(["control-no-label"]);
    expect(rules(`<Input type="email" />`)).toEqual(["control-no-label"]);
    expect(rules(`<button>{label}</button>`)).toEqual(["icon-button-no-label"]);
    // control-no-label reads the VALUE of `type` and exempts five, so
    // "these four read presence and never content" was false as a universal.
    for (const t of ["hidden", "submit", "button", "image", "reset"])
      expect(designLint(`<input type="${t}">`), t).toEqual([]);
    for (const t of ["text", "email", "checkbox"])
      expect(rules(`<input type="${t}">`), t).toEqual(["control-no-label"]);
    expect(notVisible).toMatch(/reads the \*value\* of `type` and exempts five of them/i);
    // The entry now enumerates the causes of silence instead of asserting a
    // meaning for it. All four causes, each demonstrated:
    expect(designLint(`<input aria-label="Email">`)).toEqual([]);        // 1. attribute present
    expect(designLint(`<img {...p} src="a.png">`)).toEqual([]);          // 2. spread, no attribute at all
    expect(designLint(`<input type="hidden">`)).toEqual([]);             // 3. exempt type value
    expect(designLint(`<button>Save</button>`)).toEqual([]);             // 4. visible text
    expect(notVisible).toMatch(/a silence from these four has at least four distinct causes/i);
    // The three retracted formulas may not return, in any of their wordings.
    // Round 3 pinned the alternation; round 4 narrowed it to `them` and left
    // "a finding from it is real" unpinned — and the shape check does not
    // reach that phrasing (no silence word, and "is real" is not a meaning
    // verb). The alternation is restored.
    expect(notVisible).not.toMatch(/a finding from (?:them|it) is real/i);
    expect(notVisible).not.toMatch(/silence from them means only .the attribute was there/i);
    expect(notVisible).not.toMatch(/grade the presence of an attribute and never its content/i);
  });

  it("13. the count is findings, not defects — one per rule per line", () => {
    expect(designLint(`<img src=a><img src=b><img src=c>`)).toHaveLength(1);
    expect(designLint(`<img src=a>\n<img src=b>`)).toHaveLength(2);
    expect(designLint(`.a { color: #fff; background: #000; }`)).toHaveLength(1);
    expect(notVisible).toMatch(/How many defects a snippet has/i);
    expect(notVisible).toMatch(/findings, not defects/i);
  });

  it("14. what is overflowing", () => {
    expect(designLint(`body { overflow-x: hidden; }`)[0].message).not.toMatch(/sticky/i);
    expect(notVisible).toMatch(/What is overflowing/i);
    expect(notVisible).toMatch(/cannot say which element exceeds the viewport/i);
  });

  describe("grid-track-no-min", () => {
    it("fires on a bare 1fr track in a snippet that renders an image", () => {
      expect(rules(`
        <div class="g"><img src="a.png" alt="a"></div>
        <style>.g { display: grid; grid-template-columns: 1fr 1fr; }</style>
      `)).toContain("grid-track-no-min");
    });

    it("does not fire when the track already carries a minimum", () => {
      expect(rules(`
        <div class="g"><img src="a.png" alt="a"></div>
        <style>.g { display: grid; grid-template-columns: minmax(0, 1fr) 1fr; }</style>
      `)).not.toContain("grid-track-no-min");
    });

    it("does not fire on a grid with no image in the snippet", () => {
      expect(rules(`.g { display: grid; grid-template-columns: 1fr 1fr; }`))
        .not.toContain("grid-track-no-min");
    });

    it("does not fire on a fixed track", () => {
      expect(rules(`
        <img src="a.png" alt="a">
        <style>.g { grid-template-columns: 200px 200px; }</style>
      `)).not.toContain("grid-track-no-min");
    });

    // The brief's own second fixture is a known false negative, not a clean
    // pass: `minmax(0, 1fr) 1fr` guards its first track and leaves its second
    // bare, and the line-level `!/minmax\(\s*0/` clause reads the whole line
    // as guarded. Kept anyway — narrowing over completeness — but the gap has
    // to be named in the disclosure rather than shipped silently.
    it("names the mixed-track gap in the disclosure", () => {
      expect(notVisible).toMatch(/one genuinely guarded track and one genuinely bare one/i);
      expect(rules(`
        <div class="g"><img src="a.png" alt="a"></div>
        <style>.g { display: grid; grid-template-columns: minmax(0, 1fr) 1fr; }</style>
      `)).not.toContain("grid-track-no-min");
    });

    // Fix round 1: any explicit, non-`auto` minimum guards a track regardless
    // of its value — `minmax(0, ...)` was the only shape the first cut
    // recognised, so `minmax(200px, 1fr)` and `minmax(min(18rem, 100%), 1fr)`
    // (a nested first argument) both read as bare and fired as false
    // positives. Each demonstrated individually, plus the exact zero-valued
    // shapes that must stay silent and the one shape (`minmax(auto, 1fr)`)
    // that is spec-equivalent to bare and must still fire.
    describe("an explicit non-auto minimum guards the track, whatever its value", () => {
      it("does not fire on a finite pixel floor", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: minmax(200px, 1fr) 1fr; }</style>
        `)).not.toContain("grid-track-no-min");
      });

      it("does not fire on a finite percentage floor", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: minmax(10%, 1fr); }</style>
        `)).not.toContain("grid-track-no-min");
      });

      it("does not fire on a nested-function first argument", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr)); }</style>
        `)).not.toContain("grid-track-no-min");
      });

      // src/layout.ts:169's own `.grid-auto` rule — the exact false positive
      // reported. Pinned to the generator's real output, not a hand-typed
      // approximation, so a future change to that line re-runs this check
      // against whatever the generator actually emits.
      it("does not fire on src/layout.ts's own auto-fit grid, verified against its real output", () => {
        const nestedMinmaxDecl = "grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));";
        expect(layoutSystemReport()).toContain(nestedMinmaxDecl);
        expect(rules(`<img src="a.png" alt="a"><style>.grid-auto { display: grid; ${nestedMinmaxDecl} }</style>`))
          .not.toContain("grid-track-no-min");
      });

      it("still stays silent on the zero-valued shapes", () => {
        for (const zero of ["0", "0px", "0%"]) {
          expect(rules(`
            <img src="a.png" alt="a">
            <style>.g { grid-template-columns: minmax(${zero}, 1fr); }</style>
          `), zero).not.toContain("grid-track-no-min");
        }
      });

      it("still fires on minmax(auto, 1fr) — spec-equivalent to bare, and the one minmax() shape that must not be treated as guarded", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: minmax(auto, 1fr); }</style>
        `)).toContain("grid-track-no-min");
      });
    });

    it("does not fire on a declaration split across lines — the same blind spot every other line rule has", () => {
      expect(rules(`
        <img src="a.png" alt="a">
        <style>.g {
          grid-template-columns:
            1fr 1fr;
        }</style>
      `)).not.toContain("grid-track-no-min");
      expect(notVisible).toMatch(/grid-template-columns.*value split the same way/i);
    });

    it("is case-sensitive on both the value and the property name — undisclosed in neither", () => {
      expect(rules(`<img src="a.png" alt="a"><style>.g { grid-template-columns: 1FR 1FR; }</style>`))
        .not.toContain("grid-track-no-min");
      expect(rules(`<img src="a.png" alt="a"><style>.g { GRID-TEMPLATE-COLUMNS: 1fr 1fr; }</style>`))
        .not.toContain("grid-track-no-min");
      expect(notVisible).toMatch(/`1FR`/);
      expect(notVisible).toMatch(/GRID-TEMPLATE-COLUMNS: 1fr 1fr;/);
    });

    // Minor, disclosed rather than implemented: the `grid-template` shorthand
    // is a distinct property this rule never reads, and parsing its
    // string/track-list grammar is out of scope for the same reason the
    // mixed-track gap above is.
    it("is silent on the grid-template shorthand, and says so", () => {
      expect(rules(`<img src="a.png" alt="a"><style>.g { grid-template: "a b" 1fr / 1fr 1fr; }</style>`))
        .not.toContain("grid-track-no-min");
      expect(notVisible).toMatch(/shorthand `grid-template` property is not read at all/i);
    });

    // Minor, disclosed rather than scoped: the `<img>` gate reads the whole
    // snippet handed to design_lint, not the grid rule's own block, so an
    // unrelated image anywhere in the file satisfies it.
    it("the <img> gate is file-wide, not grid-scoped, and says so", () => {
      expect(rules(`
        <img src="unrelated.png" alt="a">
        <div><style>.g { display: grid; grid-template-columns: 1fr 1fr; }</style></div>
      `)).toContain("grid-track-no-min");
      expect(notVisible).toMatch(/`<img>` gate is snippet-wide, not grid-scoped/i);
    });

    // Fix round 2's critical: `!/minmax\(\s*0/`'s successor,
    // `hasExplicitMinmaxFloor`, had no `i` flag either, so a track floored
    // in caps — `MINMAX(200px, 1fr)` — was read as bare and reported as a
    // defect it is not. This is the exact false-positive class round 2's
    // own fix eliminated for the numeric-value axis, reintroduced through
    // case — a rule crying wolf, not a silence, so it is fixed rather than
    // disclosed.
    describe("the minmax() guard is case-insensitive, unlike the rest of this rule's own literal text", () => {
      it("does not fire on an upper-case MINMAX with an explicit floor", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: MINMAX(200px, 1fr) 1fr; }</style>
        `)).not.toContain("grid-track-no-min");
      });

      it("does not fire on mixed-case MinMax with an explicit floor", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: MinMax(200px, 1fr) 1fr; }</style>
        `)).not.toContain("grid-track-no-min");
      });

      // The `auto` keyword has to be recognised in the same case-insensitive
      // way as the `minmax(` function name it lives inside, or the fix above
      // just relocates the same class of bug one token to the right:
      // recognising `MINMAX(` case-insensitively while still comparing its
      // argument to the lowercase literal "auto" would silence
      // `MINMAX(AUTO, 1fr)` — a track exactly as unguarded as a bare one —
      // as if it were genuinely floored.
      it("still fires on MINMAX(AUTO, 1fr) and minmax(Auto, 1fr) — case doesn't make auto a floor", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: MINMAX(AUTO, 1fr); }</style>
        `)).toContain("grid-track-no-min");
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: minmax(Auto, 1fr); }</style>
        `)).toContain("grid-track-no-min");
      });

      it("says so in the disclosure, alongside the parts of this rule that stay case-sensitive", () => {
        expect(notVisible).toMatch(/`minmax\(\)` guard inside it is deliberately case-\*insensitive\*/i);
        expect(notVisible).toMatch(/MINMAX\(200px, 1fr\)/);
        expect(notVisible).toMatch(/MINMAX\(AUTO, 1fr\)/);
      });
    });

    // Audited every other regex on this rule's path for the same question —
    // does it disagree with its neighbours about case? The property name,
    // `1fr`, and the `<img>` gate are all still case-sensitive, consistently
    // with each other and with the rest of this file; only the internal
    // `minmax()` guard needed the fix above. This is a silence (a should-
    // fire case going quiet), not a false positive, so per the same
    // reasoning as `1FR` and `GRID-TEMPLATE-COLUMNS` above, it is disclosed
    // rather than fixed.
    it("the <img> gate is also case-sensitive — an uppercase <IMG> does not satisfy it, unlike img-no-alt", () => {
      expect(rules(`<IMG src="a.png" alt="a"><style>.g { grid-template-columns: 1fr 1fr; }</style>`))
        .not.toContain("grid-track-no-min");
      expect(notVisible).toMatch(/<IMG src="a\.png">/);
    });

    // Fix round 2, residual 2: disclosed rather than fixed, in the rule's
    // own terms. The scanner has no notion of a CSS comment or a string
    // literal, so a `minmax(...)` written inside either still counts as a
    // real guard on the same line — silencing a genuinely bare, live `1fr`
    // that sits right next to it. Same family as the commented-out-code
    // blind spot already named elsewhere in this list, demonstrated here on
    // this rule specifically.
    describe("a minmax() written in a comment or a string reads as a real floor", () => {
      it("a commented-out minmax silences a real bare track on the same line", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: 1fr /* minmax(200px, 1fr) */ 1fr; }</style>
        `)).not.toContain("grid-track-no-min");
      });

      it("a minmax inside a string literal on the same line does the same", () => {
        expect(rules(`
          <img src="a.png" alt="a">
          <style>.g { grid-template-columns: 1fr; content: "minmax(200px, 1fr)"; }</style>
        `)).not.toContain("grid-track-no-min");
      });

      it("says so in the disclosure", () => {
        expect(notVisible).toMatch(/has no notion of a comment or a string/i);
      });
    });

    // Fix round 2, residual 4 (a missing test, not a defect): the balanced
    // paren walk and a naive first-`)` close genuinely disagree on this
    // input — the naive close under-consumes a bare `(0)` fragment, resumes
    // scanning inside what should still be the outer call's own first
    // argument, and re-discovers the nested `minmax(200px, 1fr)` as if it
    // were a second, independent top-level call (which IS an explicit
    // floor, so a naive walk would wrongly treat the whole line as guarded
    // here). Correct behaviour: the outer call's true first argument is
    // `auto` (a bare parenthesised group directly followed by a nested
    // `minmax(...)`, with no function name of its own, is not reachable
    // through valid CSS grammar — this exists to pin the algorithm, not to
    // model real input), so the line should be read as NOT guarded and the
    // real, standalone `1fr` at the end should fire.
    it("the balanced walk (not a naive first-close) decides a contrived nested-minmax input correctly", () => {
      expect(rules(`
        <img src="a.png" alt="a">
        <style>.g { grid-template-columns: minmax(auto, (0)minmax(200px, 1fr)) 1fr; }</style>
      `)).toContain("grid-track-no-min");
    });
  });

  describe("overflow-hidden-root", () => {
    it("fires on overflow-x: hidden under a body selector", () => {
      expect(rules(`body { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
    });

    it("fires under html and :root too", () => {
      expect(rules(`html { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
      expect(rules(`:root { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
    });

    it("does not fire on an ordinary element", () => {
      expect(rules(`.carousel { overflow-x: hidden; }`)).not.toContain("overflow-hidden-root");
    });

    it("does not fire when clip is already used", () => {
      expect(rules(`body { overflow-x: clip; }`)).not.toContain("overflow-hidden-root");
    });

    // Mutation-tested: dropping the `clip` half of this sentence broke no
    // other test in this file — nothing else reads message content — so this
    // assertion is what actually keeps the two-keyword distinction (the whole
    // point of the rule, per CSS Overflow 3 §3.1) from silently regressing to
    // a vaguer message.
    it("states the clip distinction in the message, not just in the fix", () => {
      const finding = designLint(`body { overflow-x: hidden; }`).find((f) => f.rule === "overflow-hidden-root");
      expect(finding?.message).toMatch(/overflow: clip.*not a.*scroll container/i);
    });

    // The bare `overflow: hidden` shorthand (no `-x`), not just `overflow-x`.
    it("fires on the bare overflow: hidden shorthand too", () => {
      expect(rules(`body { overflow: hidden; }`)).toContain("overflow-hidden-root");
    });

    // Selector on its own line — the common formatted-CSS shape, not just the
    // single-line fixtures above.
    it("fires when the selector sits on an earlier line than the declaration", () => {
      expect(rules(`body {\n  overflow-x: hidden;\n}`)).toContain("overflow-hidden-root");
    });

    // Both regexes on this rule's path have to agree about case, the way
    // `grid-track-no-min`'s guard and its own literal text had to be brought
    // into agreement after shipping mismatched (see that rule's own tests).
    // Here they agree by both being case-sensitive: neither the property/value
    // spelling nor the selector spelling is read case-insensitively, so an
    // uppercase form of either half is silent, consistently.
    it("is case-sensitive on both the declaration and the selector — consistently, not mismatched", () => {
      expect(designLint(`BODY { OVERFLOW-X: HIDDEN; }`)).toEqual([]);
      expect(designLint(`body { OVERFLOW-X: hidden; }`)).toEqual([]);
      expect(designLint(`BODY { overflow-x: hidden; }`)).toEqual([]);
      expect(rules(`body { overflow-x: hidden; }`)).toEqual(["overflow-hidden-root"]);
    });

    // Fed for reach, not designed for: a selector that carries the root
    // element plus something else does not satisfy the selector match, which
    // only accepts `html`/`body`/`:root` as the selector's own trailing token.
    // This is a demonstrated silence, not a claim this rule makes — recorded
    // here rather than pretended away.
    it("is silent on a compound selector that still targets body (a real gap, not a design choice this test pretends is complete)", () => {
      expect(designLint(`body.no-scroll { overflow-x: hidden; }`)).toEqual([]);
    });

    // overflow-y is just as real a way to lock the root's scroll and to
    // establish a scroll container as overflow-x — CSS Overflow 3 §3.1 does
    // not distinguish axes for that status — so this is the same defect on
    // the same property family, not a scope boundary. Fixed, not disclosed.
    it("fires on overflow-y too — CSS Overflow 3 §3.1 does not distinguish axes", () => {
      expect(rules(`body { overflow-y: hidden; }`)).toContain("overflow-hidden-root");
    });

    describe("fallback-then-override — the standard way to ship clip with a hidden fallback", () => {
      // Round-1 review Critical: this is exactly the rule's own `fix`, and the
      // first version of this rule cried wolf on it because it read `hidden`
      // without ever asking whether a later declaration for the same property,
      // in the same block, already overrides it.
      it("does not fire when a later same-property clip overrides it, same line", () => {
        expect(designLint(`body { overflow-x: hidden; overflow-x: clip; }`)).toEqual([]);
      });

      it("does not fire when the override is on its own line", () => {
        expect(designLint(`body {\n  overflow-x: hidden;\n  overflow-x: clip;\n}`)).toEqual([]);
      });

      it("does not fire for the bare overflow property overridden the same way", () => {
        expect(designLint(`body { overflow: hidden; overflow: clip; }`)).toEqual([]);
      });

      // Order matters: the cascade applies the *later* declaration, so a
      // clip that comes before a later hidden does not save it — hidden is
      // genuinely the value in effect and this must still fire.
      it("still fires when hidden comes after clip — the cascade's later value wins", () => {
        expect(rules(`body { overflow-x: clip; overflow-x: hidden; }`)).toContain("overflow-hidden-root");
      });

      it("still fires across lines with clip first", () => {
        expect(rules(`body {\n  overflow-x: clip;\n  overflow-x: hidden;\n}`)).toContain("overflow-hidden-root");
      });

      // A mismatched property does not cancel it — correctly, not as a gap:
      // overflow-y is left hidden, and the root is still a scroll container
      // on that axis alone regardless of what overflow-x becomes.
      it("does NOT cancel on a differently-spelled property — overflow-y is still hidden", () => {
        expect(rules(`body { overflow: hidden; overflow-x: clip; }`)).toContain("overflow-hidden-root");
      });

      // Round-2 review Critical: the mirror of the case above. A later BARE
      // `overflow: clip` shorthand resets both axes regardless of which
      // longhand set `hidden` — this is not a mismatched property, it is the
      // one property that always wins over an earlier longhand, and failing
      // to recognise it was a false positive (this rule crying wolf at code
      // that is not, in fact, a scroll container).
      it("DOES cancel when a later bare `overflow` shorthand overrides an earlier overflow-x longhand", () => {
        expect(designLint(`body { overflow-x: hidden; overflow: clip; }`)).toEqual([]);
      });

      it("DOES cancel when a later bare `overflow` shorthand overrides an earlier overflow-y longhand", () => {
        expect(designLint(`body { overflow-y: hidden; overflow: clip; }`)).toEqual([]);
      });

      // The two known-gap false positive above (two longhands neutralising a
      // shorthand) is unaffected by the shorthand-mirror fix: this rule only
      // reads a later *shorthand* as overriding an earlier longhand, never
      // the reverse, so it stays a disclosed gap rather than becoming one
      // more thing silently "fixed" by accident.
      it("still does NOT cancel the reverse — two later longhands do not override an earlier bare shorthand", () => {
        expect(rules(`body { overflow: hidden; overflow-x: clip; overflow-y: clip; }`)).toContain("overflow-hidden-root");
      });

      // "Same block" is scoped to the balanced braces the selector opened —
      // an override in a sibling rule must not cancel this one.
      it("an override in a different rule (a different block) does not cancel this one", () => {
        expect(rules(`body { overflow-x: hidden; }\n.other { overflow-x: clip; }`)).toContain("overflow-hidden-root");
      });

      // Known, disclosed false positive: a shorthand `hidden` that IS fully
      // neutralised, but only by two later longhands together, is not
      // recognised — see LINT_NOT_VISIBLE. Fixing it needs the
      // shorthand/longhand interaction modelled, not just a property-text
      // match.
      it("(false positive) still fires when a shorthand hidden is fully overridden by two later longhands", () => {
        expect(rules(`body { overflow: hidden; overflow-x: clip; overflow-y: clip; }`)).toContain("overflow-hidden-root");
      });

      // Fed for reach, and a real bug found and fixed by that feeding (not
      // just the override guard — the selector lookup itself): a nested rule
      // for a DIFFERENT selector, sitting inside the same top-level block,
      // used to confuse the naive `lastIndexOf("{")` search into reading the
      // nested rule's own (already-closed) brace as the enclosing one, which
      // misread the selector entirely and silenced the finding no matter
      // which side of the nested rule the `hidden` declaration was on. Fixed
      // by `enclosingOpenBrace`'s balance-tracked backward scan.
      it("a nested rule for a different selector does not confuse the enclosing-selector lookup, nested block before hidden", () => {
        expect(rules(`body { .foo { overflow-x: clip; } overflow-x: hidden; }`)).toContain("overflow-hidden-root");
      });

      it("...nor when the nested block comes after hidden, and its own clip must not cancel the outer hidden", () => {
        expect(rules(`body { overflow-x: hidden; .foo { overflow-x: clip; } }`)).toContain("overflow-hidden-root");
      });

      it("...nor when the nested block carries no override at all", () => {
        expect(rules(`body { .foo { color: red; } overflow-x: hidden; }`)).toContain("overflow-hidden-root");
      });

      // Round-2 review Critical: a real bug in the *position* lookup, not the
      // override guard. An earlier version located its own match with
      // `full.indexOf(l)`, which always resolves to the FIRST byte-identical
      // line in the snippet. Two blocks that both declare `overflow-x:
      // hidden;` with identical indentation — ordinary in real CSS — used to
      // both resolve to the first block's position: the second block's
      // selector and its own overrides were checked against the wrong block
      // entirely. Concretely, this made a genuinely-overridden `hidden` in a
      // LATER block still fire, because it was graded as if it were the
      // FIRST block's un-overridden `hidden`. Fixed by passing each line's
      // real start offset down from designLint's own iteration instead of
      // searching for it by content.
      it("a later block's overridden hidden is not confused with an earlier block's identical, un-overridden line", () => {
        const found = designLint(
          `body {\n  overflow-x: hidden;\n}\nhtml {\n  overflow-x: hidden;\n  overflow-x: clip;\n}`
        );
        // body's own hidden (line 2) is real and un-overridden: fires.
        // html's hidden (line 5) is overridden by its own clip (line 6): must
        // NOT fire — and must not be silently dropped either, it must resolve
        // to the correct (overridden) verdict for html's own block.
        expect(found.filter((f) => f.rule === "overflow-hidden-root").map((f) => f.line)).toEqual([2]);
      });
    });

    // Fed for reach: a qualified selector that still targets the root
    // element does not satisfy the selector match, which only accepts
    // `html`/`body`/`:root` as the selector's own trailing token. Real
    // selector matching needs actual parsing and risks new false positives
    // on this text-based rule — a genuine scope boundary, disclosed rather
    // than fixed.
    it("is silent on a compound selector that still targets body — a disclosed scope boundary, not a fix", () => {
      expect(designLint(`body.no-scroll { overflow-x: hidden; }`)).toEqual([]);
      expect(notVisible).toMatch(/qualified selector/i);
    });

    // Fed for reach: a selector list still reaches body/html/:root as the
    // trailing token, and fires.
    it("fires when the selector is a list that ends in the root element", () => {
      expect(rules(`html, body { overflow-x: hidden; }`)).toContain("overflow-hidden-root");
    });

    // Fed for reach: `!important` after `hidden` does not block the match —
    // the regex has no end anchor, so trailing text is irrelevant.
    it("fires with a trailing !important", () => {
      expect(rules(`body { overflow-x: hidden !important; }`)).toContain("overflow-hidden-root");
    });

    // Fed for reach: the override guard has no notion of a comment or a
    // string, the same disclosed limitation `hasExplicitMinmaxFloor` already
    // carries for `minmax(...)`. A commented-out or quoted clip is read as a
    // real, live override and wrongly silences a finding that should fire —
    // a known false negative, disclosed rather than fixed (real comment/
    // string awareness is out of scope for a regex-based override check).
    it("(false negative, disclosed) a commented-out override is read as real and wrongly silences the finding", () => {
      expect(designLint(`body { overflow-x: hidden; /* overflow-x: clip; */ }`)).toEqual([]);
    });

    it("(false negative, disclosed) a quoted clip inside a string is read as real and wrongly silences the finding", () => {
      expect(designLint(`body { overflow-x: hidden; content: "overflow-x: clip"; }`)).toEqual([]);
      expect(notVisible).toMatch(/comment or a string/i);
    });

    // Round-2 review Critical, disclosed rather than fixed: a brace hiding in
    // a string or comment BEFORE the matched declaration defeats
    // enclosingOpenBrace's balance count itself, silencing the rule outright
    // — distinct from the already-disclosed override-guard blindness above,
    // which only reads text after the match and misreads an override rather
    // than the selector lookup. Fixing this needs real string/comment
    // awareness in the backward scan, the same scope boundary this file
    // already declines elsewhere (`hasExplicitMinmaxFloor`, `braceEnd`).
    it("(false negative, disclosed) a brace inside a string before the match silences the rule via the selector lookup", () => {
      expect(designLint(`body { content: "}"; overflow-x: hidden; }`)).toEqual([]);
    });

    it("(false negative, disclosed) a brace inside a comment before the match silences the rule the same way", () => {
      expect(designLint(`body { /* } */ overflow-x: hidden; }`)).toEqual([]);
      expect(notVisible).toMatch(/hiding in a string or a comment/i);
    });

    // Whole-branch review, Important: the same-block fallback guard was
    // written for one spelling of the fallback-then-override idiom, and
    // nobody asked what the others were. Both remaining standard spellings
    // gate on a feature query, and the rule fired on both — on code where the
    // author has done exactly what the rule's own `fix` asks for, and said so
    // more explicitly than the same-block form does. Every fixture in this
    // block carries its own control, because the failure mode of a "stand
    // down" fix is standing down for everything.
    describe("the two feature-query spellings of the same fallback idiom", () => {
      it("is silent when the hidden is gated on the absence of clip", () => {
        expect(designLint(`@supports not (overflow: clip) {\n  body { overflow-x: hidden; }\n}`)).toEqual([]);
      });

      it("is silent when a later @supports block upgrades the same root to clip", () => {
        expect(designLint(
          `body { overflow-x: hidden; }\n@supports (overflow: clip) {\n  body { overflow-x: clip; }\n}`
        )).toEqual([]);
      });

      // Controls. The stand-down is keyed to a feature query *about overflow
      // clipping*, and to a clip actually being declared — not to the mere
      // presence of an at-rule, and not to text before the match.
      it("still fires inside a feature query about something else", () => {
        expect(rules(`@supports (display: grid) {\n  body { overflow-x: hidden; }\n}`))
          .toContain("overflow-hidden-root");
      });

      it("still fires when the later @supports block declares no clip", () => {
        expect(rules(`body { overflow-x: hidden; }\n@supports (overflow: clip) {\n  body { border: 0; }\n}`))
          .toContain("overflow-hidden-root");
      });

      it("still fires when the @supports upgrade comes BEFORE the hidden — the cascade decides", () => {
        expect(rules(`@supports (overflow: clip) {\n  body { overflow-x: clip; }\n}\nbody { overflow-x: hidden; }`))
          .toContain("overflow-hidden-root");
      });

      // Disclosed cost of not parsing `not`/`and`/`or`: the contradictory
      // spelling, which serves `hidden` precisely to the engines that support
      // `clip`, goes silent with the correct one.
      it("(false negative, disclosed) the contradictory polarity is silent too", () => {
        expect(designLint(`@supports (overflow: clip) {\n  body { overflow-x: hidden; }\n}`)).toEqual([]);
        expect(notVisible).toMatch(/without reading the `not`/);
      });

      // Disclosed cost of not re-matching the selector one level in.
      it("(false negative, disclosed) an upgrade of some other element also stands the rule down", () => {
        expect(designLint(
          `body { overflow-x: hidden; }\n@supports (overflow: clip) {\n  .sidebar { overflow-x: clip; }\n}`
        )).toEqual([]);
        expect(notVisible).toMatch(/the selector inside that block is \*not\* checked/);
      });
    });

    // Whole-branch review, Minor: an at-rule *prelude* nested inside the
    // matched block sat at depth 0 after `stripNestedBlocks` removed only the
    // block's contents, so the override regex read a feature-query condition
    // as a live declaration and cancelled a finding on a block that declares
    // no clip at all. The prelude is now cut with the block it introduces.
    it("a nested @supports prelude is not read as a live clip override", () => {
      expect(rules(`body {\n  overflow-x: hidden;\n  @supports (overflow: clip) { border: 0; }\n}`))
        .toContain("overflow-hidden-root");
      // Vacuity control: identical block, prelude removed — must also fire,
      // so the assertion above is not passing for an unrelated reason.
      expect(rules(`body {\n  overflow-x: hidden;\n  border: 0;\n}`)).toContain("overflow-hidden-root");
      // …and the same shape for a nested selector, the other prelude kind.
      expect(rules(`body {\n  overflow-x: hidden;\n  [data-overflow="clip"] { border: 0; }\n}`))
        .toContain("overflow-hidden-root");
      // The nested-block guard it must not break: a clip that really is
      // nested still must not cancel, and a real same-block clip still must.
      expect(rules(`body { overflow-x: hidden; .foo { overflow-x: clip; } }`)).toContain("overflow-hidden-root");
      expect(designLint(`body { overflow-x: hidden; overflow-x: clip; }`)).toEqual([]);
    });
  });

  // Whole-branch review, Minor M4: the disclosure entries are per-rule, and
  // a caller reads a report all at once. Measured before this fix round, a
  // stylesheet in which every decision was right drew four findings, two of
  // them `warning` — three individually disclosed, and disclosed well, but
  // adding up to "your correct stylesheet has four problems". Each of the
  // four was a rule crying wolf and each was fixed; this pins the aggregate,
  // which no per-rule test does.
  it("a stylesheet where every decision is right draws nothing at all", () => {
    const correct = [
      `@layer tokens {`,
      `  :root {`,
      `    --color-surface: #ffffff;`,
      `    --border-color: #e5e7eb;`,
      `    --radius-md: 8px;`,
      `    --space-3: 12px;`,
      `  }`,
      `}`,
      ``,
      `@supports not (overflow: clip) {`,
      `  body { overflow-x: hidden; }`,
      `}`,
      `@supports (overflow: clip) {`,
      `  body { overflow-x: clip; }`,
      `}`,
      ``,
      `.grid {`,
      `  display: grid;`,
      `  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));`,
      `  gap: var(--space-3);`,
      `}`,
      ``,
      `.card {`,
      `  background: var(--color-surface);`,
      `  border: 1px solid var(--border-color);`,
      `  border-radius: var(--radius-md);`,
      `  padding: var(--space-3);`,
      `}`,
      ``,
      `.button {`,
      `  min-height: 44px;`,
      `  transition: transform 200ms ease, opacity 200ms ease;`,
      `}`,
      `.button:focus-visible {`,
      `  outline: 2px solid var(--color-text);`,
      `  outline-offset: 2px;`,
      `}`,
      ``,
      `.badge { border-radius: 9999px; }`,
      ``,
      `@keyframes fade {`,
      `  from { opacity: 0; transform: translateY(4px); }`,
      `  to { opacity: 1; transform: none; }`,
      `}`,
      `@media (prefers-reduced-motion: reduce) {`,
      `  .button { transition-duration: 1ms; }`,
      `  .fade { animation: none; }`,
      `}`,
    ].join("\n");
    expect(designLint(correct)).toEqual([]);
    // Vacuity control: the same file with one decision made wrong at a time.
    // If the fixture above were silent for some structural reason rather than
    // because it is correct, these would be silent too.
    expect(rules(correct.replace(`min-height: 44px;`, `height: 44px;`))).toContain("fixed-height-text");
    expect(rules(correct.replace(`border-radius: 9999px`, `border-radius: 7px`))).toContain("magic-number-radius");
    // (`border: 1px solid #e5e7eb` is *not* the mutation here: the rule wants
    // the hex directly after the property, which is disclosed above. This is.)
    expect(rules(correct.replace(`background: var(--color-surface);`, `background: #ffffff;`))).toContain("hardcoded-color");
    expect(rules(correct.replace(`transform 200ms ease, opacity 200ms ease`, `all 200ms ease`))).toContain("transition-all");
    expect(rules(correct.replace(`transform: translateY(4px)`, `margin: 4px`))).toContain("animates-layout-property");
    expect(LINT_CLOSING).toMatch(/is expected to draw \*\*nothing\*\*/);
  });

  describe("motion rules", () => {
    describe("motion-no-reduced-cover", () => {
      it("flags a keyframe animation with no reduced-motion cover", () => {
        expect(rules(`
          @keyframes slide {
            from { transform: translateY(8px); }
            to { transform: none; }
          }
          .card { animation: slide 200ms ease-out; }
        `)).toContain("motion-no-reduced-cover");
      });

      it("does not flag it when the file honours the preference", () => {
        expect(rules(`
          @keyframes slide {
            from { transform: translateY(8px); }
            to { transform: none; }
          }
          .card { animation: slide 200ms ease-out; }
          @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
        `)).not.toContain("motion-no-reduced-cover");
      });

      // Fed for reach: several real spellings of the media query, not just
      // the one shape in the fixture above. The check is a plain substring
      // search on `prefers-reduced-motion`, so all of these must read as
      // covered regardless of surrounding syntax.
      it("recognises coverage across several spellings of the query", () => {
        const covered = [
          `@media(prefers-reduced-motion:reduce){.card{animation:none}}`,
          `@media screen and (prefers-reduced-motion: reduce) { .card { animation: none; } }`,
          `@media not all and (prefers-reduced-motion: no-preference) { .card { animation: slide 200ms ease-out; } }`,
          `@media\n  (prefers-reduced-motion: reduce)\n{ .card { animation: none; } }`,
        ];
        for (const query of covered) {
          expect(rules(`
            @keyframes slide {
            from { transform: translateY(8px); }
            to { transform: none; }
          }
            .card { animation: slide 200ms ease-out; }
            ${query}
          `), query).not.toContain("motion-no-reduced-cover");
        }
      });

      it("flags a bare @keyframes block on its own, not just the animation: declaration", () => {
        expect(rules(`@keyframes slide {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}`))
          .toContain("motion-no-reduced-cover");
      });

      // Tailwind's animate-* utilities are not read as "an animation" by this
      // rule at all — its trigger is the CSS `animation:` property and
      // `@keyframes`, not a class name — so a pure-Tailwind animated element
      // is silent from this rule regardless of a motion-reduce: variant
      // beside it. Demonstrated so the silence is not mistaken for coverage.
      // Whole-branch review, Important: fix round 1 added `(?!\s*none\b)` so
      // an inert reset would stop firing, and the exclusion read the value
      // immediately after the colon — so the quote CSS-in-JS puts there
      // defeated it and the exact defect came back in the other spelling.
      // Every assertion below has its animating counterpart beside it.
      it("the inert reset is excluded in both spellings, quoted and not", () => {
        for (const inert of [
          `.a { animation: none; }`,
          `.a { animation-name: none; }`,
          `<div style={{ animation: "none" }} />`,
          `<div style={{ animation: 'none' }} />`,
          `<div style={{ animationName: "none" }} />`,
        ]) expect(designLint(inert), inert).toEqual([]);
        for (const live of [
          `.a { animation: slide 1s; }`,
          `<div style={{ animation: "slide 1s" }} />`,
          `<div style={{ animation: 'slide 1s' }} />`,
        ]) expect(rules(live), live).toContain("motion-no-reduced-cover");
        expect(notVisible).toMatch(/optionally behind one opening quote/);
      });

      it("does not recognise a Tailwind animate-* utility as an animation at all", () => {
        expect(rules(`<div class="animate-bounce motion-reduce:animate-none"></div>`))
          .not.toContain("motion-no-reduced-cover");
      });

      it("is case-sensitive on both the trigger and the coverage check", () => {
        expect(designLint(`.card { ANIMATION: slide 200ms ease-out; }`)).toEqual([]);
        expect(rules(`
          .card { animation: slide 200ms ease-out; }
          @media (PREFERS-REDUCED-MOTION: reduce) { .card { animation: none; } }
        `)).toContain("motion-no-reduced-cover");
      });

      // Fix round 1 Critical-adjacent: `animation: none;` is an ordinary
      // reset written outside any motion context — a real, common pattern
      // (e.g. cancelling an inherited animation on hover-out) — and the
      // first cut fired on it regardless, because the trigger read only the
      // property name, never its value.
      describe("fix round 1: an inert animation is not a real animation", () => {
        it("(fixed) does not fire on animation: none", () => {
          expect(rules(`.a { animation: none; }`)).not.toContain("motion-no-reduced-cover");
        });

        it("(fixed) reads the animation-name longhand, not just the shorthand", () => {
          expect(rules(`.card { animation-name: slide; animation-duration: 200ms; }`))
            .toContain("motion-no-reduced-cover");
        });

        it("does not treat animation-name: none as a real animation either", () => {
          expect(rules(`.a { animation-name: none; }`)).not.toContain("motion-no-reduced-cover");
        });

        // Adversarial probe: animation-duration alone, with no
        // animation-name anywhere, names no real animation — the longhand
        // fix must not turn this into a false positive by reading
        // animation-duration as if it were animation-name.
        it("does not treat animation-duration alone as a real animation", () => {
          expect(rules(`.a { animation-duration: 200ms; }`)).not.toContain("motion-no-reduced-cover");
        });

        // Adversarial probe: animation-play-state alone, same reasoning.
        it("does not treat animation-play-state alone as a real animation", () => {
          expect(rules(`.a { animation-play-state: paused; }`)).not.toContain("motion-no-reduced-cover");
        });

        // Disclosed, not chased: only a literal `none` is excluded.
        // `initial`/`unset`/`inherit` resolve to the same no-animation state
        // and are not, so each still fires.
        it("(disclosed gap) still fires on animation: initial, which also resolves to no animation", () => {
          expect(rules(`.a { animation: initial; }`)).toContain("motion-no-reduced-cover");
          expect(notVisible).toMatch(/animation: initial;.*animation: unset;.*animation: inherit;/);
        });

        // Adversarial probe that found a second, related instance of the
        // same gap: a duration-only shorthand also resets animation-name to
        // its own initial value (none), so this is inert too, and is not
        // excluded either.
        it("(disclosed gap) still fires on animation: 0s, a duration-only shorthand that also names no animation", () => {
          expect(rules(`.a { animation: 0s; }`)).toContain("motion-no-reduced-cover");
          expect(notVisible).toMatch(/animation: 0s;.*sets only a duration/);
        });

        // Regression guard against an over-broad exclusion: the fix must
        // reject only the literal value `none`, not merely any value that
        // happens to start the same way — a real animation name is free to
        // start with any letter, "n" included.
        it("still fires on a real animation whose name happens to start with n, like none does", () => {
          expect(rules(`.card { animation: nudge-in 200ms ease; }`)).toContain("motion-no-reduced-cover");
        });
      });
    });

    describe("animates-layout-property", () => {
      it("flags animating a layout property", () => {
        expect(rules(`.a { transition: width 200ms ease; }`)).toContain("animates-layout-property");
        expect(rules(`.b { transition: opacity 200ms ease; }`)).not.toContain("animates-layout-property");
      });

      // A transition naming both a layout property and a composited one is
      // still animating the layout one — the composited property alongside
      // it does not make the declaration safe, in either order.
      it("still fires when a composited property is named alongside the layout one, in either order", () => {
        expect(rules(`.a { transition: width 200ms ease, opacity 200ms ease; }`)).toContain("animates-layout-property");
        expect(rules(`.a { transition: opacity 200ms ease, width 200ms ease; }`)).toContain("animates-layout-property");
      });

      it("does not fire on the composited properties, several spellings", () => {
        for (const decl of [
          `.a { transition: opacity 200ms ease; }`,
          `.a { transition: transform 200ms ease; }`,
          `.a { transition: opacity 200ms ease, transform 200ms ease; }`,
          `.a { transition-property: opacity; }`,
          `.a { transition-property: transform, opacity; }`,
        ]) expect(rules(decl), decl).not.toContain("animates-layout-property");
      });

      it("reads the transition-property longhand too", () => {
        expect(rules(`.a { transition-property: width; }`)).toContain("animates-layout-property");
      });

      // Whole-branch review, Important: the value span was `[^;]*`, written
      // for CSS, where `;` ends a declaration. A JavaScript style object ends
      // it with a comma, so the span ran past it into the next key and any
      // sibling named after one of the eight words supplied the match — on a
      // component that animates nothing but opacity. React inline styles,
      // emotion object syntax, CVA variant tables and theme objects are all
      // that shape; template-literal CSS-in-JS uses `;` and was already safe,
      // which is exactly how the class was missed.
      describe("the value span stops at the value, not at the next object key", () => {
        it("does not fire on a style object whose sibling key is a layout property", () => {
          for (const src of [
            `<div style={{ transition: "opacity 200ms ease", margin: 0 }} />`,
            `<div style={{ transition: "opacity 200ms", padding: 12 }} />`,
            `<div style={{ transition: "opacity 200ms", top: 0 }} />`,
            `<div style={{ transition: 'opacity 200ms', margin: 0 }} />`,
            `const s = { transition: "opacity 200ms", width: 100 };`,
          ]) expect(designLint(src), src).toEqual([]);
        });

        // Vacuity controls, both directions. The quoted value is still read,
        // and a genuine comma-separated CSS transition list still fires — so
        // the fix is not "stop reading past a comma".
        it("still fires when the layout property is inside the quoted value", () => {
          expect(rules(`<div style={{ transition: "width 200ms" }} />`)).toContain("animates-layout-property");
          expect(rules(`<div style={{ transition: 'height 200ms' }} />`)).toContain("animates-layout-property");
        });

        it("still fires on a genuine comma-separated CSS transition list", () => {
          expect(rules(`.a { transition: opacity 200ms, width 200ms; }`)).toContain("animates-layout-property");
        });

        it("template-literal CSS-in-JS, which separates with a semicolon, stays silent", () => {
          expect(designLint("const s = css`transition: opacity 200ms; margin: 0;`")).toEqual([]);
        });

        // Disclosed cost: an unquoted value has neither a quote nor a `;` to
        // bound it, so the sibling key is still read as part of the value.
        it("(false positive, disclosed) an unquoted object value is still unbounded", () => {
          expect(rules(`<div style={{ transition: theme.motion.fast, margin: 0 }} />`))
            .toContain("animates-layout-property");
          expect(notVisible).toMatch(/has no quotes to bound it and no `;` to stop it/);
        });
      });

      // Every @keyframes fixture below is written the way a stylesheet is
      // written — the at-rule opener, the keyframe selectors and the
      // declarations on separate lines. That is not cosmetic. The keyframes
      // alternative used to be a single-line regex requiring `@keyframes`, its
      // `{` and the moving declaration to share one physical line, so it was
      // unreachable on any formatted stylesheet — and every fixture that had
      // ever exercised it was a collapsed one-liner, which is why nothing
      // caught it: the rule and its tests shared one blind spot, so each kept
      // agreeing with the other. The collapsed form is kept in exactly one
      // test below, as the *control* proving formatting is now irrelevant.
      it("reads a @keyframes body animating a layout property, however it is formatted", () => {
        expect(rules(`@keyframes grow {\n  from { width: 0; }\n  to { width: 100%; }\n}`))
          .toContain("animates-layout-property");
        expect(rules(`@keyframes grow { from { width: 0; } to { width: 100%; } }`))
          .toContain("animates-layout-property");
      });

      // The finding lands on the moving declaration's own line — the line a
      // caller has to change — not on the at-rule opener.
      it("reports the declaration's line, not the @keyframes opener's", () => {
        const found = designLint(`@keyframes grow {\n  from { width: 0; }\n  to { width: 100%; }\n}`)
          .filter((f) => f.rule === "animates-layout-property");
        expect(found.map((f) => f.line)).toEqual([2, 3]);
      });

      // The keyframes alternative reads the same eight names the transition
      // alternative does — right/bottom/margin/padding included, not just
      // the first four. Fed as formatted blocks, which is the input class the
      // one-line version of these four fixtures never reached.
      it("the keyframes form reads right, bottom, margin and padding too", () => {
        for (const prop of ["right", "bottom", "margin", "padding"]) {
          const css = `@keyframes x {\n  from { ${prop}: 0; }\n  to { ${prop}: 10px; }\n}`;
          expect(rules(css), css).toContain("animates-layout-property");
        }
      });

      // Depth is not read either: a declaration nested further inside the
      // keyframes block is still inside it.
      it("reads a layout declaration at any depth inside the keyframes block", () => {
        expect(rules(`@keyframes x {\n  from {\n    margin: 0;\n  }\n}`)).toContain("animates-layout-property");
      });

      // …and the walk stops at the block. A layout declaration after the
      // keyframes block has closed is an ordinary declaration, not motion.
      it("does not fire on a layout declaration outside the keyframes block", () => {
        expect(rules(`@keyframes x {\n  from { opacity: 0; }\n}\n.a {\n  margin: 0;\n}`))
          .not.toContain("animates-layout-property");
      });

      it("does not fire on a keyframes body that only animates composited properties", () => {
        expect(rules(`@keyframes slide {\n  from { transform: translateY(8px); opacity: 0; }\n  to { transform: none; opacity: 1; }\n}`))
          .not.toContain("animates-layout-property");
      });

      it("is case-sensitive on all three regexes", () => {
        expect(designLint(`.a { TRANSITION: WIDTH 200ms ease; }`)).toEqual([]);
        expect(designLint(`@KEYFRAMES grow {\n  from { width: 0; }\n  to { width: 100%; }\n}`)).toEqual([]);
      });

      // Fix round 1 Critical: `\b` treats `-` as a boundary, so the bare
      // word match used to fire on anything whose name merely *ends* in a
      // watched word — an ordinary custom-property (design-token) name,
      // not a layout property at all. `--foo` (no shared suffix with any
      // watched word) was the probe that shipped as "safe"; these are the
      // probes that actually could fail, and did before the fix.
      describe("fix round 1 Critical: a custom property is not a layout property", () => {
        it("(fixed) does not fire on --card-width, --nav-height or --sidebar-margin", () => {
          for (const decl of [
            `.a { transition: --card-width 200ms; }`,
            `.a { transition: --nav-height 200ms; }`,
            `.a { transition: --sidebar-margin 200ms; }`,
          ]) expect(rules(decl), decl).not.toContain("animates-layout-property");
        });

        it("the same exclusion applies to the keyframes form", () => {
          expect(rules(`@keyframes x {\n  from { --card-width: 10px; }\n  to { --card-width: 100px; }\n}`))
            .not.toContain("animates-layout-property");
          // Vacuity control: the identical block moving a real `width`.
          expect(rules(`@keyframes x {\n  from { width: 10px; }\n  to { width: 100px; }\n}`))
            .toContain("animates-layout-property");
        });

        // The fix must not over-reach: a custom property separated from a
        // real layout property by a delimiter it cannot cross still leaves
        // the real property matched.
        it("still fires on a real property listed after an unrelated custom property", () => {
          expect(rules(`.a { transition: --foo, width 200ms; }`)).toContain("animates-layout-property");
        });

        // Legitimate compound property names must not be caught by the same
        // fix — none of these starts `--`, so neither exclusion applies.
        it("still fires on legitimate compound property names — regression guard", () => {
          for (const decl of [
            `.a { transition: width 200ms; }`,
            `.a { transition: min-width 200ms; }`,
            `.a { transition: max-width 200ms; }`,
            `.a { transition: border-right-width 200ms; }`,
          ]) expect(rules(decl), decl).toContain("animates-layout-property");
        });
      });

      // Fix round 1 Important: a one-token fix, not a parsing problem — the
      // same lookbehind shape that excludes a custom property also excludes
      // this specific real property, via its own alternative.
      it("(fixed) does not fire on outline-width, which does not actually affect layout", () => {
        expect(rules(`.a { transition: outline-width 200ms ease; }`)).not.toContain("animates-layout-property");
      });

      // Adversarial probes beyond the two reported defects: properties that
      // could plausibly have been swept up by either fix, or by the
      // original word list, but should not fire.
      it("stays silent on properties the fix could plausibly have over-reached into", () => {
        expect(rules(`.a { transition: background-position 200ms; }`)).not.toContain("animates-layout-property");
        expect(rules(`.a { transition: -webkit-transform 200ms; }`)).not.toContain("animates-layout-property");
      });

      // Known, disclosed miss (unaffected by the fix): inset affects layout
      // exactly like top/left/right/bottom, but is not on the watched list.
      it("(known miss, disclosed) does not fire on inset, which is not on the watched list", () => {
        expect(rules(`.a { transition: inset 200ms; }`)).not.toContain("animates-layout-property");
        expect(notVisible).toMatch(/`inset`, `gap`/);
      });
    });

    describe("transition-all", () => {
      it("flags transition: all and its Tailwind spelling", () => {
        expect(rules(`.a { transition: all 200ms ease; }`)).toContain("transition-all");
        expect(rules(`<div class="transition-all duration-200"></div>`)).toContain("transition-all");
      });

      // Fed for reach: a variant-prefixed Tailwind utility, chained or not.
      // motion-safe: only gates *when* the utility applies — it does not
      // change what naming `all` animates for anyone it does apply to — so
      // it must still fire.
      it("still fires through Tailwind variant prefixes, chained or not", () => {
        expect(rules(`<div class="motion-safe:transition-all"></div>`)).toContain("transition-all");
        expect(rules(`<div class="sm:hover:transition-all"></div>`)).toContain("transition-all");
      });

      it("does not fire on the disable-it Tailwind spelling", () => {
        expect(rules(`<div class="motion-reduce:transition-none"></div>`)).not.toContain("transition-all");
      });

      it("does not fire on a hyphenated lookalike class", () => {
        expect(rules(`<div class="transition-allowed"></div>`)).not.toContain("transition-all");
      });

      // Deliberately not exempted: nesting inside a reduced-motion query
      // does not change what this line rule reads. The idiomatic kill switch
      // is `transition: none` or a near-zero duration, not `transition: all
      // <duration>`, so a real transition: all inside the block still names
      // every property and must still fire.
      it("still fires inside a @media (prefers-reduced-motion: reduce) block", () => {
        expect(rules(`@media (prefers-reduced-motion: reduce) { .a { transition: all 0.01ms; } }`))
          .toContain("transition-all");
      });

      it("is case-sensitive on both alternatives", () => {
        expect(designLint(`.a { TRANSITION: ALL 200ms ease; }`)).toEqual([]);
        expect(designLint(`<div class="TRANSITION-ALL"></div>`)).toEqual([]);
      });

      // Fix round 1: the longhand was invisible for the same reason
      // animates-layout-property already reads both forms; closed the same
      // one-token way (`-property` optional), not diverging from the
      // sibling rule's own handling.
      it("(fixed) reads the transition-property longhand for all too", () => {
        expect(rules(`.a { transition-property: all; }`)).toContain("transition-all");
      });

      // Adversarial probe: a vendor-prefixed shorthand is a different shape
      // from the longhand above, fed separately because "reads more forms"
      // does not by itself confirm this one specific reach.
      it("still fires through a vendor-prefixed shorthand", () => {
        expect(rules(`.a { -webkit-transition: all 200ms; }`)).toContain("transition-all");
      });

      // Minor, disclosed rather than fixed: no notion of a string or a URL,
      // the same family of blindness already disclosed for other rules in
      // this file. Recorded rather than silently accepted.
      it("(disclosed, minor) fires inside a string, not a real declaration", () => {
        expect(rules(`.a { content: "transition: all 200ms"; }`)).toContain("transition-all");
        expect(notVisible).toMatch(/never reaches a real declaration/);
      });

      it("(disclosed, minor) fires inside a url() too", () => {
        expect(rules(`.a { background: url(transition:all.png); }`)).toContain("transition-all");
      });
    });

    it("the three motion rules are named in the split-declaration disclosure", () => {
      expect(notVisible).toContain("`motion-no-reduced-cover`");
      expect(notVisible).toContain("`animates-layout-property`");
      expect(notVisible).toContain("`transition-all`");
    });

    it("discloses what an animation being reduced actually means, and that runtime motion is invisible", () => {
      expect(notVisible).toMatch(/looks for the media feature anywhere in the source it was given/i);
      expect(notVisible).toMatch(/anything animated from javascript, a motion library, or swiftui/i);
    });

    // Fix round 1: five new or rewritten disclosures — the inert-value gap,
    // the narrowed (not eliminated) word-match false positive, and the
    // string/URL blindness for transition-all.
    it("discloses the fix-round-1 residual gaps, not just the fixes", () => {
      expect(notVisible).toMatch(/animation: initial;.*animation: unset;.*animation: inherit;/);
      expect(notVisible).toMatch(/animation: 0s;.*sets only a duration/);
      expect(notVisible).toMatch(/narrowed by a fix round, not eliminated/);
      expect(notVisible).toMatch(/A string or a URL, for `transition-all`/);
    });
  });
});

// lint.ts had no suite checking that its rules' `doc` ids actually resolve to
// a real knowledge document — every sibling rule module (apple.ts, seo.ts,
// perf.ts, generic.ts) has one, and this one's absence was itself a false
// claim in an earlier round: a brief for this file asserted the check
// existed here when it did not, and the ids were verified by hand instead.
//
// Round 1 of this suite swept doc ids from *fired findings*, produced from a
// hand-built `KITCHEN_SINK` fixture. Review found the hole in that design
// directly: a new rule with a bogus `doc` id and a novel trigger, added
// without also touching `KITCHEN_SINK`, made the whole suite pass — 4/4,
// silent — because a rule that never fires contributes no finding for the
// resolve-check to see. Forgetting to extend a fixture is the likely real
// mistake, and it produced total silence rather than a failure.
//
// Round 2 (this one) closed a second hole, found by the whole-branch review:
// resolution is not the claim. `overflow-hidden-root` cited `spacing-layout`,
// which resolves, and which names the *symptom* people reach for `overflow-x:
// hidden` to hide — "Horizontal page scroll at any breakpoint" — while saying
// nothing at all about `hidden` versus `clip` or about scroll containers. The
// rule's substantive source lived only in a code comment no caller ever sees.
// `tests/apple.test.ts` had carried the stronger guard since the generic-design
// and SEO packages, for the same reason and after the same mistake, and the
// comment here described this suite as though it already had parity with its
// siblings. It does now: `CLAIM_VOCABULARY` below pins, for every rule, a
// phrase from the cited document that carries that rule's own claim — not a
// word the document merely contains, which is the way this kind of table goes
// vacuous.
//
// This version reads `LINE_RULES` and `SOURCE_RULE_DOCS` directly instead —
// both exported from lint.ts for exactly this — so there is no fixture to
// forget: a new `LINE_RULES` entry (which is where Task 5's three citations,
// and any line rule after it, will land) or a new `SOURCE_RULE_DOCS` key is
// swept in by construction, the moment it exists, before anyone writes a
// single test fixture for it. `KITCHEN_SINK` is kept below only as a
// behavioural cross-check — it confirms the ids actually declared are the
// ones actually emitted for the rules that exist today — not as the
// resolve-check's source of truth.
describe("every doc a rule cites resolves to a real knowledge document", () => {
  const docs = loadKnowledge(join(__dirname, "..", "knowledge"));

  // Derived from the rule definitions themselves, not hand-typed: adding a
  // rule to `LINE_RULES` or a key to `SOURCE_RULE_DOCS` changes this list
  // automatically, so it cannot go stale the way a hand-maintained id list
  // (the `CLAIM_VOCABULARY` tables in seo.test.ts/perf.test.ts/generic.test.ts
  // are hand-typed and accept that trade-off) can.
  const RULE_DOCS: { rule: string; doc?: string }[] = [
    ...LINE_RULES.map((r) => ({ rule: r.id, doc: r.doc })),
    ...Object.entries(SOURCE_RULE_DOCS).map(([rule, doc]) => ({ rule, doc })),
  ];

  it("loads the knowledge base, so the checks below are not vacuous", () => {
    expect(docs.length).toBeGreaterThan(0);
  });

  it("has more than a handful of rules, so this is not vacuously true either", () => {
    expect(RULE_DOCS.length).toBeGreaterThanOrEqual(13);
  });

  it("every rule declares a doc id — none is missing or blank", () => {
    expect(RULE_DOCS.filter((r) => !r.doc).map((r) => r.rule)).toEqual([]);
  });

  it("resolves every declared id — reading the rule definitions, not fired findings", () => {
    const dangling = RULE_DOCS.filter((r) => r.doc && !findDoc(docs, r.doc)).map((r) => `${r.rule} → ${r.doc}`);
    expect(dangling).toEqual([]);
  });

  // Behavioural cross-check, not the resolve-check itself (see the block
  // comment above): confirms the declared ids are the ones a real run
  // actually emits, for every rule id that exists today. One snippet that
  // draws every rule at least once; each line is self-contained (its own
  // selector/tag, its own closing brace) so no rule's suppressor or
  // full-text gate accidentally swallows another's.
  const KITCHEN_SINK = [
    `.hc { color: #ff0000; }`,
    `.pf { font-size: 14px; }`,
    `.imp { color: red !important; }`,
    `.fh { height: 40px; }`,
    `<div tabIndex={5}>x</div>`,
    `.mr { border-radius: 6px; }`,
    `<img src="a.png">`,
    `.grid { grid-template-columns: 1fr 1fr; }`,
    `body { overflow-x: hidden; }`,
    `<div onClick={go}>x</div>`,
    `<button><Icon/></button>`,
    `<input />`,
    `.a { outline: none; }`,
    `.mo { animation: slide 200ms ease-out; }`,
    `.al { transition: width 200ms ease; }`,
    `.ta { transition: all 200ms ease; }`,
  ].join("\n");

  it("the fixture fires every declared rule id, and no undeclared one", () => {
    const fired = new Set(designLint(KITCHEN_SINK).map((f) => f.rule));
    const declared = new Set(RULE_DOCS.map((r) => r.rule));
    expect([...declared].filter((r) => !fired.has(r))).toEqual([]);
    expect([...fired].filter((r) => !declared.has(r))).toEqual([]);
  });

  // One phrase per rule, taken from the cited document, carrying *that rule's*
  // claim. The failure mode this guards against is the loose pattern: /focus/i
  // matches most of `accessibility`, so every rule in this table could be
  // re-pointed at it and a lax vocabulary would still pass. Each entry below is
  // a clause, not a keyword — a rule re-pointed at any other document in the
  // knowledge base fails immediately.
  const CLAIM_VOCABULARY: Record<string, RegExp> = {
    "hardcoded-color": /never primitives, never raw hexes/,
    "px-font-size": /Use relative units \(rem\) for font sizes on web/,
    "important-overuse": /Treat `!important` as a smell everywhere except intentional utility layers/,
    "fixed-height-text": /must grow with their content/,
    "positive-tabindex": /logical tab order following visual order/,
    "magic-number-radius": /Mixed radii \(sharp inputs next to very round cards next to pill buttons\) look accidental/,
    "grid-track-no-min": /`repeat\(auto-fit, minmax\(280px, 1fr\)\)` gives breakpoint-free responsive grids/,
    "overflow-hidden-root": /`clip` forbids scrolling entirely, so the box is \*\*not\*\* a scroll container/,
    "motion-no-reduced-cover": /Respect `prefers-reduced-motion`/,
    "animates-layout-property": /Animating width\/height\/top\/margin causes jank/,
    "transition-all": /\*\*Only `transform` and `opacity`\*\* \(GPU-composited\)/,
    "img-no-alt": /Images: meaningful → descriptive `alt`; decorative → `alt=""`/,
    "clickable-div": /Everything operable by keyboard/,
    "icon-button-no-label": /\*\*Icon-only controls need an accessible name:\*\*/,
    "control-no-label": /Label ↔ input programmatic association is mandatory/,
    "outline-none": /`:focus-visible` ring on every interactive element/,
  };

  it("covers every rule that declares a doc — no rule escapes the claim check", () => {
    const declared = RULE_DOCS.map((r) => r.rule);
    expect(declared.filter((r) => !(r in CLAIM_VOCABULARY))).toEqual([]);
    expect(Object.keys(CLAIM_VOCABULARY).filter((r) => !declared.includes(r))).toEqual([]);
  });

  it.each(Object.entries(CLAIM_VOCABULARY))("%s cites a document that actually makes the claim", (rule, vocabulary) => {
    const cited = RULE_DOCS.find((r) => r.rule === rule)?.doc;
    expect(cited, `${rule} declares no doc id`).toBeTruthy();
    const doc = findDoc(docs, cited!);
    expect(doc, `${rule} → ${cited} does not resolve`).toBeTruthy();
    expect(vocabulary.test(doc!.body), `${cited} never carries ${vocabulary}`).toBe(true);
  });

  it("the fixture's fired docs match what each rule declares", () => {
    const byRule = new Map(RULE_DOCS.map((r) => [r.rule, r.doc]));
    const mismatched = designLint(KITCHEN_SINK)
      .filter((f) => f.doc !== byRule.get(f.rule))
      .map((f) => `${f.rule}: fired ${f.doc}, declared ${byRule.get(f.rule)}`);
    expect(mismatched).toEqual([]);
  });
});
