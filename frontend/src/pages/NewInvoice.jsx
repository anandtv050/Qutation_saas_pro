import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Calendar, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import invoiceService from "@/services/invoiceService";
import pdfService from "@/services/pdfService";
// Commented for later - inventory search
// import { searchInventory, inventoryItems } from "@/data/inventoryData";

// Session storage key
const STORAGE_KEY = "invoice_draft";

// Load draft from session storage
const loadDraft = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save draft to session storage
const saveDraft = (data) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};


export default function NewInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: invoiceId } = useParams();

  // Check if coming from quotation conversion
  const fromQuotation = location.state?.fromQuotation;

  // Check if viewing/editing existing invoice
  const isViewMode = !!invoiceId;

  // Loading state for fetching invoice
  const [isLoading, setIsLoading] = useState(isViewMode);
  const [loadError, setLoadError] = useState(null);

  // Load saved draft on mount (only if not in view mode)
  const draft = isViewMode ? null : loadDraft();

  // Initialize from quotation if available, otherwise from draft
  const [customerName, setCustomerName] = useState(
    fromQuotation?.customer_name || draft?.customerName || ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    fromQuotation?.customer_phone || draft?.customerPhone || ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    fromQuotation?.customer_address || draft?.customerAddress || ""
  );
  const [items, setItems] = useState(() => {
    if (fromQuotation?.items) {
      return fromQuotation.items.map((item, i) => ({
        id: Date.now() + i,
        // Handle both API format (strItemName) and old format (name)
        name: item.strItemName || item.name || '',
        // Use nullish coalescing (??) to handle 0 values correctly (0 is valid, undefined/null is not)
        qty: item.dblQuantity ?? item.qty ?? 1,
        rate: item.dblUnitPrice ?? item.rate ?? 0,
        unit: item.strUnit || item.unit || 'piece',
        code: item.strItemCode || item.code || null,
        inventoryId: item.intInventoryId || item.inventoryId || null,
        fromInventory: true,
      }));
    }
    return draft?.items || [];
  });

  // Invoice specific fields
  const [dueDate, setDueDate] = useState(draft?.dueDate || "");

  /* Payment tracking - Commented for later
  const [paymentStatus, setPaymentStatus] = useState(draft?.paymentStatus || "pending");
  const [paidAmount, setPaidAmount] = useState(draft?.paidAmount ?? 0);
  */

  const [isSaving, setIsSaving] = useState(false);

  // Success state after save
  // IMPORTANT: Don't load savedInvoice from draft when coming from quotation conversion
  // This prevents showing "saved" state for a new invoice that hasn't been saved yet
  const [savedInvoice, setSavedInvoice] = useState(
    fromQuotation ? null : (draft?.savedInvoice || null)
  );
  const [isUpdated, setIsUpdated] = useState(false);

  // Track if this is from quotation conversion
  const [sourceQuotation, setSourceQuotation] = useState(
    fromQuotation?.quotation_number || null
  );
  const [sourceQuotationId, setSourceQuotationId] = useState(
    fromQuotation?.intPkQuotationId || null
  );

  /* Inventory search state - Commented for later
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [customRate, setCustomRate] = useState("");
  const searchRef = useRef(null);
  */

  // Clear old draft when coming from quotation conversion (fresh start)
  useEffect(() => {
    if (fromQuotation) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Current date
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Calculate totals - use || 0 to handle any undefined/null values
  const subtotal = items.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);
  /* Payment tracking - Commented for later
  const balance = subtotal - paidAmount;
  */

  // Check if there are unsaved changes
  const hasUnsavedChanges = items.length > 0 || customerName.trim() || customerPhone.trim() || customerAddress.trim();

  // Save draft to session storage whenever data changes
  useEffect(() => {
    saveDraft({
      customerName,
      customerPhone,
      customerAddress,
      items,
      dueDate,
      /* Payment tracking - Commented for later
      paymentStatus,
      paidAmount,
      */
      savedInvoice,
      sourceQuotation,
      sourceQuotationId,
    });
  }, [customerName, customerPhone, customerAddress, items, dueDate, savedInvoice, sourceQuotation, sourceQuotationId]);

  // Warn before closing/refreshing browser tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !savedInvoice) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, savedInvoice]);

  // Custom navigation with confirmation
  const navigateWithConfirm = (path) => {
    if (hasUnsavedChanges && !savedInvoice) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  const formatCurrency = (amount) => {
    // Handle NaN, undefined, null - default to 0
    const safeAmount = Number.isNaN(amount) || amount == null ? 0 : amount;
    if (safeAmount === 0) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  /* Inventory search functionality - Commented for later
  // Handle search input
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchInventory(searchQuery);
      setSearchResults(results);
      setShowDropdown(true);
      setIsCustomItem(results.length === 0 || !results.some(r =>
        r.name.toLowerCase() === searchQuery.toLowerCase()
      ));
    } else {
      setSearchResults(inventoryItems.slice(0, 8));
      setShowDropdown(false);
      setIsCustomItem(false);
    }
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addItemFromInventory = (inventoryItem) => {
    const existing = items.find(item => item.name === inventoryItem.name);
    if (existing) {
      setItems(items.map(item =>
        item.name === inventoryItem.name ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setItems([...items, {
        id: Date.now(),
        name: inventoryItem.name,
        qty: 1,
        rate: inventoryItem.rate,
        fromInventory: true,
      }]);
    }
    setSearchQuery("");
    setShowDropdown(false);
  };

  const addCustomItem = () => {
    if (!searchQuery.trim() || !customRate) return;
    setItems([...items, {
      id: Date.now(),
      name: searchQuery.trim(),
      qty: 1,
      rate: Number(customRate) || 0,
      fromInventory: false,
    }]);
    setSearchQuery("");
    setCustomRate("");
    setShowDropdown(false);
    setIsCustomItem(false);
  };
  */

  /* Commented for later - item editing functionality
  const updateQty = (id, delta) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  const updateRate = (id, rate) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, rate: Number(rate) || 0 } : item
    ));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  */

  const handleSave = async () => {
    if (!customerName.trim()) return alert("Enter customer name");
    if (items.length === 0) return alert("Add at least one item");

    // Invoice is not editable - only save once
    if (savedInvoice) return;

    setIsSaving(true);

    try {
      // Transform items for API
      const lstItems = items.map((item, index) => ({
        intInventoryId: item.inventoryId || null,
        strItemCode: item.code || null,
        strItemName: item.name,
        strUnit: item.unit || 'piece',
        dblQuantity: item.qty,
        dblUnitPrice: item.rate,
        intSortOrder: index
      }));

      const response = await invoiceService.add({
        intQuotationId: sourceQuotationId || null,
        strCustomerName: customerName,
        strCustomerPhone: customerPhone || null,
        strCustomerAddress: customerAddress || null,
        datDueDate: dueDate || null,
        strPaymentStatus: 'paid',  // Default to paid since payment tracking is disabled
        lstItems: lstItems
      });

      if (response.intStatus === 1 && response.data) {
        // Transform response to match UI format
        const savedData = {
          intPkInvoiceId: response.data.intPkInvoiceId,
          invoice_number: response.data.strInvoiceNumber,
          customer_name: response.data.strCustomerName,
          customer_phone: response.data.strCustomerPhone,
          customer_address: response.data.strCustomerAddress,
          total: response.data.dblTotalAmount,
          date: response.data.datInvoiceDate,
          payment_status: response.data.strPaymentStatus,
          items: response.data.lstItems
        };
        setSavedInvoice(savedData);
        sessionStorage.removeItem(STORAGE_KEY); // Clear draft after save
      } else {
        alert(response.strMessage || "Failed to save invoice");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(error.message || "Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    // For view mode, use invoiceId from URL
    // For saved invoice, use savedInvoice.intPkInvoiceId
    const invoiceIdToUse = isViewMode ? parseInt(invoiceId) : savedInvoice?.intPkInvoiceId;

    if (!invoiceIdToUse) {
      alert("Please save the invoice first");
      return;
    }

    setIsPrinting(true);
    try {
      const pdfBlob = await pdfService.generateInvoicePDF({
        intInvoiceId: invoiceIdToUse,
        blnIncludeInfoPage: false
      });

      // Download PDF file
      const invoiceNum = savedInvoice?.invoice_number || invoiceId || 'draft';
      const filename = `Invoice_${invoiceNum}.pdf`;
      pdfService.downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error("Print error:", error);
      alert(error.message || "Failed to generate PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = () => {
    // In real app, this would generate a shareable link or PDF
    alert("Share functionality coming soon!");
  };

  // Set default due date to 15 days from now if not set
  useEffect(() => {
    if (!dueDate && !fromQuotation && !draft?.dueDate && !isViewMode) {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 15);
      setDueDate(defaultDue.toISOString().split('T')[0]);
    }
  }, []);

  // Load invoice from API when in view mode
  useEffect(() => {
    if (!isViewMode || !invoiceId) return;

    const loadInvoice = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await invoiceService.get(parseInt(invoiceId));
        if (response.intStatus === 1 && response.data) {
          const inv = response.data;

          // Set customer details
          setCustomerName(inv.strCustomerName || "");
          setCustomerPhone(inv.strCustomerPhone || "");
          setCustomerAddress(inv.strCustomerAddress || "");
          setDueDate(inv.datDueDate || "");

          // Transform items from API format to UI format
          const uiItems = (inv.lstItems || []).map((item, i) => ({
            id: item.intPkInvoiceItemId || Date.now() + i,
            name: item.strItemName,
            qty: item.dblQuantity,
            rate: item.dblUnitPrice,
            unit: item.strUnit || 'piece',
            code: item.strItemCode || null,
            inventoryId: item.intInventoryId || null,
            fromInventory: !!item.intInventoryId,
          }));
          setItems(uiItems);

          // Set source quotation if linked
          if (inv.strQuotationNumber) {
            setSourceQuotation(inv.strQuotationNumber);
            setSourceQuotationId(inv.intQuotationId);
          }

          // Set as already saved invoice (view mode)
          setSavedInvoice({
            intPkInvoiceId: inv.intPkInvoiceId,
            invoice_number: inv.strInvoiceNumber,
            customer_name: inv.strCustomerName,
            customer_phone: inv.strCustomerPhone,
            customer_address: inv.strCustomerAddress,
            total: inv.dblTotalAmount,
            date: inv.datInvoiceDate,
            payment_status: inv.strPaymentStatus,
            items: inv.lstItems
          });
        } else {
          setLoadError(response.strMessage || "Invoice not found");
        }
      } catch (error) {
        console.error("Failed to load invoice:", error);
        setLoadError(error.message || "Failed to load invoice");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, isViewMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-36 lg:pb-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/reports")}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neutral-400 animate-spin mb-4" />
          <p className="text-sm text-neutral-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="p-4 md:p-6 pb-36 lg:pb-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/reports")}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Failed to load invoice</h3>
          <p className="text-sm text-neutral-500 mb-4">{loadError}</p>
          <Button onClick={() => navigate("/reports")} variant="outline">
            Back to Reports
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-36 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        {/* Top Row: Back button */}
        <div className="flex items-center mb-2">
          <button
            onClick={() => navigateWithConfirm(isViewMode ? "/reports" : "/dashboard")}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* Invoice Info Bar */}
        {savedInvoice ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900">{savedInvoice.invoice_number}</h1>
                <div className="flex items-center gap-2">
                  {/* Only show success message if NOT in view mode (freshly saved/updated) */}
                  {!isViewMode && (
                    <p className="text-xs text-emerald-600">
                      {isUpdated ? "Invoice updated successfully" : "Invoice saved successfully"}
                    </p>
                  )}
                  {sourceQuotation && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      From {sourceQuotation}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-neutral-600">
                <Calendar className="w-4 h-4" />
                {new Date(savedInvoice.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <p className="text-lg font-bold text-neutral-900">{formatCurrency(subtotal)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">New Invoice</h1>
              {sourceQuotation && (
                <p className="text-sm text-blue-600">From {sourceQuotation}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              <Calendar className="w-4 h-4" />
              {today}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer (mobile only) + Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Details - Mobile Only */}
          <div className="lg:hidden bg-white border border-neutral-200 rounded-xl p-4">
            <h2 className="font-semibold text-neutral-900 mb-3">Customer Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Name *</label>
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Phone</label>
                <Input
                  placeholder="Phone number"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Address</label>
                <Input
                  placeholder="Site address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Payment Details - Mobile - Commented for later
          <div className="lg:hidden bg-white border border-neutral-200 rounded-xl p-4">
            <h2 className="font-semibold text-neutral-900 mb-3">Payment Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Paid Amount</label>
                <Input
                  type="number"
                  value={paidAmount || ""}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  placeholder="Enter paid amount"
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
            </div>
          </div>
          */}

          {/* Inventory Search - Commented for now, items come from quotation
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search inventory... (e.g., camera, dvr, cable)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="pl-10 h-11 border-neutral-200 rounded-lg"
                autoFocus={!fromQuotation}
              />
            </div>

            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItemFromInventory(item)}
                        className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-center justify-between border-b border-neutral-100 last:border-0 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                          <p className="text-xs text-neutral-500">{item.category}</p>
                        </div>
                        <span className="text-sm font-semibold text-neutral-700">{formatCurrency(item.rate)}</span>
                      </button>
                    ))}
                  </>
                ) : null}

                {isCustomItem && searchQuery.trim() && (
                  <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                    <p className="text-xs text-neutral-500 mb-2">Item not in inventory? Add as custom:</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Rate (₹)"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        className="w-28 h-9 text-sm border-neutral-200 rounded-lg"
                      />
                      <Button
                        onClick={addCustomItem}
                        disabled={!customRate}
                        size="sm"
                        className="h-9 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add "{searchQuery}"
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          */}

          {/* Items List - Read only (items come from quotation) */}
          {items.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 md:p-12 text-center">
              <p className="text-neutral-400 mb-1">No items in this invoice</p>
              <p className="text-xs text-neutral-300">Convert a quotation to create an invoice</p>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-neutral-100 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                <div className="col-span-6">Item Name</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              {/* Items - Read only */}
              <div className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <div key={item.id} className="p-3 md:p-0">
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">{item.qty} × {formatCurrency(item.rate)}</span>
                        <p className="text-sm font-semibold text-neutral-900">{formatCurrency(item.qty * item.rate)}</p>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 items-center">
                      <div className="col-span-6">
                        <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-medium text-neutral-700">{item.qty}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-medium text-neutral-700">{formatCurrency(item.rate)}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-neutral-900">{formatCurrency(item.qty * item.rate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Invoice Summary - Desktop */}
              <div className="hidden md:block px-4 py-4 bg-neutral-50 border-t border-neutral-200">
                <div className="space-y-2">
                  {/* Discount - Commented for later
                  <div className="flex justify-between items-center text-sm text-neutral-600">
                    <span>Discount</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-neutral-400">₹</span>
                      <Input
                        type="number"
                        value={discountAmount || ""}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-20 h-7 text-right text-xs border-neutral-200 rounded"
                      />
                    </div>
                  </div>
                  */}
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-neutral-900">Total ({items.length} items)</span>
                    <span className="text-xl font-bold text-neutral-900">{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Tax/Discount Section - Commented for later
          {items.length > 0 && (
            <div className="lg:hidden bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Discount</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Discount</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-neutral-400">₹</span>
                    <Input
                      type="number"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 h-8 text-right text-sm border-neutral-200 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          */}
        </div>

        {/* Right: Customer & Actions - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sticky top-4">
            <h2 className="font-semibold text-neutral-900 mb-4">Customer Details</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">Name *</label>
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">Phone</label>
                <Input
                  placeholder="Phone number"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">Address</label>
                <Input
                  placeholder="Site address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 border-neutral-200 rounded-lg"
                />
              </div>
              {/* Payment Status - Commented for later
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              */}
            </div>

            {/* Payment Summary - Shows simple total only */}
            {items.length > 0 && (
              <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Total ({items.length} items)</span>
                  <span className="text-lg font-bold text-neutral-900">{formatCurrency(subtotal)}</span>
                </div>
              </div>
            )}

            {/* Payment Summary with Paid/Balance - Commented for later
            {items.length > 0 && (
              <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Total ({items.length} items)</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600">
                    <span>Paid</span>
                    <Input
                      type="number"
                      value={paidAmount || ""}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 h-8 text-right text-sm border-neutral-200 rounded"
                    />
                  </div>
                  <div className="border-t border-neutral-200 pt-2 mt-2">
                    <div className={`flex justify-between font-semibold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      <span>Balance</span>
                      <span className="text-lg">{formatCurrency(balance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            */}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Save/Update is PRIMARY */}
              <Button
                onClick={handleSave}
                disabled={isSaving || !customerName.trim() || items.length === 0}
                className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg font-medium"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedInvoice ? "Update Invoice" : "Save Invoice"}
              </Button>

              {/* Actions after save or in view mode */}
              {(savedInvoice || isViewMode) && (
                <>
                  {/* Print */}
                  <Button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    variant="outline"
                    className="w-full h-11 border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium"
                  >
                    {isPrinting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4 mr-2" />
                    )}
                    {isPrinting ? "Generating PDF..." : "Print Invoice"}
                  </Button>
                  {/* Share */}
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg font-medium"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Invoice
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-neutral-200 p-3 z-40">
        <div className="flex items-center gap-2">
          {/* Left: Total info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500">Total</p>
            <p className="text-lg font-bold text-neutral-900">
              {formatCurrency(subtotal)}
            </p>
          </div>

          {/* Balance info - Commented for later
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500">
              Balance {paidAmount > 0 && <span className="text-emerald-600">(Paid: {formatCurrency(paidAmount)})</span>}
            </p>
            <p className={`text-lg font-bold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          */}

          {/* Right: Action buttons */}
          {(savedInvoice || isViewMode) ? (
            <>
              {/* Print */}
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                variant="outline"
                className="h-11 px-3 border-neutral-200 shrink-0"
              >
                {isPrinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
              </Button>
              {/* Share */}
              <Button
                onClick={handleShare}
                className="h-11 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shrink-0"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              {/* Update */}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="outline"
                className="h-11 px-3 border-neutral-200 shrink-0"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving || !customerName.trim() || items.length === 0}
              className="h-11 px-5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg font-medium shrink-0"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
