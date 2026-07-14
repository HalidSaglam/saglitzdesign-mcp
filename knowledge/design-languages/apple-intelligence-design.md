---
id: apple-intelligence-design
title: "Apple Intelligence Design — AI Features on iOS & macOS"
category: design-language
platform: both
tags: [apple-intelligence, ai, foundation-models, writing-tools, siri, app-intents, on-device, ios, macos]
sources: ["https://developer.apple.com/apple-intelligence/", "https://developer.apple.com/design/human-interface-guidelines/generative-ai", "https://developer.apple.com/design/human-interface-guidelines/machine-learning", "https://developer.apple.com/documentation/foundationmodels", "https://developer.apple.com/documentation/appintents", "https://github.com/apple/foundation-models-utilities"]
updated: 2026-07-14
---

# Apple Intelligence Design — AI Features on iOS & macOS

Designing AI features on Apple platforms is not the same as building a chatbot. Apple's model is **AI woven into the existing UI** — acting on the user's content, in place, with system components — not a separate assistant screen. This doc covers the Apple-specific conventions; for cross-platform AI UX fundamentals (chat, streaming, trust, agentic flows) see [[ai-product-ux]], and for the platforms themselves see [[ios-app-design]], [[macos-app-design]], [[apple-hig-liquid-glass]].

## The core principle: augment in place, don't bolt on a bot

Apple Intelligence surfaces AI **where the user already is** — Writing Tools inside any text field, summaries at the top of Mail/Notifications, Genmoji in the keyboard. The design lesson for your app: prefer inline, contextual AI actions over a standalone "AI chat" tab. Ask "what can the AI do *to the thing the user is looking at*?" before "what would the user type to a bot?". Reserve a conversational surface only when the task genuinely is open-ended dialogue.

## The system surfaces you get (and should design for)

- **Writing Tools** — system-wide proofread / rewrite / summarize / change-tone on any editable (and much selectable) text. If you use standard text controls (`UITextView`/`TextEditor`), your app inherits it. Design implication: don't reinvent a "rewrite" button; make sure your text views are standard so users get it for free, and test that your content survives a rewrite.
- **Genmoji & Image Playground** — custom emoji and image generation from the keyboard / a system sheet. If you support rich text/stickers, accept Genmoji as image glyphs.
- **Siri & "type to Siri"** — the redesigned Siri (screen-edge glow, onscreen awareness, personal context). You plug in via **App Intents**, not a custom voice UI.
- **Notification & content summaries, Smart Reply, priority notifications** — surface concise, glanceable output; design your notification content to summarize well.

## App Intents: the real integration point

The way your app becomes "intelligent" on Apple platforms is by exposing its capabilities as **App Intents** — so Siri, Spotlight, Shortcuts, and Apple Intelligence can invoke them. This is a *design* task, not just an engineering one:
- Model your app's key actions as intents with clear, natural-language-friendly names and parameters.
- Provide meaningful parameter summaries and results so the system can compose and confirm them.
- Design the confirmation / disambiguation UI for actions that are destructive or ambiguous (human-in-the-loop). See [[ethical-design]] for not letting an agent take consequential actions silently.

## On-device with Foundation Models: design implications

Apple's **Foundation Models framework** runs a ~3B on-device model (with Private Cloud Compute for heavier asks). What it means for design:
- **Privacy is the headline feature** — processing happens on device. Say so, plainly, where users decide to use an AI feature ("Processed on your iPhone"). Don't overclaim; if a request escalates to Private Cloud Compute, the system communicates it.
- **On-device = fast, offline, free of per-token cost, but bounded** (small context window, focused tasks). Design AI features as *specific, scoped helpers* (summarize this note, tag this photo, draft this reply) rather than an open-ended oracle.
- **Guided generation & tool calling** produce structured output — design UI that renders the structure (fields, chips, lists), not a wall of text.
- Choose on-device vs a hosted model deliberately; the community `foundation-models-utilities` package even offers a chat-completions client to a hosted model when the task exceeds on-device limits.

## The visual language of "intelligence"

- **The iridescent edge glow** (the multicolor light that traces the screen/element border) is the system signature that Apple Intelligence is active. Don't fake or clone it for unrelated features; align with it when your feature is genuinely Apple-Intelligence-powered.
- **Generating states:** use a shimmer / animated gradient over the forming text, and stream tokens in — never a dead spinner while a long generation runs. Pair with SF Symbols **symbol effects** for feedback. See [[ai-product-ux]] and [[motion-microinteractions]].
- **Restraint & no anthropomorphizing** — Apple's tone is "a helpful system capability," not a character. No googly-eyed mascots, no "I think…" first-person bot persona for in-place tools. Match it.

## Trust, correction, and error states

- **Always let the user review and edit** AI output before it's committed (Writing Tools shows the rewrite for approval; do the same). Never silently replace the user's content.
- **Make AI output identifiable** and reversible (undo). Offer regenerate / revert.
- **Communicate uncertainty and limits** honestly; design a graceful "couldn't do that" rather than a confident wrong answer. See [[ai-product-ux]] (hallucination handling).
- **Set expectations at first use** with a light primer (what it does, that it's on-device, that output should be reviewed) — tie into your onboarding, see [[onboarding-permission-priming]].

## Accessibility & inclusion
AI features must work with VoiceOver, Dynamic Type, and Reduce Motion (the edge-glow and shimmer need reduced-motion fallbacks). Announce generating/complete states to assistive tech. Ensure generated content (Genmoji, summaries) has accessible descriptions. See [[accessibility]].

## Checklist
- [ ] AI actions surface **in place** (on the user's current content) before any standalone chat UI.
- [ ] Standard text controls used, so **Writing Tools** works; content survives a rewrite.
- [ ] Key app actions exposed as **App Intents** with natural names, summaries, and confirmation for consequential ones.
- [ ] On-device processing (privacy) communicated plainly and accurately where the user opts in.
- [ ] AI features scoped to specific tasks that fit an on-device model; structured output rendered as UI, not raw text.
- [ ] Generating state streams + shimmers (no dead spinner); SF Symbols effects for feedback; Reduce-Motion fallback.
- [ ] Every AI output is reviewable, editable, undoable, and clearly identifiable as generated.
- [ ] Tone is a calm system capability — no anthropomorized bot persona for in-place tools.
- [ ] First-use primer sets expectations; VoiceOver/Dynamic Type/Reduce-Motion all supported.

## Anti-patterns
- **Bolting a generic chatbot tab onto an app** whose real value is inline assistance — ignoring Apple's augment-in-place model.
- **Reinventing Writing Tools / Genmoji** with a worse custom version instead of adopting the system ones.
- **Silently replacing user content** with AI output, or auto-taking consequential actions via an intent without confirmation.
- **Cloning the Apple Intelligence edge-glow** for a feature that isn't Apple-Intelligence-powered (misleading), or over-animating it with no Reduce-Motion fallback.
- **Overclaiming privacy** ("100% private") when requests may escalate to the cloud, or making privacy claims the system doesn't back.
- **Dead spinners** during generation instead of streaming/shimmer; unlabeled generating states for assistive tech.
- **Anthropomorphizing** in-place tools with a chatty first-person persona and mascots.
- **Treating the on-device model as an unbounded oracle** — cramming huge context or open-ended tasks it can't serve, then shipping confident wrong output.
