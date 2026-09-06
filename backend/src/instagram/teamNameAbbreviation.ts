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
  sociedad: "Soc.",
  sociedade: "Soc.",
  independiente: "Indep.",
  associacao: "Assoc.",
};

// Whole-name shortenings, checked before the per-word pass above. These
// are the names Brazilian coverage actually uses day to day, not
// inventions — "Man City", not "M. City". Sérgio supplied the first five;
// the rest came from listing every team name that has actually appeared in
// our own data at 13+ characters, so this shortens names we really render
// rather than ones imagined. Keyed by normalizeText'd name.
//
// Deliberately NOT applied to the site or the digest: those have room, and
// a team page saying "Man City" where the club is listed as "Manchester
// City" would read as a different thing. This is only for the image, where
// a long pairing forces the whole block down a size tier.
const FULL_NAME_ABBREVIATIONS: Record<string, string> = {
  "manchester city": "Man City",
  "manchester united": "Man United",
  "bayern de munique": "FC Bayern",
  "paris saint-germain": "PSG",
  "nottingham forest": "Notts Forest",
  // Below: from our own rendered data, using each club's common Brazilian
  // short name. Left alone on purpose — "Athletic Bilbao" (Athletic alone
  // collides with Série B's Athletic Club), "Racing Santander" (Racing
  // alone collides with Racing Club), "Inter de Milão" (the "de Milão" is
  // what separates it from Internacional).
  "borussia dortmund": "Dortmund",
  "bayer leverkusen": "Leverkusen",
  "vfb stuttgart": "Stuttgart",
  "psv eindhoven": "PSV",
  "afc bournemouth": "Bournemouth",
  "coventry city fc": "Coventry",
  "coventry city": "Coventry",
  "stade brestois 29": "Brest",
};

/** Shortens a team name for the image: a whole-name entry if there is one, else the per-word dictionary; anything with neither passes through unchanged. */
export function abbreviateTeamName(name: string): string {
  const full = FULL_NAME_ABBREVIATIONS[normalizeText(name)];
  if (full) return full;

  return name
    .split(" ")
    .map((word) => WORD_ABBREVIATIONS[normalizeText(word)] ?? word)
    .join(" ");
}
