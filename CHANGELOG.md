# Changelog

All notable changes to SaglitzDesign MCP are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.25.0] — 2026-08-16

v0.24.0 sourced this server's six Apple documents to Apple's own pages, and
nothing here could read an Xcode project against them. A team could read every
word of `apple-accessibility` and `apple-shipping-readiness` and still ship a
custom colorset with no dark appearance, a deprecated `UIRequiresFullScreen`,
a microphone entitlement declared under one capability and not its twin, and a
`NavigationView` on every screen. This release adds the auditor that reads the
project instead of trusting the reader remembered the document.

### Added

- **`audit_apple_ui` — the 34th tool, and the seventh to return structured
  output.** Point it at the Xcode project directory. It reads the four
  surfaces a project declares configuration on — the information property
  list, `INFOPLIST_KEY_*` build settings in `project.pbxproj`, the
  entitlements plist, and each colorset's `Contents.json` — infers whether the
  target is iOS or macOS from those plus the Swift imports, and runs eight
  rules over the text of the files it opened.
  - **Configuration, four rules.** A custom colorset declaring no
    `luminosity: dark` appearance; the deprecated `UIRequiresFullScreen`,
    either spelling, with the misspelling called out as a key the system does
    not read; one of the two Audio Input entitlement identifiers without the
    other, which one Xcode checkbox label covering two different capabilities
    makes easy to half-declare; and, on macOS only, no App Sandbox entitlement
    — reported as a fact about the Mac App Store channel rather than as a
    defect, because the requirement quoted in that finding is scoped by Apple
    to that channel.
  - **Swift, four rules.** `NavigationView`, whose reference page carries
    `deprecatedAt: 27.0` on all seven of its platform rows and names
    `NavigationStack` and `NavigationSplitView` as the replacements;
    `.font(.system(size:))`, on an iOS verdict only, because that form has no
    text style behind it to scale against and, in the HIG's own words under
    Typography › Platform considerations › macOS, "macOS doesn't support
    Dynamic Type"; a colour written as numbers rather than resolved from a
    colorset; and a `Button` whose entire label is one `Image(systemName:)`,
    reported as a label to check with VoiceOver rather than as a label found
    missing.
  - **The platform verdict is a gate, and its silence is printed.**
    `fixed-font-size` runs on an iOS verdict and `sandbox-absent-macos` on a
    macOS one. When the signals are absent or point both ways the verdict is
    `not determined`, both rules stay quiet, and the report says so above the
    findings — `**Platform: not determined**. Signals seen: none. **Every
    platform-scoped rule stayed silent**, so their silence here is the gate
    rather than a result.` A run on a SwiftPM package with no configuration at
    all prints exactly that line and still reports its `NavigationView`, which
    is not platform-scoped.
  - **Directory only, and every other shape is an error result.** There is no
    snippet mode, because configuration is the backbone of this audit and a
    snippet carries none of it. A `code` argument, a missing `path`, a path
    with nothing at it, and a path that is a file each come back with
    `isError: true` and an explanation naming what to pass instead — never as
    an empty audit a caller could read as a clean bill. `code` is declared on
    the input schema for exactly this reason: every structured auditor here
    that accepts a snippet at all spells it `code`, so an agent that has
    learned the family will reach for it, and an undeclared key is stripped
    before the handler can explain itself. `audit_project`, which has no
    snippet mode either, leaves it undeclared and answers a `code` argument
    with `MCP error -32602: … Required at path` — a schema rejection that
    says nothing about why a snippet cannot work here.
  - **Structured output on the same contract the other six auditors speak**
    (v0.23.0): `findings` with rule, severity, message, fix and doc, a
    severity `summary`, a machine-readable `notVisible` array, and a required
    `scan` block. A Swift finding also carries `file` and a 1-based `line`; a
    configuration finding carries no `file` key at all and `line: 0`, because
    a key that is absent from a merged configuration map has no position — the
    markdown prints no line for those, and a consumer reading the wire should
    treat `0` as that same sentinel rather than as line one. `scan` declares
    the same six fields `audit_project` does, and is required for the same
    reason: no snippet mode, so every successful call scanned a directory.
- **Six fixture projects, and 200 tests in `tests/apple.test.ts`.** A clean
  iOS app and a clean macOS app that each report zero findings; an iOS app
  that draws six of the eight rules; a deliberately broken project that draws
  six too, trading that one's colour literal for the Audio Input mismatch; an
  iOS project with no `Info.plist`, where every configuration key arrives out
  of `INFOPLIST_KEY_*` build settings the way Xcode has written them since
  `GENERATE_INFOPLIST_FILE` became the default; and a SwiftPM package whose
  platform cannot be known, which is there to pin the silence rather than a
  finding.

### What this audit cannot see

This is the longest `notVisible` list this server ships — 24 entries, printed
in full under **Not visible to this audit** in every report and carried in
`structuredContent.notVisible`. Each one was written after running the tool on
a directory built to demonstrate it, and each demonstration is kept as a test.
The list is longer than the rule list, and a reader who learns that here will
not misread a clean report:

- **Nothing is measured, and nothing is rendered.** No contrast ratio is
  computed, no tap target sized, no simulator launched, no screenshot taken,
  no build run. `colorset-no-dark-variant` fires on a declaration and settles
  nothing about how that colour reads against anything;
  `hardcoded-color-literal` fires on the numbers without computing a ratio
  from them.
