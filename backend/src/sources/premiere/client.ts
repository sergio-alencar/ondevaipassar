import { fetchText } from "../../http/client.js";
import { extractBalancedJsonObject } from "../../http/json.js";
import { parseApolloState, type ApolloState } from "./schema.js";

const PREMIERE_URL = "https://globoplay.globo.com/canais/premiere/";
const MARKER = "apolloState: ";

// Globoplay's "canal" page is a client-rendered SPA (no <script type=
// "application/ld+json"> with real content, unlike a normal server-rendered
// page — checked live) — but it still server-renders an Apollo GraphQL
// cache for hydration, inside `var Quicksilver = { ..., apolloState: {...},
// ... }`. Same trick as ge.globo's scheduleTeam and YouTube's
// ytInitialData: locate the marker, balanced-brace-extract just that
// value (valid JSON on its own, unlike the outer JS object literal).
// Confirmed live: this page currently only shows a handful of matches (the
// channel grid's "now / starting soon" rotation, not a full day's slate) —
// this is a supplementary source, not the primary way broadcasts get
// attached (ge.globo's own liveWatchSources already covers "premiere" for
// most matches; see ingest/premiereEnrichment.ts for how this fills gaps).
export function extractApolloState(html: string): ApolloState {
  const markerIndex = html.indexOf(MARKER);
  if (markerIndex === -1) {
    throw new Error(`"${MARKER}" not found — Globoplay's page structure may have changed`);
  }
  const openBraceIndex = markerIndex + MARKER.length;
  const rawJson = extractBalancedJsonObject(html, openBraceIndex);
  return parseApolloState(JSON.parse(rawJson));
}

export async function fetchPremiereApolloState(): Promise<ApolloState> {
  const html = await fetchText(PREMIERE_URL);
  return extractApolloState(html);
}
