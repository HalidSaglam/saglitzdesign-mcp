// Detects the defaults that generated interfaces reach for.
//
// The governing rule, and the reason this module is small: only facts become
// rules. "`from-indigo-500 to-purple-600` is present" is a fact about the
// source. "The palette is timid" is a judgement, and belongs to
// design_review_checklist, which is honest about being one.
//
// A false positive costs more here than in the security auditor. A developer
// told their deliberate indigo brand is "AI slop" has no external authority to
// check that against — there is no spec to appeal to — so they stop reading the
// output entirely. Every negative test in this module's suite is load-bearing.
//
// `uniform-card-grid` was cut after a review built real inputs and ran them:
// three nav links, three consistent buttons, three identical dashboard KPI
// tiles, a three-tier pricing table — every one fired, because "N siblings
// share a class string" is true of both a broken feature grid and a working
// design system. Nothing in the source text says which one a given case is;
// telling them apart needs to know what the elements *mean* (interchangeable
// UI atoms vs. distinct content that wants hierarchy), and that is a
// judgement, not a fact — it belongs in design_review_checklist with a human
// looking at the render, not in a regex. A rule that can't pass its negative
// test against its own module's ubiquitous, deliberate patterns doesn't earn
// its place; see the task report for the two rejected alternatives.

import { type LintFinding, type Tag, type AuditReport, type AuditStructured, auditStructuredFrom, renderNotVisibleSection } from "./lint.js";
import { scanTags, maskComments, elementSpan, flattenTags, findAttr, attrValueText } from "./scan.js";
import { scanProject, MAX_FILES } from "./project.js";

const lineOf = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

/**
 * The classes this element carries.
 *
 * `\b` matched inside `data-class` and inside another attribute's *value*, so
 * `<div data-example='class="from-indigo-500 to-purple-600"'>` and
 * `<div data-class="from-indigo-500 to-purple-600">` both drew
 * `ai-default-gradient` — a rule firing on markup that declares no classes at
 * all. The name is now found where a name can appear, through the shared
 * reader in scan.ts.
 *
 * `class` is read even when it is bound (`:class`, `v-bind:class`, Angular's
 * `[class]`) — deliberately unlike every other attribute this codebase reads
 * through `findAttr`. A bound `alt` or `width` is unreadable because the
 * *value the browser ends up with* is unknown, and claiming it absent would
 * be a claim about something not in the file. A bound `class` is different in
 * kind: Vue's array (`:class="['a','b']"`), string (`:class="'a b'"`) and
 * object (`:class="{'a': cond}"`) syntaxes, and Angular's `[class]`
 * equivalent, all write the class names themselves as literal text in the
 * file — `attrValueText` reads that text the same way it reads a plain
 * `class="…"`, and every rule below matches literal substrings, so array
 * brackets, quotes and object-key colons riding along are inert punctuation
 * to them. A binding that holds only an identifier (`:class="theme"`) still
 * returns literal text — just text ("theme") that matches no rule, which is
 * harmless and needs no special handling.
 *
 * `className` is not given the same treatment: JSX has no equivalent bound
 * syntax (`className={expr}` is a plain attribute whose value happens to be
 * an expression, not a `findAttr`-recognised binding prefix), so this never
 * meaningfully applies to it.
 */
const classesOf = (tag: Tag): string => {
  for (const name of ["class", "className"]) {
    const at = findAttr(tag.attrs, name);
    if (!at) continue;
    if (at.bound && name !== "class") continue;
    const value = attrValueText(tag.attrs, at);
    if (value !== null) return value;
  }
  return "";
};

// Tailwind's indigo / violet / purple ramps sit adjacent on its scale, so the
// stock gradient is two neighbours from the same region.
//
// Task 1 established two things that shape this. First, v4 authors the palette
// in **OKLCH**, and its docs give hex only as "the nearest hex value" — so a
// hex list can never be more than a convenience match for hand-written CSS,
// and the class-name match is the reliable one. Second, v4 renamed the
// direction utility from `bg-gradient-to-*` to `bg-linear-to-*`; keying on the
// `from-`/`via-`/`to-` stops rather than the direction class means both
// versions are covered without caring which is in use.
//
// Verify these values against tailwindcss.com before changing them; the
// palette moved once already — the list below carries both the v3 hexes
// (`#6366f1` etc., still common in projects that haven't upgraded) and the
// v4 "nearest hex" values Task 1 pulled from the current docs
// (`#615fff` indigo-500, `#4f39f6` indigo-600, `#8e51ff` violet-500,
// `#ad46ff` purple-500, `#9810fa` purple-600).
const DEFAULT_HEXES = /#(6366f1|818cf8|a5b4fc|8b5cf6|7c3aed|a78bfa|a855f7|c084fc|9333ea|d946ef|615fff|4f39f6|8e51ff|ad46ff|9810fa)/i;

// The same region expressed in OKLCH, which is how v4 actually ships it: high
// chroma at a hue angle in the blue-violet band. Matched loosely on the hue
// angle, because the exact triples differ per shade and a project writing its
// own OKLCH is not necessarily copying Tailwind's.
//
// **Both lightness forms.** CSS allows the first component as a number or a
// percentage, and this pattern accepted only the number — so the rule could
// not match the values its own cited document tabulates. A fetch of
// tailwindcss.com/docs/colors while writing this counted 572 percentage-form
// `oklch()` values against 4 in decimal form: the percentage is what the page
// publishes and what its copy button hands you. `indigo-500` is
// `oklch(58.5% 0.233 277.117)` there and in ai-default-aesthetic's own table,
// and neither was matchable. Accepting only the form the docs do not use is an
// overclaim, not a narrow rule.
const DEFAULT_OKLCH = /oklch\(\s*(?:0?\.\d+|\d{1,3}(?:\.\d+)?%)\s+0?\.[12]\d*\s+(2[6-9]\d|3[0-1]\d)(?:\.\d+)?\s*\)/i;

// `blue` and `sky` are not the core region — they sit one step cooler on
// Tailwind's own ramp order (…cyan, sky, blue, indigo, violet, purple,
// fuchsia…) — but ai-default-aesthetic.md measures `blue-500 → purple-600`
// as one of its three named recurring pairs (42.5° hue, 6.5pt lightness), and
// visual-craft-standards.md separately names "cyan/purple gradients" and "the
// stock purple-to-blue" as its own slop tell. A rule that cites either
// document and cannot see that pair is wrong in a way a plain miss is not.
//
// The two constants below stay narrow on purpose: `blue`/`sky` only ever
// count as a stop when paired with a stop from CORE_RAMPS. Two blues alone,
// or blue reaching only to `cyan` (two steps out, never measured in either
// doc), stay silent — this is not "add blue to the region", it's "an edge of
// the core region can reach one step into its cooler neighbour".
const CORE_RAMPS = new Set(["indigo", "violet", "purple", "fuchsia"]);
const GRADIENT_STOP_RE = /\b(?:from|via|to)-((indigo|violet|purple|fuchsia|blue|sky)-\d{3})/g;

