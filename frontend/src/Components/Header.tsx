import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DropdownMenu from "./DropdownMenu";
import logoHeader from "../assets/images/icones/logo-3.svg";
import escudo from "../assets/images/icones/escudo.svg";
import { backgroundColorClass } from "../lib/colors";
import { SOCIAL_LINKS } from "../lib/socialLinks";
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
          relative here, on the full row — not on the icon's own tiny
          wrapper. Tried anchoring to just the icon so the vertical
          "top-full" would land right at the trigger's own bottom edge,
          but that box's real height (measured live via devtools
          protocol) is only ~28-41px, nowhere near the row's real ~90px
          (set by the taller logo elsewhere in this same row) — every
          attempt to stretch that tiny box to the row's real height
          (align-self:stretch, h-full, negative margins to counteract
          padding) either had no effect or only partly closed the gap,
          because the wrapper is nested two levels inside the row and
          each level's own padding kept eating back into it. Anchoring
          to the row directly sidesteps all of that — it's already
          exactly the header's real height, no fighting the box model
          needed. Horizontal centering under the icon is handled by a
          measured (not guessed) offset inside DropdownMenu instead.
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
        // w-80 (320px) still wrapped "Canal do WhatsApp" onto 2 lines by a
        // few px — measured (devtools protocol) the label's own natural
        // single-line width at 261px, +64px of the ul's own left/right
        // padding = 326px needed at minimum. w-88 (352px) clears that
        // with room to spare.
        className={`bg-white w-88 h-full z-50 fixed top-0 left-0 shadow-lg transition-transform duration-300 ease-in-out ${
          isMenuVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Closing this way already worked via the overlay's own onClick
            (clicking outside the menu) — this button is an explicit,
            visible way to do the same thing, since a tap-outside gesture
            isn't always obvious on mobile. */}
        <button type="button" onClick={() => setIsMenuVisible(false)} aria-label="Fechar menu" className="absolute top-6 right-6 cursor-pointer">
          <svg viewBox="0 0 24 24" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M5 5L19 19M19 5L5 19" />
          </svg>
        </button>
        <ul className="px-8 py-12 *:uppercase *:font-bold *:text-2xl space-y-4">
          <li>
            <Link to="/sobre" onClick={() => setIsMenuVisible(false)}>
              Sobre
            </Link>
          </li>
          {SOCIAL_LINKS.map(({ label, url }) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Header;
