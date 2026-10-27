import { PDF_ACCENT, PDF_BRAND, PDF_TABLE_HEAD, formatQty, formatRs0, formatRs2, grandTotal, lineAmount, numberOf } from "./draft.js";

// Live preview of the PDF a new account gets by default (no print settings are written): the default
// colours (dark navy title and business name, blue accent rule, slightly lighter navy table header),
// all six default columns of equal width including "Item Code" (a quotation line carries no code, so
// the real PDF prints "-"), Helvetica, "Rs." amounts (rows without decimals, grand total with 2) and no
// GST lines. Every item is shown.
const BORDER = "#CBD5E1";
const MUTED = "#64748B";

const todayIso = () => new Date().toLocaleDateString("en-CA");

export default function QuotePreview({ business, customerName, customerPhone, items }) {
  const strBusiness = business.trim();

  return (
    <figure className="m-0" data-qe="preview" aria-label="Live preview of your PDF quotation">
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden text-[#1E293B]" style={{ borderColor: BORDER, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ height: 4, background: PDF_ACCENT }} />
        <div className="p-3 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p
              data-qe="preview-business"
              className="min-w-0 text-[14px] sm:text-[15px] font-bold uppercase leading-tight break-words"
              style={{ color: strBusiness ? PDF_BRAND : "#94A3B8" }}
            >
              {strBusiness || "Your business name"}
            </p>
            <div className="text-right shrink-0">
              <p data-qe="preview-title" className="text-base sm:text-xl font-bold leading-none" style={{ color: PDF_BRAND }}>QUOTATION</p>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: MUTED }}>{todayIso()}</p>
              <p className="hidden sm:block text-[11px] leading-snug" style={{ color: MUTED }}>No: assigned on save</p>
            </div>
          </div>

          <div className="mt-3 text-[12px] leading-snug">
            <p className="font-bold" style={{ color: PDF_BRAND }}>Bill To</p>
            <p data-qe="preview-customer" style={{ color: customerName.trim() ? undefined : "#94A3B8" }}>
              {customerName.trim() || "Customer name"}
            </p>
            {customerPhone.trim() && <p>Phone: {customerPhone.trim()}</p>}
          </div>
          <hr className="my-3" style={{ borderColor: BORDER }} />

          <table className="w-full table-fixed text-[10px] sm:text-[12px] border-collapse">
            <thead>
              <tr data-qe="preview-head" style={{ background: PDF_TABLE_HEAD, color: "#fff" }}>
                <th scope="col" className="text-left font-bold px-1 sm:px-2 py-2 break-words">Item Code</th>
                <th scope="col" className="text-left font-bold px-1 sm:px-2 py-2">Item</th>
                <th scope="col" className="text-left font-bold px-1 sm:px-2 py-2">Unit</th>
                <th scope="col" className="text-right font-bold px-1 sm:px-2 py-2">Qty</th>
                <th scope="col" className="text-right font-bold px-1 sm:px-2 py-2">Unit Price</th>
                <th scope="col" className="text-right font-bold px-1 sm:px-2 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center" style={{ color: MUTED }}>Add your first item.</td>
                </tr>
              )}
              {items.map((it, i) => (
                <tr key={it.id} data-qe="preview-row" style={{ background: i % 2 === 1 ? "#F1F5F9" : "#fff", borderBottom: `1px solid ${BORDER}` }}>
                  <td className="px-1 sm:px-2 py-1.5 align-middle">-</td>
                  <td className="px-1 sm:px-2 py-1.5 align-middle break-words">{it.name.trim() || <span style={{ color: "#94A3B8" }}>Item name</span>}</td>
                  <td className="px-1 sm:px-2 py-1.5 align-middle break-words">{it.unit || "-"}</td>
                  <td className="px-1 sm:px-2 py-1.5 text-right align-middle tabular-nums">{formatQty(it.qty)}</td>
                  <td className="px-1 sm:px-2 py-1.5 text-right align-middle tabular-nums">{formatRs0(numberOf(it.rate))}</td>
                  <td className="px-1 sm:px-2 py-1.5 text-right align-middle tabular-nums">{formatRs0(lineAmount(it))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex justify-end">
            <div className="flex items-center justify-between gap-6 rounded-md border px-3 py-2" style={{ borderColor: BORDER }}>
              <span className="text-[12px] font-bold">Grand Total</span>
              <span data-qe="preview-total" className="text-[12px] font-bold tabular-nums" style={{ color: PDF_BRAND }}>{formatRs2(grandTotal(items))}</span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
