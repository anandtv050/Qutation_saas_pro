// Pricing facts shared by the app (Subscribe page) and the website (src/marketing).
// UI-only for now: plan prices live in src/marketing/site.js (PLANS) and are shown on both
// the website and the Subscribe page. The database still holds the old plans until the
// backend change parked in misc/pricing-2026-10 is applied.

export const WHATSAPP_NUMBER = "918848644935";

export const TRIAL_DAYS = 7;
export const TRIAL_LINE = "7-day free trial. No payment needed.";
export const PRICE_NOTE = "Final price. No hidden charges.";
export const SETUP_FEATURE = "Logo and print layout set up for you";

// Founding offer: recorded manually by admin (UPI) via "Record Payment", not an automatic
// checkout. The 20-place limit is tracked by hand until the backend change is applied.
export const FOUNDING_OFFER = {
  strPlanName: "Pro",
  dblPriceYearly: 9999,
  intLimit: 20,
  strBanner: "Founding offer: Pro yearly ₹9,999 — first 20 businesses, price locked for life.",
};

export function whatsappLink(strText) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(strText)}`;
}

export const formatInr = (n) => new Intl.NumberFormat("en-IN").format(n);
