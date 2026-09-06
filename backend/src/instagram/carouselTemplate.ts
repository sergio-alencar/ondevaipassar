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

/** Kept here rather than in renderCarousel so the layout maths and the chunking can never disagree about how many matches a slide holds. */
export const MATCHES_PER_SLIDE = 3;

const PURPLE = "#59168b";
const GRAY_900 = "#111827";
const GRAY_600 = "#4b5563";
const GRAY_200 = "#e5e7eb";

const SIDE_PADDING = 64;
const CONTENT_WIDTH = PORTRAIT_WIDTH - 2 * SIDE_PADDING;

export interface SlideMatch {
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: TemplateCrest;
  awayCrest: TemplateCrest;
  timeLabel: string;
  channels: TemplateChannel[];
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

function channelStrip(channels: TemplateChannel[], tileSize: number): SatoriElement {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" } },
    channels.map((channel) =>
      channel.logoDataUri
        ? h("img", {
            src: channel.logoDataUri,
            style: { width: tileSize, height: tileSize, objectFit: "contain", borderRadius: 10 },
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
                padding: "0 16px",
                borderRadius: 10,
                backgroundColor: GRAY_200,
                color: GRAY_900,
                fontSize: 26,
                fontWeight: 700,
              },
            },
            channel.displayName,
          ),
    ),
  );
}

/**
 * One match inside a slide. Team names are abbreviated by the same helper
 * the square template uses, since two full names plus an "x" on one line
 * is what overflows first at this width.
 */
const MIN_CREST = 150;
// Capped so a slide carrying a single match doesn't render a crest three
// times the size of the same crest on a 3-match slide — the block would
// otherwise just grow into whatever vertical space it was given.
const MAX_CREST = 245;

function matchBlock(match: SlideMatch, blockHeight: number): SatoriElement {
  const crestSize = Math.min(MAX_CREST, Math.max(MIN_CREST, Math.round(blockHeight * 0.42)));
  const nameFontSize = 46;

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
        gap: 12,
      },
    },
    [
      ...(match.competitionLabel
        ? [
            h(
              "div",
              { style: { display: "flex", color: GRAY_600, fontSize: 26, fontWeight: 700, letterSpacing: 2 } },
              match.competitionLabel.toUpperCase(),
            ),
          ]
        : []),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 28 } }, [
        crest(match.homeCrest, crestSize),
        h("div", { style: { display: "flex", color: GRAY_600, fontSize: 40, fontWeight: 700 } }, "x"),
        crest(match.awayCrest, crestSize),
      ]),
      h(
        "div",
        { style: { display: "flex", color: GRAY_900, fontSize: nameFontSize, fontWeight: 700, textAlign: "center" } },
        `${abbreviateTeamName(match.homeTeamName)} x ${abbreviateTeamName(match.awayTeamName)}`,
      ),
      h("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, [
        h("div", { style: { display: "flex", color: PURPLE, fontSize: 42, fontWeight: 700 } }, match.timeLabel),
        channelStrip(match.channels, 88),
      ]),
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
}

/** A slide carrying 2-3 matches. */
export function buildSlideTree(input: SlideInput): SatoriElement {
  const headerHeight = 170;
  const footerHeight = 96;
  const available = PORTRAIT_HEIGHT - headerHeight - footerHeight;
  // Each block keeps the same height it would have on a full 3-match
  // slide, and the group is centred in what's left — otherwise a slide
  // carrying one match stretched that single block over the whole canvas,
  // leaving it marooned in the middle of a lot of white.
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
            justifyContent: "center",
            height: headerHeight,
            borderBottom: `4px solid ${GRAY_200}`,
          },
        },
        [
          h("div", { style: { display: "flex", color: PURPLE, fontSize: 48, fontWeight: 700 } }, input.competitionName.toUpperCase()),
          h("div", { style: { display: "flex", color: GRAY_600, fontSize: 34 } }, input.dateLabel),
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
      h(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", height: footerHeight } },
        [
          h("img", { src: input.wordmarkDataUri, style: { height: 52 } }),
          h(
            "div",
            { style: { display: "flex", color: GRAY_600, fontSize: 26 } },
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
  const perRow = 5;
  const rowCount = hasLogo ? 1 : 2;
  const crestSize = hasLogo ? 118 : 158;
  const shown = input.crests.slice(0, perRow * rowCount);
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
        gap: 52,
        width: PORTRAIT_WIDTH,
        height: PORTRAIT_HEIGHT,
        backgroundColor: PURPLE,
        padding: `64px ${SIDE_PADDING}px`,
      },
    },
    [
      h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 20 } }, [
        h(
          "div",
          { style: { display: "flex", color: "#e9d5ff", fontSize: 40, fontWeight: 700, letterSpacing: 4 } },
          "ONDE ASSISTIR",
        ),
        // No card behind the logo: Sérgio supplied light-text variants
        // built for a dark background (the "-2" files in
        // frontend/public/images/campeonatos), so the marks sit directly on
        // the brand purple. The earlier white card existed only because the
        // first set was drawn for light backgrounds and vanished here.
        ...(hasLogo
          ? [h("img", { src: input.competitionLogoDataUri as string, style: { height: 330, objectFit: "contain" } })]
          : []),
        h(
          "div",
          {
            style: {
              display: "flex",
              color: "#ffffff",
              // Uppercase, per Sérgio - and sized down when the name is long
              // enough that three big words would wrap into a wall.
              fontSize: input.competitionName.length > 22 ? 66 : 86,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.05,
              letterSpacing: 1,
            },
          },
          input.competitionName.toUpperCase(),
        ),
        h("div", { style: { display: "flex", color: "#e9d5ff", fontSize: 44 } }, input.dateLabel.toUpperCase()),
      ]),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 26 } },
        rows.map((row) =>
          h(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 26 } },
            row.map((art) => crest(art, crestSize)),
          ),
        ),
      ),
      h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 22 } }, [
        h(
          "div",
          { style: { display: "flex", color: "#ffffff", fontSize: 42, fontWeight: 700 } },
          `${input.matchCount} ${input.matchCount === 1 ? "JOGO" : "JOGOS"} • ARRASTE`,
        ),
        h("img", { src: input.wordmarkDataUri, style: { height: 66 } }),
      ]),
    ],
  );
}
