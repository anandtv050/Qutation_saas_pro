import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Minus, X, Loader2, ChevronRight, Search, Printer, FilePlus, Calendar, Check, FileText, ShieldCheck, GripVertical, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import inventoryService from "@/services/inventoryService";
import quotationService from "@/services/quotationService";
import pdfService from "@/services/pdfService";
import aiService from "@/services/aiService";
import { usePermission } from "@/contexts/PermissionsContext";
import NoPermission from "@/components/NoPermission";

// Session storage key
const STORAGE_KEY = "quotation_draft";

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

// Clear draft from session storage
const clearDraft = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export default function NewQuotation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canWarranty = usePermission("warranty");
  const canInvoice = usePermission("invoice");
  const canReports = usePermission("reports");
  const canAI = usePermission("ai");
  const canInventory = usePermission("inventory");
  const safeBack = canReports ? "/reports" : "/dashboard";
  const { id: editId } = useParams(); // Get ID from URL for edit mode
  const mode = searchParams.get("mode") || "ai";
  const isEditMode = !!editId;

  // Load saved draft on mount (only for new quotations)
  const draft = isEditMode ? null : loadDraft();

  const [rawInput, setRawInput] = useState(draft?.rawInput || "");
  const [aiBlockMessage, setAiBlockMessage] = useState(null); // shown when quota/permission blocks AI
  const [aiBlockVariant, setAiBlockVariant] = useState("permission");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showForm, setShowForm] = useState(draft?.showForm ?? mode === "manual" ?? isEditMode);

  const [customerName, setCustomerName] = useState(draft?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(draft?.customerPhone || "");
  const [customerAddress, setCustomerAddress] = useState(draft?.customerAddress || "");
  const [items, setItems] = useState(draft?.items || []);
  const [isSaving, setIsSaving] = useState(false);

  // Success state after save
  // NOTE: Don't restore savedQuotation from draft - user should start fresh when clicking "New Quote"
  // This prevents showing stale "Convert to Invoice" buttons for quotations that already have invoices
  const [savedQuotation, setSavedQuotation] = useState(null);
  const [isUpdated, setIsUpdated] = useState(false); // Track if this was an update

  // Loading state for edit mode
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Duplicate mode: tracks which quotation's items were copied
  const [duplicatedFrom, setDuplicatedFrom] = useState(null);

  // Inventory data from API
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  // Inventory search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [customRate, setCustomRate] = useState("");
  const searchRef = useRef(null);

  // Fetch inventory on mount — only if user has inventory permission
  useEffect(() => {
    if (!canInventory) {
      setInventoryItems([]);
      setIsLoadingInventory(false);
      return;
    }
    const fetchInventory = async () => {
      try {
        setIsLoadingInventory(true);
        const response = await inventoryService.getList();
        if (response.intStatus === 1 && response.lstItem) {
          // Transform API data to match expected format
          const items = response.lstItem.map(item => ({
            id: item.intPkInventoryId,
            name: item.strItemName,
            code: item.strItemCode,
            category: item.strCategory,
            rate: item.dblUnitPrice,
            unit: item.strUnit,
            stock: item.intStockQuantity
          }));
          setInventoryItems(items);
        } else {
          setInventoryItems([]);
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
        setInventoryItems([]);
      } finally {
        setIsLoadingInventory(false);
      }
    };
    fetchInventory();
  }, [canInventory]);

  // Fetch quotation for edit mode
  useEffect(() => {
    if (!isEditMode || !editId) return;

    const fetchQuotation = async () => {
      setIsLoadingQuotation(true);
      try {
        const response = await quotationService.get(parseInt(editId));
        if (response.intStatus === 1 && response.data) {
          const q = response.data;
          // Set form data
          setCustomerName(q.strCustomerName || "");
          setCustomerPhone(q.strCustomerPhone || "");
          setCustomerAddress(q.strCustomerAddress || "");

          // Transform items to UI format
          const uiItems = (q.lstItems || []).map(item => ({
            id: item.intPkQuotationItemId,
            inventoryId: item.intInventoryId,
            code: item.strItemCode,
            name: item.strItemName,
            unit: item.strUnit,
            qty: item.dblQuantity,
            rate: item.dblUnitPrice,
            fromInventory: !!item.intInventoryId
          }));
          setItems(uiItems);

          // Set saved quotation data (including items for Convert to Invoice)
          setSavedQuotation({
            intPkQuotationId: q.intPkQuotationId,
            quotation_number: q.strQuotationNumber,
            customer_name: q.strCustomerName,
            customer_phone: q.strCustomerPhone,
            customer_address: q.strCustomerAddress,
            total: q.dblTotalAmount,
            date: q.datQuotationDate,
            status: q.strStatus,
            items: uiItems,
            // Linked invoice info (if already converted)
            linkedInvoiceId: q.intLinkedInvoiceId,
            linkedInvoiceNumber: q.strLinkedInvoiceNumber
          });

          setShowForm(true);
        } else {
          alert(response.strMessage || "Quotation not found");
          navigate(safeBack);
        }
      } catch (error) {
        console.error("Failed to load quotation:", error);
        alert("Failed to load quotation");
        navigate(safeBack);
      } finally {
        setIsLoadingQuotation(false);
      }
    };

    fetchQuotation();
  }, [isEditMode, editId, navigate]);

  // Duplicate mode: load items from source quotation (no customer details)
  useEffect(() => {
    const duplicateId = searchParams.get("duplicate");
    if (!duplicateId || isEditMode) return;

    // Wipe any state carried over  from the previous edit-mode render
    clearDraft();
    setSavedQuotation(null);
    setIsUpdated(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setRawInput("");

    const fetchDuplicate = async () => {
      setIsLoadingQuotation(true);
      try {
        const response = await quotationService.get(parseInt(duplicateId));
        if (response.intStatus === 1 && response.data) {
          const q = response.data;
          const uiItems = (q.lstItems || []).map((item, i) => ({
            id: Date.now() + i,
            inventoryId: item.intInventoryId,
            code: item.strItemCode,
            name: item.strItemName,
            unit: item.strUnit,
            qty: item.dblQuantity,
            rate: item.dblUnitPrice,
            fromInventory: !!item.intInventoryId,
          }));
          setItems(uiItems);
          setDuplicatedFrom(q.strQuotationNumber);
          setShowForm(true);
        }
      } catch (error) {
        console.error("Failed to load source quotation for duplicate:", error);
      } finally {
        setIsLoadingQuotation(false);
      }
    };

    fetchDuplicate();
  }, [searchParams, isEditMode]);

  // Current date
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const total = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);

  // Check for custom items with zero rate (needs attention)
  const hasZeroRateItems = items.some(item => item.rate === 0);

  // Check if there are unsaved changes
  const hasUnsavedChanges = items.length > 0 || customerName.trim() || customerPhone.trim() || customerAddress.trim() || rawInput.trim();

  // Save draft to session storage whenever data changes
  // NOTE: Don't save savedQuotation - it should not persist between sessions
  useEffect(() => {
    saveDraft({
      customerName,
      customerPhone,
      customerAddress,
      items,
      rawInput,
      showForm,
    });
  }, [customerName, customerPhone, customerAddress, items, rawInput, showForm]);

  // Warn before closing/refreshing browser tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !savedQuotation) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, savedQuotation]);

  // Custom navigation with confirmation
  const navigateWithConfirm = (path) => {
    if (hasUnsavedChanges && !savedQuotation) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === 0) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle search input - search local inventory data
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      ).slice(0, 10);
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
  }, [searchQuery, inventoryItems]);

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

  const processWithAI = async () => {
    if (!rawInput.trim()) return;
    setIsProcessing(true);
    setAiBlockMessage(null);

    try {
      // Call AI API to process raw text
      const response = await aiService.processQuotation(rawInput);

      if (response.intStatus === 1 && response.lstItems) {
        // Transform AI response to UI format
        const parsed = response.lstItems.map((item, i) => ({
          id: Date.now() + i,
          inventoryId: item.intInventoryId || null,
          code: item.strItemCode || null,
          name: item.strItemName,
          unit: item.strUnit || 'piece',
          qty: item.dblQuantity,
          rate: item.dblUnitPrice,
          fromInventory: !!item.intInventoryId,
        }));

        setItems(parsed);

        // Set customer info if AI extracted it
        if (response.strCustomerName && !customerName) {
          setCustomerName(response.strCustomerName);
        }
        if (response.strCustomerPhone && !customerPhone) {
          setCustomerPhone(response.strCustomerPhone);
        }

        setShowForm(true);
      } else {
        // Fallback to local parsing if AI fails (non-permission failure)
        console.warn("AI processing failed, using local parsing:", response.strMessage);
        fallbackLocalParsing();
      }
    } catch (error) {
      // Detect permission (403) and quota (400 with "limit") errors and show inline notice
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail || error?.message || "";
      if (status === 403) {
        setAiBlockVariant("permission");
        setAiBlockMessage(detail || "You don't have access to AI Quick Create.");
      } else if (status === 400 && /limit|quota/i.test(detail)) {
        setAiBlockVariant("quota");
        setAiBlockMessage(detail);
      } else {
        console.error("AI processing error:", error);
        fallbackLocalParsing();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback local parsing if AI fails
  const fallbackLocalParsing = () => {
    const lines = rawInput.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    const parsed = lines.map((line, i) => {
      const match = line.match(/^(\d+)\s*(.+)/i);
      const qty = match ? parseInt(match[1]) : 1;
      const itemText = match ? match[2].trim() : line;

      const lowerText = itemText.toLowerCase();
      const inventoryMatch = inventoryItems.find(inv =>
        inv.name.toLowerCase().includes(lowerText) ||
        lowerText.includes(inv.name.toLowerCase().split(' ').slice(0, 2).join(' ')) ||
        inv.code.toLowerCase().includes(lowerText)
      );

      return {
        id: Date.now() + i,
        name: inventoryMatch ? inventoryMatch.name : itemText,
        qty: qty,
        rate: inventoryMatch ? inventoryMatch.rate : 0,
        fromInventory: !!inventoryMatch,
      };
    });

    setItems(parsed);
    setShowForm(true);
  };

  const addItemFromInventory = (inventoryItem) => {
    const existing = items.find(item => item.inventoryId === inventoryItem.id);
    if (existing) {
      setItems(items.map(item =>
        item.inventoryId === inventoryItem.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setItems([...items, {
        id: Date.now(),
        inventoryId: inventoryItem.id,
        code: inventoryItem.code,
        name: inventoryItem.name,
        unit: inventoryItem.unit,
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

  const updateQty = (id, delta) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  const setQty = (id, value) => {
    const num = parseInt(value) || 0;
    setItems(items.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, num) } : item
    ));
  };

  const updateRate = (id, rate) => {
    const sanitized = rate.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    const numValue = parseFloat(cleaned);
    const finalRate = isNaN(numValue) || numValue < 0 ? 0 : numValue;
    setItems(items.map(item =>
      item.id === id ? { ...item, rate: finalRate } : item
    ));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  // Drag & drop reorder
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    setItems(newItems);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setItems([]);
    setRawInput("");
    setSavedQuotation(null);
    setIsUpdated(false);
    setShowForm(mode === "manual");
    clearDraft(); // Clear session storage
  };

  const handleSave = async () => {
    if (!customerName.trim()) return alert("Enter customer name");
    if (items.length === 0) return alert("Add at least one item");

    const wasAlreadySaved = !!savedQuotation;
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

      let response;

      if (wasAlreadySaved && savedQuotation.intPkQuotationId) {
        // UPDATE existing quotation
        response = await quotationService.update({
          intPkQuotationId: savedQuotation.intPkQuotationId,
          strCustomerName: customerName,
          strCustomerPhone: customerPhone || null,
          strCustomerAddress: customerAddress || null,
          lstItems: lstItems
        });
      } else {
        // CREATE new quotation
        response = await quotationService.add({
          strCustomerName: customerName,
          strCustomerPhone: customerPhone || null,
          strCustomerAddress: customerAddress || null,
          strStatus: 'draft',
          lstItems: lstItems
        });
      }

      if (response.intStatus === 1 && response.data) {
        // Transform response to match UI format
        const savedData = {
          intPkQuotationId: response.data.intPkQuotationId,
          quotation_number: response.data.strQuotationNumber,
          customer_name: response.data.strCustomerName,
          customer_phone: response.data.strCustomerPhone,
          customer_address: response.data.strCustomerAddress,
          total: response.data.dblTotalAmount,
          date: response.data.datQuotationDate,
          status: response.data.strStatus,
          items: response.data.lstItems
        };
        setSavedQuotation(savedData);
        setIsUpdated(wasAlreadySaved);
        clearDraft(); // Clear draft after successful save
      } else {
        alert(response.strMessage || "Failed to save quotation");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(error.message || "Failed to save quotation");
    } finally {
      setIsSaving(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!savedQuotation) {
      alert("Please save the quotation first");
      return;
    }

    setIsPrinting(true);
    try {
      // Generate PDF using saved quotation ID
      const pdfBlob = await pdfService.generateQuotationPDF({
        intQuotationId: savedQuotation.intPkQuotationId,
        blnIncludeInfoPage: true
      });

      // Download PDF file
      const filename = `Quotation_${savedQuotation.quotation_number || 'draft'}.pdf`;
      pdfService.downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error("Print error:", error);
      alert(error.message || "Failed to generate PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  // Loading screen for edit mode
  if (isLoadingQuotation) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-neutral-400 animate-spin mb-4" />
          <p className="text-sm text-neutral-500">Loading quotation...</p>
        </div>
      </div>
    );
  }

  // AI Input Screen — show a "no permission" message if user lacks AI access,
  // otherwise render the normal AI input UI.
  if (!showForm && mode === "ai" && !isEditMode && !canAI) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">Quick Create</h1>
        </div>
        <NoPermission
          moduleKey="ai"
          moduleName="Quick Create"
          message="Your plan doesn't include AI Quick Create. Switch to manual mode to add items by hand, or contact admin to upgrade."
          compact
        />
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => navigate("/quotations/new?mode=manual")}
            className="bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            Switch to Manual Mode
          </Button>
        </div>
      </div>
    );
  }
  if (!showForm && mode === "ai" && !isEditMode && canAI) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigateWithConfirm("/dashboard")} className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">Quick Create</h1>
        </div>

        {/* Customer Details for AI Mode */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-4">
          <h2 className="font-medium text-neutral-900 mb-3">Customer Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Name *</label>
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10 border-neutral-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Phone</label>
              <Input
                placeholder="Phone number"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-10 border-neutral-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
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

        {aiBlockMessage && (
          <div className="mb-4">
            <NoPermission
              variant={aiBlockVariant}
              moduleKey="ai"
              moduleName="Quick Create"
              message={aiBlockMessage}
              compact
              onDismiss={() => setAiBlockMessage(null)}
            />
          </div>
        )}

        <Textarea
          placeholder="Type your items here...

Example:
4 Hikvision 2MP Dome Camera
1 DVR 8 Channel
1 Hard Disk 1TB
100m Cat6 Cable
1 SMPS 4 Channel
4 Installation Charges"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          className="min-h-[250px] border-neutral-200 rounded-xl text-base p-4 resize-none mb-4"
          autoFocus
        />
        <Button
          onClick={processWithAI}
          disabled={!rawInput.trim() || !customerName.trim() || isProcessing}
          className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl font-medium"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue<ChevronRight className="w-4 h-4 ml-1" /></>}
        </Button>
        {!customerName.trim() && rawInput.trim() && (
          <p className="text-center text-xs text-amber-600 mt-2">Please enter customer name to continue</p>
        )}
      </div>
    );
  }

  // Main Form
  return (
    <div className="p-4 md:p-6 pb-36 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        {/* Top Row: Back button + New button (always visible) */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => mode === "ai" ? setShowForm(false) : navigateWithConfirm(isEditMode ? "/reports" : "/dashboard")}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>

          <div className="flex items-center gap-2">
          {/* Copy button - visible only when viewing a saved quotation */}
          {isEditMode && (
            <Button
              onClick={() => navigate(`/quotations/new?mode=manual&duplicate=${editId}`)}
              variant="outline"
              size="sm"
              className="h-9 px-3 border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              title="Copy items to new quotation"
            >
              <Copy className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          )}

          {/* New button - always visible to clear and start fresh */}
          <Button
            onClick={() => {
              if (hasUnsavedChanges && !window.confirm("Clear all data and start new quotation?")) {
                return;
              }
              clearDraft();
              navigate(canAI ? "/quotations/new?mode=ai" : "/quotations/new?mode=manual");
              setCustomerName("");
              setCustomerPhone("");
              setCustomerAddress("");
              setItems([]);
              setRawInput("");
              setSavedQuotation(null);
              setIsUpdated(false);
              setShowForm(false);
            }}
            variant="outline"
            size="sm"
            className="h-9 px-3 border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          >
            <FilePlus className="w-4 h-4 mr-1.5" />
            New
          </Button>
          </div>
        </div>

        {/* Quotation Info Bar */}
        {savedQuotation ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900">{savedQuotation.quotation_number}</h1>
                {/* Only show success message after user action (save/update), not when just loading */}
                {(!isEditMode || isUpdated) && (
                  <p className="text-xs text-green-600">
                    {isUpdated ? "Quotation updated successfully" : "Quotation saved successfully"}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-neutral-600">
                <Calendar className="w-4 h-4" />
                {new Date(savedQuotation.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <p className="text-lg font-bold text-neutral-900">{formatCurrency(total)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-neutral-900">{isEditMode ? 'Edit Quotation' : 'New Quotation'}</h1>
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
          {/* Customer Details - Mobile Only (at top) */}
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

          {/* Duplicated-from banner */}
          {duplicatedFrom && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Copy className="w-4 h-4 shrink-0" />
              Items copied from <span className="font-semibold">{duplicatedFrom}</span>
            </div>
          )}

          {/* Inventory Search — only for users with inventory access; others type items manually below */}
          {canInventory && (
          <div ref={searchRef} className="relative">
            <div className="relative">
              {isLoadingInventory ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              )}
              <Input
                placeholder={isLoadingInventory ? "Loading inventory..." : "Search inventory... (e.g., camera, dvr, cable)"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => !isLoadingInventory && setShowDropdown(true)}
                disabled={isLoadingInventory}
                className="pl-10 h-11 border-neutral-200 rounded-lg"
                autoFocus={mode === "manual"}
              />
            </div>

            {/* Search Dropdown */}
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

                {/* Custom Item Option */}
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
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Items List */}
          {items.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 md:p-12 text-center">
              {canInventory ? (
                <>
                  <p className="text-neutral-400 mb-1">Search and add items from inventory</p>
                  <p className="text-xs text-neutral-300">Prices are automatically filled from inventory</p>
                </>
              ) : (
                <>
                  <p className="text-neutral-400 mb-1">Add items manually using the button below</p>
                  <p className="text-xs text-neutral-300">Inventory access not enabled on your plan — type item name and rate directly</p>
                </>
              )}
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
              {/* Desktop Table Header - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-neutral-100 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                <div className="col-span-5">Item Name</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items */}
              <div className="divide-y divide-neutral-100">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 md:p-0 transition-all ${
                      dragIndex === index ? "opacity-40" : ""
                    } ${dragOverIndex === index && dragIndex !== index ? "border-t-2 border-black" : ""}`}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          {/* Drag handle */}
                          {items.length > 1 && (
                            <div className="cursor-grab active:cursor-grabbing touch-none p-1 text-neutral-300 hover:text-neutral-500">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">{item.name}</p>
                          {item.rate === 0 && (
                            <span className="text-xs text-red-500 font-medium">⚠ Enter rate</span>
                          )}
                          {!item.fromInventory && item.rate !== 0 && (
                            <span className="text-xs text-amber-600">Custom item</span>
                          )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-neutral-400" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center border border-neutral-200 rounded-lg bg-white">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-l-lg"
                            >
                              <Minus className="w-3 h-3 text-neutral-600" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => setQty(item.id, e.target.value)}
                              onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                              className="w-10 text-center text-sm font-semibold border-0 outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-r-lg"
                            >
                              <Plus className="w-3 h-3 text-neutral-600" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-neutral-500">×</span>
                            <Input
                              type="number"
                              placeholder="Rate"
                              min="0"
                              value={item.rate || ""}
                              onChange={(e) => updateRate(item.id, e.target.value)}
                              onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                              className={`w-16 h-7 text-xs text-center rounded-lg ${
                                item.rate === 0 ? "border-red-300 bg-red-50" : "border-neutral-200"
                              }`}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-neutral-900">{formatCurrency(item.qty * item.rate)}</p>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 items-center">
                      <div className="col-span-5 flex items-center gap-2">
                        {/* Drag handle */}
                        {items.length > 1 && (
                          <div className="cursor-grab active:cursor-grabbing p-1 text-neutral-300 hover:text-neutral-500 transition-colors">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                        {item.rate === 0 && (
                          <span className="text-xs text-red-500 font-medium">⚠ Enter rate</span>
                        )}
                        {!item.fromInventory && item.rate !== 0 && (
                          <span className="text-xs text-amber-600">Custom item</span>
                        )}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <div className="inline-flex items-center border border-neutral-200 rounded-lg bg-white">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-l-lg"
                          >
                            <Minus className="w-3 h-3 text-neutral-600" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => setQty(item.id, e.target.value)}
                            onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                            className="w-10 text-center text-sm font-semibold border-0 outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-r-lg"
                          >
                            <Plus className="w-3 h-3 text-neutral-600" />
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <Input
                          type="number"
                          placeholder="Rate"
                          min="0"
                          value={item.rate || ""}
                          onChange={(e) => updateRate(item.id, e.target.value)}
                          onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                          className={`w-20 h-8 text-sm text-center rounded-lg ${
                            item.rate === 0 ? "border-red-300 bg-red-50" : "border-neutral-200"
                          }`}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-neutral-900">{formatCurrency(item.qty * item.rate)}</p>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                        >
                          <X className="w-4 h-4 text-neutral-400 group-hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning for zero rate items */}
              {hasZeroRateItems && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold text-[10px]">!</span>
                  Some items have no price. Please enter a rate.
                </div>
              )}

              {/* Footer - Total (Desktop only, mobile has fixed bar) */}
              <div className="hidden md:flex px-4 py-3 bg-neutral-50 border-t border-neutral-200 items-center justify-between">
                <span className="text-sm font-medium text-neutral-600">Total ({items.length} items)</span>
                <span className="text-lg font-bold text-neutral-900">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
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
            </div>

            {/* Action Buttons - User flow: Edit → Save → Print → Invoice */}
            <div className="space-y-2">
              {/* Save/Update is always PRIMARY (main user action) */}
              <Button
                onClick={handleSave}
                disabled={isSaving || !customerName.trim() || items.length === 0}
                className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg font-medium"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedQuotation ? "Update Quotation" : "Save Quotation"}
              </Button>
              {/* Actions after save */}
              {savedQuotation && (
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
                    {isPrinting ? "Generating PDF..." : "Print Quotation"}
                  </Button>
                  {canWarranty && (
                    <Button
                      onClick={() => navigate(`/warranty?sourceType=quotation&sourceId=${savedQuotation.intPkQuotationId}`)}
                      variant="outline"
                      className="w-full h-11 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg font-medium"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Warranty Certificate
                    </Button>
                  )}
                  {/* Convert to Invoice OR View Invoice if already converted */}
                  {canInvoice && (savedQuotation.linkedInvoiceId ? (
                    <Button
                      onClick={() => navigate(`/invoices/view/${savedQuotation.linkedInvoiceId}`)}
                      variant="outline"
                      className="w-full h-11 border-green-200 text-green-700 hover:bg-green-50 rounded-lg font-medium"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Invoice ({savedQuotation.linkedInvoiceNumber})
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate("/invoices/new", { state: { fromQuotation: savedQuotation } })}
                      variant="outline"
                      className="w-full h-11 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg font-medium"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Convert to Invoice
                    </Button>
                  ))}
                  {/* New Quotation - TERTIARY (with subtle border for visibility) */}
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="w-full h-10 border-dashed border-neutral-300 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 rounded-lg font-medium text-sm"
                  >
                    <FilePlus className="w-4 h-4 mr-2" />
                    Create New Quotation
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-neutral-200 z-40">
        {savedQuotation ? (
          <div className="px-3 py-2 space-y-2">
            {/* Row 1: Info + quick actions */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-400 leading-none">{items.length} items</p>
                <p className="text-base font-bold text-neutral-900">{formatCurrency(total)}</p>
              </div>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40"
              >
                {isPrinting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Printer className="w-[18px] h-[18px]" />}
              </button>
              {canWarranty && (
                <button
                  onClick={() => navigate(`/warranty?sourceType=quotation&sourceId=${savedQuotation.intPkQuotationId}`)}
                  className="h-10 px-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-sm shadow-amber-200 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Warranty
                </button>
              )}
            </div>
            {/* Row 2: Primary CTAs */}
            <div className="flex items-center gap-2">
              {canInvoice && (savedQuotation.linkedInvoiceId ? (
                <Button
                  onClick={() => navigate(`/invoices/view/${savedQuotation.linkedInvoiceId}`)}
                  className="h-11 flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium text-sm"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  View Invoice
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/invoices/new", { state: { fromQuotation: savedQuotation } })}
                  className="h-11 flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium text-sm"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Invoice
                </Button>
              ))}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-11 flex-1 bg-neutral-900 hover:bg-neutral-800 active:bg-black disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl font-medium text-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                Update
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-400 leading-none">{items.length} items</p>
                <p className="text-base font-bold text-neutral-900">{formatCurrency(total)}</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving || !customerName.trim() || items.length === 0}
                className="h-11 px-6 bg-neutral-900 hover:bg-neutral-800 active:bg-black disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl font-medium"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
