import { CHANNEL_GROUP_LABELS, CHANNEL_GROUP_ORDER, channelGroupOf, listChannels } from "@ondevaipassar/shared";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import ChannelLogo from "../Components/ChannelLogo";
import { usePreferences } from "../lib/usePreferences";
import type { SetSelectedTeam } from "../types";

interface MeusCanaisPageProps {
  setSelectedTeam: SetSelectedTeam;
}

const MeusCanaisPage = ({ setSelectedTeam }: MeusCanaisPageProps) => {
  const { preferences, toggleChannel, clearChannels } = usePreferences();

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12">
      <h1 className="pt-8 text-center text-4xl font-bold uppercase text-gray-800 max-sm:py-4 max-sm:text-2xl">Meus canais</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-500">
        Marque onde você consegue assistir. Nos jogos, os canais que você não tem ficam esmaecidos, e dá para ver só o que passa nos seus. Os gratuitos valem para todo mundo, então já vêm incluídos.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-center text-xs text-gray-400">Fica guardado só neste navegador. Não pedimos nenhum dado seu.</p>

      {CHANNEL_GROUP_ORDER.map((group) => {
        const channels = listChannels().filter((channel) => channelGroupOf(channel) === group);
        if (channels.length === 0) return null;
        return (
          <section key={group} className="mt-8">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{CHANNEL_GROUP_LABELS[group]}</h2>
            <ul className="divide-y divide-gray-200 rounded-2xl bg-white shadow-sm">
              {channels.map((channel) => {
                const alwaysOn = channel.free === true;
                return (
                  <li key={channel.id}>
                    <label className={`flex items-center gap-4 px-4 py-3 ${alwaysOn ? "cursor-default" : "cursor-pointer hover:bg-gray-50"}`}>
                      <input
                        type="checkbox"
                        checked={alwaysOn || preferences.channels.includes(channel.id)}
                        disabled={alwaysOn}
                        onChange={() => toggleChannel(channel.id)}
                        className="size-5"
                      />
                      <span className="flex size-12 shrink-0 items-center justify-center">
                        <ChannelLogo channelId={channel.id} displayName={channel.displayName} />
                      </span>
                      <span className="flex-1 font-bold text-gray-800">{channel.displayName}</span>
                      {alwaysOn && <span className="text-xs text-gray-400">grátis</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="mt-8 flex items-center justify-center gap-6 text-sm">
        {preferences.channels.length > 0 && (
          <button type="button" onClick={clearChannels} className="cursor-pointer text-gray-600 underline hover:text-gray-900">
            Limpar escolhas
          </button>
        )}
        <Link to="/" className="text-gray-600 underline hover:text-gray-900">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default MeusCanaisPage;
