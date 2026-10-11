import { Link } from "react-router-dom";
import { analyticsAvailable, setConsent, useConsent } from "../lib/analytics";

/** Asks once whether the visit may be measured. Shown only when this build has analytics and the visitor hasn't answered. "Recusar" is as easy to reach as "Aceitar": it must not be the harder choice. */
const ConsentBanner = () => {
  const consent = useConsent();
  if (!analyticsAvailable || consent !== "undecided") return null;

  return (
    <div role="dialog" aria-label="Cookies de medição" className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 max-sm:flex-col max-sm:items-stretch">
        <p className="min-w-0 flex-1 text-sm text-gray-700">
          Podemos usar o Google Analytics para entender como o site é usado (páginas visitadas, de onde você chegou)? Só funciona se você aceitar, e você muda de ideia quando quiser.{" "}
          <Link to="/privacidade" className="font-bold text-purple-900 hover:text-purple-600">
            Saiba mais
          </Link>
        </p>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setConsent("denied")} className="min-h-11 cursor-pointer px-4 text-sm font-bold uppercase text-gray-800 hover:text-gray-500">
            Recusar
          </button>
          <button type="button" onClick={() => setConsent("granted")} className="min-h-11 cursor-pointer rounded-full bg-gray-800 px-6 text-sm font-bold uppercase text-white hover:bg-gray-700">
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
