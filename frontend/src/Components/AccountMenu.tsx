import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { devLoginUrl, googleLoginUrl } from "../api/client";
import { useAuth } from "../lib/useAuth";
import { usePreferences } from "../lib/usePreferences";
import triangleIcon from "../assets/images/icones/triangulo-2.svg";

interface AccountMenuProps {
  isVisible: boolean;
  close: () => void;
  onPointerEnter: (event: React.PointerEvent) => void;
  onPointerLeave: (event: React.PointerEvent) => void;
}

const itemClass = "block w-full cursor-pointer rounded-md px-4 py-3 text-left text-base font-bold uppercase text-gray-800 hover:bg-gray-100";

/**
 * What the person icon in the header opens: "Ver perfil" and "Sair" for
 * someone signed in, the Google sign-in for someone who isn't. It opens on
 * hover with a mouse and on tap otherwise (see Header) — hover alone would
 * leave phones, where most visitors are, with no way in.
 */
const AccountMenu = forwardRef<HTMLDivElement, AccountMenuProps>(({ isVisible, close, onPointerEnter, onPointerLeave }, ref) => {
  const { user, loginAvailable, devLogin, signOut } = useAuth();
  const { detachAccount } = usePreferences();

  const handleSignOut = async () => {
    try {
      await signOut();
      detachAccount();
    } catch {
      // The session is still alive; the visitor can try again from here or from their profile.
    } finally {
      close();
    }
  };

  return (
    <div
      ref={ref}
      id="accountMenu"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // Same anchoring as DropdownMenu: absolute to the header row, just under the icon.
      className={`absolute right-0 max-sm:right-6 top-14.75 max-sm:top-13 flex-col items-end ${isVisible ? "flex" : "hidden"}`}
    >
      <img src={triangleIcon} alt="" className="mt-2 mr-23.5 -mb-1 h-auto w-8 max-sm:mr-0" />
      <div className="w-56 rounded-lg bg-white p-2 shadow">
        {user ? (
          <>
            <p className="truncate px-4 pt-2 pb-1 text-xs text-gray-500" title={user.email}>
              {user.email}
            </p>
            <Link to="/conta" onClick={close} className={itemClass}>
              Ver perfil
            </Link>
            <button type="button" onClick={() => void handleSignOut()} className={itemClass}>
              Sair
            </button>
          </>
        ) : (
          <>
            {loginAvailable && (
              <a href={googleLoginUrl} className={itemClass}>
                Entrar com Google
              </a>
            )}
            {devLogin && (
              <a href={devLoginUrl("teste@example.com")} className={itemClass}>
                Entrar (teste)
              </a>
            )}
            {!loginAvailable && !devLogin && (
              <Link to="/conta" onClick={close} className={itemClass}>
                Ver perfil
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
});

AccountMenu.displayName = "AccountMenu";

export default AccountMenu;
