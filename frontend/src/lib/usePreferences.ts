import { useContext } from "react";
import { PreferencesContext } from "../context/preferencesContextValue";

export function usePreferences() {
  return useContext(PreferencesContext);
}
