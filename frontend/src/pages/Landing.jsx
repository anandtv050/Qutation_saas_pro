import { Link } from "react-router-dom";
import {
  Zap, FileText, Sparkles, ChevronRight, Smartphone, Send, ListPlus, Check, X, Star,
  Camera, Hammer, Briefcase, Store, PenTool, Wallet,
} from "lucide-react";
import MarketingLayout, { RichText, TrialButton, FeatureGrid } from "@/marketing/MarketingLayout";
import { SITE, PLANS, FOUNDING_OFFER } from "@/marketing/site";
import { formatInr } from "@/lib/pricing";
import { HOME_FAQS } from "@/marketing/home";
import { GENERAL_PAGES, INDUSTRY_PAGES, COMPARISON_PAGES } from "@/marketing/pages";
import { useSeo } from "@/marketing/seo";

const STEPS = [
  { icon: ListPlus, title: "Add your items", desc: "Pick from your saved items or copy an old quotation. Quantity, unit and rate on every line." },
  { icon: FileText, title: "Download the PDF", desc: "A clean quotation with your logo, terms, signature and payment QR code. Totals are worked out for you." },
  { icon: Send, title: "Send it on WhatsApp", desc: "Attach the PDF in your customer's WhatsApp chat while you are still at the site." },
];

const AUDIENCES = [
  { icon: Camera, title: "Installers", desc: "CCTV, solar, electrical, AC and networking jobs with many line items.", href: "/cctv-quotation-format", linkLabel: "CCTV quotation format" },
  { icon: Hammer, title: "Contractors", desc: "Interiors, construction, painting, plumbing and carpentry, quoted by area or item.", href: "/construction-quotation-format", linkLabel: "Construction quotation format" },
  { icon: Briefcase, title: "Service providers", desc: "Catering, events, printing and repair work with materials and labour.", href: "/catering-quotation-format", linkLabel: "Catering quotation format" },
  { icon: Store, title: "Traders", desc: "Price lists for shops, offices and institutions that ask for a written quotation.", href: "/quotation-format", linkLabel: "Quotation format with sample" },
  { icon: PenTool, title: "Freelancers", desc: "Web design, photography and creative projects quoted by deliverable.", href: "/web-design-quotation-format", linkLabel: "Web design quotation format" },
];

const HOME_FEATURES = [
  "Copy quotation",
  "Item catalogue",
  "AI Quick Create",
  "Branded PDFs",
  "Warranty certificates",
  "Advance and payment receipts",
];

// Industry grid order: these first, then the rest in their usual order.
const INDUSTRY_PRIORITY = [
  "cctv-quotation-format",
  "solar-installation-quotation-format",
  "electrical-work-quotation-format",
  "ac-installation-service-quotation-format",
  "networking-quotation-format",
  "interior-design-quotation-format",
];
const ORDERED_INDUSTRIES = [
  ...INDUSTRY_PRIORITY.map((slug) => INDUSTRY_PAGES.find((p) => p.slug === slug)).filter(Boolean),
  ...INDUSTRY_PAGES.filter((p) => !INDUSTRY_PRIORITY.includes(p.slug)),
];

// Hero images. Until the real files exist (ready: false) the hero is text-only and centred.
// To enable: add both files under frontend/public/screenshots/ and set ready: true.
// width/height must be the files' real pixel size (they reserve space, so there is no layout shift).
const HERO_MEDIA = {
  ready: false,
  app: {
    src: "/screenshots/app-quotation.png",
    width: 1080,
    height: 2340,
    alt: "Quotely Pro on a phone: a quotation with items, quantities, rates and the total",
  },
  pdf: {
    src: "/screenshots/sample-quotation.png",
    width: 1240,
    height: 1754,
    alt: "Sample quotation PDF made with Quotely Pro: logo, item table, totals and terms",
  },
};

