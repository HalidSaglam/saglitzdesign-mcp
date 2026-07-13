// Deterministic font-pairing recommender.
// A curated set of production pairings, each with ready-to-paste CSS stacks,
// a matched type scale, the reason it works, and the vibes it fits. Lookup is
// keyword-scored so an intent like "modern saas, trustworthy" maps to a pairing.

export interface FontPairing {
  id: string;
  name: string;
  vibe: string[];
  heading: { family: string; stack: string; weights: string; source: string };
  body: { family: string; stack: string; weights: string; source: string };
  mono?: { family: string; stack: string };
  why: string;
  pairing_rules: string;
}

const SYSTEM_SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

export const PAIRINGS: FontPairing[] = [
  {
    id: "inter-inter",
    name: "Inter / Inter",
    vibe: ["saas", "product", "dashboard", "app", "neutral", "modern", "clean", "ui", "startup", "safe"],
    heading: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "600, 700", source: "Google Fonts" },
    body: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "400, 500", source: "Google Fonts" },
    mono: { family: "JetBrains Mono", stack: `'JetBrains Mono', ${SYSTEM_MONO}` },
    why: "One superfamily with a huge weight range and tuned optical sizing. Nearly invisible in the right way — the default that never fights the product. Tighten heading tracking (-0.02em); keep body at 0.",
    pairing_rules: "Weight contrast carries hierarchy (700 heads / 400 body). Cap line length 60–75ch. Numbers: enable tabular-nums in tables.",
  },
  {
    id: "geist-geist",
    name: "Geist / Geist",
    vibe: ["saas", "developer", "technical", "modern", "minimal", "startup", "product", "clean", "vercel"],
    heading: { family: "Geist", stack: `Geist, ${SYSTEM_SANS}`, weights: "600, 700", source: "Vercel / Google Fonts" },
    body: { family: "Geist", stack: `Geist, ${SYSTEM_SANS}`, weights: "400, 500", source: "Vercel / Google Fonts" },
    mono: { family: "Geist Mono", stack: `'Geist Mono', ${SYSTEM_MONO}` },
    why: "Crisp, engineered, developer-native. Reads as precise and current without novelty. Pairs perfectly with its own mono for code-forward products.",
    pairing_rules: "Lean on size + weight, not color, for hierarchy. Geist Mono for code/data. Slightly tighter heads (-0.01em).",
  },
  {
    id: "cal-inter",
    name: "Cal Sans / Inter",
    vibe: ["saas", "startup", "friendly", "marketing", "landing", "modern", "warm", "product", "approachable"],
    heading: { family: "Cal Sans", stack: `'Cal Sans', ${SYSTEM_SANS}`, weights: "600", source: "Google Fonts (OFL)" },
    body: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "400, 500", source: "Google Fonts" },
    why: "Cal Sans' friendly geometric display gives headings personality; Inter keeps body neutral and legible. The modern indie-SaaS landing-page look.",
    pairing_rules: "Cal Sans for display sizes only (≥24px). Never set body in a display face. Generous heading size jumps (1.5–2×).",
  },
  {
    id: "satoshi-inter",
    name: "Satoshi / Inter",
    vibe: ["modern", "premium", "startup", "marketing", "geometric", "clean", "brand", "landing"],
    heading: { family: "Satoshi", stack: `Satoshi, ${SYSTEM_SANS}`, weights: "700, 900", source: "Fontshare (free)" },
    body: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "400, 500", source: "Google Fonts" },
    why: "Satoshi is a contemporary geometric grotesque with a confident, brandable display weight; Inter carries text. Feels designed without going loud.",
    pairing_rules: "Use Satoshi 900 for hero only, 700 for section heads. Pair tight heads with roomy body leading (1.6).",
  },
  {
    id: "generalsans-inter",
    name: "General Sans / system",
    vibe: ["minimal", "neutral", "portfolio", "editorial", "modern", "calm", "swiss", "clean"],
    heading: { family: "General Sans", stack: `'General Sans', ${SYSTEM_SANS}`, weights: "500, 600", source: "Fontshare (free)" },
    body: { family: "General Sans", stack: `'General Sans', ${SYSTEM_SANS}`, weights: "400", source: "Fontshare (free)" },
    why: "A quiet humanist sans with just enough warmth. A single-family, Swiss-calm system for minimalist sites and portfolios.",
    pairing_rules: "Hierarchy through space and size, not weight extremes. Lots of whitespace. Line-height 1.6–1.7 for body.",
  },
  {
    id: "playfair-inter",
    name: "Playfair Display / Inter",
    vibe: ["editorial", "luxury", "elegant", "fashion", "blog", "magazine", "serif", "premium", "sophisticated"],
    heading: { family: "Playfair Display", stack: `'Playfair Display', Georgia, serif`, weights: "600, 700", source: "Google Fonts" },
    body: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "400", source: "Google Fonts" },
    why: "High-contrast Didone headings signal luxury and editorial authority; a clean sans keeps long-form reading effortless. Classic magazine contrast.",
    pairing_rules: "Playfair only at large sizes (its thin strokes vanish small). Serif display + sans body = safe, high-contrast pairing. Italic Playfair for pull quotes.",
  },
  {
    id: "fraunces-inter",
    name: "Fraunces / Inter",
    vibe: ["editorial", "warm", "premium", "brand", "distinctive", "serif", "boutique", "characterful", "marketing"],
    heading: { family: "Fraunces", stack: `Fraunces, Georgia, serif`, weights: "500, 600", source: "Google Fonts" },
    body: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "400, 500", source: "Google Fonts" },
    why: "Fraunces is a 'wonky' old-style serif with optical sizing and soft character — distinctive without being formal. Modern-boutique brand feel.",
    pairing_rules: "Use Fraunces' opsz axis high for display. Its warmth handles brand headers; Inter grounds the UI. Great for products with personality.",
  },
  {
    id: "sourceserif-sourcesans",
    name: "Source Serif / Source Sans",
    vibe: ["editorial", "content", "blog", "docs", "reading", "trustworthy", "neutral", "longform", "news"],
    heading: { family: "Source Serif 4", stack: `'Source Serif 4', Georgia, serif`, weights: "600, 700", source: "Google Fonts" },
    body: { family: "Source Sans 3", stack: `'Source Sans 3', ${SYSTEM_SANS}`, weights: "400", source: "Google Fonts" },
    why: "A superfamily designed to pair. Serif heads add editorial gravity, the sans reads cleanly on screen — a proven combo for content-heavy, trustworthy sites.",
    pairing_rules: "Designed to harmonize (shared skeleton). Body 18px+ for long-form. Serif also works for body in article layouts.",
  },
  {
    id: "space-ibmplex",
    name: "Space Grotesk / IBM Plex Sans",
    vibe: ["technical", "developer", "modern", "startup", "bold", "brand", "geometric", "distinctive", "crypto", "ai"],
    heading: { family: "Space Grotesk", stack: `'Space Grotesk', ${SYSTEM_SANS}`, weights: "500, 700", source: "Google Fonts" },
    body: { family: "IBM Plex Sans", stack: `'IBM Plex Sans', ${SYSTEM_SANS}`, weights: "400", source: "Google Fonts" },
    mono: { family: "IBM Plex Mono", stack: `'IBM Plex Mono', ${SYSTEM_MONO}` },
    why: "Space Grotesk's quirky proportions read as technical-yet-designed (popular for AI/crypto/dev brands); IBM Plex Sans is neutral, rational body text with a matched mono.",
    pairing_rules: "Space Grotesk for headings/labels only. Keep the trio in the Plex family for code. Works well on dark backgrounds.",
  },
  {
    id: "clash-satoshi",
    name: "Clash Display / Satoshi",
    vibe: ["bold", "marketing", "brand", "loud", "agency", "creative", "landing", "statement", "display"],
    heading: { family: "Clash Display", stack: `'Clash Display', ${SYSTEM_SANS}`, weights: "600, 700", source: "Fontshare (free)" },
    body: { family: "Satoshi", stack: `Satoshi, ${SYSTEM_SANS}`, weights: "400, 500", source: "Fontshare (free)" },
    why: "Clash Display is a big, confident statement face for agency/creative work; Satoshi keeps the body modern and readable. High-impact hero energy.",
    pairing_rules: "Clash for oversized hero type (48px+). Massive scale contrast (hero 5–6× body). Tight leading on display, roomy on body.",
  },
  {
    id: "sf-system",
    name: "System (San Francisco / Roboto)",
    vibe: ["ios", "android", "app", "native", "performance", "system", "mobile", "fast", "neutral"],
    heading: { family: "system-ui", stack: SYSTEM_SANS, weights: "600, 700", source: "OS-native (no download)" },
    body: { family: "system-ui", stack: SYSTEM_SANS, weights: "400", source: "OS-native (no download)" },
    mono: { family: "ui-monospace", stack: SYSTEM_MONO },
    why: "Zero network cost, instant render, and the exact type users already read all day (SF on Apple, Roboto on Android). The right default for native-feeling apps and performance-critical sites.",
    pairing_rules: "Respect Dynamic Type / font scaling — use relative units. San Francisco has optical sizes (Text vs Display) applied automatically. No FOUT/CLS.",
  },
  {
    id: "instrument-inter",
    name: "Instrument Serif / Inter",
    vibe: ["elegant", "minimal", "premium", "landing", "distinctive", "editorial", "modern", "boutique", "serif"],
    heading: { family: "Instrument Serif", stack: `'Instrument Serif', Georgia, serif`, weights: "400", source: "Google Fonts" },
    body: { family: "Inter", stack: `Inter, ${SYSTEM_SANS}`, weights: "400, 500", source: "Google Fonts" },
    why: "A single-weight, high-contrast serif that feels expensive and understated at large display sizes — the current darling of premium minimalist landing pages. Inter keeps everything else quiet.",
    pairing_rules: "Instrument Serif at display sizes only, often in italic for elegance. Let it be the single decorative note against an otherwise neutral system.",
  },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}

