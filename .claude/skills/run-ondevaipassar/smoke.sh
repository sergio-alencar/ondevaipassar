#!/usr/bin/env bash
# Backend smoke test: start the API in the background, wait for it to come
# up, trigger a real ingest, and confirm real match data comes back.
# Run from the repo root. Leaves the server running — stop it yourself
# (see SKILL.md) when done, so you can keep poking it with curl afterward.
set -euo pipefail
cd "$(dirname "$0")/../../../backend"

LOG=/tmp/ondevaipassar-backend.log
echo "==> starting backend (log: $LOG)"
npm run dev > "$LOG" 2>&1 &
BACKEND_PID=$!

echo "==> waiting for http://localhost:3000/api/matches"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/matches" || true)
  [ "$code" = "200" ] && break
  sleep 1
done
if [ "$code" != "200" ]; then
  echo "!! backend never came up, last 40 lines of $LOG:"
  tail -40 "$LOG"
  exit 1
fi
echo "==> backend is up (pid $BACKEND_PID)"

echo "==> matches before ingest:"
curl -s "http://localhost:3000/api/matches" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"

echo "==> triggering /api/cron-ingest (this hits ge.globo for real, ~15-30s)"
# No auth header: backend/.env is never actually loaded by `npm run dev`
# (no dotenv, no --env-file) — CRON_SECRET in there has zero effect
# locally regardless of its value, confirmed by testing wrong/missing/
# correct auth after a clean restart: all three return 200. See
# SKILL.md's Gotchas section.
curl -s "http://localhost:3000/api/cron-ingest"
echo

echo "==> matches after ingest:"
curl -s "http://localhost:3000/api/matches" | python3 -c "
import json, sys
matches = json.load(sys.stdin)
print(f'{len(matches)} matches total')
if matches:
    m = matches[0]
    print(f'sample: {m[\"homeTeamName\"]} x {m[\"awayTeamName\"]} ({m[\"kickoffUtc\"]})')
"

echo "==> done. Backend still running (pid $BACKEND_PID, log $LOG)."
echo "    Stop it with: lsof -ti:3000 -sTCP:LISTEN | xargs -r kill"
