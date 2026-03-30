import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Save, ShieldCheck, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import quotationService from "@/services/quotationService";
import invoiceService from "@/services/invoiceService";
import pdfService from "@/services/pdfService";
import {
  calculateExpiryDate,
  formatWarrantyPeriod,
  isExpiryValid,
  parseWarrantyInt,
} from "@/lib/warranty";

const toEditableItem = (item) => {
  const intWarrantyYears = parseWarrantyInt(item.intWarrantyYears);
  const intWarrantyMonths = parseWarrantyInt(item.intWarrantyMonths);
  const intWarrantyDays = parseWarrantyInt(item.intWarrantyDays);
  const datImplementationDate = item.datImplementationDate || "";
  const strAutoExpiry = calculateExpiryDate(
    datImplementationDate,
    intWarrantyYears,
    intWarrantyMonths,
    intWarrantyDays
  );
  const blnManualExpiryOverride = !!item.blnManualExpiryOverride;

  return {
    ...item,
    intWarrantyYears,
    intWarrantyMonths,
    intWarrantyDays,
    datImplementationDate,
    blnManualExpiryOverride,
    datExpiryDate: item.datExpiryDate || strAutoExpiry || "",
    strAutoExpiry,
  };
};

const hasWarrantyPeriod = (item) =>
  parseWarrantyInt(item.intWarrantyYears) > 0 ||
  parseWarrantyInt(item.intWarrantyMonths) > 0 ||
  parseWarrantyInt(item.intWarrantyDays) > 0;

const applyCommonImplementationDate = (items, datImplementationDate) =>
  items.map((item) => {
    const updated = {
      ...item,
      datImplementationDate: datImplementationDate || "",
    };

    const strAutoExpiry = calculateExpiryDate(
      updated.datImplementationDate,
      updated.intWarrantyYears,
      updated.intWarrantyMonths,
      updated.intWarrantyDays
    );

    updated.strAutoExpiry = strAutoExpiry;
    if (!updated.blnManualExpiryOverride) {
      updated.datExpiryDate = strAutoExpiry;
    } else if (!updated.datExpiryDate) {
      updated.datExpiryDate = strAutoExpiry;
    }

    return updated;
  });

