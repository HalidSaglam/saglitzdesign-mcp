import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { genericVisualRules, genericCopyRules, genericScore, genericReport, isBrandSurface, RULE_WEIGHTS } from "../dist/generic.js";
import { loadKnowledge, findDoc } from "../dist/knowledge.js";
import { seoRules } from "../dist/seo.js";

const ids = (code: string, filename?: string) =>
  genericVisualRules(code, filename).map((f) => f.rule).sort();

const copyIds = (code: string) => genericCopyRules(code).map((f) => f.rule);

describe("visual rules — fire when they should", () => {
  it("flags an indigo-to-violet Tailwind gradient", () => {
    expect(ids(`<div class="bg-gradient-to-r from-indigo-500 to-purple-600">`)).toContain("ai-default-gradient");
  });

  it("flags the same gradient written as hex in CSS", () => {
    expect(ids(`.hero { background: linear-gradient(135deg, #6366f1, #a855f7); }`)).toContain("ai-default-gradient");
  });

  it("flags it written in OKLCH, which is how Tailwind v4 actually ships the palette", () => {
    expect(ids(`.hero { background: linear-gradient(135deg, oklch(0.585 0.233 277.117), oklch(0.627 0.265 303.9)); }`)).toContain("ai-default-gradient");
  });

  // CSS writes an OKLCH lightness as a number *or* a percentage, and the rule
  // accepted only the number — while tailwindcss.com/docs/colors publishes and
  // copies the percentage form, and so does this repo's own
  // ai-default-aesthetic table. The tool could not match the values its own
  // cited document tabulates.
  //
  // Read from that document rather than retyped from it, so the claim and the
  // rule cannot drift apart silently: if the table is ever restated in another
  // notation, this fails instead of quietly becoming untrue again.
  describe("the OKLCH values the cited document tabulates", () => {
    const doc = readFileSync(join(__dirname, "..", "knowledge", "craft", "ai-default-aesthetic.md"), "utf8");
    const rows = [...doc.matchAll(/\|\s*`((?:indigo|violet|purple)-\d{3})`\s*\|\s*`(oklch\([^`]*\))`/g)]
      .map((m) => ({ token: m[1], oklch: m[2] }));

    it("finds the table, so the cases below are not vacuous", () => {
      expect(rows.length).toBeGreaterThanOrEqual(5);
      expect(rows.some((r) => /%/.test(r.oklch))).toBe(true);
    });

    it.each(rows.flatMap((a, i) => rows.slice(i + 1).map((b) => [`${a.token} → ${b.token}`, a.oklch, b.oklch])))(
      "flags a gradient built from %s", (_name, from, to) => {
        expect(ids(`.hero { background: linear-gradient(135deg, ${from}, ${to}); }`))
          .toContain("ai-default-gradient");
      });
  });

  it("flags the percentage form mixed with the decimal one in a single gradient", () => {
    const code = `.hero { background: linear-gradient(135deg, oklch(0.585 0.233 277.117), oklch(55.8% 0.288 302.321)); }`;
    expect(ids(code)).toContain("ai-default-gradient");
  });

  it("flags the v4 direction utility as readily as the v3 one", () => {
    expect(ids(`<div class="bg-linear-to-r from-indigo-500 to-violet-600">`)).toContain("ai-default-gradient");
  });

  it("flags blue reaching into the core region", () => {
    expect(ids(`<div class="bg-gradient-to-r from-blue-500 to-purple-600">`)).toContain("ai-default-gradient");
  });

  it("flags blue-600 to violet-500 the same way", () => {
    expect(ids(`<div class="bg-gradient-to-r from-blue-600 to-violet-500">`)).toContain("ai-default-gradient");
  });

  it("flags Inter as the sole family on a brand surface", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).toContain("default-ui-font");
  });

  it("flags two defaults declared together — Inter, Roboto is not a custom face", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,Roboto,sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).toContain("default-ui-font");
  });

  // Widening the capture to the whole declaration meant the last entry stopped
  // being a clean font name whenever anything rode along with it, and
  // FALLBACK_FAMILY_RE is whole-entry equality — so `sans-serif !important` was
  // not `sans-serif`, read as a face someone chose, and silenced the rule. One
  // root cause, four shapes, all of which the rule flagged correctly before the
  // capture was widened and none of which any fixture covered.
  //
  // The first two also pin what the `<`/`>` guard does not do: it bounds an
  // over-read to one tag, but inside that tag `"[^"<>]*"` still pairs the
  // `style` attribute's closing quote with the next attribute's opening quote.
  it.each([
    ["an inline style followed by a class attribute", `<h1 style="font-family:Inter, sans-serif" class="text-5xl">Ship faster</h1>`],
    ["an inline style followed by two more attributes", `<h1 style="font-family:Inter,sans-serif" id="a" class="b">Ship faster</h1>`],
    ["a declaration marked !important", `<h1>Ship faster</h1><style>h1{font-family:Inter, sans-serif !important;}</style>`],
    ["a declaration with a trailing CSS comment", `<h1>Ship faster</h1><style>h1{font-family:Inter, sans-serif /* fallback */;}</style>`],
  ])("flags Inter as the sole family despite %s", (_name, markup) => {
    const code = `${markup}<a href="/signup">Get started</a>`;
    expect(ids(code, "app/(marketing)/page.html")).toContain("default-ui-font");
  });

  // The message states what the firing condition actually proves — that every
  // declared family is a default or a fallback — rather than naming one face as
  // "the only declared family". Nothing here can identify the chosen face:
  // position cannot, because `Inter, 'Söhne Breit'` has to stay silent. But the
  // rule being unable to identify a face never obliged the message to name one.
  //
  // Naming one was wrong where it showed: on the plain system stack the only
  // entry that is not a fallback keyword is Roboto, which is the Android
  // fallback leg and nobody's decision.
  it("states a set fact rather than attributing the choice to one face", () => {
    const stack = (s: string) => `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:${s}}</style>`;
    const messageFor = (s: string) =>
      genericVisualRules(stack(s), "app/(marketing)/page.html").find((f) => f.rule === "default-ui-font")?.message ?? "";

    const systemStack = messageFor(`system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`);
    expect(systemStack).toContain("Every family declared");
    expect(systemStack).not.toMatch(/Roboto is the only declared family/);
    // It still names which defaults are in the set — that part is a fact.
    expect(systemStack).toContain("(Roboto)");
    expect(messageFor(`Inter,sans-serif`)).toContain("(Inter)");
    expect(messageFor(`Inter,Roboto,sans-serif`)).toContain("(Inter, Roboto)");
  });

  it("flags an emoji standing in for an icon in a heading", () => {
    expect(ids(`<h3>🚀 Lightning fast</h3>`)).toContain("emoji-as-icon");
  });

  // The mirror of the changelog misses below: truncating the heading body at
  // its first child element put a wrapped emoji outside the text that was
  // read, so a real instance of the pattern went silent.
  it("flags an emoji standing in for an icon even when it is wrapped in a span", () => {
    expect(ids(`<h2><span>🚀</span> Fast</h2>`)).toContain("emoji-as-icon");
  });

  it("flags the stock card chrome triad", () => {
    const card = (n: string) => `<div class="rounded-2xl shadow-lg border p-${n}"><h3>${n}</h3></div>`;
    expect(ids(`${card("4")}${card("6")}${card("8")}`)).toContain("stock-card-chrome");
  });

  it("flags an eyebrow label over every heading", () => {
    const block = `<p class="text-xs uppercase tracking-widest">Features</p><h2>Fast</h2>`;
    expect(ids(block + block + block)).toContain("eyebrow-over-every-heading");
  });

  it("flags gradient text", () => {
    expect(ids(`<span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">99%</span>`)).toContain("gradient-text");
  });

  it("flags stock glassmorphism on dark", () => {
    expect(ids(`<div class="backdrop-blur bg-white/10 border border-white/10">`)).toContain("stock-glass-on-dark");
  });
});

