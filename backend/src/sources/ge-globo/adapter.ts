import { TEAMS, resolveChannelId } from "@ondevaipassar/shared";
import { resolveCompetitionId } from "../../ingest/competitionResolver.js";
import { resolveTeamId } from "../../ingest/teamResolver.js";
import { getErrorMessage } from "../../lib/errors.js";
import type { CanonicalBroadcast, CanonicalMatch, FetchResult, FixtureSourceAdapter } from "../types.js";
import { fetchTeamAgenda } from "./client.js";
import { parseSoccerEvent, type SoccerEvent } from "./schema.js";

// Small concurrent batches, not fully sequential: this now runs as a
// serverless function against a real duration limit (previously it was a
// long-lived process where a slow sequential loop cost nothing but time).
// Still polite to ge.globo — a handful of requests in flight, not all ~20 teams at once.
const CONCURRENCY = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

interface Kickoff {
  kickoffUtc: string;
  kickoffTimeConfirmed: boolean;
}

// ge.globo shows local Brasília time; Brazil has used a fixed UTC-3 offset
// (no DST) since 2019, so this fixed-offset conversion is safe.
//
// CBF/broadcasters confirm a round's exact kickoff *time* much closer to
// matchday than the *date* (tied to TV rights negotiations) — a live check
// against Corinthians' real agenda found startDate populated for all of the
// season's remaining rounds but startHour null past the next 1-2, so
// requiring both used to make a team's future fixtures vanish from the site
// for weeks at a time. A date with no confirmed hour still gets a row (at a
// midnight-BRT placeholder, for sorting/day-filtering) with
// kickoffTimeConfirmed: false, so callers can show "horário a confirmar"
// instead of just disappearing the match.
function toKickoff(startDate: string | null, startHour: string | null): Kickoff | null {
  if (!startDate) return null; // not even a date yet — nothing usable to show
  const confirmed = new Date(`${startDate}T${startHour ?? "00:00:00"}-03:00`);
  if (Number.isNaN(confirmed.getTime())) return null;
  return { kickoffUtc: confirmed.toISOString(), kickoffTimeConfirmed: Boolean(startHour) };
}

// ge.globo lists a bare "globoplay" entry alongside whichever real channel
// (sportv, premiere, ...) is actually airing the match. Globoplay there is
// the app SporTV subscribers can stream through, not an independent way to
// gain access — confirmed live: the sportv entry's own description reads
// "com Globoplay Premium", and across every match sampled with a
// "globoplay" entry (Internacional x Atlético-MG and 11 others), it never
// once appeared without sportv/premiere also present (Sérgio also confirmed
// a plain Globoplay subscription doesn't by itself grant SporTV access).
// Showing it as its own logo overstates the real options — someone with
// Globoplay but no SporTV entitlement could click it expecting to watch and
// be wrong. Matches ge.globo's own human-written "onde assistir" article
// for Internacional x Atlético-MG, which names only sportv and premiere
// (the mismatch Sérgio caught). Dropped only when something else is already
// in the list, so a genuinely standalone Globoplay offering (never observed
// so far) would still show.
//
// A `cta` field on each source ("Assine"/subscribe vs. empty) was tried as a
// broader "is this confirmed" filter and reverted — live re-check on
// Náutico x Athletic showed it was wrong: the official "onde assistir"
// article confirms Premiere+SporTV for that match today, yet both entries
// (like every paid-channel entry sampled) carry cta:"Assine" regardless.
// It's generic subscribe copy for any paid channel, not a confirmation
// signal — this dedupe rule alone already produces the right answer here.
export function resolveBroadcasts(sources: SoccerEvent["match"]["liveWatchSources"]): CanonicalBroadcast[] {
  const resolved = (sources ?? [])
    .map((source): CanonicalBroadcast | null => {
      const channelId = resolveChannelId(source.name);
      return channelId ? { channelId, logoUrl: source.officialLogoUrl } : null;
    })
    .filter((broadcast): broadcast is CanonicalBroadcast => broadcast !== null);

  return resolved.length > 1 ? resolved.filter((broadcast) => broadcast.channelId !== "globoplay") : resolved;
}

export function toCanonicalMatch(event: SoccerEvent): CanonicalMatch | null {
  const { match } = event;
  const kickoff = toKickoff(match.startDate, match.startHour);
  if (!kickoff) return null;

  const broadcasts = resolveBroadcasts(match.liveWatchSources);

  return {
    id: `ge-globo:${match.id}`,
    competitionId: resolveCompetitionId(match.phase.championshipEdition.championship.name),
    homeTeamId: resolveTeamId(match.firstContestant.popularName),
    homeTeamNameRaw: match.firstContestant.popularName,
    homeTeamCrestUrl: match.firstContestant.badgeSvg,
    awayTeamId: resolveTeamId(match.secondContestant.popularName),
    awayTeamNameRaw: match.secondContestant.popularName,
    awayTeamCrestUrl: match.secondContestant.badgeSvg,
    kickoffUtc: kickoff.kickoffUtc,
    kickoffTimeConfirmed: kickoff.kickoffTimeConfirmed,
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

    for (const batch of chunk(teamsWithSlug, CONCURRENCY)) {
      await Promise.all(
        batch.map(async (team) => {
          try {
            const schedule = await fetchTeamAgenda(team.aliases.geGlobo);
            for (const rawEvent of schedule.teamAgenda.future) {
              const event = parseSoccerEvent(rawEvent);
              const canonical = event ? toCanonicalMatch(event) : null;
              if (canonical) byId.set(canonical.id, canonical);
              else unresolvedCount++;
            }
          } catch (error) {
            console.error(`[ge-globo] failed to fetch agenda for ${team.id}:`, getErrorMessage(error));
            unresolvedCount++;
          }
        }),
      );
    }

    return { matches: [...byId.values()], unresolvedCount };
  },
};
