---
id: ai-product-ux
title: "AI Product UX — Designing Chat, Streaming & Agentic Interfaces"
category: ux
platform: both
tags: [ai, llm, chat, streaming, agentic, conversational, trust]
sources: ["https://www.shapeof.ai/", "https://www.shapeof.ai/patterns/citations", "https://www.nngroup.com/articles/ai-hallucinations/", "https://aiuxplayground.com/pattern/streaming/", "https://agentic-design.ai/patterns/ui-ux-patterns", "https://ai-sdk.dev/docs/ai-sdk-ui/chatbot", "https://developer.apple.com/design/human-interface-guidelines/machine-learning", "https://www.nngroup.com/articles/ux-reset-2025/"]
updated: 2026-07-13
---

# AI Product UX — Designing Chat, Streaming & Agentic Interfaces

LLM-powered products break classic UX assumptions: output is non-deterministic, latency is measured in seconds not milliseconds, and the system can be confidently wrong. Good AI UX compensates for these with three disciplines — make waiting feel productive, make output verifiable, and keep the human in control. This doc is prescriptive: treat the model as a fallible collaborator the interface must frame, not a black box you drop into a text box.

## Conversational & chat layout

- Assistant messages left/full-width, user messages right-aligned or visually distinct — but don't force a bubble metaphor for long-form output. Long answers read better as full-width documents than as chat bubbles.
- Render markdown properly: headings, lists, tables, and **syntax-highlighted code blocks** with a one-tap copy button per block. Raw markdown asterisks are a ship-blocker.
- Message-level actions on hover/tap: copy, regenerate, edit (user turns), thumbs up/down, and share. Keep them quiet until hovered; never let 6 icons compete with the text.
- Anchor scroll to the newest content and pin an unobtrusive "scroll to bottom" button while streaming so users can read back without fighting auto-scroll.
- Preserve and expose conversation history in a sidebar; allow rename, delete, and (where relevant) branching or forking a conversation from any turn.

### Input affordances

- Multi-line by default: grow the box with content, Enter sends, Shift+Enter for newline (or the inverse on mobile — Enter = newline, explicit send button). State the convention with a hint the first time.
- The send button becomes a **stop-generation** button while the model streams. Interruptibility is mandatory, not optional — users must be able to cut off a wrong or overlong answer instantly and keep the partial text.
- Attachments (files, images, audio) via a clearly labelled affordance; show upload progress, thumbnails, type/size limits, and a remove control before send.
- Slash commands and @-mentions for power actions (`/summarize`, `@doc`) with an autocomplete menu; keep them discoverable but never required for the core flow.
- Suggested / starter prompts as tappable chips below the input — 3–5, showcasing *different* capabilities, refreshed by context. They solve the blank-prompt problem (see empty states).

## Streaming & perceived performance

Token streaming is the single highest-leverage latency technique in AI UX. Nielsen's thresholds still govern perception: ~100ms feels instant, ~1s keeps flow, and disengagement climbs past ~10s. Few LLM responses meet 1s end-to-end, so the goal is **time-to-first-token**, not time-to-complete.

