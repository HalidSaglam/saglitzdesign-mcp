---
id: branding-identity
title: "Branding & Identity — Strategy to Logo System"
category: marketing
platform: both
tags: [branding, logo, identity, brand-voice, naming]
sources: ["The Brand Gap (Marty Neumeier)", "Zag (Marty Neumeier)", "A Designer's Art (Paul Rand)", "How Brands Grow (Byron Sharp)", "Designing Brand Identity (Alina Wheeler)", "https://developer.apple.com/design/human-interface-guidelines/app-icons", "https://developer.android.com/distribute/google-play/resources/icon-design-specifications"]
updated: 2026-07-08
---

# Branding & Identity — Strategy to Logo System

## Strategy Before Style (Neumeier)

- **A brand is not a logo.** A brand is a person's gut feeling about a product, company, or service. You don't own the brand — customers do. Design only shapes the inputs to that feeling.
- **Do strategy first, always.** Never start sketching logos until you can answer: Who is this for? What do they get? Why should they believe it? Who else offers it?
- **Write the onlyness statement (Zag) before any visual work:**
  > "Our [offering] is THE ONLY [category] that [key differentiator] for [audience] in [market/geography] in an era of [underlying trend]."
  If you can't fill in "THE ONLY," the differentiator is too weak — narrow the category or sharpen the difference until it's true.
- **Radical differentiation beats incremental improvement.** When everybody zigs, zag. If competitors are all blue and corporate, that is permission — not a mandate — to be warm and human. Differentiate on strategy first; visuals express the zag, they don't create it.
- **Three questions test every brand decision:** Is it different? Is it relevant? Is it credible? All three must be yes.

## Logo Design Principles (Paul Rand)

- **Simplicity wins.** A logo's job is identification, not explanation. It does not need to show what the company does (Apple sells no fruit; Shell sells no shells).
- **Rand's test order:** Is it distinctive? Is it memorable? Is it appropriate? Appropriateness means fitting the brand's character — not literal depiction of the product.
- **Avoid literalism.** A camera icon for a photography studio is a category label, not a brand. Prefer abstract or lateral marks that acquire meaning through use.
- **The 16px-to-billboard test (mandatory):** Render the mark at 16×16 px (favicon) and imagine it 10 m wide. It must be recognizable at both. If detail disappears at 16px, remove the detail from the design — do not create a "simplified version" as an afterthought; simplify the master.
- **Design in black first.** If a mark doesn't work in one flat color, color is doing the work the form should do. Color is applied after the form is proven.
- **A logo derives meaning from the quality of the thing it symbolizes, not the other way around.** Don't over-invest in symbolism narratives; invest in distinctiveness and craft.

## Logo System Deliverables (Minimum Viable Identity)

Every identity handoff must include:

1. **Primary lockup** — wordmark + mark in fixed relationship.
2. **Standalone wordmark** — for contexts where the mark adds noise.
3. **Standalone mark/symbol** — for avatars, favicons, app icons.
4. **Horizontal and stacked lockups** — wide headers vs. square placements.
5. **Clear space rule** — defined by an element of the logo itself (e.g., "clear space = height of the letter X on all sides"), never in absolute pixels.
6. **Minimum sizes** — specify separately for print (mm) and screen (px). Typical: wordmark min 80–100 px wide on screen; standalone mark min 16 px.
7. **One-color (mono) version** — solid black and solid white, no gradients or transparency. Required for engraving, embroidery, stamps, single-color print.
8. **Reversed (knockout) version** — tested on the brand's darkest color, on photography, and on black.
9. **File package** — SVG (master), PDF (print), PNG at 1x/2x/4x with transparency, and .ico/favicon set.

**Rule:** if any of these versions requires redrawing shapes (not just recoloring), the master logo is over-detailed — fix the master.

## Logo → App Icon Translation

An app icon is not a logo dropped in a square. Rules:

