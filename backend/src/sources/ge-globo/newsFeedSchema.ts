import { z } from "zod";

// Loose on purpose: this is one item from a team's news-feed widget on
// ge.globo (a much bigger, unrelated blob — thumbnails, categories, etc.)
// and we only need two fields out of it. Validating more would just make
// this brittle against unrelated feed-item shape changes.
const newsFeedItemSchema = z.object({
  content: z.object({
    url: z.string(),
    title: z.string(),
  }),
});

export type NewsFeedItem = z.infer<typeof newsFeedItemSchema>;

/** Validates a single raw feed item, returning null (never throwing) if it doesn't match — one malformed item must not invalidate the rest of the feed. */
export function parseNewsFeedItem(value: unknown): NewsFeedItem | null {
  const result = newsFeedItemSchema.safeParse(value);
  return result.success ? result.data : null;
}