- Stream text token-by-token as it generates. Perceived wait collapses because the user starts reading immediately and the response never feels frozen. Target first token under ~1s; show an indicator before it arrives.
- Show a distinct state before the first token (animated cursor, shimmer, or "Thinking…") so the gap between send and stream never reads as a hang.
- Prefer **streaming text over skeletons** for prose. Reserve skeletons/placeholders for structured or non-text output (an image grid, a table) where partial tokens would look broken.
- Stream only what benefits from it. **Batch (don't stream)** short deterministic results, JSON the UI must parse before rendering, or anything where flicker/reflow hurts more than immediacy helps.
- Expose "thinking" and tool-call transparency: a collapsible reasoning/status trail ("Searching the web…", "Reading 3 files…") reassures during long tasks. Default it collapsed; let users expand. Research shows visible progress lowers perceived wait even when total time is unchanged.
- Keep the UI responsive during generation — input focus, scroll, and stop must never block on the stream.
- Never fake progress bars for open-ended generation; indeterminate motion is honest, a fake 43% is not. See [[motion-microinteractions]].

## Trust & verifiability

- **Citations** are the backbone of trust for retrieval/answer products. Attach sources inline (numbered or chip) linking to the exact PDF page, URL, or record. Make claims traceable, and prefer extractive grounding over unsourced synthesis for factual queries.
- Verify citations before shipping: a source that doesn't exist, or exists but doesn't support the claim, destroys trust faster than no citation at all.
- Offer an "inspect / why this answer" affordance — expand retrieved context, the reasoning trail, or the parameters used. Let curious or skeptical users audit without cluttering the default view.
- Avoid false authority. Confident tone on uncertain content is a design bug. Calibrate voice to certainty; surface confidence signals (source count, "based on your uploaded docs only") rather than a bare number users can't interpret.
- Label AI-generated content where mistaking it for human or authoritative output could cause harm (medical, legal, financial). Set expectations at the boundary, not buried in a settings page.

## Hallucination & error handling

Design for the assumption that some output will be wrong. Per NN/G, hallucinations are inherent to generative models, so recovery paths — not just prevention — are the deliverable.

- Make every answer cheap to correct: **Regenerate**, **Edit prompt**, **Copy**, and (where apt) "Try again with more detail" on every response.
- Teach the model — and the UI — to say **"I'm not sure"** gracefully. A scoped, honest non-answer with a next step beats a fluent fabrication. Design a real "no results / can't help with that" state.
- Distinguish error classes and give each a next best action: provider/network error → retry; policy/moderation block → explain briefly and non-judgmentally; context-limit → offer to shorten or summarize; bad input → point at the fix.
- Content-moderation and refusal states should be calm and specific, never a scary red wall. Explain what and (lightly) why, and offer an allowed path forward. See [[ux-writing]].
- Guardrail messaging: when the model declines or a guardrail fires, own it in plain language; don't blame the user or expose raw error codes.

## Empty states & onboarding

The blank prompt box is the biggest drop-off point in AI products — users don't know what to type or what the system can do.

- Never ship a bare cursor. A first-run AI empty state does three jobs: state what this assistant is for, show 3–6 concrete example prompts, and give one obvious first action. See [[empty-states-buttons]].
- Example prompts must be **real, runnable, and diverse** — cover distinct capabilities so users infer the range, not one trick. Refresh them by context (selected file, current page, role).
- Teach capability *in context*, at first encounter, over upfront tours. Reveal slash commands, attachments, and modes the moment they become relevant.
- Show the boundary: a short, honest line on what the assistant can't or won't do prevents the worst first impressions.
- Optimize for time-to-value: get the user to one successful, useful generation as fast as possible — outcome before education. See [[conversion-ux]].

## Feedback, steering & memory

- Thumbs up/down on every response, with an optional "tell us more" on down-votes (too long, wrong, unsafe, didn't follow instructions). Close the loop visibly so feedback feels heard.
- Support **steering**: let users edit their prompt and re-run, or reply "make it shorter / more formal" — conversational correction is the primary repair mechanism.
- Personalization & memory must be user-visible and user-controllable: show what the system remembers, let users view, edit, and delete memories, and make it obvious when a response used stored context. Provide an off switch and a per-session incognito mode.
- Never silently train on or store sensitive input without clear disclosure and control. Privacy defaults are a trust decision, not a legal footnote.

## Agentic UX

Agentic products act over multiple steps and call tools — the interface must expose the plan, the actions, and the controls to intervene.

- **Show the plan** before or during execution: the steps the agent intends to take, updated live. Users need to see where they are in a multi-step run and what's next.
- **Tool-use disclosure**: surface each tool call and its result ("Ran search → 8 results", "Editing config.yaml") as an inspectable, collapsible trail — enough to build trust, not so much it becomes noise.
- **Human-in-the-loop approval gates** on consequential or irreversible actions (send email, spend money, delete data, write to prod). Pause, show exactly what will happen, and require explicit approve/reject. Offer "approve all for this run" only with a clear scope and an easy revoke.
- **Interruptibility & undo**: a persistent stop/pause; the ability to redirect mid-run; and undo or a preview-before-commit for anything that changes state. Prefer reversible actions and dry-run previews.
- **Recovery routing**: when a step fails, don't dead-end — show what failed, let the user retry, edit, skip, or take over manually.
- Match autonomy to stakes and confidence: low-risk, high-confidence steps can run silently; high-risk steps always ask. Never let an agent surprise the user with a consequential action.

## Input, models & settings

- Prompt box is the primary surface — invest in it: comfortable target size, clear affordances, and it should never feel like a cramped search bar for a serious tool.
- Model/mode selectors (e.g. Fast / Balanced / Thinking) belong near the input when they change behavior users feel. Name modes by outcome ("Faster" / "More thorough"), not by opaque model IDs.
- **Hide raw parameters by default.** Temperature, top-p, token limits, and system prompts are for advanced/developer surfaces — expose them behind an "Advanced" disclosure, never in the default consumer path. Most users can't map "temperature 0.9" to a result.
- Persist sensible defaults; when you do expose a control, explain its effect in plain language and show the consequence.

## Accessibility & responsibility

- Announce streaming output to screen readers with an `aria-live` region (polite), but throttle — don't fire a new announcement per token. Announce meaningful chunks or the settled message. See [[accessibility]].
- Every control needs a name and keyboard path: send, stop, regenerate, copy, expand-reasoning, approve/reject. Full keyboard operation of the whole conversation is required.
- Respect reduced-motion for streaming cursors, shimmer, and typing animations. Contrast and target sizes follow WCAG regardless of the "AI" framing.
- Don't hide critical info in color alone (confidence, error vs. warning states). Provide text labels.
- Set honest expectations, disclose AI involvement where it matters, and design refusals and safety states to protect the user, not just the platform. See [[principles-heuristics]] and [[mobile-ux]] for platform ergonomics.

## Checklist

- [ ] First token streams in under ~1s; a distinct "thinking" state shows before it.
- [ ] A stop-generation control is always available while streaming, and partial output is kept on stop.
- [ ] Multi-line input with a stated send/newline convention; markdown and code blocks render with per-block copy.
- [ ] Empty state shows purpose + 3–6 real, diverse example prompts + one clear first action.
- [ ] Every response has copy, regenerate, edit, and thumbs up/down actions.
- [ ] Factual answers carry verifiable citations that link to the actual source and have been checked.
- [ ] An "inspect / why this answer" path exists to expand reasoning, sources, or context.
- [ ] The model has a graceful "I'm not sure" / no-answer state with a next step.
- [ ] Error classes (network, policy, context-limit, bad input) each give a specific next best action.
- [ ] Agentic runs show the plan, disclose tool calls, and gate consequential actions behind human approval.
- [ ] Consequential agent actions are reversible, previewable, or undoable; a persistent stop/pause exists.
- [ ] Memory/personalization is visible, editable, deletable, and has an off switch.
- [ ] Streaming output is announced to screen readers via throttled `aria-live`; full keyboard operation works.
- [ ] Raw model parameters (temperature, etc.) are hidden behind an advanced disclosure, not in the default path.
- [ ] Reduced-motion is respected for streaming and typing animations.

## Anti-patterns

- **Send with no stop.** Trapping the user through a long, wrong answer with no way to interrupt.
- **Frozen wait.** Blank screen or spinner with no streaming and no first-token feedback for multi-second generations.
- **Fake progress.** A determinate progress bar or fake percentage for open-ended, unpredictable generation.
- **Bare prompt box.** Launching users into an empty cursor with no examples, capabilities, or first action.
- **Confident hallucination.** Fluent, authoritative tone on unverified content; citations that are missing, broken, or don't support the claim.
- **Unverifiable answers.** No sources, no way to inspect reasoning, no path to check where an answer came from.
- **Raw markdown / unstyled code.** Shipping asterisks and unhighlighted, uncopyable code blocks.
- **Silent agent actions.** An agent sending, buying, deleting, or writing to prod with no plan shown and no approval gate.
- **Dead-end errors.** Raw error codes, scary red walls, or refusals that blame the user with no way forward.
- **Exposed knobs.** Dumping temperature, top-p, and system-prompt fields into the default consumer UI.
- **Invisible memory.** Storing or reusing personal context with no disclosure, view, or delete control.
- **Token-spam screen readers.** Firing an `aria-live` announcement on every streamed token.
