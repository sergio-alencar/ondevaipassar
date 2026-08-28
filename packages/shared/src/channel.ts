import { normalizeText } from "./text.js";

export interface Channel {
  id: string;
  displayName: string;
  officialUrl: string;
  /** A second, equally valid place to find this channel's programming (e.g. a channel with two separate YouTube destinations) — shown as a secondary link alongside officialUrl, not a fallback for it. */
  alternateUrl?: string;
  /** True when the source can't tell us whether this actually airs in the viewer's specific region (true today only for "globo" — ge.globo's data has no region/UF field, every entry just says "check local listings"). */
  regionalCaveat?: boolean;
  /** Handle (no "@"), for tagging the broadcaster in the Instagram poster's caption — manually verified against each channel's real profile, not guessed. */
  instagramHandle?: string;
}

// Ported near-verbatim from the old frontend's Components/canais.jsx — that
// registry was already clean, just needed a home both sides could import.
// Kept alphabetical by displayName (pt-BR collation) — re-sort if you add
// or rename a channel, don't just append.
const CHANNELS: Channel[] = [
  {
    id: "band",
    displayName: "Band",
    officialUrl: "https://www.band.com.br/ao-vivo/",
    instagramHandle: "esportenaband",
  },
  {
    id: "goat",
    displayName: "Canal GOAT",
    officialUrl: "https://www.youtube.com/@canalgoatbr/streams",
    instagramHandle: "canalgoatbr",
  },
  {
    id: "cazetv",
    displayName: "CazéTV",
    officialUrl: "https://www.youtube.com/cazetv/streams/",
    instagramHandle: "cazetv",
  },
  {
    id: "dazn",
    displayName: "DAZN",
    officialUrl: "https://www.dazn.com/pt-BR/",
  },
  {
    id: "disneyplus",
    displayName: "Disney+",
    officialUrl: "https://www.disneyplus.com/pt-br/",
    instagramHandle: "disneyplusbr",
  },
  {
    id: "espn",
    displayName: "ESPN",
    officialUrl: "https://www.espn.com.br/",
    instagramHandle: "espnbrasil",
  },
  {
    id: "getv",
    displayName: "ge TV",
    officialUrl: "https://www.youtube.com/@getv/streams/",
    instagramHandle: "getv",
  },
  {
    id: "globo",
    displayName: "Globo",
    officialUrl: "https://globoplay.globo.com/tv-globo/ao-vivo/6120663/",
    regionalCaveat: true,
    instagramHandle: "tvglobo",
  },
  {
    id: "globoplay",
    displayName: "Globoplay",
    officialUrl: "https://globoplay.globo.com/",
    instagramHandle: "globoplay",
  },
  {
    id: "paramountplus",
    displayName: "Paramount Plus",
    officialUrl: "https://www.paramountplus.com/br/collections/sports-hub-br/",
    instagramHandle: "paramountplusesportes",
  },
  {
    id: "premiere",
    displayName: "Premiere",
    officialUrl: "https://globoplay.globo.com/canais/premiere/",
    instagramHandle: "premiere",
  },
  {
    id: "primevideo",
    displayName: "Prime Video",
    officialUrl: "https://www.primevideo.com/sports/",
    instagramHandle: "primevideosportbr",
  },
  {
    id: "record",
    displayName: "Record",
    officialUrl: "https://www.recordplus.com/Live/LiveEvent/",
    instagramHandle: "sigarecord",
  },
  {
    id: "sbt",
    displayName: "SBT",
    officialUrl: "https://www.youtube.com/@SBTSports/streams",
    alternateUrl: "https://www.youtube.com/@sbt/streams",
    instagramHandle: "sbt",
  },
  {
    id: "sportv",
    displayName: "SporTV",
    officialUrl: "https://globoplay.globo.com/sportv/ao-vivo/7339108/",
    instagramHandle: "sportv",
  },
  {
    id: "nossofutebol",
    // Same underlying broadcaster, renamed — kept its original id (used as a
    // DB foreign key and local-asset filename already) to avoid orphaning
    // already-ingested broadcast rows; only the display name/URL changed.
    displayName: "SportyNet",
    officialUrl: "https://www.youtube.com/@SportyNetBrasil/streams",
    instagramHandle: "sportynetbrasil",
  },
  {
    id: "tntsports",
    displayName: "TNT Sports",
    officialUrl: "https://play.hbomax.com/tnt-sports",
    instagramHandle: "tntsportsbr",
  },
  {
    id: "youtube",
    displayName: "YouTube",
    officialUrl: "https://youtube.com/",
    instagramHandle: "youtubebrasil",
  },
];

// Free-text (as seen scraped from ge.globo's liveWatchSources[].name, or typed
// by a human elsewhere) -> canonical Channel id. Consolidates what used to be
// two separate, divergent maps (frontend's MAPEAMENTO_CANAIS and the backend
// scraper's padronizarCanal). Ge.globo's liveWatchSources also lists
// non-broadcast entries (e.g. "Cartola", a fantasy-football upsell) that
// intentionally have no entry here, so they get filtered out rather than mapped.
const CHANNEL_ALIASES: Record<string, string> = {
  band: "band",
  bandeirantes: "band",
  "band sports": "band",
  cazetv: "cazetv",
  "caze tv": "cazetv",
  "cazé tv": "cazetv",
  dazn: "dazn",
  disney: "disneyplus",
  "disney+": "disneyplus",
  "star+": "disneyplus",
  espn: "espn",
  "espn brasil": "espn",
  "espn+": "espn",
  globo: "globo",
  "rede globo": "globo",
  globoplay: "globoplay",
  // ge TV is ge.globo's own free live-text/highlights product — distinct
  // from Globoplay (paid, full match) even though both are Globo-owned.
  // Verified as separate liveWatchSources entries with different
  // description/url/transmissionId, not a naming variant of one another.
  "ge tv": "getv",
  goat: "goat",
  "canal goat": "goat",
  "nosso futebol": "nossofutebol",
  sportynet: "nossofutebol",
  "sporty net": "nossofutebol",
  paramount: "paramountplus",
  "paramount+": "paramountplus",
  "paramount plus": "paramountplus",
  premiere: "premiere",
  prime: "primevideo",
  "prime video": "primevideo",
  "prime vídeo": "primevideo",
  "amazon prime video": "primevideo",
  record: "record",
  "record tv": "record",
  sbt: "sbt",
  sportv: "sportv",
  "sportv 2": "sportv",
  "sportv 3": "sportv",
  tnt: "tntsports",
  "tnt sports": "tntsports",
  youtube: "youtube",
};

/** Resolves free-text channel names to canonical Channel ids, dropping anything unrecognized. */
export function resolveChannelId(rawName: string): string | null {
  return CHANNEL_ALIASES[normalizeText(rawName)] ?? null;
}

export function findChannelById(id: string): Channel | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}
