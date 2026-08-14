// Security auditing for web front ends and their deployment configuration.
//
// Two families, same reason as lint.ts: markup spreads over many lines and
// needs the tag scanner; JS/config statements sit on one line and need a
// line scan.
//
// Every rule here is a fact about the source, never a guess. A false positive
// in a security report does not merely add noise — it teaches the reader the
// output is unreliable, and the true finding in the next run gets skimmed past
// with the rest.

import { type LintFinding, type AuditReport, auditStructuredFrom, renderNotVisibleSection } from "./lint.js";
import {
  scanTags, type Tag, maskComments, bareAttrs, findAttr, hasAttr as sharedHasAttr,
} from "./scan.js";
import { scanProject, MAX_FILES } from "./project.js";

const lineOf = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

// An attribute name has to be found where a *name* can appear, and getting
// that boundary right took two goes.
//
// `\b` was the first mistake: `-` is a non-word character, so `\bsrc` matched
// inside `data-src`, `\bhref` inside `data-href`, and — the dangerous one —
// `\bnonce` inside `data-nonce`, silently suppressing a real inline-script
// finding. Allowing a name to begin only at the start of the chunk, after
// whitespace, or after a quote fixed that *prefix* case.
//
// It did not fix the general one, and the comment here used to claim it had.
// A quote before the name cannot be told from the quote *opening* a value,
// and whitespace inside a quoted value qualifies too — so an attribute name
// occurring inside another attribute's **value** still counted as that
// attribute. Every instance was a false negative, which is the direction that
// makes a report read clean when it is not:
//
//   <script data-n="add nonce later">var x=1</script>
//       → inline-script-no-nonce silenced by the word "nonce" in a data value
//   <iframe src="https://ads.example.com/x" title="sandbox demo">
//       → iframe-no-sandbox silenced by the word "sandbox" in a title
//   <script src="https://cdn.x/a.js" data-note="add integrity later">
//       → external-script-no-sri silenced by the word "integrity"
//   <a href="…" target="_blank" title="rel='noopener' explained">
//       → blank-without-noopener silenced by a rel= inside a title
//
// The fix is to look for names only where values are not, and it now lives in
// `scan.ts` — every module here that parses markup reads attributes through the
// one reader, because "which modules read attributes?" is a question about the
// codebase and not about a list somebody remembered to keep.
const hasAttr = (tag: Tag, name: string): boolean => sharedHasAttr(tag.attrs, name);

const attr = (tag: Tag, name: string): string | undefined => {
  const at = findAttr(tag.attrs, name);
  if (!at || at.bound) return undefined;
  const after = tag.attrs.slice(at.index + at.length);
  // Quoted, braced, or a bare token — `<a target=_blank>` is valid HTML, and
  // the two rules that used to sniff for it with their own regex now come
  // through here instead.
  //
  // A backslash cannot begin an unquoted value, and excluding it keeps this
  // reader off `<script type=\"module\">` — markup that only ever occurs
  // inside a JavaScript string literal, which this module scans as text.
  // Without the exclusion the bare-token branch matched the lone backslash
  // and read it as the type.
  const m = /^\s*=\s*("([^"]*)"|'([^']*)'|(\{[^}]*\})|([^\s"'`=<>\\]+))/.exec(after);
  if (!m) return undefined;
  return m[2] ?? m[3] ?? m[4] ?? m[5];
};

/**
 * An `on*="…"` handler written in the markup — the only shape that is actually
 * an inline handler, since a JSX `onClick={fn}` is not one.
 *
 * The name is found in the blanked copy and the quote that opens its value is
 * then checked in the original, because neither half is sufficient alone:
 * reading the raw chunk let `<button data-onclick="go">` pass for a handler
 * (`\b` matches after the hyphen), and reading the blanked chunk alone loses
 * the quote that distinguishes `onclick="go()"` from JSX.
 */
