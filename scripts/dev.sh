#!/usr/bin/env bash
# Runs the API and the web app together; Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

export API_PORT="${API_PORT:-8000}"
export WEB_PORT="${WEB_PORT:-5173}"

(cd backend && exec uv run uvicorn app.main:app --reload --host 127.0.0.1 --port "$API_PORT") &
api=$!
(cd frontend && exec npm run --silent dev) &
web=$!
trap 'kill $api $web 2>/dev/null || true' EXIT INT TERM

echo "API: http://127.0.0.1:$API_PORT/api/health   App: http://localhost:$WEB_PORT"
wait -n
