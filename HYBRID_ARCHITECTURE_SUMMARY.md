# PODS Hybrid Architecture Summary

## Current Status

PODS runs as a hybrid Node.js + Python platform designed around clear service boundaries:

- Frontend: React + TypeScript UI served by Nginx
- Backend: Node.js + Express API for auth, orchestration, auditability, and integrations
- ML Service: Python + FastAPI microservice for anomaly detection and demand forecasting
- Data Layer: PostgreSQL for transactional and analytical persistence
- Reliability Layer: Redis for cache and BullMQ-backed forecast queueing

The current product is API-first. ML capabilities are consumed through backend and operational workflows rather than a dedicated standalone ML dashboard.

## Why The Architecture Is Hybrid

PODS separates operational application concerns from ML execution concerns.

| Concern | Primary Runtime | Why |
|---|---|---|
| Authentication, RBAC, API contracts | Node.js backend | Centralized control and fast request orchestration |
| Forecasting and anomaly inference | Python ML service | Native fit for scikit-learn, pandas, and numerical workloads |
| Forecast review, queue control, audit logging | Node.js backend | Governance, persistence, and security boundaries |
| User experience and workflow orchestration | React frontend | Operational views and role-aware workflows |

This split lets the ML service evolve independently without forcing the rest of the platform to take on Python runtime concerns.

## Runtime Topology

```text
Browser
  -> Nginx / Frontend
  -> Node.js Backend (/api/*)
      -> PostgreSQL
      -> Redis
      -> Google Gemini
      -> Python ML Service
```

### Default Local Ports

| Service | Internal Port | Local Access |
|---|---:|---|
| Frontend via Nginx | 80 | http://localhost |
| Frontend alternate mapping | 80 | http://localhost:8080 |
| Backend API | 3001 | http://localhost:3001/api |
| ML service | 5000 | http://localhost:5001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

## Service Responsibilities

### Frontend

- Authenticated application shell and role-aware navigation
- Operational views for inventory, logistics, command center, forecast governance, identity/access, and audit workflows
- Calls backend APIs through `/api` and `/api/ml`

### Backend

- Signed bearer-token authentication with refresh/logout lifecycle
- Role-aware authorization for protected workflows
- Route orchestration for auth, data, chat, ML, users, and audit domains
- OpenAPI publication at `/api/openapi.json` and `/api/v1/openapi.json`
- Forecast batch scheduling, queue monitoring, and retry flows
- Audit logging, CSV export, and digest-delivery configuration
- Cache-backed ML proxy behavior with in-memory fallback when Redis is unavailable

### ML Service

- `POST /api/ml/anomalies/detect` for anomaly detection
- `POST /api/ml/forecast` for demand forecasting with explainability
- `POST /api/ml/batch-analysis` for direct combined ML analysis
- `GET /health`, `GET /ready`, and `GET /api/ml/info` for service introspection

The Node backend is the supported gateway for application clients. The Python service remains separately callable for direct service-level testing.

## Key Operational Flows

### 1. Forecast Batch Governance

1. Admin or sysadmin triggers `POST /api/ml/forecast/batch/store-products`
2. Backend validates identity, request shape, and optional `Idempotency-Key`
3. Job is queued through BullMQ backed by Redis
4. Worker fetches historical demand/features, calls the ML service, and persists forecasts
5. Governance UI reads status from:
   - `GET /api/ml/forecast/batch/status`
   - `GET /api/ml/forecast/batch/queue`
   - `GET /api/ml/forecast/batch/failed-jobs`
   - `POST /api/ml/forecast/batch/retry`

### 2. ML Request Handling

1. Frontend sends authenticated request to backend
2. Backend validates auth and payload
3. Backend checks cache where applicable
4. Backend forwards to Python ML service
5. Response is returned to frontend and optionally persisted or audited

### 3. AI-Assisted Operations

1. User sends prompt to Decision Copilot
2. Backend applies auth, request context, and rate limits
3. Backend uses Gemini with timeout and fallback controls
4. Operational data and ML endpoints remain available even if AI degrades

## Reliability Characteristics

- Backend readiness checks database, ML service, and cache dependency state
- Redis powers queue durability and response caching; degraded fallback remains available when Redis is down
- Forecast batch execution is retryable and observable
- ML service failures do not take down core auth, data, or audit APIs
- Signed tokens and route-level authorization protect forecast governance and admin flows

## Current API Surface Highlights

### Backend Platform

- `/api/health`, `/api/ready`
- `/api/v1/health`, `/api/v1/ready`
- `/api/openapi.json`, `/api/v1/openapi.json`
- `/api/auth/*`
- `/api/chat/*`
- `/api/data/*`
- `/api/users/*`
- `/api/audit/*`

### Backend ML Gateway

- `POST /api/ml/anomalies/detect`
- `POST /api/ml/forecast`
- `POST /api/ml/forecast/batch/store-products`
- `GET /api/ml/forecast/batch/status`
- `GET /api/ml/forecast/batch/queue`
- `GET /api/ml/forecast/batch/failed-jobs`
- `POST /api/ml/forecast/batch/retry`
- `GET /api/ml/forecast/review-items`
- `POST /api/ml/forecast/review-items/:productId/:storeId/decision`
- `GET /api/ml/health`
- `GET /api/ml/info`

### Python ML Service

- `GET /health`
- `GET /ready`
- `GET /api/ml/info`
- `POST /api/ml/anomalies/detect`
- `POST /api/ml/forecast`
- `POST /api/ml/batch-analysis`

## What Changed Relative To Older Docs

- Dedicated ML visualization UI is no longer the source of truth for current architecture
- Docker local frontend access is through `http://localhost` and `http://localhost:8080`
- Redis is now a first-class runtime dependency for queueing and caching with graceful degradation
- Forecast governance is durable and observable through batch status, queue, failed-job, and retry endpoints
- Digest-delivery settings and history are now part of the audited operational workflow set
- MLflow is not part of the current shipped runtime

## Recommended Companion Docs

- `README.md` for quick start and local access
- `ML_SERVICE_API.md` for current ML endpoint behavior
- `ML_DEVELOPMENT_GUIDE.md` for extending the Python service
- `TECHNICAL_SYSTEM_HANDBOOK.md` for full-system technical reference
