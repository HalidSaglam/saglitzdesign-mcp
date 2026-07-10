<div align="center">

# SaglitzDesign MCP

**An expert design & marketing brain for your AI coding agent.**

A Model Context Protocol server that gives Claude, Cursor, and any MCP client
expert‑level guidance on **web, iOS, Android and macOS design** — plus the
**UX, copywriting, SEO, GEO and marketing** knowledge that makes a product
actually convert.

72 curated knowledge documents · 13 tools · 7 build/review workflows · real token/a11y generators · production component recipes · phased roadmaps · real‑world visual examples

[![npm](https://img.shields.io/npm/v/saglitzdesign-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/saglitzdesign-mcp)
[![skills](https://skills.sh/b/HalidSaglam/saglitzdesign-mcp)](https://skills.sh/HalidSaglam/saglitzdesign-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-000)](https://modelcontextprotocol.io)
[![Glama](https://glama.ai/mcp/servers/HalidSaglam/saglitzdesign-mcp/badges/score.svg)](https://glama.ai/mcp/servers/HalidSaglam/saglitzdesign-mcp)

[Why](#why) · [What's inside](#whats-inside) · [Tools](#tools) · [Install](#install) · [Usage](#usage) · [Extending](#extending-the-knowledge-base) · [License](#license)

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
- **Prescriptive, not vague.** Every doc is written as rules an agent applies
  verbatim — numbers, thresholds, do/don't lists, anti‑patterns.
- **Grounded.** Design‑language specs from official sources; patterns studied
  from real top apps and sites; classics distilled from the actual books.

## What's inside

**72 knowledge documents across 11 categories:**

| Category | Coverage |
|---|---|
| 🎨 **Design languages** | Material 3 & M3 Expressive · Apple HIG + Liquid Glass (iOS 26) · deep **iOS**, **Android** (Android 16 / M3 Expressive) and **macOS** app‑design guides · Fluent 2 · 2026 web trends · design tokens & theming (W3C DTCG) · Apple WWDC design principles (fluid interfaces) |
| 🧩 **Components** | Buttons (hierarchy, sizing, states, labels) · forms & inputs · navigation · cards / lists / modals / sheets / empty states |
| 🧠 **UX** | Nielsen heuristics & behavioral laws · accessibility (WCAG 2.2) · typography · color & dark mode · spacing & grids · motion · mobile UX · conversion / CRO · **data visualization** · **information architecture** · **i18n / localization (RTL)** |
| ✨ **Craft** | Expert polish standards · typographic craft · animation craft (easing, springs, interruptibility) · UX writing & cognitive load · 0–40 critique rubric · **clean/minimal app design** · **design‑engineering** (semantic HTML, CSS architecture, tokens‑in‑code) |
| 📚 **Books** | Distilled classics — *design:* Norman, Krug, Refactoring UI, psychology of design, grid/typography, interaction design (Cooper/Tidwell), **emotional design (Walter/Norman)** · *marketing:* Cialdini, Positioning, StoryBrand + Ogilvy, Hooked |
| 🗺️ **Process** | Product‑design & marketing‑website roadmaps · **design‑systems methodology** (Atomic Design, component API, governance) |
| 📣 **Marketing** | Branding & identity · email marketing · ad creative · paywall benchmarks (RevenueCat 2026) · growth frameworks (loops/AARRR/PLG) · pricing strategy · analytics & experimentation · value proposition & JTBD · **content & distribution** (topic clusters, community, referral) |
| 🔎 **SEO** | Technical SEO (Core Web Vitals) · on‑page & E‑E‑A‑T · SEO for designers |
| 🤖 **GEO** | Generative Engine Optimization — visibility in ChatGPT / Perplexity / AI Overviews, llms.txt, citation tactics |
| 🖼️ **Patterns & examples** | Real‑world patterns studied from top apps & sites, plus a curated screenshot library served as images |

## Workflows (`/` prompts) — "build me a…"

Beyond answering questions, SaglitzDesign ships **prompts** that orchestrate an
entire build end‑to‑end. In Claude Code they appear in the `/` menu; invoke one
and the agent runs the full method — roadmap → positioning & copy → real
examples → **writes the actual code** → opens it in a browser, screenshots,
scores it against the critique rubric, and iterates until it passes.

| Prompt | What it does |
|---|---|
| **`build_landing_page`** | Designs & builds a conversion‑focused landing page, copy‑first, with a visual critique loop. |
| **`build_website`** | Builds a multi‑page marketing site — positioning, IA, SEO/GEO, shared design system. |
| **`build_mobile_app_ui`** | Builds iOS or Android screens on the correct platform baseline (HIG/Liquid Glass or Material 3). |
| **`critique_screenshot`** | Grounded, reproducible critique of an attached UI screenshot against the fixed 0–40 rubric — cites specific elements, no padding. |
| **`review_paywall`** | Scores a paywall / subscription onboarding against real RevenueCat 2026 conversion benchmarks. |
| **`design_review`** | Audits an existing site/app against the checklists and the 0–40 critique rubric, ranked by severity. |
| **`redesign`** | Improves an existing UI (bolder / quieter / higher‑converting) using the craft standards, with before→after scoring. |

> Just say, e.g., *"/build_landing_page for a SaaS invoicing tool for freelancers"* — the workflow asks for anything missing, then builds it.
>
> The visual critique loop uses whatever browser tool is connected (Claude in
> Chrome, Playwright, or chrome‑devtools MCP) to see and refine its own output.
> Without one, it reviews the code directly.

## Tools

| Tool | What it does |
|---|---|
| **`get_design_roadmap`** | **Start here.** A phased, expert process for a project type (website, landing page, iOS / Android / macOS app, SaaS web app) — each phase has a goal, exit criteria, and the exact docs to read. |
| **`search_design_knowledge`** | Natural‑language search across everything, returning the most relevant section of the best‑matching docs. |
| **`get_design_doc`** | Fetch any document in full by id. |
| **`get_component_guidance`** | Deep dive on a component or screen (button, form, paywall, hero, pricing…) — specs + real‑world patterns. |
| **`get_design_language`** | Full platform / design‑system references (Material 3, Liquid Glass, iOS/Android/macOS, Fluent 2, web trends, tokens). |
| **`get_design_examples`** | **Real screenshots** of a pattern from top apps/sites, returned as images with notes on what each does well. |
| **`design_review_checklist`** | An assembled audit checklist per project type and focus (UI, UX, accessibility, SEO, GEO, conversion, copywriting). |
| **`seo_geo_guide`** | SEO and GEO guides, optionally narrowed to a topic. |
| **`generate_design_tokens`** | **Real artifacts, not advice** — turns a color/spacing/type spec into CSS variables, Tailwind v4, SwiftUI, Jetpack Compose, and W3C DTCG JSON. |
| **`audit_accessibility`** | Deterministic WCAG 2.2 checks — exact contrast ratios for color pairs + tap‑target sizes per platform, with fixes. |
| **`get_component_recipe`** | Production‑ready, accessible reference **code** for a component (button, input, modal, toast, card, switch, tabs, empty‑state, list‑row) in react‑tailwind, html‑css, SwiftUI, or Compose — all states, ARIA, keyboard, correct motion. |
| **`list_design_knowledge`** | Browse the full knowledge index by category / platform. |
| **`knowledge_freshness`** | Reports each doc's age vs a per‑category staleness threshold, so the base can be kept current. |

## Install

**Requirements:** Node.js 18+.

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

### As skills (no MCP server)

Prefer lightweight, self-contained skills? Install the condensed SaglitzDesign
skills into any [skills](https://skills.sh)-compatible agent:

```bash
npx skills@latest add HalidSaglam/saglitzdesign-mcp
```

Five skills — `clean-interface-design`, `landing-page-conversion`,
`design-review`, `motion-and-animation`, `apple-platform-design` — each
standalone guidance that also points to the full MCP for depth. See
[`skills/`](skills/).

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

## Extending the knowledge base

Drop a Markdown file anywhere under `knowledge/` with frontmatter:

```markdown
---
id: my-topic
title: "My Topic"
category: ux            # design-language | component | ux | seo | geo | pattern | craft | book | process | marketing
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

## License

[MIT](LICENSE) © 2026 Saglitz Design.

The `knowledge/` documents are original syntheses with sources cited per file.
Referenced screenshots are not part of this repo and may not be redistributed —
see [NOTICE.md](NOTICE.md).

<div align="center">
<sub>Built for the <a href="https://modelcontextprotocol.io">Model Context Protocol</a>.</sub>
</div>
