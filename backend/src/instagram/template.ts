import { abbreviateTeamName } from "./teamNameAbbreviation.js";

// Hand-built satori node tree — satori only needs objects shaped like
// `{ type, props: { style, children } }` (what JSX compiles down to), so a
// tiny local helper avoids pulling a JSX pragma/React runtime into a
// non-React backend just for this one template.
interface SatoriProps {
  style?: Record<string, string | number>;
  children?: unknown;
  src?: string;
  [key: string]: unknown;
}
export interface SatoriElement {
  type: string;
  props: SatoriProps;
}

function h(type: string, props: SatoriProps = {}, children?: unknown): SatoriElement {
  return { type, props: { ...props, children } };
}

// Layout v2 — plain white canvas, wordmark as a small corner mark instead
// of a full colored header band, no gray footer panel either (see the
// Figma mockup this replaced). Ditching the colored bands also retired the
// old fr-proportion system (they existed to divide up bands that no
// longer exist) and the per-channel "square vs wide" shape distinction
// (moot now that every channel ships curated square icon art — see
// assets.ts and Channel's own history in packages/shared).
const GRAY_800 = "#1f2937";
const GRAY_500 = "#6b7280"; // muted "Transmissão" label — the old bold purple read as a colored-panel heading, wrong tone for a label sitting directly on white.

export interface TemplateChannel {
  displayName: string;
  logoDataUri: string | null;
}

export interface TemplateInput {
  homeTeamName: string;
  awayTeamName: string;
  homeCrestDataUri: string;
  awayCrestDataUri: string;
  competitionName: string;
  kickoffLabel: string;
  channels: TemplateChannel[];
  wordmarkDataUri: string;
  versusIconDataUri: string;
}

// One shared look for every "match details" line (title / competition /
// kickoff) — same weight, color, case, AND size, per feedback that having
// the title bold-dark, the competition purple, and the kickoff a lighter
// medium-weight gray (each also its own size) read as three unrelated
// styles instead of one block. The shared size is driven by whichever of
// the three lines is longest, not each line's own length — a short date
// line sitting at a visibly bigger size than the other two just because it
// individually "fit" a larger tier defeated the point of unifying them.
// Still adapts overall (a tracked team's name is already short — see
// Team.displayName — so this mostly only steps down when the title line
// combines two long names, or an untracked opponent's occasionally-long
// raw name). matchDetailsBlock tries the curated abbreviation dictionary
// before accepting a smaller tier — see its own comment.
function detailBlockFontSize(lines: string[]): number {
  const longest = Math.max(...lines.map((line) => line.length));
  if (longest <= 20) return 40;
  if (longest <= 35) return 32;
  return 25;
}

function detailLine(text: string, fontSize: number): SatoriElement {
  return h(
    "p",
    {
      style: {
        display: "flex",
        fontSize,
        // Explicit tight leading: satori otherwise applies the font's own
        // (much taller) default line-height, which was most of the "too
        // much air between lines" feedback — the `gap` below was never the
        // main source of it.
        lineHeight: 1,
        fontWeight: 700,
        color: GRAY_800,
        textTransform: "uppercase",
        textAlign: "center",
      },
    },
    text,
  );
}


function matchDetailsBlock(input: TemplateInput): SatoriElement {
  const otherLines = [input.competitionName, input.kickoffLabel];
  const fullTitle = `${input.homeTeamName} x ${input.awayTeamName}`;
  const fullSize = detailBlockFontSize([fullTitle, ...otherLines]);

  // Prefer the full names at whatever size they earn; only reach for the
  // curated abbreviation dictionary when the full title doesn't already
  // land at the top tier, and only actually use it if it does better —
  // shrinking the font is explicitly the worse option here (feedback:
  // "não é bom que tenhamos que diminuir a fonte, fica ruim/feio"), so an
  // abbreviation is a straight win whenever it buys a bigger tier, and a
  // no-op (full name kept) whenever it wouldn't.
  let titleLine = fullTitle;
  let fontSize = fullSize;
  if (fullSize < 40) {
    const abbreviatedTitle = `${abbreviateTeamName(input.homeTeamName)} x ${abbreviateTeamName(input.awayTeamName)}`;
    const abbreviatedSize = detailBlockFontSize([abbreviatedTitle, ...otherLines]);
    if (abbreviatedSize > fullSize) {
      titleLine = abbreviatedTitle;
      fontSize = abbreviatedSize;
    }
  }

  // No extra gap on top of each line's own (now tight) leading.
  return h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 0 } }, [
    detailLine(titleLine, fontSize),
    detailLine(input.competitionName, fontSize),
    detailLine(input.kickoffLabel, fontSize),
  ]);
}

