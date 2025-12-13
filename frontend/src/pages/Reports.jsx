import { useState, useMemo } from "react";
import { Search, FileText, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dummyQuotations, dummyInvoices } from "@/data/dummyData";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("quotations");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    return dummyQuotations.filter(q => {
      const matchesSearch = !searchQuery.trim() ||
        q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const dateValue = q.created_at;
      const matchesFromDate = !fromDate || dateValue >= fromDate;
      const matchesToDate = !toDate || dateValue <= toDate;
      return matchesSearch && matchesFromDate && matchesToDate;
    });
  }, [searchQuery, fromDate, toDate]);

  // Filter invoices
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
    converted: "bg-blue-50 text-blue-600",
    rejected: "bg-red-50 text-red-600",
    // Invoice statuses
    pending: "bg-amber-50 text-amber-600",
    partial: "bg-blue-50 text-blue-600",
    paid: "bg-green-50 text-green-600",
    overdue: "bg-red-50 text-red-600",
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
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
          Quotations ({dummyQuotations.length})
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
            placeholder={activeTab === "quotations" ? "Search by Q number..." : "Search by INV number..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-neutral-200"
          />
        </div>
      </div>

      {/* Quotations List */}
      {activeTab === "quotations" && (
        <>
          {filteredQuotations.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
              <h3 className="font-medium text-neutral-900 mb-1">No quotations found</h3>
              <p className="text-sm text-neutral-500">Try a different search or date</p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              {/* Table Header - Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-500 uppercase">
                <div className="col-span-2">Q. Number</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 text-right">Amount</div>
              </div>

              {/* Items */}
              {filteredQuotations.map((q, index) => (
                <div
                  key={q.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-neutral-50 cursor-pointer ${
                    index !== filteredQuotations.length - 1 ? "border-b border-neutral-100" : ""
                  }`}
                >
                  {/* Mobile: Stacked */}
                  <div className="col-span-8 md:col-span-2">
                    <p className="font-medium text-neutral-900 text-sm">{q.quotation_number}</p>
                    <p className="text-xs text-neutral-500 md:hidden">{q.customer_name}</p>
                  </div>

                  <div className="hidden md:block col-span-3 text-sm text-neutral-700">
                    {q.customer_name}
                  </div>

                  <div className="hidden md:block col-span-2 text-sm text-neutral-500">
                    {q.created_at}
                  </div>

                  <div className="hidden md:block col-span-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[q.status]}`}>
                      {q.status}
                    </span>
                  </div>

                  <div className="col-span-4 md:col-span-3 text-right">
                    <p className="font-semibold text-neutral-900">{formatCurrency(q.total_amount)}</p>
                    <span className={`md:hidden px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[q.status]}`}>
                      {q.status}
                    </span>
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
