import { abbreviateTeamName } from "./teamNameAbbreviation.js";
import { balancedRows, type SatoriElement, type TemplateChannel, type TemplateCrest } from "./template.js";

// Same hand-built node helper as template.ts — see its own comment for why
// there's no JSX here.
interface SatoriProps {
  style?: Record<string, string | number>;
  children?: unknown;
  src?: string;
  [key: string]: unknown;
}

function h(type: string, props: SatoriProps = {}, children?: unknown): SatoriElement {
  return { type, props: { ...props, children } };
}

// Instagram's portrait post, the tallest format the feed shows without
// cropping — 4:5. The square 1080x1080 template.ts still renders is what a
// single match goes out as; this taller canvas exists to fit several
// matches in one slide, which is the whole point of the carousel.
export const PORTRAIT_WIDTH = 1080;
export const PORTRAIT_HEIGHT = 1350;

/**
 * Kept here rather than in renderCarousel so the layout maths and the
 * chunking can never disagree about how many matches a slide holds. Two,
 * not three: once the crests, names, kick-off and channel logos all grew
 * (and got stacked on separate lines), three blocks no longer fit a 1350px
 * canvas — they overflowed their own boxes and printed on top of each other.
 */
export const MATCHES_PER_SLIDE = 2;

const PURPLE = "#59168b";
const GRAY_900 = "#111827";
const GRAY_600 = "#4b5563";
const GRAY_200 = "#e5e7eb";

const SIDE_PADDING = 64;
const CONTENT_WIDTH = PORTRAIT_WIDTH - 2 * SIDE_PADDING;

/** A channel on a slide, plus its footnote marker ("*", "**") — empty when its coverage carries no regional note. */
export interface SlideChannel extends TemplateChannel {
  regionalMarker: string;
  /** Gets the green "GRÁTIS" badge — the same marker the site puts on the logo, and for the same reason: it's the exception, not a label for every channel. */
  free: boolean;
}

export interface SlideMatch {
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: TemplateCrest;
  awayCrest: TemplateCrest;
  timeLabel: string;
  channels: SlideChannel[];
  /** Which competition this match belongs to — set only on a slide whose matches come from more than one (the combined "Jogos da Europa" post), where the header can't say it for them. */
  competitionLabel: string | null;
  /** The competition's logo, shown beside its name; null when there is none. */
  competitionBadge?: string | null;
}

/** Crest box: height fixed, width narrowed for a shield-shaped crest so its own ink — not its invisible square canvas — sits flush against the layout. Same rule as template.ts's teamCrest, at this layout's smaller size. */
function crest(art: TemplateCrest, size: number): SatoriElement {
  return h("img", {
    src: art.dataUri,
    style: { width: Math.round(size * Math.min(art.aspectRatio, 1)), height: size, objectFit: "contain" },
  });
}

const YELLOW = "#facc15";
// Same green the site's badge uses (Tailwind green-600), so the two surfaces
// read as one marker rather than two similar-looking ones.
const GREEN_600 = "#16a34a";

/**
 * One channel: its logo (or its name, when we don't ship art). A regional
 * caveat shows as the same yellow badge the site puts on the logo
 * (MatchBroadcasts.tsx), overlapping its corner — as a sibling in the row
 * it opened a gap between that logo and the next one.
 */
