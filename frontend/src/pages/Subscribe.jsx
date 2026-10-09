import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X as XIcon, Loader2, AlertCircle, MessageCircle, Mail, ArrowLeft, Star } from "lucide-react";
import subscriptionService from "@/services/subscriptionService";
import loadRazorpay from "@/lib/loadRazorpay";
import { FOUNDING_OFFER, PRICE_NOTE, formatInr, whatsappLink } from "@/lib/pricing";
import { PLANS as SITE_PLANS } from "@/marketing/site";

const SUPPORT_EMAIL = "supportquotely@gmail.com";
const HIGHLIGHT_PLAN = "pro"; // "Most popular"

// UI-only pricing for now: plans come from the shared frontend list (src/marketing/site.js),
// not the API, until the backend/DB pricing change (misc/pricing-2026-10) is applied.
// Payment is manual (WhatsApp/UPI) and recorded by admin, so the DB price is not charged here.
const UI_PLANS = SITE_PLANS.map((p) => ({
  intPlanId: p.key,
  strPlanName: p.key,
  strDisplayName: p.name,
  strDescription: p.tagline,
  dblPriceMonthly: p.priceMonthly,
  dblPriceYearly: p.priceYearly,
  jsonbFeaturesDisplay: [
    ...p.features.map((label) => ({ label, included: true })),
    ...p.excluded.map((label) => ({ label, included: false })),
  ],
}));

