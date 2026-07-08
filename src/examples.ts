import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

export interface DesignExample {
  id: string;
  title: string;
  platform: string;
  app: string;
  pattern: string;
  description: string;
  tags: string[];
  mobbin_url: string;
  /** relative to the examples dir, e.g. "images/ios-paywall-brilliant.jpg" */
  image: string;
}

export function loadExamples(examplesDir: string): DesignExample[] {
  if (!existsSync(examplesDir)) return [];
  const out: DesignExample[] = [];
  for (const entry of readdirSync(examplesDir)) {
    if (extname(entry) !== ".json") continue;
    try {
      const arr = JSON.parse(readFileSync(join(examplesDir, entry), "utf8"));
      if (!Array.isArray(arr)) continue;
      for (const e of arr) {
        if (!e?.id) continue;
        // entries are kept even without their image file — the tool then serves
        // description + source link only (images are a local-only asset and are
        // not redistributed in the published package)
        out.push({
          id: String(e.id),
          title: String(e.title ?? e.id),
          platform: String(e.platform ?? "both"),
          app: String(e.app ?? ""),
          pattern: String(e.pattern ?? ""),
          description: String(e.description ?? ""),
          tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
          mobbin_url: String(e.mobbin_url ?? ""),
          image: String(e.image ?? ""),
        });
      }
    } catch {
      // skip malformed files
    }
  }
  return out;
}

export function searchExamples(
  examples: DesignExample[],
  query: string,
  opts: { platform?: string; limit?: number } = {},
): DesignExample[] {
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1))];
  const scored: Array<{ e: DesignExample; score: number }> = [];
  for (const e of examples) {
    if (opts.platform && e.platform !== opts.platform) continue;
    const hay = {
      strong: (e.pattern + " " + e.tags.join(" ")).toLowerCase(),
      medium: (e.title + " " + e.app).toLowerCase(),
      weak: e.description.toLowerCase(),
    };
    let score = 0;
    for (const t of terms) {
      if (hay.strong.includes(t)) score += 5;
      if (hay.medium.includes(t)) score += 3;
      if (hay.weak.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.limit ?? 4).map((s) => s.e);
}

export function imageMime(path: string): string {
  return extname(path).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
}
