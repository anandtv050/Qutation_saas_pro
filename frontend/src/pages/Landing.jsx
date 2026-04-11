import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Zap, FileText, Shield, Receipt, Package, Check, X as XIcon, ArrowRight, Loader2 } from "lucide-react";
import planService from "@/services/planService";

const features = [
  {
    icon: Zap,
    title: "Quotations in Seconds",
    description: "Just type what you need — items, quantities, and prices are extracted instantly. Professional quotes, done in under 60 seconds."
  },
  {
    icon: Receipt,
    title: "Invoice Generation",
    description: "Convert quotations to invoices with one click. Track payment status and manage your billing effortlessly."
  },
  {
    icon: FileText,
    title: "PDF Export",
    description: "Generate beautiful, branded PDF quotations and invoices ready to share with your clients."
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Manage your products and services catalog. Auto-fill items when creating new quotations."
  },
  {
    icon: Shield,
    title: "Warranty Tracking",
    description: "Generate warranty certificates and track warranty periods for every item you sell."
  },
  {
    icon: Sparkles,
    title: "Smart AI Built-in",
    description: "AI works quietly in the background — auto-extracts items, suggests prices, and speeds up your workflow."
  },
];

const fmtPrice = (n) => new Intl.NumberFormat("en-IN").format(n);

const formatModuleAccess = (m) => {
  const blnBlocked = m.intCreate === 0 && m.intRead === 0;
  if (blnBlocked) return null;
  if (m.intDailyLimit > 0) return `${m.intDailyLimit}/day`;
  if (m.intMonthlyLimit > 0) return `${m.intMonthlyLimit}/month`;
  if (m.intCreate === -1) return "Unlimited";
  return "Included";
};

export default function Landing() {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    planService.getAllActive().then((res) => {
      if (res.lstPlans) setPlans(res.lstPlans);
    }).catch(() => {}).finally(() => setPlansLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-neutral-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">Q</span>
              </div>
              <span className="font-semibold text-lg text-neutral-900">Quotely</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <a href="#features" className="text-sm text-neutral-600 hover:text-black transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-neutral-600 hover:text-black transition-colors">Pricing</a>
              <Link to="/login" className="text-sm font-medium text-neutral-700 hover:text-black transition-colors">Sign in</Link>
              <Link
                to="/signup"
                className="px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
            <div className="sm:hidden flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-neutral-700">Sign in</Link>
              <Link to="/signup" className="px-3 py-1.5 text-sm font-semibold bg-black text-white rounded-lg">Try Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-neutral-100 via-neutral-50 to-white overflow-hidden">
        {/* Soft glow blob */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-neutral-200/50 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-neutral-200 rounded-full mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-medium text-neutral-600">Quotation Software for All Service Businesses</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black leading-tight tracking-tight mb-6">
            Professional quotations{" "}
            <span className="text-neutral-400">in seconds</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create quotations, invoices, and manage inventory — all in one place.
            GST-ready, PDF export, built for speed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-black text-white rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-center shadow-sm"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-4 text-sm text-neutral-400">No credit card required. 7-day free trial.</p>
        </div>

        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 20C960 40 1200 60 1440 40V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Everything you need to quote & invoice</h2>
            <p className="text-lg text-neutral-500 max-w-xl mx-auto">
              From quotation to payment — manage your entire sales workflow in one simple tool.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-neutral-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">{feature.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-neutral-500">Start free, upgrade when you're ready. No hidden fees.</p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-center text-neutral-400 py-12">Plans coming soon.</p>
          ) : (
            <div className={`grid grid-cols-1 ${plans.length > 2 ? "md:grid-cols-3" : plans.length > 1 ? "md:grid-cols-2" : ""} gap-6 max-w-5xl mx-auto`}>
              {plans.map((plan, i) => {
                const blnFree = plan.dblPriceMonthly === 0;
                const blnHighlighted = i === 1 && plans.length > 1;
                return (
                  <div
                    key={plan.intPlanId}
                    className={`relative p-6 rounded-xl border-2 ${
                      blnHighlighted
                        ? "border-black bg-gradient-to-br from-neutral-900 via-black to-neutral-800 text-white shadow-2xl shadow-black/20"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    {blnHighlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-xs font-semibold rounded-full shadow-sm">
                        Most Popular
                      </div>
                    )}
                    <h3 className={`text-lg font-semibold mb-1 ${blnHighlighted ? "text-white" : "text-black"}`}>
                      {plan.strDisplayName}
                    </h3>
                    <div className="mb-6 mt-3">
                      <span className={`text-3xl font-bold ${blnHighlighted ? "text-white" : "text-black"}`}>
                        {blnFree ? "Free" : `\u20B9${fmtPrice(plan.dblPriceMonthly)}`}
                      </span>
                      {!blnFree && (
                        <span className={`text-sm ml-1 ${blnHighlighted ? "text-neutral-300" : "text-neutral-500"}`}>
                          /month
                        </span>
                      )}
                      {plan.dblPriceYearly > 0 && (
                        <p className={`text-xs mt-1 ${blnHighlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                          {`\u20B9${fmtPrice(plan.dblPriceYearly)}/year`}
                        </p>
                      )}
                      {blnFree && (
                        <p className={`text-xs mt-1 ${blnHighlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                          7-day trial
                        </p>
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
                        <li className="flex items-start gap-2">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${blnHighlighted ? "text-green-400" : "text-green-600"}`} />
                          <span className={`text-sm ${blnHighlighted ? "text-neutral-200" : "text-neutral-600"}`}>
                            All features included
                          </span>
                        </li>
                      )}
                    </ul>

                    <Link
                      to="/signup"
                      className={`block w-full py-2.5 text-sm font-semibold text-center rounded-lg transition-colors ${
                        blnHighlighted
                          ? "bg-white text-black hover:bg-neutral-100"
                          : "bg-black text-white hover:bg-neutral-800"
                      }`}
                    >
                      Start Free Trial
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-6 px-4 sm:px-6 lg:px-8 border-t border-neutral-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">Q</span>
            </div>
            <span className="text-sm font-medium text-neutral-600">Quotely</span>
          </div>
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Quotely
          </p>
        </div>
      </footer>
    </div>
  );
}
