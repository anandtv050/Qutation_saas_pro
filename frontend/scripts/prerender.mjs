// Post-build step: prerender public marketing routes to static HTML and generate
// sitemap.xml + llms.txt. Runs after `vite build` and `vite build --ssr` (see package.json).
//
// Output (dist/):
//   index.html, <slug>.html   prerendered public pages (served with cleanUrls)
//   404.html                  prerendered 404 page (Vercel serves it with status 404)
//   spa.html                  empty app shell, noindex, for login/dashboard/app routes
//   sitemap.xml, llms.txt
//
// lastmod: each page's rendered HTML is hashed and compared with seo/lastmod.json.
// A page gets today's date (IST) only when its content actually changed.
// Commit seo/lastmod.json after building locally so dates stay stable across deploys.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv } from "vite";
import { generateTemplates } from "./templates/index.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const LASTMOD_FILE = path.join(ROOT, "seo", "lastmod.json");

const ssr = await import(pathToFileURL(path.join(ROOT, "dist-ssr", "entry-server.js")).href);
const { render, buildHead, PUBLIC_ROUTES, NOT_FOUND_ROUTE, SITE, PLANS, FOUNDING_OFFER, HOME, GENERAL_PAGES, INDUSTRY_PAGES, COMPARISON_PAGES,
  SAMPLE_PAGES, sampleMeta, computeSample, templatePath } = ssr;

const env = loadEnv("production", ROOT, "VITE_");
const CLARITY_ID = (env.VITE_CLARITY_ID || "").trim();
if (CLARITY_ID && !/^[a-z0-9]{6,20}$/i.test(CLARITY_ID)) {
  throw new Error(`VITE_CLARITY_ID looks invalid: "${CLARITY_ID}"`);
}

// dist/index.html is the Vite template on a fresh build; it gets overwritten with the
// prerendered homepage below, so keep a copy to allow re-running this script on its own.
const HEAD_RE = /<!--app-head-->[\s\S]*?<!--\/app-head-->/;
const TEMPLATE_CACHE = path.join(ROOT, "dist-ssr", "template.html");
const hasMarkers = (s) => HEAD_RE.test(s) && s.includes("<!--app-html-->");
let template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (hasMarkers(template)) {
  fs.writeFileSync(TEMPLATE_CACHE, template);
} else if (fs.existsSync(TEMPLATE_CACHE)) {
  template = fs.readFileSync(TEMPLATE_CACHE, "utf8");
}
if (!hasMarkers(template)) {
  throw new Error("Template is missing the <!--app-head--> / <!--app-html--> markers. Run `npm run build`.");
}

const clarityTag = CLARITY_ID
  ? `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");</script>`
  : "";

const fill = (strHead, strHtml) => template.replace(HEAD_RE, strHead).replace("<!--app-html-->", strHtml);

const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const objOldLastmod = fs.existsSync(LASTMOD_FILE) ? JSON.parse(fs.readFileSync(LASTMOD_FILE, "utf8")) : {};
const objNewLastmod = {};
const lstProblems = [];

// 1. App shell for login/dashboard/app routes — written before index.html is overwritten.
fs.writeFileSync(
  path.join(DIST, "spa.html"),
  fill(`<meta name="robots" content="noindex, nofollow" />\n    <title>Quotely Pro</title>`, "")
);

// 2. Public pages.
for (const route of PUBLIC_ROUTES) {
  if (route.title.length >= 60) lstProblems.push(`${route.path}: title is ${route.title.length} chars (max 59)`);
  if (route.description.length >= 155) lstProblems.push(`${route.path}: description is ${route.description.length} chars (max 154)`);

  const strHead = buildHead(route);
  const strHtml = render(route.path);
  if (!strHtml.includes("<h1")) lstProblems.push(`${route.path}: no <h1> rendered`);

  const strHash = crypto.createHash("sha1").update(strHead + strHtml).digest("hex");
  const old = objOldLastmod[route.path];
  objNewLastmod[route.path] = old && old.hash === strHash ? old : { hash: strHash, lastmod: todayIST };

  if (route.path !== "/") {
    const strArticle = (strHtml.match(/<article[\s\S]*<\/article>/) || [""])[0];
    const intWords = strArticle.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    if (intWords < 600) console.warn(`  ! ${route.path}: only ${intWords} words`);
  }

  const strFile = route.path === "/" ? "index.html" : `${route.path.slice(1)}.html`;
  fs.writeFileSync(path.join(DIST, strFile), fill(`${strHead}\n    ${clarityTag}`, strHtml));
}

if (lstProblems.length) {
  throw new Error("SEO checks failed:\n  " + lstProblems.join("\n  "));
}

