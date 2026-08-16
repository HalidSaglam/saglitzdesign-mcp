// Shared HTML-scanning primitives.
//
// `maskComments` started in security.ts; `elementSpan` and `flattenTags`
// started private in generic.ts, each grown wherever it was first needed.
// Both modules left a note that a third consumer should get a shared home
// instead of a third copy or a second one-way import — the SEO and
// performance auditors are that third consumer, so this module exists now.
//
// `scanTags` and `Tag` live here rather than in lint.ts, and the attribute
// readers below live here rather than in perf.ts, for one reason: **reading an
// attribute is a property of this codebase, not of three named modules.** Five
// scanners parse markup — lint.ts, generic.ts, security.ts, seo.ts and perf.ts
// — and the same defect was found and fixed in three of them separately while
// the other two kept shipping it, because the question asked each time was
// "which modules were listed?" rather than "which modules read attributes?".
// A primitive with one home makes the wrong version unaskable.
//
// lint.ts re-exports `scanTags` and `Tag` so that existing importers of
// `./lint.js` keep working.

/**
 * Replace comment text with spaces (preserving length and line numbers) so
 * neither `extractHeaders` nor `securitySourceRules` treats commented-out
 * text — a header mention, or a code example in a doc comment — as real.
 * Comment styles are gated by file shape rather than applied blindly:
 *   - line comments and block comments in JS/TS-like files (`.js`, `.jsx`,
 *     `.ts`, `.tsx`, `.mjs`, `.cjs`) and in `.vue`/`.svelte`, which embed a
 *     real `<script>` block using the same syntax alongside their markup.
 *     A `_headers` file's route selector line legitimately starts with the
 *     two characters that open a block comment (meaning "all paths") —
 *     treating that as an unterminated block comment would blank out every
 *     header declaration that follows it in the file, so `_headers` is
 *     deliberately excluded from this group.
 *   - the same two forms in `.swift` files, too — Swift's line comment and
 *     its slash-star block comment are the identical syntax, and
 *     `appleconfig.ts`/`apple.ts` need the same "don't let a comment decide
 *     anything" guarantee an Apple audit rule gets for free elsewhere. One
 *     real gap: Swift block comments nest (a block comment opened inside
 *     another is closed by its own matching close, not the outer one) and
 *     this scanner does not track that depth — it closes on the first
 *     closing marker it meets, same as it does for JS, where nesting isn't
 *     legal syntax to begin with. Untested against nested Swift block
 *     comments; not a case any of this module's current callers construct.
 *   - `#` only in `.toml` and `_headers` files, where it is their actual
 *     comment syntax. JSON has no comment syntax, so nothing is masked
 *     there — a `//` inside a URL string in vercel.json must survive.
 *   - `<!-- -->` universally; its four-character open and explicit close
 *     make it unambiguous wherever it appears — this is what covers
 *     `.html`/`.astro` templates, and the markup half of `.vue`/`.svelte`.
 *
 * In JS/TS-like files, a `'`/`"`/`` ` `` opens a string, tracked per line
 * (reset at each newline — this is not a tokenizer, and a template literal
 * that spans multiple lines is out of scope), and nothing inside that
 * string can open a comment; an escaped quote does not close it. This
 * replaced an earlier guard of "`//` not immediately preceded by `:`",
 * which approximated "inside a URL" when the real predicate is "inside a
 * string literal" — it missed `"//cdn.example.com"` (a protocol-relative
 * URL with nothing before the `//` on the line), which masked a real CSP
 * declaration on the rest of that line as `csp-missing`: a false negative
 * on correct configuration, the one direction this module refuses to ship.
 * Between under-masking a real comment (at worst reproduces the
 * commented-out-header case, which just stays a live finding) and
 * over-masking real code (fabricates `csp-missing` on a correct policy),
 * this errs toward the former wherever the two heuristics would disagree.
 * The same per-line string tracking applies to `.swift` source even though
 * Swift's own quoting rules differ in places this scanner does not model
 * (no `'`-delimited literal exists in Swift; multi-line and raw
 * (`#"..."#`) string forms are out of scope, same as multi-line template
 * literals already are for JS) — the existing approximation, not a
 * Swift-specific one.
 *
 * Exported because `generic.ts` needs the same "don't flag commented-out
 * markup" guarantee for its visual rules — the same judgement Task 6 of the
 * security plan made for `scanTags` — and `appleconfig.ts` needs it so a
 * commented-out `import` cannot decide which platform an Apple project
 * targets.
 */
