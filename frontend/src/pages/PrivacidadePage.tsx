import { useEffect } from "react";
import { SOCIAL_LINKS } from "../lib/socialLinks";
import type { SetSelectedTeam } from "../types";

interface PrivacidadePageProps {
  setSelectedTeam: SetSelectedTeam;
}

const INSTAGRAM = SOCIAL_LINKS.find((link) => link.label === "Instagram");

const PrivacidadePage = ({ setSelectedTeam }: PrivacidadePageProps) => {
  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 text-gray-800">
      <h1 className="pt-8 text-4xl font-bold uppercase max-sm:py-4 max-sm:text-3xl">Privacidade</h1>
      <p className="mt-4 text-lg">
        O Onde Vai Passar funciona sem conta e sem cadastro. Esta página explica o que acontece se você escolher entrar.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Sem conta</h2>
      <p className="mt-2">
        Os times e canais que você marca ficam só no seu navegador, no armazenamento local dele. Não são enviados para lugar nenhum, e não sabemos quem você é.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Com conta (Entrar com Google)</h2>
      <p className="mt-2">Entrar é opcional e serve para levar seus times e canais favoritos para outros aparelhos.</p>
      <ul className="mt-4 list-disc space-y-3 pl-6">
        <li>
          <strong>O que guardamos:</strong> o identificador da sua conta Google (um código, nunca a sua senha), o seu e-mail, a lista de times e canais que você escolheu e a data em que a conta foi criada.
        </li>
        <li>
          <strong>O que pedimos ao Google:</strong> apenas o seu e-mail e a confirmação de que você é você. Não recebemos nome, foto, contatos nem outras informações.
        </li>
        <li>
          <strong>Para quê:</strong> mostrar &ldquo;conectado como…&rdquo; e manter seus favoritos entre aparelhos. Não usamos para publicidade, não vendemos e não compartilhamos com terceiros.
        </li>
        <li>
          <strong>Cookie:</strong> ao entrar, usamos um único cookie de sessão, que os scripts da página não conseguem ler. Vale por 30 dias ou até você sair. Não usamos cookies de rastreamento nem ferramentas de análise de acesso.
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Excluir</h2>
      <p className="mt-2">
        Em &ldquo;Minha conta&rdquo; você exclui a conta quando quiser. Isso apaga na hora o seu registro, os times e canais guardados nele e todas as sessões abertas. Os favoritos que estão no seu navegador continuam lá.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Hospedagem</h2>
      <p className="mt-2">
        O site e o banco de dados ficam em serviços de terceiros (Vercel e Turso). Como qualquer servidor, eles registram dados técnicos de acesso, como o endereço IP, em logs. Cópias de segurança do provedor do banco podem reter dados por um período limitado depois de uma exclusão.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Dúvidas ou pedidos</h2>
      <p className="mt-2">
        Fale com a gente pelo{" "}
        {INSTAGRAM ? (
          <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="font-bold text-purple-900 hover:text-purple-600">
            Instagram
          </a>
        ) : (
          "Instagram"
        )}
        .
      </p>
    </div>
  );
};

export default PrivacidadePage;