function channelTile(channel: SlideChannel, tileSize: number): SatoriElement {
  const art = channel.logoDataUri
    ? h("img", {
        src: channel.logoDataUri,
        style: { width: tileSize, height: tileSize, objectFit: "contain", borderRadius: 14 },
      })
    : // No local art for this channel yet — its name still has to show,
      // otherwise the slide would silently drop a broadcaster.
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            height: tileSize,
            padding: "0 18px",
            borderRadius: 14,
            backgroundColor: GRAY_200,
            color: GRAY_900,
            fontSize: 30,
            fontWeight: 700,
          },
        },
        channel.displayName,
      );

  if (!channel.regionalMarker && !channel.free) return art;

  const badge = Math.round(tileSize * 0.34);
  // Written as a word, not an icon: the only fonts loaded here are Roboto
  // regular/bold, so any glyph outside that set renders as tofu. Centered
  // under the logo instead of in a corner, both because the word is wide and
  // so it never fights the regional marker sitting at the top right.
  const freeBadge = channel.free
    ? [
        h(
          "div",
          {
            style: {
              position: "absolute",
              // Hangs mostly BELOW the tile, overlapping just enough to read
              // as attached to it. Sitting on the logo (as a corner badge
              // does) buried the bottom of the wordmark on Globo and CazéTV,
              // whose art has type running to the edge.
              bottom: -Math.round(badge * 0.78),
              left: 0,
              width: tileSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          [
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  height: badge,
                  padding: "0 10px",
                  borderRadius: badge,
                  backgroundColor: GREEN_600,
                  color: "#ffffff",
                  fontSize: Math.round(badge * 0.5),
                  fontWeight: 700,
                },
              },
              "GRÁTIS",
            ),
          ],
        ),
      ]
    : [];

  if (!channel.regionalMarker) return h("div", { style: { display: "flex", position: "relative" } }, [art, ...freeBadge]);

  return h("div", { style: { display: "flex", position: "relative" } }, [
    art,
    ...freeBadge,
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: -6,
          right: -6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: badge,
          height: badge,
          padding: "0 8px",
          borderRadius: badge,
          backgroundColor: YELLOW,
          color: GRAY_900,
          fontSize: Math.round(badge * 0.78),
          fontWeight: 700,
        },
      },
      channel.regionalMarker,
    ),
  ]);
}

/** Side of the competition logo beside its name: about the height of the label's own line. */
const COMPETITION_BADGE_SIZE = 34;

const CHANNEL_TILE = 132;
/** Tile size once the channels need two rows: smaller, so both rows and the crests still fit the block. */
const CHANNEL_TILE_TWO_ROWS = 112;
const CHANNEL_GAP = 18;

/**
 * Channels in the fewest, most EQUAL rows: 8 go 4 + 4, never 6 + 2. A greedy
 * wrap left a stranded pair under a full row, and Sérgio's rule is that rows
 * are always balanced. How many fit one row is decided at the full tile size,
 * so the split doesn't change with the smaller one.
 */
export function channelRows<T>(channels: T[]): T[][] {
  const perRow = Math.max(1, Math.floor((CONTENT_WIDTH + CHANNEL_GAP) / (CHANNEL_TILE + CHANNEL_GAP)));
  return balancedRows(channels, perRow);
}

/**
 * The strip's measurements for a number of channels. The "GRÁTIS" badge hangs
 * below its tile (~0.27 of the tile), so there is room for it between two rows
 * and under the last one — without that the badge landed on the next row's
 * tiles and on the next match's crest.
 */
function channelStripLayout(channelCount: number): { rows: number; tile: number; rowGap: number; overhang: number; height: number } {
  const rows = channelRows(new Array<number>(channelCount).fill(0)).length;
  const tile = rows > 1 ? CHANNEL_TILE_TWO_ROWS : CHANNEL_TILE;
  const overhang = Math.round(tile * 0.3);
  const rowGap = overhang + 14;
  return { rows, tile, rowGap, overhang, height: rows * tile + Math.max(0, rows - 1) * rowGap + overhang };
}

function channelStrip(channels: SlideChannel[]): SatoriElement {
  const { tile, rowGap, overhang } = channelStripLayout(channels.length);
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: rowGap, paddingBottom: overhang } },
    channelRows(channels).map((row) =>
      h(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: CHANNEL_GAP } },
        row.map((channel) => channelTile(channel, tile)),
      ),
    ),
  );
}

/**
 * One match inside a slide. Team names are abbreviated by the same helper
 * the square template uses, since two full names plus an "x" on one line
 * is what overflows first at this width.
 */
const MIN_CREST = 110;
// Capped so a slide carrying a single match doesn't render a crest three
// times the size of the same crest on a 3-match slide — the block would
// otherwise just grow into whatever vertical space it was given.
const MAX_CREST = 180;

