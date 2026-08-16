import { describe, it, expect } from "vitest";
import { maskComments, findAttr, hasAttr, hasSpread, bareAttrs, attrValueText } from "../dist/scan.js";

// `maskComments` is length-preserving by construction — every branch either
// copies a character through unchanged or replaces it with a same-width
// space/newline — and both `security.ts` and `generic.ts` depend on that
// invariant: they consult the masked copy to decide *whether* something is
// live code, then slice the *original, unmasked* source at the same offsets
// to report it. An off-by-one in any branch would silently misalign every
// finding's reported position. Nothing pinned this before now, though a
// reviewer verified it by reading the implementation once.
describe("maskComments — length-preserving for every syntax it handles", () => {
  it("HTML comments <!-- -->", () => {
    const source = `<div>\n<!-- a comment\nspanning lines --><p>text</p>\n</div>`;
    expect(maskComments(source, "page.html").length).toBe(source.length);
  });

  it("line comments //, in a JS-like file", () => {
    const source = `const x = 1; // trailing comment\n// a whole-line comment\nconst y = 2;`;
    expect(maskComments(source, "app.ts").length).toBe(source.length);
  });

  it("block comments /* */, in a JS-like file", () => {
    const source = `const x = /* inline */ 1;\n/*\n * a multi-line\n * block comment\n */\nconst y = 2;`;
    expect(maskComments(source, "app.js").length).toBe(source.length);
  });

  it("line and block comments in a .swift file", () => {
    const source = `import Foundation // trailing comment\n/* a block comment */\nlet x = 1\n`;
    expect(maskComments(source, "App.swift").length).toBe(source.length);
  });

  it("a nested Swift block comment", () => {
    const source = "/* outer /* inner */\nimport AppKit\n*/\n";
    expect(maskComments(source, "App.swift").length).toBe(source.length);
  });

  it("JSX comments {/* */}", () => {
    // `{` and `}` are not part of the comment syntax the masker recognises —
    // it is the `/* */` inside them that gets blanked — so this exercises the
    // same block-comment branch on a .jsx path.
    const source = `<div>\n  {/* a JSX comment */}\n  <span>hi</span>\n</div>`;
    expect(maskComments(source, "component.jsx").length).toBe(source.length);
  });

  it("# comments in .toml", () => {
    const source = `# top-level comment\n[headers]\nvalue = "x" # trailing comment\n`;
    expect(maskComments(source, "netlify.toml").length).toBe(source.length);
  });

  it("# comments in _headers", () => {
    const source = `# every route\n/*\n  X-Content-Type-Options: nosniff\n`;
    expect(maskComments(source, "_headers").length).toBe(source.length);
  });

  it(".astro frontmatter: both halves preserve length independently, and so does their concatenation", () => {
    const frontmatter = `---\nconst title = "Home"; // a comment\n/* block */\nconst n = 1;\n---\n`;
    const template = `<h1>{title}</h1>\n<!-- a template comment -->\n<p>body</p>\n`;
    const source = frontmatter + template;

    const closeIdx = source.indexOf("\n---", 3) + 1; // start of the closing fence line
    const frontHalf = source.slice(0, closeIdx);
    const templateHalf = source.slice(closeIdx);

    const maskedFront = maskComments(frontHalf, "frontmatter.ts");
    const maskedTemplate = maskComments(templateHalf, "template.html");
    expect(maskedFront.length).toBe(frontHalf.length);
    expect(maskedTemplate.length).toBe(templateHalf.length);

    const masked = maskComments(source, "page.astro");
    expect(masked.length).toBe(source.length);
    // The two independently-masked halves concatenate back to the same
    // length as masking the whole file in one call — the property the
    // recursive split relies on to keep offsets valid across the fence.
    expect(masked.length).toBe(maskedFront.length + maskedTemplate.length);
  });

  it(".astro with no closing fence falls back to masking the whole thing as template.html", () => {
    const source = `---\nconst title = "Home"; // unterminated frontmatter\n<h1>{title}</h1>\n`;
    expect(maskComments(source, "broken.astro").length).toBe(source.length);
  });

  it("mixed syntaxes in one file stay length-preserving together", () => {
    const source = [
      `<!-- html comment -->`,
      `<script>`,
      `  const s = "// not a comment inside a string";`,
      `  /* a block comment */`,
      `  const t = \`template // still not a comment\`;`,
      `</script>`,
    ].join("\n");
    expect(maskComments(source, "page.vue").length).toBe(source.length);
  });
});

