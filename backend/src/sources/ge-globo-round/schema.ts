import { z } from "zod";

// Shape verified against a live fetch of https://ge.globo.com/futebol/brasileirao-serie-b/
// on 2026-08-28 — a different embedded blob than the per-team scheduleTeam
// one (see ../ge-globo/schema.ts): a JS `const listaJogos = [...]` inside a
// <script id="scriptReact"> tag, covering every match of the CURRENT round
// for the whole competition, regardless of which teams are playing. This is
// what makes it valuable as its own source: the per-team source only ever
// finds a match through one of the two teams' own agenda pages, so a match
// between two teams that both lack a working agenda page (confirmed live:
// Athletic x Chapecoense would be exactly this case) is otherwise invisible
// no matter how many individual teams get fixed one at a time.
const roundTeamRefSchema = z.object({
  id: z.number(),
  nome_popular: z.string(),
  escudo: z.string(),
});

const roundMatchSchema = z.object({
  id: z.number(),
  data_realizacao: z.string(),
  hora_realizacao: z.string(),
  equipes: z.object({
    mandante: roundTeamRefSchema,
    visitante: roundTeamRefSchema,
  }),
});

export type RoundMatch = z.infer<typeof roundMatchSchema>;

/** Validates a single raw match, returning null (never throwing) if it doesn't match — one malformed entry must not invalidate the rest of the round. */
export function parseRoundMatch(value: unknown): RoundMatch | null {
  const result = roundMatchSchema.safeParse(value);
  return result.success ? result.data : null;
}