const CREST_SIZE = 280;

function teamCrest(crestDataUri: string): SatoriElement {
  return h("img", { src: crestDataUri, style: { width: CREST_SIZE, height: CREST_SIZE, objectFit: "contain" } });
}

// Splits channels into as-equal-as-possible rows instead of greedily
// filling each row to `maxPerRow` — 5 channels at maxPerRow 3 previously
// wrapped as 3+2 only by accident of flexWrap; a count like 7 would have
// greedily gone 3+3+1. This spreads any remainder across the *earliest*
// rows (standard balanced-chunking), so no row ever has more than one more
// item than any other.
function balancedRows<T>(items: T[], maxPerRow: number): T[][] {
  if (items.length <= maxPerRow) return items.length > 0 ? [items] : [];
  const rowCount = Math.ceil(items.length / maxPerRow);
  const base = Math.floor(items.length / rowCount);
  const remainder = items.length % rowCount;
  const rows: T[][] = [];
  let index = 0;
  for (let row = 0; row < rowCount; row++) {
    const size = base + (row < remainder ? 1 : 0);
    rows.push(items.slice(index, index + size));
    index += size;
  }
  return rows;
}

// Everything below sizes the channel tiles to fit whatever vertical room
// is actually left on the canvas, instead of a fixed lookup — the same
// "computed, not hardcoded" fix from the banded layout, re-derived for a
// canvas with no bands at all. CANVAS_SIZE minus CORNER_MARK_HEIGHT (the
// small reserved strip the wordmark sits in, see buildMatchImageTree) is
// the region the rest of the content centers in; subtracting the fixed
// part (crests, the details block, the "Transmissão" label, and the gaps
// between them) leaves the real budget for channel rows. Channels are the
// one part of the poster whose footprint depends on the match (1
// broadcast vs. several), so they're the part that should flex —
// everything else stays a constant size.
const CANVAS_SIZE = 1080;
const CORNER_MARK_HEIGHT = 130;
const CONTENT_REGION_HEIGHT = CANVAS_SIZE - CORNER_MARK_HEIGHT;
const CREST_ROW_GAP = 28;
const DETAILS_TO_LABEL_GAP = 36;
const LABEL_TO_CHANNELS_GAP = 22;
const CHANNEL_ROW_GAP = 12;

// FIXED_OVERHEAD_ABOVE_CHANNELS is the real, *measured* pixel distance from
// the top of the crests to the top of the first channel row (tier-40 names
// — the tallest text case — with the gap props above in place), plus a
// small safety cushion. It is NOT the sum of CREST_SIZE + the gap constants
// + assumed text-line heights — an earlier version tried that and
// undershot badly (measured ~620px, estimated ~581px), because satori adds
// its own per-line leading on top of `lineHeight: 1` and each configured
// `gap`, which isn't something its API exposes ahead of a render to
// calculate from first principles. Confirmed by rendering the single-row
// case and scanning the PNG for content bands top-to-bottom (crest row,
// each detail line, the label) — re-measure the same way if CREST_SIZE,
// any of the gaps above, or the detail/label font sizes change.
const FIXED_OVERHEAD_ABOVE_CHANNELS = 640;
const CHANNELS_AREA_HEIGHT = CONTENT_REGION_HEIGHT - FIXED_OVERHEAD_ABOVE_CHANNELS;

const MIN_TILE_SIZE = 90; // below this a logo stops being legible — real broadcast counts (checked against real match data: 6 is the highest seen) never actually hit this floor.
const MAX_TILE_SIZE = 240; // caps a single/sparse row from growing into a tile that dwarfs the crests (280px) above it.
const TILE_GAP = 24;
const CONTENT_WIDTH = CANVAS_SIZE - 2 * 60; // canvas minus the "0 60px" side padding used below.

