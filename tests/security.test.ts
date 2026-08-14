import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  securitySourceRules, securityConfigRules, extractHeaders, securityReport,
  SECURITY_NOT_VISIBLE, SECURITY_PREAMBLE, SECURITY_CLOSING,
} from "../dist/security.js";

const ids = (code: string, filename?: string) =>
  securitySourceRules(code, filename).map((f) => f.rule).sort();

describe("source rules — fire when they should", () => {
  it("flags target=_blank without rel=noopener, at info severity", () => {
    const findings = securitySourceRules(`<a href="https://x.com" target="_blank">go</a>`);
    const f = findings.find((x) => x.rule === "blank-without-noopener");
    expect(f).toBeDefined();
    // Browsers imply noopener on anchors at 95.58% (caniuse). Erroring here
    // would fire on correct modern markup; the live risk is window.open().
    expect(f!.severity).toBe("info");
  });

  it("flags window.open without noopener, more severely than the anchor case", () => {
    const findings = securitySourceRules(`const w = window.open(url, "_blank")`);
    const f = findings.find((x) => x.rule === "window-open-without-noopener");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("accepts window.open with noopener in the features string", () => {
    expect(ids(`window.open(url, "_blank", "noopener,noreferrer")`)).not.toContain("window-open-without-noopener");
  });

  it("still flags it when a formatter split the tag over lines", () => {
    const code = `<a\n  href="https://x.com"\n  target="_blank"\n>go</a>`;
    expect(ids(code)).toContain("blank-without-noopener");
  });

  it("flags a cross-origin script without integrity", () => {
    expect(ids(`<script src="https://cdn.example.com/a.js"></script>`)).toContain("external-script-no-sri");
  });

  it("flags an http subresource", () => {
    expect(ids(`<img src="http://example.com/a.png">`)).toContain("http-subresource");
  });

  it("flags a token in localStorage", () => {
    expect(ids(`localStorage.setItem("authToken", jwt)`)).toContain("token-in-localstorage");
  });

  it("flags other credential-shaped localStorage keys", () => {
    expect(ids(`localStorage.setItem("auth_token", val)`)).toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("jwt", val)`)).toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("refreshToken", val)`)).toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("sessionId", val)`)).toContain("token-in-localstorage");
  });

  it("flags a secret-named public env var", () => {
    expect(ids(`const k = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY`)).toContain("public-env-secret");
  });

  it("flags NEXT_PUBLIC_API_KEY as a secret-named public env var", () => {
    expect(ids(`const k = process.env.NEXT_PUBLIC_API_KEY`)).toContain("public-env-secret");
  });

  it("flags dangerouslySetInnerHTML with no sanitiser in the file", () => {
    expect(ids(`<div dangerouslySetInnerHTML={{ __html: body }} />`)).toContain("dangerous-html");
  });

  it("flags Svelte {@html} with no sanitiser in the file, in realistic markup", () => {
    expect(ids(`<div>{@html body}</div>`)).toContain("dangerous-html");
  });

  it("flags dangerouslySetInnerHTML even when a comment merely mentions a sanitiser by name", () => {
    const code = `// we already fixed xss here\n<div dangerouslySetInnerHTML={{ __html: body }} />`;
    expect(ids(code)).toContain("dangerous-html");
  });

  it("flags a cross-origin iframe without sandbox", () => {
    expect(ids(`<iframe src="https://other.example/embed"></iframe>`)).toContain("iframe-no-sandbox");
  });

  it("flags postMessage to a wildcard origin", () => {
    expect(ids(`win.postMessage(payload, "*")`)).toContain("postmessage-wildcard-origin");
  });

  it("flags postMessage to a wildcard origin even with a transfer list argument", () => {
    expect(ids(`win.postMessage(data, "*", [port])`)).toContain("postmessage-wildcard-origin");
  });

  it("flags window.open without noopener even when a trailing comment mentions noopener", () => {
    expect(ids(`window.open(url, "_blank"); // TODO ensure noopener elsewhere`)).toContain("window-open-without-noopener");
  });

  it("flags an inline event handler in HTML", () => {
    expect(ids(`<button onclick="go()">go</button>`, "page.html")).toContain("inline-event-handler");
  });

  it("flags a password field with autocomplete off", () => {
    expect(ids(`<input type="password" autocomplete="off">`)).toContain("password-autocomplete");
  });
});

// An attribute name has to be found where a *name* can appear. Allowing a
// quote before it — which cannot be told from the quote opening a value —
// meant a name occurring inside another attribute's value counted as that
// attribute. Every instance below was a live false negative on shipped code:
// the rule went silent and the report read clean.
describe("an attribute name inside another attribute's value is not that attribute", () => {
  it("does not let the word \"nonce\" in a data value exempt an inline script", () => {
    expect(ids(`<script data-n="add nonce later">var x=1</script>`))
      .toContain("inline-script-no-nonce");
  });

  it("does not let the word \"sandbox\" in a title exempt a third-party iframe", () => {
    expect(ids(`<iframe src="https://ads.example.com/x" title="sandbox demo"></iframe>`))
      .toContain("iframe-no-sandbox");
  });

  it("does not let the word \"integrity\" in a data value exempt a cross-origin script", () => {
    expect(ids(`<script src="https://cdn.x.com/a.js" data-note="add integrity later"></script>`))
      .toContain("external-script-no-sri");
  });

  it("does not read a rel= inside a title as the anchor's rel", () => {
    expect(ids(`<a href="https://x.example.com" target="_blank" title="rel='noopener' explained">x</a>`))
      .toContain("blank-without-noopener");
  });

  it("does not read a type= inside a data value as the script's type", () => {
    // Before this, the data value made the script look like an ld+json data
    // block, which CSP does not gate — so the nonce finding was dropped.
    expect(ids(`<script data-x='type="application/ld+json"'>var x=1</script>`))
      .toContain("inline-script-no-nonce");
  });

  // The two triggers that sniffed the raw attribute chunk with their own
  // regex rather than going through the attribute reader. These are the
  // false-positive direction: correct markup reported as a defect.
  it("does not report a text input whose title describes a password field", () => {
    expect(ids(`<input type="text" title='type="password" field'>`))
      .not.toContain("password-autocomplete");
  });

  it("does not report an anchor whose title describes target=_blank", () => {
    expect(ids(`<a href="/x" title='target="_blank" opens new tab'>x</a>`))
      .not.toContain("blank-without-noopener");
  });

  it("does not treat a link with no real rel as one that fetches", () => {
    expect(ids(`<link href="http://x.com/a.css" data-note='rel="stylesheet" needed'>`))
      .not.toContain("http-subresource");
  });

  // What the earlier fix got right, and must keep getting right: the prefix
  // case that started all of this.
  it("still ignores a data- prefixed lookalike", () => {
    expect(ids(`<script data-nonce="x">var x=1</script>`)).toContain("inline-script-no-nonce");
    expect(ids(`<iframe src="https://ads.x.com/a" data-sandbox="x"></iframe>`)).toContain("iframe-no-sandbox");
  });

  it("still honours a valueless attribute", () => {
    expect(ids(`<iframe src="https://ads.x.com/a" sandbox></iframe>`)).not.toContain("iframe-no-sandbox");
    expect(ids(`<script nonce>var x=1</script>`)).not.toContain("inline-script-no-nonce");
  });

  it("reads an unquoted attribute value, which is valid HTML", () => {
    expect(ids(`<a href=/x target=_blank>x</a>`)).toContain("blank-without-noopener");
    expect(ids(`<input type=password name=p>`)).toContain("password-autocomplete");
  });

  it("still exempts a real ld+json data block, which CSP does not gate", () => {
    expect(ids(`<script type="application/ld+json">{"a":1}</script>`)).not.toContain("inline-script-no-nonce");
  });
});

