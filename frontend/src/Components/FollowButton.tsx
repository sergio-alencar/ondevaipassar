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
 * says what it does, and the touch target is at least 44px tall (the smallest touch
 * target that is comfortable on a phone; the star it replaced was 16-20px).
 * Plain text with an icon, no box: "+ Seguir" in the dark body colour is the
 * action on offer; "✓ Seguindo" is dimmer, the state already reached. The
 * padding and min height keep the touch target even though nothing is drawn
 * around it.
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
    className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 px-3 font-bold uppercase transition-colors hover:underline ${
      size === "large" ? "text-base" : "text-sm"
    } ${active ? "text-gray-500 hover:text-gray-700" : "text-gray-800 hover:text-gray-600"}`}
  >
    {active ? (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 10.5l4 4 8-9" />
      </svg>
    ) : (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M10 4v12M4 10h12" />
      </svg>
    )}
    {active ? "Seguindo" : "Seguir"}
  </button>
);

export default FollowButton;