describe("visual rules — stay quiet when they should", () => {
  it("accepts a deliberate non-default gradient", () => {
    expect(ids(`<div class="bg-gradient-to-r from-amber-500 to-rose-700">`)).not.toContain("ai-default-gradient");
  });

  it("accepts a single stop from the region — one colour is a choice, not the stock pair", () => {
    expect(ids(`<div class="bg-indigo-600 text-white">`)).not.toContain("ai-default-gradient");
  });

  it("accepts blue reaching only to cyan — two steps out, never the measured pair", () => {
    expect(ids(`<div class="bg-gradient-to-r from-blue-500 to-cyan-500">`)).not.toContain("ai-default-gradient");
  });

  it("accepts a blue-on-blue gradient — a colour choice, not the stock pair", () => {
    expect(ids(`<div class="bg-gradient-to-r from-sky-400 to-blue-600">`)).not.toContain("ai-default-gradient");
  });

  it("accepts an OKLCH gradient outside the blue-violet band", () => {
    expect(ids(`.hero { background: linear-gradient(135deg, oklch(0.72 0.19 45), oklch(0.55 0.21 25)); }`)).not.toContain("ai-default-gradient");
  });

  // Accepting the percentage lightness form must not widen anything else: the
  // hue band and the chroma floor are still what decide, in either notation.
  it("accepts a percentage-form OKLCH gradient outside the blue-violet band", () => {
    expect(ids(`.hero { background: linear-gradient(135deg, oklch(72% 0.19 45), oklch(55% 0.21 25)); }`)).not.toContain("ai-default-gradient");
  });

  it("accepts percentage-form neutrals in the band whose chroma is near zero", () => {
    // Tailwind's own `zinc`/`gray` steps sit at these hues with 0.006 chroma —
    // in the band, and nothing to do with the stock accent.
    expect(ids(`.hero { background: linear-gradient(135deg, oklch(21% 0.006 285.885), oklch(27.4% 0.006 286.033)); }`)).not.toContain("ai-default-gradient");
  });

  it("accepts Inter in application UI", () => {
    const code = `<table><tr><td>row</td></tr></table><style>body{font-family:Inter,sans-serif}</style>`;
    expect(ids(code, "app/dashboard/analytics/page.tsx")).not.toContain("default-ui-font");
  });

  it("accepts Inter paired with a display face on a brand surface", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>h1{font-family:"Instrument Serif"}body{font-family:Inter}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).not.toContain("default-ui-font");
  });

  // The mixed stack: an unquoted default followed by a quoted display face.
  // The declaration-capturing regex stopped at the first quote, so the value
  // was truncated to `Inter` and the rule told a developer who had already
  // paired Inter with a display face that Inter was the only family declared.
  // Both quote styles, and the mirror order, which missed for the same reason
  // from the other side.
  it("accepts Inter paired with a single-quoted display face in one stack", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,'Söhne Breit',sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).not.toContain("default-ui-font");
  });

  it("accepts Inter paired with a double-quoted display face in one stack", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,"PP Neue Montreal",sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).not.toContain("default-ui-font");
  });

  it("accepts the display face declared before the default", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:'Söhne Breit',Inter,sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).not.toContain("default-ui-font");
  });

  // The "another family is declared" test was `[A-Z][A-Za-z0-9 ]{2,}` —
  // Latin-only — so a face written in any other script was invisible to it and
  // the rule reported Inter as the sole family on a page that had paired it.
  it("accepts a Japanese face beside Inter", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,メイリオ,sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).not.toContain("default-ui-font");
  });

  it("accepts a Cyrillic face beside Inter", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,Пантон,sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).not.toContain("default-ui-font");
  });

  // The other direction: widening the capture must not turn the rule off.
  // A stack of nothing but the default and the system fallbacks is still the
  // finding, however many entries it lists.
  it("still flags Inter followed only by the system fallback stack", () => {
    const code = `<h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}</style>`;
    expect(ids(code, "app/(marketing)/page.tsx")).toContain("default-ui-font");
  });

  it("accepts an emoji in body copy rather than as an icon", () => {
    expect(ids(`<p>We shipped it 🚀 last Tuesday after a long month.</p>`)).not.toContain("emoji-as-icon");
  });

  it("accepts an emoji in a changelog heading that carries a version string", () => {
    expect(ids(`<h3>v2.4.0 🚀 Faster builds</h3>`)).not.toContain("emoji-as-icon");
  });

  it("accepts an emoji in a changelog heading with no version number at all", () => {
    expect(ids(`<h2>✨ New in this release</h2>`)).not.toContain("emoji-as-icon");
  });

  // The heading body was truncated at its first child element, which split the
  // changelog exception down the middle: the emoji survived and the version
  // string that excuses it did not. A linked or `<code>`-wrapped version is
  // the normal shape of a changelog heading.
  it("accepts a changelog heading whose version string is wrapped in <code>", () => {
    expect(ids(`<h2>🚀 <code>v2.4.0</code> — Faster builds</h2>`)).not.toContain("emoji-as-icon");
  });

  it("accepts a changelog heading whose stock phrase is inside a permalink anchor", () => {
    expect(ids(`<h2>✨ <a href="#v240">What's new</a></h2>`)).not.toContain("emoji-as-icon");
  });

  it("accepts a changelog heading with a bolded version and a trailing tag", () => {
    expect(ids(`<h3>⚡ <strong>v1.2</strong> <span class="tag">beta</span></h3>`)).not.toContain("emoji-as-icon");
  });

  it("accepts a deliberate teal-to-lime gradient with unrelated indigo/purple colours elsewhere in the file", () => {
    const code = `.hero { background: linear-gradient(135deg, #14b8a6, #84cc16); }\n.badge { color: #6366f1; }\n.link:hover { color: #a855f7; }`;
    expect(ids(code)).not.toContain("ai-default-gradient");
  });

  it("accepts gradient-filled text outside the stock indigo/violet/purple region", () => {
    expect(ids(`<span class="bg-gradient-to-r from-teal-400 to-lime-400 bg-clip-text text-transparent">99%</span>`)).not.toContain("gradient-text");
  });

  // teal/lime above never reaches the colour test — GRADIENT_STOP_RE does not
  // match those ramps at all, so the rule short-circuits one step earlier.
  // blue→sky is the case that actually exercises the CORE_RAMPS gate: both
  // ramps are ones the regex collects, and neither is core. Without this,
  // deleting that gate for gradient-text changes real behaviour and no test
  // in this file notices — the fill-gradient rule has the equivalent negative
  // and this one did not.
  it("accepts gradient-filled text in blue and sky, which the stop regex collects but the core set excludes", () => {
    expect(ids(`<span class="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">99%</span>`)).not.toContain("gradient-text");
  });

  // `eyebrow-over-every-heading` counted any tracked-uppercase element that
  // appeared anywhere before a heading as introducing it, because the flag it
  // kept was cleared only by the next heading. These are the two standard
  // recipes that put `text-xs uppercase tracking-*` on an element which is not
  // an eyebrow, and in both the label sits *after* the heading it belongs to.
  it("accepts a settings form whose field labels use the standard label recipe", () => {
    const section = (heading: string, a: string, b: string) => `
      <h2 class="text-lg font-semibold">${heading}</h2>
      <form>
        <label class="text-xs uppercase tracking-wide text-gray-500" for="${a}">${a}</label>
        <input id="${a}">
        <label class="text-xs uppercase tracking-wide text-gray-500" for="${b}">${b}</label>
        <input id="${b}">
      </form>`;
    const code = section("Notifications", "email", "name")
      + section("Billing", "card", "vat")
      + section("Security", "password", "mfa")
      + `<h2 class="text-lg font-semibold">Danger zone</h2>`;
    expect(ids(code)).not.toContain("eyebrow-over-every-heading");
  });

  it("accepts a data table using the standard <th> recipe under each heading", () => {
    const block = (heading: string) => `
      <h2>${heading}</h2>
      <table><thead><tr>
        <th class="text-xs uppercase tracking-wider">Region</th>
        <th class="text-xs uppercase tracking-wider">Bookings</th>
      </tr></thead><tbody><tr><td>EMEA</td><td>4</td></tr></tbody></table>`;
    const code = block("Q3 revenue") + block("Q4 revenue") + block("Q1 forecast") + `<h2>Notes</h2>`;
    expect(ids(code)).not.toContain("eyebrow-over-every-heading");
  });

  // The gap must be read from the original source, not the masked copy —
  // `maskComments` blanks a boundary comment's delimiters along with its text,
  // so the `<` that proves the two are in different sections would vanish.
  it("does not pair a label with a heading across a section-boundary comment", () => {
    const block = `<p class="text-xs uppercase tracking-widest">Section</p><!-- new section --><h2>Fast</h2>`;
    expect(ids(block + block + block)).not.toContain("eyebrow-over-every-heading");
  });

  it("does not pair a label with a heading in a different container", () => {
    const block = `<section><p class="text-xs uppercase tracking-widest">Section</p></section><section><h2>Fast</h2></section>`;
    expect(ids(block + block + block)).not.toContain("eyebrow-over-every-heading");
  });

  it("does not fire on markup inside a comment", () => {
    expect(genericVisualRules(`<!-- <div class="from-indigo-500 to-purple-600"> -->`)).toEqual([]);
  });

  it("returns nothing at all for a distinctive snippet", () => {
    const code = `<h1 style="font-family:'Redaction 35'">Nothing here is stock</h1>`;
    expect(genericVisualRules(code)).toEqual([]);
  });
});

describe("uniform-card-grid was cut — none of these ever fire it", () => {
  // A review built real inputs and found the byte/set-identical-class-string
  // check firing on every one of these. None of them is the "broken feature
  // grid" the rule was trying to name; all five are ordinary, deliberate
  // uses of a consistent design system. The rule id must never appear again.
  it("three identical cards in a grid — the module's own original positive case", () => {
    const card = `<div class="rounded-2xl border p-6 shadow-lg"><h3>A</h3></div>`;
    expect(ids(`<div class="grid grid-cols-3">${card}${card}${card}</div>`)).not.toContain("uniform-card-grid");
  });

  it("three nav links sharing classes, no grid class anywhere in the document", () => {
    const link = `<a class="text-sm text-gray-500 hover:text-gray-900">Item</a>`;
    expect(ids(`<nav>${link}${link}${link}</nav>`)).not.toContain("uniform-card-grid");
  });

  it("three buttons scattered across nav, section and footer sharing a design-system class", () => {
    const btn = `<button class="rounded-md bg-slate-900 px-4 py-2 text-white">Go</button>`;
    const code = `<nav>${btn}</nav><section>${btn}</section><footer>${btn}</footer>`;
    expect(ids(code)).not.toContain("uniform-card-grid");
  });

  it("three identical dashboard KPI tiles", () => {
    const tile = `<div class="rounded-lg border p-4"><p>Revenue</p></div>`;
    expect(ids(`<div class="grid grid-cols-3">${tile}${tile}${tile}</div>`)).not.toContain("uniform-card-grid");
  });

  it("a three-tier pricing table with identical card chrome", () => {
    const plan = `<div class="rounded-2xl border p-8"><h3>Plan</h3></div>`;
    expect(ids(`<div class="grid grid-cols-3">${plan}${plan}${plan}</div>`)).not.toContain("uniform-card-grid");
  });
});

describe("every finding is actionable", () => {
  it("carries a message, a fix and a doc id", () => {
    const findings = genericVisualRules(`<div class="bg-gradient-to-r from-indigo-500 to-purple-600">`);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.message.length).toBeGreaterThan(0);
      expect(f.fix.length).toBeGreaterThan(0);
      expect(f.doc).toBeTruthy();
      expect(f.line).toBeGreaterThan(0);
    }
  });
});

describe("copy rules", () => {
  it("flags a hype opener", () => {
    expect(copyIds(`<h1>Unlock the power of your data</h1>`)).toContain("hype-opener");
  });

  it("flags filler adverbs", () => {
    expect(copyIds(`<p>Seamlessly integrate with your effortlessly modern stack.</p>`)).toContain("filler-adverb");
  });

  it("flags Get Started and Learn More as the only CTAs", () => {
    expect(copyIds(`<a class="btn">Get Started</a><a class="btn">Learn More</a>`)).toContain("generic-cta");
  });

  it("accepts a specific CTA alongside them", () => {
    const code = `<a class="btn">Start a 14-day trial</a><a class="btn">Learn More</a>`;
    expect(copyIds(code)).not.toContain("generic-cta");
  });

  it("accepts concrete product copy", () => {
    const code = `<h1>Deploy a Postgres branch in 400ms</h1><p>Every pull request gets its own database.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not read copy out of a comment", () => {
    expect(copyIds(`<!-- Unlock the power of your data -->`)).toEqual([]);
  });
});

describe("copy rules — stay quiet on real product copy that shares a verb", () => {
  it("accepts a product description that uses a listed verb without the stock construction", () => {
    expect(copyIds(`<h1>Transform any CSV into a chart in one step</h1>`)).toEqual([]);
  });

  it("judged silent: a single hype word describing an actual claim, not the stacked construction", () => {
    // "revolutionary" is on the filler-adverb list, but it appears once. The
    // same fact-based threshold that keeps a changelog entry silent (below)
    // has to apply here too, or the rule is just a keyword match wearing a
    // count as a disguise — so one adverb, anywhere, stays silent, even when
    // the sentence around it reads as a marketing claim.
    expect(copyIds(`<p>Our revolutionary new pricing is simply lower.</p>`)).toEqual([]);
  });

  it("accepts a changelog entry using one filler word — a feature note, not marketing", () => {
    expect(copyIds(`<li>Effortlessly resume interrupted uploads</li>`)).toEqual([]);
  });

  it("accepts a page whose only CTAs are one specific action and one stock label", () => {
    const code = `<a class="btn">Start a 14-day trial</a><a class="btn">Learn More</a>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not flag stock copy quoted in prose as an example of what not to write", () => {
    const code = `<p>Avoid headlines like "Unlock the power of your data" — describe the actual feature instead.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not flag stock copy quoted inside inline code in a documentation page", () => {
    const code = `<p>Don't write <code>"Unlock the power of your data"</code> as a headline.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not read hype-opener or filler-adverb phrases out of a comment", () => {
    const code = `<!-- Unlock the power of your data. Seamlessly integrate with your effortlessly modern stack. -->`;
    expect(copyIds(code)).toEqual([]);
  });
});

