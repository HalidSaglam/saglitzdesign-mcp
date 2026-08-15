---
id: apple-shipping-readiness
title: "Apple Shipping Readiness (Info.plist purpose strings, entitlements, icon sets, orientation & iPad multitasking)"
category: design-language
platform: both
tags: [apple, ios, ipados, macos, shipping, info-plist, privacy, purpose-strings, entitlements, app-sandbox, hardened-runtime, notarization, app-icons, icon-composer, orientation, multitasking, app-store]
sources: ["https://developer.apple.com/documentation/bundleresources/information-property-list", "https://developer.apple.com/documentation/bundleresources/protected-resources", "https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources", "https://developer.apple.com/documentation/bundleresources/information-property-list/nscamerausagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsphotolibraryusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsphotolibraryaddusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationwheninuseusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationalwaysandwheninuseusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nscontactsusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nscalendarsfullaccessusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nscalendarswriteonlyaccessusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsremindersfullaccessusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsfaceidusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsmotionusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsbluetoothalwaysusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsspeechrecognitionusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nssiriusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nshealthshareusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nshealthupdateusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nshomekitusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nfcreaderusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsapplemusicusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsusertrackingusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsappleeventsusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsdesktopfolderusagedescription", "https://developer.apple.com/documentation/bundleresources/information-property-list/nsdownloadsfolderusagedescription", "https://developer.apple.com/design/human-interface-guidelines/privacy", "https://developer.apple.com/documentation/bundleresources/entitlements", "https://developer.apple.com/documentation/security/app-sandbox", "https://developer.apple.com/documentation/security/protecting-user-data-with-app-sandbox", "https://developer.apple.com/documentation/xcode/configuring-the-macos-app-sandbox", "https://developer.apple.com/documentation/security/hardened-runtime", "https://developer.apple.com/documentation/xcode/configuring-the-hardened-runtime", "https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution", "https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.app-sandbox", "https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.device.microphone", "https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.device.audio-input", "https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.allow-jit", "https://developer.apple.com/documentation/bundleresources/diagnosing-issues-with-entitlements", "https://developer.apple.com/documentation/xcode/adding-capabilities-to-your-app", "https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-sandbox-information", "https://developer.apple.com/design/human-interface-guidelines/app-icons", "https://developer.apple.com/documentation/xcode/configuring-your-app-icon", "https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer", "https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon", "https://developer.apple.com/videos/play/wwdc2025/220/", "https://developer.apple.com/videos/play/wwdc2025/361/", "https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedinterfaceorientations", "https://developer.apple.com/documentation/bundleresources/information-property-list/uiinterfaceorientation", "https://developer.apple.com/documentation/bundleresources/information-property-list/uipreferreddefaultinterfaceorientation", "https://developer.apple.com/documentation/bundleresources/information-property-list/uirequiresfullscreen", "https://developer.apple.com/documentation/bundleresources/information-property-list/uirequiresfullscreenignoredstartingwithversion", "https://developer.apple.com/documentation/bundleresources/information-property-list/uilaunchscreen", "https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key", "https://developer.apple.com/documentation/technotes/tn3208-preparing-your-apps-launch-screen-to-meet-app-store-requirements", "https://developer.apple.com/documentation/uikit/multitasking-on-ipad-mac-and-apple-vision-pro", "https://developer.apple.com/documentation/uikit/uiscenesizerestrictions", "https://developer.apple.com/documentation/uikit/uiviewcontroller/prefersinterfaceorientationlocked", "https://developer.apple.com/design/human-interface-guidelines/multitasking", "https://developer.apple.com/design/human-interface-guidelines/layout", "https://developer.apple.com/videos/play/wwdc2025/282/", "https://developer.apple.com/app-store/review/guidelines/"]
updated: 2026-08-15
---

# Apple shipping readiness: the bundle facts a reviewer can check

This document covers the four things that stop an otherwise-finished Apple app from shipping, or ship it broken: the `Info.plist` purpose strings a capability requires, the entitlements macOS distribution requires, what a complete app icon set is, and what an orientation or multitasking restriction actually costs. Every claim is a statement Apple publishes, and the page that publishes it is named beside it.

**Key names are quoted exactly as Apple spells them, including capitalisation.** A near-miss key is not a partial credit — it is an absent key that reads as present. Apple's own prose is not perfectly consistent here, and where it is not, §4 says which spelling is canonical and why.

Where Apple *recommends* rather than requires, this document says "recommends". Where Apple describes an outcome without explaining the mechanism, this document reports the outcome and says where Apple stops.

*Quotation convention: wording is Apple's, unaltered. Typographic apostrophes and quote marks are normalised to straight ones, nested quotations are shown in single marks, and an excerpt beginning mid-sentence drops its leading connective without ellipsis.*

---

## 1. `Info.plist` purpose strings

**The file, exactly:** "The information property list file always has the name `Info.plist`. The file name is case-sensitive and must begin with a capital letter `I`." Its location differs by platform — "iOS app bundles store the file in the bundle's root directory, whereas macOS app bundles place the `Info.plist` file in the `Contents` directory." *(Bundle Resources › Information Property List)*

**What a purpose string is:** "The prompt that the system displays includes a `UsageDescription` string you provide, explaining why your app needs to access the protected resource." *(Bundle Resources › Protected resources)* Apple's own name for it: "You supply a message called a purpose string or a usage description." *(UIKit › Requesting access to protected resources)*

### The keys, and Apple's own requirement sentence for each

Every row below is quoted from that key's own reference page. Copy the key from this table, not from memory.

