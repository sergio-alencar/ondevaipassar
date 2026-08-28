---
name: run-ondevaipassar
description: Build, run, and drive ondevaipassar (backend API + frontend site) locally. Use when asked to start the backend or frontend dev server, trigger a real ingest, check /api/matches, run backend tests, or build the frontend.
---

Two halves, driven differently: the **backend** (Fastify API) is driven via
`curl` — start it, hit it, see JSON back. The **frontend** (Vite + React SPA)
has no interactive driver in this environment (no browser-automation tool
available here) — its agent path is build/serve verification only, not
clicking through the UI. All paths below are relative to the repo root.

## Prerequisites

None beyond Node (already on `PATH` in this environment) — no system
packages needed, no headless-browser deps, since scraping is done by reading
embedded JSON out of server-rendered HTML, not via a real browser.

## Setup

```bash
npm install   # workspaces (backend, frontend, packages/shared) + builds packages/shared via postinstall
```

`backend/.env.example` and `frontend/.env.example` list the expected vars —
copy to `.env` before running local. See **Gotchas** below though: as of
this writing, `backend/.env` is not actually loaded by `npm run dev`, so
copying it doesn't yet do anything.

## Run (agent path) — backend

The real driver: [`smoke.sh`](./smoke.sh) starts the API in the background,
waits for it to be ready, triggers a real ingest against ge.globo, and
prints match counts before/after so you can see it actually did something.

```bash
bash .claude/skills/run-ondevaipassar/smoke.sh
```

Verified output (this session, this container):

```
==> starting backend (log: /tmp/ondevaipassar-backend.log)
==> waiting for http://localhost:3000/api/matches
==> backend is up (pid 107771)
==> matches before ingest:
310
==> triggering /api/cron-ingest (this hits ge.globo for real, ~15-30s)
{"status":"ok","ranAt":"2026-08-28T17:18:30.954Z"}
==> matches after ingest:
310 matches total
sample: Goiás x São Bernardo (2026-08-28T22:30:00.000Z)
==> done. Backend still running (pid ..., log /tmp/ondevaipassar-backend.log).
    Stop it with: lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

The script leaves the server running so you can keep poking it — e.g.:

```bash
curl -s http://localhost:3000/api/matches | python3 -m json.tool | head -30
# matchId as a query param, not a path segment (single-segment route — see Gotchas):
curl -s "http://localhost:3000/api/instagram-preview?matchId=ge-globo:349357" -o /tmp/preview.png   # renders a real poster PNG
```

Stop the server:

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

### Environment

| Variable | Required locally | Notes |
|---|---|---|
| `DATABASE_URL` | No | Defaults to a local file DB — no Turso account needed for dev. |
| `CRON_SECRET` | No | Unenforced locally regardless of `.env` — see Gotchas. |
| `INSTAGRAM_DRY_RUN` | No | Set `true` to have the Instagram poster render+log instead of posting for real — but see Gotchas, `.env` isn't loaded, so this needs to be exported in the shell instead. |
| `YOUTUBE_API_KEY` | No | That enrichment step just gets skipped when unset. |

## Run (agent path) — frontend

No interactive driver here (would need `chromium-cli` or similar, not
available in this environment). What's verifiable:

```bash
cd frontend
npm run dev > /tmp/ondevaipassar-frontend.log 2>&1 &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/   # -> 200
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

For anything that needs actually *seeing* the page (layout, CSS, a visual
bug report), there is currently no way to do that from this environment —
say so explicitly rather than claiming it was checked.

## Run (human path)

```bash
cd backend && npm run dev    # http://localhost:3000, tsx watch (auto-restart on src/ changes, not on .env)
cd frontend && npm run dev   # http://localhost:5173, Vite HMR
```

## Test

```bash
cd backend
npm run typecheck   # tsc --noEmit
npm test             # vitest — adapters tested against saved HTML fixtures in test/fixtures/, no real network calls
```

Verified this session: 84 tests / 19 files, all passing.

```bash
cd frontend
npm run build   # tsc -b && vite build — typecheck + production build together, no separate frontend test suite
```

---

## Gotchas

- **Every API route is a single path segment.** `/api/instagram-preview`,
  not `/api/instagram/preview/...` — hit this live while verifying this
  skill (`/api/instagram/preview/<id>.png` 404s; `/api/instagram-preview?matchId=<id>`
  works). Locally Fastify would happily route a nested path, but production
  is a single Vercel function (`api/[...slug].ts`) whose generated route
  only matches one segment after `/api/` — so a locally-only-working nested
  path would silently 404 in production. Always check the route
  registration in `backend/src/api/routes/*.ts` for the real path rather
  than guessing from the file/feature name.
- **`backend/.env` is not actually loaded by `npm run dev`.** No `dotenv`
  dependency, no `--env-file` flag on the `tsx watch` command. Confirmed by
  testing `/api/cron-ingest` with a wrong `Authorization` header, no header,
  and the correct one from a real `.env` — all three returned `200`, even
  after a completely clean server restart. This happens to be harmless for
  `CRON_SECRET` specifically (unset is the documented, intended local
  behavior — no auth needed when curling the cron route yourself), but it
  means setting *anything* in `.env` (a real Turso `DATABASE_URL`, an
  `INSTAGRAM_ACCESS_TOKEN` to test real posting, `YOUTUBE_API_KEY`, ...) has
  **zero effect** locally — the process only ever sees whatever's actually
  `export`ed in the shell it was launched from. Worth fixing properly
  (`node --env-file=.env` in the `dev`/`start` scripts, or a `dotenv/config`
  import) rather than working around it per-session.
- **`tsx watch` doesn't restart on `.env` changes** — only on source file
  changes. Even if the loading gap above gets fixed, editing `.env` while
  the dev server is running won't pick up the new value without a manual
  restart.
- **`npm run build --workspace=packages/shared` must run from the repo
  root**, not from inside `backend/` or `frontend/` — running it from
  `backend/` fails with "No workspaces found" (npm resolves `--workspace`
  relative to the nearest `package.json` with a `workspaces` field, which is
  the root one). `cd` back to the repo root first.
- **`/api/cron-ingest` takes 15-30+ seconds** — it fetches every tracked
  team's ge.globo agenda page for real (~20+ requests), plus several
  enrichment passes after. Not a hang; just genuinely that slow. The smoke
  script's polling loop already accounts for this.