- **Use the standalone mark, never the full wordmark.** Text is illegible at icon sizes; a name under an icon is already provided by the OS.
- **Fill the canvas.** Logos are designed with breathing room; icons should use ~70–80% of the tile. Scale the mark up beyond what feels comfortable in the guidelines doc.
- **iOS:** design at 1024×1024 px, square; the system applies the superellipse mask — never pre-round corners or add your own drop shadow. Since iOS 18+, provide light, dark, and tinted variants (dark = mark on dark/transparent background; tinted = grayscale mark the system tints). Liquid Glass era (iOS 26+): prefer layered, flat vector shapes via Icon Composer so the system can apply material effects.
- **Android:** adaptive icons = 108×108 dp canvas with foreground and background layers; only the inner 66 dp is guaranteed visible (masks vary: circle, squircle, rounded square). Keep the mark inside the 66 dp safe zone. Play Store listing icon: 512×512 px, no transparency.
- **Monochrome/themed variant (Android 13+):** supply a single-color foreground layer for themed icons.
- **Test the icon on a real home screen next to the top-10 apps.** If it disappears among them, increase contrast or simplify.

## Color & Typography as Brand Assets (Byron Sharp)

- **Distinctive assets > differentiated messaging.** Sharp's evidence: brands grow through mental and physical availability. Visual assets (color, shape, type, character, sound) work by making the brand instantly recognizable, not by communicating positioning.
- **Pick ONE ownable color and use it with extreme consistency.** Category examples: Tiffany blue, Cadbury purple, McDonald's red-yellow. A palette of six equal colors builds nothing; a hierarchy of one dominant + supporting neutrals builds an asset.
- **Asset criteria: fame and uniqueness.** Before committing, ask: (1) Will heavy repetition make this famous among buyers? (2) Is it unique in the category (not the world)? A blue fintech logo fails uniqueness; audit the top 10 competitors' colors before choosing.
- **Typography:** choose one distinctive display face (headlines, logo-adjacent) + one workhorse text face. The display face carries brand recognition; the text face carries usability. License for web + app + print from day one.
- **Never redesign distinctive assets for freshness.** Every change spends accumulated memory. Evolve assets only when they actively fail (illegibility, technical constraints), and keep the recognizable skeleton.

## Brand Voice Definition

Deliver voice as three artifacts:

1. **3–4 voice attributes**, each with a boundary: "Confident, but never arrogant." "Playful, but never silly." "Plain-spoken, but never blunt." The "but never" clause is what makes an attribute usable.
2. **Tone spectrum** — voice is constant, tone flexes by context. Map contexts on a spectrum: marketing page (most expressive) → onboarding → transactional email → error message → legal/security incident (most neutral). Rule: the higher the user's stress, the flatter the tone.
3. **Do/don't pairs** (minimum 5) — real sentences, not adjectives:
   - Don't: "Oops! Something went wrong 🙈" → Do: "We couldn't save your changes. Retry, or copy your text first."
   - Don't: "Leverage our best-in-class solution" → Do: "Ship your first campaign in 10 minutes."

## Naming Basics

- **Name types, in rough order of ownability:** invented (Kodak, Zerply) > altered real word (Netflix, Lyft) > metaphor (Amazon, Slack) > descriptive (General Motors) > acronym (worst: zero meaning, zero memorability).
- **Screening checklist (all required):** ≤3 syllables preferred; easy to spell after hearing it once ("radio test"); no negative meaning in major target-market languages; trademark class search done; domain or acceptable modifier available (get-, use-, .app, .io); social handles available or close; doesn't box in future scope ("BostonPizza problem").
- **Descriptive names trade memorability for explanation — acceptable only for features and sub-products, not the master brand.**
- Sub-brand rule: default to branded house ("Brand + descriptor": Google Maps, Stripe Atlas) unless the sub-offering targets a conflicting audience or risk profile — only then use a separate name.

## Brand Guidelines Document Structure

Order the document by decision frequency, not ceremony:

