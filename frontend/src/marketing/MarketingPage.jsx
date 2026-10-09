import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import MarketingLayout, { RichText, TrialButton, FeatureGrid } from "./MarketingLayout";
import { SITE } from "./site";
import { GENERAL_PAGES, getPage } from "./pages";
import { useSeo } from "./seo";
import { QRCodeSVG } from "qrcode.react";
import { sampleMeta, computeSample, TEMPLATE_FORMATS, templatePath } from "./samples";
import { signaturePathD, SIG_W, SIG_H } from "./sampleArt";

const fmt = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtQty = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

// Mirrors the Quotely Pro quotation PDF (backend/app/api/pdf/service.py) with the default
// print-settings colours: primary #1f2a67 (navy), accent #0ea5a4 (teal), Helvetica-style type.
function SampleQuotation({ page }) {
  const { sample, gstNote } = page;
  const meta = sampleMeta(page);
  const { lstRows, dblTaxable, lstGst, dblTotal, blnLineGst } = computeSample(sample);
  const img = sample.productImage;
  const strCity = sample.from.split(",").slice(1).join(",").trim();
  const [strCustomer, ...lstAddress] = sample.to.split(",").map((s) => s.trim());

  return (
    <section className="my-10" aria-labelledby="sample-heading">
      <h2 id="sample-heading" className="text-2xl font-bold text-black mb-4">{sample.heading}</h2>
      <div
        className="rounded-lg border border-[#CBD5E1] bg-white shadow-sm overflow-hidden text-[#1E293B]"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        {/* Accent top line, like the PDF */}
        <div className="h-1 bg-[#0ea5a4]" />
        <div className="p-4 sm:p-6">
          {/* Header: seller left, QUOTATION right */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold uppercase tracking-wide text-[#1f2a67] leading-snug">{meta.strSeller}</p>
              <p className="text-xs text-[#1E293B] mt-0.5">
                {strCity} <span className="text-[#CBD5E1]" aria-hidden="true">|</span> GSTIN {meta.strGstin}{" "}
                <span className="text-[#64748B]">(sample)</span>
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#1f2a67] sm:text-right leading-none">QUOTATION</p>
          </div>

          {/* Meta: compact 3-column row */}
          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[#CBD5E1] bg-[#CBD5E1] text-xs">
            {[
              ["Quotation No.", meta.strNumber],
              ["Date", meta.strDate],
              ["Valid till", meta.strValidTill],
            ].map(([strLabel, strValue]) => (
              <div key={strLabel} className="bg-[#F8FAFC] px-2 sm:px-3 py-2 min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#0ea5a4]">{strLabel}</dt>
                <dd className="mt-0.5 font-medium tabular-nums break-words">{strValue}</dd>
              </div>
            ))}
          </dl>

          {/* Bill To, then subject */}
          <div className="mt-4 text-sm">
            <p className="text-xs font-bold text-[#1f2a67] mb-1">Bill To</p>
            <p className="font-semibold">{strCustomer}</p>
            {lstAddress.length > 0 && <p className="text-[#475569]">{lstAddress.join(", ")}</p>}
            <p className="mt-2">
              <span className="font-bold text-[#1f2a67]">Subject:</span> {sample.subject}
            </p>
          </div>
          <hr className="my-4 border-[#CBD5E1]" />

          {/* Items table: navy header, alternating rows; scrolls inside its box on mobile */}
          <p className="sm:hidden text-[11px] text-[#64748B] mb-1.5">Swipe the table sideways to see all columns</p>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead>
                <tr className="bg-[#1f2a67] text-white">
                  <th scope="col" className="text-left font-bold px-3 py-2.5 w-10 whitespace-nowrap">#</th>
                  <th scope="col" className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Item</th>
                  <th scope="col" className="text-right font-bold px-3 py-2.5 whitespace-nowrap">Qty</th>
                  <th scope="col" className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Unit</th>
                  <th scope="col" className="text-right font-bold px-3 py-2.5 whitespace-nowrap">Rate (₹)</th>
                  {blnLineGst && <th scope="col" className="text-right font-bold px-3 py-2.5 whitespace-nowrap">GST</th>}
                  <th scope="col" className="text-right font-bold px-3 py-2.5 whitespace-nowrap">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lstRows.map((r, i) => (
                  <tr key={i} className={`border-b border-[#CBD5E1] ${i % 2 === 1 ? "bg-[#F1F5F9]" : "bg-white"}`}>
                    <td className="px-3 py-2 text-[#64748B]">{i + 1}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtQty(r.qty)}</td>
                    <td className="px-3 py-2 text-[#475569]">{r.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.rate)}</td>
                    {blnLineGst && <td className="px-3 py-2 text-right tabular-nums">{r.gst}%</td>}
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals box, right side, like the PDF's grand-total box */}
          <div className="mt-4 flex sm:justify-end">
            <div className="w-full sm:w-auto sm:min-w-[300px] rounded-md border border-[#CBD5E1] text-sm">
              <div className="flex justify-between gap-6 px-3 py-1.5">
                <span className="text-[#475569]">Taxable value</span>
                <span className="tabular-nums">{fmt(dblTaxable)}</span>
              </div>
              {lstGst.map((g) => (
                <div key={g.label} className="flex justify-between gap-6 px-3 py-1.5">
                  <span className="text-[#475569]">{g.label}</span>
                  <span className="tabular-nums">{fmt(g.amt)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-6 px-3 py-2 border-t border-[#CBD5E1] bg-[#F8FAFC] font-bold">
                <span>Grand Total</span>
                <span className="tabular-nums text-[#1f2a67]">₹{fmt(dblTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer: terms left; signatory + bank/UPI right */}
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr,auto]">
            <div>
              <p className="text-xs font-bold mb-1.5">Terms &amp; Conditions</p>
              <ul className="space-y-1 text-[13px] text-[#64748B]">
                {sample.terms.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span aria-hidden="true">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:items-end sm:text-right text-[13px]">
              <p className="text-xs font-bold">For {meta.strSeller}</p>
              {/* Sample signature (drawn, not an image file) */}
              <svg
                viewBox={`0 0 ${SIG_W} ${SIG_H}`}
                width={SIG_W * 0.8}
                height={SIG_H * 0.8}
                className="mt-1 text-[#1f2a67]"
                role="img"
                aria-label="Sample signature"
              >
                <path d={signaturePathD(meta.strSigSeed)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[#64748B] border-t border-[#CBD5E1] pt-1 w-40 sm:text-right">Authorised signatory</p>
              <div className="mt-4 text-xs text-[#64748B] leading-relaxed">
                <p className="font-bold text-[#1E293B]">Bank / UPI (sample)</p>
                <p>{meta.strBank}</p>
                <p>UPI: {meta.strUpi}</p>
              </div>
              {/* Sample payment QR: encodes a fake UPI link */}
              <div className="mt-3 flex flex-col sm:items-end">
                <div className="w-fit rounded-sm border border-[#CBD5E1] bg-white p-1.5">
                  <QRCodeSVG value={meta.strUpiLink} size={84} level="M" marginSize={0} title="Sample payment QR code" />
                </div>
                <p className="mt-1 text-[11px] text-[#64748B]">Scan to Pay (sample)</p>
              </div>
            </div>
          </div>
          <hr className="mt-6 border-[#CBD5E1]" />
        </div>
      </div>

      <p className="mt-3 text-sm text-neutral-800">
        <span className="font-semibold">Download this format:</span>{" "}
        {TEMPLATE_FORMATS.map((f, i) => (
          <span key={f.ext}>
            {i > 0 && <span className="text-neutral-400" aria-hidden="true"> | </span>}
            <a
              href={templatePath(page.slug, f.ext)}
              download
              className="font-medium text-black underline underline-offset-2 hover:text-neutral-600"
            >
              {f.label}
            </a>
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs text-neutral-600">
        Sample for reference only. Rates are typical figures and vary by city and brand. GSTIN, bank and UPI details are
        made up. {gstNote || "GST rates shown are common rates; confirm the current rate for your items with your accountant."}
      </p>
      {/* Product screenshot: only when the real file exists (ready: true). No placeholder. */}
      {img?.ready && (
        <figure className="mt-6">
          <div
            className="mx-auto max-w-md overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
            style={{ aspectRatio: `${img.width} / ${img.height}` }}
          >
            <img
              src={img.src}
              width={img.width}
              height={img.height}
              alt={img.alt}
              loading="lazy"
              decoding="async"
              className="block w-full h-full object-cover"
            />
          </div>
          <figcaption className="mt-2 text-center text-sm text-neutral-600">{img.caption}</figcaption>
        </figure>
      )}
    </section>
  );
}

function Section({ section, page }) {
  if (section.sample) return <SampleQuotation page={page} />;
  return (
    <section className="mt-10">
      {section.heading && <h2 className="text-2xl font-bold text-black mb-4">{section.heading}</h2>}
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-base text-neutral-700 leading-relaxed mb-4"><RichText text={p} /></p>
      ))}
      {section.list && (
        <ul className="list-disc pl-5 space-y-2 text-base text-neutral-700 leading-relaxed mb-4">
          {section.list.map((li, i) => <li key={i}><RichText text={li} /></li>)}
        </ul>
      )}
      {section.orderedList && (
        <ol className="list-decimal pl-5 space-y-2 text-base text-neutral-700 leading-relaxed mb-4">
          {section.orderedList.map((li, i) => <li key={i}><RichText text={li} /></li>)}
        </ol>
      )}
      {section.features && <FeatureGrid columns="" />}
      {section.compare && (
        <div className="overflow-x-auto border border-neutral-200 rounded-xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-neutral-50">
              <tr>
                {section.compare.columns.map((c, i) => (
                  <th key={i} scope="col" className="text-left font-semibold text-black px-4 py-3">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.compare.rows.map((row, i) => (
                <tr key={i} className="border-t border-neutral-100 align-top">
                  <th scope="row" className="text-left font-semibold text-neutral-900 px-4 py-3">{row[0]}</th>
                  {row.slice(1).map((cell, j) => <td key={j} className="px-4 py-3 text-neutral-700">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RelatedLinks({ page }) {
  const lstRelated = (page.related || []).map(getPage).filter(Boolean);
  const lstGuides = GENERAL_PAGES.filter((p) => p.slug !== page.slug);
  return (
    <nav className="mt-14 grid gap-8 sm:grid-cols-2" aria-label="Related pages">
      {lstRelated.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-black mb-3">
            {page.kind === "comparison" ? "Related comparisons" : "Related quotation formats"}
          </h2>
          <ul className="space-y-2">
            {lstRelated.map((p) => (
              <li key={p.slug}>
                <Link to={`/${p.slug}`} className="inline-flex items-center gap-1 text-neutral-800 hover:text-black underline underline-offset-2">
                  {p.h1}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h2 className="text-lg font-bold text-black mb-3">Guides</h2>
        <ul className="space-y-2">
          {lstGuides.map((p) => (
            <li key={p.slug}>
              <Link to={`/${p.slug}`} className="text-neutral-800 hover:text-black underline underline-offset-2">{p.h1}</Link>
            </li>
          ))}
          <li>
            <Link to="/" className="text-neutral-800 hover:text-black underline underline-offset-2">Quotely Pro home</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default function MarketingPage({ slug }) {
  const page = getPage(slug);
  useSeo(`/${slug}`);
  // Braces matter: newer Chrome returns a Promise from scrollTo, and React would treat
  // a returned value as the effect's clean-up function and crash.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  const blnIndustry = page.kind === "industry";

  return (
    <MarketingLayout>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <nav aria-label="Breadcrumb" className="text-sm text-neutral-600 mb-6">
          <ol className="flex items-center gap-1 flex-wrap">
            <li><Link to="/" className="hover:text-black">Home</Link></li>
            <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5" /></li>
            <li aria-current="page" className="text-neutral-800">{page.h1}</li>
          </ol>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold text-black leading-tight tracking-tight mb-6">{page.h1}</h1>
        {page.intro.map((p, i) => (
          <p key={i} className="text-lg text-neutral-700 leading-relaxed mb-4"><RichText text={p} /></p>
        ))}

        {page.sections.map((s, i) => <Section key={i} section={s} page={page} />)}

        <aside className="mt-12 rounded-2xl bg-neutral-900 text-white p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-3">
            {blnIndustry ? "Create this quotation in 1 minute" : "Make your next quotation in 1 minute"}
          </h2>
          <p className="text-neutral-300 leading-relaxed mb-6">
            {blnIndustry
              ? "Save these items once in Quotely Pro. For every new customer, copy the quotation, change the quantities, download the PDF and send it on WhatsApp."
              : "Add your items once in Quotely Pro, reuse them on every quotation, download a branded PDF and send it on WhatsApp."}
          </p>
          <TrialButton context={page.ctaContext} className="bg-white !text-black hover:bg-neutral-200 w-full sm:w-auto" />
          <p className="mt-3 text-sm text-neutral-400">
            {SITE.trialLine} Plans from ₹999/month. {SITE.priceNote}
          </p>
        </aside>

        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-black mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {page.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold text-black mb-2">{f.q}</h3>
                <p className="text-base text-neutral-700 leading-relaxed"><RichText text={f.a} /></p>
              </div>
            ))}
          </div>
        </section>

        {page.disclaimer && <p className="mt-10 text-xs text-neutral-600 border-t border-neutral-200 pt-4">{page.disclaimer}</p>}

        <RelatedLinks page={page} />
      </article>
    </MarketingLayout>
  );
}