- **Three extensions and three configuration shapes are opened, and the rest
  of a project is outside what was read.** `.swift`, `.plist` and
  `.entitlements`, plus `Info.plist` and `project.pbxproj` matched by name and
  `*.colorset/Contents.json` matched by the end of its path. A screen laid out
  in a storyboard or XIB, a view controller written in Objective-C, a
  localised value in `InfoPlist.xcstrings` and a Swift file saved under
  another suffix were each present in a run here and each drew nothing. An
  asset-catalog member that is not a colorset — an imageset, an appiconset,
  the catalog's own root `Contents.json` — is not opened either.
- **A directory the walk never enters, and your own code with it if you keep
  it under one of those names.** `Pods`, `Carthage` and `DerivedData` are
  added for this audit, on top of the shared skip list every scanner here uses
  — `node_modules`, `vendor`, `build`, `out`, `dist`, `target`, `coverage` and
  more — and every directory whose name begins with a dot. It is a name test
  rather than a provenance test, and the skip is silent in both registers: a
  project whose own `Pods/MyOwnCode.swift` held a `NavigationView` came back
  with one file read and no findings, and one keeping hand-written source in
  `build/` came back with `filesRead: 2`, the `NavigationView` beside it
  reported and the one inside `build/` dropped with nothing in the report
  body marking it. Read the skip as coverage rather than as a clean bill on
  your dependencies — this audit says nothing about them at all — and check
  the path a finding carries, since a library checked in under `Vendor/` is
  read as first-party.
- **A plist value outside the small subset this reader covers.** `<string>`,
  `<true/>`, `<false/>` and an `<array>` of direct `<string>` children are
  read; a `<dict>`, `<integer>`, `<real>`, `<date>` or `<data>` value is
  walked past rather than guessed at. A `UIRequiresFullScreen` nested one
  dictionary down drew no finding in a run here. A binary plist is reported as
  not parsed rather than as empty: a binary `Info.plist` beside a Swift file
  took the platform verdict to `not determined` and every platform-scoped rule
  with it.
- **Everything in a `project.pbxproj` other than `INFOPLIST_KEY_*`.** That
  prefix is what is read out of the file; the rest of the build configuration
  is not parsed. `ENABLE_HARDENED_RUNTIME` is one of the settings outside it,
  which is why no rule here reports on the Hardened Runtime in either
  direction.
- **Which target declared a key, or an entitlement.** Keys from every plist
  and every `project.pbxproj` in the tree are merged into one map, and the
  entitlement identifiers from every `.entitlements` file into one set, because
  none of the four surfaces read here carries a target. A key declared by a
  share extension alone was reported as a fact about "this project's
  configuration"; a sandboxed app beside a hardened helper — each file correct
  alone — drew `microphone-entitlement-mismatch` over a pair that appears in
  neither, and the app's `com.apple.security.app-sandbox` kept
  `sandbox-absent-macos` off the helper. The surfaces line names every file
  that went into both.
- **The written forms the Swift rules do not match.** Each rule is a presence
  test over one shape: `.system(size:)` is matched and
  `UIFont.systemFont(ofSize:)` is not; `Color(red:green:blue:)` is matched and
  a project's own `Color(hex:)` is not; `Image(systemName: "bell")` is matched
  and `Image(systemName: symbol)` is not. One iOS file carrying five such
  lines — those three, plus `Font.custom("Inter", fixedSize: 17)` and a
  `Button` whose label closure is a bare identifier — drew zero findings here,
  so a clean result on a UIKit target, or on a codebase with its own colour
  and symbol helpers, is coverage rather than restraint.
- **A Swift file whose comment masking went wrong, which reads exactly like a
  file with nothing to find.** `maskComments` tracks quotes per character
  rather than tokenizing, so a `/*` or `//` inside an interpolated string can
  be exposed as live code and a well-formed comment further down then blanks
  the real code in between. A file whose second line was
  `let label = "a\(f("open /*")) still"` and whose fifth line held a live
  `NavigationView` produced no findings, and the file counted as read in every
  register — there is no signal for this anywhere in the output. A rule going
  quiet on a file with an interpolated string like that may be meeting this
  gap rather than finding nothing; it is pinned as a known, unfixed gap in
  `tests/scan.test.ts`.
- **Whether a Swift file is missing something.** No rule here claims an
  absence in Swift source, because a modifier on a parent covers its children
  and the code satisfying a requirement may live in another file.
  `symbol-as-only-button-label` fired on a `Button` whose enclosing `VStack`
  carried an `.accessibilityLabel`, which is why its own text calls it a risk
  to check rather than a fault found.
- **Whatever the scan stopped short of.** At most 400 files and 3 MB in total,
  with nothing exempt — configuration is read *before* any Swift file, which
  buys it priority and not an exemption — and any single file over 500 KB is
  skipped whole rather than truncated. `scan.hitFileCap`, `scan.hitByteCap`,
  `scan.skippedLarge` and `scan.unreadable` report each of those, and while a
  cap was hit no absence in `findings` covers the part that was never opened.
  A symlinked directory or file is stepped over and is counted in neither
  `scan.unreadable` nor `scan.skippedLarge`, so that one shows up only in the
  finding it did not produce.

An empty findings list means no rule this audit runs matched the text of the
files that were read — not that the project is sound, and not that it was all
read. The `scan` block says how much of it was, and the platform line says
which of the rules were allowed to run at all.

## [0.24.0] — 2026-08-15

The three existing Apple documents — `macos-app-design`, `ios-app-design`,
`apple-hig-liquid-glass` — carried source URLs that had never been checked
against the Apple page they claimed to summarize. This release re-sources all
three, adds two new Apple documents, deepens two of the existing ones, and
introduces a tiered source allowlist that the six Apple documents (and the
five `security` documents) are now held to. The most useful output of this
work was not the new prose — it was what verification destroyed: 16 claims
that no primary source supported, and several statements that were simply
wrong.

### Added

