import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";
import { ALL_PAGES } from "./pages";
import { useSeo } from "./seo";

export default function NotFound() {
  useSeo("/404");
  return (
    <MarketingLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-24">
        <p className="text-sm font-semibold text-neutral-600 mb-2">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-black mb-4">This page does not exist</h1>
        <p className="text-neutral-700 mb-8">
          The link may be old or mistyped. Go to the <Link to="/" className="underline font-medium text-black">Quotely Pro home page</Link>, or
          try one of these:
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ALL_PAGES.map((p) => (
            <li key={p.slug}>
              <Link to={`/${p.slug}`} className="text-neutral-800 underline underline-offset-2 hover:text-black">{p.h1}</Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingLayout>
  );
}
