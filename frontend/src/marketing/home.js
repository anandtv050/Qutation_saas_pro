// Homepage content shared by Landing.jsx and the prerender head (FAQPage JSON-LD).
import { SITE, PLANS, FOUNDING_OFFER } from "./site";
import { formatInr } from "../lib/pricing";

export const HOME = {
  path: "/",
  title: "Quotely Pro – Quotation Maker for Small Businesses in India",
  description:
    "Make a professional item-wise quotation on your phone in about a minute, download the PDF and send it on WhatsApp. For installers, contractors, traders.",
};

export const HOME_FAQS = [
  {
    q: "What is Quotely Pro?",
    a: "Quotely Pro is a quotation maker web app for small businesses in India. You add items with quantity, unit and rate on your phone, download a branded PDF quotation, and send it to your customer on WhatsApp. It is built in India and runs at quotelypro.in. Read more [about Quotely Pro](/about).",
  },
  {
    q: "Who is Quotely Pro for?",
    a: "Any small business that sends quotations with a list of items: installers (CCTV, solar, electrical, AC), contractors and interior designers, service providers, traders and freelancers.",
  },
  {
    q: "How do I send a quotation on WhatsApp with Quotely Pro?",
    a: "Make the quotation in Quotely Pro and download it as a PDF. Then open your customer's WhatsApp chat, attach the PDF as a document and send it. Quotely Pro does not send WhatsApp messages by itself.",
  },
  {
    q: "Do I need to install an app?",
    a: "No. Quotely Pro is a web app. Open quotelypro.in in Chrome or any browser on your phone, tablet or computer and sign in. There is no Play Store or App Store app.",
  },
  {
    q: "Does Quotely Pro replace my billing or accounting software?",
    a: "Partly. It covers quotations and invoices. It does not do accounting, GST returns or stock, so GST-registered businesses usually keep Tally, Vyapar, myBillBook or Zoho for those.",
  },
  {
    q: "Can I reuse an old quotation?",
    a: "Yes. Open a saved quotation and use Copy to start a new one with the same items. Change only the customer, quantities or rates. Your regular items and rates can also be saved in your item list so they fill in automatically.",
  },
  {
    q: "What does AI Quick Create do?",
    a: "Type what you need in plain words, and AI picks the matching items, quantities and prices from your saved catalogue, so a quotation is ready in seconds. For example, type \"4 dome cameras, 1 NVR, 100 m cable\". It only uses items already in your catalogue, at your own prices. It does not suggest prices or create items that are not in your catalogue.",
  },
  {
    q: "Is there a free trial?",
    a: `Yes. ${SITE.trialLine} Message us on WhatsApp and we set up your account.`,
  },
  {
    q: "How much does Quotely Pro cost?",
    a: `There are three plans. ${SITE.priceNote} ${PLANS.map(
      (p) => `${p.name} is ₹${formatInr(p.priceMonthly)} per month or ₹${formatInr(p.priceYearly)} per year`
    ).join(". ")}. Yearly billing gives you 2 months free. ${FOUNDING_OFFER.strBanner}`,
  },
];