describe("source rules — stay quiet when they should", () => {
  it("accepts target=_blank with rel=noopener noreferrer", () => {
    expect(ids(`<a href="https://x.com" target="_blank" rel="noopener noreferrer">go</a>`)).not.toContain("blank-without-noopener");
  });

  it("accepts a same-origin script without integrity", () => {
    expect(ids(`<script src="/app.js"></script>`)).not.toContain("external-script-no-sri");
  });

  it("accepts a cross-origin script with integrity", () => {
    const code = `<script src="https://cdn.example.com/a.js" integrity="sha384-abc" crossorigin="anonymous"></script>`;
    expect(ids(code)).not.toContain("external-script-no-sri");
  });

  it("accepts dangerouslySetInnerHTML when DOMPurify is imported in the file", () => {
    const code = `import DOMPurify from "dompurify";\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />`;
    expect(ids(code)).not.toContain("dangerous-html");
  });

  it("does not treat a JSX onClick as an inline handler", () => {
    expect(ids(`<button onClick={go}>go</button>`, "Page.tsx")).not.toContain("inline-event-handler");
  });

  it("accepts a sandboxed third-party iframe", () => {
    expect(ids(`<iframe src="https://other.example/e" sandbox="allow-scripts"></iframe>`)).not.toContain("iframe-no-sandbox");
  });

  it("accepts a non-secret public env var", () => {
    expect(ids(`const url = process.env.NEXT_PUBLIC_SITE_URL`)).not.toContain("public-env-secret");
  });

  it("accepts public env vars whose name merely contains a secret word as a substring", () => {
    expect(ids(`const a = process.env.NEXT_PUBLIC_TOKENIZER_URL`)).not.toContain("public-env-secret");
    expect(ids(`const a = process.env.NEXT_PUBLIC_PRIVATEBETA_URL`)).not.toContain("public-env-secret");
    expect(ids(`const a = process.env.NEXT_PUBLIC_PASSWDLESS_FLAG`)).not.toContain("public-env-secret");
    expect(ids(`const a = process.env.NEXT_PUBLIC_TOKENGATE_ENABLED`)).not.toContain("public-env-secret");
  });

  it("accepts localStorage for a non-credential key", () => {
    expect(ids(`localStorage.setItem("theme", "dark")`)).not.toContain("token-in-localstorage");
  });

  // A numbered credential key — a second environment, a second account, a
  // migration — was silently exempt: "token2" is one segment, and no whole
  // segment equalled TOKEN.
  it("flags a numbered credential key", () => {
    expect(ids(`localStorage.setItem("token2", v)`)).toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("jwt1", v)`)).toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("session42", v)`)).toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("token2fa", v)`)).toContain("token-in-localstorage");
    // …and the whole-segment guard survives the extra split point.
    expect(ids(`localStorage.setItem("tokenizer2", v)`)).not.toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("draft2", v)`)).not.toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("authorized2", v)`)).not.toContain("token-in-localstorage");
  });

  it("accepts localStorage keys whose name merely contains a credential word as a substring", () => {
    expect(ids(`localStorage.setItem("tokenizer-settings", val)`)).not.toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("authorized-theme", val)`)).not.toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("credentialsPolicy", "same-origin")`)).not.toContain("token-in-localstorage");
    expect(ids(`localStorage.setItem("refreshRate", "60")`)).not.toContain("token-in-localstorage");
  });

  it("returns nothing at all for clean markup", () => {
    expect(securitySourceRules(`<main><h1>Hello</h1><p>Text</p></main>`)).toEqual([]);
  });
});

describe("every finding is actionable", () => {
  it("carries a message, a fix and a doc id", () => {
    const findings = securitySourceRules(`<a href="https://x.com" target="_blank">go</a>`);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.message.length).toBeGreaterThan(0);
      expect(f.fix.length).toBeGreaterThan(0);
      expect(f.doc).toBeTruthy();
      expect(f.line).toBeGreaterThan(0);
    }
  });
});

describe("source rules — prose and examples inside comments are not code", () => {
  // A JSDoc anti-pattern example, an ESLint rule description, or a code
  // sample in a doc comment reads exactly like the real defect to a regex
  // that never looks at context. Any security-conscious codebase — this
  // tool's own audience — is disproportionately likely to contain exactly
  // this shape of comment.
  it("finds nothing in a /** */ block quoting window.open, localStorage.setItem and dangerouslySetInnerHTML", () => {
    const code = [
      "/**",
      " * Anti-patterns to avoid:",
      " * localStorage.setItem(\"authToken\", token);",
      " * window.open(url);",
      " * <div dangerouslySetInnerHTML={{__html: userInput}} />",
      " */",
      "export function noop() {}",
    ].join("\n");
    expect(securitySourceRules(code, "utils.ts")).toEqual([]);
  });

  it("an ESLint rule description mentioning window.open(url) does not trip window-open-without-noopener", () => {
    const code = `// Disallow window.open(url) without a noopener/noreferrer argument.`;
    expect(ids(code, "eslint-rule.ts")).not.toContain("window-open-without-noopener");
  });

  it("still fires on the same three constructs as real code outside comments", () => {
    const localStorage = `localStorage.setItem("authToken", token);`;
    const windowOpen = `window.open(url);`;
    const dangerousHtml = `<div dangerouslySetInnerHTML={{__html: userInput}} />`;

    expect(ids(localStorage, "utils.ts")).toContain("token-in-localstorage");
    expect(ids(windowOpen, "utils.ts")).toContain("window-open-without-noopener");
    expect(ids(dangerousHtml, "Component.tsx")).toContain("dangerous-html");
  });

  it("does not flag a commented-out anchor in an HTML file, but does flag the same anchor outside the comment", () => {
    const commented = `<!-- <a href="https://x.com" target="_blank"> -->`;
    const real = `<a href="https://x.com" target="_blank">go</a>`;
    expect(ids(commented, "page.html")).not.toContain("blank-without-noopener");
    expect(ids(real, "page.html")).toContain("blank-without-noopener");
  });
});

const cfgIds = (files: Array<{ path: string; source: string }>) =>
  securityConfigRules(files).map((f) => f.rule);

describe("config rules — CSP discovery", () => {
  it("reports csp-missing when no configuration mentions one", () => {
    expect(cfgIds([{ path: "next.config.js", source: `module.exports = {}` }]))
      .toContain("csp-missing");
  });

  it("finds a CSP in vercel.json", () => {
    const source = JSON.stringify({
      headers: [{ source: "/(.*)", headers: [
        { key: "Content-Security-Policy", value: "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" },
      ] }],
    }, null, 2);
    expect(cfgIds([{ path: "vercel.json", source }])).not.toContain("csp-missing");
  });

  it("finds a CSP in a _headers file", () => {
    const source = `/*\n  Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\n`;
    expect(cfgIds([{ path: "_headers", source }])).not.toContain("csp-missing");
  });

  it("finds a CSP in netlify.toml", () => {
    const source = `[[headers]]\n  for = "/*"\n  [headers.values]\n  Content-Security-Policy = "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"\n`;
    expect(cfgIds([{ path: "netlify.toml", source }])).not.toContain("csp-missing");
  });

  it("reports a runtime-assembled CSP as undeterminable, not missing", () => {
    const source = "headers.set('Content-Security-Policy', `default-src 'self'; script-src 'nonce-${nonce}'`)";
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids).toContain("csp-undeterminable");
  });

  it("finds a CSP in proxy.ts, the Next.js 16 name for middleware", () => {
    // Next.js 16 deprecated and renamed middleware.ts to proxy.ts. Reading only
    // the old name would report csp-missing on every Next.js 16 project that
    // sets a CSP correctly — a false positive on the most common modern stack.
    const source = `export function proxy() { res.headers.set('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'") }`;
    expect(cfgIds([{ path: "proxy.ts", source }])).not.toContain("csp-missing");
  });

  // Next.js's own documented CSP-with-nonce example builds the value in a
  // variable and sets it by reference — the single most common real-world
  // CSP pattern — rather than passing a literal string straight into
  // .set(...). A naive extractor that backtracks its "optional leading
  // quote" group can end up reusing the header name's own closing quote as
  // if it opened the value, then lazily scanning forward to whatever quote
  // character happens to appear next in the file (typically the second
  // .set(...) call a few lines down) and reporting that as a readable,
  // determinate policy. Both the one-occurrence and two-occurrence (request
  // + response) forms must report csp-undeterminable — never csp-missing,
  // and never a parsed, determinate policy.
  it("reports the Next.js documented nonce-CSP pattern as undeterminable (one occurrence)", () => {
    const source = `
      const cspHeader = "default-src 'self'"
      const contentSecurityPolicyHeaderValue = cspHeader.replace(/\\s{2,}/g, ' ').trim()
      const requestHeaders = new Headers()
      requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
    `;
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids).toContain("csp-undeterminable");
    expect(ids.filter((r) => r.startsWith("csp-missing") || r === "trusted-types-absent")).toEqual([]);
  });

  it("reports the Next.js documented nonce-CSP pattern as undeterminable (request + response occurrences)", () => {
    const source = `
      export function middleware(request) {
        const cspHeader = "default-src 'self'"
        const contentSecurityPolicyHeaderValue = cspHeader.replace(/\\s{2,}/g, ' ').trim()
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
        const response = NextResponse.next({ request: { headers: requestHeaders } })
        response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
        return response
      }
    `;
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids).toContain("csp-undeterminable");
    expect(ids.filter((r) => r.startsWith("csp-missing") || r === "trusted-types-absent")).toEqual([]);
  });
});

