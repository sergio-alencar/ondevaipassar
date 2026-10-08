import { useState } from "react";
import { channelLogoUrl } from "../lib/assets";

interface ChannelLogoProps {
  channelId: string;
  displayName: string;
  /** The source's own logo, tried when we ship no art of our own for this channel. */
  sourceLogoUrl?: string;
  title?: string;
}

/**
 * The channel's logo, falling back in order: our own curated art, then the
 * source's logo, then the channel's NAME. The last step used to be "hide the
 * image", which made a channel without art vanish from the card entirely —
 * the viewer saw one broadcaster fewer than we had, and nothing said so. A
 * new channel is now visible the moment it's added, ugly until its art
 * arrives, rather than invisible until then.
 */
const ChannelLogo = ({ channelId, displayName, sourceLogoUrl, title }: ChannelLogoProps) => {
  const [src, setSrc] = useState(channelLogoUrl(channelId));
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        title={title}
        className="flex h-full w-full items-center justify-center rounded-2xl bg-gray-200 p-2 text-center text-sm font-bold leading-tight text-gray-900"
      >
        {displayName}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={displayName}
      title={title}
      // Applied unconditionally: curated art that already has its
      // own transparent rounded corners (e.g. ESPN, Premiere) has
      // nothing left to clip here, so this is a no-op for those —
      // but it's what rounds the flat-cornered ones (e.g. Globo,
      // CazéTV) instead of them reading as a stray square tile.
      className="max-w-full max-h-full object-contain rounded-2xl"
      loading="lazy"
      onError={() => {
        if (sourceLogoUrl && src !== sourceLogoUrl) setSrc(sourceLogoUrl);
        else setFailed(true);
      }}
    />
  );
};

export default ChannelLogo;
