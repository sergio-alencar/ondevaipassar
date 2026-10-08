import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findChannelById, listChannels } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";

const ART_DIR = fileURLToPath(new URL("../../frontend/public/images/canais/", import.meta.url));

function artHash(channelId: string): string | null {
  for (const ext of ["png", "jpg", "jpeg"]) {
    const path = `${ART_DIR}${channelId}.${ext}`;
    if (existsSync(path)) return createHash("sha1").update(readFileSync(path)).digest("hex");
  }
  return null;
}

describe("channels whose logo spells their name", () => {
  // Canal UOL and UOL Esporte are two channels with ONE image ("uol"). If the
  // caption were hidden on both, a viewer on either page would have nothing to
  // tell them apart. Found by comparing the art files, so a future channel
  // that reuses another's image is caught the same way.
  it("never hides the name of channels that share an image", () => {
    const byHash = new Map<string, string[]>();
    for (const channel of listChannels()) {
      const hash = artHash(channel.id);
      if (hash) byHash.set(hash, [...(byHash.get(hash) ?? []), channel.id]);
    }
    const shared = [...byHash.values()].filter((ids) => ids.length > 1);
    expect(shared.flat()).toContain("uol"); // the case this guards is real today
    for (const ids of shared) {
      for (const id of ids) expect(findChannelById(id)?.logoShowsName, `${id} shares its logo with ${ids.join(", ")}`).toBeUndefined();
    }
  });

  // Logos that are only a symbol or an abbreviation: the name is the only
  // place the viewer learns what the channel is called.
  it("keeps the name for logos that don't spell it", () => {
    for (const id of ["meutimao", "onefootball", "romariotv", "nossofutebol", "jovempanesportes"]) {
      expect(findChannelById(id)?.logoShowsName, id).toBeUndefined();
    }
  });

  it("does flag the logos that plainly do", () => {
    for (const id of ["globo", "cazetv", "espn", "premiere", "tnt", "tntsports"]) {
      expect(findChannelById(id)?.logoShowsName, id).toBe(true);
    }
  });
});
