// Loads the Lead Helper widget (launcher, teaser, download toast, chat) right after hydration.
// Renders nothing on the server and on the first client render, so prerendered HTML and
// hydration are untouched. The widget is a lazy chunk; when and how often the auto teaser
// appears is decided inside it (see leadLog.js for the rules).
import { lazy, Suspense, useEffect, useState } from "react";
import { FEATURES } from "../site";

const LeadHelper = lazy(() => import("./LeadHelper"));

const ENABLED = FEATURES.leadHelper && import.meta.env.VITE_LEAD_HELPER === "on";
// Same app routes as vercel.json: the helper must never run there.
const APP_ROUTE = /^\/(login|signup|subscribe|forgot-password|reset-password|dashboard|warranty|advance-receipts|inventory|reports|profile|print-settings|users|admin|plans|services|modules|spa)(\/|$)|^\/(quotations|invoices)\//;

// page: entry from pages.js, or null for the homepage.
export default function LeadHelperMount({ page }) {
  const [blnReady, setBlnReady] = useState(false);

  useEffect(() => {
    if (!ENABLED || APP_ROUTE.test(window.location.pathname)) return;
    const intTimer = setTimeout(() => setBlnReady(true), 0);
    return () => clearTimeout(intTimer);
  }, []);

  if (!blnReady) return null;
  return (
    <Suspense fallback={null}>
      <LeadHelper page={page} />
    </Suspense>
  );
}
