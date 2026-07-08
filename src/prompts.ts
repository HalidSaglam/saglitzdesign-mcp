// SaglitzDesign MCP prompts — user-invocable workflows that orchestrate the
// server's knowledge tools into an end-to-end "build / review / redesign"
// experience. In Claude Code these appear in the "/" (slash) prompt menu.

const TOOLS_NOTE = `You have the SaglitzDesign knowledge tools available. Use them — do not design from memory:
- get_design_roadmap(project_type) — the phased plan; call FIRST.
- search_design_knowledge(query) / get_design_doc(id) — rules & specs.
- get_component_guidance(component, platform) — per-component specs + patterns.
- get_design_examples(query, platform) — real annotated screenshots to reference.
- get_design_language(language) — Material 3 / Liquid Glass / iOS / Android / macOS / Fluent / web-trends / tokens.
- seo_geo_guide(scope, topic) — SEO & GEO for web.
- design_review_checklist(project_type, focus) — the audit gate.`;

const CRITIQUE_LOOP = `## Visual critique loop (do this, don't skip it)
After you build something runnable:
1. Run it and open it in a browser. If a browser-automation tool is available
   (Claude in Chrome, Playwright, or chrome-devtools MCP), navigate to the page
   and take a screenshot at both mobile (390px) and desktop (1440px) widths.
   If no browser tool is available, say so and review the code directly instead.
2. Look at the screenshot as a critical senior designer. Score it against the
   rubric in get_design_doc("design-critique-scoring") (0–40) and run the
   matching design_review_checklist.
3. Fix the highest-severity issues first (hierarchy, one primary CTA, spacing
   from the scale, contrast ≥ the required ratios, real content stress).
4. Re-screenshot and repeat until it passes the checklist and the squint test
   (the primary action is the first thing you see). Report the before/after.`;

const QUALITY_BAR = `## Non-negotiables (from the knowledge base)
- Content & copy BEFORE chrome: write the real headline/CTA/empty/error copy first (never lorem ipsum).
- Exactly one primary CTA per view; verb-first labels ("Start free trial", never "Submit").
- Everything on the 8pt spacing scale; tokens for color/type/spacing, not ad-hoc values.
- Text contrast ≥4.5:1, non-text ≥3:1; visible focus states; keyboard reachable.
- Design every state: default, empty, loading, error, long-content, zero-results.
- Respect prefers-reduced-motion; motion durations/easings per the motion doc.
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
    description: "Design & build a conversion-focused landing page end-to-end using SaglitzDesign expertise, with a visual critique loop.",
    build: (brief) => `Build a high-converting **landing page**${brief ? ` for: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLS_NOTE}

## Sequence
1. Call get_design_roadmap("landing-page") and follow its phases.
2. **Positioning & message first.** If key facts are missing (who it's for, the offer, the one conversion goal, proof points), ask me up to 4 concise questions before building. Then draft the hero headline, subhead, primary CTA + risk-reducers, and the section narrative (hero → proof → benefits → objections/FAQ → final CTA). Pull rules from get_design_doc("storybrand-copywriting"), get_design_doc("conversion-ux"), get_design_doc("influence-persuasion").
3. **Reference real examples:** get_design_examples("hero", "web"), get_design_examples("pricing", "web"), get_design_examples("social proof", "web").
4. **Build it.** Write the actual code (default to a single responsive HTML file with inline CSS unless I specify a stack like Next.js/React/Tailwind). Apply the foundations: typography, color-systems, spacing-layout, buttons, visual-craft-standards.
5. **SEO/GEO:** apply seo_geo_guide("both") essentials — semantic HTML, meta/title, one H1, JSON-LD, fast images/fonts.

${QUALITY_BAR}

${CRITIQUE_LOOP}

Finish with: the files created, how to preview it, the critique score, and what you'd test/improve next.`,
  },
  {
    name: "build_website",
    title: "Build a website (SaglitzDesign)",
    description: "Design & build a multi-page marketing website end-to-end using SaglitzDesign expertise, with a visual critique loop.",
    build: (brief) => `Build a marketing **website**${brief ? ` for: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLS_NOTE}

