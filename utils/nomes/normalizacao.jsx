// utils/nomes/normalizacao.jsx

import { formatarNomeTime } from "./formatters";

export const normalizarNomeParaImagem = (nomeTime) => {
  const nomeFormatado = formatarNomeTime(nomeTime);

  return nomeFormatado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-\s]/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/g, "");
};
