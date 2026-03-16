# Developer Onboarding

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker + Docker Compose

## First-Time Setup

1. Install JS dependencies: `npm install`
2. Install pre-commit: `python3 -m pip install pre-commit && pre-commit install`
3. Start local stack: `docker compose up --build`
4. Run baseline checks:
   - `npm run lint`
   - `npm run test:smoke`

## Project Layout

- `frontend/`: React + Vite + TypeScript
- `backend/`: Express + TypeScript API
- `ml-service/`: FastAPI + Python ML logic

## Quality Gates

- Type/lint: `npm run lint`
- Phase-2 module tightening checks: `npm run lint:phase2`
- Formatting: `npm run format:check`
- Security scans: `npm run security:npm`, `npm run security:pip`

## Common Commands

- Frontend dev: `npm run dev -w frontend`
- Backend dev: `npm run dev -w backend`
- Full dev: `npm run dev`
- ML tests: `docker compose run --rm ml-service pytest -q`

## Production Deploy Variables (GitLab)

For GitLab `deploy_gcp`, set CI/CD variables so Cloud Run points to GCP-managed services, not local Docker.

- Required:
  - `ENABLE_GCP_DEPLOY=true`
  - `GCP_PROJECT_ID`
  - `GCP_SERVICE_ACCOUNT_KEY`
  - `DATABASE_URL` (production Postgres URL)
  - `AUTH_SECRET` (24+ chars)
  - `ML_SERVICE_URL` (reachable URL for ML service)
- Optional:
  - `REDIS_URL` (production Redis URL; if omitted, backend falls back to in-memory cache)

Example production values:

- `DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>`
- `REDIS_URL=redis://<host>:6379`
- `ML_SERVICE_URL=https://<ml-service-url>`

Local Docker values in `docker-compose.yml` are only for local environment and do not affect Cloud Run unless explicitly passed as deploy env vars.
