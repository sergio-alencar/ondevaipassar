// puxarCanais.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const arquivosTimes = [
  "atletico_mineiro_proximos_jogos.json",
  "bahia_proximos_jogos.json",
  "botafogo_proximos_jogos.json",
  "bragantino_proximos_jogos.json",
  "ceara_proximos_jogos.json",
  "corinthians_proximos_jogos.json",
  "cruzeiro_proximos_jogos.json",
  "flamengo_proximos_jogos.json",
  "fluminense_proximos_jogos.json",
  "fortaleza_proximos_jogos.json",
  "gremio_proximos_jogos.json",
  "internacional_proximos_jogos.json",
  "juventude_proximos_jogos.json",
  "mirassol_proximos_jogos.json",
  "palmeiras_proximos_jogos.json",
  "santos_proximos_jogos.json",
  "sao_paulo_proximos_jogos.json",
  "sport_recife_proximos_jogos.json",
  "vasco_da_gama_proximos_jogos.json",
  "vitoria_proximos_jogos.json",
];

const sinonimosOriginais = {
  "rb bragantino": "bragantino",
  "red bull bragantino": "bragantino",
  "atletico mineiro": "atletico-mg",
  "atlético mineiro": "atletico-mg",
  "atlético-mg": "atletico-mg",
  "RB Bragantino": "bragantino",
  "Atlético Mineiro": "atletico-MG",
  "Atletico-MG": "atletico-MG",
  Vasco: "vasco da gama",
  vasco: "vasco da gama",
  "Sport Recife": "Sport",
  "sport recife": "sport",
  sport_recife: "sport",
  "sport-recife": "sport",
  "ec bahia": "bahia",
  // Internacionais
  "nacional de football": "nacional uru",
  "nacional (uru)": "nacional uru",
  nacional: "nacional uru",
  "estudiantes lp": "estudiantes",
  "Estudiantes LP": "estudiantes",
  "central cordoba sde": "central cordoba",
  "central cordoba (arg)": "central cordoba",
  "central córdoba": "central cordoba",
  "ldu quito": "ldu",
  "ldu ecu": "ldu",
  "ldu equ": "ldu",
  "mushuc runa ecu": "mushuc runa",
  "atletico nacional medellin": "atletico nacional",
  "atlético nacional medellin": "atletico nacional",
  "atletico nacional (col)": "atletico nacional",
  rbr: "bragantino",
  "ec juventude": "juventude",
  racing: "racing club de montevideo",
  "racing (uru)": "racing club de montevideo",
  "racing uru": "racing club de montevideo",
  "racing de montevideo": "racing club de montevideo",
  "gv san josé": "gualberto villarroel",
  "gv san jose": "gualberto villarroel",
  "san jose de oruro": "gualberto villarroel",
  "libertad (par)": "libertad asuncion",
  "libertad par": "libertad asuncion",
  "libertad asunción": "libertad asuncion",
  libertad: "libertad asuncion",
};

const sinonimosTimes = {};
for (const chave in sinonimosOriginais) {
  sinonimosTimes[normalizarTexto(chave)] = sinonimosOriginais[chave];
}

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function nomePadronizado(time) {
  const normalizado = normalizarTexto(time);
  const sinonimo = sinonimosTimes[normalizado];
  return sinonimo ? sinonimo : normalizado;
}

function padronizarCanal(canal) {
  const normalizado = canal
    .normalize("NFD")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "") // remove espaços invisíveis
    .replace(/[^\S\r\n]+/g, " ") // colapsa múltiplos espaços
    .trim()
    .toLowerCase();

  const padroes = {
    sportv: "SporTV",
    globoplay: "Globoplay",
    premiere: "Premiere",
    ge: "ge",
    star: "Star+",
    "star+": "Star+",
    "star plus": "Star+",
    "star +": "Star+",
    espn: "ESPN",
    "espn 4": "ESPN",
    "espn 2": "ESPN",
    "espn 3": "ESPN",
    "tnt sports": "TNT Sports",
    tnt: "TNT Sports",
    "tnt sports stadium": "TNT Sports Stadium",
    amazon: "Prime Video",
    "amazon prime video": "Prime Video",
    "prime video": "Prime Video",
    youtube: "YouTube",
    "cazé tv": "CazéTV",
    "caze tv": "CazéTV",
    cazetv: "CazéTV",
  };

  return padroes[normalizado] || canal.trim();
}

