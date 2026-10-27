import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { getPage, INDUSTRY_PAGES } from "@/marketing/pages";
import { industryKeyOfSlug } from "@/marketing/site";
import { funnelEvent } from "@/marketing/leadHelper/leadLog";
import QuotePreview from "./QuotePreview.jsx";
import AddItemSheet from "./AddItemSheet.jsx";
import {
  emptyDraft, formatRs0, formatRs2, grandTotal, lineAmount, loadDraft, makeItem, MAX_ITEMS, namedItems, numberOf, saveDraft, starterItems,
} from "./draft.js";

// Google's script and the save flow load only when the visitor presses the download button.
const SaveModal = lazy(() => import("./SaveModal.jsx"));

const INPUT = `w-full h-11 px-3 text-base bg-white rounded-lg border border-neutral-300 text-black placeholder:text-neutral-400
  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 hover:border-neutral-400`;
const NUMERIC = /^\d{0,9}(\.\d{0,2})?$/;

// Homepage trade chips: six common trades, the rest under "More".
const CHIP_SLUGS = [
  ["cctv-quotation-format", "CCTV"],
  ["solar-installation-quotation-format", "Solar"],
  ["electrical-work-quotation-format", "Electrical"],
  ["ac-installation-service-quotation-format", "AC"],
  ["interior-design-quotation-format", "Interior"],
  ["event-management-quotation-format", "Events"],
];
const MORE_PAGES = INDUSTRY_PAGES.filter((p) => !CHIP_SLUGS.some(([slug]) => slug === p.slug));
const HOME_DEFAULT_SLUG = CHIP_SLUGS[0][0];

