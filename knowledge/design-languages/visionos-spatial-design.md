---
id: visionos-spatial-design
title: "visionOS & Spatial Design — Designing for Apple Vision Pro"
category: design-language
platform: both
tags: [visionos, spatial, vision-pro, ar, vr, gaze, immersive]
sources: ["https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos", "https://developer.apple.com/design/human-interface-guidelines/eyes", "https://developer.apple.com/design/human-interface-guidelines/gestures", "https://developer.apple.com/design/human-interface-guidelines/spatial-layout", "https://developer.apple.com/design/human-interface-guidelines/immersive-experiences", "https://developer.apple.com/design/human-interface-guidelines/ornaments", "https://developer.apple.com/design/human-interface-guidelines/materials", "https://developer.apple.com/videos/play/wwdc2023/10073/", "https://developer.apple.com/videos/play/wwdc2025/303/"]
updated: 2026-07-23
---

# visionOS & Spatial Design — Designing for Apple Vision Pro

visionOS runs apps in the space around the user rather than on a flat screen: interfaces are lit by the room, sit at real distances, and are driven by where you look and a pinch of the fingers. The design job is different from a phone — you are placing content in a person's physical environment and asking their eyes and neck to do the work, so comfort, depth legibility, and gaze-friendly targets matter more than pixel density. Start familiar (a window that behaves like an app), then earn immersion. Related: [[ios-app-design]], [[apple-hig-liquid-glass]].

## The spatial paradigm: windows, volumes, immersive spaces

visionOS gives you three container types. Reach for the smallest one that does the job.

- **Windows** — flat, resizable SwiftUI surfaces with glass backing. The default and the right starting point for nearly every app; content, browsing, forms, and reading all belong here. Users place them in space and they stay put.
- **Volumes** — bounded 3D containers for content that benefits from depth (a 3D model, a board game, a globe). Viewable from multiple angles and from the side. Use when the object *is* the content, not for decoration.
- **Immersive Spaces** — the app takes over placement in a defined region or the whole surroundings. Three styles: **mixed** (content blended with passthrough), **progressive** (a partial, Digital-Crown-adjustable portal), and **full** (passthrough replaced entirely).

**Shared Space vs Full Space.** By default apps run in the **Shared Space** — multiple apps' windows and volumes coexist, like several windows on a desk. Opening a Full Space (an Immersive Space presented exclusively) hides other apps to give you a controlled scene. Rule: **stay in the Shared Space** for productivity, media browsing, and anything a user does alongside other apps; **request a Full Space** only for focused, immersive moments (a workout, a theater, a 3D editing scene) and hand control back promptly. Never open into full immersion on launch.

**Quick decision guide:**

| Need | Use |
|---|---|
| Read, browse, forms, most app UI | Window |
| A 3D object viewable from angles | Volume |
| Blend 3D content with the room | Immersive Space (mixed) |
| A user-dialable portal into a scene | Immersive Space (progressive) |
| Fully replace the surroundings | Immersive Space (full) |

## Depth & materials

- Use the **system glass materials** for window and control backgrounds. They automatically pick up the color and lighting of whatever is behind them (real room or other content) and apply **vibrancy** to keep text and symbols legible. There is **no separate light/dark mode** on visionOS — one material adapts to conditions.
- **Do not use pure black or pure white backgrounds.** Pure black reads as a hole and pure white glows uncomfortably; both fight the passthrough. Let content sit on the translucent system material so the room shows through.
- **Establish depth with soft shadows, not heavy drop shadows.** visionOS renders a subtle contact shadow behind windows; layering your own content forward uses **z-offset sparingly** — a few points to lift a hovered control, not dramatic parallax.
- Keep depth **shallow inside a window.** Windows are essentially flat; pushing UI far forward off the glass causes eye-strain and breaks the glass illusion. Reserve real depth for volumes and immersive scenes.
- Avoid large fully-opaque planes that block the room; prefer the glass so users keep spatial awareness of their surroundings.

## Ergonomics & comfort

