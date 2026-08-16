// Readers for the four surfaces an Xcode project declares configuration on:
// an Info.plist (XML), an .xcodeproj's build settings (INFOPLIST_KEY_* in the
// pbxproj text), an entitlements plist, and an asset catalog's Contents.json
// files. Nothing here talks to the filesystem — every reader takes source
// text (or, for the asset catalog, an already-read list of files) and
// returns what it found, or an explicit admission that it could not read it.
//
// The rule that shapes readPlist: a project that declares zero keys and a
// project we failed to read look identical unless the reader tells them
// apart. Returning an empty Map means "read, and empty"; returning null
// means "not read". Conflating them would let a later audit report a binary
// plist's permissions as "none declared", which is a false guarantee, not a
// gap — so null is the deliberate, load-bearing case, not a fallback.

export interface PlistValue {
  key: string;
  value: string | boolean | string[];
}

export interface ColorSet {
  path: string;
  hasDarkVariant: boolean;
}

export interface ConfigRead {
  /** Keys found, whichever surface carried them. */
  keys: Map<string, string | boolean | string[]>;
  /** Entitlement identifiers set true, pulled out of the entitlements surface. */
  entitlements: Set<string>;
  /** Colorsets found in an asset catalog, with whether each declares a dark variant. */
  colorSets: ColorSet[];
  /** Which surfaces were actually readable. */
  surfaces: { plist: string[]; buildSettings: string[]; entitlements: string[]; assetCatalogs: string[] };
  /** Paths that exist but could not be parsed — binary plists, malformed JSON. */
  unparsed: string[];
}

// ── plist ────────────────────────────────────────────────────────────────────

/**
 * Finds the index at which the tag `</tag>` opened by the `<tag` at `from`
 * closes, counting nested same-named opens/closes so a `<dict>` holding
 * another `<dict>` is not mistaken for closing at the first `</dict>` it
 * meets. Returns the index of the *start* of the matching close tag, or
 * null if the source runs out before depth returns to zero.
 */
function findMatchingClose(source: string, from: number, tag: string): number | null {
  const openTok = `<${tag}`;
  const closeTok = `</${tag}>`;
  let depth = 1;
  let i = from;
  while (depth > 0) {
    const nextClose = source.indexOf(closeTok, i);
    if (nextClose === -1) return null;
    const nextOpen = source.indexOf(openTok, i);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const tagEnd = source.indexOf(">", nextOpen);
      if (tagEnd === -1) return null;
      if (source[tagEnd - 1] !== "/") depth++; // a self-closed same-named tag does not nest
      i = tagEnd + 1;
    } else {
      depth--;
      i = nextClose + closeTok.length;
    }
  }
  return i - closeTok.length;
}

/**
 * Walks a `<dict>...</dict>` body one `<key>` + value pair at a time.
 *
 * Handles the subset Apple's own project templates emit: `<string>`,
 * `<true/>`, `<false/>`, and `<array>` of `<string>`.
 *
 * A value that is itself a `<dict>` — NSAppTransportSecurity's inner
 * exception dicts, a scene manifest, anything nesting further — is walked
 * only far enough to find its matching close tag so the scan can continue
 * past it correctly; its own keys are never surfaced into the flat map this
 * reader returns, because ConfigRead has no shape for nested structure. The
 * outer key that pointed at it is therefore absent from the result, not
 * present with a guessed or flattened value. The same is true of any other
 * value type outside the subset above (`<integer>`, `<real>`, `<date>`,
 * `<data>`, or an `<array>` whose members are not all `<string>` — only the
 * `<string>` members of such an array are read, the rest silently skipped):
 * the key is dropped rather than represented with a wrong type. A later
 * audit that wants to disclose this gap should point here.
 */
function parseDictBody(body: string, map: Map<string, string | boolean | string[]>): void {
  let pos = 0;
  for (;;) {
    const keyStart = body.indexOf("<key>", pos);
    if (keyStart === -1) return;
    const keyClose = body.indexOf("</key>", keyStart);
    if (keyClose === -1) return; // unbalanced — stop rather than misread the remainder
    const key = body.slice(keyStart + 5, keyClose).trim();
    pos = keyClose + "</key>".length;

    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (body[pos] !== "<") return; // no value node follows — malformed, stop here

    const tagMatch = /^<([A-Za-z][A-Za-z0-9]*)(?:\s[^>]*)?(\/)?>/.exec(body.slice(pos));
    if (!tagMatch) return;
    const tagName = tagMatch[1];
    const selfClosing = !!tagMatch[2];
    const openLen = tagMatch[0].length;

    if (selfClosing) {
      if (tagName === "true") map.set(key, true);
      else if (tagName === "false") map.set(key, false);
      else if (tagName === "array") map.set(key, []); // a self-closed, empty array
      // any other self-closing tag: outside the subset, key dropped
      pos += openLen;
      continue;
    }

    const closeIdx = findMatchingClose(body, pos + openLen, tagName);
    if (closeIdx === null) return; // unbalanced — stop rather than misread the remainder
    const inner = body.slice(pos + openLen, closeIdx);
    pos = closeIdx + `</${tagName}>`.length;

    if (tagName === "string") {
      map.set(key, inner);
    } else if (tagName === "array") {
      const strings: string[] = [];
      for (const m of inner.matchAll(/<string>([\s\S]*?)<\/string>/g)) strings.push(m[1]);
      map.set(key, strings);
    }
    // "dict" and any other tag name: read past, key not recorded (see doc comment above).
  }
}

