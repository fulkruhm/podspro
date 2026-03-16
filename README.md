<div align="center">

# PODS

### 🧠 Predictive Order and Demand Solutions

**The AI Co-Pilot for Supply Chain Operations**

*AI-native operational intelligence for inventory, logistics, and demand prediction.*

---

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## What is PODS?

PODS is an **AI-native operational intelligence platform for supply chains** that transforms operational data into real-time decisions.

Rather than dashboards that only visualize metrics, PODS continuously analyzes operational signals across inventory and logistics networks to surface risks, insights, and recommended actions before problems escalate.

*Built for retail operators, logistics teams, and supply chain analysts managing multi-location inventory networks.*

---

## Key Features

- AI-powered operational advisor with natural language interface
- Real-time inventory intelligence across multiple locations
- Demand forecasting and anomaly detection via ML microservice
- Role-aware insights scoped to operational responsibility
- Hybrid AI + deterministic fallback for zero-downtime reliability

---

## The Problem

Modern supply chains operate reactively:

- Inventory issues are detected only after stockouts occur
- Dashboards surface data but require manual interpretation to act on
- Forecasting tools operate in silos, disconnected from live operations
- Teams spend hours analyzing data instead of acting on it

**PODS converts operational data into proactive decisions.**

---

## Vision

PODS is built to become the **AI operating system for physical operations** — enabling supply chains to shift from reactive management to autonomous, intelligent decision-making.

---

## Why PODS is Different

- **AI explains *why*, not just what** — root cause reasoning, not just anomaly flags
- **Roles embedded into intelligence** — every insight is scoped to operational responsibility
- **Hybrid AI + deterministic fallback** — Gemini powers decisions; database ensures zero downtime
- **Independently scalable ML** — Python microservice scales separately from the API layer
- **Natural language interface** — operators query the system in plain English, no SQL needed

---

## Product Preview

<div align="center">

**Dashboard — Executive Portfolio Command**
![Dashboard](assets/dashboard.png)

**AI Advisor — Natural Language Operational Intelligence**
![AI Advisor](assets/ai_advisor.png)

**Secure Login — Node Authorization**
![Login](assets/login.png)

</div>



A natural language query becomes an operational decision in seconds:

```
Operator: "Why is Store 14 inventory dropping faster this week?"

PODS AI:
  • Demand increased 27% in beverages
  • Shipment delay detected (logistics route TX-3)
  • Stockout risk within 4 days

Recommended Actions:
  → Trigger reorder suggestion
  → Reallocate excess inventory from Store 09
```

---

## Example Workflow

1. **Logistics delay detected** — Shipment on route TX-3 falls behind schedule
2. **ML service flags anomaly** — Isolation Forest identifies abnormal inventory depletion at Store 14
3. **AI explains root cause** — Gemini correlates the delay with a 27% demand spike in beverages
4. **Operator accepts recommendation** — Reorder suggestion surfaced in plain language via the AI Advisor
5. **Inventory rebalanced** — Excess stock reallocated from Store 09, stockout avoided

---

## Core Capabilities

**Operational Intelligence**
Real-time inventory analytics, department-level performance tracking, KPI monitoring across locations, and store-specific views with role-filtered data.

**AI Operations Advisor**
Powered by Google Gemini — understands operational context, explains anomalies in plain language, and recommends actionable next steps. Falls back to live database insights when AI is unavailable, ensuring zero downtime.

**ML Microservice (Python)**
A standalone FastAPI service running scikit-learn models:
- Isolation Forest for inventory anomaly detection
- Exponential smoothing with confidence intervals for demand forecasting
- Exposed via API endpoints for headless integration