describe("config rules — a header-name reference is not a declaration", () => {
  // extractHeaders used to take the *next* array element as a header's
  // value whenever a header name appeared with no real assignment context
  // at all — a plain list, e.g. an ALLOWED_RESPONSE_HEADERS constant. That
  // silently swallowed the two highest-signal findings (csp-missing,
  // hsts-missing) behind six low-signal ones anchored to a file that
  // configures nothing.
  const HEADER_NAME_ARRAY = `
export const ALLOWED_RESPONSE_HEADERS = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
];
`;

  it("still reports csp-missing and hsts-missing for a plain array of header names", () => {
    const ids = cfgIds([{ path: "headers.ts", source: HEADER_NAME_ARRAY }]);
    expect(ids).toContain("csp-missing");
    expect(ids).toContain("hsts-missing");
  });

  it("does not anchor any low-signal CSP/HSTS finding to the array", () => {
    const ids = cfgIds([{ path: "headers.ts", source: HEADER_NAME_ARRAY }]);
    for (const bogus of [
      "csp-missing-object-src", "csp-missing-base-uri", "csp-missing-frame-ancestors",
      "csp-undeterminable", "csp-unsafe-inline", "csp-unsafe-eval", "csp-wildcard",
      "trusted-types-absent", "hsts-short-max-age", "hsts-no-subdomains",
    ]) {
      expect(ids).not.toContain(bogus);
    }
  });

  it("still reads a real declaration living in the same file as such an array", () => {
    const source = HEADER_NAME_ARRAY + `
headers.set('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
`;
    const ids = cfgIds([{ path: "headers.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids.filter((r) => r.startsWith("csp-"))).toEqual([]);
  });
});

describe("config rules — declaration-context matching covers the common header-setting APIs", () => {
  // A first pass at rejecting header-name-array references matched only the
  // literal substring ".set(" / ".append(", which is not the same as
  // matching the call's own method name: it missed res.setHeader (raw Node
  // / Express — at least as common as the bare .set() form), Fastify's
  // reply.header, and any call where characters sit between the dot and the
  // matched text. The result was a false csp-missing on a project that sets
  // its CSP correctly through any of those APIs — the exact
  // opposite-direction harm this whole context check exists to prevent.
  const CSP = "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

  it.each([
    ["res.setHeader (raw Node / Express)", `res.setHeader("Content-Security-Policy", "${CSP}")`],
    ["reply.header (Fastify)", `reply.header("Content-Security-Policy", "${CSP}")`],
    ["response.setHeader", `response.setHeader("Content-Security-Policy", "${CSP}")`],
    ["ctx.set (Koa)", `ctx.set("Content-Security-Policy", "${CSP}")`],
  ])("finds a CSP declared via %s", (_label, source) => {
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids.filter((r) => r.startsWith("csp-"))).toEqual([]);
  });

  it("still finds a declaration behind a long inline comment between ( and the header name", () => {
    // Binary-searched by an earlier review: a fixed character-count lookback
    // stopped recognising the declaration once the padding between `(` and
    // the header name crossed the window's width. The fix scans back to the
    // nearest statement boundary instead, so there is no width to cross.
    const padding = "x".repeat(200);
    const source = `h.set(/* ${padding} */"Content-Security-Policy", "${CSP}")`;
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids.filter((r) => r.startsWith("csp-"))).toEqual([]);
  });

  it("still rejects the header-name array with the widened context matching in place", () => {
    const source = `
export const ALLOWED_RESPONSE_HEADERS = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
];
`;
    expect(cfgIds([{ path: "headers.ts", source }])).toContain("csp-missing");
  });
});

describe("config rules — commented-out header mentions", () => {
  it("does not treat a commented-out Content-Security-Policy as a real declaration", () => {
    const source = [
      "// Reminder for ops runbook:",
      "// Content-Security-Policy: default-src 'self'; script-src 'unsafe-inline'",
      "export function noop() {}",
    ].join("\n");
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).toContain("csp-missing");
    expect(ids).not.toContain("csp-unsafe-inline");
  });

  it("still reads a real CSP that sits right after an unrelated comment", () => {
    const source = [
      "// Reminder for ops runbook: keep this in sync with the CDN",
      "headers.set('Content-Security-Policy', \"default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\")",
    ].join("\n");
    expect(cfgIds([{ path: "middleware.ts", source }])).not.toContain("csp-missing");
  });

  it("does not treat a commented-out header in a _headers file as real, while real # comments there are still just comments", () => {
    const source = "/*\n  # Content-Security-Policy: default-src 'self'; script-src 'unsafe-inline'\n  X-Content-Type-Options: nosniff\n";
    const ids = cfgIds([{ path: "_headers", source }]);
    expect(ids).toContain("csp-missing");
    expect(ids).not.toContain("csp-unsafe-inline");
  });

  // A `//` inside a string literal is not a comment start. Masking it
  // regardless (the earlier "not preceded by :" guard missed this — nothing
  // precedes the `//` here but the opening quote) hid the real .set(...)
  // call later on the same line and fabricated csp-missing on a project
  // that correctly sets a strict policy — a false negative on correct
  // configuration, the wrong-direction failure this module refuses to ship.
  it("does not mask a real CSP declaration because an earlier string literal on the same line contains //", () => {
    const source = `const fallback = "//cdn.example.com"; requestHeaders.set('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")`;
    const ids = cfgIds([{ path: "middleware.ts", source }]);
    expect(ids).not.toContain("csp-missing");
    expect(ids.filter((r) => r.startsWith("csp-"))).toEqual([]);
  });

  it("still finds a second header on the same line after a first header's value contains //", () => {
    const source = `headers.set('X-Custom-Header', "//not-a-real-comment").set('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")`;
    expect(cfgIds([{ path: "middleware.ts", source }])).not.toContain("csp-missing");
  });
});

describe("config rules — CSP weaknesses", () => {
  const withCsp = (csp: string) => cfgIds([
    { path: "_headers", source: `/*\n  Content-Security-Policy: ${csp}\n` },
  ]);

  it("flags unsafe-inline in script-src", () => {
    expect(withCsp("default-src 'self'; script-src 'self' 'unsafe-inline'")).toContain("csp-unsafe-inline");
  });

  it("flags unsafe-eval in script-src", () => {
    expect(withCsp("default-src 'self'; script-src 'self' 'unsafe-eval'")).toContain("csp-unsafe-eval");
  });

  it("flags a wildcard script-src", () => {
    expect(withCsp("default-src 'self'; script-src *")).toContain("csp-wildcard");
  });

  // `https:` and `'unsafe-inline'` are backward-compat fallbacks that any
  // browser supporting 'strict-dynamic' ignores — which is exactly why
  // web-security-headers.md ships them in the policy it tells the reader to
  // copy. An error here is the tool contradicting its own cited document,
  // with a fix line ("use 'nonce-…' with 'strict-dynamic'") describing what
  // the reader already did.
  it("does not call a host source a wildcard when 'strict-dynamic' is present", () => {
    const ids = withCsp("script-src 'nonce-abc123' 'strict-dynamic' https: 'unsafe-inline'");
    expect(ids).not.toContain("csp-wildcard");
    expect(ids).not.toContain("csp-unsafe-inline");
  });

  it("still flags a host list that has no 'strict-dynamic' to make it irrelevant", () => {
    expect(withCsp("default-src 'self'; script-src 'self' https:")).toContain("csp-wildcard");
  });

  it("flags missing object-src, base-uri, frame-ancestors and form-action", () => {
    const ids = withCsp("default-src 'self'; script-src 'self'");
    expect(ids).toContain("csp-missing-object-src");
    expect(ids).toContain("csp-missing-base-uri");
    expect(ids).toContain("csp-missing-frame-ancestors");
    // The document names four directives; checking three quietly dropped the
    // one that stops injected markup posting form data to another origin.
    expect(ids).toContain("csp-missing-form-action");
  });

  // The fixture is the policy web-security-headers.md presents verbatim as
  // "One header. Copy it, replace {RANDOM}, ship it" — fallbacks included. An
  // approximation here (the earlier version stripped `https: 'unsafe-inline'`)
  // lets the tool and the document drift apart without a test noticing, which
  // is how csp-wildcard came to fire on the recommended policy.
  it("stays silent on the exact policy the document tells the reader to ship", () => {
    const strict = "script-src 'nonce-{RANDOM}' 'strict-dynamic' https: 'unsafe-inline'; "
      + "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; "
      + "require-trusted-types-for 'script'; report-uri https://example.com/csp-reports; report-to csp-endpoint";
    const ids = withCsp(strict);
    expect(ids.filter((r) => r.startsWith("csp-"))).toEqual([]);
    expect(ids).not.toContain("trusted-types-absent");
  });
});

describe("config rules — the other headers", () => {
  const headersFile = (body: string) => [{ path: "_headers", source: `/*\n${body}\n` }];

  it("flags missing HSTS", () => {
    expect(cfgIds(headersFile("  X-Content-Type-Options: nosniff"))).toContain("hsts-missing");
  });

  it("flags a short HSTS max-age", () => {
    expect(cfgIds(headersFile("  Strict-Transport-Security: max-age=600"))).toContain("hsts-short-max-age");
  });

  it("accepts a long HSTS max-age with subdomains", () => {
    const ids = cfgIds(headersFile("  Strict-Transport-Security: max-age=31536000; includeSubDomains"));
    expect(ids).not.toContain("hsts-short-max-age");
    expect(ids).not.toContain("hsts-no-subdomains");
  });

  it("flags a referrer policy that leaks more than the browser default", () => {
    expect(cfgIds(headersFile("  Referrer-Policy: unsafe-url"))).toContain("referrer-policy-unsafe");
  });

  it("does not flag an absent Referrer-Policy", () => {
    // strict-origin-when-cross-origin has been the browser default since the
    // November 2020 spec revision, so absence is already the recommended value.
    // A rule that fires here would fire on correct configuration.
    expect(cfgIds(headersFile("  X-Content-Type-Options: nosniff"))).not.toContain("referrer-policy-unsafe");
  });

  it("does not flag strict-origin-when-cross-origin set explicitly", () => {
    expect(cfgIds(headersFile("  Referrer-Policy: strict-origin-when-cross-origin"))).not.toContain("referrer-policy-unsafe");
  });

  it("flags production source maps", () => {
    expect(cfgIds([{ path: "next.config.js", source: `module.exports = { productionBrowserSourceMaps: true }` }]))
      .toContain("sourcemaps-in-production");
  });
});

