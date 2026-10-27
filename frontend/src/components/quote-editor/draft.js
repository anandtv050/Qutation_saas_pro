// The anonymous quotation draft of the website editor.
// Kept in localStorage for 7 days (memory fallback when storage is blocked), and only once the
// visitor has changed something, so an untouched editor always shows the current page's items.
// Pure module (no React, no aliases) so it can be unit-tested with `node --test`.

export const DRAFT_KEY = "qp_draft";
export const IMPORTED_KEY = "qp_imported";
export const DRAFT_VERSION = 1;
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_ITEMS = 50;
const MAX_IMPORTED_IDS = 30;

const objMemory = {};

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function storeGet(strKey) {
  try {
    const s = storage();
    return s ? s.getItem(strKey) : (objMemory[strKey] ?? null);
  } catch {
    return objMemory[strKey] ?? null;
  }
}

export function storeSet(strKey, strValue) {
  try {
    const s = storage();
    if (s) s.setItem(strKey, strValue);
    else objMemory[strKey] = strValue;
  } catch {
    objMemory[strKey] = strValue;
  }
}

export function storeRemove(strKey) {
  try {
    storage()?.removeItem(strKey);
  } catch {
    // ignore
  }
  delete objMemory[strKey];
}

export function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

// Default PDF colours (backend/app/api/pdf/service.py: DEF_BRAND_DARK, DEF_BRAND_ACCENT, TABLE_HEADER).
// The editor writes no print settings, so the account's PDF uses these. Used by the preview only.
export const PDF_BRAND = "#1B2A4A";
export const PDF_ACCENT = "#2563EB";
export const PDF_TABLE_HEAD = "#1E3A5F";

export const makeItem = (objPartial = {}) => ({ id: newId(), name: "", unit: "Nos", qty: "1", rate: "", ...objPartial });

// First few items of the page's sample quotation, as editable rows.
export function starterItems(page, intCount = 4) {
  return (page?.sample?.items || []).slice(0, intCount).map((it) =>
    makeItem({ name: it.name, unit: it.unit || "Nos", qty: String(it.qty ?? 1), rate: String(it.rate ?? "") })
  );
}

export const emptyDraft = (strTrade = "", lstItems = []) => ({
  v: DRAFT_VERSION,
  id: newId(),
  trade: strTrade,
  business: "",
  customerName: "",
  customerPhone: "",
  items: lstItems,
  dirty: false,
  savedAt: Date.now(),
});

const NUMERIC = /^\d{0,9}(\.\d{0,2})?$/;
const clip = (v, n) => String(v ?? "").slice(0, n);

// Defensive copy of whatever is in storage (it is user-editable): right types, sane lengths.
export function sanitizeDraft(raw) {
  if (!raw || typeof raw !== "object" || raw.v !== DRAFT_VERSION || typeof raw.id !== "string") return null;
  const lstItems = (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_ITEMS).map((it) => ({
    id: clip(it?.id, 64) || newId(),
    name: clip(it?.name, 200),
    unit: clip(it?.unit, 20),
    qty: NUMERIC.test(String(it?.qty ?? "")) ? String(it.qty) : "1",
    rate: NUMERIC.test(String(it?.rate ?? "")) ? String(it.rate) : "",
  }));
  return {
    v: DRAFT_VERSION,
    id: clip(raw.id, 64),
    trade: clip(raw.trade, 60),
    business: clip(raw.business, 200),
    customerName: clip(raw.customerName, 200),
    customerPhone: clip(raw.customerPhone, 20),
    items: lstItems,
    dirty: raw.dirty === true,
    savedAt: Number(raw.savedAt) || Date.now(),
  };
}

// The saved draft, or null when there is none, it is older than 7 days, or it was never edited.
export function loadDraft(intNow = Date.now()) {
  const strRaw = storeGet(DRAFT_KEY);
  if (!strRaw) return null;
  let draft = null;
  try {
    draft = sanitizeDraft(JSON.parse(strRaw));
  } catch {
    draft = null;
  }
  if (!draft || intNow - draft.savedAt > DRAFT_TTL_MS) {
    storeRemove(DRAFT_KEY);
    return null;
  }
  return draft.dirty ? draft : null;
}

export function saveDraft(draft, intNow = Date.now()) {
  storeSet(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: intNow }));
}

export const clearDraft = () => storeRemove(DRAFT_KEY);

// draftId -> quotation id, for drafts that were already turned into a quotation
// (a retry must never create a second one).
function importedMap() {
  try {
    const obj = JSON.parse(storeGet(IMPORTED_KEY) || "{}");
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

export const isImported = (strId) => strId in importedMap();
export const importedQuotationId = (strId) => importedMap()[strId] ?? null;

export function markImported(strId, intQuotationId) {
  const obj = importedMap();
  delete obj[strId];
  obj[strId] = intQuotationId ?? null;
  const lstKeep = Object.keys(obj).slice(-MAX_IMPORTED_IDS);
  storeSet(IMPORTED_KEY, JSON.stringify(Object.fromEntries(lstKeep.map((k) => [k, obj[k]]))));
}

// ---- amounts (same rules and formats as the real PDF) ---------------------------------------
export const numberOf = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
export const lineAmount = (it) => numberOf(it.qty) * numberOf(it.rate);
export const grandTotal = (lstItems) => lstItems.reduce((sum, it) => sum + lineAmount(it), 0);
// PDF: row amounts and unit prices "Rs. 12,345", grand total "Rs. 12,345.00", quantity like %g.
export const formatRs0 = (n) => `Rs. ${Math.round(n).toLocaleString("en-US")}`;
export const formatRs2 = (n) => `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatQty = (v) => String(Number(numberOf(v).toPrecision(6)));
export const namedItems = (lstItems) => lstItems.filter((it) => it.name.trim());