describe("copy rules — supercharge matches a construction, not the bare word", () => {
  it("flags the real signal: a short, generic, sentence-final object", () => {
    expect(copyIds(`<h1>Supercharge your workflow</h1>`)).toContain("hype-opener");
  });

  it("accepts a blog title — a specific, named object, not the stock short noun", () => {
    expect(copyIds(`<h2>Supercharge Your Local Dev Loop With Bun</h2>`)).toEqual([]);
  });

  it("accepts an ordinary sentence using the word as a plain verb", () => {
    expect(copyIds(`<p>This laptop's new chip can supercharge video exports.</p>`)).toEqual([]);
  });

  it("accepts the word used as a product name", () => {
    expect(copyIds(`<p>Supercharge is our new CI caching layer.</p>`)).toEqual([]);
  });
});

describe("copy rules — quoted example copy, including CMS-typeset entity quotes", () => {
  it("does not flag stock copy quoted with &ldquo;/&rdquo; entities", () => {
    const code = `<p>Avoid headlines like &ldquo;Unlock the power of your data&rdquo; — describe the actual feature instead.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not flag stock copy quoted with &quot; entities", () => {
    const code = `<p>Avoid headlines like &quot;Unlock the power of your data&quot; — describe the actual feature instead.</p>`;
    expect(copyIds(code)).toEqual([]);
  });
});

describe("copy rules — filler-adverb catches a hero/subhead pair split across elements", () => {
  it("flags a heading and its very next paragraph when each carries one filler adverb", () => {
    const code = `<h1>Seamlessly manage your team</h1><p>Built for cutting-edge teams who move fast.</p>`;
    expect(copyIds(code)).toContain("filler-adverb");
  });

  it("does not merge two unrelated list items that each use one filler word", () => {
    const code = `<li>Effortlessly resume interrupted uploads</li><li>Seamlessly retry failed jobs</li>`;
    expect(copyIds(code)).toEqual([]);
  });

  // A first cut of the hero/subhead pass paired by array position alone —
  // "the next text-bearing element in document order" — with no check for
  // what sat between the two tags in the actual markup. All three of these
  // are ordinary pages with two unrelated sections that each happen to use
  // one common word from the filler-adverb list; none of them is a
  // hero/subhead, and the pass must not pair across any of them.
  it("does not pair a heading with an unrelated paragraph behind an intervening <img>", () => {
    const code = `<h1>Seamlessly onboard new hires</h1><img src="a.png" alt=""><p>Built for cutting-edge deployment pipelines.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not pair a heading with an unrelated paragraph behind an intervening empty <div>", () => {
    const code = `<h1>Seamlessly onboard new hires</h1><div></div><p>Built for cutting-edge deployment pipelines.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not pair a heading in one <article> with a paragraph in a sibling <article>", () => {
    const code = `<article><h1>Seamlessly onboard new hires</h1></article><article><p>Built for cutting-edge deployment pipelines.</p></article>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not pair a heading in one <section> with a paragraph in a sibling <section>", () => {
    const code = `<section><h1>Seamlessly onboard new hires</h1></section><section><p>Built for cutting-edge deployment pipelines.</p></section>`;
    expect(copyIds(code)).toEqual([]);
  });

  // Round 3: the reviewer was asked to defeat the adjacency reasoning, not
  // just re-check the three cases above, and found two more gaps — one in
  // each direction.
  it("does not pair across an HTML comment used as a section boundary (A1)", () => {
    // maskComments blanks the whole comment, delimiters included, before this
    // rule ever sees the source — a naive gap check reading the masked text
    // would see nothing but whitespace here and wrongly pair the two.
    const code = `<h1>Seamlessly onboard new hires</h1><!-- section break --><p>Built for cutting-edge deployment pipelines.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("does not pair across two consecutive HTML comments", () => {
    const code = `<h1>Seamlessly onboard new hires</h1><!-- End Hero --><!-- Begin Features --><p>Built for cutting-edge deployment pipelines.</p>`;
    expect(copyIds(code)).toEqual([]);
  });

  it("pairs an anchored-permalink heading with the paragraph right after it (A2)", () => {
    // The heading's own <a> is itself a TEXT_TAGS entry sitting between the
    // heading and the real next paragraph in array order — nothing at all
    // sits between </h1> and <p> in the actual markup.
    const code = `<h1><a href="#">Seamlessly onboard new hires</a></h1><p>Built for cutting-edge deployment pipelines.</p>`;
    expect(copyIds(code)).toContain("filler-adverb");
  });

  it("stays silent for an anchored heading whose paragraph genuinely has no filler adverb", () => {
    // Proves the previous test fires because the pairing mechanism actually
    // reached the paragraph and evaluated it — not because anchored headings
    // are silently exempt from the threshold check.
    const code = `<h1><a href="#">Seamlessly onboard new hires</a></h1><p>Every plan includes unlimited projects and priority support.</p>`;
    expect(copyIds(code)).toEqual([]);
  });
});

describe("copy rules — isQuoted does not treat an ordinary contraction as a quote mark", () => {
  it("fires when a genuine hype phrase sits between two unrelated contractions", () => {
    const code = `<p>Don't miss out — unlock the power of your data, it's free.</p>`;
    expect(copyIds(code)).toContain("hype-opener");
  });

  it("still fires when only a leading contraction is nearby", () => {
    const code = `<p>It's time to unlock the power of your data warehouse.</p>`;
    expect(copyIds(code)).toContain("hype-opener");
  });
});

describe("copy rules — say goodbye to: kept as a fixed collocation, not narrowed", () => {
  it("still fires on the stock construction", () => {
    expect(copyIds(`<h1>Say goodbye to slow builds</h1>`)).toContain("hype-opener");
  });

  it("also fires on a deprecation note using the same stock phrase — accepted trade-off, see report", () => {
    expect(copyIds(`<p>Say goodbye to the legacy v1 API.</p>`)).toContain("hype-opener");
  });
});

// Two inputs built to fire every one of the ten rules at least once. Shared,
// not duplicated: two tests below depend on the "all ten fire" property, and a
// second copy of these strings would let one of them quietly stop covering
// what it claims to cover.
const ALL_TEN_VISUAL = `
  <div class="from-indigo-500 to-purple-600 bg-clip-text text-transparent backdrop-blur bg-white/10 border-white/10 rounded-2xl shadow-lg border"><h3>🚀 Fast</h3></div>
  <div class="rounded-2xl shadow-lg border">A</div>
  <div class="rounded-2xl shadow-lg border">B</div>
  <span class="text-xs uppercase tracking-wide">Eyebrow</span><h2>One</h2>
  <span class="text-xs uppercase tracking-wide">Eyebrow</span><h2>Two</h2>
  <span class="text-xs uppercase tracking-wide">Eyebrow</span><h2>Three</h2>
  <h1>Ship faster</h1><a href="/signup">Get started</a><style>body{font-family:Inter,sans-serif}</style>
`;
const ALL_TEN_COPY = `<h1>Unlock the power of seamlessly modern tooling</h1><a>Get Started</a><a>Learn More</a><p>Seamlessly integrate your effortlessly modern workflow.</p>`;

// The check that would have caught `eyebrow-over-every-heading` citing
// `visual-craft-standards` — a document with no mention of eyebrows, kickers,
// tracked uppercase or small section labels — on the day it shipped. The suite
// asserted `f.doc` was truthy, and a doc id that resolves to nothing is
// truthy. A finding whose "Read: get_design_doc(...)" line names a document
// that does not exist sends the reader somewhere empty at exactly the moment
// they went looking for the authority behind the claim.
describe("every doc a rule cites resolves to a real knowledge document", () => {
  const docs = loadKnowledge(join(__dirname, "..", "knowledge"));
  const findings = [
    ...genericVisualRules(ALL_TEN_VISUAL, "app/(marketing)/page.tsx"),
    ...genericCopyRules(ALL_TEN_COPY),
  ];

  it("loads the knowledge base, so the check below is not vacuous", () => {
    expect(docs.length).toBeGreaterThan(0);
  });

  it("fires all ten rules, so every doc a rule can cite is actually cited here", () => {
    expect([...new Set(findings.map((f) => f.rule))].sort()).toEqual(Object.keys(RULE_WEIGHTS).sort());
  });

  it("resolves every cited id", () => {
    const dangling = findings
      .filter((f) => !f.doc || !findDoc(docs, f.doc))
      .map((f) => `${f.rule} → ${f.doc}`);
    expect(dangling).toEqual([]);
  });

  // Resolution alone is necessary and not sufficient, and this is the half
  // that actually catches the defect that prompted these tests.
  // `eyebrow-over-every-heading` cited `visual-craft-standards`, which is a
  // real document that resolves perfectly well — and contains no mention of
  // eyebrows, kickers, tracked uppercase or small section labels anywhere. A
  // reader who followed the "Read:" line landed in a document that never
  // discusses the thing they were just told about.
  //
  // So each rule declares the word its cited document has to actually use.
  // These are not incidental terms: each is the subject of the rule's own
  // message, and the phrase in the document that carries it is named beside
  // it. Re-point a rule at a document that does not make its claim and this
  // fails.
  const CLAIM_VOCABULARY: Record<string, RegExp> = {
    // "Measure a gradient before shipping it", and the recurring-pairs table.
    "ai-default-gradient": /gradient/i,
    // typography-craft's reflex-reject list, which names Inter outright.
    "default-ui-font": /\bInter\b/i,
    // iconography's rule against emoji standing in for an icon set.
    "emoji-as-icon": /emoji/i,
    // ux-writing's "Ban AI-slop … copy".
    "hype-opener": /ai-slop/i,
    // ai-default-aesthetic names the triad in its own utility strings.
    "stock-card-chrome": /rounded-2xl/i,
    // visual-craft-standards' gradient-text slop tell.
    "gradient-text": /gradient/i,
    // ai-default-aesthetic: "a tracked-uppercase eyebrow above every section
    // without exception". The claim lives here and nowhere else.
    "eyebrow-over-every-heading": /eyebrow/i,
    // visual-craft-standards on glassmorphism as a stock surface.
    "stock-glass-on-dark": /glass/i,
    // ux-writing's "Extraneous … pure waste — eliminate ruthlessly".
    "filler-adverb": /extraneous/i,
    // ux-writing on naming the action rather than labelling it "Get started".
    "generic-cta": /call to action|CTA|get started/i,
  };

  it("declares the vocabulary for every rule, so no rule slips the check", () => {
    expect(Object.keys(CLAIM_VOCABULARY).sort()).toEqual(Object.keys(RULE_WEIGHTS).sort());
  });

  it.each(Object.entries(CLAIM_VOCABULARY))(
    "%s cites a document that actually makes the claim", (rule, vocabulary) => {
      const cited = findings.find((f) => f.rule === rule)?.doc;
      expect(cited, `${rule} emitted no doc id`).toBeTruthy();
      const doc = findDoc(docs, cited!);
      expect(doc, `${rule} → ${cited} does not resolve`).toBeTruthy();
      expect(vocabulary.test(doc!.body), `${cited} never mentions ${vocabulary}`).toBe(true);
    });
});

