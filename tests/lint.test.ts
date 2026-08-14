import { describe, it, expect } from "vitest";
import { auditStructuredFrom, renderNotVisibleSection, assembleAuditReport } from "../dist/lint.js";

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
