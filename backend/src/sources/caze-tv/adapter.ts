import { resolveTeamId } from "../../ingest/teamResolver.js";
import { fetchCazeTvPageData, findAllByKey } from "./client.js";
import {
  parseAvatarUrl,
  parseLockupViewModel,
  parseMatchTitle,
  parseScheduledDate,
  type ParsedStreamDate,
} from "./schema.js";

export interface CazeTvStream {
  videoId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledDate: ParsedStreamDate;
}

export interface CazeTvFetchResult {
  streams: CazeTvStream[];
  channelLogoUrl: string;
  /** Grid items that didn't even match our validated shape — a real "YouTube's page changed" signal. A title that isn't a match, or a match between two teams we don't track (CazéTV streams plenty of non-Brazilian football too), is a normal skip and NOT counted here — otherwise this would read "partial" every single day. */
  unresolvedCount: number;
}

/**
 * CazéTV has no fixtures API of its own — this reads its YouTube channel's
 * "Streams" tab, which only ever gives us a title (team names) and an
 * unreliable date (see schema.ts). That's enough to say *which* match a
 * stream is for, never enough to create a match record — this intentionally
 * does not implement FixtureSourceAdapter; see ingest/cazeTvEnrichment.ts
 * for how the result gets attached to matches ge.globo already ingested.
 */
export async function fetchCazeTvStreams(): Promise<CazeTvFetchResult> {
  const data = await fetchCazeTvPageData();

  const channelLogoUrl = findAllByKey(data, "avatarViewModel")
    .map(parseAvatarUrl)
    .find((url): url is string => url !== null);
  if (!channelLogoUrl) {
    throw new Error("could not find CazéTV's channel avatar — YouTube's page structure may have changed");
  }

  const streams: CazeTvStream[] = [];
  let unresolvedCount = 0;

  for (const raw of findAllByKey(data, "lockupViewModel")) {
    const lockup = parseLockupViewModel(raw);
    if (!lockup) {
      unresolvedCount++;
      continue;
    }

    const titleMatch = parseMatchTitle(lockup.metadata.lockupMetadataViewModel.title.content);
    if (!titleMatch) continue; // not a match stream (interview, highlights, etc.)

    const rows = lockup.metadata.lockupMetadataViewModel.metadata?.contentMetadataViewModel.metadataRows ?? [];
    const rowTexts = rows.flatMap((row) =>
      (row.metadataParts ?? []).map((part) => part.text?.content).filter((text): text is string => Boolean(text)),
    );
    const scheduledDate = parseScheduledDate(rowTexts);
    if (!scheduledDate) continue; // not an upcoming scheduled stream (already live or ended)

    const homeTeamId = resolveTeamId(titleMatch.homeTeamNameRaw);
    const awayTeamId = resolveTeamId(titleMatch.awayTeamNameRaw);
    if (!homeTeamId || !awayTeamId) continue; // a real match, just not one involving a team we track

    streams.push({ videoId: lockup.contentId, homeTeamId, awayTeamId, scheduledDate });
  }

  return { streams, channelLogoUrl, unresolvedCount };
}
