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
 * Finds where a Swift block comment closes, counting a nested opening
 * marker met before the next closing marker as opening a comment of its
 * own rather than treating that first closing marker as the end. `from` is
 * the index right after the comment's own opening marker (depth already at
 * 1).
 *
 * Two fallbacks, both routing to the position a *flat*, non-nesting scan
 * would have found instead — the very first closing marker after `from`,
 * or the end of the source if there is none at all — because depth
 * tracking on its own is monotonic toward masking *more*, never less, than
 * a flat scan would, and `.swift`'s per-line-reset quote tracking (see
 * `maskComments`'s own doc comment) means a `"""`-delimited multi-line
 * string can contain comment-marker-looking text this function has no way
 * to know is inside a string:
 *
 * 1. **Never balances** — depth never returns to zero before the source
 *    runs out of closing markers. Left untreated this masks to the end of
 *    the file on a source with a stray opening marker inside a multi-line
 *    string and nothing after it that happens to close it — a fabricated
 *    absence on a file with nothing wrong with it.
 * 2. **Balances, but only by crossing a `"""`** — the depth-tracking loop
 *    does reach zero, but the matched span contains a `"""`, meaning the
 *    markers that balanced it may sit on either side of a string boundary
 *    and are not really one comment. Left untreated, real code right after
 *    the string can get masked away as if it were still inside the
 *    comment — see the over-masking paragraph on `maskComments`'s own doc
 *    comment for the reproduction that first found this.
 *
 * Both fallbacks keep the nesting win on every comment that actually
 * balances without crossing a string boundary. Neither is a general fix for
 * the quote tracker's own approximations — see the residual paragraph on
 * `maskComments`'s doc comment for the mechanism this function's fallbacks
 * do *not* cover, and why chasing it here would trade one rare failure for
 * a common one.
 *
 * Kept as its own function, ahead of `maskComments`'s own doc comment
 * below, so that doc comment stays attached to the function it documents —
 * a doc-comment block always describes whichever declaration follows it
 * immediately.
 */
