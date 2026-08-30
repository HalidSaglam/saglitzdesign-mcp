---
name: saglitzdesign
description: Design, redesign, build, restyle, improve, critique, review, audit, simplify, polish, or animate a user interface — the front door into SaglitzDesign's seven design skills, for whichever one the work actually needs. Covers landing pages, marketing sites, dashboards, app screens, components, forms, onboarding, empty states, paywalls, and settings, on web, iOS, Android, and macOS. Use it for visual hierarchy, typography, colour, spacing, layout, motion, accessibility, design tokens, and UX copy — making a bland screen bolder, a loud one quieter, an inconsistent one systemized, or a rough one production-ready. Also fires whenever a change carries an appearance decision, even unasked — porting a component to another platform, or turning a mockup into code. Not for pure functionality with no design decision in it — "make the form work" or "add sorting to the table" should not reach for this skill.
sources: design-systems-methodology, design-tokens-theming, theming-off-the-shelf, visual-craft-standards, design-critique-scoring, clean-app-design
---

# SaglitzDesign

This is the door into a design system that can prove its claims: every recommendation downstream of it either comes generated, comes measured, or comes cited — not from taste alone.

## Route to the right skill

The sign the work gives off, and which of the seven depth skills answers it. Read top to bottom; the first row that matches wins.

| The work is… | Route to |
|---|---|
| Native iOS, iPadOS, or macOS UI — HIG conventions, Liquid Glass, or porting a design onto an Apple platform | `apple-platform-design` |
| Auditing a whole project or repository — running every deterministic auditor over it, before it ships or to see what is wrong with it | `ship-quality-gate` |
| Critiquing one interface — a screenshot, a live page, or a screen's code — for what's wrong with it | `design-review` |
| Checking whether a codebase has a real design system, or migrating scattered values onto tokens | `design-system-audit` |
| Building or improving a landing page or marketing site so it converts | `landing-page-conversion` |
| Adding or fixing motion — transitions, hovers, presses, gestures, page transitions | `motion-and-animation` |
| Anything else — building or restyling a UI with no more specific match above | `clean-interface-design` |

The two audit-shaped rows overlap, and the order resolves it deliberately:
"audit this repo for what's wrong with it" is a whole-project run, so it goes
to `ship-quality-gate` — the deterministic gate — rather than to the taste
critique. Reach for `design-review` when the target really is one screen.

## Four invariants, whichever skill you land in

1. **Generate the system before the pixels.** A brand color and a vibe produce a whole foundation — palette, type scale, spacing, elevation, tokens — before any single screen gets built. Hand-picked one-off hex values and font sizes are the failure mode this prevents.
2. **Bind every value to a token.** A color, radius, spacing step, or type size that isn't a token reference is a value the next screen will re-decide independently. That's how "feels inconsistent but I can't say why" happens.
3. **Run the deterministic auditors at the close.** Taste closes the file; a lint pass, a contrast check, and a consistency score close the task. Read what each auditor discloses it could not see, not only what it found.
4. **Ground every number claimed in a measured output.** A contrast ratio, a consistency score, a Lighthouse figure — state it because a tool produced it, not because it sounds plausible.

## Full depth

The build/review/port method itself — and the generators, recipes, and knowledge lookups it drives — lives in the SaglitzDesign MCP server (`npx saglitzdesign-mcp`), not in this file or any of the seven skills. Its tools include `get_design_roadmap`, `create_design_system`, `audit_project`, and the rest of the generators and auditors named inside each depth skill.

It also ships eight guided workflows — `build_website`, `build_landing_page`, `build_mobile_app_ui`, `redesign`, `port_to_platform`, `critique_screenshot`, `design_review`, `review_paywall` — which drive the whole method end to end for anyone who wants more than a skill's condensed guidance. Two channels, two spellings, and they are not interchangeable: installed as an MCP server (`npx saglitzdesign-mcp`, `claude mcp add`) they arrive as MCP **prompts**; installed as a plugin they arrive additionally as `/saglitzdesign:…` **slash commands**, which are files in `commands/` that an MCP install does not deliver. None of the eight is a tool, so none can be called by name the way `audit_project` can — you invoke them, they never fire on their own.
