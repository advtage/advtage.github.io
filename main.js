const RELEASES_API =
  "https://api.github.com/repos/advtage/advtage.github.io/releases/latest";
const RELEASES_LATEST =
  "https://github.com/advtage/advtage.github.io/releases/latest";
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

document.getElementById("year").textContent = String(new Date().getFullYear());

function classifyAssets(assets) {
  const found = [];
  for (const spec of PLATFORM_SPECS) {
    const asset = (assets || []).find(
      (a) =>
        !SIG_RE.test(a.name) &&
        !/^latest\.json$/i.test(a.name) &&
        spec.test(a.name)
    );
    if (asset) found.push({ ...spec, asset });
  }
  return found;
}

function downloadButtonHtml(href, label, family) {
  const icon = OS_ICONS[family] || "";
  return `<a class="btn btn--download" href="${href}">${icon}<span class="btn__label">${label}</span></a>`;
}

function renderDownloadButtons(classified) {
  const root = document.getElementById("download-row");
  if (!root) return;

  if (!classified.length) {
    root.innerHTML = `<a class="btn" id="download-btn" href="${RELEASES_LATEST}">Download latest release</a>`;
    return;
  }

  root.innerHTML = classified
    .map(({ label, asset, family }) =>
      downloadButtonHtml(asset.browser_download_url, label, family)
    )
    .join("");
}

async function wireDownload() {
  const versionLine = document.getElementById("version-line");
  const caveat = document.getElementById("mac-caveat");
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error("release fetch failed");
    const data = await res.json();
    const classified = classifyAssets(data.assets);
    const version = (data.tag_name || "").replace(/^app-v/, "") || data.name || "";
    const hasMac = classified.some((c) => c.family === "mac");
    const bits = [];
    if (classified.some((c) => c.family === "windows")) bits.push("Windows");
    if (hasMac) bits.push("Mac");
    if (classified.some((c) => c.family === "linux")) bits.push("Linux");

    renderDownloadButtons(classified);

    versionLine.textContent = version
      ? bits.length
        ? `Latest: v${version} • ${bits.join(" · ")}`
        : `Latest: v${version}`
      : "Latest public build";

    if (caveat) caveat.hidden = !hasMac;
  } catch (err) {
    console.warn(err);
    renderDownloadButtons([]);
    versionLine.textContent = "Open latest release on GitHub";
    if (caveat) caveat.hidden = true;
  }
}

wireDownload();
