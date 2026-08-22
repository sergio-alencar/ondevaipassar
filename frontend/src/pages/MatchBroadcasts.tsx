import type { MatchView } from "@ondevaipassar/shared";
import { channelLogoUrl } from "../lib/assets";
import { textColorClass } from "../lib/colors";

interface MatchBroadcastsProps {
  broadcasts: MatchView["broadcasts"];
  fallbackColor?: string;
}

const REGIONAL_CAVEAT_TEXT = " — pode variar por região, confira a programação local";

// Every logo SVG has the same square canvas, but what's actually drawn
// inside varies for real: some are a wide band (a wordmark), others are a
// near-square badge/icon that fills more of that canvas. Fitting both into
// one identical box made the badge-style ones read as noticeably bigger —
// confirmed by rendering all 17 at a fixed size and comparing, not guessed.
// Wide logos keep the original box; square-ish ones get a touch smaller so
// the two groups read as closer in visual weight.
const SQUARE_LOGO_CHANNEL_IDS = new Set([
  "cazetv",
  "getv",
  "globo",
  "nossofutebol",
  "paramountplus",
  "primevideo",
  "record",
  "sbt",
  "tntsports",
]);

const WIDE_LOGO_BOX = "w-28 h-14 max-lg:w-20 max-lg:h-10 max-sm:w-16 max-sm:h-9";
const SQUARE_LOGO_BOX = "w-24 h-12 max-lg:w-18 max-lg:h-9 max-sm:w-14 max-sm:h-7";

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
          className={`flex items-center justify-center hover:scale-105 transition ${
            SQUARE_LOGO_CHANNEL_IDS.has(broadcast.channelId) ? SQUARE_LOGO_BOX : WIDE_LOGO_BOX
          }`}
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
