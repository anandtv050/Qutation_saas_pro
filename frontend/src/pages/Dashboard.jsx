import { Link } from "react-router-dom";
import { MessageSquareText, ListPlus, ArrowRight, TrendingUp, Clock } from "lucide-react";
import { dummyQuotations, dummyInvoices } from "@/data/dummyData";

export default function Dashboard() {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalCollected = dummyInvoices
    .filter(i => i.payment_status === "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const pendingAmount = dummyInvoices
    .filter(i => i.payment_status !== "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const lastQuotation = dummyQuotations[0];

  return (
    <div className="min-h-screen flex items-start justify-center">
      <div className="w-full max-w-md px-5 py-10 md:py-14">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            New Quotation
          </h1>
          <p className="text-neutral-400 text-sm mt-1">How do you want to create?</p>
        </div>

        {/* Primary Actions */}
        <div className="space-y-3">

          {/* Quick Create */}
          <Link to="/quotations/new?mode=ai" className="block group">
            <div className="rounded-2xl bg-neutral-900 p-5 transition-all duration-200 hover:bg-black active:scale-[0.99]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquareText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-white">Quick Create</h2>
                  <p className="text-neutral-400 text-sm">Type requirement, we'll make the list</p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </div>
          </Link>

          {/* Add Items */}
          <Link to="/quotations/new?mode=manual" className="block group">
            <div className="rounded-2xl bg-white border border-neutral-200 p-5 transition-all duration-200 hover:border-neutral-300 active:scale-[0.99]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ListPlus className="w-5 h-5 text-neutral-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-neutral-900">Add Items</h2>
                  <p className="text-neutral-500 text-sm">Select items one by one</p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-neutral-100"></div>

        {/* Last Quotation */}
        {lastQuotation && (
          <Link to={`/quotations/${lastQuotation.id}`} className="block group mb-6">
            <div className="flex items-center gap-3 px-1">
              <Clock className="w-4 h-4 text-neutral-300" />
              <p className="text-sm text-neutral-500 flex-1">
                <span className="text-neutral-400">Recent: </span>
                <span className="font-medium text-neutral-700">{lastQuotation.customer_name}</span>
                <span className="text-neutral-400"> · {formatCurrency(lastQuotation.total_amount)}</span>
              </p>
              {/* <span className="text-xs text-neutral-400 group-hover:text-neutral-600 transition-colors">View →</span> */}
            </div>
          </Link>
        )}

        {/* Stats */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-300" />
              <span className="text-sm font-medium text-neutral-500">This Month</span>
            </div>
            <Link to="/reports" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
              Details →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Received</p>
              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totalCollected)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Pending</p>
              <p className="text-xl font-semibold text-amber-500">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