- **`apple-accessibility`** — Dynamic Type, VoiceOver, hit regions, motion and
  contrast, cited to developer.apple.com and WCAG 2.2.
- **`apple-shipping-readiness`** — the `Info.plist` purpose strings a
  capability requires, the entitlements macOS distribution requires, what a
  complete app icon set is, and what an orientation or multitasking
  restriction costs. Every claim is a statement Apple publishes, cited beside
  it.
- **A three-tier source allowlist — `standard`, `vendor`, `research`.**
  Enforced today on the five `security` documents (`standard` and `vendor`
  only) and the six Apple design-language documents — `macos-app-design`,
  `ios-app-design`, `apple-hig-liquid-glass`, `wwdc-design-principles`,
  `apple-accessibility`, `apple-shipping-readiness` — which additionally
  require at least one `developer.apple.com` source. It is **not** enforced
  on the other documents in the knowledge base; migrating the rest is a
  separate package.

### Changed

- **`macos-app-design` and `ios-app-design` re-sourced and deepened.**
  `macos-app-design` gains a platform-fit section — the SwiftUI/UIKit symbols
  Mac Catalyst supports that macOS does not, and the macOS-only scaffolding an
  iOS-shaped app never wrote — plus a menu bar and keyboard-shortcut table
  rebuilt from Apple's own tables. `ios-app-design` gains orientation
  coverage it previously had nothing on: the size-class table and the
  orientation-lock request that replaced the deprecated opt-out. Both guides
  are smaller where Apple does not back a claim, not larger.
- **`apple-hig-liquid-glass` re-sourced** to the Apple pages that make its
  claims, alongside the other two guides above — three documents re-sourced
  in total.

### Removed

- **16 claims removed because no primary source supported them.** The three
  existing Apple documents' 17 blog-tier sources were each traced to the
  prose they backed and checked against Apple's own page for the same claim;
  where Apple made no such claim, the claim was deleted rather than softened.
  Among them: the SwiftUI "known gaps" list (three of whose five claims were
  not even in the blog originally cited for them), the Tahoe window-tiling
  mechanics, the settings-window metrics, the App Store conversion
  statistics, and five Liquid Glass assertions, including one that named no
  source at all. One dead citation (`hig/navigation-bars`, which now
  redirects to `hig/toolbars`) was also replaced.

### Fixed

- **Factual corrections found only by reading the source, not by suspicion:**
  - Mac Catalyst scales the iPad idiom to **77%**, not 75%.
  - The in-app event card is **16:9, minimum 1920×1080**, not 1080×1920.
  - **macOS does not support Dynamic Type** — the guide had claimed it did
    since Sonoma.
  - Three keyboard shortcuts were wrong: **⌘T is the Fonts window**, **⌥⌘T
    toggles the toolbar**, and **⌥⌘I opens an inspector** — none of them the
    bindings the guide previously named.

## [0.23.0] — 2026-08-14

`audit_seo_geo` and `audit_performance` were the only two tools that answered
an agent as well as a reader — everything else in this server, including the
other four auditors, returned markdown only. A caller chaining `audit → fix`
had to parse prose to find out what an audit covered, and had no
machine-readable way to tell "found nothing" apart from "checked nothing."
This release brings the other four auditors up to the same contract.

### Added

- **`design_lint`, `audit_security`, `audit_generic_design` and
  `audit_project` now declare an `outputSchema` and return
  `structuredContent`** — findings as fields, a severity summary, and a
  machine-readable `notVisible` array of what each audit could not check,
  exactly as `audit_seo_geo` and `audit_performance` already did. All six
  structured auditors now share one schema shape and one governing rule:
  what is disclosed in prose and what is returned in `structuredContent`
  are drawn from the same array, never written twice.
  - Each finding carries its path once, in `file` — never also folded into
    `message`, so an agent rendering `${f.file}:${f.line} — ${f.message}`
    never reads the same path twice. The markdown prints the path exactly
    where it always did. `design_lint` is the one auditor with no `file` at
    all: it takes a snippet and neither a `filename` nor a `path`, so no
    finding it can produce has a path to carry, and its description no
    longer lists the field.
  - `audit_generic_design`'s schema also carries the itemised `score` its
    markdown already printed, plus a `scan` block — present only in
    directory mode — flagging a file or byte cap that leaves a clean score
    unconfirmed.
  - `audit_project`'s schema carries a `scan` block on every call, since it
    has no snippet mode. Both tools' `scan` declares the same six fields:
    how many files and bytes were actually read, which were skipped for size
    or could not be opened, and whether a cap was hit before the whole
    project was seen.
- **Bumped `@modelcontextprotocol/sdk` from 1.29 to 1.30**, the release the
  first two structured auditors were built against; the other four now sit
  on the same version.

### Changed

- **A missing or non-directory `path` on `design_lint`, `audit_security`,
  `audit_generic_design` or `audit_project` now comes back as an error
  result (`isError: true`, no `structuredContent`) instead of an ordinary
  prose result.** This is the only behaviour a caller can observe from this
  release: declaring an `outputSchema` makes a text-only "success" a
  protocol violation, because a caller expecting `structuredContent` gets
  none and nothing tells it the audit never ran. Before this release those
  paths answered with a prose explanation and no error flag, which a caller
  reading only `structuredContent` could not tell apart from a real, empty
  audit. `design_lint` takes no `path` at all and is unaffected.

## [0.22.0] — 2026-08-14

`seo_geo_guide` has returned this server's SEO and GEO guides since v0.9.0,
and nothing ever checked a page against them. A team could read every word
of `technical-seo` and `geo-fundamentals` and still ship three `<h1>`s, a
canonical pointing at staging, a hero image carrying `loading="lazy"`, and no
`llms.txt`. This release adds two auditors that read the page instead of
trusting the reader remembered the document.

