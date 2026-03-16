# PODS Technical System Handbook

## 1. Purpose and Audience
This document is a full technical reference for engineers, platform teams, and maintainers working on PODS.

It covers:
- Architecture and runtime topology
- Backend/frontend/ML-service implementation details
- Security and auth model
- Data model and persistence behavior
- Queueing/caching/observability
- Forecasting and explainability behavior
- Operations, testing, and deployment

## 2. System Overview
PODS is a multi-service application with these major components:
- `frontend/`: React + TypeScript UI
- `backend/`: Node.js + Express API (TypeScript)
- `ml-service/`: Python FastAPI ML microservice
- `postgres`: primary transactional and analytical store
- `redis`: cache + BullMQ queue backend
- `mlflow`: optional experiment tracking server

Runtime flow:
1. Frontend sends authenticated requests to backend API.
2. Backend performs authz, validation, orchestration, and persistence.
3. Backend calls ML service for anomaly/forecast inference.
4. Forecast outputs and metadata are stored in PostgreSQL.
5. Queue/caching layers improve reliability and latency.

## 3. Repository Layout (Key Paths)
- `backend/src/server.ts`: API bootstrap and route mounting
- `backend/src/config/env.ts`: centralized backend runtime config
- `backend/src/db.ts`: DB connection, schema guards, persistence/query helpers
- `backend/src/routes/*.ts`: API route handlers
- `backend/src/services/*.ts`: queue, forecast batch, AI service, cache
- `backend/src/middleware/*.ts`: authz, validation, security, rate limiting
- `backend/src/openapi/spec.ts`: OpenAPI contract
- `frontend/App.tsx`: app state and view composition
- `frontend/components/*.tsx`: feature views
- `frontend/services/*.ts`: API clients and session handling
- `ml-service/config.py`: centralized ML runtime config
- `ml-service/routes.py`: ML API endpoints
- `ml-service/forecast.py`: forecasting logic and explainability generation
- `docker-compose.yml`: local/compose orchestration

## 4. Configuration Management
### 4.1 Backend config source
All backend runtime settings are centralized in:
- `backend/src/config/env.ts`

Includes validation for:
- API/auth settings
- ML/cache/queue/scheduler settings
- model selection keys (`GEMINI_*`)

### 4.2 Frontend config source
Frontend runtime constants are centralized in:
- `frontend/config/appConfig.ts`

### 4.3 ML-service config source
ML-service settings are centralized in:
- `ml-service/config.py`

Includes:
- service identity and bind settings
- CORS
- forecast runtime settings

## 5. API Surface (Backend)
Major route groups under `/api` and `/api/v1`:
- `/auth/*`
- `/chat/*`
- `/data/*`
- `/users/*`
- `/ml/*`
- `/audit/*`

Key operational endpoints:
- Health/readiness: `/health`, `/ready`
- OpenAPI: `/openapi.json`
- Queue monitor: `/ml/forecast/batch/queue`
- Failed jobs: `/ml/forecast/batch/failed-jobs`
- Retry job: `/ml/forecast/batch/retry`
- Audit logs: `/audit/logs`, `/audit/export`

## 6. Security Model
### 6.1 Authentication
- Signed bearer tokens (access + refresh)
- Token verification middleware enforces active status and revocation checks
- Refresh rotation and logout revocation supported

### 6.2 Authorization
Route-level role checks via middleware:
- `requireAuthenticatedUser`
- `requireAnyRole([...])`

Primary roles:
- `store_user`
- `logistics_user`
- `admin`
- `sysadmin`

### 6.3 Hardening
- Strict request validation with Zod schemas
- Security headers middleware
- Rate limiting middleware
- Sanitization middleware
- Audit trails for critical admin operations

## 7. Data Model and Persistence
### 7.1 Main tables
- `products`
- `product_demand_history`
- `product_demand_features`
- `product_demand_forecast`
- `ml_batch_job_runs`
- `forecast_review_decisions`
- `users`
- `auth_refresh_tokens`
- `auth_revoked_access_tokens`
- `audit_logs`

