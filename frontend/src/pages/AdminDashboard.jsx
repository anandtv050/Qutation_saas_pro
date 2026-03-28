import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, ChevronRight, TrendingUp, TrendingDown,
  Minus, Brain, FileText, Receipt, IndianRupee, Users, Activity,
} from "lucide-react";
import dashboardService from "@/services/dashboardService";

// ── Periods ──
const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

// ── Helpers ──
const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtNumber = (n) => {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const fmtRelative = (dateStr) => {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const fmtShortDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// ══════════════════════════════════════
// Reusable UI Components
// ══════════════════════════════════════

function PeriodToggle({ value, onChange }) {
  return (
    <div className="inline-flex bg-neutral-100 rounded-lg p-0.5">
      {PERIODS.map((p) => (
        <button key={p.key} onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === p.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}>{p.label}</button>
      ))}
    </div>
  );
}

function ChangeIndicator({ value, isAll }) {
  if (isAll) return null;
  const isUp = value > 0, isZero = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
      isZero ? "text-neutral-400" : isUp ? "text-emerald-600" : "text-red-500"
    }`}>
      {isZero ? <Minus className="w-3 h-3" /> : isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isZero ? "0%" : `${isUp ? "+" : ""}${value}%`}
    </span>
  );
}

function MetricCard({ icon: Icon, iconColor, label, value, change, isAll }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400 font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</p>
      <ChangeIndicator value={change} isAll={isAll} />
    </div>
  );
}

function HealthDot({ health }) {
  const color = { active: "bg-emerald-400", at_risk: "bg-amber-400", inactive: "bg-neutral-300" }[health] || "bg-neutral-300";
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

function HealthBadge({ health }) {
  const styles = { active: "bg-emerald-50 text-emerald-700", at_risk: "bg-amber-50 text-amber-700", inactive: "bg-neutral-100 text-neutral-500" };
  const labels = { active: "Active", at_risk: "At Risk", inactive: "Inactive" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[health] || styles.inactive}`}>
      <HealthDot health={health} />{labels[health] || "Inactive"}
    </span>
  );
}

