import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Receipt, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import quotationService from "@/services/quotationService";
import { dummyInvoices } from "@/data/dummyData";

export default function Reports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("quotations");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Quotations state
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [quotationError, setQuotationError] = useState(null);

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch quotations from API
  const fetchQuotations = async () => {
    setIsLoadingQuotations(true);
    setQuotationError(null);
    try {
      const response = await quotationService.getList();
      if (response.intStatus === 1) {
        setQuotations(response.lstQuotation || []);
      } else if (response.intStatus === -1) {
        // No data found
        setQuotations([]);
      } else {
        setQuotationError(response.strMessage || "Failed to load quotations");
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
      setQuotationError(error.message || "Failed to load quotations");
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = !searchQuery.trim() ||
        q.strQuotationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.strCustomerName?.toLowerCase().includes(searchQuery.toLowerCase());

      const dateValue = q.datQuotationDate;
      const matchesFromDate = !fromDate || dateValue >= fromDate;
      const matchesToDate = !toDate || dateValue <= toDate;

      return matchesSearch && matchesFromDate && matchesToDate;
    });
  }, [quotations, searchQuery, fromDate, toDate]);

  // Filter invoices (still using dummy data for now)
  const filteredInvoices = useMemo(() => {
    return dummyInvoices.filter(i => {
      const matchesSearch = !searchQuery.trim() ||
        i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const dateValue = i.created_at;
      const matchesFromDate = !fromDate || dateValue >= fromDate;
      const matchesToDate = !toDate || dateValue <= toDate;
      return matchesSearch && matchesFromDate && matchesToDate;
    });
  }, [searchQuery, fromDate, toDate]);

  const statusColors = {
    // Quotation statuses
    draft: "bg-neutral-100 text-neutral-600",
    sent: "bg-amber-50 text-amber-600",
    approved: "bg-green-50 text-green-600",
    accepted: "bg-green-50 text-green-600",
    converted: "bg-blue-50 text-blue-600",
    rejected: "bg-red-50 text-red-600",
    // Invoice statuses
    pending: "bg-amber-50 text-amber-600",
    partial: "bg-blue-50 text-blue-600",
    paid: "bg-green-50 text-green-600",
    overdue: "bg-red-50 text-red-600",
  };

  // Handle quotation click - navigate to edit
  const handleQuotationClick = (quotationId) => {
    navigate(`/quotations/edit/${quotationId}`);
  };

  // Handle delete quotation
  const handleDeleteQuotation = async (quotationId, e) => {
    e.stopPropagation(); // Prevent row click
    setDeleteId(quotationId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await quotationService.delete(deleteId);
      if (response.intStatus === 1) {
        // Remove from local state
        setQuotations(prev => prev.filter(q => q.intPkQuotationId !== deleteId));
        setDeleteId(null);
      } else {
        alert(response.strMessage || "Failed to delete quotation");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message || "Failed to delete quotation");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Delete Quotation?</h3>
            <p className="text-sm text-neutral-600 mb-6">
              This action cannot be undone. The quotation and all its items will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Reports</h1>
        <p className="text-sm text-neutral-500">View all quotations and invoices</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-4">
        <button
          onClick={() => { setActiveTab("quotations"); setSearchQuery(""); setFromDate(""); setToDate(""); }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "quotations"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Quotations ({quotations.length})
        </button>
        <button
          onClick={() => { setActiveTab("invoices"); setSearchQuery(""); setFromDate(""); setToDate(""); }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "invoices"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Invoices ({dummyInvoices.length})
        </button>
      </div>

      {/* Search & Date Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 hidden sm:inline">From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-36 bg-white border-neutral-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 hidden sm:inline">To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-36 bg-white border-neutral-200"
            />
          </div>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder={activeTab === "quotations" ? "Search by Q number or customer..." : "Search by INV number..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-neutral-200"
          />
        </div>
        {activeTab === "quotations" && (
          <Button
            variant="outline"
            size="icon"
            onClick={fetchQuotations}
            disabled={isLoadingQuotations}
            className="h-10 w-10 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingQuotations ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {/* Quotations List */}
      {activeTab === "quotations" && (
        <>
          {isLoadingQuotations ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-neutral-400 animate-spin mb-4" />
              <p className="text-sm text-neutral-500">Loading quotations...</p>
            </div>
          ) : quotationError ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-red-300 mb-4" />
              <h3 className="font-medium text-neutral-900 mb-1">Error loading quotations</h3>
              <p className="text-sm text-neutral-500 mb-4">{quotationError}</p>
              <Button variant="outline" onClick={fetchQuotations}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
              <h3 className="font-medium text-neutral-900 mb-1">No quotations found</h3>
              <p className="text-sm text-neutral-500 mb-4">
                {quotations.length === 0 ? "Create your first quotation to get started" : "Try a different search or date"}
              </p>
              {quotations.length === 0 && (
                <Button onClick={() => navigate("/quotations/new?mode=manual")}>
                  Create Quotation
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              {/* Table Header - Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-500 uppercase">
                <div className="col-span-2">Q. Number</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Items</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Items */}
              {filteredQuotations.map((q, index) => (
                <div
                  key={q.intPkQuotationId}
                  onClick={() => handleQuotationClick(q.intPkQuotationId)}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-neutral-50 cursor-pointer transition-colors ${
                    index !== filteredQuotations.length - 1 ? "border-b border-neutral-100" : ""
                  }`}
                >
                  {/* Mobile: Stacked */}
                  <div className="col-span-8 md:col-span-2">
                    <p className="font-medium text-neutral-900 text-sm">{q.strQuotationNumber}</p>
                    <p className="text-xs text-neutral-500 md:hidden">{q.strCustomerName}</p>
                  </div>

                  <div className="hidden md:block col-span-3 text-sm text-neutral-700 truncate">
                    {q.strCustomerName}
                    {q.strCustomerPhone && (
                      <span className="text-neutral-400 ml-1">({q.strCustomerPhone})</span>
                    )}
                  </div>

                  <div className="hidden md:block col-span-2 text-sm text-neutral-500">
                    {formatDate(q.datQuotationDate)}
                  </div>

                  <div className="hidden md:block col-span-1 text-sm text-neutral-500">
                    {q.intItemCount} items
                  </div>

                  <div className="hidden md:block col-span-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[q.strStatus] || statusColors.draft}`}>
                      {q.strStatus}
                    </span>
                  </div>

                  <div className="col-span-3 md:col-span-2 text-right">
                    <p className="font-semibold text-neutral-900">{formatCurrency(q.dblTotalAmount)}</p>
                    <span className={`md:hidden px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[q.strStatus] || statusColors.draft}`}>
                      {q.strStatus}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-1 flex justify-end gap-1">
                    <button
                      onClick={(e) => handleDeleteQuotation(q.intPkQuotationId, e)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-neutral-400 group-hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredQuotations.length > 0 && (
            <p className="text-sm text-neutral-500 mt-3">
              Showing {filteredQuotations.length} quotation{filteredQuotations.length !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}

      {/* Invoices List */}
      {activeTab === "invoices" && (
        <>
          {filteredInvoices.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
              <h3 className="font-medium text-neutral-900 mb-1">No invoices found</h3>
              <p className="text-sm text-neutral-500">Try a different search or date</p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              {/* Table Header - Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-500 uppercase">
                <div className="col-span-2">INV. Number</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 text-right">Amount</div>
              </div>

              {/* Items */}
              {filteredInvoices.map((i, index) => (
                <div
                  key={i.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-neutral-50 cursor-pointer ${
                    index !== filteredInvoices.length - 1 ? "border-b border-neutral-100" : ""
                  }`}
                >
                  {/* Mobile: Stacked */}
                  <div className="col-span-8 md:col-span-2">
                    <p className="font-medium text-neutral-900 text-sm">{i.invoice_number}</p>
                    <p className="text-xs text-neutral-500 md:hidden">{i.customer_name}</p>
                  </div>

                  <div className="hidden md:block col-span-3 text-sm text-neutral-700">
                    {i.customer_name}
                  </div>

                  <div className="hidden md:block col-span-2 text-sm text-neutral-500">
                    {i.created_at}
                  </div>

                  <div className="hidden md:block col-span-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[i.payment_status]}`}>
                      {i.payment_status}
                    </span>
                  </div>

                  <div className="col-span-4 md:col-span-3 text-right">
                    <p className="font-semibold text-neutral-900">{formatCurrency(i.total_amount)}</p>
                    <span className={`md:hidden px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[i.payment_status]}`}>
                      {i.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredInvoices.length > 0 && (
            <p className="text-sm text-neutral-500 mt-3">
              Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
