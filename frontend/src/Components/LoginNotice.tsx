import { useAuth } from "../lib/useAuth";

/** Shown only when a sign-in attempt came back refused. Quiet on purpose: nothing is wrong with the site, and no reason is given (it would only help someone probing the login). */
const LoginNotice = () => {
  const { loginFailed, dismissLoginFailure } = useAuth();
  if (!loginFailed) return null;
  return (
    <div role="alert" className="bg-yellow-100 px-4 py-3 text-center text-sm text-yellow-900">
      Não foi possível entrar. Tente de novo.{" "}
      <button type="button" onClick={dismissLoginFailure} className="cursor-pointer font-bold underline">
        Fechar
      </button>
    </div>
  );
};

export default LoginNotice;