describe("config rules — committed env files", () => {
  it("flags a .env that is not gitignored", () => {
    const files = [
      { path: ".env", source: "API_KEY=abc" },
      { path: ".gitignore", source: "node_modules\ndist\n" },
    ];
    expect(cfgIds(files)).toContain("env-committed");
  });

  it("accepts a .env that is gitignored", () => {
    const files = [
      { path: ".env", source: "API_KEY=abc" },
      { path: ".gitignore", source: "node_modules\n.env\n" },
    ];
    expect(cfgIds(files)).not.toContain("env-committed");
  });

  it("flags .env.production when .gitignore covers only the literal .env, not every .env* variant", () => {
    // A bare ".env" gitignore entry exempts exactly that file, not its
    // siblings — git would not treat it as covering .env.production, and
    // treating it that way here would miss real committed production
    // secrets.
    const files = [
      { path: ".env.production", source: "API_KEY=abc" },
      { path: ".gitignore", source: "node_modules\n.env\n" },
    ];
    expect(cfgIds(files)).toContain("env-committed");
  });

  it("accepts a nested .env correctly covered by a **/.env gitignore pattern", () => {
    const files = [
      { path: "apps/web/.env", source: "API_KEY=abc" },
      { path: ".gitignore", source: "node_modules\n**/.env\n" },
    ];
    expect(cfgIds(files)).not.toContain("env-committed");
  });

  it("accepts every .env* variant when .gitignore uses the .env* wildcard", () => {
    const files = [
      { path: ".env.local", source: "API_KEY=abc" },
      { path: ".gitignore", source: ".env*\n" },
    ];
    expect(cfgIds(files)).not.toContain("env-committed");
  });
});

describe("the report", () => {
  it("always states what it could not see", () => {
    const clean = securityReport({ source: `<main><h1>Hi</h1></main>` }).text;
    expect(clean).toMatch(/not visible to this audit/i);
    expect(clean).toMatch(/CDN|proxy/i);
  });

  it("states it for a report with findings too", () => {
    const dirty = securityReport({ source: `<script src="https://cdn.example.com/a.js"></script>` }).text;
    expect(dirty).toMatch(/not visible to this audit/i);
    expect(dirty).toContain("external-script-no-sri");
  });

  it("names the files it read the header configuration from", () => {
    const report = runProject({ "_headers": `/*\n  Content-Security-Policy: ${HARD_CSP}\n` });
    expect(report).toContain("Read header configuration from: `_headers`");
  });

  it("says so plainly when nothing it recognises declared a header", () => {
    const report = runProject({ "app/page.tsx": `export default () => <main><h1>Hi</h1></main>;\n` });
    expect(report).toMatch(/No configuration file in a recognised header format was found/);
    // The reader who concludes "my config is right there, so it must be
    // covered" is the one this line exists for; the shapes are named too.
    expect(report).toMatch(/Header shapes it does not recognise/);
    expect(report).toMatch(/helmet/);
  });
});

// ── the fixture matrix ───────────────────────────────────────────────────────
//
// One correctly-hardened project per framework, each asserted to produce zero
// findings. Every other test in this file asserts a shape someone already had
// in mind — which is exactly how the "clean case must be provably clean"
// fixture came to assert cleanliness on a policy the documentation does not
// recommend, and how csp-wildcard came to fire on the policy it does. These
// fixtures assert the tool is right about the shapes it will actually meet:
// each was written from the framework's own documented way of setting
// headers, and each sets the policy knowledge/security/web-security-headers.md
// would call correct.

const HARD_CSP =
  "script-src 'nonce-r4nd0m' 'strict-dynamic' https: 'unsafe-inline'; "
  + "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; "
  + "require-trusted-types-for 'script'";
const HARD_HSTS = "max-age=63072000; includeSubDomains; preload";
const HARD_PP = "camera=(), microphone=(), geolocation=()";

/** Write a fixture project to a temp directory and audit it as the tool would. */
function runProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "saglitz-sec-"));
  try {
    for (const [rel, source] of Object.entries(files)) {
      const full = join(root, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source, "utf8");
    }
    return securityReport({ root }).text;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const HARDENED: Array<[string, Record<string, string>]> = [
  ["Next.js — next.config.js async headers()", {
    "next.config.js": `/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "${HARD_CSP}" },
          { key: 'Strict-Transport-Security', value: '${HARD_HSTS}' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: '${HARD_PP}' },
        ],
      },
    ]
  },
}
`,
  }],

  ["Nuxt — routeRules.headers", {
    "nuxt.config.ts": `export default defineNuxtConfig({
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "${HARD_CSP}",
        'Strict-Transport-Security': '${HARD_HSTS}',
        'X-Content-Type-Options': 'nosniff',
        'Permissions-Policy': '${HARD_PP}',
      },
    },
  },
})
`,
  }],

  ["SvelteKit — hooks.server.ts", {
    "src/hooks.server.ts": `export async function handle({ event, resolve }) {
  const response = await resolve(event);
  response.headers.set('Content-Security-Policy', "${HARD_CSP}");
  response.headers.set('Strict-Transport-Security', '${HARD_HSTS}');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Permissions-Policy', '${HARD_PP}');
  return response;
}
`,
  }],

  // SvelteKit's own CSP config never spells the header name at all: it is an
  // object of directive → unquoted source tokens under kit.csp.directives.
  ["SvelteKit — kit.csp in svelte.config.js", {
    "svelte.config.js": `import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter(),
    csp: {
      mode: 'auto',
      directives: {
        'script-src': ['self', 'nonce', 'strict-dynamic'],
        'object-src': ['none'],
        'base-uri': ['none'],
        'frame-ancestors': ['none'],
        'form-action': ['self'],
        'require-trusted-types-for': ['script'],
      },
    },
  },
};
`,
    "static/_headers": `/*
  Strict-Transport-Security: ${HARD_HSTS}
  X-Content-Type-Options: nosniff
  Permissions-Policy: ${HARD_PP}
`,
  }],

  ["Astro — middleware", {
    "src/middleware.ts": `import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('Content-Security-Policy', "${HARD_CSP}");
  response.headers.set('Strict-Transport-Security', '${HARD_HSTS}');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Permissions-Policy', '${HARD_PP}');
  return response;
});
`,
  }],

  ["Remix / React Router — export const headers", {
    "app/root.tsx": `export const headers = () => ({
  "Content-Security-Policy": "${HARD_CSP}",
  "Strict-Transport-Security": "${HARD_HSTS}",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "${HARD_PP}",
});

export default function App() {
  return <main><h1>Hello</h1></main>;
}
`,
  }],

  ["Cloudflare Worker — new Response(body, { headers })", {
    "src/worker.ts": `export default {
  async fetch(request: Request): Promise<Response> {
    const body = await render(request);
    return new Response(body, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Content-Security-Policy": "${HARD_CSP}",
        "Strict-Transport-Security": "${HARD_HSTS}",
        "X-Content-Type-Options": "nosniff",
        "Permissions-Policy": "${HARD_PP}",
      },
    });
  },
};
`,
  }],

  ["Express — res.set({ … })", {
    "server/app.js": `const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "${HARD_CSP}",
    'Strict-Transport-Security': '${HARD_HSTS}',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': '${HARD_PP}',
  });
  next();
});
`,
  }],

  ["Express — res.setHeader(…)", {
    "server/headers.js": `module.exports = function headers(req, res, next) {
  res.setHeader('Content-Security-Policy', "${HARD_CSP}");
  res.setHeader('Strict-Transport-Security', '${HARD_HSTS}');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', '${HARD_PP}');
  next();
};
`,
  }],

  ["static _headers", {
    "_headers": `/*
  Content-Security-Policy: ${HARD_CSP}
  Strict-Transport-Security: ${HARD_HSTS}
  X-Content-Type-Options: nosniff
  Permissions-Policy: ${HARD_PP}
`,
  }],

  ["netlify.toml", {
    "netlify.toml": `[[headers]]
  for = "/*"
  [headers.values]
  Content-Security-Policy = "${HARD_CSP}"
  Strict-Transport-Security = "${HARD_HSTS}"
  X-Content-Type-Options = "nosniff"
  Permissions-Policy = "${HARD_PP}"
`,
  }],

  ["vercel.json", {
    "vercel.json": JSON.stringify({
      headers: [{
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: HARD_CSP },
          { key: "Strict-Transport-Security", value: HARD_HSTS },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: HARD_PP },
        ],
      }],
    }, null, 2),
  }],

  ["Azure — staticwebapp.config.json globalHeaders", {
    "staticwebapp.config.json": JSON.stringify({
      globalHeaders: {
        "Content-Security-Policy": HARD_CSP,
        "Strict-Transport-Security": HARD_HSTS,
        "X-Content-Type-Options": "nosniff",
        "Permissions-Policy": HARD_PP,
      },
    }, null, 2),
  }],
];

