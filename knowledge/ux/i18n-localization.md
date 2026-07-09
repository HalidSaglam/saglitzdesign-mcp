---
id: i18n-localization
title: "Internationalization & Localization — Global-Ready UI"
category: ux
platform: both
tags: [i18n, l10n, rtl, localization, text-expansion, global]
sources: ["https://web.dev/learn/design/internationalization", "https://simplelocalize.io/blog/posts/rtl-design-guide-developers/", "https://simplelocalize.io/blog/posts/what-is-icu/", "https://opensource.googleblog.com/2011/06/pseudolocalization-to-catch-i18n-errors.html"]
updated: 2026-07-09
---

# Internationalization & Localization — Global-Ready UI

Internationalization (i18n) is designing and building a product so it *can* adapt to any language and region without re-engineering. Localization (l10n) is the act of adapting it to a specific locale. Do the i18n work up front — retrofitting a monolingual product is expensive and error-prone. If English is the only language you have ever designed for, your layouts, strings, and formats are quietly full of assumptions. Surface them before a single translation lands.

## Design for text expansion (and contraction)

Translated text is rarely the same length as the source. Design elastic layouts from the start.

- **Budget for growth.** From English, German runs roughly +35% longer (often 30–50%); Finnish, Russian, and Polish also produce long strings; French and Spanish add ~15–25%. Short UI strings expand the most in relative terms — a 5-character English word can triple.
- **Never fix widths to fit the English string.** Buttons, tabs, labels, chips, and nav items must grow with their content. Avoid fixed-width buttons and single-line assumptions; let containers wrap or expand.
- **Leave headroom.** Reserve extra horizontal and vertical space; test with strings ~40% longer than English. If a component only works at one length, it is broken.
- **No text baked into images.** Text inside raster images cannot be translated and won't expand. Keep copy in real, styled text over/beside images; localize any unavoidable image text as a separate asset.
- **Beware truncation and ellipses.** Truncating localized text often cuts the meaning; prefer wrapping. If you must truncate, make the full value reachable.
- **Contraction happens too.** CJK translations can be much shorter — layouts tuned only for long strings can look empty. Test both extremes.

## Right-to-left (RTL) languages

Arabic, Hebrew, Persian, and Urdu read right-to-left. Supporting them is a layout mirror, not a font swap.

- **Set direction at the root.** Put `dir="rtl"` (and the correct `lang`) on the `<html>` element so the whole document flips. Let the platform's bidi algorithm handle mixed-direction runs (e.g. an English brand name inside Arabic text).
- **Mirror the layout.** Navigation, sidebars, back/forward flow, and reading order flip horizontally. What was on the left goes right.
- **Mirror directional icons.** Arrows, chevrons, back/next, undo/redo, and progress indicators must point the other way. Do NOT mirror icons whose direction is meaningful or universal — clocks, checkmarks, most logos, and media play buttons generally stay as-is.
- **Progress and timelines** run right-to-left; steppers, sliders, and progress bars fill from the right.
- **Use CSS logical properties instead of physical ones.** Replace `margin-left`/`right`, `padding-left`/`right`, `left`/`right`, and `text-align: left` with `margin-inline-start`/`-end`, `padding-inline-start`/`-end`, `inset-inline-start`/`-end`, and `text-align: start`. Logical properties resolve against the document's direction, so one stylesheet serves LTR and RTL with no override rules. This is the single highest-leverage habit for bidi support — adopt it as the default even in LTR-only products.

## Locale-aware formatting

The same data renders differently per locale. Never hardcode formats; delegate to the platform's locale APIs (e.g. `Intl` on the web, ICU-backed formatters elsewhere).

- **Dates & times.** Order (MM/DD/YYYY vs DD/MM/YYYY vs YYYY/MM/DD), separators, month names, 12- vs 24-hour clocks, first day of week, and calendar systems all vary. Store timestamps in UTC; format at display time for the user's locale and time zone.
- **Numbers.** Decimal and grouping separators swap (1,234.56 vs 1.234,56 vs 1 234,56). Some locales group differently (e.g. Indian lakh/crore). Always format numbers through the locale API.
- **Currency.** Symbol, symbol position, decimal places, and code differ. Show the currency explicitly for cross-border clarity; never assume "$" means USD.
- **Addresses.** Field order, presence of states/postal codes, and postal-code formats vary widely. Don't force a US address shape on the world; keep address forms flexible.
- **Name order.** Given-name-first is not universal (many East Asian locales put family name first). Prefer a single full-name field over rigid first/last inputs where possible, and never assume name structure.
- **Phone numbers.** Vary in length, grouping, and country code. Validate loosely and store in a canonical international format.

