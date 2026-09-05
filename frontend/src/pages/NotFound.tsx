import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { SetSelectedTeam } from "../types";

interface NotFoundProps {
  setSelectedTeam: SetSelectedTeam;
}

/**
 * Catch-all route. Needed as a real page rather than a server 404 because
 * the site is a SPA behind a catch-all rewrite (frontend/vercel.json sends
 * every path to index.html), so the server answers 200 for a nonexistent
 * URL no matter what — without this, a typo'd link rendered the header and
 * footer around a blank gap, which reads as broken rather than as "wrong
 * address".
 */
const NotFound = ({ setSelectedTeam }: NotFoundProps) => {
  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    <main className="flex flex-col grow items-center justify-center text-center max-w-7xl mx-auto px-24 max-sm:px-6 py-20">
      <p className="text-8xl font-bold text-purple-900 mb-2 max-sm:text-7xl">404</p>
      <h1 className="text-4xl font-bold uppercase mb-4 max-sm:text-2xl">Página não encontrada</h1>
      <p className="text-xl text-gray-600 mb-10 max-w-xl">
        Esse endereço não está na nossa tabela. Pode ser um link antigo ou um erro de digitação.
      </p>
      <Link
        to="/"
        className="bg-purple-900 text-white font-bold text-xl rounded-lg px-8 py-4 hover:bg-purple-700 transition-colors"
      >
        Ver os jogos de hoje
      </Link>
    </main>
  );
};

export default NotFound;
