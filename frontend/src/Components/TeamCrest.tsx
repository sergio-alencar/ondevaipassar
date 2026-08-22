import { useEffect, useState } from "react";
import type { Team } from "@ondevaipassar/shared";
import { fallbackCrestUrl, localCrestUrl } from "../lib/assets";

interface TeamCrestProps {
  team: Pick<Team, "crestFile" | "knownCrestUrl"> | undefined;
  name: string;
  className: string;
  /** From any match involving this team, if one's been loaded — lets a team without a local SVG yet still show a real crest instead of the generic shield. */
  sourceCrestUrl?: string;
}

// Cascades local asset -> source-provided crest (from a loaded match, or a
// manually verified team.knownCrestUrl for a team with no ingested match at
// all yet) -> generic shield. Real React state, not just an onError DOM
// mutation: matches load asynchronously, so sourceCrestUrl often starts
// undefined and arrives later. An onError-only version gets stuck once it's
// fallen through to the generic shield — React sees the *ideal* src as
// unchanged (still "try local first") on the next render and never touches
// the DOM again, even after a real fallback becomes available (only
// remounting the component, e.g. switching tabs and back, "fixed" it). The
// effect below restarts the cascade from the top whenever the inputs
// actually change, so a late-arriving fallback gets a real second attempt.
const TeamCrest = ({ team, name, className, sourceCrestUrl }: TeamCrestProps) => {
  const fallback = sourceCrestUrl || team?.knownCrestUrl;
  const localSrc = team ? localCrestUrl(team) : undefined;

  const [src, setSrc] = useState(localSrc ?? fallback ?? fallbackCrestUrl);

  // Depend on localSrc AND fallback separately, not on a single derived
  // "ideal src" — for a tracked team, localSrc never changes, which would
  // mask fallback going from undefined to a real URL once matches finish
  // loading (that was the actual bug: the effect just never re-ran).
  useEffect(() => {
    setSrc(localSrc ?? fallback ?? fallbackCrestUrl);
  }, [localSrc, fallback]);

  return (
    <img
      className={className}
      src={src}
      alt={name}
      title={name}
      loading="lazy"
      onError={() => {
        if (src === localSrc && fallback) setSrc(fallback);
        else if (src !== fallbackCrestUrl) setSrc(fallbackCrestUrl);
      }}
    />
  );
};

export default TeamCrest;
