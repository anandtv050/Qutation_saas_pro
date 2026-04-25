import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Zap, FileText, Shield, Receipt, Package, ChevronRight, ArrowRight, MessageCircle, Mail, Phone, Camera, Plug, Sun, Wrench, Wifi, Flame, PaintBucket, Home, Plus, Minus } from "lucide-react";

const BOOK_DEMO_URL = import.meta.env.VITE_BOOK_DEMO_URL || "https://wa.me/918848644935?text=Hi%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20Quotely";

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

const PLANS = [
  {
    name: "Free Trial",
    priceDisplay: "Free",
    periodSuffix: null,
    yearlyNote: "7 days · No credit card",
    features: [
      "Full access to Standard plan",
      "Personal onboarding call",
      "All features unlocked for 7 days",
      "Cancel anytime",
    ],
    highlighted: false,
  },
  {
    name: "Standard",
    priceDisplay: "₹1,999",
    offerPrice: "₹1,499",
    offerLabel: "Early Bird Offer",
    periodSuffix: "/month",
    yearlyOriginal: "₹19,999",
    yearlyOffer: "₹14,999",
    features: [
      "Quotations access",
      "Invoices access",
      "Inventory access",
      "AI Quick Create access",
      "Warranty Certificates",
      "Dashboard Analytics",
      "Reports (read-only)",
      "Print Customization",
    ],
    featuresNote: "All features are limited. Upgrade to Premium for unlimited access.",
    highlighted: true,
  },
  {
    name: "Premium",
    priceDisplay: "₹3,999",
    offerPrice: "₹2,499",
    offerLabel: "Early Bird Offer",
    periodSuffix: "/month",
    yearlyOriginal: "₹39,999",
    yearlyOffer: "₹24,999",
    features: [
      "Unlimited Quotations",
      "Unlimited Invoices",
      "Unlimited Inventory",
      "Unlimited AI Quick Create",
      "Full Reports with Export",
      "Unlimited Print Templates",
      "Priority Support",
      "Custom Onboarding",
    ],
    customNote: "Custom plans available on request",
    highlighted: false,
  },
];

const USE_CASES = [
  { icon: Camera,      title: "CCTV Installation",    desc: "Camera + DVR + cabling quotes with HSN codes" },
  { icon: Plug,        title: "Electrical Services",  desc: "Wiring, panel, fitting estimates in seconds" },
  { icon: Sun,         title: "Solar Installation",   desc: "Panel, inverter, battery quotations with subsidies" },
  { icon: Wrench,      title: "Plumbing Work",        desc: "Materials + labour quotes for any project" },
  { icon: Wifi,        title: "Networking & IT",      desc: "Switch, router, structured cabling proposals" },
  { icon: Flame,       title: "Fire Safety",          desc: "Extinguisher, alarm, sprinkler installation quotes" },
  { icon: PaintBucket, title: "Painting & Interior",  desc: "Area-based pricing with material & labour split" },
  { icon: Home,        title: "AC / HVAC Service",    desc: "Installation, AMC and service quotations" },
];

