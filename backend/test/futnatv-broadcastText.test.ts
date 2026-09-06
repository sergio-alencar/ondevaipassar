import { describe, expect, it } from "vitest";
import { parseBroadcastChannels } from "../src/sources/futnatv/broadcastText.js";

const ALL_UF_CODES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
  "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
  "SE", "SP", "TO",
];

describe("parseBroadcastChannels", () => {
  it("parses a single bare channel name", () => {
    expect(parseBroadcastChannels("TV Brasil", null)).toEqual([{ channelNameRaw: "TV Brasil", watchUrl: null, regionalDetail: null }]);
  });

  it("parses a 'YouTube (channel)' wrapper, applying the watch url to the real channel name inside it", () => {
    expect(parseBroadcastChannels("YouTube (CazéTV)", "https://youtube.com/watch?v=x")).toEqual([
      { channelNameRaw: "CazéTV", watchUrl: "https://youtube.com/watch?v=x", regionalDetail: null },
    ]);
  });

  it("splits a compound channel list inside a YouTube(...) wrapper, applying the same watch url to each", () => {
    expect(parseBroadcastChannels("YouTube (GE TV e UOL Esporte)", "https://youtube.com/watch?v=x")).toEqual([
      { channelNameRaw: "GE TV", watchUrl: "https://youtube.com/watch?v=x", regionalDetail: null },
      { channelNameRaw: "UOL Esporte", watchUrl: "https://youtube.com/watch?v=x", regionalDetail: null },
    ]);
  });

  it("normalizes a Globo state-list qualifier into an alphabetical inclusion list, keeping the channel name plain (real example)", () => {
    const result = parseBroadcastChannels("Globo (RS, SP, PE e PR) e SporTV 2", null);
    expect(result).toEqual([
      { channelNameRaw: "Globo", watchUrl: null, regionalDetail: "PE, PR, RS e SP" },
      { channelNameRaw: "SporTV 2", watchUrl: null, regionalDetail: null },
    ]);
  });

  it("resolves Globo's own exclusion wording against the 27-UF reference, then words it whichever way is shorter (real example: 'menos X, Y e Z')", () => {
    const result = parseBroadcastChannels("Globo (menos SP, CE, MS e PR), Premiere e YouTube (GE TV)", "https://youtube.com/watch?v=x");
    expect(result[0]).toEqual({
      channelNameRaw: "Globo",
      watchUrl: null,
      regionalDetail:
        "todo o Brasil, menos CE, MS, PR e SP",
    });
  });

  it("parses a long real example mixing all three shapes (Globo state list, bare channels, and a YouTube wrapper)", () => {
    const result = parseBroadcastChannels(
      "Globo (RJ, AC, AL, AP, AM, BA, CE, ES, GO, MA, MG, MS, MT, PA, PB, PI, RN, RO, RR, SC, SE, TO, DF), SporTV, TV Brasil, YouTube (GE TV e UOL Esporte)",
      "https://youtube.com/watch?v=x",
    );
    expect(result).toEqual([
      {
        channelNameRaw: "Globo",
        watchUrl: null,
        regionalDetail:
          "todo o Brasil, menos PE, PR, RS e SP",
      },
      { channelNameRaw: "SporTV", watchUrl: null, regionalDetail: null },
      { channelNameRaw: "TV Brasil", watchUrl: null, regionalDetail: null },
      { channelNameRaw: "GE TV", watchUrl: "https://youtube.com/watch?v=x", regionalDetail: null },
      { channelNameRaw: "UOL Esporte", watchUrl: "https://youtube.com/watch?v=x", regionalDetail: null },
    ]);
  });

  it("handles the same channel mentioned both bare and inside a YouTube(...) wrapper (real example)", () => {
    const result = parseBroadcastChannels("NSports, YouTube (NSports) e Disney+", "https://youtube.com/watch?v=x");
    expect(result).toEqual([
      { channelNameRaw: "NSports", watchUrl: null, regionalDetail: null },
      { channelNameRaw: "NSports", watchUrl: "https://youtube.com/watch?v=x", regionalDetail: null },
      { channelNameRaw: "Disney+", watchUrl: null, regionalDetail: null },
    ]);
  });

  it("returns an empty list for an empty string", () => {
    expect(parseBroadcastChannels("", null)).toEqual([]);
  });

  // Real bug: every token inside the parentheses was uppercased and sorted
  // in as if it were a state code, so prose came out looking like one.
  it("keeps non-UF prose verbatim instead of sorting it in as if it were a state code", () => {
    const [globo] = parseBroadcastChannels("Globo (PARTE DA REDE, RS e SP)", null);
    expect(globo.regionalDetail).toBe("RS e SP, PARTE DA REDE");
  });

  // The worse half of that bug: an exception clause became an entry in an
  // INCLUSION list, saying the match was on exactly where it wasn't.
  it("never turns an exception clause into a place the match is available", () => {
    const [globo] = parseBroadcastChannels("Globo (RJ, com exceção de Juiz de Fora)", null);
    expect(globo.regionalDetail).toBe("RJ, com exceção de Juiz de Fora");
    expect(globo.regionalDetail).not.toMatch(/^COM EXCEÇÃO/);
  });

  it("keeps prose in an exclusion list on the excluded side, never the included one", () => {
    const [globo] = parseBroadcastChannels("Globo (menos MG e a região de Juiz de Fora)", null);
    expect(globo.regionalDetail).toBe("todo o Brasil, menos MG e a região de Juiz de Fora");
  });

  it("returns the prose alone when there is no UF at all to normalize", () => {
    const [globo] = parseBroadcastChannels("Globo (parte da rede)", null);
    expect(globo.regionalDetail).toBe("parte da rede");
  });

  // Sérgio's call: 23 UF codes in a row is a wall nobody reads, and the
  // same fact fits in a glance stated as an exclusion.
  it("words a near-national broadcast as an exclusion instead of listing 23 states", () => {
    const [globo] = parseBroadcastChannels(
      "Globo (RJ, AC, AL, AP, AM, BA, CE, ES, GO, MA, MG, MS, MT, PA, PB, PI, RN, RO, RR, SC, SE, TO, DF)",
      null,
    );
    expect(globo.regionalDetail).toBe("todo o Brasil, menos PE, PR, RS e SP");
  });

  it("keeps the plain list when that's the shorter way to say it", () => {
    const [globo] = parseBroadcastChannels("Globo (RS, SP, PE e PR)", null);
    expect(globo.regionalDetail).toBe("PE, PR, RS e SP");
  });

  it("says 'todo o Brasil' rather than naming all 27 states", () => {
    const [globo] = parseBroadcastChannels(`Globo (${ALL_UF_CODES.join(", ")})`, null);
    expect(globo.regionalDetail).toBe("todo o Brasil");
  });
});
