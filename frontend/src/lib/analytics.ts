import { useSyncExternalStore } from "react";

/**
 * Google Analytics 4, behind consent. Nothing here loads Google's script, sets
 * a cookie or sends a request until the visitor has said yes (LGPD: consent
 * first, not an opt-out afterwards). Without a measurement id in the build
 * (VITE_GA_MEASUREMENT_ID) the whole feature is inert: no banner, no script —
 * which is what local development and any build made before the id exists get.
 */
const MEASUREMENT_ID: string | undefined = import.meta.env.VITE_GA_MEASUREMENT_ID || undefined;

const CONSENT_KEY = "ondevaipassar:consent:v1";

export type Consent = "granted" | "denied" | "undecided";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

/** Whether this build can track at all, which is also whether to ask about it. */
export const analyticsAvailable = MEASUREMENT_ID !== undefined;

function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "undecided";
  } catch {
    // Storage blocked: can't remember an answer, so treat it as no.
    return "denied";
  }
}

let consent: Consent = "undecided";
let initialised = false;
const listeners = new Set<() => void>();

function init(): void {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  consent = readConsent();
  if (consent === "granted") loadGoogleAnalytics();
}

function loadGoogleAnalytics(): void {
  if (MEASUREMENT_ID === undefined || window.gtag) return;
  window[`ga-disable-${MEASUREMENT_ID}`] = false;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push its `arguments` object, not an array: that is what the library reads.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  // send_page_view off: this is a single-page app, so the router reports each
  // page itself (PageViewTracker). Signals and ad personalisation off: this is
  // audience measurement, not advertising.
  window.gtag("config", MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

function removeGoogleCookies(): void {
  for (const name of document.cookie.split(";").map((part) => part.split("=")[0].trim())) {
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
      const host = window.location.hostname;
      for (const domain of [host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
      }
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

export function setConsent(next: "granted" | "denied"): void {
  init();
  consent = next;
  try {
    window.localStorage.setItem(CONSENT_KEY, next);
  } catch {
    // Not remembered; asked again next visit.
  }
  if (next === "granted") {
    loadGoogleAnalytics();
  } else if (MEASUREMENT_ID !== undefined) {
    // Stop anything already loaded and clear what it left behind.
    window[`ga-disable-${MEASUREMENT_ID}`] = true;
    removeGoogleCookies();
  }
  listeners.forEach((listener) => listener());
}

/** Forgets the answer, so the banner asks again (the "Preferências de cookies" link). */
export function reopenConsent(): void {
  init();
  consent = "undecided";
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Same as above.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Consent {
  init();
  return consent;
}

export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, getSnapshot, () => "undecided");
}

export function trackPageView(path: string, title: string): void {
  init();
  if (consent !== "granted" || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path, page_location: `${window.location.origin}${path}`, page_title: title });
}

export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}): void {
  init();
  if (consent !== "granted" || !window.gtag) return;
  window.gtag("event", name, params);
}
