# Status do projeto — reescrita

Última atualização: 2026-08-22

Este arquivo existe pra que uma sessão nova do Claude Code (ou o próprio Sérgio, meses depois) não comece do zero. Ver `CLAUDE.md` para stack e convenções de código.

## O que é isso

Reescrita completa do ondevaipassar: descobrir em que canal de TV/streaming passa o próximo jogo de qualquer time brasileiro, em qualquer campeonato (Série A/B, copas nacionais, continentais, estaduais).

## Por que reescrever

O projeto original (Python/Flask + scraper Node separado) tinha três pipelines de dados desconectados que nunca funcionaram de ponta a ponta em produção — ver "Diagnóstico do código antigo" abaixo. Decisão do Sérgio: recomeçar do zero, escolher melhor a linguagem do backend, migrar o frontend para TypeScript.

## Decisões arquiteturais (já alinhadas, não re-discutir sem motivo novo)

- **Backend em Node.js + TypeScript** (não Python, não Go) — compartilha tipos com o front, e Playwright/cheerio são mais fortes que as alternativas pra scraping.
- **Servidor de API persistente** (Fastify) + SQLite via Drizzle — não um pipeline estático, porque o escopo alvo é "todos os campeonatos, incluindo estaduais": muitas fontes, falhas parciais esperadas, e correção manual futura de dado errado precisa de escrita (precisa de servidor, não só JSON estático).
- **Escopo**: todos os campeonatos, incluindo estaduais — mas faseado (ver "Sequenciamento"), não tudo de uma vez.
- **Fontes de dado — revisado durante a Fase 1**: `ondeassistiraojogo.com.br` (a fonte nº1 original do plano) **não existe mais** — falha de DNS confirmada por dois caminhos de rede independentes ao tentar implementar. Em compensação, `ge.globo.com` acabou sendo uma fonte muito mais rica do que o esperado: cada página de agenda de time (`https://ge.globo.com/futebol/times/{slug}/agenda-de-jogos-do-{slug}/`) tem um JSON completo embutido server-side no HTML (`window.dataSportsSchedule.scheduleTeam`, dentro de uma tag `<script>`) com jogos + transmissão de **todos os campeonatos daquele time simultaneamente** (Brasileirão A/B, Copa do Brasil, Libertadores, Recopa, Supercopa, Copa do Nordeste, estadual do próprio time — tudo numa fetch só, sem precisar de Playwright/JS). Isso virou a fonte primária, e simplificou bastante a estratégia: não precisa de um adapter por campeonato, só um adapter por time. football-data.org fica como possível fonte secundária futura (cross-check ou preenchimento de lacuna), não bloqueante. Nunca LLM como fonte de verdade, nunca scraping de motor de busca genérico (era o erro do código antigo).
- **Interface em português, código em inglês** — ver `CLAUDE.md`.
- Repo renomeado de `ondevaipassar-teste` para `ondevaipassar` no GitHub (remote local já atualizado).

## Diagnóstico do código antigo (por que cada peça foi substituída)

