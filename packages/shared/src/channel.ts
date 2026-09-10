import { normalizeText } from "./text.js";

/**
 * How a viewer actually reaches this channel. Kept as data (it's what tells
 * TNT-the-cable-channel from TNT Sports-the-YouTube-brand, the case that
 * forced it into existence) but deliberately NOT what the logo badge shows:
 * badging every "tv" and "youtube" channel marked 22 of 30 entries, which is
 * a taxonomy, not a signal. `free` is the marker instead — see below.
 */
export type ChannelKind = "tv" | "streaming" | "youtube";

export interface Channel {
  id: string;
  displayName: string;
  kind: ChannelKind;
  officialUrl: string;
  /** True when the source can't tell us whether this actually airs in the viewer's specific region (true today only for "globo" — ge.globo's data has no region/UF field, every entry just says "check local listings"). */
  regionalCaveat?: boolean;
  /**
   * Watchable at no cost: TV aberta and free YouTube channels, plus
   * OneFootball's own free streams. A free account can be required (Globo's
   * signal on Globoplay, OneFootball) — "grátis" here means no payment, not
   * no signup.
   *
   * Curated per channel rather than derived from `kind`, because the two
   * axes genuinely disagree: OneFootball is `streaming` and free, ESPN is
   * `tv` and paid. It's the badge the logos carry, and it earns that spot by
   * being the exception — 53 of 246 live broadcast rows, about one in five.
   */
  free?: true;
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
    kind: "tv",
    free: true,
    officialUrl: "https://www.band.com.br/ao-vivo",
    instagramHandle: "esportenaband",
  },
  // Separada da Band pelo mesmo motivo que TNT foi separada de TNT Sports:
  // a Band e aberta e de graca, a BandSports so existe na TV por assinatura.
  // Enquanto eram uma coisa so, um jogo da BandSports aparecia como "Band" —
  // e, com o selo de grátis, passaria a dizer a quem nao tem TV paga que da
  // pra assistir sem pagar. Quem emitia isso era o meuguia.tv, cuja grade e
  // toda de TV paga (codigo "BSP", confirmado ao vivo: o <title> da pagina e
  // "Programação Band Sports").
  {
    id: "bandsports",
    displayName: "BandSports",
    kind: "tv",
    officialUrl: "https://bandsports.uol.com.br",
  },
  {
    id: "canaldobenja",
    displayName: "Canal do Benja",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@canaldobenjaoficial/streams",
  },
  {
    id: "goat",
    displayName: "Canal GOAT",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@canalgoatbr/streams",
    instagramHandle: "canalgoatbr",
  },
  {
    id: "cazetv",
    displayName: "CazéTV",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/cazetv/streams",
    instagramHandle: "cazetv",
  },
  {
    id: "dazn",
    displayName: "DAZN",
    kind: "streaming",
    officialUrl: "https://www.dazn.com/pt-BR",
  },
  {
    id: "disneyplus",
    displayName: "Disney+",
    kind: "streaming",
    officialUrl: "https://www.disneyplus.com/pt-br",
    instagramHandle: "disneyplusbr",
  },
  {
    id: "espn",
    displayName: "ESPN",
    kind: "tv",
    officialUrl: "https://www.espn.com.br",
    instagramHandle: "espnbrasil",
  },
  {
    id: "fpftv",
    displayName: "FPF TV",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@federacaopr/streams",
    instagramHandle: "federacaopr",
  },
  {
    id: "getv",
    displayName: "ge TV",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@getv/streams",
    instagramHandle: "getv",
  },
  {
    id: "globo",
    displayName: "Globo",
    kind: "tv",
    free: true,
    officialUrl: "https://globoplay.globo.com/tv-globo/ao-vivo/6120663",
    regionalCaveat: true,
    instagramHandle: "tvglobo",
  },
  // Deliberately NOT `free`. TV Globo's live signal does stream here for
  // nothing (a Conta Globo, no payment) — but that's the same broadcast as
  // the "globo" entry, which already links straight to it, so a second free
  // door to one broadcast would be double-counting. Everything else
  // Globoplay carries (SporTV, Premiere) is a paid entitlement, which is why
  // resolveBroadcasts drops this entry whenever a real channel is listed
  // beside it (see sources/ge-globo/adapter.ts).
  {
    id: "globoplay",
    displayName: "Globoplay",
    kind: "streaming",
    officialUrl: "https://globoplay.globo.com",
    instagramHandle: "globoplay",
  },
  // Sérgio asked for this to always be shown alongside TNT Sports, never on
  // its own — TNT Sports' own Champions League games stream through the
  // HBO Max app, so a viewer following either brand should see both. See
  // ingest/channelMirroring.ts for how a "tntsports" broadcast automatically
  // gets a companion "hbomax" row, regardless of which source confirmed it.
  {
    id: "hbomax",
    displayName: "HBO Max",
    kind: "streaming",
    officialUrl: "https://www.hbomax.com/br/pt/sports",
    instagramHandle: "hbomaxbrasil",
  },
  {
    id: "nsports",
    displayName: "N Sports",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@NSports/streams",
    instagramHandle: "nsports",
  },
  // Sérgio flagged both of these for Bundesliga coverage.
  {
    id: "jovempanesportes",
    displayName: "Jovem Pan Esportes",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@jovempanesportes/streams",
    instagramHandle: "jovempanesportes",
  },
  {
    id: "romariotv",
    displayName: "Romário TV",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@RomarioTVoficial/streams",
    instagramHandle: "romariotv_oficial",
  },
  // Free live streaming of some of its own tracked competitions — confirmed
  // live for the Bundesliga (both divisions), signaled per-match by the
  // scraped page's own "ottStreamType" field. See
  // ingest/onefootballEnrichment.ts for how that gets turned into a real
  // broadcast row, distinct from this source's older, broadcast-unrelated
  // use as a fixture backfill (same file).
  {
    id: "onefootball",
    displayName: "OneFootball",
    kind: "streaming",
    free: true,
    officialUrl: "https://onefootball.com",
    instagramHandle: "onefootball",
  },
  {
    id: "paramountplus",
    displayName: "Paramount Plus",
    kind: "streaming",
    officialUrl: "https://www.paramountplus.com/br/collections/sports-hub-br",
    instagramHandle: "paramountplusesportes",
  },
  {
    id: "premiere",
    displayName: "Premiere",
    kind: "tv",
    officialUrl: "https://globoplay.globo.com/canais/premiere",
    instagramHandle: "premiere",
  },
  {
    id: "primevideo",
    displayName: "Prime Video",
    kind: "streaming",
    officialUrl: "https://www.primevideo.com/sports",
    instagramHandle: "primevideosportbr",
  },
  {
    id: "record",
    displayName: "Record",
    kind: "tv",
    free: true,
    officialUrl: "https://www.recordplus.com/Live/LiveEvent",
    instagramHandle: "sigarecord",
  },
  {
    id: "sbt",
    displayName: "SBT",
    kind: "tv",
    free: true,
    // SBT also streams from its main channel (youtube.com/@sbt/streams), and
    // that used to render as an "outro link" under the logo. Sérgio asked
    // for it gone: a second link there reads as a second broadcast rather
    // than another door to the same one.
    officialUrl: "https://www.youtube.com/@SBTSports/streams",
    instagramHandle: "sbt",
  },
  // Sérgio: transmite Champions League ao lado do HBO Max (confirmado no
  // futnatv, "Space e HBO MAX" para PSV x Shakhtar).
  {
    id: "space",
    displayName: "Space",
    kind: "tv",
    officialUrl: "https://www.hbomax.com/br/pt/sports",
    instagramHandle: "canalspacebr",
  },
  {
    id: "sportv",
    displayName: "SporTV",
    kind: "tv",
    officialUrl: "https://globoplay.globo.com/sportv/ao-vivo/7339108",
    instagramHandle: "sportv",
  },
  {
    id: "nossofutebol",
    // Same underlying broadcaster, renamed — kept its original id (used as a
    // DB foreign key and local-asset filename already) to avoid orphaning
    // already-ingested broadcast rows; only the display name/URL changed.
    displayName: "SportyNet",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@SportyNetBrasil/streams",
    instagramHandle: "sportynetbrasil",
  },
  // Duas entradas de propósito, e as fontes já as tratam assim ("TNT" vs
  // "YouTube (TNT Sports)"): na TV paga o canal chama-se TNT, enquanto TNT
  // Sports é a marca esportiva que transmite de graça no YouTube. Enquanto
  // eram uma coisa só, um jogo que passava na TNT aparecia como "TNT
  // Sports" com link para o HBO Max, e quem tinha TV a cabo procurava na
  // grade um canal com esse nome, que não existe.
  {
    id: "tnt",
    displayName: "TNT",
    kind: "tv",
    officialUrl: "https://www.hbomax.com/br/pt/sports",
    instagramHandle: "tntbr",
  },
  {
    id: "tntsports",
    displayName: "TNT Sports",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@TNTSportsBR/streams",
    instagramHandle: "tntsportsbr",
  },
  {
    id: "tvbrasil",
    displayName: "TV Brasil",
    kind: "tv",
    free: true,
    officialUrl: "https://play.ebc.com.br/tvs",
    instagramHandle: "tvbrasil",
  },
  {
    id: "uolesporte",
    displayName: "UOL Esporte",
    kind: "youtube",
    free: true,
    officialUrl: "https://www.youtube.com/@UOLEsporte/streams",
  },
  {
    id: "xsports",
    displayName: "XSports",
    // TV aberta, not a subscription app: it launched in Aug/2025 as a free
    // over-the-air sports channel (digital terrestrial + parabólica) and
    // mirrors matches on its own YouTube. Being carried by Claro/Sky/Vivo
    // as well doesn't make it paid, same as Globo.
    kind: "tv",
    free: true,
    officialUrl: "https://www.xsports.com.br",
    instagramHandle: "xsports.brasil",
  },
  {
    id: "youtube",
    displayName: "YouTube",
    kind: "youtube",
    free: true,
    officialUrl: "https://youtube.com",
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
  "band sports": "bandsports",
  bandsports: "bandsports",
  "canal do benja": "canaldobenja",
  benja: "canaldobenja",
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
  // Confirmed live (futnatv.net): ESPN's numbered feeds air genuinely
  // different matches in parallel, same simplification already made for
  // meuguia.tv's own ES2-ES5 channel codes — a viewer just needs "it's on
  // ESPN," not which feed.
  "espn 2": "espn",
  "espn 3": "espn",
  "espn 4": "espn",
  "espn 5": "espn",
  "fpf tv": "fpftv",
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
  "n sports": "nsports",
  nsports: "nsports",
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
  "hbo max": "hbomax",
  hbomax: "hbomax",
  onefootball: "onefootball",
  sbt: "sbt",
  space: "space",
  sportv: "sportv",
  "sportv 2": "sportv",
  "sportv 3": "sportv",
  tnt: "tnt",
  "tnt sports": "tntsports",
  "tv brasil": "tvbrasil",
  "uol esporte": "uolesporte",
  xsports: "xsports",
  youtube: "youtube",
};

/** Resolves free-text channel names to canonical Channel ids, dropping anything unrecognized. */
export function resolveChannelId(rawName: string): string | null {
  return CHANNEL_ALIASES[normalizeText(rawName)] ?? null;
}

export function findChannelById(id: string): Channel | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}

/**
 * Shown when a broadcast varies by region and we have NO state list for it.
 * Lives here rather than in each surface because the site, the Instagram
 * caption and the daily digest must all say the same thing — they were
 * three separate copies of this sentence before.
 */
export const REGIONAL_CAVEAT_TEXT = "A transmissão pela Globo pode variar por região — confira a programação local";

/**
 * Appended when we DO have a state list. Globo's coverage splits below
 * state level — the Juiz de Fora region carries RJ's feed rather than the
 * rest of MG's, and that pattern repeats across the country — and no source
 * we have expresses that granularity (futnatv, the only one with regional
 * data at all, stops at the UF). So a state list is a real answer but not a
 * complete one, and saying so is better than implying precision we don't
 * have.
 */
export const REGIONAL_PRACA_CAVEAT = "pode variar por praça dentro do estado";
