// utils/canais/index.jsx

import { MAPEAMENTO_CANAIS } from "./dados";

export const separarCanais = (str) => {
  if (!str) return [];

  return str
    .replace(/\s+e\s+/gi, ",")
    .replace(/\s+&\s+/gi, ",")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
};

export const obterImagemCanal = (nomeCanal) => {
  if (!nomeCanal) return null;

  const nomeLimpado = nomeCanal
    .replace(/\(.*?\)/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const nomeChave = nomeLimpado.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const chaveFinal = MAPEAMENTO_CANAIS[nomeChave] || nomeChave;

  const baseUrl =
    "https://raw.githubusercontent.com/sergio-alencar/ondevaipassar-teste/main/public/images/canais/";

  return `${baseUrl}${chaveFinal}.svg`;
};