- `backend/app.py` (Flask): buscava fixtures da Série A via football-data.org com API key **hardcoded no código-fonte**; o campo de canal nunca era preenchido de fato (`"canais": ["A confirmar"]` sempre).
- `backend/canais.py`: tentava perguntar pro Gemini `gemini-1.0-pro` (**modelo descontinuado pelo Google, não roda mais**) qual canal passava o jogo — mesmo funcionando, era o LLM chutando sem nenhuma fonte real (não é grounding, é alucinação).
- `frontend/src/webscraping/`: scraper Node separado, mal localizado dentro do frontend, raspava `betsapi.com` (jogos, via posição de coluna de tabela HTML — muito frágil) e o HTML de busca do DuckDuckGo (canais, por keyword matching nos snippets — também muito frágil e alvo fácil de bloqueio). Nunca escrevia num lugar que o front lia em produção.
- `frontend/src/context/GamesContext.jsx`: buscava de `http://localhost:5000/api/games` **hardcoded** — ou seja, o app publicado no GitHub Pages nunca conseguiu buscar jogo nenhum. **Não havia comportamento em produção pra proteger** durante a migração.
- Achado valioso, minerado como dado: `backend/output/teams/puxarCanais.js` + `onde_assistir_brasileiro.json` — um pipeline manual mais antigo, mais rico, prova que `ondeassistiraojogo.com.br` rende dado limpo e estruturado de canal quando raspado direito (`{"canal": "Premiere"}`). É a base da escolha de fonte de canal. O mesmo arquivo tem uma tabela de aliases de clubes estrangeiros (Libertadores/Sul-Americana) já curada à mão, também aproveitada.
- Nomes de time/canal eram normalizados de **7 formas divergentes** espalhadas pelo código (times.jsx, utils/times, teamConfig.js, utils/nomes, webscraping/stringUtils.js, fileService.js, puxarCanais.js), incluindo dois bugs reais de copy-paste em `teamConfig.js`: Palmeiras com `geName`/`ondeAssistirName` vazios, Santos com esses campos errados apontando pra dado do Palmeiras. Causa raiz da fragilidade — por isso o registro canônico único em `packages/shared`.
- Bug real de UX confirmado por leitura direta do código: o dropdown de times do cabeçalho quebrava a navegação (`Header.jsx` passava a prop `setIsVisible`, `DropdownMenu.jsx` esperava `setIsDropdownVisible` — undefined call, throw antes do `<Link>` navegar). Corrigido na migração pra TS — tipagem estrita de props pega esse tipo de bug em compile-time.
- Outros bugs pequenos confirmados: typo `text=` em vez de `text-` em `CanaisDoJogo.jsx` (classe Tailwind inválida); comparação de "jogos de hoje" em `Home.jsx` sem fuso horário explícito (deveria ser `America/Sao_Paulo`); 6 lugares buscando imagem (escudo/canal) via `raw.githubusercontent.com` em runtime quando o SVG já existe local.

## Segurança

Repo é **público** no GitHub. `.env` (raiz, com `SERPAPI_KEY`) estava rastreado pelo git desde o commit "atualização do projeto"; a key da football-data.org estava hardcoded em `backend/app.py`. Ambas expostas no histórico público.

- **Pendente, só o Sérgio pode fazer**: rotacionar as duas chaves nos respectivos dashboards (SerpApi, football-data.org). É o que efetivamente neutraliza o vazamento — remover do código não apaga o histórico do git.
- **Já feito**: `.env` tirado do controle de versão (`git rm --cached`); `frontend/deps/` (cache órfão do Vite, rastreado por engano) também. A key da football-data.org nunca mais é hardcoded — o novo backend sempre lê de env var.
- Purgar o segredo do histórico do git (`git filter-repo`/BFG + force-push) ficou **fora de escopo** deliberadamente — destrutivo, exige reescrever histórico público, e a rotação da chave já resolve o risco real. Só fazer se pedido explicitamente.

## Sequenciamento (fases)

