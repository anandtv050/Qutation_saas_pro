import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import onboardingService from "@/services/onboardingService";
import { customPdfClicked, customPdfLink, trackCustomPdfClick } from "@/lib/customPdfHelp";

// Dashboard checklist for self-serve signups. Each item ticks itself from real data
// (the server reads quotations, print settings and the first PDF); hidden once all are done.
export default function GettingStartedCard() {
  const [state, setState] = useState(null);
  const [blnAsked, setBlnAsked] = useState(customPdfClicked());

  useEffect(() => {
    onboardingService.getState().then(setState).catch(() => setState(null));
  }, []);

  if (!state?.blnShowChecklist) return null;

  const c = state.dctChecklist;
  const strSampleLink = state.intSampleQuotationId ? `/quotations/edit/${state.intSampleQuotationId}` : "/quotations/new?mode=manual";
  const lstItems = [
    { label: "Account created", done: c.blnAccount },
    { label: "Create your first quotation", done: c.blnFirstQuotation, to: "/quotations/new?mode=manual" },
    { label: "Add your logo & custom PDF layout", done: c.blnLogo || blnAsked, href: customPdfLink(), location: "checklist" },
    { label: "Download & send a quotation", done: c.blnPdfDownloaded, to: strSampleLink },
  ];
  const intDone = lstItems.filter((i) => i.done).length;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-neutral-900">Getting started</p>
        <p className="text-xs text-neutral-500">{intDone} of {lstItems.length} done</p>
      </div>
      <ul className="space-y-1">
        {lstItems.map((item) => {
          const blnLink = !item.done && item.to;
          const blnExternal = !item.done && item.href;
          const content = (
            <>
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="w-5 h-5 text-neutral-300 shrink-0" aria-hidden="true" />
              )}
              <span className={`text-sm ${item.done ? "text-neutral-400 line-through" : "text-neutral-800 font-medium"}`}>
                {item.label}
              </span>
            </>
          );
          return (
            <li key={item.label}>
              {blnExternal ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-qe="custom-pdf-checklist"
                  onClick={() => { trackCustomPdfClick(item.location); setBlnAsked(true); }}
                  className="flex items-center gap-3 min-h-[40px] -mx-1 px-1 rounded-lg hover:bg-neutral-50"
                >
                  {content}
                </a>
              ) : blnLink ? (
                <Link to={item.to} className="flex items-center gap-3 min-h-[40px] -mx-1 px-1 rounded-lg hover:bg-neutral-50">
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 min-h-[40px]">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