| Capability | Key | What Apple says |
|---|---|---|
| Camera | `NSCameraUsageDescription` | "This key is required if your app uses APIs that access the device's camera." |
| Microphone | `NSMicrophoneUsageDescription` | "This key is required if your app uses APIs that access the device's microphone." |
| Photo library (read or write) | `NSPhotoLibraryUsageDescription` | "This key is required if your app uses APIs that have read or write access to the user's photo library." |
| Photo library (add only) | `NSPhotoLibraryAddUsageDescription` | "This key is required if your app uses APIs that have write access to the user's photo library." |
| Location, foreground (iOS) | `NSLocationWhenInUseUsageDescription` | "This key is required if your iOS app uses APIs that access the user's location information while the app is in use." |
| Location, background (iOS) | `NSLocationAlwaysAndWhenInUseUsageDescription` | "This key is required if your iOS app uses APIs that access the user's location information at all times." |
| Location (macOS) | `NSLocationUsageDescription` | "This key is required if your macOS app uses APIs that access the user's location information." |
| Contacts | `NSContactsUsageDescription` | "This key is required if your app uses APIs that access the user's contacts." |
| Calendar, read + write | `NSCalendarsFullAccessUsageDescription` | "This key is required if your app uses APIs that read and write the person's calendar data." |
| Calendar, write only | `NSCalendarsWriteOnlyAccessUsageDescription` | "This key is required if your app uses APIs that write to the person's calendar data." |
| Reminders | `NSRemindersFullAccessUsageDescription` | "This key is required if your app uses APIs that access the person's reminder data." |
| Face ID | `NSFaceIDUsageDescription` | "This key is required if your app uses APIs that access Face ID." |
| Motion data | `NSMotionUsageDescription` | "This key is required if your app uses APIs that access the device's motion data… If you don't include this key, your app will crash when it attempts to access motion data." |
| Bluetooth | `NSBluetoothAlwaysUsageDescription` | "This key is required if your app uses the device's Bluetooth interface." |
| Speech recognition | `NSSpeechRecognitionUsageDescription` | "This key is required if your app uses APIs that send user data to Apple's speech recognition servers." |
| Siri | `NSSiriUsageDescription` | "This key is required if your app uses APIs that send user data to Siri." |
| HealthKit, read | `NSHealthShareUsageDescription` | "This key is required if your app uses APIs that access the someone's health data." |
| HealthKit, write | `NSHealthUpdateUsageDescription` | "This key is required if your app uses APIs that update the user's health data." |
| HomeKit | `NSHomeKitUsageDescription` | "This key is required if your app uses APIs that access the user's HomeKit configuration data." |
| NFC | `NFCReaderUsageDescription` | "You're required to provide this key if your app uses APIs that access the NFC hardware." |
| Media library / Apple Music | `NSAppleMusicUsageDescription` | "Your app must provide a value for this key to access a person's media library. This requirement applies to iOS, iPadOS, visionOS, and macOS apps that link against the macOS 15 SDK or later." |
| Apple events (macOS) | `NSAppleEventsUsageDescription` | "This key is required if your app uses APIs that send Apple events." |
| App tracking | `NSUserTrackingUsageDescription` | "If your app calls the App Tracking Transparency API, you must provide custom text… If you don't include a usage-description string, your app may crash when a user first launches it." |

**Note the exceptions to "required", because they are the ones a rule gets wrong.** Two documented capabilities carry weaker language, and treating them as hard requirements produces false findings:

- **Local network — `NSLocalNetworkUsageDescription`.** "Any app that uses the local network, directly or indirectly, **should** include this description. This includes apps that use Bonjour and services implemented with Bonjour, as well as direct unicast or multicast connections to local hosts." No "required" appears on the page.
- **macOS Desktop and Downloads folders — `NSDesktopFolderUsageDescription`, `NSDownloadsFolderUsageDescription`.** Both pages say, in the same words, "**The usage description is optional, but highly recommended.**" Both also carry a caveat worth knowing before writing a Mac rule: "App Sandbox enforces stricter limits on Desktop folder access, so that policy may supersede this one if your app enables sandboxing."

**Also note the keys that are not cross-platform.** `NSFaceIDUsageDescription` and `NFCReaderUsageDescription` list iOS and iPadOS only. `NSAppleEventsUsageDescription`, `NSDesktopFolderUsageDescription` and `NSDownloadsFolderUsageDescription` list macOS only. And location splits by platform explicitly: "If you need location information in a macOS app, use `NSLocationUsageDescription` instead" — flagging a Mac target for a missing `NSLocationWhenInUseUsageDescription` is wrong.

### What happens without one — three distinct published outcomes

**1. The access fails at runtime, and may take the app down with it.** Apple's general statement: "Always provide a valid purpose string in the Signing and Capabilities editor if your app uses a protected resource. If you don't, attempts to access the resource fail, and **might** cause your app to crash." *(UIKit › Requesting access to protected resources)*

Two keys state it more strongly on their own pages — `NSMotionUsageDescription` ("your app **will** crash when it attempts to access motion data") and `NSUserTrackingUsageDescription` ("your app **may** crash when a user first launches it").

**Xcode will tell you, and name the fix.** "Xcode detects when your app crashes for this reason and reports an issue, telling you to add the purpose string to your app." *(same page)* So a crash-on-first-use of a capability, with an Xcode issue attached, is a diagnosed missing purpose string rather than a mystery.

**No single rule for which failure mode a given resource produces was found on that page.** The nearest it comes is describing the denial case: "the access attempt that initiates the prompt, and any further attempts, **fail in a resource-specific way**." *(same page)* So report the observed condition — a protected API reached without its key — and Apple's own range of outcomes. Do not assert a mechanism; Apple states the outcome and stops there.

**2. App Review rejects the upload.** "App Review checks for the use of protected resources, and rejects apps that contain code accessing those resources without a purpose string." The error, verbatim from Apple's page:

```
ITMS-90683: Missing purpose string in Info.plist.
Your app's code references one or more APIs that access sensitive user
data, or the app has one or more entitlements that permit such access.
The Info.plist file for the "{app-bundle-path}" bundle should contain a
NSLocationWhenInUseUsageDescription key with a user-facing purpose string
explaining clearly and completely why your app needs the data.
```

Note the second trigger in that text: **an entitlement alone can require a purpose string**, without any call in your own code.

