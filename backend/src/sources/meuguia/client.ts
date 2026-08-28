import { fetchText } from "../../http/client.js";
import { parseSchedule, type ScheduleEntry } from "./schedule.js";

/**
 * meuguia.tv has no fixtures API — this reads a channel's own ~2-week TV
 * grid (one page, no date navigation needed: confirmed live the whole
 * window is already in the initial HTML), enough to say *which* match is
 * airing live on that channel but never enough to create a match record.
 * See ingest/meuguiaEnrichment.ts for how this attaches to matches
 * ge.globo already ingested.
 */
export async function fetchChannelSchedule(channelCode: string): Promise<ScheduleEntry[]> {
  const html = await fetchText(`https://meuguia.tv/programacao/canal/${channelCode}`);
  return parseSchedule(html);
}
