// Flagship orchestrator: one brand color + vibe + platform → a complete,
// coherent design-system starter. Reuses the color / font / icon / type-scale /
// elevation / token generators and assembles them into a single day-one
// foundation with real code and a build checklist.

import { generateColorSystem, stockAccentProximity } from "./color.js";
import { suggestFontPairing, type FontPairing } from "./fonts.js";
import { suggestIconLibrary, type IconLibrary } from "./icons.js";
import { buildTypeScale } from "./typescale.js";
import { buildElevation } from "./elevation.js";
import { generateTokens, DEFAULT_SPACING, DEFAULT_RADII, type TokenSpec, type TokenFormat } from "./tokens.js";
import { generateLayoutSystem } from "./layout.js";

/**
 * The layout layer of the foundation. Web gets a real grid; native platforms
 * get the constraints that matter there instead of a column count, because a
 * 12-column grid is not how an iOS or Android screen is actually laid out.
 */
function layoutSummary(platform: DSPlatform): string[] {
  if (platform === "ios" || platform === "android") {
    const isIOS = platform === "ios";
    return [
      `- **Margins:** ${isIOS ? "16pt screen margins (20pt on regular width)" : "16dp screen margins"}; respect safe areas / insets on every edge.`,
      `- **Touch targets:** minimum ${isIOS ? "44×44pt" : "48×48dp"}, with ≥8${isIOS ? "pt" : "dp"} between adjacent targets.`,
      "- **Spacing scale:** the 8pt scale in the tokens below — every gap is a step on it, never a hand-picked number.",
      `- **Adaptivity:** support ${isIOS ? "Dynamic Type (including accessibility sizes) and size classes" : "font scaling (sp) and compact/medium/expanded window classes"}; nothing may have a fixed height around text.`,
      "- Thumb-zone the primary action; keep destructive actions out of it.",
    ];
  }
  const l = generateLayoutSystem({ preset: "marketing-site" });
  return [
    `- **Breakpoints:** ${l.breakpoints.map((b) => `${b.name} ${b.px}px`).join(" · ")} — starting points; add one where *your* content breaks, never per device.`,
    `- **Grid:** ${l.columns} columns · ${l.gutter}px gutter · content capped at ${l.maxWidth}px · edge padding 16→48px.`,
    `- **Measure:** cap prose at 65ch (45ch for narrow columns) regardless of container width.`,
    `- **Section rhythm:** ${l.sectionRhythm.map((r) => `${r.name} ${r.min}→${r.max}px`).join(" · ")} (fluid).`,
    "- Full CSS variables, Tailwind theme, intrinsic grid and container queries: `generate_layout_system`.",
  ];
}

export type DSPlatform = "web" | "ios" | "android" | "all";

function ratioForVibe(vibe: string): number {
  const v = vibe.toLowerCase();
  if (/(bold|loud|marketing|agency|statement|display|editorial|luxury)/.test(v)) return 1.333;
  if (/(minimal|clean|calm|neutral|portfolio|dashboard|dense|admin)/.test(v)) return 1.2;
  return 1.25;
}

function tokenFormatFor(platform: DSPlatform): TokenFormat {
  return platform === "ios" ? "swiftui" : platform === "android" ? "compose" : platform === "all" ? "all" : "tailwind";
}

function componentsFor(platform: DSPlatform): string[] {
  const web = [
    "button", "input", "form", "card", "navigation", "search", "select", "table",
    "pagination", "skeleton", "badge", "breadcrumb", "modal", "toast", "tabs", "switch", "empty-state", "list-row", "tooltip",
  ];
  const mobile = [
    "button", "input", "form", "list-row", "navigation", "search", "select", "card",
    "modal", "toast", "tabs", "switch", "empty-state", "tooltip", "table", "pagination", "skeleton", "badge", "breadcrumb",
  ];
  return platform === "ios" || platform === "android" ? mobile : web;
}