**3. A third-party SDK inherits the obligation to you.** "If you're using external libraries or SDKs, they may reference APIs that require a purpose string. Although your app might not use these APIs, a purpose string is still necessary for App Review… **You're responsible for all access of protected resources, including external SDK and library access.**" This is why an app whose own source never touches the camera can still be rejected for a missing `NSCameraUsageDescription` — and why a source-only scan is a lower bound on what is required, never an upper one.

### What makes a purpose string valid

Apple's four checks, quoted:

- "The purpose string isn't blank and doesn't consist solely of whitespace characters."
- "The purpose string is shorter than 4,000 bytes. Typical purpose strings are one complete sentence, but you can provide additional information to help a person make the right decision about sharing personal information."
- "The purpose string has the proper type that the corresponding key requires, typically a string."
- "The purpose string provides a description that's accurate, meaningful, and specific about why the app needs to access the protected resource."

"Adhere to these requirements for **every** purpose string in your app, **including localized purpose strings**." Localisation goes in a string catalog: "Create a string catalog file called `InfoPlist.xcstrings`, and build your app to populate the string catalog with keys for the usage description strings in your app."

**A purpose string need not be literally in `Info.plist`.** Xcode's Signing and Capabilities editor writes a build setting instead: "Xcode adds a build setting to your app that configures the purpose string as the value for a [key]; in this example, the key is `NSLocationWhenInUseUsageDescription`, so the build setting is `INFOPLIST_KEY_NSLocationWhenInUseUsageDescription`." Anything checking a project for purpose strings has to look in both places, or it will report a correctly configured app as broken.

### How to write one

The HIG's rule and its worked examples:

> "The standard alert displays your copy (called a purpose string or usage description string) after your app name and before the buttons people use to grant or deny their permission. Aim for a brief, complete sentence that's straightforward, specific, and easy to understand. Use sentence case, avoid passive voice, and include a period at the end."

| | Apple's example | Apple's note |
|---|---|---|
| ✅ | "The app records during the night to detect snoring sounds." | "An active sentence that clearly describes how and why the app collects the data." |
| ❌ | "Microphone access is needed for a better experience." | "A passive sentence that provides a vague, undefined justification." |
| ❌ | "Turn on microphone access." | "An imperative sentence that doesn't provide any justification." |

*(HIG › Privacy, Requesting permission)*

Two more HIG rules that decide when the alert appears, not what it says: "**Request permission only when your app clearly needs access to the data or resource.** … Ideally, wait to request permission until people actually use an app feature that requires access," and "**Avoid requesting permission at launch unless the data or resource is required for your app to function.**"

If you show a screen before the system alert, the HIG constrains it hard: "**Include only one button and make it clear that it opens the system alert**… Use a term like 'Continue' or 'Next' to title the single button," and "**Don't include additional actions in your custom screen or window**." Apple names the consequence for tracking pre-alerts specifically: "A custom messaging screen, window, or view that takes advantage of such behaviors to influence choices **will lead to rejection by App Store review**."

The App Store Review Guidelines make the same demand of the copy itself, at §5.1.1(ii): "**Ensure your purpose strings clearly and completely describe your use of the data.**" A purpose string is therefore reviewable content, not boilerplate — it is held to the four validity checks above *and* to that standard.

Finally, always check before you reach: "Because a person can change authorization at any time using Settings, always check the authorization status of a feature before accessing it. In cases without a dedicated API, prepare your app to gracefully handle access failures." *(UIKit › Requesting access to protected resources)*

---

## 2. Entitlements — App Sandbox and the Hardened Runtime on macOS

**What an entitlement is:** "An entitlement is a right or privilege that grants particular capabilities to an executable… An app stores its entitlements as **key-value pairs embedded in the code signature of its binary executable**." You do not normally hand-write them: "You configure entitlements for your app by declaring capabilities for a target in Xcode… Xcode records capabilities that you add in a property list file with the `.entitlements` extension." *(Bundle Resources › Entitlements)*

**Entitlements and purpose strings are different mechanisms and you often need both.** Apple states the pairing twice — once from the plist side ("in some cases, you also need to separately declare your intent to do so by adding an entitlement to your app") and once from the entitlement side: "**Entitlements inform the system of your app's intent to access the related resources. In most cases, you must still seek the user's explicit permission before the system grants that access.**" *(Xcode › Configuring the macOS App Sandbox)*

### App Sandbox — what it is, and when it is required

**What:** "The App Sandbox is an access control technology that macOS provides and **enforces at the kernel level**. The sandbox's primary function is to contain damage to the system and the user's data if the user executes a compromised app. While the sandbox doesn't prevent attacks against your app, it does reduce the harm a successful attack can cause by restricting your app to the minimum set of privileges it requires to function properly." *(Xcode › Configuring the macOS App Sandbox)*

**When required — Mac App Store distribution.** Apple states it in three places, and all three scope the requirement to the Mac App Store:

- "**To distribute a macOS app through the Mac App Store, you must enable the App Sandbox capability.**" *(Security › App Sandbox)*
- "App Sandbox — **a requirement for distributing your app on the App Store** — limits the scope for an attacker to abuse platform features via your app." *(Security › Protecting user data with App Sandbox)*
- The App Store Review Guidelines, 2.4.5(i), for apps distributed via the Mac App Store: "**They must be appropriately sandboxed**, and follow macOS File System Documentation."

**The entitlement:** `com.apple.security.app-sandbox` — "A Boolean value that indicates whether the app may use access control technology to contain damage to the system and user data if an app is compromised." Xcode adds it for you: "After you add the App Sandbox capability, Xcode automatically updates the entitlements file of your macOS app to include the App Sandbox Entitlement, **which is an App Store requirement for any app that you submit to the Mac App Store for review**."

**Verification, from Apple, without guessing:**

```
% codesign -dvvv --entitlements - <path to your app>
```

"If your app has the App Sandbox entitlement, you will see the following in the output: `[Key] com.apple.security.app-sandbox` / `[Value]` / `[Bool] true`." Or use Activity Monitor: "Choose View > Columns, and choose Sandbox among the list of possible columns to monitor… verify that the value in the Sandbox column is Yes."

