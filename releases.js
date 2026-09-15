const RELEASES_API =
  "https://api.github.com/repos/dylan-griffin/advtage-releases/releases?per_page=100";
const RELEASES_GITHUB =
  "https://github.com/dylan-griffin/advtage-releases/releases";
const SIG_RE = /\.sig$/i;

const PLATFORM_SPECS = [
  {
    id: "windows",
    label: "Windows x64",
    short: "Windows",
    test: (name) => /Advtage_.*_x64-setup\.exe$/i.test(name),
  },
  {
    id: "mac-arm",
    label: "Mac Apple Silicon",
    short: "Mac (ARM)",
    test: (name) => /Advtage_.*_aarch64\.dmg$/i.test(name),
  },
  {
    id: "mac-intel",
    label: "Mac Intel",
    short: "Mac (Intel)",
    test: (name) => /Advtage_.*_x64\.dmg$/i.test(name),
  },
  {
    id: "linux-appimage",
    label: "Linux AppImage",
    short: "AppImage",
    test: (name) => /Advtage_.*_amd64\.AppImage$/i.test(name),
  },
  {
    id: "linux-deb",
    label: "Linux .deb",
    short: "deb",
    test: (name) => /Advtage_.*_amd64\.deb$/i.test(name),
  },
];

const BOILERPLATE_PARA_RE =
  /^\s*Auto-built from private source\b[^\n]*(?:\n(?![#\-*]|\d+\.)[^\n]*)*/i;
// Site already lists assets as download buttons — drop the mirrored Downloads section.
const DOWNLOADS_SECTION_RE =
  /^##\s+Downloads\s*\n(?:.*\n)*?(?=^#{1,3}\s|\Z)/im;

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

function classifyAssets(assets) {
  const list = assets || [];
  const found = [];
  for (const spec of PLATFORM_SPECS) {
    const asset = list.find(
      (a) =>
        !SIG_RE.test(a.name) &&
        !/^latest\.json$/i.test(a.name) &&
        spec.test(a.name)
    );
    if (asset) found.push({ ...spec, asset });
  }
  return found;
}

function cleanReleaseNotes(raw) {
  if (!raw) return "";
  let text = String(raw).replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  // Drop the leading auto-built boilerplate paragraph when present.
  text = text.replace(BOILERPLATE_PARA_RE, "").replace(/^\s*\n+/, "").trim();
  // Drop the mirrored Downloads inventory; keep Gatekeeper / real changelog text.
  text = text.replace(DOWNLOADS_SECTION_RE, "").trim();
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function renderMarkdownLite(raw) {
  const lines = raw.split("\n");
  const parts = [];
  let listType = null;

  function closeList() {
    if (listType) {
      parts.push(listType === "ol" ? "</ol>" : "</ul>");
      listType = null;
    }
  }

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      parts.push(`<h${level + 2} class="notes-h">${inlineMarkdown(heading[2])}</h${level + 2}>`);
      continue;
    }

    const ul = /^[-*]\s+(.+)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        parts.push('<ul class="notes-list">');
        listType = "ul";
      }
      parts.push(`<li>${inlineMarkdown(ul[1])}</li>`);
      continue;
    }

    const ol = /^\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        parts.push('<ol class="notes-list">');
        listType = "ol";
      }
      parts.push(`<li>${inlineMarkdown(ol[1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    parts.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return parts.join("");
}

function renderDownloads(classified) {
  if (!classified.length) {
    return `<p class="release__downloads-empty">No installer assets attached.</p>`;
  }

  const windows = classified.find((c) => c.id === "windows");
  const others = classified.filter((c) => c.id !== "windows");

  const primary = windows
    ? `<a class="btn release__download" href="${escapeHtml(windows.asset.browser_download_url)}">Download Windows</a>`
    : "";

  const secondary = others
    .map(
      ({ label, short, asset }) =>
        `<a class="release__platform" href="${escapeHtml(asset.browser_download_url)}" title="${escapeHtml(label)}">${escapeHtml(short)}</a>`
    )
    .join("");

  return `<div class="release__downloads">
    ${primary}
    ${secondary ? `<div class="release__platforms">${secondary}</div>` : ""}
  </div>`;
}

function renderRelease(release, isLatest) {
  const version = formatVersion(release.tag_name, release.name);
  const title = escapeHtml(release.name || `Advtage v${version}`);
  const published = formatDate(release.published_at || release.created_at);
  const notesText = cleanReleaseNotes(release.body || "");
  const classified = classifyAssets(release.assets);
  const badges = [];

  if (isLatest) badges.push('<span class="release__badge release__badge--latest">Latest</span>');
  if (release.prerelease) {
    badges.push('<span class="release__badge release__badge--pre">Pre-release</span>');
  }

  const metaParts = [];
  if (published) {
    metaParts.push(
      `<time datetime="${escapeHtml(release.published_at || release.created_at)}">${escapeHtml(published)}</time>`
    );
  }
  metaParts.push(`<span>v${escapeHtml(version)}</span>`);
  if (classified.length) {
    const platformNames = [...new Set(classified.map((c) => {
      if (c.id.startsWith("mac")) return "Mac";
      if (c.id.startsWith("linux")) return "Linux";
      return "Windows";
    }))];
    metaParts.push(`<span>${escapeHtml(platformNames.join(" · "))}</span>`);
  }

  const notes = notesText
    ? `<div class="release__notes">${renderMarkdownLite(notesText)}</div>`
    : `<p class="release__notes release__notes--empty">No patch notes for this release.</p>`;

  const downloads = renderDownloads(classified);
  const githubFallback = classified.length
    ? ""
    : `<a class="actions__alt" href="${escapeHtml(release.html_url)}" target="_blank" rel="noopener noreferrer">View on GitHub</a>`;

  return `
    <article class="release">
      <header class="release__head">
        <div class="release__titles">
          <h2 class="release__title">${title}</h2>
          <p class="release__meta">${metaParts.join('<span class="mid" aria-hidden="true">•</span>')}</p>
          ${badges.length ? `<div class="release__badges">${badges.join("")}</div>` : ""}
        </div>
        <div class="release__actions">
          ${downloads}
          ${githubFallback}
        </div>
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
