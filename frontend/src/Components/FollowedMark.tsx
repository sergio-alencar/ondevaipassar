/** A small, non-interactive star on something the visitor follows. Following itself is done with FollowButton on the item's own page; this only shows the result in lists, where a tap must open the item. */
const FollowedMark = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} pointer-events-none text-yellow-400 drop-shadow`} fill="currentColor" role="img" aria-label="Você segue">
    <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z" />
  </svg>
);

export default FollowedMark;
