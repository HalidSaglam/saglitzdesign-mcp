// SEO and GEO auditing for pages and the site-level files around them.
//
// `seo_geo_guide` has shipped this server's SEO and GEO documents since
// v0.9.0. Nothing ever checked a page against them, so a team could read every
// word and still ship three H1s, a canonical pointing at a laptop, and no
// llms.txt. These are the rules.
//
// ── The governing rule of this module ────────────────────────────────────────
//
// **These rules audit what is authored, not what is measured.** A rule may
// state a fact about the source and pair it with a documented causal link. No
// rule, message or fix may assert or imply a Core Web Vitals verdict or a
// ranking outcome: vitals are 75th-percentile field data and ranking is a
// search engine's behaviour, and neither is in a file. "Your LCP is fine",
// said from source, is this package's forbidden claim.
//
// ── And the rule this project has now learned three times ────────────────────
//
// **Only facts become rules.** security.ts and generic.ts between them lost a
// rule outright and took nine repair rounds, and every single defect was a
// rule firing on correct work. A false positive here does not add noise — it
// teaches the reader the output is unreliable, and the true finding in the
// next run is skimmed past with the rest. Every negative test in this module's
// suite is load-bearing.
//
// Two rules were cut or narrowed on that ground before this module shipped.
//
// **`og-incomplete` is not here, and its absence is deliberate.** It was
// specified with `on-page-seo` as its document. That document does not mention
// Open Graph — and neither does any other document in this knowledge base:
// "Open Graph", "og:title" and "og:image" return nothing across all of
// `knowledge/`. A rule must cite a document that exists *and* makes the rule's
// claim, and the generic-design package already shipped one that cited a real
// document saying nothing about it. There is no document here to cite, so
// there is no rule. If Open Graph coverage is wanted, the document comes
// first and the rule follows it.
//
// `jsonld-missing-required` is narrowed to `@context` and `@type` for the same
// reason; see the rule itself.
//
// ── The framework-metadata question, which decides whether this is usable ────
//
// A Next.js App Router page exports `metadata`; the `<title>` is nowhere in
// that file. An Astro page has frontmatter. A SvelteKit page has
// `<svelte:head>`. And in every one of them the metadata may live in a layout
// this tool was never given — Next.js merges a page's metadata over its
// layout's, so a page that sets only a title is not a page with no
// description. One file therefore cannot prove metadata absent for any
// framework, whatever it does or does not contain.
//
// So absence is claimed at two different scopes, and never guessed at either:
//   • `seoRules` claims it only for a *self-contained document* — a plain HTML
//     file with a `<head>` in it. That head is the whole head; if there is no
//     `<title>` in it, there is no title.
//   • `seoConfigRules` claims it for a *project*: given every file, "no file
//     anywhere declares a description" is a fact about what was read. It runs
//     only when no self-contained document was scanned, so the two scopes can
//     never both report the same defect.
// A framework component on its own gets silence, which is the honest answer.

import { type LintFinding, type AuditReport, assembleAuditReport } from "./lint.js";
import {
  scanTags, type Tag, maskComments, elementSpan, flattenTags,
  bareAttrs, findAttr, hasAttr as sharedHasAttr, hasSpread as sharedHasSpread,
} from "./scan.js";
import { scanProject, MAX_FILES } from "./project.js";

const lineOf = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

// Attribute reading — the boundary rules, the framework binding forms and the
// spread convention — is `scan.ts`'s job. See the note there for why five
// scanners share one reader.
const hasAttr = (tag: Tag, name: string): boolean => sharedHasAttr(tag.attrs, name);
const hasSpread = (tag: Tag): boolean => sharedHasSpread(tag.attrs);

/**
 * An attribute's value, and whether it is *readable*. `content={description}`
 * and `href={`${base}/x`}` are declarations whose value only exists at render
 * time; reporting a length or a host for them would be inventing one, so they
 * come back as `{ present: true, value: undefined }` — enough to suppress an
 * absence claim, never enough to grade.
 */
interface AttrValue { present: boolean; value?: string }

/**
 * Every form a value can take that means "this text is not the value — it is
 * the instruction that produces it": a JS template literal or JSX expression,
 * and the server-template forms `<%= … %>` (ERB, EJS, JSP),
 * `<?= … ?>` / `<?php … ?>` (PHP) and their close tags.
 *
 * The server-template half was missing while `TEMPLATE_PLACEHOLDER` in this
 * same file already matched it, so an ERB layout's
 * `<link rel="canonical" href="<%= canonical_url %>">` was read as a literal
 * relative URL and answered with "Write the full URL:
 * https://example.com/<%= canonical_url %>" — advice that is wrong twice over.
 */
const UNREADABLE_VALUE = /\$\{|\{[^}]*\}|<%|%>|<\?/;

const attrValue = (tag: Tag, name: string): AttrValue => {
  // The name is located in the *bare* string, so a name mentioned inside
  // another attribute's value can never be mistaken for a real attribute:
  // `<link rel="canonical" title="see href=x">` would otherwise hand back
  // "x" as this link's href. The value is then read out of the real string at
  // the offset the bare match gives, which lines up because blanking preserves
  // length.
  const at = findAttr(tag.attrs, name);
  if (!at) return { present: false };
  if (at.bound) return { present: true };                      // an expression, not a value
  const rest = tag.attrs.slice(at.index + at.length);
  // Quoted, braced, or a bare token. `<meta name=description content="...">`
  // and `<link rel=canonical href=https://example.com/x>` are valid HTML and
  // are what a minifier emits; not reading them reported a present description
  // and a present canonical as absent. `security.ts` grew the same branch
  // first, and the character class is its.
  const v = /^\s*=\s*("([^"]*)"|'([^']*)'|(\{[^}]*\})|([^\s"'`=<>\\]+))/.exec(rest);
  if (!v) return { present: true };                            // valueless, or empty
  const raw = v[2] ?? v[3] ?? v[5];
  if (raw === undefined) return { present: true };             // a JSX expression
  if (UNREADABLE_VALUE.test(raw)) return { present: true };    // produced, not written
  return { present: true, value: raw };
};

// ── file shapes ──────────────────────────────────────────────────────────────

/**
 * A file whose metadata can live somewhere this call was not given. Everything
 * a framework renders is in here; `.html` deliberately is not, because a plain
 * HTML file with a `<head>` carries its whole head.
 */
const FRAMEWORK_FILE = /\.(?:[jt]sx|astro|svelte|vue|[cm]?[jt]s)$/i;

/** Extensions worth reading for page-level SEO signals. */
export const SEO_EXTENSIONS = [
  ".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".astro",
];

/**
 * Files read by name rather than extension — and, in `scanProject`, read
 * *before* the extension matches. The same judgement security.ts made for
 * `_headers`: an audit that never opened robots.txt reports the site's crawl
 * rules absent, which is worse than not looking. `sitemap.ts` / `robots.ts`
 * are the Next.js App Router generators for the two static files beside them.
 * Priority, not exemption: these count against both caps like every other
 * file, and a scan that drops one says so through `hitFileCap`.
 */
export const SEO_FILENAMES = [
  "robots.txt", "llms.txt", "llms-full.txt",
  "sitemap.xml", "sitemap-index.xml", "sitemap_index.xml",
  "robots.ts", "robots.js", "sitemap.ts", "sitemap.js",
  "next-sitemap.config.js", "next-sitemap.config.mjs",
  "next-seo.config.js", "next-seo.config.ts",
  // Where a framework declares the *site's* metadata rather than a page's:
  // Nuxt's `app.head`, Gatsby's `siteMetadata`, Astro's `site`, Docusaurus's
  // `title`/`tagline`/`url`. Not reading them reported a correct Nuxt project
  // as having no description and no canonical, and a correct Gatsby project as
  // having no canonical — the declaration was one file away and never opened.
  // `next-seo.config.js` above was already this precedent.
  "nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs",
  "gatsby-config.js", "gatsby-config.ts", "gatsby-config.mjs",
  "astro.config.mjs", "astro.config.js", "astro.config.ts",
  "docusaurus.config.js", "docusaurus.config.ts", "docusaurus.config.mjs",
  "svelte.config.js", "svelte.config.ts",
];

/** The subset of those whose whole body is a site-metadata declaration. */
const SITE_CONFIG_FILE =
  /(?:^|\/)(?:nuxt|astro|docusaurus|svelte|next-seo)\.config\.[cm]?[jt]s$|(?:^|\/)gatsby-config\.[cm]?[jt]s$/i;

const basename = (path: string): string => path.split("/").pop() ?? path;

// ── metadata declarations ────────────────────────────────────────────────────

/**
 * The regions of a file in which a framework declares page metadata. Used to
 * bound the key search below: a bare file-wide hunt for `description:` finds
 * a prop on a card component and reads it as page metadata, and a bare hunt
 * that finds nothing has proven nothing either way.
 */
