---
description: Re-research stale knowledge docs and update them (SEO thresholds, HIG/Material changes, GEO tactics, patterns)
---

Refresh the SaglitzDesign knowledge base. Follow this procedure:

1. **Find stale docs.** Compute each doc's age from its `updated:` frontmatter field (all docs live under `knowledge/**/*.md`). Staleness thresholds by category: seo/geo 120 days; design-language/marketing 240 days; pattern 300 days; component/ux/craft/process 365 days; book 730 days. (Same thresholds as the server's `knowledge_freshness` tool — you can also run the built server and call that tool.) If the user passed arguments (e.g. a category or doc id), refresh only those instead.

2. **Re-research each stale doc with parallel agents.** For each stale doc, launch a general-purpose agent that:
   - Reads the current doc.
   - Uses WebSearch/WebFetch to verify every dated claim (thresholds, specs, version-specific guidance) against current official sources; for `pattern` docs, re-runs the original Mobbin MCP searches (load tools via ToolSearch "select:mcp__mobbin__search_screens,mcp__mobbin__search_flows,mcp__mobbin__search_sections").
   - Edits the doc in place: corrects outdated facts, adds significant new developments, keeps the existing frontmatter format, updates the `sources` array, and sets `updated:` to today's date.
   - Reports back a one-paragraph changelog (what changed, what was verified-unchanged).

3. **Refresh the visual example library if stale** (>300 days): re-run the Mobbin collection prompts (see git history for the original agent prompts), replacing dead images in `knowledge/examples/`.

4. **Verify.** Run `npm run build` and start the server once to confirm all docs still parse (stderr reports the loaded doc count — it must not drop). Spot-check one updated doc via a `get_design_doc` JSON-RPC call.

5. **Commit** with a message summarizing the changelog per doc.

Do not rewrite docs wholesale — surgical updates only; the curated structure and prescriptive tone must survive.
