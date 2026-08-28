import { z } from "zod";

// Shape verified against a live fetch of
// https://ge.globo.com/futebol/times/flamengo/agenda-de-jogos-do-flamengo/
// on 2026-08-22. This is an undocumented blob ge.globo embeds for its own
// page hydration (window.dataSportsSchedule.scheduleTeam), not a published
// API — it can change without notice, hence validating instead of a blind
// cast. startDate/startHour/round/result are nullable because far-future
// fixtures without a confirmed kickoff time really do come back as null
// (observed live, not a defensive guess) — that's a per-match gap to skip,
// not a reason to reject every other match on the same page.
const geGloboTeamRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  popularName: z.string(),
  // Present on every one of 192 contestant objects sampled from a real
  // fetch — the crest for ANY opponent, tracked or not (e.g. a continental
  // club we'll never have a local asset for), straight from the source.
  badgeSvg: z.string(),
  badgePng: z.string(),
});

const liveWatchSourceSchema = z.object({
  name: z.string(),
  url: z.string(),
  officialLogoUrl: z.string(),
  // Empty for a genuinely confirmed broadcast; "Assine" for a generic
  // subscription upsell ge.globo shows regardless of whether this specific
  // match actually airs there — see resolveBroadcasts in adapter.ts for
  // why this field matters. Defaults to a non-empty sentinel (treated as
  // "not confirmed" by resolveBroadcasts) for the rare source that omits
  // it — this project's own rule is "no confirmed broadcast, skip the
  // channel," so an unrecognized/missing signal should fail toward hiding
  // a channel, not toward showing one we can't actually vouch for.
  cta: z.string().default("unknown"),
});

export const soccerEventSchema = z.object({
  __typename: z.literal("SoccerEvent"),
  match: z.object({
    id: z.number(),
    firstContestant: geGloboTeamRefSchema,
    secondContestant: geGloboTeamRefSchema,
    liveWatchSources: z.array(liveWatchSourceSchema).nullable(),
    moment: z.string(),
    phase: z.object({
      championshipEdition: z.object({
        championship: z.object({ name: z.string() }),
      }),
    }),
    result: z.string().nullable(),
    round: z.number().nullable(),
    startDate: z.string().nullable(),
    startHour: z.string().nullable(),
  }),
});

// Loose structural check only — confirms we found the right blob before
// validating each event on its own. Deliberately not z.array(soccerEventSchema):
// one malformed event must not invalidate every other event on the same page.
const scheduleTeamStructureSchema = z.object({
  teamAgenda: z.object({
    future: z.array(z.unknown()),
    past: z.array(z.unknown()),
  }),
});

export type SoccerEvent = z.infer<typeof soccerEventSchema>;
export type LiveWatchSource = z.infer<typeof liveWatchSourceSchema>;
export type ScheduleTeamStructure = z.infer<typeof scheduleTeamStructureSchema>;

export function parseScheduleTeamStructure(value: unknown): ScheduleTeamStructure {
  return scheduleTeamStructureSchema.parse(value);
}

/** Validates a single raw event, returning null (never throwing) if it doesn't match — the caller counts nulls as unresolved instead of failing the whole batch. */
export function parseSoccerEvent(value: unknown): SoccerEvent | null {
  const result = soccerEventSchema.safeParse(value);
  return result.success ? result.data : null;
}
