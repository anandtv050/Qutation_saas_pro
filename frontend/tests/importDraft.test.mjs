// Unit tests for the website-draft import (no browser, no network, no dependencies):
//   cd frontend && node --test tests/
import test from "node:test";
import assert from "node:assert/strict";

import { importDraft, itemCode, itemKey, cleanItems, ImportError } from "../src/components/quote-editor/importDraft.js";
import { sanitizeDraft, loadDraft, saveDraft, emptyDraft, makeItem, formatRs0, formatRs2, formatQty, grandTotal, DRAFT_TTL_MS, DRAFT_VERSION } from "../src/components/quote-editor/draft.js";

// ---- a fake backend with the same behaviour as the real APIs -----------------------------------
function makeWorld(opts = {}) {
  const w = {
    inventory: [...(opts.inventory || [])],   // {id, code, name, unit, price}
    quotations: [],                            // {id, customerName, total, itemCount, date}
    calls: [],
    nextId: 100,
    failInventoryAddFor: new Set(opts.failInventoryAddFor || []),
    dropQuotationResponse: opts.dropQuotationResponse || 0, // create it, but throw (lost response)
    failQuotationAdd: opts.failQuotationAdd || 0,
    failList: opts.failList || false,
    profile: null,
    finished: 0,
    state: {},
    imported: {},
    draftCleared: false,
  };
  const deps = {
    sleep: async () => {},
    today: () => "2026-10-27",
    getState: (k) => w.state[k],
    setState: (k, v) => { w.state[k] = JSON.parse(JSON.stringify(v)); },
    clearState: (k) => { delete w.state[k]; },
    isImported: (id) => id in w.imported,
    importedQuotationId: (id) => w.imported[id] ?? null,
    markImported: (id, q) => { w.imported[id] = q; },
    clearDraft: () => { w.draftCleared = true; },
    listInventory: async () => {
      w.calls.push("listInventory");
      if (w.failList) throw new Error("network");
      return w.inventory.map((x) => ({ ...x }));
    },
    addInventory: async ({ code, name, unit, price }) => {
      w.calls.push(`addInventory:${name}`);
      if (w.failInventoryAddFor.has(name)) throw new Error("network");
      if (w.inventory.some((x) => x.code === code)) return { ok: false, exists: true };
      const id = w.nextId++;
      w.inventory.push({ id, code, name, unit, price });
      return { ok: true, id };
    },
    listQuotations: async () => { w.calls.push("listQuotations"); return w.quotations.map((q) => ({ ...q })); },
    addQuotation: async ({ customerName, items }) => {
      w.calls.push("addQuotation");
      if (w.failQuotationAdd > 0) { w.failQuotationAdd--; throw new Error("server error"); }
      const id = w.nextId++;
      w.quotations.push({ id, customerName, itemCount: items.length, total: items.reduce((s, i) => s + i.qty * i.rate, 0), date: "2026-10-27", items });
      if (w.dropQuotationResponse > 0) { w.dropQuotationResponse--; throw new Error("timeout"); }
      return { id };
    },
    saveBusinessName: async (n) => { w.calls.push("saveBusinessName"); w.profile = n; },
    finishOnboarding: async () => { w.calls.push("finishOnboarding"); w.finished++; },
  };
  return { w, deps };
}

const draftOf = (over = {}) => ({
  id: "draft-1", business: "Sree Electricals", customerName: "Ramesh Kumar", customerPhone: "9876543210",
  items: [
    { name: "Copper wire 1.5 sq mm", unit: "Coil", qty: "4", rate: "1950" },
    { name: "MCB 32A", unit: "Nos", qty: "2", rate: "640" },
    { name: "Visit charge", unit: "Job", qty: "1", rate: "500" },
  ],
  ...over,
});
const newUser = { accountBusinessName: "", needsOnboarding: true };

test("happy path: items added, quotation linked to them, profile + finish, draft cleared", async () => {
  const { w, deps } = makeWorld();
  const r = await importDraft(draftOf(), newUser, deps);
  assert.equal(r.alreadyImported, false);
  assert.deepEqual(r.warnings, []);
  assert.equal(w.inventory.length, 3);
  assert.equal(w.quotations.length, 1);
  assert.ok(w.quotations[0].items.every((i) => i.inventoryId), "every line links to a catalogue item");
  assert.equal(w.quotations[0].total, 4 * 1950 + 2 * 640 + 500);
  assert.equal(w.profile, "Sree Electricals");
  assert.ok(!w.calls.includes("savePrintSettings"), "no print settings are written");
  assert.equal(w.finished, 1);
  assert.equal(w.draftCleared, true);
  assert.equal(w.imported["draft-1"], r.quotationId);
  assert.deepEqual(w.state, {}, "per-draft state is cleaned up");
});

