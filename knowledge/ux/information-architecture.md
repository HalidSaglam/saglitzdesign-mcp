---
id: information-architecture
title: "Information Architecture — Structure, Labeling, Findability"
category: ux
platform: both
tags: [ia, navigation, taxonomy, labeling, sitemap, card-sorting]
sources: ["https://abbycovert.com/make-sense/", "https://www.nngroup.com/articles/ia-study-guide/", "https://www.nngroup.com/articles/card-sorting-tree-testing-differences/", "https://web.dev/learn/design/internationalization"]
updated: 2026-07-09
---

# Information Architecture — Structure, Labeling, Findability

Information architecture (IA) is how you arrange the parts of a product so the whole is understandable. It is the invisible skeleton under every menu, URL, and label. When IA is right, users predict where things live before they look. When it is wrong, no amount of visual polish saves the product — people get lost, search becomes the only escape hatch, and content that exists cannot be found. Design the structure before the screens.

## The mess is made of information and people

Abby Covert's core lesson in *How to Make Sense of Any Mess*: a mess is never just content — it is content plus the people who make sense of it. You are not organizing files; you are organizing meaning for a specific audience. Two things follow:

- **Language matters most.** The words you choose for categories, buttons, and links *are* the architecture users experience. A perfect hierarchy with wrong labels still fails. Decide what things are called before deciding where they go.
- **Agree on intent first.** Before structuring, be able to state who this is for, what they are trying to do, and what success looks like. Structure is a means to that end, not the goal.

Covert frames IA as a repeatable practice, not a talent: identify the mess, state your intent, face reality (audit what you actually have), choose a direction, measure the distance to your goal, play with structure, and prepare to adjust. Treat IA as iterative, never one-and-done.

## Nouns, verbs, and controlled vocabularies

- **Name the nouns and verbs.** Nouns are the things in your system (order, invoice, project, teammate). Verbs are what users do to them (create, archive, share, export). Consistent nouns and verbs across the entire product are the foundation of a coherent IA.
- **Build a controlled vocabulary.** Pick ONE term for each concept and use it everywhere — UI, docs, error messages, marketing. If the team says "folder," "collection," and "library" for the same thing, users inherit that confusion. Maintain a living lexicon; it is a design artifact, not a nicety.
- **Kill synonyms and homonyms.** Synonyms (two words, one meaning) make people wonder if there is a difference. Homonyms (one word, two meanings — e.g. "profile" as a settings page vs. an analytics report) make people guess. Resolve both.
- **Define terms for outsiders.** A label that is obvious to the team is often jargon to users. Write definitions plain enough for someone learning your domain for the first time.

## Structuring content

Choose an organizing scheme that matches how users think, not how your org chart or database is shaped.

- **Hierarchies (trees).** The default for most products: broad parent categories narrowing to specifics. Keep them shallow and wide rather than deep and narrow — users tolerate scanning more options at one level better than clicking through many levels. Aim for a small number of top-level categories that are mutually exclusive and collectively exhaustive.
- **Taxonomies.** A named, consistent classification system for a content type (product categories, help-article topics). Every item gets a place; places do not overlap.
- **Faceted classification.** Instead of one rigid tree, describe each item by multiple independent attributes (color, price, brand, size) and let users filter along any combination. Faceted navigation is the right tool for large, heterogeneous catalogs where no single hierarchy fits every user's mental model.
- **Match the mental model.** The best scheme is the one users already carry in their heads. Research it (see card sorting below) rather than inventing it at a whiteboard.

## Navigation and labeling

Labels are where IA meets the user. Get them concrete and predictable.

- **Clear over clever.** "Pricing," "Help," "Account" beat invented brand words. If a label needs a tooltip to be understood, it is the wrong label.
- **Front-load keywords.** Put the information-carrying word first: "Billing history," not "View your history of billing." People scan the first two words of a link.
- **Avoid jargon and internal names.** Use the words your users use, surfaced by research and search-log analysis — not your database table names or team shorthand.
- **Name consistently.** The link that takes users somewhere should carry the same word as the destination's title (link says "Settings," page reads "Settings"). Mismatches make people doubt they arrived in the right place.
- **Parallel structure.** Sibling labels should share grammatical form — all nouns, or all verb phrases, not a mix.

