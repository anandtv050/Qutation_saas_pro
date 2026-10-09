// Submit changed public URLs to IndexNow (Bing, Yandex, Seznam, Naver...).
// Run AFTER the deploy is live, from the frontend folder:
//
//   npm run indexnow                    URLs whose lastmod is today (IST)
//   npm run indexnow -- --since 2026-10-01
//   npm run indexnow -- --all           every public URL
//   npm run indexnow -- --dry-run       print the URLs without submitting
//
// URLs and dates come from seo/lastmod.json (written by `npm run build`).
// The key is the <32 hex>.txt file in public/, served at https://quotelypro.in/<key>.txt

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "quotelypro.in";
const ORIGIN = `https://${HOST}`;

const args = process.argv.slice(2);
const blnAll = args.includes("--all");
const blnDry = args.includes("--dry-run");
const intSinceIdx = args.indexOf("--since");
const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const strSince = intSinceIdx >= 0 ? args[intSinceIdx + 1] : todayIST;
if (!/^\d{4}-\d{2}-\d{2}$/.test(strSince)) {
  console.error(`--since needs a date like 2026-10-01, got "${strSince}"`);
  process.exit(1);
}

const strKeyFile = fs.readdirSync(path.join(ROOT, "public")).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!strKeyFile) {
  console.error("No IndexNow key file (32 hex chars + .txt) found in public/.");
  process.exit(1);
}
const KEY = strKeyFile.replace(".txt", "");

const objLastmod = JSON.parse(fs.readFileSync(path.join(ROOT, "seo", "lastmod.json"), "utf8"));
const lstUrls = Object.entries(objLastmod)
  .filter(([, v]) => blnAll || v.lastmod >= strSince)
  .map(([p]) => (p === "/" ? `${ORIGIN}/` : ORIGIN + p));

if (!lstUrls.length) {
  console.log(`No URLs changed since ${strSince}. Use --all or --since YYYY-MM-DD.`);
  process.exit(0);
}

console.log(`${lstUrls.length} URL(s):\n  ${lstUrls.join("\n  ")}`);
if (blnDry) process.exit(0);

// The key file must be live before IndexNow will accept the submission.
const keyRes = await fetch(`${ORIGIN}/${KEY}.txt`);
const strLiveKey = keyRes.ok ? (await keyRes.text()).trim() : "";
if (strLiveKey !== KEY) {
  console.error(`Key file ${ORIGIN}/${KEY}.txt is not live (HTTP ${keyRes.status}). Deploy first, then run this again.`);
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: lstUrls }),
});

// 200 = accepted, 202 = accepted (key validation pending). Anything else is an error.
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow accepted (HTTP ${res.status}).`);
} else {
  console.error(`IndexNow rejected: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
