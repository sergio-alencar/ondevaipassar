import { HEART_PATH } from "./FollowButton";

/** A small, non-interactive filled heart on something the visitor follows. Following itself is done with FollowButton on the item's own page; this only shows the result in lists, where a tap must open the item. */
const FollowedMark = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={`${className} pointer-events-none text-purple-800 drop-shadow`} fill="currentColor" role="img" aria-label="Você segue">
    <path d={HEART_PATH} />
  </svg>
);

export default FollowedMark;
