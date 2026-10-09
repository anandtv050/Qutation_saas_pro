// Shared logic for the sample quotations on marketing pages. Used by MarketingPage (web)
// and by scripts/templates (the downloadable .xlsx/.docx/.pdf), so all of them show the
// same numbers. Everything here is clearly sample data (fake GSTIN, bank, UPI).
import { ALL_PAGES } from "./pages";
import { sampleUpiLink } from "./sampleArt";

// GST state codes for the sample sellers' cities.
const STATE_CODES = {
  Kochi: "32", Kozhikode: "32", Thiruvananthapuram: "32",
  Pune: "27", Nagpur: "27", Mumbai: "27",
  Chennai: "33", Coimbatore: "33",
  Bengaluru: "29", Mysuru: "29",
  Ahmedabad: "24", Lucknow: "09", Jaipur: "08",
  Indore: "23", Bhopal: "23", Gurugram: "06", Chandigarh: "04", Hyderabad: "36",
};

const SAMPLE_DATE = Date.UTC(2026, 9, 1); // 01 Oct 2026
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (ms) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const round2 = (n) => Math.round(n * 100) / 100;

export const SAMPLE_PAGES = ALL_PAGES.filter((p) => p.sample);

export const TEMPLATE_FORMATS = [
  { ext: "xlsx", label: "Excel" },
  { ext: "docx", label: "Word" },
  { ext: "pdf", label: "PDF" },
];
export const templatePath = (slug, ext) => `/templates/${slug}.${ext}`;

export function sampleMeta(page) {
  const sample = page.sample;
  const intIndex = SAMPLE_PAGES.findIndex((p) => p.slug === page.slug);
  const lstFrom = sample.from.split(",").map((s) => s.trim());
  const strSeller = lstFrom[0];
  const strCity = lstFrom[lstFrom.length - 1];
  const intValidDays = Number((sample.terms.join(" ").match(/Valid for (\d+) days/i) || [])[1] || 15);
  const strHandle = strSeller.toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    strSeller,
    strNumber: `QT/2026-27/${String(intIndex + 1).padStart(3, "0")}`,
    strDate: fmtDate(SAMPLE_DATE),
    strValidTill: fmtDate(SAMPLE_DATE + intValidDays * 86400000),
    strGstin: `${STATE_CODES[strCity] || "32"}ABCDE1234F1Z5`,
    strBank: "Sample Bank, A/c 000123456789, IFSC SAMP0001234",
    strUpi: `${strHandle}@upi`,
    strUpiLink: sampleUpiLink(`${strHandle}@upi`, strSeller),   // fake UPI link encoded in the sample QR
    strSigSeed: strSeller,                                       // seeds the sample signature drawing
    strSignatory: `For ${strSeller} — Authorised signatory`,
  };
}

// Line amounts, taxable value, GST lines (per rate, or a contract split like solar 70:30), total.
export function computeSample(sample) {
  const lstRows = sample.items.map((it) => ({ ...it, amount: round2(it.qty * it.rate) }));
  const dblTaxable = round2(lstRows.reduce((s, r) => s + r.amount, 0));
  const blnLineGst = !sample.gstSplit;
  let lstGst;
  if (blnLineGst) {
    const objByRate = {};
    for (const r of lstRows) objByRate[r.gst] = (objByRate[r.gst] || 0) + (r.amount * r.gst) / 100;
    lstGst = Object.entries(objByRate)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([rate, amt]) => ({ label: `GST @ ${rate}%`, rate: Number(rate), amt: round2(amt) }));
  } else {
    lstGst = sample.gstSplit.map((g) => ({
      label: g.label, rate: g.rate, share: g.share, amt: round2((dblTaxable * g.share * g.rate) / 100),
    }));
  }
  const dblTotal = Math.round(dblTaxable + lstGst.reduce((s, g) => s + g.amt, 0));
  return { lstRows, dblTaxable, lstGst, dblTotal, blnLineGst };
}
