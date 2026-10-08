import { competitionLogo } from "../lib/assets";

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
  const logo = competitionLogo(competitionId);
  if (logo === null) return null;

  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`}>
      {logo.mono ? (
        // The file's shape as a mask over a flat colour, so one asset serves
        // as a dark silhouette without a second copy to keep in step. Both the
        // prefixed and unprefixed properties: older Safari only knows the former.
        <span
          aria-hidden="true"
          className="block size-full bg-gray-800"
          style={{
            WebkitMaskImage: `url(${logo.url})`,
            maskImage: `url(${logo.url})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      ) : (
        // alt="" because the competition's name is always printed next to it.
        <img src={logo.url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
      )}
    </span>
  );
};

export default CompetitionLogo;
