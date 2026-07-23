// Deterministic motion-system generator.
// Easing + duration tokens and ready-to-paste keyframe animations across stacks,
// grounded in the animation-craft rules (ease-out on enter, never scale(0),
// origin-aware, honor reduced-motion). Real code, not advice.

export type MotionStack = "css" | "framer-motion" | "swiftui" | "all";

export const EASINGS: Record<string, { css: string; note: string }> = {
  standard: { css: "cubic-bezier(0.2, 0, 0, 1)", note: "default in/out for most UI moves" },
  decelerate: { css: "cubic-bezier(0, 0, 0, 1)", note: "ENTER — elements arriving (ease-out); the safe default for appearance" },
  accelerate: { css: "cubic-bezier(0.3, 0, 1, 1)", note: "EXIT — elements leaving (ease-in)" },
  emphasized: { css: "cubic-bezier(0.2, 0, 0, 1)", note: "expressive, larger moves (Material emphasized)" },
  spring: { css: "linear(0, 0.5 12%, 0.9 24%, 1.06 40%, 1.01 68%, 1)", note: "playful overshoot via CSS linear() easing" },
};

export const DURATIONS: Record<string, number> = {
  instant: 100, fast: 150, base: 200, slow: 300, slower: 500,
};

interface MotionDef {
  id: string;
  desc: string;
  duration: keyof typeof DURATIONS;
  easing: keyof typeof EASINGS;
  css: string; // @keyframes body + how to apply
  framer: string;
  swiftui: string;
}

const MOTIONS: MotionDef[] = [
  {
    id: "fade-in",
    desc: "Appear softly (dialog backdrops, content on load)",
    duration: "base", easing: "decelerate",
    css: `@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
.fade-in { animation: fade-in var(--duration-base) var(--ease-decelerate) both; }`,
    framer: `{ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, ease: [0,0,0,1] } }`,
    swiftui: `.transition(.opacity).animation(.easeOut(duration: 0.2), value: isVisible)`,
  },
  {
    id: "slide-up",
    desc: "Enter from below (toasts, sheets, list items) — small distance, never 100%",
    duration: "slow", easing: "decelerate",
    css: `@keyframes slide-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
.slide-up { animation: slide-up var(--duration-slow) var(--ease-decelerate) both; }`,
    framer: `{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0,0,0,1] } }`,
    swiftui: `.transition(.move(edge: .bottom).combined(with: .opacity)).animation(.easeOut(duration: 0.3), value: isVisible)`,
  },
  {
    id: "scale-in",
    desc: "Grow into place from ~0.95 (popovers, menus) — origin-aware, NEVER from scale(0)",
    duration: "fast", easing: "decelerate",
    css: `@keyframes scale-in { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
.scale-in { transform-origin: var(--origin, top center); animation: scale-in var(--duration-fast) var(--ease-decelerate) both; }`,
    framer: `{ initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.15, ease: [0,0,0,1] } }`,
    swiftui: `.scaleEffect(isVisible ? 1 : 0.95).opacity(isVisible ? 1 : 0).animation(.easeOut(duration: 0.15), value: isVisible)`,
  },
  {
    id: "spring-pop",
    desc: "Playful confirmation (like, add-to-cart, success) — subtle overshoot",
    duration: "slow", easing: "spring",
    css: `@keyframes spring-pop { 0% { transform: scale(1) } 40% { transform: scale(1.12) } 100% { transform: scale(1) } }
.spring-pop { animation: spring-pop var(--duration-slow) var(--ease-standard); }`,
    framer: `{ whileTap: { scale: 0.94 }, animate: { scale: 1 }, transition: { type: "spring", stiffness: 500, damping: 15 } }`,
    swiftui: `.scaleEffect(popped ? 1.12 : 1).animation(.spring(response: 0.3, dampingFraction: 0.5), value: popped)`,
  },
  {
    id: "shimmer",
    desc: "Loading placeholder / skeleton (and AI generating states)",
    duration: "slower", easing: "standard",
    css: `@keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }
.shimmer { background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-border) 37%, var(--color-surface) 63%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }`,
    framer: `{ animate: { backgroundPosition: ["-200% 0", "200% 0"] }, transition: { duration: 1.4, repeat: Infinity, ease: "linear" } }`,
    swiftui: `// Use .redacted(reason: .placeholder) with a moving gradient mask, or a Rectangle with an animated LinearGradient offset`,
  },
];

function block(lang: string, code: string): string {
  return "```" + lang + "\n" + code + "\n```";
}

export function motionReport(which: string | undefined, stack: MotionStack = "css"): string {
  const out: string[] = ["# Motion system", ""];

  out.push("## Easing tokens", "```css", ":root {",
    ...Object.entries(EASINGS).map(([k, v]) => `  --ease-${k}: ${v.css}; /* ${v.note} */`),
    "}", "```", "");
  out.push("## Duration tokens", "```css", ":root {",
    ...Object.entries(DURATIONS).map(([k, v]) => `  --duration-${k}: ${v}ms;`),
    "}", "```", "");

  const key = which?.trim().toLowerCase().replace(/\s+/g, "-");
  const picked = key ? MOTIONS.filter((m) => m.id === key || m.id.includes(key)) : MOTIONS;
  const list = picked.length ? picked : MOTIONS;

  out.push("## Animations");
  for (const m of list) {
    out.push(`### ${m.id}`, `_${m.desc} · duration ${DURATIONS[m.duration]}ms · ease ${m.easing}_`, "");
    if (stack === "css" || stack === "all") out.push("**CSS**", block("css", m.css), "");
    if (stack === "framer-motion" || stack === "all") out.push("**Framer Motion**", block("tsx", `// <motion.div {...anim} />\nconst anim = ${m.framer}`), "");
    if (stack === "swiftui" || stack === "all") out.push("**SwiftUI**", block("swift", m.swiftui), "");
  }

  out.push(
    "## Rules (non-negotiable)",
    "- **Enter with ease-out (decelerate), exit with ease-in (accelerate).** Never linear for UI moves except shimmer/spinners.",
    "- **Move small distances** (4–12px), not full offsets. Animate opacity + a small transform, not layout.",
    "- **Scale from ~0.95, never from 0** — scale(0) looks broken and warps children.",
    "- **Be origin-aware** — menus/popovers grow from their trigger (`transform-origin`).",
    "- **Keep it fast** — 150–300ms for most UI; longer only for large/expressive moves.",
    "- **Honor reduced motion** — wrap non-essential motion:",
    block("css", "@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }\n}"),
    "",
    "_Grounded in get_design_doc(\"animation-craft\"). Pair with `create_design_system`._",
  );
  return out.join("\n");
}

export const MOTION_IDS = MOTIONS.map((m) => m.id);
