---
id: email-html-development
title: "HTML Email Development — Building Emails That Render Everywhere"
category: marketing
platform: web
tags: [email, html-email, outlook, dark-mode, responsive, mjml, deliverability]
sources: ["https://www.litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design", "https://www.campaignmonitor.com/css/", "https://mjml.io/documentation/", "https://www.sinch.com/blog/mailgun-email-on-acid/", "https://www.caniemail.com/", "https://web.dev/articles/prefers-color-scheme", "https://css-tricks.com/new-guide-css-support-email/", "https://www.emailonacid.com/blog/article/email-development/emailology-vector-markup-language-and-backgrounds/"]
updated: 2026-07-23
---

# HTML Email Development — Building Emails That Render Everywhere

This is the coding counterpart to [[email-marketing]] (which covers lifecycle flows, copy, and deliverability). This doc is about the HTML itself: how to build a single template that survives dozens of inconsistent, often ancient rendering engines. Treat "modern web dev" instincts as liabilities here — an email is not a web page, and the client you can't test is the one that breaks.

## Why Email HTML Is Its Own Discipline

- **There is no baseline.** Web CSS assumes an evergreen browser. Email has ~40 meaningful clients (Gmail web/app, Apple Mail, Outlook desktop/mobile/web, Yahoo, webmail worldwide), each with a different, partly frozen CSS subset. Some render like it's 1999.
- **You cannot rely on the cascade.** External stylesheets are stripped, `<style>` blocks are conditionally supported, `<head>` is sometimes discarded, and class-based media queries are ignored by whole categories of clients.
- **No JavaScript, ever.** It's stripped for security. No `fetch`, no interactivity beyond a narrow AMP/checkbox-hack fringe (see [[email-marketing]] on progressive enhancement).
- **Design for the floor, enhance toward the ceiling.** Everything critical must work in the least capable client; nicer rendering is a bonus, never a dependency.
- **Verify support before you use a property.** Check [caniemail.com](https://www.caniemail.com/) and the [Campaign Monitor CSS support guide](https://www.campaignmonitor.com/css/) the way web devs check caniuse — assume nothing.

## Table-Based Layout Is Still the Skeleton

Flexbox and grid fail in Outlook's Word engine and degrade unpredictably elsewhere. Structure with tables.

- **Nest `<table>` for layout, not a single grid.** Outer table centers the email; inner tables build rows and columns. Keep nesting shallow — deep nesting is slow to render and hard to debug.
- **Always set `role="presentation"`** on layout tables so screen readers skip them (see [[accessibility]]). Also set `cellpadding="0" cellspacing="0" border="0"`.
- **Control spacing with cell `padding`, not margins on divs.** Margins are unreliable across clients; padding on `<td>` is broadly safe.
- **The hybrid/spongy (fluid) approach is the modern default.** Combine percentage-width tables (`width="100%"` capped by `max-width` for standards clients) with MSO conditional ghost tables giving Outlook a fixed pixel width. Use `align="left"` + `inline-block` "spongy" columns that reflow to full width on narrow screens *without* media queries — this is what survives clients that ignore `@media`.
- **Set explicit widths on cells and images** so the Word engine doesn't guess.

## Inline CSS and the Safe Subset

- **Inline every style that matters.** Gmail (and some webmail/forwarding contexts) strips or ignores `<style>` blocks, so anything in `<head>` may vanish. Inline `style` attributes always survive.
- **Keep `<style>` in `<head>` only for what can't be inlined:** media queries, `:hover`, `@font-face`, and dark-mode overrides. Treat these as pure progressive enhancement.
- **Use a CSS inliner as a build step** — MJML, Juice, Premailer, or your ESP's built-in inliner — so you author readably and ship inlined.
- **Stay inside the safe property subset:** `color`, `background-color`, `font-family/size/weight`, `line-height`, `text-align`, `padding` (on cells), `border`, `width/height`. Treat `border-radius`, `box-shadow`, `background-image`, `position`, `transform`, and shorthand `background` as cosmetic — provide a plain fallback.
- **Use HTML attributes as a belt-and-suspenders backup** for the Word engine: `bgcolor`, `width`, `height`, `align`, `valign` on tables/cells still work when CSS doesn't.

## The Outlook Problem

Classic Outlook (desktop 2016–2021 and older) renders with **Microsoft Word's HTML engine**. "New" Outlook and Outlook.com are Chromium/webmail and behave differently — you must satisfy both.

- **VML for backgrounds and buttons.** Word ignores CSS `background-image` on cells; use Vector Markup Language (`<v:rect>`, `<v:fill>`) inside MSO conditionals to paint background images and bulletproof buttons in Outlook.
- **MSO conditional comments** target only Word-engine Outlook: `<!--[if mso]> … <![endif]-->` for Outlook-only code, `<!--[if !mso]><!-- … <!--<![endif]-->` for everything-but-Outlook.
- **Ghost tables** give Outlook a fixed layout your fluid divs can't: wrap the responsive column structure in `<!--[if mso]><table>…<td width="300">` so Word sees rigid pixel columns while modern clients get the spongy version.
- **Word-engine quirks:** set `mso-line-height-rule: exactly` (Word inflates line-height otherwise); `border-radius` is ignored (buttons render square — design for that); `max-width` on divs is ignored; animated GIFs show only frame 1 (put the message there); add `mso-table-lspace:0; mso-table-rspace:0` to kill phantom table gaps; use `mso-padding-alt` when cell padding misbehaves.

## Responsive Email

- **Mobile-first, single column is the safest structure.** ~50%+ of opens are mobile; a single column needs no reflow logic and can't break.
- **Fluid/hybrid before media queries.** Some clients (notably older Gmail app configurations and various webmail) ignore or strip `@media`. Build a layout that already works fluidly, then use media queries only to *improve* it — never to make it functional.
- **Media queries live in `<head>` `<style>`** and target `max-width` (commonly ~600px). Assume a meaningful share of recipients never receives them.
- **Keep the body ~600px wide.** It's the durable convention: fits Outlook's reading pane and desktop preview without horizontal scroll, scales down cleanly.
- **Stack columns, grow tap targets, bump type on mobile:** min 16px body text, buttons ≥44×44px, generous cell padding.

## Dark Mode

Clients handle dark mode three ways: leave alone, partial inversion (light backgrounds only), or full/forced inversion (many Gmail and Outlook app configurations flip your colors whether you want it or not).

- **Opt in with meta + color-scheme:** `<meta name="color-scheme" content="light dark">` and `<meta name="supported-color-schemes" content="light dark">`, plus `:root { color-scheme: light dark; }`.
- **`@media (prefers-color-scheme: dark)`** is honored fully by Apple Mail and partially elsewhere (see [web.dev](https://web.dev/articles/prefers-color-scheme)) — use it to supply intentional dark styles, but never assume it runs.
- **Bulletproof for forced inversion.** Design so the *inverted* result is acceptable, since you can't stop it. Avoid pure `#000`/`#fff` (near-neutrals like `#1a1a1a`/`#f5f5f7` invert more gracefully).
- **Logos and icons: transparent PNGs with a light stroke or padded transparent margin** so a dark logo survives on a dark background. Never bake a white rectangle behind a logo — it becomes an ugly block when everything else inverts.
- **Avoid text baked into background images** — inversion can render it illegible and you can't override it.

## Bulletproof Components

- **Bulletproof buttons render without images.** Build the CTA as a styled table cell or padded `<a>` with `background-color` + HTML text — never an image. For Outlook rounded corners, add a VML `<v:roundrect>` fallback inside an MSO conditional (see [Litmus's bulletproof buttons guide](https://www.litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design)). Label with an action verb, ≥44px tall.
- **Web fonts are opt-in luxury.** They render only in Apple Mail and a few webmail clients. Declare `@font-face` in `<head>`, wrap in `@media`/MSO guards so Outlook doesn't choke, and **always provide a full system stack** (`'Brand', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`). The fallback is what most people see — make it look deliberate.
- **Design images-off.** Images are blocked or delayed by many clients and privacy proxies. Every critical message (headline, offer, CTA) must be live HTML text. Set `bgcolor` on image cells and meaningful `alt` on every image so a blocked image still communicates; use `alt=""` for decorative ones.

## Accessibility

- **Real text over image-text.** It's readable with images off, resizable, translatable, and screen-reader-accessible. (More in [[accessibility]].)
- **Semantic structure where clients allow:** real `<h1>–<h3>` and `<p>` (styled inline), not `<td>` text soup. `role="presentation"` on all layout tables.
- **Set `lang` on the root**, `dir="rtl"` when appropriate, and a descriptive, unique document `<title>`.
- **Contrast:** ≥4.5:1 body, ≥3:1 large text — verify in both light *and* dark renderings. Never signal meaning by color alone; underline body links.
- **Left-align body copy**, `line-height` ≥1.4, and honor reduced motion (no strobing GIFs).

## Size, Width, and the Preheader

- **Keep raw HTML under ~102KB** — Gmail clips past that ("[Message clipped]"), which can hide your footer/unsubscribe and hurt engagement. Aim under 100KB; strip comments/whitespace on build.
- **~600px content width**, images exported at 2× and constrained with the `width` attribute for retina.
- **Preheader = the hidden preview text** after the subject in the inbox. Put an intentional line in a hidden `<div>` (`display:none; max-height:0; overflow:hidden`) at the top of `<body>`, then pad with `&zwnj;&nbsp;` to stop the client pulling in body copy. Never let "View in browser" become the preheader.

## Testing

- **Render-test on real clients before every major template.** [Litmus](https://www.litmus.com/) and [Email on Acid / Sinch](https://www.sinch.com/blog/mailgun-email-on-acid/) screenshot your email across dozens of client/OS/dark-mode combinations at once.
- **Nothing replaces sending to real seed accounts** — a real Gmail app, a real Outlook desktop, a real iPhone. Read it on a phone before sending.
- **Re-QA quarterly.** Clients update their engines; a template that passed six months ago can drift. Test light and dark, images-on and images-off.

## MJML and Frameworks

- **MJML is the recommended modern authoring layer.** You write semantic components (`<mj-section>`, `<mj-column>`, `<mj-button>`) and it compiles to hybrid, Outlook-safe, responsive HTML with ghost tables and inlining handled for you — see the [MJML docs](https://mjml.io/documentation/). This removes most hand-written table and MSO boilerplate.
- **Alternatives:** Maizzle (Tailwind-based, utility-first with a build pipeline), Foundation for Emails (Inky), or your ESP's block editor. All aim to hide the 1999-era plumbing.
- **Frameworks are a productivity multiplier, not a testing substitute.** They generate better HTML than most people write by hand, but you still render-test the output — and still drop to raw VML/MSO for edge cases the framework doesn't cover. This authoring discipline mirrors treating email as a real engineering target ([[design-engineering]]); design the creative for it the same way you would any campaign asset ([[ad-creative]]).

## Checklist

1. Structure is nested `<table>` with `role="presentation"`, `cellpadding/spacing/border="0"`; spacing via cell padding.
2. Layout is hybrid/fluid; content width ~600px with `max-width` + MSO ghost tables for Outlook.
3. All meaningful CSS is inlined (inliner in the build); `<head>` `<style>` holds only media queries, `@font-face`, `:hover`, dark-mode.
4. Every property used is confirmed on caniemail / Campaign Monitor; unsupported ones have a plain fallback.
5. Outlook handled: MSO conditionals, VML for buttons/backgrounds, `mso-line-height-rule: exactly`, explicit cell widths, GIF message in frame 1.
6. Dark mode: color-scheme meta + `prefers-color-scheme` styles; near-neutral colors; transparent-PNG logos survive forced inversion.
7. Buttons are bulletproof (VML + styled `<a>`/cell, HTML text, ≥44px), not images.
8. Web fonts have a full system-stack fallback that looks intentional.
9. Images-off works: `bgcolor` on image cells, meaningful `alt` on all images, `alt=""` on decorative.
10. Accessibility: real text over image-text, semantic headings, `lang`, contrast ≥4.5:1 checked in light and dark.
11. Raw HTML < ~102KB (Gmail clipping); images at 2× constrained by `width`.
12. Intentional hidden preheader with `&zwnj;&nbsp;` padding.
13. Render-tested (Litmus/Email on Acid) + real seed sends, read on a phone, light and dark, images on/off.

## Anti-patterns

- Using flexbox, grid, `float`, or `position` for layout — they collapse in Outlook's Word engine.
- Relying on `<style>` blocks or classes for critical styling instead of inlining — stripped by Gmail and forwarding contexts.
- Skipping MSO conditionals/VML and telling yourself "Outlook is dead" — B2B audiences still skew heavily to Outlook desktop.
- Image-only emails or image-baked headlines/CTAs — invisible with images off, inaccessible, and spam-filter bait.
- Designing only light mode; shipping a dark logo on a transparent background with a baked white box that turns into a block on inversion.
- Buttons as images (dead when images are blocked) instead of bulletproof HTML/VML.
- Web fonts with no system fallback, so the fallback render looks broken to most recipients.
- Media queries as the *only* responsive mechanism — clients that ignore `@media` get a broken layout.
- Shipping without real-client testing because it "looked fine in the browser preview."
- Bloated HTML over ~102KB that Gmail clips, hiding the unsubscribe link.