- **Keep primary content in the field of view.** Center it so the user reads and acts with **eye movement, not neck and torso rotation.** Content that forces big head movements to reach controls is fatiguing.
- **Comfortable default distance is roughly 1–2 meters.** Don't place interactive content closer than ~1m (uncomfortable convergence) or so far it's hard to read.
- **Size for distance.** Because content sits at real distance, design at the system's reference scale and let visionOS handle the physical sizing — don't shrink type to phone sizes. Text and targets that look fine on a mockup are often too small in headset.
- **Anchor content; don't chase the head.** Windows stay where the user placed them (world-locked). Avoid head-locked UI that follows the gaze — it induces discomfort and a trapped feeling. Reserve head-anchoring for brief, deliberate moments.
- **Design for the vertical comfort zone.** Place primary content and controls **near or slightly below eye level**; content forced high makes users tilt their head back, which fatigues the neck fast. Let the user recenter to their natural posture.
- **Assume the user may be seated or standing** and could be surrounded by other people — don't require large arm sweeps or standing turns to use core features.
- **Minimize motion the user didn't cause.** Large moving fields, fast optical flow, and content sweeping across the periphery cause motion discomfort. Keep motion small, slow, foreground, and near the center; honor **Reduce Motion** with crossfades. See [[motion-microinteractions]].
- **Respect the user's surroundings.** Don't fill the whole space by default, don't place content where a real object is, and make it easy to recenter and to see the room.

## Input: eyes and hands

The default interaction is **gaze + pinch**: the user looks at a target to focus it, then pinches thumb and index finger to select. Design around this.

- **Hover/highlight state is mandatory, not decorative.** Every interactive element must show a clear **gaze-hover highlight** so the user knows what they'll activate before they pinch. A control with no hover feedback is effectively invisible to eye targeting.
- **Minimum target size ~60pt** for reliable eye tracking, with **at least ~60pt center-to-center spacing** between targets. This is far larger than the phone's 44pt tap target — eye tracking is less precise than a fingertip. Small, tightly-packed controls are the single most common visionOS mistake.
- **Keep the visual hit area and the actual hit area matched**, and give targets breathing room so gaze doesn't accidentally jump to a neighbor.
- **Indirect vs direct gestures.** *Indirect* (gaze + pinch at a distance) is the primary, comfortable mode — hands rest in the lap. *Direct* (reaching out to touch a control that's within arm's reach) is intuitive for close volumes but tiring if sustained ("gorilla arm"); use it for brief, deliberate interactions, never as the only way in.
- **Use the standard gesture set** (tap/pinch, drag, zoom with two-hand pinch, rotate). Introduce a **custom gesture only** when the standard set genuinely can't express the action, and always provide a standard fallback.
- **Accessibility input alternatives:** support **Dwell Control** (select by holding gaze), **Pointer Control** (drive the pointer with head/wrist/finger), and pointer devices / connected keyboard & trackpad. Never require two working hands or precise eye control as the only path. See [[accessibility]].

## Typography & color in 3D

- Use **system text styles and vibrant label colors** so type stays legible on adaptive glass over any background. Contrast is computed against the material, not a fixed color.
- **Prefer larger, heavier type** than on iOS. Thin weights and small captions disappear against a busy room; **semibold and up** reads far better at distance on translucent material.
- Meet contrast honestly: aim for **7:1 for body text** where possible on glass, never below 4.5:1, and test over the *busiest* real-world backdrop the user might have (a bright window, a patterned wall). See [[typography]].
- **Dynamic point sizes:** type is specified in points that visionOS scales for distance and depth; don't hardcode tiny sizes. Support Dynamic Type.
- **Never encode meaning in color alone** — passthrough tints everything; pair color with a symbol or label.

## Windows, ornaments & chrome

- **Window chrome is minimal.** A window has a **glass background, a grabber bar below it** (to move/close/resize), and its content. Don't rebuild a title bar; let the system provide the window controls.
- **Tab bars sit vertically on the leading edge** as a slim rail that expands on gaze; place primary navigation there. Keep it to a handful of destinations.
- **Ornaments** are toolbars and controls that float **just outside the window's bounds** (typically bottom-anchored, e.g. a media transport bar or a toolbar), attached to the window and moving with it. Use ornaments for actions tied to the window without crowding its content; keep them shallow and close to the edge.
- **Sizing:** design windows to be resizable and give content a comfortable default size; avoid forcing tiny fixed windows. Volumes should be sized to their real-world subject.

## Immersion & safety

- **Passthrough is the default and the safe state** — the user sees their room. Treat full immersion as a mode the user opts into and can leave instantly.
- **The Digital Crown controls the level of immersion** in a progressive immersive space: turning it dials passthrough in and out. Design your scene to look right at every level, and never trap the user at full immersion.
- **Safety:** in more immersive scenes, respect the system's **Boundary/guardian** and breakthrough behaviors; don't obscure the whole floor or place content that would make a user step into a real obstacle. Provide an obvious way back to passthrough. People approaching are shown through the visor — don't design experiences that assume total isolation.

## Sound & spatial audio

