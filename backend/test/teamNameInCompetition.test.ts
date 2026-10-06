import { teamNameInCompetition } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";

describe("teamNameInCompetition", () => {
  // Seven "(Fem.)" on one team's page, each repeating what the competition's
  // name already says.
  it("drops the women's suffix inside a women's competition", () => {
    expect(teamNameInCompetition("Cruzeiro (Fem.)", "Copa Libertadores Feminina")).toBe("Cruzeiro");
    expect(teamNameInCompetition("Corinthians (Fem.)", "Brasileirão Feminino")).toBe("Corinthians");
    expect(teamNameInCompetition("Palmeiras (Fem.)", "Supercopa do Brasil Feminina")).toBe("Palmeiras");
  });

  // An unregistered competition is shown by its slug, which still carries the
  // marker.
  it("recognises a women's competition even when it is only a stopgap slug", () => {
    expect(teamNameInCompetition("Santos (Fem.)", "campeonato-paulista-feminino")).toBe("Santos");
  });

  // The case it is keyed on the competition for: with nothing else saying
  // "women's", the suffix is the only thing separating the two sides of a club.
  it("keeps the suffix where the competition doesn't say it's women's", () => {
    expect(teamNameInCompetition("Cruzeiro (Fem.)", "Campeonato Brasileiro Série A")).toBe("Cruzeiro (Fem.)");
    expect(teamNameInCompetition("Cruzeiro (Fem.)", "Amistosos")).toBe("Cruzeiro (Fem.)");
  });

  it("leaves a name without the suffix alone, in any competition", () => {
    expect(teamNameInCompetition("Colombia 2", "Copa Libertadores Feminina")).toBe("Colombia 2");
    expect(teamNameInCompetition("Flamengo", "Campeonato Brasileiro Série A")).toBe("Flamengo");
  });
});
