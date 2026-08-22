import type { MatchView } from "@ondevaipassar/shared";
import { channelLogoUrl } from "../lib/assets";
import { textColorClass } from "../lib/colors";

interface MatchBroadcastsProps {
  broadcasts: MatchView["broadcasts"];
  fallbackColor?: string;
}

const REGIONAL_CAVEAT_TEXT = " — pode variar por região, confira a programação local";

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
    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 max-lg:gap-x-3">
      {broadcasts.map((broadcast) => (
        <a
          key={broadcast.channelId}
          href={broadcast.url}
          target="_blank"
          rel="noopener noreferrer"
          // Fixed box, not just a fixed width: logos come from many sources
          // with different native aspect ratios (a wide wordmark vs. a
          // square icon), so constraining only width still left them
          // reading as very different sizes. object-contain scales each
          // one down to fit this same box without distorting it.
          className="w-28 h-14 flex items-center justify-center hover:scale-105 transition max-lg:w-20 max-lg:h-10 max-sm:w-16 max-sm:h-9"
        >
          <img
            src={channelLogoUrl(broadcast.channelId)}
            alt={broadcast.displayName}
            title={`${broadcast.displayName}${broadcast.regionalCaveat ? REGIONAL_CAVEAT_TEXT : ""}`}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src !== broadcast.logoUrl) {
                event.currentTarget.src = broadcast.logoUrl;
              } else {
                event.currentTarget.style.display = "none";
              }
            }}
          />
        </a>
      ))}
    </div>
  );
};

export default MatchBroadcasts;