describe("one correctly-hardened project per framework produces no findings", () => {
  it.each(HARDENED)("%s", (_name, files) => {
    const report = runProject(files);
    expect(report).toContain("**0 error · 0 warning · 0 info**");
    expect(report).toContain("No findings in what was read.");
  });

  it.each(HARDENED)("%s — names the file it read the headers from", (_name, files) => {
    expect(runProject(files)).toMatch(/Read header configuration from: `/);
  });

  // Every value in these fixtures is a readable literal, so no "I found this
  // and could not read it" note may appear on any of them. The zero-findings
  // assertion above already proves this; it is stated separately because the
  // undeterminable family is new and this is the surface it must never touch.
  const UNDETERMINABLE_RULES = [
    "csp-undeterminable", "hsts-undeterminable", "x-content-type-options-undeterminable",
    "referrer-policy-undeterminable", "permissions-policy-undeterminable",
  ];

  it.each(HARDENED)("%s — no undeterminable note", (_name, files) => {
    const report = runProject(files);
    for (const rule of UNDETERMINABLE_RULES) expect(report, rule).not.toContain(rule);
  });

  // The one shape that cannot be finding-free, and should not be: a
  // meta-delivered policy genuinely is weaker than a header — frame-ancestors,
  // report-uri and sandbox are ignored in it (CSP Level 3). What it must not
  // do is report the policy absent, or demand a frame-ancestors directive
  // that could not work there.
  it("<meta http-equiv> page — recognised, with the meta weakness as the only finding", () => {
    const report = runProject({
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${HARD_CSP}">
    <title>Hardened</title>
  </head>
  <body><main><h1>Hello</h1></main></body>
</html>
`,
      "_headers": `/*
  Strict-Transport-Security: ${HARD_HSTS}
  X-Content-Type-Options: nosniff
  Permissions-Policy: ${HARD_PP}
`,
    });
    expect(report).toContain("**0 error · 0 warning · 1 info**");
    expect(report).toContain("csp-meta-delivery");
    expect(report).not.toContain("csp-missing");
    for (const rule of UNDETERMINABLE_RULES) expect(report, rule).not.toContain(rule);
  });
});

// A string that merely *sits* where a policy would is the one false positive
// that costs more than it looks: with no real CSP in the project, the
// csp-missing error is replaced by four directive warnings pointing at the
// decoy, so the absence is hidden rather than embellished.
describe("a decoy shaped like a policy must not shadow a real absence", () => {
  const DECOY = { path: "aaa.json", source: JSON.stringify({
    "Content-Security-Policy": "controls which resources the page may load",
  }, null, 2) };

  it("still reports csp-missing when the only match is a docs-map decoy", () => {
    const found = cfgIds([DECOY]);
    expect(found).toContain("csp-missing");
    // …and none of the directive rules, which would have anchored themselves
    // to the decoy's line and read as a graded policy.
    expect(found).not.toContain("csp-missing-object-src");
    expect(found).not.toContain("csp-missing-base-uri");
    expect(found).not.toContain("csp-missing-frame-ancestors");
    expect(found).not.toContain("csp-missing-form-action");
    expect(extractHeaders([DECOY]).has("content-security-policy")).toBe(false);
  });

  // A real config usually wins on first-hit — but only usually. `aaa.json`
  // walks before `app/root.tsx`, so a Remix project loses that race.
  it("grades the real policy when a decoy walks before the real config", () => {
    const report = runProject({
      "aaa.json": DECOY.source,
      "app/root.tsx": `export const headers = () => ({
  "Content-Security-Policy": "${HARD_CSP}",
  "Strict-Transport-Security": "${HARD_HSTS}",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "${HARD_PP}",
});
`,
    });
    expect(report).toContain("**0 error · 0 warning · 0 info**");
    expect(report).toContain("Read header configuration from: `app/root.tsx`.");
  });

  // The guard is "names a CSP directive", not "looks like the policy we
  // recommend" — a one-directive policy is unusual, and valid.
  it("does not reject a valid policy for being unusual", () => {
    for (const policy of [
      "sandbox allow-forms allow-same-origin",
      "upgrade-insecure-requests",
      "trusted-types default dompurify",
      "report-to csp-endpoint",
      "block-all-mixed-content",
      "SCRIPT-SRC 'self'",
    ]) {
      const hit = extractHeaders([{ path: "_headers", source: `/*\n  Content-Security-Policy: ${policy}\n` }])
        .get("content-security-policy");
      expect(hit, policy).toBeDefined();
      expect(hit!.value.trim()).toBe(policy);
    }
  });

  it("leaves a runtime-assembled value alone — there is nothing to parse", () => {
    expect(cfgIds([{ path: "middleware.ts", source: `res.headers.set('Content-Security-Policy', cspValue)\n` }]))
      .toContain("csp-undeterminable");
  });
});

// Guarding only CSP would have been worse than guarding nothing: a guard that
// covers one header reads as a guard that covers headers. Each header the
// extractor reads has its own checkable grammar, and a value that satisfies
// none of it is prose.
describe("the decoy guard covers every header the extractor reads", () => {
  interface HeaderCase {
    header: string;
    /** A docs-map / i18n-bundle string sitting exactly where a value would. */
    prose: string;
    real: string;
    /** Legal values a stricter check might wrongly reject. */
    unusual: string[];
    /** The absence finding a decoy must not be able to suppress. */
    missing: string | null;
  }

  const HEADER_CASES: HeaderCase[] = [
    {
      header: "Content-Security-Policy",
      prose: "controls which resources the page may load",
      real: HARD_CSP,
      unusual: ["sandbox allow-forms", "upgrade-insecure-requests"],
      missing: "csp-missing",
    },
    {
      header: "Strict-Transport-Security",
      prose: "tells the browser to use HTTPS only",
      real: HARD_HSTS,
      // max-age=0 is legal and meaningful — it clears a previously-sent
      // policy — so it is a declaration, not a decoy.
      unusual: ["max-age=0", "max-age=31536000", "max-age=63072000; preload"],
      missing: "hsts-missing",
    },
    {
      header: "X-Content-Type-Options",
      prose: "stops the browser MIME-sniffing a response into a script",
      real: "nosniff",
      unusual: ["NOSNIFF", "nosniff;"],
      missing: "x-content-type-options-missing",
    },
    {
      // There is deliberately no referrer-policy-missing rule, so the damage a
      // decoy does here is quieter: it occupies the slot, and gets graded.
      header: "Referrer-Policy",
      prose: "controls how much referrer information is sent with requests",
      real: "strict-origin-when-cross-origin",
      unusual: ["no-referrer, strict-origin-when-cross-origin", "same-origin", "unsafe-url"],
      missing: null,
    },
    {
      header: "Permissions-Policy",
      prose: "controls which browser features the page may use",
      real: HARD_PP,
      unusual: [`geolocation=(self "https://maps.example.com"), fullscreen=*`, "camera=self", "interest-cohort=()"],
      missing: "permissions-policy-missing",
    },
  ];

  const decoyOf = (c: HeaderCase) =>
    ({ path: "aaa.json", source: JSON.stringify({ [c.header]: c.prose }, null, 2) });
  const headersFileOf = (path: string, header: string, value: string) =>
    ({ path, source: `/*\n  ${header}: ${value}\n` });

  it.each(HEADER_CASES.map((c) => [c.header, c] as const))(
    "%s — a prose decoy is not read as a declaration", (_h, c) => {
      expect(extractHeaders([decoyOf(c)]).has(c.header.toLowerCase())).toBe(false);
      if (c.missing) expect(cfgIds([decoyOf(c)])).toContain(c.missing);
    });

  it.each(HEADER_CASES.map((c) => [c.header, c] as const))(
    "%s — a real declaration is graded even when a decoy walks first", (_h, c) => {
      const real = headersFileOf("zz/_headers", c.header, c.real);
      const hit = extractHeaders([decoyOf(c), real]).get(c.header.toLowerCase());
      expect(hit).toBeDefined();
      expect(hit!.value.trim()).toBe(c.real);
      expect(hit!.file).toBe("zz/_headers");
      if (c.missing) expect(cfgIds([decoyOf(c), real])).not.toContain(c.missing);
    });

  it.each(HEADER_CASES.map((c) => [c.header, c] as const))(
    "%s — a legal but unusual value is still a declaration", (_h, c) => {
      for (const value of c.unusual) {
        const hit = extractHeaders([headersFileOf("_headers", c.header, value)]).get(c.header.toLowerCase());
        expect(hit, `${c.header}: ${value}`).toBeDefined();
        expect(hit!.value.trim()).toBe(value);
      }
    });

  // The same asymmetry the CSP guard uses: a value assembled at runtime is
  // exempt, because that path already reports honestly instead of claiming
  // absence.
  it("never rejects a value it could not read in the first place", () => {
    const found = cfgIds([{ path: "middleware.ts", source:
      `res.headers.set('Strict-Transport-Security', hstsValue)\n`
      + `res.headers.set('X-Content-Type-Options', xctoValue)\n`
      + `res.headers.set('Referrer-Policy', refValue)\n`
      + `res.headers.set('Permissions-Policy', ppValue)\n` }]);
    expect(found).not.toContain("hsts-missing");
    expect(found).not.toContain("x-content-type-options-missing");
    expect(found).not.toContain("permissions-policy-missing");
  });

  // The precise regression the coordinator named: before this, a decoy
  // replaced the hsts-missing *warning* with an hsts-no-subdomains *note*.
  it("does not let an HSTS decoy demote a missing header to a note", () => {
    const found = cfgIds([decoyOf(HEADER_CASES[1])]);
    expect(found).toContain("hsts-missing");
    expect(found).not.toContain("hsts-no-subdomains");
    expect(found).not.toContain("hsts-short-max-age");
  });
});