function HeroVisual() {
  const { app, pdf } = HERO_MEDIA;
  return (
    <div className="relative mx-auto w-full max-w-[420px]" style={{ aspectRatio: "420 / 500" }}>
      <div
        className="absolute right-0 top-0 w-[64%] rotate-3 rounded-lg border border-neutral-200 bg-white shadow-xl overflow-hidden"
        style={{ aspectRatio: `${pdf.width} / ${pdf.height}` }}
      >
        <img src={pdf.src} width={pdf.width} height={pdf.height} alt={pdf.alt} loading="lazy" decoding="async" className="block w-full h-full object-cover" />
      </div>
      <div
        className="absolute left-0 bottom-0 w-[50%] rounded-[1.75rem] p-[7px] bg-neutral-900 shadow-2xl ring-1 ring-black/20 overflow-hidden"
        style={{ aspectRatio: `${app.width} / ${app.height}` }}
      >
        <img src={app.src} width={app.width} height={app.height} alt={app.alt} loading="lazy" decoding="async" className="block w-full h-full object-cover rounded-[1.25rem]" />
      </div>
    </div>
  );
}


export default function Landing() {
  useSeo("/");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-neutral-100 via-neutral-50 to-white">
        <div className={HERO_MEDIA.ready ? "max-w-6xl mx-auto grid gap-12 lg:grid-cols-2 lg:gap-10 items-center" : "max-w-4xl mx-auto"}>
        <div className={HERO_MEDIA.ready ? "text-center lg:text-left" : "text-center"}>
          <p className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 rounded-full mb-8 text-xs font-medium text-neutral-700">
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            Quotation maker for small businesses in India
          </p>
          <h1 className={`text-4xl sm:text-5xl font-bold text-black leading-tight tracking-tight mb-6 ${HERO_MEDIA.ready ? "lg:text-[3.4rem]" : "lg:text-6xl"}`}>
            Make a professional quotation on your phone in 1 minute
          </h1>
          <p className={`text-lg sm:text-xl text-neutral-700 max-w-2xl mx-auto mb-10 leading-relaxed ${HERO_MEDIA.ready ? "lg:mx-0" : ""}`}>
            Quotely Pro turns your items, quantities and rates into a clean, branded PDF quotation. Download it and send
            it to your customer on WhatsApp before a competitor does.
          </p>
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${HERO_MEDIA.ready ? "lg:justify-start" : ""}`}>
            <TrialButton context="my business" className="w-full sm:w-auto px-8 py-3.5" />
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 text-center"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-base font-semibold text-black">{SITE.trialLine}</p>
          <p className="mt-1 text-sm text-neutral-600">Plans from ₹{formatInr(PLANS[0].priceMonthly)}/month. {SITE.priceNote}</p>
        </div>
        {HERO_MEDIA.ready && <HeroVisual />}
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">For every small business that sends quotations</h2>
            <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
              If your customers ask &ldquo;send me a quotation&rdquo; before they decide, Quotely Pro is for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AUDIENCES.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="group flex flex-col bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-400 hover:shadow-sm transition-colors"
              >
                <item.icon className="w-5 h-5 text-neutral-800 mb-3" aria-hidden="true" />
                <h3 className="text-base font-semibold text-black mb-1">{item.title}</h3>
                <p className="text-sm text-neutral-700 leading-relaxed flex-1">{item.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-black underline underline-offset-2">
                  {item.linkLabel}
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-12 text-center">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                  <step.icon className="w-5 h-5 text-neutral-700" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-700 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
          <p className="text-center text-sm text-neutral-600 mt-8">
            Works in Chrome or any browser on your phone, tablet or computer. Nothing to install.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Everything you need, in one app</h2>
            <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
              From the first quotation to the advance, the invoice and the warranty. Most quotations look like the last
              one, so Quotely Pro is built around reusing what you have already typed.
            </p>
          </div>
          <FeatureGrid only={HOME_FEATURES} />
          <p className="text-center text-sm text-neutral-700 mt-8">
            Also: quotation to invoice, reports and dashboard, print layout set up for you.
          </p>
        </div>
      </section>

      {/* AI Quick Create — the description must sit next to the "with AI" claim */}
      <section id="ai" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-[auto,1fr] items-start">
          <Sparkles className="w-10 h-10 text-neutral-800" aria-hidden="true" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4">Quotation in seconds with AI</h2>
            <p className="text-neutral-700 leading-relaxed mb-3">
              Type what you need in plain words, and AI picks the matching items, quantities and prices from your saved
              catalogue, so a quotation is ready in seconds.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              It only uses your items and your prices, so nothing is made up.
            </p>
          </div>
        </div>
      </section>

      {/* Quotations and invoices; accounting software optional */}
      <section id="billing-software" className="py-16 px-4 sm:px-6 lg:px-8 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-[auto,1fr] items-start">
          <Wallet className="w-10 h-10 text-neutral-300" aria-hidden="true" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Already use Vyapar, Zoho, myBillBook or Tally?</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              Quotations and invoices in one place. Keep your accounting software for books and GST returns, or use
              Quotely Pro alone if you just need quotations and invoices.
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              {COMPARISON_PAGES.map((p) => (
                <li key={p.slug}>
                  <Link to={`/${p.slug}`} className="underline underline-offset-2 text-white hover:text-neutral-300">
                    {p.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Quotation formats by industry</h2>
            <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
              What to include, a sample item table and common questions for your trade.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ORDERED_INDUSTRIES.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/${p.slug}`}
                  className="flex items-center justify-between gap-2 h-full bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-400"
                >
                  <span className="text-base font-semibold text-black">{p.h1}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {GENERAL_PAGES.map((p) => (
              <Link key={p.slug} to={`/${p.slug}`} className="text-sm font-medium text-neutral-800 underline underline-offset-2 hover:text-black">
                {p.h1}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — must match tbl_subscription_plan (see src/marketing/site.js) */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">Simple pricing</h2>
            <p className="text-lg text-neutral-700">{SITE.trialLine} {SITE.priceNote}</p>
          </div>
          <div className="mb-10 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <Star className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-sm sm:text-base font-medium text-amber-900">{FOUNDING_OFFER.strBanner}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative p-6 rounded-xl border-2 flex flex-col ${
                  plan.highlighted ? "border-black bg-neutral-900 text-white" : "border-neutral-200 bg-white"
                }`}
              >
                {plan.highlighted && (
                  <p className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-xs font-semibold rounded-full border border-neutral-200">
                    Most popular
                  </p>
                )}
                <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-white" : "text-black"}`}>{plan.name}</h3>
                <p className={`text-sm mt-1 ${plan.highlighted ? "text-neutral-300" : "text-neutral-600"}`}>{plan.tagline}</p>
                <div className="mb-6 mt-4">
                  <span className="text-3xl font-bold">₹{formatInr(plan.priceMonthly)}</span>
                  <span className="text-sm ml-1 opacity-80">/month</span>
                  <p className="text-sm mt-1 opacity-90">
                    or ₹{formatInr(plan.priceYearly)}/year <span className="opacity-80">(2 months free)</span>
                  </p>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlighted ? "text-neutral-200" : "text-neutral-700"}`}>
                      <Check className="w-4 h-4 mt-0.5 shrink-0 opacity-70" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-500 line-through">
                      <X className="w-4 h-4 mt-0.5 shrink-0 opacity-60" aria-hidden="true" />
                      <span><span className="sr-only">Not included: </span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center gap-3">
            <TrialButton context="my business" className="px-8 py-3.5" />
            <p className="text-sm text-neutral-600">Pay by UPI or bank transfer. We activate your plan once payment is received.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-8">Frequently asked questions</h2>
          <div className="border-t border-neutral-200">
            {HOME_FAQS.map((faq, i) => (
              <details key={faq.q} className="group border-b border-neutral-200" open={i === 0}>
                <summary className="flex items-center justify-between gap-6 py-4 cursor-pointer list-none">
                  <h3 className="text-base font-medium text-neutral-900">{faq.q}</h3>
                  <span className="shrink-0 text-neutral-500 group-open:rotate-90 transition-transform" aria-hidden="true">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </summary>
                <p className="pb-5 pr-10 text-sm text-neutral-700 leading-relaxed"><RichText text={faq.a} /></p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50 text-center">
        <div className="max-w-2xl mx-auto">
          <Zap className="w-8 h-8 mx-auto mb-4 text-neutral-800" aria-hidden="true" />
          <h2 className="text-3xl font-bold text-black mb-4">Send your next quotation in 1 minute</h2>
          <p className="text-neutral-700 mb-8">
            Message us on WhatsApp. We set up your account with your logo and terms. {SITE.trialLine}
          </p>
          <TrialButton context="my business" className="px-8 py-3.5" />
        </div>
      </section>
    </MarketingLayout>
  );
}
