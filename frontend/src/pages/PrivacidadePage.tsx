import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SOCIAL_LINKS } from "../lib/socialLinks";
import type { SetSelectedTeam } from "../types";

interface PrivacidadePageProps {
  setSelectedTeam: SetSelectedTeam;
}

const INSTAGRAM = SOCIAL_LINKS.find((link) => link.label === "Instagram");

const EMAIL_LINK = (
  <a href="mailto:contato@ondevaipassar.com" className="font-bold text-purple-900 hover:text-purple-600">
    contato@ondevaipassar.com
  </a>
);

const PrivacidadePage = ({ setSelectedTeam }: PrivacidadePageProps) => {
  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 text-gray-800">
      <h1 className="pt-8 text-4xl font-bold uppercase max-sm:py-4 max-sm:text-3xl">Política de privacidade</h1>
      <p className="mt-2 text-sm text-gray-500">Última atualização: 8 de outubro de 2026</p>
      <p className="mt-4 text-lg">
        O Onde Vai Passar (ondevaipassar.com) mostra em que canal ou serviço de streaming passa o próximo jogo do seu time. Ele funciona sem conta e sem cadastro. Esta página explica, em detalhe, quais dados tratamos, para quê, onde ficam, por quanto tempo e como você apaga tudo.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Quem somos</h2>
      <p className="mt-2">
        O site é um projeto independente, mantido por Sérgio de Alencar, que é o responsável pelo tratamento dos dados descritos aqui. Contato: {EMAIL_LINK}.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Resumo</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>Sem conta, não coletamos nenhum dado pessoal seu: seus favoritos ficam só no seu navegador.</li>
        <li>Com conta, guardamos seu e-mail e seus favoritos para sincronizá-los entre aparelhos. Nada além disso.</li>
        <li>Não vendemos, não alugamos e não compartilhamos seus dados com ninguém para fins de publicidade ou qualquer outro uso.</li>
        <li>Não usamos cookies de rastreamento, nem ferramentas de análise de acesso, nem publicidade.</li>
        <li>Você exclui a conta e todos os dados a qualquer momento, na hora, em &ldquo;Minha conta&rdquo;.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Sem conta</h2>
      <p className="mt-2">
        Os times, campeonatos e canais que você segue ficam no armazenamento local do seu navegador (<em>localStorage</em>). Eles não são enviados ao nosso servidor, e não sabemos quem você é. Limpar os dados do navegador apaga essas escolhas. Os dados dos jogos (horários, campeonatos, canais) vêm de fontes públicas e não envolvem dados pessoais.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Com conta (Entrar com Google)</h2>
      <p className="mt-2">
        Entrar é opcional e serve apenas para levar seus times, campeonatos e canais favoritos para outros aparelhos. O login é feito pelo Google (protocolo OAuth 2.0 / OpenID Connect). Nós nunca vemos nem guardamos a sua senha do Google.
      </p>

      <h3 className="mt-6 text-xl font-bold">Dados do Google que acessamos</h3>
      <p className="mt-2">Pedimos ao Google somente as permissões <strong>openid</strong> e <strong>e-mail</strong>. Com elas recebemos:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>o identificador único da sua conta Google (um código);</li>
        <li>o seu endereço de e-mail e a informação de que ele foi verificado pelo Google.</li>
      </ul>
      <p className="mt-2">
        Não pedimos nem recebemos seu nome, foto, contatos, agenda, e-mails, arquivos ou qualquer outro dado da sua conta Google.
      </p>

      <h3 className="mt-6 text-xl font-bold">Dados que guardamos</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>o identificador da conta Google e o seu e-mail;</li>
        <li>a lista de times, campeonatos e canais que você escolheu e a data da última alteração;</li>
        <li>a data de criação da conta;</li>
        <li>dados de sessão: um código de sessão armazenado de forma irreversível (apenas o seu resumo criptográfico), com a data de criação e de validade.</li>
      </ul>

      <h3 className="mt-6 text-xl font-bold">Para que usamos</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>o identificador e o e-mail servem para reconhecer a sua conta e mostrar &ldquo;conectado como…&rdquo;;</li>
        <li>os favoritos servem para exibi-los no site em qualquer aparelho em que você entrar.</li>
      </ul>
      <p className="mt-2">
        Não usamos esses dados para publicidade, perfilamento, treinamento de modelos de inteligência artificial nem para enviar mensagens. Não enviamos e-mails a você.
      </p>

      <h3 className="mt-6 text-xl font-bold">Uso e transferência de dados do Google</h3>
      <p className="mt-2">
        O uso que o Onde Vai Passar faz das informações recebidas das APIs do Google segue a{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-purple-900 hover:text-purple-600"
        >
          Política de Dados do Usuário dos Serviços de API do Google
        </a>
        , incluindo os requisitos de Uso Limitado. Em especial: usamos os dados do Google somente para oferecer o login e a sincronização descritos acima; não os transferimos a terceiros, exceto os provedores de hospedagem listados abaixo, necessários para operar o serviço; não os usamos para publicidade; e nenhuma pessoa lê esses dados, salvo com o seu consentimento, por segurança ou para cumprir a lei.
      </p>

      <h3 className="mt-6 text-xl font-bold">Cookies</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>
          <strong>Cookie de sessão</strong> (só depois de entrar): um único cookie, que os scripts da página não conseguem ler. Vale por 30 dias ou até você sair.
        </li>
        <li>
          <strong>Cookie temporário de login</strong>: durante a ida ao Google, um cookie de segurança dura no máximo 10 minutos e serve para impedir que o login seja forjado.
        </li>
        <li>Não usamos cookies de rastreamento, de análise de acesso nem de publicidade.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Quem mais tem acesso</h2>
      <p className="mt-2">Os dados da conta ficam em serviços de terceiros que operam o site para nós, como operadores, e só para isso:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>
          <strong>Vercel</strong>: hospedagem do site e da API. Como qualquer servidor, registra dados técnicos de acesso, como o endereço IP, em logs.
        </li>
        <li>
          <strong>Turso</strong>: banco de dados onde ficam os dados da conta.
        </li>
        <li>
          <strong>Google</strong>: realiza o login, conforme as regras e a política de privacidade do próprio Google.
        </li>
      </ul>
      <p className="mt-2">Esses provedores podem processar dados em servidores fora do Brasil. Não há nenhum outro destinatário dos seus dados.</p>

      <h2 className="mt-10 text-2xl font-bold">Por quanto tempo guardamos</h2>
      <p className="mt-2">
        Os dados da conta ficam enquanto a conta existir. Sessões expiram em 30 dias e as vencidas são apagadas. Ao excluir a conta, o registro, os favoritos guardados nela e todas as sessões são apagados na hora. Cópias de segurança do provedor do banco de dados podem reter dados por um período limitado depois de uma exclusão. Logs técnicos de hospedagem seguem o prazo do provedor.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Seus direitos e como excluir</h2>
      <p className="mt-2">
        Conforme a Lei Geral de Proteção de Dados (LGPD), você pode confirmar que tratamos seus dados, acessá-los, corrigi-los, pedir a exclusão e revogar o consentimento. O tratamento com conta se baseia no seu consentimento, dado ao escolher entrar.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>
          <strong>Excluir:</strong> em <Link to="/conta" className="font-bold text-purple-900 hover:text-purple-600">Minha conta</Link>, o botão &ldquo;Excluir minha conta&rdquo; apaga tudo na hora. Os favoritos que estão no seu navegador continuam lá, e você os remove limpando os dados do navegador.
        </li>
        <li>
          <strong>Sair:</strong> também em &ldquo;Minha conta&rdquo;, encerra a sessão neste aparelho.
        </li>
        <li>
          <strong>Revogar o acesso no Google:</strong> em myaccount.google.com/permissions você remove a permissão dada ao site.
        </li>
        <li>
          <strong>Outros pedidos:</strong> escreva para {EMAIL_LINK}{INSTAGRAM ? <> ou pelo <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="font-bold text-purple-900 hover:text-purple-600">Instagram</a></> : null}.
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Crianças</h2>
      <p className="mt-2">O site não é direcionado a menores de 13 anos, e a criação de conta é voltada a quem tem idade para ter uma conta Google.</p>

      <h2 className="mt-10 text-2xl font-bold">Mudanças nesta política</h2>
      <p className="mt-2">
        Se mudarmos o que coletamos ou como usamos, atualizamos esta página e a data no topo antes de a mudança valer. Para usos novos dos dados do Google, pediremos o seu consentimento de novo.
      </p>
    </div>
  );
};

export default PrivacidadePage;
