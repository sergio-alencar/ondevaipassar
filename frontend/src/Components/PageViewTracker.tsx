import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, useConsent } from "../lib/analytics";

/** Reports each page the visitor opens (the router never reloads the document, so Analytics can't see them by itself). Runs again when consent is granted, so the page the visitor was on when they accepted is counted too. */
const PageViewTracker = () => {
  const { pathname } = useLocation();
  const consent = useConsent();

  useEffect(() => {
    if (consent !== "granted") return;
    // The title is set by usePageMeta in the page's own effect, which runs before this one.
    trackPageView(pathname, document.title);
  }, [pathname, consent]);

  return null;
};

export default PageViewTracker;
