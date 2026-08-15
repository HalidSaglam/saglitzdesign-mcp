---
id: apple-accessibility
title: "Apple Accessibility (Dynamic Type, VoiceOver, hit regions, motion, contrast)"
category: design-language
platform: both
tags: [apple, accessibility, ios, macos, swiftui, dynamic-type, voiceover, contrast, reduce-motion, hig]
sources: ["https://developer.apple.com/design/human-interface-guidelines/accessibility", "https://developer.apple.com/design/human-interface-guidelines/typography", "https://developer.apple.com/design/human-interface-guidelines/voiceover", "https://developer.apple.com/design/human-interface-guidelines/buttons", "https://developer.apple.com/design/human-interface-guidelines/color", "https://developer.apple.com/design/human-interface-guidelines/motion", "https://developer.apple.com/documentation/swiftui/view/accessibilitylabel(_:)-1d7jv", "https://developer.apple.com/documentation/swiftui/image", "https://developer.apple.com/documentation/swiftui/image/init(decorative:bundle:)", "https://developer.apple.com/documentation/swiftui/labelstyle/icononly", "https://developer.apple.com/documentation/swiftui/font/custom(_:fixedsize:)", "https://developer.apple.com/documentation/swiftui/font/custom(_:size:relativeto:)", "https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text", "https://developer.apple.com/documentation/swiftui/scaledmetric", "https://developer.apple.com/documentation/swiftui/color/init(_:bundle:)", "https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion", "https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency", "https://developer.apple.com/documentation/swiftui/environmentvalues/colorschemecontrast", "https://developer.apple.com/documentation/uikit/scaling-fonts-automatically", "https://developer.apple.com/documentation/uikit/uifont/systemfont(ofsize:)", "https://developer.apple.com/documentation/uikit/uifontmetrics/scaledvalue(for:)", "https://developer.apple.com/documentation/accessibility/accessibility-inspector", "https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels", "https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria", "https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria", "https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria", "https://www.w3.org/TR/WCAG22/"]
updated: 2026-08-15
---

# Apple accessibility: the facts a reviewer can check

Every claim below is a statement Apple publishes, and the page that publishes it is named beside it. Where Apple gives a number, the number is Apple's. Where Apple *recommends* rather than enforces, this document says "recommends" — a recommendation flagged as a hard limit is how a correct app gets told it is broken.

Apple's accessibility guidance is organised by capability — vision, hearing, mobility, speech, cognitive — and Apple's own summary of what an accessible interface is: **intuitive** (familiar, consistent interactions), **perceivable** (no information carried by a single sense alone), and **adaptable** (respects system settings and personalisation). *(HIG › Accessibility)*

---

## 1. Dynamic Type — and the platform it does not exist on

**Dynamic Type is a system-level feature in iOS, iPadOS, tvOS, visionOS, and watchOS.** *(HIG › Typography, "Supporting Dynamic Type")*

**macOS is not on that list, and Apple says so directly: "macOS doesn't support Dynamic Type."** *(HIG › Typography, Platform considerations › macOS)* Apple's App Store Connect help corroborates it from the other side: the **Larger Text** Accessibility Nutrition Label is offered for iOS, tvOS, visionOS and watchOS — macOS is absent from its platform list, while the VoiceOver, Sufficient Contrast and Reduced Motion labels all list macOS.