// Not grading a value assembled at runtime is right — you cannot prove what
// you did not read. Going *silent* about it is not. Four of the five headers
// had no equivalent of csp-undeterminable, so an undeterminable hit suppressed
// the *-missing finding and emitted nothing at all, leaving a reader unable to
// tell "nothing found" from "found and unparseable" — a dropped signal, not a
// withheld claim.
describe("an unreadable header is reported as unread, not as nothing", () => {
  const UNDETERMINABLE: Array<[string, string, string, string | null]> = [
    // header, the setter line, the undeterminable rule, the absence rule it replaces
    ["Content-Security-Policy", "cspValue", "csp-undeterminable", "csp-missing"],
    ["Strict-Transport-Security", "hstsValue", "hsts-undeterminable", "hsts-missing"],
    ["X-Content-Type-Options", "xctoValue", "x-content-type-options-undeterminable", "x-content-type-options-missing"],
    ["Referrer-Policy", "refValue", "referrer-policy-undeterminable", null],
    ["Permissions-Policy", "ppValue", "permissions-policy-undeterminable", "permissions-policy-missing"],
  ];

  const READABLE: Record<string, string> = {
    "Content-Security-Policy": HARD_CSP,
    "Strict-Transport-Security": HARD_HSTS,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": HARD_PP,
  };

  it.each(UNDETERMINABLE)("%s — a runtime-assembled value says so", (header, ident, rule, missing) => {
    const found = securityConfigRules([
      { path: "middleware.ts", source: `res.headers.set('${header}', ${ident})\n` },
    ]);
    const hit = found.find((f) => f.rule === rule);
    expect(hit, rule).toBeDefined();
    expect(hit!.severity).toBe("info");
    expect(hit!.doc).toBe("web-security-headers");
    // What was found, where, and that the real response is the authority.
    // The path is carried once, as `file` — not also folded into `message`,
    // which would hand a caller rendering `${file}:${line} — ${message}` the
    // same path twice. The markdown puts it back at render time.
    expect(hit!.file).toBe("middleware.ts");
    expect(hit!.message).not.toContain("middleware.ts");
    expect(hit!.message).toMatch(/assembled at runtime/);
    // csp-undeterminable's own wording predates the other four and says "in a
    // response"; the point asserted here is that all five send the reader to
    // the emitted header rather than leaving the value unmentioned.
    expect(hit!.fix).toMatch(/(?:in|on) a (?:real )?response/);
    // The absence claim stays suppressed — that part was already right.
    if (missing) expect(found.map((f) => f.rule)).not.toContain(missing);
  });

  it.each(UNDETERMINABLE)("%s — a readable value produces neither finding", (header, _ident, rule, missing) => {
    const found = cfgIds([
      { path: "_headers", source: `/*\n  ${header}: ${READABLE[header]}\n` },
    ]);
    expect(found).not.toContain(rule);
    if (missing) expect(found).not.toContain(missing);
  });

  it("says so for every header at once rather than falling silent on four", () => {
    const found = cfgIds([{ path: "middleware.ts", source:
      UNDETERMINABLE.map(([h, ident]) => `res.headers.set('${h}', ${ident})`).join("\n") + "\n" }]);
    for (const [, , rule] of UNDETERMINABLE) expect(found).toContain(rule);
  });
});

describe("the fixture matrix's guard — widening what counts as a declaration must not widen it to references", () => {
  // isHeaderDeclarationContext was widened (C1) to accept the quoted
  // object-literal property that most of the ecosystem uses. That is the same
  // function Task 9b hardened against reading a header-name *array* as
  // configuration, so every shape that guard covers is re-asserted here
  // against the widened version. The new test keys on what follows the name —
  // its own closing quote, then `:` or `=` — and every shape below closes
  // with `,`, `]`, `)` or a space instead.
  const missing = (source: string, path = "headers.ts") =>
    cfgIds([{ path, source }]).filter((r) => r === "csp-missing" || r === "hsts-missing");

  it("still reports both for the multi-line ALLOWED_RESPONSE_HEADERS array", () => {
    const source = `
export const ALLOWED_RESPONSE_HEADERS = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
];
`;
    expect(missing(source)).toEqual(["csp-missing", "hsts-missing"]);
  });

  it("still reports both for the same array on one line", () => {
    const source = `export const ALLOWED_RESPONSE_HEADERS = ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy"];`;
    expect(missing(source)).toEqual(["csp-missing", "hsts-missing"]);
  });

  it("still reports both for new Set([...])", () => {
    const source = `const ALLOWED = new Set(["Content-Security-Policy", "Strict-Transport-Security"]);`;
    expect(missing(source)).toEqual(["csp-missing", "hsts-missing"]);
  });

  it("still reports both for an array whose elements are separated by a comment containing ;", () => {
    const source = `const a = [
  "Content-Security-Policy", // e.g. default-src 'self'; script-src *
  "Strict-Transport-Security",
];`;
    expect(missing(source)).toEqual(["csp-missing", "hsts-missing"]);
  });

  it("does not read a feature flag's value side as a declaration", () => {
    expect(missing(`const flag = { allow: "Content-Security-Policy" };`)).toContain("csp-missing");
  });

  it("does not read a bare mention inside an error string as a declaration", () => {
    expect(missing(`throw new Error("Content-Security-Policy missing from the response");`)).toContain("csp-missing");
  });
});

describe("a capped scan cannot prove absence", () => {
  // SECURITY_EXTENSIONS is far wider than the design auditor's list, and
  // scanProject walks sorted entries: app/, components/ and lib/ all sort
  // before next.config.js. Reading as it walked, the audit hit the 400-file
  // cap before opening the one file that declares the headers — and then
  // reported the headers absent.
  const manyComponents = (): Record<string, string> => {
    const files: Record<string, string> = {};
    for (const dir of ["app", "components", "lib"]) {
      for (let i = 0; i < 140; i++) {
        files[`${dir}/C${String(i).padStart(3, "0")}.tsx`] = `export const C = () => <main><h1>hi</h1></main>;\n`;
      }
    }
    return files;
  };

  it("reads the configuration file even when 420 components would fill the cap", () => {
    const report = runProject({
      ...manyComponents(),
      "next.config.js": `module.exports = { async headers() { return [{ source: '/(.*)', headers: [
  { key: 'Content-Security-Policy', value: "${HARD_CSP}" },
  { key: 'Strict-Transport-Security', value: '${HARD_HSTS}' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Permissions-Policy', value: '${HARD_PP}' },
] }] } }\n`,
    });
    expect(report).toContain("Read header configuration from: `next.config.js`");
    expect(report).toContain("**0 error · 0 warning · 0 info**");
  });

  it("demotes every *-missing finding to an unconfirmed note when the scan was truncated", () => {
    const report = runProject(manyComponents());
    expect(report).toMatch(/results are partial/);
    // The absence may well be real — but it was not proved, so it is a note,
    // not an error, and it says which.
    expect(report).toContain("**0 error · 0 warning · 4 info**");
    expect(report).toMatch(/csp-missing[\s\S]*this absence is unconfirmed/);
  });
});