### Added

- **`audit_seo_geo` and `audit_performance` — the 32nd and 33rd tools, and
  the first two here to return structured output.** Every other tool in this
  server answers a person reading markdown; these two also declare an
  `outputSchema` and return `structuredContent` — findings as fields, a
  severity summary, and a machine-readable `notVisible` array. An agent
  chaining `audit → fix` needs to know what was never checked as much as
  what was found; prose alone cannot stop a caller from reading silence as a
  clean bill.
  - `audit_seo_geo` reads a missing `<title>` and one outside the width a
    result gives it, the same for the meta description, multiple `<h1>`s,
    skipped heading levels, a missing canonical, one written relative in a
    self-contained document, one left pointing at localhost or staging, an
    hreflang set that never lists the page itself, JSON-LD that does not
    parse or declares no `@context`/`@type` or declares a type whose rich
    result Google has retired, missing alt text, robots.txt crawl rules —
    including the AI crawlers behind ChatGPT, Claude, Perplexity and
    Google's AI surfaces — a robots.txt naming no sitemap, no `llms.txt`
    beside it, and content that exists only once a script has run.
  - `audit_performance` reads a hero image held back by `loading="lazy"` or
    contradicting its own `fetchpriority`, the LCP-candidate image
    declaring no fetch priority at all, a hero background declared in CSS or
    an inline style that the HTML preload scanner never sees, images with no
    `width`/`height` or `aspect-ratio` to reserve their box, a
    `<script src>` in the `<head>` carrying neither `defer` nor `async` nor
    `type="module"`, `@font-face` without `font-display`, third-party font
    hosts, and scripts loaded from more distinct remote domains than any
    reading of "minimise" defends.
  - **Both descriptions are built from the auditors' own capability
    tables**, and the suites assert the mapping is exact in both
    directions. A tool description is read as a statement of reach, so an
    advertised check that no rule performs turns silence into a clean bill
    — the `notVisible` failure moved into the blurb.
  - **The governing rule both modules were written against: these audit what
    is authored, not what is measured.** A finding may state a fact about
    the source and pair it with a documented causal link — "the hero image
    carries `loading="lazy"`, which holds its request back until layout has
    run." No finding is or can be a Core Web Vitals verdict, an indexing
    status or a ranking outcome, because vitals are 75th-percentile field
    data from real devices and this reads source. Telling a team their
    vitals are fine from a static read would stop them measuring, which is
    worse than telling them nothing.
- **Five fixture pages, one per stack — Next.js App Router, Astro,
  SvelteKit, plain static HTML and a built Docusaurus page — each assert
  zero findings from both tools**, written and saved before either module
  was reopened; all ten cells passed on the first run. Two counterexamples
  ship beside them — an image-only splash page and a minimal 404, both real
  pages a visitor actually reaches, both missing the landmark signal a
  naive "is this a real page" guard would have keyed on — plus a
  deliberately broken page where every defect is one somebody has actually
  shipped.

### Fixed

- **A shipped defect in `audit_security`, found while building these two
  modules and fixed on the way.** `hasAttr`/`attrValue` and their
  equivalents let an attribute name match inside another attribute's
  *value* — `alt="Priority support illustration"` read as a declared
  `priority` prop, `title="rel='noopener' explained"` satisfied the check
  for a real `rel=noopener`. Seven defects in total, five of them false
  negatives that silence a real finding rather than invent one: five in
  `src/security.ts` (a `nonce` named inside a `data-` value, `sandbox`
  inside an iframe's `title`, `integrity` inside a `data-note`, `noopener`
  inside a link's `title`, and an inline script misread as the ld+json
  block CSP does not gate), and two in the new modules — one in `seo.ts`
  (a bare `alt` swallowed by `title="alt text here"`), one in `perf.ts`
  (the LCP candidate walking past an image an author had already marked
  with its own `priority`). Both readers now work from a copy with every
  quoted or braced value blanked before a name or value is located. No
  rule id, severity or doc changed; `audit_security` over this repository
  returns the same findings as before, line numbers aside.

### Notes

- **Two specified rules were cut for want of a document that makes their
  claim**, on the same ground `generic.ts` and `security.ts` already
  learned the expensive way: a rule cites a document that exists *and*
  makes the rule's claim, or it does not ship.
  - `og-incomplete` was specified against `on-page-seo`. That document
    never mentions Open Graph, and neither does any other document in
    `knowledge/` — "Open Graph", "og:title" and "og:image" return nothing
    across the whole base.
  - `font-host-not-preconnected` was specified against `technical-seo`.
    Nothing in `knowledge/` recommends preconnecting to a font host —
    "preconnect" appears four times, in two unrelated documents, and never
    in an SEO or performance one. The remedy the knowledge base actually
    documents is the opposite: `seo-for-designers` says "Self-host WOFF2.
    Third-party font CDNs add a connection." That claim ships as
    `third-party-font-host` instead.
- 94 knowledge documents, unchanged by this release — no new document was
  needed, which after two releases that each added one is itself worth a
  line.

## [0.21.0] — 2026-08-13

The knowledge base already said what gives a generated page away.
`typography-craft` carries a reflex-reject font list with Inter on it;
`design-critique-scoring` states the slop test outright. None of it was
enforced. An agent that never opened either document could ship indigo-to-violet
on Inter with a rocket emoji in the hero, and the server would raise no
objection — the knowledge existed to prevent exactly that page and nothing
read it back against what got built.

### Added