So: **scope every Dynamic Type claim to the platforms that have it.** On macOS, `Font.TextStyle` still exists and the built-in text styles are still the right way to express hierarchy — but they resolve to fixed sizes, and a macOS view that never grows is not a Dynamic Type bug. macOS apps that want a text-size control ship their own (Apple's own guidance for the Larger Text label explicitly allows "your own in-app font size control to achieve equivalent font sizes").

### How far the text actually moves (iOS, iPadOS)

From the HIG Typography specification tables, at the **Large (default)** step versus the largest accessibility step **AX5**:

| Text style | Large (default) | AX5 | Growth |
|---|---|---|---|
| Large Title | 34 pt | 60 pt | ×1.8 |
| Body | 17 pt | 53 pt | ×3.1 |
| Subhead | 15 pt | 49 pt | ×3.3 |
| Caption 2 | 11 pt | 40 pt | ×3.6 |

Apple states the same range in prose: "Dynamic Type on iOS … reaches sizes larger than 200% at the AX3 size, and allows body text sizes over 300% at the AX5 size." *(App Store Connect Help › Larger Text evaluation criteria)* Body at AX3 is 40 pt, which is where the 200% line falls.

The HIG's vision guidance sets the design target: "Ideally, give people the option to enlarge text by at least 200 percent (or 140 percent in watchOS apps)." *(HIG › Accessibility, Vision)*

**Design consequence:** a layout that is only ever tested at Large has been tested at a third of its real range. Body text triples. Small text nearly quadruples. Fixed-height rows built at 17 pt will hold 53 pt only by truncating it.

### Recommended default and minimum text sizes

| Platform | Default size | Minimum size |
|---|---|---|
| iOS, iPadOS | 17 pt | 11 pt |
| macOS | 13 pt | 10 pt |
| tvOS | 29 pt | 23 pt |
| visionOS | 17 pt | 12 pt |
| watchOS | 16 pt | 12 pt |

*(HIG › Typography, "Ensuring legibility"; the same table appears in HIG › Accessibility, Vision.)*

**These are legibility recommendations covering both custom and system fonts — not limits the OS enforces.** Apple's framing is "Follow the recommended default and minimum text sizes for each platform — for both custom and system fonts — to ensure your text is legible on all devices," and it adds that a thin custom weight should aim *larger* than the recommendation. Nothing rejects a 9 pt label at build time; it is simply below what Apple says most people can read.

For macOS the built-in text styles resolve to fixed points: Body 13 pt (16 pt line height), Footnote and Caption 1 and Caption 2 all 10 pt. *(HIG › Typography, "macOS built-in text styles")* That is why the macOS recommended minimum is 10 pt — Apple's own smallest style sits exactly on it.

### What breaks Dynamic Type

Apple's rule, stated plainly: **"To add support for Dynamic Type in your app, you use text styles."** *(UIKit › Scaling fonts automatically)*

1. **A raw point size instead of a text style.** `UIFont.systemFont(ofSize:)` carries Apple's own warning: "Instead of using this method to get a font, it's often more appropriate to use `preferredFont(forTextStyle:)` because that method respects the user's selected content size category." The SwiftUI shape of the same distinction is `.font(.body)` — a `Font.TextStyle` — versus `.font(.system(size: 17))`, which takes a bare `CGFloat` and no style to scale against.
2. **`fixedSize` custom fonts.** `Font.custom(_:fixedSize:)` is documented as "a fixed `size` that does not scale with Dynamic Type." Its scaling sibling is `Font.custom(_:size:relativeTo:)` — "scales relative to the given `textStyle`". A custom font applied with `Font.custom(_:size:)` alone "scales adaptively from the size provided to align with the default text style of `body`"; use `relativeTo:` to pin it to a different style. *(SwiftUI › Applying custom fonts to text)*
3. **UIKit labels that never got told to listen.** `label.font = UIFont.preferredFont(forTextStyle: .body)` is only half of it. With `adjustsFontForContentSizeCategory` left `false`, "the font will initially be the right size, but it won't respond to text-size changes the user makes in Settings or Control Center." *(UIKit › Scaling fonts automatically)* Custom fonts need `UIFontMetrics(forTextStyle:).scaledFont(for:)` plus the same property.
4. **Fixed frame heights on text-bearing views.** Apple: "When font size increases in a horizontally constrained context, inline items (like glyphs and timestamps) and container boundaries can crowd text and cause truncation or overlapping." *(HIG › Typography)* The documented fix is to scale the container too — `UIFontMetrics.scaledValue(for:)` exists precisely for this ("if you define a button with text that can scale based on Dynamic Type, you would use this method to obtain an appropriately scaled height for your button's background content"), and SwiftUI's `@ScaledMetric(relativeTo:)` does the same for padding and spacing.
5. **Truncation left in.** "Keep text truncation to a minimum as font size increases. In general, aim to display as much useful text at the largest accessibility font size as you do at the largest standard font size." A label can be configured to use as many lines as it needs. *(HIG › Typography)*

### What Dynamic Type gives you for free

- **SF Symbols scale with it.** "When you use SF Symbols, you get icons that scale automatically with Dynamic Type size changes." *(HIG › Typography)* A meaningful icon drawn as a fixed-size bitmap does not.
- **System fonts respond to other type settings too:** "System fonts automatically support Dynamic Type (where available) and respond when people turn on accessibility features, such as Bold Text. If you use a custom font, make sure it implements the same behaviors." *(HIG › Typography)*

### Layout advice Apple gives for large sizes

- Prioritise: "when people increase text size to read the content in a tabbed window, they don't expect the tab titles to increase in size."
- Restack: "consider using a stacked layout where text appears above secondary items," and reduce column count as size grows.
- Keep hierarchy stable: "keep primary elements toward the top of a view even when the font size is very large."

*(all HIG › Typography)*

---

## 2. VoiceOver labelling — what SwiftUI supplies, and what it does not

Apple's requirement: **"Provide alternative labels for all key interface elements. … System-provided controls have generic labels by default, but you should provide more descriptive labels that convey your app's functionality. Add labels to any custom elements your app defines."** *(HIG › VoiceOver)*

And its counterweight, in the same section: **"Exclude purely decorative images from VoiceOver. It's unnecessary to describe images that are decorative and don't convey useful or actionable information."** For meaningful images: "describe only the information the image itself conveys" — because VoiceOver already reads the surrounding interface, including nearby captions.

### What SwiftUI does on its own

| API | What SwiftUI does |
|---|---|
| `Image(_:bundle:)` | "Creates a **labeled** image." The `name` is "the name of the image resource to lookup, **as well as the localization key with which to label the image**." |
| `Image(decorative:bundle:)` | "Creates an **unlabeled**, decorative image." — "SwiftUI ignores this image for accessibility purposes." |
| `Image(systemName:)` | Documented as "Creates a system symbol image." Apple's page for it says nothing about supplying an accessibility label. |
| `Label("Play", systemImage:)` + `.labelStyle(.iconOnly)` | **"The title of the label is still used for non-visual descriptions, such as VoiceOver."** The icon is all that renders; the title still speaks. |
| Any image "used as a control" | Apple's instruction is to "use one of the initializers that takes a `label` parameter. This allows the system's accessibility frameworks to use the label as the name of the control." *(SwiftUI › Image, "Making images accessible")* |

**The load-bearing consequence:** an icon-only control is not automatically unlabelled, and a labelled image is not automatically well labelled. `Image("cart.badge.plus")` *has* a label — the asset name, which is a developer string. A rule that flags every `Image(systemName:)` inside a `Button` as an error will be right often and wrong whenever the developer used `Label(_:systemImage:)` with `.iconOnly`, or attached `.accessibilityLabel`, or wrapped the pair in `.accessibilityElement(children: .combine)`.

### How to write the label

`accessibilityLabel(_:)`: "Use this method to provide an accessibility label for a view that doesn't display text, like an icon. For example, you could use this method to label a button that plays music with the text 'Play'. **Don't include text in the label that repeats information that users already have. For example, don't use the label 'Play button' because a button already has a trait that identifies it as a button.**"

So the correct label for a play button is `"Play"`, not `"Play button"`, and not `"play.fill"`.

### Structure, not just names

- **Titles and headings come first.** "The title is the first information someone receives from an assistive technology when arriving on a page or screen." Offer unique titles and accurate section headings. *(HIG › VoiceOver)*
- **Reading order follows the language.** "VoiceOver reads elements in the same order people read content in their active language and locale. For example, in US English, this is top-to-bottom, left-to-right." An ungrouped image-and-caption grid reads every image, then every caption; grouping pairs them. *(HIG › VoiceOver)*
- **Announce change.** "Inform VoiceOver when visible content or layout changes occur."
- **Support the rotor** so people can jump by heading and link.
- **Describe infographics.** "Provide a concise description of each infographic that explains what it conveys," and expose its interactions too.
- **visionOS caveat:** with VoiceOver on, "apps and games that define custom gestures don't receive hand input by default" unless the person enables Direct Gesture mode.

Apple's own testing advice: most of the work done for VoiceOver also serves Voice Control, Switch Control and Hover Text, which is why Apple recommends starting an accessibility evaluation with VoiceOver. *(App Store Connect Help › VoiceOver evaluation criteria)*

---

## 3. Hit regions and control sizes

**The number, quoted: "As a general rule, a button needs a hit region of at least 44x44 pt — in visionOS, 60x60 pt — to ensure that people can select it easily, whether they use a fingertip, a pointer, their eyes, or a remote."** *(HIG › Buttons)*

The HIG's accessibility page gives the per-platform breakdown, and it distinguishes **default** from **minimum** — a distinction the single 44 pt figure hides:

| Platform | Default control size | Minimum control size |
|---|---|---|
| iOS, iPadOS | 44×44 pt | 28×28 pt |
| macOS | 28×28 pt | 20×20 pt |
| tvOS | 66×66 pt | 56×56 pt |
| visionOS | 60×60 pt | 28×28 pt |
| watchOS | 44×44 pt | 28×28 pt |

*(HIG › Accessibility, Mobility — "Strive to meet the recommended minimum control size for each platform.")*

Read the two together: 44×44 pt is the rule of thumb for a **button's hit region**, and it is the iOS/iPadOS **default control size**; macOS standard controls are smaller by design, which is why a 44 pt rule applied to a Mac toolbar is measuring against the wrong platform.

**Spacing is the other half.** "Consider spacing between controls as important as size. … In general, it works well to add about **12 points of padding** around elements that include a bezel. For elements without a bezel, about **24 points of padding** works well around the element's visible edges." *(HIG › Accessibility, Mobility)*

In visionOS, where targeting is by gaze: "Aim to place buttons so their centers are always at least **60 pts apart**. If your buttons measure 60 pts or larger, add **4 pts of padding** around them to keep the hover effect from overlapping." *(HIG › Buttons, visionOS)*

Also from the mobility guidance: prefer the simplest gesture for frequent interactions, avoid custom multifinger and multihand gestures, and **always offer a non-gesture alternative** — "if you use a swipe gesture to dismiss a view, also make a button available."

---

## 4. Reduce Motion

**The environment value:** `@Environment(\.accessibilityReduceMotion)` — "Whether the system preference for Reduce Motion is enabled." Its discussion states the obligation in one line: **"If this property's value is true, UI should avoid large animations, especially those that simulate the third dimension."** It is available on iOS/iPadOS/tvOS 13, macOS 10.15, watchOS 6 and visionOS 1 — **including macOS**, unlike Dynamic Type.

Its sibling, `accessibilityReduceTransparency`: "If this property's value is true, UI (mainly window) backgrounds should not be semi-transparent; they should be opaque." For how Liquid Glass responds to that dial, see `get_design_doc("apple-hig-liquid-glass")`.

**What "respecting it" means, per Apple:** "When this setting is active, ensure your app or game responds by reducing automatic and repetitive animations, including zooming, scaling, and peripheral motion." The HIG then lists the techniques:

- Tightening animation springs to reduce bounce effects
- Tracking animations directly with people's gestures
- Avoiding animating depth changes in z-axis layers
- Replacing transitions in x-, y-, and z-axes with fades to avoid motion
- Avoiding animating into and out of blurs

*(HIG › Accessibility, Cognitive)*

Apple's App Store evaluation criteria are more specific still — treat these as the checklist:

- **Depth simulation** (parallax, animated blur, depth-of-field) → "disable or change the animation when the user's setting indicates a need or preference for reduced motion."
- **Multi-axis motion, multi-speed motion, spinning, or vortex effects** → same.
- **Auto-advancing carousels or any other ongoing motion** → stop it based on the setting, or give the person a control to stop it.

*(App Store Connect Help › Reduced Motion evaluation criteria)*

**Do not blanket-disable.** Apple, twice: "Removing animations entirely can have a negative effect on usability and understandability. If the motion itself conveys some meaning, such as a status change…" — and in the HIG, "Don't add motion for the sake of adding motion," alongside "Make motion optional. Not everyone can or wants to experience the motion in your app or game, so it's essential to avoid using it as the only way to communicate important information." Pair motion with haptics and audio rather than replacing it with nothing. *(HIG › Motion)*

Related HIG › Motion rules worth keeping: "Let people cancel motion" — don't make anyone wait out an animation before they can act, especially a repeated one. And avoid custom animation on frequent interactions, because the system already animates standard elements.

---

## 5. Contrast — and why source code alone cannot decide it

**The ratios Apple publishes**, as used by Xcode's Accessibility Inspector, drawn from WCAG Level AA:

| Text size | Text weight | Minimum contrast ratio |
|---|---|---|
| Up to 17 pts | All | 4.5:1 |
| 18 pts | All | 3:1 |
| All | Bold | 3:1 |

*(HIG › Accessibility, Vision — "Accessibility Inspector uses the following values from WCAG Level AA as guidance in determining whether your app's colors have an acceptable contrast.")* The upstream normative source is WCAG 2.2 success criterion 1.4.3 Contrast (Minimum). Apple names both WCAG and APCA as "two popular standards of measure."

For **non-text** elements — custom checkboxes, selection states, control outlines — Apple's App Store guidance says "Meeting a **3:1** minimum contrast ratio is commonly recommended for non-text contrast," and its bar for claiming Sufficient Contrast on the App Store is "usually 4.5 to 1 for most text elements." *(App Store Connect Help › Sufficient Contrast evaluation criteria)*

**The fallback when you miss it:** "If your app doesn't provide this minimum contrast by default, ensure it at least provides a higher contrast color scheme when the system setting Increase Contrast is turned on." *(HIG › Accessibility)* Read it in SwiftUI with `@Environment(\.colorSchemeContrast)`, which reports `.standard` or `.increased` — "The value that you read depends entirely on user settings, and you can't change it."

**And check both appearances:** "If your app supports dark mode, make sure to check the minimum contrast in both light and dark appearances." Apple's App Store guidance names the specific failure: "A common mistake is supporting sufficient contrast in your light mode interface, but forgetting to support sufficient contrast in a dark interface. Many developers use gray-on-black for dark mode reading … this reduced contrast variant may be more difficult to read for those with low vision or light sensitivity." Test with Increase Contrast on and Reduce Transparency off, then with both on.

### Where the colour actually lives

**A colour in an Apple app is normally a *resource*, not a literal.** `Color(_:bundle:)`: "Use this initializer to load a color from a color set stored in an **Asset Catalog**. **The system determines which color within the set to use based on the environment at render time.**" SwiftUI's own guidance for contrast settings points the same way: "If you only need to provide different colors or images for different color scheme and contrast settings, do that in your app's **Asset Catalog**." *(SwiftUI › `colorSchemeContrast`)*

The HIG asks for four variants per custom colour: "If you define a custom color, make sure to supply light and dark variants, and an increased contrast option for each variant that provides a significantly higher amount of visual differentiation. Even if your app ships in a single appearance mode, provide both light and dark colors to support Liquid Glass adaptivity in these contexts." *(HIG › Color)* Apple's own system colour specification table has exactly those columns: Default (light), Default (dark), Increased contrast (light), Increased contrast (dark).

**Therefore: `Color("Brand")` in a `.swift` file carries no ratio.** The four resolved values live in `Assets.xcassets`, and the one that renders depends on appearance and the Increase Contrast setting at draw time. Any contrast verdict reached by reading Swift source alone is a guess. What source *can* show is a hardcoded literal — `Color(red:green:blue:)`, a hex initialiser — which is a legitimate finding precisely because it has no light/dark/increased-contrast variants to resolve to.

**Prefer system colours.** "These colors have their own accessible variants that automatically adapt when people adjust their color preferences, such as enabling Increase Contrast or toggling between the light and dark appearances." And don't repurpose them: "don't use the `separator` color as a text color, or `secondaryLabel` color as a background color." *(HIG › Accessibility, HIG › Color)*

**Colour is never the only channel.** "Some people have trouble differentiating between certain colors and shades. … Offer visual indicators, like distinct shapes or icons, in addition to color to help people perceive differences in function and changes in state." *(HIG › Accessibility, Vision)*

---

## Myth-check

| The plausible wrong belief | What Apple actually publishes |
|---|---|
| "Dynamic Type works on every Apple platform." | "macOS doesn't support Dynamic Type." *(HIG › Typography)* The feature is listed for iOS, iPadOS, tvOS, visionOS and watchOS. A macOS view with fixed metrics is not a Dynamic Type failure. |
| "SwiftUI labels nothing for VoiceOver — every icon needs `.accessibilityLabel`." | `Label("Play", systemImage: "play.fill").labelStyle(.iconOnly)` is labelled: "The title of the label is still used for non-visual descriptions, such as VoiceOver." And `Image("name")` is documented as "a **labeled** image" whose name doubles as the label. |
| "So SwiftUI has it covered." | The label `Image("cart.badge.plus")` gets is the *asset name* — a developer identifier, not a description. `Image(systemName:)` is documented only as "Creates a system symbol image." And the HIG is explicit: "System-provided controls have generic labels by default, but you should provide more descriptive labels." |
| "Every image needs a description." | "Exclude purely decorative images from VoiceOver." `Image(decorative:)` exists for exactly this: "SwiftUI ignores this image for accessibility purposes." Over-labelling decoration is a documented mistake, not a safe default. |
| "A good label names the control: 'Play button'." | "Don't use the label 'Play button' because a button already has a trait that identifies it as a button." *(SwiftUI › `accessibilityLabel(_:)`)* |
| "44×44 pt is the minimum control size on every Apple platform." | 44×44 pt is the general rule for a **button's hit region** (60×60 pt in visionOS) *(HIG › Buttons)*. The per-platform table gives macOS a 28×28 pt default and a 20×20 pt minimum, tvOS 66×66 pt, visionOS 60×60 pt *(HIG › Accessibility)*. |
| "The recommended minimum text size is a limit the OS enforces." | It is a legibility recommendation "for both custom and system fonts" *(HIG › Typography)*. Nothing rejects smaller text at build or run time. macOS's own Footnote and Caption styles sit at 10 pt, exactly on the recommendation. |
| "Respecting Reduce Motion means turning animation off." | "Removing animations entirely can have a negative effect on usability and understandability." Apple asks you to disable or **change** depth, spin and multi-axis effects, and to keep meaning-carrying motion — replacing movement with fades rather than nothing. |
| "Reduce Motion is a mobile concern." | The `accessibilityReduceMotion` environment value ships on macOS 10.15+, and the Reduced Motion App Store label lists macOS. |
| "Contrast can be audited from Swift source." | Colours resolve from an Asset Catalog "based on the environment at render time," with separate light, dark and increased-contrast variants. Source shows *which resource* is used, not what colour renders. Hardcoded literals are the exception — and that is what makes them worth flagging. |
| "Dark mode is safe because the system inverts everything." | "A common mistake is supporting sufficient contrast in your light mode interface, but forgetting to support sufficient contrast in a dark interface." *(App Store Connect Help › Sufficient Contrast)* |

---

## Verifying, and declaring it

**Accessibility Inspector** (Xcode › Open Developer Tool › Accessibility Inspector): "Audit your app to confirm that it addresses accessibility issues such as clipped text and unlabeled elements, and uses appropriate text size and color contrast levels." It is the tool whose thresholds the HIG contrast table describes.

**Accessibility Nutrition Labels** let you state support on the App Store. Apple publishes evaluation criteria for nine features: **VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions.** Each page defines what "supports" means and on which platforms the label is offered — which makes them, in practice, Apple's own acceptance criteria for the work described above.

Manual passes Apple asks for by name: turn on Larger Accessibility Text Sizes (Settings › Accessibility › Display & Text Size › Larger Text) and confirm the app "remains comfortably readable"; test with Bold Text, Increase Contrast and Reduce Transparency enabled; and navigate the app with Full Keyboard Access, avoiding overrides of system keyboard shortcuts.

## When to use this document

- **iOS / iPadOS apps** — all five sections apply.
- **macOS apps** — sections 2 (VoiceOver), 3 (control sizes: use the macOS row), 4 (Reduce Motion) and 5 (contrast) apply in full. Section 1 applies only as "use the built-in text styles"; Dynamic Type itself is absent.
- **visionOS** — substitute 60×60 pt hit regions, 60 pt centre-to-centre button spacing, and note the custom-gesture caveat under VoiceOver.
- For Liquid Glass materials and their accessibility dials, see `get_design_doc("apple-hig-liquid-glass")`. For the general, platform-neutral treatment, see `get_design_doc("accessibility")`.
