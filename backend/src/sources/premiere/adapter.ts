import { resolveTeamId } from "../../ingest/teamResolver.js";
import { fetchPremiereApolloState } from "./client.js";
import { extractPremiereMatches } from "./schema.js";

export interface PremiereStream {
  // Nullable, same reasoning as YoutubeStream: Premiere also carries
  // continental matches (Libertadores/Sul-Americana) against South
  // American clubs we don't individually track — see
  // broadcastMatching.ts's TeamPairStream.
  homeTeamId: string | null;
  awayTeamId: string | null;
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
    if (!homeTeamId && !awayTeamId) continue; // neither side is a team we track at all

    streams.push({ homeTeamId, awayTeamId, startTimeUtc: match.startTimeUtc });
  }

  return streams;
}