const FAQS = [
  {
    q: "What is Quotely?",
    a: "Quotely is AI-powered quotation software for service businesses in India. You can create GST-ready quotations, invoices and warranty certificates in under 60 seconds — built for CCTV installers, electricians, solar installers, plumbers, AC technicians, networking teams, fire-safety contractors, painters and every service team.",
  },
  {
    q: "How do I create a CCTV or electrical quotation with Quotely?",
    a: "Type what your customer needs in plain language — camera count, channels, cabling, installation hours. Quotely's AI extracts every line item and price instantly, applies your branding and GST details, and generates a shareable PDF. The whole process takes under 60 seconds.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Quotely offers a 7-day free trial with full access to all Standard plan features. No credit card required — book a demo on WhatsApp and we onboard your account personally.",
  },
  {
    q: "Does Quotely support GST and HSN codes?",
    a: "Yes. Every quotation and invoice is GST-ready, with HSN codes, IGST/CGST/SGST split, your GSTIN, and a clean print-ready layout that meets Indian tax requirements.",
  },
  {
    q: "What service businesses use Quotely?",
    a: "Quotely is built for every service team — CCTV installers, electricians, solar installers, plumbers, AC and HVAC technicians, networking and IT teams, fire-safety contractors, painters, interior designers, civil contractors and more.",
  },
  {
    q: "How fast is the AI quotation generator?",
    a: "Under 60 seconds. Type what your customer asked for in plain language and Quotely's AI turns it into a professional, branded, GST-ready PDF quote ready to send on WhatsApp or email.",
  },
  {
    q: "Can I customise quotation and invoice templates?",
    a: "Yes. The Standard plan includes 3 print customisations per month; Premium gives unlimited templates with full branding control — logo, colours, header, footer, terms and signature.",
  },
  {
    q: "How much does Quotely cost?",
    a: "Free Trial — 7 days, no card. Standard — ₹1,499/month or ₹14,999/year (Early Bird Offer). Premium — ₹2,499/month or ₹24,999/year (Early Bird Offer), with custom plans available on request.",
  },
  {
    q: "Does Quotely work on mobile?",
    a: "Yes. Quotely is a fully responsive web app that works on desktop, tablet and mobile browsers — create and send quotations from any device, anywhere.",
  },
  {
    q: "How is Quotely different from other quotation software?",
    a: "Speed (60-second AI extraction), India-first design (GST, HSN, INR, WhatsApp sharing) and a focus on service businesses — not generic invoicing. Personal onboarding included with every plan.",
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0);

  // Inject FAQPage JSON-LD so Google / AI engines can pull our answers directly.
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById("faq-jsonld");
      if (el) el.remove();
    };
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
              <a href="#use-cases" className="text-sm text-neutral-600 hover:text-black transition-colors">Use cases</a>
              <a href="#pricing" className="text-sm text-neutral-600 hover:text-black transition-colors">Pricing</a>
              <a href="#faq" className="text-sm text-neutral-600 hover:text-black transition-colors">FAQ</a>
              <Link to="/login" className="text-sm font-medium text-neutral-700 hover:text-black transition-colors">Sign in</Link>
              <a
                href={BOOK_DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Book a demo
              </a>
            </div>
            <div className="sm:hidden flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-neutral-700">Sign in</Link>
              <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm font-semibold bg-black text-white rounded-lg">Book demo</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-neutral-100 via-neutral-50 to-white overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-neutral-200/50 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-neutral-200 rounded-full mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-medium text-neutral-600">Built for every service business</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black leading-tight tracking-tight mb-6">
            Close your sale in{" "}
            <span className="text-neutral-400">60 seconds</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Send a professional quotation before your customer changes their mind.
            GST-ready quotations, invoices, and warranty tracking — all in one place, for every service team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-black text-white rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
            >
              <MessageCircle className="w-4 h-4" />
              Book a demo on WhatsApp
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-center shadow-sm"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-4 text-sm text-neutral-400">Personal onboarding. Live demo. No credit card.</p>
        </div>

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
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Everything you need to quote &amp; invoice</h2>
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

      {/* Use Cases / Verticals Section — keyword-rich for SEO */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Built for every service business in India</h2>
            <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
              From CCTV installations to solar projects — Quotely turns your customer enquiry into a GST-ready
              quotation in 60 seconds, no matter what service you sell.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <article key={uc.title} className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-4.5 h-4.5 text-neutral-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-black mb-1">{uc.title}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{uc.desc}</p>
                </article>
              );
            })}
          </div>
          <p className="text-center text-sm text-neutral-400 mt-10">
            Also serving electricians, contractors, civil teams, AMC providers and small businesses across India.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-neutral-500">
              Book a demo — we'll set up your account and recommend the right plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-xl border-2 ${
                  plan.highlighted
                    ? "border-black bg-gradient-to-br from-neutral-900 via-black to-neutral-800 text-white shadow-2xl shadow-black/20"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-xs font-semibold rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-lg font-semibold mb-1 ${plan.highlighted ? "text-white" : "text-black"}`}>
                  {plan.name}
                </h3>

                <div className="mb-6 mt-3">
                  {plan.offerPrice ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`text-3xl font-bold ${plan.highlighted ? "text-white" : "text-black"}`}>
                          {plan.offerPrice}
                        </span>
                        <span className={`text-lg line-through ${plan.highlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                          {plan.priceDisplay}
                        </span>
                      </div>
                      {plan.offerLabel && (
                        <div className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${plan.highlighted ? "bg-white/10 text-white" : "bg-amber-100 text-amber-800"}`}>
                          {plan.offerLabel}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={`text-3xl font-bold ${plan.highlighted ? "text-white" : "text-black"}`}>
                      {plan.priceDisplay}
                    </span>
                  )}
                  {plan.periodSuffix && (
                    <span className={`text-sm ml-1 ${plan.highlighted ? "text-neutral-300" : "text-neutral-500"}`}>
                      {plan.periodSuffix}
                    </span>
                  )}
                  {plan.yearlyOffer ? (
                    <p className={`text-xs mt-1 ${plan.highlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                      <span className={`font-semibold ${plan.highlighted ? "text-neutral-200" : "text-neutral-600"}`}>{plan.yearlyOffer}</span>
                      {plan.yearlyOriginal && (
                        <span className="line-through ml-1.5 text-neutral-400">{plan.yearlyOriginal}</span>
                      )}
                      <span className="ml-1">/year</span>
                    </p>
                  ) : plan.yearlyNote ? (
                    <p className={`text-xs mt-1 ${plan.highlighted ? "text-neutral-400" : "text-neutral-400"}`}>
                      {plan.yearlyNote}
                    </p>
                  ) : null}
                  {plan.customNote && (
                    <p className={`text-xs mt-2 italic ${plan.highlighted ? "text-neutral-300" : "text-neutral-500"}`}>
                      {plan.customNote}
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-3">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className={`flex items-center gap-2 text-sm ${plan.highlighted ? "text-neutral-200" : "text-neutral-600"}`}
                    >
                      <ChevronRight className={`w-4 h-4 ${plan.highlighted ? "text-neutral-300" : "text-neutral-400"}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {plan.featuresNote && (
                  <p className={`text-xs italic ${plan.highlighted ? "text-neutral-400" : "text-neutral-500"}`}>
                    {plan.featuresNote}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-black text-white rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-black/10"
            >
              <MessageCircle className="w-4 h-4" />
              Book a demo to get started
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-sm text-neutral-400">We'll set up your account and pick the right plan for your team.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section — AEO content (FAQPage JSON-LD injected via useEffect) */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-3">Frequently asked questions</h2>
            <p className="text-base text-neutral-500">
              Everything you need to know about Quotely's AI quotation software.
            </p>
          </div>

          <div className="border-t border-neutral-200">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={faq.q} className="border-b border-neutral-200">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-6 py-4 text-left group"
                    aria-expanded={isOpen}
                  >
                    <h3 className={`text-sm sm:text-base font-medium transition-colors ${isOpen ? "text-black" : "text-neutral-800 group-hover:text-black"}`}>
                      {faq.q}
                    </h3>
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isOpen ? "bg-black text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"}`}>
                      {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm text-neutral-600 leading-relaxed pr-10">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-neutral-500">Still have questions?</p>
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:underline"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              Ask us on WhatsApp
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-neutral-100 bg-neutral-50/40">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col gap-2 max-w-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Q</span>
                </div>
                <span className="text-sm font-semibold text-neutral-800">Quotely</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Close your sale in 60 seconds. Built for every service business — quotations, invoices, and warranties in one place. Made in India.
              </p>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Get in touch</p>
              <a
                href="https://wa.me/918848644935"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                +91 88486 44935
              </a>
              <a
                href="tel:+918848644935"
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black transition-colors"
              >
                <Phone className="w-4 h-4 text-neutral-500" />
                +91 88486 44935
              </a>
              <a
                href="mailto:supportquotely@gmail.com"
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black transition-colors"
              >
                <Mail className="w-4 h-4 text-neutral-500" />
                supportquotely@gmail.com
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} Quotely. All rights reserved.
            </p>
            <p className="text-xs text-neutral-400">Made with care for service teams</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
