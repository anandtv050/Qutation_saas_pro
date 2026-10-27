// Lead Helper state + logging. Logging: one row per event to the "Website Leads" Google Sheet
// (Apps Script web app, see misc/lead-helper) plus Clarity custom events. Fire-and-forget: never
// blocks the UI, never throws. No env URL = nothing is sent; everything else still works.
//
// Remembered per browser (localStorage "qp_lead_state"):
//   teasers   timestamps of auto teasers shown (max 2 per 7 days)
//   snoozeAt  teaser × time: no auto teaser or toast for 7 days
//   waText    pre-filled WhatsApp text of a WhatsApp click: no auto teaser ever again, the
//             launcher opens WhatsApp directly
//   answers   { industrySlug, method, quotes, visitorType } for "Welcome back"
//   numberAt  they left their WhatsApp number in the chat: no auto teaser or toast again
// Per browser tab session (sessionStorage): at most one auto teaser and one download toast.

const SHEET_URL = (import.meta.env.VITE_LEAD_SHEET_URL || "").trim();
const STATE_KEY = "qp_lead_state";
const SOURCE_KEY = "qp_lead_source";
const TEASER_SESSION_KEY = "qp_lead_teaser";
const TOAST_SESSION_KEY = "qp_lead_toast";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TEASERS_PER_WEEK = 2;

// localStorage / sessionStorage can be missing or throw (private mode, blocked site data).
function storageGet(store, key) {
  try {
    return window[store].getItem(key);
  } catch {
    return null;
  }
}
function storageSet(store, key, value) {
  try {
    window[store].setItem(key, value);
  } catch {
    // ignore
  }
}