describe("the score", () => {
  it("keys and rule ids agree in both directions", () => {
    // A weight for a cut rule reads as coverage; a rule with no weight reads as
    // clean. uniform-card-grid was cut in Task 2 — this is what catches the
    // next one. The two inputs below are built to fire every one of the ten
    // rules at least once, so the check runs both directions: every emitted id
    // has a weight (a stray rule wouldn't silently score nothing), and every
    // weighted id is actually reachable (a stale weight wouldn't silently read
    // as coverage).
    const emitted = new Set([
      ...genericVisualRules(ALL_TEN_VISUAL),
      ...genericCopyRules(ALL_TEN_COPY),
    ].map((f) => f.rule));

    for (const id of emitted) expect(Object.keys(RULE_WEIGHTS)).toContain(id);
    for (const id of Object.keys(RULE_WEIGHTS)) expect([...emitted], id).toContain(id);
  });

  it("counts a rule once however many times it fires", () => {
    const card = `<div class="rounded-2xl shadow-lg border"><h3>🚀 Fast</h3></div>`;
    const one = genericScore(genericVisualRules(card));
    const many = genericScore(genericVisualRules(card.repeat(5)));
    const emojiOne = one.items.find((i) => i.rule === "emoji-as-icon")?.weight ?? 0;
    const emojiMany = many.items.find((i) => i.rule === "emoji-as-icon")?.weight ?? 0;
    expect(emojiMany).toBe(emojiOne);
  });

  it("itemises every point it awards", () => {
    const { total, items } = genericScore(genericVisualRules(`<div class="from-indigo-500 to-purple-600">`));
    expect(items.length).toBeGreaterThan(0);
    expect(total).toBe(items.reduce((n, i) => n + i.weight, 0));
  });

  it("scores a distinctive page at zero", () => {
    const code = `<h1 style="font-family:'Redaction 35'">Deploy a Postgres branch in 400ms</h1>`;
    expect(genericScore(genericVisualRules(code)).total).toBe(0);
  });

  it("caps at 100", () => {
    const everything = `<div class="from-indigo-500 to-purple-600 bg-clip-text text-transparent backdrop-blur bg-white/10 border-white/10 rounded-2xl shadow-lg border"><h3>🚀 Fast</h3></div>`;
    expect(genericScore(genericVisualRules(everything.repeat(4))).total).toBeLessThanOrEqual(100);
  });

  it("clamps total at 100 and still reconciles the itemised sum via rawTotal", () => {
    // The ten real weights sum to 92 (see the comment on RULE_WEIGHTS), so
    // no findings genericVisualRules/genericCopyRules can actually produce
    // ever trips the clamp — the test above never exercises that branch. A
    // synthetic weight table that sums past 100 is the only way to reach it,
    // which is what this test does, restoring RULE_WEIGHTS afterward.
    const original = { ...RULE_WEIGHTS };
    try {
      // Inside the try, so a throw while swapping the table still restores it.
      for (const key of Object.keys(RULE_WEIGHTS)) delete RULE_WEIGHTS[key];
      Object.assign(RULE_WEIGHTS, { "test-only-a": 70, "test-only-b": 60 });
      const findings = [
        { line: 1, severity: "info", rule: "test-only-a", message: "m", fix: "f" },
        { line: 2, severity: "info", rule: "test-only-b", message: "m", fix: "f" },
      ];
      const { total, rawTotal, items } = genericScore(findings as Parameters<typeof genericScore>[0]);
      // The clamp actually engaged...
      expect(total).toBe(100);
      // ...and the parts still add up to something stated, not silently
      // capped and dropped: rawTotal carries the true, uncapped sum, and
      // every item keeps its real, citable weight rather than a rescaled
      // fraction that no longer matches RULE_WEIGHTS.
      expect(rawTotal).toBe(130);
      expect(items.reduce((n, i) => n + i.weight, 0)).toBe(rawTotal);
      expect(items.find((i) => i.rule === "test-only-a")?.weight).toBe(70);
      expect(items.find((i) => i.rule === "test-only-b")?.weight).toBe(60);
    } finally {
      for (const key of Object.keys(RULE_WEIGHTS)) delete RULE_WEIGHTS[key];
      Object.assign(RULE_WEIGHTS, original);
    }
  });
});

describe("the report", () => {
  it("always states what it could not see", () => {
    expect(genericReport({ source: `<p>Anything</p>` }).text).toMatch(/not visible to this audit/i);
  });

  // Three limits the report has to state because a reader cannot infer any of
  // them from a clean score. Each is paired below with the input that
  // demonstrates it, so the disclosure and the behaviour cannot drift apart.
  describe("states the limits it cannot fix", () => {
    const notVisible = genericReport({ source: `<p>Anything</p>` }).text;

    it("says the copy rules read English only, and they do", () => {
      expect(notVisible).toMatch(/Copy in any language but English/);
      // Same page, same markup, same construction — translated.
      const turkish = `<h1>Yapay zekâ ile daha hızlı yayına alın</h1>
        <p>FlowStack mevcut iş akışınıza kusursuzca entegre olur ve ekibinizin tüm
        potansiyelini zahmetsizce ortaya çıkarır.</p>
        <a>Hemen Başlayın</a><a>Daha Fazla Bilgi</a>`;
      const english = `<h1>Ship faster with AI</h1>
        <p>FlowStack seamlessly integrates with your existing workflow to
        effortlessly unlock your team's full potential.</p>
        <a>Get Started</a><a>Learn More</a>`;
      expect(copyIds(turkish)).toEqual([]);
      expect(copyIds(english).length).toBeGreaterThan(0);
    });

    it("says a gradient behind a custom property is not resolved, and it is not", () => {
      expect(notVisible).toMatch(/stock gradient assembled through a CSS custom property/);
      const viaVar = `:root{--brand-a:#6366f1;--brand-b:#a855f7}\n.hero{background:linear-gradient(135deg,var(--brand-a),var(--brand-b));}`;
      const literal = `.hero{background:linear-gradient(135deg,#6366f1,#a855f7);}`;
      expect(ids(viaVar)).not.toContain("ai-default-gradient");
      expect(ids(literal)).toContain("ai-default-gradient");
    });

    it("says story, test and fixture files are skipped in directory mode", () => {
      expect(notVisible).toMatch(/Story, test and fixture files, in directory mode/);
    });
  });

  it("prints the score itemised, not as a bare number", () => {
    const out = genericReport({ source: `<div class="from-indigo-500 to-purple-600">` }).text;
    expect(out).toMatch(/ai-default-gradient/);
    expect(out).toMatch(/\d+\s*\/\s*100/);
  });

  // The clamp's reconciliation note is rendered by genericReport, but the
  // clamp test above drives genericScore directly — so the line that actually
  // reaches a reader had no coverage. The ten real weights sum to 92 and can
  // never trip the clamp, so as with that test the only way in is a synthetic
  // weight table, here keyed to rule ids the real rules genuinely emit so the
  // report is driven end to end from source.
  it("states the pre-clamp sum in the report when the display is capped", () => {
    const original = { ...RULE_WEIGHTS };
    try {
      // Inside the try, so a throw while swapping the table still restores it.
      for (const key of Object.keys(RULE_WEIGHTS)) delete RULE_WEIGHTS[key];
      Object.assign(RULE_WEIGHTS, { "ai-default-gradient": 70, "emoji-as-icon": 60 });
      const out = genericReport({ source: `<div class="from-indigo-500 to-purple-600"><h3>🚀 Fast</h3></div>` }).text;
      expect(out).toMatch(/\*\*Score: 100 \/ 100\*\*/);
      // The note appears, and names the real uncapped sum rather than a
      // rounded or rescaled stand-in.
      expect(out).toMatch(/The itemised points above sum to 130; the score display is capped at 100\./);
      // And the items it reconciles still carry their citable weights.
      expect(out).toMatch(/\*\*ai-default-gradient\*\* \+70/);
      expect(out).toMatch(/\*\*emoji-as-icon\*\* \+60/);
    } finally {
      for (const key of Object.keys(RULE_WEIGHTS)) delete RULE_WEIGHTS[key];
      Object.assign(RULE_WEIGHTS, original);
    }
  });

  it("says nothing about a cap when the itemised points fit under 100", () => {
    const out = genericReport({ source: `<div class="from-indigo-500 to-purple-600"><h3>🚀 Fast</h3></div>` }).text;
    expect(out).not.toMatch(/capped at 100/);
  });
});

// Pinned before `GENERIC_NOT_VISIBLE` moved from a prose template literal to
// `GENERIC_PREAMBLE` / `GENERIC_NOT_VISIBLE` / `GENERIC_CLOSING`, so the split
// can be checked against the exact bytes `genericReport` rendered beforehand.
// A container change — array in, same markdown out — has nothing to prove if
// the "before" picture is taken after the change.
describe("the disclosure section, pinned before the split into an array", () => {
  it("renders the same disclosure section it rendered before the split", () => {
    expect(genericReport({ source: `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"></div>`, filename: "Hero.tsx" }).text)
      .toMatchInlineSnapshot(`
        "# Generic-design audit

        Scanned one snippet.

        **Score: 20 / 100** — the count of distinct AI-default signals found; each rule counts once no matter how many times it repeats.

        - **ai-default-gradient** +20

        ## Warnings

        - **ai-default-gradient** (line 1) — Gradient built from Tailwind's stock indigo/violet/purple region (indigo-500 → purple-600).
          - Fix: Pick stops from your own palette, or drop the gradient — see ai-default-aesthetic for why this pair recurs.
          - Read: \`get_design_doc("ai-default-aesthetic")\`

        ## Not visible to this audit

        Every rule above matches a fact about the source — a class name, a phrase, a
        repeated structure. It cannot see, and does not attempt to judge:

        - **Whether a default was chosen deliberately.** A brand whose colour
          genuinely is indigo will be flagged; the finding names a fact, not a
          mistake. Confirm the choice before treating a flag as a defect.
        - **Anything about rendered output.** Spacing rhythm, optical alignment, how
          the page actually feels — none of that is visible from source text.
        - **Whether the writing is good.** This detects stock phrases, not weak ones;
          a hand-written sentence that happens to avoid the phrase list is not
          praised for it, and a good sentence that happens to use one is still
          flagged.
        - **Copy in any language but English.** Every phrase, adverb and call-to-action
          label the copy rules match is English. A generated page in Turkish, German,
          Japanese or any other language is read by the visual rules alone and scores
          strictly lower for it — the same page in two languages measured 74 and 92
          here, and the 18-point difference was the translation, not the design. Do
          not compare scores across languages.
        - **A stock gradient assembled through a CSS custom property.**
          \`linear-gradient(135deg, var(--brand-a), var(--brand-b))\` is silent even when
          those properties are defined as the stock pair a few lines above; resolving
          it needs real value substitution, which this scanner does not do. Written
          literally, or as Tailwind \`from-\`/\`to-\` utilities, the same gradient is
          found.
        - **Judgement of any kind.** Whether the result is *good design* is not this
          tool's question — \`design_review_checklist\` and \`get_design_doc("design-critique-scoring")\`
          own that, with a human looking at the render.
        - **Class names outside Tailwind's default scale.** The visual rules match
          literal utility strings from that scale, so a project written with arbitrary
          values, a custom scale, or another framework's class names is audited less
          thoroughly than the score implies. A low score on such a project reflects
          coverage, not necessarily restraint.
        - **Story, test and fixture files, in directory mode.** Paths matching
          \`*.stories.*\`, \`*.story.*\`, \`*.spec.*\`, \`*.test.*\`, \`__fixtures__/\` and
          \`__mocks__/\` are not read. A story file's job is to show every variant with
          placeholder labels, so scoring it reports the demonstration rather than the
          product — but it does mean a default that exists *only* in a story is not
          reported either. The scanned line above says how many were skipped.
        - **The typeface rule off a recognised brand surface.** It evaluates only where
          the surface reads as a brand page — a marketing route, or a heading beside a
          conventional call to action — so a landing page at an unconventional path
          with distinctive call-to-action copy is not assessed for it.

        A clean result here means the source carries none of these specific,
        recurring defaults — not that the design is good."
      `);
  });
});

