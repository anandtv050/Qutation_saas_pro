// Pre-filled WhatsApp text for the Lead Helper and the inline CTA under each sample.
import { SITE } from "../site";
import { INDUSTRY_PAGES } from "../pages";

export const METHOD_PHRASE = { Excel: "using Excel", "By hand": "by hand", Software: "using software", Other: "using another method" };
const QUOTE_PHRASE = { "1 or less": "1", "2–5": "2–5", "5–10": "5–10", "10+": "10 or more" };

export const withArticle = (strText) => `${/^[aeiou]/i.test(strText) ? "an" : "a"} ${strText}`;

// "Solar Installation Quotation Format" -> "solar installation"; acronyms (CCTV, AC) stay.
export const industryName = (page) =>
  page.h1
    .replace(/\s+Quotation Format$/i, "")
    .split(" ")
    .map((w) => (w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");

// Industry name for a saved industry slug ("" for "other" or unknown).
export function industryOfSlug(strSlug) {
  const page = INDUSTRY_PAGES.find((p) => p.slug === strSlug);
  return page ? industryName(page) : "";
}

// "Hi, I'm looking for a CCTV quotation tool. I make quotations using Excel, about 2–5 a day.
//  I'd like the free 7-day trial. (Page: …)". Unknown parts are left out.
export function whatsappText({ industry, method, quotes, pageTitle }) {
  const lstParts = [industry ? `Hi, I'm looking for ${withArticle(industry)} quotation tool.` : "Hi, I'm looking for a quotation tool."];
  if (method && quotes) lstParts.push(`I make quotations ${METHOD_PHRASE[method]}, about ${QUOTE_PHRASE[quotes]} a day.`);
  else if (method) lstParts.push(`I make quotations ${METHOD_PHRASE[method]}.`);
  else if (quotes) lstParts.push(`I make about ${QUOTE_PHRASE[quotes]} quotations a day.`);
  lstParts.push(`I'd like the free ${SITE.trialDays}-day trial. (Page: ${pageTitle})`);
  return lstParts.join(" ");
}

export const whatsappUrl = (strText) => `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(strText)}`;

// page: entry from pages.js, or null on the homepage.
export const pageTitle = (page) => (page ? page.h1 : "Home");
