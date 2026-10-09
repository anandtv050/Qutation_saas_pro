// Single source of truth for public marketing facts.
// Only state things the app actually does — see the feature audit before editing copy.
import { TRIAL_DAYS, TRIAL_LINE, PRICE_NOTE, SETUP_FEATURE, FOUNDING_OFFER } from "../lib/pricing";

export { FOUNDING_OFFER };

export const SITE = {
  name: "Quotely Pro",
  domain: "quotelypro.in",
  url: "https://quotelypro.in",
  email: "supportquotely@gmail.com",
  phoneDisplay: "+91 88486 44935",
  phoneE164: "+918848644935",
  whatsappNumber: "918848644935",
  // Trial: 7 days free, no payment. No permanent free plan. See src/lib/pricing.js.
  trialDays: TRIAL_DAYS,
  trialLine: TRIAL_LINE,
  priceNote: PRICE_NOTE,
  logo: "https://quotelypro.in/logo-512.png",
  ogImage: "https://quotelypro.in/og-image.png",
};

// Every "start" CTA goes to WhatsApp until self-serve signup exists.
export function demoLink(context) {
  const strText = context
    ? `Hi, I want to try Quotely Pro for ${context}. Please set up my 7-day free trial.`
    : "Hi, I want to try Quotely Pro. Please set up my 7-day free trial.";
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(strText)}`;
}

// Shown on the website and the in-app Subscribe page (UI-only; DB update parked in misc/pricing-2026-10).
export const PLANS = [
  {
    key: "basic",
    name: "Basic",
    priceMonthly: 999,
    priceYearly: 9999,
    tagline: "Quotations and invoices from your phone",
    features: [
      "Unlimited quotations and invoices",
      "Item catalogue",
      "Copy quotation and quotation to invoice",
      "Branded PDF download and print",
      SETUP_FEATURE,
      "AI Quick Create",
    ],
    excluded: [],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: 1499,
    priceYearly: 14999,
    tagline: "Everything you need to quote, bill and follow up",
    features: [
      "Everything in Basic",
      "Warranty certificates and expiry tracking",
      "Advance and payment receipts",
      "Reports and dashboard",
    ],
    excluded: [],
    highlighted: true, // "Most popular"
  },
  {
    key: "business",
    name: "Business",
    priceMonthly: 2999,
    priceYearly: 29999,
    tagline: "Pro, plus we set everything up and look after you",
    features: [
      "Everything in Pro",
      "Full setup: catalogue and old quotations loaded for you",
      "Layout changes anytime",
      "Onboarding visit or call",
      "Priority support",
    ],
    excluded: [],
    highlighted: false,
  },
];

// Shared JSON-LD blocks.
export const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  url: SITE.url,
  logo: SITE.logo,
  description:
    "Quotely Pro is a quotation maker web app for small businesses in India. Make item-wise quotations and invoices on your phone and download them as PDFs.",
  email: SITE.email,
  address: { "@type": "PostalAddress", addressCountry: "IN" },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-88486-44935",
      email: SITE.email,
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English"],
    },
  ],
};

// About page: same organisation (same @id) with its location filled in.
export const ABOUT_ORG_JSONLD = {
  ...ORG_JSONLD,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kozhikode",
    addressRegion: "Kerala",
    addressCountry: "IN",
  },
};

export const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  inLanguage: "en-IN",
  publisher: { "@id": `${SITE.url}/#organization` },
};

export const SOFTWARE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  url: SITE.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Quotation maker web app for small businesses in India. Create item-wise quotations with quantity, unit and rate, turn them into invoices, and download branded PDFs to send on WhatsApp.",
  publisher: { "@id": `${SITE.url}/#organization` },
  offers: PLANS.map((p) => ({
    "@type": "Offer",
    name: `${p.name} plan`,
    price: String(p.priceMonthly),
    priceCurrency: "INR",
    description: `${p.name} plan, billed monthly. ${PRICE_NOTE} Yearly: ₹${p.priceYearly.toLocaleString("en-IN")}.`,
  })),
};