function extrairTimesOndeAssistir(jogo) {
  if (!jogo.name) return [null, null];

  const regex = /(?:.*?:\s*)?(.*?)\s+x\s+(.*?)\s+-/i;
  const match = jogo.name.match(regex);

  if (!match || match.length < 3) return [null, null];

  const [_, timeA, timeB] = match;

  console.log("🔍 Extraindo times de:", jogo.name);
  console.log("➡ Encontrado:", match[1], "vs", match[2]);
  console.log(
    "➡ Padronizado:",
    nomePadronizado(match[1]),
    "vs",
    nomePadronizado(match[2])
  );

  return [nomePadronizado(timeA), nomePadronizado(timeB)];
}

const removerParenteses = (str) => str.replace(/\s*\([^)]*\)/g, "").trim();

function buscarCanaisOlympics(
  listaOlympics,
  fonte,
  jogo,
  timeCasa,
  timeVisitante
) {
  const partidaOlympics = listaOlympics.find((j) => {
    const nome = j.name || "";

    const regex = /^[0-9]{1,2}h[0-9]{2}(?:[:-])?\s+(.*?)\s+x\s+(.*?)\s+-/i;
    const match = nome.match(regex);

    if (!match || match.length < 3) return false;

    const timeA = nomePadronizado(removerParenteses(match[1]));
    const timeB = nomePadronizado(removerParenteses(match[2]));

    const padronizadoA = nomePadronizado(timeCasa);
    const padronizadoB = nomePadronizado(timeVisitante);

    const conjuntoArquivo = new Set([padronizadoA, padronizadoB]);
    const conjuntoOlympics = new Set([timeA, timeB]);

    return (
      conjuntoArquivo.size === conjuntoOlympics.size &&
      [...conjuntoArquivo].every((t) => conjuntoOlympics.has(t))
    );
  });
  if (!partidaOlympics) {
    console.log(
      `🚫 Não achou: ${timeCasa} x ${timeVisitante} → Normalizado: ${nomePadronizado(
        timeCasa
      )} x ${nomePadronizado(timeVisitante)}`
    );
  }

  if (partidaOlympics) {
    const match = partidaOlympics.name.match(/-\s+(.*?)$/);
    let canais = [];

    if (match.length > 1) {
      const trechoFinal = match[match.length - 1];

      canais = trechoFinal
        .split(/\s*(?:,| e )\s*/i)
        .map((canal) => {
          const partes = canal.split(" - ");
          return padronizarCanal(partes.length > 1 ? partes[1] : canal);
        })
        .filter(Boolean);
    }
    return canais;
  }

  return [];
}

