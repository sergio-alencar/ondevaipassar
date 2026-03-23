import times from "../Components/times";
import escudo from "/src/assets/images/icones/escudo-cinza.svg";
import versus from "/src/assets/images/icones/versus.svg";
import CanaisDoJogo from "./CanaisDoJogo";

const JogoItem = ({ jogo, time }) => {
  if (!jogo) {
    return null;
  }

  const timeCasaObj = times.find((t) => t.apiName === jogo.time_casa);
  const timeVisitanteObj = times.find((t) => t.apiName === jogo.time_visitante);

  const getNomeExibicao = (timeObj, fallbackName) => (timeObj ? timeObj.maiusculo : fallbackName);
  const getUrlEscudo = (timeObj) => {
    if (!timeObj) return escudo;
    const baseUrl =
      "https://raw.githubusercontent.com/sergio-alencar/ondevaipassar-teste/main/public/images/times/";
    return `${baseUrl}${timeObj.nome}.svg`;
  };

  const formatarData = (dataISO) => {
    const data = new Date(dataISO);

    const options = {
      weekday: "short",
      day: "numeric",
      month: "short",
    };

    let dataFormatada = new Intl.DateTimeFormat("pt-BR", options).format(data);

    dataFormatada = dataFormatada.replace(/\./g, "").replace(" de ", "-");

    const horaFormatada = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dataFormatada}, ${horaFormatada}`;
  };

  return (
    <li className="py-6 max-sm:py-0">
      <div className="grid grid-cols-[1fr_400px_1fr] gap-2 py-8 px-4 max-lg:grid-cols-3 max-lg:py-2 max-lg:px-2 max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:py-4">
        <div className="flex items-center justify-self-end gap-4 max-lg:gap-2 max-lg:justify-self-center">
          <img
            crossOrigin="anonymous"
            className="size-32 max-lg:size-20 max-sm:size-18"
            src={getUrlEscudo(timeCasaObj)}
            alt={getNomeExibicao(timeCasaObj, jogo.time_casa)}
            title={getNomeExibicao(timeCasaObj, jogo.time_casa)}
            onError={(e) => {
              e.target.src = escudo;
            }}
            loading="lazy"
          />
          <img className="size-6 max-lg:size-4" src={versus} alt="versus" />
          <img
            crossOrigin="anonymous"
            className="size-32 max-lg:size-20 max-sm:size-18"
            src={getUrlEscudo(timeVisitanteObj)}
            alt={getNomeExibicao(timeVisitanteObj, jogo.time_visitante)}
            title={getNomeExibicao(timeVisitanteObj, jogo.time_visitante)}
            onError={(e) => {
              e.target.src = escudo;
            }}
            loading="lazy"
          />
        </div>

        <div className="flex flex-col justify-center gap-2 uppercase font-bold text-center h-full">
          <p>
            {getNomeExibicao(timeCasaObj, jogo.time_casa)} x{" "}
            {getNomeExibicao(timeVisitanteObj, jogo.time_visitante)}
          </p>
          <p>{jogo.campeonato}</p>
          <p>{formatarData(jogo.data)}</p>
        </div>

        <div className="flex items-center justify-center">
          {jogo.canais && jogo.canais.length > 0 && jogo.canais[0] !== "A confirmar" ? (
            <CanaisDoJogo canais={jogo.canais} jogo={jogo} time={time} />
          ) : (
            <p className="text-sm text-gray-500 italic">Ainda não há informações de transmissão.</p>
          )}
        </div>
      </div>
    </li>
  );
};

export default JogoItem;