**Role-Based Access Control**
Four-tier permission system scoped to operational responsibility:
- **Store Manager** — Single assigned store, inventory and local ops
- **Logistics Analyst** — Multi-store routes, shipment tracking, network logistics
- **Regional Admin** — Regional oversight, store management, user administration
- **System Admin** — Full platform control, provisioning, system configuration

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express.js, TypeScript REST API |
| **ML Service** | Python, FastAPI, scikit-learn, pandas, numpy |
| **Database** | PostgreSQL |
| **AI Layer** | Google Gemini |
| **Infrastructure** | Docker, Docker Compose, Nginx |

---

## Architecture

User requests flow through the Node.js API layer, enriched with operational context, optionally analyzed by the ML service, and persisted in PostgreSQL before responses are returned in real time.

<div align="center">

![PODS Architecture](assets/architecture.png)

</div>

PODS uses a **microservice architecture** combining Node.js and Python for their respective strengths:

```
React Frontend
      │
      ▼
Node.js Backend (Port 3001)          Python ML Service (Port 5000)
┌─────────────────────────┐          ┌──────────────────────────┐
│  • Authentication        │          │  • Anomaly Detection     │
│  • User Management       │ ───────▶ │  • Demand Forecasting    │
│  • Data APIs             │          │  • scikit-learn Models   │
│  • Gemini AI Chat        │          └──────────────────────────┘
└─────────────────────────┘
            │
            ▼
     PostgreSQL Database
```

| Concern | Rationale |
|---|---|
| Node.js for API layer | Optimized for I/O, auth, routing, REST endpoints |
| Python for ML | Native access to scikit-learn, pandas, numpy ecosystem |
| Independent services | ML scales separately for compute-intensive workloads |
| Containerized | Both services orchestrated with Docker Compose |

---

## Quick Start

### 30-Second Setup (Docker)

```bash
git clone https://github.com/fulkruhm/podspro.git
cd podspro
cp .env.example .env        # Add your Gemini API key
docker-compose up --build
```

Open **http://localhost** — you're running.

### Manual Setup

**Requirements:** Node.js 18+, PostgreSQL 14+, Google Gemini API key

**Backend `.env`**
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/pods
GEMINI_API_KEY=your_key_here
GEMINI_FAST_MODEL=gemini-3.1-pro-preview
GEMINI_PRO_MODEL=gemini-3.1-pro-preview
GEMINI_ANOMALY_MODEL=gemini-3-flash-preview
NODE_ENV=development
ML_SERVICE_URL=http://ml-service:5000
FRONTEND_URL=http://localhost:5173
AUTH_SECRET=replace_with_long_random_secret
AUTH_TOKEN_TTL_MINUTES=480
REFRESH_TOKEN_TTL_MINUTES=10080
AI_RESPONSE_TIMEOUT_MS=120000
REDIS_URL=redis://localhost:6379
BATCH_RUN_STALE_MINUTES=45
ML_ANOMALY_CACHE_TTL_SECONDS=120
ML_FORECAST_CACHE_TTL_SECONDS=300
ML_INFO_CACHE_TTL_SECONDS=600
FORECAST_BATCH_QUEUE_ATTEMPTS=3
FORECAST_BATCH_QUEUE_BACKOFF_MS=5000
FORECAST_BATCH_QUEUE_CONCURRENCY=1
FORECAST_BATCH_HOUR=2
FORECAST_BATCH_MINUTE=0
```

**ML Service `.env`**
```env
# Comma-separated CORS origins, supports '*' for fully open mode
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend `.env`**
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Note: frontend runtime configuration is currently maintained in `frontend/config/appConfig.ts`.
`VITE_API_BASE_URL` is not used by the current frontend code path.

```bash
npm install
npm run dev
```

---

## Configuration Matrix

Configuration is maintained in a single source per runtime:

- Backend: `backend/src/config/env.ts`
- Frontend: `frontend/config/appConfig.ts`
- ML Service: `ml-service/config.py`

### Backend (Node/Express)

