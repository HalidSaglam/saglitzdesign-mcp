---
id: dont-make-me-think
title: "Don't Make Me Think — Web Usability Rules (Steve Krug)"
category: book
platform: web
tags: [usability, navigation, content, scanning, usability-testing]
sources: ["Don't Make Me Think, Revisited (Steve Krug, 3rd ed. 2014)"]
updated: 2026-07-08
---

# Don't Make Me Think — Applied Web Usability

Krug's first law: **a page should be self-evident — obvious, self-explanatory — or at worst self-explanatory with minimal effort.** Every question mark that pops into a user's head ("Is that clickable?", "Where am I?", "Why is it called that?") adds cognitive load and erodes confidence. The designer's job is to eliminate question marks.

## 1. Design for how people actually use the web

Three facts that invalidate most "careful reader" assumptions:

1. **People scan, they don't read.** They're on a mission, they know they don't need most of the page, and scanning has worked their whole lives.
2. **People satisfice.** They don't weigh all options and choose the best; they click the first thing that looks plausibly right. If it's wrong, they hit Back (cheap) and try again.
3. **People muddle through.** They don't read instructions or care how things are "supposed" to work; they form just-enough theories and keep them if they work at all.

**Consequences (rules):**
- Design pages as billboards, not essays. Assume every visitor is skimming at speed.
- Don't rely on users reading anything before their first click. Instructions placed before an action are usually skipped — put guidance at the point of need instead.
- Since users satisfice, the *most plausible-looking* option wins, not the technically correct one. Label things so the right choice is also the most plausible one.
- Don't punish wrong clicks: keep Back working (no broken history, no hijacked navigation), make recovery instant, never lose entered data.

## 2. Build billboard-style pages for scanning

**Rules:**
- Strong visual hierarchy: the most important thing is the most prominent; logically related things are visually grouped; nesting is shown visually (things inside a section look contained by it).
- Headings must sit closer to the content they introduce than to the content above (space-before > space-after), be visibly different in size/weight, and be front-loaded with keywords.
- Break pages into clearly defined zones: users decide within seconds which areas to attend to and which to ignore. Ambiguous zones get ignored wholesale.
- Format for scanning: short paragraphs (1–3 sentences), bulleted lists for anything list-like, bolded keywords sparingly, generous line spacing in lists.
- Make clickable things unmistakably clickable, and keep one visual language for links/buttons across the whole site. Users shouldn't spend a single neuron deciding what's clickable.
- Reduce visual noise ruthlessly: busyness (everything shouting), background noise (textures, faint clutter), and plain overcrowding all slow scanning. When in doubt, remove.

## 3. Mindless choices beat few choices

Krug's refinement of the "3 clicks" myth: **users don't mind many clicks if each click is a mindless, unambiguous choice.** Three agonizing clicks are worse than six obvious ones.

**Rules:**
- Optimize for choice-confidence, not click-count. It's fine to add an intermediate page if it splits an ambiguous choice into two obvious ones.
- Every choice point (nav item, button pair, filter) should be answerable without thought. If users must deliberate, either relabel, reorder, or add a one-line disambiguator ("Not sure? Most people want X").
- When guidance is genuinely needed, make it: brief (the smallest amount that helps), timely (exactly at the decision point), and unavoidable (in the flow, not in a help page).

## 4. Omit needless words

Krug's third law: **get rid of half the words on each page, then get rid of half of what's left.**

**Rules:**
- Kill "happy talk" — welcome-mat introductions, mission-statement paragraphs, self-congratulation. Users skip them; they only add noise and push content below the fold.
- Kill most instructions. If something needs instructions, first try redesigning it so it doesn't. What remains should be cut to the bone ("Enter your work email" not "Please fill in the email field below with the email address you use at work").
- Cutting words makes real content more prominent, pages shorter, and scanning faster — it's a hierarchy tool, not just an editing habit.
- Practical pass for any screen: delete every sentence, then re-add only the ones whose absence causes a failure.

## 5. Navigation is the product

Users can't rely on physical cues (no sense of scale, direction, or location on the web), so persistent navigation must do that work. Navigation isn't just wayfinding — it tells users what the site contains, how to use it, and whether the builders knew what they were doing.

