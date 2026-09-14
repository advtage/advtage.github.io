const RELEASES_API =
  "https://api.github.com/repos/dylan-griffin/advtage-releases/releases?per_page=100";
const RELEASES_GITHUB =
  "https://github.com/dylan-griffin/advtage-releases/releases";
const INSTALLER_RE = /Advtage_.*_x64-setup\.exe$/i;
const SIG_RE = /\.sig$/i;

document.getElementById("year").textContent = String(new Date().getFullYear());

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatVersion(tagName, fallbackName) {
  const fromTag = (tagName || "").replace(/^app-v/, "");
  if (fromTag) return fromTag;
  return (fallbackName || "").replace(/^Advtage\s*v?/i, "") || "Unknown";
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function findInstaller(assets) {
  return (assets || []).find(
    (asset) => INSTALLER_RE.test(asset.name) && !SIG_RE.test(asset.name)
  );
}

function renderRelease(release, isLatest) {
  const version = formatVersion(release.tag_name, release.name);
  const title = escapeHtml(release.name || `Advtage v${version}`);
  const published = formatDate(release.published_at || release.created_at);
  const body = (release.body || "").trim();
  const installer = findInstaller(release.assets);
  const badges = [];

  if (isLatest) badges.push('<span class="release__badge release__badge--latest">Latest</span>');
  if (release.prerelease) {
    badges.push('<span class="release__badge release__badge--pre">Pre-release</span>');
  }

  const metaParts = [];
  if (published) metaParts.push(`<time datetime="${escapeHtml(release.published_at || release.created_at)}">${escapeHtml(published)}</time>`);
  metaParts.push(`<span>v${escapeHtml(version)}</span>`);

  const notes = body
    ? `<div class="release__notes">${escapeHtml(body)}</div>`
    : `<p class="release__notes release__notes--empty">No release notes.</p>`;

  const download = installer
    ? `<a class="btn release__download" href="${escapeHtml(installer.browser_download_url)}">Download Windows installer</a>`
    : `<a class="actions__alt" href="${escapeHtml(release.html_url)}" target="_blank" rel="noopener noreferrer">View on GitHub</a>`;

  return `
    <article class="release">
      <header class="release__head">
        <div class="release__titles">
          <h2 class="release__title">${title}</h2>
          <p class="release__meta">${metaParts.join('<span class="mid" aria-hidden="true">•</span>')}</p>
          ${badges.length ? `<div class="release__badges">${badges.join("")}</div>` : ""}
        </div>
        <div class="release__actions">${download}</div>
      </header>
      ${notes}
    </article>
  `;
}

async function loadReleases() {
  const root = document.getElementById("releases-list");

  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`release fetch failed (${res.status})`);

    const releases = (await res.json()).filter((release) => !release.draft);
    if (!releases.length) {
      root.innerHTML = `
        <p class="releases__status">No public releases yet.</p>
        <p class="releases__fallback">
          <a class="actions__alt" href="${RELEASES_GITHUB}" target="_blank" rel="noopener noreferrer">Open GitHub releases</a>
        </p>
      `;
      return;
    }

    const latestStableIndex = releases.findIndex((release) => !release.prerelease);

    root.removeAttribute("role");
    root.removeAttribute("aria-live");
    root.innerHTML = releases
      .map((release, index) => renderRelease(release, index === latestStableIndex))
      .join("");
  } catch (err) {
    console.warn(err);
    root.innerHTML = `
      <p class="releases__status releases__status--error">Could not load releases right now.</p>
      <p class="releases__fallback">
        <a class="actions__alt" href="${RELEASES_GITHUB}" target="_blank" rel="noopener noreferrer">Open GitHub releases</a>
      </p>
    `;
  }
}

loadReleases();
