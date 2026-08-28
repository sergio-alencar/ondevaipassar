import { useEffect, useState } from "react";
import type { Team } from "@ondevaipassar/shared";
import { crestProxyUrl, fallbackCrestUrl, localCrestUrl } from "../lib/assets";

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
  const rawFallback = sourceCrestUrl || team?.knownCrestUrl;
  // Proxied (see crestProxyUrl), not the raw ge.globo URL directly — the
  // proxy crops the crest to its real content the same way local crest
  // art already is, so an untracked opponent's crest doesn't sit smaller
  // (or further from a "x" next to it) than a tracked team's does.
  const fallback = rawFallback ? crestProxyUrl(rawFallback) : undefined;
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
      // object-contain, always (not caller-controlled): most crests are
      // narrower than tall and just fill their h-* w-auto box exactly, but
      // a real outlier (Criciúma, ~1.5:1; Club Libertad, ~1.8:1 — both
      // genuinely that wide, not a cropping bug) needs its width capped by
      // the caller's own max-w-* class to stop it from blowing out a
      // content-sized grid column or crowding a match card's "x". Without
      // object-contain, hitting that cap would squish the crest to fill
      // the now-fixed width×height box instead of shrinking proportionally.
      className={`${className} object-contain`}
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