**What sandboxing costs — Apple's own list of activities the sandbox forbids:**

- "Use of Authorization Services API."
- "Use of accessibility APIs in assistive apps."
- "Sending Apple Events to arbitrary apps."
- "Sending `userInfo` dictionaries in distributed notifications to other tasks."
- "Loading kernel extensions."
- "Simulating user input in Open and Save dialogs."
- "Accessing or modifying preferences in other apps."
- "Configuring network settings."
- "Terminating other running apps."

*(Security › Protecting user data with App Sandbox)*

**And what it costs the file system:** "The first time the user launches your sandboxed app, the system creates its container — a folder in `~/Library/Containers` that your app has exclusive read-write access to… the system restricts your app's file system access to just its container." Reaching outside it without the matching entitlement produces a named failure: "**An unauthorized attempt to access one of those folders results in an 'Operation not permitted' error.**"

**The sandbox resource entitlements, by identifier:**

| Category | Entitlement | Apple's abstract |
|---|---|---|
| Network | `com.apple.security.network.client` | "whether your app may open outgoing network connections" |
| Network | `com.apple.security.network.server` | "whether your app may listen for incoming network connections" |
| Hardware | `com.apple.security.device.camera` | "whether the app may interact with the built-in and external cameras" |
| Hardware | `com.apple.security.device.microphone` | "whether the app may use the microphone" |
| Hardware | `com.apple.security.device.usb` | "whether your app may interact with USB devices" |
| Hardware | `com.apple.security.device.bluetooth` | "whether your app may interact with Bluetooth devices" |
| Hardware | `com.apple.security.print` | "whether your app may print a document" |
| App data | `com.apple.security.personal-information.addressbook` | "read-write access to contacts in the user's address book" |
| App data | `com.apple.security.personal-information.location` | "whether the app may access location information from Location Services" |
| App data | `com.apple.security.personal-information.calendars` | "read-write access to the user's calendar" |
| Files | `com.apple.security.files.user-selected.read-only` | "read-only access to files the user has selected using an Open or Save dialog" |
| Files | `com.apple.security.files.user-selected.read-write` | "read-write access to files the user has selected using an Open or Save dialog" |
| Files | `com.apple.security.files.downloads.read-only` / `.read-write` | access to the Downloads folder |
| Files | `com.apple.security.assets.pictures.read-only` / `.read-write` | access to the Pictures folder |
| Files | `com.apple.security.assets.music.read-only` / `.read-write` | access to the Music folder |
| Files | `com.apple.security.assets.movies.read-only` / `.read-write` | access to the Movies folder |
| Files | `com.apple.security.files.all` | "whether the app may have access to all files" |

*(Security › App Sandbox; Xcode › Configuring the macOS App Sandbox)*

**If you use a temporary exception, App Store Connect asks you to justify it in writing** — Entitlement Key plus Usage Information covering "How the entitlement can be assessed / Why the entitlement is needed by the app / What functionality this entitlement enables." *(App Store Connect Help › App Sandbox information)*

### The Hardened Runtime — what it is, and when it is required

**What:** "The Hardened Runtime, along with System Integrity Protection (SIP), protects the runtime integrity of your software by preventing certain classes of exploits, like code injection, dynamically linked library (DLL) hijacking, and process memory space tampering." And the reassuring half: "**The Hardened Runtime doesn't affect the operation of most apps**, but it does disallow certain less common capabilities, like just-in-time (JIT) compilation." *(Security › Hardened Runtime)*

**When required — notarization.** "**To upload a macOS app to be notarized, you must enable the Hardened Runtime capability.**" *(Security › Hardened Runtime)* Stated again from the Xcode side: "**Apple only notarizes macOS apps that enable the Hardened Runtime capability.**" *(Xcode › Configuring the hardened runtime)*

**And when notarization itself is required:** "Beginning in macOS 10.14.5, software signed with a new Developer ID certificate and all new or updated kernel extensions must be notarized to run. Beginning in macOS 10.15, all software built after June 1, 2019, and distributed with Developer ID must be notarized. **However, you aren't required to notarize software that you distribute through the Mac App Store because the App Store submission process already includes equivalent security checks.**" *(Security › Notarizing macOS software before distribution)*

**The exception entitlements, by identifier.** All are Boolean, and all default to off:

| Entitlement | What it re-enables |
|---|---|
| `com.apple.security.cs.allow-jit` | "create writable and executable memory using the `MAP_JIT` flag" |
| `com.apple.security.cs.allow-unsigned-executable-memory` | "create writable and executable memory without the restrictions imposed by using the `MAP_JIT` flag" |
| `com.apple.security.cs.allow-dyld-environment-variables` | "may be affected by dynamic linker environment variables, which you can use to inject code into your app's process" |
| `com.apple.security.cs.disable-library-validation` | "loads arbitrary plug-ins or frameworks, without requiring code signing" |
| `com.apple.security.cs.disable-executable-page-protection` | "disable all code signing protections while launching an app, and during its execution" |
| `com.apple.security.cs.debugger` | "the app is a debugger and may attach to other processes or get task ports" |

Apple's own warning on the last group: "Specific runtime exceptions, such as Disable Executable Memory Protection, remove core security barriers from your app. **Always apply caution when using runtime exceptions and opt for the narrowest set of entitlements that enable the required functionality.**"

**Three mechanics that decide whether an entitlement is even present:**

1. **False means absent.** "The default value of these Boolean entitlements is false. When Xcode signs your code, it includes an entitlement only if the value is true. If you're manually signing code, follow this convention to ensure maximum compatibility. **Don't include an entitlement if the value is false.**"
2. **Only executables carry them.** "You add entitlements only to executables. **Shared libraries, frameworks, and in-process plug-ins inherit the entitlements of their host executable.**" Which makes the host responsible for its plug-ins' needs: "a host app must include all the entitlements that prospective plug-ins require, even when the plug-ins are notarized separately."
3. **System extensions are excluded.** "Due to their privileged position in the system, macOS refuses to load system extensions that use Hardened Runtime exception entitlements. There's one exception to this general rule: macOS allows the Allow execution of JIT-compiled code entitlement in non-DEXT system extensions."

