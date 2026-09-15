# advtage.github.io

Official GitHub Pages site and **public release host** for [Advtage](https://advtage.github.io/) — the free, ad-free DM app for D&D 5.5e (Windows, Mac, Linux).

## How releases work (binaries vs this repo)

Installers are **not** committed to git. They are attached to [GitHub Releases](https://github.com/advtage/advtage.github.io/releases) on this repo — the same model as before on `advtage-releases`, just under the org site repo now.

| What | Where |
|------|--------|
| Website (HTML/CSS/JS) | `main` branch → GitHub Pages |
| Installers (`.exe`, `.dmg`, `.AppImage`, `.deb`) | Release **assets** (not in git) |
| Auto-updater manifest | `latest.json` on each release |
| App source | Private `dylan-griffin/advtage` |

Git stays small; only the static site lives in the tree. Binaries download from `github.com/.../releases/download/...`.

## Site features

- **Download** wires the latest installers from this repo’s Releases API
- **Releases** (`releases.html`) lists every release with per-platform buttons and markdown patch notes
- Mac builds are unsigned / not notarized — Gatekeeper may require right-click → Open

## Local preview

```bash
npx --yes serve .
```

## Publishing a new release

Build in the private app repo, then publish installers to **this** repo’s GitHub Releases (tag `app-vX.Y.Z`), attach platform assets + signatures + `latest.json`. See `scripts/release-notes.json` for note format and `scripts/migrate-releases.mjs` for the migration reference.

### Updater handoff (old installs)

Older apps still poll `dylan-griffin/advtage-releases`. When that repo has write access for the agent (or manually), run:

```bash
node scripts/publish-handoff-release.mjs
```

Creating a release via the GitHub API on dylan-griffin/advtage-releases currently returns:

```
HTTP 403: Resource not accessible by integration
```

This Cloud Agent token can **read** that repo but cannot create releases there until the Cursor GitHub App grants write on `dylan-griffin/advtage-releases` (and the environment includes it). When unblocked, run:

```bash
node scripts/publish-handoff-release.mjs
```

