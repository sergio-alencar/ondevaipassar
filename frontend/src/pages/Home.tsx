import { type MatchView } from "@ondevaipassar/shared";
import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import DivisionTabs from "../Components/DivisionTabs";
import FavoriteStar from "../Components/FavoriteStar";
import SectionTabs from "../Components/SectionTabs";
import TeamCrest from "../Components/TeamCrest";
import { MatchesContext } from "../context/MatchesContext";
import { findSourceCrestUrl } from "../lib/assets";
import { HOME_TABS, useHomeTab } from "../lib/useHomeTab";
import { useDivisionSearchParam } from "../lib/useDivisionSearchParam";
import { usePreferences } from "../lib/usePreferences";
import CampeonatosTab from "./home/CampeonatosTab";
import CanaisTab from "./home/CanaisTab";
import DayFeed from "./home/DayFeed";
import MeusTimes from "./home/MeusTimes";
import type { SetSelectedTeam } from "../types";

interface TimesTabProps {
  matches: MatchView[];
  setSelectedTeam: SetSelectedTeam;
}

/** The team grid, by division — the Home's original and still default view. */
const TimesTab = ({ matches, setSelectedTeam }: TimesTabProps) => {
  // URL-backed (?divisao=b), not plain state: opening a team page and going
  // back used to always land on Série A regardless of what was selected —
  // Home fully remounts on that route change, resetting a useState. See
  // useDivisionSearchParam's own comment.
  const { division, setDivision, teamsInDivision } = useDivisionSearchParam();
  const { preferences, toggleTeam } = usePreferences();

  return (
    <>
        <div className="mb-8">
          <DivisionTabs active={division} onChange={setDivision} />
        </div>
        {/*
          lg:grid-cols-5, not flex-wrap, on desktop: every division has
          exactly 20 teams (see packages/shared/src/team.ts), so a fixed 5
          columns always gives exactly 4 rows — a flexible wrap can't
          guarantee that (it reflows to whatever fits the viewport width).
          Crest height is also deliberately smaller than it used to be
          (was h-38/152px) specifically so those 4 rows fit a typical
          laptop viewport without scrolling — h-38 alone was already close
          to 800px tall before adding the heading/tabs above it.

          grid-cols-[repeat(5,max-content)], not grid-cols-5: grid-cols-5
          makes 5 *equal-width* columns spanning the full container, so a
          narrow w-auto crest just sits centered in a much wider column —
          shrinking gap-x (the space *between* columns) barely changed
          anything because the actual sparse look was empty space *inside*
          each column, not between them. Sizing columns to their own
          content and centering the resulting (narrower) row as a whole
          (justify-center on the grid itself) is what actually tightens
          the visible gap between crests.
        */}
        <ul className="flex flex-wrap gap-10 justify-items-center justify-center lg:grid lg:grid-cols-[repeat(5,max-content)] lg:justify-center lg:gap-x-8 lg:gap-y-6 max-sm:grid max-sm:grid-cols-4 max-sm:gap-x-2 max-sm:gap-y-4">
          {teamsInDivision.map((team) => (
            <li key={team.id} className="relative" onClick={() => setSelectedTeam(team)}>
              <Link to={`/time/${team.id}`}>
                {/*
                  h-* w-auto, not h-* w-* (both fixed): a browser's default
                  img sizing computes height from width when only width is
                  constrained, so a fixed WIDTH box left a narrower-than-
                  square crest (e.g. Flamengo) taller than a squarer one's
                  box instead of the same height every crest was meant to
                  share. Fixing height instead and letting width follow the
                  crest's own real aspect ratio is what actually makes
                  every crest's height consistent (same fix already
                  applied to MatchCard.tsx).

                  max-w-* caps a genuine width outlier (Criciúma, Club
                  Libertad — really are ~1.5-1.8x wider than tall, not a
                  cropping bug) so it can't make its own grid column
                  wider than the rest (grid-cols-[repeat(5,max-content)]
                  above sizes each column to its widest crest). 1.25x the
                  crest height at each breakpoint — generous enough that
                  every roughly-square or round badge (up to ~1.2:1,
                  the widest non-outlier crest measured) still renders at
                  full, unconstrained width.
                */}
                <TeamCrest
                  team={team}
                  name={team.displayName}
                  sourceCrestUrl={findSourceCrestUrl(team.id, matches)}
                  className="h-24 w-auto max-w-30 px-2 py-1 hover:scale-105 transition max-sm:h-18 max-sm:max-w-22.5"
                />
              </Link>
              {/* Over the crest's corner, outside the <Link> so tapping it never opens the team. */}
              <span className="absolute -right-1 top-0">
                <FavoriteStar
                  active={preferences.teams.includes(team.id)}
                  onToggle={() => toggleTeam(team.id)}
                  label={preferences.teams.includes(team.id) ? `Deixar de seguir ${team.displayName}` : `Seguir ${team.displayName}`}
                  className="size-5 max-sm:size-4"
                />
              </span>
            </li>
          ))}
        </ul>
    </>
  );
};

interface HomeProps {
  setSelectedTeam: SetSelectedTeam;
}

const Home = ({ setSelectedTeam }: HomeProps) => {
  const { matches, loading, error } = useContext(MatchesContext);
  const { tab, setTab } = useHomeTab();

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    <main className="py-4 max-lg:grow max-w-7xl mx-auto px-4">
      {!loading && !error && <MeusTimes matches={matches} />}
      <div>
        <div className="mb-8 pt-8">
          <SectionTabs options={HOME_TABS} active={tab} onChange={setTab} />
        </div>
        {tab === "times" && <TimesTab matches={matches} setSelectedTeam={setSelectedTeam} />}
        {tab === "campeonatos" && <CampeonatosTab matches={matches} />}
        {tab === "canais" && <CanaisTab matches={matches} />}
      </div>

      {loading && <p className="text-center text-lg mt-16">Carregando jogos...</p>}
      {error && <p className="text-center text-lg text-red-500 mt-16">Erro: {error}</p>}

      {!loading && !error && <DayFeed matches={matches} />}
    </main>
  );
};

export default Home;
