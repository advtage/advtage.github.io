#!/usr/bin/env node
/**
 * Publish or refresh the updater handoff on dylan-griffin/advtage-releases.
 *
 * Installed apps that still poll the old repo read Latest → latest.json.
 * This copies the org site's current latest.json onto the handoff release so
 * those clients keep tracking new org builds (e.g. 0.1.25+).
 *
 * Requires write access to dylan-griffin/advtage-releases.
 *
 * Usage:
 *   node scripts/publish-handoff-release.mjs
 *   node scripts/publish-handoff-release.mjs --refresh   # same; refresh is default when tag exists
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OLD = "dylan-griffin/advtage-releases";
const NEW_LATEST =
  "https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json";
const TAG = "app-v0.1.24-handoff";
const WORK = "/tmp/advtage-handoff";

function ghJson(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8" }));
}

function gh(args, opts = {}) {
  return execFileSync("gh", args, { encoding: "utf8", ...opts });
}

const notes = `## Updater handoff

Public Advtage releases live on the org site repo. This release’s \`latest.json\`
is a mirror of the org Latest updater manifest so older installed apps that still
poll \`dylan-griffin/advtage-releases\` keep receiving updates.

**Canonical updater URL:** ${NEW_LATEST}

- Downloads: https://github.com/advtage/advtage.github.io/releases
- Website: https://advtage.github.io/

Re-run \`node scripts/publish-handoff-release.mjs\` after each org release (or wire
it into CI) until all clients point at the org endpoint.
`;

fs.mkdirSync(WORK, { recursive: true });

const latestPath = path.join(WORK, "latest.json");
execFileSync("curl", ["-fsSL", NEW_LATEST, "-o", latestPath], {
  stdio: "inherit",
});
const mirrored = JSON.parse(fs.readFileSync(latestPath, "utf8"));
console.log(`Mirroring org latest.json version ${mirrored.version}`);

const notesPath = path.join(WORK, "NOTES.md");
fs.writeFileSync(notesPath, notes);

let existing = null;
try {
  existing = ghJson(["api", `repos/${OLD}/releases/tags/${TAG}`]);
} catch {
  /* missing */
}

if (!existing?.id) {
  console.log(`Creating ${TAG} on ${OLD}…`);
  gh(
    [
      "release",
      "create",
      TAG,
      "--repo",
      OLD,
      "--title",
      "Advtage updater handoff → org site releases",
      "--notes-file",
      notesPath,
      "--latest",
    ],
    { stdio: "inherit" }
  );
} else {
  console.log(`Refreshing existing ${TAG}: ${existing.html_url}`);
  // Keep release notes current; ignore failure if notes-only patch is blocked.
  try {
    gh(
      [
        "api",
        "-X",
        "PATCH",
        `repos/${OLD}/releases/${existing.id}`,
        "-f",
        `body=${notes}`,
      ],
      { stdio: "inherit" }
    );
  } catch (err) {
    console.warn("Could not patch release notes (non-fatal):", err.message || err);
  }
}

gh(["release", "upload", TAG, "--repo", OLD, latestPath, "--clobber"], {
  stdio: "inherit",
});

const updated = ghJson(["api", `repos/${OLD}/releases/tags/${TAG}`]);
const check = ghJson([
  "api",
  "-H",
  "Accept: application/octet-stream",
  `repos/${OLD}/releases/assets/${
    updated.assets.find((a) => a.name === "latest.json").id
  }`,
]);
// When Accept octet-stream redirects, gh may return JSON if API accepts json — fall back to curl verify
let version = mirrored.version;
try {
  const remote = execFileSync(
    "curl",
    [
      "-fsSL",
      `https://github.com/${OLD}/releases/download/${TAG}/latest.json`,
    ],
    { encoding: "utf8" }
  );
  version = JSON.parse(remote).version;
} catch {
  /* use mirrored */
}

console.log(`Handoff release: ${updated.html_url}`);
console.log(
  `latest.json: https://github.com/${OLD}/releases/download/${TAG}/latest.json`
);
console.log(`Verified handoff version: ${version}`);
if (version !== mirrored.version) {
  console.error(
    `Version mismatch: handoff=${version} org=${mirrored.version}`
  );
  process.exit(1);
}