- **`audit_generic_design` — the 94th document and the 31st tool.**
  `knowledge/craft/ai-default-aesthetic.md` catalogues the defaults, cited to
  each system's own docs: the stock Tailwind indigo/violet/purple gradient (as
  classes, hex, or OKLCH), Inter/Roboto/Open Sans/DM Sans/Plus Jakarta Sans as
  the only declared typeface, emoji standing in for icons, the `rounded-2xl` +
  `shadow-lg` + border card recipe, gradient-filled heading text, an eyebrow
  over every heading, the `backdrop-blur` + `white/10` glass recipe, stock
  hype-opener copy, stacked filler adverbs, and a page whose every CTA is
  drawn from the stock set. Ten rules run those checks against real source and
  copy, never against taste — a class name, a phrase, a repeated structure,
  each a fact about the file rather than a verdict on the design. The score
  counts distinct signals, not occurrences, so forty cards sharing the stock
  chrome recipe are not more generic than three, and every point is itemised
  to its rule and file:line so a reader can disagree with a line instead of
  the whole verdict. Judgement stays where it already lived — pair this with
  `design_review_checklist` or `get_design_doc("design-critique-scoring")` for
  the half a fact-checker cannot do.
- **Five fixtures score 0.** A brutalist page, a serif editorial layout, a
  dense dashboard set in Inter, a warm consumer screen, and a monochrome
  developer tool each assert a generic score of zero — proof the tool
  penalises the defaults and not the categories of product that happen to
  share a typeface or a grid with them.

### Notes

- **One planned rule was cut before it shipped.** It fired on any three
  elements sharing a class string — nav links, footer buttons, dashboard KPI
  tiles, pricing tiers — and told every one of them their consistent
  components lacked hierarchy. A grid-parent gate would not have saved it,
  because dashboard tiles and pricing tiers genuinely do sit in a grid;
  separating "cards that need hierarchy" from "components that should be
  consistent" is a judgement about what the elements mean, not a fact about
  the source, so it falls outside what this tool can check. Ten rules ship,
  not eleven.
- **Writing the document first corrected the spec's own premises.**
  shadcn/ui's theming docs name no typeface at all — font selection routes to
  the scaffold, not the library — so `default-ui-font` only fires against a
  face actually declared in the source, never against an assumption about
  what shadcn ships. Its stock theme carries zero chroma on every token but
  `--destructive`; any hue in a shadcn project was added by hand. And Tailwind
  v4 authors its palette in OKLCH, publishing hex as "the nearest hex value"
  — the derived form, not the source of truth — which is why the gradient
  rule matches on OKLCH and class names, not on a hardcoded hex table that
  would have gone stale at the next palette revision.

## [0.20.0] — 2026-08-12

88 documents, and not one of them contained the string `Content-Security-Policy`
— nor `OWASP`, `XSS`, `CSRF`, `SameSite`, `HttpOnly`, `HSTS` or `Subresource
Integrity`, anywhere in the knowledge base. A site built end to end from this
server's guidance shipped with whatever header and cookie defaults the
framework happened to pick. This release adds a `security` category to close
that.

### Added

- **Five knowledge documents, a new `security` category — 93 documents:**
  - `web-security-headers` — CSP (nonce/hash, `strict-dynamic`, Trusted
    Types), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, Subresource
    Integrity, and the headers that are dead weight now (`X-Frame-Options`
    superseded by `frame-ancestors`; `X-XSS-Protection` actively harmful in a
    modern browser).
  - `frontend-attack-surface` — XSS sinks, unsandboxed third-party iframes,
    wildcard `postMessage`, mixed content, credentials in `localStorage`,
    secret-shaped `NEXT_PUBLIC_`/`VITE_` env vars.
  - `auth-and-session-ux` — session cookie attributes (`HttpOnly`, `Secure`,
    `SameSite`), CSRF defenses, passkeys, account-recovery flows that don't
    become the weak link.
  - `privacy-consent-and-tracking` — consent-before-load for tracking
    scripts, cookie categories, GDPR/UK-GDPR/KVKK-shaped requirements.
  - `ai-feature-security` — prompt injection from untrusted content and
    insecure output handling in AI features, mapped from the OWASP LLM Top 10
    to a frontend.
  - Every claim is sourced to a spec or a first-party vendor doc — a security
    document citing a blog is now a test failure, not a style note — and
    re-verified on a 90-day clock, the tightest staleness threshold in the
    table: a reader who believes a stale security claim thinks they're
    covered when they're not.
- **`audit_security`** — audits a directory or a pasted snippet for the
  defects above: missing or weak CSP, absent HSTS, unpinned cross-origin
  scripts, mixed content, `localStorage` credentials, secret-named public env
  vars, unsandboxed iframes, wildcard `postMessage`, unsanitised raw-HTML
  sinks, production source maps, un-ignored `.env` files. Header and CSP
  state is inferred by reading `next.config` / `vercel.json` / `netlify.toml`
  / `_headers` / middleware as text — never evaluated — so it also reports
  what it could not see rather than guessing. **30 tools** in total.
- The five documents are wired into every web-facing `design_review_checklist`
  (`website`, `landing-page`, `dashboard`) and roadmap (`website`,
  `landing-page`, `saas-web-app`) — a document nothing references is a
  document nobody reads. `tests/integrity.test.ts` now asserts the wiring
  directly, rather than only that each document is referenced from somewhere.

### Notes

Writing these turned up several widely repeated claims that don't hold up
against the spec or the vendor's own current docs:

- Trusted Types is no longer Chromium-only.
- `strict-origin-when-cross-origin` has been the browser default
  `Referrer-Policy` since 2020 — its absence from a response is not a
  finding, and an auditor that flags it anyway is simply wrong.
