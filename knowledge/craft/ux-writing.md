---
id: ux-writing
title: "UX Writing — Interface Copy That Reduces Cognitive Load"
category: craft
platform: both
tags: [ux-writing, microcopy, errors, empty-states, cognitive-load]
sources: ["impeccable design skill (local)"]
updated: 2026-07-08
---

# UX Writing — Interface Copy That Reduces Cognitive Load

Good UX writing is invisible: users understand instantly without noticing the words. Vague copy creates support tickets and abandonment; specific copy gets users through the task.

## The six clarity rules (apply to every string)

1. **Be specific:** "Enter email," not "Enter value."
2. **Be concise:** cut every unnecessary word, but never at the cost of clarity.
3. **Be active:** "Save changes," not "Changes will be saved."
4. **Be human:** plain language, no system-speak ("System error encountered").
5. **Tell users what to do next**, not just what happened.
6. **Be consistent:** one term per concept, everywhere. Variety creates confusion.

## Button and CTA labels

**Never "OK", "Submit", "Yes/No", or "Click here."** Use verb + object that names the outcome:

| Bad | Good | Why |
|---|---|---|
| OK | Save changes | Says what will happen |
| Submit | Create account | Outcome-focused |
| Yes | Delete message | Confirms the specific action |
| Cancel | Keep editing | Disambiguates what "cancel" means |
| Click here | Download PDF | Describes the destination |

Destructive actions name the destruction: **"Delete" not "Remove"** (delete = permanent; remove implies recoverable), and **show the count** — "Delete 5 items," not "Delete selected."

## Error messages — the formula

Every error answers three questions: **(1) What happened? (2) Why? (3) How do I fix it?**

"Email address isn't valid. Please include an @ symbol." — never "Invalid input."

Templates by situation:

| Situation | Template |
|---|---|
| Format error | "[Field] needs to be [format]. Example: [example]" |
| Missing required | "Please enter [what's missing]" |
| Permission denied | "You don't have access to [thing]. [What to do instead]" |
| Network error | "We couldn't reach [thing]. Check your connection and [action]." |
| Server error | "Something went wrong on our end. We're looking into it. [Alternative action]" |

Hard rules:
- **Never blame the user.** "Please enter a date in MM/DD/YYYY format," not "You entered an invalid date."
- **Never humor in errors.** Users are already frustrated; be helpful, not cute.
- No error codes shown to users; plain language only.
- Place the error next to its source, connected via `aria-describedby`, and **never wipe the user's form**.
- Include an example when the fix isn't obvious; link help when it exists.

## Empty states are onboarding moments

Three beats: **(1) acknowledge briefly, (2) explain the value of filling it, (3) give one clear action.**

"No projects yet. Create your first project to get started." — never a bare "No items." An empty state with no action is a dead end.

## Loading and waiting

- **Be specific about the work:** "Saving your draft…" not "Loading…".
- **Set expectations for long waits:** "Analyzing your data… this usually takes 30–60 seconds." Show progress when possible; offer Cancel where appropriate.
- **Ban AI-slop loading copy** ("Herding pixels", "Teaching robots to dance", "Consulting the magic 8-ball") — instantly recognizable as machine-generated. Write messages about what the product actually does: "Syncing with your team's changes…".

## Success messages

Confirm what happened + what happens next, briefly: "Settings saved! Your changes take effect immediately." Match the emotional size of the moment — celebrate big wins, stay quiet for routine saves.

## Confirmation dialogs: undo beats confirm

Most confirmation dialogs are design failures — users click through them mindlessly. Prefer: act immediately, show an undo toast, commit when the toast expires. Reserve confirmation for truly irreversible actions (account deletion), high-cost actions, or batch operations.

When you must confirm: name the specific object and consequence — "Delete 'Project Alpha'? This can't be undone." — with specific buttons ("Delete project" / "Keep project"), never "Are you sure?" + Yes/No.

## Forms

- **Placeholders are not labels** — they vanish on input. Always visible `<label>` elements.
- Show format via placeholder example, not instruction text: label "Date of birth", placeholder "MM/DD/YYYY".
- Explain *why* you're asking when it isn't obvious ("We use this to calculate local taxes").
- Instructions before the field, not after. Validate on blur, not per keystroke (exception: password strength).

## Help text and tooltips

Add value beyond the label — answer the implicit question ("What is this?" / "Why do you need it?"). "Choose a username. You can change this later in Settings." Never restate the label ("This is the username field").

## Navigation and wayfinding

Specific, descriptive labels users' language would produce: "Your projects", "Team members" — never internal jargon or generic "Items/Stuff". Always show current location (breadcrumbs, active states, progress indicators) so users never build a mental map from memory.

## Voice vs tone

