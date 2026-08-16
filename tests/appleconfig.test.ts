import { describe, it, expect } from "vitest";
import { readPlist, readBuildSettingKeys, readEntitlements, readAssetCatalog, inferPlatform } from "../dist/appleconfig.js";

describe("readPlist", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>NSCameraUsageDescription</key><string>To scan receipts</string>
  <key>UIRequiresFullScreen</key><true/>
  <key>UISupportedInterfaceOrientations</key>
  <array><string>UIInterfaceOrientationPortrait</string></array>
</dict></plist>`;

  it("reads strings, booleans and arrays", () => {
    const m = readPlist(xml)!;
    expect(m.get("NSCameraUsageDescription")).toBe("To scan receipts");
    expect(m.get("UIRequiresFullScreen")).toBe(true);
    expect(m.get("UISupportedInterfaceOrientations")).toEqual(["UIInterfaceOrientationPortrait"]);
  });

  it("returns null for a binary plist rather than pretending it is empty", () => {
    expect(readPlist("bplist00\x00\x01\x02not real xml")).toBeNull();
  });

  it("returns null for a file that is not a plist", () => {
    expect(readPlist("# just a readme")).toBeNull();
  });

  it("reads an empty dict as empty, not unreadable", () => {
    expect(readPlist(`<plist version="1.0"><dict></dict></plist>`)?.size).toBe(0);
  });

  it("drops a key whose value is a nested dict, but keeps reading past it", () => {
    const nested = `<plist version="1.0"><dict>
      <key>NSAppTransportSecurity</key>
      <dict><key>NSAllowsArbitraryLoads</key><true/></dict>
      <key>CFBundleDisplayName</key><string>Receipts</string>
    </dict></plist>`;
    const m = readPlist(nested)!;
    expect(m.has("NSAppTransportSecurity")).toBe(false);
    expect(m.get("CFBundleDisplayName")).toBe("Receipts");
  });

  it("does not harvest strings out of an array's nested dicts (CFBundleURLTypes)", () => {
    const urlTypes = `<plist version="1.0"><dict>
      <key>CFBundleURLTypes</key>
      <array><dict>
        <key>CFBundleTypeRole</key><string>Editor</string>
        <key>CFBundleURLName</key><string>com.example.myapp</string>
        <key>CFBundleURLSchemes</key><array><string>myapp</string><string>myapp2</string></array>
      </dict></array>
      <key>CFBundleDisplayName</key><string>Receipts</string>
    </dict></plist>`;
    const m = readPlist(urlTypes)!;
    // No direct <string> children of the outer array — its only member is a
    // <dict> — so the array reads as empty, not as a flattened mix of the
    // role, bundle identifier and schemes nested one level down inside it.
    expect(m.get("CFBundleURLTypes")).toEqual([]);
    expect(m.get("CFBundleDisplayName")).toBe("Receipts");
  });

  it("reads direct-child strings of an array unaffected by a sibling nested array", () => {
    const mixed = `<plist version="1.0"><dict>
      <key>Nested</key>
      <array>
        <string>direct-one</string>
        <array><string>buried</string></array>
        <string>direct-two</string>
      </array>
    </dict></plist>`;
    const m = readPlist(mixed)!;
    expect(m.get("Nested")).toEqual(["direct-one", "direct-two"]);
  });
});

describe("readBuildSettingKeys", () => {
  it("finds INFOPLIST_KEY_ settings and strips the prefix", () => {
    const pbx = `
        INFOPLIST_KEY_NSCameraUsageDescription = "To scan receipts";
        INFOPLIST_KEY_UILaunchScreen_Generation = YES;
        PRODUCT_NAME = "$(TARGET_NAME)";`;
    const m = readBuildSettingKeys(pbx);
    expect(m.get("NSCameraUsageDescription")).toBe("To scan receipts");
    expect(m.get("UILaunchScreen_Generation")).toBe("YES");
    expect(m.has("PRODUCT_NAME")).toBe(false);
  });

  it("tolerates whitespace between the closing quote and the semicolon", () => {
    const pbx = [
      'INFOPLIST_KEY_A = "one space" ;',
      'INFOPLIST_KEY_B = "two spaces"  ;',
      'INFOPLIST_KEY_C = "a tab"\t;',
    ].join("\n");
    const m = readBuildSettingKeys(pbx);
    expect(m.get("A")).toBe("one space");
    expect(m.get("B")).toBe("two spaces");
    expect(m.get("C")).toBe("a tab");
  });

  it("unescapes \\\" and \\\\ inside a quoted value", () => {
    const pbx = String.raw`INFOPLIST_KEY_X = "needs \"access\" to camera";`;
    const m = readBuildSettingKeys(pbx);
    expect(m.get("X")).toBe('needs "access" to camera');
  });
});

describe("readEntitlements", () => {
  it("collects the entitlement identifiers that are set true", () => {
    const xml = `<plist version="1.0"><dict>
      <key>com.apple.security.app-sandbox</key><true/>
      <key>com.apple.security.device.audio-input</key><true/>
      <key>com.apple.security.device.camera</key><false/>
    </dict></plist>`;
    const s = readEntitlements(xml);
    expect(s.has("com.apple.security.app-sandbox")).toBe(true);
    expect(s.has("com.apple.security.device.audio-input")).toBe(true);
    expect(s.has("com.apple.security.device.camera")).toBe(false);
  });

  it("returns an empty set, not a thrown error, for a binary entitlements file", () => {
    expect(readEntitlements("bplist00\x00\x01\x02").size).toBe(0);
  });
});

describe("readAssetCatalog", () => {
  it("reports a colorset with no dark appearance", () => {
    const light = JSON.stringify({ colors: [{ idiom: "universal", color: { components: { red: "0.1", green: "0.2", blue: "0.3" } } }] });
    const both = JSON.stringify({ colors: [
      { idiom: "universal", color: {} },
      { idiom: "universal", appearances: [{ appearance: "luminosity", value: "dark" }], color: {} },
    ] });
    const sets = readAssetCatalog([
      { path: "Assets.xcassets/Brand.colorset/Contents.json", source: light },
      { path: "Assets.xcassets/Ink.colorset/Contents.json", source: both },
      { path: "Assets.xcassets/AppIcon.appiconset/Contents.json", source: "{}" },
    ]);
    expect(sets.map((s) => [s.path.split("/")[1], s.hasDarkVariant]))
      .toEqual([["Brand.colorset", false], ["Ink.colorset", true]]);
  });

  it("skips a Contents.json that is not valid JSON rather than calling it plain", () => {
    const sets = readAssetCatalog([
      { path: "Assets.xcassets/Broken.colorset/Contents.json", source: "{ not json" },
    ]);
    expect(sets).toEqual([]);
  });
});

describe("inferPlatform", () => {
  const swift = (s: string) => [{ path: "App.swift", source: s }];
  const none = { keys: new Map(), entitlements: new Set<string>(), swiftSources: [] };

  it("reads sandbox as macOS", () => {
    const v = inferPlatform({ ...none, entitlements: new Set(["com.apple.security.app-sandbox"]) });
    expect(v.platform).toBe("macos");
    expect(v.signals).toContain("com.apple.security.app-sandbox in entitlements");
  });

  it("reads an iOS-only plist key as iOS", () => {
    expect(inferPlatform({ ...none, keys: new Map([["UIRequiresFullScreen", true]]) }).platform).toBe("ios");
  });

  it("reads imports when configuration says nothing", () => {
    expect(inferPlatform({ ...none, swiftSources: swift("import AppKit\n") }).platform).toBe("macos");
    expect(inferPlatform({ ...none, swiftSources: swift("import UIKit\n") }).platform).toBe("ios");
  });

  it("returns null and says so when signals conflict", () => {
    const v = inferPlatform({
      keys: new Map([["LSMinimumSystemVersion", "13.0"]]),
      entitlements: new Set(),
      swiftSources: swift("import UIKit\n"),
    });
    expect(v.platform).toBeNull();
    expect(v.conflicted).toBe(true);
    expect(v.signals.length).toBeGreaterThan(1);
  });

  it("returns null with no signals at all rather than guessing", () => {
    const v = inferPlatform({ ...none, swiftSources: swift("import SwiftUI\n") });
    expect(v.platform).toBeNull();
    expect(v.conflicted).toBe(false);
    expect(v.signals).toEqual([]);
  });

  it("does not read `import SwiftUI` as either platform", () => {
    expect(inferPlatform({ ...none, swiftSources: swift("import SwiftUI\nimport Foundation\n") }).signals).toEqual([]);
  });

  it("does not let a commented-out import decide the platform (was I1)", () => {
    const blockCommented = inferPlatform({ ...none, swiftSources: swift("/*\nimport AppKit\n*/\n") });
    expect(blockCommented.platform).toBeNull();
    expect(blockCommented.conflicted).toBe(false);
    expect(blockCommented.signals).toEqual([]);

    const lineCommented = inferPlatform({ ...none, swiftSources: swift("// import AppKit\n") });
    expect(lineCommented.signals).toEqual([]);

    const lineCommentedNoSpace = inferPlatform({ ...none, swiftSources: swift("//import AppKit\n") });
    expect(lineCommentedNoSpace.signals).toEqual([]);
  });

  it("still reads a live import once a commented-out one has been masked out", () => {
    const v = inferPlatform({ ...none, swiftSources: swift("// import AppKit\nimport UIKit\n") });
    expect(v.platform).toBe("ios");
    expect(v.signals).toEqual(["import UIKit in any Swift file"]);
  });

  it("reads an `@testable import` the same as a plain one", () => {
    expect(inferPlatform({ ...none, swiftSources: swift("@testable import UIKit\n") }).platform).toBe("ios");
  });

  it("reads both frameworks imported directly in one file as conflicted", () => {
    const v = inferPlatform({ ...none, swiftSources: swift("import AppKit\nimport UIKit\n") });
    expect(v.platform).toBeNull();
    expect(v.conflicted).toBe(true);
    expect(v.signals).toEqual(["import AppKit in any Swift file", "import UIKit in any Swift file"]);
  });
});
