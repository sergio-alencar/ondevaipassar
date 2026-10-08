import { channelGroupOf, CHANNEL_GROUP_LABELS, findChannelById, isWithinNextDaysInBrasilia, REGIONAL_CAVEAT_TEXT } from "@ondevaipassar/shared";
import { useContext, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ChannelLogo from "../Components/ChannelLogo";
import DataState from "../Components/DataState";
import MatchesByCompetition from "../Components/MatchesByCompetition";
import { MatchesContext } from "../context/MatchesContext";
import { WEEK_DAYS } from "../lib/windows";
import type { SetSelectedTeam } from "../types";

interface CanalPageProps {
  setSelectedTeam: SetSelectedTeam;
}

/**
 * Notes for channels a viewer is likely to confuse with another. TNT and TNT
 * Sports are the case that forced the split: same brand, one on pay TV and one
 * free on YouTube — a page that doesn't say so would send people to the wrong
 * one.
 */
const CHANNEL_NOTES: Record<string, { text: string; linkTo?: string; linkLabel?: string }> = {
  tnt: { text: "TNT é o canal da TV por assinatura. O canal do YouTube é outro, gratuito.", linkTo: "/canal/tntsports", linkLabel: "Ver TNT Sports" },
  tntsports: { text: "TNT Sports é o canal gratuito do YouTube. Na TV por assinatura, o canal se chama TNT.", linkTo: "/canal/tnt", linkLabel: "Ver TNT" },
  band: { text: "Band é a TV aberta. A BandSports é um canal da TV por assinatura.", linkTo: "/canal/bandsports", linkLabel: "Ver BandSports" },
  bandsports: { text: "BandSports é da TV por assinatura. A Band, na TV aberta, é outro canal.", linkTo: "/canal/band", linkLabel: "Ver Band" },
  globo: { text: REGIONAL_CAVEAT_TEXT },
};

const CanalPage = ({ setSelectedTeam }: CanalPageProps) => {
  const { id } = useParams<{ id: string }>();
  const { matches, loading, error } = useContext(MatchesContext);
  const channel = id ? findChannelById(id) : undefined;

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  const channelMatches = channel
    ? matches.filter(
        (match) => isWithinNextDaysInBrasilia(match.kickoffUtc, WEEK_DAYS) && match.broadcasts.some((broadcast) => broadcast.channelId === channel.id),
      )
    : [];
  const note = channel ? CHANNEL_NOTES[channel.id] : undefined;

  return (
    <DataState loading={loading} error={error}>
      {channel === undefined ? (
        <div className="py-8 text-center text-xl">Canal não encontrado.</div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 pb-12">
          <div className="flex flex-col items-center gap-2 pt-8">
            <span className="flex size-28 items-center justify-center max-sm:size-20">
              <ChannelLogo channelId={channel.id} displayName={channel.displayName} />
            </span>
            {/* sr-only, not removed, when the logo already spells the name: the page still needs its heading for screen readers and for search. */}
            <h1 className={channel.logoShowsName ? "sr-only" : "text-center text-4xl font-bold uppercase text-gray-800 max-sm:text-2xl"}>
              {channel.displayName}
            </h1>
            <p className="text-sm text-gray-500">
              {CHANNEL_GROUP_LABELS[channelGroupOf(channel)]}
              {channel.free ? " · grátis" : ""}
            </p>
          </div>

          {note && (
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-gray-600">
              {note.text}{" "}
              {note.linkTo && (
                <Link to={note.linkTo} className="underline hover:text-gray-900">
                  {note.linkLabel}
                </Link>
              )}
            </p>
          )}

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-gray-500">
            Jogos dos próximos {WEEK_DAYS} dias com transmissão confirmada neste canal. Pode haver outros que ainda não foram confirmados.
          </p>

          <div className="mt-8">
            {channelMatches.length > 0 ? (
              <MatchesByCompetition matches={channelMatches} />
            ) : (
              <p className="py-8 text-center text-lg text-gray-500">Nenhum jogo confirmado neste canal nos próximos dias.</p>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link to="/?aba=canais" className="text-sm text-gray-600 underline hover:text-gray-900">
              Todos os canais
            </Link>
          </div>
        </div>
      )}
    </DataState>
  );
};

export default CanalPage;