function processarArquivo(
  pathArquivo,
  jogosTrivela,
  jogosOndeAssistir,
  jogosOlympics,
  jogosOlympicsLib,
  jogosOlympicsSul
) {
  const rawData = fs.readFileSync(pathArquivo, "utf-8");
  const dados = JSON.parse(rawData);

  dados.proximosJogos.forEach((jogo) => {
    const timeCasa = nomePadronizado(jogo.timeCasa);
    const timeVisitante = nomePadronizado(jogo.timeVisitante);
    console.log("🔍 Verificando partida:", timeCasa, "x", timeVisitante);

    let canais = [];

    const partidaTrivela = jogosTrivela.find((jogoTrivela) => {
      const partes = jogoTrivela.jogo.split(/\s*x\s*/i);
      if (partes.length !== 2) return false;
      const [timeA, timeB] = partes.map(nomePadronizado);
      return (
        (timeCasa === timeA && timeVisitante === timeB) ||
        (timeCasa === timeB && timeVisitante === timeA)
      );
    });

    if (partidaTrivela?.canais) {
      const match = partidaTrivela.canais.match(/-\s*(.+)$/); // extrai somente o trecho após o "-"

      if (match && match[1]) {
        const novos = match[1]
          .split(/\s*(?:,| e )\s*/i)
          .map(padronizarCanal)
          .filter(Boolean);
        canais.push(...novos);
        console.log(
          `📡 Trivela: ${jogo.timeCasa} x ${jogo.timeVisitante} → ${novos.join(
            ", "
          )}`
        );
      }
    }

    const partidaAssistir = jogosOndeAssistir.find((jogoAssistir) => {
      const [timeA, timeB] = extrairTimesOndeAssistir(jogoAssistir);
      if (!timeA || !timeB) return false;
      return (
        (timeCasa === timeA && timeVisitante === timeB) ||
        (timeCasa === timeB && timeVisitante === timeA)
      );
    });

    if (partidaAssistir?.canais) {
      const nomesDosCanais = partidaAssistir.canais
        .map((obj) => padronizarCanal(obj.canal))
        .filter(Boolean);
      canais.push(...nomesDosCanais);
      console.log(
        `📡 OndeAssistir: ${jogo.timeCasa} x ${
          jogo.timeVisitante
        } → ${nomesDosCanais.join(", ")}`
      );
    }

    canais.push(
      ...buscarCanaisOlympics(
        jogosOlympics,
        "Olympics",
        jogo,
        timeCasa,
        timeVisitante,
        pathArquivo
      )
    );
    canais.push(
      ...buscarCanaisOlympics(
        jogosOlympicsLib,
        "OlympicsLib",
        jogo,
        timeCasa,
        timeVisitante,
        pathArquivo
      )
    );
    canais.push(
      ...buscarCanaisOlympics(
        jogosOlympicsSul,
        "OlympicsSul",
        jogo,
        timeCasa,
        timeVisitante,
        pathArquivo
      )
    );

    if (canais.length > 0) {
      // Padroniza e ordena os canais, removendo duplicatas
      const canaisFormatados = [...new Set(canais)]
        .map((canal) => canal.trim())
        .filter((canal) => canal.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .join(" e ");

      const canaisAntes = jogo.canais;
      jogo.canais = canaisFormatados;

      if (canaisAntes && canaisAntes !== jogo.canais) {
        console.log(`🔄 Substituído: ${canaisAntes} → ${jogo.canais}`);
      } else {
        console.log(
          `📁 Salvando canais: ${jogo.timeCasa} x ${jogo.timeVisitante} → ${jogo.canais}`
        );
      }
    }
  });

  fs.writeFileSync(pathArquivo, JSON.stringify(dados, null, 2), "utf-8");
}

function adicionarCanaisAosJogos() {
  const trivelaPath = path.join(__dirname, "parse_trivela.json");
  const ondeAssistirPath = path.join(
    __dirname,
    "onde_assistir_brasileiro.json"
  );
  const olympicsPath = path.join(__dirname, "parse_olympics.json");
  const olympicsLibPath = path.join(
    __dirname,
    "parse_olympics_libertadores.json"
  );
  const olympicsSulamericanaPath = path.join(
    __dirname,
    "parse_olympics_sulamericana.json"
  );

  const jogosTrivela = JSON.parse(fs.readFileSync(trivelaPath, "utf-8")).jogos;
  const jogosOndeAssistir = JSON.parse(
    fs.readFileSync(ondeAssistirPath, "utf-8")
  ).jogo;
  const jogosOlympics = JSON.parse(
    fs.readFileSync(olympicsPath, "utf-8")
  ).jogos;
  const jogosOlympicsLib = JSON.parse(
    fs.readFileSync(olympicsLibPath, "utf-8")
  ).jogos;
  const jogosOlympicsSul = JSON.parse(
    fs.readFileSync(olympicsSulamericanaPath, "utf-8")
  ).jogos;

  arquivosTimes.forEach((arquivo) => {
    const caminho = path.join(__dirname, arquivo);
    processarArquivo(
      caminho,
      jogosTrivela,
      jogosOndeAssistir,
      jogosOlympics,
      jogosOlympicsLib,
      jogosOlympicsSul
    );
  });

  console.log("🏁 Todos os arquivos foram atualizados com os canais.");
}

adicionarCanaisAosJogos();
