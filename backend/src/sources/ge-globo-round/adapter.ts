import { resolveTeamId } from "../../ingest/teamResolver.js";
import { getErrorMessage } from "../../lib/errors.js";
import type { CanonicalMatch, FetchResult, FixtureSourceAdapter } from "../types.js";
import { fetchListaJogos } from "./client.js";
import type { RoundMatch } from "./schema.js";

// Only the two competitions ge.globo runs this "current round" hub widget
// for that this project ingests daily — same two as the onde-assistir news
// feed's ESPN counterpart would have targeted, chosen for the same reason:
// highest match volume, daily relevance. One more entry here is the whole
// diff for tracking another competition's hub, same spirit as
// youtubeEnrichment.ts's TRACKED_CHANNELS list.
const HUB_SOURCES: { url: string; competitionId: string }[] = [
  { url: "https://ge.globo.com/futebol/brasileirao-serie-a/", competitionId: "brasileirao-serie-a" },
  { url: "https://ge.globo.com/futebol/brasileirao-serie-b/", competitionId: "brasileirao-serie-b" },
];

// Brazil has used a fixed UTC-3 offset (no DST) since 2019 — same assumption
// ge-globo/adapter.ts's toKickoff relies on for the per-team source; not
// reused directly here because the input shape differs (one combined
// "YYYY-MM-DDTHH:MM" string here vs. separate nullable startDate/startHour
// there).
function toKickoffUtc(dataRealizacao: string): string | null {
  const parsed = new Date(`${dataRealizacao}:00-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function toCanonicalMatch(match: RoundMatch, competitionId: string): CanonicalMatch | null {
  const kickoffUtc = toKickoffUtc(match.data_realizacao);
  if (!kickoffUtc) return null;

  return {
    id: `ge-globo:${match.id}`,
    competitionId,
    homeTeamId: resolveTeamId(match.equipes.mandante.nome_popular),
    homeTeamNameRaw: match.equipes.mandante.nome_popular,
    homeTeamCrestUrl: match.equipes.mandante.escudo,
    awayTeamId: resolveTeamId(match.equipes.visitante.nome_popular),
    awayTeamNameRaw: match.equipes.visitante.nome_popular,
    awayTeamCrestUrl: match.equipes.visitante.escudo,
    kickoffUtc,
    kickoffTimeConfirmed: Boolean(match.hora_realizacao),
    // Not present in this widget's shape (unlike the per-team source's
    // `round` field) — null is this project's existing convention for "we
    // don't know", not a guess.
    round: null,
    status: "scheduled",
    // This source only proves a match exists, with real team identity and
    // kickoff time — it never carries real broadcast confirmation (its own
    // "transmissao" field is just a generic pre-kickoff status label, the
    // same PRE_DIA/"fique por dentro" placeholder the per-team source
    // already learned isn't a channel confirmation — see resolveBroadcasts
    // in ge-globo/adapter.ts). Broadcasts get attached by the other sources
    // once this match row exists for them to attach to.
    broadcasts: [],
  };
}

/**
 * Whole-round fixture source, complementary to (not a replacement for) the
 * per-team geGloboAdapter: that source only ever discovers a match through
 * one of the two teams' own agenda pages, so a match between two teams that
 * BOTH currently lack a working agenda page is otherwise invisible no
 * matter how many individual teams get a fixed alias — real bug found live
 * (Novorizontino x Sport was missing entirely before both teams got fixed;
 * Athletic x Chapecoense would hit the exact same gap and isn't fixable by
 * adding more individual team aliases, since neither team's own ge.globo
 * page has been found working). This source has no such per-team
 * dependency: it reads the competition's own current-round widget directly.
 *
 * Registered *before* geGloboAdapter in registry.ts on purpose: matches.ts's
 * upsert-on-conflict never overwrites a row's original sourceId, but DOES
 * overwrite other fields (round, competitionId, ...) on every conflicting
 * run — running this coarser source first and the richer per-team source
 * second means the per-team source's better data (e.g. an actual round
 * number) always wins for any match both sources find, while this source
 * still contributes the matches the per-team source never would have found
 * at all.
 */
export const geGloboRoundAdapter: FixtureSourceAdapter = {
  id: "ge-globo-round",
  async fetchMatches(): Promise<FetchResult> {
    const byId = new Map<string, CanonicalMatch>();
    let unresolvedCount = 0;

    for (const hub of HUB_SOURCES) {
      try {
        const rawMatches = await fetchListaJogos(hub.url);
        for (const rawMatch of rawMatches) {
          const canonical = toCanonicalMatch(rawMatch, hub.competitionId);
          if (canonical) byId.set(canonical.id, canonical);
          else unresolvedCount++;
        }
      } catch (error) {
        console.error(`[ge-globo-round] failed to fetch hub ${hub.url}:`, getErrorMessage(error));
        unresolvedCount++;
      }
    }

    return { matches: [...byId.values()], unresolvedCount };
  },
};