- Browsers imply `noopener` on `target="_blank"` anchors automatically;
  `window.open()` still does not, and still needs it spelled out.
- MDN states `SameSite=Lax` is the browser default; caniuse measures actual
  support at 76.34%, and only in Chrome and Edge. The two numbers describe
  different things, and neither one is wrong.

## [0.19.1] — 2026-08-06

### Fixed

- **An unsupported Node produced a syntax error, not an explanation.** `dist/index.js`
  uses top-level await, which older runtimes cannot parse, so the failure was
  `SyntaxError: Unexpected reserved word` pointing at a file the user did not
  write — and no check inside that file could ever run, because the parse fails
  before the first statement. `bin` now points at a small launcher written in
  deliberately old syntax, which names the required version and shows how to aim
  a client at a newer Node. Node 18 is not blocked: it works end to end in
  testing, so it starts with a warning rather than an error. A guard added to
  improve a message must not become a new source of breakage.

### Changed

- **The startup line names its transport.** It said "server running", which reads
  as "serving" to anyone who deployed this somewhere — the process would then
  wait on standard input forever with nothing to explain why it was unreachable.
  It now says "ready on stdio", and adds an explicit note when started by hand
  from a terminal, where the wait looks exactly like a hang. The README states
  the same thing: stdio only, no HTTP or SSE, cannot be hosted remotely — which
  is also why nothing leaves the machine.

## [0.19.0] — 2026-08-03

### Added

- **Status colours.** `generate_color_system` produced fourteen roles and none
  of them was an error colour, while `create_design_system` called itself a
  complete foundation. Adds `danger`, `success` and `warning` as full scales
  plus verified semantic roles in both themes, seeded from the conventional
  hues at the brand's own saturation so a muted brand does not get a
  fluorescent red.
- **Four knowledge documents**, all from primary sources, all on subjects the
  base had never covered — 88 documents:
  - `modern-css-design-primitives` — `contrast-color()`, `light-dark()`,
    `color-mix()`, `@scope`, container style queries, `field-sizing`, anchor
    positioning and the new font-relative units. Written around the limits:
    `contrast-color()` returns only white or black, and MDN's own example is a
    royal blue where it returns unreadable black.
  - `brand-on-native-platforms` — expressing brand inside a platform's
    conventions, built on the UI-layer / content-layer split.
  - `search-design` — `compare_design_languages` had listed "search" as a topic
    since v0.15.0 with nothing behind it.
  - `naming-features-and-labels` — criteria, process and evaluation for naming.

### Changed

- **`get_component_recipe` swaps whole ramps, not roles.** Role mapping handled
  `indigo-600` because that is "the primary" and left `indigo-300/400/500/800`
  behind, because no role names the shade a dark theme uses — so every dark UI
  built from these recipes kept our accent. Neutrals failed the same question
  from the other side: `bg-neutral-900` is a surface and `text-neutral-900` is
  text. Pass the `neutral`, `primary` and `danger` scales and each is swapped
  step for step, which needs no inference and therefore cannot be wrong. Nine
  components across both web stacks now return with no house colour left.
- `create_design_system` prints the exact payload to hand to
  `get_component_recipe`, and a test asserts every role in it is one the recipe
  tool accepts, so the two cannot drift apart.

### Fixed

- **Focus rings were counted as elevation.** A ring is a box-shadow but not
  depth, and counting them together punished exactly the codebases that do this
  properly. A ring has no offset and no blur, which separates the two precisely.
- **`design_lint` called best-practice code an error.**
  `:focus:not(:focus-visible) { outline: none }` is the recommended way to drop
  the ring for pointer focus while keeping it for the keyboard. Found by running
  `audit_project` against a real site.
- **The recipe library was not one system.** Four components used indigo as the
  accent and four used blue. Audited at 54/100 by our own tool, now 90, with a
  test that keeps it there.
- **Inflection decided findability.** Title and tag matching is exact-token, so
  "token" scored nothing against a document titled "Design Tokens". Query and
  index tokens are now stemmed — plurals and `-ing` only; `-ed` is left alone
  because "embed" would become "emb", and a stemmer that invents matches is
  worse than one that misses them.

### Notes

The first status-colour implementation passed every test while producing
`#46100b` for danger — a near-black brown that white reads on perfectly and
nobody reads as an error. Contrast passed, hue passed, saturation passed; the
constraint that bites is lightness. Measuring is not enough on its own — it has
to be the right measurement.

Apple's Human Interface Guidelines pages render client-side and return only
their titles to a fetch, so nothing was written from memory about the June 2026
HIG revisions. SF Symbols 8, Icon Composer 2, Pass Designer, scroll edge effects
and app schemas remain uncovered for that reason rather than by choice.

## [0.18.0] — 2026-08-02

Three gaps, each found by measuring rather than guessing: the pipeline broke in
the middle, teams could not add their own rules, and the auditors could not see
a project.

### Added

- **Your own knowledge directory.** `SAGLITZDESIGN_KNOWLEDGE_DIR` points at one
  or more directories whose documents join the base. The README used to say
  "drop a file under `knowledge/`", which means editing the installed package —
  `npm update` wipes it, so extending was effectively impossible from npm.
  A document with the same id replaces the built-in one, announced at startup
  and marked as your team's wherever it is served; `review: [website]` in
  frontmatter puts it into that checklist, ahead of the curated list.
- **`audit_project`** — the auditors over a directory instead of a pasted
  snippet, with the consistency score computed across files, findings ranked
  worst-file-first, and an explicit list of what was skipped.
- **`get_component_recipe` takes your tokens** and returns the code in your
  colours. Substitution happens on the way out, never on disk, so the recipe
  files stay valid runnable code; without tokens the output is byte-identical
  to before.