**Notarization's full prerequisite list**, quoted from Apple's page — the Hardened Runtime is one item of six:

- "Enable code-signing for all of the executables you distribute, and ensure that executables have valid code signatures."
- "Use a 'Developer ID' application, kernel extension, system extension, or installer certificate for your code-signing signature. (Don't use a Mac Distribution, ad hoc, Apple Developer, or local development certificate.)"
- "Enable the Hardened Runtime capability for your app and command line targets."
- "Include a secure timestamp with your code-signing signature."
- "**Don't include the `com.apple.security.get-task-allow` entitlement with the value set to any variation of `true`.**"
- "Link against the macOS 10.9 or later SDK."

### The two are not the same, and neither implies the other

This is the single most common wrong belief in this area, so state it plainly:

| | App Sandbox | Hardened Runtime |
|---|---|---|
| Entitlement | `com.apple.security.app-sandbox` | *(the capability; exceptions are `com.apple.security.cs.*`)* |
| Required for | Mac App Store distribution | Notarization — i.e. Developer ID distribution outside the store |
| Enforced by | the kernel, at runtime | the runtime, plus SIP |
| What it does | restricts what the app may reach | prevents code injection, library hijacking, memory tampering |
| Sources | Security › App Sandbox; Review Guidelines 2.4.5(i) | Security › Hardened Runtime; Security › Notarizing macOS software |

They coincide in exactly one documented case Apple names: "When you use Mac Catalyst to enable your iPad app to run in macOS, Xcode automatically adds the App Sandbox **and** Hardened Runtime capabilities to the macOS target." *(Xcode › Configuring the macOS App Sandbox)*

**A trap for anyone matching identifiers.** The microphone has two different entitlement identifiers depending on which capability you are configuring: `com.apple.security.device.microphone` is reached by "enable the App Sandbox capability in Xcode and under Hardware select Audio Input", while `com.apple.security.device.audio-input` is reached by "first enable the Hardened Runtime capability in Xcode, and then under Resource Access, select Audio Input". Same checkbox label, two identifiers. A rule that knows only one of them misses every project configured the other way.

**Least privilege is Apple's stated position, and it is checkable.** "Before submitting your app for review, limit entitlements to the minimum required for your application to function. **Remove any unnecessary entitlements that your app isn't using.**" *(Bundle Resources › Diagnosing Issues with Entitlements)*

---

## 3. Icon sets — what a complete set is, per platform

**The current answer changed shape in 2025, and a rule written against the old shape will be wrong.** Icons are now layered, and one file covers several platforms.

### The specification table

| Platform | Layout shape | Icon shape after system masking | Layout size | Style | Appearances |
|---|---|---|---|---|---|
| iOS, iPadOS, macOS | Square | Rounded rectangle (square) | 1024x1024 px | Layered | Default, dark, clear light, clear dark, tinted light, tinted dark |
| tvOS | Rectangle (landscape) | Rounded rectangle (rectangular) | 800x480 px | Layered (Parallax) | N/A |
| visionOS | Square | Circular | 1024x1024 px | Layered (3D) | N/A |
| watchOS | Square | Circular | 1088x1088 px | Layered | N/A |

*(HIG › App icons, Specifications)* Apple adds: "**The system automatically scales your icon to produce smaller variants** that appear in certain locations, such as Settings and notifications." Supported colour spaces are "sRGB (color)", "Gray Gamma 2.2 (grayscale)" and "Display P3 (wide-gamut color in iOS, iPadOS, macOS, tvOS, and watchOS only)".

### The two supported delivery paths

**Path A — Icon Composer, one file for iOS, iPadOS, macOS, watchOS and the App Store.** "Use Icon Composer to create a single multilayer file that you can add to your Xcode project to represent your Liquid Glass app icon everywhere your app icon appears across iOS, iPadOS, macOS, watchOS, and the App Store… **The system automatically renders your app icon for the different platforms, appearances, and sizes from your single Icon Composer file.**" *(Xcode › Creating your app icon using Icon Composer)*

The session says the same thing in the designer's words: "there's no need to worry about creating all those different sizes anymore. We've designed the materials to adapt and scale to your icon," and names the six variants you should preview — "Default, Dark, Clear light, Clear dark, Tinted light, and Tinted dark." *(WWDC25 › Create icons with Icon Composer)*

Adding one replaces the old set: "**If you add an Icon Composer file to your Xcode project, it replaces any existing icon asset catalog that you previously used to represent your app icon.** Xcode automatically generates a similar-looking version of the Liquid Glass icon for previous releases. If you want your existing icon to appear in previous releases, continue to use asset catalogs to represent your app icon."

**Path B — an asset catalog.** Apple's per-platform rules, quoted from *Xcode › Configuring your app icon using an asset catalog*:

- "iOS, iPadOS, tvOS, and watchOS apps can **auto-generate all icon variations from a single 1024×1024 pixel image**. This is the default behavior when you create a new iOS, iPadOS, tvOS, and watchOS app, or a new icon in the asset catalog."
- "For **macOS and tvOS**, you need to supply an asset for each size."
- "For **visionOS**, you need to supply a single 1024x1024 pixel asset."

**Those two bullets disagree about tvOS, and Apple does not reconcile them on that page.** tvOS is named both as auto-generating from one image and as needing an asset per size. Report the ambiguity; do not pick a side for Apple. What is unambiguous is macOS: on the asset-catalog path it needs an asset for each size, and on the Icon Composer path it does not.

**Layer counts are per-platform and bounded:**

- iOS, iPadOS, macOS, watchOS: "a background layer and one or more foreground layers". In Icon Composer, layers are organised "into a **maximum of four groups**"; the session's phrasing is "By default, it'll always be one, but you can go all the way up to four. We found this number provides the right bounds for how much visual complexity an icon should have."
- tvOS: "tvOS app icons use **between two and five layers**." The asset-catalog article agrees: "you can use up to five layers when constructing tvOS icons."
- visionOS: "a background layer and **one or two layers on top**" — the asset-catalog article states the ceiling as "three layers… the maximum number of layers visionOS icons support".