export default function WarrantyCertificate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sourceType = (searchParams.get("sourceType") || "").trim().toLowerCase();
  const sourceId = Number.parseInt(searchParams.get("sourceId") || "", 10);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState("");

  const [quotation, setQuotation] = useState(null);
  const [sourceInvoiceNumber, setSourceInvoiceNumber] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [commonImplementationDate, setCommonImplementationDate] = useState("");
  const [showNoWarrantyItems, setShowNoWarrantyItems] = useState(true);
  const [isWarrantySaved, setIsWarrantySaved] = useState(false);

  const hasValidSource = ["quotation", "invoice"].includes(sourceType) && Number.isFinite(sourceId);

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    if (!hasValidSource) {
      setError("Open this page from a quotation or invoice.");
      setIsLoading(false);
      return;
    }

    try {
      let intQuotationId = null;
      let invoiceNumber = null;

      if (sourceType === "quotation") {
        intQuotationId = sourceId;
      } else {
        const invoiceRes = await invoiceService.get(sourceId);
        if (invoiceRes.intStatus !== 1 || !invoiceRes.data) {
          setError(invoiceRes.strMessage || "Invoice not found.");
          setIsLoading(false);
          return;
        }

        intQuotationId = invoiceRes.data.intQuotationId;
        invoiceNumber = invoiceRes.data.strInvoiceNumber;

        if (!intQuotationId) {
          setError("This invoice is not linked to a quotation. Warranty certificate is quotation-based.");
          setIsLoading(false);
          return;
        }
      }

      const quotationRes = await quotationService.get(intQuotationId);
      if (quotationRes.intStatus !== 1 || !quotationRes.data) {
        setError(quotationRes.strMessage || "Quotation not found.");
        setIsLoading(false);
        return;
      }

      const q = quotationRes.data;
      const editableItems = (q.lstItems || []).map(toEditableItem);
      const blnWarrantyAlreadySaved = editableItems.some(
        (item) => item.datImplementationDate || item.datExpiryDate
      );
      const defaultImplementationDate =
        editableItems.find((item) => item.datImplementationDate)?.datImplementationDate || "";

      setQuotation(q);
      setSourceInvoiceNumber(invoiceNumber || q.strLinkedInvoiceNumber || null);
      setCommonImplementationDate(defaultImplementationDate);
      setIsWarrantySaved(blnWarrantyAlreadySaved);

      if (blnWarrantyAlreadySaved) {
        // Warranty was saved before — load items as-is, don't overwrite per-item dates
        setEditedItems(editableItems);
      } else {
        // Fresh — apply common date (will be "" so no-op anyway)
        setEditedItems(applyCommonImplementationDate(editableItems, defaultImplementationDate));
      }
    } catch (err) {
      setError(err.message || "Failed to load warranty data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceId]);

  const visibleItems = useMemo(() => {
    if (showNoWarrantyItems) return editedItems;
    return editedItems.filter((item) => hasWarrantyPeriod(item));
  }, [editedItems, showNoWarrantyItems]);

  const includedItemCount = useMemo(
    () => editedItems.filter((item) => hasWarrantyPeriod(item)).length,
    [editedItems]
  );

  const handleCommonImplementationDateChange = (dateValue) => {
    setCommonImplementationDate(dateValue);
    setEditedItems((prev) => applyCommonImplementationDate(prev, dateValue));
  };

  const updateItem = (intItemId, strField, value) => {
    setEditedItems((prev) =>
      prev.map((item) => {
        if (item.intPkQuotationItemId !== intItemId) return item;

        const updated = { ...item, [strField]: value };

        if (strField === "intWarrantyYears" || strField === "intWarrantyMonths" || strField === "intWarrantyDays") {
          updated[strField] = parseWarrantyInt(value);
        }

        if (strField === "blnManualExpiryOverride") {
          updated.blnManualExpiryOverride = !!value;
        }

        const strAutoExpiry = calculateExpiryDate(
          updated.datImplementationDate,
          updated.intWarrantyYears,
          updated.intWarrantyMonths,
          updated.intWarrantyDays
        );
        updated.strAutoExpiry = strAutoExpiry;

        if (!updated.blnManualExpiryOverride) {
          updated.datExpiryDate = strAutoExpiry;
        } else if (strField === "blnManualExpiryOverride") {
          // Manual override just toggled ON — clear expiry so user must pick their own
          updated.datExpiryDate = "";
        }

        return updated;
      })
    );
  };

  const removeItemFromWarranty = (intItemId) => {
    setEditedItems((prev) =>
      prev.map((item) => {
        if (item.intPkQuotationItemId !== intItemId) return item;

        return {
          ...item,
          intWarrantyYears: 0,
          intWarrantyMonths: 0,
          intWarrantyDays: 0,
          blnManualExpiryOverride: false,
          datExpiryDate: "",
          strAutoExpiry: "",
        };
      })
    );
  };

  const hasInvalidItems = useMemo(() => {
    return editedItems.some(
      (item) =>
        item.blnManualExpiryOverride &&
        !isExpiryValid(item.datImplementationDate, item.datExpiryDate)
    );
  }, [editedItems]);

  const handleSave = async () => {
    if (!quotation) return;
    if (hasInvalidItems) {
      alert("Please fix invalid expiry dates before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await quotationService.updateWarranty(
        quotation.intPkQuotationId,
        editedItems.map((item) => ({
          intPkQuotationItemId: item.intPkQuotationItemId,
          intWarrantyYears: parseWarrantyInt(item.intWarrantyYears),
          intWarrantyMonths: parseWarrantyInt(item.intWarrantyMonths),
          intWarrantyDays: parseWarrantyInt(item.intWarrantyDays),
          datImplementationDate: item.datImplementationDate || null,
          blnManualExpiryOverride: !!item.blnManualExpiryOverride,
          datExpiryDate: item.datExpiryDate || null,
        })),
      );

      if (response.intStatus === 1 && response.data) {
        const q = response.data;
        const editableItems = (q.lstItems || []).map(toEditableItem);
        const updatedCommonDate =
          editableItems.find((item) => item.datImplementationDate)?.datImplementationDate || "";

        setQuotation(q);
        setSourceInvoiceNumber(sourceInvoiceNumber || q.strLinkedInvoiceNumber || null);
        setCommonImplementationDate(updatedCommonDate);
        setEditedItems(editableItems);
        const wasUpdate = isWarrantySaved;
        setIsWarrantySaved(true);
        alert(wasUpdate ? "Warranty details updated." : "Warranty details saved.");
      } else {
        alert(response.strMessage || "Failed to save warranty details.");
      }
    } catch (err) {
      alert(err.message || "Failed to save warranty details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!quotation) return;

    setIsPrinting(true);
    try {
      const pdfBlob = await pdfService.generateWarrantyCertificatePDF({
        intQuotationId: quotation.intPkQuotationId,
      });
      pdfService.downloadPDF(pdfBlob, `Warranty_${quotation.strQuotationNumber || "quotation"}.pdf`);
    } catch (err) {
      alert(err.message || "Failed to generate warranty certificate PDF.");
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[360px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-neutral-400 animate-spin mb-3" />
          <p className="text-sm text-neutral-500">Loading warranty details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">Warranty Certificate</h1>
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
    <div className="p-4 md:p-6 pb-28 lg:pb-6">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-neutral-900">Warranty Certificate</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[11px] px-2 py-1 rounded border font-medium bg-blue-50 text-blue-700 border-blue-200">
              {sourceInvoiceNumber ? `Invoice: ${sourceInvoiceNumber}` : `Quotation: ${quotation.strQuotationNumber}`}
            </span>
            <span className="text-xs text-neutral-500">{quotation.strCustomerName}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-3 items-end">
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Implementation Date (All Items)</label>
            <input
              type="date"
              value={commonImplementationDate}
              onChange={(e) => handleCommonImplementationDateChange(e.target.value)}
              onClick={(e) => e.target.showPicker?.()}
              className="w-full h-12 px-3 text-sm border border-neutral-200 rounded-lg bg-white cursor-pointer"
            />
          </div>
          <p className="text-xs text-neutral-500">
            This one date applies to all items. Changing it updates auto expiry using each item&apos;s warranty period.
          </p>
        </div>
      </div>

      {/* Toggle hidden for now — all items shown by default */}
      {false && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
        <span className="text-xs text-neutral-600">
          Included in certificate: {includedItemCount} / {editedItems.length}
        </span>
        <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={showNoWarrantyItems}
            onChange={(e) => setShowNoWarrantyItems(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300"
          />
          Show excluded items
        </label>
      </div>
      )}

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const itemHasWarranty = hasWarrantyPeriod(item);
          const invalidManualExpiry =
            item.blnManualExpiryOverride &&
            !isExpiryValid(item.datImplementationDate, item.datExpiryDate);

          return (
            <div
              key={item.intPkQuotationItemId}
              className="bg-white border border-neutral-200 rounded-xl p-4"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{item.strItemName}</p>
                  <p className="text-xs text-neutral-500">
                    {item.strItemCode || "CUSTOM"} - Qty {item.dblQuantity} - {item.strUnit || "piece"}
                  </p>
                </div>
                {itemHasWarranty && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => removeItemFromWarranty(item.intPkQuotationItemId)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Years</label>
                  <Input
                    type="number"
                    min="0"
                    value={item.intWarrantyYears}
                    disabled={item.blnManualExpiryOverride}
                    onChange={(e) =>
                      updateItem(item.intPkQuotationItemId, "intWarrantyYears", e.target.value)
                    }
                    className={`h-9 ${item.blnManualExpiryOverride ? "bg-neutral-50 text-neutral-500" : ""}`}
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Months</label>
                  <Input
                    type="number"
                    min="0"
                    value={item.intWarrantyMonths}
                    disabled={item.blnManualExpiryOverride}
                    onChange={(e) =>
                      updateItem(item.intPkQuotationItemId, "intWarrantyMonths", e.target.value)
                    }
                    className={`h-9 ${item.blnManualExpiryOverride ? "bg-neutral-50 text-neutral-500" : ""}`}
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Days</label>
                  <Input
                    type="number"
                    min="0"
                    value={item.intWarrantyDays}
                    disabled={item.blnManualExpiryOverride}
                    onChange={(e) =>
                      updateItem(item.intPkQuotationItemId, "intWarrantyDays", e.target.value)
                    }
                    className={`h-9 ${item.blnManualExpiryOverride ? "bg-neutral-50 text-neutral-500" : ""}`}
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Expiry</label>
                  <Input
                    type="date"
                    value={item.datExpiryDate || ""}
                    disabled={!item.blnManualExpiryOverride || !itemHasWarranty}
                    onChange={(e) =>
                      updateItem(item.intPkQuotationItemId, "datExpiryDate", e.target.value)
                    }
                    className={`h-9 ${
                      !item.blnManualExpiryOverride || !itemHasWarranty
                        ? "bg-neutral-50 text-neutral-500"
                        : ""
                    }`}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={item.blnManualExpiryOverride}
                    disabled={!itemHasWarranty}
                    onChange={(e) =>
                      updateItem(item.intPkQuotationItemId, "blnManualExpiryOverride", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-neutral-300"
                  />
                  Manual expiry override
                </label>
                <span className="text-xs text-neutral-500">
                  Warranty period: {formatWarrantyPeriod(item.intWarrantyYears, item.intWarrantyMonths, item.intWarrantyDays)}
                </span>
                {!item.blnManualExpiryOverride && item.strAutoExpiry && (
                  <span className="text-xs text-neutral-500">Auto expiry: {item.strAutoExpiry}</span>
                )}
                {!itemHasWarranty && (
                  <span className="text-xs text-neutral-500">Not included in certificate output.</span>
                )}
              </div>

              {invalidManualExpiry && (
                <p className="text-xs text-red-600 mt-2">
                  Expiry date must be on or after implementation date.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {visibleItems.length === 0 && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-6 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-600">No warranty items to show.</p>
          <p className="text-xs text-neutral-500 mt-1">
            Enable "Show excluded items" if you want to edit all items.
          </p>
        </div>
      )}

      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-neutral-200 p-3 z-40">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            variant="outline"
            className="h-11 px-3 border-neutral-200"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || hasInvalidItems}
            className="h-11 flex-1 bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isWarrantySaved ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex fixed bottom-0 left-[220px] right-0 bg-white border-t border-neutral-200 p-4 z-30">
        <div className="ml-auto flex gap-2">
          <Button onClick={handlePrint} disabled={isPrinting} variant="outline">
            {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            Print Certificate
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || hasInvalidItems}
            className="bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isWarrantySaved ? "Update Changes" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
