interface FollowButtonProps {
  active: boolean;
  onToggle: () => void;
  /** What is followed — "Flamengo" — used in the accessible name: "Seguir Flamengo" / "Deixar de seguir Flamengo". */
  name: string;
  /** "compact" for lists where the button sits in a row; "large" under a page title. */
  size?: "large" | "compact";
}

/**
 * Follow / unfollow, as a labelled button rather than a bare star: the word
 * says what it does, and the box is at least 44px tall (the smallest touch
 * target that is comfortable on a phone; the star it replaced was 16-20px).
 * Not following is the loud, filled state — it is the action being offered;
 * following is the quiet, outlined one with a check.
 */
const FollowButton = ({ active, onToggle, name, size = "large" }: FollowButtonProps) => (
  <button
    type="button"
    aria-pressed={active}
    aria-label={active ? `Deixar de seguir ${name}` : `Seguir ${name}`}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggle();
    }}
    className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-800 font-bold uppercase transition-colors ${
      size === "large" ? "min-h-11 px-6 text-sm" : "min-h-11 px-4 text-xs sm:min-h-10"
    } ${active ? "bg-white text-gray-800 hover:bg-gray-100" : "bg-gray-800 text-white hover:bg-gray-700"}`}
  >
    {active ? (
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 10.5l4 4 8-9" />
      </svg>
    ) : (
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M10 4v12M4 10h12" />
      </svg>
    )}
    {active ? "Seguindo" : "Seguir"}
  </button>
);

export default FollowButton;
