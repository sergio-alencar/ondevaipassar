import type { Team } from "@ondevaipassar/shared";
import { crestUrl, fallbackCrestUrl } from "../lib/assets";

interface TeamCrestProps {
  team: Pick<Team, "crestFile" | "knownCrestUrl"> | undefined;
  name: string;
  className: string;
  /** From any match involving this team, if one's been loaded — lets a team without a local SVG yet still show a real crest instead of the generic shield. */
  sourceCrestUrl?: string;
}

// Cascades local asset -> source-provided crest (from a loaded match, or a
// manually verified team.knownCrestUrl for a team with no ingested match at
// all yet) -> generic shield, instead of jumping straight from "no local
// asset" to the generic one. Shared by every place a team crest renders
// (match cards, the home team picker, the header dropdown) so the fallback
// behavior can't drift between them.
const TeamCrest = ({ team, name, className, sourceCrestUrl }: TeamCrestProps) => {
  const fallback = sourceCrestUrl || team?.knownCrestUrl;

  return (
    <img
      className={className}
      src={crestUrl(team, fallback)}
      alt={name}
      title={name}
      loading="lazy"
      onError={(event) => {
        const img = event.currentTarget;
        if (team && fallback && img.src !== fallback) {
          img.src = fallback;
        } else if (img.src !== fallbackCrestUrl) {
          img.src = fallbackCrestUrl;
        }
      }}
    />
  );
};

export default TeamCrest;
