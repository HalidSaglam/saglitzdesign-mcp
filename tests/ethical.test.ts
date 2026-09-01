import { describe, it, expect } from "vitest";
import { ethicalRules, ethicalReport, ETHICAL_NOT_VISIBLE } from "../dist/ethical.js";

const ids = (code: string) => [...new Set(ethicalRules(code).map((f) => f.rule))].sort();

describe("ethicalRules", () => {
  it("flags confirmshaming decline copy", () => {
    expect(ids(`<button>No thanks, I hate saving money</button>`)).toContain("confirmshaming");
  });

  it("accepts a neutral decline", () => {
    expect(ids(`<button>No thanks</button>`)).toEqual([]);
  });

  it("flags a pre-checked marketing checkbox and ignores Remember me", () => {
    expect(ids(`<label>Subscribe to our newsletter <input type="checkbox" checked></label>`)).toContain("prechecked-marketing");
    expect(ids(`<input type="checkbox" defaultChecked name="newsletter" />`)).toContain("prechecked-marketing");
    expect(ids(`<label>Remember me <input type="checkbox" checked></label>`)).toEqual([]);
  });

  it("flags literal scarcity and skips a bound count", () => {
    expect(ids(`<p>Only 2 left!</p>`)).toContain("fake-urgency-copy");
    expect(ids(`<p>Expires in 5 minutes</p>`)).toContain("fake-urgency-copy");
    expect(ids(`<p>Only {stock} left</p>`)).toEqual([]);
    expect(ids(`<p>Only 2 left of {stock}</p>`)).toEqual([]);
  });

  it("flags Accept all without a named reject, and stays silent when both exist", () => {
    expect(ids(`<button>Accept all</button>`)).toContain("accept-without-reject");
    expect(ids(`<button>Accept all</button><button>Reject all</button>`)).toEqual([]);
  });
});

describe("ethicalReport", () => {
  it("prints every notVisible entry", () => {
    const { text, structured } = ethicalReport("<p>Hello</p>");
    expect(structured.notVisible).toBe(ETHICAL_NOT_VISIBLE);
    expect(ETHICAL_NOT_VISIBLE.length).toBeGreaterThan(4);
    for (const entry of ETHICAL_NOT_VISIBLE) expect(text).toContain(entry);
    expect(text).toMatch(/Nothing here is measured/);
  });

  it("agrees with itself on a clean snippet and on a dirty one", () => {
    const clean = ethicalReport("<p>No thanks</p>");
    expect(clean.structured.findings).toEqual([]);
    expect(clean.text).toMatch(/No named deceptive-pattern tells/);
    const dirty = ethicalReport(`<button>Accept all</button><p>Only 2 left</p>`);
    const { error, warning, info } = dirty.structured.summary;
    expect(dirty.structured.findings.length).toBe(error + warning + info);
    expect(dirty.structured.findings.length).toBeGreaterThan(0);
  });
});