test("dedupe: an item already in the catalogue (same name+unit+rate, any case) is reused, not added", async () => {
  const { w, deps } = makeWorld({ inventory: [{ id: 7, code: "X1", name: "copper WIRE 1.5 sq mm", unit: "coil", price: 1950 }] });
  await importDraft(draftOf(), newUser, deps);
  assert.equal(w.inventory.length, 3, "only the 2 missing items were added");
  assert.equal(w.quotations[0].items[0].inventoryId, 7);
  assert.ok(!w.calls.includes("addInventory:Copper wire 1.5 sq mm"));
});

test("same name but a different rate is a different catalogue item", async () => {
  const { w, deps } = makeWorld({ inventory: [{ id: 7, code: "X1", name: "MCB 32A", unit: "Nos", price: 600 }] });
  await importDraft(draftOf(), newUser, deps);
  assert.equal(w.inventory.length, 4);
});

test("a draftId that was already imported is skipped entirely", async () => {
  const { w, deps } = makeWorld();
  const first = await importDraft(draftOf(), newUser, deps);
  w.calls.length = 0;
  const again = await importDraft(draftOf(), newUser, deps);
  assert.equal(again.alreadyImported, true);
  assert.equal(again.quotationId, first.quotationId);
  assert.deepEqual(w.calls, [], "no API call at all");
  assert.equal(w.quotations.length, 1);
});

test("a catalogue add that keeps failing never blocks the quotation (line saved by name only)", async () => {
  const { w, deps } = makeWorld({ failInventoryAddFor: ["MCB 32A"] });
  const r = await importDraft(draftOf(), newUser, deps);
  assert.equal(w.quotations.length, 1);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /MCB 32A/);
  const mcb = w.quotations[0].items.find((i) => i.name === "MCB 32A");
  assert.equal(mcb.inventoryId, null);
  assert.equal(w.calls.filter((c) => c === "addInventory:MCB 32A").length, 3, "retried 3 times");
});

test("catalogue list failing only produces a warning", async () => {
  const { w, deps } = makeWorld({ failList: true });
  const r = await importDraft(draftOf(), newUser, deps);
  assert.equal(w.quotations.length, 1);
  assert.ok(r.warnings.some((x) => /catalogue/i.test(x)));
});

test("quotation create fails: nothing is half-done, the retry resumes and creates exactly one", async () => {
  const { w, deps } = makeWorld({ failQuotationAdd: 1 });
  await assert.rejects(() => importDraft(draftOf(), newUser, deps), ImportError);
  assert.equal(w.quotations.length, 0);
  assert.equal(w.inventory.length, 3, "catalogue items from the first attempt are kept");
  assert.equal(w.draftCleared, false, "draft is kept for the retry");
  assert.equal(w.finished, 0);

  w.calls.length = 0;
  const r = await importDraft(draftOf(), newUser, deps);
  assert.equal(w.quotations.length, 1);
  assert.equal(w.inventory.length, 3, "no duplicate catalogue items on retry");
  assert.equal(w.calls.filter((c) => c.startsWith("addInventory")).length, 0, "items resumed from saved progress");
  assert.equal(r.alreadyImported, false);
  assert.equal(w.finished, 1);
});

test("lost response: the quotation exists but we never saw its id -> the retry adopts it, no duplicate", async () => {
  const { w, deps } = makeWorld({ dropQuotationResponse: 1 });
  await assert.rejects(() => importDraft(draftOf(), newUser, deps), ImportError);
  assert.equal(w.quotations.length, 1, "the server did create it");
  const r = await importDraft(draftOf(), newUser, deps);
  assert.equal(w.quotations.length, 1, "still exactly one");
  assert.equal(r.quotationId, w.quotations[0].id);
});

test("an existing quotation of the same customer is NOT adopted unless an attempt was left in flight", async () => {
  const { w, deps } = makeWorld();
  w.quotations.push({ id: 5, customerName: "Ramesh Kumar", itemCount: 3, total: 4 * 1950 + 2 * 640 + 500, date: "2026-10-27" });
  await importDraft(draftOf(), newUser, deps);
  assert.equal(w.quotations.length, 2, "a genuinely new draft creates its own quotation");
});

