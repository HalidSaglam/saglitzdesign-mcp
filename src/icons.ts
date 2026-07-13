// Deterministic icon-library recommender.
// A curated set of the top open-source (and platform-native) icon systems, each
// with license, install command, the vibe/platform it fits, and usage rules.
// Keyword-scored so an intent like "minimal saas dashboard" maps to a library.
// We recommend libraries and how to use them — we do NOT bundle icon assets.

export interface IconLibrary {
  id: string;
  name: string;
  vibe: string[];
  platform: "web" | "apple" | "android" | "cross";
  count: string;
  styles: string;
  license: string;
  install: string;
  why: string;
  usage_rules: string;
  homepage: string;
}

export const ICON_LIBRARIES: IconLibrary[] = [
  {
    id: "lucide",
    name: "Lucide",
    vibe: ["saas", "dashboard", "minimal", "clean", "developer", "product", "app", "neutral", "modern", "default", "ui", "web"],
    platform: "web",
    count: "~1,600 icons",
    styles: "single outline weight (24px grid, 2px stroke); community-consistent",
    license: "ISC (permissive, free)",
    install: "npm i lucide-react  ·  also Vue/Svelte/Solid/Angular/plain SVG",
    why: "The de-facto default for modern web/SaaS UI. A community fork of Feather with a far bigger, actively-maintained set. One clean stroke weight means everything matches automatically. First-class framework packages and tree-shaking.",
    usage_rules: "Use at 20–24px inline with text. Keep the 2px stroke — don't mix with filled sets. Set `aria-hidden` on decorative icons; give a visible or `aria-label` for icon-only buttons. shadcn/ui ships with Lucide.",
    homepage: "https://lucide.dev",
  },
  {
    id: "phosphor",
    name: "Phosphor",
    vibe: ["friendly", "consumer", "brand", "warm", "flexible", "duotone", "playful", "marketing", "modern", "distinctive", "app", "web"],
    platform: "cross",
    count: "~9,000 icons (1,500 × 6 weights)",
    styles: "6 weights: thin, light, regular, bold, fill, duotone",
    license: "MIT (free)",
    install: "npm i @phosphor-icons/react  ·  also Vue/Svelte/web-components/Flutter",
    why: "The most flexible open set. Six weights let one family carry both a light, airy consumer feel and a bold, confident brand voice. The duotone weight adds personality without a second library. Great when the product needs character, not just utility.",
    usage_rules: "Pick ONE weight as default (regular or bold) and hold it; reserve fill/duotone for active/selected states or accents. Match icon weight to your type weight. Don't scatter all six weights across a screen.",
    homepage: "https://phosphoricons.com",
  },
  {
    id: "solar",
    name: "Solar",
    vibe: ["premium", "clean", "modern", "consumer", "brand", "duotone", "sleek", "fintech", "polished", "app", "distinctive"],
    platform: "cross",
    count: "~1,200 icons",
    styles: "several styles incl. Linear, Bold, and the popular Bold Duotone",
    license: "CC BY 4.0 (free with attribution)",
    install: "Via Iconify (npm i @iconify/react) or figma/community; framework-agnostic SVG",
    why: "The 'premium app' look. Bold Duotone in particular reads as expensive and current — a favorite for polished consumer and fintech products. Cohesive, characterful, and distinctly not the developer-default look.",
    usage_rules: "Commit to one Solar style across the product. CC BY 4.0 requires visible attribution somewhere (e.g. an about/licenses screen). Duotone shines for feature highlights and nav; keep body/list icons calmer.",
    homepage: "https://solariconset.com",
  },
  {
    id: "heroicons",
    name: "Heroicons",
    vibe: ["saas", "tailwind", "minimal", "clean", "product", "web", "marketing", "startup"],
    platform: "web",
    count: "~300 icons",
    styles: "outline (24px), solid (24px), mini (20px), micro (16px)",
    license: "MIT (free)",
    install: "npm i @heroicons/react  ·  Vue package too",
    why: "By the Tailwind CSS team — designed to pair with Tailwind and clean marketing/SaaS UI. The size-specific variants (outline for large, mini/micro for dense) are optically tuned rather than scaled. Small but high-quality set.",
    usage_rules: "Use outline for standalone/large, solid for active states, mini (20) and micro (16) for dense/inline — don't just shrink the 24px. Set matches Tailwind sizing tokens. Limited coverage; check the set has your icons before committing.",
    homepage: "https://heroicons.com",
  },
  {
    id: "tabler",
    name: "Tabler Icons",
    vibe: ["dashboard", "admin", "saas", "developer", "data", "dense", "web", "product", "utility", "comprehensive"],
    platform: "web",
    count: "~5,900 icons",
    styles: "outline + filled (24px grid, 2px stroke)",
    license: "MIT (free)",
    install: "npm i @tabler/icons-react  ·  Vue/Svelte/webfont",
    why: "Huge, consistent, developer-oriented set — excellent coverage for admin panels and data-dense dashboards where you need an icon for every obscure action. Same clean 2px-stroke style as Lucide but broader.",
    usage_rules: "Great when Lucide lacks an icon. Keep to outline for UI, filled for emphasis/active. 24px 2px stroke — don't mix with a different stroke system. Tree-shake; don't ship the whole set.",
    homepage: "https://tabler.io/icons",
  },
  {
    id: "material-symbols",
    name: "Material Symbols",
    vibe: ["android", "material", "google", "web", "variable", "system", "comprehensive", "app"],
    platform: "android",
    count: "~3,300 icons",
    styles: "variable font — axes: weight, fill, grade, optical size; outlined/rounded/sharp",
    license: "Apache 2.0 (free)",
    install: "Google Fonts (webfont) or npm material-symbols; Android via Material Components",
    why: "The native icon system for Android / Material 3 and the right default there. As a variable font it animates the fill axis (perfect for selected nav states) and adapts optical size — one asset covers many looks. Also solid on the web for Material-style products.",
    usage_rules: "On Android/Material 3, use these — don't import a web set. Pick ONE of outlined/rounded/sharp to match your shape system. Animate the `fill` axis 0→1 for active tabs. Set optical size to the render size. See [[material-3]].",
    homepage: "https://fonts.google.com/icons",
  },
  {
    id: "sf-symbols",
    name: "SF Symbols",
    vibe: ["ios", "apple", "macos", "ipados", "native", "system", "watchos", "app"],
    platform: "apple",
    count: "~6,900 symbols",
    styles: "9 weights + 3 scales; monochrome, hierarchical, palette, multicolor rendering",
    license: "Apple system (Apple platforms only — not redistributable)",
    install: "Built into iOS/macOS — `Image(systemName:)` in SwiftUI; SF Symbols app to browse",
    why: "The only correct default on Apple platforms. Designed to align optically with San Francisco text, inherit Dynamic Type weight/size, and support hierarchical/multicolor rendering and symbol-effects animation. Using anything else on iOS/macOS usually looks off.",
    usage_rules: "iOS/macOS: use these, not a web set. Prefer semantic system names so they update with the OS. Match symbol weight to adjacent text weight; use `.imageScale` and symbol variants (`.fill` for selected). Use symbol effects for feedback. See [[ios-app-design]], [[apple-hig-liquid-glass]].",
    homepage: "https://developer.apple.com/sf-symbols/",
  },
  {
    id: "remix",
    name: "Remix Icon",
    vibe: ["neutral", "web", "product", "comprehensive", "dashboard", "brand-logos", "utility"],
    platform: "web",
    count: "~3,000 icons",
    styles: "line + fill pairs (24px grid)",
    license: "Apache 2.0 (free)",
    install: "npm i @remixicon/react  ·  webfont/SVG",
    why: "A large, neutral, well-organized set with matched line/fill pairs and good coverage of brand/logo glyphs and system actions. A dependable, unopinionated choice for products that want breadth without a strong stylistic signature.",
    usage_rules: "Use line for default, fill for active/emphasis — they're designed as pairs. Neutral enough to sit under most brands. As always, one family only; don't blend with Lucide/Tabler stroke widths.",
    homepage: "https://remixicon.com",
  },
  {
    id: "radix",
    name: "Radix Icons",
    vibe: ["minimal", "dense", "developer", "crisp", "web", "dashboard", "clean", "small"],
    platform: "web",
    count: "~300 icons",
    styles: "single 15×15 crisp style",
    license: "MIT (free)",
    install: "npm i @radix-ui/react-icons",
    why: "Tiny, pixel-crisp 15px icons built for dense developer tooling and control-heavy UIs (pairs with Radix Primitives). When your UI is compact and precise, these render sharper at small sizes than scaled-down 24px icons.",
    usage_rules: "Best at 15–16px in dense toolbars/menus; they're not meant to scale large. Small set — verify coverage. Pair with Radix Primitives / shadcn-style UIs.",
    homepage: "https://www.radix-ui.com/icons",
  },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}

