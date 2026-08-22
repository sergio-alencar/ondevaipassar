import { backgroundColorClass } from "../lib/colors";
import type { SelectedTeam } from "../types";

interface FooterProps {
  selectedTeam: SelectedTeam;
}

const Footer = ({ selectedTeam }: FooterProps) => {
  const footerBgClass = backgroundColorClass(selectedTeam?.color);

  return (
    <footer className={`${footerBgClass} transition-colors duration-300`}>
      <div className="grid py-6 max-sm:py-4 max-w-7xl mx-auto px-24 max-sm:px-6">
        <p className="font-bold uppercase text-xs justify-self-center text-white">
          Onde Vai Passar &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
