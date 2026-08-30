// Deterministic design linter for HTML / CSS / JSX / Tailwind snippets.
// Detects the anti-patterns the craft docs warn about: hardcoded values,
// missing focus/alt/labels, killed outlines, div-soup, px fonts.
//
// Two rule families, because the target languages need different treatment:
//   • LINE rules  — CSS-ish declarations that live on one line.
//   • SOURCE rules — markup that Prettier routinely spreads over many lines
//     (`<img\n  src=…\n  alt=…\n/>`). These scan the whole snippet with a tag
//     scanner and map the match offset back to a line number, so formatting
//     never decides whether a finding fires.
// Not a full parser — a fast, high-signal design-time check.

import { scanTags, findAttr, hasAttr, hasSpread, type Tag } from "./scan.js";

export interface LintFinding {
  line: number;
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  fix: string;
  doc?: string;
}

/**
 * One finding as an MCP client receives it in `structuredContent`.
 *
 * A `LintFinding` is what a rule produces; this is what leaves the process, and
 * the two differ in exactly two ways. `file` is lifted out of the message — the
 * prose report folds the path in ("`app/page.tsx`: …") because a human reads
 * one line, and an agent chaining audit → fix needs it as a field. And `doc` is
 * required rather than optional: every rule in `seo.ts` and `perf.ts` cites a
 * document, and both suites fail if one does not.
 */
export interface AuditFinding {
  rule: string;
  severity: LintFinding["severity"];
  message: string;
  fix: string;
  doc: string;
  file?: string;
  line?: number;
}

/**
 * The structured half of an audit, declared as an `outputSchema` and returned
 * as `structuredContent` beside the markdown.
 *
 * `notVisible` is the load-bearing member and it is deliberately an array of
 * strings rather than a paragraph of prose. What an audit did *not* check is as
 * consequential to the agent acting on it as what it did: a caller that treats
 * silence as a clean bill will ship the defect this tool never looked for. The
 * same array is rendered as the report's "Not visible to this audit" section,
 * so the two can never drift apart.
 */
export interface AuditStructured {
  findings: AuditFinding[];
  summary: { error: number; warning: number; info: number };
  notVisible: string[];
}

/** A report in both registers: markdown for a person, structure for a machine. */
export interface AuditReport {
  text: string;
  structured: AuditStructured;
}

interface LineRule {
  id: string;
  severity: LintFinding["severity"];
  // `offset` is this line's own start position in `full` — handed down by
  // designLint's iteration (see `linesWithOffsets`), not re-derived by the
  // rule. A rule that instead searched for its own line via `full.indexOf
  // (line)` would find the *first* byte-identical line in the snippet: two
  // rules with the same declaration text on different lines (ordinary in
  // real CSS — see `overflow-hidden-root`'s history) would both resolve to
  // the first one's position. Most rules never need a real position and
  // ignore this parameter entirely.
  test: (line: string, full: string, offset: number) => boolean;
  message: string;
  fix: string;
  doc?: string;
}

// ── tag scanner ──────────────────────────────────────────────────────────────
//
// The scanner and the attribute readers live in `scan.ts`, which is where every
// module that parses markup gets them. They are re-exported here because
// several modules have imported them from `./lint.js` since before that shared
// home existed.

export { scanTags, hasAttr, hasSpread };
export type { Tag };

function lineOf(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === "\n") line++;
  return line;
}

/** Inner text of an element, with nested tags and JSX expressions removed. */
function innerText(src: string, tag: Tag): string {
  if (tag.selfClosing) return "";
  const close = src.toLowerCase().indexOf(`</${tag.name.toLowerCase()}`, tag.end);
  const inner = src.slice(tag.end, close === -1 ? src.length : close);
  return inner
    .replace(/<[^>]*>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Does the snippet provide a visible focus indicator anywhere? `outline: none`
 * is only a defect when nothing replaces it — checking the whole snippet
 * (rather than the same line) is what makes that judgement correct.
 */
/**
 * True when this `outline: none` sits in a rule that deliberately excludes
 * keyboard focus — `:focus:not(:focus-visible)`, or the `not-focus-visible:`
 * variant. The selector is whatever precedes the enclosing `{`.
 */
function isPointerFocusException(src: string, index: number): boolean {
  const open = src.lastIndexOf("{", index);
  if (open === -1) {
    // No block: a utility class list. Only the explicit negated variant counts.
    return /not-focus-visible:outline-none/.test(src.slice(Math.max(0, index - 40), index + 40));
  }
  const prevClose = Math.max(src.lastIndexOf("}", open), src.lastIndexOf(";", open));
  const selector = src.slice(prevClose + 1, open);
  return /:not\(\s*:focus-visible\s*\)/.test(selector);
}

function hasFocusReplacement(src: string): boolean {
  // NOTE: the "not none" guards must sit directly after the colon. Written as
  // `outline\s*:\s*(?!none)` the `\s*` backtracks to zero width and the
  // lookahead passes on " none" — which would silently disable this rule.
  const cssRule = /:focus(-visible)?\b[^{}]*\{[^}]*?(outline\s*:(?!\s*(?:none|0\b))|box-shadow\s*:(?!\s*none)|border(-color)?\s*:(?!\s*none)|--ring)/i;
  // `focus:outline-none` is the removal, not the replacement — exclude it.
  const tailwind = /focus(-visible)?:(ring|outline|shadow|border)(?!-none\b|-0\b)(-|\b)/i;
  return cssRule.test(src) || tailwind.test(src);
}

// ── grid track helpers ───────────────────────────────────────────────────────
//
// `grid-track-no-min` needs to tell a genuinely bare `1fr` apart from one
// already wrapped in `minmax(<not-auto>, 1fr)`: CSS Grid 1 §7.2.1 takes a
// track out of the automatic-minimum mechanic entirely once it carries an
// explicit, non-`auto` minimum, whatever that minimum's value — `minmax(0,
// 1fr)`, `minmax(200px, 1fr)` and `minmax(min(18rem, 100%), 1fr)` are all
// guarded; only `minmax(auto, 1fr)` (spec-equivalent to bare) and an
// unwrapped `1fr` are not. A regex can't find where a `minmax(...)` call
// ends when its own first argument nests parentheses — `min(18rem, 100%)`
// would close a naive `[^)]*` on its own inner `)` — so this walks the
// string counting paren depth instead of matching one.

/** Splits `s` on top-level commas only; a comma inside a nested `(...)` does not count. */
function topLevelSplit(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

/**
 * True if `line` contains at least one `minmax(...)` call whose first
 * argument is not the literal `auto` — an explicit minimum of any value,
 * which guards the whole track regardless of what that value is. The whole
 * *line* is what this reports on, not the individual track: a line with one
 * guarded track and one genuinely bare one (`minmax(0, 1fr) 1fr`) still
 * returns true, and `grid-track-no-min` stays silent on the bare track too.
 * That is a known, disclosed false negative — see `LINT_NOT_VISIBLE` — kept
 * because parsing the track list into individual tracks is a full grammar
 * this linter does not implement.
 *
 * Both the function name and the `auto` keyword are matched case-
 * insensitively on purpose, unlike everything else on this rule's path
 * (the property name, `1fr`, and the `<img>` gate are all case-sensitive,
 * which is a *disclosed silence* — see `LINT_NOT_VISIBLE`). That is a
 * deliberate asymmetry, not an oversight: CSS function and keyword names
 * are themselves case-insensitive by spec, so `MINMAX(200px, 1fr)` and
 * `minmax(200px, 1fr)` mean the same thing, and grading them differently
 * would be a *false positive* the first time this rule met real-world caps
 * — which is exactly what shipped before this comment was written:
 * `/minmax\s*\(/` with no `i` flag failed to recognise `MINMAX(200px,
 * 1fr)` as guarded at all, so a correctly-floored track written in caps
 * was reported as bare. A silence from case (a rule that should fire and
 * doesn't) is disclosed elsewhere in this file; a rule crying wolf because
 * of case is a defect, and this is the fix for it. Matching `auto` the same
 * way keeps the two checks inside this one function agreeing with each
 * other: recognising `MINMAX(` case-insensitively while still comparing its
 * argument to the lowercase literal `"auto"` would silence `MINMAX(AUTO,
 * 1fr)` — a track exactly as unguarded as a bare one — as if it were
 * genuinely floored.
 */
function hasExplicitMinmaxFloor(line: string): boolean {
  const open = /minmax\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = open.exec(line))) {
    const argStart = m.index + m[0].length;
    let depth = 1;
    let j = argStart;
    while (j < line.length && depth > 0) {
      if (line[j] === "(") depth++;
      else if (line[j] === ")") depth--;
      j++;
    }
    const inner = line.slice(argStart, depth === 0 ? j - 1 : j);
    if (topLevelSplit(inner)[0]?.trim().toLowerCase() !== "auto") return true;
    open.lastIndex = j;
  }
  return false;
}

/**
 * Index just past the `}` that closes the block opened at `openIdx` (which
 * must itself be the index of a `{`), found by depth-counting rather than a
 * naive `indexOf("}")` — a nested block between the two (a media query
 * wrapping the rule, or a nested selector under CSS nesting) would close a
 * naive search on its own inner `}`, misreporting where the outer block
 * actually ends. This is the same technique as `topLevelSplit`'s paren
 * count, one bracket pair over. No comment or string awareness — a brace
 * inside either is read as real, the same disclosed limitation
 * `hasExplicitMinmaxFloor` already carries for `minmax(...)`. Returns
 * `text.length` if the block never closes (truncated/invalid input), so a
 * caller can always safely slice up to the result.
 */
function braceEnd(text: string, openIdx: number): number {
  let depth = 1;
  let i = openIdx + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
    i++;
  }
  return depth === 0 ? i - 1 : text.length;
}

/**
 * The `{` that actually encloses position `from` in `text` — found by
 * scanning backward and tracking brace *balance*, not `text.lastIndexOf("{",
 * from)`. The naive search finds the textually-last `{` before `from`
 * regardless of whether it was already closed by a `}` that also occurs
 * before `from`: for `body { .foo { overflow-x: clip; } overflow-x: hidden;
 * }`, the `{` nearest the `hidden` declaration is `.foo`'s own, and it is
 * already closed by the `}` right after `clip;` — `lastIndexOf` returns it
 * anyway, so a caller reading it as "the enclosing selector's brace" reads
 * `.foo` as the selector for a declaration that is actually `body`'s own,
 * one level up. Scanning backward and counting `}` as balance to spend
 * against each `{` it meets skips exactly the closed pairs and stops at the
 * first genuinely unmatched `{` — the real enclosing block, at any nesting
 * depth. Returns -1 if `from` is not inside any block.
 *
 * No comment or string awareness, same disclosed limitation as `braceEnd`
 * and `hasExplicitMinmaxFloor`: a `}` inside a string or a comment *before*
 * `from` is read as a real, already-spent close, not text the browser never
 * sees. `body { content: "}"; overflow-x: hidden; }` — the `}` inside the
 * quoted string is counted as balance to spend, so the scan treats `body`'s
 * own `{` as already closed and walks straight past it, past the start of
 * `text`, and returns -1: not a misread selector this time, but the whole
 * rule going silent on a `hidden` it should have caught. A `}` inside a CSS
 * comment before `from` does the same. This is the mirror image of the
 * naive-`lastIndexOf` bug this function exists to
 * fix — that one over-trusted an unbalanced brace *after* the true enclosing
 * one; a stray closer hiding in a string or comment *before* `from` defeats
 * the balance count itself, in either scanning direction, and neither is
 * fixed by the other's cure.
 */
function enclosingOpenBrace(text: string, from: number): number {
  let balance = 0;
  for (let i = from - 1; i >= 0; i--) {
    if (text[i] === "}") balance++;
    else if (text[i] === "{") {
      if (balance > 0) balance--;
      else return i;
    }
  }
  return -1;
}

