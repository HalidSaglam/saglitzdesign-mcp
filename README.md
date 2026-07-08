<div align="center">

# SaglitzDesign MCP

**An expert design & marketing brain for your AI coding agent.**

A Model Context Protocol server that gives Claude, Cursor, and any MCP client
expert‑level guidance on **web, iOS, Android and macOS design** — plus the
**UX, copywriting, SEO, GEO and marketing** knowledge that makes a product
actually convert.

56 curated knowledge documents · 10 tools · phased roadmaps · real‑world visual examples

[![npm](https://img.shields.io/npm/v/saglitzdesign-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/saglitzdesign-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-000)](https://modelcontextprotocol.io)

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

**56 knowledge documents across 10 categories:**

| Category | Coverage |
|---|---|
| 🎨 **Design languages** | Material 3 & M3 Expressive · Apple HIG + Liquid Glass (iOS 26) · deep **iOS**, **Android** (Android 16 / M3 Expressive) and **macOS** app‑design guides · Fluent 2 · 2026 web trends · design tokens & theming (W3C DTCG) |
| 🧩 **Components** | Buttons (hierarchy, sizing, states, labels) · forms & inputs · navigation · cards / lists / modals / sheets / empty states |
| 🧠 **UX** | Nielsen heuristics & behavioral laws · accessibility (WCAG 2.2) · typography · color & dark mode · spacing & grids · motion · mobile UX · conversion / CRO |
| ✨ **Craft** | Expert polish standards: optical corrections, spacing discipline, typographic craft, UX writing & cognitive load, and a 0–40 critique scoring rubric |
| 📚 **Books** | Distilled classics — *design:* Norman, Krug, Refactoring UI, psychology of design, grid/typography · *marketing:* Cialdini, Positioning (Ries/Trout + Dunford), StoryBrand + Ogilvy, Hooked |
| 🗺️ **Process** | End‑to‑end roadmaps: product design (8 phases with exit criteria) and marketing website (positioning → CRO loop) |
| 🔎 **SEO** | Technical SEO (Core Web Vitals) · on‑page & E‑E‑A‑T · SEO for designers |
| 🤖 **GEO** | Generative Engine Optimization — visibility in ChatGPT / Perplexity / AI Overviews, llms.txt, citation tactics |
| 📣 **Marketing** | Branding & identity (strategy, logo systems, brand voice) · email marketing (design, lifecycle, deliverability) · ad creative (hooks, platform specs, testing) |
| 🖼️ **Patterns & examples** | Real‑world patterns studied from top apps & sites, plus a curated screenshot library served as images |

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
