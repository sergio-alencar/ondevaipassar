import { canWatchMatch, isTodayInBrasilia, isTomorrowInBrasilia, isWithinNextDaysInBrasilia, type MatchView } from "@ondevaipassar/shared";
import { useState } from "react";
import MatchesByCompetition from "../../Components/MatchesByCompetition";
import SectionTabs from "../../Components/SectionTabs";
import { usePreferences } from "../../lib/usePreferences";
import { WEEK_DAYS } from "../../lib/windows";
import { InlineLink } from "../../Components/Action";

type Window = "hoje" | "amanha" | "semana";

const FILTERS: Record<Window, (match: MatchView) => boolean> = {
  hoje: (match) => isTodayInBrasilia(match.kickoffUtc),
  amanha: (match) => isTomorrowInBrasilia(match.kickoffUtc),
  semana: (match) => isWithinNextDaysInBrasilia(match.kickoffUtc, WEEK_DAYS),
};

const EMPTY_TEXT: Record<Window, string> = {
  hoje: "Nenhum jogo hoje.",
  amanha: "Nenhum jogo amanhã.",
  semana: "Nenhum jogo nos próximos dias.",
};

interface DayFeedProps {
  matches: MatchView[];
}

/**
 * "O que passa": today, tomorrow or the week, grouped by competition. Replaces
 * the two flat chronological lists the Home used to carry below the team grid.
 */
const DayFeed = ({ matches }: DayFeedProps) => {
  const { preferences } = usePreferences();
  const [chosen, setChosen] = useState<Window | null>(null);
  const [onlyWatchable, setOnlyWatchable] = useState(false);

  const inWindow = (window: Window) => matches.filter(FILTERS[window]);
  const counts: Record<Window, number> = { hoje: inWindow("hoje").length, amanha: inWindow("amanha").length, semana: inWindow("semana").length };

  // Until the visitor picks, open on the first window that has anything: a
  // Friday with no games would otherwise greet everyone with "Nenhum jogo
  // hoje" while Saturday has nineteen.
  const active: Window = chosen ?? (counts.hoje > 0 ? "hoje" : counts.amanha > 0 ? "amanha" : "semana");

  const visible = inWindow(active).filter((match) => !onlyWatchable || canWatchMatch(match.broadcasts, preferences.channels));
  const hasPaidChannels = preferences.channels.length > 0;

  return (
    <section className="mt-16">
      <h2 className="text-4xl font-bold mb-6 pt-8 uppercase text-center max-sm:text-2xl text-gray-800">Onde vai passar</h2>

      <SectionTabs
        options={[
          { id: "hoje", label: `Hoje (${counts.hoje})` },
          { id: "amanha", label: `Amanhã (${counts.amanha})` },
          { id: "semana", label: `7 dias (${counts.semana})` },
        ]}
        active={active}
        onChange={setChosen}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={onlyWatchable} onChange={(event) => setOnlyWatchable(event.target.checked)} />
          {hasPaidChannels ? "Só o que eu consigo assistir" : "Só o que passa de graça"}
        </label>
        <InlineLink to="/meus-canais">{hasPaidChannels ? "Mudar meus canais" : "Dizer quais canais eu tenho"}</InlineLink>
      </div>

      <div className="mt-8">
        {visible.length > 0 ? (
          <MatchesByCompetition matches={visible} />
        ) : (
          <p className="py-8 text-center text-lg text-gray-500">
            {onlyWatchable && inWindow(active).length > 0 ? "Nenhum desses jogos passa nos seus canais." : EMPTY_TEXT[active]}
          </p>
        )}
      </div>
    </section>
  );
};

export default DayFeed;
