import { normalizeText } from "@ondevaipassar/shared";

// Curated, deterministic shortenings for long words that recur across
// club names (mostly South American opponents, since a tracked team's own
// Team.displayName is already short and curated) — a fallback for when the
// full title line would otherwise force the match-details block down a
// font-size tier. Explicit product decision: prefer this over either
// shrinking the font (feedback: "não é bom que tenhamos que diminuir a
// fonte, fica ruim/feio") or a live internet lookup for a team's
// "apelido" (would make rendering depend on an external call and go
// against this project's "no live search/LLM as a source of truth at
// generation time" rule — see CLAUDE.md). Keyed by normalizeText'd word so
// matching is accent/case-insensitive; values keep proper capitalization.
const WORD_ABBREVIATIONS: Record<string, string> = {
  atletico: "Atl.",
  atletica: "Atl.",
  universidade: "Univ.",
  universidad: "Univ.",
  deportivo: "Dep.",
  deportiva: "Dep.",
  internacional: "Inter.",
  sociedad: "Soc.",
  sociedade: "Soc.",
  independiente: "Indep.",
  associacao: "Assoc.",
};

/** Shortens recurring long words in a team name via the curated dictionary above; words with no entry pass through unchanged. */
export function abbreviateTeamName(name: string): string {
  return name
    .split(" ")
    .map((word) => WORD_ABBREVIATIONS[normalizeText(word)] ?? word)
    .join(" ");
}
