// SaglitzDesign MCP prompts — user-invocable workflows that orchestrate the
// server's tools into an end-to-end "build / review / redesign / port"
// experience. In Claude Code these appear in the "/" (slash) prompt menu.
//
// These are the product's front door, so they must drive the WHOLE server:
// the knowledge base for judgement, the generators for a real foundation, the
// recipes for real code, and the deterministic auditors as a pass/fail gate.
// A workflow that only reads documents is leaving the machine-checkable half
// of the method on the table.

const TOOLKIT = `You have the SaglitzDesign tools available. Use them — do not design from memory.

**Knowledge (judgement):**
- get_design_roadmap(project_type) — the phased plan; call FIRST on any build.
- search_design_knowledge(query) / get_design_doc(id) — rules & specs. Ids also readable as saglitzdesign://doc/{id}.
- get_component_guidance(component, platform) — per-component specs + patterns.
- get_design_language(language) — Material 3 / Liquid Glass / iOS / Android / macOS / visionOS / Fluent / web-trends / tokens.
- compare_design_languages(topic, platforms) — how each platform solves one surface, and what NOT to port.
- get_design_examples(query, platform) — curated real-world example screens.
- seo_geo_guide(scope, topic) — SEO & GEO for web.

**Generators (real output, not advice — prefer these over inventing values):**
- create_design_system(brand_color, vibe, platform) — the one-call foundation: color + fonts + icons + type scale + elevation + tokens + component list.
- generate_layout_system(preset) — breakpoints, containers, grid, container queries, section rhythm.
- generate_color_system / suggest_font_pairing / suggest_icon_library / generate_type_scale / generate_elevation_system / generate_motion / generate_design_tokens — the individual layers.
- get_component_recipe(component, stack) — production-ready accessible code for button/input/modal/toast/card/switch/tabs/empty-state/list-row.
- fix_contrast(foreground, background, target) — the corrected color value, not just a fail report.

**Auditors (deterministic gates — run these before claiming done):**
- audit_accessibility(contrast_pairs, tap_targets) — exact WCAG ratios and target sizes.
- design_lint(code) — design & a11y anti-patterns with line numbers.
- audit_design_system(code) — consistency score + value sprawl across the whole codebase.
- audit_project(path) — the same auditors over a real directory instead of a pasted snippet, ranked worst-file-first. Prefer this when you have the source on disk.
- audit_ux_copy(text) — readability, passive voice, jargon, weak CTAs.
- measure_screenshot(path, scale, format) — measures a PNG screenshot's real palette, contrast ratios, density and structure. Use it whenever you have an image file rather than source.
- design_review_checklist(project_type, focus) — the assembled audit checklist.`;

const FOUNDATION = `## Foundation before pixels
Do NOT hand-pick hex values, font sizes, radii or shadows. Generate the system, then build against it:
1. Ask for (or infer from the brief) a brand color and a one-line vibe.
2. Call **create_design_system(brand_color, vibe, platform)** — this returns an accessibility-verified palette (light + dark), a matched font pairing, an icon library, a type scale, an elevation ramp, paste-ready tokens, and the component list to build.
3. For web/app layout, also call **generate_layout_system(preset)** and use its breakpoints, container widths, grid and section-rhythm tokens.
4. Emit the tokens into the codebase as the single source of truth, then reference them everywhere. Every later value you write should be a token, not a literal.
If the user already has a design system, do NOT introduce a second one: run **import_design_tokens(source)** on their theme (CSS custom properties, a shadcn :root block, a DTCG file) to read the roles it already names and see which ones it leaves undefined, and **audit_design_system(code)** on the stylesheet to see what is still hardcoded. Build inside what exists.`;

