# ondevaipassar

Agrega, para qualquer time brasileiro e qualquer campeonato (Série A/B, copas nacionais, continentais, estaduais), em que canal de TV ou serviço de streaming o próximo jogo vai passar.

Leia `review.md` antes de mexer em qualquer coisa — ele tem o diagnóstico do código antigo, as decisões tomadas (com o porquê) e o estado atual por fase. Este arquivo (`CLAUDE.md`) é só convenção e orientação rápida.

**Em produção**: front em https://ondevaipassar.com, backend em https://api.ondevaipassar.com — domínio próprio (comprado na Hostinger, DNS apontando pra Vercel via registro `A`), migrado a partir das URLs técnicas `ondevaipassar-nine.vercel.app`/`ondevaipassar-api.vercel.app` (que continuam existindo como alias, mas não são mais o link canônico). Ambos os projetos na conta Vercel pessoal do Sérgio (`sergio-alencar`, não a "speivox", que é conta de trabalho). Custo: $0/mês (Vercel Hobby + Turso free tier), decisão explícita do Sérgio.

## Stack

- **Backend** (`backend/`): Node.js + TypeScript, Fastify rodando como função serverless da Vercel (`backend/api/[...slug].ts` repassa tudo pro Fastify — as rotas em `src/api/routes/` continuam normais). Drizzle ORM sobre libSQL (`@libsql/client`) — mesmo driver local (arquivo `file:./data/...`) e em produção (Turso remoto), só a URL muda via env var. Agendamento é Vercel Cron batendo em `/api/cron/ingest` uma vez por dia (protegido por `CRON_SECRET`), não mais `node-cron` em processo contínuo. zod pra validação. Scraping é ler o JSON já embutido no HTML server-rendered do ge.globo, não precisa de Playwright.
- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind 4.
- **Compartilhado** (`packages/shared/`): registro canônico de times/competições/canais (workspace npm), usado por backend e frontend — nunca duplicar essa informação localmente em um dos dois lados. Compila pra `dist/` de verdade (`npm run build`) — necessário porque o bundler de função da Vercel não importa `.ts` cru de dentro de `node_modules`. Um `postinstall` na raiz do monorepo cuida disso automaticamente, local ou em deploy.

## Convenção: interface em português, código em inglês

Todo identificador de código (variável, função, tipo, campo de API/DB, nome de arquivo) é em **inglês**. Texto exibido ao usuário (labels, headings, mensagens de erro/loading) é em **português**.

Cuidado com uma armadilha específica: "time" em português é "team" em inglês — **nunca use `time` como identificador de código**, colide com o conceito de tempo (`Date`/`setTimeout`/etc.) e já causou confusão no código antigo. URLs de rota (ex.: `/time/:nome`) são superfície de usuário, não identificador de código — podem ficar em português.

## Por que a arquitetura é essa (resumo)

Não existe API estruturada e gratuita para "que canal transmite esse jogo" no Brasil — scraping é necessário, não um erro de escolha. A estratégia: raspar um conjunto pequeno de fontes editoriais dedicadas (nunca motor de busca genérico), normalizar tudo por um único resolver de nomes (`backend/src/ingest/teamResolver.ts`), cachear em banco via job agendado, e nunca usar LLM como fonte de verdade — no máximo como auxiliar de extração sobre texto já raspado. Escudo de qualquer time (rastreado ou não) e logo de canal vêm da própria fonte (ge.globo já manda a URL), sem precisar de curadoria manual. Detalhe completo em `review.md`.

## Cuidados ao mexer no código

- Nunca hardcode API key/token — sempre via env var, validada com zod em `backend/src/config/env.ts`. O código antigo tinha isso hardcoded (`backend/app.py`) e foi um dos motivos da reescrita.
- Toda normalização de nome de time/canal passa pelo registro canônico em `packages/shared` — não crie um mapa de aliases local a um arquivo. O código antigo tinha **7 esquemas de normalização divergentes**, incluindo bugs reais de dado (Palmeiras/Santos trocados por copy-paste) — é exatamente o que essa consolidação evita repetir.
- Adapters de scraping (`backend/src/sources/*`) ficam "burros": só buscam e validam formato (zod). Resolução de nome cruzado nunca é duplicada por adapter.
- Mudou algo em `packages/shared`? Rode `npm run build --workspace=packages/shared` antes de testar backend ou frontend — eles consomem o `dist/` compilado, não o `.ts` fonte diretamente.
- Ao mexer no frontend, suba o dev server (`npm run dev`) e confira no navegador antes de dar por concluído.
- Deploy é via `vercel deploy --prod` a partir da raiz do repo (precisa estar linkado ao projeto certo — `vercel link --project ondevaipassar-api` pro backend, `--project ondevaipassar` pro front; só um projeto fica linkado por vez em `.vercel/`). **`CRON_SECRET` vive em dois lugares**: na Vercel (projeto `ondevaipassar-api`) e no segredo `CRON_SECRET` do GitHub (`gh secret set CRON_SECRET`), que o workflow do Instagram usa. Trocar um sem o outro faz o workflow tomar 401 todo dia e o Instagram parar na metade (aconteceu em 12–13/10/2026). Trocou a da Vercel? Atualize o GitHub na mesma hora e faça redeploy. Nunca commitar `.env`/tokens — variáveis de produção ficam só no painel da Vercel (`vercel env`).

