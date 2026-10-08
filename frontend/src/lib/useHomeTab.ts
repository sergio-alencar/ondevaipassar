import { useSearchParams } from "react-router-dom";

export const HOME_TABS = [
  { id: "times", label: "Times" },
  { id: "campeonatos", label: "Campeonatos" },
  { id: "canais", label: "Canais" },
] as const;

export type HomeTab = (typeof HOME_TABS)[number]["id"];

const PARAM = "aba";

/**
 * The Home's tab, kept in the URL (?aba=canais) for the same reason the
 * division is (see useDivisionSearchParam): going to a team's page and back
 * restores exactly what was on screen instead of dropping to the default.
 * "times" is the default, so it's the one value that leaves the URL clean.
 */
export function useHomeTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(PARAM);
  const tab: HomeTab = HOME_TABS.find((option) => option.id === raw)?.id ?? "times";

  const setTab = (next: HomeTab) => {
    // Replaces every param, which also resets the division tab — right, since
    // that control only exists inside the Times tab.
    setSearchParams(next === "times" ? {} : { [PARAM]: next }, { replace: true });
  };

  return { tab, setTab };
}