// Everything in a block except the crests: the pairing line, the channel
// strip, the optional competition label and the gaps between them. The
// crest gets whatever is left, which is what keeps a block inside its box
// no matter how the surrounding sizes are tuned.
const BLOCK_FIXED_NON_STRIP = 60 + 34;

/** The least height a match block needs without overflowing: its fixed lines, its channel strip and the smallest crest. Stories pack matches by this. */
export function matchBlockMinHeight(match: Pick<SlideMatch, "channels">, minCrest: number = MIN_CREST): number {
  return BLOCK_FIXED_NON_STRIP + channelStripLayout(match.channels.length).height + minCrest;
}

export function matchBlock(match: SlideMatch, blockHeight: number, minCrest: number = MIN_CREST): SatoriElement {
  const labelHeight = match.competitionLabel ? 44 : 0;
  const crestBudget = blockHeight - BLOCK_FIXED_NON_STRIP - channelStripLayout(match.channels.length).height - labelHeight;
  const crestSize = Math.min(MAX_CREST, Math.max(minCrest, crestBudget));

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: CONTENT_WIDTH,
        height: blockHeight,
        gap: 14,
      },
    },
    [
      ...(match.competitionLabel
        ? [
            // The badge is no taller than the label's own line (28px type, ~34px line), so the block keeps its height.
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12 } }, [
              ...(match.competitionBadge ? [h("img", { src: match.competitionBadge, style: { width: COMPETITION_BADGE_SIZE, height: COMPETITION_BADGE_SIZE, objectFit: "contain" } })] : []),
              h(
                "div",
                { style: { display: "flex", color: GRAY_600, fontSize: 28, fontWeight: 700, letterSpacing: 2 } },
                match.competitionLabel.toUpperCase(),
              ),
            ]),
          ]
        : []),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 26 } }, [
        crest(match.homeCrest, crestSize),
        h("div", { style: { display: "flex", color: GRAY_600, fontSize: 38, fontWeight: 700 } }, "x"),
        crest(match.awayCrest, crestSize),
      ]),
      // Kick-off and the pairing on one line, all caps — "16H30" with the H
      // uppercase, per Sérgio.
      h("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18 } }, [
        h("div", { style: { display: "flex", color: PURPLE, fontSize: 46, fontWeight: 700 } }, match.timeLabel.toUpperCase()),
        h(
          "div",
          { style: { display: "flex", color: GRAY_900, fontSize: 46, fontWeight: 700, textAlign: "center" } },
          // Names upper-cased individually so the "x" between them stays
          // lower-case, per Sérgio.
          `${abbreviateTeamName(match.homeTeamName).toUpperCase()} x ${abbreviateTeamName(match.awayTeamName).toUpperCase()}`,
        ),
      ]),
      // The channel art is the answer the whole project exists to give, so
      // it gets the largest tile the block can carry.
      channelStrip(match.channels),
    ],
  );
}

export interface SlideInput {
  competitionName: string;
  dateLabel: string;
  matches: SlideMatch[];
  wordmarkDataUri: string;
  /** Rendered as "2/3" in the corner when a competition needed more than one slide of matches. */
  slideLabel: string | null;
  /** One line per regional caveat on this slide, already worded — printed under the matches, keyed by the asterisk on the channel it belongs to. */
  regionalNotes: string[];
}

// Characters of the 44px bold header that fit one line across the slide, measured against the cut-off header
// of "ELIMINATÓRIAS EUROPEIAS FEMININAS | TERÇA, 13/OUT" (49 characters, did not fit).
const HEADER_ONE_LINE_CHARS = 36;
const HEADER_NAME_FULL_SIZE_CHARS = 30;

