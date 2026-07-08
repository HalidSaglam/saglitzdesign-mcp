---
id: web-dashboards
title: "Web App Dashboard Patterns (Sidebar + Data Cards)"
category: pattern
platform: web
tags: [dashboard, sidebar, navigation, cards, app-shell, data]
sources:
  - "https://mobbin.com/screens/1c5de4d2-cf69-44e3-8352-55790c400acb"
  - "https://mobbin.com/screens/bcbc434d-f7e8-44f4-a17a-a00655f0ca4b"
  - "https://mobbin.com/screens/79f37f27-f1f0-4d31-96ec-899917cb9aa4"
  - "https://mobbin.com/screens/cd6232db-c7ee-4756-a78d-d7b11f772a74"
  - "https://mobbin.com/screens/4560f04c-5d7c-4a1c-9316-088ec410a8fb"
  - "https://mobbin.com/screens/f89c973f-b307-4129-a88b-f4ff50b6807f"
  - "https://mobbin.com/screens/8e9ffe26-ef22-4540-b5e4-101f78abf96a"
updated: 2026-07-08
---

# Web App Dashboard Patterns (Sidebar + Data Cards)

Derived from Mobbin web screens of Frame, Dovetail, Felt, Sana AI (two
screens), Amplitude, and Asana (July 2026 research pass).

## Observed patterns

