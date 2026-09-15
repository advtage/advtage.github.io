const RELEASES_API =
  "https://api.github.com/repos/dylan-griffin/advtage-releases/releases/latest";
const RELEASES_LATEST =
  "https://github.com/dylan-griffin/advtage-releases/releases/latest";
const SIG_RE = /\.sig$/i;

const PLATFORM_SPECS = [
  {
    id: "windows",
    label: "Windows",
    detail: "x64 NSIS",
    test: (name) => /Advtage_.*_x64-setup\.exe$/i.test(name),
  },
  {
    id: "mac-arm",
    label: "Mac",
    detail: "Apple Silicon",
    test: (name) => /Advtage_.*_aarch64\.dmg$/i.test(name),
  },
  {
    id: "mac-intel",
    label: "Mac",
    detail: "Intel",
    test: (name) => /Advtage_.*_x64\.dmg$/i.test(name),
  },
  {
    id: "linux-appimage",
    label: "Linux",
    detail: "AppImage",
    test: (name) => /Advtage_.*_amd64\.AppImage$/i.test(name),
  },
  {
    id: "linux-deb",
    label: "Linux",
    detail: ".deb",
    test: (name) => /Advtage_.*_amd64\.deb$/i.test(name),
  },
];

document.getElementById("year").textContent = String(new Date().getFullYear());

function classifyAssets(assets) {
  const found = {};
  for (const asset of assets || []) {
    if (SIG_RE.test(asset.name) || /^latest\.json$/i.test(asset.name)) continue;
    for (const spec of PLATFORM_SPECS) {
      if (!found[spec.id] && spec.test(asset.name)) {
        found[spec.id] = asset;
        break;
      }
    }
  }
  return found;
}

function renderPlatformLinks(byPlatform) {
  const root = document.getElementById("platform-downloads");
  if (!root) return;

  // Primary CTA already covers Windows — list the other platforms here.
  const items = PLATFORM_SPECS.filter(
    (spec) => spec.id !== "windows" && byPlatform[spec.id]
  ).map((spec) => {
    const asset = byPlatform[spec.id];
    return `<li>
      <a class="platform-link" href="${asset.browser_download_url}">
        <span class="platform-link__os">${spec.label}</span>
        <span class="platform-link__detail">${spec.detail}</span>
      </a>
    </li>`;
  });

  if (!items.length) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }

  root.hidden = false;
  root.innerHTML = `
    <p class="platform-downloads__label">Also available</p>
    <ul class="platform-downloads__list">${items.join("")}</ul>
  `;
}

async function wireDownload() {
  const btn = document.getElementById("download-btn");
  const versionLine = document.getElementById("version-line");
  const caveat = document.getElementById("mac-caveat");
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error("release fetch failed");
    const data = await res.json();
    const byPlatform = classifyAssets(data.assets);
    const windows = byPlatform.windows;
    const version = (data.tag_name || "").replace(/^app-v/, "") || data.name || "";
    const hasMac = Boolean(byPlatform["mac-arm"] || byPlatform["mac-intel"]);
    const platforms = Object.keys(byPlatform).length;

    if (windows?.browser_download_url) {
      btn.href = windows.browser_download_url;
      btn.textContent = version
        ? `Download Advtage ${version} for Windows`
        : "Download for Windows";
    } else {
      btn.href = RELEASES_LATEST;
      btn.textContent = "Download latest release";
    }

    renderPlatformLinks(byPlatform);

    if (version && platforms) {
      const bits = ["Windows"];
      if (hasMac) bits.push("Mac");
      if (byPlatform["linux-appimage"] || byPlatform["linux-deb"]) bits.push("Linux");
      versionLine.textContent = `Latest: v${version} • ${bits.join(" · ")}`;
    } else if (version) {
      versionLine.textContent = `Latest: v${version}`;
    } else {
      versionLine.textContent = "Latest public build";
    }

    if (caveat) caveat.hidden = !hasMac;
  } catch (err) {
    console.warn(err);
    btn.href = RELEASES_LATEST;
    btn.textContent = "Download latest release";
    versionLine.textContent = "Open latest release on GitHub";
    if (caveat) caveat.hidden = true;
    const root = document.getElementById("platform-downloads");
    if (root) {
      root.hidden = true;
      root.innerHTML = "";
    }
  }
}

wireDownload();
