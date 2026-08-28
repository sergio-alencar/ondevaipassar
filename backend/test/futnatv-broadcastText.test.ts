import { describe, expect, it } from "vitest";
import { parseBroadcastChannels } from "../src/sources/futnatv/broadcastText.js";

describe("parseBroadcastChannels", () => {
  it("parses a single bare channel name", () => {
    expect(parseBroadcastChannels("TV Brasil", null)).toEqual([{ channelNameRaw: "TV Brasil", watchUrl: null }]);
  });

  it("parses a 'YouTube (channel)' wrapper, applying the watch url to the real channel name inside it", () => {
    expect(parseBroadcastChannels("YouTube (CazéTV)", "https://youtube.com/watch?v=x")).toEqual([
      { channelNameRaw: "CazéTV", watchUrl: "https://youtube.com/watch?v=x" },
    ]);
  });

  it("splits a compound channel list inside a YouTube(...) wrapper, applying the same watch url to each", () => {
    expect(parseBroadcastChannels("YouTube (GE TV e UOL Esporte)", "https://youtube.com/watch?v=x")).toEqual([
      { channelNameRaw: "GE TV", watchUrl: "https://youtube.com/watch?v=x" },
      { channelNameRaw: "UOL Esporte", watchUrl: "https://youtube.com/watch?v=x" },
    ]);
  });

  it("drops a Globo state-list qualifier, keeping just the channel name (real example)", () => {
    const result = parseBroadcastChannels("Globo (RS, SP, PE e PR) e SporTV 2", null);
    expect(result).toEqual([
      { channelNameRaw: "Globo", watchUrl: null },
      { channelNameRaw: "SporTV 2", watchUrl: null },
    ]);
  });

  it("parses a long real example mixing all three shapes (Globo state list, bare channels, and a YouTube wrapper)", () => {
    const result = parseBroadcastChannels(
      "Globo (RJ, AC, AL, AP, AM, BA, CE, ES, GO, MA, MG, MS, MT, PA, PB, PI, RN, RO, RR, SC, SE, TO, DF), SporTV, TV Brasil, YouTube (GE TV e UOL Esporte)",
      "https://youtube.com/watch?v=x",
    );
    expect(result).toEqual([
      { channelNameRaw: "Globo", watchUrl: null },
      { channelNameRaw: "SporTV", watchUrl: null },
      { channelNameRaw: "TV Brasil", watchUrl: null },
      { channelNameRaw: "GE TV", watchUrl: "https://youtube.com/watch?v=x" },
      { channelNameRaw: "UOL Esporte", watchUrl: "https://youtube.com/watch?v=x" },
    ]);
  });

  it("handles the same channel mentioned both bare and inside a YouTube(...) wrapper (real example)", () => {
    const result = parseBroadcastChannels("NSports, YouTube (NSports) e Disney+", "https://youtube.com/watch?v=x");
    expect(result).toEqual([
      { channelNameRaw: "NSports", watchUrl: null },
      { channelNameRaw: "NSports", watchUrl: "https://youtube.com/watch?v=x" },
      { channelNameRaw: "Disney+", watchUrl: null },
    ]);
  });

  it("returns an empty list for an empty string", () => {
    expect(parseBroadcastChannels("", null)).toEqual([]);
  });
});
