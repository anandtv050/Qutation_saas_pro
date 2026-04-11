import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X as XIcon, Loader2, AlertCircle, MessageCircle, Mail, ArrowLeft, Sparkles, Zap, Shield } from "lucide-react";
import subscriptionService from "@/services/subscriptionService";
import planService from "@/services/planService";

const WHATSAPP_NUMBER = "919876543210"; // Change to your number
const SUPPORT_EMAIL = "supportquotely@gmail.com";

const formatModuleAccess = (m) => {
  const blnBlocked = m.intCreate === 0 && m.intRead === 0;
  if (blnBlocked) return null;
  if (m.intDailyLimit > 0) return `${m.intDailyLimit}/day`;
  if (m.intMonthlyLimit > 0) return `${m.intMonthlyLimit}/month`;
  if (m.intCreate === -1) return "Unlimited";
  return "Included";
};

// Hardcoded plans fallback when API doesn't return plans
const FALLBACK_PLANS = [
  {
    intPlanId: 0,
    strDisplayName: "Free",
    dblPriceMonthly: 0,
    dblPriceYearly: 0,
    features: [
      "Unlimited quotations",
      "Unlimited invoices",
      "Inventory management",
      "5 AI Quick Create/day",
    ],
    blocked: ["Warranty certificates", "Reports", "Custom print formats"],
  },
  {
    intPlanId: 1,
    strDisplayName: "Standard",
    dblPriceMonthly: 1999,
    dblPriceYearly: 19999,
    features: [
      "Unlimited quotations",
      "Unlimited invoices",
      "Inventory management",
      "Unlimited AI Quick Create",
      "Warranty certificates",
      "Reports",
      "Custom print formats",
      "All future updates",
    ],
    blocked: [],
  },
  {
    intPlanId: 2,
    strDisplayName: "Premium",
    dblPriceMonthly: 3999,
    dblPriceYearly: 39999,
    features: [
      "Everything in Standard",
      "Up to 3 users",
      "Unlimited AI Quick Create",
      "Unlimited print formats",
      "Priority support",
      "All future updates",
    ],
    blocked: [],
  },
];