// `.swift` is the one `isJsLike` extension where a block comment can legally
// nest — `/* /* */ */` is one comment in Swift, closed only by the outer
// close, and nesting inside an existing comment is the idiom Swift
// developers reach for to comment out a region that already has one. A
// masker that stops at the first close would leave the inner content live,
// which is exactly how a commented-out `import` decided a platform verdict
// before this was fixed (see `appleconfig.test.ts`). Every other `isJsLike`
// extension keeps first-close semantics, since C-family nesting isn't legal
// syntax there.
describe("maskComments — Swift block comments nest, unlike every other isJsLike language", () => {
  it("closes only at the outer close when a block comment nests one level", () => {
    const source = "/* outer /* inner */\nimport AppKit\n*/\n";
    const masked = maskComments(source, "App.swift");
    expect(masked).not.toContain("import AppKit");
  });

  it("closes only at the outer close on one line, too", () => {
    const source = "/* a /* b */ import AppKit */";
    const masked = maskComments(source, "App.swift");
    expect(masked).not.toContain("import AppKit");
  });

  it("still masks a plain, non-nested Swift block comment, and leaves live code after it alone", () => {
    const source = "/* import AppKit */\nimport UIKit\n";
    const masked = maskComments(source, "App.swift");
    expect(masked).not.toContain("import AppKit");
    expect(masked).toContain("import UIKit");
  });

  it("does NOT depth-track a non-Swift JS-like file — closes at the first close, same as before this fix", () => {
    const source = "/* /* */ still code */";
    const masked = maskComments(source, "app.ts");
    expect(masked).toContain("still code");
  });

  it("case-insensitive path match: APP.SWIFT and App.Swift are .swift paths too", () => {
    const source = "/* outer /* inner */\nimport AppKit\n*/\n";
    expect(maskComments(source, "APP.SWIFT")).not.toContain("import AppKit");
    expect(maskComments(source, "App.Swift")).not.toContain("import AppKit");
  });

  // A prior version of this fix tracked nesting depth with no fallback: a
  // block comment that never balances was masked all the way to the end of
  // the file. Quote tracking resets at every newline, so text inside a
  // `"""`-delimited multi-line string is only protected from being read as
  // code on the line it opens on — a later line inside such a string that
  // merely *looks* like block-comment markers (a glob pattern in a doc
  // string, for instance) can leave the nesting counter one open short of
  // balanced with no more closing markers anywhere in the file. A
  // six-scanner differential against real Swift source reproduced exactly
  // this: a live `import AppKit` after such a string went from a correct
  // "macos" verdict to a fabricated `platform: null`. This is now fixed by
  // falling back to the position a flat, non-nesting scan would find —
  // this pins the fixed behaviour, not the old (broken) one.
  it("does not let an unbalanced comment-opening-looking substring inside a Swift multi-line string swallow real code after it", () => {
    const source = 'let doc = """\nglob: /* a /* b */ c\n"""\nimport AppKit\n';
    const masked = maskComments(source, "App.swift");
    expect(masked).toContain("import AppKit");
  });

  it("known gap, not fixed here: string-internal markers that balance without crossing a triple-quote still mask wider than a flat scan would, though not past the string in this instance", () => {
    // Same per-line quote-reset blind spot as above, but here the
    // string-internal text happens to look like a fully *balanced* nested
    // comment that never touches the string's own `"""`, so
    // `findNestedBlockCommentEnd` treats it as a real nested comment and
    // masks the whole span — wider than a flat first-close scan would.
    // This does not reach the real `import` two lines later, but that is
    // this specific input's shape, not a general "stays inside the
    // string" guarantee — see the next test, where a balanced span *does*
    // cross a `"""` and is caught by the other fallback instead.
    const source = 'let doc = """\n/* a /* b */ c */\n"""\nimport AppKit\n';
    const masked = maskComments(source, "App.swift");
    expect(masked).toContain("import AppKit");
  });

  // The nesting counter can also balance by counting markers that sit on
  // *opposite sides* of a multi-line string's own `"""` boundary — nothing
  // in the depth count itself knows a string closed in between. Before the
  // second fallback existed, this masked everything from the first marker
  // through the far side's matching one, swallowing a live `import` in
  // between and fabricating a `null` platform verdict on a file that
  // compiles and genuinely targets macOS. A six-scanner differential
  // against real Swift source is what surfaced this: the first fallback
  // (added for the case where nesting never balances at all) did not cover
  // it, because here nesting balances just fine — the count is only wrong
  // about what it's counting.
  it("does not let markers that balance across a triple-quote string boundary swallow the real code between them", () => {
    const source = 'let a = """\n/* /*\n*/\n"""\nimport AppKit\nlet b = """\n*/\n"""\n';
    const masked = maskComments(source, "App.swift");
    expect(masked).toContain("import AppKit");
  });

  it("a genuinely unterminated Swift block comment (no closing marker anywhere) still masks to the end of the file, same as every other isJsLike extension", () => {
    const source = "/* never closes\nimport AppKit\n";
    const masked = maskComments(source, "App.swift");
    expect(masked).not.toContain("import AppKit");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The attribute reader.
//
// This lived privately in perf.ts, and separately (in a weaker form) in
// security.ts, seo.ts, generic.ts and lint.ts. The same defect was found and
// fixed in three of them while the other two kept shipping it, because the
// question asked each time was "which modules were listed?" rather than "which
// modules read attributes?". These are the properties every scanner now gets
// from one place.
// ─────────────────────────────────────────────────────────────────────────────
describe("findAttr — a name is only a name where a name can appear", () => {
  it("blanks a quoted value, so a name inside one is not an attribute", () => {
    expect(hasAttr(` src="hero.jpg" title="see alt=foo"`, "alt")).toBe(false);
    expect(hasAttr(` type="text" placeholder="e.g. id=1234"`, "id")).toBe(false);
    expect(hasAttr(` data-example='class="from-indigo-500"'`, "class")).toBe(false);
  });

  it("does not match inside a longer name, in either direction", () => {
    expect(hasAttr(` data-alt="x"`, "alt")).toBe(false);
    expect(hasAttr(` data-nonce="later"`, "nonce")).toBe(false);
    expect(hasAttr(` nonce-value="x"`, "nonce")).toBe(false);
  });

  it("finds a plain name, a valueless one, and one after the previous value", () => {
    expect(hasAttr(` src="a.png" alt="A cat"`, "alt")).toBe(true);
    expect(hasAttr(` sandbox`, "sandbox")).toBe(true);
    expect(hasAttr(` class="x"alt=""`, "alt")).toBe(true);
  });

  it("finds every framework binding form, and marks the value unreadable", () => {
    for (const attrs of [` :alt="caption"`, ` v-bind:alt="caption"`, ` x-bind:alt="caption"`, ` [alt]="caption"`]) {
      const at = findAttr(attrs, "alt");
      expect(at, attrs).not.toBeNull();
      expect(at!.bound, attrs).toBe(true);
    }
    // A bound value names a variable; reading it as a literal would grade a
    // string that is not in the file.
    expect(findAttr(` :loading="lazy"`, "loading")!.bound).toBe(true);
  });

  it("reads Angular's ngSrc binding without confusing it for src", () => {
    expect(hasAttr(` [ngSrc]="s" [alt]="c"`, "alt")).toBe(true);
    expect(hasAttr(` [ngSrc]="s"`, "src")).toBe(false);
  });

  it("treats v-bind=\"…\" and {...spread} alike — an unreadable declaration", () => {
    expect(hasSpread(` {...props}`)).toBe(true);
    expect(hasSpread(` v-bind="imgAttrs"`)).toBe(true);
    expect(hasSpread(` x-bind="attrs"`)).toBe(true);
    // …but a spread written inside someone else's value is text.
    expect(hasSpread(` alt="we pass {...props} down"`)).toBe(false);
    // and `v-bind:alt` is a bound attribute, not an object spread.
    expect(hasSpread(` v-bind:alt="caption"`)).toBe(false);
  });

  it("blanking is length-preserving, so an offset from the bare copy reads the real one", () => {
    const attrs = ` rel="canonical" href="https://example.com/x"`;
    expect(bareAttrs(attrs).length).toBe(attrs.length);
    const at = findAttr(attrs, "href")!;
    expect(attrs.slice(at.index + at.length)).toBe(`="https://example.com/x"`);
  });
});

// `attrValueText` reads an attribute's literal source text whether or not
// `findAttr` marked it bound. `bound` guards a claim about what a binding
// *evaluates to*; it says nothing about whether the characters after `=` are
// readable, and for every framework's bound syntax they are.
describe("attrValueText — a bound value's literal text is still text", () => {
  it("reads a static value, same as an unbound caller expects", () => {
    expect(attrValueText(` class="a b c"`, findAttr(` class="a b c"`, "class")!)).toBe("a b c");
  });

  it("reads Vue's :class binding (colon prefix, no bracket to skip)", () => {
    const attrs = ` :class="['a','b']"`;
    expect(attrValueText(attrs, findAttr(attrs, "class")!)).toBe("['a','b']");
  });

  it("reads v-bind:class, the unabbreviated prefix", () => {
    const attrs = ` v-bind:class="'a b'"`;
    expect(attrValueText(attrs, findAttr(attrs, "class")!)).toBe("'a b'");
  });

  it("reads Angular's [class] binding, skipping the closing bracket before the =", () => {
    const attrs = ` [class]="'a b'"`;
    const at = findAttr(attrs, "class")!;
    expect(at.bound).toBe(true);
    // Regression pin: at.index + at.length lands on the "]", not the "=" —
    // attrValueText has to step over it, or the value regex never matches.
    expect(attrs.slice(at.index + at.length)).toBe(`]="'a b'"`);
    expect(attrValueText(attrs, at)).toBe("'a b'");
  });

  it("returns null for a valueless attribute", () => {
    expect(attrValueText(` sandbox`, findAttr(` sandbox`, "sandbox")!)).toBeNull();
  });
});
