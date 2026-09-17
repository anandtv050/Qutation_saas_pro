import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Printer, Plus, RefreshCcw, Receipt as ReceiptIcon,
  Pencil, Ban, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import quotationService from "@/services/quotationService";
import invoiceService from "@/services/invoiceService";
import advanceReceiptService from "@/services/advanceReceiptService";
import pdfService from "@/services/pdfService";

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  dblAmountPaid: "",
  datReceiptDate: new Date().toISOString().slice(0, 10),
  strReceivedFrom: "",
  strPaymentFor: "",
  strPaymentMode: "cash",
  strReceivedBy: "",
};

const fmtMoney = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function AdvanceReceipt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sourceType = (searchParams.get("sourceType") || "").trim().toLowerCase();
  const sourceId = Number.parseInt(searchParams.get("sourceId") || "", 10);
  const hasValidSource = ["quotation", "invoice"].includes(sourceType) && Number.isFinite(sourceId);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [quotation, setQuotation] = useState(null);
  const [receiptData, setReceiptData] = useState({ lstReceipts: [], dblQuotationTotal: 0, dblTotalReceived: 0, dblBalanceDue: 0 });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    if (!hasValidSource) {
      setError("Open this page from a quotation or invoice.");
      setIsLoading(false);
      return;
    }

    try {
      let intQuotationId = sourceId;

      if (sourceType === "invoice") {
        const invoiceRes = await invoiceService.get(sourceId);
        if (invoiceRes.intStatus !== 1 || !invoiceRes.data?.intQuotationId) {
          setError("This invoice is not linked to a quotation. Advance receipts are quotation-based.");
          setIsLoading(false);
          return;
        }
        intQuotationId = invoiceRes.data.intQuotationId;
      }

      const [quotationRes, receiptsRes] = await Promise.all([
        quotationService.get(intQuotationId),
        advanceReceiptService.getByQuotation(intQuotationId),
      ]);

      if (quotationRes.intStatus !== 1 || !quotationRes.data) {
        setError(quotationRes.strMessage || "Quotation not found.");
        setIsLoading(false);
        return;
      }

      setQuotation(quotationRes.data);
      setReceiptData({
        lstReceipts: receiptsRes.lstReceipts || [],
        dblQuotationTotal: receiptsRes.dblQuotationTotal ?? quotationRes.data.dblTotalAmount,
        dblTotalReceived: receiptsRes.dblTotalReceived ?? 0,
        dblBalanceDue: receiptsRes.dblBalanceDue ?? quotationRes.data.dblTotalAmount,
      });
      setForm((f) => ({ ...f, strReceivedFrom: quotationRes.data.strCustomerName || "" }));
    } catch (err) {
      setError(err.message || "Failed to load receipt data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceId]);

  const openNewForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, strReceivedFrom: quotation?.strCustomerName || "" });
    setShowForm(true);
  };

  const openEditForm = (r) => {
    setEditingId(r.intPkReceiptId);
    setForm({
      dblAmountPaid: String(r.dblAmountPaid),
      datReceiptDate: r.datReceiptDate,
      strReceivedFrom: r.strReceivedFrom || "",
      strPaymentFor: r.strPaymentFor || "",
      strPaymentMode: r.strPaymentMode || "cash",
      strReceivedBy: r.strReceivedBy || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!quotation || !form.dblAmountPaid || Number(form.dblAmountPaid) <= 0) return;
    setIsSaving(true);
    try {
      const payload = {
        datReceiptDate: form.datReceiptDate || null,
        strReceivedFrom: form.strReceivedFrom || null,
        dblAmountPaid: parseFloat(form.dblAmountPaid),
        strPaymentFor: form.strPaymentFor || null,
        strPaymentMode: form.strPaymentMode,
        strReceivedBy: form.strReceivedBy || null,
      };

      const response = editingId
        ? await advanceReceiptService.update({ intReceiptId: editingId, ...payload })
        : await advanceReceiptService.create({ intQuotationId: quotation.intPkQuotationId, ...payload });

      if (response.intStatus === 1) {
        setShowForm(false);
        setEditingId(null);
        await loadData();
      } else {
        alert(response.strMessage || "Failed to save receipt.");
      }
    } catch (err) {
      alert(err.message || "Failed to save receipt.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoid = async (intReceiptId) => {
    if (!window.confirm("Void this receipt? It stays visible for audit but no longer counts toward the balance.")) return;
    try {
      await advanceReceiptService.void(intReceiptId);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to void receipt.");
    }
  };

  const handlePrint = async (intReceiptId, strReceiptNumber) => {
    setPrintingId(intReceiptId);
    try {
      const pdfBlob = await pdfService.generateAdvanceReceiptPDF({ intReceiptId });
      pdfService.downloadPDF(pdfBlob, `Receipt_${strReceiptNumber || intReceiptId}.pdf`);
    } catch (err) {
      alert(err.message || "Failed to generate receipt PDF.");
    } finally {
      setPrintingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[360px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-neutral-400 animate-spin mb-3" />
          <p className="text-sm text-neutral-500">Loading receipts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">Advance Receipt</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="p-4 md:p-6 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-neutral-900">Advance Receipt</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[11px] px-2 py-1 rounded border font-medium bg-blue-50 text-blue-700 border-blue-200">
              Quotation: {quotation.strQuotationNumber}
            </span>
            <span className="text-xs text-neutral-500">{quotation.strCustomerName}</span>
          </div>
        </div>
      </div>

      {/* Running totals */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-[11px] text-neutral-500">Quotation Total</p>
          <p className="text-sm font-semibold text-neutral-900">{fmtMoney(receiptData.dblQuotationTotal)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-[11px] text-neutral-500">Received</p>
          <p className="text-sm font-semibold text-emerald-700">{fmtMoney(receiptData.dblTotalReceived)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-[11px] text-neutral-500">Balance Due</p>
          <p className="text-sm font-semibold text-red-600">{fmtMoney(receiptData.dblBalanceDue)}</p>
        </div>
      </div>

      {!showForm && (
        <Button onClick={openNewForm} className="mb-4 bg-neutral-900 hover:bg-neutral-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Receipt
        </Button>
      )}

      {showForm && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">{editingId ? "Edit Receipt" : "New Receipt"}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-neutral-100 rounded">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Amount Paid</label>
              <Input
                type="number" min="0" step="0.01"
                value={form.dblAmountPaid}
                onChange={(e) => setForm({ ...form, dblAmountPaid: e.target.value })}
                placeholder="30000"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Date</label>
              <Input
                type="date"
                value={form.datReceiptDate}
                onChange={(e) => setForm({ ...form, datReceiptDate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 mb-1 block">Received From</label>
              <Input
                value={form.strReceivedFrom}
                onChange={(e) => setForm({ ...form, strReceivedFrom: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 mb-1 block">For Payment Of</label>
              <Input
                value={form.strPaymentFor}
                onChange={(e) => setForm({ ...form, strPaymentFor: e.target.value })}
                placeholder="e.g. Advance payment for installation"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 mb-1 block">Payment Mode</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, strPaymentMode: m.value })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      form.strPaymentMode === m.value
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 mb-1 block">Received By (optional)</label>
              <Input
                value={form.strReceivedBy}
                onChange={(e) => setForm({ ...form, strReceivedBy: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !form.dblAmountPaid || Number(form.dblAmountPaid) <= 0}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {editingId ? "Update" : "Save"} Receipt
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {receiptData.lstReceipts.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
            <ReceiptIcon className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p className="text-sm text-neutral-600">No receipts issued yet for this quotation.</p>
          </div>
        ) : (
          receiptData.lstReceipts.map((r) => (
            <div
              key={r.intPkReceiptId}
              className={`rounded-xl border p-3 flex items-center justify-between gap-2 ${
                r.strStatus === "void" ? "border-neutral-200 bg-neutral-50 opacity-60" : "border-neutral-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {r.strReceiptNumber}
                  {r.strStatus === "void" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">VOID</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {r.datReceiptDate} &middot; {fmtMoney(r.dblAmountPaid)} &middot; {r.strPaymentMode}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePrint(r.intPkReceiptId, r.strReceiptNumber)}
                  disabled={printingId === r.intPkReceiptId}
                  className="p-2 hover:bg-neutral-100 rounded-lg"
                  title="Print"
                >
                  {printingId === r.intPkReceiptId ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                  ) : (
                    <Printer className="w-4 h-4 text-neutral-500" />
                  )}
                </button>
                {r.strStatus !== "void" && (
                  <>
                    <button onClick={() => openEditForm(r)} className="p-2 hover:bg-neutral-100 rounded-lg" title="Edit">
                      <Pencil className="w-4 h-4 text-neutral-500" />
                    </button>
                    <button onClick={() => handleVoid(r.intPkReceiptId)} className="p-2 hover:bg-red-50 rounded-lg" title="Void">
                      <Ban className="w-4 h-4 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