/** One rememberable move, derived from vibe keywords — not a list of wow moments. */
function signatureFor(vibe: string): string {
  const v = vibe.toLowerCase();
  if (/(editorial|luxury|fashion|magazine|serif)/.test(v)) {
    return "One oversized display line; everything else is body. No gradient fill on type.";
  }
  if (/(fintech|bank|trust|insurance)/.test(v)) {
    return "Hairline rules and tabular numbers; no glassmorphism.";
  }
  if (/(dashboard|admin|dense|analytics)/.test(v)) {
    return "Density over chrome: no hero gradient, no eyebrow labels, data before decoration.";
  }
  if (/(playful|consumer|game|fun)/.test(v)) {
    return "One springy motion moment (`generate_motion`); the rest is still.";
  }
  if (/(minimal|portfolio|calm)/.test(v)) {
    return "Space carries hierarchy. One accent, used once.";
  }
  return "One signature surface (a material, a crop, or a type lockup) — not five competing wow moments.";
}

export interface DesignSystem {
  brand: string;
  vibe: string;
  platform: DSPlatform;
  font: FontPairing;
  icon: IconLibrary;
  colorFails: number;
}

export function createDesignSystem(
  brandColor: string,
  vibe: string,
  platform: DSPlatform = "web",
  name = "Brand",
): string {
  const color = generateColorSystem(brandColor);
  const font = suggestFontPairing(`${vibe} ${platform}`, { limit: 1 })[0];
  const iconQuery = `${vibe} ${platform === "ios" ? "ios apple" : platform === "android" ? "android material" : "web"}`;
  const icon = suggestIconLibrary(iconQuery, { limit: 1 })[0];
  const ratio = ratioForVibe(vibe);
  const { steps } = buildTypeScale({ ratio });
  const elevation = buildElevation({ levels: 5 });
  const fmt = tokenFormatFor(platform);

  const spec: TokenSpec = {
    name,
    colors: color.light,
    spacing: DEFAULT_SPACING,
    radii: DEFAULT_RADII,
    fontSizes: Object.fromEntries(steps.map((s) => [s.name, s.px])),
    fontFamilies: {
      display: font.heading.stack,
      sans: font.body.stack,
      mono: font.mono?.stack ?? "ui-monospace, SFMono-Regular, Menlo, monospace",
    },
  };
  const tokens = generateTokens(spec, fmt);
  const colorFails = color.checks.filter((c) => !c.pass).length;
  const comps = componentsFor(platform);
  const stock = stockAccentProximity(brandColor);

  const out: string[] = [
    `# ${name} — design system starter`,
    `_From brand \`${brandColor}\` · vibe "${vibe}" · platform ${platform}_`,
    "",
    "A complete, coherent foundation: color, type, space, elevation, fonts, and icons — verified and ready to build on. Each layer below is generated to work together.",
    "",
    "## Direction",
    "A thesis the UI can be remembered by — and the defaults this foundation is *not*. Named so an agent can leave them. Measured later by `audit_generic_design`. Spec: `get_design_doc(\"ai-default-aesthetic\")`.",
    "",
    "- **Do not ship these defaults** (unless a finding *is* the brand): Inter as the only family on a brand/marketing surface; the `rounded-2xl` + `shadow-lg` + border card triad; a `from-indigo-500 to-purple-600` (or hex/OKLCH equivalent) gradient; an eyebrow label over every heading; emoji standing in for icons; `backdrop-blur` + `white/10` glass; three or more `animate-pulse` placeholder bars. A genuine indigo brand still flags — that is a fact about the source, not a defect.",
    `- **Type:** **${font.heading.family}** / **${font.body.family}** — ${font.why} ${font.pairing_rules}`,
    `- **Signature:** ${signatureFor(vibe)}`,
    ...(stock
      ? [`- **Seed:** this seed sits ${stock.degrees}° from Tailwind \`${stock.stop}\` (\`${stock.hex}\`). If this hex *is* the brand, keep it. If it was reached for because generated UIs reach for it, pick a different seed and call this again. Do not invent a second palette silently. \`audit_generic_design\` will flag indigo/violet/purple gradients either way.`]
      : []),
    "",
    "## 1. Foundations at a glance",
    "| Layer | Choice |",
    "|---|---|",
    `| Primary | \`${color.light.primary}\` (on \`${color.light.onPrimary}\`) |`,
    `| Neutrals | brand-tinted gray ramp (50–950) |`,
    `| Type | ${font.heading.family} / ${font.body.family} · modular ratio ${ratio} |`,
    `| Icons | ${icon.name} (${icon.license}) |`,
    `| Elevation | 5-level layered shadow ramp |`,
    `| Layout | ${platform === "web" || platform === "all" ? "12-col grid · 1200px cap · fluid section rhythm" : "native layout — safe areas, adaptive sizes"} |`,
    `| Contrast | ${color.checks.length - colorFails}/${color.checks.length} WCAG checks pass${colorFails ? ` (${colorFails} need a look)` : " ✅"} |`,
    "",
    "## 2. Color",
    `- **Primary scale:** ${[50, 300, 500, 700, 900].map((s) => `\`${color.primary[s]}\``).join(" · ")} …`,
    `- **Light semantic:** bg \`${color.light.background}\` · surface \`${color.light.surface}\` · text \`${color.light.textPrimary}\` · border \`${color.light.border}\` · primary \`${color.light.primary}\``,
    `- **Dark semantic:** bg \`${color.dark.background}\` · surface \`${color.dark.surface}\` · text \`${color.dark.textPrimary}\` · primary \`${color.dark.primary}\``,
    `- **Status:** danger \`${color.light.danger}\` · success \`${color.light.success}\` · warning \`${color.light.warning}\` — harmonised with the brand's saturation, each with verified on-colour text.`,
    "- Full scales + verification: `generate_color_system(\"" + brandColor + "\")`.",
    "",
    "## 3. Typography",
    `**${font.heading.family}** for headings, **${font.body.family}** for body. ${font.why}`,
    "",
    `- Headings: \`${font.heading.stack}\` (${font.heading.weights})`,
    `- Body: \`${font.body.stack}\` (${font.body.weights})`,
    `- Scale (ratio ${ratio}): ${steps.filter((s) => ["sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].includes(s.name)).map((s) => `${s.name} ${s.px}px`).join(" · ")}`,
    "- Full fluid scale: `generate_type_scale`.",
    "",
    "## 4. Icons",
    `**${icon.name}** — ${icon.why}`,
    `- Install: \`${icon.install}\``,
    `- ${icon.usage_rules}`,
    "",
    "## 5. Elevation",
    "```css",
    ...elevation.map((l) => `--shadow-${l.name}: ${l.css};`),
    "```",
    "- Full ramp + dark-mode guidance: `generate_elevation_system`.",
    "",
    "## 6. Layout",
    ...layoutSummary(platform),
    "",
    "## 7. Tokens (ready to paste)",
    tokens,
    "",
    "## 8. Components to build",
    `Grab production-ready, accessible code for each with \`get_component_recipe\`:`,
    comps.map((c) => `\`${c}\``).join(" · "),
    "",
    "Pass the palette above and the code comes back in these colours rather than the house ones — otherwise you will be rewiring every value by hand. Send the ramps, not just the roles: role names cover the light-theme accent and miss every shade a dark theme uses.",
    "```json",
    JSON.stringify(
      {
        component: comps[0],
        stack: platform === "ios" ? "swiftui" : platform === "android" ? "compose" : "react-tailwind",
        tokens: {
          background: color.light.background,
          textPrimary: color.light.textPrimary,
        },
        scales: { neutral: "…the neutral scale below", primary: "…the primary scale", danger: "…the danger scale" },
      },
      null,
      2,
    ),
    "```",
    "",
    "## 9. Build checklist",
    "- [ ] Drop the tokens above into your project as the single source of truth.",
    "- [ ] Install the icon library; use one family, one weight.",
    "- [ ] Load the two fonts (self-host or link); set display vs body roles.",
    "- [ ] Lay the page out on the layout system; cap prose at 65ch.",
    "- [ ] Build core components from `get_component_recipe` using the tokens.",
    "- [ ] Verify contrast on any custom pairs with `audit_accessibility`; fix with `fix_contrast`.",
    "- [ ] Add motion from `generate_motion`; honor reduced-motion.",
    "- [ ] Run `design_lint` and `audit_design_system` on the result — the system you just generated should score inside every budget.",
    "- [ ] Run `audit_generic_design` on the finished markup. A genuine indigo brand will still flag; that is a fact about the source, not a defect.",
    "- [ ] Run `design_review_checklist` before ship.",
    "",
    colorFails
      ? `> ⚠️ ${colorFails} contrast pair(s) couldn't be auto-resolved from this hue — check them in \`generate_color_system\`.`
      : "> ✅ All generated color pairs pass WCAG 2.2.",
    "",
    "_This is a starting foundation, not a finished design. Follow `get_design_roadmap` for the full process._",
  ];
  return out.join("\n");
}