const VERIFY_GATE = `## Verify gate (deterministic — run before you say it's done)
These are machine-checkable. Do not skip them and do not self-assess in their place:
1. **design_lint(code)** on the markup/styles you wrote — or **audit_project(path)** if the work is already on disk, which runs the lint over every file and adds the cross-file consistency score. Fix every 🔴 error; justify anything you leave.
2. **audit_accessibility** with the real foreground/background pairs you shipped (body text, muted text, the primary button, borders/focus rings) and the real tap-target sizes. Anything failing → **fix_contrast** and apply the returned value.
3. **audit_design_system(code)** on the finished styles. Every dimension should land inside its budget; near-duplicate colors and off-grid spacing must be zero — you generated a system, so there is no excuse for drift.
4. **audit_ux_copy(text)** on the headline, subhead, primary CTA and any error/empty copy.
5. **design_review_checklist(project_type)** as the final read-through.
Report each gate's result. If one fails and you chose not to fix it, say which and why.`;

const CRITIQUE_LOOP = `## Visual critique loop (do this, don't skip it)
The gate above proves it is correct; this proves it is *good*.
1. Run it and open it in a browser. If a browser-automation tool is available
   (Claude in Chrome, Playwright, or chrome-devtools MCP), navigate to the page
   and take a screenshot at both mobile (390px) and desktop (1440px) widths.
   If no browser tool is available, say so and review the code directly instead.
2. Look at the screenshot as a critical senior designer. Score it against the
   rubric in get_design_doc("design-critique-scoring") (0–40).
3. Fix the highest-severity issues first (hierarchy, one primary CTA, spacing
   from the scale, contrast, real content stress).
4. Re-screenshot and repeat until it passes the checklist and the squint test
   (the primary action is the first thing you see). Report the before/after.`;

const QUALITY_BAR = `## Non-negotiables (from the knowledge base)
- Content & copy BEFORE chrome: write the real headline/CTA/empty/error copy first (never lorem ipsum).
- Exactly one primary CTA per view; verb-first labels ("Start free trial", never "Submit").
- Everything from the generated scales; tokens for color/type/spacing/radius/shadow, not ad-hoc values.
- Text contrast ≥4.5:1, non-text ≥3:1; visible focus states; keyboard reachable.
- Design every state: default, empty, loading, error, long-content, zero-results.
- Respect prefers-reduced-motion; use generate_motion's tokens rather than inventing durations.
- For web: semantic HTML, LCP ≤2.5s discipline (image/font rules), no layout shift.`;

interface PromptDef {
  name: string;
  title: string;
  description: string;
  // returns the injected user-message text given the (optional) argument
  build: (brief: string) => string;
}