## Sequence
1. Call get_design_roadmap("website") and follow its phases (positioning → copy → IA/SEO → design → build → CRO).
2. **Positioning + IA first.** Ask me up to 4 questions if the audience, offer, conversion goal, or page set is unclear. Then propose a sitemap (home, product/features, pricing, about, contact, etc.), each page mapped to one search intent.
3. **Copy before layout** for each page (get_design_doc("storybrand-copywriting"), get_design_doc("marketing-website-roadmap")).
4. **SEO/GEO foundations up front:** seo_geo_guide("both") — rendering, meta, schema plan, llms.txt, internal linking.
5. **Reference real examples** via get_design_examples for each section type.
6. **Build it** as a coherent multi-page site (default: static HTML/CSS with shared styles, or a Next.js app if I ask). Shared design tokens; consistent nav/footer; every page in all states.

${QUALITY_BAR}

${CRITIQUE_LOOP}

Finish with: sitemap built, files, preview instructions, per-page critique scores, SEO/GEO checklist status, and next steps.`,
  },
  {
    name: "build_mobile_app_ui",
    title: "Build a mobile app UI (SaglitzDesign)",
    description: "Design & build iOS or Android app screens end-to-end using SaglitzDesign expertise, with a visual critique loop.",
    build: (brief) => `Design and build **mobile app UI**${brief ? ` for: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLS_NOTE}

## Sequence
1. Ask which platform (iOS or Android) and stack (SwiftUI / Jetpack Compose / React Native / Flutter) if not stated, plus the 2–3 core screens to build. Ask up to 4 questions max.
2. Call get_design_roadmap("ios-app") or ("android-app") and follow it.
3. Load the platform baseline: get_design_language("ios-app-design") + ("apple-hig-liquid-glass"), or ("android-app-design") + ("material-3"). Respect native navigation, controls, safe areas, Dynamic Type / sp.
4. **Reference real examples** with get_design_examples (platform "mobile"): onboarding, paywall, navigation, empty-state, etc.
5. **Build the screens** with get_component_guidance for each element; design every state; thumb-zone the primary actions.

${QUALITY_BAR}

${CRITIQUE_LOOP}

Finish with: screens built, how to run/preview, critique scores, platform-fit notes, and next steps.`,
  },
];

const ACTION_PROMPTS: PromptDef[] = [
  {
    name: "design_review",
    title: "Design review (SaglitzDesign)",
    description: "Audit an existing website / app / landing page against SaglitzDesign checklists and the 0–40 critique rubric.",
    build: (brief) => `Do an expert **design review**${brief ? ` of: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLS_NOTE}

## Sequence
1. Identify the project type (website / landing-page / mobile-app / macos-app / dashboard). If it's a URL or running app and a browser tool is available, open it and screenshot mobile + desktop; otherwise review the code/design provided.
2. Run design_review_checklist for that type (and a focused pass: accessibility, conversion, seo, etc.).
3. Score against get_design_doc("design-critique-scoring") (0–40) with per-heuristic notes.
4. Report findings ranked by severity (P0→P3): what's wrong, why (cite the rule/doc), and the concrete fix. Separate "must fix" from "polish".
5. If asked, apply the top fixes and re-review.

Be specific and prescriptive — every finding cites a SaglitzDesign rule and gives an actionable fix, not vague advice.`,
  },
  {
    name: "redesign",
    title: "Redesign / improve a UI (SaglitzDesign)",
    description: "Improve an existing UI (bolder, quieter, cleaner, higher-converting) using SaglitzDesign craft standards, with a visual critique loop.",
    build: (brief) => `**Redesign / improve** the UI${brief ? `: ${brief}` : ""}, using the SaglitzDesign method.

${TOOLS_NOTE}

## Sequence
1. First review the current state: run design_review_checklist and score it (get_design_doc("design-critique-scoring")). State the top problems and the design direction you'll take (and why).
2. Pull the relevant craft docs: visual-craft-standards, typography-craft, and the foundations (typography, color-systems, spacing-layout). For conversion goals, add conversion-ux + storybrand-copywriting.
3. Reference real examples with get_design_examples for the pattern in question.
4. **Apply the changes in code**, preserving working behavior. Improve hierarchy by de-emphasizing secondary content rather than only enlarging primary; fix spacing to the scale; one primary CTA; contrast; states.

${QUALITY_BAR}

${CRITIQUE_LOOP}

Finish with a concrete before→after: the score change, what you changed and why, and what to test next.`,
  },
];

const ALL_PROMPTS = [...BUILD_PROMPTS, ...ACTION_PROMPTS];

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
