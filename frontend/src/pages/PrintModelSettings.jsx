import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Palette, Type, Image, ToggleLeft, Columns3, FileText,
  PenTool, QrCode, ChevronUp, ChevronDown, Save, RotateCcw,
  Loader2, Settings2, Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import printSettingsService from "@/services/printSettingsService";
import userService from "@/services/userService";

/* ── module column registry ──────────────────────────────────── */
const MODULE_COLUMNS = {
  QUOTATION: {
    item_code:  { label: "Item Code",  defaultWidth: 14 },
    item_name:  { label: "Item",       defaultWidth: 34 },
    unit:       { label: "Unit",       defaultWidth: 10 },
    qty:        { label: "Qty",        defaultWidth: 10 },
    unit_price: { label: "Unit Price", defaultWidth: 16 },
    amount:     { label: "Amount",     defaultWidth: 16 },
  },
  INVOICE: {
    item_code:  { label: "Item Code",   defaultWidth: 14 },
    item_name:  { label: "Description", defaultWidth: 34 },
    unit:       { label: "Unit",        defaultWidth: 10 },
    qty:        { label: "Qty",         defaultWidth: 10 },
    unit_price: { label: "Unit Price",  defaultWidth: 16 },
    amount:     { label: "Amount",      defaultWidth: 16 },
  },
  WARRANTY: {
    item_name:           { label: "Item",                defaultWidth: 30 },
    qty:                 { label: "Qty",                 defaultWidth: 10 },
    warranty_period:     { label: "Warranty Period",     defaultWidth: 20 },
    implementation_date: { label: "Implementation Date", defaultWidth: 20 },
    expiry_date:         { label: "Expiry Date",         defaultWidth: 20 },
  },
};

function getColumnMeta(module) {
  return MODULE_COLUMNS[module] || MODULE_COLUMNS.QUOTATION;
}

function getDefaultColumns(module) {
  const meta = getColumnMeta(module);
  return Object.entries(meta).map(([key, m], idx) => ({
    key, visible: true, order: idx + 1, widthPct: m.defaultWidth,
  }));
}

function getDefaultSettings(module = "QUOTATION") {
  return {
    theme: { primaryColor: "#1f2a67", accentColor: "#0ea5a4" },
    header: {
      title: module === "WARRANTY" ? "WARRANTY CERTIFICATE" : module,
      showCompanyName: true, showPhone: true, showEmail: true, showAddress: true,
      logoUrl: "", logoWidth: 160, logoHeight: 64,
      customHtml: "",
    },
    body: {
      columns: getDefaultColumns(module),
      showSubtotal: module !== "WARRANTY",
      showTax: module !== "WARRANTY",
      showDiscount: module !== "WARRANTY",
      showGrandTotal: module !== "WARRANTY",
    },
    footer: {
      termsText: module === "WARRANTY"
        ? "Warranty is void if product is physically damaged\nKeep this certificate for future reference"
        : "50% advance payment required\nWarranty: 1 year on all products\nInstallation within 5 working days",
      footerNote: "Thank you for your business.",
      showSignature: true, signatureUrl: "",
      signatureWidth: 180, signatureHeight: 56,
      qr: { enabled: false, link: "", label: "Scan to Pay" },
      customHtml: "",
    },
  };
}

/* placeholder cell values for preview rows */
function placeholderValue(key, row) {
  const map = {
    item_code: ["ITEM-001", "ITEM-002", "ITEM-003"],
    item_name: ["Sample Product A", "Sample Product B", "Sample Service C"],
    unit: ["pcs", "pcs", "job"],
    qty: ["4", "1", "1"],
    unit_price: ["\u20B92,500", "\u20B98,000", "\u20B93,000"],
    amount: ["\u20B910,000", "\u20B98,000", "\u20B93,000"],
    warranty_period: ["1Y 0M 0D", "2Y 0M 0D", "0Y 6M 0D"],
    implementation_date: ["15 Jan 2024", "15 Jan 2024", "15 Jan 2024"],
    expiry_date: ["15 Jan 2025", "15 Jan 2026", "15 Jul 2024"],
  };
  return (map[key] || ["—", "—", "—"])[row] || "—";
}

/* ── helpers ─────────────────────────────────────────────────── */

