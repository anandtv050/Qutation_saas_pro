import { useState } from "react";
import { FileText, Receipt, TrendingUp, IndianRupee, Search, Phone, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dummyQuotations, dummyInvoices } from "@/data/dummyData";

const quotationStatusColors = {
  draft: "bg-neutral-100 text-neutral-600",
  sent: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-600",
  converted: "bg-blue-50 text-blue-600",
  rejected: "bg-red-50 text-red-600",
};

const invoiceStatusColors = {
  pending: "bg-amber-50 text-amber-600",
  partial: "bg-blue-50 text-blue-600",
  paid: "bg-green-50 text-green-600",
  overdue: "bg-red-50 text-red-600",
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, quotations, bills
  const [searchQuery, setSearchQuery] = useState("");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate stats
  const totalQuoted = dummyQuotations.reduce((sum, q) => sum + q.total_amount, 0);
  const totalInvoiced = dummyInvoices.reduce((sum, i) => sum + i.total_amount, 0);
  const totalCollected = dummyInvoices
    .filter(i => i.payment_status === "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);
  const pendingPayments = dummyInvoices
    .filter(i => i.payment_status === "pending" || i.payment_status === "partial")
    .reduce((sum, i) => sum + i.total_amount, 0);

  // Filtered lists
  const filteredQuotations = dummyQuotations.filter((q) =>
    q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvoices = dummyInvoices.filter((i) =>
    i.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Reports</h1>
          <p className="text-neutral-500 text-sm mt-1">Overview of your business</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "overview"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("quotations")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "quotations"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Quotations
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "bills"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Bills
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Money Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-neutral-500 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Quoted</span>
                  </div>
                  <p className="text-lg font-semibold text-neutral-900">
                    {formatCurrency(totalQuoted)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-neutral-500 mb-2">
                    <Receipt className="w-4 h-4" />
                    <span className="text-xs">Billed</span>
                  </div>
                  <p className="text-lg font-semibold text-neutral-900">
                    {formatCurrency(totalInvoiced)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Received</span>
                  </div>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(totalCollected)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <IndianRupee className="w-4 h-4" />
                    <span className="text-xs">Pending</span>
                  </div>
                  <p className="text-lg font-semibold text-amber-600">
                    {formatCurrency(pendingPayments)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quotations Summary */}
            <Card className="border-0 shadow-sm mb-4">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Quotations
                  </h2>
                  <button
                    onClick={() => setActiveTab("quotations")}
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-neutral-50 rounded-lg">
                    <p className="text-xl font-bold text-neutral-600">
                      {dummyQuotations.filter(q => q.status === "draft").length}
                    </p>
                    <p className="text-xs text-neutral-500">Draft</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <p className="text-xl font-bold text-amber-600">
                      {dummyQuotations.filter(q => q.status === "sent").length}
                    </p>
                    <p className="text-xs text-neutral-500">Sent</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">
                      {dummyQuotations.filter(q => q.status === "approved").length}
                    </p>
                    <p className="text-xs text-neutral-500">Approved</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">
                      {dummyQuotations.filter(q => q.status === "converted").length}
                    </p>
                    <p className="text-xs text-neutral-500">Converted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoices Summary */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-green-600" />
                    Bills
                  </h2>
                  <button
                    onClick={() => setActiveTab("bills")}
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <p className="text-xl font-bold text-amber-600">
                      {dummyInvoices.filter(i => i.payment_status === "pending").length}
                    </p>
                    <p className="text-xs text-neutral-500">Pending</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">
                      {dummyInvoices.filter(i => i.payment_status === "partial").length}
                    </p>
                    <p className="text-xs text-neutral-500">Partial</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">
                      {dummyInvoices.filter(i => i.payment_status === "paid").length}
                    </p>
                    <p className="text-xs text-neutral-500">Paid</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-xl font-bold text-red-600">
                      {dummyInvoices.filter(i => i.payment_status === "overdue").length}
                    </p>
                    <p className="text-xs text-neutral-500">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Quotations Tab */}
        {activeTab === "quotations" && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search quotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-neutral-200"
              />
            </div>

            {/* Quotation List */}
            <div className="space-y-2">
              {filteredQuotations.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                    <p className="text-neutral-500 text-sm">No quotations found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredQuotations.map((quotation) => (
                  <Card
                    key={quotation.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-neutral-400">
                              {quotation.quotation_number}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                quotationStatusColors[quotation.status]
                              }`}
                            >
                              {quotation.status}
                            </span>
                          </div>
                          <h3 className="font-medium text-neutral-900 mb-1">
                            {quotation.customer_name}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <Phone className="w-3 h-3" />
                            {quotation.customer_phone}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-neutral-900">
                              {formatCurrency(quotation.total_amount)}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {quotation.created_at}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* Bills Tab */}
        {activeTab === "bills" && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-neutral-200"
              />
            </div>

            {/* Invoice List */}
            <div className="space-y-2">
              {filteredInvoices.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <Receipt className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                    <p className="text-neutral-500 text-sm">No bills found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredInvoices.map((invoice) => (
                  <Card
                    key={invoice.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-neutral-400">
                              {invoice.invoice_number}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                invoiceStatusColors[invoice.payment_status]
                              }`}
                            >
                              {invoice.payment_status}
                            </span>
                          </div>
                          <h3 className="font-medium text-neutral-900 mb-1">
                            {invoice.customer_name}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <Phone className="w-3 h-3" />
                            {invoice.customer_phone}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-neutral-900">
                              {formatCurrency(invoice.total_amount)}
                            </p>
                            <p className="text-xs text-neutral-400">
                              Due: {invoice.due_date}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