function headerLines(name: string, date: string): SatoriElement[] {
  const text = (value: string, color: string, fontSize: number): SatoriElement =>
    h("div", { style: { display: "flex", color, fontSize, fontWeight: 700 } }, value);

  if (name.length + date.length + 3 <= HEADER_ONE_LINE_CHARS) {
    // Same size and centre-aligned: at two different sizes on a baseline they read as one sitting higher than the other.
    return [
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 18 } }, [
        text(name, PURPLE, 44),
        text("|", GRAY_200, 44),
        text(date, GRAY_600, 44),
      ]),
    ];
  }
  return [
    h("div", { style: { display: "flex", justifyContent: "center", textAlign: "center" } }, [
      text(name, PURPLE, name.length > HEADER_NAME_FULL_SIZE_CHARS ? 38 : 44),
    ]),
    h("div", { style: { display: "flex", justifyContent: "center", marginTop: 6 } }, [text(date, GRAY_600, 34)]),
  ];
}

/** A slide carrying 2-3 matches. */
export function buildSlideTree(input: SlideInput): SatoriElement {
  const headerHeight = 150;
  const footerHeight = 96;
  // Sized from the notes' own WRAPPED line count, not just how many notes
  // there are: a full-state list ("AC, AL, AM, ...") runs to two lines at
  // this width, and budgeting one would push the block into the footer.
  // ~62 characters per line at fontSize 26 across CONTENT_WIDTH, measured
  // against the real Globo notes rather than assumed.
  const noteLines = input.regionalNotes.reduce((total, note) => total + Math.ceil((note.length + 2) / 62), 0);
  const notesHeight = noteLines > 0 ? 30 + noteLines * 38 : 0;
  const available = PORTRAIT_HEIGHT - headerHeight - footerHeight - notesHeight;
  const dividers = Math.max(0, input.matches.length - 1) * 2;
  const blockHeight = Math.min(
    Math.floor(available / MATCHES_PER_SLIDE),
    Math.floor((available - dividers) / input.matches.length),
  );

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: PORTRAIT_WIDTH,
        height: PORTRAIT_HEIGHT,
        backgroundColor: "#ffffff",
        padding: `0 ${SIDE_PADDING}px`,
      },
    },
    [
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: headerHeight,
            borderBottom: `4px solid ${GRAY_200}`,
          },
        },
        [
          // One line while name and date fit side by side; a long name
          // ("ELIMINATÓRIAS EUROPEIAS FEMININAS") plus the date ran past the
          // slide's edge and was cut off, so then the date drops to a second
          // line and the name shrinks only if it alone is still too wide.
          ...headerLines(input.competitionName.toUpperCase(), input.dateLabel.toUpperCase()),
        ],
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: available,
          },
        },
        // Divider between blocks, not around them: with the blocks now
        // filling their space, a competition label was reading as if it
        // belonged to the match above it.
        input.matches.flatMap((match, index) =>
          index === 0
            ? [matchBlock(match, blockHeight)]
            : [
                h("div", {
                  style: { display: "flex", width: CONTENT_WIDTH * 0.55, height: 2, backgroundColor: GRAY_200 },
                }),
                matchBlock(match, blockHeight),
              ],
        ),
      ),
      ...(input.regionalNotes.length > 0
        ? [
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  height: notesHeight,
                  gap: 6,
                },
              },
              // The lines arrive already marked (or deliberately unmarked,
              // for the caveat that applies to all of them).
              input.regionalNotes.map((note) =>
                h("div", { style: { display: "flex", color: GRAY_600, fontSize: 26 } }, note),
              ),
            ),
          ]
        : []),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", height: footerHeight } },
        [
          h("img", { src: input.wordmarkDataUri, style: { height: 56 } }),
          h(
            "div",
            { style: { display: "flex", color: GRAY_600, fontSize: 28 } },
            input.slideLabel ?? "ONDEVAIPASSAR.COM",
          ),
        ],
      ),
    ],
  );
}

export interface CoverInput {
  competitionName: string;
  dateLabel: string;
  matchCount: number;
  /** The competition's own logo. Null falls back to the crest strip below — a competition we don't ship art for still gets a cover. */
  competitionLogoDataUri: string | null;
  /**
   * Text printed under the logo (Competition.logoCaption) — the whole name
   * for a bare-symbol logo, or just the word that tells a women's tournament
   * from the men's one whose logo it shares. Every other logo says enough, and
   * repeating the name there was exactly the redundancy the cover dropped.
   * Null prints nothing.
   */
  logoCaption: string | null;
  /** Prints the competition's name under a smaller logo — for a logo that is only the organiser's (UEFA's badge on a qualifiers post), which doesn't say which tournament this is. */
  titleUnderLogo?: boolean;
  /** Crests of the clubs playing that day: the cover's artwork when there's no competition logo, and a supporting strip under it when there is. */
  crests: TemplateCrest[];
  wordmarkDataUri: string;
}

