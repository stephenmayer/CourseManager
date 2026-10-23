#!/usr/bin/env bash
# Starts the API (http://localhost:8000) and the UI (http://localhost:5173) together.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
fi
if [ ! -d frontend/node_modules ]; then
  (cd frontend && npm install --no-audit --no-fund)
fi

(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT

cd frontend && npm run dev
