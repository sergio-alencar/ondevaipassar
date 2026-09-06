import { abbreviateTeamName } from "./teamNameAbbreviation.js";
import type { SatoriElement, TemplateChannel, TemplateCrest } from "./template.js";

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
}

/** Crest box: height fixed, width narrowed for a shield-shaped crest so its own ink — not its invisible square canvas — sits flush against the layout. Same rule as template.ts's teamCrest, at this layout's smaller size. */
function crest(art: TemplateCrest, size: number): SatoriElement {
  return h("img", {
    src: art.dataUri,
    style: { width: Math.round(size * Math.min(art.aspectRatio, 1)), height: size, objectFit: "contain" },
  });
}

/** One channel: its logo (or its name, when we don't ship art), carrying an asterisk when its coverage varies by region. */
function channelTile(channel: SlideChannel, tileSize: number): SatoriElement {
  const art = channel.logoDataUri
    ? h("img", {
        src: channel.logoDataUri,
        style: { width: tileSize, height: tileSize, objectFit: "contain", borderRadius: 12 },
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
            borderRadius: 12,
            backgroundColor: GRAY_200,
            color: GRAY_900,
            fontSize: 30,
            fontWeight: 700,
          },
        },
        channel.displayName,
      );

  if (!channel.regionalMarker) return art;
  // The asterisk rides alongside the logo rather than on top of it, so it
  // never covers the art it's marking.
  return h("div", { style: { display: "flex", alignItems: "flex-start", gap: 2 } }, [
    art,
    h("div", { style: { display: "flex", color: GRAY_900, fontSize: 40, fontWeight: 700 } }, channel.regionalMarker),
  ]);
}

function channelStrip(channels: SlideChannel[], tileSize: number): SatoriElement {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" } },
    channels.map((channel) => channelTile(channel, tileSize)),
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
const BLOCK_FIXED_HEIGHT = 60 + 132 + 34;

function matchBlock(match: SlideMatch, blockHeight: number): SatoriElement {
  const labelHeight = match.competitionLabel ? 44 : 0;
  const crestBudget = blockHeight - BLOCK_FIXED_HEIGHT - labelHeight;
  const crestSize = Math.min(MAX_CREST, Math.max(MIN_CREST, crestBudget));

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
            h(
              "div",
              { style: { display: "flex", color: GRAY_600, fontSize: 28, fontWeight: 700, letterSpacing: 2 } },
              match.competitionLabel.toUpperCase(),
            ),
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
          `${abbreviateTeamName(match.homeTeamName)} X ${abbreviateTeamName(match.awayTeamName)}`.toUpperCase(),
        ),
      ]),
      // The channel art is the answer the whole project exists to give, so
      // it gets the largest tile the block can carry.
      channelStrip(match.channels, 132),
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
          // One line, now that the competition name is the short form
          // ("SÉRIE A", not "CAMPEONATO BRASILEIRO SÉRIE A").
          h("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 20 } }, [
            h(
              "div",
              { style: { display: "flex", color: PURPLE, fontSize: 50, fontWeight: 700 } },
              input.competitionName.toUpperCase(),
            ),
            h(
              "div",
              { style: { display: "flex", color: GRAY_600, fontSize: 38, fontWeight: 700 } },
              input.dateLabel.toUpperCase(),
            ),
          ]),
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
            input.slideLabel ?? "ondevaipassar.com",
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
  // Up to 10 crests in two rows of 5, and a "+N" chip for the rest. A busy
  // Sunday is 10 Série A matches = 20 crests: shrinking them all to fit
  // would make every one illegible, and silently showing the first few
  // would misrepresent how much is on. Ten reads as a crowd and the chip
  // says how big the crowd actually is.
  const perRow = 5;
  const maxShown = perRow * 2;
  const crestSize = hasLogo ? 130 : 160;
  const shown = input.crests.slice(0, maxShown);
  const remaining = input.crests.length - shown.length;
  const rows: TemplateCrest[][] = [];
  for (let i = 0; i < shown.length; i += perRow) rows.push(shown.slice(i, i + perRow));

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
          ? [h("img", { src: input.competitionLogoDataUri as string, style: { height: 520, objectFit: "contain" } })]
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
        { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 30 } },
        rows.map((row, rowIndex) =>
          h(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 30 } },
            [
              ...row.map((art) => crest(art, crestSize)),
              // The chip rides at the end of the last row rather than on a
              // line of its own, so it reads as "and more of these".
              ...(remaining > 0 && rowIndex === rows.length - 1
                ? [
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: crestSize,
                          color: "#e9d5ff",
                          fontSize: 44,
                          fontWeight: 700,
                        },
                      },
                      `+${remaining}`,
                    ),
                  ]
                : []),
            ],
          ),
        ),
      ),
      h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 26 } }, [
        h(
          "div",
          { style: { display: "flex", color: "#ffffff", fontSize: 50, fontWeight: 700 } },
          `${input.matchCount} ${input.matchCount === 1 ? "JOGO" : "JOGOS"} • ARRASTE`,
        ),
        h("img", { src: input.wordmarkDataUri, style: { height: 78 } }),
      ]),
    ],
  );
}
