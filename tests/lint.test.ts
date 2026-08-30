import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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
    expect(LINT_NOT_VISIBLE.length).toBe(15);
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

  it("11a. fixed-height-text does not mean fixed — min-height and max-height fire", () => {
    // The pattern is a word-boundary `height:`, and `-` is a word boundary.
    expect(rules(`.a { min-height: 40px; }`)).toEqual(["fixed-height-text"]);
    expect(rules(`.a { max-height: 200px; }`)).toEqual(["fixed-height-text"]);
    // Which means the rule flags the `min-height` its own fix text recommends.
    expect(designLint(`.a { min-height: 40px; }`)[0].fix).toContain("min-height");
    // line-height escapes only because `line` is on the suppressor list.
    expect(designLint(`.a { line-height: 40px; }`)).toEqual([]);
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
    expect(notVisible).toMatch(/flags its own advice/i);
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

  it("10b. five of the six line rules are case-sensitive; positive-tabindex is not", () => {
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
    expect(notVisible).toMatch(/five of the six line rules are case-sensitive/i);
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

  it("11b. magic-number-radius reads whole pixels — 0px and 9999px fire, 50% and 0.5rem do not", () => {
    expect(rules(`.a { border-radius: 0px; }`)).toEqual(["magic-number-radius"]);
    expect(rules(`.a { border-radius: 9999px; }`)).toEqual(["magic-number-radius"]);
    expect(designLint(`.a { border-radius: 50%; }`)).toEqual([]);
    expect(designLint(`.a { border-radius: 0.5rem; }`)).toEqual([]);
    expect(notVisible).toMatch(/a squared corner and a pill are the two least ad-hoc radii/i);
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

  // `\b` matches after `--`, so the three value rules reach custom-property
  // *definitions* — the design tokens their own fix text sends you to write.
  // This is the case that falsified the closed-list phrasing, which is why the
  // entries now say "include" and "a sample rather than a closed list".
  it("11d. the value rules reach custom-property definitions — the tokens they recommend", () => {
    expect(rules(`:root { --header-height: 64px; }`)).toEqual(["fixed-height-text"]);
    for (const css of [`:root { --height: 40px; }`, `:root { --card-height: 40px; }`, `:root { --nav-height: 40px; }`])
      expect(rules(css), css).toEqual(["fixed-height-text"]);
    expect(rules(`:root { --border-radius: 8px; }`)).toEqual(["magic-number-radius"]);
    expect(designLint(`:root { --radius: 8px; }`)).toEqual([]);
    // hardcoded-color turns on whether the token name ends in a watched word.
    expect(rules(`:root { --brand-color: #ff0000; }`)).toEqual(["hardcoded-color"]);
    expect(designLint(`:root { --brand: #ff0000; }`)).toEqual([]);
    expect(notVisible).toContain("--header-height: 64px");
    expect(notVisible).toMatch(/`--brand-color: #ff0000` fires while `--brand: #ff0000` does not/);
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
      expect(notVisible).toMatch(/one guarded track and one bare one/i);
      expect(rules(`
        <div class="g"><img src="a.png" alt="a"></div>
        <style>.g { display: grid; grid-template-columns: minmax(0, 1fr) 1fr; }</style>
      `)).not.toContain("grid-track-no-min");
    });
  });
});
