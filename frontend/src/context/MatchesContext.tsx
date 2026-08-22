import { createContext, useEffect, useState, type ReactNode } from "react";
import type { MatchView } from "@ondevaipassar/shared";
import { fetchMatches } from "../api/client";

interface MatchesContextValue {
  matches: MatchView[];
  loading: boolean;
  error: string | null;
}

export const MatchesContext = createContext<MatchesContextValue>({
  matches: [],
  loading: true,
  error: null,
});

export function MatchesProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchMatches()
      .then((data) => {
        if (!cancelled) setMatches(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao buscar jogos. O backend está rodando?");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <MatchesContext.Provider value={{ matches, loading, error }}>{children}</MatchesContext.Provider>;
}
