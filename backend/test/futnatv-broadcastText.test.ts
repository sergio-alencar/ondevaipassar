import { describe, expect, it } from "vitest";
import { parseBroadcastChannels } from "../src/sources/futnatv/broadcastText.js";

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

  it("inverts Globo's own exclusion-list wording into an alphabetical inclusion list against the full 27-UF reference (real example: 'menos X, Y e Z')", () => {
    const result = parseBroadcastChannels("Globo (menos SP, CE, MS e PR), Premiere e YouTube (GE TV)", "https://youtube.com/watch?v=x");
    expect(result[0]).toEqual({
      channelNameRaw: "Globo",
      watchUrl: null,
      regionalDetail:
        "AC, AL, AM, AP, BA, DF, ES, GO, MA, MG, MT, PA, PB, PE, PI, RJ, RN, RO, RR, RS, SC, SE e TO",
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
          "AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PI, RJ, RN, RO, RR, SC, SE e TO",
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

  it("marks prose in an exclusion list as an exception, not as an included state", () => {
    const [globo] = parseBroadcastChannels("Globo (menos MG e a região de Juiz de Fora)", null);
    expect(globo.regionalDetail).toContain("exceto a região de Juiz de Fora");
    expect(globo.regionalDetail).not.toContain("MG");
  });

  it("returns the prose alone when there is no UF at all to normalize", () => {
    const [globo] = parseBroadcastChannels("Globo (parte da rede)", null);
    expect(globo.regionalDetail).toBe("parte da rede");
  });
});