/**
 * `text` with every top-level-relative `{...}` span removed *together with the
 * prelude that introduces it* — depth-tracked, the same technique
 * `topLevelSplit` uses for parens, one bracket pair over.
 * Exists so `overflow-hidden-root`'s override check reads only the *direct*
 * declarations of the block it was handed (as `braceEnd` bounds it), not text
 * that happens to sit inside a differently-scoped nested rule between them —
 * `body { .foo { overflow-x: clip; } overflow-x: hidden; }` has a `clip` in
 * its text, but that `clip` belongs to `.foo`, not to `body`, and must not be
 * read as an override of body's own `hidden`. Without this, a naive
 * substring search over the whole block body would treat any nested
 * selector's declarations as if they were the outer selector's own.
 *
 * The prelude half was a second, separately-demonstrated defect: removing only
 * a nested block's *contents* leaves the text that introduces it sitting at
 * depth 0, and an at-rule's prelude is not a selector — it can contain a
 * literal declaration. `body { overflow-x: hidden; @supports (overflow: clip)
 * { border: 0; } }` left `@supports (overflow: clip)` in the result, the
 * override regex read that feature-query *condition* as a live `clip`
 * declaration, and the finding was cancelled by a block that declares nothing
 * of the kind. A prelude is, by construction, everything between the previous
 * statement boundary and the `{` it opens, so it is dropped here the same way:
 * on meeting a depth-0 `{`, the accumulated text is cut back to the last `;`.
 * That covers a nested *selector* too (`body { overflow-x: hidden;
 * [data-overflow="clip"] { … } }`), which had the same shape and was never
 * separately disclosed.
 */
