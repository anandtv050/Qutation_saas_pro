// Prerendered public routes, shared by App.jsx (client) and entry-server.jsx (build).
import Landing from "../pages/Landing";
import MarketingPage from "./MarketingPage";
import NotFound from "./NotFound";
import { ALL_PAGES } from "./pages";

export const MARKETING_ROUTES = [
  { path: "/", element: <Landing /> },
  ...ALL_PAGES.map((p) => ({ path: `/${p.slug}`, element: <MarketingPage slug={p.slug} /> })),
];

export const NOT_FOUND_ELEMENT = <NotFound />;
