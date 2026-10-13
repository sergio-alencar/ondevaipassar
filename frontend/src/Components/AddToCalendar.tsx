import type { MatchView } from "@ondevaipassar/shared";
import { buildGoogleCalendarUrl, buildMatchIcs, matchIcsFileName } from "@ondevaipassar/shared";
import { useState } from "react";
import { ACTION_QUIET_CLASS, ActionButton } from "./Action";

/** Hands the match to the visitor's calendar app as an .ics file; nothing is sent anywhere. */
function downloadCalendarEvent(match: MatchView): void {
  const url = URL.createObjectURL(new Blob([buildMatchIcs(match)], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = matchIcsFileName(match);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * "Adicionar ao calendário": one button that opens two choices — Google Agenda
 * (a pre-filled event page, nothing to download) or an .ics file for Apple,
 * Outlook and the rest.
 */
const AddToCalendar = ({ match }: { match: MatchView }) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ActionButton icon="calendar" quiet className="self-center" onClick={() => setOpen(true)}>
        Adicionar ao calendário
      </ActionButton>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center self-center">
      <a className={ACTION_QUIET_CLASS} href={buildGoogleCalendarUrl(match)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
        Google Agenda
      </a>
      <button type="button" className={ACTION_QUIET_CLASS} onClick={() => { downloadCalendarEvent(match); setOpen(false); }}>
        Outro (.ics)
      </button>
    </div>
  );
};

export default AddToCalendar;