describe("the structured half carries the same itemised score the markdown prints", () => {
  it("carries the same itemised score the markdown prints", () => {
    const r = genericReport({ source: `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"></div>`, filename: "Hero.tsx" });
    expect(r.structured.score.total).toBeGreaterThan(0);
    for (const item of r.structured.score.items) {
      expect(r.text).toContain(item.rule);
      expect(r.text).toContain(String(item.weight));
    }
    expect(r.structured.score.items.reduce((n, i) => n + i.weight, 0)).toBe(r.structured.score.total);
  });

  it("scores a page carrying no signal at 0, with no score items", () => {
    const r = genericReport({ source: `<article><h1>A quiet page</h1></article>`, filename: "page.tsx" });
    expect(r.structured.score).toEqual({ total: 0, items: [] });
  });

  it("gives each score item evidence naming what was found", () => {
    const r = genericReport({ source: `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"></div>`, filename: "Hero.tsx" });
    const item = r.structured.score.items.find((i) => i.rule === "ai-default-gradient");
    expect(item?.evidence).toBeTruthy();
    // The evidence is the same finding message and line the reader sees in
    // the Warnings section, not a fresh description invented for this field.
    const finding = r.structured.findings.find((f) => f.rule === "ai-default-gradient");
    expect(item?.evidence).toContain(finding?.message);
    expect(item?.evidence).toContain(String(finding?.line));
  });
});

