import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, ListPlus, ArrowRight, Loader2 } from "lucide-react";
import dashboardService from "@/services/dashboardService";

export default function Dashboard() {
  const [userName, setUserName] = useState("");
  const [summary, setSummary] = useState({
    dblTotalCollected: 0,
    dblTodayEarnings: 0,
    intTotalInvoices: 0,
    intPaidInvoices: 0,
    intTodayInvoices: 0,
    intTotalQuotations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load user name from localStorage
  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      try {
        const userData = JSON.parse(userInfo);
        setUserName(userData.strUserName || userData.strBusinessName || "");
      } catch {
        setUserName("");
      }
    }
  }, []);

  // Fetch dashboard summary from API
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await dashboardService.getSummary();
        if (response.intStatus === 1 && response.data) {
          setSummary(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard summary:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen flex items-start justify-center">
      <div className="w-full max-w-md px-5 py-8 md:py-10">

        {/* Welcome */}
        <div className="mb-6">
          <p className="text-neutral-400 text-sm">Welcome back,</p>
          <h1 className="text-xl font-semibold text-neutral-900">{userName || "User"}</h1>
        </div>

        {/* Money Stats - Simple */}
        <Link to="/reports" className="block mb-6">
          <div className="rounded-2xl bg-white border border-neutral-200 p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Collected</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.dblTotalCollected)}</p>
                  {summary.intTotalInvoices > 0 && (
                    <p className="text-xs text-neutral-400">{summary.intTotalInvoices} invoices</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Today</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.dblTodayEarnings)}</p>
                  {summary.intTodayInvoices > 0 && (
                    <p className="text-xs text-neutral-400">{summary.intTodayInvoices} invoices</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Quick Create */}
        <Link to="/quotations/new?mode=ai" className="block mb-3 group">
          <div className="rounded-xl bg-neutral-900 p-4 hover:bg-neutral-800 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <MessageSquareText className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm">Quick Create</p>
                <p className="text-neutral-400 text-xs">"2 cameras, 1 DVR, wiring..."</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>

        {/* Add Items */}
        <Link to="/quotations/new?mode=manual" className="block group">
          <div className="rounded-xl bg-white border border-neutral-200 p-4 hover:border-neutral-300 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <ListPlus className="w-[18px] h-[18px] text-neutral-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-neutral-900 text-sm">Add Items</p>
                <p className="text-neutral-500 text-xs">Pick from inventory</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400 transition-colors" />
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
