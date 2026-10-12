import { listChannels, type Channel } from "./channel.js";
import { COMPETITIONS, type Competition } from "./competition.js";
import { TEAMS, type Team } from "./team.js";

export const SITE_URL = "https://ondevaipassar.com";
export const SITE_NAME = "Onde Vai Passar";

/** What a page says about itself to a search engine or a link preview. One definition, used by the build (which writes it into each page's HTML) and by the app (which keeps it right while a visitor navigates). */
export interface PageMeta {
  title: string;
  description: string;
  /** Path on the site, starting with "/" — also the canonical address. */
  path: string;
  /** A page that is for the visitor, not for search: account, own settings, operator tools, 404. */
  noindex?: boolean;
}

const DAILY = "Atualizado todo dia.";

// A search result cuts a title around 60-70 characters. The site name is the
// first thing to give up when a long competition name leaves no room for it.
const MAX_TITLE = 70;
const titled = (head: string): string => (`${head} | ${SITE_NAME}`.length <= MAX_TITLE ? `${head} | ${SITE_NAME}` : head);

export const HOME_META: PageMeta = {
  title: `${SITE_NAME}: onde assistir aos jogos do seu time`,
  description: `Descubra em que canal ou streaming passa o jogo do seu time: Brasileirão, Copa do Brasil, Libertadores, estaduais, futebol feminino e ligas europeias. ${DAILY}`,
  path: "/",
};

export function teamMeta(team: Pick<Team, "id" | "displayName">): PageMeta {
  return {
    title: titled(`${team.displayName}: onde assistir ao próximo jogo`),
    description: `Veja em que canal de TV, streaming ou YouTube passa o próximo jogo do ${team.displayName}: data, horário, campeonato e transmissão. ${DAILY}`,
    path: `/time/${team.id}`,
  };
}

export function competitionMeta(competition: Pick<Competition, "id" | "displayName">): PageMeta {
  return {
    title: titled(`${competition.displayName}: onde assistir aos jogos`),
    description: `Os próximos jogos do ${competition.displayName} e onde assistir a cada um: canal de TV, streaming e YouTube. ${DAILY}`,
    path: `/campeonato/${competition.id}`,
  };
}

export function channelMeta(channel: Pick<Channel, "id" | "displayName" | "free">): PageMeta {
  return {
    title: titled(`${channel.displayName}: jogos de futebol que passam`),
    description: `Jogos de futebol com transmissão confirmada em ${channel.displayName} nos próximos dias${channel.free ? ", sem pagar nada" : ""}. ${DAILY}`,
    path: `/canal/${channel.id}`,
  };
}

export const STATIC_PAGES: PageMeta[] = [
  {
    title: titled("Jogos grátis: futebol na TV aberta e no YouTube"),
    description: `Os jogos da semana que dá para ver de graça, na TV aberta e no YouTube, sem assinar nada. ${DAILY}`,
    path: "/gratis",
  },
  {
    title: `Sobre o ${SITE_NAME}`,
    description: "Como o Onde Vai Passar funciona, de onde vêm os dados de transmissão e como falar com a gente.",
    path: "/sobre",
  },
  {
    title: `Política de privacidade | ${SITE_NAME}`,
    description: "Quais dados tratamos, para quê, onde ficam, por quanto tempo e como você apaga tudo.",
    path: "/privacidade",
  },
  { title: `Minha conta | ${SITE_NAME}`, description: HOME_META.description, path: "/conta", noindex: true },
  { title: `Meus canais | ${SITE_NAME}`, description: HOME_META.description, path: "/meus-canais", noindex: true },
  { title: `Digest diário | ${SITE_NAME}`, description: HOME_META.description, path: "/digest", noindex: true },
];

/** The page not found: never worth indexing, and the SPA answers it with a 200, so the tag is what tells a crawler. */
export const NOT_FOUND_META: PageMeta = { title: `Página não encontrada | ${SITE_NAME}`, description: HOME_META.description, path: "/", noindex: true };

// Registered so an opponent has an id and a crest, but with no tab and nothing
// on their page worth finding: the foreign clubs of the Libertadores Feminina,
// and every national team outside the main 20.
const UNBROWSED_DIVISIONS: ReadonlySet<string> = new Set(["FEMININO_EXTERIOR", "SELECOES_OUTRAS", "SELECOES_FEMININO_OUTRAS"]);

/** Every page worth a search result, for the sitemap and the build's per-page HTML. Teams only from the divisions people browse. */
export function indexablePages(): PageMeta[] {
  return [
    HOME_META,
    ...STATIC_PAGES.filter((page) => !page.noindex),
    ...TEAMS.filter((team) => !UNBROWSED_DIVISIONS.has(team.division)).map(teamMeta),
    ...COMPETITIONS.map(competitionMeta),
    ...listChannels().map(channelMeta),
  ];
}

/** Every page the build writes its own HTML for: the indexable ones plus the noindex ones, so a shared link to them still carries the right tags. */
export function allStaticPages(): PageMeta[] {
  return [...indexablePages(), ...STATIC_PAGES.filter((page) => page.noindex)];
}
