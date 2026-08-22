# ondevaipassar

Agrega, para qualquer time brasileiro e qualquer campeonato (Série A/B, copas nacionais, continentais, estaduais), em que canal de TV ou serviço de streaming o próximo jogo vai passar.

O projeto está em **reescrita completa** (arquitetura, linguagem do backend e frontend migrando pra TypeScript). Leia `review.md` antes de mexer em qualquer coisa — ele tem o diagnóstico do código antigo, as decisões tomadas e o estado atual por fase. Este arquivo (`CLAUDE.md`) é só convenção e orientação rápida.

## Stack

- **Backend** (`backend/`): Node.js + TypeScript, Fastify, Drizzle ORM sobre `better-sqlite3` (a versão estável do Drizzle ainda não tem driver para `node:sqlite`, então trocamos — ver `review.md`), `node-cron` para agendamento, zod para validação. Scraping por enquanto é feito lendo JSON já embutido no HTML server-rendered (ver fonte ge.globo abaixo) — Playwright fica reservado para se alguma fonte futura exigir JS/anti-bot de verdade.
- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind 4.
- **Compartilhado** (`packages/shared/`): registro canônico de times/competições/canais (workspace npm), usado por backend e frontend — nunca duplicar essa informação localmente em um dos dois lados.

## Convenção: interface em português, código em inglês

Todo identificador de código (variável, função, tipo, campo de API/DB, nome de arquivo) é em **inglês**. Texto exibido ao usuário (labels, headings, mensagens de erro/loading) é em **português**.

Cuidado com uma armadilha específica: "time" em português é "team" em inglês — **nunca use `time` como identificador de código**, colide com o conceito de tempo (`Date`/`setTimeout`/etc.) e já causou confusão no código antigo. URLs de rota (ex.: `/time/:nome`) são superfície de usuário, não identificador de código — podem ficar em português.

## Por que a arquitetura é essa (resumo)

Não existe API estruturada e gratuita para "que canal transmite esse jogo" no Brasil — scraping é necessário, não um erro de escolha. A estratégia: raspar um conjunto pequeno de fontes editoriais dedicadas (nunca motor de busca genérico), normalizar tudo por um único resolver de nomes (`backend/src/ingest/teamResolver.ts`), cachear em SQLite via job agendado, e nunca usar LLM como fonte de verdade — no máximo como auxiliar de extração sobre texto já raspado. Detalhe completo em `review.md`.

## Cuidados ao mexer no código

- Nunca hardcode API key — sempre via env var, validada com zod em `backend/src/config/env.ts`. O código antigo tinha isso hardcoded (`backend/app.py`) e foi um dos motivos da reescrita.
- Toda normalização de nome de time/canal passa pelo registro canônico em `packages/shared` — não crie um mapa de aliases local a um arquivo. O código antigo tinha **7 esquemas de normalização divergentes**, incluindo bugs reais de dado (Palmeiras/Santos trocados por copy-paste) — é exatamente o que essa consolidação evita repetir.
- Adapters de scraping (`backend/src/sources/*`) ficam "burros": só buscam e validam formato (zod). Resolução de nome cruzado nunca é duplicada por adapter.
- Ao mexer no frontend, suba o dev server (`npm run dev`) e confira no navegador antes de dar por concluído — o usuário pediu explicitamente para acompanhar em localhost nos checkpoints.

## Comandos

```
npm install              # na raiz — instala tudo (workspaces: backend, frontend, packages/*)

cd backend
npm run dev               # sobe a API com reload automático (tsx watch), porta 3000 por padrão
npm run typecheck          # tsc --noEmit
npm test                   # vitest — adapters testados contra fixtures HTML salvos em test/fixtures/, não contra a rede real
```

`backend/.env.example` tem as variáveis esperadas — copie para `.env` antes de rodar. Frontend ainda não migrado (Fase 2).