function stripNestedBlocks(text: string): string {
  let depth = 0;
  let out = "";
  for (const ch of text) {
    if (ch === "{") {
      if (depth === 0) out = out.slice(0, out.lastIndexOf(";") + 1);
      depth++;
      continue;
    }
    if (ch === "}") { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += ch;
  }
  return out;
}

/**
 * The preludes of every block enclosing position `from`, innermost first.
 *
 * A "prelude" is what CSS syntax calls the text introducing a block: a
 * selector for a style rule, a condition for an at-rule. It is everything
 * between the previous statement boundary (`;`, `{` or `}`) and the `{` it
 * opens. Walking outward with `enclosingOpenBrace` — which is balance-tracked,
 * so it skips already-closed siblings — gives the real chain of enclosing
 * blocks at any nesting depth, which is what two rules need:
 * `animates-layout-property` asks "is this declaration inside a `@keyframes`
 * body?" and `overflow-hidden-root` asks "is this declaration inside a
 * `@supports` block that already gated it on `overflow: clip`?". Neither
 * question is answerable from the single line the rule is handed, and both
 * were previously approximated by requiring the at-rule keyword and the
 * declaration to share a physical line — which formatted CSS never does.
 *
 * Inherits `enclosingOpenBrace`'s comment/string blind spot exactly: a brace
 * hiding in a string or a comment ends the walk early or shifts it outward by
 * one level. Bounded at 64 levels so malformed input cannot spin.
 */
function enclosingPreludes(text: string, from: number): string[] {
  const out: string[] = [];
  let pos = from;
  for (let depth = 0; depth < 64; depth++) {
    const open = enclosingOpenBrace(text, pos);
    if (open < 0) break;
    const before = text.slice(0, open);
    const cut = Math.max(before.lastIndexOf("}"), before.lastIndexOf("{"), before.lastIndexOf(";"));
    out.push(before.slice(cut + 1));
    pos = open;
  }
  return out;
}

/**
 * An `overflow: clip` written as a *condition* rather than as a declaration —
 * the payload of a `@supports` prelude, in either polarity.
 *
 * `@supports not (overflow: clip) { … }` and `@supports (overflow: clip) { … }`
 * both contain it; the polarity is deliberately not read, because both
 * polarities mean the same thing for this rule's purposes: an author who wrote
 * either one has demonstrably decided which of `hidden` and `clip` each engine
 * gets, which is the entire question `overflow-hidden-root` exists to ask. What
 * that costs is the contradictory spelling — `@supports (overflow: clip) { body
 * { overflow-x: hidden; } }`, which serves `hidden` precisely to the engines
 * that support `clip` — going silent. That is a real, disclosed false negative,
 * accepted because reading polarity correctly means parsing `not`, `and`, `or`
 * and parentheses, and because nobody writes it.
 */
const CLIP_CONDITION = /overflow(-x|-y)?\s*:\s*clip\b/;

/**
 * A later `@supports` block that upgrades this root to `clip`.
 *
 * The third spelling of the fallback-then-override idiom, and the one a
 * same-block override lookup structurally cannot reach: the unconditional
 * `hidden` ships in the block the rule matched, and the `clip` that replaces it
 * ships in a feature-query block *after* that block closes —
 *
 *   body { overflow-x: hidden; }
 *   @supports (overflow: clip) { body { overflow-x: clip; } }
 *
 * Only text after `from` (the matched block's closing brace) is read, matching
 * the same-block guard's own cascade reasoning: an *earlier* `clip` does not
 * cancel a `hidden` that comes after it, because the later declaration is the
 * one in effect.
 *
 * Deliberately narrower than "any later `clip`": the at-rule has to be a
 * `@supports` whose condition is about `overflow: clip`, and its body has to
 * declare the same property (or the shorthand) as `clip`. Deliberately *not*
 * narrowed further: the selector inside that block is not checked, so a
 * feature query that upgrades `.sidebar` rather than `body` also stands the
 * rule down. Checking it means re-implementing the selector match one nesting
 * level in, for a shape nobody writes — disclosed in `LINT_NOT_VISIBLE`
 * instead.
 */
function supportsClipUpgrade(text: string, from: number, override: RegExp): boolean {
  const re = /@supports\b([^{]*)\{/g;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const open = m.index + m[0].length - 1;
    const end = braceEnd(text, open);
    if (CLIP_CONDITION.test(m[1]) && override.test(text.slice(open, end))) return true;
    re.lastIndex = Math.max(end, re.lastIndex);
  }
  return false;
}

/**
 * Whether this line declares one of the eight layout properties *inside a
 * `@keyframes` body*, wherever the `@keyframes` opener happens to sit.
 *
 * Replaces a single-line regex — `@keyframes[^{]*\{[^}]*(width|…)\s*:` — that
 * required the at-rule keyword, its opening brace and the declaration to share
 * one physical line. No formatted stylesheet writes that, so the whole
 * `@keyframes` half of `animates-layout-property` was unreachable on real
 * input while every one of its fixtures (all collapsed one-liners) passed. The
 * fixtures agreeing with the rule proved only that they shared its blind spot.
 *
 * Reads the enclosing block chain rather than the line, so
 *
 *   @keyframes grow {
 *     from { width: 0; }
 *   }
 *
 * is graded exactly like its collapsed form — and the finding lands on the
 * declaration's own line, which is the line a caller has to change, rather than
 * on the at-rule opener. The `(?<!outline-|--[\w-]*)` lookbehind is carried
 * over unchanged, so `--card-width: 10px` inside a keyframe stays silent for
 * the same reason it does in a `transition`.
 *
 * Still a word match, not a parse: it inherits `enclosingPreludes`'s
 * comment/string blind spot, and a `width:` inside a *string* in a keyframe
 * (`content: "width: 0"`) reads as a declaration.
 */
function layoutDeclInKeyframes(line: string, full: string, offset: number): boolean {
  const re = /\b(?<!outline-|--[\w-]*)(?:width|height|top|left|right|bottom|margin|padding)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (enclosingPreludes(full, offset + m.index).some((p) => /@keyframes\b/.test(p))) return true;
  }
  return false;
}

// ── line rules ───────────────────────────────────────────────────────────────

// Exported (only) so tests/lint.test.ts's doc-resolve guard can iterate the
// rule definitions themselves rather than sweep them up from fired findings.
// A findings-based sweep only catches a new rule's dangling `doc` id if that
// rule's own trigger was also added to the test's fixture — forgetting the
// fixture (a demonstrated real mistake in review) produces total silence.
// Reading `LINE_RULES` directly has no fixture to forget: a new entry here
// is swept in the moment it exists.
export const LINE_RULES: LineRule[] = [
  {
    id: "hardcoded-color",
    severity: "warning",
    // The `(?<!--[\w-]*)` lookbehind is the same shape as
    // `animates-layout-property`'s, and closes the same class in the last of
    // the three rules in this file where it appeared. `\b` treats `-` as a
    // boundary, so the property match fired on any *custom property* whose
    // name merely ends in a watched word: `--border-color: #e5e7eb` inside an
    // `@layer tokens` block — a design token being defined, which is the
    // literal thing this rule's `fix` tells the caller to go and write — was
    // reported as "hardcoded hex instead of a design token" and told to
    // "reference a token". `--brand: #ff0000` was already silent, so the rule
    // fired or not on nothing but whether the token's name happened to end in
    // `color`, `background`, `border`, `fill` or `stroke`. Crying wolf at its
    // own advice gets fixed rather than disclosed — the same ruling
    // `grid-track-no-min`'s `MINMAX()` guard already carries.
    //
    // A real declaration is untouched, because the lookbehind needs a literal
    // `--` immediately before the run of word/hyphen characters: `border-color:
    // #e5e7eb` and `.a { border-color: #fff }` both still fire.
    test: (l) =>
      /(?<!--[\w-]*)(color|background|border|fill|stroke)\s*[:=]\s*["']?#([0-9a-fA-F]{3,8})\b/.test(l) ||
      (/["']#([0-9a-fA-F]{6})["']/.test(l) && /style|className|css/.test(l)),
    message: "Hardcoded hex color instead of a design token.",
    fix: "Reference a token: var(--color-primary) / theme color / a token constant. Generate them with generate_design_tokens.",
    doc: "design-tokens-theming",
  },
  {
    id: "px-font-size",
    severity: "warning",
    test: (l) => /font-size\s*:\s*\d+(\.\d+)?px/.test(l),
    message: "font-size in px ignores the user's browser zoom / text-size setting.",
    fix: "Use rem (or a --text-* token). 16px → 1rem.",
    doc: "accessibility",
  },
  {
    id: "important-overuse",
    severity: "info",
    test: (l) => /!important/.test(l),
    message: "!important usually signals a specificity/architecture problem.",
    fix: "Prefer a token/utility or a more specific selector; reserve !important for true overrides.",
    doc: "design-engineering",
  },
  {
    id: "fixed-height-text",
    severity: "info",
    // `(?<![-\w])` rather than `\b`, for the same reason and by the same
    // reading as `hardcoded-color` above: `\b` treats `-` as a boundary, so a
    // bare `height` match reached `min-height`, `max-height` and any custom
    // property ending in `-height`. `min-height: 44px` is a *floor*; it cannot
    // clip anything, and it is word-for-word what this rule's own `fix` tells
    // the caller to write instead ("Prefer min-height + padding so content can
    // grow"). The rule flagged its own advice, which was disclosed for a
    // while and is fixed here. `max-height` can clip, but not for the reason
    // in the message — it is a ceiling on a box, not a fixed height, and the
    // fix it would be given is the one it already follows.
    //
    // `line-height: 40px` was already suppressed by the `line` half of the
    // suppressor below; it is now excluded by the property match too, so the
    // silence no longer depends on a word that happens to appear in the name.
    test: (l) => /(?<![-\w])height\s*:\s*\d{2,}px/.test(l) && !/(icon|avatar|line|divider|border)/i.test(l),
    message: "Fixed pixel height on a container can clip text when it wraps or scales.",
    fix: "Prefer min-height + padding so content can grow (i18n / Dynamic Type / long copy).",
    doc: "i18n-localization",
  },
  {
    id: "positive-tabindex",
    severity: "warning",
    test: (l) => /tabindex\s*=\s*["']?[1-9]/i.test(l) || /tabIndex=\{?[1-9]/.test(l),
    message: "Positive tabindex disrupts natural focus order.",
    fix: "Use tabindex=0 (focusable, in order) or -1 (programmatic). Fix DOM order instead.",
    doc: "accessibility",
  },
  {
    id: "magic-number-radius",
    severity: "info",
    // Two pixel values are not ad-hoc radii and were the last two false
    // positives a fully-tokenised stylesheet still drew. `border-radius: 0`
    // (and `0px`) is the absence of a radius — there is no "one radius token"
    // to reach for, and the rule's `fix` has nothing to tell it. A value of
    // four figures or more is the pill idiom: `9999px` is not a number anyone
    // chose, it is how "fully round on whatever height this ends up" is
    // spelled in CSS, and it is what `.badge`/`.pill` components are written
    // with everywhere. Both were disclosed as firing; both are the rule crying
    // wolf at correct code, so both are excluded rather than disclosed.
    //
    // The threshold is deliberately blunt — `>= 1000` — because there is no
    // real radius in that range and a sharper number would be a guess. Every
    // value between (`1px` … `999px`) still fires, `9999px` inside a
    // `var()`/`rounded` line was already silent, and non-`px` units are read
    // by neither the old pattern nor this one (`50%`, `0.5rem`).
    //
    // The `(?<!--[\w-]*)` lookbehind is the third and last instance of the
    // class `animates-layout-property` closed and the other two value rules
    // have now closed too: `:root { --border-radius: 8px; }` is a radius
    // *token* being defined — the exact artefact the `fix` sends the caller to
    // create — and it fired only because `\b` treats `-` as a boundary, while
    // the identically-correct `--radius: 8px` was silent. The three rules that
    // share this mechanism now treat it the same way.
    test: (l) => {
      const m = /(?<!--[\w-]*)border-radius\s*:\s*(\d+)px/.exec(l);
      if (!m || /var\(|rounded/.test(l)) return false;
      const px = Number(m[1]);
      return px > 0 && px < 1000;
    },
    message: "Ad-hoc border-radius — mixed radii look accidental.",
    fix: "Use one radius token across the UI (--radius-md). See clean-app-design.",
    doc: "clean-app-design",
  },
  {
    id: "grid-track-no-min",
    severity: "info",
    // CSS Grid Level 1 §7.2.1: a <flex> outside minmax() "implies an automatic
    // minimum (i.e. minmax(auto, <flex>))". That auto minimum is defined (also
    // §7.2.1) as "the largest minimum size (specified by min-width/min-height)
    // of the grid items occupying the grid track", and §6.6 decides when that
    // resolves to the item's content-based minimum rather than zero — the
    // conditions are the item's own overflow, whether the track it spans has
    // an `auto` min sizing function, and whether it spans a flexible track
    // too. None of that is readable from the declaration, which is why this
    // is `info` and why LINT_NOT_VISIBLE says so rather than promising an
    // overflow. `minmax(0, 1fr)` removes the condition entirely at no cost;
    // src/layout.ts already emits that form. Any explicit non-`auto` first
    // argument does the same regardless of its value (`hasExplicitMinmaxFloor`
    // handles `minmax(200px, 1fr)` and a nested `minmax(min(18rem, 100%),
    // 1fr)` alike) — only `minmax(auto, 1fr)`, which is spec-equivalent to a
    // bare track, is deliberately left un-guarded so it still fires.
    test: (l, full) =>
      /grid-template-(columns|rows)\s*:[^;]*(^|[\s,(])1fr/.test(l) &&
      !hasExplicitMinmaxFloor(l) &&
      /<img[\s>]/.test(full),
    message:
      "A bare `1fr` track resolves to `minmax(auto, 1fr)` (CSS Grid 1 §7.2.1); its automatic " +
      "minimum is the largest min-width/min-height of the items in the track, and whether that " +
      "equals the item's content-based minimum is governed by §6.6. An item with a large " +
      "intrinsic size can hold the track above its `fr` share. This snippet renders an image.",
    fix: "Write `minmax(0, 1fr)` for tracks that carry images or other wide intrinsic content.",
    doc: "visual-craft-standards",
  },
  {
    id: "overflow-hidden-root",
    severity: "warning",
    // CSS Overflow Level 3 §3.1: `hidden` keeps the box "still a scroll
    // container" (only the UI is suppressed; programmatic scrolling remains),
    // while `clip` "forbids scrolling entirely … and therefore the box is not a
    // scroll container". §3.1 does not distinguish axes for that status, which
    // is why both `overflow-x` and `overflow-y` are read below — a root that is
    // `hidden` on either axis is a scroll container regardless of the other.
    //
    // Case: both regexes on this rule's path are case-sensitive, deliberately
    // matching the rest of this file's line rules (see the disclosure sentence
    // for the exact count) — `OVERFLOW-X: HIDDEN` and `BODY { … }` are silent
    // where the lowercase forms fire. There is no case-insensitive half here
    // the way `grid-track-no-min`'s `minmax()` guard has one, so there is
    // nothing for `CASE_INSENSITIVE_LINE_RULES` to record.
    //
    // The selector lookup walks `full`, not `l`: the selector is on an earlier
    // line than the declaration whenever the CSS is formatted normally, but it
    // can also be on the *same* line as the declaration (`body { overflow-x:
    // hidden; }`, every fixture below). `abs` — this match's own absolute
    // position in `full` — is `offset` (this line's start, handed down by
    // `designLint`'s iteration; see `linesWithOffsets`) plus `m.index` (the
    // match's position within the line), never searched for by content. An
    // earlier version located it with `full.indexOf(l)`, which resolves to
    // the *first* byte-identical line in the snippet — duplicate declaration
    // lines are ordinary in real CSS, so a second `overflow-x: hidden;` block
    // elsewhere with the same indentation resolved to the first block's
    // position and was graded against the wrong selector and the wrong
    // block's overrides entirely. From `abs`, `enclosingOpenBrace` walks back
    // through `full` the way `statementStart` in src/security.ts does for a
    // differently-shaped lookup.
    //
    // Fallback-then-override: declaring `hidden` and then, later in the same
    // block, the same property again as `clip` — or the bare `overflow`
    // shorthand as `clip`, which resets *both* axes regardless of what a
    // longhand set individually before it — is the standard way to ship
    // `clip` while keeping a fallback for browsers that predate it; it is
    // this rule's own `fix`, so firing on it would be crying wolf at the exact
    // thing it recommends. "Same block" has no guaranteed structure in a
    // snippet, so it is defined the only way that is checkable without a real
    // parser: from the `{` already found for the selector, out to the `}`
    // that balances it (`braceEnd`, depth-counted so a nested block in
    // between — a media query, a nested rule — cannot close it early). A
    // later occurrence of the identical property text (`overflow`,
    // `overflow-x` or `overflow-y`) cancels the finding, and so does a later
    // bare `overflow` shorthand regardless of which of the three this rule
    // matched — `overflow-x: hidden` followed by `overflow: clip` cancels,
    // because the shorthand touches both axes on its way past. The reverse
    // does not cancel: `overflow: hidden` followed only by `overflow-x: clip`
    // still fires, correctly, because `overflow-y` is left `hidden` by the
    // shorthand and the box is still a scroll container on that axis alone.
    // An earlier `clip` *before* the `hidden` this rule matched does not
    // cancel it either — the cascade applies the later declaration, so if
    // `hidden` comes last it really is the one in effect. The override text
    // is also read only at the block's own top level (`stripNestedBlocks`,
    // same depth-tracking idea as `topLevelSplit`'s commas): `body { .foo {
    // overflow-x: clip; } overflow-x: hidden; }` has a `clip` in its text,
    // but that `clip` belongs to the nested `.foo` rule, not to `body`, and
    // must not cancel body's own `hidden` — reading `rest` as raw text
    // without this would have done exactly that. What this does not see:
    // `overflow: hidden` fully neutralised by two later longhands together
    // (`overflow-x: clip; overflow-y: clip;`) is not recognised as an
    // override, because neither longhand's property text is the shorthand
    // that set `hidden`, and only a later *shorthand* is read as overriding a
    // longhand, not the reverse — a disclosed false positive, narrower
    // coverage over parsing the shorthand/longhand interaction properly. Nor
    // does the override check know about comments or strings, the same
    // disclosed limitation `hasExplicitMinmaxFloor` already carries: a
    // commented-out or quoted `overflow-x: clip` reads as a real, live
    // override and wrongly cancels a finding that should fire.
    //
    // The same-block guard above was scoped to one *spelling* of the idiom,
    // and nobody asked what the others were. Both of the two remaining
    // standard spellings gate on a feature query, and the rule fired on both
    // — on code where the author has done the thing this rule's own `fix`
    // asks for, more explicitly than the same-block form does:
    //
    //   @supports not (overflow: clip) { body { overflow-x: hidden; } }
    //   body { overflow-x: hidden; }
    //   @supports (overflow: clip) { body { overflow-x: clip; } }
    //
    // The first has no `clip` declaration anywhere for a same-block lookup to
    // find — the `clip` is a *condition* — so it is answered by reading the
    // enclosing block chain (`enclosingPreludes` + `CLIP_CONDITION`) rather
    // than the block body. The second puts the override outside the matched
    // block entirely and is answered by `supportsClipUpgrade`. Both stand the
    // rule down; both carry their own disclosed limits, on their own comments
    // and in `LINT_NOT_VISIBLE`.
    //
    // `enclosingOpenBrace` itself has a comment/string blind spot on the
    // *other* side of the match, disclosed on its own comment and in
    // `LINT_NOT_VISIBLE`: a `}` inside a string or comment *before* `abs`
    // (`body { content: "}"; overflow-x: hidden; }`) is read as a real,
    // already-spent close and can walk the balance-tracked backward scan
    // past the true enclosing `{`, silencing the rule outright rather than
    // misreading the override.
    test: (l, full, offset) => {
      const m = /overflow(-x|-y)?\s*:\s*hidden/.exec(l);
      if (!m) return false;
      const abs = offset + m.index;
      const open = enclosingOpenBrace(full, abs);
      if (open < 0) return false;
      const sel = full.slice(full.lastIndexOf("}", open) + 1, open);
      if (!/(^|[\s,])(html|body|:root)\s*$/.test(sel.trim().replace(/\s+/g, " "))) return false;
      const property = "overflow" + (m[1] ?? "");
      const overrideProps = property === "overflow" ? property : `(?:${property}|overflow)`;
      const override = new RegExp(`${overrideProps}\\s*:\\s*clip\\b`);
      // Spelling 2 of the fallback idiom: the `hidden` is itself inside a
      // feature query that asks for the *absence* of `clip`.
      if (enclosingPreludes(full, abs).some((p) => /@supports\b/.test(p) && CLIP_CONDITION.test(p))) return false;
      const end = braceEnd(full, open);
      const rest = stripNestedBlocks(full.slice(abs + m[0].length, end));
      if (override.test(rest)) return false;
      // Spelling 3: unconditional `hidden` first, the `clip` upgrade in a
      // later `@supports` block of its own.
      if (supportsClipUpgrade(full, end, override)) return false;
      return true;
    },
    message:
      "`overflow: hidden` on the root still makes it a scroll container — only the " +
      "scrolling UI is suppressed (CSS Overflow 3 §3.1). `overflow: clip` is not a " +
      "scroll container at all.",
    fix: "Use `clip` instead of `hidden` (`overflow`/`overflow-x`/`overflow-y`) on `html`/`body`, and fix the element that actually overflows.",
    // Was `spacing-layout`, which names the *symptom* people reach for
    // `overflow-x: hidden` to hide ("Horizontal page scroll at any
    // breakpoint") and says nothing whatever about `hidden` versus `clip` or
    // about scroll containers — so the substantive source, CSS Overflow 3
    // §3.1, lived only in the comment above, where no caller ever sees it, and
    // the document a caller *was* sent to did not make the rule's claim. The
    // claim now lives in `modern-css-design-primitives`, which is where the
    // rest of the modern-CSS primitives are, and the claim guard in
    // tests/lint.test.ts checks that it stays there.
    doc: "modern-css-design-primitives",
  },
  {
    id: "motion-no-reduced-cover",
    severity: "warning",
    // Two different sources cover two different slices of this rule's
    // reach, and citing only the narrower one overstates it. WCAG 2.1 SC
    // 2.3.3 (Animation from Interactions) is Level AAA and scoped to motion
    // "triggered by interaction": "Motion animation triggered by
    // interaction can be disabled, unless the animation is essential..."
    // This rule's actual trigger is any `animation:`/`animation-name:`/
    // `@keyframes`, autoplaying and non-interactive animations included,
    // which SC 2.3.3 does not reach. Media Queries Level 5 §12.1 is what
    // covers that full scope: it frames `prefers-reduced-motion` as letting
    // a user ask a site to "minimize the amount of non-essential motion",
    // with no interaction restriction and no AAA-only carve-out. So: §12.1
    // is the source for the mechanism and for this rule's actual reach; SC
    // 2.3.3 is cited only as the accessibility rationale for the
    // interaction-triggered subset of that reach, not as coverage for the
    // whole rule.
    //
    // The test does not parse the media query — it only asks whether the
    // literal substring `prefers-reduced-motion` occurs anywhere in the
    // source handed to it. That is deliberately loose rather than a missed
    // opportunity to be precise: every real spelling of the query still
    // contains that substring — extra/no whitespace, an `@media screen and
    // (...)` prefix, and the inverted `not (...: no-preference)` form all
    // read as covered, and each is demonstrated in tests/lint.test.ts. What
    // that looseness costs is disclosed in LINT_NOT_VISIBLE: coverage that
    // lives in a *different* file this call never saw reads as absent here.
    // Tailwind's `motion-reduce:`/`motion-safe:` variants are not read as
    // coverage either, but not because of the looseness — the class list
    // text never spells "prefers-reduced-motion" at all, the compiler emits
    // that later. In practice this rule cannot fire on a Tailwind
    // `animate-*` utility to begin with: its own trigger only recognises the
    // CSS `animation:` property and `@keyframes`, not a class name, so a
    // pure-Tailwind animated element is silent from this rule regardless of
    // whether a `motion-reduce:` variant sits beside it.
    //
    // Fix round 1 found two real defects in the trigger, both fed
    // adversarially rather than assumed safe. First: `animation: none;` — an
    // ordinary reset written outside any motion context — used to fire,
    // because the trigger checked only for the property name, never its
    // value; excluded now by a negative lookahead on a literal `none`
    // value. The lookahead steps over an opening quote (`["']?`) because the
    // exclusion was otherwise defeated by the other spelling of the same
    // reset: `style={{ animation: "none" }}` put a `"` where the lookahead
    // expected `n`, and the exact defect the fix round closed came back in
    // JSX. That is the mechanism this file already knew about — the
    // `fixed-height-text` disclosure says of `style={{ height: "40px" }}` that
    // "the quote is in the way" — applied to a guard rather than to a trigger.
    // `initial`/`unset`/`inherit` also resolve to no animation and
    // are NOT excluded — disclosed in LINT_NOT_VISIBLE rather than chased,
    // since `none` is the form anyone actually writes to reset an
    // animation. Second: the longhand `animation-name: slide;` (with
    // `animation-duration`/others set on separate declarations) was
    // invisible — the trigger matched only the shorthand `animation:` —
    // closed by reading `animation-name` too, since that is the one
    // longhand that actually attaches a `@keyframes` sequence;
    // `animation-duration`/`animation-play-state` alone, with no
    // `animation-name` anywhere, name no real animation and are correctly
    // left unread.
    //
    // Case: both alternatives are case-sensitive, matching every line rule
    // in this file except positive-tabindex — `ANIMATION:`, `@KEYFRAMES` and
    // `PREFERS-REDUCED-MOTION` are each silent where the lowercase form
    // fires or covers.
    test: (l, full) =>
      /(^|[\s;{])animation(-name)?\s*:(?!\s*["']?none\b)|@keyframes\s/.test(l) &&
      !/prefers-reduced-motion/.test(full),
    message:
      "An animation with nothing honouring `prefers-reduced-motion` in the same source.",
    fix: "Add `@media (prefers-reduced-motion: reduce) { … }` reducing or removing the movement — do not remove the feedback entirely.",
    doc: "accessibility",
  },
  {
    id: "animates-layout-property",
    severity: "warning",
    // Sourced to engine rendering documentation, not taste: MDN's "Animation
    // performance and frame rate" guide puts `transform` and `opacity` in
    // the cheap, compositor-only tier ("rendered in their own layer", no
    // repaint, only a style recalculation), while a property that affects an
    // element's geometry or position — its own examples are `left`,
    // `max-width`, `border-width`, `margin-left` — triggers style
    // recalculation, layout AND repaint on every frame. `width`, `height`,
    // `top`, `left`, `right`, `bottom`, `margin` and `padding` are that
    // geometry/position family.
    //
    // Both the shorthand-with-value form (`transition: width …`) and the
    // longhand (`transition-property: width`) are read by the first
    // alternative; the `@keyframes` body form (`layoutDeclInKeyframes`) reads
    // the same eight names so it does not silently cover a narrower set than
    // the transition form — an early draft's keyframes alternative checked
    // only four of the eight and was widened to match, once feeding it a
    // keyframes block that only moved `right`/`bottom`/`margin`/`padding`
    // showed the gap.
    //
    // That widening, and the `--card-width` lookbehind below, were both
    // verified against an input class that does not occur: every `@keyframes`
    // fixture behind them was a collapsed one-liner, because the alternative
    // they were verifying *structurally required* the at-rule keyword, its
    // brace and the declaration to share a physical line. The rule and its
    // fixtures shared one blind spot, so every check agreed with every other
    // check. The keyframes half now walks the enclosing block chain
    // (`enclosingPreludes`) instead of the line, the fixtures are written the
    // way stylesheets are written, and the finding lands on the declaration's
    // own line rather than on the at-rule opener.
    //
    // How far the transition alternative reads, which is not "to the end of
    // the value": `[^;]*` was the original span, written for CSS, where `;`
    // ends a declaration. A JavaScript style object ends it with a comma, so
    // the span ran straight past it into the *next key* and any sibling named
    // `margin`, `padding`, `top`, `left`, `right`, `bottom`, `width` or
    // `height` supplied the word — `{ transition: "opacity 200ms", margin: 0 }`
    // fired on a component that animates nothing but opacity, and React inline
    // styles, emotion object syntax, CVA variant tables and theme objects are
    // all that shape. Closed by bounding the span on the value's own quotes
    // when it has them (`"[^"]*` / `'[^']*`, which cannot cross the closing
    // quote) and excluding quotes from the unquoted span, so real CSS —
    // including a genuine comma-separated transition list, `transition:
    // opacity 200ms, width 200ms` — still fires. `marginTop: 0` was already
    // silent: `\b` after `margin` fails against the `T`.
    //
    // Fix round 1, two real false positives, one lookbehind: `\b` treats
    // `-` as a boundary, so the bare word match used to fire on anything
    // whose name merely *ends* in a watched word. That is two distinct
    // shapes, not one, and both are excluded by the same
    // `(?<!outline-|--[\w-]*)` lookbehind:
    //   - `outline-width` — a real CSS property, but outline never occupies
    //     layout space, so animating its width is paint only. Excluded by
    //     the `outline-` half of the alternation — this is the one-token
    //     fix a real property-name parse was not needed for.
    //   - `--card-width`, `--nav-height`, `--sidebar-margin` — ordinary
    //     custom-property (design-token) names, not layout properties at
    //     all; a custom property carries no rendering behaviour of its own
    //     until something consumes it in `var()`. Excluded by the
    //     `--[\w-]*` half, which matches any run of word/hyphen characters
    //     immediately after a literal `--`, so it reaches `--sidebar-margin`
    //     (the watched word sits after an *earlier* hyphenated segment, not
    //     right after `--`) as well as the bare `--margin` shape. It does
    //     not reach a custom property separated from a real property by a
    //     delimiter it cannot cross: `transition: --foo, width 200ms` still
    //     fires on the real `width`, because `[\w-]*` cannot match through
    //     the comma and space between them.
    // Legitimate compound property names are unaffected by either half:
    // `min-width`, `max-width` and `border-right-width` are single-hyphen
    // and never start `--`, so neither lookbehind alternative applies ahead
    // of them and they still fire, correctly. What the lookbehind does not
    // reach: any *other* real CSS property whose name happens to end in one
    // of the eight watched words without being layout-affecting — none is
    // known today, but the mechanism is still a word match, not a parse, so
    // a future one would not be caught automatically (see LINT_NOT_VISIBLE).
    //
    // Case: all three regexes are case-sensitive, matching the rest of this
    // file — `TRANSITION: WIDTH` and `@KEYFRAMES` are silent.
    test: (l, full, offset) =>
      /transition(-property)?\s*:\s*(?:"[^"]*|'[^']*|[^;'"]*)\b(?<!outline-|--[\w-]*)(?:width|height|top|left|right|bottom|margin|padding)\b/.test(l) ||
      layoutDeclInKeyframes(l, full, offset),
    message:
      "Animating a layout property forces layout and paint each frame; `transform` and `opacity` are composited.",
    fix: "Animate `transform` / `opacity` instead — `translate` for position, `scale` for size.",
    doc: "motion-microinteractions",
  },
  {
    id: "transition-all",
    severity: "info",
    // A superset of animates-layout-property, sourced the same way: naming
    // `all` animates whatever changes on the element, this rule's own eight
    // layout properties included, plus every property that rule's word list
    // does not enumerate. The justification is that consequence, not that
    // the shorthand is inelegant.
    //
    // The Tailwind alternative accepts any chain of variant prefixes
    // (`motion-safe:`, `hover:`, `md:`, chained or not) before the utility,
    // the same idiom `outline-none`'s own Tailwind alternative already
    // carries in this file — fed `motion-safe:transition-all` to check this
    // specifically, because a variant-gated class is exactly the shape a
    // naive quote/whitespace-only boundary misses. It still has to fire:
    // `motion-safe:` only gates *when* the utility applies (skipped for
    // anyone who prefers reduced motion), not *whether* naming `all`
    // animates properties the author did not choose for everyone else.
    //
    // Deliberately NOT exempted: `transition: all` inside a
    // `@media (prefers-reduced-motion: reduce) { … }` block. This is a
    // line rule and reads the declaration the same regardless of the block
    // it sits in — fed that exact nesting to check it does not accidentally
    // suppress the match, and it does not. That is a considered read, not an
    // oversight: the idiomatic reduced-motion kill switch is
    // `transition: none` or a near-zero `transition-duration` (the form
    // src/motion.ts's own reduced-motion snippet uses), not
    // `transition: all <duration>` — a real `transition: all` written inside
    // the block is still naming every property, layout ones included,
    // rather than actually disabling them.
    //
    // Fix round 1: the longhand `transition-property: all;` was invisible —
    // the shorthand alternative only matched `transition:` — for the same
    // reason `animates-layout-property` already reads both the shorthand
    // and the `-property` longhand. Closed by making `-property` optional
    // here too, one token, matching the sibling rule's own handling rather
    // than diverging from it.
    //
    // Known, disclosed rather than fixed (see LINT_NOT_VISIBLE): the
    // shorthand alternative has no notion of a string or a URL, so
    // `content: "transition: all 200ms";` and
    // `background: url(transition:all.png);` both fire on text that never
    // reaches a real declaration — the same family of comment/string
    // blindness already disclosed elsewhere in this file
    // (`hasExplicitMinmaxFloor`, `overflow-hidden-root`'s override guard),
    // just not previously named for this rule. Real string/URL awareness
    // needs more than a word match, which is out of scope for a regex rule.
    //
    // Case: both alternatives are case-sensitive, matching the rest of this
    // file — `TRANSITION: ALL` and `TRANSITION-ALL` are silent.
    test: (l) =>
      /transition(-property)?\s*:\s*all\b/.test(l) ||
      /(?:^|[\s"'`])(?:[a-z][a-z0-9-]*:)*transition-all(?:["'\s]|$)/.test(l),
    message:
      "`transition: all` animates every property that changes, including layout properties you did not intend.",
    fix: "Name the properties: `transition: opacity 200ms ease, transform 200ms ease`.",
    doc: "motion-microinteractions",
  },
];

// ── source (tag-aware) rules ─────────────────────────────────────────────────

const IMAGE_TAGS = new Set(["img", "image"]);
const CLICKABLE_CONTAINERS = new Set(["div", "span", "li", "section"]);
const LABELLED_CONTROLS = new Set(["input", "select", "textarea"]);
const UNLABELLED_INPUT_TYPES = new Set(["hidden", "submit", "button", "image", "reset"]);

/**
 * The doc each source (tag) rule cites, centralised and exported for the same
 * reason `LINE_RULES` is: `tests/lint.test.ts`'s doc-resolve guard reads this
 * directly rather than needing a fixture to fire every rule first. The `push`
 * calls below reference this table instead of repeating the string literal,
 * so there is exactly one place a source rule's doc id can drift from what
 * this table (and the test that walks it) believes it is.
 */
export const SOURCE_RULE_DOCS: Record<string, string> = {
  "img-no-alt": "accessibility",
  "clickable-div": "accessibility",
  "icon-button-no-label": "iconography",
  "control-no-label": "forms-inputs",
  "outline-none": "accessibility",
};

function sourceFindings(src: string): LintFinding[] {
  const found: LintFinding[] = [];
  const tags = scanTags(src);
  const push = (index: number, f: Omit<LintFinding, "line">) => found.push({ line: lineOf(src, index), ...f });

  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    const { attrs } = tag;

    if (IMAGE_TAGS.has(name) && !hasAttr(attrs, "alt") && !hasSpread(attrs)) {
      push(tag.index, {
        severity: "error",
        rule: "img-no-alt",
        message: `<${tag.name}> without an alt attribute — invisible/opaque to screen readers.`,
        fix: 'Add alt="" for decorative images, or a descriptive alt for meaningful ones.',
        doc: SOURCE_RULE_DOCS["img-no-alt"],
      });
    }

    if (
      CLICKABLE_CONTAINERS.has(name) &&
      hasAttr(attrs, "onClick") &&
      !hasAttr(attrs, "role") &&
      !hasSpread(attrs)
    ) {
      push(tag.index, {
        severity: "warning",
        rule: "clickable-div",
        message: `Clickable <${tag.name}> without a role — not focusable or announced as interactive.`,
        fix: 'Use a <button> (or add role="button", tabIndex={0}, and key handlers).',
        doc: SOURCE_RULE_DOCS["clickable-div"],
      });
    }

    if (name === "button" && !hasSpread(attrs)) {
      const named =
        hasAttr(attrs, "aria-label") || hasAttr(attrs, "aria-labelledby") || hasAttr(attrs, "title");
      if (!named && innerText(src, tag).replace(/[^\p{L}\p{N}]/gu, "").length < 2) {
        push(tag.index, {
          severity: "warning",
          rule: "icon-button-no-label",
          message: "Icon-only <button> without an accessible name.",
          fix: 'Add aria-label="…" (or visually-hidden text). See iconography.',
          doc: SOURCE_RULE_DOCS["icon-button-no-label"],
        });
      }
    }

    if (LABELLED_CONTROLS.has(name) && !hasSpread(attrs)) {
      // Read at a name position, like everything else here: a `type=` written
      // inside a placeholder or a title is text, not this control's type.
      const at = findAttr(attrs, "type");
      const type = (at && !at.bound
        ? /^\s*=\s*["']?([a-z]+)/i.exec(attrs.slice(at.index + at.length))?.[1]
        : undefined)?.toLowerCase() ?? "text";
      const labelled =
        hasAttr(attrs, "aria-label") ||
        hasAttr(attrs, "aria-labelledby") ||
        hasAttr(attrs, "id") || // may be paired with <label for>
        hasAttr(attrs, "title");
      if (!UNLABELLED_INPUT_TYPES.has(type) && !labelled) {
        push(tag.index, {
          severity: "warning",
          rule: "control-no-label",
          message: `<${tag.name}> with no way to associate a label (no id, aria-label or aria-labelledby).`,
          fix: "Pair it with a <label for> via id, or add aria-label. A placeholder is not a label.",
          doc: SOURCE_RULE_DOCS["control-no-label"],
        });
      }
    }
  }

  // outline:none is only a defect when nothing replaces the focus ring.
  if (!hasFocusReplacement(src)) {
    // CSS declaration, or a Tailwind `outline-none` utility with any variant
    // prefix (`focus:`, `md:focus:`) — class lists start right after a quote.
    const outlineRe = /outline\s*:\s*(?:none|0)\b|(?:^|[\s"'`])(?:[a-z][a-z0-9-]*:)*outline-none\b/g;
    let m: RegExpExecArray | null;
    while ((m = outlineRe.exec(src)) !== null) {
      // `:focus:not(:focus-visible) { outline: none }` is the recommended way to
      // drop the ring for pointer focus while keeping it for the keyboard.
      // Flagging it would mark best-practice code as an error, which teaches
      // people to ignore the linter.
      if (isPointerFocusException(src, m.index)) continue;
      push(m.index, {
        severity: "error",
        rule: "outline-none",
        message: "Focus outline removed with no visible replacement — kills keyboard focus visibility.",
        fix: "Never remove focus indication outright. Pair it with :focus-visible { outline: 2px solid var(--ring) } (or focus-visible:ring-2).",
        doc: SOURCE_RULE_DOCS["outline-none"],
      });
    }
  }

  return found;
}

/**
 * `code` split the same way `code.split(/\r?\n/)` is (same line contents, in
 * the same order) but paired with each line's own start offset in `code`,
 * so a caller that needs to locate a line's real position never has to
 * search for it — searching by content (`code.indexOf(line)`) always finds
 * the *first* byte-identical line, which is the wrong line whenever the same
 * declaration text appears more than once in the snippet.
 */
function linesWithOffsets(code: string): { line: string; offset: number }[] {
  const out: { line: string; offset: number }[] = [];
  const sep = /\r?\n/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = sep.exec(code)) !== null) {
    out.push({ line: code.slice(start, m.index), offset: start });
    start = m.index + m[0].length;
  }
  out.push({ line: code.slice(start), offset: start });
  return out;
}

// ── entry points ─────────────────────────────────────────────────────────────

/** Lint a code snippet; returns findings sorted by line then severity. */
export function designLint(code: string): LintFinding[] {
  const lines = linesWithOffsets(code);
  const findings: LintFinding[] = [];
  const sevOrder = { error: 0, warning: 1, info: 2 };

  lines.forEach(({ line, offset }, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    for (const r of LINE_RULES) {
      try {
        if (r.test(line, code, offset)) {
          findings.push({ line: i + 1, severity: r.severity, rule: r.id, message: r.message, fix: r.fix, doc: r.doc });
        }
      } catch {
        /* a rule must never break the report */
      }
    }
  });

  try {
    findings.push(...sourceFindings(code));
  } catch {
    /* ditto */
  }

  // One finding per rule per line, even if a rule matches twice there.
  const seen = new Set<string>();
  return findings
    .filter((f) => {
      const key = `${f.line}:${f.rule}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line - b.line || sevOrder[a.severity] - sevOrder[b.severity]);
}

const ICON: Record<LintFinding["severity"], string> = { error: "🔴", warning: "🟡", info: "🔵" };

export const LINT_PREAMBLE =
  "This reads one snippet with per-line regexes and a tag scanner. It resolves no import, opens no other file, renders nothing and measures nothing. It cannot see:";

/**
 * What `design_lint` structurally cannot see.
 *
 * Every entry was written *after* running the linter on an input built to
 * demonstrate it, and each demonstration is kept as a test in
 * `tests/lint.test.ts`. That order matters and is not a style preference: an
 * earlier disclosure list on a sibling module was written from a reading of the
 * rules, four of its sentences were false, and every one of the four was caught
 * by running the tool rather than by re-reading it. A sentence that cannot be
 * demonstrated does not belong here — including one that merely over-claims
 * silence, because a caller who is told a check does not happen will go and do
 * it by hand, and being sent to do work the tool already did is the same kind
 * of wrong as being told a check happened when it did not.
 *
 * Several entries are deliberately precise about *which half* of a rule is
 * affected, because most of these rules are silent for two quite different
 * reasons — "looked and found nothing" and "never ran here" — and a reader
 * acting on silence needs to know which one they have.
 */

/**
 * "`a`, `b` and `c`" — generated from `LINE_RULES` rather than hand-typed, so
 * a disclosure sentence that names every line rule (or counts them) cannot
 * drift from the array the way `hardcoded-color` … `magic-number-radius`
 * drifted the day `grid-track-no-min` shipped as a seventh: the two
 * sentences below said "the six line rules" while `LINE_RULES.length` was
 * already 7, and nothing failed. This is the interpolation half of that
 * fix — the same pattern `UI_EXTENSIONS` uses in `project.ts` to keep a
 * restated list from going stale — used here because both affected
 * sentences quote the full member list already; a count-only assertion in
 * a test would catch drift without saying which rule caused it.
 */
function backtickList(ids: string[]): string {
  const items = ids.map((id) => "`" + id + "`");
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

// The one line rule whose case-sensitivity is a *partial* exception rather
// than the rule, documented at its own disclosure sentence below: `positive-
// tabindex`'s HTML-attribute alternative carries the case-insensitive flag,
// so `TABINDEX="5"` fires where `tabIndex={5}` does not. Every other line
// rule — `grid-track-no-min`'s own literal text (property name, `1fr`, the
// `<img>` gate) included, per `1FR`, `GRID-TEMPLATE-COLUMNS` and `<IMG>` all
// drawing nothing — is fully case-sensitive on the text it grades directly.
// (`grid-track-no-min`'s internal `minmax()` guard is a separate matter: it
// is deliberately case-*insensitive*, fixed after shipping case-sensitive —
// see that rule's own comment and disclosure sentence — but that guard is
// not itself a *rule* in this array, so it does not belong in this Set.)
//
// `LINE_RULES.length` on the line below is derived, but this Set itself is
// not: nothing here checks it against the actual `/i` flags on each rule's
// own regexes, and that was tried before being ruled out. `test.toString()`
// inspection was written and run against all seven current rules and it
// misclassified one of them: `fixed-height-text`'s test function contains a
// `/…/i` regex, so a scan for "does this rule's source contain an i flag"
// says "case-insensitive" — but that flag sits on the `icon|avatar|line|
// divider|border` *suppressor*, not on the `height:` pattern that actually
// decides the finding, so the rule is correctly case-sensitive despite the
// naive scan's answer. The same blind scan would also miss
// `grid-track-no-min`'s own case-insensitive `minmax()` handling entirely,
// because that logic lives in `hasExplicitMinmaxFloor`, a function the
// rule's `test` closure calls by reference — `.toString()` on the closure
// does not inline the body of a function it merely references. Both
// failures are the same shape: a syntactic scan cannot tell a decisive
// regex from a suppressor, or see through a function reference, so it
// cannot be trusted to answer "is this rule case-sensitive" without the
// judgment a human applies when reading what a regex actually *decides*.
// Building a check that encoded that judgment independently of this Set
// would just be this Set again, wearing a different name. So: this Set
// stays hand-maintained, verified only by (a) a human reading the decisive
// regex flags of **every rule in `LINE_RULES`**, and (b) the demonstrating
// tests in `tests/lint.test.ts` (the per-rule loop and `grid-track-no-min`'s
// own case-sensitivity test) that exercise the actual claim behaviourally.
//
// (a) is stated as an obligation over the whole array on purpose, and the
// wording matters more than it looks. This sentence previously named the
// count it had been verified against — "the way this round's review just did
// for all seven" — which was true on the day it was written and false four
// rules later, in the same file where a hand-written count had already gone
// stale once and was replaced by an interpolation for exactly that reason. A
// comment cannot interpolate, so the number is gone instead of being
// refreshed: what has to hold is that every entry in `LINE_RULES` has been
// read, whatever `LINE_RULES.length` is when you read this. Adding a
// case-insensitive rule — or changing an existing one's case sensitivity —
// means updating both this Set *and* one of those tests by hand; neither
// update alone is caught by anything else in this file. What *is* caught
// automatically is the count in the disclosure sentence, which is derived
// from `LINE_RULES.length` below.
const CASE_INSENSITIVE_LINE_RULES = new Set(["positive-tabindex"]);
const CASE_SENSITIVE_LINE_RULE_COUNT = LINE_RULES.length - CASE_INSENSITIVE_LINE_RULES.size;

export const LINT_NOT_VISIBLE: string[] = [
  "**Nothing here is measured, and nothing is rendered.** No contrast ratio is computed, no tap target sized, no spacing rhythm checked, no focus order walked, no screen reader run. `.a { color: #777777; background: #888888; }` comes back as a single `hardcoded-color` warning and says nothing whatever about the contrast between the two, and `padding: 13px 27px` draws nothing at all. Every finding above is a fact about the *text* of the snippet.",
  "**Anything declared in another file** — a class, a design token, a custom property, a parent component's props. `<div class=\"btn\">Go</div>` draws nothing regardless of what `.btn` does in the stylesheet. On `outline-none` that costs in both directions: `.btn { outline: none; }` handed over on its own is reported as an error even when the `:focus-visible` ring replacing it lives in a file this call never saw, and a JSX snippet whose `outline: none` sits in that stylesheet is silent. When the answer depends on both, lint the markup and the CSS in one snippet.",
  "**`outline-none`, which has four demonstrated causes of silence, and only one of them is \"no focus ring was removed\".** Each isolated and run: (1) the snippet removes no ring — `.a { color: red; }`. (2) Something in it looks like a replacement. That check is snippet-wide and selector-blind, so one `:focus` rule setting an outline, box-shadow, border or `--ring` — or one `focus:ring-*` utility — switches the rule off for every `outline: none` in the text, unrelated selectors included: `.a:focus { outline: 2px solid blue; }` beside `.b { outline: none; }` reports nothing, and `.b` really is left with no indicator. (3) The removal is spelled a way the pattern does not carry. It matches `outline: none`, `outline: 0` and the `outline-none` utility, so `outline-style: none`, `outline-width: 0`, `outline: transparent`, `outline: 2px solid transparent`, the `outline-0` utility and `outline: 0px` (the word boundary fails between the `0` and the `p`) each remove the ring and draw nothing. (4) The deliberate pointer-focus exemption: `a:focus:not(:focus-visible) { outline: none; }` and the `not-focus-visible:outline-none` variant are the recommended way to drop a ring for the mouse while keeping it for the keyboard, and are passed over on purpose. This is one of only two `error` rules here — `img-no-alt` is the other — and a missed ring is the direction the gaps cost in.",
  "**A tag that carries a spread.** `img-no-alt`, `clickable-div`, `icon-button-no-label` and `control-no-label` all stand down on any element with `{...props}`, because the attribute they would report as missing may be inside it. `<img {...props} src=\"a.png\">`, `<div {...rest} onClick={go}>`, `<input {...register(\"x\")} />` and `<button {...p}><Icon/></button>` each draw nothing. The alternative is a fabricated finding, so the miss is deliberate — but it means a component that forwards its props is largely unreadable to these four rules. It stands down those four rules on that element and nothing more: `outline-none` still fires on a spread element, and a line rule still reads the line it is written on.",
  "**A value that only exists at run time — and the two rule families split on which way that costs.** The line rules read literal text, so a hex assigned to a variable and used as `style={{ color: c }}` draws no `hardcoded-color`, and `tabIndex={n}` draws no `positive-tabindex` however large `n` is at run time (`tabIndex={5}` written out does fire). `icon-button-no-label` errs the other way: it measures a button's inner text after erasing every `{…}` expression, so `<button>{label}</button>` — a properly labelled button — is reported as icon-only. Erasure is only half of that rule's misjudgement; the other half is the threshold it applies to whatever survives. With no `aria-label`, `aria-labelledby`, `title` or spread to name the button, fewer than two letters or digits fires, so `<button>3</button>`, `<button>×</button>` and `<button>好</button>` are reported as unlabelled — `×` is neither a letter nor a digit, and a single CJK character is a whole word — while `<button>Go</button>`, `<button>12</button>` and `<button>好的</button>` pass. An emoji is not a letter or a digit either, so `<button>🔍</button>` — the commonest real icon button there is — draws the warning, and so does `<button>🔍🔍</button>`; `<button>🔍 Search</button>` does not. Any one of those four names silences it whatever the text says — `<button title=\"Save\">×</button>` is quiet. Read this rule against prop-driven, symbolic and non-Latin buttons as a question, not a defect.",
  "**Which element a tag rule is really grading — the match is on the literal name, lowercased, and on nothing else.** That cuts both ways and neither way is about what finally renders. A component **is** graded whenever its name happens to spell an element: `<Button onClick={go}><Icon/></Button>` draws `icon-button-no-label`; `<Input type=\"email\" />`, `<Select>` and `<Textarea />` draw `control-no-label`; `<Div>`, `<Span>`, `<Li>` and `<Section onClick={go}>` draw `clickable-div`; `<Image src=\"/a.png\" />` and `<IMG>` draw `img-no-alt`. Those are usually false, because the wrapper is supplying the very `alt`, `aria-label`, `id` or `role` the rule wants and this call cannot see its implementation — `<Button aria-label=\"Save\">` goes quiet only because the name is written on *this* line. Every other component name is invisible in the other direction: `<Avatar src=\"/a.png\" />`, `<IconButton />`, `<TextField />` and `<Pressable onClick={go}>` render exactly the elements these rules are about and draw nothing *from the four rules keyed to element names*. The other seven rules do not consult a tag name at all, so a wrapper is not silent overall: the line rules read the line it is written on, and `<Avatar style={{ color: \"#ff0000\" }} />` reports a hardcoded colour; and `outline-none` scans the snippet's text with no reference to any element, so `<Avatar className=\"outline-none\" />` reports a removed focus ring. The plain-HTML lists are narrow too — `clickable-div` is `div`, `span`, `li`, `section` and so passes `<a onClick>`, `<p onClick>`, `<td onClick>` and `<article onClick>`; `icon-button-no-label` is `<button>` and not `<a role=\"button\">`; `control-no-label` is `input`, `select`, `textarea`.",
  "**A click handler written in a syntax `clickable-div` does not read.** It looks for an attribute named `onClick`, and HTML's `onclick` satisfies it too. Demonstrated misses: Vue's `<div @click=\"go\">` and `<div v-on:click=\"go\">`, Angular's `<div (click)=\"go()\">`, Alpine's `<div x-on:click=\"go\">` and `<div @click.prevent=\"go\">`, and Svelte 4's `<div on:click={go}>` — each draws nothing, and these are stacks the shared scanner reads elsewhere in this codebase, so the gap is not a scope decision. Current Svelte is *not* in that list: Svelte 5 replaced the event directive with an event attribute, `<div onclick={go}>`, which this rule does read; what it misses on Svelte is the legacy `on:` form that Svelte 5 still supports for backwards compatibility and that existing components are full of. Nor is the handler spelling the only way a clickable container escapes in one of these templates — three separate conditions do it as well, each run inside a `<template>`: the element must be `div`, `span`, `li` or `section`, so `<article onclick=\"go()\">` is silent; it must carry no `role`, so `role=\"button\"` silences it; and it must carry no spread, which Vue's `v-bind=\"attrs\"` counts as.",
  "**A namespaced element, which is graded as its prefix.** `:` is not a tag-name character in the shared scanner, so `<svg:image href=\"…\">` is read as an element called `svg`, `<xhtml:img>` as one called `xhtml` and `<html:input>` as one called `html` — none of which is on any rule's list, so all three pass silently while their unprefixed spellings fire. What this does *not* cost is a Svelte head: no rule here looks for a `<head>` element at all, so `<svelte:head>` is merely an unrecognised tag, and an `<img>` written inside one is graded exactly as it would be anywhere else in the file.",
  "**Commented-out code — and the two rule families disagree about it.** The line rules skip a line whose first non-space characters are `//`, `*` or `/*`; the tag rules mask nothing. So `<!-- <img src=\"a.png\"> -->` reports `img-no-alt`, `{/* <img src=\"a.png\"> */}` reports it too, and `<!-- .b { outline: none } -->` reports `outline-none`, while `// color: #ff0000;` is skipped. The line-rule guard is about where the *line* starts, so `color: #ff0000; // fix later` still fires, and inside a block comment whose continuation lines carry no leading `*` the line rules fire normally. Dead code draws live findings here — and the traffic runs the other way too, which is easier to miss: commenting out a *focus replacement* silences a real one, because `outline-none`'s replacement check reads the raw text of the snippet. `<!-- .a:focus { outline: 2px solid blue; } -->` above a live `.b { outline: none; }` reports nothing at all.",
  "**A CSS declaration split across lines.** " + backtickList(LINE_RULES.map((r) => r.id)) + " are single-line regexes run once per line, so `font-size:` followed by `14px` on the next line, a `grid-template-columns` value split the same way, or `color:` followed by `#ff0000`, draws nothing where the same declaration on one line draws a warning. The five tag rules do not share this blind spot — they scan the whole snippet and map the offset back to a line number, so a Prettier-wrapped `<img\\n  src=…\\n/>` is graded exactly like the one-line form.",
  "**Spellings a line rule was not written for.** `hardcoded-color` wants a `#` hex directly after `color`, `background`, `border`, `fill` or `stroke`, or a quoted six-digit hex on a line that mentions style/className/css — so `rgb(255, 0, 0)`, `hsl()`, `oklch()`, a named `red`, a hex inside `box-shadow`, and a custom-property *definition* of any name (`--brand: #ff0000`, `--brand-color: #ff0000`, `--border-color: #e5e7eb`) are all invisible. That last one used to split on nothing but whether the token name happened to end in a watched word — `--brand-color` fired, `--brand` did not — and the half that fired was the rule telling a caller who was defining a design token to go and reference a design token; it is excluded now, along with the same shape in `fixed-height-text` and `magic-number-radius`. A real declaration is untouched: `border-color: #e5e7eb` and `.a { color: #ff0000 }` both fire. `px-font-size` reads only the CSS `font-size:` spelling: `style={{ fontSize: \"14px\" }}` and the `font: 14px/1.5` shorthand draw nothing. `important-overuse` reads the literal `!important`, so Tailwind's important modifier — `className=\"!text-red-500\"` — is invisible where `color: red !important` fires. That is the pattern: Tailwind's arbitrary-value syntax (`bg-[#ff0000]`, `text-[14px]`, `rounded-[6px]`, `h-[40px]`), its scale utilities (`h-10`) and its important modifier are where these things are actually written in a Tailwind file, and are exactly where these rules are blindest. Case is a spelling too, and " + CASE_SENSITIVE_LINE_RULE_COUNT + " of the " + LINE_RULES.length + " line rules are case-sensitive on the literal text: `HEIGHT: 40px`, `COLOR: #ff0000`, `FONT-SIZE: 14px`, `BORDER-RADIUS: 6px`, `!IMPORTANT` and `1FR` each draw nothing where the lowercase form fires. `hardcoded-color` is case-sensitive per *branch* rather than per rule, which is worth knowing before trusting either result: bare CSS `COLOR: #ff0000` is silent, while `style={{ COLOR: \"#ff0000\" }}` fires — it reaches the second branch, which looks for a quoted six-digit hex on a line mentioning style/className/css and never reads the property name at all. The hex's own case is read by neither branch: `#FF0000` fires in both places. `positive-tabindex` is the partial exception, and only on one of its two alternatives: the HTML-attribute form carries the case-insensitive flag, so `TABINDEX=\"5\"`, `TabIndex=\"5\"` and the unquoted `TABINDEX=5` all fire, while the JSX brace form is matched case-sensitively under the single spelling `tabIndex={5}` — `TABINDEX={5}`, `TabIndex={5}` and `tabindex={5}` are silent. `grid-track-no-min` is the only line rule that is case-sensitive on *some* of its own literal text and not on other parts, by design rather than accident: the property name and `1fr` are case-sensitive like the rest — `GRID-TEMPLATE-COLUMNS: 1fr 1fr;` and `1FR` both draw nothing — and so is the `<img>` gate: `<IMG src=\"a.png\">` elsewhere in the same snippet does not satisfy it, even though that same tag, same case, draws `img-no-alt` from the source rules below. But the `minmax()` guard inside it is deliberately case-*insensitive* — `MINMAX(200px, 1fr)` and `MINMAX(AUTO, 1fr)` are read exactly like their lowercase spellings — because getting this backwards was a real, shipped defect rather than a silence: a case-sensitive guard let a correctly-floored `MINMAX(200px, 1fr)` track through as if it were bare, which is this rule crying wolf rather than staying quiet, and crying wolf gets fixed rather than disclosed.",
  "**What `fixed-height-text` and `magic-number-radius` are actually reading, which is not what their names say.** `fixed-height-text` does not mean *fixed*: its pattern is `height:` followed by two or more digits and a literal `px`, and it does not read `height` as part of a longer name. `min-height: 40px`, `max-height: 200px`, `line-height: 40px` and a custom property like `--nav-height: 40px` are all silent — the first of those because a floor cannot clip anything and is word-for-word what this rule's own fix text recommends, so firing on it was the rule flagging its own advice. Because of the other half, a fixed height stated any other way is silent: `height: 9px` is one digit, and `height: 40rem`, `height: 100%`, `height: 40vh` and even `height: 40.5px` are not `px` preceded by two digits. The unit is matched literally and in lower case, so `height: 40PX` and `height: 40Px` are silent as well, and so are `height: calc(40px + 1rem)` and the logical-property spelling `block-size: 40px`. Nothing but whitespace may sit between the colon and the digits, which is why `.a { height: \"40px\"; }` and `style={{ height: \"40px\" }}` are silent too — both are a lower-case `px` behind two digits, and the quote is in the way. Shapes demonstrated to fire include `height: 40px`, `height:40px` and `height :  40px`; shapes demonstrated to be silent include `min-height: 40px`, `max-height: 200px`, `line-height: 40px` and the custom-property *definitions* `:root { --header-height: 64px; }`, `--height`, `--card-height` and `--nav-height`. Read all of that as a sample rather than a closed list: what the pattern reads is a narrow slice of the ways a fixed height gets written, and the slice has ragged edges in both directions. Both rules are then dropped by a word anywhere on the line. `fixed-height-text` stands down when the line contains `icon`, `avatar`, `line`, `divider` or `border` as a *substring*, which is much wider than it reads: `.timeline`, `.headline` and `.inline-flex` all contain `line`, and `.a { height: 40px; border-radius: 4px; }` contains `border`, so none of those four draws the height note that `.card { height: 40px; }` draws — the fourth is not silent overall, it still reports its radius. `magic-number-radius` is dropped when `var(` or `rounded` appears anywhere on the line, so `.rounded-card { border-radius: 8px; }` is silent. Both suppressors are whole-line, so a densely written declaration block quietly switches them off — and they are not parallel, though they read as though they were: `fixed-height-text`'s suppressor is case-insensitive, so `.a { height: 40px; BORDER: 1px solid; }` is silent, while `magic-number-radius`'s is not, so `.ROUNDED-card { border-radius: 8px; }` fires where `.rounded-card` is silent. And `magic-number-radius` reads `border-radius` in whole pixels between 1 and 999 only, which cuts both ways: `border-radius: 50%` and `border-radius: 0.5rem` draw nothing because they are not whole pixels, and `border-radius: 0`, `border-radius: 0px` and `border-radius: 9999px` draw nothing because a squared corner and a pill are the two least ad-hoc radii there are — the pill threshold is a blunt four figures, so a hypothetical real `1200px` radius is silent with them. Custom-property definitions are excluded too, the same way and for the same reason as in the two rules above: `:root { --border-radius: 8px; }` and `--radius: 8px` are now both silent, where the first used to fire on nothing but its name.",
  "**Whether a label, a role or a name actually resolves.** `control-no-label` is satisfied by the mere *presence* of an `id` and never looks for the `<label for>` that would use it, so `<input id=\"email\">` with no label anywhere is silent, and so is `<label for=\"nope\">Email</label><input id=\"email\">` where the two do not match. It also has no notion of a wrapping label: `<label>Email <input type=\"email\"></label>`, which is correct, still draws the warning. `clickable-div` is satisfied by any `role` at all — `role=\"presentation\"` silences it — and never checks that the `tabIndex` and key handlers its own fix text asks for came with it. The two naming rules answer the same way: `img-no-alt` accepts `alt=\"image\"` and `alt=\"a.png\"`, and `icon-button-no-label` accepts `aria-label=\"button\"` and even `aria-label=\"\"` on an icon-only button. These four read an attribute's presence rather than its content, with one demonstrated exception in the other direction: `control-no-label` reads the *value* of `type` and exempts five of them — `hidden`, `submit`, `button`, `image` and `reset` draw nothing however unlabelled they are, while `text`, `email` and `checkbox` are graded. Otherwise it is presence that satisfies them, and these are the cases run: `alt=\"image\"`, `alt=\"a.png\"`, `aria-label=\"button\"`, `aria-label=\"\"`, an `id` with no matching `<label for>`, and `role=\"presentation\"`. So a silence from these four has at least four distinct causes — the attribute was present in one of those forms; or the element carries a spread, with no attribute at all; or its `type` is one of the five exempt values; or, for `icon-button-no-label`, the button simply has visible text, which is why `<button>Save</button>` is quiet. Their findings carry no guarantee either: the wrapping label two sentences up, `<Input type=\"email\" />` and `<button>{label}</button>` are correct markup that these rules report.",
  "**How many defects a snippet has.** At most one finding per rule per line: `<img src=a><img src=b><img src=c>` on a single line reports one `img-no-alt`, and `.a { color: #fff; background: #000; }` reports one `hardcoded-color`. The same two images on two lines report two. The summary counts findings, not defects, and it undercounts a minified or densely written file.",
  "**Whether a bare `1fr` track actually overflows — and four narrower things `grid-track-no-min` reads as a whole line of raw text, not as individual tracks, live CSS, or a scoped file.** §6.6's automatic-minimum conditions depend on the grid item's own properties — its overflow, whether the track it spans has an `auto` min sizing function, whether it shares that axis with a flexible track — and the declaration does not carry any of them, so a finding here is a robustness note, not a proven overflow. The guard itself is whole-line, not per-track: `hasExplicitMinmaxFloor` fires true the moment *any* `minmax(...)` call on the line has a first argument that is not `auto`, whatever that argument's value or shape — `minmax(0, 1fr)`, `minmax(200px, 1fr)` and a nested `minmax(min(18rem, 100%), 1fr)` all count — so `grid-template-columns: minmax(0, 1fr) 1fr` is one line with one genuinely guarded track and one genuinely bare one, and reports neither. That is a known false negative, kept because parsing the track list into individual tracks is a full grammar this linter does not implement — narrower coverage over a parser, not a silent gap. The shorthand `grid-template` property is not read at all — only the longhand `grid-template-columns`/`grid-template-rows` are — so `grid-template: \"a b\" 1fr / 1fr 1fr` draws nothing. The `<img>` gate is snippet-wide, not grid-scoped: it is satisfied by any `<img>` anywhere in the text handed to `design_lint`, so a bare-`1fr` grid with no image of its own still fires when an unrelated `<img>` sits elsewhere in the same snippet, and — the reverse of the same gap — a finding says nothing about which track, if any, the image it cites actually occupies. And the guard has no notion of a comment or a string: `grid-template-columns: 1fr /* minmax(200px, 1fr) */;` and `grid-template-columns: 1fr; content: \"minmax(200px, 1fr)\";` are both read as if the commented-out or quoted `minmax(200px, 1fr)` were a real, live guard on the same declaration, so a genuinely bare `1fr` on either line is silenced by text that never reaches the browser at all — the same family as the commented-out-code blind spot named above, on this rule specifically.",
  "**What is overflowing.** `overflow-hidden-root` reads the declaration, not the layout, so it cannot say which element exceeds the viewport — only that the root was made a scroll container to hide it.",
  "**A qualified selector `overflow-hidden-root` still targets, and what its fallback guard reads instead of parsing.** The selector match accepts only `html`, `body` or `:root` as the selector's own trailing token, so a rule that still targets the root through a class or attribute — `body.no-scroll { overflow-x: hidden; }` — passes silently even though the declaration reaches the same element. Real selector matching needs actual parsing and risks new false positives on a text-based rule, which is a scope boundary rather than an oversight. Separately, the fallback-then-override guard (a later same-property `clip`, or a later bare `overflow: clip` shorthand, in the same block cancels a `hidden`) only recognises a later *shorthand* as overriding an earlier longhand, not the reverse: `overflow: hidden` fully neutralised by two later longhands together — `overflow-x: clip; overflow-y: clip;` — still fires, because neither longhand's property text is the shorthand that set `hidden`, and this rule does not model two longhands jointly covering a shorthand's two axes. That is a known false positive, kept because modelling the shorthand/longhand interaction both directions is a step past the property-text match this rule otherwise makes. The override guard also has no notion of a comment or a string, the same disclosed limitation `hasExplicitMinmaxFloor` already carries for `minmax(...)`: `body { overflow-x: hidden; /* overflow-x: clip; */ }` and `body { overflow-x: hidden; content: \"overflow-x: clip\"; }` both read the commented-out or quoted `clip` as a real, live override and wrongly silence a finding that should fire — a known false negative in the opposite direction from the shapes above. The guard reaches past the matched block in exactly one direction and for exactly one shape: a later `@supports` block whose condition names `overflow: clip` and whose body declares the same property (or the shorthand) as `clip` — the `body { overflow-x: hidden; }` then `@supports (overflow: clip) { body { overflow-x: clip; } }` spelling — cancels the finding, and the selector inside that block is *not* checked, so a feature query that upgrades some other element also stands the rule down. In the other polarity, a `hidden` that sits inside a `@supports` block whose condition names `overflow: clip` at all — `@supports not (overflow: clip) { body { overflow-x: hidden; } }`, the idiom's most explicit spelling — is passed over without reading the `not`, so the contradictory `@supports (overflow: clip) { body { overflow-x: hidden; } }` is silent too. Both are deliberate: reading polarity means parsing `not`/`and`/`or`, and the alternative was firing on three of the four standard spellings of the rule's own `fix`.",
  "**A brace hiding in a string or a comment *before* the matched `hidden` silences `overflow-hidden-root` outright, rather than misreading its selector or its override.** The selector lookup (`enclosingOpenBrace`) scans backward from the declaration counting brace balance, and has no notion of a comment or a string — the same disclosed limitation `hasExplicitMinmaxFloor` and the override guard above already carry, but on the *other* side of the match: `body { content: \"}\"; overflow-x: hidden; }` and `body { /* } */ overflow-x: hidden; }` are both silent, because the quoted or commented `}` is read as a real, already-spent close and the balance-tracked scan walks straight past `body`'s own `{` before it can find it, returning no enclosing block at all. This is distinct from the already-disclosed comment/string blindness in the override guard, which only reads text *after* the matched declaration and produces a wrong (silenced) finding by misreading an override; this is text *before* the match, and it silences the rule by misreading the selector lookup itself, with no override involved.",
  "**Whether an animation is actually reduced.** `motion-no-reduced-cover` looks for the media feature anywhere in the source it was given, so a project honouring the preference in a separate stylesheet reads as uncovered here.",
  "**Runtime motion.** Anything animated from JavaScript, a motion library, or SwiftUI is invisible to this — it reads CSS declarations only.",
  "**Inert values `motion-no-reduced-cover` does not recognise as meaning \"no animation\".** Its trigger excludes only a literal `none` value on `animation`/`animation-name`, optionally behind one opening quote so the CSS-in-JS spelling `style={{ animation: \"none\" }}` is excluded too — the common reset, in both the spellings anyone writes. `animation: initial;`, `animation: unset;` and `animation: inherit;` all resolve to that same property's own initial value (`none`), but are not excluded, so each still fires as if it declared a real animation. Neither does the shorthand omitting a name entirely: `animation: 0s;` sets only a duration and resets every other sub-property — `animation-name` included — to its own initial value, which is also `none`, so this too draws a warning about an animation that is not actually there.",
  "**A property name that merely contains a matched word, not the word as a full property — narrowed by a fix round, not eliminated.** `animates-layout-property` reads `width`, `height`, `top`, `left`, `right`, `bottom`, `margin` and `padding` as whole words bounded by non-word characters, not as parsed property names. Two demonstrated false positives from that are now excluded by a lookbehind: `outline-width` (outline is painted outside the box, so animating its width costs paint, never layout) and a custom-property name that merely ends in a watched word (`--card-width`, `--nav-height`, `--sidebar-margin` — a custom property carries no rendering behaviour of its own until consumed by `var()`). What the lookbehind does not reach: any *other* real CSS property whose name happens to end in one of the eight words without being layout-affecting — none is known today, but the mechanism is still a word match, not a parse, so a future one would not be caught. The list is also not exhaustive in the other direction: `inset`, `gap`, `row-gap`, `column-gap`, `flex-basis` and `font-size` all move layout when animated and are not on it, so a `transition` naming only one of those draws nothing from this rule. Separately, how far the rule reads *from* a `transition:` is bounded by the value's own quotes when it has them and by `;` when it does not, which is what keeps a JavaScript style object from being read as one declaration: `{ transition: \"opacity 200ms\", margin: 0 }` is silent, because the sibling key sits outside the quoted value, while a genuine comma-separated CSS list — `transition: opacity 200ms, width 200ms` — still fires. The cost is the unquoted object-literal shape: `{ transition: theme.motion.fast, margin: 0 }` has no quotes to bound it and no `;` to stop it, so the sibling key is still read as part of the value. The `@keyframes` half is not a line match at all: it asks whether the declaration's own position sits inside a `@keyframes` block, walking the enclosing braces, so a normally-formatted keyframes block is graded exactly like a collapsed one and the finding lands on the moving declaration's line. It inherits that walk's comment/string blind spot — a stray `{` or `}` in a string or a comment shifts the enclosing-block chain — and it is still a word match, so `content: \"width: 0\"` inside a keyframe reads as a declaration.",
  "**A string or a URL, for `transition-all`.** Its shorthand alternative has no notion of either, so `content: \"transition: all 200ms\";` and `background: url(transition:all.png);` both fire on text that never reaches a real declaration — the same family of comment/string blindness already disclosed for `hasExplicitMinmaxFloor` and `overflow-hidden-root`'s override guard, kept for `transition-all` for the same reason: real string/URL awareness needs more than a word match.",
];

export const LINT_CLOSING =
  "A clean result here is not a design review and not an accessibility audit. It means no rule in this linter matched the text of this snippet — and most of what makes an interface work has no rule here at all. Take the rest from design_review_checklist, a keyboard, and a screen reader. The reverse is worth stating too, because the entries above are per-rule and a report is read all at once: a snippet in which every decision is right is expected to draw **nothing**. A stylesheet using `@layer tokens`, `@supports` for `overflow: clip`, `repeat(auto-fit, minmax(200px, 1fr))`, `min-height` over `height`, a `transition` naming only `transform` and `opacity`, a `prefers-reduced-motion` block and a `:focus-visible` ring returns zero findings, and that case is kept as a test. If correct code here draws a finding, treat it as this linter crying wolf and worth reporting, not as something to change.";

export function designLintReport(code: string): AuditReport {
  const findings = designLint(code);
  const out: string[] = [];
  if (findings.length === 0) {
    out.push(
      "# Design lint",
      "",
      "✅ No design anti-patterns detected in this snippet.",
      "",
      "_Static checks only (hardcoded values, focus/alt/labels, semantics). Still verify visually and with a keyboard + screen reader. See design_review_checklist for a full audit._",
    );
  } else {
    const counts = findings.reduce((m, f) => ((m[f.severity] = (m[f.severity] ?? 0) + 1), m), {} as Record<string, number>);
    out.push(
      "# Design lint",
      "",
      `**${findings.length} finding(s)** — ${counts.error ?? 0} error · ${counts.warning ?? 0} warning · ${counts.info ?? 0} info`,
      "",
      "| line | sev | rule | issue |",
      "|---|---|---|---|",
      ...findings.map((f) => `| ${f.line} | ${ICON[f.severity]} | \`${f.rule}\` | ${f.message} |`),
      "",
      "## Fixes",
      ...findings.map((f) => `- **L${f.line} \`${f.rule}\`:** ${f.fix}${f.doc ? ` → get_design_doc("${f.doc}")` : ""}`),
      "",
      "_Regex/tag-scanner based — high-signal but not exhaustive, and it cannot see values that arrive via props or a spread. A fast design-time pass, not a replacement for a full review or a real a11y audit (axe/keyboard/screen-reader)._",
    );
  }
  out.push("", ...renderNotVisibleSection(LINT_PREAMBLE, LINT_NOT_VISIBLE, LINT_CLOSING));
  return { text: out.join("\n"), structured: auditStructuredFrom({ findings, notVisible: LINT_NOT_VISIBLE }) };
}

// ── audit reports ────────────────────────────────────────────────────────────

/**
 * The structured half of an audit, built from the findings array the report is
 * built from. Kept separate from `assembleAuditReport` because an auditor may
 * need this half without adopting that function's report layout — four of them
 * have their own, and changing nine tools' markdown to share one renderer is a
 * different change than giving them all one machine contract.
 */
export function auditStructuredFrom(input: {
  findings: Array<LintFinding & { file?: string }>;
  notVisible: string[];
  file?: string;
}): AuditStructured {
  const { findings, notVisible } = input;
  return {
    findings: findings.map((f): AuditFinding => {
      const file = f.file ?? input.file;
      return {
        rule: f.rule,
        severity: f.severity,
        message: f.message,
        fix: f.fix,
        doc: f.doc ?? "",
        ...(file ? { file } : {}),
        line: f.line,
      };
    }),
    summary: {
      error: findings.filter((f) => f.severity === "error").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
    notVisible,
  };
}

/**
 * The markdown rendering of the same `notVisible` array the structured half
 * carries. One array, two renderings: a disclosure list typed separately from
 * the field that reports it will drift, and when it does neither reader can
 * tell which one is lying.
 */
export function renderNotVisibleSection(
  preamble: string,
  notVisible: string[],
  closing: string,
): string[] {
  return [
    "## Not visible to this audit",
    "",
    preamble,
    "",
    ...notVisible.map((entry) => `- ${entry}`),
    "",
    closing,
  ];
}

/**
 * Assemble one audit into its two registers at once.
 *
 * `securityReport` and `genericReport` each build their markdown by hand, and
 * that was fine while markdown was all they returned. The two auditors that
 * declare an `outputSchema` return a second representation of the *same*
 * findings, and two hand-built representations of one thing drift — a summary
 * that disagrees with its own findings, or a "Not visible" section that lists
 * one limitation in prose and another in the array, is precisely the silent
 * wrongness these tools exist to catch in other people's code. So both come out
 * of one function, counted once and rendered twice.
 *
 * The path travels as data and is folded into the prose here, never recovered
 * from it. An earlier version did the reverse — the callers prefixed the
 * message with `path: ` for the prose and this function split it back out on
 * the first `": "` — and a file legitimately named `chapter 2: the fall.html`
 * broke the split, silently dropping `file` from every finding in that file.
 * The prose still reads the way `securityReport`'s does, with the path folded
 * into the message (a reader takes one line in at a glance, and `(line 12)`
 * beside `app/page.tsx:12` puts the same number in their eye twice), but that
 * is now a rendering decision rather than a channel.
 *
 * Findings whose path is already inside their message — `seoConfigRules` writes
 * `robots.txt: …` itself, and a project-wide claim is attributed to
 * `configuration:` rather than to any file — simply arrive with no `file`, and
 * nothing here goes looking for one.
 */
export function assembleAuditReport(input: {
  heading: string;
  /** What was read — the file count, the caps, the skips. */
  scanned: string;
  /** Anything else that belongs above the counts, e.g. coverage. */
  notes?: string[];
  /** Each finding, carrying its own path where the caller knows one. */
  findings: Array<LintFinding & { file?: string }>;
  /** The opening sentence of the "Not visible to this audit" section. */
  preamble: string;
  notVisible: string[];
  /** The closing sentence, which must never imply a measurement or a ranking. */
  closing: string;
  /** Snippet mode: the filename the caller named, if any. */
  file?: string;
}): AuditReport {
  const { findings, notVisible } = input;

  const summary = {
    error: findings.filter((f) => f.severity === "error").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  const lines: string[] = [`# ${input.heading}`, "", input.scanned, ""];
  for (const note of input.notes ?? []) lines.push(note, "");
  lines.push(`**${summary.error} error · ${summary.warning} warning · ${summary.info} info**`, "");

  if (!findings.length) {
    lines.push("No findings in what was read.", "");
  } else {
    for (const group of [
      { title: "Errors", items: findings.filter((f) => f.severity === "error") },
      { title: "Warnings", items: findings.filter((f) => f.severity === "warning") },
      { title: "Notes", items: findings.filter((f) => f.severity === "info") },
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

  lines.push(...renderNotVisibleSection(input.preamble, notVisible, input.closing));

  const structured = auditStructuredFrom({ findings, notVisible, file: input.file });

  return { text: lines.join("\n"), structured };
}
