import type { MatchView } from "@ondevaipassar/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchMatches(): Promise<MatchView[]> {
  const response = await fetch(`${API_BASE_URL}/api/matches`);
  if (!response.ok) {
    throw new Error(`Falha ao buscar jogos (HTTP ${response.status})`);
  }
  return response.json() as Promise<MatchView[]>;
}
