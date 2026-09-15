#!/usr/bin/env node
/**
 * One-time migration: copy GitHub Releases from dylan-griffin/advtage-releases
 * to advtage/advtage.github.io with clean patch notes and regenerated latest.json.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SOURCE = "dylan-griffin/advtage-releases";
const TARGET = "advtage/advtage.github.io";
const WORK = "/tmp/advtage-release-migrate";
const NOTES = JSON.parse(
  fs.readFileSync(new URL("./release-notes.json", import.meta.url), "utf8")
);

const TAGS = ["app-v0.1.11", "app-v0.1.15", "app-v0.1.17", "app-v0.1.24"];

function gh(args, input) {
  const out = execFileSync("gh", args, {
    encoding: "utf8",
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.trim() ? JSON.parse(out) : null;
}

function ghText(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

function download(url, dest) {
  execFileSync("curl", ["-fsSL", url, "-o", dest], { stdio: "inherit" });
}

function assetPlatform(name) {
  if (/Advtage_.*_x64-setup\.exe$/i.test(name)) {
    return ["windows-x86_64", "windows-x86_64-nsis"];
  }
  if (/Advtage_.*_amd64\.AppImage$/i.test(name)) {
    return ["linux-x86_64", "linux-x86_64-appimage"];
  }
  if (/Advtage_.*_amd64\.deb$/i.test(name)) {
    return ["linux-x86_64-deb"];
  }
  return null;
}

function buildLatestJson(version, pubDate, notes, assetsByName) {
  const platforms = {};
  for (const [name, meta] of Object.entries(assetsByName)) {
    const keys = assetPlatform(name);
    if (!keys || !meta.sig) continue;
    const sig = fs.readFileSync(meta.sig, "utf8").trim();
    const entry = { signature: sig, url: meta.url };
    for (const key of keys) platforms[key] = entry;
  }
  return {
    version,
    notes,
    pub_date: pubDate,
    platforms,
  };
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });

  for (const tag of TAGS) {
    console.log(`\n=== ${tag} ===`);
    let existing = null;
    try {
      existing = gh(["api", `repos/${TARGET}/releases/tags/${tag}`]);
    } catch {
      /* not found */
    }
    if (existing?.id) {
      console.log("Already exists on target — skipping");
      continue;
    }

    const release = gh([
      "api",
      `repos/${SOURCE}/releases/tags/${tag}`,
    ]);
    const version = tag.replace(/^app-v/, "");
    const notes = NOTES[tag] || `## ${version}\n\nRelease migrated from advtage-releases.`;
    const dir = path.join(WORK, tag);
    fs.mkdirSync(dir, { recursive: true });

    const files = [];
    for (const asset of release.assets || []) {
      if (/^latest\.json$/i.test(asset.name)) continue;
      const dest = path.join(dir, asset.name);
      console.log(`  download ${asset.name}`);
      download(asset.browser_download_url, dest);
      files.push(dest);
    }

    const notesPath = path.join(dir, "NOTES.md");
    fs.writeFileSync(notesPath, notes);

    console.log(`  create release ${tag}`);
    ghText([
      "release",
      "create",
      tag,
      "--repo",
      TARGET,
      "--title",
      release.name || `Advtage v${version}`,
      "--notes-file",
      notesPath,
      "--target",
      "main",
    ]);

    console.log(`  upload ${files.length} assets`);
    execFileSync(
      "gh",
      ["release", "upload", tag, "--repo", TARGET, ...files],
      { stdio: "inherit" }
    );

    const uploaded = gh([
      "api",
      `repos/${TARGET}/releases/tags/${tag}`,
    ]);
    const assetsByName = {};
    for (const asset of uploaded.assets || []) {
      if (/\.sig$/i.test(asset.name)) continue;
      if (/^latest\.json$/i.test(asset.name)) continue;
      const sigPath = path.join(dir, `${asset.name}.sig`);
      assetsByName[asset.name] = {
        url: `https://api.github.com/repos/${TARGET}/releases/assets/${asset.id}`,
        sig: fs.existsSync(sigPath) ? sigPath : null,
      };
    }

    const latest = buildLatestJson(
      version,
      release.published_at || new Date().toISOString(),
      notes,
      assetsByName
    );
    const latestPath = path.join(dir, "latest.json");
    fs.writeFileSync(latestPath, `${JSON.stringify(latest, null, 4)}\n`);
    execFileSync(
      "gh",
      ["release", "upload", tag, "--repo", TARGET, latestPath],
      { stdio: "inherit" }
    );
    console.log(`  done ${tag}`);
  }

  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