// Every channel now ships curated square icon art (see assets.ts), so one
// square tile size fits all — no more per-shape width multiplier. Bounded
// on both axes: CHANNELS_AREA_HEIGHT ÷ rowCount as before, but now also
// CONTENT_WIDTH ÷ maxItemsInRow — needed since balancedRows can put up to
// MAX_PER_ROW tiles in a single row (feedback: 5 channels should fit in
// one row, not wrap to 3+2), and MAX_TILE_SIZE at 5-per-row would overflow
// the canvas width if only the vertical axis were checked.
function channelTileSize(rowCount: number, maxItemsInRow: number): number {
  const availableHeight = CHANNELS_AREA_HEIGHT - (rowCount - 1) * CHANNEL_ROW_GAP;
  const verticalCap = Math.floor(availableHeight / rowCount);
  const availableWidth = CONTENT_WIDTH - (maxItemsInRow - 1) * TILE_GAP;
  const horizontalCap = Math.floor(availableWidth / maxItemsInRow);
  const tightest = Math.min(MAX_TILE_SIZE, verticalCap, horizontalCap);
  return Math.max(MIN_TILE_SIZE, tightest);
}

function channelTile(channel: TemplateChannel, tileSize: number): SatoriElement {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: tileSize,
        height: tileSize,
      },
    },
    channel.logoDataUri
      ? h("img", {
          src: channel.logoDataUri,
          style: {
            maxWidth: tileSize,
            maxHeight: tileSize,
            objectFit: "contain",
            // Applied unconditionally: the curated square art that already
            // has its own transparent rounded corners (e.g. ESPN, Premiere)
            // has nothing left to clip here, so this is a no-op for those —
            // but it's what actually rounds the flat-cornered ones (e.g.
            // Globo, CazéTV) instead of them reading as a stray square tile.
            borderRadius: Math.round(tileSize * 0.18),
          },
        })
      : h(
          "p",
          {
            style: {
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: GRAY_800,
              textAlign: "center",
            },
          },
          channel.displayName,
        ),
  );
}

// Feedback: 5 channels should sit in a single row, and 7 should split
// 4+3 (not the 3-per-row default's 3+3+1). balancedRows(channels, 5)
// produces exactly that — 5 or fewer always fits in one row, and above
// that it spreads as evenly as possible across the fewest rows needed.
const MAX_PER_ROW = 5;

function channelsBlock(channels: TemplateChannel[]): SatoriElement {
  const rows = balancedRows(channels, MAX_PER_ROW);
  const maxItemsInRow = Math.max(...rows.map((row) => row.length));
  const tileSize = channelTileSize(rows.length, maxItemsInRow);

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: CHANNEL_ROW_GAP } },
    rows.map((row) =>
      h(
        "div",
        { style: { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: TILE_GAP } },
        row.map((channel) => channelTile(channel, tileSize)),
      ),
    ),
  );
}

export function buildMatchImageTree(input: TemplateInput): SatoriElement {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: "white",
        fontFamily: "Roboto",
      },
    },
    [
      // Small reserved strip for the wordmark, right-aligned — not a full
      // band, just enough room that the mark never collides with the
      // centered content below even in a many-channels match (see
      // CORNER_MARK_HEIGHT).
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            width: "100%",
            height: CORNER_MARK_HEIGHT,
            padding: "0 50px",
          },
        },
        [h("img", { src: input.wordmarkDataUri, style: { width: 190, height: 65, objectFit: "contain" } })],
      ),
      // Everything else centers as one block in the remaining space —
      // crests, match details, and channels aren't three independently
      // centered slices (that left dead margin between them, confirmed
      // visually in an earlier round) but one unit, so only the total
      // leftover space (if any) becomes margin, not one gap per section.
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            flexBasis: 0,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: CREST_ROW_GAP,
            padding: "0 60px",
          },
        },
        [
          h(
            "div",
            { style: { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 } },
            [
              teamCrest(input.homeCrestDataUri),
              h("img", { src: input.versusIconDataUri, style: { width: 64, height: 64, objectFit: "contain" } }),
              teamCrest(input.awayCrestDataUri),
            ],
          ),
          h(
            "div",
            { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: DETAILS_TO_LABEL_GAP } },
            [
              matchDetailsBlock(input),
              h(
                "div",
                { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: LABEL_TO_CHANNELS_GAP } },
                [
                  h(
                    "p",
                    {
                      style: {
                        display: "flex",
                        fontSize: 26,
                        fontWeight: 700,
                        color: GRAY_500,
                        textTransform: "uppercase",
                        letterSpacing: 2,
                      },
                    },
                    "Transmissão",
                  ),
                  channelsBlock(input.channels),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