**The App Store slot is separate and mandatory for store distribution.** "If you distribute your app through the App Store, you must provide app icon imagery to use in the App Store." Its location varies by platform — for iOS, "Drag an icon image to the iOS 1,024pt image well"; for macOS, "Drag an icon image to the **App Store - 2x** image well"; for tvOS and visionOS, "The App Store generates an icon from the layers of the image stack."

**Changing it after release is a full release.** "If you want to change your app icon after publishing, you must create and upload a new version of your app. Then, submit it for review." *(App Store Connect Help › Add an app icon)*

### Design constraints that are checkable, not taste

- **Don't pre-mask.** "The system masks all layer edges to produce an icon's final shape… **Providing layers with pre-defined masking negatively impacts specular highlight effects and makes edges look jagged.**" The session is blunter: "we never include the rounded rectangle or circle mask in our exports."
- **Don't bake in effects the system supplies.** "The system dynamically applies visual effects to your app icon layers, so **there's no need to include specular highlights, drop shadows between layers, beveled edges, blurs, glows, and other effects**. In addition to interfering with system-provided effects, custom effects are static, whereas the system supplies dynamic ones."
- **Prefer vectors.** "Prefer vector graphics when bringing layers into Icon Composer. Unlike raster images, vector graphics (such as SVG or PDF) scale gracefully and appear crisp at any size. Outline artwork and convert text to outline in your design." Because "SVG format doesn't preserve fonts, convert text to outlines."
- **Text is a last resort.** "Include text only when it's essential to your experience or brand. **Text in icons doesn't support accessibility or localization**, is often too small to read easily, and can make an icon appear cluttered."
- **No Apple hardware.** "Don't use replicas of Apple hardware products. Apple products are copyrighted and can't be reproduced in your app icons."
- **Alternate icons are reviewed too.** "Alternate app icons in iOS and iPadOS require their own dark, clear, and tinted variants. As with your default app icon, **all alternate and variant icons are subject to app review** and must adhere to the App Review Guidelines."

---

## 4. Orientation and iPad multitasking

### `UISupportedInterfaceOrientations`

"The interface orientations supported by your app." Its four values, exactly as Apple spells them:

| Value | Apple's definition |
|---|---|
| `UIInterfaceOrientationPortrait` | "The app supports the display in portrait mode, with the device upright and the front camera at the top." |
| `UIInterfaceOrientationPortraitUpsideDown` | "The app supports the display in portrait mode but is upside down… `UIViewController` **ignores this option on devices without a Home button**." |
| `UIInterfaceOrientationLandscapeLeft` | "The app supports the display in landscape mode, with the device upright and the front camera on the right." |
| `UIInterfaceOrientationLandscapeRight` | "The app supports the display in landscape mode, with the device upright and the front camera on the left." |

The key is iOS and iPadOS only, and it can be qualified per device: "To set supported orientations for specific platforms and devices, add platform- or device-specific keys to the information property list."

**It overrides the older single-orientation key.** `UIInterfaceOrientation` — "The initial orientation of the app's user interface" — states: "The default value is `UIInterfaceOrientationPortrait`. **If you add the `UISupportedInterfaceOrientations` key to the information property list, the system ignores this key.**"

**One related key applies only off-platform:** `UIPreferredDefaultInterfaceOrientation` "indicates the preferred initial interface orientation for iPad and iPhone apps running on visionOS", and "If a preferred interface orientation doesn't exist in the app's `UISupportedInterfaceOrientations`, the app receives a default interface orientation provided by the system – landscape right for iPad apps, portrait for iPhone apps."

**What restricting orientation costs, per Apple:**

- **On design:** "**Aim to support both portrait and landscape orientations.** People appreciate apps and games that work well in different device orientations, **but sometimes your experience needs to run in only portrait or only landscape**. When this is the case, you can rely on people trying both orientations before settling on the one you support — there's no need to tell people to rotate their device." *(HIG › Layout, iOS)* This is a recommendation with an explicit carve-out, not a rule.
- **On iPad resizability:** it is a listed prerequisite. To support resizable scenes, the technote requires that your app "Supports all interface orientations." *(TN3192)* So on iPad the recommendation hardens into a condition — restricting orientation and expecting full multitasking are not compatible positions.
- **Locking is now an API, not a plist setting.** `prefersInterfaceOrientationLocked` (iOS/iPadOS/Mac Catalyst 26.0) is "A Boolean value that indicates whether the view controller prefers to lock the scene's interface orientation when the scene is visible." It is a *preference*, and Apple lists the three conditions under which the system will honour it: "The scene is centered on the screen / The scene is the same size as the screen / The scene is not occluded by another scene." And: "The system continuously monitors the state and when the app no longer satisfies the requirements, **it disables the interface orientation lock**." The session gives the legitimate use case: "a driving game may want to lock the orientation when the device is expected to rotate for steering a vehicle." *(WWDC25 › Make your UIKit app more flexible)*

### `UIRequiresFullScreen` — deprecated, and the spelling matters

**The canonical spelling is `UIRequiresFullScreen`, with a capital `S` in `Screen`.** The reference page's title, the companion key `UIRequiresFullScreenIgnoredStartingWithVersion`, and the build setting `INFOPLIST_KEY_UIRequiresFullScreen` all use it. Apple's own prose slips once — the note in TN3192 and the WWDC25 transcript both read "UIRequiresFullscreen" — but the key you write in a plist, and the string anything should match on, is `UIRequiresFullScreen`.

**What it is:** "A Boolean value that indicates whether the system puts an iPad app into a compatibility mode that opts the app out of multitasking and dynamic resizing." It "configures iPadOS apps only, and is ignored for iOS apps." *(TN3192)*

