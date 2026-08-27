import { resolveTeamId } from "../../ingest/teamResolver.js";
import { fetchPremiereApolloState } from "./client.js";
import { extractPremiereMatches } from "./schema.js";

export interface PremiereStream {
  homeTeamId: string;
  awayTeamId: string;
  startTimeUtc: string;
}

/**
 * Globoplay's Premiere channel page has no fixtures API either — this reads
 * whatever's currently in its "now / starting soon" rotation, which is
 * enough to say *which* match is airing on Premiere but never enough to
 * create a match record itself. See ingest/premiereEnrichment.ts for how
 * this attaches to matches ge.globo already ingested.
 */
export async function fetchPremiereStreams(): Promise<PremiereStream[]> {
  const apolloState = await fetchPremiereApolloState();
  const matches = extractPremiereMatches(apolloState);

  const streams: PremiereStream[] = [];
  for (const match of matches) {
    const homeTeamId = resolveTeamId(match.homeTeamNameRaw);
    const awayTeamId = resolveTeamId(match.awayTeamNameRaw);
    if (!homeTeamId || !awayTeamId) continue; // a real match, just not one involving a team we track

    streams.push({ homeTeamId, awayTeamId, startTimeUtc: match.startTimeUtc });
  }

  return streams;
}