| Variable | Default | Source of truth | Notes |
|---|---|---|---|
| `PORT` | `3001` | `backend/src/config/env.ts` | API listen port |
| `NODE_ENV` | `development` | `backend/src/config/env.ts` | `development \| test \| production` |
| `FRONTEND_URL` | unset | `backend/src/config/env.ts` | Optional extra CORS origin |
| `DATABASE_URL` | `postgresql://pods_user:pods_password@localhost:5432/pods_db` | `backend/src/config/env.ts` | Postgres connection |
| `ML_SERVICE_URL` | `http://ml-service:5000` | `backend/src/config/env.ts` | ML upstream base URL |
| `REDIS_URL` | unset | `backend/src/config/env.ts` | Enables Redis queue/cache mode |
| `AUTH_SECRET` | `pods-dev-auth-secret-change-me` | `backend/src/config/env.ts` | Must be overridden in production |
| `AUTH_TOKEN_TTL_MINUTES` | `480` | `backend/src/config/env.ts` | Access token TTL |
| `REFRESH_TOKEN_TTL_MINUTES` | `10080` | `backend/src/config/env.ts` | Refresh token TTL |
| `FORECAST_BATCH_QUEUE_ATTEMPTS` | `3` | `backend/src/config/env.ts` | BullMQ retry attempts |
| `FORECAST_BATCH_QUEUE_BACKOFF_MS` | `5000` | `backend/src/config/env.ts` | Retry backoff base delay |
| `FORECAST_BATCH_QUEUE_CONCURRENCY` | `1` | `backend/src/config/env.ts` | Worker concurrency |
| `FORECAST_BATCH_HOUR` | `2` | `backend/src/config/env.ts` | Scheduler UTC hour |
| `FORECAST_BATCH_MINUTE` | `0` | `backend/src/config/env.ts` | Scheduler UTC minute |
| `BATCH_RUN_STALE_MINUTES` | `45` | `backend/src/config/env.ts` | Running batch stale timeout |
| `ML_ANOMALY_CACHE_TTL_SECONDS` | `120` | `backend/src/config/env.ts` | Anomaly response cache TTL |
| `ML_FORECAST_CACHE_TTL_SECONDS` | `300` | `backend/src/config/env.ts` | Forecast response cache TTL |
| `ML_INFO_CACHE_TTL_SECONDS` | `600` | `backend/src/config/env.ts` | ML info response cache TTL |
| `AI_RESPONSE_TIMEOUT_MS` | unset | `backend/src/config/env.ts` | Overrides per-tier chat timeout when provided |
| `GEMINI_API_KEY` / `API_KEY` | unset | `backend/src/config/env.ts` | `GEMINI_API_KEY` preferred, falls back to `API_KEY` |
| `GEMINI_FAST_MODEL` | `gemini-3.1-pro-preview` | `backend/src/config/env.ts` | Chat fast-tier model |
| `GEMINI_PRO_MODEL` | `gemini-3.1-pro-preview` | `backend/src/config/env.ts` | Chat pro-tier model |
| `GEMINI_ANOMALY_MODEL` | `gemini-3-flash-preview` | `backend/src/config/env.ts` | Model used for anomaly analysis |

All backend runtime configuration now resolves through `backend/src/config/env.ts`.

### Frontend (React)

| Key | Default | Source of truth | Notes |
|---|---|---|---|
| `apiBaseUrl` | `/api` | `frontend/config/appConfig.ts` | Backend proxy base path |
| `mlApiBaseUrl` | `/api/ml` | `frontend/config/appConfig.ts` | ML proxy base path |
| `forecastQueueMonitorRefreshMs` | `30000` | `frontend/config/appConfig.ts` | Queue monitor auto-refresh interval |
| `forecastQueueFailedJobsLimit` | `20` | `frontend/config/appConfig.ts` | Failed jobs fetch limit |

### ML Service (FastAPI)

