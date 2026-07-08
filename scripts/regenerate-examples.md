# Regenerating the visual example library

The `get_design_examples` tool serves real screenshots of design patterns.
Those image files are **not** shipped with this repo or the npm package — only
the metadata in `knowledge/examples/ios.json` and `knowledge/examples/web.json`
is. Without the images, the tool still works, degrading to description + source
link ("link mode").

If you have access to the [Mobbin](https://mobbin.com) MCP tools, you can
rebuild the local image library so `get_design_examples` returns real images.

## Option A — let an agent do it (recommended)

In an MCP client that has both this filesystem and the Mobbin MCP connected,
give the agent this instruction:

> Load the Mobbin tools:
> `ToolSearch "select:mcp__mobbin__search_screens,mcp__mobbin__search_flows,mcp__mobbin__search_sections"`.
>
> For every entry in `knowledge/examples/ios.json` and
> `knowledge/examples/web.json`, find the matching screen on Mobbin (search by
> the entry's `app` + `pattern` + `title`), download its screenshot to the path
> in the entry's `image` field (relative to `knowledge/examples/`), and verify
> each file is a valid image over 15 KB. Do not change the JSON. Report how many
> images were restored and which entries could not be matched.

## Option B — add your own examples

You don't need Mobbin at all. Append objects to either JSON file and drop the
image alongside:

```json
{
  "id": "web-hero-acme",
  "title": "Acme — split hero with product demo",
  "platform": "web",
  "app": "Acme",
  "pattern": "hero",
  "description": "What this screen does well, concretely.",
  "tags": ["hero", "landing", "cta", "demo"],
  "mobbin_url": "https://…(or any source URL)",
  "image": "images/web-hero-acme.jpg"
}
```

Put the file at `knowledge/examples/images/web-hero-acme.jpg`. Rules the loader
enforces:

- `id`, `title`, `pattern`, `tags`, `image` are required; `mobbin_url` is the
  shown source link.
- `platform` must be `ios` or `web`.
- If the image file is missing, the entry still loads and serves in link mode.
- JPEG and WebP are supported (`.jpg` / `.webp`).

Restart the server after adding files — the example index is built at startup.

## Licensing note

Screenshots you collect are third‑party content. Keep them local; do not
commit them to a public repository or include them in a published package. The
`knowledge/examples/images/` directory is git‑ignored for exactly this reason.
