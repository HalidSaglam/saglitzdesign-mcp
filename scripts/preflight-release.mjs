#!/usr/bin/env node
//
// Refuse to release something inconsistent.
//
// A version lives in six places that have no way of noticing each other: the
// package, its lockfile, the registry manifest, the plugin manifest and its
// marketplace entry, the changelog, and the git tag that triggers the whole
// thing. Any pair can drift. The expensive one is the tag — npm and the MCP
// Registry both refuse to republish a version, so `v0.20.0` pushed against a
// package still saying 0.19.1 does not fail loudly, it silently re-ships the
// old release under a new name and there is no undo.
//
// So this runs before anything is published, and says no.
//
// Usage:
//   node scripts/preflight-release.mjs            # check the tree
//   node scripts/preflight-release.mjs v0.20.0    # …and that the tag agrees
//
// In GitHub Actions the tag is read from GITHUB_REF when no argument is given.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

const errors = [];
const ok = [];

const pkg = JSON.parse(read("package.json"));
const version = pkg.version;

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version ?? "")) {
  errors.push(`package.json version "${version}" is not a plain semver`);
}
ok.push(`package.json — ${version}`);

// package-lock.json carries the version twice at the root — the top-level
// field and the "" package entry — and `npm version` writes both. A
// hand-edited package.json does not, and nothing else here reads the lockfile,
// so it drifted to 0.22.0 under a 0.23.0 package while preflight reported
// "consistent". It ships to nobody, but it is the file `npm ci` reads, so a
// CI run installs against a tree that disagrees with the package it is
// building.
const lock = JSON.parse(read("package-lock.json"));
const lockVersions = [lock.version, lock.packages?.[""]?.version];
const lockStale = lockVersions.filter((v) => v !== version);
if (lockStale.length) {
  errors.push(
    `package-lock.json still says ${[...new Set(lockStale)].join(", ")} while the package is ${version}. ` +
    "Run `npm install --package-lock-only` (or `npm version`, which writes both) and commit the result.",
  );
} else {
  ok.push(`package-lock.json — ${lockVersions.length} version field(s) agree`);
}

// server.json carries the version twice: once for the server, once per package
// entry. `npm version` syncs it via scripts/sync-version.mjs, but a hand-edited
// release would not, and the registry card is what users read.
const manifest = JSON.parse(read("server.json"));
const manifestVersions = [manifest.version, ...(manifest.packages ?? []).map((p) => p.version)];
const stale = manifestVersions.filter((v) => v !== version);
if (stale.length) {
  errors.push(
    `server.json still says ${[...new Set(stale)].join(", ")} while the package is ${version}. ` +
    "Run `npm version` rather than editing package.json by hand — it syncs this file.",
  );
} else {
  ok.push(`server.json — ${manifestVersions.length} version field(s) agree`);
}

// The plugin surface carries the version twice as well: `.claude-plugin/plugin.json`
// is what Claude Code reads when the plugin loads, and the marketplace entry is
// what a user sees before they install. Neither is on `npm version`'s path and
// neither is imported by anything the suite runs, so both drift silently — and a
// marketplace entry pinned to a version the plugin no longer carries offers an
// install that resolves to something else.
const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
const market = JSON.parse(read(".claude-plugin/marketplace.json"));
// `plugins`, not `entries`. An unrecognised key here is ignored at load time
// rather than rejected, so a manifest listing its plugins under the wrong name
// presents as an empty marketplace — which is why this reads the same key the
// loader does and reports a name that matches nothing as a problem.
const pluginVersions = [
  plugin.version,
  ...(market.plugins ?? [])
    .filter((e) => e.name === plugin.name)
    .map((e) => e.version),
];
const pluginStale = pluginVersions.filter((v) => v !== version);
if (pluginStale.length) {
  errors.push(
    `.claude-plugin/plugin.json / .claude-plugin/marketplace.json still say ${[...new Set(pluginStale)].join(", ")} ` +
    `while the package is ${version}. Bump every version surface together.`,
  );
} else if (pluginVersions.length < 2) {
  errors.push(
    `.claude-plugin/marketplace.json lists no plugin named "${plugin.name}", so nothing pins the version a user installs`,
  );
} else {
  ok.push(`.claude-plugin/ plugin + marketplace — ${pluginVersions.length} version field(s) agree`);
}

// A release with no changelog entry is a release nobody can read.
const changelog = read("CHANGELOG.md");
const heading = new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]`, "m");
if (!heading.test(changelog)) {
  errors.push(`CHANGELOG.md has no "## [${version}]" section — write one before releasing`);
} else {
  const section = changelog.split(heading)[1]?.split(/^## \[/m)[0] ?? "";
  if (section.replace(/[\s—–-]/g, "").length < 80) {
    errors.push(`the CHANGELOG entry for ${version} is nearly empty — say what changed`);
  } else {
    ok.push(`CHANGELOG.md — an entry for ${version}`);
  }
}

// The tag is the trigger, so it is the one that must not be wrong.
// Only a tag ref counts. A manual (workflow_dispatch) run happens on a branch,
// where GITHUB_REF is refs/heads/… — reading that as a tag would compare a
// branch name against a version and fail every gate-only run.
const envTag = process.env.GITHUB_REF?.startsWith("refs/tags/")
  ? process.env.GITHUB_REF.slice("refs/tags/".length)
  : null;
const ref = process.argv[2] ?? envTag;
if (ref) {
  const tagged = ref.replace(/^v/, "");
  if (tagged !== version) {
    errors.push(
      `tag ${ref} does not match package.json ${version}. ` +
      "npm and the MCP Registry both refuse to republish a version, so this would quietly ship nothing new.",
    );
  } else {
    ok.push(`tag ${ref} — matches`);
  }
} else {
  ok.push("no tag to check (not a tagged run)");
}

console.log("preflight-release");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of errors) console.log(`  ✗ ${line}`);

if (errors.length) {
  console.error(`\npreflight-release — ${errors.length} problem(s). Nothing published.`);
  process.exit(1);
}
console.log(`\npreflight-release — ok. ${pkg.name}@${version} is consistent.`);