- Treat **spatial audio as a design element, not decoration.** Sounds should emanate from the object or window they belong to, giving the user an audible cue to *where* things are — helpful when a target is outside the current gaze.
- Use subtle, **positioned UI sounds** for hover, selection, and completion; they reinforce the gaze-pinch loop. Keep them quiet and infrequent — the room is the user's real environment.
- Match audio to the immersion level: ambient soundscapes for immersive scenes, restrained cues for windowed apps. Always respect system volume and provide a way to mute.

## Porting iPad/iOS apps vs designing natively

- **Compatible iPad/iOS apps run automatically** in a single window with system glass, gaze-and-pinch mapped from taps. This is a legitimate day-one option and free.
- **But rebuild the key interactions for spatial.** A ported app inherits phone-sized targets (44pt) that are too small for eye tracking, dense layouts that fight comfort, and no hover states. **At minimum**, enlarge targets to ~60pt, add hover feedback, and simplify density.
- **Design natively** (SwiftUI + RealityKit) when depth, volumes, or immersion add real value — a 3D model, a spatial scene, an app that benefits from the infinite canvas. Don't add a volume or immersive space just to look "spatial"; earn it.

## Accessibility

- **VoiceOver works in space:** every window, ornament, control, and 3D element needs a label, value, and traits, and a logical reading order. Users navigate with VoiceOver gestures and can select without precise eye targeting.
- **Provide alternatives to eyes and hands:** Dwell Control, Pointer Control (head/wrist/index-finger pointer), Switch Control, and connected keyboard/trackpad/game controller. Never make gaze *or* pinch the sole input.
- **Honor system settings:** Reduce Motion (swap large motion for fades), Reduce Transparency (more opaque materials), Increased Contrast, and Dynamic Type.
- Announce state changes (loading, selected, immersion level) to assistive tech, and give 3D and generated content accessible descriptions. Target: fully usable with VoiceOver + Dwell + Reduce Motion at once. See [[accessibility]], [[wwdc-design-principles]].

## Checklist
- [ ] App **launches into a window** in the Shared Space; immersion is opt-in, never forced on launch.
- [ ] Every interactive element has a clear **gaze-hover highlight** before pinch.
- [ ] Targets are **≥60pt** with ≥60pt spacing; no phone-sized 44pt controls survive from a port.
- [ ] Primary content is **centered in the field of view** — reachable by eye, not big head/torso turns.
- [ ] Backgrounds use **system glass** — no pure black or pure white; room shows through.
- [ ] Type is **semibold+ and Dynamic-Type-ready**, tested over the busiest real-world backdrop for contrast.
- [ ] Content sits at a **comfortable ~1–2m distance**; windows are **world-locked**, not head-chasing.
- [ ] Motion is small, slow, central; **Reduce Motion** and **Reduce Transparency** honored.
- [ ] **Digital Crown** dials immersion; there is always an obvious, instant way back to passthrough.
- [ ] Toolbars use **ornaments**, not a rebuilt title bar; window grabber and system controls left to the system.
- [ ] **Spatial audio** positioned to its source; UI sounds quiet, muteable, tied to system volume.
- [ ] **VoiceOver, Dwell, and Pointer** all work; no feature requires both precise gaze *and* two hands.

## Anti-patterns
- **Launching straight into full immersion** — dropping the user into a takeover scene instead of starting in a window and letting them dial up.
- **Phone-sized targets** — shipping 44pt controls (usually from an iOS port) that eye tracking can't reliably hit, or packing them edge-to-edge with no spacing.
- **No hover state** — interactive elements that give no gaze feedback, so users can't tell what a pinch will activate.
- **Head-locked UI that chases the gaze** — a menu or HUD that follows the head, causing the trapped, nauseating feeling visionOS explicitly avoids.
- **Pure black / pure white / fully opaque planes** that punch a hole in the room or blind the user, instead of adaptive glass.
- **Big, fast peripheral motion** — sweeping backgrounds or optical flow that trigger motion discomfort, with no Reduce-Motion fallback.
- **Deep parallax inside a flat window** — pushing UI far off the glass, breaking the material and straining convergence.
- **Custom gestures with no standard fallback**, or requiring sustained direct reach ("gorilla arm") as the only way to interact.
- **Thin, tiny type** that vanishes against a busy room, or color-only status with no symbol.
- **Shipping a raw iPad port as "spatial"** — inheriting dense, small, hover-less UI and calling it done; or bolting on a volume/immersive space that adds no value.
- **Trapping the user in immersion** with no Digital-Crown exit, obscuring the floor, or assuming total isolation from the real surroundings.