1. Brand strategy on one page (onlyness statement, audience, attributes)
2. Logo system (versions, clear space, min sizes, misuse examples)
3. Color (values in HEX/RGB/CMYK/Pantone, usage ratios, accessibility pairings with contrast ratios)
4. Typography (faces, weights, scale, fallback stacks)
5. Voice & tone (attributes, spectrum, do/don't)
6. Imagery & illustration style (with good/bad examples)
7. Applications (social templates, deck, email signature, merch)
8. Asset links (single source-of-truth folder, versioned)

- **Misuse examples are the most-used page.** Show ≥6 forbidden treatments: stretched, recolored, outlined, drop-shadowed, on busy photo, rotated.
- Keep it live (web page or Figma), not a PDF that forks into stale copies.

## Brand Architecture (choosing the model)

- **Branded house** (one master brand: Google, FedEx): default choice. Cheapest to build, every product deposit compounds into one brand. Use unless there's a hard conflict.
- **House of brands** (P&G model, separate brands): only when audiences, price tiers, or risk profiles genuinely conflict (a luxury line and a discount line; a consumer app and an enterprise platform sold against each other).
- **Endorsed** ("X by Brand"): transitional or trust-lending model — good for acquisitions keeping equity, or new categories that need the parent's credibility.
- Decision rule: every new brand you create multiplies marketing cost and divides memory. Require written proof of audience conflict before approving a second brand.

## Color Pairing & Accessibility Rules

- Ship the palette WITH pre-approved text/background pairings and their contrast ratios; don't make every designer re-derive them.
- Body text pairings must hit **4.5:1** contrast (WCAG AA); large text and UI icons **3:1**. Test the brand color as a button background with white AND dark text — pick one and standardize.
- Define usage ratio explicitly (e.g., **60% neutral / 30% secondary / 10% brand accent**). The brand color stays scarce so it stays distinctive.
- Provide dark-mode equivalents for every brand color at spec time (usually desaturated + lightened accents, near-black surfaces) — retrofitting dark mode breaks palettes.
- Never encode meaning in brand color alone (success/error need their own semantic colors, distinct from the brand accent).

## Rebrand vs. Refresh Decision Rules

**Refresh** (evolve logo/type/color, keep name and recognizable assets) when:
- Assets fail technically (won't scale, illegible on screens, dated rendering effects like bevels/gloss)
- Visual system is inconsistent but the brand has positive recognition
- Audience or product expanded but perception is neutral-to-positive

**Rebrand** (new name and/or fundamentally new identity) only when:
- Legal/trademark conflict forces it
- Merger/acquisition changes the entity
- The name blocks growth (wrong geography, category, or connotation)
- The brand carries strong negative equity that no messaging can fix

**Never rebrand because:** leadership is bored, a new CMO arrived, competitors refreshed, or "it feels dated" without user evidence. Test first: if unaided recognition of current assets is high, a rebrand destroys paid-for memory (Sharp). Budget rule: a rebrand costs 5–10× the design fee in rollout (signage, packaging, ads re-teaching the market) — price that before deciding.

## Logo Evaluation Checklist (score a candidate before presenting)

Run every candidate mark through all ten; any "no" sends it back:

1. Recognizable at 16×16 px favicon?
2. Works in solid black, one color, no gradients?
3. Works reversed (white) on the darkest brand color and on photography?
4. Distinct from the top 10 competitors' marks at a glance (do the lineup test)?
5. Describable in one sentence over the phone? ("A lowercase g whose tail forms an arrow")
6. No trend-locked styling (current gradient fads, glass effects, AI-swirl geometry)?
7. Legible/appropriate across all target cultures and scripts?
8. Free of accidental shapes (rotate it, mirror it, squint at it — offensive or unfortunate silhouettes)?
9. Survives cheap reproduction (embroidery, stamp, laser engraving, photocopier)?
10. Trademark screening in relevant classes passed?

## Anti-Patterns

- **Trend-chasing logos:** blanding into the same geometric sans wordmark as everyone else; adopting the gradient-of-the-year, glassmorphism, or AI-swirl marks. Trends guarantee your identity expires with the trend and looks like competitors' — the opposite of a brand's job.
- **Unscalable detail:** thin lines, tiny text, photographic textures, 4+ color gradients inside the mark. If it needs a "small-size version" with different shapes, the master failed the 16px test.
- **Logo-by-committee:** averaging feedback removes every distinctive edge. Present 2–3 strategically distinct directions, decided against the onlyness statement, not personal taste.
- **Meaning-stuffing:** cramming five symbolic references into one mark ("the negative space is a bird AND our founder's initials AND..."). Memorability comes from simple form, not layered symbolism.
- **Palette sprawl:** 8 "brand colors" of equal weight = no color asset. Enforce a dominance hierarchy (e.g., 60/30/10).
- **Guidelines without misuse examples** and **identities shipped without mono/reversed versions** — both guarantee brand erosion within a year.
- **Rebranding the assets that were working:** changing the one thing customers recognized (color, mascot, wordmark silhouette) while keeping everything customers ignored.
