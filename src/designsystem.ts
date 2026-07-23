// Flagship orchestrator: one brand color + vibe + platform → a complete,
// coherent design-system starter. Reuses the color / font / icon / type-scale /
// elevation / token generators and assembles them into a single day-one
// foundation with real code and a build checklist.

import { generateColorSystem } from "./color.js";
import { suggestFontPairing, type FontPairing } from "./fonts.js";
import { suggestIconLibrary, type IconLibrary } from "./icons.js";
import { buildTypeScale } from "./typescale.js";
import { buildElevation } from "./elevation.js";
import { generateTokens, DEFAULT_SPACING, DEFAULT_RADII, type TokenSpec, type TokenFormat } from "./tokens.js";

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
  const web = ["button", "input", "card", "modal", "toast", "tabs", "switch", "empty-state"];
  const mobile = ["button", "input", "list-row", "card", "toast", "switch", "empty-state"];
  return platform === "ios" || platform === "android" ? mobile : web;
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
  const font = suggestFontPairing(vibe, { limit: 1 })[0];
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

  const out: string[] = [
    `# ${name} — design system starter`,
    `_From brand \`${brandColor}\` · vibe "${vibe}" · platform ${platform}_`,
    "",
    "A complete, coherent foundation: color, type, space, elevation, fonts, and icons — verified and ready to build on. Each layer below is generated to work together.",
    "",
    "## 1. Foundations at a glance",
    "| Layer | Choice |",
    "|---|---|",
    `| Primary | \`${color.light.primary}\` (on \`${color.light.onPrimary}\`) |`,
    `| Neutrals | brand-tinted gray ramp (50–950) |`,
    `| Type | ${font.heading.family} / ${font.body.family} · modular ratio ${ratio} |`,
    `| Icons | ${icon.name} (${icon.license}) |`,
    `| Elevation | 5-level layered shadow ramp |`,
    `| Contrast | ${color.checks.length - colorFails}/${color.checks.length} WCAG checks pass${colorFails ? ` (${colorFails} need a look)` : " ✅"} |`,
    "",
    "## 2. Color",
    `- **Primary scale:** ${[50, 300, 500, 700, 900].map((s) => `\`${color.primary[s]}\``).join(" · ")} …`,
    `- **Light semantic:** bg \`${color.light.background}\` · surface \`${color.light.surface}\` · text \`${color.light.textPrimary}\` · border \`${color.light.border}\` · primary \`${color.light.primary}\``,
    `- **Dark semantic:** bg \`${color.dark.background}\` · surface \`${color.dark.surface}\` · text \`${color.dark.textPrimary}\` · primary \`${color.dark.primary}\``,
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
    "## 6. Tokens (ready to paste)",
    tokens,
    "",
    "## 7. Components to build",
    `Grab production-ready, accessible code for each with \`get_component_recipe\`:`,
    comps.map((c) => `\`${c}\``).join(" · "),
    "",
    "## 8. Build checklist",
    "- [ ] Drop the tokens above into your project as the single source of truth.",
    "- [ ] Install the icon library; use one family, one weight.",
    "- [ ] Load the two fonts (self-host or link); set display vs body roles.",
    "- [ ] Build core components from `get_component_recipe` using the tokens.",
    "- [ ] Verify contrast on any custom pairs with `audit_accessibility`; fix with `fix_contrast`.",
    "- [ ] Add motion from `generate_motion`; honor reduced-motion.",
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