const hasInlineHandler = (attrs: string): boolean => {
  const re = /(?:^|\s)on[a-z]+(?=\s*=)/gi;
  const bare = bareAttrs(attrs);
  let m: RegExpExecArray | null;
  while ((m = re.exec(bare)) !== null) {
    if (/^\s*=\s*["']/.test(attrs.slice(m.index + m[0].length))) return true;
  }
  return false;
};

const isCrossOrigin = (url: string): boolean =>
  /^https?:\/\//i.test(url) || url.startsWith("//");

/**
 * Elements that fetch a *subresource* — something the page loads and then
 * uses as part of itself. Mixed-content blocking applies to these. It does
 * not apply to a navigation: `<a href="http://example.org/rfc">` is a link to
 * another page, browsers follow it, and flagging it as blocked mixed content
 * was both a false positive and a false statement about how browsers behave.
 * The same goes for a namespace URI like `http://www.w3.org/1999/xhtml`,
 * which is an identifier and is never fetched at all.
 */
const SUBRESOURCE_TAGS = new Set([
  "script", "img", "link", "iframe", "source", "video", "audio", "embed", "object", "track", "input",
]);
const SUBRESOURCE_ATTRS = ["src", "href", "data"] as const;

/**
 * MDN splits mixed content in two, and the split is a behavioural difference
 * rather than a nuance: browsers "auto-upgrad[e] image, video, and audio
 * mixed content requests from HTTP to HTTPS, and block insecure requests for
 * all other resource types". Telling the reader an `<img>` is blocked sends
 * them hunting for a block that never happened — the same class of false
 * statement as calling a navigation mixed content, which this rule already
 * had to fix once. `knowledge/security/web-security-headers.md` states the
 * split too; a rule that contradicts its own cited document is a rule the
 * reader stops believing.
 *
 * This is MDN's upgradable list, restricted to what the attribute scan below
 * can actually see: `<img src>` (an `<img>` whose origin comes from `srcset`
 * or `<picture>` is blockable, and neither attribute is read here),
 * `<audio src>`, `<video src>`, `<source>`. Everything else falls in the
 * other half by MDN's own definition of it — "all mixed content that is not
 * upgradable".
 */
const UPGRADABLE_SUBRESOURCE_TAGS = new Set(["img", "video", "audio", "source"]);

/**
 * The one exception to the upgrade: MDN — "Mixed content requests that would
 * otherwise be upgraded are blocked if the URL's host is an IP address rather
 * than a domain name." So `http://93.184.215.14/a.png` genuinely is blocked
 * where `http://example.com/a.png` is not, and it gets the blocking wording.
 */
const LITERAL_IP_HOST = /^https?:\/\/(?:\d{1,3}(?:\.\d{1,3}){3}|\[[0-9A-Fa-f:.]+\])(?::\d+)?(?:[/?#]|$)/;

/** `<link>` only fetches for some `rel` values; `alternate`/`canonical` do not. */
const FETCHING_REL = /\b(stylesheet|preload|modulepreload|prefetch|prerender|icon|manifest|apple-touch-icon)\b/i;

const isFetchedLink = (tag: Tag, name: string): boolean =>
  name !== "link" || FETCHING_REL.test(attr(tag, "rel") ?? "");

/**
 * Script types the CSP `script-src` directive actually gates.
 *
 * A `<script type="application/ld+json">` is a *data block*: the spec's
 * "prepare the script element" steps classify it as data and return before
 * the CSP inline check ever runs, so it needs no nonce and never did. This
 * server ships three documents (technical-seo, on-page-seo,
 * geo-tactics-checklist) telling readers to add exactly that block — and then
 * flagged them for following the advice.
 *
 * `module`, `importmap` and `speculationrules` *are* gated and stay flagged;
 * an importmap in particular is a high-value injection target. Anything with
 * an unrecognised type (a template, `text/x-handlebars`, a bundler's own
 * marker) is data too.
 */
const JS_MIME = /^(?:application|text)\/(?:x-)?(?:java|ecma)script\s*(?:;.*)?$/i;
const GATED_SCRIPT_TYPES = new Set(["", "module", "importmap", "speculationrules"]);

const isCspGatedScript = (tag: Tag): boolean => {
  const type = (attr(tag, "type") ?? "").trim().toLowerCase();
  return GATED_SCRIPT_TYPES.has(type) || JS_MIME.test(type);
};

const MARKUP_FILE = /\.(html?|vue|svelte|astro)$/i;

/** Sanitiser library names that make a raw-HTML sink defensible. */
const SANITISER = /\b(dompurify|sanitize-html|xss|Sanitizer)\b/i;

/**
 * True only when a sanitiser name appears in something that reads as an
 * import/require statement — never anywhere in the file. A bare whole-file
 * word search is defeated by a comment ("// we already fixed xss here")
 * sitting above an unsanitised sink; requiring import syntax means the
 * sanitiser has to actually be pulled into scope to suppress the finding.
 */
function hasSanitiserImport(code: string): boolean {
  return code.split("\n").some((line) => {
    const trimmed = line.trim();
    const looksLikeImport = /^import\b/.test(trimmed) || /\brequire\s*\(/.test(trimmed);
    return looksLikeImport && SANITISER.test(line);
  });
}

/**
 * Identifier segments, split on `_`/`-`, on lower→upper case transitions, and
 * on letter→digit transitions, then upper-cased — so "authToken",
 * "auth_token" and "AUTH_TOKEN" all normalise to ["AUTH", "TOKEN"] while
 * "tokenizer" stays the single segment "TOKENIZER". Matching whole segments
 * (rather than a bare substring test) is what keeps "authToken" flagged and
 * "authorized" / "tokenizer-settings" quiet.
 *
 * The letter→digit split is what makes `localStorage.setItem("token2", …)`
 * fire: without it "token2" is one segment, no whole segment equals TOKEN,
 * and a numbered credential key — the shape a second environment, a second
 * account or a migration produces — was silently exempt. Note the cost,
 * which is real: "auth0Domain" now splits to ["AUTH", "0", "DOMAIN"] and
 * fires. That is the same trade the segment matcher already makes elsewhere,
 * and it lands on names where a credential word is a word rather than a
 * substring; "tokenizer" and "authorized" are untouched, because no digit
 * boundary exists in them.
 */
function segmentsOf(id: string): string[] {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s.toUpperCase());
}

/**
 * True when a whole segment of `id` equals one of `words`, or an adjacent
 * pair of segments equals one of `pairs` (each given as "FIRST_SECOND", e.g.
 * "API_KEY" — so "NEXT_PUBLIC_API_KEY" fires but a lone "KEY" doesn't).
 */
function hasKeywordSegment(id: string, words: readonly string[], pairs: readonly string[] = []): boolean {
  const segs = segmentsOf(id);
  if (segs.some((s) => words.includes(s))) return true;
  for (let i = 0; i < segs.length - 1; i++) {
    if (pairs.includes(`${segs[i]}_${segs[i + 1]}`)) return true;
  }
  return false;
}

// "refresh" is deliberately absent: a bare "refreshRate" is not a credential,
// and "refreshToken" already fires on the TOKEN segment.
const CREDENTIAL_WORDS = ["TOKEN", "JWT", "AUTH", "SESSION", "CREDENTIAL"] as const;

const SECRET_WORDS = ["SECRET", "PRIVATE", "TOKEN", "PASSWORD", "PASSWD"] as const;
const SECRET_PAIRS = ["API_KEY", "ACCESS_KEY"] as const;

/**
 * A credential whose own name declares it public. Mapbox `pk.*` tokens,
 * Stripe publishable keys and Supabase anon keys are *designed* to ship in
 * the bundle — that is what row-level security and referrer restrictions are
 * for — so an error telling the reader to rotate them is a false positive,
 * and the loud kind: it asks for work that would break the site.
 * NEXT_PUBLIC_SUPABASE_ANON_KEY is already silent (no whole SECRET segment,
 * and ANON_KEY is not one of SECRET_PAIRS); this makes the same intent
 * explicit for names that also carry a credential word.
 */
// Deliberately not the bare segment "PUBLIC": every name here already carries a
// public prefix, so accepting that segment alone would exempt
// VITE_PUBLIC_STRIPE_SECRET_KEY too. The *pair* PUBLIC_KEY is safe where the
// bare segment is not — it names the half of an asymmetric pair that is
// published on purpose (a VAPID web-push key, a Solana mint address), and it
// cannot match SECRET_KEY or PRIVATE_KEY, which is where the danger was.
const PUBLIC_BY_DESIGN = ["PUBLISHABLE", "ANON"] as const;
const PUBLIC_BY_DESIGN_PAIRS = ["PUBLIC_KEY"] as const;

const isDeclaredPublicCredential = (id: string): boolean =>
  hasKeywordSegment(id, PUBLIC_BY_DESIGN, PUBLIC_BY_DESIGN_PAIRS);

export function securitySourceRules(code: string, filename?: string): LintFinding[] {
  const out: LintFinding[] = [];
  const push = (
    index: number,
    severity: LintFinding["severity"],
    rule: string,
    message: string,
    fix: string,
    doc: string,
  ) => out.push({ line: lineOf(code, index), severity, rule, message, fix, doc });

  // A code example in a doc comment, or a rule description quoting the very
  // API this module warns about ("Disallow window.open(url) without a
  // noopener…"), reads exactly like the real defect to a regex that never
  // looks at context. `maskComments` blanks comment text (same length, same
  // line numbers) before any rule sees it, so every check below — the tag
  // scanner and the line rules alike — only ever matches live code. Matched
  // text always comes from `masked`, so a genuine match still reports the
  // real source characters (masking only touches comment regions, which by
  // definition can never be where a genuine match is).
  const masked = maskComments(code, filename ?? "");

  // ── markup rules ───────────────────────────────────────────────────────────
  for (const tag of scanTags(masked)) {
    const name = tag.name.toLowerCase();

    // Read through `attr` rather than sniffing the raw chunk: a link whose
    // title *described* `target="_blank"` was reported as being one.
    if (name === "a" && /^_blank$/i.test((attr(tag, "target") ?? "").trim())) {
      const rel = attr(tag, "rel") ?? "";
      if (!/\bnoopener\b/i.test(rel)) {
        // Modern browsers (95.58%, caniuse mdn-html_elements_a_implicit_noopener)
        // already imply noopener for target="_blank" on an anchor, so this is
        // a defense-in-depth nudge, not a live defect — info, not error. The
        // real risk sits with window.open(), which still grants window.opener
        // by default; see window-open-without-noopener below.
        push(tag.index, "info", "blank-without-noopener",
          `target="_blank" without an explicit rel="noopener" relies on the browser's implicit default rather than stating the intent.`,
          `Add rel="noopener noreferrer" for defense-in-depth and clarity.`,
          "frontend-attack-surface");
      }
    }

    if (name === "script") {
      const src = attr(tag, "src");
      if (src && isCrossOrigin(src) && !hasAttr(tag, "integrity")) {
        push(tag.index, "error", "external-script-no-sri",
          `Cross-origin script "${src}" loads without an integrity hash, so whoever controls that host controls your page.`,
          `Add integrity="sha384-…" and crossorigin="anonymous", or self-host the file.`,
          "web-security-headers");
      }
      // `indexOf` returns -1 when the tag is never closed, and `slice(end, -1)`
      // then reads to the end of the file — so an unclosed <script> used to
      // fire this rule unconditionally, body or no body.
      const close = masked.indexOf("</script", tag.end);
      const body = masked.slice(tag.end, close === -1 ? undefined : close);
      // `integrity` is meaningless on an inline script — there is no fetched
      // resource to hash — so it never justified suppressing this. A nonce
      // does; so does not being script at all.
      if (!src && body.trim() && !hasAttr(tag, "nonce") && isCspGatedScript(tag)) {
        const type = (attr(tag, "type") ?? "").trim().toLowerCase();
        push(tag.index, "warning", "inline-script-no-nonce",
          `Inline <script${type ? ` type="${type}"` : ""}> without a nonce cannot run under a strict Content-Security-Policy.`,
          type === "speculationrules"
            ? `Serve the rules from a JSON file named by a Speculation-Rules header, or allow 'inline-speculation-rules' in script-src.`
            : `Move it to a file, or render it with a per-response nonce.`,
          "web-security-headers");
      }
    }

    if (SUBRESOURCE_TAGS.has(name) && isFetchedLink(tag, name)) {
      for (const a of SUBRESOURCE_ATTRS) {
        const v = attr(tag, a);
        if (v && /^http:\/\//i.test(v)) {
          const upgradable = UPGRADABLE_SUBRESOURCE_TAGS.has(name) && !LITERAL_IP_HOST.test(v);
          push(tag.index, "error", "http-subresource",
            upgradable
              ? `<${name} ${a}="${v}"> is fetched over plain HTTP. Browsers auto-upgrade image, video and audio requests to HTTPS rather than blocking them, so this one fails only if that host has no HTTPS — a broken resource rather than an insecure one, and an upgrade you are relying on instead of stating.`
              : `<${name} ${a}="${v}"> loads a subresource over plain HTTP; browsers block it as mixed content on an HTTPS page, and it is modifiable in transit.`,
            `Use https://, or a root-relative path on your own origin.`,
            "web-security-headers");
        }
      }
    }

    if (name === "iframe") {
      const src = attr(tag, "src");
      if (src && isCrossOrigin(src) && !hasAttr(tag, "sandbox")) {
        push(tag.index, "warning", "iframe-no-sandbox",
          `Third-party iframe "${src}" runs unsandboxed, with full scripting and navigation rights.`,
          `Add sandbox="allow-scripts" and widen it only as the embed requires.`,
          "frontend-attack-surface");
      }
    }

    // Same correction as the anchor above: `<input type="text"
    // title='type="password" field'>` is a text input, and was reported as a
    // password field with no autocomplete hint.
    if (name === "input" && /^password$/i.test((attr(tag, "type") ?? "").trim())) {
      const ac = attr(tag, "autocomplete");
      if (!ac || /^off$/i.test(ac)) {
        push(tag.index, "warning", "password-autocomplete",
          ac ? `autocomplete="off" on a password field fights password managers, which pushes users toward weaker, reused passwords.`
             : `Password field has no autocomplete hint, so managers and passkey autofill cannot target it.`,
          `Use autocomplete="current-password" on sign-in and "new-password" on registration and reset.`,
          "auth-and-session-ux");
      }
    }

    // Fires only for markup files: JSX onClick={fn} is not an inline handler,
    // and flagging it would be exactly the false positive this module refuses
    // to ship. `on[a-z]+="..."` (a quoted string, not a JSX expression) is the
    // only shape that is actually an inline handler.
    if (MARKUP_FILE.test(filename ?? "") && hasInlineHandler(tag.attrs)) {
      push(tag.index, "warning", "inline-event-handler",
        `Inline event handler blocks a strict Content-Security-Policy — it cannot be allowed without 'unsafe-inline'.`,
        `Attach the handler with addEventListener from a script file.`,
        "web-security-headers");
    }

    if (hasAttr(tag, "dangerouslySetInnerHTML") && !hasSanitiserImport(masked)) {
      push(tag.index, "warning", "dangerous-html",
        `dangerouslySetInnerHTML with no sanitiser imported in this file renders untrusted markup as live HTML.`,
        `Sanitise the value first (DOMPurify), or render it as text.`,
        "frontend-attack-surface");
    }
  }

  // ── line rules ─────────────────────────────────────────────────────────────
  const lines = masked.split("\n");
  let offset = 0;
  for (const line of lines) {
    const at = offset;
    offset += line.length + 1;

    // `\b` before a literal `{` never matches at the start of a tag body
    // (`<div>{@html …}` has no word char before the brace), which silently
    // disabled this branch for real Svelte markup. The brace itself is
    // already an unambiguous boundary, so only the trailing `\b` (which
    // keeps "{@htmlFoo}" from matching) is needed on that side.
    if ((/\bv-html\b/.test(line) || /\{@html\b/.test(line)) && !hasSanitiserImport(masked)) {
      push(at, "warning", "dangerous-html",
        `Raw HTML binding with no sanitiser imported in this file renders untrusted markup as live HTML.`,
        `Sanitise the value first (DOMPurify), or bind it as text.`,
        "frontend-attack-surface");
    }

    const ls = /localStorage\.setItem\(\s*["'`]([^"'`]+)/.exec(line);
    if (ls && hasKeywordSegment(ls[1], CREDENTIAL_WORDS)) {
      push(at, "error", "token-in-localstorage",
        `"${ls[1]}" is stored in localStorage, which any script on this origin can read — one XSS becomes lasting account takeover.`,
        `Keep the session in an HttpOnly, Secure, SameSite cookie, or hold the token in memory with a silent refresh.`,
        "auth-and-session-ux");
    }

    const env = /\b(?:NEXT_PUBLIC|VITE|PUBLIC|REACT_APP)_([A-Z0-9_]+)/.exec(line);
    if (env && hasKeywordSegment(env[1], SECRET_WORDS, SECRET_PAIRS) && !isDeclaredPublicCredential(env[1])) {
      // Some credentials are *designed* to ship in the bundle: a Mapbox
      // `pk.*` access token, a Supabase anon key, a Stripe publishable key.
      // Their names say so, and `isDeclaredPublicCredential` honours that.
      // What remains is a name that merely carries TOKEN and nothing else —
      // VITE_MAPBOX_ACCESS_TOKEN is that shape, and a Mapbox `pk.*` token is
      // public by design and URL-restricted. Headlining "1 error" on a
      // correct project is the false positive this module refuses, so a
      // TOKEN-only match is a `warning` that asks the reader to confirm the
      // token is publishable. Only a name that also carries SECRET, PRIVATE,
      // PASSWORD or an API_KEY/ACCESS_KEY pair — where being in the bundle is
      // a defect whatever the value turns out to be — stays an `error`.
      const tokenOnly = !hasKeywordSegment(env[1], ["SECRET", "PRIVATE", "PASSWORD", "PASSWD"], SECRET_PAIRS);
      push(at, tokenOnly ? "warning" : "error", "public-env-secret",
        tokenOnly
          ? `A build-time public variable named "${env[0]}" is inlined into the client bundle, so whatever it holds ships to every visitor. Some tokens are meant to — a Mapbox pk.*, a Stripe publishable key — and this name does not say which kind it is.`
          : `A build-time public variable named "${env[0]}" is inlined into the client bundle and is public the moment it ships.`,
        tokenOnly
          ? `Confirm this token is publishable and restricted by URL or origin. If it is, rename it to say so — PUBLISHABLE, ANON or PUBLIC_KEY — so the next reader does not have to check. If it is not, move it to a server-only variable and rotate the value.`
          : `Move it to a server-only variable and rotate the value — anything already shipped is compromised.`,
        "frontend-attack-surface");
    }

    const secret = /\b(?:secret|password|api_?key|access_?key|private_?key|token)\s*[:=]\s*["'`]([A-Za-z0-9+/_-]{24,})["'`]/i.exec(line);
    if (secret) {
      push(at, "error", "hardcoded-secret",
        `A credential-shaped literal is assigned in source; committed secrets stay in git history after deletion.`,
        `Read it from a server-side environment variable and rotate the value.`,
        "frontend-attack-surface");
    }

    // The origin is postMessage's second argument. Requiring the quoted "*"
    // to be immediately followed by the closing paren missed calls with a
    // third `transfer` argument (`postMessage(data, "*", [port])`), which is
    // a real, common part of the API — so the boundary here is "more args
    // follow" (a comma) or "the call ends" (the paren), not just the paren.
    if (/postMessage\s*\(\s*[^,]*,\s*["'`]\*["'`]\s*(?:,|\))/.test(line)) {
      push(at, "warning", "postmessage-wildcard-origin",
        `postMessage with a "*" target origin delivers the payload to whatever document currently occupies that frame.`,
        `Pass the exact origin you intend, and check event.origin on the receiving side.`,
        "frontend-attack-surface");
    }

    // window.open() grants the new window a window.opener reference back to
    // this page by default — unlike target="_blank" on an anchor, which
    // browsers now imply noopener for (95.58% support, caniuse
    // mdn-html_elements_a_implicit_noopener), so that case is not re-flagged
    // here at the same severity.
    //
    // Capture only the argument list between the call's own parens, not the
    // rest of the line: scanning to end-of-line let a trailing `// TODO
    // ensure noopener elsewhere` comment satisfy the check without a real
    // "noopener" ever reaching the call.
    const wo = /\bwindow\.open\s*\(([^)]*)\)/.exec(line);
    if (wo && !/noopener/i.test(wo[1])) {
      push(at, "warning", "window-open-without-noopener",
        `window.open() grants the new window a window.opener reference back to this page by default.`,
        `Pass "noopener" in the third argument: window.open(url, target, "noopener").`,
        "frontend-attack-surface");
    }
  }

  // One finding per rule per line — dangerous-html can otherwise fire twice
  // for one defect (once from the tag loop's dangerouslySetInnerHTML check,
  // once from the line loop's v-html/{@html} check on the same `.vue` line).
  const seen = new Set<string>();
  const deduped = out.filter((f) => {
    const key = `${f.rule}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => a.line - b.line);
}

// ── configuration rules ──────────────────────────────────────────────────────
//
// Header state is inferred from local files. The server makes no network call,
// so a CDN or reverse proxy can add headers this audit cannot see — the report
// says so rather than implying the absence is real.
//
// Configuration is read as text and never evaluated, the same rule
// import_design_tokens set for tailwind.config.js.

// `.ts` covers both middleware.ts and proxy.ts — Next.js 16 deprecated the
// former and renamed it to the latter, so narrowing this list to named files
// would go blind on every Next.js 16 project.
export const SECURITY_EXTENSIONS = [
  ".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".astro",
  ".ts", ".js", ".mjs", ".cjs", ".mts", ".cts", ".json", ".toml",
];

/**
 * Files read by name rather than extension — and, in `scanProject`, read
 * *before* the extension matches and exempt from the file cap. Every name
 * here is somewhere a project declares its response headers, and a header
 * audit that never opened the header configuration is worse than no audit:
 * it reports the headers absent. Most of these also match on extension, so
 * listing them changes nothing about *whether* they are read — only about
 * whether 400 components can push them out of the scan.
 */
export const SECURITY_FILENAMES = [
  "_headers", ".env", ".env.local", ".env.production", ".gitignore",
  "netlify.toml", "vercel.json", "staticwebapp.config.json", "wrangler.toml", "firebase.json",
  "next.config.js", "next.config.mjs", "next.config.cjs", "next.config.ts",
  "nuxt.config.js", "nuxt.config.ts",
  "svelte.config.js", "svelte.config.ts",
  "astro.config.js", "astro.config.mjs", "astro.config.ts",
  "vite.config.js", "vite.config.ts",
  "remix.config.js", "react-router.config.ts",
  "middleware.ts", "middleware.js", "proxy.ts", "proxy.js",
  "hooks.server.ts", "hooks.server.js",
];

const HEADER_NAMES = [
  "Content-Security-Policy",
  "Content-Security-Policy-Report-Only",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
] as const;

const HEADER_NAME_SET = new Set(HEADER_NAMES.map((h) => h.toLowerCase()));

export interface HeaderHit {
  value: string;
  file: string;
  line: number;
  /** The value is assembled at runtime, so its contents cannot be read here. */
  undeterminable: boolean;
  /** Delivered by `<meta http-equiv>`, where some directives are ignored. */
  viaMeta?: boolean;
}

/**
 * @deprecated import from scan.js. `maskComments` moved to scan.ts so the SEO
 * and performance auditors could share it without a second one-way import;
 * this re-export stays for one release so nothing outside this repo breaks.
 */
export { maskComments };

// The method names that actually set a response header, across the runtimes
// this tool is likely to see: the fetch-standard Headers/Response `.set()`/
// `.append()`, raw Node's `res.setHeader()`, and Fastify's `reply.header()`.
// Matched as the call's own last identifier segment (see
// `isHeaderDeclarationContext`), never a substring — `.set(` alone would
// also (wrongly) accept `.reset(` or `.offset(`, and a bare substring check
// for `set`/`append` misses `setHeader`/`header` entirely, which is exactly
// the regression a first pass at this shipped: `res.setHeader(...)` and
// `reply.header(...)` are at least as common as the bare `.set()` form, and
// silently not recognising them produced a false `csp-missing` on a project
// that sets its CSP correctly — the one direction this module refuses.
const HEADER_METHOD_NAMES = new Set(["set", "setheader", "append", "header"]);

/**
 * Scan back from `idx` to the nearest statement/block boundary — `;`, `{`
 * or `}` — rather than a fixed character count. A `.set(` call reformatted
 * across several lines (a common Prettier shape for a call with more
 * arguments than fit on one line), or a long inline comment between `(` and
 * the header name, both still sit inside a single statement; a fixed-width
 * window has no relationship to where that statement actually starts and
 * can cut a real declaration off, producing the same false `csp-missing`
 * this function exists to prevent. Capped a few thousand characters back
 * purely as a safety valve against a pathological file with no boundary
 * character for a very long stretch (e.g. minified code) — not the real
 * bound, which is the syntax itself.
 */
function statementStart(text: string, idx: number): number {
  const cap = Math.max(0, idx - 4000);
  let i = idx - 1;
  while (i >= cap && text[i] !== ";" && text[i] !== "{" && text[i] !== "}") i--;
  return i + 1;
}

/**
 * True when the header-name occurrence ending at `idx` in `text` sits in a
 * shape that actually declares a value:
 *   - bare at the start of its own line (only whitespace precedes it back to
 *     the previous newline) — the `_headers` / netlify.toml shape, where the
 *     header name is never quoted;
 *   - immediately after a call whose own method name is one of
 *     `HEADER_METHOD_NAMES` (`res.setHeader(`, `reply.header(`,
 *     `headers.set(`, `headers.append(`, …) — matched on the identifier
 *     itself, not a substring of it;
 *   - immediately after a `key`/`value`-style property (`key: 'X'` or the
 *     JSON `"key": "X"`), optionally quoted, colon or `=`;
 *   - a quoted object-literal property name — `"Content-Security-Policy":
 *     "…"` — which is the canonical shape almost everywhere outside
 *     Next.js: Nuxt `routeRules.headers`, a Remix/React Router `export const
 *     headers`, `new Response(body, { headers: { … } })` in a Cloudflare
 *     Worker / Deno / Bun handler, `new Headers({ … })`, Express
 *     `res.set({ … })`, and Azure's `staticwebapp.config.json`
 *     `globalHeaders`. Not recognising it reported "no headers found" — and
 *     four fabricated findings — on projects with exemplary headers. The
 *     test is keyed on what *follows* the name (its own closing quote, then
 *     `:` or `=`) rather than what precedes it, because what precedes a
 *     property name and what precedes an array element are identical.
 * Anything else — most importantly a header name sitting in a plain list
 * (`["Content-Security-Policy", "Strict-Transport-Security"]`, e.g. an
 * `ALLOWED_RESPONSE_HEADERS` reference array) — is not a declaration. That
 * shape has no assignment context at all: the character before the opening
 * quote is `[` or `,`, and there is no recognised call or `key:` anywhere in
 * the statement. This is a positive allowlist, not a blocklist of `[`/`,`,
 * precisely because an unrecognised shape should be read as "not proven to
 * declare anything" rather than guessed at — a missed declaration surfaces
 * as `*-missing`, which is a visible, quickly-disproved false alarm; a
 * fabricated one silently swallows a real absence, which is the failure
 * this exists to prevent. Widening what counts as a declaration context
 * (this function) is not the same move as weakening that guard — the array
 * shape must, and does, still fall through to false.
 */
function isHeaderDeclarationContext(text: string, idx: number, headerLength: number): boolean {
  const lineStart = text.lastIndexOf("\n", idx - 1) + 1;
  if (/^[ \t]*$/.test(text.slice(lineStart, idx))) return true;

  // Object-literal property: the header name's own closing quote is followed
  // by `:` or `=`. A reference array (["Content-Security-Policy", …]) closes
  // with `,` or `]`, so that shape still falls through to false.
  const q = text[idx - 1];
  if (q === '"' || q === "'" || q === "`") {
    if (new RegExp(`^\\${q}\\s*[:=]`).test(text.slice(idx + headerLength))) return true;
  }

  const before = text.slice(statementStart(text, idx), idx);

  const call = /\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*["'`]?$/.exec(before);
  if (call && HEADER_METHOD_NAMES.has(call[1].toLowerCase())) return true;

  return /["'`]?key["'`]?\s*[:=]\s*["'`]?$/i.test(before);
}

/**
 * `<meta http-equiv="Content-Security-Policy" content="…">`. It is a weaker
 * delivery than a real header — `frame-ancestors`, `report-uri` and `sandbox`
 * are ignored in a meta policy (CSP Level 3) — but it is unambiguously a
 * declaration, and reporting `csp-missing` at a page that ships one is the
 * fabricated absence this module exists to avoid. The weakness is reported as
 * its own finding instead of being read as nothing.
 */
function metaHttpEquiv(file: MaskedFile): { key: string; hit: HeaderHit } | null {
  if (!/\.(?:html?|astro|vue|svelte|[jt]sx)$/i.test(file.path)) return null;
  for (const tag of scanTags(file.masked)) {
    if (tag.name.toLowerCase() !== "meta") continue;
    const equiv = (attr(tag, "http-equiv") ?? "").trim().toLowerCase();
    if (!HEADER_NAME_SET.has(equiv)) continue;
    const content = attr(tag, "content");
    if (content === undefined) continue;
    return {
      key: equiv,
      hit: {
        value: content,
        file: file.path,
        line: lineOf(file.source, tag.index),
        undeterminable: /\$\{|\{[^}]*\}/.test(content),
        viaMeta: true,
      },
    };
  }
  return null;
}

const CSP_KEYWORDS = new Set([
  "self", "none", "unsafe-inline", "unsafe-eval", "unsafe-hashes", "wasm-unsafe-eval",
  "strict-dynamic", "report-sample", "inline-speculation-rules", "nonce",
]);

/**
 * SvelteKit declares its CSP in `svelte.config.js` as `kit.csp.directives`,
 * an object of directive → array of *unquoted* source tokens — the string
 * "Content-Security-Policy" appears nowhere in the file, so the header scan
 * above cannot see it and used to call a correctly-configured SvelteKit
 * project `csp-missing`. The tokens are reassembled into the policy the
 * adapter will emit (SvelteKit quotes the keyword sources itself), so the
 * directive rules below can read it like any other policy. Anything that
 * cannot be read as a literal list — a spread, a variable — makes the whole
 * policy undeterminable rather than a guess.
 */
function svelteKitCsp(file: MaskedFile): { key: string; hit: HeaderHit } | null {
  if (!/(^|\/)svelte\.config\.[cm]?[jt]s$/i.test(file.path)) return null;
  const at = file.masked.search(/\bdirectives\s*:\s*\{/);
  if (at === -1) return null;
  const open = file.masked.indexOf("{", at);
  let depth = 0;
  let close = -1;
  for (let i = open; i < file.masked.length; i++) {
    if (file.masked[i] === "{") depth++;
    else if (file.masked[i] === "}" && --depth === 0) { close = i; break; }
  }
  if (close === -1) return null;

  const block = file.source.slice(open + 1, close);
  const directives: string[] = [];
  let undeterminable = /\.\.\./.test(block);
  const entryRe = /["']?([a-z][a-z0-9-]*)["']?\s*:\s*\[([^\]]*)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block)) !== null) {
    const tokens: string[] = [];
    for (const raw of m[2].split(",")) {
      const t = raw.trim().replace(/^["'`]|["'`]$/g, "");
      if (!t) continue;
      // An unquoted token is a variable reference, not a source expression.
      if (/[${}]/.test(t) || /^[A-Za-z_$][\w$]*$/.test(raw.trim())) { undeterminable = true; continue; }
      // SvelteKit's bare `nonce` token emits a real per-response nonce whose
      // value is generated at render time — present, but not readable here.
      if (t === "nonce") { tokens.push("'nonce-…'"); continue; }
      tokens.push(CSP_KEYWORDS.has(t) || /^(?:nonce|sha(?:256|384|512))-/.test(t) ? `'${t}'` : t);
    }
    directives.push(`${m[1].toLowerCase()} ${tokens.join(" ")}`.trim());
  }
  if (!directives.length) return null;

  return {
    key: "content-security-policy",
    hit: {
      value: directives.join("; "),
      file: file.path,
      line: lineOf(file.source, at),
      undeterminable,
    },
  };
}

/** A file with its comment regions blanked, masked once and shared by every rule. */
export interface MaskedFile {
  path: string;
  source: string;
  masked: string;
}

export const maskFiles = (files: Array<{ path: string; source: string }>): MaskedFile[] =>
  files.map((f) => ({ path: f.path, source: f.source, masked: maskComments(f.source, f.path) }));

/**
 * Find each header's declared value across every configuration shape we support:
 * `key: 'X', value: '…'` (next.config, vercel.json), `X = "…"` (netlify.toml),
 * `X: …` to end of line (_headers), `.set('X', v)` (middleware/proxy),
 * `{ 'X': '…' }` (Nuxt, Remix, Workers, Express, Azure), `<meta http-equiv>`
 * and SvelteKit's `kit.csp.directives`.
 */
export function extractHeaders(files: Array<{ path: string; source: string }>): Map<string, HeaderHit> {
  return extractHeadersFrom(maskFiles(files));
}

export function extractHeadersFrom(files: MaskedFile[]): Map<string, HeaderHit> {
  const found = new Map<string, HeaderHit>();

  const record = (key: string, hit: HeaderHit) => {
    const existing = found.get(key);
    // Prefer a readable declaration over an undeterminable one.
    if (!existing || (existing.undeterminable && !hit.undeterminable)) found.set(key, hit);
  };

  for (const file of files) {
    const masked = file.masked;

    for (const special of [metaHttpEquiv(file), svelteKitCsp(file)]) {
      if (special) record(special.key, special.hit);
    }

    for (const header of HEADER_NAMES) {
      // Hyphens need no escaping in a regex — nothing else in `header` is a
      // metacharacter either, so it is used as written.
      const nameRe = new RegExp(header, "gi");
      let m: RegExpExecArray | null;
      // Search the masked text so a commented-out mention is never found in
      // the first place, but slice the real source for `after` — the mask
      // exists only to hide matches, not to corrupt the content once a real
      // one is found.
      while ((m = nameRe.exec(masked)) !== null) {
        // A header name can appear as a plain reference — a list of allowed/
        // known header names, an enum, documentation — with no value beside
        // it at all. Only an occurrence that actually sits where a value
        // would be assigned counts as a declaration; skip everything else
        // before it gets anywhere near being read as one.
        if (!isHeaderDeclarationContext(masked, m.index, header.length)) continue;

        const after = file.source.slice(m.index + header.length, m.index + header.length + 4000);
        const line = file.source.slice(0, m.index).split("\n").length;

        let value: string | undefined;
        let undeterminable = false;

        // Consume, without ambiguity: an optional quote that merely closes
        // the header name's own string literal (`.set('X', …)` / `key:
        // 'X'`), then separators, then an optional `value:`/`value =`
        // keyword. None of this is allowed to double as the *value's*
        // opening delimiter. The previous version used one regex with a
        // shared optional leading-quote group, and on Next.js's own
        // documented pattern —
        //   requestHeaders.set('Content-Security-Policy', cspHeaderValue)
        // — backtracking let that group give back the header name's own
        // closing quote, which the mandatory capture group then happily
        // reused as if it were the value's opening quote, lazily scanning
        // forward to whatever quote character appeared next *anywhere else
        // in the file* (typically the second `.set(...)` call a few lines
        // down) and reporting the text in between as a real, readable CSP.
        //
        // The property separator (`:` in `{ "X": "…" }`, `=` in netlify.toml)
        // is consumed here too, so the object-literal shape reaches the same
        // value reader as every other shape.
        const closing = /^(["'`])/.exec(after);
        const afterName = closing ? after.slice(1) : after;
        const lead = /^[\s,]*(?:[:=][\s,]*)?(?:["'`]?value["'`]?\s*[:=]\s*)?[\s,]*/.exec(afterName)!;
        const rest = afterName.slice(lead[0].length);

        const openQuote = /^(["'`])/.exec(rest);
        if (openQuote) {
          const q = openQuote[1];
          const closeIdx = rest.indexOf(q, 1);
          if (closeIdx === -1) {
            // Opened but never closed within the scan window — can't be
            // read confidently either way.
            value = "";
            undeterminable = true;
          } else {
            value = rest.slice(1, closeIdx);
            if (q === "`" && /\$\{/.test(value)) undeterminable = true;
          }
        } else if (closing) {
          // The name was quoted, so this is code or JSON: an unquoted value
          // is an identifier or an expression, never literal header text.
          if (/^[A-Za-z_$]/.test(rest)) {
            // (`value: cspHeaderValue`, `.set('X', cspHeaderValue.replace(…))`,
            // `{ "X": cspValue }`) — its contents cannot be read from source
            // without evaluating it.
            value = "";
            undeterminable = true;
          }
        } else {
          const colon = /^\s*[:=]\s*([^\n]+)/.exec(after);
          if (colon) {
            // Strip an outer wrapping quote pair (netlify.toml's `X = "…"`),
            // but only when the leading and trailing characters are a
            // matching quote — never a bare trailing-quote strip. A
            // `_headers`-style value ends in plain text that can itself
            // close with a CSP keyword like 'unsafe-inline', and stripping
            // "any trailing quote" was chewing off that keyword's own
            // closing quote, silently corrupting the last source expression
            // in every directive list.
            const raw = colon[1].trim();
            const wrapped = /^(["'`])([\s\S]*)\1,?$/.exec(raw);
            value = wrapped ? wrapped[2] : raw;
          }
        }

        if (value === undefined) continue;
        // A second, independent guard against the same failure
        // isHeaderDeclarationContext defends against: a real header value is
        // never exactly another header's name. This catches a declaration
        // shape the context check doesn't recognise (rather than one it
        // does), which is exactly what happened auditing this module's own
        // HEADER_NAMES array — CSP immediately followed by CSP-Report-Only,
        // each read as if it were the other's value.
        if (HEADER_NAME_SET.has(value.trim().toLowerCase())) continue;
        if (!undeterminable && /\$\{|\+\s*[A-Za-z_$]/.test(value)) undeterminable = true;

        // A third guard, against a shape the first two cannot catch: a value
        // that is a perfectly well-formed declaration of something that is
        // not a header value. See `HEADER_GRAMMAR` — a decoy shadows a real
        // absence, which is worse than inventing a finding. An unreadable
        // value is exempt, because there is nothing to parse.
        if (!undeterminable && !declaresHeaderValue(header, value)) continue;

        record(header.toLowerCase(), { value, file: file.path, line, undeterminable });
      }
    }
  }

  return found;
}

/**
 * A conservative subset of .gitignore pattern matching for one relative file
 * path — exact/basename names, a leading `/` (root-anchored), a trailing `/`
 * (directory-only, so it can never match a file), a leading double-star
 * segment meaning "any depth", and `*` / `?` glob wildcards within one path
 * segment. This is not a full .gitignore implementation. A pattern shaped
 * some other way (negation, an un-anchored internal `/`, a double-star in
 * the middle) is treated as not matching rather than guessed at:
 * `env-committed` is `error` severity, so a pattern we do not actually
 * understand should not be stretched into exempting — or, in the other
 * direction, into flagging — a file we cannot really evaluate the rule for.
 */
function matchesGitignorePattern(pattern: string, filePath: string): boolean {
  let p = pattern.trim();
  if (!p || p.startsWith("#") || p.startsWith("!") || p.endsWith("/")) return false;

  const anchored = p.startsWith("/");
  if (anchored) p = p.slice(1);
  else if (p.startsWith("**/")) p = p.slice(3);
  else if (p.includes("/")) return false; // un-anchored internal slash: beyond this matcher

  const toRegExp = (glob: string) =>
    new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")}$`);

  const path = filePath.replace(/^\/+/, "");
  if (anchored) return toRegExp(p).test(path);
  const base = path.split("/").pop() ?? path;
  return toRegExp(p).test(base);
}

/**
 * Every directive name in the CSP reference — fetch, document, navigation,
 * reporting, "other", and the two deprecated ones (MDN's
 * Content-Security-Policy page, verified 2026-08-13). Used only to answer
 * "is this string a policy at all", never to grade one, so a name being
 * deprecated or experimental is irrelevant here: a policy that sets it is
 * still a policy.
 */
const CSP_DIRECTIVES = new Set([
  // fetch directives
  "child-src", "connect-src", "default-src", "fenced-frame-src", "font-src", "frame-src",
  "img-src", "manifest-src", "media-src", "object-src", "prefetch-src", "script-src",
  "script-src-elem", "script-src-attr", "style-src", "style-src-elem", "style-src-attr",
  "worker-src",
  // document directives
  "base-uri", "sandbox",
  // navigation directives
  "form-action", "frame-ancestors",
  // reporting directives
  "report-to", "report-uri",
  // other directives
  "require-trusted-types-for", "trusted-types", "upgrade-insecure-requests",
  // deprecated
  "block-all-mixed-content",
]);

/**
 * True when a candidate value names at least one CSP directive — i.e. when it
 * is a policy rather than a string that merely sits where one would.
 *
 * A real policy always names a directive; `"controls which resources the page
 * may load"` parses to a directive called `controls`. A policy whose only
 * directive is newer than this list is rejected too, and surfaces as a
 * visible, quickly-disproved `csp-missing` rather than a silent one — the
 * same trade every guard in this family makes.
 */
const declaresCspDirective = (value: string): boolean =>
  [...parseCsp(value).keys()].some((d) => CSP_DIRECTIVES.has(d));

/**
 * `max-age=<digits>` is mandatory (RFC 6797); `includeSubDomains` and
 * `preload` are the only other tokens defined for the header. `max-age=0` is
 * both legal and meaningful — it clears a previously-sent policy — so it is a
 * declaration, not a decoy.
 */
const HSTS_MAX_AGE = /^max-age\s*=\s*"?\d+"?$/i;
const HSTS_TOKEN = /^(?:max-age\s*=\s*"?\d+"?|includesubdomains|preload)$/i;

const declaresHsts = (value: string): boolean => {
  const tokens = value.split(";").map((t) => t.trim()).filter(Boolean);
  return tokens.length > 0
    && tokens.every((t) => HSTS_TOKEN.test(t))
    && tokens.some((t) => HSTS_MAX_AGE.test(t));
};

/** The eight policy tokens the spec defines; a comma-separated list is legal
 * (it is how a fallback for older agents is expressed) and stays accepted. */
const REFERRER_POLICY_TOKENS = new Set([
  "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin",
  "same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url",
]);

const declaresReferrerPolicy = (value: string): boolean => {
  const tokens = value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => REFERRER_POLICY_TOKENS.has(t));
};

/**
 * `feature=(allowlist)` pairs, comma-separated. The allowlist is
 * space-separated inside its parentheses, so splitting the value on commas
 * never cuts one in half. `*`, `self` and a bare quoted origin are the other
 * legal right-hand sides.
 */
const PERMISSIONS_POLICY_ITEM = /^[A-Za-z0-9-]+\s*=\s*(?:\([^()]*\)|\*|self|"[^"]*")$/;

const declaresPermissionsPolicy = (value: string): boolean => {
  const items = value.split(",").map((t) => t.trim()).filter(Boolean);
  return items.length > 0 && items.every((t) => PERMISSIONS_POLICY_ITEM.test(t));
};

/**
 * One grammar check per header the extractor reads: "is this string a value
 * for this header at all", never "is it a good one" — grading is what the
 * rules below do, and a check that grades here would suppress the very
 * findings it exists to protect.
 *
 * Why every header and not just CSP. Recognising the object-literal shape
 * `"Strict-Transport-Security": "…"` as a declaration means recognising
 * anything shaped like it, and a docs map, an i18n bundle or a test fixture
 * carries exactly that shape. The damage is not the invented finding: with no
 * real header in the project, `hsts-missing` (warning) is replaced by
 * `hsts-no-subdomains` (info) pointing at the decoy, so a real absence is
 * hidden rather than embellished — the worse direction, and the same failure
 * `csp-missing` had. Fixing it for one header would have been worse than
 * fixing it for none: a guard that covers one header reads as a guard that
 * covers headers.
 *
 * Each check is deliberately strict about tokens it does not know, because
 * the two failure directions are not symmetric. Rejecting a legal value that
 * post-dates this list produces a `*-missing` finding, which is visible and
 * disproved in seconds. Accepting prose swallows a real absence silently.
 *
 * A value assembled at runtime is exempt at the call site: there is nothing
 * to parse, and that path already reports `undeterminable` rather than
 * claiming absence.
 */
// Keyed on `HEADER_NAMES` itself, and typed to require every one of them. A
// free-form `Record<string, …>` would let a key drift out of step with the
// name the extractor searches for — a typo, or a rename that touched one list
// and not the other — and the failure would be silent in the worst direction:
// the grammar check for that header simply stops running, and decoys are
// accepted again. Here that is a compile error.
const HEADER_GRAMMAR: Record<Lowercase<(typeof HEADER_NAMES)[number]>, (value: string) => boolean> = {
  "content-security-policy": declaresCspDirective,
  "content-security-policy-report-only": declaresCspDirective,
  "strict-transport-security": declaresHsts,
  // The only value the standard defines.
  "x-content-type-options": (v) => /^nosniff;?$/i.test(v.trim()),
  "referrer-policy": declaresReferrerPolicy,
  "permissions-policy": declaresPermissionsPolicy,
};

/** True when `value` is readable as a value for `header`. */
const declaresHeaderValue = (header: string, value: string): boolean => {
  const grammar = (HEADER_GRAMMAR as Record<string, ((value: string) => boolean) | undefined>)[header.toLowerCase()];
  return grammar ? grammar(value) : true;
};

/** Split a policy into directive → source list. */
export function parseCsp(value: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const part of value.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    out.set(tokens[0].toLowerCase(), tokens.slice(1));
  }
  return out;
}

/**
 * `truncated` is true when the scan stopped early — the file cap, the byte
 * cap. Every "this header is missing" rule is a claim about files that were
 * *not* read, so under truncation each one is demoted to a note that says so.
 * A capped scan cannot prove absence, and saying it can is the one failure
 * mode this module refuses.
 */
export interface ConfigRuleOptions {
  truncated?: boolean;
}

export function securityConfigRules(
  files: Array<{ path: string; source: string }>,
  options: ConfigRuleOptions = {},
): Array<LintFinding & { file?: string }> {
  const out: Array<LintFinding & { file?: string }> = [];
  const push = (
    file: string, line: number, severity: LintFinding["severity"],
    rule: string, message: string, fix: string, doc = "web-security-headers",
  ) =>
    out.push({
      line, severity, rule, fix, doc,
      // `"configuration"` is a pseudo-path `absent()` uses for a project-wide
      // absence claim attributable to no single file — carrying it as `file`
      // would misrepresent it as a real path relative to the audited
      // directory, so those findings arrive with no `file`, matching the
      // convention `assembleAuditReport`'s project-wide claims already use.
      // A finding that *does* name a real file carries the path once, in
      // `file`; the renderer puts it back in front of the message, so the
      // markdown is unchanged and `message` is never the path plus the
      // sentence. `"configuration"` has no `file` to render from, so it —
      // and only it — keeps the prefix folded into the message.
      ...(file === "configuration" ? { message: `${file}: ${message}` } : { message, file }),
    });

  const truncated = options.truncated === true;

  /**
   * "I found this header here and could not read its value."
   *
   * Not grading a value assembled at runtime is right — principle 2, do not
   * claim what you cannot prove. Going *silent* about it is not: for four of
   * the five headers there was no equivalent of `csp-undeterminable`, so an
   * undeterminable hit suppressed the `*-missing` finding and emitted nothing
   * in its place. A reader scanning a clean report could not tell "nothing
   * found" from "something found and unparseable" — which is dropping a
   * signal the `HeaderHit` was already carrying, not withholding a claim.
   */
  const undeterminableNote = (rule: string, hit: HeaderHit, what: string, why: string) =>
    push(hit.file, hit.line, "info", rule,
      // Same shape as csp-undeterminable, and deliberately no line number in
      // the text: `push` prefixes the file and the report renders the line
      // itself, so repeating it here would put one number in the reader's eye
      // twice for a single finding.
      `${what} is set from a value assembled at runtime, so ${why}.`,
      `Confirm the emitted header on a real response, or extract the static parts into a named constant this audit can read.`);

  /** An absence claim: downgraded to an unconfirmed note when the scan was cut short. */
  const absent = (rule: string, severity: LintFinding["severity"], message: string, fix: string) =>
    push("configuration", 1, truncated ? "info" : severity, rule,
      truncated
        ? `${message} The scan stopped before reading every file, so this absence is unconfirmed — the declaration may sit in a file that was never opened.`
        : message,
      truncated ? `Re-run on a narrower path to confirm, then: ${fix}` : fix);

  // One masking pass per file, shared by header extraction and the source
  // rules below — and, more importantly, used by *every* rule, so none of
  // them can disagree with the others about what is a comment.
  const masked = maskFiles(files);
  const headers = extractHeadersFrom(masked);
  const csp = headers.get("content-security-policy") ?? headers.get("content-security-policy-report-only");

  // ── CSP ────────────────────────────────────────────────────────────────────
  if (!csp) {
    absent("csp-missing", "error",
      `No Content-Security-Policy is declared in any configuration file read here.`,
      `Start with Content-Security-Policy-Report-Only, collect reports, then enforce a nonce-based policy.`);
  } else if (csp.undeterminable) {
    push(csp.file, csp.line, "info", "csp-undeterminable",
      `A Content-Security-Policy is set from a value assembled at runtime, so its directives cannot be read from source.`,
      `Verify the emitted header in a response, or extract the static parts into a named constant.`);
  } else {
    const directives = parseCsp(csp.value);
    const scriptSrc = directives.get("script-src") ?? directives.get("default-src") ?? [];

    if (scriptSrc.includes("'unsafe-inline'") && !scriptSrc.some((s) => s.startsWith("'nonce-") || s.startsWith("'sha"))) {
      push(csp.file, csp.line, "error", "csp-unsafe-inline",
        `script-src allows 'unsafe-inline', which permits exactly the injected script a policy exists to stop.`,
        `Replace it with a per-response 'nonce-…' plus 'strict-dynamic'.`);
    }
    if (scriptSrc.includes("'unsafe-eval'")) {
      push(csp.file, csp.line, "error", "csp-unsafe-eval",
        `script-src allows 'unsafe-eval', which re-opens string-to-code execution.`,
        `Remove it and replace any eval/new Function use in the bundle.`);
    }
    // `'strict-dynamic'` is what makes a host list irrelevant: a browser that
    // supports it ignores `https:` and `'unsafe-inline'` entirely, which is
    // precisely why web-security-headers.md ships them as backward-compat
    // fallbacks in the policy it tells the reader to copy. Firing an error on
    // that policy — with the fix "use 'nonce-…' with 'strict-dynamic'", which
    // the reader already did — is a rule attacking its own documentation.
    // Same guard shape as csp-unsafe-inline above.
    if (!scriptSrc.includes("'strict-dynamic'") &&
        (scriptSrc.includes("*") || scriptSrc.includes("http:") || scriptSrc.includes("https:"))) {
      push(csp.file, csp.line, "error", "csp-wildcard",
        `script-src permits any host, which makes the policy decorative.`,
        `Use 'nonce-…' with 'strict-dynamic' instead of a host list.`);
    }
    for (const [directive, rule] of [
      ["object-src", "csp-missing-object-src"],
      ["base-uri", "csp-missing-base-uri"],
      ["frame-ancestors", "csp-missing-frame-ancestors"],
      ["form-action", "csp-missing-form-action"],
    ] as const) {
      // `frame-ancestors` is *ignored* in a meta-delivered policy (CSP Level
      // 3), so "add it" would be advice that cannot work. The delivery
      // mechanism is the finding instead — see csp-meta-delivery below.
      if (directive === "frame-ancestors" && csp.viaMeta) continue;
      if (!directives.has(directive)) {
        push(csp.file, csp.line, "warning", rule,
          directive === "form-action"
            ? `form-action is not set, so injected markup can post your form data to another origin — default-src does not cover this.`
            : `${directive} is not set, so it falls back to a permissive default.`,
          directive === "form-action"
            ? `Add form-action 'self'.`
            : `Add ${directive} 'none' unless the site genuinely needs otherwise.`);
      }
    }
    if (csp.viaMeta) {
      push(csp.file, csp.line, "info", "csp-meta-delivery",
        `This policy is delivered by <meta http-equiv>, where frame-ancestors, report-uri and sandbox are ignored (CSP Level 3) — so it carries no clickjacking protection and no reporting.`,
        `Move the policy to a real Content-Security-Policy response header.`);
    }
    if (!directives.has("require-trusted-types-for")) {
      push(csp.file, csp.line, "info", "trusted-types-absent",
        `Trusted Types is not enabled; DOM XSS remains a case-by-case problem rather than an eliminated class.`,
        `Add require-trusted-types-for 'script' in report-only first.`);
    }
  }

  // ── HSTS ───────────────────────────────────────────────────────────────────
  const hsts = headers.get("strict-transport-security");
  if (!hsts) {
    absent("hsts-missing", "warning",
      `No Strict-Transport-Security header, so the first visit over HTTP is downgradeable.`,
      `Set max-age=63072000; includeSubDomains once every subdomain serves HTTPS.`);
  } else if (!hsts.undeterminable) {
    const age = /max-age\s*=\s*(\d+)/i.exec(hsts.value);
    const subdomains = /includeSubDomains/i.test(hsts.value);
    // 180 days is the low-protection line, and only that. Preload eligibility
    // is a separate, stricter bar — max-age ≥ 31536000 *and* includeSubDomains
    // (web-security-headers.md, the preload service's own rule) — so tying the
    // two together here told the reader that a 200-day max-age was
    // preload-eligible when it is not.
    if (age && Number(age[1]) < 15552000) {
      push(hsts.file, hsts.line, "warning", "hsts-short-max-age",
        `HSTS max-age is ${age[1]}s; below 180 days (15552000) it gives little protection.`,
        `Raise it to 63072000 (two years, the value Chrome and OWASP recommend) once you are confident in the HTTPS setup.`);
    }
    // A `preload` token that does not meet the list's requirements is not a
    // partial win — it is inert, and it reads to whoever wrote it as done.
    if (/\bpreload\b/i.test(hsts.value) && (!age || Number(age[1]) < 31536000 || !subdomains)) {
      const missing = [
        !age || Number(age[1]) < 31536000 ? "max-age ≥ 31536000 (one year)" : null,
        subdomains ? null : "includeSubDomains",
      ].filter(Boolean).join(" and ");
      push(hsts.file, hsts.line, "warning", "hsts-preload-ineffective",
        `This \`preload\` token does nothing: the preload list requires ${missing}, which this header does not send.`,
        `Send max-age=63072000; includeSubDomains; preload — and only after running the shorter max-age values clean for a few months, because preload is effectively one-way.`);
    }
    if (!subdomains) {
      push(hsts.file, hsts.line, "info", "hsts-no-subdomains",
        `HSTS omits includeSubDomains, leaving subdomains downgradeable.`,
        `Add includeSubDomains — but only once every subdomain serves HTTPS, because it is disruptive to undo.`);
    }
  } else {
    undeterminableNote("hsts-undeterminable", hsts,
      `A Strict-Transport-Security header`, `its max-age and directives cannot be read from source`);
  }

  // ── the cheap ones ─────────────────────────────────────────────────────────
  const xcto = headers.get("x-content-type-options");
  if (!xcto) {
    absent("x-content-type-options-missing", "warning",
      `X-Content-Type-Options is not set, so browsers may MIME-sniff a response into a script.`,
      `Set X-Content-Type-Options: nosniff. It has no downside.`);
  } else if (xcto.undeterminable) {
    undeterminableNote("x-content-type-options-undeterminable", xcto,
      `An X-Content-Type-Options header`, `it cannot be confirmed from source to be nosniff`);
  }
  // There is deliberately no "referrer-policy-missing" rule. Since the November
  // 2020 spec revision, strict-origin-when-cross-origin IS the browser default
  // (verified against MDN) — an absent header already behaves the way we would
  // have recommended, so flagging its absence would fire on correct
  // configuration. Only an explicitly worse value is a finding.
  const LEAKY_REFERRER = /^(unsafe-url|no-referrer-when-downgrade|origin-when-cross-origin)$/i;
  const ref = headers.get("referrer-policy");
  if (ref && ref.undeterminable) {
    undeterminableNote("referrer-policy-undeterminable", ref,
      `A Referrer-Policy header`, `its policy token cannot be read from source`);
  } else if (ref && LEAKY_REFERRER.test(ref.value.trim())) {
    push(ref.file, ref.line, "warning", "referrer-policy-unsafe",
      `Referrer-Policy "${ref.value.trim()}" sends more than the browser default, leaking full URLs — including any token in a path or query — to other origins.`,
      `Remove the header to get strict-origin-when-cross-origin, or set that value explicitly.`);
  }
  const pp = headers.get("permissions-policy");
  if (!pp) {
    absent("permissions-policy-missing", "warning",
      `No Permissions-Policy, so embedded content may request camera, microphone and geolocation.`,
      `Set Permissions-Policy: camera=(), microphone=(), geolocation=() and open up only what you use.`);
  } else if (pp.undeterminable) {
    undeterminableNote("permissions-policy-undeterminable", pp,
      `A Permissions-Policy header`, `the features it allows cannot be read from source`);
  }

  // ── build configuration ────────────────────────────────────────────────────
  // Matched against the *masked* source, like every other rule: reading
  // `file.source` raw meant a commented-out `// sourcemap: true` was reported
  // while the real `sourcemap: false` two lines below it was not. And the line
  // number comes from the match's own index — `search()` for either word
  // returned the first mention anywhere in the file, which for a config that
  // discusses source maps before setting them pointed at a comment.
  const SOURCEMAP_ON = /(?:productionBrowserSourceMaps|sourcemap)\s*:\s*true/;
  for (const file of masked) {
    const m = SOURCEMAP_ON.exec(file.masked);
    if (m) {
      push(file.path, lineOf(file.source, m.index), "warning", "sourcemaps-in-production",
        `Production source maps publish your original sources, comments and internal paths.`,
        `Disable them, or upload them privately to your error reporter instead of serving them.`,
        "frontend-attack-surface");
    }
  }

  // ── committed env files ────────────────────────────────────────────────────
  // A monorepo has one .gitignore per package, and git evaluates each pattern
  // relative to the directory of the .gitignore that declares it. Consulting
  // only the first file found — and matching against paths relative to the
  // audit root — reported `packages/web/.env` as committed when
  // `packages/web/.gitignore` covers it perfectly: an `error` telling the
  // reader to rotate every secret they own, on a correctly-configured repo.
  const gitignores = files
    .filter((f) => /(?:^|\/)\.gitignore$/.test(f.path))
    .map((f) => ({
      dir: f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/") + 1) : "",
      patterns: f.source.split("\n").map((l) => l.trim()).filter(Boolean),
    }));

  for (const file of files) {
    const base = file.path.split("/").pop() ?? file.path;
    if (!/^\.env(\.|$)/.test(base)) continue;
    const ignored = gitignores.some(({ dir, patterns }) =>
      // Only a .gitignore at or above this file's own directory can cover it.
      file.path.startsWith(dir) &&
      patterns.some((p) => matchesGitignorePattern(p, file.path.slice(dir.length))));
    if (ignored) continue;
    push(file.path, 1, truncated ? "warning" : "error", "env-committed",
      `${base} sits in the project and is not covered by any .gitignore read here${truncated ? ", though the scan stopped early and a .gitignore covering it may not have been read" : ""}; once committed it stays in git history after deletion.`,
      `Add it to .gitignore, rotate every value it holds, and purge it from history if it was pushed.`,
      "frontend-attack-surface");
  }

  return out;
}

// ── report ───────────────────────────────────────────────────────────────────

/**
 * Every header-declaring shape this audit can read, as distinctive tokens.
 *
 * Three surfaces describe this list in prose, for three different readers:
 * the "Not visible to this audit" block below (the human reading a report),
 * the `audit_security` MCP tool description (the *client*, deciding whether
 * to call the tool at all), and the README's tool table. They have drifted
 * once already — the README was brought up to date and the tool description
 * was not, which is the more consequential of the two: an agent that reads
 * "next.config / vercel.json / netlify.toml / _headers / middleware" will not
 * reach for this tool on a Nuxt or Remix project, and the tool's reach is
 * exactly what the reader cannot otherwise find out.
 *
 * `tests/integrity.test.ts` asserts every token below appears in all three,
 * so a shape added to the extractor cannot be announced in one place only.
 */
export const HEADER_SOURCE_TOKENS = [
  "next.config", "vercel.json", "netlify.toml", "_headers", "staticwebapp.config.json",
  "routeRules", "Remix", "hooks.server", "kit.csp", "middleware",
  "new Response", "new Headers", "res.set", "res.setHeader", "meta http-equiv",
] as const;

/**
 * The header-source clause of the `audit_security` tool description, kept
 * here beside `HEADER_SOURCE_TOKENS` rather than inline in `index.ts` so the
 * machine-facing description and this module's own account of its reach are
 * one edit, not two.
 */
export const HEADER_SOURCES_SENTENCE =
  "Header state is inferred from wherever your stack declares it — next.config, vercel.json, "
  + "netlify.toml, _headers, staticwebapp.config.json, Nuxt routeRules, a Remix/React Router headers "
  + "export, SvelteKit hooks.server.ts and kit.csp, Next.js and Astro middleware, new Response(body, "
  + "{ headers }) and new Headers({…}) on Cloudflare Workers/Deno/Bun, Express res.set and "
  + "res.setHeader, and <meta http-equiv> — read as text and never evaluated";

// The first four bullets all describe one axis — *mechanism*: things that
// happen somewhere this audit cannot reach. None of them described the other
// axis, *coverage*: which configuration shapes the audit can actually read.
// A reader whose framework was not recognised drew the only conclusion the
// list allowed — "it can't see my CDN, but my config file is right there, so
// that part must be covered" — and trusted a fabricated `csp-missing`. The
// last two bullets exist so that reader has somewhere to land.
const RECOGNISED_SHAPES = [
  "`next.config` `headers()` `key`/`value` entries",
  "`vercel.json`, `netlify.toml`, `_headers`, `staticwebapp.config.json`",
  "quoted object properties (`{ \"Content-Security-Policy\": \"…\" }`) — Nuxt `routeRules`, a Remix/React Router `headers` export, `new Response(body, { headers })`, `new Headers({…})`, `res.set({…})`",
  "`res.setHeader(…)`, `headers.set/append(…)`, `reply.header(…)` — including from Next.js and Astro `middleware`",
  "SvelteKit's `hooks.server.ts` and `kit.csp.directives`, and `<meta http-equiv>`",
].join("; ");

export const SECURITY_PREAMBLE =
  `This audit reads local files only — it makes no request to your site. It cannot see:`;

/**
 * What `audit_security` structurally cannot see, one entry per bullet in the
 * "Not visible to this audit" section it renders.
 */
export const SECURITY_NOT_VISIBLE: string[] = [
  `Headers added by a CDN, WAF or reverse proxy (Cloudflare, Fastly, nginx) after your app responds.`,
  `Headers set by runtime logic that depends on the request.`,
  `Any value assembled from variables, which is reported as undeterminable rather than absent.`,
  `Server-side concerns entirely: authorization, injection, and access control are out of scope for a design server.`,
  `**Header shapes it does not recognise.** It reads ${RECOGNISED_SHAPES}. A library that builds headers without naming them in your source — \`helmet\`, a framework preset, a shared middleware package — is invisible to it, and so is any shape not in that list. If your headers are set some other way, a "missing" finding above is about this audit's reach, not about your site.`,
  `**A truncated scan cannot prove absence.** If the scan line above says it stopped at a cap, every "missing" finding is unconfirmed and is reported as a note rather than a defect.`,
];

export const SECURITY_CLOSING =
  `A clean result here means these files declare nothing wrong. Confirm the emitted headers on a real response before treating it as coverage.`;

export function securityReport(input: { source?: string; filename?: string; root?: string }): AuditReport {
  const lines: string[] = ["# Security audit", ""];
  let findings: Array<LintFinding & { file?: string }> = [];
  let scanned = "";
  let coverage = "";

  if (input.root) {
    const scan = scanProject(input.root, SECURITY_EXTENSIONS, SECURITY_FILENAMES);
    const files = scan.files.map((f) => ({ path: f.path, source: f.source }));
    for (const f of files) {
      // The path is carried once, as `file`. The bullet below renders it back
      // in front of the message (colon-separated) rather than appending it
      // after the line number — the bullet shows the line once, from
      // `f.line`, and repeating it here as `path:line —` would put the same
      // number in the reader's eye twice for one finding. Folding it into
      // `message` as well would hand a structured caller rendering
      // `${f.file}:${f.line} — ${f.message}` the path twice.
      findings.push(...securitySourceRules(f.source, f.path).map((x) => ({ ...x, file: f.path })));
    }
    const truncated = scan.hitFileCap || scan.hitByteCap;
    findings.push(...securityConfigRules(files, { truncated }));
    scanned = `Scanned ${scan.files.length} files under \`${input.root}\`.`;
    if (scan.hitFileCap) scanned += ` Stopped at the ${MAX_FILES}-file cap — results are partial, and every "missing" finding below is unconfirmed.`;
    if (scan.hitByteCap) scanned += ` Stopped at the total-bytes cap — results are partial, and every "missing" finding below is unconfirmed.`;
    if (scan.skippedLarge.length) scanned += ` Skipped ${scan.skippedLarge.length} oversized file(s).`;

    // Which files the header state was actually read from. Without this the
    // reader has no way to tell "your config sets no CSP" from "your config
    // is in a shape this audit does not read" — and the second, read as the
    // first, is the failure this whole module is built around.
    const sources = [...new Set([...extractHeaders(files).values()].map((h) => h.file))].sort();
    coverage = sources.length
      ? `Read header configuration from: ${sources.map((s) => `\`${s}\``).join(", ")}.`
      : `No configuration file in a recognised header format was found — see "Not visible to this audit" for the shapes this reads.`;
  } else {
    findings = securitySourceRules(input.source ?? "", input.filename);
    scanned = "Scanned one snippet. Configuration rules need a directory — pass `path` to check headers.";
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  lines.push(scanned, "");
  if (coverage) lines.push(coverage, "");
  lines.push(`**${errors.length} error · ${warnings.length} warning · ${info.length} info**`, "");

  if (!findings.length) {
    lines.push("No findings in what was read.", "");
  } else {
    for (const group of [
      { title: "Errors", items: errors },
      { title: "Warnings", items: warnings },
      { title: "Notes", items: info },
    ]) {
      if (!group.items.length) continue;
      lines.push(`## ${group.title}`, "");
      for (const f of group.items) {
        lines.push(`- **${f.rule}** (line ${f.line}) — ${f.file ? `${f.file}: ` : ""}${f.message}`);
        lines.push(`  - Fix: ${f.fix}`);
        if (f.doc) lines.push(`  - Read: \`get_design_doc("${f.doc}")\``);
      }
      lines.push("");
    }
  }

  lines.push(...renderNotVisibleSection(SECURITY_PREAMBLE, SECURITY_NOT_VISIBLE, SECURITY_CLOSING));
  return {
    text: lines.join("\n"),
    structured: auditStructuredFrom({ findings, notVisible: SECURITY_NOT_VISIBLE, file: input.filename }),
  };
}
