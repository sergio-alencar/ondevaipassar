import type { Team } from "@ondevaipassar/shared";
import { crestUrl, fallbackCrestUrl } from "../lib/assets";

interface TeamCrestProps {
  team: Pick<Team, "crestFile"> | undefined;
  name: string;
  className: string;
  /** From any match involving this team, if one's been loaded — lets a team without a local SVG yet still show a real crest instead of the generic shield. */
  sourceCrestUrl?: string;
}

// Cascades local asset -> source-provided crest -> generic shield, instead
// of jumping straight from "no local asset" to the generic one. Shared by
// every place a team crest renders (match cards, the home team picker, the
// header dropdown) so the fallback behavior can't drift between them.
const TeamCrest = ({ team, name, className, sourceCrestUrl }: TeamCrestProps) => (
  <img
    className={className}
    src={crestUrl(team, sourceCrestUrl)}
    alt={name}
    title={name}
    loading="lazy"
    onError={(event) => {
      const img = event.currentTarget;
      if (team && sourceCrestUrl && img.src !== sourceCrestUrl) {
        img.src = sourceCrestUrl;
      } else if (img.src !== fallbackCrestUrl) {
        img.src = fallbackCrestUrl;
      }
    }}
  />
);

export default TeamCrest;
