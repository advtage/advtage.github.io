const RELEASES_API =
  "https://api.github.com/repos/advtage/advtage.github.io/releases/latest";
const RELEASES_LATEST =
  "https://github.com/advtage/advtage.github.io/releases/latest";
const SIG_RE = /\.sig$/i;
const OS_ICONS = window.ADVTAGE_OS_ICONS || {};

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

const FAMILY_ORDER = ["windows", "mac", "linux"];

function downloadButtonHtml(href, label, family) {
  const icon = OS_ICONS[family] || "";
  return `<a class="btn btn--download" href="${href}">${icon}<span class="btn__label">${label}</span></a>`;
}

function groupByFamily(classified) {
  return FAMILY_ORDER.map((family) => ({
    family,
    items: classified.filter((c) => c.family === family),
  })).filter((group) => group.items.length);
}

function renderDownloadButtons(classified) {
  const root = document.getElementById("download-row");
  if (!root) return;

  if (!classified.length) {
    root.innerHTML = `<a class="btn" id="download-btn" href="${RELEASES_LATEST}">Download latest release</a>`;
    return;
  }

  // One row per OS: Windows → Mac → Linux (variants stay side-by-side in-group).
  root.innerHTML = groupByFamily(classified)
    .map(
      ({ family, items }) =>
        `<div class="dl-group" data-os="${family}">${items
          .map(({ label, asset, family: f }) =>
            downloadButtonHtml(asset.browser_download_url, label, f)
          )
          .join("")}</div>`
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
