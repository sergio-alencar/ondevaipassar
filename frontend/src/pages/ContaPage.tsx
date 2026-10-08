import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { devLoginUrl, googleLoginUrl } from "../api/client";
import GoogleSignInButton from "../Components/GoogleSignInButton";
import { useAuth } from "../lib/useAuth";
import { usePreferences } from "../lib/usePreferences";
import type { SetSelectedTeam } from "../types";
import ContaFavorites from "./conta/ContaFavorites";

interface ContaPageProps {
  setSelectedTeam: SetSelectedTeam;
}

const buttonClass = "cursor-pointer rounded-full px-6 py-3 font-bold uppercase transition-colors";

const ContaPage = ({ setSelectedTeam }: ContaPageProps) => {
  const { status, user, loginAvailable, devLogin, signOut, deleteAccount } = useAuth();
  const { detachAccount } = usePreferences();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  // Both run the same way: tell the preferences first (so this browser stops
  // treating itself as connected), then the API. A failure leaves the person
  // exactly where they were, with a message — never half signed out.
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      detachAccount();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  };

  if (status === "loading") return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <h1 className="pt-8 text-center text-4xl font-bold uppercase text-gray-800 max-sm:py-4 max-sm:text-2xl">Minha conta</h1>

      {user ? (
        <>
        <ContaFavorites />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-gray-600">Conectado como</p>
          <p className="break-all text-xl font-bold text-gray-800">{user.email}</p>
          <p className="mt-4 text-sm text-gray-500">
            Seus times, campeonatos e canais ficam guardados na conta e aparecem em qualquer aparelho em que você entrar.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void run(signOut)} className={`${buttonClass} bg-gray-800 text-white hover:bg-gray-700`}>
              Sair
            </button>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6">
            <h2 className="font-bold uppercase text-gray-800">Excluir minha conta</h2>
            <p className="mt-2 text-sm text-gray-500">
              Apaga agora a conta, os times, campeonatos e canais guardados nela e encerra o acesso em todos os aparelhos. Os favoritos que estão neste navegador continuam aqui. Não dá para desfazer.
            </p>
            {confirmingDelete ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" disabled={busy} onClick={() => void run(deleteAccount)} className={`${buttonClass} bg-red-700 text-white hover:bg-red-600`}>
                  Sim, excluir tudo
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirmingDelete(false)} className="cursor-pointer text-sm text-gray-600 underline hover:text-gray-900">
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={() => setConfirmingDelete(true)} className={`${buttonClass} mt-4 bg-gray-200 text-red-700 hover:bg-gray-300`}>
                Excluir minha conta
              </button>
            )}
          </div>

          {failed && <p className="mt-4 text-sm text-red-700">Não foi possível concluir agora. Nada mudou; tente de novo em instantes.</p>}
        </div>
        </>
      ) : (
        <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-gray-700">Você não está conectado.</p>
          <p className="mt-2 text-sm text-gray-500">
            O site funciona normalmente sem conta. Entrar serve só para levar seus times, campeonatos e canais favoritos para outros aparelhos.
          </p>
          {loginAvailable && (
            <div className="mt-6">
              <GoogleSignInButton href={googleLoginUrl} />
            </div>
          )}
          {devLogin && (
            <a href={devLoginUrl("teste@example.com")} className="mt-4 block text-sm text-gray-500 underline">
              Entrar com a conta de teste (só em desenvolvimento)
            </a>
          )}
          {!loginAvailable && !devLogin && <p className="mt-4 text-sm text-gray-400">As contas ainda não estão disponíveis.</p>}
        </div>
      )}

      <p className="mt-6 text-center text-sm">
        <Link to="/privacidade" className="text-gray-600 underline hover:text-gray-900">
          O que guardamos e por quê
        </Link>
      </p>
    </div>
  );
};

export default ContaPage;
