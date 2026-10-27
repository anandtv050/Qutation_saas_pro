// Turns the website draft into real records in the signed-in user's account, using only the
// existing APIs (inventory list/add, quotation list/add, onboarding profile/finish).
//
// Safe to run again after any failure:
//   * progress is stored per draftId, so a retry resumes where the last attempt stopped;
//   * catalogue items are matched by name + unit + rate, and get a deterministic code, so a retry
//     can never add one twice ("already exists" counts as success);
//   * the quotation id is saved the moment it exists; if the response was lost, the next attempt
//     looks for the quotation it probably created before creating another;
//   * a draftId that was already imported is skipped.
// Catalogue problems never block the quotation: the line is saved by name without a link.
//
// Pure module: everything that touches the network or storage is passed in as `deps`.

export class ImportError extends Error {}

const STATE_PREFIX = "qp_import_";
const MAX_ATTEMPTS = 3;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const norm = (s) => String(s ?? "").trim().toLowerCase();
export const itemKey = (name, unit, rate) => `${norm(name)}|${norm(unit)}|${num(rate)}`;

// 32-bit FNV-1a: same item -> same code, on every attempt and every device.
export function itemCode(name, unit, rate) {
  let h = 0x811c9dc5;
  for (const ch of itemKey(name, unit, rate)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `W${h.toString(16).toUpperCase().padStart(8, "0")}`;
}

// What will actually be saved: named rows only, qty at least 1, trimmed text.
export function cleanItems(lstItems) {
  return lstItems
    .filter((it) => String(it.name ?? "").trim())
    .map((it) => ({
      name: String(it.name).trim().slice(0, 200),
      unit: String(it.unit ?? "").trim().slice(0, 20) || "Nos",
      qty: num(it.qty) || 1,
      rate: num(it.rate),
    }));
}

export const expectedTotal = (lstClean) => lstClean.reduce((s, it) => s + it.qty * it.rate, 0);

async function withRetry(fn, deps) {
  let lastErr;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < MAX_ATTEMPTS) await deps.sleep(400 * i);
    }
  }
  throw lastErr;
}

export async function importDraft(draft, ctx, deps) {
  const strStateKey = STATE_PREFIX + draft.id;
  const state = { phase: "start", quotationId: null, itemIds: {}, profileDone: false, finishDone: false, ...(deps.getState(strStateKey) || {}) };
  const save = () => deps.setState(strStateKey, state);
  const lstWarnings = [];

  if (deps.isImported(draft.id)) {
    return { quotationId: deps.importedQuotationId(draft.id) ?? state.quotationId, warnings: lstWarnings, alreadyImported: true };
  }

  const lstClean = cleanItems(draft.items || []);
  const strCustomer = String(draft.customerName ?? "").trim();
  if (!strCustomer) throw new ImportError("Add the customer's name.");
  if (!lstClean.length) throw new ImportError("Add at least one item.");

  // 1. Catalogue (best effort) -------------------------------------------------------------
  let lstExisting = [];
  try {
    lstExisting = await withRetry(() => deps.listInventory(), deps);
  } catch {
    lstWarnings.push("Could not read your item catalogue.");
  }
  const mapExisting = new Map(lstExisting.map((x) => [itemKey(x.name, x.unit, x.price), x.id]));

  for (const it of lstClean) {
    const strKey = itemKey(it.name, it.unit, it.rate);
    if (state.itemIds[strKey]) continue;
    if (mapExisting.has(strKey)) {
      state.itemIds[strKey] = mapExisting.get(strKey);
      save();
      continue;
    }
    try {
      const strCode = itemCode(it.name, it.unit, it.rate);
      const res = await withRetry(() => deps.addInventory({ code: strCode, name: it.name, unit: it.unit, price: it.rate }), deps);
      if (res.ok) {
        state.itemIds[strKey] = res.id;
      } else if (res.exists) {
        // Same deterministic code: this item was added by an earlier attempt. Look its id up.
        const lstAgain = await deps.listInventory();
        const found = lstAgain.find((x) => x.code === strCode);
        if (found) state.itemIds[strKey] = found.id;
      } else {
        lstWarnings.push(`"${it.name}" was not added to your catalogue.`);
      }
    } catch {
      lstWarnings.push(`"${it.name}" was not added to your catalogue.`);
    }
    save();
  }

  // 2. Quotation ------------------------------------------------------------------------------
  if (!state.quotationId) {
    if (state.phase === "creating") {
      // An earlier attempt sent the request but we never saw the answer. Adopt its result.
      try {
        const lstQ = await deps.listQuotations();
        const dblTotal = expectedTotal(lstClean);
        const setDates = new Set([deps.today(), deps.todayUtc?.()].filter(Boolean));
        const hit = lstQ.find(
          (q) => norm(q.customerName) === norm(strCustomer) && q.itemCount === lstClean.length && Math.abs(q.total - dblTotal) < 0.01 && setDates.has(q.date)
        );
        if (hit) state.quotationId = hit.id;
      } catch {
        // fall through and create it
      }
    }
    if (!state.quotationId) {
      state.phase = "creating";
      save();
      let res;
      try {
        res = await deps.addQuotation({
          customerName: strCustomer,
          customerPhone: String(draft.customerPhone ?? "").trim(),
          items: lstClean.map((it) => ({ ...it, inventoryId: state.itemIds[itemKey(it.name, it.unit, it.rate)] || null })),
        });
      } catch (e) {
        throw new ImportError(e?.message || "Could not save your quotation. Please try again.");
      }
      state.quotationId = res.id;
    }
    state.phase = "created";
    save();
  }

  // 3. Account details (best effort; a failure only means the wizard may show later) --------
  const strBusiness = String(draft.business ?? "").trim();
  if (!state.profileDone && strBusiness && !String(ctx.accountBusinessName ?? "").trim()) {
    try {
      await deps.saveBusinessName(strBusiness);
      state.profileDone = true;
    } catch {
      lstWarnings.push("Your business name was not saved. You can add it in Profile.");
    }
    save();
  }
  if (!state.finishDone && ctx.needsOnboarding) {
    try {
      await deps.finishOnboarding();
      state.finishDone = true;
    } catch {
      // the server flag stays set: the setup screen may appear once on the next sign-in
    }
    save();
  }

  // 4. Done: remember it, drop the draft ----------------------------------------------------
  deps.markImported(draft.id, state.quotationId);
  deps.clearDraft();
  deps.clearState(strStateKey);
  return { quotationId: state.quotationId, warnings: lstWarnings, alreadyImported: false, onboardingFinished: state.finishDone || !ctx.needsOnboarding };
}
