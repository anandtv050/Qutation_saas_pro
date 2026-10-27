import { lazy, Suspense, useEffect, useState } from "react";

// The editor is a separate chunk: nothing of it is in the marketing bundle, and it is fetched only
// when the browser is idle after hydration. The server (prerender) and the first client render both
// output this same placeholder, so hydration matches and the page does not jump when the editor
// appears (the placeholder reserves about the editor's height).
const QuoteEditor = lazy(() => import("./QuoteEditor.jsx"));

function Skeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-5 shadow-sm" aria-hidden="true" data-qe="skeleton">
      <div className="h-4 w-36 rounded bg-neutral-100" />
      <div className="mt-2 h-11 rounded-lg bg-neutral-100" />
      <div className="mt-4 h-[300px] rounded-lg bg-neutral-50 border border-neutral-100" />
      <div className="mt-3 h-12 rounded-xl bg-neutral-200" />
    </div>
  );
}

// page: the industry page entry (pages.js); mode "home" shows the trade picker instead.
export default function QuoteEditorMount({ page = null, mode = "industry" }) {
  const [blnReady, setBlnReady] = useState(false);

  useEffect(() => {
    const go = () => setBlnReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(go, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(go, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="quote-editor"
      aria-label="Make this quotation"
      data-qe="mount"
      className={
        mode === "home"
          ? "min-h-[560px] lg:min-h-[480px]"
          : "mb-8 min-h-[560px] lg:min-h-[480px] lg:w-[min(1040px,calc(100vw-5rem))] lg:relative lg:left-1/2 lg:-translate-x-1/2"
      }
    >
      {blnReady ? (
        <Suspense fallback={<Skeleton />}>
          <QuoteEditor page={page} mode={mode} />
        </Suspense>
      ) : (
        <Skeleton />
      )}
      <noscript>
        <p className="text-sm text-neutral-700">The editor needs JavaScript. You can still download the free formats below.</p>
      </noscript>
    </section>
  );
}