function normalizeSettings(raw, module = "QUOTATION") {
  const defs = getDefaultSettings(module);
  const meta = getColumnMeta(module);
  const merged = {
    ...defs, ...raw,
    theme: { ...defs.theme, ...(raw?.theme || {}) },
    header: { ...defs.header, ...(raw?.header || {}) },
    body: { ...defs.body, ...(raw?.body || {}) },
    footer: {
      ...defs.footer, ...(raw?.footer || {}),
      qr: { ...defs.footer.qr, ...(raw?.footer?.qr || {}) },
    },
  };
  const rawCols = Array.isArray(merged.body.columns) ? merged.body.columns : [];
  const byKey = new Map(rawCols.map((c) => [c.key, c]));
  const defCols = getDefaultColumns(module);
  merged.body.columns = Object.keys(meta).map((key, idx) => {
    const c = byKey.get(key) || defCols.find((x) => x.key === key);
    return {
      key,
      visible: Boolean(c?.visible),
      order: Number.isFinite(Number(c?.order)) ? Number(c.order) : idx + 1,
      widthPct: Number.isFinite(Number(c?.widthPct)) ? Number(c.widthPct) : meta[key]?.defaultWidth || 0,
    };
  });
  merged.body.columns.sort((a, b) => a.order - b.order);
  merged.body.columns.forEach((c, i) => { c.order = i + 1; });
  return merged;
}

function validateSettings(s) {
  const issues = [];
  const vis = s.body.columns.filter((c) => c.visible);
  const wt = vis.reduce((sum, c) => sum + Number(c.widthPct || 0), 0);
  if (vis.length === 0) issues.push("At least one column must stay visible.");
  if (Math.round(wt) !== 100) issues.push(`Visible column widths must total 100%. Current: ${wt}%.`);
  if (s.footer.qr.enabled && !s.footer.qr.link.trim()) issues.push("QR link is required when QR code is enabled.");
  return { isValid: issues.length === 0, issues, widthTotal: wt };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatCurrency(amt) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amt);
}

/* ── convert API data → local settings shape ─────────────────── */
function apiToLocal(d) {
  return {
    theme: { primaryColor: d.vchPrimaryColor, accentColor: d.vchAccentColor },
    header: {
      title: d.vchHeaderTitle,
      showCompanyName: d.blnShowCompanyName, showPhone: d.blnShowPhone,
      showEmail: d.blnShowEmail, showAddress: d.blnShowAddress,
      logoUrl: d.vchLogoUrl || "",
      logoWidth: d.intLogoWidth, logoHeight: d.intLogoHeight,
      customHtml: d.txtHeaderCustomHtml || "",
    },
    body: {
      columns: (d.lstColumns || []).map((c) => ({
        key: c.key, visible: c.visible, order: c.order, widthPct: c.widthPct,
      })),
      showSubtotal: d.blnShowSubtotal, showTax: d.blnShowTax,
      showDiscount: d.blnShowDiscount, showGrandTotal: d.blnShowGrandTotal,
    },
    footer: {
      termsText: d.txtTermsText || "", footerNote: d.txtFooterNote || "",
      showSignature: d.blnShowSignature,
      signatureUrl: d.vchSignatureUrl || "",
      signatureWidth: d.intSignatureWidth, signatureHeight: d.intSignatureHeight,
      qr: { enabled: d.blnQrEnabled, link: d.vchQrLink || "", label: d.vchQrLabel || "" },
      customHtml: d.txtFooterCustomHtml || "",
    },
  };
}

function localToApi(s) {
  return {
    vchPrimaryColor: s.theme.primaryColor,
    vchAccentColor: s.theme.accentColor,
    vchHeaderTitle: s.header.title,
    blnShowCompanyName: s.header.showCompanyName,
    blnShowPhone: s.header.showPhone,
    blnShowEmail: s.header.showEmail,
    blnShowAddress: s.header.showAddress,
    vchLogoUrl: s.header.logoUrl || null,
    intLogoWidth: s.header.logoWidth,
    intLogoHeight: s.header.logoHeight,
    txtHeaderCustomHtml: s.header.customHtml || null,
    lstColumns: s.body.columns.map((c) => ({
      key: c.key, visible: c.visible, order: c.order, widthPct: c.widthPct,
    })),
    blnShowSubtotal: s.body.showSubtotal,
    blnShowTax: s.body.showTax,
    blnShowDiscount: s.body.showDiscount,
    blnShowGrandTotal: s.body.showGrandTotal,
    txtTermsText: s.footer.termsText || null,
    txtFooterNote: s.footer.footerNote || null,
    blnShowSignature: s.footer.showSignature,
    vchSignatureUrl: s.footer.signatureUrl || null,
    intSignatureWidth: s.footer.signatureWidth,
    intSignatureHeight: s.footer.signatureHeight,
    blnQrEnabled: s.footer.qr.enabled,
    vchQrLink: s.footer.qr.link || null,
    vchQrLabel: s.footer.qr.label || "Scan to Pay",
    txtFooterCustomHtml: s.footer.customHtml || null,
  };
}