**Its status:** the reference page carries `deprecatedAt: 26.0` and a deprecation summary: "**Opting out of iPad multitasking and dynamic resizing is deprecated.** Use a combination of `UISceneSizeRestrictions` and `prefersInterfaceOrientationLocked` to replace some of the behaviors of `UIRequiresFullScreen`. Make updates to your app to handle multitasking and dynamic resizing, then **remove `UIRequiresFullScreen` from your information property list**."

TN3192 states the timeline and the cost of ignoring it: "Starting in iPadOS 26, `UIRequiresFullscreen` and its associated compatibility mode are deprecated and **will be ignored in a future release**. Apps that don't update **may experience broken layouts, UI elements positioned incorrectly, or content that doesn't fit properly** when the system resizes their scenes to accommodate multitasking scenarios they weren't designed to handle." The session adds: "Apps that are adaptable do not need this key, and should remove it."

**What it costs while it still works** — the key's own page enumerates the compatibility mode, and it is not the "full screen" many developers assume:

*In iPadOS 26 and later on an iPad that supports Windowed Apps, or iPadOS 16+ with Stage Manager, the system:*
- "Maintains a consistent scene size for your app, but **doesn't present your app's scene full screen**"
- "**Allows your app's scene to be on screen with other apps' scenes**"
- "Scales your app's presentation when the user resizes it, rather than changing the size of your app's scene"
- "Consults the supported interface orientations of your app and adjusts the interface orientation of your scene accordingly, **but doesn't visually rotate your scene**"

*In iPadOS 18 and earlier with Split View & Slide Over, the system:*
- "Presents your app's scene full screen"
- "Prevents your app's scene from sharing the screen with other app's scenes in Split View"
- "Prevents your app's scene from being resized by the user"
- "Consults the supported interface orientations of your app, adjusts the interface orientation of your scene accordingly, **and visually rotates your scene**"

**So the same key means two different things depending on the OS.** On modern iPadOS it no longer buys you a full-screen app — it buys you a scaled, non-rotating one that still shares the screen. That is the honest description of the cost.

**If you must keep it for older systems:** `UIRequiresFullScreenIgnoredStartingWithVersion` (iOS/iPadOS 26.2) — "Use this key only if you've already updated your app so that it no longer uses `UIRequiresFullScreen` in later versions of iOS… **The system only uses this key when your information property list also contains `UIRequiresFullScreen` with a value of `true`.**" TN3192's worked example: an app on iOS 18 sets the value to `26`, "Then the system will begin ignoring `UIRequiresFullScreen` on iOS 26, iPadOS 26 and later, while supporting the full screen behavior on iOS 18, iPadOS or earlier."

### What replaces it

- **`UISceneSizeRestrictions`** — "An object that specifies the minimum and maximum sizes for resizable windows." You do not construct it: "Don't create a `UISceneSizeRestrictions` object yourself. Instead, fetch an existing one from the `sizeRestrictions` property of your window scene." Its limits: "The system provides this object only when it supports variable-sized windows," and "The `UISceneSizeRestrictions` object **does not prohibit other resizing behavior like rotation**. When people rotate their device and the scene changes orientation, the scene's bounds will change as well, regardless of the preferences expressed."
- **`prefersInterfaceOrientationLocked`** — above.
- **Adaptive layout generally.** "The first step in creating a great multitasking experience for people is to ensure your app's scenes can adapt to different window sizes." *(UIKit › Multitasking on iPad, Mac, and Apple Vision Pro)* And the design position: "**With rare exceptions — such as some games, and Apple Vision Pro apps running in a Full Space — every app needs to work well with multitasking.**" *(HIG › Multitasking)*
- **A note about who is in control:** "Apps don't control multitasking configurations or receive any indication of the ones that people choose." *(HIG › Multitasking, iPadOS)*

### Two more shipping gates in the same area

**A launch screen becomes an upload requirement.** "Starting in iOS 27 and iPadOS 27, App Store Connect requires your app to include a launch screen configuration in its `Info.plist`. This applies to both iPhone and iPad apps distributed through the App Store and alternative app marketplaces." App Store Connect validates for at least one of `UILaunchStoryboardName`, `UILaunchStoryboards`, `UILaunchScreen`, `UILaunchScreens`, and otherwise rejects the upload with `ITMS-90870: Missing launch screen.` *(TN3208)* The connection to this section is Apple's own: "A launch screen supports modern system features like multitasking and dynamic resizing."

**Scene life cycle becomes mandatory.** "As scenes are vital for ensuring flexibility, **adopting UIScene life cycle will soon be mandatory. In the next major release following iOS 26, UIScene life cycle will be required when building with the latest SDK.** While supporting multiple scenes is encouraged, only the adoption of scene life cycle is required." *(WWDC25 › Make your UIKit app more flexible)*

**And one gate that quietly closed:** "Previously, when new hardware was released with a different screen size, the system would scale or letterbox your app's UI. That scaling would stay in place until you built with a newer SDK and resubmitted your app. **Once you build and submit with the iOS 26 SDK, the system will no longer scale or letterbox your app's UI for a new screen size.**" *(same session)*

---

## Myth-check