describe("rules that used to fire on correct code", () => {
  it("does not call a navigation a blocked subresource", () => {
    expect(ids(`<a href="http://example.org/rfc">rfc</a>`, "p.html")).not.toContain("http-subresource");
    expect(ids(`<a href="http://www.w3.org/1999/xhtml">ns</a>`, "p.html")).not.toContain("http-subresource");
  });

  it("still flags a real http subresource", () => {
    expect(ids(`<img src="http://x.example/a.png" alt="a">`, "p.html")).toContain("http-subresource");
    expect(ids(`<link rel="stylesheet" href="http://x.example/a.css">`, "p.html")).toContain("http-subresource");
  });

  // The rule said "browsers block it as mixed content" for every element,
  // including the three MDN says are auto-upgraded — contradicting
  // web-security-headers.md, which was verified against MDN in the same
  // release.
  it("does not tell an upgraded request it was blocked", () => {
    const msg = (markup: string) =>
      securitySourceRules(markup, "p.html").find((f) => f.rule === "http-subresource")!.message;

    for (const markup of [
      `<img src="http://x.example/a.png" alt="a">`,
      `<video src="http://x.example/v.mp4"></video>`,
      `<audio src="http://x.example/a.mp3"></audio>`,
      `<source src="http://x.example/v.webm">`,
    ]) {
      expect(msg(markup), markup).toMatch(/auto-upgrade/);
      expect(msg(markup), markup).not.toMatch(/browsers block it as mixed content/);
    }

    // "All mixed content that is not upgradable" keeps the blocking wording.
    for (const markup of [
      `<script src="http://x.example/s.js"></script>`,
      `<iframe src="http://x.example/f.html"></iframe>`,
      `<link rel="stylesheet" href="http://x.example/a.css">`,
      `<object data="http://x.example/o.swf"></object>`,
    ]) {
      expect(msg(markup), markup).toMatch(/browsers block it as mixed content/);
      expect(msg(markup), markup).not.toMatch(/auto-upgrade/);
    }

    // MDN's exception: an otherwise-upgradable request to a literal IP host
    // is blocked, not upgraded.
    expect(msg(`<img src="http://93.184.215.14/a.png" alt="a">`)).toMatch(/browsers block it as mixed content/);
    expect(msg(`<img src="http://[2606:2800:21f:cb07::1]/a.png" alt="a">`)).toMatch(/browsers block it as mixed content/);
    expect(msg(`<img src="http://example.com/a.png" alt="a">`)).toMatch(/auto-upgrade/);
  });

  it("keeps the doc id on both halves of the mixed-content split", () => {
    for (const markup of [`<img src="http://x.example/a.png" alt="a">`, `<script src="http://x.example/s.js"></script>`]) {
      const f = securitySourceRules(markup, "p.html").find((x) => x.rule === "http-subresource")!;
      expect(f.doc).toBe("web-security-headers");
      expect(f.severity).toBe("error");
    }
  });

  it("does not match an attribute name inside a data- attribute", () => {
    // `-` is a non-word character, so `\bsrc` matched `data-src` — and
    // `\bnonce` matched `data-nonce`, which *suppressed* a real finding.
    expect(ids(`<img data-src="http://x.example/a.png" alt="a">`, "p.html")).not.toContain("http-subresource");
    expect(ids(`<script data-nonce="x">var a = 1</script>`, "p.html")).toContain("inline-script-no-nonce");
    expect(ids(`<script nonce="abc">var a = 1</script>`, "p.html")).not.toContain("inline-script-no-nonce");
  });

  it("does not ask a JSON-LD data block for a nonce", () => {
    // The spec returns before the CSP inline check for a data block, so it is
    // not script-src-gated. This server's own SEO documents tell readers to
    // add exactly this — and then it flagged them for complying.
    expect(ids(`<script type="application/ld+json">{"@type":"Organization"}</script>`, "p.html"))
      .not.toContain("inline-script-no-nonce");
  });

  it("still asks the script types CSP does gate", () => {
    expect(ids(`<script type="importmap">{"imports":{}}</script>`, "p.html")).toContain("inline-script-no-nonce");
    expect(ids(`<script type="module">import "./a.js"</script>`, "p.html")).toContain("inline-script-no-nonce");
    expect(ids(`<script>var a = 1</script>`, "p.html")).toContain("inline-script-no-nonce");
  });

  it("tells a speculationrules block the fix that actually applies to it", () => {
    const f = securitySourceRules(`<script type="speculationrules">{"prerender":[]}</script>`, "p.html")
      .find((x) => x.rule === "inline-script-no-nonce");
    expect(f).toBeDefined();
    expect(f!.fix).toMatch(/Speculation-Rules|inline-speculation-rules/);
  });

  it("does not fire on an unclosed <script> with no body", () => {
    // indexOf returns -1 when the tag is never closed, and slice(end, -1) then
    // read to the end of the file, so this always fired.
    expect(ids(`<script>`, "p.html")).not.toContain("inline-script-no-nonce");
  });

  it("does not read a commented-out sourcemap setting, and reports the real one's own line", () => {
    const commented = cfgIds([{ path: "vite.config.ts", source: `export default {\n  build: {\n    // sourcemap: true,\n    sourcemap: false,\n  },\n};\n` }]);
    expect(commented).not.toContain("sourcemaps-in-production");

    const real = securityConfigRules([{ path: "vite.config.ts", source: `// we discussed sourcemap here\n// and sourcemap again\nexport default { build: { sourcemap: true } };\n` }])
      .find((f) => f.rule === "sourcemaps-in-production");
    expect(real).toBeDefined();
    expect(real!.line).toBe(3); // not line 1, where `search()` found the first mention
  });

  it("masks JS comments inside .astro frontmatter but not in the template", () => {
    expect(ids(`---\n// const w = window.open(url);\nconst title = "Hi";\n---\n<main><h1>{title}</h1></main>\n`, "Page.astro"))
      .not.toContain("window-open-without-noopener");
    expect(ids(`---\nconst w = window.open(url);\n---\n<main></main>\n`, "Page.astro"))
      .toContain("window-open-without-noopener");
    // Blanket `//` masking over markup would swallow the anchor below.
    expect(ids(`---\nconst x = 1;\n---\n<p>see //cdn.example.com</p>\n<a href="https://x.com" target="_blank">go</a>\n`, "Page.astro"))
      .toContain("blank-without-noopener");
  });

  it("accepts a monorepo .env covered by its own package's .gitignore", () => {
    expect(cfgIds([
      { path: ".gitignore", source: "node_modules\ndist\n" },
      { path: "packages/web/.gitignore", source: ".env\n" },
      { path: "packages/web/.env", source: "API_KEY=abc" },
    ])).not.toContain("env-committed");
  });

  it("still flags a nested .env no .gitignore covers, and does not let a lower one cover a higher file", () => {
    expect(cfgIds([
      { path: ".gitignore", source: "node_modules\n" },
      { path: "packages/web/.gitignore", source: "build\n" },
      { path: "packages/web/.env", source: "API_KEY=abc" },
    ])).toContain("env-committed");
    expect(cfgIds([
      { path: "packages/web/.gitignore", source: ".env\n" },
      { path: ".env", source: "API_KEY=abc" },
    ])).toContain("env-committed");
  });

  it("does not tell a Mapbox token holder to rotate a key that is public by design", () => {
    const f = securitySourceRules(`const t = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN`)
      .find((x) => x.rule === "public-env-secret");
    expect(f).toBeDefined();
    expect(f!.fix).not.toMatch(/already shipped is compromised/);
    expect(f!.fix).toMatch(/publishable/i);
    // A name that says it is publishable is not a finding at all.
    expect(ids(`const k = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_TOKEN`)).not.toContain("public-env-secret");
    expect(ids(`const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`)).not.toContain("public-env-secret");
    // …but a real secret still is, with the original wording.
    const secret = securitySourceRules(`const k = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY`)
      .find((x) => x.rule === "public-env-secret");
    expect(secret!.fix).toMatch(/rotate the value/);
  });

  // Softening the *fix text* left the severity alone, so a project whose only
  // finding was a Mapbox `pk.*` token — public by design, and URL-restricted —
  // still opened its report with "1 error". The severity is the part a reader
  // triages on.
  it("does not headline an error over a token whose name does not say it is secret", () => {
    const sev = (code: string) =>
      securitySourceRules(code).find((x) => x.rule === "public-env-secret")?.severity;
    expect(sev(`const t = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN`)).toBe("warning");
    expect(sev(`const t = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_TOKEN`)).toBe("warning");
    // A name that carries SECRET, PRIVATE, PASSWORD, or an API_KEY/ACCESS_KEY
    // pair is a defect whatever the value turns out to be.
    expect(sev(`const k = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY`)).toBe("error");
    expect(sev(`const k = process.env.NEXT_PUBLIC_API_KEY`)).toBe("error");
    expect(sev(`const k = process.env.VITE_AWS_ACCESS_KEY`)).toBe("error");
    expect(sev(`const k = process.env.REACT_APP_PRIVATE_KEY`)).toBe("error");
    expect(sev(`const k = process.env.NEXT_PUBLIC_DB_PASSWORD`)).toBe("error");
  });

  it("stays silent on a name that declares itself the published half of a key pair", () => {
    // A Solana mint address, a VAPID web-push key: PUBLIC_KEY is the name of
    // the half you are supposed to ship.
    expect(ids(`const m = process.env.NEXT_PUBLIC_TOKEN_MINT_PUBLIC_KEY`)).not.toContain("public-env-secret");
    expect(ids(`const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`)).not.toContain("public-env-secret");
    // The exemption is the adjacent pair, not the bare segment "PUBLIC" —
    // SECRET_KEY and PRIVATE_KEY can never match it.
    expect(ids(`const k = process.env.VITE_PUBLIC_STRIPE_SECRET_KEY`)).toContain("public-env-secret");
    expect(ids(`const k = process.env.NEXT_PUBLIC_SIGNING_PRIVATE_KEY`)).toContain("public-env-secret");
  });
});

