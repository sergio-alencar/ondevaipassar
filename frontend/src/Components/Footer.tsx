import { backgroundColorClass } from "../lib/colors";
import type { SelectedTeam } from "../types";

interface FooterProps {
  selectedTeam: SelectedTeam;
}

const Footer = ({ selectedTeam }: FooterProps) => {
  const footerBgClass = backgroundColorClass(selectedTeam?.color);

  return (
    <footer className={`${footerBgClass} px-12 max-sm:px-4 transition-colors duration-300`}>
      <div className="grid py-6 mx-12 max-sm:mx-4 max-sm:py-4">
        <p className="font-bold uppercase text-xs justify-self-center text-white">
          Onde Vai Passar &copy; 2025
        </p>
      </div>
    </footer>
  );
};

export default Footer;
