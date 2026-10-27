// Writes backend/app/data/trade_seed.json from the website's sample quotations
// (src/marketing/pages.js), so the catalogue a new user gets at onboarding uses exactly the
// same items and rates as the public sample pages. Re-run after editing a sample:
//   node scripts/export-trade-seed.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../backend/app/data/trade_seed.json");
const { INDUSTRY_PAGES } = await import(pathToFileURL(path.resolve(HERE, "../src/marketing/pages.js")).href);

// Business types that already exist in tbl_service; every other trade maps to "general".
const SERVICE_BY_TRADE = {
  cctv: "cctv",
  "electrical-work": "electrical",
  "solar-installation": "solar",
  networking: "networking",
};

const lstTrades = INDUSTRY_PAGES.filter((p) => p.sample?.items?.length).map((page) => {
  const strKey = page.slug.replace(/-quotation-format$/, "");
  const strLabel = page.title.split(/ Quotation Format/i)[0].trim();
  const strPrefix = strKey.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8);
  return {
    key: strKey,
    label: strLabel,
    service: SERVICE_BY_TRADE[strKey] || "general",
    items: page.sample.items.map((it, i) => ({
      code: `SMP-${strPrefix}-${String(i + 1).padStart(2, "0")}`,
      name: it.name.slice(0, 200),
      category: strLabel,
      unit: it.unit,
      price: it.rate,
      warrantyYears: 0,
      warrantyMonths: 0,
    })),
  };
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ trades: lstTrades }, null, 2) + "\n");
console.log(`${lstTrades.length} trades, ${lstTrades.reduce((n, t) => n + t.items.length, 0)} items -> ${OUT}`);
