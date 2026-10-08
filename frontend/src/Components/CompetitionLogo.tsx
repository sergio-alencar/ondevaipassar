import { competitionLogoUrl } from "../lib/assets";

interface CompetitionLogoProps {
  competitionId: string;
  /** Tailwind size classes for the box the symbol sits in. */
  className?: string;
}

/**
 * A competition's symbol, or nothing at all when we have none. Renders null
 * rather than a placeholder: an empty gray square beside every competition
 * we haven't sourced art for would look broken, and a name without a symbol
 * is simply a name.
 */
const CompetitionLogo = ({ competitionId, className = "size-10" }: CompetitionLogoProps) => {
  const url = competitionLogoUrl(competitionId);
  if (url === null) return null;
  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`}>
      {/* alt="" because the competition's name is always printed next to it. */}
      <img src={url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
    </span>
  );
};

export default CompetitionLogo;