/* ================================================================
   COMPONENT
   ================================================================ */
export default function PrintModelSettings() {
  const navigate = useNavigate();

  // Admin-only guard
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    if (userInfo.intUserId !== 1) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const MODULES = ["QUOTATION", "INVOICE", "WARRANTY"];
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeModule, setActiveModule] = useState("QUOTATION");
  const [activeTab, setActiveTab] = useState("header");
  const [settings, setSettings] = useState(() => normalizeSettings(getDefaultSettings("QUOTATION"), "QUOTATION"));
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const previewRef = useRef(null);

  /* ── load users on mount ──────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await userService.getList();
        const lst = res.lstUsers || [];
        setUsers(lst);
        if (lst.length > 0) setSelectedUserId(lst[0].intPkUserId);
      } catch { /* ignore */ }
      finally { setLoadingUsers(false); }
    })();
  }, []);

  /* ── load settings when user or module changes ────────────── */
  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await printSettingsService.getSettings(activeModule, selectedUserId);
        if (!cancelled) {
          if (res.data) {
            setSettings(normalizeSettings(apiToLocal(res.data), activeModule));
          } else {
            setSettings(normalizeSettings(getDefaultSettings(activeModule), activeModule));
          }
        }
      } catch {
        if (!cancelled) setSettings(normalizeSettings(getDefaultSettings(activeModule), activeModule));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedUserId, activeModule]);

  /* ── toast auto-dismiss ───────────────────────────────────── */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const eff = useMemo(() => normalizeSettings(settings, activeModule), [settings, activeModule]);
  const validation = useMemo(() => validateSettings(eff), [eff]);


  const totals = { subtotal: 21000, taxAmount: 2100, discountAmount: 500, grandTotal: 22600 };

  const visibleColumns = useMemo(
    () => [...eff.body.columns].sort((a, b) => a.order - b.order).filter((c) => c.visible),
    [eff.body.columns]
  );

  /* ── updaters ─────────────────────────────────────────────── */
  const update = useCallback((fn) => setSettings((p) => normalizeSettings(typeof fn === "function" ? fn(p) : fn, activeModule)), [activeModule]);
  const updateTheme = (k, v) => update((p) => ({ ...p, theme: { ...p.theme, [k]: v } }));
  const updateHeader = (k, v) => update((p) => ({ ...p, header: { ...p.header, [k]: v } }));
  const updateFooter = (k, v) => update((p) => ({ ...p, footer: { ...p.footer, [k]: v } }));
  const updateFooterQr = (k, v) => update((p) => ({ ...p, footer: { ...p.footer, qr: { ...p.footer.qr, [k]: v } } }));
  const updateColumn = (key, patch) => update((p) => {
    let cols = p.body.columns.map((c) => c.key === key ? { ...c, ...patch } : c);
    // Auto-redistribute widths when visibility changes
    if ("visible" in patch) {
      const vis = cols.filter((c) => c.visible);
      if (vis.length > 0) {
        const total = vis.reduce((s, c) => s + c.widthPct, 0);
        if (total !== 100 && total > 0) {
          const factor = 100 / total;
          let assigned = 0;
          cols = cols.map((c, i) => {
            if (!c.visible) return c;
            const isLast = vis[vis.length - 1].key === c.key;
            const w = isLast ? 100 - assigned : Math.round(c.widthPct * factor);
            assigned += w;
            return { ...c, widthPct: w };
          });
        }
      }
    }
    return { ...p, body: { ...p.body, columns: cols } };
  });
  const updateBody = (k, v) => update((p) => ({ ...p, body: { ...p.body, [k]: v } }));

  function moveColumn(key, dir) {
    update((p) => {
      const ordered = [...p.body.columns].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((c) => c.key === key);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= ordered.length) return p;
      [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
      return { ...p, body: { ...p.body, columns: ordered.map((c, i) => ({ ...c, order: i + 1 })) } };
    });
  }

  /* ── save to backend ──────────────────────────────────────── */
  async function handleSave() {
    if (!validation.isValid) { setToast(validation.issues[0]); return; }
    setSaving(true);
    try {
      const payload = { ...localToApi(eff), vchModule: activeModule, intTargetUserId: selectedUserId };
      await printSettingsService.saveSettings(payload);
      setToast("Settings saved to server.");
    } catch (err) {
      setToast("Save failed: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(normalizeSettings(getDefaultSettings(activeModule), activeModule));
    setToast("Reset to defaults.");
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const toFullUrl = (p) => {
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    return `${apiBase}/${p.replace(/^\/+/, "")}`;
  };
  const displayLogo = toFullUrl(eff.header.logoUrl);
  const displaySignature = toFullUrl(eff.footer.signatureUrl);

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const selectedUser = users.find((u) => u.intPkUserId === selectedUserId);

  /* ── tab pills ────────────────────────────────────────────── */
  const tabs = [
    { id: "header", label: "Header", icon: Type },
    { id: "body", label: "Body", icon: Columns3 },
    { id: "footer", label: "Footer", icon: FileText },
  ];

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="max-w-[1580px] mx-auto">
      {/* ── top bar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-neutral-500" />
            Print Model Settings
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Configure print layout per user & module.</p>

          {/* User selector */}
          <div className="flex items-center gap-2 mt-3">
            <label className="text-xs font-semibold text-neutral-500">User</label>
            <select
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white text-neutral-800 font-medium min-w-[200px]"
            >
              {users.map((u) => (
                <option key={u.intPkUserId} value={u.intPkUserId}>
                  {u.strUsername || u.strEmail} {u.strBusinessName ? `— ${u.strBusinessName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Module selector */}
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs font-semibold text-neutral-500">Module</label>
            <div className="flex gap-1.5">
              {MODULES.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveModule(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeModule === m
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Current context badge */}
          {selectedUser && (
            <div className="mt-2 text-xs text-neutral-400">
              Editing: <span className="font-semibold text-neutral-600">{selectedUser.strUsername || selectedUser.strEmail}</span> &rarr; <span className="font-semibold text-neutral-600">{activeModule}</span>
              {loading && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-neutral-100 text-neutral-800 text-sm border border-neutral-200">
          {toast}
        </div>
      )}

      {/* validation warnings */}
      {!validation.isValid && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {validation.issues.map((i) => <p key={i} className="my-0.5">{i}</p>)}
        </div>
      )}

      {/* ── workspace grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 items-start">
        {/* ── EDITOR PANEL ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden">
          {/* tabs */}
          <div className="flex gap-1.5 p-3 bg-neutral-50 border-b border-neutral-200/60">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-3.5 max-h-[calc(100vh-260px)] overflow-y-auto space-y-3">
            {/* ── HEADER TAB ──────────────────────────────────── */}
            {activeTab === "header" && (
              <>
                {/* Theme */}
                <Panel title="Theme" icon={Palette}>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Primary Color" value={eff.theme.primaryColor} onChange={(v) => updateTheme("primaryColor", v)} />
                    <ColorField label="Accent Color" value={eff.theme.accentColor} onChange={(v) => updateTheme("accentColor", v)} />
                  </div>
                </Panel>

                {/* Header Content */}
                <Panel title="Header Content" icon={Type}>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Header Title</label>
                  <Input value={eff.header.title} onChange={(e) => updateHeader("title", e.target.value)} className="text-sm" />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Toggle label="Company name" checked={eff.header.showCompanyName} onChange={(v) => updateHeader("showCompanyName", v)} />
                    <Toggle label="Phone" checked={eff.header.showPhone} onChange={(v) => updateHeader("showPhone", v)} />
                    <Toggle label="Email" checked={eff.header.showEmail} onChange={(v) => updateHeader("showEmail", v)} />
                    <Toggle label="Address" checked={eff.header.showAddress} onChange={(v) => updateHeader("showAddress", v)} />
                  </div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1 mt-3">Extra Info (website, etc.)</label>
                  <textarea
                    value={eff.header.customHtml}
                    onChange={(e) => updateHeader("customHtml", e.target.value)}
                    placeholder="www.example.com&#10;Any extra details..."
                    rows={2}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Panel>

                {/* Logo */}
                <Panel title="Logo" icon={Image}>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Logo URL</label>
                  <Input value={eff.header.logoUrl} onChange={(e) => updateHeader("logoUrl", e.target.value)} placeholder="https://..." className="text-sm" />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Width (px)</label>
                      <Input type="number" min={60} max={260} value={eff.header.logoWidth} onChange={(e) => updateHeader("logoWidth", Number(e.target.value) || 0)} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Height (px)</label>
                      <Input type="number" min={24} max={140} value={eff.header.logoHeight} onChange={(e) => updateHeader("logoHeight", Number(e.target.value) || 0)} className="text-sm" />
                    </div>
                  </div>
                  {displayLogo && (
                    <div className="mt-3 border border-neutral-200 rounded-lg p-2">
                      <p className="text-[10px] text-neutral-400 mb-1">Preview</p>
                      <img src={displayLogo} alt="Logo preview" className="max-h-16 object-contain" />
                    </div>
                  )}
                </Panel>

                {/* Custom header HTML */}
                <Panel title="Custom Header HTML" icon={Code}>
                  <Textarea
                    rows={4}
                    value={eff.header.customHtml}
                    onChange={(e) => updateHeader("customHtml", e.target.value)}
                    placeholder='<div><strong>Custom header block</strong></div>'
                    className="text-xs font-mono"
                  />
                </Panel>
              </>
            )}

            {/* ── BODY TAB ────────────────────────────────────── */}
            {activeTab === "body" && (
              <>
                <Panel title="Column Controls" icon={Columns3}>
                  <p className={`text-xs font-medium mb-2 ${Math.round(validation.widthTotal) === 100 ? "text-emerald-600" : "text-red-600"}`}>
                    Visible width total: {validation.widthTotal}%
                  </p>
                  <div className="space-y-2">
                    {[...eff.body.columns].sort((a, b) => a.order - b.order).map((col, idx, list) => (
                      <div key={col.key} className="grid grid-cols-[1fr_60px_28px_28px] gap-1.5 items-center">
                        <label className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded"
                            checked={col.visible}
                            onChange={(e) => updateColumn(col.key, { visible: e.target.checked })}
                          />
                          {getColumnMeta(activeModule)[col.key]?.label || col.key}
                        </label>
                        <Input
                          type="number" min={0} max={100}
                          value={col.widthPct}
                          onChange={(e) => updateColumn(col.key, { widthPct: Number(e.target.value) || 0 })}
                          className="text-xs text-center h-7 px-1"
                        />
                        <button
                          onClick={() => moveColumn(col.key, "up")}
                          disabled={idx === 0}
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveColumn(col.key, "down")}
                          disabled={idx === list.length - 1}
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Totals Visibility" icon={ToggleLeft}>
                  <div className="grid grid-cols-2 gap-2">
                    <Toggle label="Subtotal" checked={eff.body.showSubtotal} onChange={(v) => updateBody("showSubtotal", v)} />
                    <Toggle label="Tax" checked={eff.body.showTax} onChange={(v) => updateBody("showTax", v)} />
                    <Toggle label="Discount" checked={eff.body.showDiscount} onChange={(v) => updateBody("showDiscount", v)} />
                    <Toggle label="Grand Total" checked={eff.body.showGrandTotal} onChange={(v) => updateBody("showGrandTotal", v)} />
                  </div>
                </Panel>
              </>
            )}

            {/* ── FOOTER TAB ──────────────────────────────────── */}
            {activeTab === "footer" && (
              <>
                <Panel title="Terms & Footer Text" icon={FileText}>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Terms (one per line)</label>
                  <Textarea rows={4} value={eff.footer.termsText} onChange={(e) => updateFooter("termsText", e.target.value)} className="text-xs" />
                  <label className="block text-xs font-medium text-neutral-600 mb-1 mt-3">Footer Note</label>
                  <Textarea rows={2} value={eff.footer.footerNote} onChange={(e) => updateFooter("footerNote", e.target.value)} className="text-xs" />
                </Panel>

                <Panel title="Signature" icon={PenTool}>
                  <Toggle label="Show signature" checked={eff.footer.showSignature} onChange={(v) => updateFooter("showSignature", v)} />
                  <label className="block text-xs font-medium text-neutral-600 mb-1 mt-3">Signature URL</label>
                  <Input value={eff.footer.signatureUrl} onChange={(e) => updateFooter("signatureUrl", e.target.value)} placeholder="https://..." className="text-sm" />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Width (px)</label>
                      <Input type="number" min={80} max={260} value={eff.footer.signatureWidth} onChange={(e) => updateFooter("signatureWidth", Number(e.target.value) || 0)} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Height (px)</label>
                      <Input type="number" min={24} max={140} value={eff.footer.signatureHeight} onChange={(e) => updateFooter("signatureHeight", Number(e.target.value) || 0)} className="text-sm" />
                    </div>
                  </div>
                  {displaySignature && (
                    <div className="mt-3 border border-neutral-200 rounded-lg p-2">
                      <p className="text-[10px] text-neutral-400 mb-1">Preview</p>
                      <img src={displaySignature} alt="Signature preview" className="max-h-12 object-contain" />
                    </div>
                  )}
                </Panel>

                <Panel title="QR Code" icon={QrCode}>
                  <Toggle label="Enable QR code" checked={eff.footer.qr.enabled} onChange={(v) => updateFooterQr("enabled", v)} />
                  <label className="block text-xs font-medium text-neutral-600 mb-1 mt-3">QR Link</label>
                  <Input value={eff.footer.qr.link} onChange={(e) => updateFooterQr("link", e.target.value)} placeholder="https://..." className="text-sm" />
                  <label className="block text-xs font-medium text-neutral-600 mb-1 mt-3">QR Label</label>
                  <Input value={eff.footer.qr.label} onChange={(e) => updateFooterQr("label", e.target.value)} className="text-sm" />
                </Panel>

                <Panel title="Extra Footer Info" icon={Code}>
                  <Textarea
                    rows={4}
                    value={eff.footer.customHtml}
                    onChange={(e) => updateFooter("customHtml", e.target.value)}
                    placeholder="Services: CCTV, Networking, IT Solutions&#10;www.example.com"
                    className="text-xs"
                  />
                </Panel>
              </>
            )}
          </div>
        </div>

        {/* ── LIVE PREVIEW ───────────────────────────────────── */}
        <div className="min-h-[70vh]">
          <div className="bg-gradient-to-b from-indigo-50 to-neutral-200 border border-neutral-300 rounded-xl p-4 overflow-auto">
            <article
              ref={previewRef}
              className="mx-auto bg-white shadow-2xl rounded-lg overflow-hidden"
              style={{
                width: 794,
                minHeight: 1123,
                padding: 26,
                borderTop: `8px solid ${eff.theme.accentColor}`,
                "--primary": eff.theme.primaryColor,
                "--accent": eff.theme.accentColor,
              }}
            >
              {/* header */}
              <header className="flex justify-between gap-5">
                <div className="flex flex-col gap-1.5">
                  {displayLogo ? (
                    <img src={displayLogo} alt="Logo" style={{ width: eff.header.logoWidth, height: eff.header.logoHeight, objectFit: "contain" }} />
                  ) : (
                    <div className="border border-dashed border-neutral-400 rounded-lg grid place-items-center text-neutral-500 text-xs" style={{ width: eff.header.logoWidth, height: eff.header.logoHeight }}>
                      Logo
                    </div>
                  )}
                  {eff.header.showCompanyName && (
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--primary)" }}>{selectedUser?.strBusinessName || selectedUser?.strUsername || "Business Name"}</h2>
                  )}
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-bold tracking-wider" style={{ color: "var(--primary)" }}>{eff.header.title || "QUOTATION"}</h1>
                  <p className="text-sm text-neutral-700 mt-1">{formatDate(new Date().toISOString())}</p>
                  <p className="text-sm text-neutral-700">No: {activeModule.substring(0, 3)}-XXXX-001</p>
                </div>
              </header>

              {/* contact strip */}
              <div className="mt-3.5 border border-neutral-200 rounded-lg px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-700">
                {eff.header.showPhone && <span>{selectedUser?.strPhone || "+91 XXXXX XXXXX"}</span>}
                {eff.header.showEmail && <span>{selectedUser?.strEmail || "email@example.com"}</span>}
                {eff.header.showAddress && <span>{selectedUser?.strAddress || "Business Address"}</span>}
                {eff.header.customHtml && <span>{eff.header.customHtml}</span>}
              </div>

              {/* bill-to */}
              <div className="mt-4 border-b border-neutral-200 pb-3">
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--primary)" }}>Bill To</h3>
                  <p className="text-sm">Customer Name</p>
                  <p className="text-sm whitespace-pre-line">Customer Address Line 1{"\n"}City, State, ZIP</p>
                </div>
              </div>

              {/* items table */}
              <table className="w-full border-collapse mt-4" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {visibleColumns.map((c) => (
                      <th key={c.key} style={{ width: `${c.widthPct}%`, background: "var(--primary)", wordBreak: "break-word" }} className="text-left text-white text-xs font-semibold px-2.5 py-2.5 tracking-wide overflow-hidden">
                        {getColumnMeta(activeModule)[c.key]?.label || c.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].map((ri) => (
                    <tr key={ri} className={ri % 2 === 1 ? "bg-neutral-50" : ""}>
                      {visibleColumns.map((c) => (
                        <td key={c.key} className="text-xs border-b border-neutral-200 px-2.5 py-2 text-neutral-800 overflow-hidden" style={{ wordBreak: "break-word" }}>
                          {placeholderValue(c.key, ri)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* totals box */}
              <div className="ml-auto mt-3.5 border border-neutral-200 rounded-lg p-2.5" style={{ width: "min(320px, 100%)" }}>
                {eff.body.showSubtotal && <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} />}
                {eff.body.showTax && <TotalRow label="Tax (10%)" value={formatCurrency(totals.taxAmount)} />}
                {eff.body.showDiscount && <TotalRow label="Discount" value={`- ${formatCurrency(totals.discountAmount)}`} />}
                {eff.body.showGrandTotal && (
                  <div className="flex justify-between py-1.5 text-base font-bold" style={{ color: "var(--primary)" }}>
                    <span>Grand Total</span><span>{formatCurrency(totals.grandTotal)}</span>
                  </div>
                )}
              </div>

              {/* footer */}
              <footer className="mt-10 border-t border-neutral-200 pt-5 grid grid-cols-[1fr_240px] gap-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: "var(--primary)" }}>Terms & Conditions</h4>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {eff.footer.termsText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => (
                      <li key={l} className="text-xs">{l}</li>
                    ))}
                  </ul>
                  {eff.footer.footerNote && <p className="text-xs text-neutral-500 mt-2">{eff.footer.footerNote}</p>}
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  {eff.footer.showSignature && (
                    <div className="text-right">
                      <p className="text-xs mb-1.5">Authorized Signature</p>
                      {displaySignature ? (
                        <img src={displaySignature} alt="Signature" style={{ width: eff.footer.signatureWidth, height: eff.footer.signatureHeight, objectFit: "contain" }} />
                      ) : (
                        <div className="border border-dashed border-neutral-400 rounded-lg grid place-items-center text-neutral-500 text-xs" style={{ width: eff.footer.signatureWidth, height: eff.footer.signatureHeight }}>
                          Signature
                        </div>
                      )}
                    </div>
                  )}
                  {eff.footer.qr.enabled && eff.footer.qr.link && (
                    <div className="border border-neutral-200 rounded-lg p-2 w-[130px] text-center">
                      <div className="w-full aspect-square bg-neutral-100 rounded grid place-items-center text-[10px] text-neutral-400">QR Preview</div>
                      <p className="text-[11px] text-neutral-600 mt-1">{eff.footer.qr.label}</p>
                    </div>
                  )}
                </div>
              </footer>

              {/* custom footer html */}
              {eff.footer.customHtml && (
                <div className="mt-8 rounded px-4 py-3 text-xs text-white whitespace-pre-line" style={{ backgroundColor: "var(--primary)" }}>{eff.footer.customHtml}</div>
              )}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── small reusable helpers ──────────────────────────────────── */
function Panel({ title, icon: Icon, children }) {
  return (
    <div className="border border-neutral-200/60 rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
      <input type="checkbox" className="w-3.5 h-3.5 rounded" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg border border-neutral-200 cursor-pointer p-0.5" />
        <span className="text-xs text-neutral-500 font-mono">{value}</span>
      </div>
    </div>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 text-sm border-b border-neutral-100 last:border-0">
      <span>{label}</span><strong>{value}</strong>
    </div>
  );
}