### 1. The universal shell: left sidebar + main canvas
Every sampled product uses a fixed left sidebar (~220–260px) over a wide
content region.
[Asana](https://mobbin.com/screens/8e9ffe26-ef22-4540-b5e4-101f78abf96a)
(dark sidebar, light canvas) groups nav as: top-level (Home, My tasks,
Inbox) → labeled groups ("Insights", "Starred", "Projects", "Team") with
"+" add-buttons per group.
[Felt](https://mobbin.com/screens/79f37f27-f1f0-4d31-96ec-899917cb9aa4)
(light sidebar): workspace switcher at top, Recents/Drafts/Settings/Invite
members/Help, then a "Projects" group.
[Amplitude](https://mobbin.com/screens/f89c973f-b307-4129-a88b-f4ff50b6807f)
nests collapsible groups (Tracking Plan → Events/Properties/Filters;
Connections → Sources/Destinations) and pins Pricing/Settings at the bottom.

### 2. Sidebar anatomy (top → bottom)
Consistent slots across samples:
1. Workspace/account switcher or logo (Frame's app picker, Felt's
   workspace dropdown, Amplitude's project + branch selectors).
2. Primary create action near the top — Amplitude and Asana both place a
   prominent "+ Create" button in the top bar/sidebar head; Felt uses a red
   "New map" button in the content header instead.
3. Personal/nav items (Home, Recents, Inbox, Search).
4. Labeled, collapsible groups for user content (Projects, Collections)
   with color-dot or emoji identifiers (Sana AI's colored collection dots,
   Asana's colored project squares).
5. Bottom-pinned utility: Settings, Help, and monetization/trial cards.

### 3. Trial/upsell cards live at the sidebar bottom
[Felt](https://mobbin.com/screens/79f37f27-f1f0-4d31-96ec-899917cb9aa4)
shows a blue tinted card ("2 days left in your Enterprise trial" + "Talk to
Sales" button); Asana shows "Advanced free trial — 5 days left" with an
amber "Add billing info" button;
[Sana AI](https://mobbin.com/screens/4560f04c-5d7c-4a1c-9316-088ec410a8fb)
shows a credits meter ("100 credits left today"). The pattern: persistent
but non-blocking, pinned to the sidebar's bottom edge.

### 4. Content canvas: card grids for browse, widgets for metrics
- **Document/asset grids**:
  [Dovetail](https://mobbin.com/screens/bcbc434d-f7e8-44f4-a17a-a00655f0ca4b)
  and [Frame](https://mobbin.com/screens/1c5de4d2-cf69-44e3-8352-55790c400acb)
  show 3–4-column card grids where each card = preview/summary + bold title
  + author/timestamp metadata. Empty grid cells become dashed or ghosted
  action cards ("+ New note", "Import data") — onboarding embedded in the
  grid itself.
- **Map/asset thumbnails**: Felt's grid uses large colorful map thumbnails
  + name + "Last viewed X days ago", with a "Welcome to Felt!" dismissible
  onboarding row of video cards on first run.
- **Metric widgets**: Asana's "New dashboard" screen is a 2-column widget
  grid (area chart, bar chart) with per-widget filter chips ("1 Filter ·
  Tasks in 1 project"), legends, and "Add widget" affordance. Amplitude's
  home mixes "Quick actions" shortcut cards, a "Project quota" card with
  progress bars (0.1% / 2.3% used), and a "Recent activity" feed.

### 5. Home-as-launcher for AI products
[Sana AI](https://mobbin.com/screens/cd6232db-c7ee-4756-a78d-d7b11f772a74)
centers a greeting ("Hello, Jane — How can I help you today?"), a row of
suggested-task cards (some with thumbnails), and a persistent omnibox
("Ask or search for anything…") pinned at the bottom. The dashboard is a
starting point, not a report.

### 6. Visual language
- Light neutral canvases (white/#FAFAFA); sidebars either same-tone with a
  hairline divider (Felt, Dovetail, Sana) or dark inverted (Asana, Linear
  style; Sana AI also ships a dark variant).
- Cards: white, 1px light-gray border or very soft shadow, 8–12px radius,
  consistent internal padding; selected/hover states use tinted fills
  (Felt's pink "Recents" active row, Amplitude's blue active "Home").
- Exactly one saturated accent for the primary action (Felt red, Amplitude
  blue, Asana coral "+ Create") — everything else stays gray-scale.
- Active nav item = tinted pill + colored icon/text, never just bold.

## Design rules derived

**Do**
- Use the standard shell: sidebar (switcher → create → nav → groups →
  pinned utilities) + top bar (search/breadcrumb + share/invite/profile) +
  card-based canvas.
- Make "create new X" the single most prominent colored control on screen.
- Group sidebar links under small-caps/muted labels; make user-content
  groups collapsible with inline "+" actions.
- Give every card grid an embedded empty/action card so blank space
  teaches ("+ New note", "Create project").
- Show recency metadata ("Last viewed 3 days ago") on asset cards — it's
  the primary re-entry scent.
- Pin trial status, quotas, or credits as a compact card at the sidebar
  bottom with one clear CTA.
- For metric widgets: title, chart, legend, and a filter-context line per
  widget; allow adding/rearranging widgets.
- Include global search prominently (Asana's centered top search, Dovetail's
  full-width "Search and discover", Sana's omnibox).
- Add a dismissible first-run row (welcome videos/checklist) rather than a
  modal tour (Felt).

**Don't**
- Don't exceed ~2 levels of sidebar nesting (Amplitude's group → item is
  the observed max).
- Don't scatter multiple saturated accent colors across the canvas; charts
  may be colorful, chrome may not.
- Don't hide the create action inside menus.
- Don't ship blank empty states — every sampled product fills first-run
  space with templates, demos, or sample content (Frame's pre-seeded docs,
  Dovetail's sample video, Sana's demo tasks).

## Anti-patterns

- **Dashboard-as-wall-of-KPIs**: none of the sampled homes lead with dense
  stat tiles; they lead with the user's recent work or next action.
  Metrics live in dedicated dashboard/reporting views (Asana) or scoped
  cards (Amplitude quota).
- **Mystery-meat icon-only sidebars** for primary nav — all samples pair
  icons with labels at default width.
- **Blocking upsells**: trial/paywall prompts are pinned cards, never
  modals covering the canvas.
- **Inconsistent card anatomy in one grid** (mixed metadata, misaligned
  titles) — grids read as broken; Dovetail/Felt keep every card identical.
- **Top-nav-only app chrome** for multi-object products; the sidebar is the
  de facto standard for anything with projects/collections/spaces.
