import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DropdownMenu from "./DropdownMenu";
import logoHeader from "../assets/images/icones/logo-3.svg";
import escudo from "../assets/images/icones/escudo.svg";
import { backgroundColorClass } from "../lib/colors";
import type { SelectedTeam, SetSelectedTeam } from "../types";

interface HeaderProps {
  selectedTeam: SelectedTeam;
  setSelectedTeam: SetSelectedTeam;
}

const Header = ({ selectedTeam, setSelectedTeam }: HeaderProps) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const escudoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        escudoRef.current &&
        !escudoRef.current.contains(event.target as Node)
      ) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsDropdownVisible((prev) => !prev);
  const headerBgClass = backgroundColorClass(selectedTeam?.color);

  return (
    <>
      <div
        id="overlay"
        className={`fixed inset-0 bg-black opacity-70 z-40 transition-opacity ${
          isMenuVisible ? "block" : "hidden"
        }`}
        onClick={() => setIsMenuVisible(false)}
      ></div>
      <header
        className={`${headerBgClass} sticky top-0 px-12 max-sm:px-2 z-30 transition-colors duration-300`}
      >
        <div className="flex justify-between items-center mx-12 max-sm:mx-4">
          <button
            id="menu-botao"
            onClick={() => setIsMenuVisible(true)}
            className="flex gap-4 items-center cursor-pointer"
          >
            <span className="h-5 w-7 flex flex-col justify-between *:h-0.5 *:rounded-md *:bg-white">
              <span /> <span /> <span />
            </span>
            <p className="text-white text-xl uppercase font-bold max-sm:hidden">menu</p>
          </button>

          <Link to="/" onClick={() => setSelectedTeam(null)}>
            <img className="w-42 py-4 max-sm:w-32" src={logoHeader} alt="Onde Vai Passar" />
          </Link>

          <div className="relative flex gap-4 py-6 items-center">
            <p className="text-white text-xl uppercase font-bold select-none max-sm:!hidden">
              times
            </p>
            <img
              ref={escudoRef}
              onClick={toggleDropdown}
              className="size-7 cursor-pointer"
              src={escudo}
              alt="Escolha o time"
              title="Escolha o time"
            />
            <DropdownMenu
              ref={dropdownRef}
              setSelectedTeam={setSelectedTeam}
              isVisible={isDropdownVisible}
              setIsDropdownVisible={setIsDropdownVisible}
            />
          </div>
        </div>
      </header>
      <div
        id="menu-left"
        className={`bg-white w-64 h-full z-50 fixed top-0 left-0 shadow-lg transition-transform duration-300 ease-in-out ${
          isMenuVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ul className="px-8 py-12 *:uppercase *:font-bold *:text-2xl space-y-4">
          <li>
            <Link to="/sobre" onClick={() => setIsMenuVisible(false)}>
              Sobre
            </Link>
          </li>
          <li>
            <Link to="/contato" onClick={() => setIsMenuVisible(false)}>
              Contato
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Header;
