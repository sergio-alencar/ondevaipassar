import { fetchText } from "../../http/client.js";
import { extractBalancedJsonObject } from "../../http/json.js";
import { parseRoundMatch, type RoundMatch } from "./schema.js";

const LISTA_JOGOS_MARKER = "const listaJogos = [";

/** Extracts the current round's full match list from a competition hub page — see schema.ts for why this exists alongside the per-team source. */
export function extractListaJogos(html: string): RoundMatch[] {
  const markerIndex = html.indexOf(LISTA_JOGOS_MARKER);
  if (markerIndex === -1) {
    throw new Error(`"${LISTA_JOGOS_MARKER}" not found — ge.globo's competition hub page structure may have changed`);
  }
  const openBracketIndex = markerIndex + LISTA_JOGOS_MARKER.length - 1;
  const rawJson = extractBalancedJsonObject(html, openBracketIndex);
  const parsed: unknown = JSON.parse(rawJson);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(parseRoundMatch).filter((match): match is RoundMatch => match !== null);
}

export async function fetchListaJogos(hubUrl: string): Promise<RoundMatch[]> {
  const html = await fetchText(hubUrl);
  return extractListaJogos(html);
}