| Variable | Default | Source of truth | Notes |
|---|---|---|---|
| `ML_SERVICE_NAME` | `PODS ML Service` | `ml-service/config.py` | Used in health/info metadata |
| `ML_SERVICE_VERSION` | `1.0.0` | `ml-service/config.py` | Reported by info endpoint |
| `ML_SERVICE_HOST` | `0.0.0.0` | `ml-service/config.py` | Uvicorn bind host |
| `ML_SERVICE_PORT` | `5000` | `ml-service/config.py` | Uvicorn bind port |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000,http://localhost:5173` | `ml-service/config.py` | Comma-separated list or `*` |

---

## Docker Deployment

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001/api |
| Redis | redis://localhost:6379 |
| Nginx Proxy | http://localhost |

---

## API Reference

**Authentication**
```
POST  /api/auth/login         — Login with rate limiting & exponential backoff
GET   /api/auth/validate      — Validate JWT token
POST  /api/auth/refresh       — Rotate refresh token and issue new access token
POST  /api/auth/logout        — Revoke current access token + optional refresh token
```

**Platform Health**
```
GET   /api/health             — Backend liveness (process uptime and environment)
GET   /api/ready              — Backend readiness (database + ML dependency checks)
GET   /api/v1/health          — Versioned backend liveness endpoint
GET   /api/v1/ready           — Versioned backend readiness endpoint
GET   /api/openapi.json       — OpenAPI 3.0 contract (current + v1 paths)
GET   /api/v1/openapi.json    — OpenAPI 3.0 contract (versioned access)
GET   /health                 — ML service liveness endpoint
GET   /ready                  — ML service readiness endpoint
```

**AI Advisor**
```
POST  /api/chat/start         — Initiate AI conversation session
POST  /api/chat/message       — Send message to AI advisor
GET   /api/chat/realtime-data — Fetch live inventory & logistics data
```

**ML Service**
```
POST  /api/ml/anomalies/detect  — Run Isolation Forest anomaly detection
POST  /api/ml/forecast          — Generate demand forecast with confidence intervals
POST  /api/ml/forecast/batch/store-products — Queue durable forecast batch run (admin/sysadmin)
GET   /api/ml/forecast/batch/queue          — Queue depth/health metrics (admin/sysadmin)
GET   /api/ml/forecast/batch/failed-jobs    — Failed queue jobs for diagnostics (admin/sysadmin)
POST  /api/ml/forecast/batch/retry          — Retry failed run by run_id (admin/sysadmin)
GET   /api/ml/health            — ML service health check
GET   /api/ml/info              — Service capabilities and model info
```

`POST /api/ml/forecast/batch/store-products` supports optional `Idempotency-Key` header for deduplicating repeated trigger requests.

All backend APIs are now available under both unversioned and versioned paths:

```
/api/...     (existing)
/api/v1/...  (new, versioned)
```

Authenticated backend routes enforce role-aware access using request headers:

```
Authorization: Bearer <signed_token_from_/api/auth/login>
```

Sensitive endpoints (for example `/api/users/*` and ML forecast batch/review endpoints) now reject missing, invalid, expired, or unauthorized tokens with `401/403`.

**User Management** *(Admin only)*
```
GET    /api/users           — List users with store assignments
POST   /api/users           — Provision new user
PUT    /api/users/:id       — Update role or permissions
DELETE /api/users/:id       — Deactivate account
```

**Data**
```
GET  /api/data/products     — Products with store-level inventory
GET  /api/data/routes       — Logistics routes and shipment status
```

---

## Permissions Matrix

| Role | Stores | Inventory | Routes | Users | AI Chat |
|---|---|---|---|---|---|
| Store Manager | Assigned only | View | — | — | ✓ |
| Logistics Analyst | All | View | Manage | — | ✓ |
| Regional Admin | All | View / Edit | View | Manage | ✓ |
| System Admin | Global | Full | Full | Full | ✓ |

---

## Reliability

PODS is designed to stay operational under degraded conditions.

