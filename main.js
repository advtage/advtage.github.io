const RELEASES_API = "https://api.github.com/repos/dylan-griffin/advtage-releases/releases/latest";
const RELEASES_LATEST = "https://github.com/dylan-griffin/advtage-releases/releases/latest";

document.getElementById("year").textContent = String(new Date().getFullYear());

async function wireDownload() {
  const btn = document.getElementById("download-btn");
  const versionLine = document.getElementById("version-line");
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error("release fetch failed");
    const data = await res.json();
    const asset = (data.assets || []).find((a) =>
      /Advtage_.*_x64-setup\.exe$/i.test(a.name) && !/\.sig$/i.test(a.name)
    );
    const version = (data.tag_name || "").replace(/^app-v/, "") || data.name || "";
    if (asset?.browser_download_url) {
      btn.href = asset.browser_download_url;
      btn.textContent = version ? `Download Advtage ${version}` : "Download for Windows";
    } else {
      btn.href = RELEASES_LATEST;
    }
    versionLine.textContent = version
      ? `Latest: v${version} ? Windows x64 NSIS`
      : "Latest Windows build";
  } catch (err) {
    console.warn(err);
    btn.href = RELEASES_LATEST;
    versionLine.textContent = "Open latest release on GitHub";
  }
}

wireDownload();
