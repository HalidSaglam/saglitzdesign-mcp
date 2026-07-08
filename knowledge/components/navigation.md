---
id: navigation
title: "Navigation Patterns — Mobile & Web"
category: component
platform: both
tags: [navigation, tab-bar, sidebar, navbar, information-architecture]
sources: ["https://m3.material.io/components/navigation-bar", "https://developer.apple.com/design/human-interface-guidelines/tab-bars", "https://www.nngroup.com/articles/mobile-navigation-patterns/"]
updated: 2026-07-08
---

# Navigation Patterns — Mobile & Web

Navigation is the user's mental model of your product. If they can't predict where things live, nothing else matters.

## Mobile app navigation

- **Bottom tab bar = default for 3–5 top-level destinations.** More than 5 → rethink IA, don't add a "More" dump unless unavoidable.
- Tabs: icon + label always (icon-only tabs test poorly); active state with filled icon + accent color; never hide the tab bar on core screens (hiding on scroll is acceptable for immersive content).
- Center tab as primary-action FAB (create/post) works when creation is the core loop (Instagram, X).
- Hamburger menus on mobile apps: last resort — hides features, drops engagement. Acceptable for secondary/settings content behind a profile tab instead.
- Hierarchical push navigation (iOS): back button top-left + swipe-back gesture must always work; label the back button with the previous screen when space allows.
- Modality: sheets/modals for tasks that complete or cancel (compose, filters); push for drill-down browsing. Don't stack modals.
- Tab state: each tab keeps its own navigation stack; switching tabs preserves position; re-tapping active tab scrolls to top / pops to root.

## Web navigation (marketing sites)

- Top navbar: logo left (links home), 4–7 items, primary CTA button right, distinct from nav links.
- Dropdown/mega menus: open on click (hover-open menus are error-prone and unusable on touch); one level deep.
- Sticky header: shrink on scroll (≤64px); never consume >10% of viewport height.
- Mobile web: hamburger acceptable; full-screen overlay menu with large targets, CTA repeated inside.
- Footer = secondary sitemap: group links under clear headings; legal + social at bottom.

## Web app navigation (dashboards/SaaS)

- Left sidebar = default for 6+ destinations; collapsible to icon rail; group with section labels after ~7 items.
- Persistent global elements: search (⌘K command palette is now expected in pro tools), account menu, notifications.
- Breadcrumbs for hierarchies ≥3 levels deep; current page is plain text, not a link.
- Active state must be unmistakable: accent bar/fill + bolded label, not color alone.

## Cross-cutting rules

- Current location must always be visible (active tab, highlighted item, breadcrumb, page title).
- Navigation labels: nouns, 1–2 words, front-loaded keywords, no jargon or cleverness ("Pricing", not "Investment").
- URLs (web): navigation state should be linkable/back-button-safe — filters, tabs, and pagination belong in the URL.
- Keyboard: full tab-order coverage, skip-to-content link, arrow-key support within menus, Escape closes overlays.
- Touch: nav targets ≥44px; hit areas larger than the visible icon.

## Anti-patterns

- Icon-only navigation without labels (except universally-known: search, settings — and even then, tooltip/aria-label).
- Mixing patterns: tab bar + hamburger + FAB all competing.
- Scroll-jacking, auto-playing carousels as navigation, hover-only disclosure on touch devices.
- Hiding primary navigation behind gestures with no visible affordance.
- Deep nesting (>3 levels) in mobile IA — flatten with hubs or search.
