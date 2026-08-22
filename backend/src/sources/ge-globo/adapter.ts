import { TEAMS, resolveChannelId } from "@ondevaipassar/shared";
import { resolveCompetitionId } from "../../ingest/competitionResolver.js";
import { resolveTeamId } from "../../ingest/teamResolver.js";
import type { CanonicalBroadcast, CanonicalMatch, FetchResult, FixtureSourceAdapter } from "../types.js";
import { fetchTeamAgenda } from "./client.js";
import { parseSoccerEvent, type SoccerEvent } from "./schema.js";

const BETWEEN_TEAM_REQUESTS_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ge.globo shows local Brasília time; Brazil has used a fixed UTC-3 offset
// (no DST) since 2019, so this fixed-offset conversion is safe.
function toKickoffUtcIso(startDate: string | null, startHour: string | null): string | null {
  if (!startDate || !startHour) return null; // kickoff not yet announced — skip until it is
  const date = new Date(`${startDate}T${startHour}-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toCanonicalMatch(event: SoccerEvent): CanonicalMatch | null {
  const { match } = event;
  const kickoffUtc = toKickoffUtcIso(match.startDate, match.startHour);
  if (!kickoffUtc) return null;

  const broadcasts: CanonicalBroadcast[] = (match.liveWatchSources ?? [])
    .map((source): CanonicalBroadcast | null => {
      const channelId = resolveChannelId(source.name);
      return channelId ? { channelId, logoUrl: source.officialLogoUrl } : null;
    })
    .filter((broadcast): broadcast is CanonicalBroadcast => broadcast !== null);

  return {
    id: `ge-globo:${match.id}`,
    competitionId: resolveCompetitionId(match.phase.championshipEdition.championship.name),
    homeTeamId: resolveTeamId(match.firstContestant.popularName),
    homeTeamNameRaw: match.firstContestant.popularName,
    homeTeamCrestUrl: match.firstContestant.badgeSvg,
    awayTeamId: resolveTeamId(match.secondContestant.popularName),
    awayTeamNameRaw: match.secondContestant.popularName,
    awayTeamCrestUrl: match.secondContestant.badgeSvg,
    kickoffUtc,
    round: match.round,
    status: "scheduled",
    broadcasts,
  };
}

export const geGloboAdapter: FixtureSourceAdapter = {
  id: "ge-globo",
  async fetchMatches(): Promise<FetchResult> {
    const teamsWithSlug = TEAMS.filter(
      (team): team is typeof team & { aliases: { geGlobo: string } } => team.aliases.geGlobo !== null,
    );

    const byId = new Map<string, CanonicalMatch>();
    let unresolvedCount = 0;

    for (const team of teamsWithSlug) {
      try {
        const schedule = await fetchTeamAgenda(team.aliases.geGlobo);
        for (const rawEvent of schedule.teamAgenda.future) {
          const event = parseSoccerEvent(rawEvent);
          const canonical = event ? toCanonicalMatch(event) : null;
          if (canonical) byId.set(canonical.id, canonical);
          else unresolvedCount++;
        }
      } catch (error) {
        console.error(`[ge-globo] failed to fetch agenda for ${team.id}:`, (error as Error).message);
        unresolvedCount++;
      }
      await sleep(BETWEEN_TEAM_REQUESTS_MS);
    }

    return { matches: [...byId.values()], unresolvedCount };
  },
};
