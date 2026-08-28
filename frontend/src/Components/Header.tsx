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
  const escudoRef = useRef<HTMLButtonElement>(null);

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
        className={`${headerBgClass} sticky top-0 z-30 transition-colors duration-300`}
      >
        {/*
          relative lives here, on the full-width row, not on the inner
          "times" + icon wrapper below — DropdownMenu is positioned
          absolute against THIS box now, not that narrower one. It used to
          be anchored to the inner wrapper (only as wide as "times" + the
          icon), which broke two ways: fixed pixel offsets (top-19 right-12)
          calibrated against that box's small size didn't land the menu
          under the trigger on desktop, and max-sm:w-full resolved to
          "100% of that tiny box" instead of the viewport, so almost the
          whole menu rendered off-screen on mobile.
        */}
        <div className="relative flex justify-between items-center max-w-7xl mx-auto px-24 max-sm:px-6">
          <button
            id="menu-botao"
            type="button"
            onClick={() => setIsMenuVisible(true)}
            aria-label="Abrir menu"
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

          <div className="flex gap-4 py-6 items-center">
            <p className="text-white text-xl uppercase font-bold select-none max-sm:!hidden">
              times
            </p>
            <button
              ref={escudoRef}
              type="button"
              onClick={toggleDropdown}
              className="cursor-pointer"
              aria-label="Escolha o time"
              title="Escolha o time"
            >
              <img className="size-7" src={escudo} alt="" />
            </button>
          </div>

          <DropdownMenu
            ref={dropdownRef}
            setSelectedTeam={setSelectedTeam}
            isVisible={isDropdownVisible}
            setIsDropdownVisible={setIsDropdownVisible}
          />
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
        </ul>
      </div>
    </>
  );
};

export default Header;