function metadataRegions(masked: string, path: string): Array<[number, number]> {
  const regions: Array<[number, number]> = [];

  const balanced = (from: number): number => {
    let depth = 0;
    for (let i = from; i < masked.length; i++) {
      if (masked[i] === "{") depth++;
      else if (masked[i] === "}" && --depth === 0) return i + 1;
    }
    return masked.length;
  };

  // `export const metadata = { … }` / `const metadata: Metadata = { … }`
  const metaRe = /\b(?:export\s+)?(?:const|let|var)\s+metadata\b[^=;{]*=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(masked)) !== null) {
    const open = masked.indexOf("{", m.index + m[0].length - 1);
    regions.push([m.index, balanced(open)]);
  }

  // `export const metadata = constructMetadata({ … })` — a helper that merges
  // defaults this file does not contain. What is in the call's own arguments
  // is still readable, so the arguments are a region; that the rest is not
  // readable is recorded separately as opacity.
  const callRe = /\b(?:export\s+)?(?:const|let|var)\s+metadata\b[^=;{]*=\s*[A-Za-z_$][\w$.]*\s*\(/g;
  while ((m = callRe.exec(masked)) !== null) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = masked.length;
    for (let i = open; i < masked.length; i++) {
      if (masked[i] === "(") depth++;
      else if (masked[i] === ")" && --depth === 0) { end = i + 1; break; }
    }
    regions.push([m.index, end]);
  }

  // `generateMetadata(…): Promise<Metadata> { … }` — the argument list closes
  // at the first `)`, and the body opens at the first `{` after it.
  const genRe = /\bgenerateMetadata\s*(?:<[^>]*>)?\s*\(/g;
  while ((m = genRe.exec(masked)) !== null) {
    const close = masked.indexOf(")", m.index);
    const open = close === -1 ? -1 : masked.indexOf("{", close);
    if (open !== -1) regions.push([m.index, balanced(open)]);
  }

  // Nuxt's `useHead({ … })` / `useSeoMeta({ … })` / `definePageMeta({ … })`.
  const headFnRe = /\b(?:useHead|useSeoMeta|definePageMeta|defineOgImage)\s*\(\s*\{/g;
  while ((m = headFnRe.exec(masked)) !== null) {
    const open = masked.indexOf("{", m.index + m[0].length - 1);
    regions.push([m.index, balanced(open)]);
  }

  // Remix / React Router: `export const meta: MetaFunction = () => [ … ]`, and
  // the `links` export that carries a canonical. The value is an array of
  // objects behind an arrow function, so there is no single brace to balance
  // from — the region runs to the next top-level `export`, which is where the
  // declaration provably ends. Missing this shape reported a correct Remix
  // project as having no title, no description and no canonical: three
  // fabricated warnings on exemplary work, and the reason this window exists.
  const exportRe = /^[ \t]*export\s+(?:const|let|var|function|async\s+function)\s+(meta|links)\b/gm;
  while ((m = exportRe.exec(masked)) !== null) {
    const next = masked.indexOf("\nexport ", m.index + m[0].length);
    const end = next === -1 ? masked.length : next;
    regions.push([m.index, Math.min(end, m.index + 2000)]);
  }

  // Astro frontmatter: two languages in one file, with a hard fence between.
  if (/\.astro$/i.test(path)) {
    const open = /^---[ \t]*\r?\n/.exec(masked);
    const close = open ? masked.indexOf("\n---", open[0].length - 1) : -1;
    if (open && close !== -1) regions.push([open[0].length, close]);
  }

  // `<svelte:head>` — scanTags cannot see it (`:` is not a tag-name character
  // in its pattern), so it is found by index.
  const sh = masked.toLowerCase().indexOf("<svelte:head");
  if (sh !== -1) {
    const end = masked.toLowerCase().indexOf("</svelte:head", sh);
    regions.push([sh, end === -1 ? masked.length : end]);
  }

  // A framework's site config is metadata from its first line to its last.
  if (SITE_CONFIG_FILE.test(path)) regions.push([0, masked.length]);

  return regions;
}

/**
 * The other shape a head declaration takes: a list entry that *names* the tag
 * it is building rather than keying on it — Nuxt's
 * `meta: [{ name: "description", content: … }]`, Remix's
 * `[{ tagName: "link", rel: "canonical", href: … }]`. These prove the
 * declaration exists and nothing more: the string beside the key is the tag's
 * name, not its value, and reading "description" as an eleven-character meta
 * description would be inventing a finding out of a match.
 */
const NAMED_TAG_SHAPE: Partial<Record<string, RegExp>> = {
  // `meta: [{ name: "description", … }]`, and the site-config keys a framework
  // feeds into that same tag: Docusaurus emits its `tagline` as the default
  // meta description, Gatsby's `siteMetadata.description` is what its SEO
  // component reads.
  description: /(?:name|property)\s*[:=]\s*["'`]description["'`]|\b(?:tagline|siteDescription|defaultDescription)\s*[:=]/i,
  // `link: [{ rel: "canonical", … }]`, and the site-URL keys canonicals are
  // generated from — Astro's `site`, Gatsby's `siteUrl`, Docusaurus's `url`.
  // A literal http(s) value is required so a bare `url:` key on an unrelated
  // object cannot pass for one.
  canonical: /rel\s*[:=]\s*["'`]canonical["'`]|\b(?:site|siteUrl|url)\s*[:=]\s*["'`]https?:\/\//i,
};

/** `export const metadata = constructMetadata({ … })` — defaults live in the helper. */
const METADATA_FROM_CALL = /\b(?:export\s+)?(?:const|let|var)\s+metadata\b[^=;{]*=\s*[A-Za-z_$][\w$.]*\s*\(/;

/** Any recognised way of saying "this file declares page metadata". */
const METADATA_MENTION =
  /\bexport\s+(?:const|let|var|(?:async\s+)?function)\s+(?:metadata|generateMetadata|meta|links)\b|\buse(?:Head|SeoMeta)\s*\(|\bsiteMetadata\s*[:=]|<(?:Head|Helmet|NextSeo|Seo|SEO)[\s/>]/;

/**
 * A metadata key inside one of those regions, or an attribute of a
 * `<NextSeo …>` / `<Head>`-family component. Accepts `:` (an object literal)
 * and `=` (a JSX attribute, an Astro `const`).
 */
function keyInRegions(
  masked: string, regions: Array<[number, number]>, key: string,
): (AttrValue & { index: number }) | undefined {
  const re = new RegExp(`(?:^|[\\s{,"'])${key}\\s*[:=]\\s*(?:(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1)?`, "i");
  const named = NAMED_TAG_SHAPE[key];
  let presentOnly: number | undefined;

  for (const [start, end] of regions) {
    const region = masked.slice(start, end);
    const m = re.exec(region);
    if (m) {
      // The declaration's own offset, so a finding points at the line the
      // reader has to edit rather than at the top of the first region.
      const index = start + m.index;
      const raw = m[2];
      if (raw === undefined || UNREADABLE_VALUE.test(raw)) return { present: true, index };
      return { present: true, value: raw, index };
    }
    const nm = named?.exec(region);
    if (nm && presentOnly === undefined) presentOnly = start + nm.index;
  }
  return presentOnly === undefined ? undefined : { present: true, index: presentOnly };
}

interface Declaration extends AttrValue {
  index: number;
  /** Read from a real `<title>` / `<meta>` / `<link>` tag rather than a metadata object. */
  fromTag: boolean;
}

interface PageDeclarations {
  /**
   * This file declares page metadata in a shape this module can *read* — a
   * metadata region, a head component, or a real head tag.
   *
   * Deliberately not "this file renders a `<head>`". A framework file with a
   * head and no recognised declaration means the project declares its metadata
   * some way this module does not know, and reading an unrecognised shape as
   * an absence is the exact failure security.ts spent four rounds removing.
   * No surface, no absence claim.
   */
  surface: boolean;
  /**
   * This file declares metadata that visibly comes from somewhere else: a
   * helper call (`metadata = constructMetadata({…})`), a spread inside the
   * declaration (`{ ...base, title }`), or a recognised declaration keyword
   * with nothing readable behind it. Whatever it does not show, it may still
   * be setting — so it blocks a *project-level* absence claim for the keys it
   * does not show, and only those.
   */
  opaque: boolean;
  title?: Declaration;
  description?: Declaration;
  canonical?: Declaration;
  hreflang: Array<{ index: number; href?: string; present: boolean }>;
  jsonld: Tag[];
}

/**
 * Components that carry head content as attributes or children — matched
 * **case-sensitively**, which is the only thing separating `<Head>` from
 * `<head>`. Lower-casing the name first made every plain HTML document look
 * like a project that declares metadata through a head component, which is
 * precisely the "unrecognised shape read as a recognised one" mistake the
 * surface rule exists to prevent.
 */
const HEAD_COMPONENTS = new Set(["Head", "Helmet", "NextSeo", "HeadContent", "Seo", "SEO", "MetaTags"]);

function declarationsOf(masked: string, tags: Tag[], path: string): PageDeclarations {
  const out: PageDeclarations = { surface: false, opaque: false, hreflang: [], jsonld: [] };
  const regions = metadataRegions(masked, path);

  for (const tag of tags) {
    const name = tag.name.toLowerCase();

    // A `<title>` inside an `<svg>` is the graphic's accessible name, not the
    // page's. Reading one as the page title fired `title-length` on a correct
    // icon button — "Close" is five characters — and, worse, would have
    // suppressed a real `title-missing` on a page whose only title tag was in
    // an icon.
    if (name === "title" && !out.title && !insideSvg(masked, tag.index)) {
      const span = elementSpan(masked, tag);
      const text = span ? masked.slice(span[0], span[1]) : "";
      // `<title><%= @page_title %></title>` and `<title>{title}</title>` are
      // both titles whose text this file does not contain.
      const readable = !UNREADABLE_VALUE.test(text) && !/[{}]/.test(text);
      out.title = { present: true, value: readable ? text.trim() : undefined, index: tag.index, fromTag: true };
    }

    if (name === "meta") {
      const nameAttr = (attrValue(tag, "name").value ?? attrValue(tag, "property").value ?? "").toLowerCase();
      if (nameAttr === "description" && !out.description) {
        const content = attrValue(tag, "content");
        out.description = { ...content, index: tag.index, fromTag: true };
      }
    }

    if (name === "link") {
      const rel = (attrValue(tag, "rel").value ?? "").toLowerCase();
      if (rel === "canonical" && !out.canonical) {
        const href = attrValue(tag, "href");
        out.canonical = { ...href, index: tag.index, fromTag: true };
      }
      if (rel === "alternate" && hasAttr(tag, "hreflang")) {
        const href = attrValue(tag, "href");
        out.hreflang.push({ index: tag.index, href: href.value, present: href.present });
      }
    }

    if (name === "script" && /ld\+json/i.test(attrValue(tag, "type").value ?? "")) {
      out.jsonld.push(tag);
    }

    // `<NextSeo title="…" description="…" canonical="…" />` and friends: the
    // declaration lives in the attributes rather than in a nested tag.
    if (HEAD_COMPONENTS.has(tag.name)) {
      out.surface = true;
      for (const [key, slot] of [["title", "title"], ["description", "description"], ["canonical", "canonical"]] as const) {
        const v = attrValue(tag, key);
        if (v.present && !out[slot]) out[slot] = { ...v, index: tag.index, fromTag: false };
      }
    }
  }

  if (regions.length) out.surface = true;
  for (const [key, slot] of [["title", "title"], ["description", "description"], ["canonical", "canonical"]] as const) {
    if (out[slot]) continue;
    const found = keyInRegions(masked, regions, key);
    if (found) out[slot] = { ...found, fromTag: false };
  }

  if (out.title || out.description || out.canonical) out.surface = true;

  // Opacity, in the three shapes it comes in. Note the last one: a file that
  // clearly declares metadata and yields nothing readable is the *most*
  // opaque case there is, and before this it counted as "no surface" — which
  // let another file's title license absence claims about it.
  const declaredByCall = METADATA_FROM_CALL.test(masked);
  const spreadInRegion = regions.some(([s, e]) => /\.\.\.[A-Za-z_$]/.test(masked.slice(s, e)));
  const mentionsWithoutReading = METADATA_MENTION.test(masked) && !out.title && !out.description && !out.canonical;
  out.opaque = declaredByCall || spreadInRegion || mentionsWithoutReading;

  return out;
}

/**
 * The spans of `<template>` elements whose content is inert — it is parsed but
 * never rendered until a script clones it, so a heading inside one is not a
 * heading on the page.
 *
 * The exception is a Vue SFC's outermost `<template>`, which is the
 * component's markup and is emphatically not inert; in a `.vue` file the first
 * span is therefore dropped. Nested ones (`<template #header>`,
 * `<template v-if>`) keep the guard, which errs toward not firing.
 */
function inertTemplateSpans(masked: string, path: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const lower = masked.toLowerCase();
  let from = 0;
  for (;;) {
    const open = lower.indexOf("<template", from);
    if (open === -1) break;
    const gt = masked.indexOf(">", open);
    const close = lower.indexOf("</template", open);
    if (gt === -1) break;
    spans.push([gt + 1, close === -1 ? masked.length : close]);
    from = gt + 1;
  }
  if (/\.vue$/i.test(path)) spans.shift();
  return spans;
}

/** True when `index` sits between an `<svg>` and its closing tag. */
function insideSvg(masked: string, index: number): boolean {
  const lower = masked.toLowerCase();
  const open = lower.lastIndexOf("<svg", index);
  if (open === -1) return false;
  const close = lower.indexOf("</svg", open);
  return close === -1 || close > index;
}

// ── URL judgements ───────────────────────────────────────────────────────────

const ABSOLUTE_URL = /^https?:\/\//i;

/**
 * A base URL a relative canonical is resolved against, declared in the same
 * file. Next.js's `metadataBase` is the one that matters — it is the whole
 * reason `alternates.canonical` may be relative — and it is deliberately the
 * only literal named here rather than a loose `url:` key, because a JSON-LD
 * `"url": "https://…"` is common in a real page and would suppress a genuine
 * finding.
 */
const URL_BASE_DECLARED = /\bmetadataBase\s*[:=]/i;

const hostOf = (url: string): string => {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return (m?.[1] ?? "").toLowerCase().replace(/:\d+$/, "");
};

/**
 * Hosts that cannot be a live site: the loopback names, the reserved special-use
 * TLDs (RFC 2606 / 6761), and a leading `staging` label. Deliberately *not*
 * `*.vercel.app`, `*.netlify.app` or `*.github.io` — those are production hosts
 * for a great many real sites, and an `error` telling their owners the canonical
 * is wrong would be exactly the false positive this module refuses.
 */
const UNREACHABLE_HOST =
  /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$|\.(?:local|localhost|test|invalid|example|internal)$|^staging\./i;

/** Trailing slash and fragment removed, scheme and host lower-cased. */
const normalizeUrl = (url: string): string =>
  url.trim().replace(/#.*$/, "").replace(/^(https?:\/\/[^/?#]+)/i, (h) => h.toLowerCase()).replace(/\/+$/, "");

// ── page text ────────────────────────────────────────────────────────────────

/** Element ids a single-page-app framework mounts itself into. */
const ROOT_ID = /^(?:root|app|__next|___gatsby|__nuxt|main-app|q-app|ember-app|app-root)$/i;

/** …and the ones that mount by element name instead — Angular, Ember. */
const ROOT_TAG = /^(?:app-root|ember-app)$/i;

/**
 * A build-time or server-side placeholder — `%sveltekit.head%`, `{{ … }}`,
 * `{% … %}`, `<%= … %>`, `<?php … ?>`. An `.html` file carrying one is a
 * *template*: the head it ships is assembled somewhere else, and its own head
 * proves nothing about the page a visitor receives.
 */
const TEMPLATE_PLACEHOLDER = /%[A-Za-z][\w.:-]*%|\{\{|\{%|<%[=\-]|<\?php/;

/** Visible text, with script/style/noscript contents and every tag removed. */
function visibleText(masked: string): string {
  const stripped = masked
    .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript\s*>/gi, " ");
  return flattenTags(stripped).replace(/\s+/g, " ").trim();
}

/**
 * A document is self-contained when its own `<head>` is the whole head: a
 * plain HTML file, not a framework component, and not a template with a
 * placeholder where the head content will be injected. `src/app.html` with
 * `%sveltekit.head%` and CRA's `public/index.html` with `%PUBLIC_URL%` are
 * correct files that declare no title on purpose, and reporting three
 * warnings against each of them is the false positive this guard removes.
 */
function isSelfContainedDocument(masked: string, path: string): boolean {
  if (FRAMEWORK_FILE.test(path)) return false;
  if (!/<head[\s>]/i.test(masked)) return false;
  if (TEMPLATE_PLACEHOLDER.test(masked)) return false;
  return !isEmailTemplate(masked, path);
}

/**
 * An HTML email. This server ships `knowledge/marketing/email-html-development.md`,
 * so email templates are in scope for the product and turn up in the same
 * repositories — and an email correctly has no meta description and no
 * canonical, because there is no URL and no crawler. Three warnings against
 * one is three false positives.
 *
 * The signature is a layout table that exists for email clients — `role
 * ="presentation"`, or the `cellpadding`/`cellspacing` attributes no web page
 * has used this decade — with no external stylesheet (email clients drop them)
 * and no `<nav>`. A web page would have to hit all three to be mistaken for
 * one.
 */
function isEmailTemplate(masked: string, path: string): boolean {
  const layoutTable = /<table[^>]*(?:role\s*=\s*["']presentation["']|cellpadding|cellspacing)/i.test(masked);
  if (!layoutTable) return false;
  if (/<link[^>]+rel\s*=\s*["']?stylesheet/i.test(masked) || /<nav[\s>]/i.test(masked)) return false;

  // A layout table is not enough on its own, and this is where the first
  // version of this guard went wrong: a single-page lander built on
  // `<table role="presentation">` with an inline `<style>` and no nav — a
  // deliberate, common CRO pattern — matched every signal and lost two real
  // findings. So the table must be joined by something a web page does not
  // have. A path is a fact; a table is a habit.
  if (EMAIL_PATH.test(path)) return true;

  // Markup that exists only because Outlook does: the VML/Office namespaces
  // and `mso-` style declarations.
  //
  // Matched against a copy with CSS comments and code samples removed, and
  // *not* against `masked` alone. The comment that used to sit here claimed
  // `maskComments` had already blanked them; it has not — scan.ts masks
  // `/* */` only in JS-like files, so in a plain `.html` a dead
  // `/* mso-line-height-rule: exactly */` inside a `<style>` block, or a
  // `<pre><code>` sample explaining Outlook properties, both read as live
  // email markup and exempted a real page. `maskComments` is a shared
  // primitive and is not this module's to change, so the narrowing happens
  // here, where the claim is made.
  //
  // A pixel-width table with no viewport meta was a third signal here and has
  // been removed outright: `templates/pricing.html` — a genuine landing page
  // with a `width="640"` layout table and no viewport tag — was exempted by
  // it, and losing real findings on real pages is the more expensive half of
  // this trade. A real email outside a mail path and without Outlook markup is
  // now graded as a page; that miss is disclosed and accepted.
  const withoutSamples = masked
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/<pre[\s\S]*?<\/pre\s*>/gi, " ")
    .replace(/<code[\s\S]*?<\/code\s*>/gi, " ");
  return /xmlns:[vo]\s*=|mso-[a-z-]+\s*:/i.test(withoutSamples);
}

/** `emails/`, `mail/`, `mailers/`, or an `.eml` / `.mjml` file. */
const EMAIL_PATH = /(?:^|\/)(?:emails?|mail|mailers?|notifications?\/emails?)\/|\.(?:eml|mjml)$/i;

/**
 * The mount point of a client-rendered application: a root element with no
 * visible text in it, a script bundle to fill it, and no other substantive
 * text on the page. All three are required — a page with real prose beside a
 * small `<div id="portal">` is a portal, not an empty page.
 *
 * "No visible text" rather than "empty": a spinner div, a `Loading…` string
 * and a `<noscript>` notice are all still a shell, and requiring literal
 * emptiness meant three of the five commonest scaffolds missed this and were
 * then treated as finished documents.
 */
function spaShellRoot(masked: string, tags: Tag[]): Tag | null {
  if (!/<body[\s>]|<html[\s>]/i.test(masked)) return null;
  if (visibleText(masked).length >= 200) return null;
  const bundle = hasBundleScript(tags);
  for (const tag of tags) {
    const mountsByName = ROOT_TAG.test(tag.name);
    if (!mountsByName && !ROOT_ID.test(attrValue(tag, "id").value ?? "")) continue;
    // Angular's own `src/index.html` carries `<app-root></app-root>` and no
    // script tag — the CLI injects the bundle — so an element that exists
    // *only* as a framework mount stands on its own. A `<div id="app">` does
    // not: without a bundle beside it, it could be anything.
    if (!bundle && !mountsByName) continue;
    const span = elementSpan(masked, tag);
    if (!span) continue;
    const inner = masked.slice(span[0], span[1]);
    // A spinner, a `Loading…` string or a `<noscript>` notice is still a
    // shell; a mount holding a heading or a paragraph is not.
    if (/<h[1-6][\s>]/i.test(inner) || visibleText(inner).length > 40) continue;
    return tag;
  }
  return null;
}

const hasBundleScript = (tags: Tag[]): boolean =>
  tags.some((t) => t.name.toLowerCase() === "script" && (attrValue(t, "src").value ?? "").length > 0);

/**
 * A script that is plausibly *this application's own bundle*, as opposed to a
 * third-party tag.
 *
 * The distinction is load-bearing and it is a fact, not a guess. An analytics,
 * chat-widget or ads script is served cross-origin from a vendor's host and
 * builds nothing; an application bundle is same-origin and sits at a build
 * output path or carries a build filename. Treating "any `<script src>`" as
 * evidence of client rendering meant an ordinary thin page — an "under
 * construction" notice carrying one analytics tag — was read as a shell, and
 * its missing title, description and canonical went unreported. Silence on a
 * genuine shell costs one finding; silence on every thin page costs three
 * rules.
 */
// Build output directories. `js/` is deliberately absent: plenty of sites keep
// every script in `/js/`, including `/js/analytics.js`, and accepting that
// directory as a build output reinstates exactly the miss this rule closes.
const BUNDLE_PATH = /(?:^|\/)(?:assets|_next|_nuxt|static|build|dist|_app|chunks)\//i;

/** A content hash in the filename — nobody types `index-4f2c1a.js` by hand. */
const BUNDLE_HASH = /[.\-_][0-9a-f]{6,}\.m?js$/i;

/**
 * A build filename, which on its own proves nothing. `/js/main.js`,
 * `/js/index.js` and `/js/app.js` are what a hand-written site calls its one
 * script, and reading them as bundler output silenced those pages just as
 * surely as accepting `js/` as a build directory did — the same bug one level
 * down. It counts only when corroborated by a minification or chunk marker.
 */
const BUNDLE_NAME = /(?:^|\/)(?:bundle|main|index|app|runtime|polyfills|vendor|entry|client)[.\-_][^/]*$/i;
const BUILD_MARKER = /\.min\.m?js$|[.\-_]chunk[.\-_]|chunk[.\-_][^/]*\.m?js$/i;

const hasOwnBundle = (tags: Tag[]): boolean =>
  tags.some((t) => {
    if (t.name.toLowerCase() !== "script") return false;
    const src = attrValue(t, "src").value ?? "";
    if (!src || isCrossOrigin(src)) return false;
    // `type="module"` is deliberately not a signal. A hand-authored
    // `<script type="module" src="/toggle-menu.js">` is an ES module and
    // nothing more; modules are *correlated with* bundled apps, and treating
    // the correlation as the evidence silenced small, correct pages.
    return BUNDLE_PATH.test(src) || BUNDLE_HASH.test(src) || (BUNDLE_NAME.test(src) && BUILD_MARKER.test(src));
  });

/** `https://…` or `//…` — served by someone else, and no evidence about this page. */
const isCrossOrigin = (url: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith("//");

/**
 * Does this document leave its content to a script, whether or not the mount
 * point is one we recognise?
 *
 * Deliberately independent of `spaShellRoot`. Tying the absence guard to a
 * precise mount match made it one keystroke wide: `<div id="root">Loading…
 * </div>`, `<app-root></app-root>` and `<div id="ember-app"></div>` each
 * missed by an id or by a character, and the file then claimed a title, a
 * description and a canonical were absent from a head its own script writes.
 * The *finding* needs a precise root to point at; the *guard* only needs the
 * fact that nothing here is authored — no headings, almost no text, and
 * either a bundle or a recognised empty mount to explain why.
 */
function looksClientRendered(masked: string, tags: Tag[]): boolean {
  if (!/<body[\s>]|<html[\s>]/i.test(masked)) return false;
  if (tags.some((t) => /^h[1-6]$/i.test(t.name))) return false;
  if (visibleText(masked).length >= 200) return false;
  // Two admissible kinds of evidence, and "there is a script tag" is not one
  // of them. Either the page names a mount point a framework fills — Angular's
  // own `src/index.html` ships `<app-root></app-root>` and no script at all,
  // because the CLI injects the bundle — or it loads its *own* bundle. A
  // third-party analytics tag is neither, and accepting it silenced the
  // title, description and canonical rules on every thin page that carries one.
  return tags.some((t) => ROOT_TAG.test(t.name) || ROOT_ID.test(attrValue(t, "id").value ?? ""))
    || hasOwnBundle(tags);
}

/**
 * True when this element is rendered conditionally, so only one of the
 * branches it belongs to ever reaches the page. Every templating language in
 * range writes that differently, and each of the three below was a live false
 * `multiple-h1` on a correct search page before it was handled:
 *   • JSX      `{query ? <h1>Results</h1> : <h1>Search</h1>}`
 *   • Svelte   `{#if query}<h1>…</h1>{:else}<h1>…</h1>{/if}`
 *   • Vue      `<h1 v-if="query">…</h1><h1 v-else>…</h1>`
 * A plain HTML page with two real `<h1>`s has none of these markers and still
 * fires, which is the whole point of the rule.
 */
const CONDITIONAL_ATTR = /(?:^|\s)(?:v-if|v-else|v-else-if|v-show|x-if|x-show|\*ngIf)\b/i;
const CONDITIONAL_BLOCK = /\?|&&|\|\||\.map\s*\(|\{\s*#(?:if|each|await)|\{\s*:(?:else|then|catch)|@(?:if|for|else)\b/;

function conditionallyRendered(masked: string, tag: Tag): boolean {
  // Read at a name position, like every other attribute in this module:
  // `<h1 title="in Vue use v-if here">A</h1><h1>B</h1>` is two unconditional
  // H1s, and reading the words in that title as directives silenced a real
  // `multiple-h1`.
  if (CONDITIONAL_ATTR.test(bareAttrs(tag.attrs))) return true;
  const open = masked.lastIndexOf("{", tag.index);
  if (open === -1 || tag.index - open > 400) return false;
  return CONDITIONAL_BLOCK.test(masked.slice(open, tag.index));
}

/**
 * A JS/TS module, where several components legitimately live side by side.
 * `.vue`, `.svelte` and `.astro` are single-file components and are not in
 * here: one file is one component and one segment.
 */
const JS_MODULE = /\.(?:[jt]sx?|[cm][jt]s)$/i;

/**
 * The start of a top-level component declaration — `export default function
 * Page`, `export const NotFound = `, `function ErrorBoundary(`. Capitalised
 * names only, which is the one convention every JSX framework enforces rather
 * than merely suggests: a lowercase identifier is not a component, so a
 * `const inter = Inter({…})` beside a page does not split it.
 */
const TOP_LEVEL_COMPONENT =
  /^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function\s+(?:[A-Z][\w$]*)?\s*\(|(?:const|let|var)\s+[A-Z][\w$]*\s*[=:])/gm;

/**
 * The `[start, end)` of each rendered page in this file. One segment for a
 * document or a single-file component; one per top-level component in a JS
 * module, because only one of those components is ever on screen at a time.
 */
function componentSegments(masked: string, path: string): Array<[number, number]> {
  if (!JS_MODULE.test(path)) return [[0, masked.length]];
  const starts: number[] = [];
  TOP_LEVEL_COMPONENT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOP_LEVEL_COMPONENT.exec(masked)) !== null) starts.push(m.index);
  if (starts.length < 2) return [[0, masked.length]];
  // Anything above the first declaration belongs with it; nothing renders
  // above a component in a module.
  starts[0] = 0;
  return starts.map((start, i) => [start, starts[i + 1] ?? masked.length] as [number, number]);
}

// ── the rule set ─────────────────────────────────────────────────────────────

// Ranges are the brief's, not the documents': on-page-seo targets 50–60
// characters for a title and 150–160 for a description, and firing on
// everything outside *those* would flag a great deal of correct work. What is
// flagged here is only what is outside a range wide enough that no reasonable
// reading of the document defends it.
/**
 * The types technical-seo §4 lists under "Deprecated — do NOT promise clients
 * rich results from these": HowTo (removed 2023–2024), FAQPage (restricted in
 * 2023, retired for visual snippets by 2026), and the June 2025 removals it
 * names. Only the ones whose schema.org type name the document states
 * unambiguously are here — a guess at which type "Estimated Salary" maps to
 * would be a claim the document does not make.
 *
 * Which is which, so the next reader does not have to check: the document
 * writes `HowTo` and `FAQPage` as literal identifiers. The other four are
 * mapped from the *feature* names in its prose — "Claim Review", "Special
 * Announcement", "Vehicle Listing" and "Course Info" — each of which has one
 * and only one schema.org type behind it. "Estimated Salary" and "Learning
 * Video" do not, and are deliberately absent.
 */
const DEPRECATED_RICH_RESULT = new Set([
  "HowTo", "FAQPage", "ClaimReview", "SpecialAnnouncement", "VehicleListing", "Course",
]);

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;

export function seoRules(code: string, filename?: string): LintFinding[] {
  const path = filename ?? "";
  // A commented-out `<link rel="canonical">` is not a canonical, and a code
  // sample in a doc comment is not a page. Same masking pass, and the same
  // reasoning, as security.ts.
  const masked = maskComments(code, path);
  const tags = scanTags(masked);
  const decl = declarationsOf(masked, tags, path);

  const out: LintFinding[] = [];
  const push = (
    index: number, severity: LintFinding["severity"], rule: string,
    message: string, fix: string, doc: string,
  ) => out.push({ line: lineOf(code, index), severity, rule, message, fix, doc });

  // The empty mount point of a client-rendered app, if this document is one.
  // It decides two things: the `content-not-in-html` finding below, and
  // whether any head absence can be claimed at all — an app that renders its
  // own body renders its own head too, through whatever it uses for that
  // (react-helmet, vue-meta), and none of it is in this file.
  const shellRoot = spaShellRoot(masked, tags);

  /**
   * Can this file prove its own metadata absent? Only a self-contained
   * document can — see the module header. A framework component's `<head>`,
   * or its lack of one, says nothing about the layout that wraps it; a
   * template's head is completed at build time; a shell's head is completed
   * at run time.
   */
  const headMatch = /<head[\s>]/i.exec(masked);
  const selfContained = isSelfContainedDocument(masked, path)
    && headMatch !== null
    && !shellRoot
    && !looksClientRendered(masked, tags);
  const headIndex = headMatch?.index ?? 0;

  // ── title ──────────────────────────────────────────────────────────────────
  if (selfContained && !decl.title) {
    push(headIndex, "warning", "title-missing",
      `This document's <head> carries no <title>, so search results and browser tabs fall back to whatever the engine can synthesise.`,
      `Add one unique <title> per page: the topic first, the brand last — "Website Redesign Pricing | Studio".`,
      "on-page-seo");
  }
  if (decl.title?.value) {
    const len = decl.title.value.length;
    // A framework `title` is only ever *added to*: a layout's
    // `title.template` ("%s | Studio") wraps the page's own string, and that
    // template is not in this file. So a short one here cannot be called short
    // — only a long one is already long whatever the layout does.
    // …and a shell's title is a placeholder its own script replaces, so a
    // short one there is not short either.
    const tooShort = len < TITLE_MIN && decl.title.fromTag && selfContained;
    if (len > TITLE_MAX || tooShort) {
      push(decl.title.index, "warning", "title-length",
        len > TITLE_MAX
          ? `The title is ${len} characters; past about 60 it is truncated in results, so the end of it is never read.`
          : `The title is ${len} characters, which leaves most of the available width unused.`,
        `Aim for 50–60 characters, topic in the first half, brand at the end.`,
        "on-page-seo");
    }
  }

  // ── meta description ───────────────────────────────────────────────────────
  if (selfContained && !decl.description) {
    push(headIndex, "warning", "meta-description-missing",
      `No meta description, so the engine writes its own snippet from whatever text it finds on the page.`,
      `Add a unique description per page: what the page delivers, the differentiator, a soft call to action.`,
      "on-page-seo");
  }
  if (decl.description?.value) {
    const len = decl.description.value.length;
    if (len > DESCRIPTION_MAX || len < DESCRIPTION_MIN) {
      push(decl.description.index, "warning", "meta-description-length",
        len > DESCRIPTION_MAX
          ? `The meta description is ${len} characters; past about 160 the tail is cut off in the snippet.`
          : `The meta description is ${len} characters, which is short of the width a snippet gives you.`,
        `Aim for 150–160 characters, front-loading a one-sentence direct answer.`,
        "on-page-seo");
    }
  }

  // ── canonical ──────────────────────────────────────────────────────────────
  if (selfContained && !decl.canonical) {
    push(headIndex, "warning", "canonical-missing",
      `No canonical link, so every URL variant of this page — parameters, trailing slash, protocol — is a separate document as far as a crawler is concerned.`,
      `Add a self-referencing <link rel="canonical" href="https://…"> with the page's final absolute URL.`,
      "technical-seo");
  }
  if (decl.canonical?.value) {
    const url = decl.canonical.value.trim();
    // Claimed only where a relative canonical is provably a relative canonical.
    //
    // `canonical-missing`'s own fix says "in Next.js, metadata.alternates
    // .canonical with metadataBase" — and following that advice fired this
    // rule, with a fix (hardcode an absolute URL per route) that breaks every
    // preview deployment. `metadataBase` exists precisely so route canonicals
    // can be written relative and resolved at build time; the same is true of
    // Astro's `site`, Nuxt's `app.baseURL` and Gatsby's `siteUrl`. A framework
    // file's relative canonical is a fragment of a URL this call cannot see the
    // other half of, so nothing here can call it relative in the emitted HTML.
    //
    // A self-contained document is the case where it can: that file's `<head>`
    // is the whole head, and `href="/pricing/"` in it is what ships.
    if (!ABSOLUTE_URL.test(url) && selfContained && !URL_BASE_DECLARED.test(masked)) {
      push(decl.canonical.index, "warning", "canonical-not-absolute",
        `The canonical href "${url}" is relative. technical-seo asks for absolute URLs only, matching the final protocol and host exactly.`,
        `Write the full URL: https://example.com${url.startsWith("/") ? url : `/${url}`}`,
        "technical-seo");
    }
    if (ABSOLUTE_URL.test(url) && UNREACHABLE_HOST.test(hostOf(url))) {
      push(decl.canonical.index, "error", "canonical-points-elsewhere",
        `The canonical points at "${hostOf(url)}", which is not the host this page is served from — a development or staging URL left in the markup.`,
        `Point the canonical at the page's own production URL, matching the final protocol, host and trailing slash.`,
        "technical-seo");
    }
  }

  // ── hreflang ───────────────────────────────────────────────────────────────
  // Reciprocity is a claim about two pages, and only one is in this file. What
  // *is* checkable here is the other half of the same mechanism: a set that
  // never names this page cannot be reciprocated by the pages it points at,
  // because they have nothing to point back to.
  if (decl.hreflang.length && decl.canonical?.value && ABSOLUTE_URL.test(decl.canonical.value)) {
    const readable = decl.hreflang.every((h) => h.href !== undefined);
    const self = normalizeUrl(decl.canonical.value);
    if (readable && !decl.hreflang.some((h) => normalizeUrl(h.href!) === self)) {
      push(decl.hreflang[0].index, "warning", "hreflang-not-reciprocal",
        `This hreflang set never lists this page itself (${self}). Self-reference and return tags are what make a set reciprocal; one-way tags are ignored.`,
        `Add a <link rel="alternate" hreflang="…"> for this page's own locale pointing at its own canonical URL, and an x-default.`,
        "technical-seo");
    }
  }

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  for (const tag of decl.jsonld) {
    const span = elementSpan(masked, tag);
    if (!span) continue;
    const body = code.slice(span[0], span[1]).trim();
    // Nothing to read: an empty block, a block rendered through
    // dangerouslySetInnerHTML, or one assembled from a template literal. A
    // block whose contents only exist at render time cannot be parsed here,
    // and guessing at it would be inventing a finding.
    if (!body || /\$\{/.test(body) || !/^[[{]/.test(body)) continue;

    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch (err) {
      push(tag.index, "error", "jsonld-unparseable",
        `This application/ld+json block is not valid JSON (${(err as Error).message}), so every consumer of it — rich results, AI extraction — skips the block entirely.`,
        `Fix the JSON (a trailing comma and an unquoted key are the usual causes) and re-check it in the Rich Results Test.`,
        "technical-seo");
      continue;
    }

    // Narrowed deliberately. Which properties a *type* requires is Google's
    // per-type documentation, and technical-seo does not state them — a rule
    // claiming "Article needs an author" would be citing a document that never
    // said so, the exact defect the generic-design package shipped once. What
    // every example in the cited document does carry, and what makes a block
    // interpretable at all, is `@context` and a `@type` on each node.
    // `typeof [] === "object"`, so a nested array passed this filter and was
    // then read as a node with neither `@context` nor `@type` — a block
    // reported as missing both when it declares one perfectly well.
    const isNode = (n: unknown): n is Record<string, unknown> =>
      typeof n === "object" && n !== null && !Array.isArray(n);

    const nodes = (Array.isArray(data) ? data : [data]).filter(isNode);
    const missing = new Set<string>();
    const types: string[] = [];
    for (const node of nodes) {
      if (!("@context" in node)) missing.add("@context");
      const graph = node["@graph"];
      const typed = Array.isArray(graph) ? graph.filter(isNode) : [node];
      if (typed.some((t) => !("@type" in t))) missing.add("@type");
      for (const t of typed) {
        const value = t["@type"];
        for (const one of Array.isArray(value) ? value : [value]) {
          if (typeof one === "string") types.push(one);
        }
      }
    }
    if (missing.size) {
      const names = [...missing];
      push(tag.index, "warning", "jsonld-missing-required",
        `This JSON-LD block is missing ${names.join(" and ")}. Without ${names.length > 1 ? "them" : "it"} it is an anonymous object rather than a schema.org node.`,
        `Add "@context": "https://schema.org" and a "@type" on every node, then validate with the Rich Results Test.`,
        "technical-seo");
    }

    // technical-seo §4 keeps a list of types whose *rich results* Google has
    // retired, and is equally clear that the markup itself stays valid and
    // still aids entity understanding — "Keep FAQPage markup if cheap; don't
    // build strategy on it". So this is `info`, it names the expectation
    // rather than the markup as the problem, and it does not ask for a
    // deletion the cited document argues against.
    const retired = [...new Set(types.filter((t) => DEPRECATED_RICH_RESULT.has(t)))];
    if (retired.length) {
      push(tag.index, "info", "jsonld-deprecated-type",
        `This block declares ${retired.join(" and ")}, ${retired.length > 1 ? "types" : "a type"} whose rich results Google has retired (technical-seo §4). The markup is still valid schema.org and still helps entity understanding — it just earns no result in the SERP.`,
        `Nothing to remove: keep it if it was cheap to add, and don't plan a template or a client deliverable around a rich result for it.`,
        "technical-seo");
    }
  }

  // ── headings ───────────────────────────────────────────────────────────────
  //
  // Counted per *rendered page*, which in a JS module is per top-level
  // component rather than per file. The "a component file is not a page"
  // doctrine was applied rigorously to metadata and not at all here, so a
  // module holding several components was graded as though a visitor received
  // all of them at once:
  //
  //   src/components/Heading.stories.tsx   three stories of one Heading
  //   app/routes/errors.tsx                NotFound and ServerError
  //   app/dashboard/page.tsx               Page and its ErrorBoundary
  //   src/panels.tsx                       an <h1> here and an <h3> there
  //
  // All four drew a finding, and `.stories.tsx` matters most of the four: a
  // design-system repository is this package's own audience, and a story file
  // per component is how those repositories are laid out. Only one of those
  // components is ever on screen.
  //
  // A single-file component — `.vue`, `.svelte`, `.astro` — and a real
  // document are one segment, so nothing is lost there. Two `<h1>`s inside one
  // component still fire, which is the case the rule exists for.
  const inert = inertTemplateSpans(masked, path);
  const allHeadings = tags
    .filter((t) => /^h[1-6]$/i.test(t.name))
    .filter((t) => !inert.some(([s, e]) => t.index >= s && t.index < e))
    .map((t) => ({ level: Number(t.name[1]), index: t.index, tag: t }));

  for (const [from, to] of componentSegments(masked, path)) {
    const headings = allHeadings.filter((h) => h.index >= from && h.index < to);
    const h1s = headings.filter((h) => h.level === 1);
    if (h1s.length > 1 && !h1s.some((h) => conditionallyRendered(masked, h.tag))) {
      push(h1s[1].index, "warning", "multiple-h1",
        `${h1s.length} <h1> elements on one page. One is the clean signal of the page's topic, for search engines and for the models that parse structure into chunks.`,
        `Keep one <h1> and demote the rest to <h2>. Size them with CSS, not with the tag.`,
        "on-page-seo");
    }

    // Only checked when the segment contains an `<h1>`. Without one there is no
    // root to the outline, and a fragment that legitimately starts at `<h3>`
    // because its parent rendered the `<h2>` would be reported as a skip.
    if (!h1s.length) continue;
    let previous = 0;
    for (const h of headings) {
      if (previous && h.level > previous + 1) {
        push(h.index, "info", "heading-order-skipped",
          `Heading order jumps from h${previous} to h${h.level}. Heading levels are the document's outline; skipping one breaks the nesting a screen reader and a retrieval chunker both walk.`,
          `Use the next level down and style it with CSS.`,
          "accessibility");
      }
      previous = h.level;
    }
  }

  // ── images ─────────────────────────────────────────────────────────────────
  for (const tag of tags) {
    if (tag.name !== "img" && tag.name !== "Image") continue;
    // `alt=""` is the correct marking for a decorative image, not a missing
    // one, and `hasAttr` sees it. A spread may forward the attribute.
    if (hasAttr(tag, "alt") || hasSpread(tag)) continue;
    push(tag.index, "warning", "alt-missing",
      `<${tag.name}> has no alt attribute at all, so it is opaque to a screen reader and carries no text for anything reading the page as text.`,
      `Describe it: alt="…" for a meaningful image, alt="" for a decorative one.`,
      "accessibility");
  }

  // ── content in the HTML ────────────────────────────────────────────────────
  // The GEO rule nothing in this server has ever checked: AI crawlers read the
  // initial HTML only, technical-seo §3 says so, and until now nothing here
  // looked. A shell page for a genuinely client-only app is a fact worth
  // reporting even though the app works.
  if (shellRoot) {
    push(shellRoot.index, "warning", "content-not-in-html",
      `<${shellRoot.name}${attrValue(shellRoot, "id").value ? ` id="${attrValue(shellRoot, "id").value}"` : ""}> holds no content and the page carries no other substantive text, so nothing in this document's HTML is the content — it arrives when the application script runs. AI crawlers read the initial HTML only.`,
      `Server-render or pre-render the content for this route (SSG, SSR or ISR) and hydrate for interactivity.`,
      "technical-seo");
  }

  const seen = new Set<string>();
  return out
    .filter((f) => {
      const key = `${f.rule}:${f.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line - b.line);
}

// ── site-level rules ─────────────────────────────────────────────────────────
//
// robots.txt, llms.txt and the sitemap reference are read the way security.ts
// reads `_headers`: by filename, wherever in the tree they turned up.

interface RobotsGroup {
  /** As written in the file — a finding should name `GPTBot`, not `gptbot`. */
  agents: string[];
  disallow: string[];
  allow: string[];
  line: number;
}

/**
 * robots.txt as the standard defines it: consecutive `User-agent` lines form
 * one group's agent list, and the first non-agent directive closes it. `#`
 * starts a comment — a commented-out `Disallow: /` is not a rule, and reading
 * it as one would report a site blocked that is not.
 */
function parseRobots(source: string): { groups: RobotsGroup[]; sitemaps: string[] } {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let collectingAgents = false;

  source.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) return;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) return;
    const key = m[1].toLowerCase();
    const value = m[2].trim();

    if (key === "user-agent") {
      if (!current || !collectingAgents) {
        current = { agents: [], disallow: [], allow: [], line: i + 1 };
        groups.push(current);
      }
      current.agents.push(value);
      collectingAgents = true;
      return;
    }
    if (key === "sitemap") {
      sitemaps.push(value);
      return;
    }
    collectingAgents = false;
    if (!current) return;
    if (key === "disallow") current.disallow.push(value);
    if (key === "allow") current.allow.push(value);
  });

  return { groups, sitemaps };
}

/**
 * The AI crawlers geo-tactics-checklist §7 and geo-fundamentals §5 name.
 * Bingbot and Googlebot are deliberately absent: blocking those is a search
 * decision with different consequences, and this note is about the AI ones.
 */
const AI_CRAWLERS = [
  "gptbot", "oai-searchbot", "chatgpt-user", "claudebot", "claude-user", "anthropic-ai",
  "perplexitybot", "perplexity-user", "google-extended", "ccbot", "bytespider",
  "applebot-extended", "meta-externalagent", "amazonbot", "cohere-ai", "youbot", "diffbot",
];

const blocksEverything = (g: RobotsGroup): boolean =>
  g.disallow.some((d) => d === "/") && g.allow.length === 0;

export interface SeoConfigOptions {
  /** The scan stopped early, so no absence claim below can be proven. */
  truncated?: boolean;
}

export function seoConfigRules(
  files: Array<{ path: string; source: string }>,
  options: SeoConfigOptions = {},
): LintFinding[] {
  const out: LintFinding[] = [];
  const truncated = options.truncated === true;

  const push = (
    file: string, line: number, severity: LintFinding["severity"],
    rule: string, message: string, fix: string, doc: string,
  ) => out.push({ line, severity, rule, message: `${file}: ${message}`, fix, doc });

  /**
   * An absence claim, demoted to an unconfirmed note when the scan was cut
   * short — the same guard securityConfigRules uses, for the same reason: a
   * capped scan cannot prove absence, and saying it can is the one failure
   * this family of modules refuses.
   */
  const absent = (
    rule: string, severity: LintFinding["severity"],
    message: string, fix: string, doc: string, file = "configuration", line = 1,
  ) => push(file, line, truncated ? "info" : severity, rule,
    truncated
      ? `${message} The scan stopped before reading every file, so this absence is unconfirmed — the declaration may sit in a file that was never opened.`
      : message,
    truncated ? `Re-run on a narrower path to confirm, then: ${fix}` : fix,
    doc);

  // ── robots.txt ─────────────────────────────────────────────────────────────
  const robotsFiles = files.filter((f) => basename(f.path).toLowerCase() === "robots.txt");

  for (const file of robotsFiles) {
    const { groups, sitemaps } = parseRobots(file.source);

    for (const group of groups) {
      if (!blocksEverything(group)) continue;

      if (group.agents.includes("*")) {
        push(file.path, group.line, "error", "robots-blocks-everything",
          `"Disallow: /" under "User-agent: *" tells every crawler to fetch nothing on this host.`,
          `Disallow only the paths that are genuinely private, and never CSS or JS — a renderer needs them.`,
          "technical-seo");
      }

      const ai = group.agents.filter((a) => AI_CRAWLERS.includes(a.toLowerCase()));
      if (ai.length) {
        // Deliberately `info`, and deliberately silent on which way to decide.
        // Blocking an AI crawler is a legitimate business decision — licensing,
        // competitive, a publisher's whole revenue model — and a rule that
        // argues policy has left the ground this module stands on. It states
        // the choice, names its consequence as documented fact, and points at
        // the document that lays out the trade-off.
        push(file.path, group.line, "info", "robots-blocks-ai-crawlers",
          `This robots.txt disallows ${ai.join(", ")} across the whole site. Those crawlers are how the answer engines behind them retrieve and cite pages, so this site's content is outside that surface by design.`,
          `If that is the intent, nothing to do — geo-fundamentals lays out what visibility in AI answers is worth and what it costs, for whenever the decision is revisited.`,
          "geo-fundamentals");
      }
    }

    if (!sitemaps.length) {
      absent("sitemap-not-referenced", "info",
        `robots.txt names no sitemap, so a crawler has to discover every URL by following links.`,
        `Add "Sitemap: https://example.com/sitemap.xml" and submit it in Search Console.`,
        "technical-seo", file.path, 1);
    }
  }

  // ── llms.txt ───────────────────────────────────────────────────────────────
  // Only claimed when a robots.txt was actually read. Without one there is no
  // evidence this scan was pointed at a site root at all, and "/llms.txt is
  // absent" would be a claim about a directory nobody looked in.
  if (robotsFiles.length && !files.some((f) => basename(f.path).toLowerCase() === "llms.txt")) {
    absent("llms-txt-absent", "info",
      `No llms.txt was found beside robots.txt. It is a curated markdown index of a site's key pages, served at /llms.txt.`,
      `Optional and low priority — large-scale tests show no measurable citation lift yet, and geo-tactics-checklist §6 rates it a cheap hedge rather than a tactic. Roughly thirty minutes if you want one.`,
      "geo-tactics-checklist");
  }

  // ── project-level metadata ─────────────────────────────────────────────────
  // See the module header. This runs only when no self-contained document was
  // scanned; when one was, `seoRules` already claimed absence at the only
  // scope where it can be proven, and repeating it here would report one
  // defect twice.
  const pages = files.filter((f) => /\.(?:html?|[jt]sx|astro|svelte|vue)$/i.test(f.path));
  const selfContained = pages.some((f) => isSelfContainedDocument(maskComments(f.source, f.path), f.path));

  if (!selfContained && pages.length) {
    // Site configs are read here too — `nuxt.config.ts`, `gatsby-config.js`,
    // `astro.config.mjs` and `docusaurus.config.js` are where those frameworks
    // declare the site's title, description and URL, and a project claim made
    // without opening them is a claim about files that were right there.
    const declared = [...pages, ...files.filter((f) => SITE_CONFIG_FILE.test(f.path))].map((f) => {
      const masked = maskComments(f.source, f.path);
      return declarationsOf(masked, scanTags(masked), f.path);
    });

    if (declared.some((d) => d.surface)) {
      /**
       * A key is claimable only when nothing in the project *hides* it.
       *
       * One file's readable surface used to license claims about all three
       * keys across every file, including files whose shape this module
       * admits it cannot read: an Astro page declaring a `title` unlocked
       * `meta-description-missing` and `canonical-missing` against a Next.js
       * page whose `metadata = constructMetadata({…})` sets both inside a
       * helper. The surface doctrine was right and was being applied per
       * project instead of per key. A file that declares the key is fine, and
       * so is one with nothing to declare — an opaque file is not, and it
       * blocks only the keys it does not show.
       */
      const anywhere = (key: "title" | "description" | "canonical") => declared.some((d) => d[key]?.present);
      const hidden = (key: "title" | "description" | "canonical") =>
        declared.some((d) => d.opaque && !d[key]?.present);
      const claimable = (key: "title" | "description" | "canonical") => !anywhere(key) && !hidden(key);

      if (claimable("title")) {
        absent("title-missing", "warning",
          `No file read here declares a page title — no <title>, no metadata export, no head component.`,
          `Give every route a unique title: the topic first, the brand last.`,
          "on-page-seo");
      }
      if (claimable("description")) {
        absent("meta-description-missing", "warning",
          `No file read here declares a meta description, so every snippet is written by the engine from whatever text it finds.`,
          `Give every route a unique description: what the page delivers, the differentiator, a soft call to action.`,
          "on-page-seo");
      }
      if (claimable("canonical")) {
        absent("canonical-missing", "warning",
          `No file read here declares a canonical URL, so every URL variant of a route — parameters, trailing slash, protocol — is a separate document to a crawler.`,
          `Set a self-referencing canonical per route (in Next.js, metadata.alternates.canonical with metadataBase).`,
          "technical-seo");
      }
    }
  }

  return out.sort((a, b) => a.line - b.line);
}

// ── what this tool advertises ────────────────────────────────────────────────

/**
 * The capabilities `audit_seo_geo` claims, each mapped to the rule ids that
 * deliver it. The tool description is built from this list, and the suite
 * asserts the mapping is exact in both directions.
 *
 * The description shipped two claims this module does not make — canonical
 * *self-reference* (there is no such rule; the canonical rules read presence,
 * absolute shape and host) and *hreflang reciprocity* (reciprocity is a claim
 * about two pages and only one is ever in the file; what the rule checks is
 * that the set names this page at all). Both were the sibling tool's defect in
 * mirror image: a caller who reads a silent run as "my canonicals
 * self-reference correctly" has been told something by the blurb that no rule
 * here ever established.
 */
export const SEO_CAPABILITIES: Array<{ rules: string[]; text: string }> = [
  { rules: ["title-missing", "title-length"], text: "a missing <title>, and one longer or shorter than the width a result gives it" },
  { rules: ["meta-description-missing", "meta-description-length"], text: "a missing meta description, and one outside the width a snippet gives it" },
  { rules: ["multiple-h1"], text: "more than one <h1> on a page" },
  { rules: ["heading-order-skipped"], text: "a heading level skipped in the outline" },
  { rules: ["canonical-missing"], text: "no canonical link at all" },
  { rules: ["canonical-not-absolute"], text: "a canonical written as a relative URL in a self-contained document" },
  { rules: ["canonical-points-elsewhere"], text: "a canonical left pointing at localhost or a staging host" },
  { rules: ["hreflang-not-reciprocal"], text: "an hreflang set that never lists the page itself" },
  { rules: ["jsonld-unparseable", "jsonld-missing-required"], text: "JSON-LD that does not parse, or that declares no @context or @type" },
  { rules: ["jsonld-deprecated-type"], text: "JSON-LD declaring a type whose rich result Google has retired" },
  { rules: ["alt-missing"], text: "an image with no alt attribute at all" },
  { rules: ["robots-blocks-everything", "robots-blocks-ai-crawlers"], text: "robots.txt crawl rules, including the AI crawlers behind ChatGPT, Claude, Perplexity and Google's AI surfaces" },
  { rules: ["sitemap-not-referenced"], text: "a robots.txt that names no sitemap" },
  { rules: ["llms-txt-absent"], text: "no llms.txt beside it" },
  { rules: ["content-not-in-html"], text: "content that exists only once a script has run" },
];

// ── the report ───────────────────────────────────────────────────────────────

/**
 * The metadata shapes `metadataRegions`, `NAMED_TAG_SHAPE` and
 * `METADATA_MENTION` between them can read. Stated in the report because the
 * alternative is a reader concluding, from silence, that their metadata is
 * absent — the same failure `securityReport` documents for header shapes, and
 * the one this module's own header calls the framework-metadata question.
 */
const RECOGNISED_METADATA = [
  "`<title>`, `<meta name=\"description\">` and `<link rel=\"canonical\">` inside a real `<head>`",
  "a Next.js `metadata` export, `generateMetadata()`, and `metadata = someHelper({ … })` — where what the call's own arguments say is read and the helper's defaults are not",
  "Remix / React Router `meta` and `links` exports",
  "Nuxt `useHead`, `useSeoMeta` and `definePageMeta`",
  "Astro frontmatter and `<svelte:head>`",
  "`<Head>`, `<Helmet>`, `<NextSeo>` and `<Seo>` components",
  "the site-level metadata in `nuxt.config`, `astro.config`, `gatsby-config`, `docusaurus.config`, `svelte.config` and `next-seo.config`",
].join("; ");

/**
 * What this audit structurally cannot see, as a machine-readable list.
 *
 * Every entry is here because it is a limitation the rules actually have, and
 * several were discovered by a false positive on correct work. An agent
 * chaining audit → fix reads this as a peer of the findings: silence on a
 * subject named below is this tool's reach, not a clean page.
 */
export const SEO_NOT_VISIBLE: string[] = [
  "**Nothing here is measured.** Core Web Vitals are 75th-percentile field data from real visitors on real devices, and indexing and ranking are a search engine's own behaviour. This reads authored signals out of source text, makes no request to your site and renders nothing, so no finding above is — or can be — a vitals result, an indexing status or a ranking outcome.",
  "**Metadata a framework injects at build or request time.** A title merged in from a layout, a description written by a CMS, a canonical assembled in middleware or a header set at a CDN edge is not in the files that were read. Its absence here is not its absence in the response a crawler receives.",
  "**Anything that needs the whole site graph.** Broken links, orphan pages, redirect chains, duplicate content across routes, whether a sitemap's URLs resolve, and whether any of it is indexed. Every finding above is scoped to the file it names.",
  `**Metadata shapes it does not recognise.** It reads ${RECOGNISED_METADATA}. A shape outside that list is invisible, and that costs differently at the two scopes absence is claimed at. In one file it costs silence: nothing is claimed about metadata this audit cannot read. Across a directory it can cost a finding — \`title-missing\`, \`meta-description-missing\` and \`canonical-missing\` are project-scope claims, and a project whose title is declared in a shape above while its description and canonical are declared in a shape below will draw both as warnings. They are worded as what they are ("no file read here declares a meta description"), and on an unrecognised stack that is a fact about this audit's reach rather than about the page.`,
  "**An HTML email graded as a web page.** Recognising one takes *four* things at once: a layout table (`role=\"presentation\"`, `cellpadding` or `cellspacing`), **no** `<link rel=\"stylesheet\">`, **no** `<nav>`, and then either a mail path (`emails/`, `mail/`, `mailers/`, `.eml`, `.mjml`) or Outlook-only markup (`xmlns:v`, `xmlns:o`, `mso-` declarations). The two negatives are load-bearing and easy to trip: an email in `emails/` that links an external stylesheet — mail clients drop them, but plenty of templates ship one for the browser preview — or that uses a `<nav>` for its footer links is graded as a page, and draws exactly the findings this exemption exists to prevent. The third signal that would have widened the net also exempted a real landing page, so the miss is deliberate.",
  "**…and the exemption is narrower than \"exempted from the page rules\".** What a recognised email skips is the head-absence set — `title-missing`, `meta-description-missing`, `canonical-missing` — because those are claimed only for a self-contained document. `multiple-h1`, `alt-missing`, `heading-order-skipped` and the JSON-LD rules still grade it, and `title-length` still grades a subject line — but only for being too long. The short-title half of that rule is gated on a self-contained document, which a recognised email never is, so a two-character `<title>` passes silently on an email while the same string on a page draws the warning.",
  "**A client-rendered shell whose mount point it does not recognise.** The head rules step aside for a shell that names a known mount — `root`, `app`, `__next`, `___gatsby`, `__nuxt`, `main-app`, `q-app`, `ember-app`, `app-root`, or an `<app-root>` / `<ember-app>` element — or that loads a script recognisable as the application's own bundle. A shell with some other mount id whose only script is a plain `type=\"module\"` file is read as a finished document, and is reported as missing the description and canonical its framework writes at runtime. A shell that ships a placeholder title (`<title>My App</title>`) is graded on that title rather than reported as having none.",
  "**A component demo page graded as an indexed page.** A standalone HTML file whose job is to demonstrate one component — this repository's own `recipes/*/html-css.html` files are the example — carries a real `<head>`, so it is graded as a self-contained document. The missing description, missing canonical and short-title warnings reported against it are true of the file and beside the point for a page no crawler will ever fetch. Read findings on demo, style-guide and sandbox files as facts about those files.",
  "**A relative canonical in a framework file.** `canonical-not-absolute` is claimed only for a self-contained document, where the `href` in the file is the `href` that ships. A framework route writes half of one: Next.js's `metadata.alternates.canonical` is resolved against `metadataBase`, Astro's against `site`, and the same relative string that would be a defect in a plain HTML file is the documented, correct form there — hardcoding an absolute URL per route instead breaks every preview deployment. So a genuinely absolute-less canonical in a framework file is not reported, and the base it resolves against is not checked either.",
  "**A second `<h1>` in a different component of the same module.** `multiple-h1` and `heading-order-skipped` count per rendered page, and in a `.tsx`/`.ts` module that means per top-level component — a story file with one `<h1>` per story, an `errors.tsx` holding `NotFound` and `ServerError`, or a page beside its `ErrorBoundary` is not a page with three H1s, because only one of those components is ever on screen. The cost is the other direction: if a route really does render two components from one module into one page, the second `<h1>` is not reported. Two `<h1>`s inside a single component still are, as does everything in a `.vue`, `.svelte`, `.astro` or `.html` file, which hold one page each.",
  "**A Next.js `app/robots.ts` or `app/sitemap.ts`.** Both are read, counted in the file total and never parsed: `robots-blocks-everything` and `robots-blocks-ai-crawlers` parse the robots.txt *format*, and only a file actually named `robots.txt` is passed to that parser. A project whose `app/robots.ts` returns `disallow: \"/\"` therefore reports zero robots findings — and because `llms-txt-absent` is gated on having read a real robots.txt, that goes quiet too. On an App Router project, read the generator by eye.",
  "**Project-scope metadata claims, on any project that also contains one plain HTML file.** `title-missing`, `meta-description-missing` and `canonical-missing` are claimed across a directory only when *no* self-contained document was scanned, so that one defect is never reported twice at two scopes. The consequence is blunt: an ordinary `public/404.html` or `public/maintenance.html` anywhere in the tree switches the whole project-level block off, and a Nuxt or Remix project that declares no description anywhere then reports nothing. Reproduced on two otherwise identical projects. The miss is accepted; being silent about it was not.",
  "**Whether the content deserves to rank.** Nothing here reads the writing: this checks that a description exists and is roughly the right length, never that it is worth clicking, answers the question, or says anything a reader wanted. `audit_ux_copy` grades the prose, and `get_design_doc(\"on-page-seo\")` covers the judgement.",
];

/**
 * The SEO and GEO audit for one snippet or a whole project, in both registers.
 *
 * Directory mode is the useful one: `seoConfigRules` needs robots.txt, llms.txt
 * and the whole file list to say anything, and a single component cannot prove
 * its own metadata absent — see the module header.
 */
export function seoReport(input: { source?: string; filename?: string; root?: string }): AuditReport {
  const findings: Array<LintFinding & { file?: string }> = [];
  let scanned: string;

  if (input.root) {
    const scan = scanProject(input.root, SEO_EXTENSIONS, SEO_FILENAMES);
    const files = scan.files.map((f) => ({ path: f.path, source: f.source }));

    // The path rides along as a field. The report folds it into the prose; a
    // caller reading `structuredContent` gets it without parsing a sentence.
    for (const f of files) {
      findings.push(...seoRules(f.source, f.path).map((x) => ({ ...x, file: f.path })));
    }

    /**
     * The one wiring that cannot be done anywhere else. `seoConfigRules`
     * demotes every absence claim to an unconfirmed note when the scan stopped
     * early, and this is the only place the scan's own caps meet the rules. Drop
     * the flag and the demotion never runs: a capped scan then reports "no file
     * read here declares a canonical" as a warning, about files it never opened.
     * That is this package's forbidden claim in its plainest form.
     */
    const truncated = scan.hitFileCap || scan.hitByteCap;
    findings.push(...seoConfigRules(files, { truncated }));

    scanned = `Scanned ${scan.files.length} files under \`${input.root}\`.`;
    if (scan.hitFileCap) scanned += ` Stopped at the ${MAX_FILES}-file cap — results are partial, and every absence claim below is unconfirmed.`;
    if (scan.hitByteCap) scanned += ` Stopped at the total-bytes cap — results are partial, and every absence claim below is unconfirmed.`;
    if (scan.skippedLarge.length) scanned += ` Skipped ${scan.skippedLarge.length} oversized file(s).`;
  } else {
    findings.push(...seoRules(input.source ?? "", input.filename));
    scanned = "Scanned one snippet. robots.txt, llms.txt, sitemap and project-wide metadata rules need a directory — pass `path` for those.";
  }

  return assembleAuditReport({
    heading: "SEO & GEO audit",
    scanned,
    findings,
    preamble: "This audit reads local files only — it makes no request to your site and renders nothing. It cannot see:",
    notVisible: SEO_NOT_VISIBLE,
    closing: "A clean result here means the files that were read declare nothing wrong. It is not a statement about how the page is crawled, indexed, ranked or experienced — check those where they actually happen.",
    file: input.root ? undefined : input.filename,
  });
}