const BUILD_PROMPTS: PromptDef[] = [
  {
    name: "build_landing_page",
    title: "Build a landing page (SaglitzDesign)",
    description: "Design & build a conversion-focused landing page end-to-end using SaglitzDesign expertise — generated design system, real code, deterministic audit gate, visual critique loop.",
    build: (brief) => `Build a high-converting **landing page**${brief ? ` for: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLKIT}

## Sequence
1. Call get_design_roadmap("landing-page") and follow its phases.
2. **Positioning & message first.** If key facts are missing (who it's for, the offer, the one conversion goal, proof points, brand color), ask me up to 4 concise questions before building. Then draft the hero headline, subhead, primary CTA + risk-reducers, and the section narrative (hero → proof → benefits → objections/FAQ → final CTA). Pull rules from get_design_doc("storybrand-copywriting"), get_design_doc("conversion-ux"), get_design_doc("influence-persuasion"). Run audit_ux_copy on the headline and CTA before you commit to them.
3. **Reference real examples:** get_design_examples("hero", "web"), get_design_examples("pricing", "web"), get_design_examples("social proof", "web"), and the pattern docs web-hero-sections / web-social-proof-footer / web-landing-signup.
4. ${"**Generate the foundation**"} — see below — with platform "web" and preset "marketing-site".
5. **Build it.** Write the actual code (default to a single responsive HTML file with inline CSS unless I specify a stack like Next.js/React/Tailwind). Use get_component_recipe for the button and any form/input so states, ARIA and keyboard support are right the first time.
6. **SEO/GEO:** apply seo_geo_guide("both") essentials — semantic HTML, meta/title, one H1, JSON-LD, fast images/fonts.

${FOUNDATION}

${QUALITY_BAR}

${VERIFY_GATE}

${CRITIQUE_LOOP}

Finish with: the files created, how to preview it, the gate results, the critique score, and what you'd test/improve next.`,
  },
  {
    name: "build_website",
    title: "Build a website (SaglitzDesign)",
    description: "Design & build a multi-page marketing website end-to-end — positioning, IA, SEO/GEO, a generated shared design system, audit gate and visual critique loop.",
    build: (brief) => `Build a marketing **website**${brief ? ` for: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLKIT}

## Sequence
1. Call get_design_roadmap("website") and follow its phases (positioning → copy → IA/SEO → design → build → CRO).
2. **Positioning + IA first.** Ask me up to 4 questions if the audience, offer, conversion goal, page set or brand color is unclear. Then propose a sitemap (home, product/features, pricing, about, contact…), each page mapped to one search intent. get_design_doc("information-architecture") for the structure.
3. **Copy before layout** for each page (get_design_doc("storybrand-copywriting"), get_design_doc("marketing-website-roadmap")); audit_ux_copy each page's headline and primary CTA.
4. **SEO/GEO foundations up front:** seo_geo_guide("both") — rendering, meta, schema plan, llms.txt, internal linking.
5. **Reference real examples** via get_design_examples for each section type.
6. **Generate the foundation ONCE** (below) and share it across every page — that is what makes a multi-page site feel like one product. Layout preset "marketing-site".
7. **Build it** as a coherent multi-page site (default: static HTML/CSS with shared styles, or a Next.js app if I ask). Shared tokens; consistent nav/footer; every page in all states. Use get_component_recipe for repeated components.

${FOUNDATION}

${QUALITY_BAR}

${VERIFY_GATE}

Run audit_design_system across the *combined* stylesheet of all pages — cross-page drift is the specific failure mode of multi-page builds.

${CRITIQUE_LOOP}

Finish with: sitemap built, files, preview instructions, per-page critique scores, gate results, SEO/GEO checklist status, and next steps.`,
  },
  {
    name: "build_mobile_app_ui",
    title: "Build a mobile app UI (SaglitzDesign)",
    description: "Design & build iOS or Android app screens end-to-end on the correct platform baseline, with generated tokens, real component code and an audit gate.",
    build: (brief) => `Design and build **mobile app UI**${brief ? ` for: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLKIT}

## Sequence
1. Ask which platform (iOS or Android) and stack (SwiftUI / Jetpack Compose / React Native / Flutter) if not stated, plus the 2–3 core screens to build and a brand color. Ask up to 4 questions max.
2. Call get_design_roadmap("ios-app") or ("android-app") and follow it.
3. Load the platform baseline: get_design_language("ios-app-design") + ("apple-hig-liquid-glass"), or ("android-app-design") + ("material-3"). Respect native navigation, controls, safe areas, Dynamic Type / sp.
4. **Reference real examples** with get_design_examples (platform "mobile") and the pattern docs: mobile-navigation-home, mobile-onboarding-paywall, mobile-empty-states-buttons, mobile-settings-lists, mobile-auth-patterns.
5. **Generate the foundation** (below) with platform "ios" or "android" so the tokens come out as Tokens.swift / Tokens.kt.
6. **Build the screens** using get_component_recipe(component, "swiftui" | "compose") for the standard controls and get_component_guidance for the rest. Design every state; thumb-zone the primary actions.
7. If this UI also exists (or will exist) on another platform, call compare_design_languages for each surface you are porting rather than translating the design literally.

${FOUNDATION}

${QUALITY_BAR}

${VERIFY_GATE}

For native code, design_lint is web-oriented — still run audit_accessibility on your real color pairs and tap-target sizes (iOS 44pt / Android 48dp), and audit_design_system on any stylesheet/theme file.

${CRITIQUE_LOOP}

Finish with: screens built, how to run/preview, gate results, critique scores, platform-fit notes, and next steps.`,
  },
];