**Voice** = brand personality, constant everywhere. **Tone** = adapts to the user's moment:

| Moment | Tone |
|---|---|
| Success | Celebratory, brief: "Done! Your changes are live." |
| Error | Empathetic, helpful: "That didn't work. Here's what to try…" |
| Loading | Reassuring: "Saving your work…" |
| Destructive confirm | Serious, unambiguous: "Delete this project? This can't be undone." |

Playful voice is a brand choice (a bank can be warm, not wacky) — but tone always sobers up at errors and destructive moments.

## Terminology discipline

Pick one term per concept and enforce it with a glossary:

| Inconsistent | Pick one |
|---|---|
| Delete / Remove / Trash | Delete |
| Settings / Preferences / Options | Settings |
| Sign in / Log in / Enter | Sign in |
| Create / Add / New | Create |

Also enforce: one capitalization scheme (Title Case vs Sentence case), one punctuation rule (periods on sentences, not labels), same nouns as neighboring features (a "Workspace" here must not be a "Project" there).

## Kill redundancy

If the heading explains it, the intro paragraph is redundant. If the button is clear, don't caption it. Say it once, say it well.

## Writing for accessibility

- **Link text stands alone:** "View pricing plans," never "Click here" (screen readers list links out of context).
- **Alt text carries the information, not the image:** "Revenue increased 40% in Q4," not "Chart." Decorative images get `alt=""`.
- **Icon-only buttons need `aria-label`.**

## Writing for translation

- Plan for expansion: German +30%, French +20%, Finnish +30–40%, Chinese −30% characters (but similar width). Layouts must absorb this.
- Keep numbers out of sentence templates: "New messages: 3" survives word-order changes; "You have 3 new messages" doesn't.
- Full sentences as single strings; no concatenation. No abbreviations ("5 minutes ago", not "5 mins ago"). Give translators context about where each string appears.

## Cognitive load: the language layer

Copy is a primary cognitive-load lever. Three load types:
- **Intrinsic** (the task itself): can't remove — structure it. Break into steps, provide defaults/templates/examples, group related decisions, progressively disclose.
- **Extraneous** (bad design/writing): pure waste — **eliminate ruthlessly**. Jargon forcing translation effort, unclear labels forcing guesses, redundant text competing for attention, inconsistent patterns preventing learning.
- **Germane** (learning effort): good load — support it with consistent patterns, feedback that confirms understanding, and onboarding that teaches through action, not text walls.

### The working-memory rule: ≤4

Humans hold about 4 items in working memory (Cowan's revision of Miller). At any decision point count what the user must simultaneously consider:
- **≤4:** manageable · **5–7:** pushing it — group or disclose progressively · **8+:** overloaded; users skip, misclick, abandon.

Practical caps:
- Navigation: **≤5 top-level items** (group the rest under clear categories)
- Form sections: **≤4 fields per visual group**
- Actions: **1 primary + 1–2 secondary**; the rest go in a menu
- Dashboards: **≤4 key metrics** visible without scrolling
- Pricing: **≤3 tiers** (more = analysis paralysis)

### The 8-point cognitive load checklist

- [ ] Single focus: primary task completable without competing distractions
- [ ] Chunking: information grouped in digestible units (≤4 per group)
- [ ] Grouping: related items visually together (proximity, borders, shared background)
- [ ] Hierarchy: what matters most is immediately clear
- [ ] One decision at a time before the next
- [ ] Minimal choices: ≤4 visible options per decision point
- [ ] No memory bridges: nothing must be remembered from a previous screen
- [ ] Progressive disclosure: complexity revealed only when needed

**Score by failures: 0–1 = low load (good) · 2–3 = moderate (address soon) · 4+ = high (critical fix).**

### Eight named violations and their fixes

1. **Wall of Options** — 10+ undifferentiated choices → categorize, highlight a recommended pick, disclose progressively.
2. **Memory Bridge** — step 3 needs info from step 1 → keep context visible or repeat it where needed.
3. **Hidden Navigation** — user must build a mental map → always show current location.
4. **Jargon Barrier** — domain terms force translation → plain language; define unavoidable terms inline.
5. **Visual Noise Floor** — everything equal weight → one primary element, 2–3 secondary, everything else muted.
6. **Inconsistent Pattern** — same action works differently in different places → standardize; same action type = same UI.
7. **Multi-Task Demand** — reading + deciding + navigating simultaneously → sequence into single steps.
8. **Context Switch** — hopping between screens to gather info for one decision → co-locate the information each decision needs.

## Copy verification

Before shipping any string: Can it be understood without context? Does the user know what to do next? Is it as short as clarity allows? Does it match terminology elsewhere? Is the tone right for the user's emotional moment?
