import { findChannelById, findCompetitionById, findTeamById, type Channel, type Competition, type Team } from "@ondevaipassar/shared";
import { useContext, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ChannelLogo from "../../Components/ChannelLogo";
import CompetitionLogo from "../../Components/CompetitionLogo";
import FollowButton from "../../Components/FollowButton";
import TeamCrest from "../../Components/TeamCrest";
import { MatchesContext } from "../../context/MatchesContext";
import { findSourceCrestUrl } from "../../lib/assets";
import { usePreferences } from "../../lib/usePreferences";
import { ActionLink, InlineLink } from "../../Components/Action";

const Section = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <section className="mt-6 first:mt-0">
    <div className="mb-2 flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">{children}</p>;

const rowClass = "flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2";

/**
 * What the visitor has told us, on their account page: teams and competitions
 * they follow (each removable here) and the channels they said they have.
 * Free channels are left out of the last list — they count for everyone, so
 * listing them would show something the visitor never chose.
 */
const ContaFavorites = () => {
  const { preferences, toggleTeam, toggleCompetition } = usePreferences();
  const { matches } = useContext(MatchesContext);

  // An id the registry no longer has (saved before a removal) is skipped, never shown as a hole.
  const teams = preferences.teams.map((id) => findTeamById(id)).filter((team): team is Team => team !== undefined);
  const competitions = preferences.competitions.map((id) => findCompetitionById(id)).filter((c): c is Competition => c !== undefined);
  const channels = preferences.channels
    .map((id) => findChannelById(id))
    .filter((channel): channel is Channel => channel !== undefined && channel.free !== true);

  return (
    <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold uppercase text-gray-800">Meus favoritos</h2>
      <div className="mt-4">
        <Section title="Times">
          {teams.length === 0 ? (
            <Empty>
              Nenhum time ainda. Abra um time <InlineLink to="/">na página inicial</InlineLink> e toque em Seguir.
            </Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {teams.map((team) => (
                <li key={team.id} className={rowClass}>
                  <Link to={`/time/${team.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <TeamCrest team={team} name={team.displayName} sourceCrestUrl={findSourceCrestUrl(team.id, matches)} className="h-9 w-9 object-contain" />
                    <span className="min-w-0 font-bold leading-tight text-gray-800">{team.displayName}</span>
                  </Link>
                  <FollowButton active onToggle={() => toggleTeam(team.id)} name={team.displayName} size="compact" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Campeonatos">
          {competitions.length === 0 ? (
            <Empty>
              Nenhum campeonato ainda. Abra um campeonato <InlineLink to="/?aba=campeonatos">na aba Campeonatos</InlineLink> e toque em Seguir.
            </Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {competitions.map((competition) => (
                <li key={competition.id} className={rowClass}>
                  <Link to={`/campeonato/${competition.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <CompetitionLogo competitionId={competition.id} className="size-9" />
                    <span className="min-w-0 font-bold leading-tight text-gray-800">{competition.displayName}</span>
                  </Link>
                  <FollowButton active onToggle={() => toggleCompetition(competition.id)} name={competition.displayName} size="compact" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Canais que eu tenho"
          action={
            <ActionLink to="/meus-canais" icon="edit" className="-my-2">
              Editar
            </ActionLink>
          }
        >
          {channels.length === 0 ? (
            <Empty>
              Nenhum canal pago marcado. Os gratuitos já valem para todo mundo; marque os seus em <InlineLink to="/meus-canais">Meus canais</InlineLink>.
            </Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {channels.map((channel) => (
                <li key={channel.id} className={rowClass}>
                  <Link to={`/canal/${channel.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center">
                      <ChannelLogo channelId={channel.id} displayName={channel.displayName} />
                    </span>
                    <span className="min-w-0 font-bold leading-tight text-gray-800">{channel.displayName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
};

export default ContaFavorites;
