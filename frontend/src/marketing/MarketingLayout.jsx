import { Link } from "react-router-dom";
import { MessageCircle, Mail, Phone, ArrowRight } from "lucide-react";
import { SITE, demoLink } from "./site";
import { GENERAL_PAGES, INDUSTRY_PAGES, COMPARISON_PAGES } from "./pages";
import { APP_FEATURES } from "./features";

// "Everything you need, in one app" grid, shared by the homepage and MarketingPage.
// only: optional list of feature titles to show, in that order (default: all features).
export function FeatureGrid({ columns = "lg:grid-cols-3", only = null }) {
  const lstFeatures = only
    ? only.map((strTitle) => APP_FEATURES.find((f) => f.title === strTitle)).filter(Boolean)
    : APP_FEATURES;
  return (
    <ul className={`grid grid-cols-1 sm:grid-cols-2 ${columns} gap-4`}>
      {lstFeatures.map((feature) => (
        <li key={feature.title} className="bg-white p-5 rounded-xl border border-neutral-200">
          <feature.icon className="w-5 h-5 text-neutral-800 mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold text-black mb-1.5">{feature.title}</h3>
          <p className="text-sm text-neutral-700 leading-relaxed">{feature.desc}</p>
        </li>
      ))}
    </ul>
  );
}

// "/login" and other app routes are plain <a> links on purpose: a full page load
// leaves the marketing pages (and their analytics script) behind.

export function Logo({ size = "md" }) {
  const box = size === "sm" ? "w-7 h-7 rounded-md text-xs" : "w-9 h-9 rounded-lg";
  return (
    <span className="flex items-center gap-2.5">
      <span className={`${box} bg-black flex items-center justify-center text-white font-bold`} aria-hidden="true">
        Q
      </span>
      <span className={`font-semibold text-neutral-900 ${size === "sm" ? "text-sm" : "text-lg"}`}>Quotely Pro</span>
    </span>
  );
}

// Renders "[text](/path)" markup inside copy as internal links.
export function RichText({ text }) {
  const lstParts = [];
  const re = /\[([^\]]+)\]\((\/[^)]*)\)/g;
  let intLast = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > intLast) lstParts.push(text.slice(intLast, m.index));
    lstParts.push(
      <Link key={m.index} to={m[2]} className="font-medium text-black underline underline-offset-2 hover:text-neutral-600">
        {m[1]}
      </Link>
    );
    intLast = m.index + m[0].length;
  }
  if (intLast < text.length) lstParts.push(text.slice(intLast));
  return <>{lstParts}</>;
}

export function TrialButton({ context, children = "Start free trial on WhatsApp", className = "" }) {
  return (
    <a
      href={demoLink(context)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors ${className}`}
    >
      <MessageCircle className="w-4 h-4" aria-hidden="true" />
      {children}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </a>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-neutral-100 z-50">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16" aria-label="Main">
        <Link to="/" aria-label="Quotely Pro home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3 md:gap-6">
          <Link to="/quotation-format" className="hidden md:inline text-sm text-neutral-600 hover:text-black">Quotation format</Link>
          <a href="/#industries" className="hidden md:inline text-sm text-neutral-600 hover:text-black">Industries</a>
          <a href="/#pricing" className="hidden md:inline text-sm text-neutral-600 hover:text-black">Pricing</a>
          <a href="/login" className="text-sm font-medium text-neutral-700 hover:text-black">Sign in</a>
          <a
            href={demoLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 md:px-4 py-1.5 md:py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800"
          >
            Start free trial
          </a>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-neutral-100 bg-neutral-50">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="flex flex-col gap-3">
          <Logo size="sm" />
          <p className="text-sm text-neutral-600 leading-relaxed">
            Quotation maker for small businesses in India. Make item-wise quotations on your phone, download the PDF
            and send it on WhatsApp. Quotations and invoices in one place.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-3">Guides</p>
          <ul className="space-y-2">
            {GENERAL_PAGES.map((p) => (
              <li key={p.slug}>
                <Link to={`/${p.slug}`} className="text-sm text-neutral-700 hover:text-black">{p.navLabel}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-3">Quotation formats</p>
          <ul className="space-y-2">
            {INDUSTRY_PAGES.map((p) => (
              <li key={p.slug}>
                <Link to={`/${p.slug}`} className="text-sm text-neutral-700 hover:text-black">{p.navLabel}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-3">Compare</p>
          <ul className="space-y-2">
            {COMPARISON_PAGES.map((p) => (
              <li key={p.slug}>
                <Link to={`/${p.slug}`} className="text-sm text-neutral-700 hover:text-black">{p.navLabel}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-1">Contact</p>
          <a href={`https://wa.me/${SITE.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black">
            <MessageCircle className="w-4 h-4 text-[#128C7E]" aria-hidden="true" />
            WhatsApp {SITE.phoneDisplay}
          </a>
          <a href={`tel:${SITE.phoneE164}`} className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black">
            <Phone className="w-4 h-4 text-neutral-500" aria-hidden="true" />
            {SITE.phoneDisplay}
          </a>
          <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black">
            <Mail className="w-4 h-4 text-neutral-500" aria-hidden="true" />
            {SITE.email}
          </a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-neutral-600">
          &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> Quotely Pro (quotelypro.in). Made in India.
        </p>
        <a href="/login" className="text-xs text-neutral-600 hover:text-black">Sign in</a>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