/**
 * Reads an XML property list into its top-level keys.
 *
 * Returns `null`, not an empty Map, for a binary plist (detected by the
 * `bplist00` magic) or for anything that does not carry a `<plist>` /
 * `<dict>` structure at all — these are cases where the reader could not
 * look, and saying so is different from saying the project declared
 * nothing. A binary plist is never parsed here even partially: a wrong
 * parse would produce confident wrong keys, which is worse than the
 * admitted gap.
 */
export function readPlist(source: string): Map<string, string | boolean | string[]> | null {
  if (source.trimStart().startsWith("bplist00")) return null; // binary — refuse rather than guess

  const plistOpen = /<plist[\s>]/.exec(source);
  if (!plistOpen) return null; // not a plist we recognise at all

  const dictStart = source.indexOf("<dict", plistOpen.index);
  if (dictStart === -1) return null; // a <plist> with no top-level <dict> — nothing to read

  const tagEnd = source.indexOf(">", dictStart);
  if (tagEnd === -1) return null;

  const map = new Map<string, string | boolean | string[]>();
  if (source[tagEnd - 1] === "/") return map; // self-closed <dict/>: a real, empty dict

  const closeIdx = findMatchingClose(source, tagEnd + 1, "dict");
  if (closeIdx === null) return null; // unbalanced dict — malformed, cannot be trusted

  parseDictBody(source.slice(tagEnd + 1, closeIdx), map);
  return map;
}

// ── build settings ──────────────────────────────────────────────────────────

/**
 * Pulls `INFOPLIST_KEY_*` assignments out of a `.pbxproj`'s raw text —
 * Xcode's "generate Info.plist" mode writes Info.plist keys as build
 * settings instead of into a plist file. Only the `INFOPLIST_KEY_` prefix is
 * recognised (that is the one Xcode itself emits for this purpose); every
 * other build setting, however Info.plist-shaped its name looks, is left
 * alone rather than guessed at. Values are returned as the raw right-hand
 * side text — quotes stripped when the setting was quoted — since this
 * reader does not know or assume the setting's intended type.
 */
export function readBuildSettingKeys(pbxproj: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /INFOPLIST_KEY_([A-Za-z0-9_]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;\n]+));/g;
  for (const m of pbxproj.matchAll(re)) {
    const value = m[2] !== undefined ? m[2] : m[3].trim();
    map.set(m[1], value);
  }
  return map;
}

// ── entitlements ─────────────────────────────────────────────────────────────

/**
 * Reads an entitlements plist (the same XML shape as an Info.plist) down to
 * the identifiers that are declared `true`. An entitlement declared `false`
 * or any other value is not a granted capability, so it is left out.
 *
 * A source this reader cannot parse (binary, not a plist) yields an empty
 * Set here — `readPlist` is where "could not read" is distinguished from
 * "read, none granted"; callers that need that distinction should call
 * `readPlist` on the same source themselves rather than infer it from an
 * empty result here.
 */
export function readEntitlements(source: string): Set<string> {
  const map = readPlist(source);
  const out = new Set<string>();
  if (!map) return out;
  for (const [key, value] of map) {
    if (value === true) out.add(key);
  }
  return out;
}

// ── asset catalog ────────────────────────────────────────────────────────────

/**
 * Reads colorsets out of an already-collected list of asset catalog files.
 * Only `*.colorset/Contents.json` entries are considered — other catalog
 * members (`.appiconset`, `.imageset`, `.dataset`, the catalog's own root
 * `Contents.json`) are not colors and are skipped rather than misfiled.
 *
 * `hasDarkVariant` is true when any color entry carries an `appearances`
 * override for `luminosity: dark` — the standard Xcode-generated shape for
 * "this colorset has a dark appearance". Any other appearance axis (high
 * contrast, tinted) is not treated as a dark variant, because it isn't one.
 *
 * A `Contents.json` that is not valid JSON is skipped, not reported as a
 * colorset with no dark variant — that would misrepresent a file we could
 * not read as a file we read and found plain.
 */
export function readAssetCatalog(files: Array<{ path: string; source: string }>): ColorSet[] {
  const out: ColorSet[] = [];
  for (const file of files) {
    if (!/\.colorset\/Contents\.json$/.test(file.path)) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.source);
    } catch {
      continue; // malformed JSON — not a colorset we can read, not one we can rule on
    }

    const colors = (parsed as { colors?: unknown })?.colors;
    const hasDarkVariant =
      Array.isArray(colors) &&
      colors.some((c) => {
        const appearances = (c as { appearances?: unknown })?.appearances;
        return (
          Array.isArray(appearances) &&
          appearances.some((a) => (a as { appearance?: unknown; value?: unknown })?.appearance === "luminosity" && (a as { value?: unknown })?.value === "dark")
        );
      });

    out.push({ path: file.path, hasDarkVariant });
  }
  return out;
}