// 3. 404 page.
fs.writeFileSync(path.join(DIST, "404.html"), fill(`${buildHead(NOT_FOUND_ROUTE)}\n    ${clarityTag}`, render("/__not_found__")));

// 4. sitemap.xml — public pages only.
const strSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(
  (r) => `  <url>
    <loc>${r.path === "/" ? `${SITE.url}/` : SITE.url + r.path}</loc>
    <lastmod>${objNewLastmod[r.path].lastmod}</lastmod>
  </url>`
).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), strSitemap);

// 5. llms.txt
const pageLine = (p) => `- [${p.h1}](${SITE.url}/${p.slug}): ${p.description}`;
const strLlms = `# Quotely Pro

> Quotely Pro (${SITE.domain}) is a quotation maker web app, with invoices built in, for small businesses in India. Users make item-wise quotations (item, quantity, unit, rate) on their phone in about a minute, download a branded PDF, and send it to customers on WhatsApp themselves.

Quotely Pro is quotation-first, with invoices included: an accepted quotation can be converted into an invoice and printed as a branded PDF. It does not do accounting, GST returns or stock, so businesses that need those keep software such as Tally, Vyapar, myBillBook or Zoho. It is a web app used in the browser; there is no Play Store or App Store app. It is not related to the Shopify app "Quotely" or to "Quotly".

Who it is for: installers (CCTV, solar, electrical, AC, networking), contractors and interior designers, service providers, traders and freelancers who send quotations with many line items.

What it does:
- Item-wise quotations with quantity, unit, rate and amount
- Saved item list so regular items and rates fill in automatically
- Copy an existing quotation into a new one
- AI Quick Create: the user types what they need in plain words, and AI picks the matching items, quantities and prices from their saved catalogue. It does not suggest prices or create items outside the catalogue.
- Convert an accepted quotation into an invoice; advance and payment receipts linked to the quotation (cash, UPI, cheque, bank)
- Warranty certificates and warranty expiry tracking
- PDF branding: logo, colours, header, terms, footer note, signature, payment QR code

Getting started: accounts are set up personally via WhatsApp (${SITE.phoneDisplay}). ${SITE.trialLine} There is no permanent free plan.

Pricing (${SITE.priceNote} Yearly billing = 2 months free):
${PLANS.map((p) => `- ${p.name}: ₹${p.priceMonthly.toLocaleString("en-IN")}/month or ₹${p.priceYearly.toLocaleString("en-IN")}/year. ${p.features.join("; ")}.`).join("\n")}
- ${FOUNDING_OFFER.strBanner}

## Main pages
- [Quotely Pro home](${SITE.url}/): ${HOME.description}

## Guides
${GENERAL_PAGES.map(pageLine).join("\n")}

## Quotation formats by industry
${INDUSTRY_PAGES.map(pageLine).join("\n")}

## Downloadable quotation templates (Excel with formulas, Word, PDF)
${SAMPLE_PAGES.map((p) => `- ${p.h1}: [Excel](${SITE.url}${templatePath(p.slug, "xlsx")}), [Word](${SITE.url}${templatePath(p.slug, "docx")}), [PDF](${SITE.url}${templatePath(p.slug, "pdf")})`).join("\n")}

## Quotely Pro compared with other software
${COMPARISON_PAGES.map(pageLine).join("\n")}

## Contact
- Email: ${SITE.email}
- WhatsApp: ${SITE.phoneDisplay}
`;
fs.writeFileSync(path.join(DIST, "llms.txt"), strLlms);

// 5b. Downloadable templates (/templates/<slug>.xlsx|.docx|.pdf). Not in the sitemap.
const lstTemplates = generateTemplates({
  pages: SAMPLE_PAGES, sampleMeta, computeSample, outDir: path.join(DIST, "templates"),
});

// 6. Persist lastmod (only routes that still exist).
fs.mkdirSync(path.dirname(LASTMOD_FILE), { recursive: true });
fs.writeFileSync(LASTMOD_FILE, JSON.stringify(objNewLastmod, null, 2) + "\n");

const intChanged = PUBLIC_ROUTES.filter((r) => objOldLastmod[r.path]?.hash !== objNewLastmod[r.path].hash).length;
console.log(
  `Prerendered ${PUBLIC_ROUTES.length} public pages + 404 + spa shell. ` +
    `${intChanged} page(s) changed (lastmod ${todayIST}). ${lstTemplates.length} template files. ` +
    `Clarity: ${CLARITY_ID ? "on" : "off (VITE_CLARITY_ID not set)"}.`
);
if (intChanged && process.env.VERCEL) {
  console.warn("  ! Content changed but seo/lastmod.json was not committed. Run `npm run build` locally and commit it.");
}