export function suggestFontPairing(intent: string, opts: { limit?: number } = {}): FontPairing[] {
  const terms = [...new Set(tokenize(intent))];
  if (terms.length === 0) return PAIRINGS.slice(0, opts.limit ?? 3);
  const scored = PAIRINGS.map((p) => {
    const vibe = new Set(p.vibe);
    let score = 0;
    for (const t of terms) {
      if (vibe.has(t)) score += 5;
      else if (p.vibe.some((v) => v.includes(t) || t.includes(v))) score += 3;
      if (p.name.toLowerCase().includes(t)) score += 4;
    }
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0);
  return (top.length ? top : scored).slice(0, opts.limit ?? 3).map((s) => s.p);
}

const TYPE_SCALE = [
  ["display", "48–60px / 3–3.75rem", "700", "1.05", "-0.02em"],
  ["h1", "36–40px", "700", "1.1", "-0.02em"],
  ["h2", "28–30px", "600/700", "1.2", "-0.01em"],
  ["h3", "22–24px", "600", "1.3", "0"],
  ["body-lg", "18px", "400", "1.6", "0"],
  ["body", "16px", "400", "1.6", "0"],
  ["small", "14px", "400/500", "1.5", "0"],
  ["caption", "12–13px", "500", "1.4", "0.01em"],
];

export function fontPairingReport(intent: string, matches: FontPairing[]): string {
  const out: string[] = [`# Font pairing — "${intent}"`, ""];
  matches.forEach((p, i) => {
    out.push(
      `## ${i === 0 ? "→ " : ""}${p.name}`,
      `_Fits: ${p.vibe.join(", ")}_`,
      "",
      `- **Headings:** ${p.heading.family} — \`${p.heading.stack}\` · weights ${p.heading.weights} · ${p.heading.source}`,
      `- **Body:** ${p.body.family} — \`${p.body.stack}\` · weights ${p.body.weights} · ${p.body.source}`,
      ...(p.mono ? [`- **Mono:** ${p.mono.family} — \`${p.mono.stack}\``] : []),
      "",
      `**Why it works:** ${p.why}`,
      "",
      `**Pairing rules:** ${p.pairing_rules}`,
      "",
    );
  });
  out.push(
    "## Suggested type scale (for the top pick)",
    "| role | size | weight | line-height | tracking |",
    "|---|---|---|---|---|",
    ...TYPE_SCALE.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} |`),
    "",
    "_Next: `generate_design_tokens` accepts `fontFamilies` + `fontSizes` to emit these as real CSS/Tailwind/SwiftUI/Compose tokens. General rule: pair a distinctive display face with a neutral, highly-legible body — never two loud fonts, never a display face for body text._",
  );
  return out.join("\n");
}
