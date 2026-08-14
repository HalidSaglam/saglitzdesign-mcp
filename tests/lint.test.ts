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
});
