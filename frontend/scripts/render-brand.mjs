// One-off: render brand/*.svg to the PNG/ICO files in public/ using a local Chrome.
// Not part of the build. Re-run only when the logo or OG image changes:
//   node scripts/render-brand.mjs
// Set CHROME_PATH if Chrome is not in the default Windows location.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "brand-"));

function shot(strSvgFile, intW, intH, strOut) {
  const strSvg = fs.readFileSync(path.join(ROOT, "brand", strSvgFile), "utf8").replace(/<\?xml[^>]*\?>/, "");
  const strHtml = path.join(TMP, `${path.basename(strOut)}.html`);
  fs.writeFileSync(
    strHtml,
    `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}svg{display:block;width:${intW}px;height:${intH}px}</style></head><body>${strSvg}</body></html>`
  );
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--default-background-color=00000000",
    `--window-size=${intW},${intH}`,
    `--screenshot=${path.join(ROOT, "public", strOut)}`,
    `file:///${strHtml.replace(/\\/g, "/")}`,
  ]);
}

// ICO containing a single PNG image (supported by all current browsers).
function pngToIco(strPng, strIco, intSize) {
  const png = fs.readFileSync(strPng);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(intSize >= 256 ? 0 : intSize, 6);
  header.writeUInt8(intSize >= 256 ? 0 : intSize, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  fs.writeFileSync(strIco, Buffer.concat([header, png]));
}

shot("og-image.svg", 1200, 630, "og-image.png");
shot("icon.svg", 512, 512, "logo-512.png");
shot("icon.svg", 192, 192, "icon-192.png");
shot("icon.svg", 180, 180, "apple-touch-icon.png");
shot("icon.svg", 48, 48, "favicon-48.png");
pngToIco(path.join(ROOT, "public", "favicon-48.png"), path.join(ROOT, "public", "favicon.ico"), 48);
fs.unlinkSync(path.join(ROOT, "public", "favicon-48.png"));
fs.rmSync(TMP, { recursive: true, force: true });
console.log("Rendered og-image.png, logo-512.png, icon-192.png, apple-touch-icon.png, favicon.ico");