export default function Subscribe() {
  const [plans, setPlans] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState(null);
  const [error, setError] = useState("");

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const blnExpired = currentStatus?.strStatus === "expired";

  // Block browser back to dashboard when expired
  useEffect(() => {
    if (blnExpired) {
      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [blnExpired]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, planRes] = await Promise.allSettled([
        subscriptionService.getStatus(),
        planService.getActive(),
      ]);

      if (statusRes.status === "fulfilled") {
        setCurrentStatus(statusRes.value);
      } else if (statusRes.reason?.response?.status === 402) {
        setCurrentStatus({ strStatus: "expired" });
      }

      if (planRes.status === "fulfilled" && planRes.value.lstPlans && planRes.value.lstPlans.length > 0) {
        setPlans(planRes.value.lstPlans);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Razorpay payment (kept for future implementation)
  const handleSubscribe = async (intPlanId) => {
    setError("");
    setPayingPlanId(intPlanId);

    try {
      const order = await subscriptionService.createOrder(intPlanId);

      const options = {
        key: order.strKeyId,
        amount: order.dblAmount * 100,
        currency: order.strCurrency,
        name: "Quotely",
        description: `${order.strPlanName} - Annual Subscription`,
        order_id: order.strOrderId,
        handler: async function (response) {
          try {
            await subscriptionService.verifyPayment({
              strRazorpayPaymentId: response.razorpay_payment_id,
              strRazorpayOrderId: response.razorpay_order_id,
              strRazorpaySignature: response.razorpay_signature,
              intPlanId: intPlanId,
            });
            window.location.href = "/dashboard";
          } catch (err) {
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: { email: userInfo.strEmail || "" },
        theme: { color: "#000000" },
        modal: { ondismiss: () => setPayingPlanId(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError("");
      setPayingPlanId(null);
    }
  };

  const fnOpenWhatsApp = (strPlanName) => {
    const strMessage = encodeURIComponent(
      `Hi, I'd like to upgrade to the *${strPlanName}* plan on Quotely.\n\nEmail: ${userInfo.strEmail || "N/A"}\nName: ${userInfo.strUserName || "N/A"}\n\nPlease help me with the payment process.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${strMessage}`, "_blank");
  };

  const fnOpenEmail = (strPlanName) => {
    const strSubject = encodeURIComponent(`Quotely - Upgrade to ${strPlanName}`);
    const strBody = encodeURIComponent(
      `Hi,\n\nI'd like to upgrade to the ${strPlanName} plan on Quotely.\n\nEmail: ${userInfo.strEmail || "N/A"}\nName: ${userInfo.strUserName || "N/A"}\n\nPlease help me with the payment process.\n\nThank you.`
    );
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${strSubject}&body=${strBody}`, "_blank");
  };

  const fnHandleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userInfo");
    window.location.href = "/login";
  };

  const fmtPrice = (n) => new Intl.NumberFormat("en-IN").format(n);

  // Use API plans if available, otherwise fallback
  const displayPlans = plans.length > 0 ? null : FALLBACK_PLANS;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-100 via-neutral-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-white">
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>

      {/* Top bar */}
      <div className="border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-semibold text-neutral-900">Quotely</span>
          </Link>
          <div className="flex items-center gap-4">
            {!blnExpired && (
              <Link to="/dashboard" className="text-sm text-neutral-500 hover:text-black transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </Link>
            )}
            <button
              onClick={fnHandleLogout}
              className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          {blnExpired ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Your trial has ended</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">Choose a plan to continue</h1>
              <p className="text-neutral-500 max-w-md mx-auto">Your data is safe. Pick a plan and get back to creating quotations in seconds.</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">Upgrade your plan</h1>
              <p className="text-neutral-500">Unlock all features and grow your business faster.</p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-3.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Plan Cards — API plans */}
        {plans.length > 0 ? (
          <div className={`grid grid-cols-1 ${plans.length > 2 ? "md:grid-cols-3" : plans.length > 1 ? "md:grid-cols-2" : ""} gap-6 max-w-5xl mx-auto`}>
            {plans.map((plan, i) => {
              const blnFree = plan.dblPriceMonthly === 0;
              const blnHighlighted = i === 1 && plans.length > 1;
              return (
                <div
                  key={plan.intPlanId}
                  className={`relative p-6 rounded-2xl border-2 transition-all ${
                    blnHighlighted
                      ? "border-black bg-gradient-to-br from-neutral-900 via-black to-neutral-800 text-white shadow-2xl shadow-black/20 scale-[1.02]"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md"
                  }`}
                >
                  {blnHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-xs font-semibold rounded-full shadow-sm">
                      Recommended
                    </div>
                  )}
                  <h3 className={`text-lg font-semibold mb-1 ${blnHighlighted ? "text-white" : "text-black"}`}>
                    {plan.strDisplayName}
                  </h3>
                  <div className="mb-6 mt-3">
                    {blnFree ? (
                      <>
                        <span className="text-3xl font-bold">Free</span>
                        <p className="text-xs mt-1 text-neutral-400">7-day trial</p>
                      </>
                    ) : (
                      <>
                        <span className={`text-3xl font-bold ${blnHighlighted ? "text-white" : "text-black"}`}>
                          {`\u20B9${fmtPrice(plan.dblPriceMonthly)}`}
                        </span>
                        <span className={`text-sm ml-1 ${blnHighlighted ? "text-neutral-300" : "text-neutral-500"}`}>/month</span>
                        {plan.dblPriceYearly > 0 && (
                          <p className={`text-xs mt-1 ${blnHighlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                            {`\u20B9${fmtPrice(plan.dblPriceYearly)}/year`}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.lstModules && plan.lstModules.length > 0 ? (
                      plan.lstModules.map((m) => {
                        const strValue = formatModuleAccess(m);
                        const blnBlocked = m.intCreate === 0 && m.intRead === 0;
                        return (
                          <li key={m.strModuleKey} className="flex items-start gap-2">
                            {blnBlocked ? (
                              <XIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-neutral-600" : "text-neutral-300"}`} />
                            ) : (
                              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                            )}
                            <span className={`text-sm ${
                              blnBlocked
                                ? (blnHighlighted ? "text-neutral-500 line-through" : "text-neutral-400 line-through")
                                : (blnHighlighted ? "text-neutral-200" : "text-neutral-600")
                            }`}>
                              {strValue ? `${strValue} ` : ""}{m.strDisplayName}
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                          <span className={`text-sm ${blnHighlighted ? "text-neutral-200" : "text-neutral-600"}`}>
                            {plan.intMaxQuotationsPerMonth === -1 ? "Unlimited" : plan.intMaxQuotationsPerMonth} quotations
                          </span>
                        </li>
                        {plan.blnAiEnabled && (
                          <li className="flex items-start gap-2">
                            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                            <span className={`text-sm ${blnHighlighted ? "text-neutral-200" : "text-neutral-600"}`}>Smart Quick Create</span>
                          </li>
                        )}
                      </>
                    )}
                    <li className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                      <span className={`text-sm ${blnHighlighted ? "text-neutral-200" : "text-neutral-600"}`}>All future updates</span>
                    </li>
                  </ul>

                  {!blnFree && (
                    <div className="space-y-2">
                      <button
                        onClick={() => fnOpenWhatsApp(plan.strDisplayName)}
                        className={`w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                          blnHighlighted
                            ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Subscribe via WhatsApp
                      </button>
                      <button
                        onClick={() => fnOpenEmail(plan.strDisplayName)}
                        className={`w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                          blnHighlighted
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        Email Us
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback hardcoded plans */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FALLBACK_PLANS.map((plan, i) => {
              const blnFree = plan.dblPriceMonthly === 0;
              const blnHighlighted = i === 1;
              return (
                <div
                  key={plan.intPlanId}
                  className={`relative p-6 rounded-2xl border-2 transition-all ${
                    blnHighlighted
                      ? "border-black bg-gradient-to-br from-neutral-900 via-black to-neutral-800 text-white shadow-2xl shadow-black/20 scale-[1.02]"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md"
                  }`}
                >
                  {blnHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-xs font-semibold rounded-full shadow-sm">
                      Most Popular
                    </div>
                  )}
                  <h3 className={`text-lg font-semibold mb-1 ${blnHighlighted ? "text-white" : "text-black"}`}>
                    {plan.strDisplayName}
                  </h3>
                  <div className="mb-6 mt-3">
                    {blnFree ? (
                      <>
                        <span className="text-3xl font-bold">Free</span>
                        <p className="text-xs mt-1 text-neutral-400">7-day trial</p>
                      </>
                    ) : (
                      <>
                        <span className={`text-3xl font-bold ${blnHighlighted ? "text-white" : "text-black"}`}>
                          {`\u20B9${fmtPrice(plan.dblPriceMonthly)}`}
                        </span>
                        <span className={`text-sm ml-1 ${blnHighlighted ? "text-neutral-300" : "text-neutral-500"}`}>/month</span>
                        <p className={`text-xs mt-1 ${blnHighlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                          {`\u20B9${fmtPrice(plan.dblPriceYearly)}/year`}
                        </p>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                        <span className={`text-sm ${blnHighlighted ? "text-neutral-200" : "text-neutral-600"}`}>{f}</span>
                      </li>
                    ))}
                    {plan.blocked.map((f, j) => (
                      <li key={`b-${j}`} className="flex items-start gap-2">
                        <XIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-neutral-600" : "text-neutral-300"}`} />
                        <span className={`text-sm line-through ${blnHighlighted ? "text-neutral-500" : "text-neutral-400"}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {!blnFree && (
                    <div className="space-y-2">
                      <button
                        onClick={() => fnOpenWhatsApp(plan.strDisplayName)}
                        className={`w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                          blnHighlighted
                            ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Subscribe via WhatsApp
                      </button>
                      <button
                        onClick={() => fnOpenEmail(plan.strDisplayName)}
                        className={`w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                          blnHighlighted
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        Email Us
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom info */}
        <div className="text-center mt-10 space-y-4">
          <p className="text-sm text-neutral-400">
            Pay via UPI, bank transfer, or any method. We'll activate your plan within minutes.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secure payment</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Instant activation</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
