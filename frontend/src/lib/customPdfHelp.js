import { SITE } from "@/marketing/site";
import { funnelEvent } from "@/marketing/leadHelper/leadLog";

// Logo, colours and custom PDF layouts are set up by our team on WhatsApp (trial accounts have no
// Print Settings page). One link and one click logger shared by the dashboard checklist, the locked
// Print Settings page and the saved-quotation banner.
const CLICKED_KEY = "qp_custom_pdf_clicked";

function accountInfo() {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "{}");
  } catch {
    return {};
  }
}

export function customPdfLink() {
  const objInfo = accountInfo();
  const strText = `Hi, I'd like to add my logo / customise my quotation PDF. My account: ${objInfo.strEmail || "-"}, business: ${objInfo.strBusinessName || "-"}.`;
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(strText)}`;
}

export function customPdfClicked() {
  try {
    return localStorage.getItem(CLICKED_KEY) === "1";
  } catch {
    return false;
  }
}

// strLocation: where the link was clicked (checklist | locked_page | saved_quotation).
export function trackCustomPdfClick(strLocation) {
  try {
    localStorage.setItem(CLICKED_KEY, "1");
  } catch {
    /* storage blocked: the link still opens */
  }
  funnelEvent("custom_pdf_whatsapp_click", { answer: strLocation });
}
