// Build-time renderer for public marketing pages. Used only by scripts/prerender.mjs.
/* eslint-disable react-refresh/only-export-components -- build-only module, never hot-reloaded */
import { renderToString } from "react-dom/server";
import { StaticRouter, Routes, Route } from "react-router-dom";
import { MARKETING_ROUTES, NOT_FOUND_ELEMENT } from "./marketing/publicRoutes";

export { PUBLIC_ROUTES, NOT_FOUND_ROUTE, buildHead } from "./marketing/seo";
export { SITE, PLANS, FOUNDING_OFFER } from "./marketing/site";
export { HOME } from "./marketing/home";
export { GENERAL_PAGES, INDUSTRY_PAGES, COMPARISON_PAGES } from "./marketing/pages";
export { SAMPLE_PAGES, sampleMeta, computeSample, templatePath } from "./marketing/samples";

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <Routes>
        {MARKETING_ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={NOT_FOUND_ELEMENT} />
      </Routes>
    </StaticRouter>
  );
}
