// Wires importDraft.js to the app's existing API services. Nothing new on the server.
import inventoryService from "@/services/inventoryService";
import quotationService from "@/services/quotationService";
import onboardingService from "@/services/onboardingService";
import { clearDraft, importedQuotationId, isImported, markImported, storeGet, storeRemove, storeSet } from "./draft.js";

// Business problems come back as HTTP 200 with intStatus 0 (HTTP errors throw), so check the body.
export function makeImportDeps(strCategory) {
  return {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    today: () => new Date().toLocaleDateString("en-CA"),
    todayUtc: () => new Date().toISOString().slice(0, 10), // the server dates quotations in its own (UTC) day
    getState: (k) => {
      try {
        return JSON.parse(storeGet(k) || "null");
      } catch {
        return null;
      }
    },
    setState: (k, v) => storeSet(k, JSON.stringify(v)),
    clearState: (k) => storeRemove(k),
    isImported,
    importedQuotationId,
    markImported,
    clearDraft,

    listInventory: async () => {
      const res = await inventoryService.getList();
      return (res?.lstItem || []).map((x) => ({
        id: x.intPkInventoryId, code: x.strItemCode, name: x.strItemName, unit: x.strUnit, price: x.dblUnitPrice,
      }));
    },

    addInventory: async ({ code, name, unit, price }) => {
      const res = await inventoryService.add({
        strItemCode: code, strItemName: name, strCategory: strCategory || "General", strUnit: unit,
        dblUnitPrice: price, intStockQuantity: 0,
      });
      if (res?.intStatus === 1 && res.data?.intPkInventoryId) return { ok: true, id: res.data.intPkInventoryId };
      if (res?.intStatusCode === 409 || /already exists/i.test(res?.strMessage || "")) return { ok: false, exists: true };
      return { ok: false, message: res?.strMessage };
    },

    listQuotations: async () => {
      const res = await quotationService.getList();
      return (res?.lstQuotation || []).map((q) => ({
        id: q.intPkQuotationId, customerName: q.strCustomerName, total: Number(q.dblTotalAmount), itemCount: q.intItemCount, date: String(q.datQuotationDate).slice(0, 10),
      }));
    },

    addQuotation: async ({ customerName, customerPhone, items }) => {
      const res = await quotationService.add({
        strCustomerName: customerName,
        strCustomerPhone: customerPhone || null,
        strStatus: "draft",
        lstItems: items.map((it, i) => ({
          intInventoryId: it.inventoryId, strItemName: it.name, strUnit: it.unit, dblQuantity: it.qty, dblUnitPrice: it.rate, intSortOrder: i,
        })),
      });
      if (res?.intStatus !== 1 || !res.data?.intPkQuotationId) throw new Error(res?.strMessage || "Could not save your quotation. Please try again.");
      return { id: res.data.intPkQuotationId };
    },

    saveBusinessName: (name) => onboardingService.saveProfile({ businessName: name, phone: null }),
    finishOnboarding: () => onboardingService.finish({ skipSample: true }),
  };
}
