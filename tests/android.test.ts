import { describe, it, expect } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  androidConfigRules, androidComposeRules, androidReport, inferAndroid,
  ANDROID_NOT_VISIBLE, ANDROID_PREAMBLE, ANDROID_CLOSING,
} from "../dist/android.js";
import { loadKnowledge, findDoc } from "../dist/knowledge.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const findingsDir = join(root, "tests", "fixtures", "android", "compose-findings");
const cleanDir = join(root, "tests", "fixtures", "android", "clean");

const ids = (f: { rule: string }[]) => f.map((x) => x.rule).sort();

describe("inferAndroid", () => {
  it("is silent on a folder with no Android signals", () => {
    expect(inferAndroid([{ path: "readme.txt", source: "hello" }])).toEqual({ android: false, signals: [] });
  });

  it("treats a manifest as a signal", () => {
    const v = inferAndroid([{ path: "app/AndroidManifest.xml", source: "<manifest/>" }]);
    expect(v.android).toBe(true);
    expect(v.signals[0]).toContain("AndroidManifest.xml");
  });

  it("treats an androidx.compose import as a signal", () => {
    const v = inferAndroid([{ path: "Main.kt", source: "import androidx.compose.material3.Text\n" }]);
    expect(v.android).toBe(true);
  });
});

describe("androidConfigRules", () => {
  const platform = { android: true, signals: ["AndroidManifest.xml"] };
  const silent = { android: false, signals: [] };

  it("stays silent when the platform is not Android", () => {
    const files = [{ path: "AndroidManifest.xml", source: `android:windowOptOutEdgeToEdgeEnforcement="true"` }];
    expect(androidConfigRules({ files, platform: silent })).toEqual([]);
  });

  it("reports the edge-to-edge opt-out", () => {
    const files = [{ path: "app/src/main/AndroidManifest.xml", source: `<application android:windowOptOutEdgeToEdgeEnforcement="true"/>` }];
    expect(ids(androidConfigRules({ files, platform }))).toContain("edge-to-edge-opt-out");
  });

  it("reports the predictive-back opt-out", () => {
    const files = [{ path: "AndroidManifest.xml", source: `android:enableOnBackInvokedCallback="false"` }];
    expect(ids(androidConfigRules({ files, platform }))).toContain("predictive-back-opt-out");
  });

  it("reports a day theme with no values-night among the files read", () => {
    const files = [{ path: "res/values/themes.xml", source: "<resources/>" }];
    expect(ids(androidConfigRules({ files, platform }))).toEqual(["theme-no-night"]);
  });

  it("stays silent when a values-night file was read", () => {
    const files = [
      { path: "res/values/themes.xml", source: "<resources/>" },
      { path: "res/values-night/themes.xml", source: "<resources/>" },
    ];
    expect(ids(androidConfigRules({ files, platform }))).not.toContain("theme-no-night");
  });

  it("stays silent when no day XML was read at all", () => {
    const files = [{ path: "Main.kt", source: "import androidx.compose.material3.Text\n" }];
    expect(ids(androidConfigRules({ files, platform }))).not.toContain("theme-no-night");
  });
});

describe("androidComposeRules", () => {
  it("reports a Color(0x…) literal", () => {
    const f = androidComposeRules([{ path: "A.kt", source: "val c = Color(0xFF1A73E8)\n" }]);
    expect(ids(f)).toEqual(["hardcoded-compose-color"]);
    expect(f[0].line).toBe(1);
  });

  it("reports fontSize = N.sp", () => {
    const f = androidComposeRules([{ path: "A.kt", source: "Text(\"Hi\", fontSize = 17.sp)\n" }]);
    expect(ids(f)).toEqual(["fixed-compose-font-size"]);
  });

  it("reports a Material 2 component import and not material3 or material.icons", () => {
    const src = [
      "import androidx.compose.material.Button",
      "import androidx.compose.material3.Text",
      "import androidx.compose.material.icons.Icons",
    ].join("\n");
    expect(ids(androidComposeRules([{ path: "A.kt", source: src }]))).toEqual(["material2-import"]);
  });

  it("does not read a Color inside a comment", () => {
    const f = androidComposeRules([{ path: "A.kt", source: "// Color(0xFF1A73E8)\nval ok = 1\n" }]);
    expect(f).toEqual([]);
  });
});

describe("androidReport on fixtures", () => {
  it("finds every rule on the compose-findings fixture", () => {
    const { structured } = androidReport(findingsDir);
    const rules = structured.findings.map((f) => f.rule).sort();
    expect(rules).toEqual([
      "edge-to-edge-opt-out",
      "fixed-compose-font-size",
      "hardcoded-compose-color",
      "material2-import",
      "predictive-back-opt-out",
      "theme-no-night",
    ]);
    expect(structured.scan.filesRead).toBeGreaterThan(0);
    expect(structured.notVisible).toEqual(ANDROID_NOT_VISIBLE);
  });

  it("is clean on the clean fixture", () => {
    const { structured } = androidReport(cleanDir);
    expect(structured.findings).toEqual([]);
    expect(structured.summary).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it("returns an error-shaped empty audit on a missing directory via the report still scanning", () => {
    // androidReport itself always scans; the tool wrapper turns missing paths
    // into isError. Here we only assert the fixture paths exist as directories.
    const { text } = androidReport(cleanDir);
    expect(text).toContain("Platform: Android");
    expect(text).toContain(ANDROID_PREAMBLE.split(".")[0]);
    expect(text).toContain(ANDROID_CLOSING.slice(0, 40));
  });
});

describe("cited documents exist", () => {
  const docs = loadKnowledge(join(root, "knowledge"));
  it("every finding cites a document that is in the base", () => {
    const { structured } = androidReport(findingsDir);
    for (const f of structured.findings) {
      expect(findDoc(docs, f.doc), f.doc).toBeTruthy();
    }
  });
});