export function suggestIconLibrary(intent: string, opts: { limit?: number } = {}): IconLibrary[] {
  const terms = [...new Set(tokenize(intent))];
  if (terms.length === 0) return ICON_LIBRARIES.slice(0, opts.limit ?? 3);
  const scored = ICON_LIBRARIES.map((lib) => {
    const vibe = new Set(lib.vibe);
    let score = 0;
    for (const t of terms) {
      if (vibe.has(t)) score += 5;
      else if (lib.vibe.some((v) => v.includes(t) || t.includes(v))) score += 3;
      if (lib.name.toLowerCase().includes(t)) score += 4;
      if (lib.platform === t) score += 4;
    }
    // strong platform steering
    if ((terms.includes("ios") || terms.includes("apple") || terms.includes("macos")) && lib.platform === "apple") score += 6;
    if ((terms.includes("android") || terms.includes("material")) && lib.platform === "android") score += 6;
    return { lib, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0);
  return (top.length ? top : scored).slice(0, opts.limit ?? 3).map((s) => s.lib);
}

const UNIVERSAL_RULES = [
  "**One family, one weight.** Mixing icon sets (or stroke widths) is the fastest way to look unpolished. Pick one and hold it.",
  "**Match icon weight to type weight** and size icons to the adjacent text (usually 1–1.25× the line's cap height). Optically center, don't just box-align.",
  "**Fill/solid for active, outline for default.** Use the state variants a good set gives you rather than color alone.",
  "**Accessibility:** decorative icons get `aria-hidden=\"true\"`; icon-only controls need an accessible name (`aria-label` / SwiftUI `accessibilityLabel`). Never rely on an icon alone to convey meaning — pair with text or a label. See [[accessibility]].",
  "**Platform-native first:** SF Symbols on Apple, Material Symbols on Android. Reach for a web set (Lucide/Phosphor/…) on the web.",
];

export function iconLibraryReport(intent: string, matches: IconLibrary[]): string {
  const out: string[] = [`# Icon library — "${intent}"`, ""];
  matches.forEach((lib, i) => {
    out.push(
      `## ${i === 0 ? "→ " : ""}${lib.name}`,
      `_Fits: ${lib.vibe.slice(0, 8).join(", ")} · platform: ${lib.platform}_`,
      "",
      `- **Set:** ${lib.count} · ${lib.styles}`,
      `- **License:** ${lib.license}`,
      `- **Install:** \`${lib.install}\``,
      `- **Home:** ${lib.homepage}`,
      "",
      `**Why it fits:** ${lib.why}`,
      "",
      `**Usage:** ${lib.usage_rules}`,
      "",
    );
  });
  out.push("## Universal icon rules", ...UNIVERSAL_RULES.map((r) => `- ${r}`), "",
    "_Full guidance: get_design_doc(\"iconography\"). We recommend a library and how to use it — install it in your own project (icons are not bundled)._");
  return out.join("\n");
}