## Textos que saem do sistema: sem travessões

Legendas do Instagram e o texto do Canal do WhatsApp (`backend/src/instagram/caption.ts`, `backend/src/digest/digest.ts`) **não usam travessão** (— ou –): o Sérgio os tirou. Entre o jogo e os canais vai a barra vertical (`20h *A x B* | Premiere, SporTV`), o título do digest usa `|` entre o assunto e a data, e as notas viram frase com vírgula. Texto novo que saia para fora do site segue a mesma regra, e há teste que falha se aparecer travessão.

## Contas opcionais ("Entrar com Google")

O site funciona inteiro sem conta; a conta só **sincroniza** os times e canais favoritos entre aparelhos. As preferências nascem em `localStorage` (`frontend/src/context/PreferencesProvider.tsx`) e a regra de quem vence quando aparelho e conta divergem está em `packages/shared/src/preferences.ts` (`reconcilePreferences`, três casos, com teste).

- Só Google (OAuth 2.0, fluxo de código, server-side). Sessão em tabela própria (`sessions`, guarda só o hash do token), cookie `ovp_session` HttpOnly. Rotas em `backend/src/api/routes/auth.ts`; **todas com um único segmento** depois de `/api/`, pela mesma restrição de roteamento da Vercel do `/api/cron-ingest`.
- Mutação (`PUT/POST/DELETE`) exige `Origin` na lista de `CORS_ORIGIN` (defesa de CSRF); sem `Origin` é recusada.
- Variáveis (todas opcionais, ver `backend/.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_SITE_URL`, `COOKIE_DOMAIN` (`.ondevaipassar.com` em produção). Sem as credenciais do Google o site não mostra botão de login (`/api/me` devolve `loginAvailable:false`).
- Para ligar em produção: criar um "OAuth client ID" (tipo Web application) em console.cloud.google.com, com redirect URI `https://api.ondevaipassar.com/api/auth-google-callback`, e a página de privacidade `https://ondevaipassar.com/privacidade` na tela de consentimento. `GOOGLE_CLIENT_SECRET` entra como variável **Sensitive**.
- `AUTH_DEV_LOGIN=true` liga `/api/auth-dev`, um login de teste sem Google, **só em desenvolvimento local**: a rota nem é registrada com `NODE_ENV=production`, e há teste para isso. Nunca configurar em produção.
- O que se guarda é o mínimo (id do provedor, e-mail, times, canais). Exclusão de conta apaga tudo em lote (`deleteAccount`); a página `/privacidade` descreve exatamente isso, então qualquer mudança no que é guardado exige mudar o texto.

## SEO e medição de visitas

- **Tags por página**: `packages/shared/src/seo.ts` define título/descrição/endereço de cada página (home, time, campeonato, canal, fixas). `frontend/scripts/prerender.mjs` roda no fim do `npm run build` e grava um `dist/<rota>/index.html` por página com essas tags, mais `sitemap.xml` — a Vercel serve o arquivo real antes do rewrite do SPA, então a prévia de link (WhatsApp, que não executa JavaScript) e o primeiro rastreamento do Google já vêm certos. `usePageMeta` mantém o título e as tags certos ao navegar dentro do app. Página nova do site: entra em `seo.ts` (e some do índice com `noindex` se for da pessoa, não da busca). O texto da prévia da home também está no `frontend/index.html` — mantenha os dois iguais ao mudar a cobertura do site.
- **Google Analytics 4** (`frontend/src/lib/analytics.ts`): só existe se o build tiver `VITE_GA_MEASUREMENT_ID` (variável do projeto `ondevaipassar` na Vercel; precisa de novo deploy ao mudar). Atrás de consentimento (LGPD): nada é carregado, nenhum cookie criado e nenhuma requisição ao Google antes do "Aceitar". Sinais de publicidade desligados. **Qualquer mudança no que se mede ou no tempo de retenção exige mudar `/privacidade`** (seção "Medição de visitas", hoje prometendo 14 meses — o mesmo valor tem que estar na configuração de retenção do painel do GA4).

## Seleções

- **Registro** (`packages/shared/src/nationalTeams.ts`, gerado para `TEAMS`): **todos** os países da biblioteca de escudos (227), cada um com um time masculino (`brasil`) e um feminino (`brasil_feminino`, nome "Brasil (Fem.)"). Só os **20 masculinos** de `FEATURED_MEN` (divisão `SELECOES`) e o **top 20 do ranking feminino da FIFA** de `FEATURED_WOMEN` (`SELECOES_FEMININO`, atualizar quando o ranking mudar) aparecem nas abas; os demais ficam nas divisões escondidas `SELECOES_OUTRAS` / `SELECOES_FEMININO_OUTRAS`, só para um adversário ter id e escudo (fora do sitemap). Nomes como o futebol brasileiro os usa: **Holanda** (não "Países Baixos"), Estados Unidos; variantes de grafia das fontes em `NATIONAL_NAME_ALIASES`. Competições: Copa do Mundo, Eliminatórias, Copa América, Eurocopa, Liga das Nações (UEFA e CONCACAF) e Amistosos Internacionais, masculinas e femininas (`type: "national-teams"`).
- **Escudos**: a biblioteca está em `frontend/assets-src/selecoes/<pais_em_portugues>.svg` (fora de `public/`; `ORIGEM.json` diz de onde veio cada um e quais conferir quanto a direitos). `cd backend && npx tsx scripts/import-national-crests.ts` retira as estrelas de título (`scripts/removeStars.ts`: acha as estrelas soltas de cinco pontas e as recorta com clip-path — o site não mostra estrela de título em escudo nenhum, o que também iguala o escudo masculino e o feminino; `KEEP_STARS` lista as exceções de desenho), recorta todos e grava `selecao_<id>.svg` em `frontend/public/images/times/` (e, só para os 40 em destaque, na pasta de escudos do Instagram). Argélia, Camarões e Malawi só têm PNG (aparados à mão).
- **Jogos masculinos**: OneFootball, página de cada uma das 20 seleções em destaque (`TRACKED_NATIONAL_TEAMS` em `onefootballEnrichment.ts`, ids conferidos pelo título da página), só nas competições acima; o canal vem do futnatv (`futnatvEnrichment.ts`), que só enxerga de uma semana atrás a uma semana à frente. **Femininos**: só futnatv (`femininoEnrichment.ts`), onde toda seleção vem com o sufixo " F" — ali isso é o formato, não rascunho como nos clubes. Só entra jogo em que uma das seleções **em destaque** joga.
- Seleções de base (sub-20, sub-17) não entram: `isYouthCompetitionName` as filtra.

## Imagens: o que é publicado e o que é fonte

- `frontend/public/images/` é **tudo o que o site serve** (e vai para o deploy): `times/` (escudos de clubes e `selecao_*`), `canais/` (um arquivo por canal, na extensão que `RASTER_EXTENSION` em `lib/assets.ts` indica), `campeonatos/site/` (logos recortados, mapeados em `COMPETITION_LOGOS`), `icones/` (só `escudo-cinza.svg` e `favicon-roxo.svg`), `og-image.png`. Arquivo que nenhum código referencia não fica aqui.
- `frontend/assets-src/` é **material de origem, não publicado**: `selecoes/` (biblioteca de escudos de todos os países, base do importador), `campeonatos/<categoria>/` (artes originais dos campeonatos, de onde saem os de `site/`), `canais/` (versões alternativas de logos), `marca/` (variantes do logo e dos ícones), `escudos-sem-cadastro/` (escudos de clubes que não estão no registro; se um clube entrar, é só copiar de volta para `public/images/times/`).
- Os escudos do **Instagram** ficam em cópia própria, em `backend/src/instagram/assets/crests/` (já diferem do site em vários clubes).

## Comandos

```
npm install                # na raiz — instala tudo (workspaces) e compila packages/shared via postinstall

cd backend
npm run dev                 # sobe a API local com reload automático (tsx watch), porta 3000
npm run typecheck            # tsc --noEmit
npm test                     # vitest — adapters testados contra fixtures HTML salvos em test/fixtures/, não contra a rede real

cd frontend
npm run dev                  # Vite dev server, porta 5173
npm run build                 # typecheck + build de produção
```

`backend/.env.example` e `frontend/.env.example` têm as variáveis esperadas — copie para `.env` antes de rodar local. Local usa banco em arquivo (`file:./data/...`); não precisa de conta Turso pra desenvolver, só pra produção.