const ACTION_PROMPTS: PromptDef[] = [
  {
    name: "critique_screenshot",
    title: "Critique a screenshot (SaglitzDesign)",
    description: "Grounded, reproducible visual critique of an attached UI screenshot against the fixed 0–40 rubric — cites specific elements, no padding.",
    build: (brief) => `Critique the **attached UI screenshot**${brief ? ` (context: ${brief})` : ""} as a rigorous senior designer, using the SaglitzDesign method.

${TOOLKIT}

## Method — avoid the failure modes of typical AI critique
Research shows most AI critiques (a) hallucinate issues inconsistently, (b) pad the list to look thorough, and (c) critique a text description instead of the actual pixels. Do NOT do these. Instead:

1. **Look at the image first.** Describe what you actually see (layout, hierarchy, the primary action, states shown) before judging. If you're unsure what an element is, say so — don't invent.
2. **Apply the fixed rubric.** Call get_design_doc("design-critique-scoring") and score each of the 10 heuristics 0–4 for a total /40. Use the SAME rubric every time so scores are reproducible.
3. **Cite specific elements.** Every finding must point to a concrete element ("the secondary 'Learn more' button competes with the primary CTA — two filled buttons"), not generic advice.
4. **Measure before you judge.** If the screenshot exists as a file, call measure_screenshot(path) FIRST and let its numbers drive the critique — the real palette and how many colours the screen actually uses, exact WCAG ratios for the pairs on screen, density, and the structural detections with their confidence. Cite those numbers instead of impressions ("the muted text measures 2.9:1; AA needs 4.5"), and run fix_contrast for each failure. Respect the confidence levels: a medium-confidence detection is a question to check, not a finding to assert. If you only have an inline image and no file path, say so, and fall back to audit_accessibility on any colours you can read plus audit_ux_copy on legible copy.
5. **No padding.** Report only real issues. If the screen is genuinely good, a short list is the correct answer — do not manufacture findings to seem thorough.
6. **Rank by severity P0→P3** and give one concrete fix per finding, citing the SaglitzDesign rule/doc it comes from.
7. If it's a known screen type, also run the matching design_review_checklist and get_design_examples to compare against how top apps handle it.

Output: the /40 score with per-heuristic line, then findings ranked by severity (element → problem → why (cite rule) → fix), then the 3 highest-impact changes. Keep it tight and specific.`,
  },
  {
    name: "review_paywall",
    title: "Review a paywall / onboarding (SaglitzDesign)",
    description: "Score a paywall or subscription onboarding against real RevenueCat 2026 conversion benchmarks and paywall-anatomy rules.",
    build: (brief) => `Review this **paywall / subscription onboarding**${brief ? `: ${brief}` : ""} using the SaglitzDesign method and real 2026 benchmarks.

${TOOLKIT}

## Method
1. Load the data: get_design_doc("paywall-benchmarks") (RevenueCat 2026: hard paywall ~10.7% vs freemium ~2.1%; 17–32 day trials convert 42.5% vs 25.5% for <4 days; 55% of 3-day-trial cancels happen Day 0; Android involuntary churn ~2.2× iOS) and get_design_doc("mobile-onboarding-paywall") for anatomy.
2. If given a screenshot, look at it and describe the actual paywall (model, plans, trial, price placement, CTA, trust copy). If given a description, work from that; ask up to 3 questions only if a benchmark-critical fact is missing (model, trial length, platform).
3. Score it against the review rubric in paywall-benchmarks.md — each item pass/fail with the benchmark it maps to.
4. Run audit_ux_copy on the plan labels, the CTA and the trial/price disclosure — vague or hedging copy at the moment of payment is a measurable conversion leak. Check the pricing disclosure against get_design_doc("ethical-design") for dark patterns; a paywall that converts by confusing people is a refund and a store-review risk, not a win.
5. Estimate where it likely leaves conversion on the table (e.g. "≤4-day trial → ~40% relative conversion lost vs a 14–30 day trial").
6. Give prioritized, concrete fixes (model choice, trial length, price placement, trial reminder, Android dunning, trust microcopy), each tied to a benchmark number.

Output: a pass/fail scorecard, the top 3 conversion risks with their benchmark impact, and the exact changes to make. Be specific and numeric — no generic "add social proof" advice.`,
  },
  {
    name: "design_review",
    title: "Design review (SaglitzDesign)",
    description: "Audit an existing website / app / landing page against SaglitzDesign checklists, the deterministic auditors, and the 0–40 critique rubric.",
    build: (brief) => `Do an expert **design review**${brief ? ` of: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLKIT}

## Sequence
1. Identify the project type (website / landing-page / mobile-app / macos-app / dashboard). If it's a URL or running app and a browser tool is available, open it and screenshot mobile + desktop; otherwise review the code/design provided.
2. **Measure before you opine.** If you have the source, run the deterministic auditors first and let their output drive the findings:
   - design_lint(code) — anti-patterns with line numbers.
   - audit_design_system(code) — is there actually a system, or is every screen re-deciding the basics? This is the finding senior reviewers make and juniors miss.
   - audit_accessibility on the real color pairs and target sizes; fix_contrast for each failure.
   - audit_ux_copy on the primary headlines, CTAs and error messages.
   - measure_screenshot(path) — when you are reviewing a screenshot file rather than source, this is the equivalent of the auditors above: real palette, real contrast ratios, real spacing.
3. Run design_review_checklist for that type, plus a focused pass where it matters (accessibility, conversion, seo, copywriting).
4. Score against get_design_doc("design-critique-scoring") (0–40) with per-heuristic notes.
5. Report findings ranked by severity (P0→P3): what's wrong, why (cite the rule/doc, or the measured number), and the concrete fix. Separate "must fix" from "polish". Lead with anything the tools measured — a stated ratio of 2.9:1 or a score of 41/100 ends an argument that an opinion cannot.
6. If asked, apply the top fixes and re-run the auditors to show the delta.

Be specific and prescriptive — every finding cites a SaglitzDesign rule or a measured value and gives an actionable fix, not vague advice.`,
  },
  {
    name: "redesign",
    title: "Redesign / improve a UI (SaglitzDesign)",
    description: "Improve an existing UI (bolder, quieter, cleaner, higher-converting) using SaglitzDesign craft standards, with measured before→after.",
    build: (brief) => `**Redesign / improve** the UI${brief ? `: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLKIT}

## Sequence
1. **Baseline it with numbers.** Run design_review_checklist, audit_design_system(code) and design_lint(code), and score the current state with get_design_doc("design-critique-scoring"). Record the consistency score and the critique score — these are your before/after evidence.
2. State the top problems and the design direction you'll take (and why).
3. Pull the relevant craft docs: visual-craft-standards, typography-craft, clean-app-design, and the foundations. For conversion goals, add conversion-ux + storybrand-copywriting.
4. **Fix the system, not the symptoms.** If audit_design_system showed sprawl, generate the target scales (create_design_system, or the individual generators) and migrate values onto tokens — that is usually a bigger visual win than restyling components one by one. Collapse each near-duplicate color onto the survivor the audit named.
5. Reference real examples with get_design_examples for the pattern in question.
6. **Apply the changes in code**, preserving working behavior. Improve hierarchy by de-emphasizing secondary content rather than only enlarging primary; fix spacing to the scale; one primary CTA; contrast; states.

${QUALITY_BAR}

${VERIFY_GATE}

${CRITIQUE_LOOP}

Finish with a concrete before→after table: consistency score, critique score, lint findings and contrast failures — each as before → after — then what you changed and why, and what to test next.`,
  },
  {
    name: "port_to_platform",
    title: "Port a UI to another platform (SaglitzDesign)",
    description: "Take an existing design or implementation to another platform (iOS ↔ Android ↔ macOS ↔ web) — porting the intent and IA, not the components.",
    build: (brief) => `**Port this UI to another platform**${brief ? `: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLKIT}

## The rule this workflow exists to enforce
Share the intent, the information architecture and the content; re-implement every control natively. A product that feels native everywhere ported *decisions*, not components. A Material top app bar on iOS, or an iOS segmented control on Android, is the failure this prevents.

## Sequence
1. Confirm the source and target platforms and the screens in scope. Ask up to 3 questions if unclear.
2. Load the target baseline with get_design_language (ios-app-design + apple-hig-liquid-glass · android-app-design + material-3 · macos-app-design · web-trends-2026).
3. **Inventory the surfaces** in the source UI (navigation, buttons, modals/sheets, forms, lists, search, settings, motion, icons, typography, color, elevation) and for EACH one call compare_design_languages(topic, [source, target]). Follow its porting rules and honor its "do NOT port" list explicitly — call out anything in the source design that appears on that list.
4. **Re-map the tokens, don't copy them.** If the source platform already has a theme, run **import_design_tokens(source, format: "swiftui" | "compose" | "css")** — it reads the roles the existing system names and re-emits them for the target, and tells you which roles it never defined. Otherwise regenerate with create_design_system. Either way, point sizes, touch targets and elevation mechanics differ per platform and must be recomputed, not translated.
5. **Build the target screens** with get_component_recipe(component, stack) for the target's native stack, and get_component_guidance(component, platform) for the rest.
6. Design every state again on the target — empty/loading/error behavior is platform-specific, not inherited.

${QUALITY_BAR}

${VERIFY_GATE}

Finish with: a surface-by-surface mapping table (source pattern → target pattern → why), the list of things you deliberately did NOT port, the screens built, gate results, and what still needs a native-device check.`,
  },
];

const ALL_PROMPTS = [...BUILD_PROMPTS, ...ACTION_PROMPTS];

/**
 * Exposed for the command generator and the tests: the exact metadata
 * `registerPrompts` hands the server for each workflow. Anything that needs a
 * workflow's name, title or description reads it from here rather than
 * re-deriving it — a description written twice is a description that drifts,
 * and the generated `commands/*.md` carry the same text a client sees over MCP.
 */
export interface PromptMeta {
  name: string;
  title: string;
  description: string;
}

export const PROMPT_METADATA: readonly PromptMeta[] = ALL_PROMPTS.map(
  ({ name, title, description }) => ({ name, title, description }),
);

/** Exposed for tests: the workflows this server advertises. */
export const PROMPT_NAMES = PROMPT_METADATA.map((p) => p.name);

/** Exposed for tests: the rendered text of a workflow, without a running server. */
export function buildPromptText(name: string, brief = ""): string {
  const p = ALL_PROMPTS.find((x) => x.name === name);
  if (!p) throw new Error(`No prompt named "${name}"`);
  return p.build(brief.trim());
}

// Registered against an McpServer-like object exposing registerPrompt.
export function registerPrompts(server: {
  registerPrompt: (
    name: string,
    config: { title: string; description: string; argsSchema: Record<string, unknown> },
    cb: (args: { brief?: string }) => { messages: Array<{ role: "user"; content: { type: "text"; text: string } }> },
  ) => void;
}, briefArg: Record<string, unknown>): void {
  for (const p of ALL_PROMPTS) {
    server.registerPrompt(
      p.name,
      { title: p.title, description: p.description, argsSchema: briefArg },
      ({ brief }) => ({
        messages: [{ role: "user", content: { type: "text", text: p.build((brief ?? "").trim()) } }],
      }),
    );
  }
}
