---
name: design-system-audit
description: Find out whether a codebase actually has a design system or is re-deciding the basics on every screen — count the distinct colors, sizes, radii, shadows and spacings, collapse the near-duplicates, and migrate onto tokens. Use when inheriting a codebase, before a redesign, when a UI "feels inconsistent but I can't say why", or when someone claims a design system exists and you want to verify it.
sources: design-systems-methodology, design-tokens-theming, design-engineering, theming-off-the-shelf, color-systems, spacing-layout, typography, visual-craft-standards
---

# Design System Audit

A UI rarely looks accidental because any one screen is bad. It looks accidental because the *values* drift: nineteen greys that should be four, a radius per component, a shadow authored inline every time someone needed a card. Each decision was locally reasonable; the sum is incoherent.

This is measurable. Do not argue about it — count it.

> The full audit is one call in the **SaglitzDesign MCP** (`npx saglitzdesign-mcp`): `audit_design_system(code)` returns a consistency score, the value counts per dimension, the near-duplicate colors with the survivor named, off-grid spacing, and token adoption. Then `create_design_system`, `generate_color_system`, `generate_type_scale`, `generate_elevation_system` and `generate_layout_system` produce the target scales, and `design_lint` catches regressions.

## Method

1. **Concatenate the real styles.** Every stylesheet, theme file, and component with inline styles. Audit the whole surface at once — drift only shows up across files.
2. **Count distinct values per dimension**, then compare against a budget:

| Dimension | Healthy budget | Why |
|---|---|---|
| Colors | ≤ 14 | One brand ramp + one neutral ramp + semantic roles. Everything else is derived. |
| Font sizes | ≤ 9 | A modular scale has ~8–9 steps. More means sizes were chosen per component. |
| Border radii | ≤ 4 | Small, medium, large, pill. Mixed radii are the most common reason a UI reads as accidental. |
| Shadows | ≤ 6 | Elevation is a ramp of named levels, not a shadow per component. |
| Spacing values | ≤ 12 | One 4/8pt scale. |

3. **Collapse near-duplicates.** Two colors closer than roughly ΔRGB 12 are the same color to every human being who will ever use the product. Keep the most-used one; replace the rest. This single step usually removes a third of a sprawling palette.
4. **Snap the off-grid values.** Anything that isn't a multiple of 4px breaks vertical rhythm. It is felt even when it isn't noticed.
5. **Measure token adoption.** Count `var(--…)` references against raw literals. 0% adoption with a "design system" in the repo means the system exists as documentation, not as code.
6. **Migrate, then lock.** Generate the target scales, replace literals with tokens, and add a lint rule so the next hardcoded hex fails review instead of quietly landing.

## What the numbers mean

- **85–100** — systematic. This reads as one product.
- **65–84** — mostly systematic, a dimension or two drifted. Cheap to fix.
- **40–64** — drifting. Values are being chosen per component rather than picked from a scale.
- **< 40** — ad-hoc. There is no enforced system; every screen re-decides the basics.

## Anti-patterns

- **Restyling components one at a time.** If the audit shows sprawl, fixing the system is a bigger visual win than fixing twenty components — and it holds.
- **A token file nobody references.** Tokens that exist but aren't used score the same as no tokens. Adoption is the metric, not authorship.
- **Adding a second system.** If a design system already exists, build inside it. Two systems is strictly worse than one bad one.
- **Treating budgets as laws.** A large multi-brand product legitimately exceeds them. The budget is a prompt to justify, not a rule to obey.
- **`!important` and magic z-index.** Both are specificity workarounds. Define a named layer scale (dropdown / sticky / modal / toast) instead of reaching for 9999.
- **Auditing a design file instead of the code.** The code is what ships. Audit that.

## Checklist

- [ ] Every stylesheet and themed component included in the audit input.
- [ ] Each dimension inside its budget, or a written reason it isn't.
- [ ] Zero near-duplicate colors; each collapsed onto a named survivor.
- [ ] Zero off-grid spacing values.
- [ ] Token adoption measured, and rising after the migration.
- [ ] One font family for UI (plus mono for code); not three.
- [ ] Re-audited after the migration to prove the delta, not assert it.
