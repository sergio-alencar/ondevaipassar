import { startOfTodayInBrasiliaUtc, type MatchView } from "@ondevaipassar/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchMatches(): Promise<MatchView[]> {
  // Anchored on the start of today (BRT), not left off entirely — the
  // backend's own default `from` is "right now", which would otherwise
  // make a match quietly drop out of "today" the moment it kicks off (see
  // startOfTodayInBrasiliaUtc's own doc comment).
  const from = encodeURIComponent(startOfTodayInBrasiliaUtc());
  const response = await fetch(`${API_BASE_URL}/api/matches?from=${from}`);
  if (!response.ok) {
    throw new Error(`Falha ao buscar jogos (HTTP ${response.status})`);
  }
  return response.json() as Promise<MatchView[]>;
}
