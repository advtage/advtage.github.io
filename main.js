const RELEASES_API =
  "https://api.github.com/repos/dylan-griffin/advtage-releases/releases/latest";
const RELEASES_LATEST =
  "https://github.com/dylan-griffin/advtage-releases/releases/latest";
const SIG_RE = /\.sig$/i;

const PLATFORM_SPECS = [
  {
    id: "windows",
    label: "Windows x64",
    test: (name) => /Advtage_.*_x64-setup\.exe$/i.test(name),
  },
  {
    id: "mac-arm",
    label: "Mac Apple Silicon",
    test: (name) => /Advtage_.*_aarch64\.dmg$/i.test(name),
  },
  {
    id: "mac-intel",
    label: "Mac Intel",
    test: (name) => /Advtage_.*_x64\.dmg$/i.test(name),
  },
  {
    id: "linux-appimage",
    label: "Linux AppImage",
    test: (name) => /Advtage_.*_amd64\.AppImage$/i.test(name),
  },
  {
    id: "linux-deb",
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

function renderDownloadButtons(classified, version) {
  const root = document.getElementById("download-row");
  if (!root) return;

  if (!classified.length) {
    root.innerHTML = `<a class="btn" id="download-btn" href="${RELEASES_LATEST}">Download latest release</a>`;
    return;
  }

  root.innerHTML = classified
    .map(({ label, asset }) => {
      const text = version ? `${label}` : label;
      return `<a class="btn btn--download" href="${asset.browser_download_url}">${text}</a>`;
    })
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
    const hasMac = classified.some((c) => c.id.startsWith("mac"));
    const bits = [];
    if (classified.some((c) => c.id === "windows")) bits.push("Windows");
    if (hasMac) bits.push("Mac");
    if (classified.some((c) => c.id.startsWith("linux"))) bits.push("Linux");

    renderDownloadButtons(classified, version);

    versionLine.textContent = version
      ? bits.length
        ? `Latest: v${version} • ${bits.join(" · ")}`
        : `Latest: v${version}`
      : "Latest public build";

    if (caveat) caveat.hidden = !hasMac;
  } catch (err) {
    console.warn(err);
    renderDownloadButtons([], "");
    versionLine.textContent = "Open latest release on GitHub";
    if (caveat) caveat.hidden = true;
  }
}

wireDownload();
