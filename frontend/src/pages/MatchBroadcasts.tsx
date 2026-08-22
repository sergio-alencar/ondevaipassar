import type { MatchView } from "@ondevaipassar/shared";
import { channelLogoUrl } from "../lib/assets";
import { textColorClass } from "../lib/colors";

interface MatchBroadcastsProps {
  broadcasts: MatchView["broadcasts"];
  fallbackColor?: string;
}

const REGIONAL_CAVEAT_TEXT = " — pode variar por região, confira a programação local";
// The tooltip alone (title attribute) is easy to miss — it needs a hover
// most people never try, and doesn't work at all on mobile without a long
// press. This adds a visible marker on the logo itself plus an explicit
// caption below the row, so the caveat doesn't depend on discovering a
// hidden hover state.
const REGIONAL_CAVEAT_CAPTION = "A transmissão pela Globo pode variar por região — confira a programação local";

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

const WIDE_LOGO_BOX = "w-28 h-28 max-lg:w-20 max-lg:h-20 max-sm:w-18 max-sm:h-18";
const SQUARE_LOGO_BOX = "w-24 h-20 max-lg:w-18 max-lg:h-18 max-sm:w-16 max-sm:h-16";

const MatchBroadcasts = ({ broadcasts, fallbackColor }: MatchBroadcastsProps) => {
  if (broadcasts.length === 0) {
    return (
      <div className="text-center">
        <p
          className={`${textColorClass(fallbackColor)} uppercase font-bold text-lg max-lg:text-base`}
        >
          Transmissão a confirmar
        </p>
      </div>
    );
  }

  const hasRegionalCaveat = broadcasts.some((broadcast) => broadcast.regionalCaveat);

  return (
    <div>
      <div className="flex flex-wrap justify-start items-center gap-x-6 gap-y-3 max-lg:gap-x-3 max-sm:justify-center">
        {broadcasts.map((broadcast) => (
          <a
            key={broadcast.channelId}
            href={broadcast.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative flex items-center justify-center hover:scale-105 transition ${
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
            {broadcast.regionalCaveat && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex items-center justify-center size-5 rounded-full bg-yellow-400 text-gray-900 shadow"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M12 4v16M5.07 8l13.86 8M18.93 8l-13.86 8" />
                </svg>
              </span>
            )}
          </a>
        ))}
      </div>
      {hasRegionalCaveat && (
        <p className="text-xs text-gray-500 mt-2 max-sm:text-center">
          <span className="font-bold">*</span> {REGIONAL_CAVEAT_CAPTION}
        </p>
      )}
    </div>
  );
};

export default MatchBroadcasts;
