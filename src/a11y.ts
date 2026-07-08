// Deterministic, design-time accessibility checks: WCAG 2.2 contrast + tap targets.
// Mirrors the axe-style rules designers wish ran at design time, not just in CI.

import { normalizeHex } from "./tokens.js";

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = normalizeHex(hex)!.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio between two opaque colors (1..21). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastPair {
  foreground: string;
  background: string;
  label?: string;
  large_text?: boolean; // ≥24px, or ≥18.66px bold
  ui_component?: boolean; // non-text (borders, icons, focus rings)
}

export interface TapTarget {
  label?: string;
  width: number;
  height: number;
  platform?: "ios" | "android" | "web";
}

export interface CheckResult {
  label: string;
  detail: string;
  required: string;
  actual: string;
  pass: boolean;
  fix?: string;
}

export function checkContrast(pairs: ContrastPair[]): CheckResult[] {
  return pairs.map((p, i) => {
    const label = p.label ?? `pair ${i + 1}`;
    const fg = normalizeHex(p.foreground);
    const bg = normalizeHex(p.background);
    if (!fg || !bg) {
      return { label, detail: `${p.foreground} on ${p.background}`, required: "valid hex", actual: "invalid hex", pass: false, fix: "Use #RGB / #RRGGBB / #RRGGBBAA." };
    }
    const ratio = contrastRatio(fg, bg);
    const required = p.ui_component ? 3 : p.large_text ? 3 : 4.5;
    const kind = p.ui_component ? "non-text UI (WCAG 1.4.11)" : p.large_text ? "large text (WCAG 1.4.3 AA)" : "normal text (WCAG 1.4.3 AA)";
    const pass = ratio >= required;
    return {
      label,
      detail: `${fg} on ${bg} — ${kind}`,
      required: `≥ ${required}:1`,
      actual: `${ratio.toFixed(2)}:1`,
      pass,
      fix: pass ? undefined : `Increase contrast to ≥${required}:1 (darken/lighten one color). AAA target is ${p.large_text || p.ui_component ? "4.5" : "7"}:1.`,
    };
  });
}

export function checkTargets(targets: TapTarget[]): CheckResult[] {
  const MIN = { ios: 44, android: 48, web: 24 } as const; // pt / dp / css px (WCAG 2.2 min for web)
  const REC = 44; // recommended comfortable minimum across platforms
  return targets.map((t, i) => {
    const platform = t.platform ?? "web";
    const min = MIN[platform];
    const smaller = Math.min(t.width, t.height);
    const pass = smaller >= min;
    const unit = platform === "ios" ? "pt" : platform === "android" ? "dp" : "px";
    return {
      label: t.label ?? `target ${i + 1}`,
      detail: `${t.width}×${t.height}${unit} (${platform})`,
      required: `≥ ${min}×${min}${unit}${platform === "web" ? ` (rec. ${REC})` : ""}`,
      actual: `${smaller}${unit} smallest side`,
      pass,
      fix: pass ? undefined : `Enlarge to ≥${min}${unit}, or expand the hit area (padding) beyond the visible bounds.`,
    };
  });
}

export function contrastReport(pairs: ContrastPair[], targets: TapTarget[]): string {
  const out: string[] = ["# Accessibility audit (WCAG 2.2)"];
  const cr = checkContrast(pairs);
  const tr = checkTargets(targets);
  const all = [...cr, ...tr];
  const fails = all.filter((r) => !r.pass).length;

  out.push(`\n**${all.length} checks · ${all.length - fails} pass · ${fails} fail**\n`);

  if (cr.length) {
    out.push("## Color contrast");
    out.push("| element | measured | required | result |");
    out.push("|---|---|---|---|");
    for (const r of cr) out.push(`| ${r.label} — ${r.detail} | ${r.actual} | ${r.required} | ${r.pass ? "✅ pass" : "❌ FAIL"} |`);
    const failFixes = cr.filter((r) => !r.pass);
    if (failFixes.length) {
      out.push("\n**Fixes:**");
      for (const r of failFixes) out.push(`- **${r.label}:** ${r.fix}`);
    }
  }

  if (tr.length) {
    out.push("\n## Tap / target sizes");
    out.push("| target | size | required | result |");
    out.push("|---|---|---|---|");
    for (const r of tr) out.push(`| ${r.label} | ${r.detail} | ${r.required} | ${r.pass ? "✅ pass" : "❌ FAIL"} |`);
    const failFixes = tr.filter((r) => !r.pass);
    if (failFixes.length) {
      out.push("\n**Fixes:**");
      for (const r of failFixes) out.push(`- **${r.label}:** ${r.fix}`);
    }
  }

  out.push(
    "\n---\n_Deterministic checks only (contrast + target size). These are ~the machine-verifiable slice of accessibility; axe-core-style automation catches ~57% of issues by volume. Still verify manually: keyboard/focus order, screen-reader labels & announcements, Dynamic Type at 200%, motion, and cognitive load. See get_design_doc(\"accessibility\")._",
  );
  return out.join("\n");
}