## Pluralization and ICU message format

Plural rules are not universal — languages have anywhere from one to six plural categories (English has 2: one/other; Arabic has 6; Chinese has 1). "1 item" / "{n} items" logic breaks everywhere else.

- **Use ICU MessageFormat** (the Unicode standard behind React Intl, Angular, FormatJS, and most modern libraries). It expresses all plural forms, select cases, and gender agreement inside a single message string, so translators control the grammar.
- Example shape: `{count, plural, one {# item} other {# items}}` — the library picks the correct category per locale, including forms English doesn't have (zero, two, few, many).
- **Never build sentences by concatenating fragments** to fake plurals or inject numbers; word order and agreement differ per language. Let ICU own the whole message.
- **Select/gender.** Use ICU `select` for gendered or category-dependent wording rather than branching in code.

## Fonts and script support

Type must actually render every language you ship.

- **Cover the scripts.** Verify your font families include glyphs for CJK, Cyrillic, Greek, Arabic, Hebrew, Thai, Devanagari, and any diacritics you need. Missing glyphs surface as tofu (□) boxes.
- **Subset per script.** Full CJK fonts are megabytes; load per-script subsets and only the scripts a given page needs to protect performance (see [[typography]]).
- **Line breaking differs.** CJK wraps between characters, not at spaces; Thai has no word spaces at all. Rely on the browser/OS line-breaking rules; don't impose Latin word-break assumptions.
- **Vertical rhythm shifts.** Scripts like Thai, Devanagari, and Arabic need more line height for stacked marks and ascenders/descenders — don't clamp line-height to a Latin-tuned value.
- **Variable fonts** can help, but subset them per script too; a variable font still needs the right glyph coverage.

## Cultural considerations

Translation is necessary but not sufficient — meaning is cultural.

- **Color meaning varies.** Red signals danger/loss in the West but luck/prosperity in parts of Asia; white connotes purity in some cultures and mourning in others. Don't rely on a single color to carry meaning universally; pair with text or icons.
- **Imagery and gestures.** Photos of people, hand gestures (thumbs-up, OK sign), and symbols can be neutral in one culture and offensive in another. Vet visuals per market.
- **Icons that don't translate.** Mailboxes, trash cans, home shapes, and currency symbols are culturally specific. Prefer widely understood icons, and label ambiguous ones with text. See [[accessibility]] — icon-plus-text also helps everyone.

## Translation-ready design

Set translators up to succeed; the design decisions determine translation quality.

- **Externalize every user-visible string.** No hardcoded UI text in code or templates — keep strings in resource files keyed by ID. Hardcoded text can't be translated and won't be caught until it ships in the wrong language.
- **Never concatenate strings.** Assembling sentences from pieces (`"You have " + n + " messages"`) breaks in languages with different word order, gender, and pluralization. Use complete, parameterized ICU messages instead.
- **Give translators context.** Provide a description/comment per string (where it appears, what it means, character limits, whether a variable is a name vs. a number). Without context, translators guess and get gender, tone, and ambiguous words wrong.
- **Don't reuse one string in two places** just because the English happens to match; the translation may need to differ. Key by meaning and location.

## Testing: pseudolocalization

Test i18n readiness *before* real translations exist.

- **Pseudolocalization** replaces source strings with accented, elongated variants wrapped in brackets — e.g. `[Ĥéļļöö wörld ~~~]`. It catches, in one pass: hardcoded strings (they stay plain English and stand out), layout breakage from expansion (the padding makes strings ~40% longer), truncation and clipping, and missing glyph coverage.
- Run a pseudolocale in CI or a dev build so regressions surface continuously, not at launch.
- **Also test a real RTL locale** end-to-end (Arabic or Hebrew) to catch mirroring and bidi bugs that pseudolocalization won't reveal.
- Verify locale formatting with real edge-case data: long German compounds, Indian number grouping, Japanese name order, 24-hour clocks.

## Cross-links

- [[typography]] — script coverage, font subsetting, and line-height across writing systems.
- [[accessibility]] — `lang`/`dir` attributes, icon-plus-text labeling, and inclusive language support.
