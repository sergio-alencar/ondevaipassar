# ondevaipassar

Agrega, para qualquer time brasileiro e qualquer campeonato (Série A/B, copas nacionais, continentais, estaduais), em que canal de TV ou serviço de streaming o próximo jogo vai passar.

**Em produção**: front em https://ondevaipassar.com, backend em https://api.ondevaipassar.com (as URLs técnicas `ondevaipassar-nine.vercel.app`/`ondevaipassar-api.vercel.app` continuam existindo como alias, mas não são mais o link canônico).

## Stack

- **Backend** (`backend/`): Node.js + TypeScript, Fastify rodando como função serverless da Vercel. Drizzle ORM sobre libSQL (local em arquivo, Turso em produção). Agendamento via Vercel Cron. Scraping lê o JSON já embutido no HTML server-rendered das fontes (ge.globo), sem headless browser.
- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind 4.
- **Compartilhado** (`packages/shared/`): registro canônico de times/competições/canais, usado por backend e frontend.

## Como rodar local

```
npm install                # na raiz — instala tudo e compila packages/shared

cd backend
npm run dev                 # API local, porta 3000
npm run typecheck
npm test

cd frontend
npm run dev                  # Vite dev server, porta 5173
npm run build                 # typecheck + build de produção
```

`backend/.env.example` e `frontend/.env.example` têm as variáveis esperadas — copie para `.env` antes de rodar local.

## Documentação

- [`CLAUDE.md`](./CLAUDE.md) — convenções de código e orientação rápida (voltado a quem/o que mexe no código, incluindo Claude Code).
- [`review.md`](./review.md) — diagnóstico do código antigo, decisões de arquitetura tomadas (com o porquê) e estado atual por fase.

## Próximos passos

Ideias e pontos já identificados para desenvolvimento futuro, ainda não priorizados:

- Incluir times da Série C.
- Incluir times selecionados da Europa (não a totalidade — curadoria, não cobertura completa).
- Integração com canal de updates no WhatsApp.
- Integração com X/Twitter.
- No Instagram, postar também em Stories (hoje só feed).
