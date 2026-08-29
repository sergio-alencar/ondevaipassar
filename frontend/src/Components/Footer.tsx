import { InstagramIcon, WhatsAppIcon, XIcon } from "./icons/SocialIcons";
import { backgroundColorClass } from "../lib/colors";
import { SOCIAL_LINKS } from "../lib/socialLinks";
import type { SelectedTeam } from "../types";

interface FooterProps {
  selectedTeam: SelectedTeam;
}

// Same order as SOCIAL_LINKS (Instagram, X, WhatsApp) — index-matched
// rather than a label lookup since the array is small and fixed.
const SOCIAL_ICONS = [InstagramIcon, XIcon, WhatsAppIcon];

const Footer = ({ selectedTeam }: FooterProps) => {
  const footerBgClass = backgroundColorClass(selectedTeam?.color);

  return (
    <footer className={`${footerBgClass} transition-colors duration-300`}>
      <div className="grid gap-4 py-6 max-sm:py-4 max-w-7xl mx-auto px-24 max-sm:px-6 justify-items-center">
        <ul className="flex gap-6 text-white">
          {SOCIAL_LINKS.map(({ label, url }, index) => {
            const Icon = SOCIAL_ICONS[index];
            return (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                  <Icon className="size-6 hover:opacity-80 transition-opacity" />
                </a>
              </li>
            );
          })}
        </ul>
        <p className="font-bold uppercase text-xs text-white">Onde Vai Passar &copy; {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
};

export default Footer;
