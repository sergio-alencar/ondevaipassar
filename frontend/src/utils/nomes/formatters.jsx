export const formatarNomeTime = (nomeCompleto) => {
  const casosEspeciais = {
    "Atlético Mineiro": "Atlético-MG",
    "Red Bull Bragantino": "Bragantino",
    "Vasco da Gama": "Vasco",
    "Estudiantes de La Plata": "Estudiantes",
    "Racing Club de Montevideo": "Racing-URU",
    "Academia Puerto Cabello": "Puerto Cabello",
    "Universidad Catolica del Ecuador": "Univ. Cat. Ecuador",
    Ceara: "Ceará",
    Gremio: "Grêmio",
    "Sao Paulo": "São Paulo",
    Vitoria: "Vitória",
    "Central Cordoba SdE": "Central Córdoba",
    "LDU Quito": "LDU",
    "Gualberto Villarroel": "GV San José",
    "San Jose de Oruro": "GV San José",
    "Atletico Nacional Medellin": "Atl. Nacional",
    "Nacional De Football": "Nacional",
    "Atletico Mineiro": "Atlético-MG",
    "Cerro Porteno": "Cerro Porteño",
    "CA Talleres de Córdoba": "Talleres",
    "Libertad Asuncion": "Libertad",
    "Universidad de Chile": "Univ. Chile",
    "Estudiantes LP": "Estudiantes",
    Huracan: "Huracán",
    "Central Cordoba": "Central Córdoba",
    "Union Espanola": "Unión Española",
    Bolivar: "Bolívar",
    "FBC Melgar": "Melgar",
  };
  if (casosEspeciais[nomeCompleto]) {
    return casosEspeciais[nomeCompleto];
  }

  const regras = [
    {
      regex: /^(?:Club|Clube)\s+Atlético\s+(.+)/i,
      substituicao: "$1",
    },
    { regex: /^Club (.*)/i, substituicao: "$1" },
    { regex: /^EC (.*)/i, substituicao: "$1" },
    { regex: /^Atlético (.*)/i, substituicao: "Atl. $1" },
    { regex: /^Atletico (.*)/i, substituicao: "Atl. $1" },
    { regex: /^America (.*)/i, substituicao: "América $1" },
    { regex: /^Union (.*)/i, substituicao: "Unión $1" },
    { regex: /(.*) F\.?C\.?$/i, substituicao: "$1" },
    {
      regex: /^Universidad\s+Católica\s+(.+)/i,
      substituicao: "Univ. Cat. $1",
    },
    {
      regex: /^(?:Deportes|Deportivo)\s+(.+)/i,
      substituicao: "Dep. $1",
    },
    {
      regex: /^Universidad\s+(.+)/i,
      substituicao: "Univ. $1",
    },
  ];
  let nomeSimplificado = nomeCompleto.trim();
  for (const regra of regras) {
    if (new RegExp(regra.regex).test(nomeSimplificado)) {
      nomeSimplificado = nomeSimplificado.replace(new RegExp(regra.regex), regra.substituicao);
      break;
    }
  }
  return nomeSimplificado;
};

export const formatarNomeCampeonato = (nomeCompleto) => {
  const padroes = [
    { regex: /brasileirão.*/i, substituicao: "Brasileirão" },
    { regex: /brazil serie a.*/i, substituicao: "Brasileirão" },
    { regex: /conmebol libertadores/i, substituicao: "Libertadores" },
    { regex: /copa libertadores/i, substituicao: "Libertadores" },
    { regex: /conmebol sudamericana/i, substituicao: "Sul-Americana" },
    { regex: /copa sudamericana/i, substituicao: "Sul-Americana" },
    { regex: /copa do brasil/i, substituicao: "Copa do Brasil" },
    { regex: /(.*?)(?:,| -| –| \()/i, substituicao: "$1" },
    {
      regex: /^(.*?)(?: serie | group| playoff| fase| temporada).*/i,
      substituicao: "$1",
    },
  ];

  let nomeSimplificado = nomeCompleto.trim();
  for (const padrao of padroes) {
    nomeSimplificado = nomeSimplificado.replace(padrao.regex, padrao.substituicao);
  }

  return nomeSimplificado;
};

export const formatarTimestamp = (timestamp) => {
  if (!timestamp) return "Data não disponível";

  const mesesAbreviados = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  const diasDaSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const date = new Date(timestamp * 1000);

  const dia = date.getDate().toString().padStart(2, "0");
  const mes = mesesAbreviados[date.getMonth()];
  const diaSemana = diasDaSemana[date.getDay()];
  const horas = date.getHours().toString().padStart(2, "0");
  const minutos = date.getMinutes().toString().padStart(2, "0");

  return `${dia}/${mes}, ${diaSemana}, ${horas}:${minutos}`;
};
