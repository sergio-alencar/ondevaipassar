import { useState } from "react";
import { ACTION_CLASS } from "./Action";

interface FollowButtonProps {
  active: boolean;
  onToggle: () => void;
  /** What is followed — "Flamengo" — used in the accessible name: "Seguir Flamengo" / "Deixar de seguir Flamengo". */
  name: string;
  /** "compact" for lists where the button sits in a row (heart only); "large" under a page title (heart and word). */
  size?: "large" | "compact";
}

/** The heart, outlined or filled, in the site's purple. Shared with FollowedMark's list marker so the mark and the button read as one thing. */
export const HEART_PATH = "M10 17s-6.5-4.2-6.5-8.6A3.7 3.7 0 0 1 10 6.3a3.7 3.7 0 0 1 6.5 2.1C16.5 12.8 10 17 10 17z";

/**
 * Follow / unfollow as a heart — outlined to follow, filled once followed —
 * in the site's purple. On a team's or a competition's own page ("large") the
 * word comes with it: "Seguir" / "Seguindo". In rows and lists ("compact") the
 * heart stands alone, because the row already says what it is; the accessible
 * name and the tooltip still say "Seguir Flamengo" / "Deixar de seguir
 * Flamengo". The touch target is at least 44px tall either way (the smallest
 * that is comfortable on a phone), even though nothing is drawn around it.
 */
const FollowButton = ({ active, onToggle, name, size = "large" }: FollowButtonProps) => {
  // Animate only what the visitor just did, never a page that merely loads
  // already following.
  const [tapped, setTapped] = useState(false);
  const label = active ? `Deixar de seguir ${name}` : `Seguir ${name}`;
  const withWord = size === "large";
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setTapped(true);
        onToggle();
      }}
      className={`${ACTION_CLASS} ${withWord ? "text-base" : "min-w-11 !px-0 text-sm"} ${active ? "!text-gray-600 hover:!text-gray-700" : ""}`}
    >
      {/* keyed by state so each change remounts the icon and replays its entrance */}
      <span key={active ? "icon-on" : "icon-off"} className={`flex text-purple-800 ${tapped ? "follow-icon-animate" : ""}`}>
        <svg viewBox="0 0 20 20" className="size-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d={HEART_PATH} />
        </svg>
      </span>
      {withWord && (
        <span key={active ? "word-on" : "word-off"} className={tapped ? "follow-word-animate" : ""}>
          {active ? "Seguindo" : "Seguir"}
        </span>
      )}
    </button>
  );
};

export default FollowButton;