describe("the structured half populates findings[].file for project-scanned findings", () => {
  it("carries the scanned file's path on every finding, in directory mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "sd-generic-file-"));
    try {
      writeFileSync(join(dir, "hero.tsx"), `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"></div>`);
      const r = genericReport({ root: dir });
      expect(r.structured.findings.length).toBeGreaterThan(0);
      for (const f of r.structured.findings) expect(f.file).toBe("hero.tsx");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("carries the snippet's filename on every finding, in snippet mode", () => {
    const r = genericReport({ source: `<div class="bg-gradient-to-r from-indigo-500 to-purple-600"></div>`, filename: "Hero.tsx" });
    expect(r.structured.findings.length).toBeGreaterThan(0);
    for (const f of r.structured.findings) expect(f.file).toBe("Hero.tsx");
  });
});

describe("the report — directory-mode breadth", () => {
  // Reproduces the exact gap a project-wide score can't carry on its own:
  // two files each carrying one instance of the same signals score
  // identically to one file carrying both signals twice. The score is right
  // not to tell those apart (see the comment on `filesByRule` in
  // genericReport) — but the reader should still be able to.
  const gradientCard = `<div class="from-indigo-500 to-purple-600"><h3>🚀 Fast</h3></div>`;

  it("shows how many scanned files a rule was found in, alongside an identical score", () => {
    const twoFiles = mkdtempSync(join(tmpdir(), "sd-generic-breadth-"));
    const oneFile = mkdtempSync(join(tmpdir(), "sd-generic-breadth-"));
    try {
      writeFileSync(join(twoFiles, "a.html"), gradientCard);
      writeFileSync(join(twoFiles, "b.html"), gradientCard);
      writeFileSync(join(oneFile, "a.html"), gradientCard.repeat(2));

      const twoFilesReport = genericReport({ root: twoFiles }).text;
      const oneFileReport = genericReport({ root: oneFile }).text;

      // Same signals, so the same score either way...
      const scoreOf = (report: string) => report.match(/\*\*Score: (\d+) \/ 100\*\*/)?.[1];
      expect(scoreOf(twoFilesReport)).toBe(scoreOf(oneFileReport));

      // ...but the breadth the score can't carry is now visible, and differs.
      expect(twoFilesReport).toMatch(/ai-default-gradient.*found in 2 of 2 files/);
      expect(oneFileReport).toMatch(/ai-default-gradient.*found in 1 of 1 files/);
    } finally {
      rmSync(twoFiles, { recursive: true, force: true });
      rmSync(oneFile, { recursive: true, force: true });
    }
  });

  // A story file demonstrates variants with placeholder labels and renders the
  // recipe under audit on purpose. Scoring it reported the demonstration
  // rather than the product: a review found a bespoke project scored 31/100
  // entirely on one `Button.stories.tsx`, with `generic-cta` announcing that
  // "every call to action on the page is drawn from the stock set" where there
  // was no page.
  describe("story, test and fixture files are not a shipped surface", () => {
    const storyFile = `
      <div class="rounded-2xl border p-6 shadow-lg"><a href="#">Get Started</a></div>
      <div class="rounded-2xl border p-6 shadow-lg"><a href="#">Learn More</a></div>
      <div class="rounded-2xl border p-6 shadow-lg"><a href="#">Read More</a></div>
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent"><h3>🚀 Fast</h3></div>`;
    const realPage = `<h1 style="font-family:'Redaction 35'">Six hundred bells, catalogued</h1>
      <p>A field recording archive of church bells in the Cévennes, 1971 to today.</p>`;

    const withStory = (name: string) => {
      const dir = mkdtempSync(join(tmpdir(), "sd-generic-story-"));
      writeFileSync(join(dir, "page.html"), realPage);
      writeFileSync(join(dir, name), storyFile);
      return dir;
    };

    // `scanProject` reads `.vue`, `.svelte` and `.astro` alongside `.jsx`/`.tsx`,
    // so a `[jt]sx?`-only tail let a Svelte or Vue component's stories
    // reproduce the whole defect. The extension is open now.
    it.each([
      ["Button.stories.tsx"], ["Button.story.jsx"], ["Button.spec.tsx"], ["Card.test.jsx"],
      ["Button.stories.svelte"], ["Card.spec.svelte"], ["Button.stories.vue"], ["Card.test.vue"],
      ["Button.stories.astro"], ["Panel.stories.html"],
    ])("scores a bespoke project zero despite %s", (name) => {
      const dir = withStory(name);
      try {
        const out = genericReport({ root: dir }).text;
        expect(out).toMatch(/\*\*Score: 0 \/ 100\*\*/);
        expect(out).toMatch(/Skipped 1 story, test or fixture file/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("skips a __fixtures__ directory the same way", () => {
      const dir = mkdtempSync(join(tmpdir(), "sd-generic-fixtures-"));
      try {
        writeFileSync(join(dir, "page.html"), realPage);
        mkdirSync(join(dir, "__fixtures__"));
        writeFileSync(join(dir, "__fixtures__", "generic.html"), storyFile);
        expect(genericReport({ root: dir }).text).toMatch(/\*\*Score: 0 \/ 100\*\*/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    // Without this the skip could be doing anything — including hiding the
    // real page — and every assertion above would still pass.
    it("still scores that same story file when it is the page", () => {
      const dir = mkdtempSync(join(tmpdir(), "sd-generic-story-"));
      try {
        writeFileSync(join(dir, "page.html"), realPage);
        writeFileSync(join(dir, "hero.tsx"), storyFile);
        expect(genericReport({ root: dir }).text).not.toMatch(/\*\*Score: 0 \/ 100\*\*/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("says in the report what it did not read", () => {
      const dir = withStory("Button.stories.tsx");
      try {
        expect(genericReport({ root: dir }).text).toMatch(/\*\*Story, test and fixture files, in directory mode\.\*\*/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  it("says nothing about file breadth in snippet mode", () => {
    expect(genericReport({ source: gradientCard }).text).not.toMatch(/found in \d+ of \d+ files/);
  });
});

// ---------------------------------------------------------------------------
// The distinctive-page matrix.
//
// Every other test in this file asserts a shape someone already had in mind.
// These assert the opposite property: that a page made by a designer with a
// point of view survives the audit untouched. The pages below were written
// first, as pages, and only then run through the rules. That ordering is the
// whole value of this block — a fixture reverse-engineered from a rule tests
// the rule against itself.
//
// A fixture that scores zero because it contains nothing proves only that
// empty input produces no findings. Each of these carries an <h1>, real class
// strings, sibling sections, body copy a person would actually write, and a
// call to action where the design would have one.
// ---------------------------------------------------------------------------

const pageFindings = (code: string, filename?: string) =>
  [...genericVisualRules(code, filename), ...genericCopyRules(code, filename)]
    .map((f) => f.rule)
    .sort();

const pageScore = (code: string, filename?: string) =>
  genericScore([...genericVisualRules(code, filename), ...genericCopyRules(code, filename)]).total;

// 1. Brutalist. Condensed display face, 4px rules instead of cards, square
//    corners throughout, one acid accent against paper and ink.
const BRUTALIST_LANDING = `
<style>
  :root { --ink:#000000; --paper:#F2F0EB; --volt:#D6FF3F; }
  body { margin:0; background:var(--paper); color:var(--ink);
         font-family:"Archivo Expanded","Archivo Black",Helvetica,sans-serif;
         -webkit-font-smoothing:antialiased; }
  .masthead { display:flex; justify-content:space-between; align-items:baseline;
              padding:14px 24px; border-bottom:4px solid var(--ink); }
  .masthead a { color:var(--ink); text-decoration:none; font-size:13px;
                letter-spacing:.06em; text-transform:uppercase; }
  .masthead nav a + a { margin-left:24px; }
  h1 { margin:0; padding:32px 24px 20px; font-size:clamp(52px,12vw,168px);
       line-height:.86; letter-spacing:-.035em; text-transform:uppercase; }
  .standfirst { max-width:40ch; margin:0; padding:0 24px 40px;
                font-size:20px; line-height:1.35; }
  .slab { border-top:4px solid var(--ink); padding:28px 24px; }
  .slab h2 { margin:0 0 10px; font-size:30px; line-height:1.05;
             text-transform:uppercase; letter-spacing:-.02em; }
  .slab p { margin:0; max-width:54ch; line-height:1.5;
            font-family:"Suisse Int'l Mono",monospace; font-size:15px; }
  .terms { border-top:4px solid var(--ink); background:var(--ink);
           color:var(--volt); padding:32px 24px; }
  .terms h2 { margin:0 0 14px; font-size:30px; text-transform:uppercase; }
  .terms p { max-width:56ch; line-height:1.5; }
  .apply { display:inline-block; margin-top:20px; padding:18px 26px;
           background:var(--volt); color:var(--ink); border:4px solid var(--volt);
           font-size:18px; letter-spacing:.02em; text-transform:uppercase;
           text-decoration:none; }
  .apply:hover { background:var(--ink); color:var(--volt); }
</style>

<header class="masthead">
  <a href="/">Bad Handwriting</a>
  <nav>
    <a href="/curriculum">Curriculum</a>
    <a href="/tutors">Tutors</a>
    <a href="/archive">Archive 2019—2025</a>
  </nav>
</header>

<h1>Nine weeks<br>drawing letters<br>by hand</h1>
<p class="standfirst">A type design intensive in Rotterdam. You will cut a lowercase, space it
badly, space it again, and go home with a text face that works at 9pt.</p>

<section class="slab">
  <h2>Weeks 1—3 · The skeleton</h2>
  <p>Broad-nib and pointed-pen exercises until the strokes stop arguing with each other.
  No software for the first fortnight. Twelve people, two tables, one very old lightbox.</p>
</section>

<section class="slab">
  <h2>Weeks 4—6 · Spacing and fitting</h2>
  <p>The part nobody teaches. You will print, cut, tape, and reprint the same six words
  until the rhythm holds at text size and at 300pt. Expect to hate n and o by Thursday.</p>
</section>

<section class="slab">
  <h2>Weeks 7—9 · Cutting the family</h2>
  <p>Roman, italic, and a bold that is genuinely a different drawing rather than an
  interpolation. Kerning by hand first, then by class. The last week is production.</p>
</section>

<section class="terms">
  <h2>€2,400 · 12 places · starts 6 October</h2>
  <p>Tuition covers materials, the studio key, and a hot plate that only sometimes works.
  Two bursaries per cohort for applicants from outside the EU. Applications close 1 September
  and we read them in the order they arrive.</p>
  <a class="apply" href="/apply">Apply for the October cohort</a>
</section>
`;

// 2. Serif editorial. A display serif at three optical sizes, a 62ch measure,
//    and no card anywhere — the page is a column with rules and white space.
const SERIF_EDITORIAL = `
<style>
  @font-face { font-family:"Canela Deck"; src:url("/fonts/CanelaDeck-Light.woff2") format("woff2");
               font-weight:300; font-display:swap; }
  @font-face { font-family:"Canela Text"; src:url("/fonts/CanelaText-Regular.woff2") format("woff2");
               font-weight:400; font-display:swap; }
  body { margin:0; background:#FBF9F4; color:#1B1815;
         font-family:"Canela Text",Georgia,"Times New Roman",serif; }
  .measure { max-width:62ch; margin:0 auto; padding:0 24px; }
  .kicker { font-size:13px; letter-spacing:.1em; text-transform:uppercase; color:#8A7E72; }
  h1 { font-family:"Canela Deck",Georgia,serif; font-weight:300;
       font-size:clamp(38px,6vw,80px); line-height:1.04; letter-spacing:-.018em;
       margin:.2em 0 .4em; text-wrap:balance; }
  .standfirst { font-size:23px; line-height:1.5; color:#4A423B; margin-bottom:2.4em; }
  .measure p { font-size:19px; line-height:1.68; margin:0 0 1.35em; }
  .measure p + p { text-indent:1.6em; }
  .dropcap::first-letter { float:left; font-family:"Canela Deck",Georgia,serif;
                           font-size:4.6em; line-height:.78; padding:.06em .1em 0 0; }
  blockquote { margin:2.6em 0; padding:0; border:0;
               font-family:"Canela Deck",Georgia,serif; font-weight:300;
               font-size:30px; line-height:1.28; color:#6E1F1A; }
  blockquote cite { display:block; margin-top:.7em; font-size:14px; font-style:normal;
                    letter-spacing:.06em; text-transform:uppercase; color:#8A7E72; }
  h2 { font-family:"Canela Deck",Georgia,serif; font-weight:300; font-size:30px;
       line-height:1.2; margin:2.4em 0 .6em; }
  .subscribe { margin:4em 0 6em; padding-top:1.6em; border-top:1px solid #DED6C9; }
  .subscribe a { color:#6E1F1A; font-size:19px; text-underline-offset:.22em; }
</style>

<article class="measure">
  <p class="kicker">Reported from Cais do Sodré · 4 August 2026</p>
  <h1>The last man setting the ferry timetable in metal</h1>
  <p class="standfirst">Every quarter for fifty-one years, Álvaro Neves has composed the
  Tejo crossing schedule by hand. In November the presses go to a museum in Porto and the
  timetable becomes a PDF like everything else.</p>

  <p class="dropcap">The composing room is on the second floor of a building that the
  harbour authority has been trying to sell since 2011. It smells of oil and warm paper.
  Neves works standing, as compositors have always worked standing, with the case open in
  front of him and a galley proof drying on the sill behind.</p>

  <p>He has the departure times memorised — not the current ones, all of them. Ask him what
  the last boat to Cacilhas was in the winter of 1988 and he will tell you, and then tell you
  why it changed. The schedule is a document with a memory, he says, and a PDF has none.</p>

  <blockquote>They think the timetable is the times. The timetable is the spacing. If the
  eye cannot find Saturday in half a second, the boat leaves without you.
  <cite>Álvaro Neves, compositor</cite></blockquote>

  <p>His point is not sentimental. The sheet is read in bad light, in wind, by people who are
  late. Over five decades he has widened the gutter between weekday and weekend columns twice
  and shortened the rule under each heading once, each time after standing at the terminal
  watching where people's eyes went.</p>

  <h2>What the museum is taking</h2>

  <p>Two Monotype casters, a proof press, and eleven cases of a 1954 Portuguese cut that has
  never been digitised. The curator has asked Neves to record himself composing a full sheet.
  He has agreed on the condition that nobody speaks during the recording.</p>

  <p>What the museum is not taking is the judgement — which of the eleven cases to open for a
  line that has to hold nine numerals and the word <em>excepto</em>. That leaves with him.</p>

  <div class="subscribe">
    <a href="/subscribe">Subscribe to Estuário — twelve issues, €54 a year, posted flat</a>
  </div>
</article>
`;

// 3. Dense trading dashboard. Inter from top to bottom, tabular figures,
//    18px rows, no gradient and no ornament. This is the fixture that decides
//    whether `default-ui-font` is usable: Inter on an application surface is
//    a correct choice, not a tell.
const TRADING_DASHBOARD = `
import { useOrderBook, usePositions } from "@/lib/desk";

export default function PositionsDesk() {
  const positions = usePositions("EU-RATES");
  const book = useOrderBook();

  return (
    <main className="h-screen overflow-hidden bg-[#0B0D10] text-[#C9CFD8] font-sans text-[12px] leading-[16px] tabular-nums">
      <header className="sticky top-0 z-10 flex items-baseline justify-between border-b border-[#191D24] bg-white/10 px-3 py-1.5 backdrop-blur">
        <h1 className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#E8ECF2]">
          Positions — EU Rates
        </h1>
        <div className="flex items-baseline gap-5">
          <span className="text-[#6B7480]">Day P&L</span>
          <span className="text-[13px] font-semibold text-[#3FBF7F]">+1,284,905</span>
          <span className="text-[#6B7480]">DV01</span>
          <span className="text-[13px] font-semibold text-[#E8ECF2]">−41,207</span>
          <span className="text-[#6B7480]">as of 14:02:11.338 CET</span>
        </div>
      </header>

      <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <p className="border-b border-[#191D24] px-2 py-1 text-xs uppercase tracking-wide text-[#6B7480]">
            Book — EU Rates 3
          </p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#191D24] text-left text-[11px] uppercase tracking-[.06em] text-[#6B7480]">
              <th className="px-2 py-1 font-medium">Instrument</th>
              <th className="px-2 py-1 text-right font-medium">Net</th>
              <th className="px-2 py-1 text-right font-medium">Avg</th>
              <th className="px-2 py-1 text-right font-medium">Mark</th>
              <th className="px-2 py-1 text-right font-medium">Unreal</th>
              <th className="px-2 py-1 text-right font-medium">DV01</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id} className="h-[18px] border-b border-[#12161C] hover:bg-[#12161C]">
                <td className="px-2 font-medium text-[#E8ECF2]">{p.instrument}</td>
                <td className="px-2 text-right">{p.net}</td>
                <td className="px-2 text-right text-[#8A93A0]">{p.avg}</td>
                <td className="px-2 text-right">{p.mark}</td>
                <td className={p.unreal < 0 ? "px-2 text-right text-[#E05A5A]" : "px-2 text-right text-[#3FBF7F]"}>
                  {p.unreal}
                </td>
                <td className="px-2 text-right text-[#8A93A0]">{p.dv01}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </section>

        <aside className="border-l border-[#191D24]">
          <p className="border-b border-[#191D24] px-2 py-1 text-xs uppercase tracking-wide text-[#6B7480]">
            Order ticket — RXZ5
          </p>
          <form className="px-2 py-2">
            <label className="mb-1 block text-[11px] text-[#6B7480]" htmlFor="qty">Qty</label>
            <input id="qty" defaultValue={250} className="mb-2 w-full border border-[#232830] bg-[#0F1318] px-2 py-1 text-right text-[#E8ECF2] outline-none focus:border-[#3D6EF5]" />
            <label className="mb-1 block text-[11px] text-[#6B7480]" htmlFor="lmt">Limit</label>
            <input id="lmt" defaultValue={"132.41"} className="mb-3 w-full border border-[#232830] bg-[#0F1318] px-2 py-1 text-right text-[#E8ECF2] outline-none focus:border-[#3D6EF5]" />
            <div className="flex gap-1.5">
              <button type="submit" className="flex-1 border border-[#3FBF7F] bg-[#0F1A15] py-1.5 text-[#3FBF7F] hover:bg-[#12241B]">Buy</button>
              <button type="button" className="flex-1 border border-[#E05A5A] bg-[#1A0F0F] py-1.5 text-[#E05A5A] hover:bg-[#241212]">Sell</button>
            </div>
            <button type="button" className="mt-1.5 w-full border border-[#232830] py-1.5 text-[#8A93A0] hover:text-[#E8ECF2]">
              Flatten book ({book.workingOrders} working)
            </button>
          </form>

          <div className="border-t border-[#191D24]">
            <p className="px-2 py-1 text-xs uppercase tracking-wide text-[#6B7480]">Desk utilisation</p>
            <dl className="flex justify-between px-2 text-[11px] text-[#8A93A0]">
              <dt>DV01 of limit</dt>
              <dd className="text-[#E8ECF2]">41,207 / 60,000</dd>
            </dl>
          </div>
        </aside>
      </div>

      <style jsx global>{\`
        :root { font-family: Inter, "Helvetica Neue", Arial, sans-serif;
                font-variant-numeric: tabular-nums; font-feature-settings: "cv05" 1, "ss03" 1; }
      \`}</style>
    </main>
  );
}
`;

// 4. Warm consumer screen. Peach and clay, a rounded humanist face, and a
//    drawn watering can rather than an icon set. Written in Tailwind so the
//    class-based rules have something to read, and carrying the substrate
//    for the three heaviest of them on purpose:
//
//    - Three panels at `rounded-2xl border border-[#F0E2D8]` — literally two
//      of `stock-card-chrome`'s three predicates, with only the absence of
//      `shadow-lg` keeping it quiet. Loosening that triad to any two is
//      caught here.
//    - A real `bg-gradient-to-b from-orange-100 to-rose-50` and a
//      `bg-clip-text text-transparent` figure, so `ai-default-gradient` and
//      `gradient-text` reach their colour test instead of short-circuiting
//      on "no gradient present". Peach to rose is a decision; the rules must
//      let it through while still catching indigo to violet.
const WARM_CONSUMER_APP = `
export default function TodayScreen({ thirsty, forecast }: TodayProps) {
  return (
    <main className="mx-auto min-h-screen max-w-[420px] bg-[#FFF8F2] px-5 pb-28 pt-7 font-body text-[#43302A]">
      <p className="mb-1 text-[14px] text-[#8C7268]">Wednesday morning, 18°C on the sill</p>
      <h1 className="mb-6 font-display text-[30px] font-medium leading-[1.18] tracking-[-.01em]">
        Two of your plants are thirsty today
      </h1>

      <section className="overflow-hidden rounded-2xl border border-[#F0E2D8] bg-gradient-to-b from-orange-100 to-rose-50 px-6 pt-6">
        <p className="mb-4 max-w-[24ch] leading-relaxed">
          The fiddle leaf has gone eleven days. That is two longer than it likes in August.
        </p>
        <svg viewBox="0 0 150 118" className="-mb-1 block w-[150px]" role="img"
             aria-label="A watering can tipped over a terracotta pot">
          <path d="M34 52h58v46a10 10 0 0 1-10 10H44a10 10 0 0 1-10-10z" fill="#C2694A" />
          <path d="M28 44h70v12H28z" fill="#A9573B" />
          <path d="M92 62c18-6 30-2 34 10" stroke="#A9573B" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M63 44c0-16 7-28 20-34-4 16-9 26-20 34z" fill="#7C8B5F" />
          <path d="M60 44C52 32 40 26 26 26c8 12 18 18 34 18z" fill="#8F9E71" />
          <circle cx="126" cy="86" r="3.5" fill="#9EC7D8" />
          <circle cx="133" cy="96" r="2.5" fill="#9EC7D8" />
        </svg>
      </section>

      <section className="mt-6 rounded-2xl border border-[#F0E2D8] bg-[#FBE3D2] px-5 py-4">
        <p className="text-[14px] text-[#8C7268]">You have kept everything alive since</p>
        <p className="bg-gradient-to-r from-orange-300 to-rose-300 bg-clip-text font-display text-[34px] text-transparent">
          March
        </p>
      </section>

      <ul className="mt-7 divide-y divide-[#F0E2D8]">
        {thirsty.map((plant) => (
          <li key={plant.id} className="flex items-center gap-3.5 py-3.5">
            <img src={plant.photo} alt={plant.alt} className="size-13 rounded-[18px] object-cover" />
            <div>
              <div className="font-display text-[18px]">{plant.nickname}</div>
              <div className="text-[14px] text-[#8C7268]">{plant.spot} · {plant.species}</div>
            </div>
            <div className="ml-auto text-[14px] text-[#C2694A]">{plant.daysSince} days</div>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-2xl border border-[#F0E2D8] bg-[#F6F2E9] px-5 py-4.5">
        <h2 className="mb-1.5 font-display text-[19px] font-medium">Nothing else until Saturday</h2>
        <p className="text-[15px] leading-relaxed text-[#6E5A52]">
          The succulents on the balcony are fine through the weekend. We will nudge you Friday
          evening if {forecast.summary} changes.
        </p>
      </section>

      <button
        type="button"
        className="fixed bottom-5 left-1/2 w-[min(380px,calc(100%-40px))] -translate-x-1/2 rounded-full bg-[#C2694A] py-4 text-[17px] text-[#FFF6F0] active:bg-[#A9573B]"
      >
        Water both and start the clock
      </button>

      <style jsx global>{\`
        @font-face { font-family:"Recoleta"; src:url("/f/Recoleta-Medium.woff2") format("woff2"); font-weight:500; }
        @font-face { font-family:"Basier Circle"; src:url("/f/BasierCircle-Regular.woff2") format("woff2"); }
        .font-display { font-family:"Recoleta",Georgia,serif; }
        .font-body { font-family:"Basier Circle","Avenir Next",sans-serif; }
      \`}</style>
    </main>
  );
}
`;

// 5. Monochrome developer tool. The system mono stack as the primary family —
//    a deliberate choice on a tool page, not a fallback — one accent, no
//    shadow anywhere, and hairline borders instead of elevation.
const MONO_DEV_TOOL = `
<style>
  :root { --bg:#0E0E0E; --panel:#151515; --line:#242424; --fg:#E6E6E6;
          --dim:#8A8A8A; --accent:#FF6B2C; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
         font-size:14px; line-height:1.65; }
  .wrap { max-width:76ch; margin:0 auto; padding:64px 20px 96px; }
  h1 { font-size:21px; font-weight:500; letter-spacing:-.01em; margin:0 0 6px; }
  .tagline { color:var(--dim); margin:0 0 40px; }
  h2 { font-size:14px; font-weight:500; margin:44px 0 12px; color:var(--fg); }
  h2::before { content:"## "; color:var(--accent); }
  p { margin:0 0 16px; color:#CFCFCF; }
  pre { background:var(--panel); border:1px solid var(--line); padding:14px 16px;
        overflow-x:auto; margin:0 0 16px; }
  pre .prompt { color:var(--accent); user-select:none; }
  ul { margin:0 0 16px; padding-left:1.4em; }
  li { margin-bottom:6px; }
  li::marker { color:var(--dim); }
  table { width:100%; border-collapse:collapse; margin:0 0 16px; }
  th,td { border-bottom:1px solid var(--line); padding:7px 8px; text-align:left; }
  th { color:var(--dim); font-weight:500; }
  a { color:var(--accent); text-decoration:underline; text-underline-offset:3px; }
  .install { border:1px solid var(--accent); padding:14px 16px; margin:36px 0 0;
             display:flex; justify-content:space-between; align-items:center; gap:16px; }
  .install button { background:none; border:1px solid var(--line); color:var(--fg);
                    font:inherit; padding:6px 12px; cursor:pointer; }
  .install button:hover { border-color:var(--accent); color:var(--accent); }
</style>

<div class="wrap">
  <h1>zt — a trace viewer for Postgres that fits in a terminal</h1>
  <p class="tagline">Tails auto_explain output, folds the plan tree, and shows you the one node that cost you the query.</p>

  <h2>Why it exists</h2>
  <p>pg_stat_statements tells you which query is slow. It does not tell you that the slowness
  is a nested loop that only misestimates after the nightly load. zt keeps the last N plans per
  query fingerprint in a ring buffer so you can compare a fast run against a slow one side by side.</p>

  <h2>Install</h2>
  <pre><span class="prompt">$</span> brew install saglitz/tap/zt
<span class="prompt">$</span> zt tail --dsn "postgres://localhost/shop" --min-ms 200</pre>

  <h2>What it does</h2>
  <ul>
    <li>Folds plan trees to the nodes above a cost threshold you set</li>
    <li>Diffs two plans for the same fingerprint and colours the rows that moved</li>
    <li>Exports a single plan as JSON for explain.depesz.com or a bug report</li>
    <li>Runs against a replica; it never issues a write</li>
  </ul>

  <h2>What it does not do</h2>
  <ul>
    <li>Rewrite your query. It will show you the node, not the fix.</li>
    <li>Store history beyond the ring buffer. Point it at a file if you want that.</li>
    <li>Work on RDS without auto_explain enabled in the parameter group.</li>
  </ul>

  <h2>Overhead</h2>
  <table>
    <thead><tr><th>Setting</th><th>Added latency p99</th><th>Log volume</th></tr></thead>
    <tbody>
      <tr><td>min-ms 200, no analyze</td><td>0.3 ms</td><td>~40 MB/day</td></tr>
      <tr><td>min-ms 50, no analyze</td><td>0.4 ms</td><td>~310 MB/day</td></tr>
      <tr><td>min-ms 200, analyze on</td><td>4.1 ms</td><td>~90 MB/day</td></tr>
    </tbody>
  </table>
  <p>Measured on a c7g.2xlarge running pgbench at scale 500. Numbers from your workload will
  differ; the analyze row is the only one worth being careful about.</p>

  <h2>v0.4.0 🚀 Ring buffer</h2>
  <p>Plans are now kept per fingerprint rather than globally, so a chatty query can no longer
  evict the one you were watching. <code>--keep</code> sets the depth; the old
  <code>--history</code> flag still works and warns.</p>
  <p>Earlier notes are in <a href="/changelog">the changelog</a>.</p>

  <div class="install">
    <span>MIT licensed · 2,900 lines of Go · no daemon</span>
    <button type="button">Read the source</button>
  </div>
</div>
`;

// The control. Written the way a page comes out when nobody made a decision:
// the stock indigo-to-violet wash, Inter as the only family on a marketing
// route, glass cards on dark, an emoji per feature, an eyebrow over every
// heading, and copy assembled from the usual parts.
const GENERIC_LANDING = `
<style>body { font-family: Inter, sans-serif; }</style>
<section class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-24 text-center text-white">
  <p class="text-xs uppercase tracking-widest opacity-80">Introducing FlowStack</p>
  <h1 class="text-6xl font-bold">Ship faster with AI</h1>
  <p class="mt-4 text-lg opacity-90">In today's fast-paced world, teams need to move quickly.
  FlowStack seamlessly integrates with your existing workflow to effortlessly unlock your team's
  full potential.</p>
  <p class="mt-6 text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">10x</p>
  <div class="mt-8 flex justify-center gap-4">
    <a href="/signup" class="rounded-full bg-white px-8 py-3 font-semibold text-indigo-600">Get Started</a>
    <a href="/docs" class="rounded-full border border-white px-8 py-3 font-semibold">Learn More</a>
  </div>
</section>

<section class="bg-slate-900 py-20">
  <p class="text-xs uppercase tracking-widest text-indigo-400">Features</p>
  <h2 class="text-4xl font-bold text-white">Everything you need</h2>
  <div class="mt-10 grid grid-cols-3 gap-6">
    <div class="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-lg backdrop-blur">
      <h3 class="text-xl font-semibold text-white">🚀 Lightning fast</h3>
      <p class="mt-2 text-slate-300">Blazing fast performance that seamlessly scales.</p>
    </div>
    <div class="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-lg backdrop-blur">
      <h3 class="text-xl font-semibold text-white">🔒 Enterprise ready</h3>
      <p class="mt-2 text-slate-300">Bank-grade security that effortlessly protects your data.</p>
    </div>
    <div class="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-lg backdrop-blur">
      <h3 class="text-xl font-semibold text-white">⚡ Built for scale</h3>
      <p class="mt-2 text-slate-300">Infrastructure that effortlessly grows with you.</p>
    </div>
  </div>
</section>

<section class="bg-slate-900 py-20">
  <p class="text-xs uppercase tracking-widest text-indigo-400">Testimonials</p>
  <h2 class="text-4xl font-bold text-white">Loved by teams everywhere</h2>
  <p class="mt-4 text-slate-300">Join thousands of teams who have already made the switch.</p>
</section>

<section class="bg-slate-900 py-20 text-center">
  <p class="text-xs uppercase tracking-widest text-indigo-400">Get started today</p>
  <h2 class="text-4xl font-bold text-white">Ready to transform your workflow?</h2>
  <a href="/signup" class="mt-8 inline-block rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-10 py-4 font-semibold text-white">Get Started</a>
</section>
`;

describe("the distinctive-page matrix — pages with a point of view score zero", () => {
  it("leaves a brutalist landing page alone", () => {
    expect(pageFindings(BRUTALIST_LANDING, "app/page.html")).toEqual([]);
    expect(pageScore(BRUTALIST_LANDING, "app/page.html")).toBe(0);
  });

  it("leaves a serif editorial layout alone", () => {
    expect(pageFindings(SERIF_EDITORIAL, "app/(reading)/estuario/page.html")).toEqual([]);
    expect(pageScore(SERIF_EDITORIAL, "app/(reading)/estuario/page.html")).toBe(0);
  });

  // The decisive one. Inter is the correct family for a dense application
  // surface, and `default-ui-font` is only usable if it can tell that surface
  // apart from a brand page. If this fires, the rule is wrong, not the page.
  it("leaves a dense trading dashboard on Inter alone", () => {
    expect(pageFindings(TRADING_DASHBOARD, "src/app/(desk)/positions/page.tsx")).toEqual([]);
    expect(pageScore(TRADING_DASHBOARD, "src/app/(desk)/positions/page.tsx")).toBe(0);
  });

  // The other half of the dashboard's panel labels, and the reason the fixture
  // above uses single-line headers rather than stacks.
  //
  // While building this matrix I first wrote these panels the stacked way — a
  // small uppercase category label with a separate <h2> under it — and the
  // dashboard scored 6. I judged that a warranted catch rather than a false
  // positive and left the rule alone, but that judgement lived only in prose.
  // It belongs here, as evidence: same panel markup, two constructions, two
  // outcomes, both pinned.
  //
  // The rule is right about this one. A label reading "Ticket" over a heading
  // reading "Order ticket — RXZ5" restates itself, and "Book" over "EU Rates —
  // Book 3" does the same; the label is not carrying information the heading
  // lacks. That is the rule's own description of the defect — a label on every
  // section is chrome, not structure — and it holds on a dashboard exactly as
  // it holds on a landing page. A dense desk labels a panel once, on one line,
  // which is what TRADING_DASHBOARD does and why it stays silent.
  //
  // This is also the rule's only positive fixture outside the generic control,
  // so it pins the firing direction against markup someone would really write
  // rather than against a three-line synthetic block.
  const DASHBOARD_PANELS_STACKED = `
    <section>
      <p className="text-xs uppercase tracking-wide text-[#6B7480]">Book</p>
      <h2 className="mb-1 text-[12px] font-semibold text-[#E8ECF2]">EU Rates — Book 3</h2>
      <table className="w-full border-collapse"><tbody><tr><td>RXZ5</td></tr></tbody></table>
    </section>
    <aside className="border-l border-[#191D24]">
      <p className="text-xs uppercase tracking-wide text-[#6B7480]">Ticket</p>
      <h2 className="mb-1 text-[12px] font-semibold text-[#E8ECF2]">Order ticket — RXZ5</h2>
      <form className="px-2 py-2"><button type="submit">Buy</button></form>
      <p className="text-xs uppercase tracking-wide text-[#6B7480]">Limits</p>
      <h2 className="mb-1 text-[12px] font-semibold text-[#E8ECF2]">Desk utilisation</h2>
      <dl className="text-[11px]"><dt>DV01 of limit</dt><dd>41,207 / 60,000</dd></dl>
    </aside>
  `;

  it("does flag those same panels when each label is stacked over a heading", () => {
    expect(pageFindings(DASHBOARD_PANELS_STACKED, "src/app/(desk)/positions/page.tsx"))
      .toContain("eyebrow-over-every-heading");
  });

  it("leaves a warm consumer app screen alone", () => {
    expect(pageFindings(WARM_CONSUMER_APP, "src/app/(app)/today/page.tsx")).toEqual([]);
    expect(pageScore(WARM_CONSUMER_APP, "src/app/(app)/today/page.tsx")).toBe(0);
  });

  it("leaves a monochrome developer tool alone", () => {
    expect(pageFindings(MONO_DEV_TOOL, "app/page.html")).toEqual([]);
    expect(pageScore(MONO_DEV_TOOL, "app/page.html")).toBe(0);
  });

  // The five assertions above would all still pass if `isBrandSurface` were
  // hard-wired to false — every one of these pages sits on a path that does
  // not read as marketing. These two tests remove that escape hatch.
  //
  // First: four of the five are clean because of what they are, not where
  // they live. Put the same source on a marketing route, where the font rule
  // is at its most willing to speak, and it still finds nothing — because a
  // condensed grotesque, a display serif, a rounded humanist face, and the
  // system mono stack are none of them a default UI sans.
  it("keeps four of them clean even when served from a marketing route", () => {
    for (const [name, page, naturalPath, brandPath] of [
      ["brutalist", BRUTALIST_LANDING, "app/page.html", "app/(marketing)/page.html"],
      ["serif editorial", SERIF_EDITORIAL, "app/(reading)/estuario/page.html", "app/(marketing)/page.html"],
      ["warm consumer", WARM_CONSUMER_APP, "src/app/(app)/today/page.tsx", "app/(marketing)/page.tsx"],
      ["mono developer tool", MONO_DEV_TOOL, "app/page.html", "app/(marketing)/page.html"],
    ] as const) {
      // The load-bearing direction. Asserting `true` on a `(marketing)` path
      // cannot fail — BRAND_PATH matches the segment whatever the page says —
      // so it is the *natural* path that pins the premise these perturbations
      // rest on: on its own route each page is genuinely off-surface, which is
      // why the flip below means something. This is also the assertion that
      // would fire first if `isBrandSurface` were ever widened.
      expect(isBrandSurface(page, naturalPath), `${name} on its own route`).toBe(false);
      expect(isBrandSurface(page, brandPath), `${name} on a marketing route`).toBe(true);
      // Same extension either side, so the route is the only variable moving —
      // an `.html` fixture re-masked as `.tsx` would change two things at once.
      expect(pageFindings(page, brandPath), name).toEqual([]);
    }
  });

  // Second, and this is the one that gives the dashboard assertion its teeth:
  // the dashboard is the single fixture whose silence *is* a surface decision.
  // Same markup, same Inter, moved to a marketing route — and the rule speaks.
  // That proves the dashboard is quiet because the audit understood it was
  // application UI, not because `default-ui-font` is dead on arrival.
  it("still flags that same Inter when the dashboard markup is served as a brand page", () => {
    expect(pageFindings(TRADING_DASHBOARD, "app/(marketing)/page.tsx")).toContain("default-ui-font");
  });

  // Without this the matrix above would pass just as well if every rule were
  // deleted. This is the half that proves the tool can still tell.
  it("scores a page nobody made a decision about well above 50", () => {
    expect(pageScore(GENERIC_LANDING, "app/(marketing)/page.tsx")).toBeGreaterThan(50);
  });

  it("names the usual suspects on that page rather than one catch-all", () => {
    const fired = new Set(pageFindings(GENERIC_LANDING, "app/(marketing)/page.tsx"));
    for (const rule of [
      "ai-default-gradient",
      "default-ui-font",
      "emoji-as-icon",
      "stock-card-chrome",
      "eyebrow-over-every-heading",
      "gradient-text",
      "stock-glass-on-dark",
      "hype-opener",
      "filler-adverb",
      "generic-cta",
    ]) {
      expect(fired, `expected ${rule} on the generic page`).toContain(rule);
    }
  });

  it("does not resurrect the uniform-card-grid rule that was cut", () => {
    expect(pageFindings(GENERIC_LANDING, "app/(marketing)/page.tsx")).not.toContain("uniform-card-grid");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// `classesOf` read `\b(?:class|className)\s*=` out of the raw attribute chunk,
// so `data-class` and a `class="…"` written inside another attribute's value
// both counted as classes on the element. Two shipped auditors disagreed about
// the same markup: `perf.ts`'s reader got it right.
// ─────────────────────────────────────────────────────────────────────────────
describe("visual rules — a class list is only what the element declares", () => {
  it("does not read a class attribute written inside another attribute's value", () => {
    expect(ids(`<div data-example='class="from-indigo-500 to-purple-600"'>x</div>`))
      .not.toContain("ai-default-gradient");
  });

  it("does not read data-class as class", () => {
    expect(ids(`<div data-class="from-indigo-500 to-purple-600">x</div>`))
      .not.toContain("ai-default-gradient");
  });

  it("still reads a real class and a real className", () => {
    expect(ids(`<div class="bg-linear-to-r from-indigo-500 to-purple-600">x</div>`))
      .toContain("ai-default-gradient");
    expect(ids(`<div className="bg-gradient-to-r from-indigo-500 to-purple-600">x</div>`))
      .toContain("ai-default-gradient");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A bound `:class` is not an unreadable value the way a bound `:alt` is — the
// class names are literal text in the file, not something only known at
// runtime. `classesOf` gained `if (!at || at.bound) continue;` when it moved
// onto the shared attribute reader in scan.ts, which is right for `alt` and
// wrong for `class`: it made the gradient and gradient-text rules blind on
// every Vue and Angular file that binds its classes, which is how those
// frameworks are conventionally written. `<section :class="[...]">` and
// `<h2 :class="'...'">` fired at 5a10dcc and went silent at fb18227; the same
// markup with a static `class=` fired at both.
// ─────────────────────────────────────────────────────────────────────────────
describe("visual rules — a bound :class is read, unlike a bound :alt", () => {
  it("reads Vue's array-syntax :class binding", () => {
    expect(ids(`<section :class="['bg-gradient-to-r','from-indigo-500','to-purple-600']">x</section>`, "Hero.vue"))
      .toContain("ai-default-gradient");
  });

  it("reads Vue's string-syntax :class binding", () => {
    expect(ids(`<h2 :class="'bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent'">x</h2>`, "Hero.vue"))
      .toContain("gradient-text");
  });

  it("reads Vue's object-syntax :class binding", () => {
    expect(ids(`<div :class="{'from-indigo-500': active, 'to-purple-600': active}">x</div>`, "Hero.vue"))
      .toContain("ai-default-gradient");
  });

  it("reads Angular's [class] binding the same way", () => {
    expect(ids(`<div [class]="'bg-gradient-to-r from-indigo-500 to-purple-600'"></div>`, "hero.component.html"))
      .toContain("ai-default-gradient");
  });

  it("reads v-bind:class, the unabbreviated form", () => {
    expect(ids(`<div v-bind:class="['from-indigo-500','to-purple-600']"></div>`, "Hero.vue"))
      .toContain("ai-default-gradient");
  });

  it("does not fire on a :class binding that holds only an identifier", () => {
    // "theme" is literal text too — it just matches no rule below. Nothing
    // special-cases this; it is simply the harmless case.
    expect(ids(`<div :class="theme">x</div>`, "Hero.vue")).not.toContain("ai-default-gradient");
  });

  it("still treats a bound :alt as unreadable, not absent — the distinction this fix has to keep", () => {
    // classesOf has nothing to say about alt; this pins the boundary at the
    // seo auditor, which is where alt-missing actually lives, so a change to
    // classesOf can't be mistaken for having widened what a bound alt claims.
    const html = `<img :alt="caption" src="a.jpg">`;
    expect(seoRules(html, "page.html").map((f) => f.rule)).not.toContain("alt-missing");
  });

  it("full reproduction: both syntaxes on one element fire what they fired before the routing regression", () => {
    const hero = [
      `<section :class="['bg-gradient-to-r','from-indigo-500','to-purple-600']">`,
      `<h2 :class="'bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent'">Title</h2>`,
      `</section>`,
    ].join("");
    const found = ids(hero, "Hero.vue");
    expect(found).toContain("ai-default-gradient");
    expect(found).toContain("gradient-text");
  });
});