describe("HSTS states the thresholds its cited document actually gives", () => {
  const hstsIds = (v: string) =>
    cfgIds([{ path: "_headers", source: `/*\n  Strict-Transport-Security: ${v}\n` }]).filter((r) => r.startsWith("hsts"));

  it("flags an inert preload token — the list requires a year and includeSubDomains", () => {
    // This header produced zero findings: 200 days clears the 180-day bar, and
    // nothing checked the preload claim it makes.
    expect(hstsIds("max-age=17280000; includeSubDomains; preload")).toContain("hsts-preload-ineffective");
    expect(hstsIds("max-age=31536000; preload")).toContain("hsts-preload-ineffective");
  });

  it("stays silent on a header that meets the preload requirements", () => {
    expect(hstsIds("max-age=63072000; includeSubDomains; preload")).toEqual([]);
  });

  it("no longer ties the 180-day low-protection line to preload eligibility", () => {
    const f = securityConfigRules([{ path: "_headers", source: `/*\n  Strict-Transport-Security: max-age=600\n` }])
      .find((x) => x.rule === "hsts-short-max-age");
    expect(f).toBeDefined();
    expect(f!.message).not.toMatch(/preload/i);
    expect(f!.fix).toContain("63072000"); // the value the document recommends
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The two rules in this module that still read the raw attribute chunk after
// the rest of it moved to a name-position reader. Both were false positives:
// a rule firing on prose that merely names the thing it looks for.
// ─────────────────────────────────────────────────────────────────────────────
describe("source rules — prose that names a sink is not a sink", () => {
  it("does not report dangerous-html for the word inside a title", () => {
    expect(ids(`<div title="we removed dangerouslySetInnerHTML from this file">x</div>`, "page.html"))
      .not.toContain("dangerous-html");
  });

  it("still reports a real dangerouslySetInnerHTML", () => {
    expect(ids(`<div dangerouslySetInnerHTML={{ __html: body }} />`, "page.tsx"))
      .toContain("dangerous-html");
  });

  it("does not report an inline handler for a data- attribute that merely starts with on", () => {
    expect(ids(`<button data-onclick="go">x</button>`, "page.html")).not.toContain("inline-event-handler");
  });

  it("does not report an inline handler for the word inside another value", () => {
    expect(ids(`<button title="attach onclick='go()' in JS instead">x</button>`, "page.html"))
      .not.toContain("inline-event-handler");
  });

  it("still reports a real inline handler", () => {
    expect(ids(`<button onclick="go()">x</button>`, "page.html")).toContain("inline-event-handler");
  });
});

// Pinned before `NOT_VISIBLE` moved from a prose template literal to
// `SECURITY_PREAMBLE` / `SECURITY_NOT_VISIBLE` / `SECURITY_CLOSING`, so that
// the split can be checked against the exact bytes `securityReport` rendered
// beforehand. A container change — array in, same markdown out — has nothing
// to prove if the "before" picture is taken after the change.
describe("the disclosure section, pinned before the split into an array", () => {
  it("renders the same disclosure section it rendered before the split", () => {
    expect(securityReport({ source: `<div dangerouslySetInnerHTML={{__html: x}} />`, filename: "a.tsx" }).text)
      .toMatchInlineSnapshot(`
        "# Security audit

        Scanned one snippet. Configuration rules need a directory — pass \`path\` to check headers.

        **0 error · 1 warning · 0 info**

        ## Warnings

        - **dangerous-html** (line 1) — dangerouslySetInnerHTML with no sanitiser imported in this file renders untrusted markup as live HTML.
          - Fix: Sanitise the value first (DOMPurify), or render it as text.
          - Read: \`get_design_doc("frontend-attack-surface")\`

        ## Not visible to this audit

        This audit reads local files only — it makes no request to your site. It cannot see:

        - Headers added by a CDN, WAF or reverse proxy (Cloudflare, Fastly, nginx) after your app responds.
        - Headers set by runtime logic that depends on the request.
        - Any value assembled from variables, which is reported as undeterminable rather than absent.
        - Server-side concerns entirely: authorization, injection, and access control are out of scope for a design server.
        - **Header shapes it does not recognise.** It reads \`next.config\` \`headers()\` \`key\`/\`value\` entries; \`vercel.json\`, \`netlify.toml\`, \`_headers\`, \`staticwebapp.config.json\`; quoted object properties (\`{ "Content-Security-Policy": "…" }\`) — Nuxt \`routeRules\`, a Remix/React Router \`headers\` export, \`new Response(body, { headers })\`, \`new Headers({…})\`, \`res.set({…})\`; \`res.setHeader(…)\`, \`headers.set/append(…)\`, \`reply.header(…)\` — including from Next.js and Astro \`middleware\`; SvelteKit's \`hooks.server.ts\` and \`kit.csp.directives\`, and \`<meta http-equiv>\`. A library that builds headers without naming them in your source — \`helmet\`, a framework preset, a shared middleware package — is invisible to it, and so is any shape not in that list. If your headers are set some other way, a "missing" finding above is about this audit's reach, not about your site.
        - **A truncated scan cannot prove absence.** If the scan line above says it stopped at a cap, every "missing" finding is unconfirmed and is reported as a note rather than a defect.

        A clean result here means these files declare nothing wrong. Confirm the emitted headers on a real response before treating it as coverage."
      `);
  });
});

describe("audit_security returns both registers", () => {
  it("is not empty", () => {
    expect(SECURITY_NOT_VISIBLE.length).toBeGreaterThan(0);
  });

  it("returns the notVisible list it printed, entry for entry, for a snippet with no findings", () => {
    const r = securityReport({ source: `<main><h1>Hi</h1></main>` });
    expect(r.structured.findings).toEqual([]);
    expect(r.structured.summary).toEqual({ error: 0, warning: 0, info: 0 });
    expect(r.structured.notVisible).toEqual(SECURITY_NOT_VISIBLE);
    expect(r.text).toContain("## Not visible to this audit");
  });

  it("renders every disclosure entry as its own bullet", () => {
    const r = securityReport({ source: `<main><h1>Hi</h1></main>` });
    for (const entry of r.structured.notVisible) expect(r.text).toContain(`- ${entry}`);
  });

  it("derives the summary from the same findings the markdown lists", () => {
    const r = securityReport({ source: `<script src="https://cdn.example.com/a.js"></script>` });
    expect(r.structured.summary).toEqual({ error: 1, warning: 0, info: 0 });
    expect(r.structured.findings.map((f) => f.rule)).toEqual(["external-script-no-sri"]);
    for (const f of r.structured.findings) expect(r.text).toContain(`**${f.rule}**`);
  });

  it("carries every finding's line number and doc into the structured half", () => {
    const r = securityReport({ source: `\n\n<script src="https://cdn.example.com/a.js"></script>`, filename: "a.tsx" });
    expect(r.structured.findings[0]).toMatchObject({ rule: "external-script-no-sri", line: 3, doc: "web-security-headers" });
  });

  it("carries the snippet's own filename onto each finding via the fallback file", () => {
    const r = securityReport({ source: `<script src="https://cdn.example.com/a.js"></script>`, filename: "a.tsx" });
    expect(r.structured.findings[0].file).toBe("a.tsx");
  });

  it("carries each project-scanned finding's own path as `file` only, never also inside the message", () => {
    // `file` is a replacement, not an addition: an agent that renders
    // `${f.file}:${f.line} — ${f.message}` must not read the path twice.
    // The markdown loses nothing — it prefixes `file` back onto the message
    // at render time, exactly as assembleAuditReport does — so the bullet is
    // byte-for-byte what it was when the path lived in the message.
    const root = mkdtempSync(join(tmpdir(), "saglitz-sec-struct-"));
    try {
      writeFileSync(join(root, "a.html"), `<script src="https://cdn.example.com/a.js"></script>`, "utf8");
      const r = securityReport({ root });
      const f = r.structured.findings.find((x: { rule: string }) => x.rule === "external-script-no-sri");
      expect(f).toBeDefined();
      expect(f!.file).toBe("a.html");
      expect(f!.message).not.toContain("a.html");
      expect(r.text).toContain(`— ${f!.file}: ${f!.message}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("carries a config rule's real file as `file` only too, when the declaration was found in one", () => {
    const root = mkdtempSync(join(tmpdir(), "saglitz-sec-struct-"));
    try {
      writeFileSync(
        join(root, "_headers"),
        `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'\n`,
        "utf8",
      );
      const r = securityReport({ root });
      const f = r.structured.findings.find((x: { rule: string }) => x.rule === "csp-unsafe-inline");
      expect(f).toBeDefined();
      expect(f!.file).toBe("_headers");
      expect(f!.message).not.toContain("_headers");
      expect(r.text).toContain(`— ${f!.file}: ${f!.message}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("leaves a project-wide absence claim with no `file` — 'configuration' names no real path", () => {
    // absent() attributes csp-missing etc. to the pseudo-path "configuration"
    // because no single file is the culprit; carrying that string as `file`
    // would misrepresent it as a real path relative to the audited directory,
    // so it stays folded into the message only, the same convention
    // assembleAuditReport's own project-wide claims use.
    const root = mkdtempSync(join(tmpdir(), "saglitz-sec-struct-"));
    try {
      writeFileSync(join(root, "app.js"), `console.log("hi");`, "utf8");
      const r = securityReport({ root });
      const f = r.structured.findings.find((x: { rule: string }) => x.rule === "csp-missing");
      expect(f).toBeDefined();
      expect(f!.file).toBeUndefined();
      expect(f!.message).toContain("configuration: ");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("closes without implying that silence elsewhere is a pass", () => {
    const r = securityReport({ source: `<main><h1>Hi</h1></main>` });
    expect(r.text).toContain(SECURITY_PREAMBLE);
    expect(r.text.endsWith(SECURITY_CLOSING)).toBe(true);
  });
});
