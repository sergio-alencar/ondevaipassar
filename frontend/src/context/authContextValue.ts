import { createContext } from "react";

export interface AuthContextValue {
  /** "loading" until the first answer from /api/me, so nothing flashes "signed out" for someone who isn't. */
  status: "loading" | "ready";
  user: { email: string } | null;
  loginAvailable: boolean;
  devLogin: boolean;
  /** The last sign-in attempt came back refused (?login=falhou). Dismissed by dismissLoginFailure. */
  loginFailed: boolean;
  dismissLoginFailure: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// Split from the provider for the same Fast Refresh reason as the others.
export const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  user: null,
  loginAvailable: false,
  devLogin: false,
  loginFailed: false,
  dismissLoginFailure: () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
});