**Graceful AI Degradation** — When the Gemini API is unavailable, the system automatically falls back to live database snapshots. Operators never face a broken experience.

**Health Monitoring** — Backend now exposes both `/api/health` and `/api/ready`. Readiness verifies both database and ML service availability before reporting ready.

Readiness now also reports cache dependency state (`redis`, `memory`, or `degraded`) so operators can detect Redis outages without impacting core service availability.

**Structured Logging** — Request lifecycle logs now include request IDs and timing metadata in both Node.js and Python services, enabling correlation across service boundaries.

**ML Service Isolation** — The Python microservice fails independently. A crash or overload in the ML layer does not affect core inventory, auth, or AI chat functionality.

**Redis-Backed ML Cache** — ML anomaly detection and non-persistent forecasts are cached at the backend layer using Redis (with in-memory fallback), reducing repeated model inference latency and backend-to-ML traffic.

**Durable Forecast Queue** — Store-product forecast batch runs are now enqueued in Redis via BullMQ with retry/backoff semantics and worker-based execution. This prevents dropped jobs during API restarts and supports idempotent trigger handling.

---

## Engineering Standards

PODS is built with production reliability and maintainability as first-class concerns.

**Type Safety** — Strict TypeScript enforced across both frontend and backend, eliminating runtime type errors and improving IDE-driven development.

**Service-Layer Architecture** — Business logic is cleanly separated from routing and data access layers, making each component independently testable and replaceable.

**Input Validation** — All API inputs validated server-side using Zod schemas, ensuring malformed or malicious payloads are rejected before reaching business logic.

Validation schemas are strict (`additionalProperties: false` behavior), so unknown request fields are rejected with explicit validation details.

**Security** — Login endpoint protected with rate limiting and exponential backoff. CORS policies and security headers enforced at the Nginx layer.

**Configuration Management** — All environment-specific values externalized via `.env` files, keeping secrets out of source control and enabling clean dev/staging/prod parity.

**Container-First Deployment** — Every service containerized and orchestrated with Docker Compose, ensuring consistent, reproducible environments from local development to production.

---

## Smoke Checks

Run a CI-aligned smoke suite locally:

```bash
npm run test:smoke
```

This executes linting, backend API contract tests, and ML-service tests (local `.venv` if available, Docker Compose fallback otherwise).

**Testing Strategy** — Service-layer unit tests and API validation ensure predictable behavior across releases.

---

## Roadmap

**Completed**
- [x] JWT authentication with rate-limited login
- [x] 4-tier role-based access control
- [x] Store-scoped access for Store Managers
- [x] Real-time data sync with database fallback
- [x] User provisioning with audit logging
- [x] Anomaly detection — Isolation Forest (API)
- [x] Demand forecasting — Exponential Smoothing (API)
- [x] Python ML microservice (FastAPI + scikit-learn)
- [x] Hybrid Node.js + Python architecture
- [x] Core inventory and logistics management

**In Progress**
- [ ] ML model versioning and A/B testing (MLflow)
- [ ] Advanced time series forecasting (Prophet, ARIMA)
- [ ] Audit log dashboard and export

**Upcoming**
- [ ] Autonomous reorder engine with anomaly-triggered alerts
- [ ] Real-time event streaming via WebSockets
- [ ] Mobile app for field operations
- [ ] Multi-tenant enterprise architecture

---

## Design Principles

- Operational decisions over dashboards
- Explainability before automation
- Graceful degradation over hard failure
- AI as augmentation, not replacement

---

## Status

Active development — production-oriented architecture with ongoing feature expansion.

---

## Contributing

Currently maintained by the core team. Issues, bug reports, and feature discussions are welcome — open an issue or start a discussion on GitHub.

---

<div align="center">

**👨‍💻 Maintained by [Fulkruhm](https://github.com/fulkruhm)**

MIT License · *AI-Driven Operations Intelligence*

</div>