export function maskComments(source: string, path: string): string {
  // `.astro` is two languages in one file with a hard, unambiguous boundary:
  // the frontmatter fence. Inside it the content is TypeScript, where `//`
  // opens a comment; outside it the content is markup, where it does not.
  // Adding `.astro` to `isJsLike` wholesale would mask real template text
  // after any `//` — the over-masking the note above warns about, which
  // fabricates absence. Splitting on the fence gets both halves right, and
  // because `maskComments` is length-preserving the two masked halves
  // concatenate back to the original offsets.
  if (/\.astro$/i.test(path)) {
    const open = /^---[ \t]*\r?\n/.exec(source);
    const close = open ? source.indexOf("\n---", open[0].length - 1) : -1;
    if (open && close !== -1) {
      return maskComments(source.slice(0, close + 1), "frontmatter.ts")
        + maskComments(source.slice(close + 1), "template.html");
    }
    return maskComments(source, "template.html");
  }

  const isHeadersFile = /(^|\/)_headers$/.test(path);
  const isJsLike = /\.(?:jsx?|tsx?|mjs|cjs|mts|cts|vue|svelte|swift)$/i.test(path);
  const isHashComment = isHeadersFile || /\.toml$/i.test(path);

  let out = "";
  let i = 0;
  const n = source.length;
  let quote: string | null = null; // the open quote char, or null when not inside a string

  while (i < n) {
    const ch = source[i];

    if (ch === "\n") {
      quote = null;
      out += ch;
      i++;
      continue;
    }

    if (isJsLike) {
      if (quote) {
        // Inside a string literal: nothing here can open a comment, and an
        // escaped quote does not close it.
        if (ch === "\\" && i + 1 < n) {
          out += ch + source[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) quote = null;
        out += ch;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        out += ch;
        i++;
        continue;
      }
    }

    const two = source.slice(i, i + 2);
    if (isJsLike && two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let j = i; j < stop; j++) out += source[j] === "\n" ? "\n" : " ";
      i = stop;
    } else if (isJsLike && two === "//") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (isHashComment && ch === "#") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (source.slice(i, i + 4) === "<!--") {
      const end = source.indexOf("-->", i + 4);
      const stop = end === -1 ? n : end + 3;
      for (let j = i; j < stop; j++) out += source[j] === "\n" ? "\n" : " ";
      i = stop;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

// ── the tag scanner ──────────────────────────────────────────────────────────

export interface Tag {
  name: string;
  attrs: string;
  index: number;
  /** offset just past the opening tag's `>` */
  end: number;
  selfClosing: boolean;
}

// Attribute chunk allows newlines, quoted strings and one level of JSX braces.
const TAG_RE = /<([A-Za-z][A-Za-z0-9._-]*)((?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}|[^>"'{])*?)(\/?)>/g;

export function scanTags(src: string): Tag[] {
  const tags: Tag[] = [];
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(src)) !== null) {
    tags.push({
      name: m[1],
      attrs: m[2] ?? "",
      index: m.index,
      end: m.index + m[0].length,
      selfClosing: m[3] === "/",
    });
  }
  return tags;
}

// ── attributes ───────────────────────────────────────────────────────────────
//
// An attribute name has to be found where a *name* can appear, and every
// scanner in this codebase got that wrong at least once. The history is worth
// keeping because it is the same bug four times over:
//
//   • `\b` matches inside `data-src`, `data-href`, `data-nonce`. Every
//     instance was a false negative — a real finding silenced by a data
//     attribute that merely contains the name.
//   • Allowing a name to begin after a quote (`[\s"']`) fixed the prefix case
//     and not the general one: a quote opening a value cannot be told from one
//     closing it, and **whitespace inside another attribute's value qualifies
//     too**. So `title="see alt=foo"` satisfied a test for a bare `alt`,
//     `<img alt="Full width photo">` looked like an image declaring a `width`,
//     and `<h1 title="in Vue use v-if here">` looked conditionally rendered.
//
// The fix is to look for names only where values are not: `bareAttrs` blanks
// every quoted or braced value, length-preserving, so a caller can locate the
// name in the blanked copy and then read the real value out of the original at
// the same offset. The `=` of a declaration survives the blanking (an `=`
// *inside* a value does not), because two of the four callers locate `name=`
// rather than the bare name.

export const bareAttrs = (attrs: string): string =>
  attrs.replace(/=(\s*)("[^"]*"|'[^']*'|\{[^}]*\})/g, (m) => `=${m.slice(1).replace(/\S/g, " ")}`);

/**
 * The prefixes a framework puts in front of an attribute name when the value
 * is an expression rather than a literal: Vue's `:alt` and `v-bind:alt`,
 * Angular's `[alt]` and `[ngSrc]`, Alpine's `x-bind:alt`, and the `@` event
 * shorthand. `<img :alt="caption">` **has** an alt attribute; a reader that
 * only accepts the bare name reports every Vue and Angular image as having no
 * alt at all — which is what this codebase did on two advertised stacks until
 * somebody wrote a `.vue` fixture.
 */
const BOUND_PREFIX = "(?:v-bind:|x-bind:|[:@\\[])";

export interface AttrMatch {
  /** Offset of the match in the attribute chunk, leading space and prefix included. */
  index: number;
  /** Match length, so `index + length` is the offset just past the name. */
  length: number;
  /**
   * The declaration binds an expression, so the attribute is *present* and its
   * value is not in this file. Enough to suppress an absence claim, never
   * enough to grade — the same contract a JSX `{expression}` value has.
   */
  bound: boolean;
}

/**
 * Where `name` is declared in this attribute chunk, or null when it is not.
 * Valueless attributes are real (`<iframe sandbox>`), so the name may be
 * followed by `=`, whitespace, `]` (Angular's binding bracket), the tag's own
 * end, or nothing — but never by a further name character, which is what keeps
 * `nonce` out of `nonce-value`.
 */
export function findAttr(attrs: string, name: string): AttrMatch | null {
  const re = new RegExp(`(?:^|\\s)(${BOUND_PREFIX})?${name}(?=[\\s=/>\\]]|$)`, "i");
  const m = re.exec(bareAttrs(attrs));
  return m ? { index: m.index, length: m[0].length, bound: m[1] !== undefined } : null;
}

export const hasAttr = (attrs: string, name: string): boolean => findAttr(attrs, name) !== null;

/**
 * The literal source text of an attribute's declared value, static or bound.
 * `bound` on the `AttrMatch` means *this codebase cannot know what the
 * binding evaluates to* — it does not mean the value is invisible. Vue's
 * `:class="['a','b']"` and Angular's `[class]="'a b'"` still write that value
 * as ordinary text between quotes; a caller whose rule only cares about
 * literal substrings the file actually contains (class-like tokens, say) can
 * read it the same way a static value is read. A caller that needs the
 * *evaluated* value (an `alt` string, a `width` number) still must not call
 * this on a bound match — that is a different claim, and `at.bound` is the
 * flag that guards it; this function only reports what character follow `=`.
 *
 * Angular writes a bound name inside its own brackets (`[class]`), so a bound
 * `AttrMatch`'s offset there lands just before the closing `]` rather than
 * directly before `=`; that one stray character is skipped so the same value
 * pattern matches every bound form and the unbound one alike.
 *
 * Returns `null` when no value follows — a valueless attribute (`<iframe
 * sandbox>`) or a value shape this reader does not parse (a bare `{expr}`
 * with no template-literal backticks inside).
 */
export function attrValueText(attrs: string, at: AttrMatch): string | null {
  const rest = attrs.slice(at.index + at.length).replace(/^\]/, "");
  const m = /^\s*=\s*("([^"]*)"|'([^']*)'|\{`([^`]*)`\})/.exec(rest);
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
}

/**
 * A declaration that may be carrying attributes this scan cannot enumerate:
 * JSX's `{...props}` and Vue's object form of `v-bind="attrs"` — the same
 * thing said twice in two languages. Read from the blanked copy, because a
 * spread written inside a string value is text, not a forwarded attribute.
 */
export const hasSpread = (attrs: string): boolean => {
  const bare = bareAttrs(attrs);
  return /\{\s*\.\.\./.test(bare) || /(?:^|\s)(?:v-bind|x-bind)\s*=/i.test(bare);
};

/** `[start, end)` of one element's content, `end` exclusive of its own closing tag. */
export function elementSpan(masked: string, tag: Tag): [number, number] | null {
  if (tag.selfClosing) return null;
  const name = tag.name.toLowerCase();
  const closeIdx = masked.toLowerCase().indexOf(`</${name}`, tag.end);
  return [tag.end, closeIdx === -1 ? masked.length : closeIdx];
}

/**
 * Blanks every tag's own markup to spaces, length-preserving, leaving only
 * visible text at its original offsets — an attribute like `data-cta="Get
 * Started"` or a class named `learn-more` never survives into this string,
 * so copy rules can only ever match what a reader would actually see.
 */
export function flattenTags(src: string): string {
  return src.replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, " "));
}
