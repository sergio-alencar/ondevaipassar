interface FavoriteStarProps {
  active: boolean;
  onToggle: () => void;
  /** What the button does, for screen readers and the tooltip — "Seguir Flamengo" / "Deixar de seguir Flamengo". */
  label: string;
  className?: string;
}

const FavoriteStar = ({ active, onToggle, label, className = "size-7" }: FavoriteStarProps) => (
  <button
    type="button"
    aria-pressed={active}
    aria-label={label}
    title={label}
    // Stops the click reaching a surrounding <Link>: on the Home grid the star
    // sits over a team's crest, and tapping it must follow the team, not open
    // its page.
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggle();
    }}
    className={`cursor-pointer transition ${active ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
  >
    <svg viewBox="0 0 24 24" className={className} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z" />
    </svg>
  </button>
);

export default FavoriteStar;
