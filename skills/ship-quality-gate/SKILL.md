---
name: ship-quality-gate
description: Run the deterministic auditors over a real project before it ships — design drift, security headers, generated-default tells, SEO/GEO signals, delivery signals, Apple project configuration — and read the results correctly, disclosure list included. Use when someone asks "audit this", "is this ready to ship", "check the whole repo", or when the design argument has run out of taste and needs evidence.
sources: accessibility, design-tokens-theming, clean-app-design, design-engineering, iconography, web-security-headers, frontend-attack-surface, auth-and-session-ux, ai-default-aesthetic, typography-craft, visual-craft-standards, ux-writing, on-page-seo, technical-seo, seo-for-designers, apple-hig-liquid-glass, apple-accessibility, apple-shipping-readiness
---

# Ship Quality Gate

Design advice is cheap and unfalsifiable. The gate is the other half of the job: seven auditors that read a real repository and hand back findings with a rule id, a severity, a `file:line` and the document the rule comes from. Run them before anyone argues about anything.

The trade they make is the whole thing to understand. **Each one reports what was *authored*, not what was *measured*.** They load no page, render nothing, time nothing, and make no request to your site. A finding is a fact about the text of a file that was read. That is why they are deterministic, offline and fast — and it is exactly what bounds them.

> These ship in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`). The rules behind them live in the base: `get_design_doc("web-security-headers")`, `get_design_doc("frontend-attack-surface")`, `seo_geo_guide`, `get_design_doc("ai-default-aesthetic")`, `get_design_doc("apple-shipping-readiness")`. For what these tools structurally cannot reach, pair them with `measure_screenshot` (the render), `audit_accessibility` (contrast ratios and target sizes), `audit_ux_copy` (the words) and the `/saglitzdesign:design_review` workflow.

## The seven

| Tool | Input | What it reads |
|---|---|---|
| `design_lint` | snippet only | One snippet of HTML/CSS/JSX/Tailwind, and only that snippet: hardcoded colours instead of tokens, px font sizes, removed focus outlines, images with no alt, clickable divs, icon-only buttons with no label, positive tabindex, ad-hoc radii, `!important`. Some rules read a line; others read the whole snippet, which is why a `:focus-visible` ring pasted in beside an `outline: none` clears it. |
| `audit_project` | directory only | The whole design surface: the lint rules over every file it reads, plus the project's distinct colours, type sizes, radii, shadows and spacings collapsed into a consistency score, ranked worst file first. **Only the consistency count is cross-file.** The lint half runs per file, so `outline: none` in one stylesheet is an error even when the `:focus-visible` ring replacing it sits in the next one, and this tool offers no way to hand it both. |
| `audit_security` | directory or snippet | What a frontend actually ships: CSP, HSTS, unpinned cross-origin scripts, mixed content, credentials in `localStorage`, secret-named `NEXT_PUBLIC_`/`VITE_` variables, unsandboxed third-party iframes, wildcard `postMessage`, raw-HTML sinks with no sanitiser, production source maps, un-ignored `.env`. Header state is read as text, never evaluated, and only where your stack declares it in a shape it recognises: `next.config`, `vercel.json`, `netlify.toml`, `_headers`, `staticwebapp.config.json`, Nuxt `routeRules`, a Remix/React Router `headers` export, SvelteKit `hooks.server.ts` and `kit.csp`, Next.js and Astro `middleware`, `new Response(body, { headers })` and `new Headers({…})` on Cloudflare Workers/Deno/Bun, Express `res.set` and `res.setHeader`, and `<meta http-equiv>`. A library that sets headers without naming them in your source (`helmet`, a framework preset, shared middleware) is invisible to it, so a `-missing` finding is scoped to the configuration files that were read rather than to your site. |
| `audit_generic_design` | directory or snippet | The specific defaults generated interfaces reach for: the stock indigo/violet gradient, one stock typeface on a brand surface, emoji standing in for icons, the repeated rounded-and-shadowed card recipe, gradient heading text, an eyebrow over every heading, the blur-and-white-tenth glass recipe, stock hype openers, stacked filler adverbs, a page whose calls to action all come from the stock set. Scores 0–100, each rule counted once. |
| `audit_seo_geo` | directory or snippet | Title and description presence and width, a second `<h1>`, a skipped heading level, a canonical that is absent, relative or aimed at staging, an hreflang set omitting the page itself, JSON-LD that fails to parse or declares a retired type, images with no alt, robots.txt crawl rules including the AI crawlers, a robots.txt naming no sitemap, a missing llms.txt, content that exists only once a script has run. |
| `audit_performance` | directory or snippet | Delivery instructions in the markup: a hero image held back by `loading="lazy"` or contradicting its own `fetchpriority`, an LCP candidate declaring no fetch priority, a hero background the preload scanner cannot see, images with no reserved box, a head `<script src>` carrying neither defer nor async nor module, `@font-face` with no `font-display`, fonts from a third-party CDN, scripts from more remote domains than "minimise" defends. |
| `audit_apple_ui` | directory only | The four surfaces an Xcode project declares configuration on — the information property list, `INFOPLIST_KEY_*` build settings, the entitlements plist, each colorset's `Contents.json` — plus the Swift sources. Infers iOS or macOS from those signals, then runs eight configuration and Swift rules under that verdict. |

## How to run it

1. **Absolute paths, always.** A relative path resolves against the server's working directory, which is usually not your project. A missing or non-directory path comes back as an error result, not as a clean audit.
2. **Directory mode, unless you are checking one snippet you are about to commit.** Configuration is where half of these rules live, and a snippet carries none of it. `audit_project` and `audit_apple_ui` refuse a snippet outright rather than pretending; the other four accept one and quietly check less. Pass `filename` with any snippet — a plain HTML file can prove metadata absent where a framework component cannot.
3. **Run the ones that apply, on the same directory.** Web project: `audit_project`, `audit_security`, `audit_generic_design`, `audit_seo_geo`, `audit_performance`. They carry no rule id in common, which is not the same as covering different ground — one `<img src="a.png">` comes back from `audit_project` as `img-no-alt` at `error` and from `audit_seo_geo` as `alt-missing` at `warning`, both citing `accessibility`. Expect the same defect under two names at two severities, and deduplicate by what the finding is about rather than by its rule id. Apple app: `audit_apple_ui`. Do **not** reach for `audit_project` there expecting Swift: its default extension list is the one the tool's own `extensions` description prints — web source only, no Swift and no configuration surface — so an Xcode project returns "Found no design source" with `filesRead: 0`. It earns its place on the web assets of a hybrid app, and `extensions` *replaces* that list rather than adding to it — name every extension you want read, each with a leading dot.
4. **Read `scan` before `findings`,** on every tool that returns one. It says how many files and bytes were actually read and what was skipped. If a cap was hit, every absence below it is unconfirmed.
5. **Fix errors, then warnings, citing `file:line` and the rule's document.** Re-run to prove the delta rather than asserting it.

## Reading a clean report

Every one of the seven returns a machine-readable `notVisible` list beside its findings and closes its markdown with a *Not visible to this audit* section. **That section is part of the result, not a disclaimer at the bottom of it.**

The reason is that silence has two causes — the rule ran and matched nothing, or the rule was gated and did not run here — and a reader acting on silence needs to know which one they have. `audit_apple_ui` makes this explicit: every platform-scoped rule stays quiet when the signals do not settle iOS versus macOS, and the report states which platform was inferred and from what, so its quiet can be read as the gate rather than as a pass.

So, three rules for reading the output:

- **A clean report means the files that were read declare nothing wrong under the rules that ran.** It is not a statement about the rendered page, the live response, the crawl, the ranking, or the product.
- **Pass the tool's own `notVisible` list on with the result.** It is that auditor's account of its own reach, derived from a run. This page names one or two entries per tool as illustration; the shipped lists are longer, and `audit_apple_ui`'s is the longest.
- **Nothing here substitutes for the measurement.** `audit_security` is not a penetration test — confirm the emitted headers on a real response. `audit_performance` is not a vitals report — Core Web Vitals are field data from real devices. `design_lint` computes no contrast ratio and sizes no target — `audit_accessibility` does that, and a keyboard and a screen reader do the rest.

## Anti-patterns

- **Reading silence as a pass.** The most expensive mistake available here, and the one every disclosure list exists to prevent.
- **Treating the 0–100 score as a design verdict.** `audit_generic_design` counts the specific tells it knows about; a brand whose colour genuinely is indigo is still flagged, because the finding names a fact, not a mistake. Its copy rules match English only, so the same page in two languages scores differently for the translation rather than the design. Whether the result is *good* belongs to `design_review_checklist` and a human looking at the render.
- **Linting markup and its stylesheet separately.** `design_lint` reads one snippet and nothing declared elsewhere, so `outline: none` is reported even when the `:focus-visible` ring replacing it lives in a file the call never saw. Paste them together.
- **Auditing named-scale utility classes and expecting the consistency count to see them.** That count reads CSS declarations and literal values in the text, so a page written entirely as `bg-indigo-500 rounded-lg text-sm p-4` can score 100/100 with nothing counted. Arbitrary-value utilities are a different case and *are* read — `rounded-[9px]`, `text-[13px]`, `bg-[#6366f1]` each count.
- **Running the gate once, at the end.** It is offline and takes seconds. It belongs in the loop, not in the retrospective.
- **Sending a human to redo a check the tool already did.** The findings carry a fix and a document. Apply them; spend the human on what the tools disclosed they could not reach.

## Checklist

- [ ] Every applicable auditor run against an absolute directory path.
- [ ] `scan` read first, wherever one is returned, and no cap hit.
- [ ] `notVisible` read and carried into whatever you report upward.
- [ ] Platform inference confirmed before any quiet `audit_apple_ui` rule is read as a pass.
- [ ] Errors cleared, warnings triaged, each fix citing `file:line`.
- [ ] The rendered and live halves checked where they actually happen — the browser, a real response, a keyboard, a screen reader.
- [ ] Re-run after the fixes, and the delta shown rather than claimed.
