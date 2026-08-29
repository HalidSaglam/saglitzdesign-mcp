<div align="center">

# SaglitzDesign MCP

**An expert design & marketing brain for your AI coding agent.**

A Model Context Protocol server that gives Claude, Cursor, and any MCP client
expert‑level guidance on **web, iOS, Android and macOS design** — plus the
**UX, copywriting, SEO, GEO and marketing** knowledge that makes a product
actually convert.

96 curated knowledge documents · 34 tools · 8 build/review/port workflows · MCP resources with id autocomplete · a one‑call design‑system builder · real token/color/type/elevation/motion/a11y generators · design & UX‑copy linters · production component recipes · phased roadmaps · real‑world visual examples

[![npm](https://img.shields.io/npm/v/saglitzdesign-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/saglitzdesign-mcp)
[![CI](https://github.com/HalidSaglam/saglitzdesign-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/HalidSaglam/saglitzdesign-mcp/actions/workflows/ci.yml)
[![skills](https://skills.sh/b/HalidSaglam/saglitzdesign-mcp)](https://skills.sh/HalidSaglam/saglitzdesign-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-000)](https://modelcontextprotocol.io)
[![Glama](https://glama.ai/mcp/servers/HalidSaglam/saglitzdesign-mcp/badges/score.svg)](https://glama.ai/mcp/servers/HalidSaglam/saglitzdesign-mcp)

[Why](#why) · [What's inside](#whats-inside) · [Tools](#tools) · [Resources](#resources) · [Install](#install) · [Usage](#usage) · [Your own rules](#your-own-design-rules) · [Changelog](CHANGELOG.md) · [License](#license)

</div>

---

## Why

LLMs are confidently wrong about design. They reach for defaults, invent
outdated specs, and give generic "make it clean and modern" advice. SaglitzDesign
replaces that with a **curated, sourced, prescriptive knowledge base** your agent
can query on demand — the kind of guidance you'd get from a senior product
designer, a conversion copywriter, and a technical SEO all at once.

Ask your agent to design a paywall, audit a landing page, or plan an iOS app,
and it pulls concrete rules ("44pt minimum touch target", "one primary button
per screen", "LCP ≤ 2.5s"), real patterns from top apps, and a phased roadmap —
instead of guessing.

- **Runtime‑independent.** The server reads only local files. No external API,
  no account, nothing to configure. It just works, offline.
- **Local by design.** It speaks MCP over **stdio only** and runs as a child
  process of your MCP client. There is no HTTP or SSE transport, so it cannot be
  hosted remotely or reached over a network — which is also why your prompts and
  code never leave your machine.
- **Prescriptive, not vague.** Every doc is written as rules an agent applies
  verbatim — numbers, thresholds, do/don't lists, anti‑patterns.
- **Grounded.** Design‑language specs from official sources; patterns studied
  from real top apps and sites; classics distilled from the actual books.

## What's inside

**96 knowledge documents across 11 categories:**

| Category | Coverage |
|---|---|
| 🎨 **Design languages** | Material 3 & M3 Expressive · Apple HIG + Liquid Glass (iOS 26) · deep **iOS**, **Android** (Android 16 / M3 Expressive) and **macOS** app‑design guides · **Apple accessibility** (Dynamic Type, VoiceOver, hit regions) and **Apple shipping readiness** (`Info.plist` purpose strings, entitlements, app icon sets, orientation/multitasking restrictions) · **Apple Intelligence design** (AI features: Writing Tools, App Intents, on‑device Foundation Models) · **visionOS / spatial design** (Vision Pro) · Fluent 2 · 2026 web trends · design tokens & theming (W3C DTCG) · Apple WWDC design principles (fluid interfaces) |
| 🧩 **Components** | Buttons (hierarchy, sizing, states, labels) · forms & inputs · navigation · cards / lists / modals / sheets / empty states |
| 🧠 **UX** | Nielsen heuristics & behavioral laws · accessibility (WCAG 2.2) · typography · color & dark mode · spacing & grids · motion · mobile UX · conversion / CRO · **data visualization** · **information architecture** · **i18n / localization (RTL)** · **AI product UX** (chat, streaming, agentic) · **onboarding & permission priming** |
| ✨ **Craft** | Expert polish standards · typographic craft · animation craft (easing, springs, interruptibility) · UX writing & cognitive load · 0–40 critique rubric · **clean/minimal app design** · **design‑engineering** (semantic HTML, CSS architecture, tokens‑in‑code) · **ethical design** (avoiding dark patterns) · **iconography** (choosing & using an icon system) · **the AI‑default aesthetic** (the stock gradient, font, card chrome and copy generated interfaces reach for, cited to each system's own docs) |
| 📚 **Books** | Distilled classics — *design:* Norman, Krug, Refactoring UI, psychology of design, grid/typography, interaction design (Cooper/Tidwell), **emotional design (Walter/Norman)** · *marketing:* Cialdini, Positioning, StoryBrand + Ogilvy, Hooked |
| 🗺️ **Process** | Product‑design & marketing‑website roadmaps · **design‑systems methodology** (Atomic Design, component API, governance) · **design handoff** (Figma Dev Mode, Code Connect, design↔dev) |
| 📣 **Marketing** | Branding & identity · email marketing · **HTML email development** (Outlook, dark mode, bulletproof) · ad creative · paywall benchmarks (RevenueCat 2026) · growth frameworks (loops/AARRR/PLG) · pricing strategy · analytics & experimentation · value proposition & JTBD · **content & distribution** (topic clusters, community, referral) · **App Store Optimization (ASO)** |
| 🔎 **SEO** | Technical SEO (Core Web Vitals) · on‑page & E‑E‑A‑T · SEO for designers |
| 🤖 **GEO** | Generative Engine Optimization — visibility in ChatGPT / Perplexity / AI Overviews, llms.txt, citation tactics |
| 🔐 **Security** | Web security headers & CSP — strict nonce/hash policies, `strict-dynamic`, Trusted Types, HSTS, SRI, cross-origin isolation, and the superseded headers auditors still ask for. Every claim sourced to a spec or vendor doc, re-verified on a 90-day clock. |
| 🖼️ **Patterns & examples** | Real‑world patterns studied from top apps & sites (incl. **e‑commerce & checkout** and **fintech / trust** flows), plus a curated library of real‑world example screens |

**Which documents' sources are enforced, and which are not.** Of the 96
documents, **11 have their `sources:` checked by the test suite against a tiered
allowlist** — the six Apple design‑language guides (`apple-hig-liquid-glass`,
`ios-app-design`, `macos-app-design`, `apple-accessibility`,
`apple-shipping-readiness`, `wwdc-design-principles`) and the five `security`
documents. **The other 85 are curated but not yet checked**, and extending the
assertion to them is its own piece of work rather than a formality: measured
today, 66 of the 85 would fail on 282 citations across 133 distinct hosts (plus 55
sources that are not URLs at all). Note
that `apple-intelligence-design` and `visionos-spatial-design` are Apple‑topic
documents that sit *outside* the enforced set. `get_design_doc` prints which
side of this line a document is on, next to its sources, so you never have to
come back here to find out.

## Workflows (`/` prompts) — "build me a…"

Beyond answering questions, SaglitzDesign ships **prompts** that orchestrate an
entire build end‑to‑end. In Claude Code they appear in the `/` menu under a name
that depends on how you installed it. Installed as the Claude Code plugin they
are `/saglitzdesign:build_landing_page` and so on — plugin commands, one
generated file per workflow in `commands/`. With the server installed on its own
they are `/mcp__saglitzdesign__build_landing_page`, which the menu labels
`saglitzdesign:build_landing_page (MCP)`. That label is typeable too, ` (MCP)`
suffix and all — it is just a clumsier way to reach the same prompt. What does
*not* work is that short form with the suffix dropped: Claude Code hands the bare
`server:prompt` alias to first‑party Anthropic connectors only — the URL has to
be https, on `api.anthropic.com`, under `/v1/design/` — and no other server gets
one, stdio or remote. (The plugin's `/saglitzdesign:build_landing_page` above
only looks like that alias — it is a plugin command namespace, a different
mechanism.)

Invoke one and the agent runs the full method — roadmap → positioning & copy → **generates
the design system** (color, type, layout, elevation, tokens) → real examples →
**writes the actual code** from the component recipes → runs the **deterministic
verify gate** (`design_lint`, `audit_accessibility`, `audit_design_system`,
`audit_ux_copy`) → opens it in a browser, screenshots, scores it against the
critique rubric, and iterates until it passes.

| Workflow | What it does |
|---|---|
| **`build_landing_page`** | Designs & builds a conversion‑focused landing page, copy‑first, with a visual critique loop. |
| **`build_website`** | Builds a multi‑page marketing site — positioning, IA, SEO/GEO, shared design system. |
| **`build_mobile_app_ui`** | Builds iOS or Android screens on the correct platform baseline (HIG/Liquid Glass or Material 3). |
| **`critique_screenshot`** | **Measures the screenshot, then critiques it** against the fixed 0–40 rubric — cites real ratios and colour counts, specific elements, no padding. |
| **`review_paywall`** | Scores a paywall / subscription onboarding against real RevenueCat 2026 conversion benchmarks. |
| **`design_review`** | Audits an existing site/app — runs the deterministic auditors first, so findings lead with measured numbers, then the checklists and the 0–40 rubric, ranked by severity. |
| **`redesign`** | Improves an existing UI (bolder / quieter / higher‑converting) using the craft standards, with a **measured** before→after (consistency score, critique score, lint findings, contrast failures). |
| **`port_to_platform`** | Takes an existing UI to another platform (iOS ↔ Android ↔ macOS ↔ web) surface by surface — porting the intent and IA, never the components. |

> Just type, e.g., `/saglitzdesign:build_landing_page a SaaS invoicing tool for
> freelancers` — everything after the command name becomes the brief, and the
> workflow asks for anything missing, then builds it. The `/mcp__saglitzdesign__…`
> form takes only the first whitespace‑separated word as its brief, so use the
> plugin command whenever the brief is a phrase. These are yours to type: every
> command carries `disable-model-invocation`, so the agent never starts one on
> its own. Asked in prose it reaches for the skills instead, and they cover much
> of the same ground — design review, landing‑page conversion, Apple platforms —
> as guidance rather than as this orchestrated build. Nothing in them covers
> `review_paywall`, which runs only when you type it.
>
> The visual critique loop uses whatever browser tool is connected (Claude in
> Chrome, Playwright, or chrome‑devtools MCP) to see and refine its own output.
> Without one, it reviews the code directly.

## Tools

| Tool | What it does |
|---|---|
| **`create_design_system`** | **The one‑call foundation.** Brand color + vibe + platform → a complete, coherent starter: WCAG‑verified color (light+dark), matched fonts, an icon library, a modular type scale, an elevation ramp, ready‑to‑paste tokens, the components to build, and a checklist — all generated to work together. |
| **`get_design_roadmap`** | **Start here for process.** A phased, expert process for a project type (website, landing page, iOS / Android / macOS app, SaaS web app) — each phase has a goal, exit criteria, and the exact docs to read. |
| **`search_design_knowledge`** | Natural‑language search across everything, returning the most relevant section of the best‑matching docs. |
| **`get_design_doc`** | Fetch any document in full by id. |
| **`get_component_guidance`** | Deep dive on a component or screen (button, form, paywall, hero, pricing…) — specs + real‑world patterns. |
| **`get_design_language`** | Full platform / design‑system references (Material 3, Liquid Glass, iOS/Android/macOS, Fluent 2, web trends, tokens). |
| **`compare_design_languages`** | **Building on more than one platform?** Side‑by‑side iOS / Android / macOS / web conventions for one surface (navigation, buttons, sheets, motion, forms…), plus the porting rules — and an explicit *do NOT port* list. |
| **`get_design_examples`** | Curated real‑world examples of a pattern from top apps/sites, with notes on what each does well. (Screenshots are a local‑only asset — see [Visual examples](#visual-examples).) |
| **`design_review_checklist`** | An assembled audit checklist per project type and focus (UI, UX, accessibility, SEO, GEO, conversion, copywriting). |
| **`seo_geo_guide`** | SEO and GEO guides, optionally narrowed to a topic. |
| **`import_design_tokens`** | **Already have a design system?** Paste your CSS custom properties, shadcn `:root` block, DTCG file or theme JSON and get back the roles it names, the roles it leaves undefined, a WCAG check on the pairs it defines, and the whole set re‑emitted as CSS / Tailwind / SwiftUI / Compose / DTCG. The inverse of `generate_design_tokens` — take a web theme to iOS, or audit an inherited one. Only *named* tokens are read; JS configs are never evaluated. |
| **`generate_design_tokens`** | **Real artifacts, not advice** — turns a color/spacing/type spec into CSS variables, Tailwind v4, SwiftUI, Jetpack Compose, and W3C DTCG JSON. |
| **`audit_accessibility`** | Deterministic WCAG 2.2 checks — exact contrast ratios for color pairs + tap‑target sizes per platform, with fixes. |
| **`get_component_recipe`** | Production‑ready, accessible reference **code** for a component (button, input, modal, toast, card, switch, tabs, empty‑state, list‑row) in react‑tailwind, html‑css, SwiftUI, or Compose — all states, ARIA, keyboard, correct motion. Pass your `scales` — the neutral, primary and danger ramps `generate_color_system` returns — and the code comes back in **your** colours, dark‑mode shades included. |
| **`generate_color_system`** | **One brand color → a full palette.** A 50–950 tonal scale, a cohesive neutral ramp, status colors (danger / success / warning) harmonised with your brand, and light + dark semantic tokens — every text/UI pair WCAG‑verified and auto‑corrected. Feeds straight into `generate_design_tokens`. |
| **`suggest_font_pairing`** | Curated, production font pairings for a vibe (SaaS, editorial, bold, native…) — heading + body (+ mono) with paste‑ready CSS stacks, weights, rationale, and a type scale. |
| **`fix_contrast`** | Repairs a failing color pair: computes the **nearest** accessible color (hue/saturation preserved) that meets your WCAG target — the corrected value, not just a fail report. |
| **`suggest_icon_library`** | Recommends the right icon system for a vibe/platform (Lucide, Phosphor, Solar, SF Symbols, Material Symbols…) — with license, install command, coverage, fit rationale, and usage rules. |
| **`generate_type_scale`** | A modular type scale (base × ratio) → named steps with line‑heights, tracking, and fluid `clamp()`, as CSS variables + Tailwind. |
| **`generate_elevation_system`** | A cohesive layered box‑shadow ramp (flat→modal) as CSS variables + Tailwind, with dark‑mode guidance. |
| **`generate_layout_system`** | Breakpoints (with what changes at each), container widths, a column grid, an intrinsic auto‑fit grid, container queries, and a fluid section‑rhythm scale — CSS variables + Tailwind v4. |
| **`generate_motion`** | Easing + duration tokens and ready‑to‑paste keyframe animations (fade/slide/scale/spring/shimmer) in CSS, Framer Motion, or SwiftUI — reduced‑motion included. |
| **`design_lint`** | Lints an HTML/CSS/JSX/Tailwind snippet for design & a11y anti‑patterns (hardcoded values, killed focus, missing alt/labels, clickable divs, unlabelled inputs…) with line numbers and fixes. Tag‑aware, so formatting never changes the verdict. Returns markdown **plus structured output** — findings, a severity summary, and a machine‑readable `notVisible` list of what it could not check. |
| **`measure_screenshot`** | **Measures your actual screen.** Give it a PNG and it reports the real palette and colour count, true WCAG contrast ratios for the pairs on screen, density, and structural detections (alignment, rhythm, off‑grid gaps) each with a confidence level — plus a self‑contained HTML report you can open and share. Pure‑Node PNG decoding, no network, no dependencies. |
| **`audit_project`** | **Audits a real codebase, not a snippet.** Point it at a directory: it walks your design source, lints every file, and scores the whole project for consistency — cross‑file drift being exactly what a single‑file lint cannot see. Findings ranked worst‑file‑first with file:line, plus an explicit list of what it did not look at. Returns markdown **plus structured output** — findings, a severity summary, a machine‑readable `notVisible` list, and a `scan` block reporting how many files and bytes were actually read, which were skipped for size or could not be opened, and whether a cap was hit. A missing or non‑directory path comes back as an error result, not an empty audit. |
| **`audit_security`** | **Audits a web project or snippet for the defects that actually ship** — missing or weak Content‑Security‑Policy, absent HSTS, unpinned cross‑origin scripts, mixed content, credentials in `localStorage`, secret‑named `NEXT_PUBLIC_`/`VITE_` variables, unsandboxed third‑party iframes, wildcard `postMessage`, raw‑HTML sinks with no sanitiser, production source maps and un‑ignored `.env` files. Header state is inferred from wherever your stack declares it — `next.config`, `vercel.json`, `netlify.toml`, `_headers`, `staticwebapp.config.json`, `firebase.json`, Nuxt `routeRules`, a Remix `headers` export, SvelteKit `hooks.server.ts` / `kit.csp`, Astro middleware and Next middleware or its Next‑16 rename `proxy.ts`, `new Response(…, { headers })` and `new Headers({…})` on Workers/Deno/Bun, a quoted header‑name property in any JSON or object literal, any call whose method is `set`, `setHeader`, `append` or `header` whatever the object is named (`res.set` / `res.setHeader`, `headers.set` / `headers.append`, Fastify `reply.header`, Hono `c.header`, Koa `ctx.set`), and `<meta http-equiv>` — read as text and never evaluated; this makes no network request, and says what it could not see. Returns markdown **plus structured output** — findings, a severity summary, and a machine‑readable `notVisible` list of what it could not check. A missing or non‑directory path comes back as an error result, not an empty audit. |
| **`audit_seo_geo`** | **Audits the SEO and GEO signals that are actually in your source** — a missing `<title>` and one outside the width a result gives it, the same for the meta description, multiple H1s, skipped heading levels, a missing canonical, one written relative in a self‑contained document, one left pointing at localhost or staging, an hreflang set that never lists the page itself, JSON‑LD that does not parse or declares no `@context`/`@type` or declares a type whose rich result Google has retired, missing alt text, robots.txt crawl rules (including the AI crawlers behind ChatGPT, Claude, Perplexity and Google's AI surfaces), a robots.txt naming no sitemap, no `llms.txt` beside it, and content that only exists once a script has run. Absence is claimed only where it can be proven — a self‑contained HTML document, or a whole directory — and a capped scan downgrades every absence claim to an unconfirmed note. It reads source and measures nothing: no request is made, so no finding is a Core Web Vitals result, an indexing status or a ranking outcome. Returns markdown **plus structured output** — findings, a severity summary, and a machine‑readable `notVisible` list of what it could not check. |
| **`audit_performance`** | **Audits the performance signals that are actually in your source** — a hero image held back by `loading="lazy"` or contradicting its own `fetchpriority`, the LCP‑candidate image declaring no fetch priority at all, a hero background declared in CSS or an inline style that the HTML preload scanner never sees, images with no `width`/`height` or `aspect-ratio` to reserve their box, a `<script src>` in the `<head>` carrying neither `defer` nor `async` nor `type="module"`, `@font-face` without `font-display`, third‑party font hosts, and scripts loaded from more distinct remote domains than any reading of "minimise" defends. The hero rules are deliberately narrow — the first image inside `<main>`, with the header logo and the mid‑article diagram structurally excluded — so some pages get no hero finding at all, and that is returned explicitly rather than left to read as a clean result. Core Web Vitals are field data; this loads nothing and times nothing. Returns markdown **plus structured output**. |
| **`audit_apple_ui`** | **Audits an iOS or macOS app against Apple's own documentation.** Point it at the Xcode project directory: it reads the four surfaces a project declares configuration on — the information property list, `INFOPLIST_KEY_*` build settings in `project.pbxproj`, the entitlements plist, and each colorset's `Contents.json` — infers whether the target is iOS or macOS from those plus the Swift imports, and runs eight rules: a custom colorset with no `luminosity: dark` appearance, the deprecated `UIRequiresFullScreen` key (either spelling), a microphone entitlement declared under one capability and not its twin, no App Sandbox entitlement on macOS (reported as a fact about the Mac App Store channel, not as a defect), plus `NavigationView`, `.font(.system(size:))` on iOS only, a colour written as numbers, and a `Button` whose whole label is one SF Symbol. Every platform‑scoped rule stays silent when the signals do not settle the question, and the report names the verdict and the signals behind it so a silence reads as the gate rather than as a result. It builds nothing, runs no simulator and takes no screenshot. Returns markdown **plus structured output** — findings, a severity summary, a `scan` block, and the longest `notVisible` list this server ships, every entry of it derived from a run. Directory only; a `code` argument, a missing path or a path that is a file comes back as an error result, not an empty audit. |
| **`audit_design_system`** | **Is there actually a system here?** Point it at real CSS/JSX and get a consistency score plus the sprawl behind it: how many distinct colors, sizes, radii, shadows and spacings are in use, which colors are indistinguishable duplicates, what's off the 4pt grid, token adoption — and a consolidation plan. |
| **`audit_generic_design`** | **Audits for the specific defaults generated interfaces reach for** — the stock Tailwind indigo/violet/purple gradient (as classes, hex, or OKLCH), Inter/Roboto/Open Sans/DM Sans/Plus Jakarta Sans as the only declared typeface on a brand surface, emoji standing in for icons, the `rounded-2xl` + `shadow-lg` + border card recipe repeated across a page, gradient‑filled heading text, an eyebrow label over every heading, the `backdrop-blur` + `white/10` glassmorphism recipe, stock hype‑opener copy, stacked filler adverbs, and a page whose every CTA is drawn from the stock set. Every finding is a fact about the source — a class name, a phrase, a repeated structure — never a judgement about whether the result is good design; a 0–100 score counts distinct signals, not occurrences, and is itemised to rule and file:line. Pair with `design_review_checklist` or `get_design_doc("design-critique-scoring")` for the taste half. Returns markdown **plus structured output** — findings, a severity summary, a machine‑readable `notVisible` list, the itemised score, and (in directory mode) a `scan` block flagging a truncated read. A missing or non‑directory path comes back as an error result, not an empty audit. |
| **`audit_ux_copy`** | Objective copy audit — readability (Flesch), sentence length, passive voice, jargon, filler, user‑focus, weak CTAs — with flagged phrases and fixes. |
| **`list_design_knowledge`** | Browse the full knowledge index by category / platform. |
| **`knowledge_freshness`** | Reports each doc's age vs a per‑category staleness threshold, so the base can be kept current. |

## Resources

Beyond tools, the knowledge base is exposed as MCP **resources**, so clients that
support them (Claude Desktop, Cursor) can `@`‑mention a document directly —
with id autocompletion — instead of spending a tool call:

| URI | What it is |
|---|---|
| `saglitzdesign://index` | The whole index: every document by category, with platform and last‑verified date. |
| `saglitzdesign://doc/{id}` | One knowledge document in full (96 of them). Autocompletes on `id`. |
| `saglitzdesign://recipe/{component}` | A component's spec plus its reference implementation in every available stack. |

### Visual examples

`get_design_examples` serves a curated library of real app/site screens. The
**screenshots themselves are third‑party assets and are not redistributed**, so
the published npm package ships the annotations and source links without the
images — the tool detects this and says so rather than pretending otherwise. If
you clone the repo you can rebuild the local image library; see
[`scripts/regenerate-examples.md`](scripts/regenerate-examples.md).

## Install

**Requirements:** Node.js 20+.

**From npm** (no clone needed):

```bash
npx saglitzdesign-mcp
```

**From source:**

```bash
git clone https://github.com/HalidSaglam/saglitzdesign-mcp.git
cd saglitzdesign-mcp
npm install
npm run build
```

### Claude Code

Register it once (via npm — no clone), available in every project:

```bash
claude mcp add --scope user saglitzdesign -- npx -y saglitzdesign-mcp
```

Or, if you cloned the repo, point it at the built file:

```bash
claude mcp add --scope user saglitzdesign node /absolute/path/to/saglitzdesign-mcp/dist/index.js
```

### As a plugin

One install brings all three pieces — the MCP server, all eight skills (the
seven depth skills plus the umbrella that routes into them) and a slash
command for every workflow:

```bash
claude plugin marketplace add HalidSaglam/saglitzdesign-mcp
claude plugin install saglitzdesign@saglitz
```

The plugin declares its server as `npx -y saglitzdesign-mcp@latest`, so the
server itself still comes from npm; the skills and the commands are files inside
the plugin. `claude plugin details saglitzdesign@saglitz` lists what arrived.

**The three ways of installing do not carry the same payload:**

| Install | Server, knowledge base, recipes | Skills | `/saglitzdesign:…` commands |
|---|---|---|---|
| `claude plugin install saglitzdesign@saglitz` | yes | all eight — seven depth skills plus the umbrella | one per workflow |
| `npx saglitzdesign-mcp` / `claude mcp add` | yes | — | — |
| `npx skills@latest add HalidSaglam/saglitzdesign-mcp` | — | all eight — seven depth skills plus the umbrella | — |

The npm package's `files:` list covers `dist/`, `knowledge/` and `recipes/`, and
does not name `skills/` or `commands/` — so an MCP-only install has every tool
and every document and none of the skill or command files. The skills CLI is the
mirror image: it copies each `SKILL.md` into your agent and brings no server, so
the tools those skills point at are not there unless you also install one.
Cloning the repository gets the source of all of it — but not a runnable
server: `dist/` is gitignored, so a clone needs `npm install && npm run build`
before `node dist/index.js` starts. Everything else in the table is a tracked
file and arrives with the clone.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "saglitzdesign": {
      "command": "npx",
      "args": ["-y", "saglitzdesign-mcp"]
    }
  }
}
```

### Cursor / other MCP clients

Run `npx -y saglitzdesign-mcp` over stdio (or `node /absolute/path/to/dist/index.js` from a clone).

**Requires Node 20 or newer.** It also runs on Node 18 with a warning; below that
the launcher exits with an explanation instead of a syntax error.

Your client launches the server — you don't start it yourself. Run by hand it
will print its status and then wait on standard input for a client that never
arrives, which looks like a hang but is the server working correctly.

### As skills (no MCP server)

Prefer lightweight, self-contained skills? Install the condensed SaglitzDesign
skills into any [skills](https://skills.sh)-compatible agent:

```bash
npx skills@latest add HalidSaglam/saglitzdesign-mcp
```

Eight skills — `saglitzdesign`, the umbrella that routes into whichever of
the other seven the work needs: `clean-interface-design`,
`landing-page-conversion`, `design-review`, `motion-and-animation`,
`apple-platform-design`, `design-system-audit`, `ship-quality-gate` — each
standalone guidance that also points to the full MCP for depth. See
[`skills/`](skills/).

Each skill is *copied* into your agent and its content hash pinned in
`skills-lock.json`, so an installed skill does not change when this repository
does. Re-run the command above to pick up a new skill or an edited one.

### Dev & debug

```bash
npm run dev       # run from TypeScript via tsx
npm run inspect   # open the MCP Inspector UI
```

## Usage

Once connected, just talk to your agent naturally — it decides when to call the tools:

> *"Using saglitzdesign, plan the design of an iOS fitness app."*
> → `get_design_roadmap` returns a 7‑phase plan with the docs to read at each step.

> *"Review my landing page for conversion with saglitzdesign."*
> → `design_review_checklist` (landing‑page / conversion) + `get_design_examples`.

> *"How should a primary button behave on mobile?"*
> → `get_component_guidance` returns specs, states, labels and anti‑patterns.

> *"Show me real paywall examples."*
> → `get_design_examples` returns annotated screenshots.

> *"What's llms.txt and how do I set it up?"*
> → `seo_geo_guide` (GEO) returns the tactic with a ready‑to‑use example.

## Your own design rules

Point the server at a directory of your own and your documents join the base —
searchable, readable, and, if you ask, part of the review checklist:

```bash
claude mcp add --scope user saglitzdesign \
  --env SAGLITZDESIGN_KNOWLEDGE_DIR=/path/to/our-design-rules \
  -- npx -y saglitzdesign-mcp
```

Or in `claude_desktop_config.json` / any MCP client, alongside `command` and `args`:

```json
"env": { "SAGLITZDESIGN_KNOWLEDGE_DIR": "/path/to/our-design-rules" }
```

Several directories are allowed, separated the way `PATH` is on your platform.

- **Your rules lead.** When a search is genuinely about something you documented,
  your document comes first — measured by how many of the query's terms it
  covers, so a short house‑rules file is not buried by a long reference.
- **Same id replaces ours.** A file with `id: buttons` takes over from the
  built‑in one. That is deliberate, and it is announced at startup rather than
  happening quietly. Wherever it is served it is marked as your team's document,
  so nothing of yours is ever quoted as though it were sourced platform guidance.
- **`review: [website, saas-web-app]`** in the frontmatter puts the document into
  those project types' `design_review_checklist`, ahead of the curated list —
  the difference between your rules being findable and your rules being enforced.

> Editing files inside the installed package works until `npm update` deletes
> them. Use the environment variable.

## Adding to this repository

Drop a Markdown file anywhere under `knowledge/` with frontmatter:

```markdown
---
id: my-topic
title: "My Topic"
category: ux            # design-language | component | ux | seo | geo | pattern | craft | book | process | marketing | security
platform: both          # mobile | web | macos | both
tags: [tag1, tag2]
sources: ["https://…"]
updated: 2026-07-08
---

Content served verbatim to clients…
```

The server indexes every `.md` on startup — no rebuild needed for content
changes (just restart the server). A `/refresh-knowledge` command
(`.claude/commands/`) can re‑research stale docs with agents.

## How the knowledge was built

Design‑language and SEO/GEO docs were researched from official documentation
and current sources (cited in each file's `sources`). Real‑world UI patterns
were studied from top apps and websites; the visual example library was curated
the same way. Classic design and marketing books were distilled into original,
prescriptive syntheses — no source text is reproduced.

**On images:** screenshot files are a local research asset. They are **not**
included in this repository or any published package. Without them,
`get_design_examples` gracefully degrades to descriptions plus source links.
To rebuild the local image library (or add your own examples), see
[`scripts/regenerate-examples.md`](scripts/regenerate-examples.md).

## Find it on

<a href="https://glama.ai/mcp/servers/HalidSaglam/saglitzdesign-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/HalidSaglam/saglitzdesign-mcp/badges/card.svg" alt="saglitzdesign-mcp MCP server" />
</a>

Also listed in the [official MCP Registry](https://registry.modelcontextprotocol.io) and on [npm](https://www.npmjs.com/package/saglitzdesign-mcp).

## License

[MIT](LICENSE) © 2026 Saglitz Design.

The `knowledge/` documents are original syntheses with sources cited per file.
Referenced screenshots are not part of this repo and may not be redistributed —
see [NOTICE.md](NOTICE.md).

<div align="center">
<sub>Built for the <a href="https://modelcontextprotocol.io">Model Context Protocol</a>.</sub>
</div>
