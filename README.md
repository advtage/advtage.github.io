# advtage.github.io

Official GitHub Pages landing for [Advtage](https://advtage.github.io/) — the 100% free, ad-free DM app for D&D 5.5e (Windows, Mac, Linux).

- **Download** wires the latest public installers from [`advtage-releases`](https://github.com/dylan-griffin/advtage-releases): Windows NSIS `.exe`, Mac `.dmg` (Apple Silicon + Intel), Linux AppImage / `.deb`
- **Releases** (`releases.html`) lists every public release from the GitHub API with per-platform downloads and patch notes (boilerplate auto-build text is filtered out)
- Mac builds are unsigned / not notarized — Gatekeeper may require right-click → Open on first launch
- App source stays private in `dylan-griffin/advtage`

## Local preview

Open `index.html` in a browser, or:

```bash
npx --yes serve .
```

## Pages

GitHub Pages serves the org site at <https://advtage.github.io/> from the `main` branch root.