## Sitemaps and app-maps

Before building screens, diagram the structure.

- **Sitemap (content sites).** A tree of every page and its parent-child relationships. Reveals orphan pages, over-deep branches, and top-level categories that are too crowded or too sparse.
- **App-map (products/apps).** Maps the primary objects, the screens for each, and the paths between them (list → detail → edit). Captures flows and states, not just pages.
- **Use them to pressure-test.** Count clicks to key destinations, check that every important task has an obvious top-level entry point, and confirm nothing critical is buried three levels down.

## Research methods: card sorting and tree testing

Do not guess the structure — test it. These are the two dedicated IA research methods.

- **Card sorting** *generates* structure. Give participants a set of content items (cards) and have them group and name the groups the way they'd expect.
  - *Open sort:* participants create and label their own categories — best early, to discover users' mental models and vocabulary.
  - *Closed sort:* you supply the categories; participants file cards into them — best to validate a proposed taxonomy and see where items land ambiguously.
  - *Hybrid:* participants use your categories but may add their own — a middle ground.
- **Tree testing** *evaluates* structure. Strip away all visual design and give participants only the text hierarchy, then ask them to find specific items by clicking through it. Measures whether people can locate things and where they go wrong — directness, success rate, and the branches they wrongly explore.
- **Sequence them.** Card sort to build, tree test to validate, then repeat after revising. Card sorting answers "what belongs together?"; tree testing answers "can people find it?"

## IA is not navigation UI

A common mistake is conflating the structure with the menu that exposes it.

- **IA is the underlying organization** — the categories, relationships, and labels — independent of any interface.
- **Navigation is one UI rendering of that IA** — a top nav, sidebar, tab bar, mega-menu, breadcrumb, or search box. The same IA can be surfaced through many navigation patterns on different screen sizes.
- Fixing a confusing menu without fixing the IA underneath just rearranges the symptoms. Diagnose which layer is broken. See [[navigation]] for how to render IA into usable controls.

## URLs and routes are IA

On the web, the URL is a first-class part of the architecture, not an afterthought.

- **Readable, hierarchical paths** (`/docs/billing/refunds`) communicate location, support guessing ("I bet I can edit at `/settings/profile`"), and are shareable and memorable.
- **Match paths to the hierarchy** users see in navigation and breadcrumbs; a URL structure that contradicts the visible IA is disorienting.
- **Stable slugs.** Use meaningful, human-readable slugs; avoid opaque IDs and query soup for primary content. When structure changes, redirect old URLs — broken links are broken findability (also an SEO cost).

## Findability vs. understandability

Two distinct success conditions; IA must serve both.

- **Findability** — can users locate a thing they are looking for? Served by good hierarchy, labels, search, and cross-links.
- **Understandability** — once found, does it make sense in context? Served by clear language, grouping related items, and consistent vocabulary.
Something can be findable but incomprehensible, or perfectly clear but impossible to reach. Test for each separately.

## When IA is broken — the symptoms

Watch for these signals that the architecture, not the visuals, is the problem:

- Users can't predict where a feature or piece of content lives, and disagree with each other about where it *should* live.
- Search is the primary navigation method because browsing fails.
- The same concept appears under different names in different places, or one name means different things.
- Top-level categories overlap, so items could plausibly go in two places.
- Support tickets and search logs are full of "where do I find…" questions.
- New content has no obvious home, so it accretes in a "Misc" or "More" bucket.
- Navigation depth keeps growing because no one will decide what belongs at the top.

When you see these, restructure — don't restyle. Keep the language plain, the hierarchy shallow, the vocabulary controlled, and validate every change with real users. See [[dont-make-me-think]] for the usability lens on making structure self-evident.

## Cross-links

- [[navigation]] — turning IA into usable menus, tabs, breadcrumbs, and search.
- [[dont-make-me-think]] — self-evident design and the cost of making users pause.
