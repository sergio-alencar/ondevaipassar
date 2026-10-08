import { createContext } from "react";
import { EMPTY_PREFERENCES, type Preferences } from "@ondevaipassar/shared";

export interface PreferencesContextValue {
  preferences: Preferences;
  toggleTeam: (teamId: string) => void;
  toggleCompetition: (competitionId: string) => void;
  toggleChannel: (channelId: string) => void;
  clearChannels: () => void;
  /** Forget that this browser was ever connected to an account — called on sign-out and account deletion. The favourites themselves stay on the device. */
  detachAccount: () => void;
}

// Split from the provider so that file exports only a component — a file that
// exports a component and a non-component breaks React Fast Refresh (the same
// warning MatchesContext.tsx already carries).
export const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: EMPTY_PREFERENCES,
  toggleTeam: () => {},
  toggleCompetition: () => {},
  toggleChannel: () => {},
  clearChannels: () => {},
  detachAccount: () => {},
});
