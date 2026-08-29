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
- Deploy é via `vercel deploy --prod` a partir da raiz do repo (precisa estar linkado ao projeto certo — `vercel link --project ondevaipassar-api` pro backend, `--project ondevaipassar` pro front; só um projeto fica linkado por vez em `.vercel/`). Nunca commitar `.env`/tokens — variáveis de produção ficam só no painel da Vercel (`vercel env`).

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