/** The carousel's first slide — what shows in the feed before anyone swipes. */
export function buildCoverTree(input: CoverInput): SatoriElement {
  const hasLogo = input.competitionLogoDataUri !== null;
  // With a logo carrying the identity, the crests are a supporting strip
  // (one row); without one they ARE the artwork, so they get two rows at a
  // bigger size.
  // Every club playing that day, never a "+N": Sérgio's call. The crests
  // shrink to fit instead, within a floor that keeps them recognisable —
  // the row grows wider and the tile smaller as the day gets busier.
  const CREST_AREA_HEIGHT = hasLogo ? 400 : 560;
  const CREST_GAP = 22;
  const maxPerRow = input.crests.length <= 10 ? 5 : input.crests.length <= 18 ? 6 : 7;
  // Balanced, not greedy: 6 crests at 5 per row was rendering 5 and then a
  // single stranded one on its own line.
  const rows = balancedRows(input.crests, maxPerRow);
  const widest = rows.reduce((most, row) => Math.max(most, row.length), 0);
  const widthFit = Math.floor((CONTENT_WIDTH - CREST_GAP * (widest - 1)) / Math.max(widest, 1));
  const heightFit = Math.floor((CREST_AREA_HEIGHT - CREST_GAP * (rows.length - 1)) / Math.max(rows.length, 1));
  const crestSize = Math.max(64, Math.min(hasLogo ? 130 : 160, widthFit, heightFit));

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 64,
        width: PORTRAIT_WIDTH,
        height: PORTRAIT_HEIGHT,
        backgroundColor: PURPLE,
        padding: `64px ${SIDE_PADDING}px`,
      },
    },
    [
      h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 28 } }, [
        // No "ONDE ASSISTIR" line and no competition name: the logo says
        // which competition this is, and the wordmark at the foot says what
        // the account is. Both were repeating what the art already carried.
        ...(hasLogo
          ? [
              // Shorter when it carries a caption, so the block keeps the
              // height of a cover whose logo says its own name.
              h("img", {
                src: input.competitionLogoDataUri as string,
                style: { height: input.titleUnderLogo ? 190 : input.logoCaption ? 420 : 520, objectFit: "contain" },
              }),
              ...(input.titleUnderLogo
                ? [
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "center",
                          width: CONTENT_WIDTH,
                          color: "#ffffff",
                          fontSize: input.competitionName.length > 22 ? 76 : 96,
                          fontWeight: 700,
                          textAlign: "center",
                          lineHeight: 1.05,
                          letterSpacing: 1,
                        },
                      },
                      input.competitionName.toUpperCase(),
                    ),
                  ]
                : []),
              ...(input.logoCaption
                ? [
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "center",
                          width: CONTENT_WIDTH,
                          color: "#ffffff",
                          fontSize: input.logoCaption.length > 22 ? 56 : 68,
                          fontWeight: 700,
                          textAlign: "center",
                          lineHeight: 1.05,
                          letterSpacing: 1,
                        },
                      },
                      input.logoCaption.toUpperCase(),
                    ),
                  ]
                : []),
            ]
          : [
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    color: "#ffffff",
                    fontSize: input.competitionName.length > 22 ? 76 : 96,
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: 1.05,
                    letterSpacing: 1,
                  },
                },
                input.competitionName.toUpperCase(),
              ),
            ]),
        h(
          "div",
          { style: { display: "flex", color: "#e9d5ff", fontSize: 52, fontWeight: 700, letterSpacing: 1 } },
          input.dateLabel.toUpperCase(),
        ),
      ]),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: CREST_GAP } },
        rows.map((row) =>
          h(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: CREST_GAP } },
            row.map((art) => crest(art, crestSize)),
          ),
        ),
      ),
      h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 26 } }, [
        h(
          "div",
          { style: { display: "flex", color: "#ffffff", fontSize: 50, fontWeight: 700 } },
          `${input.matchCount} ${input.matchCount === 1 ? "JOGO" : "JOGOS"}`,
        ),
        h("img", { src: input.wordmarkDataUri, style: { height: 78 } }),
      ]),
    ],
  );
}

