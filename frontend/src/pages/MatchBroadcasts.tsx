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

// Every channel now ships curated square icon art (see channelLogoUrl), so
// one square box fits all — no more per-shape "wide vs square" sizing.
// Channel logos are the most important info on the card, so it's sized
// generously.
const LOGO_BOX = "w-28 h-28 max-lg:w-22 max-lg:h-22 max-sm:w-20 max-sm:h-20";

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
        {broadcasts.map((broadcast) => {
          return (
            <div key={broadcast.channelId} className="flex flex-col items-center gap-1">
              <a
                href={broadcast.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative flex items-center justify-center hover:scale-105 transition ${LOGO_BOX}`}
              >
                <img
                  src={channelLogoUrl(broadcast.channelId)}
                  alt={broadcast.displayName}
                  title={`${broadcast.displayName}${broadcast.regionalCaveat ? REGIONAL_CAVEAT_TEXT : ""}`}
                  // Applied unconditionally: curated art that already has its
                  // own transparent rounded corners (e.g. ESPN, Premiere) has
                  // nothing left to clip here, so this is a no-op for those —
                  // but it's what rounds the flat-cornered ones (e.g. Globo,
                  // CazéTV) instead of them reading as a stray square tile.
                  className="max-w-full max-h-full object-contain rounded-2xl"
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
              {broadcast.alternateUrl && (
                <a
                  href={broadcast.alternateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  outro link
                </a>
              )}
            </div>
          );
        })}
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