// One card: form on the left and a live preview on the right (desktop); "Edit | Preview" tabs on a phone.
// It runs without a login and keeps everything in localStorage until the visitor saves it.
// `page` is the industry page (the trade is preset by it); on the homepage the visitor picks the trade.
export default function QuoteEditor({ page = null, mode = "industry" }) {
  const blnHome = mode === "home";
  const [strHomeSlug, setStrHomeSlug] = useState(HOME_DEFAULT_SLUG);
  const strSlug = blnHome ? strHomeSlug : page.slug; // always the trade the suggestions come from
  const tradePage = getPage(strSlug);
  const strTradeKey = industryKeyOfSlug(strSlug);

  const [draft, setDraft] = useState(null);
  const [strTab, setStrTab] = useState("edit");
  const [blnPhone, setBlnPhone] = useState(false);
  const [blnSheet, setBlnSheet] = useState(false);
  const [blnModal, setBlnModal] = useState(false);
  const [blnBar, setBlnBar] = useState(true);
  const [strError, setStrError] = useState("");
  const blnLoaded = draft !== null;
  const refEdited = useRef(false);
  const refItemsTouched = useRef(false);
  const refCard = useRef(null);
  const refLastName = useRef(null);

  const track = (strEvent, strAnswer = "") => funnelEvent(strEvent, { answer: strAnswer, industry: strTradeKey, pageType: "site" });

  // Load the saved draft (client only), else this trade's starter items.
  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      setDraft(saved);
      setBlnPhone(!!saved.customerPhone);
      refItemsTouched.current = saved.items.length > 0;
      if (blnHome && saved.trade && getPage(`${saved.trade}-quotation-format`)) setStrHomeSlug(`${saved.trade}-quotation-format`);
    } else {
      setDraft(emptyDraft(strTradeKey, starterItems(tradePage, 5)));
    }
    funnelEvent("editor_opened", { industry: strTradeKey, pageType: "site" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (only once something was changed).
  useEffect(() => {
    if (!draft || !draft.dirty) return undefined;
    const t = setTimeout(() => saveDraft(draft), 400);
    return () => clearTimeout(t);
  }, [draft]);

  // Phone: the sticky download bar only shows once the card has come up the screen, so it is never
  // on screen together with another primary button (e.g. the homepage hero button).
  useEffect(() => {
    const onScroll = () => {
      const r = refCard.current?.getBoundingClientRect();
      setBlnBar(!!r && r.top < window.innerHeight * 0.45 && r.bottom > 120);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [blnLoaded]);

  if (!draft) return null;

  const touch = () => {
    if (!refEdited.current) {
      refEdited.current = true;
      track("editor_edited");
    }
  };
  const patch = (obj) => {
    touch();
    setDraft((d) => ({ ...d, ...obj, dirty: true }));
  };
  const patchItem = (strId, obj) => {
    refItemsTouched.current = true;
    touch();
    setDraft((d) => ({ ...d, dirty: true, items: d.items.map((it) => (it.id === strId ? { ...it, ...obj } : it)) }));
  };
  const removeItem = (strId) => {
    refItemsTouched.current = true;
    touch();
    setDraft((d) => ({ ...d, dirty: true, items: d.items.filter((it) => it.id !== strId) }));
  };
  const addItem = (objPartial, strKind) => {
    if (draft.items.length >= MAX_ITEMS) return;
    refItemsTouched.current = true;
    touch();
    track("item_added", strKind);
    setDraft((d) => ({ ...d, dirty: true, items: [...d.items, makeItem(objPartial)] }));
    setBlnSheet(false);
    setStrTab("edit");
    if (strKind === "custom") setTimeout(() => refLastName.current?.focus(), 80);
  };
  const pickTrade = (strNewSlug) => {
    const p = getPage(strNewSlug);
    if (!p || strNewSlug === strHomeSlug) return;
    touch();
    setStrHomeSlug(strNewSlug);
    setDraft((d) => ({ ...d, dirty: true, trade: industryKeyOfSlug(strNewSlug), items: refItemsTouched.current ? d.items : starterItems(p, 5) }));
  };
  const setNumber = (strId, strField, strValue) => {
    if (NUMERIC.test(strValue)) patchItem(strId, { [strField]: strValue });
  };
  const stepQty = (it, intDelta) => patchItem(it.id, { qty: String(Math.max(1, numberOf(it.qty) + intDelta)) });
  const onSave = () => {
    if (!namedItems(draft.items).length) {
      setStrError("Add at least one item to download your PDF.");
      setStrTab("edit");
      return;
    }
    setStrError("");
    track("save_click");
    setBlnModal(true);
  };

  const lstSuggestions = (tradePage?.sample?.items || []).filter((s) => !draft.items.some((it) => it.name === s.name));
  const dblTotal = grandTotal(draft.items);

  const saveButton = (strHook) => (
    <>
      <button type="button" data-qe={strHook} onClick={onSave} className="w-full h-12 text-base font-semibold bg-black text-white rounded-xl hover:bg-neutral-800 active:scale-[0.99] transition">
        Download PDF — free
      </button>
      <p className="mt-1.5 text-center text-xs text-neutral-500">Free 7-day trial · No card needed</p>
    </>
  );

  return (
    <div ref={refCard} className="rounded-2xl border border-neutral-200 bg-white shadow-sm" data-qe="editor">
      {/* Phone: Edit | Preview */}
      <div role="tablist" aria-label="Editor view" className="lg:hidden grid grid-cols-2 border-b border-neutral-200">
        {[["edit", "Edit"], ["preview", "Preview"]].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            data-qe={`tab-${k}`}
            aria-selected={strTab === k}
            onClick={() => setStrTab(k)}
            className={`h-11 text-sm font-semibold border-b-2 ${strTab === k ? "border-black text-black" : "border-transparent text-neutral-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 sm:p-5 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* ---------------- form ---------------- */}
        <div data-qe="form" className={`${strTab === "preview" ? "hidden lg:block" : ""} space-y-5`}>
          {blnHome && (
            <div>
              <p className="text-sm font-semibold text-neutral-900 mb-2" id="qe-trade-label">What do you quote for?</p>
              <div role="radiogroup" aria-labelledby="qe-trade-label" className="flex flex-wrap gap-2" data-qe="trades">
                {CHIP_SLUGS.map(([slug, label]) => {
                  const blnOn = slug === strSlug;
                  return (
                    <button
                      key={slug}
                      type="button"
                      role="radio"
                      aria-checked={blnOn}
                      onClick={() => pickTrade(slug)}
                      className={`min-h-[40px] px-3 text-sm font-medium rounded-full border transition-colors ${blnOn ? "bg-black text-white border-black" : "bg-white text-neutral-800 border-neutral-300 hover:border-neutral-500"}`}
                    >
                      {label}
                    </button>
                  );
                })}
                <select
                  data-qe="more-trades"
                  aria-label="More trades"
                  value={MORE_PAGES.some((p) => p.slug === strSlug) ? strSlug : ""}
                  onChange={(e) => e.target.value && pickTrade(e.target.value)}
                  className={`min-h-[40px] px-3 text-sm font-medium rounded-full border bg-white ${MORE_PAGES.some((p) => p.slug === strSlug) ? "border-black" : "border-neutral-300"}`}
                >
                  <option value="">More ▾</option>
                  {MORE_PAGES.map((p) => <option key={p.slug} value={p.slug}>{p.navLabel}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="qe-business" className="block text-sm font-semibold text-neutral-900 mb-1.5">Your business name</label>
              <input id="qe-business" data-qe="business" className={INPUT} value={draft.business} onChange={(e) => patch({ business: e.target.value.slice(0, 200) })} placeholder="e.g. Sree Electricals" autoComplete="organization" maxLength={200} />
            </div>
            <div>
              <label htmlFor="qe-customer" className="block text-sm font-semibold text-neutral-900 mb-1.5">Customer name</label>
              <input id="qe-customer" data-qe="customer" className={INPUT} value={draft.customerName} onChange={(e) => patch({ customerName: e.target.value.slice(0, 200) })} placeholder="Who is this quotation for?" autoComplete="off" maxLength={200} />
              {blnPhone ? (
                <input aria-label="Customer phone" data-qe="phone" className={`${INPUT} mt-2`} value={draft.customerPhone} onChange={(e) => patch({ customerPhone: e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20) })} placeholder="Customer phone" type="tel" inputMode="tel" autoComplete="off" />
              ) : (
                <button type="button" data-qe="show-phone" onClick={() => setBlnPhone(true)} className="mt-1.5 text-sm font-medium text-neutral-600 hover:text-black">+ phone</button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Items</h3>
            <ul className="space-y-2" data-qe="items">
              {draft.items.map((it, i) => (
                <li key={it.id} className="rounded-xl border border-neutral-200 bg-white p-2.5" data-qe="item">
                  <div className="flex items-center gap-2">
                    <input
                      ref={i === draft.items.length - 1 ? refLastName : null}
                      aria-label={`Item ${i + 1} name`}
                      className={INPUT}
                      value={it.name}
                      onChange={(e) => patchItem(it.id, { name: e.target.value.slice(0, 200) })}
                      placeholder="Item name"
                      maxLength={200}
                    />
                    <button type="button" aria-label={`Remove item ${i + 1}`} onClick={() => removeItem(it.id)} className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black">
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg border border-neutral-300">
                      <button type="button" aria-label="Decrease quantity" onClick={() => stepQty(it, -1)} className="w-10 h-11 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-l-lg">
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <input aria-label="Quantity" inputMode="decimal" className="w-12 h-11 text-center text-base bg-transparent focus:outline-none" value={it.qty} onChange={(e) => setNumber(it.id, "qty", e.target.value)} />
                      <button type="button" aria-label="Increase quantity" onClick={() => stepQty(it, 1)} className="w-10 h-11 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-r-lg">
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-neutral-400" aria-hidden="true">×</span>
                    <input aria-label="Rate in rupees" inputMode="decimal" className={`${INPUT} !w-24`} value={it.rate} onChange={(e) => setNumber(it.id, "rate", e.target.value)} placeholder="Rate" />
                    <input aria-label="Unit" className={`${INPUT} !w-16 !px-2 text-sm`} value={it.unit} onChange={(e) => patchItem(it.id, { unit: e.target.value.slice(0, 20) })} placeholder="Unit" maxLength={20} />
                    <span className="ml-auto text-base font-semibold tabular-nums" data-qe="line-total">{formatRs0(lineAmount(it))}</span>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" data-qe="add-item" onClick={() => setBlnSheet(true)} disabled={draft.items.length >= MAX_ITEMS} className="mt-2 w-full min-h-[44px] text-sm font-semibold text-neutral-900 border border-dashed border-neutral-400 rounded-xl hover:border-black disabled:opacity-50">
              + Add item
            </button>
            <p className="mt-2 text-sm text-neutral-600">{draft.items.length} {draft.items.length === 1 ? "item" : "items"} · <span className="font-semibold text-neutral-900 tabular-nums" data-qe="form-total">{formatRs2(dblTotal)}</span></p>
          </div>
        </div>

        {/* ---------------- preview (+ the button on desktop) ---------------- */}
        <div data-qe="preview-col" className={`${strTab === "edit" ? "hidden lg:block" : ""} mt-0 lg:sticky lg:top-20 lg:self-start`}>
          <div className="hidden lg:block mb-4">
            {saveButton("save")}
            {strError && <p role="alert" className="mt-2 text-sm text-red-600" data-qe="save-error">{strError}</p>}
          </div>
          <QuotePreview business={draft.business} customerName={draft.customerName} customerPhone={draft.customerPhone} items={draft.items} />
        </div>
      </div>

      {/* Phone: the one primary button, pinned to the bottom of the screen while the editor is in view */}
      {blnBar && (
        <div data-qe="bar" className="lg:hidden sticky bottom-0 z-20 rounded-b-2xl border-t border-neutral-200 bg-white/95 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {saveButton("save-mobile")}
          {strError && <p role="alert" className="mt-2 text-sm text-red-600" data-qe="save-error-mobile">{strError}</p>}
        </div>
      )}

      {blnSheet && (
        <AddItemSheet
          suggestions={lstSuggestions}
          tradeLabel={tradePage?.navLabel || ""}
          onPick={(s) => addItem({ name: s.name, unit: s.unit || "Nos", qty: String(s.qty ?? 1), rate: String(s.rate ?? "") }, "suggested")}
          onCustom={(strName) => addItem({ name: strName, unit: "Nos", qty: "1", rate: "" }, "custom")}
          onClose={() => setBlnSheet(false)}
        />
      )}

      {blnModal && (
        <Suspense fallback={null}>
          <SaveModal draft={draft} tradeKey={strTradeKey} tradeLabel={tradePage?.navLabel || ""} onPatch={(obj) => setDraft((d) => ({ ...d, ...obj, dirty: true }))} onClose={() => setBlnModal(false)} track={track} />
        </Suspense>
      )}
    </div>
  );
}