// Bounds a hex/OKLCH match to the argument list of one `linear-/radial-/
// conic-gradient(...)` call, one level of nested parens deep (enough for a
// colour function like `oklch(...)`/`rgb(...)` inside the gradient, without
// needing a real parser). Two default-region colours that are not both stops
// of the *same* gradient are not a gradient built from the stock pair — an
// unrelated badge colour and an unrelated hover colour elsewhere in the file
// do not make a teal-to-lime gradient a false one. Group 1 is the function
// name plus its opening paren, so a match's offset can be recovered as
// `match.index + match[1].length + <offset within group 2>`.
const GRADIENT_FN_RE = /((?:linear|radial|conic)-gradient\()((?:[^()]|\([^()]*\))*)\)/gi;

// Inter is on typography-craft's reflex-reject list, which is why this rule
// exists — NOT because a component system ships it as a default. Task 1
// verified that shadcn/ui's documentation names no typeface at all, and that
// its stock theme carries no accent hue (`--primary: oklch(0.205 0 0)`). Do not
// write a message that attributes these faces to any system.
const DEFAULT_FAMILIES = /\b(Inter|Roboto|Open Sans|DM Sans|Plus Jakarta Sans)\b/i;
// Same set, `g`-flagged, for the one call site that strips every default
// family out of a declared list rather than testing for one. Kept as a
// second constant instead of adding `g` to DEFAULT_FAMILIES itself: a global
// regex carries `lastIndex` state across calls, and DEFAULT_FAMILIES is also
// used with `.test()`/`.exec()` below — reusing one global instance for both
// would make those calls order-dependent and intermittently wrong.
const DEFAULT_FAMILIES_G = /\b(Inter|Roboto|Open Sans|DM Sans|Plus Jakarta Sans)\b/gi;

