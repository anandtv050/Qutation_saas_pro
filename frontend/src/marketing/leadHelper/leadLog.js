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
  if (obj.waText || isSnoozed(obj) || storageGet("sessionStorage", TEASER_SESSION_KEY)) return false;
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

export function canToast() {
  const obj = loadState();
  return !obj.waText && !isSnoozed(obj) && !storageGet("sessionStorage", TOAST_SESSION_KEY);
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
export function logEvent(page, strEvent, { question = "", answer = "", answers = {} } = {}) {
  if (!SHEET_URL) return;
  const strIndustry = answers.industrySlug || (page?.kind === "industry" ? page.slug : "");
  const objRow = {
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
  };
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

export function clarityEvent(strName) {
  try {
    if (typeof window.clarity === "function") window.clarity("event", strName);
  } catch {
    // ignore
  }
}
