import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, ListPlus, ArrowRight, Loader2, LayoutDashboard, Clock, AlertTriangle, Sparkles } from "lucide-react";
import dashboardService from "@/services/dashboardService";
import subscriptionService from "@/services/subscriptionService";

export default function Dashboard() {
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [summary, setSummary] = useState({
    dblTotalCollected: 0,
    dblTodayEarnings: 0,
    intTotalInvoices: 0,
    intPaidInvoices: 0,
    intTodayInvoices: 0,
    intTotalQuotations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  // Load user name from localStorage
  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      try {
        const userData = JSON.parse(userInfo);
        setUserName(userData.strUserName || userData.strBusinessName || "");
        setIsAdmin(userData.intUserId === 1);
      } catch {
        setUserName("");
      }
    }
  }, []);

  // Fetch dashboard summary and subscription status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, subRes] = await Promise.allSettled([
          dashboardService.getSummary(),
          subscriptionService.getStatus(),
        ]);
        if (summaryRes.status === "fulfilled" && summaryRes.value.intStatus === 1 && summaryRes.value.data) {
          setSummary(summaryRes.value.data);
        }
        if (subRes.status === "fulfilled") {
          setSubscription(subRes.value);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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

        {/* Subscription Banner */}
        {subscription && !isAdmin && (
          <>
            {subscription.strStatus === "trial" && (
              <div className={`relative overflow-hidden rounded-2xl p-5 mb-5 ${
                subscription.intDaysRemaining <= 2
                  ? "bg-gradient-to-br from-red-600 via-red-500 to-orange-500"
                  : "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900"
              }`}>
                {/* Subtle glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

                <div className="relative flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    subscription.intDaysRemaining <= 2 ? "bg-white/20" : "bg-white/10"
                  }`}>
                    {subscription.intDaysRemaining <= 2 ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white/80" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {subscription.intDaysRemaining <= 2
                        ? `Only ${subscription.intDaysRemaining} days left!`
                        : `${subscription.intDaysRemaining} days left in free trial`
                      }
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {subscription.intDaysRemaining <= 2
                        ? "Upgrade now to keep your data"
                        : "Unlock all features with a plan"
                      }
                    </p>
                  </div>
                  <Link
                    to="/subscribe"
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex-shrink-0 ${
                      subscription.intDaysRemaining <= 2
                        ? "bg-white text-red-600 hover:bg-red-50 shadow-lg shadow-red-900/20"
                        : "bg-white text-black hover:bg-neutral-100 shadow-lg shadow-black/20"
                    }`}
                  >
                    Upgrade
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="relative mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      subscription.intDaysRemaining <= 2 ? "bg-white/60" : "bg-white/30"
                    }`}
                    style={{ width: `${Math.max(5, ((7 - subscription.intDaysRemaining) / 7) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {subscription.strStatus === "active" && subscription.intDaysRemaining <= 7 && (
              <div className="relative overflow-hidden rounded-2xl p-5 mb-5 bg-gradient-to-br from-amber-500 via-amber-400 to-orange-400">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      Subscription expires in {subscription.intDaysRemaining} days
                    </p>
                    <p className="text-xs text-white/60 mt-0.5">Renew to continue uninterrupted</p>
                  </div>
                  <Link
                    to="/subscribe"
                    className="px-4 py-2 text-xs font-semibold bg-white text-amber-700 rounded-lg hover:bg-amber-50 shadow-lg shadow-amber-900/20 flex-shrink-0"
                  >
                    Renew
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

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

        {/* Admin Quick Link */}
        {isAdmin && (
          <Link to="/admin" className="block mt-6 group">
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 hover:border-purple-300 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="w-[18px] h-[18px] text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-purple-900 text-sm">Admin Dashboard</p>
                  <p className="text-purple-500 text-xs">Monitor users & usage</p>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-300 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
          </Link>
        )}

      </div>
    </div>
  );
}
