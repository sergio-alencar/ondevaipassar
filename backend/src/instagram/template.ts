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

// Same palette the site itself uses: purple-900 header band (Header.tsx's
// default, unselected-team color), gray-800 body text, gray-100 panel bg.
const PURPLE_900 = "#581c87";
const GRAY_800 = "#1f2937";
const GRAY_600 = "#4b5563";
const GRAY_100 = "#f3f4f6";

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

function teamColumn(name: string, crestDataUri: string): SatoriElement {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", alignItems: "center", width: 340, gap: 20 } },
    [
      h("img", { src: crestDataUri, style: { width: 260, height: 260, objectFit: "contain" } }),
      h(
        "p",
        {
          style: {
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            color: GRAY_800,
            textTransform: "uppercase",
            textAlign: "center",
          },
        },
        name,
      ),
    ],
  );
}

function channelTile(channel: TemplateChannel): SatoriElement {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 220,
        height: 130,
        gap: 8,
      },
    },
    channel.logoDataUri
      ? h("img", { src: channel.logoDataUri, style: { maxWidth: 190, maxHeight: 90, objectFit: "contain" } })
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

export function buildMatchImageTree(input: TemplateInput): SatoriElement {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1350,
        backgroundColor: "white",
        fontFamily: "Roboto",
      },
    },
    [
      // Top band — mirrors the site header: purple-900 background, wordmark,
      // competition name in white uppercase.
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            backgroundColor: PURPLE_900,
            padding: "56px 60px",
            gap: 24,
          },
        },
        [
          h("img", { src: input.wordmarkDataUri, style: { width: 260, height: 60, objectFit: "contain" } }),
          h(
            "p",
            {
              style: {
                display: "flex",
                fontSize: 38,
                fontWeight: 700,
                color: "white",
                textTransform: "uppercase",
                textAlign: "center",
              },
            },
            input.competitionName,
          ),
        ],
      ),
      // Middle — the two teams facing off, plus kickoff date/time.
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            padding: "40px 60px",
          },
        },
        [
          h(
            "div",
            { style: { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 } },
            [
              teamColumn(input.homeTeamName, input.homeCrestDataUri),
              h("img", { src: input.versusIconDataUri, style: { width: 64, height: 64, objectFit: "contain" } }),
              teamColumn(input.awayTeamName, input.awayCrestDataUri),
            ],
          ),
          h(
            "p",
            { style: { display: "flex", fontSize: 34, fontWeight: 500, color: GRAY_600, textAlign: "center" } },
            input.kickoffLabel,
          ),
        ],
      ),
      // Bottom band — broadcast channels, gray-100 panel like a card footer.
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            backgroundColor: GRAY_100,
            padding: "44px 60px",
            gap: 20,
          },
        },
        [
          h(
            "p",
            {
              style: {
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                color: PURPLE_900,
                textTransform: "uppercase",
                letterSpacing: 2,
              },
            },
            "Transmissão",
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
              },
            },
            input.channels.map(channelTile),
          ),
        ],
      ),
    ],
  );
}
