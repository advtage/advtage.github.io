#!/usr/bin/env node
/**
 * Publish a final handoff release on dylan-griffin/advtage-releases so installed
 * apps that still poll that repo pick up a latest.json pointing at the org site.
 *
 * Requires write access to dylan-griffin/advtage-releases.
 *
 * Usage: node scripts/publish-handoff-release.mjs
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

Public Advtage releases have moved to the org site repo:

**${NEW_LATEST}**

- Download installers: https://github.com/advtage/advtage.github.io/releases
- Website: https://advtage.github.io/

This release exists only so older installed apps still polling \`dylan-griffin/advtage-releases\` can discover the new updater endpoint. New builds publish to \`advtage/advtage.github.io\`.
`;

fs.mkdirSync(WORK, { recursive: true });

// Prefer the real latest.json from the org site (full platform URLs + signatures).
const latestPath = path.join(WORK, "latest.json");
execFileSync("curl", ["-fsSL", NEW_LATEST, "-o", latestPath], {
  stdio: "inherit",
});

const notesPath = path.join(WORK, "NOTES.md");
fs.writeFileSync(notesPath, notes);

let existing = null;
try {
  existing = ghJson(["api", `repos/${OLD}/releases/tags/${TAG}`]);
} catch {
  /* missing */
}

if (existing?.id) {
  console.log(`Release ${TAG} already exists: ${existing.html_url}`);
  process.exit(0);
}

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

gh(["release", "upload", TAG, "--repo", OLD, latestPath, "--clobber"], {
  stdio: "inherit",
});

const created = ghJson(["api", `repos/${OLD}/releases/tags/${TAG}`]);
console.log(`Handoff release: ${created.html_url}`);
console.log(
  `latest.json: https://github.com/${OLD}/releases/download/${TAG}/latest.json`
);
