import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteAccountRequest, fetchMe, signOutRequest, type MeResponse } from "../api/client";
import { AuthContext } from "./authContextValue";

const SIGNED_OUT: MeResponse = { user: null, loginAvailable: false, devLogin: false };

/**
 * Who the visitor is, asked of the API once at load. A failure to reach the
 * API counts as "not signed in, and no sign-in offered" rather than an error:
 * accounts are an extra, and the rest of the site doesn't depend on them.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse>(SIGNED_OUT);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [loginFailed, setLoginFailed] = useState(false);

  useEffect(() => {
    // The API sends the browser back with ?login=ok or ?login=falhou. Read it,
    // then take it out of the address bar so a reload or a shared link doesn't
    // carry it.
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("login");
    if (outcome !== null) {
      url.searchParams.delete("login");
      window.history.replaceState(null, "", url);
      if (outcome === "falhou") setLoginFailed(true);
    }

    let cancelled = false;
    fetchMe()
      .then((answer) => {
        if (!cancelled) setMe(answer);
      })
      .catch(() => {
        if (!cancelled) setMe(SIGNED_OUT);
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissLoginFailure = useCallback(() => setLoginFailed(false), []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setMe((current) => ({ ...current, user: null }));
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountRequest();
    setMe((current) => ({ ...current, user: null }));
  }, []);

  const value = useMemo(
    () => ({ status, user: me.user, loginAvailable: me.loginAvailable, devLogin: me.devLogin, loginFailed, dismissLoginFailure, signOut, deleteAccount }),
    [status, me, loginFailed, dismissLoginFailure, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
