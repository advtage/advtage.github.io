# Refresh old-repo updater handoff (Dylan / whoever has write)

Clients still polling `dylan-griffin/advtage-releases` read **Latest** →
`app-v0.1.24-handoff` → `latest.json`.

**Current gap (2026-09-15):** handoff already reports **version `0.1.25`**, but its
`notes` field is still **empty**. Org `app-v0.1.25` / `latest.json` now has the
full Since-v0.1.24 + Gatekeeper notes. Re-clobber so ≤0.1.24 in-app updaters
see the same markdown.

This Cloud Agent gets `HTTP 403: Resource not accessible by integration` on
`gh release upload … --clobber` to the handoff release. Run this locally (or from
Advtage App CI) with a token that can write `dylan-griffin/advtage-releases`:

## One-liner

```bash
curl -fsSL https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json \
  -o /tmp/latest.json && \
gh release upload app-v0.1.24-handoff --repo dylan-griffin/advtage-releases \
  /tmp/latest.json --clobber && \
curl -fsSL https://github.com/dylan-griffin/advtage-releases/releases/latest/download/latest.json \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['version'], 'notes', len(d.get('notes') or ''))"
```

Expected: `0.1.25 notes 455` (or whatever org Latest is / notes length).

## Or from this repo

```bash
node scripts/publish-handoff-release.mjs
```

(Creates the handoff release if missing; otherwise refreshes `latest.json` + notes.)

## Advtage App `release.yml` hook (recommended)

After publishing installers + `latest.json` to **`advtage/advtage.github.io`**, add a
final job/step that refreshes the old-repo handoff **without** uploading installers
again (avoid conflicting binary uploads):

```yaml
  refresh-legacy-handoff:
    needs: publish-org-release   # whatever job uploads to advtage.github.io
    runs-on: ubuntu-latest
    permissions:
      contents: write   # or use a PAT with write on dylan-griffin/advtage-releases
    steps:
      - name: Mirror org latest.json onto legacy Latest handoff
        env:
          GH_TOKEN: ${{ secrets.ADVTAGE_RELEASES_HANDOFF_TOKEN }}  # write on dylan-griffin/advtage-releases
        run: |
          curl -fsSL https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json \
            -o latest.json
          gh release upload app-v0.1.24-handoff \
            --repo dylan-griffin/advtage-releases \
            latest.json --clobber
```

**Do not** re-upload `.exe` / `.dmg` / `.AppImage` / `.deb` to the old repo.
**Do not** create a second Latest release — keep a single handoff tag
`app-v0.1.24-handoff` marked Latest and only clobber its `latest.json`.

Long-term: ship a client that polls
`https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json`
and drop the handoff once old installs are gone.
