#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"
echo "[smoke] Running monorepo lint"
npm run lint

echo "[smoke] Running backend contract smoke tests"
npm run test:smoke -w backend

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  echo "[smoke] Running ML tests with local venv"
  "$ROOT_DIR/.venv/bin/python" -m pytest -q "$ROOT_DIR/ml-service/tests"
else
  echo "[smoke] Local venv missing, running ML tests via Docker Compose"
  docker compose run --rm ml-service pytest -q
fi

echo "[smoke] All smoke checks passed"