function OnlineDot({ online }) {
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? "bg-emerald-400 animate-pulse" : "bg-neutral-300"}`} />;
}

// ── Donut Chart (CSS conic-gradient) ──
function DonutChart({ segments, size = 110, label }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-neutral-100 flex items-center justify-center" style={{ width: size, height: size }}>
          <div className="rounded-full bg-white flex items-center justify-center" style={{ width: size * 0.6, height: size * 0.6 }}>
            <span className="text-xs text-neutral-300">0</span>
          </div>
        </div>
        <span className="text-[11px] text-neutral-400 font-medium">{label}</span>
      </div>
    );
  }

  let cum = 0;
  const parts = segments.filter(x => x.value > 0).map((seg) => {
    const start = (cum / total) * 360;
    cum += seg.value;
    const end = (cum / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-full relative" style={{ width: size, height: size, background: `conic-gradient(${parts.join(", ")})` }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white flex items-center justify-center" style={{ width: size * 0.6, height: size * 0.6 }}>
            <span className="text-sm font-bold text-neutral-700">{total}</span>
          </div>
        </div>
      </div>
      <span className="text-[11px] text-neutral-400 font-medium">{label}</span>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.filter(x => x.value > 0).map((seg, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] text-neutral-500">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            {seg.label} ({seg.value})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stacked Bar Chart (pixel-based heights for reliability) ──
function ActivityChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-sm text-neutral-400">No activity data</div>;
  }

  const sorted = [...data].reverse();
  const maxVal = Math.max(...sorted.map((d) => d.intAiCalls + d.intQuotations + d.intInvoices), 1);
  const BAR_MAX_H = 100; // max bar height in px
  // Cap bar width so single-day data doesn't stretch full width
  const barMaxWidth = sorted.length < 5 ? 60 : undefined;

  return (
    <div className="flex items-end justify-center gap-1" style={{ height: BAR_MAX_H + 24 }}>
      {sorted.map((d, i) => {
        const total = d.intAiCalls + d.intQuotations + d.intInvoices;
        const barH = Math.max(Math.round((total / maxVal) * BAR_MAX_H), 4);
        const aiH = total > 0 ? Math.max(Math.round((d.intAiCalls / total) * barH), d.intAiCalls > 0 ? 3 : 0) : 0;
        const iH = total > 0 ? Math.max(Math.round((d.intInvoices / total) * barH), d.intInvoices > 0 ? 3 : 0) : 0;
        const qH = barH - aiH - iH;

        return (
          <div key={i} className="flex flex-col items-center group relative"
            style={{ flex: sorted.length >= 5 ? 1 : undefined, maxWidth: barMaxWidth, width: barMaxWidth }}>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-neutral-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <p className="font-medium">{fmtShortDate(d.datDay)}</p>
                <p>AI: {d.intAiCalls} · Q: {d.intQuotations} · I: {d.intInvoices}</p>
                {d.dblRevenue > 0 && <p>{fmtCurrency(d.dblRevenue)}</p>}
                {d.intTokens > 0 && <p>Tokens: {fmtNumber(d.intTokens)}</p>}
              </div>
            </div>
            {/* Stacked bar */}
            <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse cursor-pointer"
              style={{ height: barH, minWidth: 8 }}>
              {aiH > 0 && <div className="bg-violet-400 w-full" style={{ height: aiH }} />}
              {qH > 0 && <div className="bg-blue-400 w-full" style={{ height: qH }} />}
              {iH > 0 && <div className="bg-emerald-400 w-full" style={{ height: iH }} />}
            </div>
            {/* Date label */}
            <span className="text-[9px] text-neutral-400 mt-1 truncate w-full text-center">
              {sorted.length <= 14 || i === 0 || i === sorted.length - 1 || i % 7 === 0
                ? new Date(d.datDay).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Funnel Visualization (counts only, revenue separate) ──
function FunnelChart({ steps, revenue }) {
  const countSteps = steps.filter((s) => !s.isRevenue);
  const maxVal = Math.max(...countSteps.map((s) => s.value), 1);
  return (
    <div className="space-y-1.5">
      {countSteps.map((step, i) => {
        const pct = Math.max((step.value / maxVal) * 100, 8);
        const prev = i > 0 ? countSteps[i - 1] : null;
        const conversion = prev && prev.value > 0
          ? Math.round((step.value / prev.value) * 100) : null;
        return (
          <div key={i}>
            {conversion !== null && (
              <div className="flex justify-center py-0.5">
                <span className="text-[10px] text-neutral-400">
                  {conversion}% conversion
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500 w-16 text-right flex-shrink-0">{step.label}</span>
              <div className="flex-1 h-7 bg-neutral-50 rounded overflow-hidden flex items-center">
                <div className={`h-full rounded ${step.color} transition-all flex items-center px-2`} style={{ width: `${pct}%` }}>
                  <span className="text-[11px] font-bold text-white whitespace-nowrap">{step.value}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {/* Revenue — separate, not in conversion math */}
      {revenue != null && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 w-16 text-right flex-shrink-0">Revenue</span>
          <span className="text-sm font-bold text-emerald-600">{fmtCurrency(revenue)}</span>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isAdmin = userInfo.intUserId === 1;

  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { if (!isAdmin) navigate("/dashboard"); }, [isAdmin, navigate]);

  const fetchData = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await dashboardService.getAdminSummary(p);
      if (res.intStatus === 1 && res.data) setData(res.data);
    } catch (e) { console.error("Admin dashboard error:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAdmin) fetchData(period); }, [isAdmin, period, fetchData]);

  const fetchDetail = useCallback(async (uid, p) => {
    setDetailLoading(true);
    try {
      const res = await dashboardService.getAdminUserDetail(uid, p);
      if (res.intStatus === 1 && res.data) setDetail(res.data);
    } catch (e) { console.error("User detail error:", e); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { if (selectedUserId) fetchDetail(selectedUserId, period); }, [selectedUserId, period, fetchDetail]);

  const isAll = period === "all";

  // ─────────────────────────────────────
  // USER DETAIL VIEW
  // ─────────────────────────────────────
  if (selectedUserId && detail && !detailLoading) {
    const d = detail;
    const pctChange = (cur, prev) => {
      if (isAll) return 0;
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round((cur - prev) / prev * 100);
    };

    return (
      <div className="min-h-screen bg-neutral-50/50">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setSelectedUserId(null); setDetail(null); }}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <PeriodToggle value={period} onChange={setPeriod} />
          </div>

          {/* User identity */}
          <div className="flex items-center gap-3 mb-8">
            <OnlineDot online={d.blnOnline} />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{d.strName || d.strEmail}</h2>
              <p className="text-xs text-neutral-400">
                {d.strEmail} · Joined {fmtShortDate(d.datJoined)} · {d.intDaysOnPlatform}d on platform · Last seen {fmtRelative(d.strLastSeen)}
              </p>
            </div>
          </div>

          {/* Funnel cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MetricCard icon={Brain} iconColor="text-violet-500" label="AI Calls"
              value={d.intAiCalls} change={pctChange(d.intAiCalls, d.intAiCallsPrev)} isAll={isAll} />
            <MetricCard icon={FileText} iconColor="text-blue-500" label="Quotations"
              value={d.intQuotations} change={pctChange(d.intQuotations, d.intQuotationsPrev)} isAll={isAll} />
            <MetricCard icon={Receipt} iconColor="text-sky-500" label="Invoices"
              value={d.intInvoices} change={pctChange(d.intInvoices, d.intInvoicesPrev)} isAll={isAll} />
            <MetricCard icon={IndianRupee} iconColor="text-emerald-500" label="Revenue"
              value={fmtCurrency(d.dblRevenue)} change={pctChange(d.dblRevenue, d.dblRevenuePrev)} isAll={isAll} />
          </div>

          {/* Funnel visualization + Donut charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Funnel */}
            <div className="bg-white rounded-xl border border-neutral-200/60 p-5">
              <h3 className="text-sm font-semibold text-neutral-700 mb-4">Conversion Funnel</h3>
              <FunnelChart steps={[
                { label: "AI Calls", value: d.intAiCalls, color: "bg-violet-500" },
                { label: "Quotes", value: d.intQuotations, color: "bg-blue-500" },
                { label: "Invoices", value: d.intInvoices, color: "bg-sky-500" },
              ]} revenue={d.dblRevenue} />
            </div>

            {/* Donut charts */}
            <div className="bg-white rounded-xl border border-neutral-200/60 p-5">
              <h3 className="text-sm font-semibold text-neutral-700 mb-4">Status Breakdown</h3>
              <div className="flex justify-around items-start">
                <DonutChart label="Quotations" segments={[
                  { value: d.intQuotationsDraft, color: "#a3a3a3", label: "Draft" },
                  { value: d.intQuotationsSent, color: "#3b82f6", label: "Sent" },
                  { value: d.intQuotationsAccepted, color: "#10b981", label: "Accepted" },
                  { value: d.intQuotationsRejected, color: "#ef4444", label: "Rejected" },
                ]} size={90} />
                <DonutChart label="Invoices" segments={[
                  { value: d.intInvoicesPaid, color: "#10b981", label: "Paid" },
                  { value: d.intInvoicesPending, color: "#f59e0b", label: "Pending" },
                ]} size={90} />
              </div>
            </div>
          </div>

          {/* Stats grid — Value metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Avg Quote Value</p>
              <p className="text-lg font-bold text-neutral-900">{fmtCurrency(d.dblAvgQuotationValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Avg Invoice Value</p>
              <p className="text-lg font-bold text-neutral-900">{fmtCurrency(d.dblAvgInvoiceValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Customers</p>
              <p className="text-lg font-bold text-neutral-900">
                {d.intUniqueCustomers}
                {d.intRepeatCustomers > 0 && <span className="text-xs text-emerald-500 ml-1">({d.intRepeatCustomers} repeat)</span>}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Avg Items / Quote</p>
              <p className="text-lg font-bold text-neutral-900">{d.dblAvgItemsPerQuotation}</p>
            </div>
          </div>

          {/* Stats grid — AI & Inventory */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Tokens Used</p>
              <p className="text-lg font-bold text-neutral-900">{fmtNumber(d.intTotalTokens)}</p>
              {d.dblAiCostInr > 0 && <p className="text-[11px] text-neutral-400">{fmtCurrency(d.dblAiCostInr)} cost</p>}
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Inventory</p>
              <p className="text-lg font-bold text-neutral-900">{d.intInventoryItems} items</p>
              {d.intInventoryCategories > 0 && <p className="text-[11px] text-neutral-400">{d.intInventoryCategories} categories</p>}
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">Signup → 1st AI</p>
              <p className="text-lg font-bold text-neutral-900">
                {d.dblSignupToFirstAiDays >= 0 ? `${d.dblSignupToFirstAiDays}d` : "Never"}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/60 p-4">
              <p className="text-[11px] text-neutral-400 mb-1">AI → Save Quote</p>
              <p className="text-lg font-bold text-neutral-900">
                {d.dblAvgAiToQuoteHours >= 0
                  ? d.dblAvgAiToQuoteHours < 1 ? `${Math.round(d.dblAvgAiToQuoteHours * 60)}m` : `${d.dblAvgAiToQuoteHours}h`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Engagement pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 rounded-full text-[11px] text-neutral-600">
              <Activity className="w-3 h-3" /> {d.intActiveDays} active days / {d.intDaysOnPlatform}d
            </span>
            {d.strLastLogin && (
              <span className="px-2.5 py-1 bg-neutral-100 rounded-full text-[11px] text-neutral-500">
                Last login {fmtRelative(d.strLastLogin)}
              </span>
            )}
            {d.dblAiQuoteRatio > 0 && (
              <span className="px-2.5 py-1 bg-violet-50 rounded-full text-[11px] text-violet-600">
                {d.dblAiQuoteRatio}% AI-generated
              </span>
            )}
            {d.dblAiToQuoteRate > 0 && (
              <span className="px-2.5 py-1 bg-blue-50 rounded-full text-[11px] text-blue-600">
                AI→Quote {d.dblAiToQuoteRate}%
              </span>
            )}
            {d.dblQuoteToInvoiceRate > 0 && (
              <span className="px-2.5 py-1 bg-sky-50 rounded-full text-[11px] text-sky-600">
                Quote→Invoice {d.dblQuoteToInvoiceRate}%
              </span>
            )}
            {d.intQuotationsWithTax > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 rounded-full text-[11px] text-amber-600">
                {d.intQuotationsWithTax} with tax
              </span>
            )}
            {d.intQuotationsWithDiscount > 0 && (
              <span className="px-2.5 py-1 bg-orange-50 rounded-full text-[11px] text-orange-600">
                {d.intQuotationsWithDiscount} with discount
              </span>
            )}
          </div>


          {/* Activity chart */}
          <div className="bg-white rounded-xl border border-neutral-200/60 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-700">Daily Activity</h3>
              <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-400" /> AI</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400" /> Quotes</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Invoices</span>
              </div>
            </div>
            <ActivityChart data={d.lstDaily} />
          </div>

          {/* Daily breakdown table */}
          {d.lstDaily && d.lstDaily.length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-700">Activity Log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="text-left text-[11px] font-medium text-neutral-400 px-5 py-2">Date</th>
                      <th className="text-center text-[11px] font-medium text-neutral-400 px-3 py-2">AI</th>
                      <th className="text-center text-[11px] font-medium text-neutral-400 px-3 py-2">Quotes</th>
                      <th className="text-center text-[11px] font-medium text-neutral-400 px-3 py-2">Invoices</th>
                      <th className="text-right text-[11px] font-medium text-neutral-400 px-3 py-2">Revenue</th>
                      <th className="text-right text-[11px] font-medium text-neutral-400 px-5 py-2">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.lstDaily.map((day, idx) => (
                      <tr key={idx} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50">
                        <td className="px-5 py-2.5 text-sm text-neutral-700">{fmtShortDate(day.datDay)}</td>
                        <td className="text-center px-3 py-2.5">
                          {day.intAiCalls > 0 ? <span className="text-sm font-semibold text-violet-600">{day.intAiCalls}</span> : <span className="text-neutral-200">-</span>}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          {day.intQuotations > 0 ? <span className="text-sm font-semibold text-blue-600">{day.intQuotations}</span> : <span className="text-neutral-200">-</span>}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          {day.intInvoices > 0 ? <span className="text-sm font-semibold text-sky-600">{day.intInvoices}</span> : <span className="text-neutral-200">-</span>}
                        </td>
                        <td className="text-right px-3 py-2.5 text-xs text-neutral-500">
                          {day.dblRevenue > 0 ? fmtCurrency(day.dblRevenue) : "-"}
                        </td>
                        <td className="text-right px-5 py-2.5 text-xs text-neutral-400">
                          {day.intTokens > 0 ? fmtNumber(day.intTokens) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detail loading
  if (selectedUserId && detailLoading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────
  // USER LIST — user-wise only
  // ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50/50">
      <div className="max-w-6xl mx-auto px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">User Analytics</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Click any user to view detailed insights</p>
          </div>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* ── User Cards — each user gets a mini dashboard ── */}
            <div className="space-y-4">
              {data.lstUsers.map((u) => {
                const totalActivity = u.intAiCalls + u.intQuotations + u.intInvoices;
                const aiPct = totalActivity > 0 ? Math.round((u.intAiCalls / totalActivity) * 100) : 0;
                const qPct = totalActivity > 0 ? Math.round((u.intQuotations / totalActivity) * 100) : 0;
                const iPct = totalActivity > 0 ? 100 - aiPct - qPct : 0;

                return (
                  <div key={u.intUserId}
                    onClick={() => setSelectedUserId(u.intUserId)}
                    className="bg-white rounded-xl border border-neutral-200/60 hover:border-neutral-300 cursor-pointer transition-all hover:shadow-sm"
                  >
                    {/* User header row */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <OnlineDot online={u.blnOnline} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{u.strName || "No Name"}</p>
                          <p className="text-[11px] text-neutral-400 truncate">{u.strEmail}</p>
                        </div>
                        <HealthBadge health={u.strHealth} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-neutral-400">{fmtRelative(u.strLastSeen)}</span>
                        <ChevronRight className="w-4 h-4 text-neutral-300" />
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-4 divide-x divide-neutral-100 px-1 py-3">
                      <div className="text-center px-3">
                        <p className="text-lg font-bold text-violet-600">{u.intAiCalls}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">AI Calls</p>
                      </div>
                      <div className="text-center px-3">
                        <p className="text-lg font-bold text-blue-600">{u.intQuotations}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Quotations</p>
                      </div>
                      <div className="text-center px-3">
                        <p className="text-lg font-bold text-sky-600">{u.intInvoices}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Invoices</p>
                      </div>
                      <div className="text-center px-3">
                        <p className="text-lg font-bold text-emerald-600">{fmtCurrency(u.dblRevenue)}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Revenue</p>
                      </div>
                    </div>

                    {/* Activity bar — visual ratio of AI / Quotes / Invoices */}
                    {totalActivity > 0 && (
                      <div className="px-5 pb-4">
                        <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 group relative">
                          <div className="bg-violet-400 transition-all" style={{ width: `${aiPct}%` }} />
                          <div className="bg-blue-400 transition-all" style={{ width: `${qPct}%` }} />
                          <div className="bg-emerald-400 transition-all" style={{ width: `${iPct}%` }} />
                          {/* Hover tooltip */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="hidden group-hover:block absolute -top-9 z-10">
                              <div className="bg-neutral-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                AI: {aiPct}% · Quotes: {qPct}% · Invoices: {iPct}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 justify-end">
                          <span className="flex items-center gap-1 text-[9px] text-neutral-400"><span className="w-1.5 h-1.5 rounded-sm bg-violet-400" />AI</span>
                          <span className="flex items-center gap-1 text-[9px] text-neutral-400"><span className="w-1.5 h-1.5 rounded-sm bg-blue-400" />Quotes</span>
                          <span className="flex items-center gap-1 text-[9px] text-neutral-400"><span className="w-1.5 h-1.5 rounded-sm bg-emerald-400" />Invoices</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {data.lstUsers.length === 0 && (
                <div className="bg-white rounded-xl border border-neutral-200/60 p-12 text-center">
                  <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">No users yet</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-sm text-neutral-400">Failed to load analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
