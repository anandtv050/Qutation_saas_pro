// Local preview of dist/ that mimics vercel.json: cleanUrls, app routes -> spa.html, 404.html with status 404.
// Usage: npm run build && npm run serve:dist   then open http://localhost:4321
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const APP = /^\/(login|signup|subscribe|forgot-password|reset-password|dashboard|warranty|advance-receipts|inventory|reports|profile|print-settings|users|admin|plans|services|modules)$|^\/(quotations|invoices)\//;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json" };

function send(res, file, status = 200) {
  res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.length > 1 && p.endsWith("/")) { res.writeHead(308, { Location: p.slice(0, -1) }); return res.end(); }
  const direct = path.join(DIST, p === "/" ? "index.html" : p);
  if (p !== "/" && fs.existsSync(direct) && fs.statSync(direct).isFile()) return send(res, direct);
  if (p === "/") return send(res, direct);
  if (fs.existsSync(direct + ".html")) return send(res, direct + ".html");
  if (APP.test(p)) return send(res, path.join(DIST, "spa.html"));
  return send(res, path.join(DIST, "404.html"), 404);
}).listen(4321, () => console.log("listening 4321"));