test("existing account: business name is not overwritten, no onboarding finish call", async () => {
  const { w, deps } = makeWorld();
  await importDraft(draftOf(), { accountBusinessName: "Old Name Pvt Ltd", needsOnboarding: false }, deps);
  assert.equal(w.profile, null);
  assert.equal(w.finished, 0);
  assert.ok(!w.calls.includes("savePrintSettings"));
});

test("no business name typed: profile is not called but onboarding is still finished", async () => {
  const { w, deps } = makeWorld();
  await importDraft(draftOf({ business: "" }), newUser, deps);
  assert.equal(w.profile, null);
  assert.equal(w.finished, 1);
});

test("profile/finish failures are warnings, the quotation is still saved and returned", async () => {
  const { w, deps } = makeWorld();
  deps.saveBusinessName = async () => { throw new Error("x"); };
  deps.finishOnboarding = async () => { throw new Error("y"); };
  const r = await importDraft(draftOf(), newUser, deps);
  assert.ok(r.quotationId);
  assert.equal(r.warnings.length, 1);
});

test("validation: customer name and at least one named item are required", async () => {
  const { deps } = makeWorld();
  await assert.rejects(() => importDraft(draftOf({ customerName: "  " }), newUser, deps), /customer/i);
  await assert.rejects(() => importDraft(draftOf({ items: [{ name: " ", unit: "Nos", qty: "1", rate: "5" }] }), newUser, deps), /item/i);
});

test("cleanItems: drops unnamed rows, qty falls back to 1, rate to 0, text trimmed", () => {
  const out = cleanItems([{ name: "  A ", unit: "", qty: "0", rate: "" }, { name: "", unit: "x", qty: "2", rate: "3" }]);
  assert.deepEqual(out, [{ name: "A", unit: "Nos", qty: 1, rate: 0 }]);
});

test("itemCode is deterministic and ignores case/spacing", () => {
  assert.equal(itemCode("Wire", "Coil", "10"), itemCode(" wire ", "COIL", 10));
  assert.notEqual(itemCode("Wire", "Coil", 10), itemCode("Wire", "Coil", 11));
  assert.match(itemCode("Wire", "Coil", 10), /^W[0-9A-F]{8}$/);
  assert.equal(itemKey("A", "B", "5"), "a|b|5");
});

// ---- draft storage -------------------------------------------------------------------------------
test("draft: expires after 7 days, untouched drafts are ignored, tampered data is sanitised", () => {
  const d = { ...emptyDraft("cctv", [makeItem({ name: "Camera", qty: "2", rate: "1500" })]), business: "Acme", dirty: true };
  saveDraft(d, 1_000_000);
  assert.equal(loadDraft(1_000_000 + 1000)?.business, "Acme");
  assert.equal(loadDraft(1_000_000 + DRAFT_TTL_MS + 1), null, "expired");
  assert.equal(loadDraft(1_000_000 + 1000), null, "expired draft was removed");

  saveDraft({ ...d, dirty: false }, 2_000_000);
  assert.equal(loadDraft(2_000_100), null, "never edited -> not restored");

  const s = sanitizeDraft({ v: DRAFT_VERSION, id: "x", business: "B".repeat(500), customerPhone: "9".repeat(50), dirty: true, items: [{ name: "n", qty: "abc", rate: "-5", unit: "u" }] });
  assert.equal(s.business.length, 200);
  assert.equal(s.customerPhone.length, 20);
  assert.equal(s.items[0].qty, "1");
  assert.equal(s.items[0].rate, "");
  assert.equal(sanitizeDraft({ v: 99, id: "x" }), null);
  assert.equal(sanitizeDraft("junk"), null);
});

test("amount formats match the real PDF (Rs. prefix, 0 decimals per row, 2 for the grand total)", () => {
  assert.equal(formatRs0(12345.4), "Rs. 12,345");
  assert.equal(formatRs2(1234567.5), "Rs. 1,234,567.50");
  assert.equal(formatQty("2.50"), "2.5");
  assert.equal(formatQty("4"), "4");
  assert.equal(grandTotal([{ qty: "2", rate: "10.5" }, { qty: "", rate: "7" }]), 21);
});
