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

export type DigestFormat = "whatsapp";
export type DigestDay = "hoje" | "amanha";

export interface DigestResponse {
  formato: DigestFormat;
  dia: DigestDay;
  matchCount: number;
  /** One entry per post to publish (a single one, for the Canal do WhatsApp). */
  posts: string[];
}

export async function fetchDigest(formato: DigestFormat, dia: DigestDay): Promise<DigestResponse> {
  const response = await fetch(`${API_BASE_URL}/api/digest?formato=${formato}&dia=${dia}&json=true`);
  if (!response.ok) {
    throw new Error(`Falha ao gerar o digest (HTTP ${response.status})`);
  }
  return response.json() as Promise<DigestResponse>;
}

// --- Optional accounts ------------------------------------------------------
// Every call here sends the session cookie (credentials: "include"). The API
// answers 401 for a signed-out visitor, which is not an error to the site:
// they simply don't have an account, and everything works without one.

export interface MeResponse {
  user: { email: string } | null;
  /** The backend has Google credentials, so "Entrar com Google" leads somewhere. */
  loginAvailable: boolean;
  /** Local development only: the Google-less test login. */
  devLogin: boolean;
}

export interface ServerPreferences {
  teams: string[];
  competitions: string[];
  channels: string[];
  /** Null until the account has saved something. */
  updatedAt: string | null;
}

/** Where the whole-page redirect to Google starts. A link, not a fetch: the browser has to leave the site. */
export const googleLoginUrl = `${API_BASE_URL}/api/auth-google`;
export const devLoginUrl = (email: string) => `${API_BASE_URL}/api/auth-dev?email=${encodeURIComponent(email)}`;

export async function fetchMe(): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/me`, { credentials: "include" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<MeResponse>;
}

export async function fetchServerPreferences(): Promise<ServerPreferences> {
  const response = await fetch(`${API_BASE_URL}/api/preferences`, { credentials: "include" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<ServerPreferences>;
}

export async function saveServerPreferences(preferences: { teams: string[]; competitions: string[]; channels: string[] }): Promise<ServerPreferences> {
  const response = await fetch(`${API_BASE_URL}/api/preferences`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<ServerPreferences>;
}

export async function signOutRequest(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/logout`, { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function deleteAccountRequest(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}