// The **whole** declared value, commas and quotes included, split into
// entries at the call site.
//
// The shape this had until a review ran mixed stacks through it captured
// either one fully-quoted name or an unquoted run that stopped dead at the
// first quote — so every list pairing an unquoted default with a quoted
// display face was truncated to its first entry. `font-family: Inter, 'Söhne
// Breit', sans-serif` was read as the single family `Inter`, and the rule then
// told a developer who had *already* paired Inter with a display face that
// Inter was "the only declared family". Reading a quoted segment as one unit
// rather than as a stopping point is what keeps the rest of the list.
//
// `<` and `>` are excluded from every branch, which bounds an over-read to
// within a single tag: a capture can never cross a tag boundary and start
// reading the next element's markup as families. It does **not** stop the
// capture at the end of the attribute it started in, and an earlier version of
// this comment wrongly claimed it did. Inside one
// `<h1 style="font-family:Inter, sans-serif" class="text-5xl">`, the
// `"[^"<>]*"` branch happily pairs the `style` attribute's closing quote with
// `class`'s opening quote and captures `Inter, sans-serif" class="text-5xl`.
// Recognising that residue is `NOT_A_FONT_NAME`'s job, below, not this
// pattern's.
const FONT_FAMILY_RE = /font-family\s*:\s*((?:[^;}"'<>]|"[^"<>]*"|'[^'<>]*')+)/gi;

// Characters no font family name can contain, in any script. An entry carrying
// one is not a face — it is something else that rode along inside the captured
// declaration, and it must be dropped rather than counted as a family someone
// chose.
//
// Three shapes reach here, and all three made the rule go silent on inputs it
// had correctly flagged before the capture was widened:
//
//   `=` `<` `>`   attribute residue from the over-read described above:
//                 `sans-serif" class="text-5xl`
//   `!`           `font-family: Inter, sans-serif !important`
//   `/*` `{` `}`  a trailing CSS comment the masker leaves alone in an `.html`
//                 file: `sans-serif /* fallback */`
//
// Each of them attaches to the *last* entry, which is normally the generic
// keyword `FALLBACK_FAMILY_RE` recognises — and that test is whole-entry
// equality, so `sans-serif !important` is not `sans-serif`, reads as a chosen
// face, and suppresses the finding. Dropping is safe in the direction that
// matters: a name a designer actually picked never contains any of these, so
// nothing real is discarded, and an entry that survives still has to clear
// `FALLBACK_FAMILY_RE` on its own merits.
const NOT_A_FONT_NAME = /[=<>{}!]|\/\*/;

// An entry that is not a face anyone chose: the CSS generic families, the
// CSS-wide keywords, and the system fallbacks every stack ends with. Anchored
// to the whole entry, so a real face whose name merely starts with one of
// these words (`Helvetica Compressed` is not `Helvetica`) still counts.
//
// Script-agnostic by construction, and that is the point of it. The test this
// replaced asked whether anything matching `[A-Z][A-Za-z0-9 ]{2,}` survived
// stripping the defaults — Latin-only — so `font-family: Inter, メイリオ,
// sans-serif` reported Inter as the only declared family, and any CJK,
// Cyrillic, Greek or Arabic face was invisible. Here, anything left over after
// the defaults and this list is a family, whatever alphabet it is written in.
const FALLBACK_FAMILY_RE =
  /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|math|emoji|fangsong|-apple-system|blinkmacsystemfont|segoe ui|helvetica|helvetica neue|arial|inherit|initial|unset|revert|revert-layer)$/i;

/** Emoji that stand in for an icon. Not an exhaustive emoji set — these six. */
const ICON_EMOJI = /[\u{1F680}\u{1F4A1}\u{2728}\u{26A1}\u{1F525}\u{1F3AF}]/u;

// Release notes are a deliberate, widespread convention for exactly this
// pattern ("v2.4.0 🚀 Faster builds", "✨ New in this release") — a version
// string or one of the stock changelog phrases in the same heading is enough
// to treat the emoji as decoration on a known genre rather than an icon
// standing in for one.
const CHANGELOG_HEADING = /\bv?\d+\.\d+(?:\.\d+)?\b|\b(new in this release|release notes|changelog|what'?s new|patch notes)\b/i;

const BRAND_PATH = /(landing|marketing|\(marketing\)|home|hero|www)/i;
const CTA_COPY = /(get started|start free|try .{0,24}free|book a demo|request a demo|sign up free)/i;

/**
 * Inter is the right answer in a dense dashboard and the wrong one on a landing
 * page, so the font rule needs to know which it is looking at. Two signals: the
 * path, and an `<h1>` beside call-to-action copy.
 *
 * When neither fires this returns false and the rule stays silent. Warning a
 * dashboard about its font is precisely the false positive that gets the whole
 * report ignored, so ambiguity resolves toward silence.
 */
export function isBrandSurface(code: string, filename?: string): boolean {
  if (filename && BRAND_PATH.test(filename)) return true;
  return /<h1[\s>]/i.test(code) && CTA_COPY.test(code);
}

export function genericVisualRules(code: string, filename?: string): LintFinding[] {
  const masked = maskComments(code, filename ?? "snippet.html");
  const out: LintFinding[] = [];
  const push = (
    index: number,
    severity: LintFinding["severity"],
    rule: string,
    message: string,
    fix: string,
    doc: string,
  ) => out.push({ line: lineOf(code, index), severity, rule, message, fix, doc });

  const tags = scanTags(masked);

  // ── gradient ───────────────────────────────────────────────────────────────
  // Two different stops from the default region, not one — a single
  // `bg-indigo-500` is a colour choice, not the stock gradient. Scoped to one
  // element's class list, not the whole document: two elements that each
  // carry a lone `from-`/`to-` utility are not necessarily one gradient.
  let gradientFired = false;
  for (const tag of tags) {
    if (gradientFired) break;
    const cls = classesOf(tag);
    if (!cls) continue;
    const stops = [...cls.matchAll(GRADIENT_STOP_RE)];
    const distinctStops = new Map<string, string>(stops.map((m) => [m[1], m[2]]));
    if (distinctStops.size < 2) continue;
    const hasCoreStop = [...distinctStops.values()].some((ramp) => CORE_RAMPS.has(ramp));
    if (!hasCoreStop) continue;
    push(tag.index, "warning", "ai-default-gradient",
      `Gradient built from Tailwind's stock indigo/violet/purple region (${[...distinctStops.keys()].join(" → ")}).`,
      `Pick stops from your own palette, or drop the gradient — see ai-default-aesthetic for why this pair recurs.`,
      "ai-default-aesthetic");
    gradientFired = true;
  }
  if (!gradientFired) {
    // No blue/sky counterpart here, deliberately. Hex/OKLCH colours carry no
    // from-/via-/to- structure to anchor a same-element pairing to, so this
    // branch is bounded to one gradient(...) call's own argument list instead
    // (see GRADIENT_FN_RE) — two default-region colours have to be stops of
    // the *same* gradient, not merely present somewhere in the file. Widening
    // that bound further with a second hue band would reopen exactly the gap
    // the bound exists to close: an unrelated blue link colour and an
    // unrelated purple badge, nowhere near each other or any gradient, both
    // sitting in one file. Left unmatched rather than approximated.
    let gm: RegExpExecArray | null;
    GRADIENT_FN_RE.lastIndex = 0;
    while ((gm = GRADIENT_FN_RE.exec(masked)) !== null) {
      const args = gm[2];
      const hexes = [...args.matchAll(new RegExp(DEFAULT_HEXES.source, "gi"))];
      const oklch = [...args.matchAll(new RegExp(DEFAULT_OKLCH.source, "gi"))];
      const distinct = new Set([...hexes, ...oklch].map((m) => m[0].toLowerCase()));
      if (distinct.size >= 2) {
        const first = hexes[0] ?? oklch[0];
        const at = gm.index + gm[1].length + first!.index!;
        push(at, "warning", "ai-default-gradient",
          `Gradient built from two stops in the stock indigo/violet/purple region.`,
          `Pick stops from your own palette, or drop the gradient.`,
          "ai-default-aesthetic");
        break;
      }
    }
  }

  // ── typeface ───────────────────────────────────────────────────────────────
  // Every entry of every font-family declaration in the file, split on commas
  // and unquoted. The rule fires only when a default family is declared and
  // nothing else is — one entry that is neither a default nor a fallback
  // keyword is a face someone picked, and this rule has nothing to say about
  // a page that picked one.
  const entries = [...masked.matchAll(FONT_FAMILY_RE)]
    .flatMap((m) => m[1]!.split(","))
    .map((e) => e.trim().replace(/^["']|["']$/g, "").trim())
    .filter((e) => e !== "" && !NOT_A_FONT_NAME.test(e));
  // "This entry *is* a default family", not "contains one of their names":
  // `Inter Tight` is a different face from `Inter`, so it counts as a choice.
  const isDefaultFamily = (e: string) =>
    DEFAULT_FAMILIES.test(e) && e.replace(DEFAULT_FAMILIES_G, "").trim() === "";
  const defaultsDeclared = [...new Set(entries.filter(isDefaultFamily))];
  const otherFamilies = entries.filter((e) => !isDefaultFamily(e) && !FALLBACK_FAMILY_RE.test(e));
  if (defaultsDeclared.length > 0 && otherFamilies.length === 0 && isBrandSurface(code, filename)) {
    const at = masked.search(DEFAULT_FAMILIES);
    // The message states the fact the firing condition actually proves, which
    // is set-shaped: *every* family declared here is a default UI sans or a
    // system fallback. It deliberately does not say which face was chosen,
    // because nothing here can tell — position cannot, since `Inter, 'Söhne
    // Breit'` has to stay silent, so the first entry is not the choice.
    //
    // Naming one was wrong in a way that showed. On the plain system stack
    // (`system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial,
    // sans-serif`) the only entry that is not a fallback keyword is `Roboto`,
    // so the finding read "Roboto is the only declared family" about a stack
    // in which Roboto is the Android fallback leg and nobody's decision. The
    // finding itself was right — a brand page set entirely in the system stack
    // has made no typographic decision, which is what this rule is named after
    // — and only the attribution was false. That the rule cannot *identify* a
    // face never required the message to *name* one.
    push(at < 0 ? 0 : at, "warning", "default-ui-font",
      `Every family declared on what looks like a brand surface is a default UI sans (${defaultsDeclared.join(", ")}) or a system fallback.`,
      `Pair them with a display face that carries the brand, or replace them — typography-craft lists the faces to reach past.`,
      "typography-craft");
  }

  // ── tags ───────────────────────────────────────────────────────────────────
  let chromeCount = 0;
  let eyebrowRuns = 0;
  // Index just past the closing tag of the most recent tracked-uppercase
  // element, or null. Not a boolean — see the adjacency test at the heading
  // branch below for why the offset is the whole point.
  let lastEyebrowEnd: number | null = null;

  for (const tag of tags) {
    const cls = classesOf(tag);
    const name = tag.name.toLowerCase();

    if (/^h[1-6]$/.test(name)) {
      // The heading's whole visible string, read the way the copy rules read
      // one: `elementSpan` for the content, `flattenTags` to drop nested
      // markup without moving anything.
      //
      // Truncating at the first child element instead — which is what
      // `masked.indexOf("<", …)` did — split the changelog exception down the
      // middle, keeping the emoji and losing the version string that excuses
      // it. `<h2>🚀 v2.4.0 — Faster builds</h2>` was silent, and
      // `<h2>🚀 <code>v2.4.0</code> — Faster builds</h2>` fired, though a
      // linked or code-wrapped version is the normal shape of a changelog
      // heading. It cut the other way too: `<h2><span>🚀</span> Fast</h2>` put
      // the emoji outside the truncated body and went silent on a real
      // instance of the pattern.
      const span = elementSpan(masked, tag);
      const body = span ? flattenTags(masked.slice(span[0], span[1])) : "";
      if (ICON_EMOJI.test(body) && !CHANGELOG_HEADING.test(body)) {
        push(tag.index, "warning", "emoji-as-icon",
          `An emoji is standing in for an icon in a heading.`,
          `Use a real icon from one icon family at one weight — see iconography.`,
          "iconography");
      }
      // The same proof the hero/subhead pass uses further down this file: an
      // eyebrow *introduces* a heading only when nothing at all sits between
      // the two in the raw source. Anything that could — a closing wrapper, a
      // sibling section's opening tag, an `<img>`, the `<input>` a form label
      // actually belongs to — starts with `<`, so "the gap contains no `<`"
      // rules the alternatives out rather than merely making them unlikely.
      //
      // `lastWasEyebrow` was a sticky boolean cleared only by the next
      // heading, which asserted the relationship without ever checking it:
      // any tracked-uppercase element anywhere before a heading counted as
      // introducing it. A settings form using the standard Tailwind
      // field-label recipe — where the labels *follow* their headings — fired
      // the finding, and so did a data table using the standard `<th>` recipe.
      //
      // Read from `code`, not `masked`, for the reason given at the
      // hero/subhead pass: `maskComments` blanks a section-boundary comment's
      // delimiters along with its contents, erasing the very `<` this test
      // exists to find.
      if (lastEyebrowEnd !== null && !code.slice(lastEyebrowEnd, tag.index).includes("<")) {
        eyebrowRuns += 1;
      }
      lastEyebrowEnd = null;
    }

    if (/\btext-xs\b/.test(cls) && /\buppercase\b/.test(cls) && /\btracking-(wide|wider|widest)\b/.test(cls)) {
      const span = elementSpan(masked, tag);
      // `elementSpan` reports `masked.length` when it never found a closing
      // tag; an element that does not close cannot be proven adjacent to
      // anything, so it is not an eyebrow for this rule's purposes.
      lastEyebrowEnd = span && span[1] < masked.length ? closingTagEnd(masked, span[1]) : null;
    }

    if (cls) {
      if (/\brounded-2xl\b/.test(cls) && /\bshadow-(lg|xl)\b/.test(cls) && /\bborder\b/.test(cls)) chromeCount += 1;
      // Scoped to the same stock region as ai-default-gradient, not any
      // two-stop gradient: visual-craft-standards.md names "cyan/purple
      // gradients" and "the stock purple-to-blue" as its own gradient-text
      // slop tell, so a deliberate teal-to-lime metric — outside that region
      // — is not the pattern either document is describing.
      if (/\bbg-clip-text\b/.test(cls) && /\btext-transparent\b/.test(cls)) {
        const textStops = [...cls.matchAll(GRADIENT_STOP_RE)];
        const textDistinct = new Map<string, string>(textStops.map((m) => [m[1], m[2]]));
        const textHasCore = [...textDistinct.values()].some((ramp) => CORE_RAMPS.has(ramp));
        if (textDistinct.size >= 2 && textHasCore) {
          push(tag.index, "info", "gradient-text",
            `Gradient-filled text in the stock indigo/violet/purple region.`,
            `Let the type carry weight on its own; reserve gradient fills for a mark, if at all.`,
            "visual-craft-standards");
        }
      }
      if (/\bbackdrop-blur\b/.test(cls) && /\bbg-white\/(5|10)\b/.test(cls) && /\bborder-white\/10\b/.test(cls)) {
        push(tag.index, "info", "stock-glass-on-dark",
          `The stock glassmorphism recipe: backdrop-blur with white/10 fill and border.`,
          `If the surface needs depth, get it from your elevation scale — see visual-craft-standards.`,
          "visual-craft-standards");
      }
    }
  }

  if (chromeCount >= 3) {
    push(0, "info", "stock-card-chrome",
      `The rounded-2xl + shadow-lg + border triad repeats on ${chromeCount} elements.`,
      `Pick one of the three to carry the separation — see ai-default-aesthetic. If this is a design-system doc page enumerating the recipe at several sizes on purpose, ignore this finding.`,
      "ai-default-aesthetic");
  }
  if (eyebrowRuns >= 3) {
    push(0, "info", "eyebrow-over-every-heading",
      `${eyebrowRuns} headings are each introduced by a small uppercase label.`,
      `Keep the eyebrow where it earns its place; a label on every section is chrome, not structure.`,
      // ai-default-aesthetic, not visual-craft-standards. The latter was cited
      // here and does not contain the claim — it has no mention of eyebrows,
      // kickers, tracked uppercase or small section labels anywhere. "A
      // tracked-uppercase eyebrow above every section without exception" is
      // named in ai-default-aesthetic's list of structural companions to the
      // stock phrases, which is where this rule's fact comes from.
      "ai-default-aesthetic");
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

// ── copy ─────────────────────────────────────────────────────────────────────
//
// The governing rule at the top of this file applies harder here than to any
// visual rule above it. A phrase list *feels* objective and is not: "Transform
// your workflow" is stock, "Transform any CSV into a chart" is a product
// description that happens to share a verb. Every rule below matches a
// **construction** — a fixed multi-word collocation, or a *count* of an
// otherwise-ordinary word — never a bare keyword. A bare keyword is exactly
// what turns a changelog entry ("Effortlessly resume interrupted uploads") or
// a documentation page quoting bad copy as an example of what not to write
// into a false positive, and this module's whole premise is that a false
// positive here costs more than a miss.

// Fixed, multi-word collocations. A phrase this specific is a fact worth
// acting on the first time it appears — unlike a single filler adverb below,
// nothing but a landing-page opener reaches for "unlock the power of".
//
// `supercharge` needed more than a companion word to earn its place here.
// "Supercharge is our new CI caching layer" and "…chip can supercharge video
// exports" are both already excluded by requiring your/our/the to follow —
// but "Supercharge Your Local Dev Loop With Bun" still has "Your" right
// after it, and that's a blog title, not hype: the object is a specific,
// named thing ("Local Dev Loop", qualified further by "With Bun"), not the
// stock construction's short, sentence-final, generic noun ("workflow",
// "business"). The trailing lookahead is that distinction as a fact about
// the source: the object is exactly one word, and nothing but sentence-
// ending punctuation, a tag boundary (2+ blanked-tag spaces), or the end of
// the document follows it. "Supercharge your workflow" ends there;
// "Supercharge Your Local Dev Loop…" has a second word ("Dev") right after
// the first, so the lookahead never finds a boundary and the match fails.
const HYPE_OPENER_RE =
  /\b(elevate your|unlock the power of|supercharge (?:your|our|the) \w+(?=[.!?]|\s{2,}|$)|transform your|take your[^\n.!?]{0,60}?to the next level|say goodbye to)\b/gi;

// Single common adverbs, not distinctive phrases — "effortlessly" alone is as
// likely in a changelog entry as in marketing copy, so one hit anywhere is
// not a fact worth a finding on its own. The stock construction *stacks* two
// or more of these in the same span ("Seamlessly integrate with your
// effortlessly modern stack"); that co-occurrence, not the word, is what
// FILLER_THRESHOLD measures below.
const FILLER_ADVERB_RE =
  /\b(seamlessly|effortlessly|revolutionary|game-changing|cutting-edge|best-in-class|next-generation)\b/gi;
const FILLER_THRESHOLD = 2;

const STOCK_CTA = new Set(["get started", "learn more", "sign up", "read more", "contact us"]);
const CTA_TAG_NAMES = new Set(["a", "button"]);

// A page's own copy shouldn't be read out of markup that never ships as
// prose. script/style are code, full stop. code/pre are the harder case this
// module has to get right: a documentation page quoting bad marketing copy
// as an example of what not to write puts that exact phrase in a <code> or
// <pre> element on purpose. Their *content*, not just their tags, is blanked
// below before any phrase is matched — a nested <code> inside a <p> would
// otherwise leak its quoted text into the paragraph's own scan.
const SKIP_CONTENT_TAGS = new Set(["script", "style", "code", "pre"]);

// Leaf-ish elements worth reading as one span of prose for the filler-adverb
// count. Deliberately not "the whole document" — scanning at this
// granularity is what keeps two adjacent <li> items, each with one filler
// word, from being read as a single sentence carrying two.
const TEXT_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote",
  "dd", "dt", "figcaption", "td", "th", "caption", "summary", "label",
  "a", "button",
]);

// Literal double quotes and curly single/double quotes, plus the HTML
// entities a CMS or markdown pipeline routinely typesets them as instead of
// the raw character — `&ldquo;`/`&rdquo;` and the numeric/hex forms are
// common output of "smart quotes" rendering, and `&quot;` shows up on either
// side since it's directionless. `flattenTags` never touches entity text (it
// isn't inside a `<...>` tag), so these survive into `flat` exactly as
// written — but a literal-character-only check can't see them, which is
// what let a documentation page typeset through a CMS fire this module's own
// "don't flag copy quoted as an example" case in the first place.
//
// Deliberately excludes the bare straight apostrophe `'`. It was in both
// sets originally, and a straight apostrophe is also how every ordinary
// contraction is written — "Don't miss out — unlock the power of your data,
// it's free" has two of them either side of a real hype phrase, which was
// enough to satisfy "quote before, quote after" and suppress a genuine
// finding on this rule's highest-severity copy check. The curly `’`
// (U+2019) is ambiguous the same way in properly typeset prose, but nothing
// here has reported that as a live false suppression, so it stays; the
// straight apostrophe's failure mode is demonstrated, so it goes.
const QUOTE_OPEN_RE = /["“‘]|&(?:ldquo|lsquo|quot|#0*8220|#0*8216|#x0*201[cC]);/;
const QUOTE_CLOSE_RE = /["”’]|&(?:rdquo|rsquo|quot|#0*8221|#0*8217|#x0*201[dD]);/;

/**
 * Same line, a quote marker before the match and another after it — the
 * fact a documentation page quoting bad copy as an example leaves behind,
 * whether the quote is set with straight marks, curly marks, or an HTML
 * entity. Deliberately loose ("a quote marker anywhere earlier on the line,
 * another anywhere later"), not "the match is wrapped tightly": the quoted
 * span is usually the surrounding sentence, longer than the fixed phrase the
 * regex actually hit. This trades a rare miss (an h1 that uses quotation
 * marks as a stylistic flourish around real hype copy) for not flagging a
 * docs page for describing what to avoid — the direction every rule in this
 * module has erred.
 */
function isQuoted(text: string, start: number, end: number): boolean {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nlAfter = text.indexOf("\n", end);
  const lineEnd = nlAfter === -1 ? text.length : nlAfter;
  const before = text.slice(lineStart, start);
  const after = text.slice(end, lineEnd);
  return QUOTE_OPEN_RE.test(before) && QUOTE_CLOSE_RE.test(after);
}

/**
 * Blanks the *content* of script/style/code/pre elements to spaces (real
 * newlines kept, so line numbers downstream stay correct) without touching
 * the rest of the source. Length-preserving, same convention as
 * `maskComments`.
 */
function blankSkippedContent(masked: string, tags: Tag[]): string {
  const chars = [...masked];
  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    if (tag.selfClosing || !SKIP_CONTENT_TAGS.has(name)) continue;
    const closeIdx = masked.toLowerCase().indexOf(`</${name}`, tag.end);
    const end = closeIdx === -1 ? masked.length : closeIdx;
    for (let i = tag.end; i < end; i++) {
      if (chars[i] !== "\n") chars[i] = " ";
    }
  }
  return chars.join("");
}

// `flattenTags` and `elementSpan` moved to scan.ts — imported above, shared
// now with security.ts and (soon) the SEO/performance auditors.

/** Index just past an element's own closing tag's `>` — `contentEnd` is `elementSpan`'s `end`. */
function closingTagEnd(masked: string, contentEnd: number): number {
  const gt = masked.indexOf(">", contentEnd);
  return gt === -1 ? contentEnd : gt + 1;
}

export function genericCopyRules(code: string, filename?: string): LintFinding[] {
  const masked = maskComments(code, filename ?? "snippet.html");
  const out: LintFinding[] = [];
  const push = (
    index: number,
    severity: LintFinding["severity"],
    rule: string,
    message: string,
    fix: string,
    doc: string,
  ) => out.push({ line: lineOf(code, index), severity, rule, message, fix, doc });

  const tags = scanTags(masked);
  // Skip-tag content blanked first, then every remaining tag's own markup —
  // `flat` is the only string any rule below reads visible text from.
  const flat = flattenTags(blankSkippedContent(masked, tags));

  // ── hype-opener ──────────────────────────────────────────────────────────
  for (const m of flat.matchAll(HYPE_OPENER_RE)) {
    const start = m.index!;
    const end = start + m[0].length;
    if (isQuoted(flat, start, end)) continue;
    push(start, "warning", "hype-opener",
      `"${m[0]}" is a stock landing-page opener.`,
      `Say what the product actually does instead — see ux-writing for what to reach for.`,
      "ux-writing");
  }

  // ── filler-adverb ────────────────────────────────────────────────────────
  // Scored per element, not per document: two adjacent list items that each
  // use one filler word are two ordinary sentences, not the stacked
  // construction ("seamlessly … effortlessly …") this rule exists to name.
  //
  // Collected once per element, with each hit's absolute offset in `flat`
  // kept alongside it, so the hero/subhead pass below can combine two
  // elements' hits without re-deriving positions. `closeEnd` — the index
  // just past this element's own closing tag — is what lets that pass prove
  // true adjacency without a parent-tracking tree (see below).
  const textHits: { tag: Tag; start: number; closeEnd: number; hits: { text: string; at: number }[] }[] = [];
  for (const tag of tags) {
    if (!TEXT_TAGS.has(tag.name.toLowerCase())) continue;
    const span = elementSpan(masked, tag);
    if (!span) continue;
    const [start, end] = span;
    const hits = [...flat.slice(start, end).matchAll(FILLER_ADVERB_RE)]
      .map((h) => ({ text: h[0], at: start + h.index! }));
    textHits.push({ tag, start, closeEnd: closingTagEnd(masked, end), hits });
  }

  const reportFiller = (pushAt: number, hits: { text: string; at: number }[]) => {
    const first = hits[0]!;
    if (isQuoted(flat, first.at, first.at + first.text.length)) return;
    const distinct = [...new Set(hits.map((h) => h.text.toLowerCase()))];
    push(pushAt, "info", "filler-adverb",
      `${distinct.length} filler adverbs in one span (${distinct.join(", ")}).`,
      `Cut them and say the specific thing that's true — see ux-writing.`,
      "ux-writing");
  };

  for (const entry of textHits) {
    if (entry.hits.length >= FILLER_THRESHOLD) reportFiller(entry.start, entry.hits);
  }

  // Hero + subhead: a heading immediately followed by a paragraph, each
  // carrying one filler adverb, is the same stacked construction split
  // across two elements ("Seamlessly manage your team" / "Built for
  // cutting-edge teams who move fast."). This scanner has no DOM tree, so it
  // cannot ask "same parent" directly — but true textual adjacency proves it
  // anyway: in well-formed markup, the only way anything can sit between a
  // heading's closing tag and the next paragraph's opening tag is *some*
  // tag — closing a wrapper, opening a sibling section, an <img>, an empty
  // <div> — and every one of those starts with `<`. "The raw source between
  // the two is whitespace only, not even one `<`" is a fact that rules out a
  // heading and paragraph landing in different containers, not merely a
  // proxy for it.
  //
  // Two corrections on top of that base check, both found by a reviewer
  // asked to defeat the reasoning rather than confirm the three cases it was
  // first tested against:
  //
  // 1. The gap must be read from `code` (the original, unmasked source),
  //    not `masked`. `maskComments` blanks a comment's delimiters along with
  //    its contents — for good reason everywhere else in this module, a
  //    phrase inside a comment must never count as copy — but that means a
  //    section-boundary comment (`<!-- End Hero --><!-- Begin Features
  //    -->`) disappears into whitespace *before* this check ever runs,
  //    exactly the `<` this check exists to find. `code` still has it.
  //    Content-matching (`flat`, built from `masked`) is untouched, so a
  //    phrase actually written inside a comment still never fires anything.
  //
  // 2. The search for "the next element" must skip any `textHits` entry
  //    still *inside* the heading's own span — an anchored-permalink
  //    heading's own `<a>` (`<h1><a href="#">Title</a></h1>`) is in
  //    TEXT_TAGS too, so it became its own entry sitting between the
  //    heading and the real next paragraph in array order, and a naive
  //    `textHits[i]`/`textHits[i+1]` comparison never got past it. Skipping
  //    every entry whose own tag starts before the heading's closing tag —
  //    checkable from the scanner's offsets alone, nesting implies
  //    started-before-parent-closed — reaches the real next element without
  //    needing a tree, and an entry that starts *after* the heading closes
  //    is guaranteed to be a sibling or later, never a description of "how
  //    many things are nested inside the heading."
  for (let i = 0; i < textHits.length; i++) {
    const heading = textHits[i]!;
    if (!/^h[1-6]$/.test(heading.tag.name.toLowerCase())) continue;
    let j = i + 1;
    while (j < textHits.length && textHits[j]!.tag.index < heading.closeEnd) j++;
    if (j >= textHits.length) continue;
    const next = textHits[j]!;
    if (next.tag.name.toLowerCase() !== "p") continue;
    const gap = code.slice(heading.closeEnd, next.tag.index);
    if (gap.trim() !== "") continue;
    if (heading.hits.length >= FILLER_THRESHOLD || next.hits.length >= FILLER_THRESHOLD) continue;
    const combined = [...heading.hits, ...next.hits];
    if (combined.length < FILLER_THRESHOLD) continue;
    reportFiller(heading.start, combined);
  }

  // ── generic-cta ──────────────────────────────────────────────────────────
  // "Every CTA is stock" needs at least two labels to say anything — a page
  // with a single "Learn More" link (a footer, a card, a nav item) hasn't
  // shown that it never made a specific choice, only that it has one
  // ordinary, common link. This mirrors ai-default-gradient's own "two
  // stops, not one" bound above.
  const ctas: { text: string; index: number }[] = [];
  for (const tag of tags) {
    if (!CTA_TAG_NAMES.has(tag.name.toLowerCase())) continue;
    const span = elementSpan(masked, tag);
    if (!span) continue;
    const [start, end] = span;
    const text = flat.slice(start, end).replace(/\s+/g, " ").trim();
    if (!text) continue;
    ctas.push({ text, index: start });
  }
  if (ctas.length >= 2) {
    const normalize = (s: string) => s.replace(/[^\p{L}\p{N} ]+$/gu, "").trim().toLowerCase();
    if (ctas.every((c) => STOCK_CTA.has(normalize(c.text)))) {
      push(ctas[0]!.index, "info", "generic-cta",
        `Every call to action on the page is drawn from the stock set (${ctas.map((c) => c.text).join(", ")}).`,
        `Name the actual action — "Start a 14-day trial", not "Get Started" — see ux-writing.`,
        "ux-writing");
    }
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

// ── score ────────────────────────────────────────────────────────────────────
//
// `uniform-card-grid` was cut in Task 2 and is deliberately absent. It fired on
// any three elements sharing a class string — nav links, footer buttons,
// dashboard KPI tiles, pricing tiers — and a grid/flex-parent gate would not
// have saved it, because those tiles genuinely do sit in a grid. Separating
// "cards that need hierarchy" from "components that should be consistent" is a
// judgement about what the elements mean, not a fact about the source, so it
// falls outside this module's governing rule. Ten rules, not eleven.
export const RULE_WEIGHTS: Record<string, number> = {
  "ai-default-gradient": 20,
  "default-ui-font": 15,
  "emoji-as-icon": 12,
  "hype-opener": 10,
  "stock-card-chrome": 8,
  "gradient-text": 7,
  "eyebrow-over-every-heading": 6,
  "stock-glass-on-dark": 6,
  "filler-adverb": 5,
  "generic-cta": 3,
};

// Every key here must be a rule id some rule function above can emit, and
// every rule id emitted above must be a key here — tested in both directions
// in generic.test.ts. A weight for a rule that no longer exists scores
// nothing and reads as coverage; a rule with no weight scores zero and reads
// as clean. Both pass a naive suite that only checks one direction.
//
// These ten weights currently sum to 92 — headroom the 100-cap in
// `genericScore` exists for. Adding an eleventh rule can push the sum past
// 100; when it does, `total` clamps but `rawTotal` (see below) still carries
// the true, uncapped sum, so the itemised list and the headline number never
// silently disagree.

/**
 * Scores a page's findings by *distinct signal*, not by occurrence: a page
 * with forty cards sharing the stock chrome recipe is not more generic than
 * one with three, and weighting each occurrence would let page length —
 * nothing to do with genericness — drive the number. Each rule id present in
 * `findings` contributes its `RULE_WEIGHTS` entry exactly once; `count`
 * records how many times it actually fired, for display, but never multiplies
 * the score.
 *
 * `total` is `rawTotal` clamped to 100 — a safety bound for future rules.
 * Today's ten weights sum to 92, so the clamp never actually engages and
 * `total === rawTotal === items.reduce((n, i) => n + i.weight, 0)`.
 *
 * If a future rule ever pushes the unclamped sum past 100, `total` stops
 * equalling the itemised sum — clamping is exactly what breaks that equality.
 * Scaling each item's weight down to fit would restore the equality, but at
 * the cost of every item's own point: `item.weight` is the reason a reader
 * can accept or dismiss one specific finding on its stated, documented
 * weight, and a rescaled fraction stops being that. `rawTotal` is the other
 * way to reconcile the two — items keep their real, citable weights, and
 * `rawTotal` states outright what they add up to before the display clamp,
 * so nothing is silently lost the way it would be if `total` just disagreed
 * with the parts and left the reader to wonder why.
 */
export function genericScore(
  findings: LintFinding[],
): { total: number; rawTotal: number; items: Array<{ rule: string; weight: number; count: number }> } {
  const counts = new Map<string, number>();
  for (const f of findings) {
    // A rule id with no entry in RULE_WEIGHTS scores nothing rather than
    // throwing — the two-way test is what keeps that silent gap from
    // actually happening, not a runtime guess about what it should be worth.
    if (!(f.rule in RULE_WEIGHTS)) continue;
    counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([rule, count]) => ({ rule, weight: RULE_WEIGHTS[rule]!, count }))
    .sort((a, b) => b.weight - a.weight || a.rule.localeCompare(b.rule));

  const rawTotal = items.reduce((n, i) => n + i.weight, 0);
  const total = Math.min(100, rawTotal);
  return { total, rawTotal, items };
}

// ── report ───────────────────────────────────────────────────────────────────

export const GENERIC_PREAMBLE =
  `Every rule above matches a fact about the source — a class name, a phrase, a
repeated structure. It cannot see, and does not attempt to judge:`;

/**
 * What `audit_generic_design` structurally cannot see, one entry per bullet
 * in the "Not visible to this audit" section it renders — split out of a
 * single prose template literal into `GENERIC_PREAMBLE` / `GENERIC_NOT_VISIBLE`
 * / `GENERIC_CLOSING` so the same array can be rendered as markdown and
 * returned as `structuredContent`, the way `design_lint` and `audit_security`
 * already do. The text of every entry is unchanged by the split.
 */
export const GENERIC_NOT_VISIBLE: string[] = [
  `**Whether a default was chosen deliberately.** A brand whose colour
  genuinely is indigo will be flagged; the finding names a fact, not a
  mistake. Confirm the choice before treating a flag as a defect.`,
  `**Anything about rendered output.** Spacing rhythm, optical alignment, how
  the page actually feels — none of that is visible from source text.`,
  `**Whether the writing is good.** This detects stock phrases, not weak ones;
  a hand-written sentence that happens to avoid the phrase list is not
  praised for it, and a good sentence that happens to use one is still
  flagged.`,
  `**Copy in any language but English.** Every phrase, adverb and call-to-action
  label the copy rules match is English. A generated page in Turkish, German,
  Japanese or any other language is read by the visual rules alone and scores
  strictly lower for it — the same page in two languages measured 74 and 92
  here, and the 18-point difference was the translation, not the design. Do
  not compare scores across languages.`,
  `**A stock gradient assembled through a CSS custom property.**
  \`linear-gradient(135deg, var(--brand-a), var(--brand-b))\` is silent even when
  those properties are defined as the stock pair a few lines above; resolving
  it needs real value substitution, which this scanner does not do. Written
  literally, or as Tailwind \`from-\`/\`to-\` utilities, the same gradient is
  found.`,
  `**Judgement of any kind.** Whether the result is *good design* is not this
  tool's question — \`design_review_checklist\` and \`get_design_doc("design-critique-scoring")\`
  own that, with a human looking at the render.`,
  `**Class names outside Tailwind's default scale.** The visual rules match
  literal utility strings from that scale, so a project written with arbitrary
  values, a custom scale, or another framework's class names is audited less
  thoroughly than the score implies. A low score on such a project reflects
  coverage, not necessarily restraint.`,
  `**Story, test and fixture files, in directory mode.** Paths matching
  \`*.stories.*\`, \`*.story.*\`, \`*.spec.*\`, \`*.test.*\`, \`__fixtures__/\` and
  \`__mocks__/\` are not read. A story file's job is to show every variant with
  placeholder labels, so scoring it reports the demonstration rather than the
  product — but it does mean a default that exists *only* in a story is not
  reported either. The scanned line above says how many were skipped.`,
  `**The typeface rule off a recognised brand surface.** It evaluates only where
  the surface reads as a brand page — a marketing route, or a heading beside a
  conventional call to action — so a landing page at an unconventional path
  with distinctive call-to-action copy is not assessed for it.`,
];

export const GENERIC_CLOSING =
  `A clean result here means the source carries none of these specific,
recurring defaults — not that the design is good.`;

/**
 * Paths whose whole job is demonstrating or exercising a component rather than
 * shipping a surface. Directory mode only — a caller who pastes a story file
 * in as a snippet asked about that file.
 *
 * A `.stories.tsx` exists to show every variant at once, which means
 * placeholder labels ("Get Started", "Learn More"), the recipe under audit
 * rendered deliberately, and no page around any of it. A review found a
 * bespoke project scored 31/100 with every one of those points coming from a
 * single `Button.stories.tsx`, and `generic-cta` announcing that "every call
 * to action on the page is drawn from the stock set" where there was no page.
 * `__fixtures__/` and `__mocks__/` are the same thing with a different name:
 * the bad input a test asserts against.
 *
 * This is a fact about the path, not a judgement about the file, which is why
 * it sits inside the module's governing rule rather than being special-cased
 * inside any one of the ten. It is disclosed in `GENERIC_NOT_VISIBLE` and
 * counted in the report's scanned line, so a skip is never silent.
 */
// The extension is left open rather than listed. `scanProject` reads `.vue`,
// `.svelte` and `.astro` alongside `.jsx`/`.tsx`, so a `[jt]sx?` tail let
// `Button.stories.svelte` and `Card.spec.vue` reproduce the whole defect this
// constant exists to close; and a `.stories.` / `.spec.` segment identifies the
// file's job whatever it is written in, including the `.html` and `.css` this
// scanner also reads.
const NOT_A_SHIPPED_SURFACE =
  /(?:^|[\\/])(?:__fixtures__|__mocks__)[\\/]|\.(?:stories|story|spec|test)\.[a-z0-9]+$/i;

/**
 * The structured half of `audit_generic_design`, on top of what every
 * structured auditor already carries: the score `genericScore` computes,
 * itemised the same way the markdown prints it, so a caller reading only
 * `structured.score` never sees a total its `items` don't add up to.
 */
export interface GenericStructured extends AuditStructured {
  score: { total: number; items: Array<{ weight: number; rule: string; evidence: string }> };
}

/**
 * Reports the generic-default findings for one snippet or a whole project,
 * mirroring `securityReport`'s shape: what was scanned, the score itemised
 * (never a bare number — see `genericScore`), findings grouped by severity
 * with `file:line`, then what this audit structurally cannot see. Returns
 * both registers — markdown for a person, `structured` for a machine — built
 * from the same findings and the same score, so neither can drift from what
 * the other says.
 */
export function genericReport(input: { source?: string; filename?: string; root?: string }): AuditReport & { structured: GenericStructured } {
  const lines: string[] = ["# Generic-design audit", ""];
  let findings: Array<LintFinding & { file?: string }> = [];
  let scanned: string;

  // Directory mode only: how many of the scanned files each rule was found
  // in at least once. `genericScore` folds every file's findings into one
  // flat list before it ever sees them, on purpose — a project-wide score
  // treats "distinct signal" the same way a single-page score does, one
  // point per rule regardless of how many files or lines carry it. That is
  // right for the *number*, but it means two files each carrying the same
  // gradient score identically to one file carrying it twice, and the
  // headline total cannot tell those apart. `filesByRule` is not part of the
  // score or the total — neither changes here — it is displayed alongside
  // each itemised line so the reader gets the breadth the number itself
  // cannot carry.
  let filesByRule: Map<string, Set<string>> | null = null;
  let filesScanned = 0;

  if (input.root) {
    const scan = scanProject(input.root);
    const audited = scan.files.filter((f) => !NOT_A_SHIPPED_SURFACE.test(f.path));
    const demoSkipped = scan.files.length - audited.length;
    filesByRule = new Map();
    filesScanned = audited.length;
    for (const f of audited) {
      const fileFindings = [...genericVisualRules(f.source, f.path), ...genericCopyRules(f.source, f.path)];
      for (const finding of fileFindings) {
        if (!filesByRule.has(finding.rule)) filesByRule.set(finding.rule, new Set());
        filesByRule.get(finding.rule)!.add(f.path);
      }
      findings.push(...fileFindings.map((x) => ({ ...x, file: f.path, message: `${f.path}: ${x.message}` })));
    }
    scanned = `Scanned ${audited.length} files under \`${input.root}\`.`;
    if (demoSkipped) {
      scanned += ` Skipped ${demoSkipped} story, test or fixture file(s), which demonstrate components rather than ship a surface.`;
    }
    if (scan.hitFileCap) scanned += ` Stopped at the ${MAX_FILES}-file cap — results are partial.`;
    if (scan.hitByteCap) scanned += ` Stopped at the total-bytes cap — results are partial.`;
    if (scan.skippedLarge.length) scanned += ` Skipped ${scan.skippedLarge.length} oversized file(s).`;
  } else {
    const code = input.source ?? "";
    findings = [...genericVisualRules(code, input.filename), ...genericCopyRules(code, input.filename)];
    scanned = "Scanned one snippet.";
  }

  const { total, rawTotal, items } = genericScore(findings);

  lines.push(scanned, "");
  lines.push(`**Score: ${total} / 100** — the count of distinct AI-default signals found; each rule counts once no matter how many times it repeats.`, "");
  if (items.length) {
    for (const item of items) {
      const seen = item.count > 1 ? ` (seen ${item.count}×, scored once)` : "";
      const breadth = filesByRule ? ` — found in ${filesByRule.get(item.rule)?.size ?? 0} of ${filesScanned} files` : "";
      lines.push(`- **${item.rule}** +${item.weight}${seen}${breadth}`);
    }
    if (rawTotal > total) {
      lines.push(`- _The itemised points above sum to ${rawTotal}; the score display is capped at 100._`);
    }
  } else {
    lines.push("No AI-default signals found in what was read.");
  }
  lines.push("");

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

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
        lines.push(`- **${f.rule}** (line ${f.line}) — ${f.message}`);
        lines.push(`  - Fix: ${f.fix}`);
        if (f.doc) lines.push(`  - Read: \`get_design_doc("${f.doc}")\``);
      }
      lines.push("");
    }
  }

  lines.push(...renderNotVisibleSection(GENERIC_PREAMBLE, GENERIC_NOT_VISIBLE, GENERIC_CLOSING));

  const base = auditStructuredFrom({ findings, notVisible: GENERIC_NOT_VISIBLE, file: input.filename });

  // The score itemised exactly as the markdown loop above printed it —
  // `items` is the very array that loop read from, not a second walk over
  // `findings` that could count or weigh things differently. `evidence` names
  // the fact that earned the rule its points and where it sits, read off one
  // of that rule's own findings: the same message and line a reader chasing
  // the rule down to the Errors/Warnings/Notes section above would land on.
  const score: GenericStructured["score"] = {
    total,
    items: items.map((item) => {
      const example = findings.find((f) => f.rule === item.rule);
      return {
        weight: item.weight,
        rule: item.rule,
        evidence: example ? `${example.message} (line ${example.line})` : "",
      };
    }),
  };

  return { text: lines.join("\n"), structured: { ...base, score } };
}
