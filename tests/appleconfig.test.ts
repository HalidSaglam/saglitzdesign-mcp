import { describe, it, expect } from "vitest";
import { readPlist, readBuildSettingKeys, readEntitlements, readAssetCatalog } from "../dist/appleconfig.js";

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