// ---- Stories: the same blocks on a 9:16 canvas ------------------------------------------------------------

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
// Instagram draws its own controls over the top and bottom of a story (profile row, reply bar): content stays out of them.
const STORY_SAFE_TOP = 250;
const STORY_SAFE_BOTTOM = 250;
const STORY_HEADER_HEIGHT = 150;
/** Air between the header's rule and the first crest, which sat right against it. */
const STORY_TOP_GAP = 24;
/** The thin rule between two matches, with air above and below it (the crests and logos sat against it). */
const STORY_DIVIDER_MARGIN = 10;
export const STORY_DIVIDER_SPACE = 2 + 2 * STORY_DIVIDER_MARGIN;
/** The smallest crest in a story: a little under the posts' (110), which is what buys the air above while still fitting three matches. */
export const STORY_MIN_CREST = 96;
const STORY_FOOTER_HEIGHT = 100;
/** Vertical room the match blocks of one story share. */
export const STORY_BLOCKS_HEIGHT = STORY_HEIGHT - STORY_SAFE_TOP - STORY_SAFE_BOTTOM - STORY_HEADER_HEIGHT - STORY_FOOTER_HEIGHT - STORY_TOP_GAP;
/** At most this many matches in one story, even when they would fit more. */
export const MAX_MATCHES_PER_STORY = 3;

export interface StoryInput {
  competitionName: string;
  /** The competition's logo, shown beside its name; null when there is none. */
  competitionBadge: string | null;
  dateLabel: string;
  matches: SlideMatch[];
  wordmarkDataUri: string;
}

/** One story: one competition's matches (up to three), its name and logo on top. */
export function buildStoryTree(input: StoryInput): SatoriElement {
  const dividers = Math.max(0, input.matches.length - 1) * STORY_DIVIDER_SPACE;
  const blockHeight = Math.floor((STORY_BLOCKS_HEIGHT - dividers) / Math.max(input.matches.length, 1));

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: "#ffffff",
        padding: `${STORY_SAFE_TOP}px ${SIDE_PADDING}px ${STORY_SAFE_BOTTOM}px`,
      },
    },
    [
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: STORY_HEADER_HEIGHT,
            borderBottom: `4px solid ${GRAY_200}`,
            gap: 8,
          },
        },
        [
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 18 } }, [
            ...(input.competitionBadge ? [h("img", { src: input.competitionBadge, style: { width: 64, height: 64, objectFit: "contain" } })] : []),
            h(
              "div",
              { style: { display: "flex", color: PURPLE, fontSize: input.competitionName.length > 24 ? 40 : 52, fontWeight: 700, textAlign: "center" } },
              input.competitionName.toUpperCase(),
            ),
          ]),
          h("div", { style: { display: "flex", color: GRAY_600, fontSize: 36, fontWeight: 700 } }, input.dateLabel.toUpperCase()),
        ],
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: STORY_BLOCKS_HEIGHT, marginTop: STORY_TOP_GAP } },
        input.matches.flatMap((match, index) =>
          index === 0
            ? [matchBlock({ ...match, competitionLabel: null }, blockHeight, STORY_MIN_CREST)]
            : [
                h("div", { style: { display: "flex", width: CONTENT_WIDTH * 0.55, height: 2, backgroundColor: GRAY_200, margin: `${STORY_DIVIDER_MARGIN}px 0` } }),
                matchBlock({ ...match, competitionLabel: null }, blockHeight, STORY_MIN_CREST),
              ],
        ),
      ),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: STORY_FOOTER_HEIGHT } }, [
        h("img", { src: input.wordmarkDataUri, style: { height: 78 } }),
      ]),
    ],
  );
}
