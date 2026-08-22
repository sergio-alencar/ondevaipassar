import type { MatchView } from "@ondevaipassar/shared";
import { channelLogoUrl } from "../lib/assets";
import { textColorClass } from "../lib/colors";

interface MatchBroadcastsProps {
  broadcasts: MatchView["broadcasts"];
  fallbackColor?: string;
}

const MatchBroadcasts = ({ broadcasts, fallbackColor }: MatchBroadcastsProps) => {
  if (broadcasts.length === 0) {
    return (
      <div className="text-center">
        <p className={`${textColorClass(fallbackColor)} uppercase font-bold text-lg max-lg:text-base`}>
          Transmissão a confirmar
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto whitespace-nowrap">
      <div
        className="flex justify-center items-center gap-6 max-lg:gap-2 overflow-y-hidden"
        style={{ scrollbarWidth: "thin" }}
      >
        {broadcasts.map((broadcast) => (
          <a
            key={broadcast.channelId}
            href={broadcast.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <img
              src={channelLogoUrl(broadcast.channelId)}
              alt={broadcast.displayName}
              title={broadcast.displayName}
              className="w-32 hover:scale-105 transition max-lg:w-24 max-sm:w-20"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export default MatchBroadcasts;
