// Route metadata + <head> builder for public marketing pages.
// Used by the prerender script (build time) and useSeo (client-side navigation).
import { useEffect } from "react";
import { SITE, ORG_JSONLD, ABOUT_ORG_JSONLD, WEBSITE_JSONLD, SOFTWARE_JSONLD } from "./site";
import { HOME, HOME_FAQS } from "./home";
import { ALL_PAGES } from "./pages";

export const stripLinks = (strText) => strText.replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, "$1");

export const canonicalFor = (path) => (path === "/" ? `${SITE.url}/` : `${SITE.url}${path}`);

function faqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: stripLinks(f.a) },
    })),
  };
}

function breadcrumbJsonLd(page) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
      { "@type": "ListItem", position: 2, name: page.h1, item: canonicalFor(`/${page.slug}`) },
    ],
  };
}

// Every route that is prerendered to static HTML. Order = sitemap order.
export const PUBLIC_ROUTES = [
  {
    path: HOME.path,
    title: HOME.title,
    description: HOME.description,
    jsonLd: [ORG_JSONLD, WEBSITE_JSONLD, SOFTWARE_JSONLD, faqJsonLd(HOME_FAQS)],
  },
  ...ALL_PAGES.map((page) => ({
    path: `/${page.slug}`,
    title: page.title,
    description: page.description,
    jsonLd:
      page.slug === "about"
        ? [ABOUT_ORG_JSONLD, faqJsonLd(page.faqs), breadcrumbJsonLd(page)]
        : [faqJsonLd(page.faqs), breadcrumbJsonLd(page)],
  })),
];

export const NOT_FOUND_ROUTE = {
  path: "/404",
  title: "Page not found | Quotely Pro",
  description: "This page does not exist on Quotely Pro.",
  noindex: true,
  jsonLd: [],
};

export const findRoute = (path) => PUBLIC_ROUTES.find((r) => r.path === path);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Serialize JSON-LD safely for embedding in <script>.
const ldJson = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

export function buildHead(route) {
  const strCanonical = canonicalFor(route.path);
  const lstTags = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
  ];
  if (route.noindex) {
    lstTags.push(`<meta name="robots" content="noindex, follow" />`);
  } else {
    lstTags.push(
      `<meta name="robots" content="index, follow, max-image-preview:large" />`,
      `<link rel="canonical" href="${strCanonical}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:url" content="${strCanonical}" />`,
      `<meta property="og:title" content="${esc(route.title)}" />`,
      `<meta property="og:description" content="${esc(route.description)}" />`,
      `<meta property="og:site_name" content="${SITE.name}" />`,
      `<meta property="og:locale" content="en_IN" />`,
      `<meta property="og:image" content="${SITE.ogImage}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="Quotely Pro – quotation maker for small businesses in India" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(route.title)}" />`,
      `<meta name="twitter:description" content="${esc(route.description)}" />`,
      `<meta name="twitter:image" content="${SITE.ogImage}" />`
    );
  }
  for (const obj of route.jsonLd) {
    lstTags.push(`<script type="application/ld+json">${ldJson(obj)}</script>`);
  }
  return lstTags.join("\n    ");
}

function setMeta(strSelector, strAttr, strValue) {
  const el = document.head.querySelector(strSelector);
  if (el) el.setAttribute(strAttr, strValue);
}

// Keeps title/description/canonical correct when moving between public pages client-side.
// Crawlers get the full prerendered <head>; this is only for users and shared links.
export function useSeo(path) {
  useEffect(() => {
    const route = findRoute(path) || NOT_FOUND_ROUTE;
    document.title = route.title;
    setMeta('meta[name="description"]', "content", route.description);
    setMeta('link[rel="canonical"]', "href", canonicalFor(route.path));
    setMeta('meta[property="og:url"]', "content", canonicalFor(route.path));
    setMeta('meta[property="og:title"]', "content", route.title);
    setMeta('meta[property="og:description"]', "content", route.description);
  }, [path]);
}
