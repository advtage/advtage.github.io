const RELEASES_API =
  "https://api.github.com/repos/advtage/advtage.github.io/releases?per_page=100";
const RELEASES_GITHUB =
  "https://github.com/advtage/advtage.github.io/releases";
const SIG_RE = /\.sig$/i;

const OS_ICONS = {
  windows:
    '<svg class="btn__os" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4.5h8.2v7.1H3V4.5zm9.8 0H21v7.1h-8.2V4.5zM3 12.4h8.2V19.5H3v-7.1zm9.8 0H21v7.1h-8.2v-7.1z"/></svg>',
  mac:
    '<svg class="btn__os" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.65 12.25c-.02-2.05 1.67-3.03 1.75-3.08-0.95-1.39-2.43-1.58-2.95-1.6-1.26-.13-2.45.74-3.09.74-.63 0-1.61-.72-2.65-.7-1.36.02-2.62.79-3.32 2.01-1.42 2.46-.36 6.1 1.02 8.1.67.98 1.48 2.08 2.53 2.04 1.02-.04 1.4-.65 2.63-.65 1.22 0 1.57.65 2.65.63 1.1-.02 1.79-.99 2.46-1.98.77-1.13 1.09-2.22 1.11-2.28-.02-.01-2.12-.81-2.14-3.23zM14.5 5.98c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-0.98 1.56-.86 2.48.91.07 1.84-.46 2.39-1.14z"/></svg>',
  linux:
    '<svg class="btn__os" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.5 2.2c-1.6.1-2.7 1.5-2.6 3.1.1 1.1.5 2 1.1 2.8l-.9 3.1c-.2.8-.2 1.5 0 2.2.4 1.3 1.4 2.3 2.7 2.8v.8c0 .5.2 1 .5 1.4-1 .4-1.7 1.3-1.7 2.4 0 1.1.7 2 1.7 2.3h3.4c1-.3 1.7-1.2 1.7-2.3 0-1.1-.7-2-1.7-2.4.3-.4.5-.9.5-1.4v-.8c1.3-.5 2.3-1.5 2.7-2.8.2-.7.2-1.4 0-2.2l-.9-3.1c.6-.8 1-1.7 1.1-2.8.1-1.6-1-3-2.6-3.1h-.5zm-1.8 3.7c.4 0 .7.3.7.8s-.3.8-.7.8-.7-.3-.7-.8.3-.8.7-.8zm2.8 0c.4 0 .7.3.7.8s-.3.8-.7.8-.7-.3-.7-.8.3-.8.7-.8zM10.4 18.6c.2-.2.5-.4.8-.4h1.6c.3 0 .6.2.8.4-.2.3-.5.5-.8.5h-1.6c-.3 0-.6-.2-.8-.5zm3.2 0c.2-.2.5-.4.8-.4s.6.2.8.4c-.2.3-.5.5-.8.5s-.6-.2-.8-.5z"/></svg>',
};

const PLATFORM_SPECS = [
  {
    id: "windows",
    family: "windows",
    label: "Windows x64",
    test: (name) => /Advtage_.*_x64-setup\.exe$/i.test(name),
  },
  {
    id: "mac-arm",
    family: "mac",
    label: "Mac Apple Silicon",
    test: (name) => /Advtage_.*_aarch64\.dmg$/i.test(name),
  },
  {
    id: "mac-intel",
    family: "mac",
    label: "Mac Intel",
    test: (name) => /Advtage_.*_x64\.dmg$/i.test(name),
  },
  {
    id: "linux-appimage",
    family: "linux",
    label: "Linux AppImage",
    test: (name) => /Advtage_.*_amd64\.AppImage$/i.test(name),
  },
  {
    id: "linux-deb",
    family: "linux",
    label: "Linux .deb",
    test: (name) => /Advtage_.*_amd64\.deb$/i.test(name),
  },
];

const BOILERPLATE_PARA_RE =
  /^\s*Auto-built from private source\b[^\n]*(?:\n(?![#\-*]|\d+\.)[^\n]*)*/i;

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

  // Drop only the leading auto-built boilerplate; keep the rest of the release markdown.
  text = text.replace(BOILERPLATE_PARA_RE, "").replace(/^\s*\n+/, "").trim();
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // Bold before italics so ** wins over *
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
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
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 2, 6);
      parts.push(`<h${level} class="notes-h">${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      closeList();
      parts.push('<hr class="notes-hr" />');
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      parts.push(`<blockquote class="notes-quote">${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const ul = /^[-*+]\s+(.+)$/.exec(line);
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

  const buttons = classified
    .map(({ label, asset, family }) => {
      const icon = OS_ICONS[family] || "";
      return `<a class="btn btn--download" href="${escapeHtml(asset.browser_download_url)}">${icon}<span class="btn__label">${escapeHtml(label)}</span></a>`;
    })
    .join("");

  return `<div class="release__downloads">${buttons}</div>`;
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
      if (c.family === "mac") return "Mac";
      if (c.family === "linux") return "Linux";
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
