// pages/CanaisDoJogo.jsx

import React from "react";
import canais from "../Components/canais";
import { obterImagemCanal, separarCanais } from "../utils/canais";
import { normalizarNomeTime } from "../utils/times";

const CanaisDoJogo = ({ canais: canaisJogo, jogo, time }) => {
  if ((!canaisJogo || canaisJogo.length === 0) && jogo?.canais) {
    return (
      <div className="overflow-x-auto whitespace-nowrap">
        <div
          className="flex justify-self-start items-center gap-6 max-lg:gap-2 max-lg:justify-self-center max-lg:justify-items-center overflow-y-hidden"
          style={{ scrollbarWidth: "thin" }}
        >
          {separarCanais(jogo.canais).map((canal, idx) => {
            const imagemCanal = obterImagemCanal(canal);
            const nomeNormalizado = normalizarNomeTime(canal);
            const url = canais[nomeNormalizado]?.url;
            const alt = canais[nomeNormalizado]?.nome;
            const title = canais[nomeNormalizado]?.nome;

            return (
              imagemCanal && (
                <a
                  key={`${canal}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={imagemCanal}
                    alt={alt}
                    title={title}
                    className="w-32 mr-2 shrink-0 hover:scale-105 transition max-lg:mr-1 max-sm:w-28"
                    loading="lazy"
                    onError={(e) => {
                      console.error(
                        `Erro ao carregar imagem do canal: ${canal}`
                      );
                      e.target.onerror = null;
                      e.target.style.display = "none";
                    }}
                  />
                </a>
              )
            );
          })}
        </div>
      </div>
    );
  }

  if (canaisJogo && canaisJogo.length > 0) {
    return (
      <div className="overflow-x-auto whitespace-nowrap">
        <div
          className="flex justify-center items-center gap-6 max-lg:gap-2 overflow-y-hidden"
          style={{ scrollbarWidth: "thin" }}
        >
          {canaisJogo.map((canal, idx) => {
            const imagemCanal = obterImagemCanal(canal);
            const nomeNormalizado = normalizarNomeTime(canal);
            const url = canais[nomeNormalizado]?.url;
            const alt = canais[nomeNormalizado]?.nome || canal;
            const title = canais[nomeNormalizado]?.nome || canal;

            return (
              imagemCanal && (
                <a
                  key={`${canal}=${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <img
                    src={imagemCanal}
                    alt={alt}
                    title={title}
                    className="w-32 hover:scale-105 transtion max-lg:w-24 max-sm:w-20"
                    loading="lazy"
                    onError={(e) => {
                      console.error(
                        `Erro ao carregar imagem do canal: ${canal}`
                      );
                      e.target.onerror = null;
                      e.target.style.display = "none";
                    }}
                  />
                </a>
              )
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p
        className={`text=${
          time?.cor || "gray-500"
        } uppercase font-bold text-lg max-lg:text-base`}
      >
        Transmissão a confirmar
      </p>
    </div>
  );
};

export default CanaisDoJogo;