- **29 tools** in total.

### Fixed

- **Focus rings were counted as elevation.** A ring is a box-shadow but not
  depth, and counting them together punished exactly the codebases that do this
  properly — a consistent ramp plus a few ring states read as "sprawl". A ring
  has no offset and no blur, which separates the two precisely.
- **`design_lint` called best-practice code an error.**
  `:focus:not(:focus-visible) { outline: none }` is the recommended way to drop
  the ring for pointer focus while keeping it for the keyboard. Found by running
  `audit_project` against a real site.
- **The recipe library was not one system.** Four components used indigo as the
  accent and four used blue, so a UI built from these recipes put an indigo
  button beside a blue tab; radii had two values for "control" and two for
  "container". Audited at 54/100 by our own tool, now 90, with a test that keeps
  it there — a project shipping `audit_design_system` cannot ship a library that
  fails it.

### Notes

Ranking a team's documents took three attempts. A flat score boost was
arbitrary; gating on a fraction of the best built-in score failed outright,
because the scoring is length-biased — body frequency rewards long documents, so
a twenty-line house-rules file can never out-score a two-hundred-line reference.
Term coverage is length-independent: a document containing everything you asked
about leads, one sharing a single word does not.

## [0.17.0] — 2026-07-27

### Added

- **`import_design_tokens`** — the inverse `generate_design_tokens` never had.
  Reads CSS custom properties (a Tailwind v4 `@theme` block, a shadcn `:root`
  block, plain CSS), a W3C DTCG token file, or a theme object as JSON, and
  returns the roles it names, the semantic roles it leaves undefined, a WCAG
  contrast check on the pairs it defines, and the whole set re-emitted as CSS /
  Tailwind / SwiftUI / Compose / DTCG. Until now the server only served
  greenfield projects; this one meets a codebase that already has a system.
- **`theming-off-the-shelf`** knowledge doc — how to theme shadcn/ui, Radix,
  Material and native kits with your own tokens instead of rebuilding them.
  `design-systems-methodology` had told people to adopt and theme rather than
  reinvent without ever saying how. 84 documents.

### Changed

- Build workflows now import an existing theme before generating a new one, and
  `port_to_platform` re-emits the tokens a project already has for the target
  platform rather than starting over.
- **28 tools** in total.

### Deliberately not added

shadcn/ui component recipes. `design-systems-methodology` lists "reinventing an
off-the-shelf system" among its anti-patterns and names shadcn/ui specifically;
shipping our own competing button would contradict our own published guidance,
and it would be worse maintained than the one `npx shadcn add button` gives you.
The useful thing for those users is knowing how to theme what they already have,
which is the knowledge doc above.

### Notes

Only *named* tokens are read — CSS custom properties, DTCG entries and theme
keys carry a role; a bare `color: #4f46e5` inside a rule does not, and is never
imported as one. JavaScript configs are never evaluated. Text roles are
classified before surfaces: shadcn names its text roles `muted-foreground` and
`primary-foreground`, and matching surfaces first filed the most common failing
text colour in the ecosystem as a background.

## [0.16.0] — 2026-07-25

### Added

- **`measure_screenshot`** — measures a real screenshot from its pixels rather
  than describing it: the exact palette and how many distinct colours a screen
  actually uses, true WCAG contrast ratios for the colour pairs present,
  whitespace and density, and structural detections (left-edge alignment,
  vertical rhythm, off-grid gaps) each carrying a confidence level. Findings
  describe the image, never the interface's semantics, and anything below its
  confidence threshold is not reported at all.
- **Self-contained HTML report** — the measurement renders to a single
  standalone document with no external requests, readable in light and dark,
  that you can open, keep and share.
- **Pure-Node PNG decoding** (`src/png.ts`) built on `node:zlib` — truecolour,
  greyscale, palette with tRNS, 8- and 16-bit, all five scanline filters. No new
  dependencies. Unsupported input (JPEG, interlaced, truncated) is refused with
  a named reason instead of producing wrong pixels.

### Changed

- `critique_screenshot` and `design_review` now measure a screenshot before
  judging it, so a critique cites "2.9:1, AA needs 4.5" instead of "contrast
  looks weak".
- Colour distance and clustering moved to `src/colorutil.ts`, shared by the
  screenshot measurement and `audit_design_system` — "23 colours in your CSS"
  and "23 colours on your screen" are now counted by the same rule.
- **27 tools** in total.

### Testing

- Fixtures are synthesised in-test by a PNG *encoder*, so every assertion
  checks an exactly known answer rather than an approximation. Two
  false-positive guards protect the positioning: a perfectly aligned layout must
  report a single edge, and an anti-aliased edge — which produces two adjacent
  peaks above threshold — must merge into one.

## [0.15.0] — 2026-07-24

An audit-and-repair release: three bugs were silently degrading the flagship
orchestration tools, and the test suite could not have caught any of them.
Also adds MCP resources, argument completion, and three new tools.

### Fixed

- **11 pattern documents were invisible to every roadmap and checklist.**
  `ROADMAPS` referenced pattern docs by their bare name (`onboarding-paywall`)
  while the documents carry platform-prefixed ids (`mobile-onboarding-paywall`).
  Unknown ids were silently filtered out, so — for one example — the iOS
  roadmap's "Monetization & key flows" phase omitted the paywall, auth,
  checkout and settings patterns it exists to point at. Ids are now canonical,
  and `findDoc()` resolves either form so cross-links inside the knowledge base
  (`[[onboarding-paywall]]`) keep working.
