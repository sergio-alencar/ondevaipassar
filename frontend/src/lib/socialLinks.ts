export interface SocialLink {
  label: string;
  url: string;
}

// Single source of truth for both the side menu (text links) and the
// footer (icon links) — same 3 accounts, never duplicate the URLs.
export const SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", url: "https://www.instagram.com/ondevaipassarfutebol" },
  { label: "X/Twitter", url: "https://x.com/ondevaipassar1" },
  { label: "Canal do WhatsApp", url: "https://www.whatsapp.com/channel/0029VbE4hD6CXC3EdqeB272s" },
];
