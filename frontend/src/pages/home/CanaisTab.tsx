import {
  CHANNEL_GROUP_LABELS,
  CHANNEL_GROUP_ORDER,
  channelGroupOf,
  isWithinNextDaysInBrasilia,
  listChannels,
  type MatchView,
} from "@ondevaipassar/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import ChannelLogo from "../../Components/ChannelLogo";
import { WEEK_DAYS } from "../../lib/windows";
import { InlineLink } from "../../Components/Action";

interface CanaisTabProps {
  matches: MatchView[];
}

/** Channels with confirmed games this week, grouped by how you reach them, each linking to its own page. */
const CanaisTab = ({ matches }: CanaisTabProps) => {
  const [onlyFree, setOnlyFree] = useState(false);

  // Count of games per channel this week. A channel with none is left out: the
  // tab answers "what is on", and an empty tile for every channel we know of
  // would bury the ones that are. (The full list lives in "Meus canais".)
  const counts = new Map<string, number>();
  for (const match of matches) {
    if (!isWithinNextDaysInBrasilia(match.kickoffUtc, WEEK_DAYS)) continue;
    for (const broadcast of match.broadcasts) counts.set(broadcast.channelId, (counts.get(broadcast.channelId) ?? 0) + 1);
  }

  const channels = listChannels().filter((channel) => (counts.get(channel.id) ?? 0) > 0 && (!onlyFree || channel.free));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={onlyFree} onChange={(event) => setOnlyFree(event.target.checked)} />
          Só os gratuitos
        </label>
        <InlineLink to="/gratis">Jogos grátis desta semana</InlineLink>
        <InlineLink to="/meus-canais">Meus canais</InlineLink>
      </div>

      {channels.length === 0 && <p className="py-8 text-center text-lg text-gray-500">Nenhum canal com jogo confirmado nos próximos dias.</p>}

      {CHANNEL_GROUP_ORDER.map((group) => {
        const inGroup = channels.filter((channel) => channelGroupOf(channel) === group);
        if (inGroup.length === 0) return null;
        return (
          <section key={group} className="mb-8">
            <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-gray-500">{CHANNEL_GROUP_LABELS[group]}</h3>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-5">
              {inGroup.map((channel) => (
                <li key={channel.id}>
                  <Link to={`/canal/${channel.id}`} className="flex flex-col items-center gap-1 transition hover:scale-105">
                    <span className="flex size-24 items-center justify-center max-sm:size-20">
                      <ChannelLogo channelId={channel.id} displayName={channel.displayName} />
                    </span>
                    {/* The logo's own alt text already names it for screen readers. */}
                    {!channel.logoShowsName && <span className="text-sm font-bold text-gray-800">{channel.displayName}</span>}
                    <span className="text-xs text-gray-500">{counts.get(channel.id)} {counts.get(channel.id) === 1 ? "jogo" : "jogos"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default CanaisTab;