// ---- remembered state ---------------------------------------------------------
function loadState() {
  try {
    const obj = JSON.parse(storageGet("localStorage", STATE_KEY) || "{}");
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveState(objPatch) {
  storageSet("localStorage", STATE_KEY, JSON.stringify({ ...loadState(), ...objPatch }));
}

const isSnoozed = (obj = loadState()) => Number(obj.snoozeAt) > 0 && Date.now() - Number(obj.snoozeAt) < WEEK_MS;
export const getConvertedText = () => (typeof loadState().waText === "string" ? loadState().waText : null);

export function canAutoTeaser() {
  const obj = loadState();
  if (obj.waText || obj.numberAt || isSnoozed(obj) || storageGet("sessionStorage", TEASER_SESSION_KEY)) return false;
  const lstRecent = (Array.isArray(obj.teasers) ? obj.teasers : []).filter((t) => Date.now() - Number(t) < WEEK_MS);
  return lstRecent.length < MAX_TEASERS_PER_WEEK;
}
export function noteTeaserShown() {
  const obj = loadState();
  const lstRecent = (Array.isArray(obj.teasers) ? obj.teasers : []).filter((t) => Date.now() - Number(t) < WEEK_MS);
  saveState({ teasers: [...lstRecent, Date.now()] });
  storageSet("sessionStorage", TEASER_SESSION_KEY, "1");
}
export const snooze = () => saveState({ snoozeAt: Date.now() });
export const markConverted = (strText) => saveState({ waText: strText });
export const markNumberGiven = () => saveState({ numberAt: Date.now() });

export function canToast() {
  const obj = loadState();
  return !obj.waText && !obj.numberAt && !isSnoozed(obj) && !storageGet("sessionStorage", TOAST_SESSION_KEY);
}

// Indian mobile number from free text: optional +91 / 91 / 0, then 10 digits starting 6-9.
// Returns "+91XXXXXXXXXX", or null if it is not a valid mobile number.
export function normaliseMobile(strInput) {
  const strDigits = String(strInput || "").replace(/[\s\-().]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(strDigits) ? `+91${strDigits}` : null;
}
export const noteToastShown = () => storageSet("sessionStorage", TOAST_SESSION_KEY, "1");

export function getSavedAnswers() {
  const obj = loadState().answers;
  return obj && typeof obj === "object" && obj.industrySlug ? obj : null;
}
export const saveAnswers = (objAnswers) =>
  saveState({
    answers: { industrySlug: objAnswers.industrySlug, method: objAnswers.method, quotes: objAnswers.quotes, visitorType: objAnswers.visitorType },
  });

// ---- visitor id -------------------------------------------------------------------
// One random id per browser (localStorage), sent with every event the website, the editor and the signup
// send, so a visit can be followed through to the account. Falls back to memory when storage is blocked.
const VISITOR_KEY = "qp_vid";
let strVisitorMemory = "";
export function getVisitorId() {
  let strId = storageGet("localStorage", VISITOR_KEY) || strVisitorMemory;
  if (!strId) {
    try {
      strId = crypto.randomUUID();
    } catch {
      strId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }
    strVisitorMemory = strId;
    storageSet("localStorage", VISITOR_KEY, strId);
  }
  return strId;
}

// ---- row fields -----------------------------------------------------------------
// session_id: one random id per page visit (a new one when the path changes).
let objVisit = { path: null, id: null };
function visitId() {
  const strPath = window.location.pathname;
  if (objVisit.path !== strPath) {
    let strId;
    try {
      strId = crypto.randomUUID();
    } catch {
      strId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    objVisit = { path: strPath, id: strId };
  }
  return objVisit.id;
}

export function getDevice() {
  try {
    return window.matchMedia("(max-width: 639px)").matches ? "mobile" : "desktop";
  } catch {
    return "desktop";
  }
}

function referrerUrl() {
  try {
    return document.referrer ? new URL(document.referrer) : null;
  } catch {
    return null;
  }
}

// Origin only (no path or query), so nothing personal ends up in the sheet.
function getReferrer() {
  const url = referrerUrl();
  return url ? url.origin : "";
}

function sourceFromHost(strHost) {
  const host = strHost.replace(/^www\./, "");
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)bing\.com$/.test(host)) return "bing";
  if (host === "chat.openai.com") return "chatgpt.com";
  if (host === window.location.hostname.replace(/^www\./, "")) return "internal";
  return host;
}

// utm_source, else referrer host, else direct. Frozen for the browser tab session so in-site
// navigation keeps the original source.
function getSource() {
  const strSaved = storageGet("sessionStorage", SOURCE_KEY);
  if (strSaved) return strSaved;
  let strSource = "direct";
  try {
    const strUtm = new URLSearchParams(window.location.search).get("utm_source");
    const url = referrerUrl();
    if (strUtm) strSource = strUtm.trim().toLowerCase().slice(0, 60);
    else if (url) strSource = sourceFromHost(url.hostname);
  } catch {
    // keep "direct"
  }
  storageSet("sessionStorage", SOURCE_KEY, strSource);
  return strSource;
}

const industryKey = (slug) => (slug ? slug.replace(/-quotation-format$/, "") : "");

// page: entry from pages.js, or null on the homepage. answers: whatever is known so far.
// phone: only on "number_submitted" rows (the visitor typed it in the chat).
export function logEvent(page, strEvent, { question = "", answer = "", answers = {}, phone = "" } = {}) {
  if (!SHEET_URL) return;
  const strIndustry = answers.industrySlug || (page?.kind === "industry" ? page.slug : "");
  const objRow = {
    visitor_id: getVisitorId(),
    session_id: visitId(),
    page_slug: page ? page.slug : "home",
    page_type: page ? page.kind : "home",
    industry: industryKey(strIndustry),
    event: strEvent,
    question,
    answer,
    quotes_per_day: answers.quotes || "",
    current_method: answers.method || "",
    visitor_type: answers.visitorType || "unknown",
    source: getSource(),
    device: getDevice(),
    referrer: getReferrer(),
    phone,
  };
  sendRow(objRow);
}

function sendRow(objRow) {
  try {
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(objRow),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

// ---- self-serve signup funnel ----------------------------------------------------
// Same sheet and fire-and-forget rules as the Lead Helper. Funnel rows have page_type "app"
// (the Apps Script keeps them in the raw tab only, not in the Visitors summary).
//   signup_started, signup_completed, onboarding_step (question = step 1/2/3, answer = done/skipped),
//   first_quote_created, first_pdf_downloaded
const CTX_KEY = "qp_signup_ctx";
const FUNNEL_SID_KEY = "qp_funnel_sid";

export function getSignupContext() {
  try {
    const obj = JSON.parse(storageGet("localStorage", CTX_KEY) || "{}");
    return { industry: String(obj.industry || ""), src: String(obj.src || "") };
  } catch {
    return { industry: "", src: "" };
  }
}

// The editor sets this just before Google sign-in so the new account records the trade and "editor" as its source.
export function setSignupContext({ industry = "", src = "" } = {}) {
  storageSet("localStorage", CTX_KEY, JSON.stringify({ industry: String(industry).slice(0, 60), src: String(src).slice(0, 60) }));
}

// /signup?industry=cctv&src=lead_helper: remember where the visitor came from until signup is done.
export function captureSignupContext() {
  try {
    const q = new URLSearchParams(window.location.search);
    const strIndustry = (q.get("industry") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    const strSrc = (q.get("src") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
    if (strIndustry || strSrc) storageSet("localStorage", CTX_KEY, JSON.stringify({ industry: strIndustry, src: strSrc }));
  } catch {
    // ignore
  }
  return getSignupContext();
}

// Same id for the whole signup, even though it spans several pages.
function funnelSessionId() {
  let strId = storageGet("localStorage", FUNNEL_SID_KEY);
  if (!strId) {
    try {
      strId = crypto.randomUUID();
    } catch {
      strId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    storageSet("localStorage", FUNNEL_SID_KEY, strId);
  }
  return strId;
}

// pageType "site" = the website editor; "app" = the signed-in app. industry overrides the remembered one.
export function funnelEvent(strEvent, { question = "", answer = "", industry, pageType = "app" } = {}) {
  if (!SHEET_URL) return;
  const objCtx = getSignupContext();
  sendRow({
    visitor_id: getVisitorId(),
    session_id: funnelSessionId(),
    page_slug: window.location.pathname.slice(0, 100),
    page_type: pageType,
    industry: industry ?? objCtx.industry,
    event: strEvent,
    question,
    answer,
    source: objCtx.src || getSource(),
    device: getDevice(),
    referrer: getReferrer(),
  });
}

// Run a funnel event once per browser (first quotation saved, first PDF downloaded).
export function funnelEventOnce(strEvent) {
  const strKey = `qp_funnel_done_${strEvent}`;
  if (storageGet("localStorage", strKey)) return;
  storageSet("localStorage", strKey, "1");
  funnelEvent(strEvent);
}

export const trafficSource = () => getSource();

export function clarityEvent(strName) {
  try {
    if (typeof window.clarity === "function") window.clarity("event", strName);
  } catch {
    // ignore
  }
}