function findNestedBlockCommentEnd(source: string, from: number): number {
  const n = source.length;
  const firstClose = source.indexOf("*/", from);
  const nonNestingStop = firstClose === -1 ? n : firstClose + 2;

  let depth = 1;
  let i = from;
  while (depth > 0) {
    const nextClose = source.indexOf("*/", i);
    if (nextClose === -1) return nonNestingStop; // never balances — fall back, do not consume to EOF
    const nextOpen = source.indexOf("/*", i);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 2;
    } else {
      depth--;
      i = nextClose + 2;
    }
  }
  // Depth tracking is only trustworthy while the span contains no `"""`.
  // Quote tracking resets at every newline, so a multi-line string's contents
  // are scanned as code; if the balanced span crossed one, the markers that
  // balanced it may be string text, not comment syntax. Fall back to the flat
  // answer — the same bound every other isJsLike extension already lives with.
  return source.slice(from, i).includes('"""') ? nonNestingStop : i;
}

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
 *     anything" guarantee an Apple audit rule gets for free elsewhere. The
 *     match, like every extension test in this function, is
 *     case-insensitive: `App.SWIFT` and `APP.Swift` are `.swift` paths for
 *     this purpose exactly as `App.swift` is; only the trailing extension
 *     itself has to be spelled `swift` in some case, nothing about the rest
 *     of the path matters.
 *     Unlike JS, Swift block comments **nest**: a block comment opened
 *     inside another is closed by its own matching close, not by the first
 *     closing marker the scanner meets, and nesting is exactly the idiom
 *     Swift developers reach for to comment out a region that already
 *     contains a comment. A `.swift` path routes block comments through
 *     `findNestedBlockCommentEnd`, which counts opening markers against
 *     closing ones rather than stopping at the first close; every other
 *     `isJsLike` extension keeps the original first-close behaviour, since
 *     C-family nesting isn't legal syntax there and counting nested markers
 *     in, say, a doc comment that itself displays a code example would be
 *     the wrong answer for those languages.
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
 * (no `'`-delimited literal exists in Swift; raw (`#"..."#`) string forms
 * are out of scope) — the existing approximation, not a Swift-specific one.
 *
 * **A residual over-masking risk in `.swift` source, deliberately left
 * unhandled rather than chased through a fourth special case, with the
 * bound stated precisely enough to say which mechanism it covers and which
 * it does not — the distinction that matters here, because a bound that
 * merely survived every case someone tried is not the same thing as a
 * bound proven from the code, and this module has now shipped the former
 * mislabelled as the latter more than once.**
 *
 * What `findNestedBlockCommentEnd`'s two fallbacks (see its own doc
 * comment) actually close, provably: a balanced nesting count that only
 * balances by crossing a `"""` multi-line string's own boundary. That is
 * proven directly from the fallback condition — the only way a balanced
 * span could extend past a string's closing `"""` into real code after it
 * is for the span to contain the `"""` characters themselves, which is
 * exactly what routes it to the flat, non-nesting answer instead. Pinned
 * by name in `tests/scan.test.ts`, including the case a six-scanner
 * differential against real Swift source first reproduced as a fabricated
 * `null` platform verdict on a file that compiles and genuinely targets
 * macOS.
 *
 * What it does *not* close: the quote tracker itself is a per-line,
 * per-character toggle, not a real tokenizer, and does not understand
 * Swift string interpolation (`\(...)`). A nested, unescaped `"` inside an
 * interpolation — `"a\(f("open /*")) still"` — closes what the tracker
 * believes is the outer string right there, exposing `open /*` as live
 * code even though it is still, to the actual Swift compiler, inside a
 * string literal. No `"""` is involved at all, so `findNestedBlockCommentEnd`'s
 * fallback has no signal to catch it on. From that spurious opening the
 * depth scan can walk into a later *genuine*, well-formed block comment,
 * count it as real nesting, and keep going past whatever live code sits
 * inside — including an `import` — until a second spurious closer
 * (produced by the same quote-tracker mishandling, e.g. inside a later
 * interpolated string containing the same close-marker text as a plain
 * quoted literal) balances the count. Pinned by name in
 * `tests/scan.test.ts` as a known, unfixed gap: the assertion there
 * records what this scanner currently does, not what it should do.
 *
 * The shape is the same as the pre-existing gap documented on
 * `stripNestedContainers` in `appleconfig.ts`: more than one thing has to
 * line up — a spurious quote-tracker exit *and* a later genuine comment
 * for the exposed scan to walk into — and it is a known limit, not one
 * either function guards against. It is not fixed here, or by another
 * targeted check, because it is not really a comment-masking defect at
 * all: it is the quote tracker's per-line, per-character approximation of
 * string literals leaking into whatever reads its output next, and that
 * predates `.swift` entirely (the same approximation is what already made
 * a multi-line template literal out of scope for JS, noted above). Nesting
 * did not create this gap — it only gives a spurious opening somewhere to
 * reach, the same way the `"""` case gave one before its own fallback.
 * Closing it for real needs the file read top-to-bottom as one
 * string-aware, interpolation-aware tokenizing pass instead of the current
 * per-character scan with per-line quote reset; a further special case
 * would only trade this rare, compound failure for breaking the common,
 * legitimate one — a comment genuinely commenting out code that itself
 * contains string literals — which is not a trade worth making.
 * `appleconfig.ts` is the caller this can reach today, through arbitrary
 * user Swift source — noted on `inferPlatform`'s own doc comment as well,
 * since that is where a caller of *this* function would look first.
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
  const isJsLike = /\.(?:jsx?|tsx?|mjs|cjs|mts|cts|vue|svelte|swift|kt|kts)$/i.test(path);
  const isHashComment = isHeadersFile || /\.toml$/i.test(path);
  const isSwift = /\.swift$/i.test(path);

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
      let stop: number;
      if (isSwift) {
        stop = findNestedBlockCommentEnd(source, i + 2);
      } else {
        const end = source.indexOf("*/", i + 2);
        stop = end === -1 ? n : end + 2;
      }
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