- **`cross-platform` documents disappeared from platform-filtered searches.**
  The filter only exempted `both`, so `design-tokens-theming` and `fluent-2`
  vanished from any search scoped to `web`, `mobile` or `macos`.
- **`design_lint` misjudged formatted markup.** The rules ran line by line
  while JSX is routinely wrapped across lines, so a multi-line `<img>` *with*
  `alt` was reported as an error, and a single-line `:focus { outline: none }`
  — the most dangerous case — was skipped. Markup rules now use a tag scanner
  over the whole snippet, and `outline: none` is judged against whether the
  snippet provides a focus replacement anywhere. Attributes arriving via
  `{...spread}` are no longer guessed at.
- **5 broken `[[wiki-links]]`** in the knowledge base now point at real docs.
- **`get_design_examples` no longer over-promises.** Screenshots are a
  local-only asset (third-party images are not redistributed), so published
  installs never returned them despite the description saying otherwise. The
  tool now detects which mode it is in and describes itself accordingly.

### Added

- **MCP resources.** The knowledge base is browsable without spending a tool
  call: `saglitzdesign://index`, `saglitzdesign://doc/{id}` (all 83 docs) and
  `saglitzdesign://recipe/{component}`, with **argument completion** for ids
  and component names.
- **`audit_design_system`** — point it at CSS/JSX/token source and it reports
  design-system sprawl: near-duplicate colors, radius/shadow/font-size/spacing
  scales, hardcoded values vs tokens, with a consolidation plan.
- **`generate_layout_system`** — breakpoints, container widths, a fluid grid,
  container queries and section rhythm as CSS custom properties and a
  Tailwind v4 `@theme` block.
- **`compare_design_languages`** — side-by-side iOS/HIG, Material 3, macOS and
  web equivalents for one surface (navigation, buttons, modals, motion,
  typography, elevation…), with the porting rule for each.
- **26 tools** in total, up from 23.
- **`port_to_platform` workflow** — takes a UI to another platform surface by
  surface, driven by `compare_design_languages` and its "do NOT port" lists.
- **`design-system-audit` skill** for the `npx skills add` distribution.

### Changed

- **The `/` workflows now drive the whole server.** They had not been updated
  since v0.4.0 and orchestrated only 8 of 26 tools — no generators, no recipes,
  no auditors. Every build workflow now generates the design system before
  writing pixels, builds from the component recipes, and passes a
  **deterministic verify gate** (`design_lint` → `audit_accessibility` →
  `audit_design_system` → `audit_ux_copy`) before it may claim to be done.
  `design_review` and `redesign` now lead with measured numbers instead of
  opinions, and report a real before→after.
- `create_design_system` gained the layout layer it was missing (grid,
  breakpoints, measure and section rhythm for web; margins, touch targets and
  adaptivity for iOS/Android) and now closes the loop by pointing at its own
  auditors.
- The `skills/` distribution was refreshed — it advertised a 68-document,
  12-tool server and referenced almost none of the tooling.
- 12 previously unreferenced documents (AI product UX, i18n, information
  architecture, emotional design, branding, email, ad creative, content
  distribution, and three distilled classics) are now wired into the roadmaps
  and review checklists that should have been citing them.
- Catalogue data (categories, review maps, roadmaps, freshness thresholds)
  moved to `src/catalog.ts` so it can be validated without starting a server.
- The server version is read from `package.json` at runtime; `npm version`
  syncs `server.json` automatically via `scripts/sync-version.mjs`.
- Minimum Node is now 20 (18 is end-of-life); CI runs 20/22/24.

### Testing

- **76 → 190+ tests.** New `tests/prompts.test.ts` validates the workflow prose
  itself — no phantom tool names, no broken document ids, and every build
  workflow gated on the auditors; `tests/integrity.test.ts` does the same for
  the `skills/` distribution. New `tests/integrity.test.ts` asserts that every doc id
  referenced by a roadmap, checklist, enum or wiki-link resolves, that ids are
  unique, and that release metadata is in sync. New `tests/server.test.ts`
  drives the real stdio server: every tool is listed, annotated and answers a
  representative call; resources and completions are exercised end to end.

## [0.14.0] — 2026-07-23

- Registered all 23 tools through a wrapper adding human titles and MCP
  annotations (`readOnlyHint`, `idempotentHint`, `openWorldHint: false`).
- Sharpened the knowledge-tool descriptions and parameter documentation.

## [0.13.0] — 2026-07-23

- Flagship `create_design_system`: one call turns a brand color + vibe +
  platform into a complete foundation.
- Added `generate_type_scale`, `generate_elevation_system`, `generate_motion`,
  `design_lint`, `audit_ux_copy`.
- Five new knowledge docs (e-commerce checkout, fintech trust, visionOS,
  HTML email development, design handoff) — 83 documents total.

## [0.12.0] — 2026-07-14

- Added `apple-intelligence-design`: how to design AI features the Apple way.

## [0.11.0] — 2026-07-14

- Added `suggest_icon_library` and the `iconography` craft doc. No icon assets
  are bundled.

## [0.10.0] — 2026-07-13

- Added `generate_color_system`, `suggest_font_pairing`, `fix_contrast`.
- First test suite (vitest) and CI across Node 18/20/22.
- Four new knowledge docs; MCP Registry and Smithery manifests.

## [0.9.0] — 2026-07-10

- Added `get_component_recipe` with production-ready code for 9 components
  across react-tailwind, html-css, SwiftUI and Compose.

## [0.8.0] — 2026-07-09

- Added the `skills/` distribution (5 skills) and 4 knowledge docs.

## [0.7.0] and earlier

- Knowledge base, search, roadmaps, review checklists, design tokens,
  accessibility auditing, prompts, and the curated example library.
  See the repository history for details.
