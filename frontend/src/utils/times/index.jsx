import { normalizarNomeParaImagem } from "../nomes/normalizacao";
import escudo from "/src/assets/images/icones/escudo-cinza.svg";

export const MAPEAMENTO_ARQUIVOS = {
  atletico_mineiro: "atletico_mineiro",
  "atletico-mineiro": "atletico_mineiro",
  atleticomg: "atletico_mineiro",
  "atlético-mg": "atletico_mineiro",
  atléticomg: "atletico_mineiro",
  atlético_mg: "atletico_mineiro",
  atletico_mg: "atletico_mineiro",
  "atletico mg": "atletico_mineiro",
  "atlético mg": "atletico_mineiro",
  sao_paulo: "sao_paulo",
  "sao-paulo": "sao_paulo",
  saopaulo: "sao_paulo",
  "são paulo": "sao_paulo",
  vasco: "vasco_da_gama",
  "vasco da gama": "vasco_da_gama",
  sport: "sport_recife",
  "sport recife": "sport_recife",
};

export const normalizarNomeArquivo = (nomeTime) => {
  const nomePadronizado = nomeTime
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\s+|[-–])/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/g, "");

  return MAPEAMENTO_ARQUIVOS[nomePadronizado] || nomePadronizado;
};

export const normalizarNomeTime = (nomeTime) => {
  return nomeTime
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace("atlético_mg", "atletico_mineiro")
    .replace("são_paulo", "sao_paulo")
    .replace("paramount+", "paramountplus")
    .replace("disney+", "disneyplus")
    .replace("premiere_canal", "premiere")
    .replace("premiere_", "premiere")
    .replace("tv_globo", "globo")
    .replace("tv globo", "globo");
};

export const obterImagemTime = (nomeTime) => {
  try {
    const chave = normalizarNomeParaImagem(nomeTime);
    const baseUrl =
      "https://raw.githubusercontent.com/sergio-alencar/ondevaipassar-teste/main/public/images/times/";
    const urlFinal = `${baseUrl}${chave}.svg`;

    console.log(`Tentando carregar imagem para: ${nomeTime} -> ${chave}`);

    return urlFinal;
  } catch (error) {
    console.error(`Erro ao processar nome do time ${nomeTime}:`, error);
    return escudo;
  }
};
