# Refresh old-repo updater handoff (Dylan / CI)

Clients still polling `dylan-griffin/advtage-releases` read **Latest** →
`app-v0.1.24-handoff` → `latest.json`.

**Current gap:** handoff version tracks org Latest (**0.1.28**) but may still have
**empty `notes`** when org notes were filled after the last CI sync. Re-clobber so
≤0.1.24 in-app updaters see the same markdown as org `latest.json`.

This Website Cloud Agent gets `HTTP 403` on `gh release upload … --clobber` to the
handoff (agent token). **Advtage App release CI** with `RELEASES_GITHUB_TOKEN` can
write it — prefer filling **org** `latest.json` notes first, then either:

1. Re-run / trigger the App handoff sync job, or
2. Dylan one-liner below

## One-liner

```bash
curl -fsSL https://github.com/advtage/advtage.github.io/releases/latest/download/latest.json \
  -o /tmp/latest.json && \
gh release upload app-v0.1.24-handoff --repo dylan-griffin/advtage-releases \
  /tmp/latest.json --clobber && \
curl -fsSL https://github.com/dylan-griffin/advtage-releases/releases/latest/download/latest.json \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['version'], 'notes', len(d.get('notes') or ''))"
```

Expected: `0.1.28 notes 538` (or whatever org Latest is / notes length).

## Or from this repo

```bash
node scripts/publish-handoff-release.mjs
```

**Do not** re-upload installers to the old repo. Keep a single Latest handoff tag
`app-v0.1.24-handoff` and only clobber its `latest.json`.