**Rules — every page (except stripped-down flows like checkout) needs:**
- **Site ID/logo** top-left (or top-center), linking home.
- **Sections (primary nav)** with the current section visibly highlighted.
- **Utilities** (sign in, account, cart, help) small and top-right.
- **Search**: a box + button on every page for search-dominant users; don't hide it behind an icon on desktop if search matters to your product.
- **Page name**: every page needs a name, in the right place (framing the page's content), prominent, and matching the words the user clicked to get there. Click-target text ≠ page title is a top trust-breaker.
- **"You are here" indicators**: highlighted nav item, breadcrumbs for deep hierarchies (start with "Home", use > separators, bold the last item).
- Follow conventions unless you have a genuinely better idea *and* the resources to prove it works. Conventions (cart icon, logo-links-home, blue-ish links, footer legal) are pre-learned — novelty taxes every visitor. "Innovate when you know you have a better idea; copy when you don't."
- Tabs are excellent primary navigation when drawn correctly: the active tab must visually connect to the page area (same background color, front-most), instantly communicating "you are in this drawer."

## 6. The Trunk Test — audit for disorientation

Imagine being blindfolded and dropped onto a random interior page. Glancing at it, you must be able to answer, at a glance, not by deduction:

1. What site is this? (site ID)
2. What page am I on? (page name)
3. What are the major sections? (primary nav)
4. What are my options at this level? (local nav)
5. Where am I in the scheme of things? (highlighting, breadcrumbs)
6. How can I search?

**Rule:** run this on interior pages, not the homepage — deep links (search engines, shared URLs) mean most sessions start mid-site. Any question that takes more than a glance to answer is a defect to fix.

## 7. The homepage — everyone's fighting for it, clarity must win

The homepage must convey at a glance: what this is, what you can do here, what they have, and why you should be here rather than elsewhere — while surviving every stakeholder's pet promo.

**Rules:**
- Get the value proposition across with a tagline near the site ID (clear and informative beats clever), a concise welcome blurb, and obvious "start here" entry points (search, browse, sign up).
- The bigger the fight for homepage space, the more ruthless the pruning must be: everything added to the homepage dilutes everything already there.
- Never let internal politics decide prominence; let user tasks decide. Preserve the top entry points for the top 2–3 user goals.
- Don't count on users reading the homepage at all — many arrive deep-linked. Every page must carry identity and orientation on its own (see Trunk Test).

## 8. Goodwill: the reservoir model

Every visitor arrives with a reservoir of goodwill; friction drains it, kindness refills it, and an empty reservoir means they leave (and remember).

**Drains (avoid):** hiding information users want (support numbers, shipping costs, prices); punishing users for not doing things your way (rigid input formats — accept phone numbers with or without dashes); asking for information you don't truly need; fake sincerity and marketing fluff; obstacles like unskippable promos; amateur-looking sloppiness.

**Refills (do):** make the top 3 tasks effortless; be upfront about costs and limitations; save users steps (pre-fill, remember state); answer likely questions where they arise; make recovery from errors easy; apologize when the system genuinely can't do something.

## 9. Cheap usability testing — Krug's method

Testing one user early beats testing fifty at the end. Formal, expensive testing is the enemy of any testing at all.

**The method (rules an assistant can prescribe):**
- **3 users per round, one morning a month**, testing whatever is ready that month (sketches, prototypes, live site). Fixed cadence beats "when it's ready."
- Recruit loosely: testing people outside the exact target audience still finds most problems ("recruit loosely and grade on a curve").
- Tasks: give realistic missions ("Find a dress shirt under £50 and get to checkout"), have users **think aloud**, and never help or lead. Also start with a "get it?" test: show the homepage/landing page and ask what they make of it before any tasks.
- The whole team watches (live or recording); debrief over lunch the same day.
- **Fix the most serious problem first, and prefer the smallest change that removes the problem** — a tweak you'll actually ship this week beats a redesign you won't. Resist adding things (instructions, banners) as fixes; usually the fix is taking something away.
- Ignore "kayak" problems: momentary wobbles users self-correct in seconds without noticing.

## 10. Mobile: same principles, tighter constraints

Krug's 3rd-edition position: mobile is not a different discipline — it's the same usability under scarcer space and fatter pointers. The main new sins are mobile-specific.

**Rules:**
- **Tradeoffs shift, principles don't.** Small screens force prioritization, which is healthy — but "mobile users are rushed and need less" is a myth. If content exists on desktop, mobile users must be able to reach it: never amputate features, relocate them (progressive disclosure, secondary screens).
- **No teleporting:** a link shared from mobile must open equivalent content on desktop and vice versa. If separate mobile pages exist, cross-link every page to its counterpart.
- **Affordances suffer most on touch:** no hover means no hover-revealed anything. Every tappable element must look tappable at rest; every swipe/long-press needs a visible alternative or hint.
- **Tappable ≥ 44pt with breathing room** — adjacent small targets cause the most rage-taps.
- **Flat design warning:** stripping gradients/borders/shadows removes the cues that said "this is clickable." If you go flat, compensate with color, placement conventions, and button-shaped buttons.
- Speed is usability: mobile users on slow connections experience every extra kilobyte as friction — performance budget is a UX deliverable.

## 11. Usability as common courtesy — forms and asks

- Ask only for what the task needs. Every extra form field is both effort and suspicion ("why do they want this?").
- Accept input in any reasonable format (spaces in card numbers, any phone format) — normalizing is the computer's job, not the user's.
- Explain *why* you need sensitive data at the point of asking ("Phone: only used for delivery issues").
- Preserve everything on error; return the user to the exact field with a specific message.
- Say what happens next before they commit ("You won't be charged until dispatch").

## 12. Accessibility is usability

Krug's take: the single best thing you can do for accessibility is fix the usability problems that confuse *everyone* — then add the specifics:
- Real heading structure (h1–h3 used semantically) — screen-reader users scan by headings just like sighted users scan visually.
- Alt text on informative images; empty alt on decorative ones.
- Full keyboard operability and visible focus states.
- Form labels programmatically attached to inputs.
- Sufficient text contrast and user-resizable text.
These overlap almost entirely with billboard design and Trunk Test discipline — accessible sites are just sites where the scanning cues are machine-readable too.

## Quick audit checklist

- [ ] Zero question marks: everything clickable looks clickable, every label instantly plausible
- [ ] Page scannable as a billboard: clear zones, real hierarchy, headings attached to their content
- [ ] Word count halved, then halved again; no happy talk, no avoidable instructions
- [ ] Persistent nav: site ID, sections + highlight, utilities, search, page name matching the clicked link
- [ ] Passes the Trunk Test from any interior page
- [ ] Homepage states what/why at a glance; top user tasks get top billing
- [ ] Formats forgiving, prices/costs upfront, Back always safe — goodwill preserved
- [ ] Monthly 3-user think-aloud test scheduled; last round's #1 issue fixed with the smallest viable change