### 7.2 Forecast storage specifics
`product_demand_forecast` includes:
- forecast values per date
- confidence bounds
- explainability text
- model name (`model_name`)

### 7.3 Audit data
Audit API persists structured events with:
- action
- category
- severity
- user context
- timestamp

CSV export is provided for operational and compliance reviews.

## 8. Forecasting and ML Design
### 8.1 Inference endpoint
ML-service forecast endpoint:
- `POST /api/ml/forecast`

Input supports:
- demand history
- historical/future features
- exponential smoothing baseline forecast

### 8.2 Explainability strategy
Explainability strings are generated per forecast day and include:
- direction of trend
- variance vs trailing baseline
- confidence bounds
- feature/calendrical signals when available

## 9. Queueing and Batch Processing
### 10.1 Queue backend
- BullMQ over Redis
- idempotent batch trigger support (`Idempotency-Key`)
- retry/backoff configuration from centralized env

### 10.2 Batch flow
1. Trigger endpoint enqueues forecast batch run.
2. Worker processes store-product items.
3. Forecasts are persisted per item.
4. Batch run status is updated (`success`, `partial_success`, `failed`).

### 10.3 Observability endpoints
- queue depth and state
- failed jobs listing
- failed run retry endpoint

## 10. Caching
- Redis-backed JSON cache with in-memory fallback
- cache helpers in `backend/src/services/redisCache.ts`
- used for ML endpoint responses and dependency readiness reporting

## 11. Frontend Integration Notes
### 11.1 Auth/session
- `frontend/services/authSession.ts` handles bearer attachment and refresh retry flow

### 11.2 Action Intelligence panel
- API client: `frontend/services/auditService.ts`
- UI integration: `frontend/App.tsx`, `frontend/components/IdentityAccessView.tsx`
- supports CSV export

### 11.3 Forecast Governance admin panel
- queue monitor
- failed job retry

## 12. Deployment and Operations
### 12.1 Docker Compose services
- `postgres`
- `redis`
- `backend`
- `ml-service`
- `frontend`

### 12.2 Important runtime checks
- backend liveness/readiness
- ML-service liveness/readiness
- DB readiness
- Redis connectivity
- queue worker initialization

### 12.3 Environment handling
- Keep secrets out of VCS
- use env files and orchestrator secrets in non-local environments
- ensure production auth secret is explicitly set

## 13. Testing Strategy
Primary verification entry points:
- `npm run lint`
- `npm run test:smoke`

Smoke currently validates:
- frontend/backend type checks
- backend contract tests
- ML pytest suite

## 14. Extension Guide
### 14.1 Add a new backend route
1. Define schema in `middleware/validation.ts`.
2. Add route in `routes/`.
3. Apply authz middleware.
4. Add OpenAPI path in `openapi/spec.ts`.
5. Add tests.

### 14.2 Extend forecasting behavior
1. Implement or tune logic in `ml-service/forecast.py`.
2. Keep response schema backward compatible in `ml-service/schemas.py`.
3. Wire additional fields through backend and frontend request types if introduced.
4. Update docs and tests.

### 14.3 Add observability/metrics
- Extend readiness payloads and API endpoints.
- Persist structured data where correlation is needed.
- Ensure access control on sensitive operational endpoints.

## 15. Known Operational Considerations
- queue and cache behavior depends on Redis availability; fallback modes should be monitored.
- audit endpoints should remain role-restricted and periodically reviewed.

## 16. Recommended Next Technical Steps
- Add dedicated automated tests for `/api/audit/*` and forecast explainability persistence.
- Add dashboard-level alerting thresholds for queue failures and forecast error spikes.
- Add migration/versioning strategy for evolving forecast metadata fields.
- Add production metrics export (Prometheus/OpenTelemetry) for service SLO management.
