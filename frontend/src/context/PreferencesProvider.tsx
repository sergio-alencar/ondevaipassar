import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { parsePreferences, reconcilePreferences, samePreferences, toggleId, type Preferences } from "@ondevaipassar/shared";
import { fetchServerPreferences, saveServerPreferences } from "../api/client";
import { useAuth } from "../lib/useAuth";
import { PreferencesContext } from "./preferencesContextValue";

// "v1" so a future change of shape can read the old value instead of
// misreading it.
const STORAGE_KEY = "ondevaipassar:preferences:v1";
// What the account sync needs to remember between visits, kept apart from the
// preferences so that someone who never signs in never gets this key at all.
const SYNC_KEY = "ondevaipassar:sync:v1";

/** How long after the last tap before saving to the account, so starring five teams in a row is one request. */
const SAVE_DELAY_MS = 600;

interface SyncMarker {
  /** This browser changed something since it last reached the account. */
  dirty: boolean;
  /** Set once this browser has connected to an account; null means it never has. */
  syncedAt: string | null;
}

const NEVER_SYNCED: SyncMarker = { dirty: false, syncedAt: null };

// Every storage access is guarded: localStorage can throw on read OR write (a
// private window, storage blocked in the browser's settings, a full quota),
// and a preference that can't be saved must never take the page down — it
// just lasts until the tab closes.
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

function readSync(): SyncMarker {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SYNC_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return NEVER_SYNCED;
    const record = parsed as Record<string, unknown>;
    return { dirty: record.dirty === true, syncedAt: typeof record.syncedAt === "string" ? record.syncedAt : null };
  } catch {
    return NEVER_SYNCED;
  }
}

function writeSync(marker: SyncMarker): void {
  try {
    if (marker.syncedAt === null) window.localStorage.removeItem(SYNC_KEY);
    else window.localStorage.setItem(SYNC_KEY, JSON.stringify(marker));
  } catch {
    // Same as above.
  }
}

/**
 * The visitor's followed teams and channels. They live in this browser; when
 * the visitor is signed in they are also kept on their account, so they follow
 * them to another device. How the two are settled when they disagree is
 * reconcilePreferences' job (packages/shared), where it can be tested.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const email = user?.email ?? null;

  const [preferences, setPreferences] = useState<Preferences>(readStored);
  // Refs the async parts read, so a request that finishes later sees what is
  // true then rather than what was true when it started.
  const latest = useRef(preferences);
  const signedIn = useRef(false);
  const marker = useRef<SyncMarker>(readSync());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The first render's state IS what's stored (or nothing); writing it back
  // would create the key for every visitor, including ones who never touch a
  // preference.
  const isFirstRender = useRef(true);

  useEffect(() => {
    latest.current = preferences;
  }, [preferences]);
  useEffect(() => {
    signedIn.current = email !== null;
  }, [email]);

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

  const setMarker = useCallback((next: SyncMarker) => {
    marker.current = next;
    writeSync(next);
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!signedIn.current) return;
      const snapshot = latest.current;
      try {
        const saved = await saveServerPreferences(snapshot);
        // If it changed again while the request was in flight, there is still
        // something the account hasn't seen — stay dirty and go round again.
        if (samePreferences(latest.current, snapshot)) {
          setMarker({ dirty: false, syncedAt: saved.updatedAt ?? new Date().toISOString() });
        } else {
          scheduleSave();
        }
      } catch {
        // Offline or the API is down: stays dirty, and the next change or the
        // next page load tries again. The choice is already safe on this device.
      }
    }, SAVE_DELAY_MS);
  }, [setMarker]);

  /** Called after every local change. Does nothing for a browser that was never connected to an account. */
  const noteLocalChange = useCallback(() => {
    if (marker.current.syncedAt === null) return;
    // Marked even when not signed in right now (a session that expired, or the
    // first moments of a page load): the edit still has to reach the account
    // eventually, and reconcile will favour it.
    setMarker({ ...marker.current, dirty: true });
    if (signedIn.current) scheduleSave();
  }, [scheduleSave, setMarker]);

  // Signed in (at load, or just now): settle this browser against the account.
  useEffect(() => {
    if (email === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const server = await fetchServerPreferences();
        if (cancelled) return;
        const result = reconcilePreferences({
          local: latest.current,
          server: { teams: server.teams, channels: server.channels },
          hasSynced: marker.current.syncedAt !== null,
          dirty: marker.current.dirty,
        });
        if (!samePreferences(result.preferences, latest.current)) setPreferences(result.preferences);
        let syncedAt = server.updatedAt ?? new Date().toISOString();
        if (result.pushToServer) {
          const saved = await saveServerPreferences(result.preferences);
          syncedAt = saved.updatedAt ?? syncedAt;
        }
        if (!cancelled) setMarker({ dirty: false, syncedAt });
      } catch {
        // Couldn't reach the account; this device keeps working and the next
        // load tries again.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, setMarker]);

  const toggleTeam = useCallback(
    (teamId: string) => {
      setPreferences((current) => ({ ...current, teams: toggleId(current.teams, teamId) }));
      noteLocalChange();
    },
    [noteLocalChange],
  );
  const toggleChannel = useCallback(
    (channelId: string) => {
      setPreferences((current) => ({ ...current, channels: toggleId(current.channels, channelId) }));
      noteLocalChange();
    },
    [noteLocalChange],
  );
  const clearChannels = useCallback(() => {
    setPreferences((current) => ({ ...current, channels: [] }));
    noteLocalChange();
  }, [noteLocalChange]);

  const detachAccount = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setMarker(NEVER_SYNCED);
  }, [setMarker]);

  const value = useMemo(
    () => ({ preferences, toggleTeam, toggleChannel, clearChannels, detachAccount }),
    [preferences, toggleTeam, toggleChannel, clearChannels, detachAccount],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