| The plausible wrong belief | What Apple actually publishes |
|---|---|
| "App Sandbox and the Hardened Runtime are the same thing, or one implies the other." | Different entitlements, different enforcement, different distribution gates. App Sandbox (`com.apple.security.app-sandbox`) is required "To distribute a macOS app through the Mac App Store". The Hardened Runtime is required to notarize: "To upload a macOS app to be notarized, you must enable the Hardened Runtime capability." Mac App Store apps don't need notarization at all — "you aren't required to notarize software that you distribute through the Mac App Store." Mac Catalyst is the one documented case where Xcode adds both. |
| "Every macOS app must be sandboxed." | Only Mac App Store distribution requires it *(Security › App Sandbox; Review Guidelines 2.4.5(i))*. A Developer ID app distributed directly needs notarization — and therefore the Hardened Runtime — and the sandbox requirement Apple publishes is scoped to Mac App Store distribution, not to that channel. |
| "A hardened-runtime exception entitlement set to `false` is the safe default to write." | "Don't include an entitlement if the value is false." Xcode "includes an entitlement only if the value is true." An explicit `false` is not neutral; Apple asks you to omit the key. |
| "A plug-in or framework declares its own entitlements." | "You add entitlements only to executables. Shared libraries, frameworks, and in-process plug-ins **inherit the entitlements of their host executable**" — so "a host app must include all the entitlements that prospective plug-ins require, even when the plug-ins are notarized separately." |
| "Missing a purpose string just means the permission prompt won't appear." | Three published consequences: the access "fail[s] in a resource-specific way" and "might cause your app to crash"; App Review "rejects apps that contain code accessing those resources without a purpose string" (`ITMS-90683`); and the obligation extends to code you didn't write — "You're responsible for all access of protected resources, including external SDK and library access." |
| "Every `NS…UsageDescription` key is mandatory when the capability is used." | Three tiers. Most say "This key is required…". `NSLocalNetworkUsageDescription` says any such app "**should** include this description". `NSDesktopFolderUsageDescription` and `NSDownloadsFolderUsageDescription` say "The usage description is **optional, but highly recommended**." |
| "If the key isn't literally in `Info.plist`, it's missing." | Xcode's Signing and Capabilities editor writes a build setting instead — "the build setting is `INFOPLIST_KEY_NSLocationWhenInUseUsageDescription`". Localised strings live in `InfoPlist.xcstrings`. A check that reads only the plist file will report correctly configured apps as broken. |
| "A macOS app needs `NSLocationWhenInUseUsageDescription`." | "If you need location information in a macOS app, use `NSLocationUsageDescription` instead." The when-in-use and always keys are documented as iOS keys; `NSLocationUsageDescription` is the macOS one. |
| "The App Store rejects apps that support only one orientation." | No such rule was found in the App Store Review Guidelines or HIG › Layout. The HIG says "**Aim to** support both portrait and landscape orientations… but sometimes your experience needs to run in only portrait or only landscape." The App Store Review Guidelines say nothing about supported orientations. What Apple *does* condition on orientation is iPad resizability: TN3192 lists "Supports all interface orientations" as a prerequisite for resizable scenes. |
| "`UIRequiresFullScreen: true` gives an iPad app the full screen." | Not on modern iPadOS. In the Windowed Apps / Stage Manager era the compatibility mode "doesn't present your app's scene full screen", "Allows your app's scene to be on screen with other apps' scenes", scales rather than resizes, and "doesn't visually rotate your scene". The full-screen behaviour it is named for is the iPadOS 18-and-earlier branch. |
| "`UIRequiresFullScreen` is fine; it isn't marked deprecated in the docs." | Its reference page carries `deprecatedAt: 26.0` and a deprecation summary beginning "Opting out of iPad multitasking and dynamic resizing is deprecated," and TN3192 says it "will be ignored in a future release," with "broken layouts, UI elements positioned incorrectly, or content that doesn't fit properly" as the named cost of not updating. |
| "It's `UIRequiresFullscreen`." | The key is `UIRequiresFullScreen`. Apple's own note in TN3192 and the WWDC25 transcript both spell it with a lowercase `s`; the reference page title, `UIRequiresFullScreenIgnoredStartingWithVersion`, and `INFOPLIST_KEY_UIRequiresFullScreen` do not. Match on the capital `S`. |
| "Locking orientation in code is reliable." | `prefersInterfaceOrientationLocked` is a *preference*. The system honours it only when "The scene is centered on the screen / The scene is the same size as the screen / The scene is not occluded by another scene", and "when the app no longer satisfies the requirements, it disables the interface orientation lock." |
| "A complete icon set is a folder of many sizes." | Not since the Icon Composer workflow: "The system automatically renders your app icon for the different platforms, appearances, and sizes from your single Icon Composer file," and "there's no need to worry about creating all those different sizes anymore." The asset-catalog path still exists, and on it macOS "need[s] an asset for each size" — but adding an Icon Composer file "replaces any existing icon asset catalog". |
| "Dark and tinted icon variants are optional extras." | For iOS and iPadOS alternate icons they are stated as required: "Alternate app icons in iOS and iPadOS **require** their own dark, clear, and tinted variants." For the default icon, "the system automatically generates variants you don't provide" — which is a fallback, not an endorsement. |
| "Add specular highlights and drop shadows so the icon looks finished." | "There's no need to include specular highlights, drop shadows between layers, beveled edges, blurs, glows, and other effects… custom effects are static, whereas the system supplies dynamic ones." And don't pre-mask: "Providing layers with pre-defined masking negatively impacts specular highlight effects and makes edges look jagged." |

---

## Where Apple stops explaining

Three places where it is tempting to fill the gap, and where this document does not:

1. **Why a missing purpose string crashes.** Apple says access "fail[s] in a resource-specific way" and "might" / "may" / "will" crash depending on the key. That page carries neither the enforcement mechanism nor a rule mapping resource to failure mode. Report the missing key and Apple's stated range; don't narrate the runtime.
2. **An enumerated list of macOS icon pixel sizes.** The asset-catalog path says macOS "need[s] an asset for each size" without listing the sizes; the HIG's Specifications table gives one layout size per platform; the WWDC sessions say sizes are no longer something you produce by hand. Do not reconstruct a size list from memory of older documentation.
3. **Whether tvOS auto-generates from one image.** *Configuring your app icon using an asset catalog* says both, in consecutive bullets, and does not reconcile them.

---

## When to use this document

- **iOS / iPadOS apps** — §1 (purpose strings), §3 (icons), §4 (orientation and multitasking). §2 is macOS-only.
- **macOS apps** — §1 (note the macOS-only and macOS-different keys), §2 in full, §3. §4 does not apply.
- **Mac Catalyst** — §2 applies and Xcode has already added both capabilities for you.
- For Liquid Glass materials and icon appearance behaviour in context, see `get_design_doc("apple-hig-liquid-glass")`. For the accessibility obligations that ship alongside these, see `get_design_doc("apple-accessibility")`. For the store listing itself — screenshots, previews, metadata — see `get_design_doc("app-store-optimization")`.
