export function normalizeTeamName(teamName) {
  return teamName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function normalizeChannelName(channel) {
  const channelMap = {
    "disney+": "disney_plus",
    "prime video": "prime_video",
    "paramount+": "paramount_plus",
    "tnt sports": "tnt_sports",
    "canal goat": "canal_goat",
    "nosso futebol": "nosso_futebol",
  };
  return channelMap[channel.toLowerCase()] || channel.toLowerCase().replace(/\s+/g, "_");
}