export default function Subscribe() {
  const plans = UI_PLANS;
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const blnPlansFailed = false;
  const [blnYearly, setBlnYearly] = useState(true);
  const [, setPayingPlanId] = useState(null);
  const [error, setError] = useState("");

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const blnExpired = currentStatus?.strStatus === "expired";

  // Block browser back to dashboard when expired (the app is locked until renewal)
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
      const [statusRes] = await Promise.allSettled([subscriptionService.getStatus()]);

      if (statusRes.status === "fulfilled") {
        setCurrentStatus(statusRes.value);
      } else if (statusRes.reason?.response?.status === 402) {
        setCurrentStatus({ strStatus: "expired" });
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Razorpay payment (kept for future implementation; WhatsApp/UPI is the current flow)
  // eslint-disable-next-line no-unused-vars
  const handleSubscribe = async (intPlanId) => {
    setError("");
    setPayingPlanId(intPlanId);

    try {
      const [order] = await Promise.all([subscriptionService.createOrder(intPlanId), loadRazorpay()]);

      const options = {
        key: order.strKeyId,
        amount: order.dblAmount * 100,
        currency: order.strCurrency,
        name: "Quotely Pro",
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
          } catch {
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: { email: userInfo.strEmail || "" },
        theme: { color: "#000000" },
        modal: { ondismiss: () => setPayingPlanId(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError("");
      setPayingPlanId(null);
    }
  };

  const strWho = `\nEmail: ${userInfo.strEmail || "N/A"}\nName: ${userInfo.strUserName || "N/A"}`;

  const fnPlanMessage = (plan) => {
    const strPeriod = blnYearly ? "yearly" : "monthly";
    const strPrice = blnYearly
      ? `₹${formatInr(plan.dblPriceYearly)}/year`
      : `₹${formatInr(plan.dblPriceMonthly)}/month`;
    return `Hi, I'd like to subscribe to the *${plan.strDisplayName}* plan on Quotely Pro, billed *${strPeriod}* (${strPrice}).${strWho}\n\nPlease share the payment details.`;
  };

  const fnOpenWhatsApp = (plan) => window.open(whatsappLink(fnPlanMessage(plan)), "_blank");

  const fnOpenFoundingOffer = () =>
    window.open(
      whatsappLink(
        `Hi, I'd like the Quotely Pro *founding offer*: Pro yearly at ₹${formatInr(FOUNDING_OFFER.dblPriceYearly)}, price locked for life.${strWho}`
      ),
      "_blank"
    );

  const fnOpenEmail = (plan) => {
    const strSubject = encodeURIComponent(`Quotely Pro - ${plan.strDisplayName} plan (${blnYearly ? "yearly" : "monthly"})`);
    const strBody = encodeURIComponent(fnPlanMessage(plan).replace(/\*/g, ""));
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${strSubject}&body=${strBody}`, "_blank");
  };

  const fnHandleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userInfo");
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-100 via-neutral-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-white">
      {/* Top bar */}
      <div className="border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-semibold text-neutral-900">Quotely Pro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-neutral-500 hover:text-black transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <button onClick={fnHandleLogout} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          {blnExpired ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Your plan has expired</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">Choose a plan to continue</h1>
              <p className="text-neutral-500 max-w-md mx-auto">
                Your data is safe. Pick a plan and get back to creating quotations in seconds.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">Choose your plan</h1>
              <p className="text-neutral-500">Simple pricing. {PRICE_NOTE}</p>
            </>
          )}
        </div>

        {/* Monthly / yearly toggle (yearly default) */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full border border-neutral-200 bg-white p-1" role="group" aria-label="Billing period">
            <button
              type="button"
              onClick={() => setBlnYearly(false)}
              aria-pressed={!blnYearly}
              className={`px-4 py-1.5 text-sm font-medium rounded-full ${!blnYearly ? "bg-black text-white" : "text-neutral-600"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBlnYearly(true)}
              aria-pressed={blnYearly}
              className={`px-4 py-1.5 text-sm font-medium rounded-full ${blnYearly ? "bg-black text-white" : "text-neutral-600"}`}
            >
              Yearly <span className={`ml-1 text-xs ${blnYearly ? "text-green-300" : "text-green-700"}`}>2 months free</span>
            </button>
          </div>
        </div>

        {/* Founding offer banner */}
        <div className="max-w-3xl mx-auto mb-10 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <p className="text-sm font-medium text-amber-900 flex items-start gap-2">
            <Star className="w-4 h-4 mt-0.5 shrink-0" />
            {FOUNDING_OFFER.strBanner}
          </p>
          <button
            onClick={fnOpenFoundingOffer}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          >
            <MessageCircle className="w-4 h-4" />
            Claim on WhatsApp
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-3.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {blnPlansFailed ? (
          <div className="max-w-md mx-auto text-center p-6 bg-white border border-neutral-200 rounded-2xl">
            <p className="text-neutral-700 mb-4">We couldn't load the plans right now. Message us and we'll help you choose.</p>
            <a
              href={whatsappLink(`Hi, I'd like to subscribe to Quotely Pro.${strWho}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp us
            </a>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${plans.length > 2 ? "md:grid-cols-3" : plans.length > 1 ? "md:grid-cols-2" : ""} gap-6 max-w-5xl mx-auto`}>
            {plans.map((plan) => {
              const blnHighlighted = plan.strPlanName === HIGHLIGHT_PLAN;
              const lstFeatures = Array.isArray(plan.jsonbFeaturesDisplay) ? plan.jsonbFeaturesDisplay : [];
              return (
                <div
                  key={plan.intPlanId}
                  className={`relative p-6 rounded-2xl border-2 transition-all flex flex-col ${
                    blnHighlighted
                      ? "border-black bg-gradient-to-br from-neutral-900 via-black to-neutral-800 text-white shadow-2xl shadow-black/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md"
                  }`}
                >
                  {blnHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-xs font-semibold rounded-full shadow-sm">
                      Most popular
                    </div>
                  )}
                  <h3 className={`text-lg font-semibold ${blnHighlighted ? "text-white" : "text-black"}`}>{plan.strDisplayName}</h3>
                  {plan.strDescription && (
                    <p className={`text-sm mt-1 ${blnHighlighted ? "text-neutral-300" : "text-neutral-500"}`}>{plan.strDescription}</p>
                  )}
                  <div className="mb-6 mt-4">
                    {blnYearly ? (
                      <>
                        <span className="text-3xl font-bold">₹{formatInr(plan.dblPriceYearly)}</span>
                        <span className={`text-sm ml-1 ${blnHighlighted ? "text-neutral-300" : "text-neutral-500"}`}>/year</span>
                        <p className={`text-xs mt-1 ${blnHighlighted ? "text-neutral-400" : "text-neutral-500"}`}>
                          or ₹{formatInr(plan.dblPriceMonthly)}/month billed monthly
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">₹{formatInr(plan.dblPriceMonthly)}</span>
                        <span className={`text-sm ml-1 ${blnHighlighted ? "text-neutral-300" : "text-neutral-500"}`}>/month</span>
                        <p className={`text-xs mt-1 ${blnHighlighted ? "text-neutral-400" : "text-neutral-500"}`}>
                          or ₹{formatInr(plan.dblPriceYearly)}/year (2 months free)
                        </p>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {lstFeatures.map((f) => (
                      <li key={f.label} className="flex items-start gap-2">
                        {f.included === false ? (
                          <XIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-neutral-600" : "text-neutral-300"}`} />
                        ) : (
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                        )}
                        <span
                          className={`text-sm ${
                            f.included === false
                              ? `line-through ${blnHighlighted ? "text-neutral-500" : "text-neutral-400"}`
                              : blnHighlighted ? "text-neutral-200" : "text-neutral-600"
                          }`}
                        >
                          {f.label}
                          {f.note && f.included !== false ? ` (${f.note})` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    <button
                      onClick={() => fnOpenWhatsApp(plan)}
                      className={`w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                        blnHighlighted
                          ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Choose {plan.strDisplayName} {blnYearly ? "yearly" : "monthly"} on WhatsApp
                    </button>
                    <button
                      onClick={() => fnOpenEmail(plan)}
                      className={`w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                        blnHighlighted ? "bg-white/10 text-white hover:bg-white/20" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Email us
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom info */}
        <div className="text-center mt-10">
          <p className="text-sm text-neutral-500">
            {PRICE_NOTE} Pay by UPI or bank transfer, and we activate your plan once payment is received.
          </p>
        </div>
      </div>
    </div>
  );
}