- [x] **Fase 0**: hygiene de segurança, rename do repo no GitHub.
- [x] **Fase 1**: esqueleto do backend (Fastify + Drizzle/`better-sqlite3`) + `packages/shared` (registro de times/competições/canais) + adapter ge.globo (fixtures + canais juntos, por time — ver "Fontes de dado" acima) + pipeline de ingest (seed + upsert + `scrape_runs`) + `node-cron` a cada 3h + API (`/api/matches`, `/api/teams`, `/api/competitions`, `/api/health`) + teste vitest contra fixture HTML real salva. **Verificado rodando de verdade**: 57 jogos ingeridos (Brasileirão A, Brasileirão B, Copa do Brasil), 28 já com canal confirmado (Premiere, SporTV, Globoplay, Prime Video, Disney+, Globo — os outros são jogos distantes o bastante pra emissora ainda não ter confirmado, não é bug). Detalhes técnicos e pendências abaixo.

  **Como foi construído** (diferenças em relação ao plano original, todas por motivo verificado, não capricho):
  - Driver do Drizzle: `better-sqlite3`, não `node:sqlite` — a versão estável do Drizzle (0.45.2, a mais nova) ainda não tem driver pra `node:sqlite`, só better-sqlite3/bun-sqlite/etc. `node:sqlite` sozinho funciona bem neste ambiente (Node 24.16), só não tem a integração com o Drizzle ainda.
  - Tabelas criadas via `CREATE TABLE IF NOT EXISTS` direto em `db/client.ts`, não via `drizzle-kit` migrations — mais simples pra esse estágio; migrations formais ficam pra quando o schema estabilizar.
  - `id` de `matches`/`broadcasts` é determinístico (`ge-globo:{id numérico do ge.globo}`, e `{matchId}__{channelId}`) em vez de índice único separado — upsert vira um `INSERT ... ON CONFLICT DO UPDATE` direto por chave primária, sem lookup separado.

  **Pendências conhecidas, documentadas em vez de escondidas**:
  - `mirassol` e `sport_recife` não têm slug do ge.globo confirmado ainda (testei várias variações, nenhuma resolveu) — esses 2 dos 20 times ficam sem cobertura até alguém achar o slug certo. Ver `aliases.geGlobo: null` em `packages/shared/src/team.ts`.
  - `teamResolver.ts` tem uma tabela de aliases pra reconciliar o `popularName` do ge.globo com nosso `displayName`, mas não foi verificada exaustivamente pra todo time com acento/hífen (Atlético-MG, São Paulo, Grêmio) — se algum não bater, o time aparece com o nome cru em vez do nome/cor/escudo estilizado, não quebra nada, só fica menos bonito até eu ajustar o alias.
  - Endpoints de correção manual (`/api/admin/*`) ainda não existem — fazem parte do design (tabela `scrape_runs` já grava falha parcial por fonte) mas não eram critério de pronto da Fase 1.
- [x] **Fase 2**: frontend inteiro migrado pra TypeScript (`.jsx`→`.tsx`, `strict: true`, leaf-to-root). `Components/times.jsx` e `canais.jsx` foram substituídos por import direto de `@ondevaipassar/shared`. `GamesContext` virou `MatchesContext`, consumindo `/api/matches` de verdade via `VITE_API_BASE_URL`. **Verificado com Playwright de ponta a ponta**: home carrega com 20 escudos + jogos de hoje reais com canal real; navegação pro dropdown do header testada explicitamente (clicar um time no dropdown mudou a URL pra `/time/atletico_mineiro` sem erro — o bug de prop-mismatch está mesmo corrigido); zero erros de console. Screenshots em `/tmp/.../scratchpad/0{1,2,3,4}-*.png` (sessão local, não persistem).

  **Bugs do código antigo corrigidos nesta fase** (além do dropdown, já detalhado antes):
  - `CanaisDoJogo.jsx`: typo `text=${cor}` (classe Tailwind inválida) e um branch morto — reescrito como `MatchBroadcasts.tsx`, canal já vem estruturado da API (não precisa mais parsear texto livre).
  - `Home.jsx`: "jogos de hoje" comparava data sem fuso horário explícito — agora compara em `America/Sao_Paulo` sempre, independente do fuso de quem acessa.
  - 6 lugares buscando escudo/logo via `raw.githubusercontent.com` em runtime — trocados por assets locais (`import.meta.env.BASE_URL`), sem round-trip de rede.
  - `Contato.jsx`: `<input htmlFor="...">` inválido (só existe em `<label>`) — removido.
  - `tailwind.config.js`: `plugins` estava aninhado dentro de `theme` (nunca funcionou) e nem estava carregado pelo Tailwind v4 (faltava `@config` no CSS) — as animações/plugin de scrollbar nunca foram usadas por nenhum componente, então o arquivo foi removido em vez de consertado; `output.css` (1404 linhas, artefato de build de uma versão antiga, não referenciado por nada) também removido.
  - `frontend/package.json`: removidas dependências órfãs do `webscraping/` antigo (axios, cheerio, cors, dotenv, express) e do setup pré-Tailwind-v4 (postcss, autoprefixer, tailwind-scrollbar — não usado por nenhum componente) — 365 pacotes a menos instalados.
  - Raiz do repo: `jsconfig.json` removido (substituído pelos `tsconfig.json` reais de `backend/`/`frontend/`).

  **Pendência conhecida**: nomes de exibição simplificados para adversários não-rastreados (ex. clubes da Libertadores) — o `formatarNomeTime`/`casosEspeciais` do código antigo não foi portado; por ora esses times aparecem com o nome cru vindo do ge.globo (ex. "Racing Club de Montevideo" em vez de "Racing-URU"). Cosmético, não bloqueia nada.

