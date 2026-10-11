import { SITE_URL, STATIC_PAGES, type PageMeta } from "@ondevaipassar/shared";
import { useEffect } from "react";

function setContent(selector: string, value: string): void {
  document.head.querySelector(selector)?.setAttribute("content", value);
}

/**
 * Keeps the tab title and the page's tags right as the visitor moves around
 * the app. The build already wrote each page's own tags into its HTML (see
 * scripts/prerender.mjs), which is what link previews and the first crawl
 * read; this covers the rest — navigating from one page to another never
 * reloads the document, so without it the title would stay on the first page
 * visited.
 */
export function usePageMeta(meta: PageMeta | undefined): void {
  const title = meta?.title;
  const description = meta?.description;
  const path = meta?.path;
  const noindex = meta?.noindex === true;

  useEffect(() => {
    if (title === undefined || description === undefined || path === undefined) return;
    const url = `${SITE_URL}${path}`;
    document.title = title;
    setContent('meta[name="description"]', description);
    setContent('meta[name="robots"]', noindex ? "noindex, follow" : "index, follow");
    setContent('meta[property="og:title"]', title);
    setContent('meta[property="og:description"]', description);
    setContent('meta[property="og:url"]', url);
    setContent('meta[name="twitter:title"]', title);
    setContent('meta[name="twitter:description"]', description);
    document.head.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  }, [title, description, path, noindex]);
}

/** The meta of one of the fixed pages ("/gratis", "/sobre"…), by its path. */
export function staticPageMeta(path: string): PageMeta | undefined {
  return STATIC_PAGES.find((page) => page.path === path);
}
