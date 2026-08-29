import { useEffect } from "react";
import type { SetSelectedTeam } from "../types";

interface SobreProps {
  setSelectedTeam: SetSelectedTeam;
}

const Sobre = ({ setSelectedTeam }: SobreProps) => {
  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    // px-24 max-sm:px-6, not the site's usual px-4: matches Header.tsx's
    // own row exactly (same max-w-7xl mx-auto too), so this page's text
    // starts flush with the hamburger icon and ends flush with the
    // "times" shield icon, edge to edge — Sérgio asked for that alignment
    // specifically. No inner max-w-3xl reading-width cap either, since
    // that would pull the right edge back in from the shield's own edge.
    <main className="flex flex-col grow max-w-7xl mx-auto px-24 max-sm:px-6 py-12">
      <h1 className="text-4xl font-bold uppercase mb-6 max-sm:text-3xl">Sobre</h1>
      <h2 className="font-bold text-3xl mb-4 max-sm:text-2xl max-sm:mb-2">Quem sou eu?</h2>
      <p className="text-xl mb-10">
        Meu nome é Sérgio. Sou estudante de Sistemas de Informação, engenheiro de software e
        torcedor do Cruzeiro. Se quiser conhecer mais sobre mim, acesse meu{" "}
        <a
          href="https://www.linkedin.com/in/sergio-alencar/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-purple-900 hover:text-purple-600"
        >
          LinkedIn
        </a>
        ,{" "}
        <a
          href="https://github.com/sergio-alencar"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-purple-900 hover:text-purple-600"
        >
          GitHub
        </a>{" "}
        ou me mande um{" "}
        <a
          href="mailto:sergiofalencar@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-purple-900 hover:text-purple-600"
        >
          email
        </a>
        .
      </p>
      <h2 className="font-bold text-3xl mb-4 max-sm:text-2xl max-sm:mb-2">
        O que é o Onde Vai Passar?
      </h2>
      <p className="text-xl">
        É uma tentativa de resolver um problema pelo qual muitos torcedores já passaram: tentar
        descobrir onde conseguir assistir ao jogo do seu time. As informações estão disponíveis na
        internet, mas de maneira pulverizada e pouco estruturada. O <i>Onde Vai Passar</i> reúne
        esses dados públicos — já divulgados por emissoras, veículos de imprensa e pelos próprios
        clubes — e os apresenta em um só lugar, de forma organizada.
      </p>
      <p className="text-xl mt-4">
        Nenhuma informação aqui é de minha autoria: são dados públicos, encontrados na internet, e
        a única intenção deste site é facilitar o acesso a eles. Não há qualquer pretensão de me
        apropriar desse conteúdo ou de lucrar com o trabalho de terceiros. O <i>Onde Vai Passar</i>{" "}
        é gratuito e sem fins lucrativos.
      </p>
    </main>
  );
};

export default Sobre;
