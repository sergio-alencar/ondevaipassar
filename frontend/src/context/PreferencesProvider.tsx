import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { parsePreferences, toggleId, type Preferences } from "@ondevaipassar/shared";
import { PreferencesContext } from "./preferencesContextValue";

// "v1" so a future change of shape can read the old value instead of
// misreading it.
const STORAGE_KEY = "ondevaipassar:preferences:v1";

// Every access is guarded: localStorage can throw on read OR write (a private
// window, storage blocked in the browser's settings, a full quota), and a
// preference that can't be saved must never take the page down — it just
// lasts until the tab closes.
function readStored(): Preferences {
  try {
    return parsePreferences(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { teams: [], channels: [] };
  }
}

function writeStored(preferences: Preferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Not saved; the in-memory state still works for this visit.
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(readStored);
  // The first render's state IS what's stored (or nothing); writing it back
  // would create the key for every visitor, including ones who never touch a
  // preference.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    writeStored(preferences);
  }, [preferences]);

  // Another tab changed them: follow it, so a star ticked in one tab shows in
  // the other without a reload. (The event never fires in the tab that wrote.)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setPreferences(parsePreferences(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTeam = useCallback((teamId: string) => {
    setPreferences((current) => ({ ...current, teams: toggleId(current.teams, teamId) }));
  }, []);
  const toggleChannel = useCallback((channelId: string) => {
    setPreferences((current) => ({ ...current, channels: toggleId(current.channels, channelId) }));
  }, []);
  const clearChannels = useCallback(() => {
    setPreferences((current) => ({ ...current, channels: [] }));
  }, []);

  const value = useMemo(
    () => ({ preferences, toggleTeam, toggleChannel, clearChannels }),
    [preferences, toggleTeam, toggleChannel, clearChannels],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
