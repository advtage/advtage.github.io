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

Older apps still poll `dylan-griffin/advtage-releases` (Latest tag
`app-v0.1.24-handoff`). After each org release, refresh that handoff’s
`latest.json` from org Latest:

```bash
# one-liner (needs write on dylan-griffin/advtage-releases)
curl -fsSL https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json -o /tmp/latest.json \
  && gh release upload app-v0.1.24-handoff --repo dylan-griffin/advtage-releases /tmp/latest.json --clobber
```

Or: `node scripts/publish-handoff-release.mjs` (creates or refreshes).

**Current blocker (this agent):** asset upload returns
`HTTP 403: Resource not accessible by integration`. See
`scripts/HANDOFF-REFRESH.md` for Dylan one-liner + Advtage App `release.yml` hook.

Also point the Tauri updater in private `dylan-griffin/advtage` at:

`https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json`
