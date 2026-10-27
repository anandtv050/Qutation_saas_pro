import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { formatRs0 } from "./draft.js";

// "+ Add item": search box, "Type your own item" first, then the CURRENT trade's typical items.
// `suggestions` is always the selected/preset trade's list (never another page's).
export default function AddItemSheet({ suggestions, tradeLabel, onPick, onCustom, onClose }) {
  const [strQuery, setStrQuery] = useState("");
  const refInput = useRef(null);

  useEffect(() => {
    refInput.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const strQ = strQuery.trim().toLowerCase();
  const lstShown = useMemo(() => suggestions.filter((s) => !strQ || s.name.toLowerCase().includes(strQ)), [suggestions, strQ]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Add item" data-qe="sheet" className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b border-neutral-200">
          <input
            ref={refInput}
            data-qe="sheet-search"
            value={strQuery}
            onChange={(e) => setStrQuery(e.target.value.slice(0, 200))}
            placeholder="Search items"
            aria-label="Search items"
            className="flex-1 h-11 px-3 text-base rounded-lg border border-neutral-300 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10"
          />
          <button type="button" aria-label="Close" onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          <button
            type="button"
            data-qe="sheet-custom"
            onClick={() => onCustom(strQuery.trim())}
            className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold rounded-lg border border-dashed border-neutral-400 hover:border-black"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            {strQuery.trim() ? `Add "${strQuery.trim()}" as your own item` : "Type your own item"}
          </button>
          <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {tradeLabel ? `${tradeLabel} items` : "Typical items"}
          </p>
          {suggestions.length === 0 && <p className="text-sm text-neutral-600">Pick your trade first to see typical items.</p>}
          {suggestions.length > 0 && lstShown.length === 0 && <p className="text-sm text-neutral-600">No match. Add it as your own item above.</p>}
          <ul className="space-y-1.5" data-qe="sheet-items">
            {lstShown.map((s) => (
              <li key={s.name}>
                <button type="button" onClick={() => onPick(s)} className="w-full text-left text-sm px-3 py-2 rounded-lg border border-neutral-200 hover:border-neutral-500 flex items-start gap-2">
                  <span className="min-w-0 flex-1 break-words">{s.name}</span>
                  <span className="shrink-0 text-neutral-500 tabular-nums">{formatRs0(s.rate)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