- [x] **Ajustes pós-Fase 2** (a partir de perguntas do Sérgio explorando o localhost):
  - **Escudo de qualquer adversário sem trabalho manual**: cada `firstContestant`/`secondContestant` do ge.globo já vem com `badgeSvg`/`badgePng` — passado agora por `matches.home_team_crest_url`/`away_team_crest_url` até a API (`MatchView.homeTeamCrestUrl`/`awayTeamCrestUrl`). Front usa asset local só para os times rastreados; qualquer outro (ex. um Cruzeiro x CSKA Moscow hipotético) usa o escudo oficial que a própria fonte já manda, com o escudo cinza genérico como último fallback. Resolve a pergunta "de onde tiramos o escudo de time que não está na nossa base".
  - **GeTV separado de Globoplay**: eram tratados como sinônimo (bug); confirmado nos dados reais que são produtos diferentes (GeTV = conteúdo ao vivo grátis do ge, Globoplay = assinatura paga) — `liveWatchSources` tem descrição/URL/`transmissionId` diferentes para cada um. Canal `getv` criado no registro; como não temos SVG local pra ele, o logo vem da própria fonte (`officialLogoUrl`, novo campo `broadcasts.logo_url`), com fallback local tentado primeiro.
  - **Regionalização da Globo**: confirmado que **não temos esse dado** — toda ocorrência de "Globo" no JSON é idêntica byte a byte (mesma URL, mesmo `transmissionId`), sempre com a descrição genérica "Confira a programação local", sem nenhum campo de região/UF em lugar nenhum da resposta. Adicionado `Channel.regionalCaveat` (true só para `globo`) — o front mostra um aviso no tooltip do logo. Não dá pra resolver isso sem uma fonte de dado diferente com granularidade regional, que não conhecemos nenhuma gratuita.
  - **Escopo de times rastreados**: decisão do Sérgio — manter Série A + Série B (~40 times), aceitar atualização manual uma vez por ano na promoção/rebaixamento, sem tentar automatizar (evento raro, poucos times, não compensa a complexidade). Com o escudo resolvido pela fonte, adicionar um time novo agora é só nome + cor + slug do ge.globo, sem precisar de SVG. Ainda não implementado (fica pra próxima leva de dados na Fase 3/4), mas a arquitetura já suporta sem mudança nenhuma.
  - Verificado com Playwright de novo após essas mudanças: escudos de adversário resolvendo via fonte, logo do GeTV carregando via fallback, zero erro de console.
- [ ] **Fase 3**: Série B (verificar cobertura no plano gratuito da football-data.org antes de assumir), Libertadores, Sul-Americana, Copa do Brasil.
- [ ] **Fase 4**: campeonatos estaduais — fatia inicial de ~6-10 estados dos clubes já mapeados (Paulista, Mineiro, Carioca, Gaúcho, Baiano, Pernambucano), expansão incremental depois. Não é pra tentar os 27 de uma vez.
- [ ] **Fase 5**: deploy do backend (host com disco persistente e sem hibernação — necessário pro `node-cron` não parar de atualizar dado; Fly.io é a recomendação atual, não decisão final), remove o backend Python antigo, substitui o workflow do GitHub Actions quebrado (`update.yml`, chama um `scraper.js` que não existe mais) por CI de lint/typecheck/test.

## Pendências que só o Sérgio decide

- Rotacionar as chaves vazadas (SerpApi, football-data.org) — ver "Segurança" acima.
- Confirmar host de produção do backend quando chegar na Fase 5 (Fly.io é a recomendação, não está fechado).

## Onde está o plano técnico completo

O plano detalhado (estrutura de pastas, schema de banco, ordem exata de implementação de fonte) foi aprovado e vive em `~/.claude/plans/snappy-zooming-lemon.md` — **fora deste repositório**, pode não estar disponível em sessões/máquinas futuras. Este arquivo (`review.md`) é a referência durável; se o plano externo sumir, o essencial pra continuar já está aqui.
