# PODS Detailed Architecture Diagrams

This document provides detailed architecture visualizations for the PODS application.

## 1) System / Container Architecture

```mermaid
flowchart TB
  U1[Store Manager]
  U2[Logistics Analyst]
  U3[Regional Admin]
  U4[System Admin]
  B[Browser]

  U1 --> B
  U2 --> B
  U3 --> B
  U4 --> B

  B --> NGINX[Nginx Proxy Port 80]
  NGINX --> FE[React Frontend]
  NGINX --> API[Node API Port 3001]

  subgraph BACKEND[Node Backend]
    SEC[Security Middleware]
    CORS[Body Parser and CORS]
    RL[Rate Limiters]
    ROUTES[API Routes]
    CHAT[Gemini Chat Service]
    MLGW[ML Gateway]
    BATCH[Nightly Forecast Scheduler]
    DBS[Database Layer]
  end

  API --> SEC --> CORS --> RL --> ROUTES
  ROUTES --> CHAT
  ROUTES --> MLGW
  ROUTES --> DBS
  BATCH --> DBS
  BATCH --> MLGW

  CHAT --> GEMINI[Google Gemini]

  subgraph MLSVC[Python ML Service]
    MLR[ML Routes]
    AD[Anomaly Detection]
    FC[Demand Forecasting]
  end

  MLGW --> MLR
  MLR --> AD
  MLR --> FC

  subgraph PG[PostgreSQL]
    T1[(products)]
    T2[(demand_history)]
    T3[(demand_features)]
    T4[(demand_forecast)]
    T5[(ml_batch_job_runs)]
    T6[(forecast_review_decisions)]
    T7[(freight_routes)]
    T8[(users)]
    T9[(audit_logs)]
  end

  DBS --> PG
  MLSVC --> PG

  subgraph OPS[Docker Compose]
    SEED[Seeder]
  end
  SEED --> PG
```

## 2) Sequence Diagram — AI Chat Request Flow

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Browser as React Frontend
  participant Nginx as Nginx Proxy
  participant API as Node API (/api/chat)
  participant Session as In-Memory Session Store
  participant Gemini as Google Gemini API

  User->>Browser: Enter prompt in Assistant
  Browser->>Nginx: POST /api/chat/message
  Nginx->>API: Forward request

  API->>Session: Validate sessionId
  alt Session missing
    API-->>Browser: 404 Session not found/expired
  else Session active
    API->>API: selectModelTier(prompt)
    API->>Gemini: sendMessage(chat, prompt)

    alt Model unavailable / API key issue
      API->>Gemini: Retry with fallback model tier
    end

    alt Timeout exceeded
      API-->>Browser: 504 AI took too long
    else Success
      Gemini-->>API: AI response text
      API->>Session: Increment messageCount
      API-->>Browser: 200 { response }
    end
  end
```

## 3) Sequence Diagram — Forecast Batch Run (Admin + Scheduler)

```mermaid
sequenceDiagram
  autonumber
  actor Admin
  participant Browser as React Frontend
  participant API as Node API (/api/ml)
  participant Batch as Forecast Batch Service
  participant ML as Python ML Service
  participant DB as PostgreSQL

  alt Manual trigger by admin
    Admin->>Browser: Start batch forecast
    Browser->>API: POST /api/ml/forecast/batch/store-products
    API->>API: Validate x-user-role == admin/sysadmin
    API->>Batch: startStoreProductForecastBatch(...)
    API-->>Browser: 202 Accepted (run_id)
  else Nightly scheduler trigger
    API->>Batch: startNightlyForecastScheduler()
  end

  Batch->>DB: Read store-product historical demand/features
  loop For each eligible store-product
    Batch->>ML: POST /api/ml/forecast
    ML-->>Batch: Forecast + confidence + trend + explainability
    Batch->>DB: Persist product_demand_forecast rows
  end

  Batch->>DB: Write ml_batch_job_runs status (success/partial/failed)
  API->>DB: GET latest status for /forecast/batch/status
  API-->>Browser: Return latest_run + next_scheduled_run_at
```

## 4) Deployment View (Docker Compose Ports)

| Component | Container | Internal Port | Host Port |
|---|---|---:|---:|
| Frontend + Nginx | `pods-frontend` | 80 | 80 / 8080 |
| Node Backend | `pods-backend` | 3001 | 3001 |
| Python ML Service | `pods-ml-service` | 5000 | 5001 |
| PostgreSQL | `pods-postgres` | 5432 | 5432 |

## 5) Rendering Tips

- GitHub, GitLab, and many Markdown viewers render Mermaid blocks directly.
- In VS Code, install a Mermaid-capable Markdown preview extension for live rendering.
- For presentation decks, export Mermaid diagrams to SVG/PNG using Mermaid CLI.

## 6) C4 Level 1 — System Context

```mermaid
flowchart LR
  %% External actors
  SM[Store Manager]
  LA[Logistics Analyst]
  RA[Regional Admin]
  SA[System Admin]

  %% System of interest
  PODS[PODS Platform<br/>AI-native Supply Chain Operations]

  %% External systems
  GEM[Google Gemini API<br/>LLM Inference]

  SM -->|Monitors inventory and asks operational questions| PODS
  LA -->|Tracks routes, delays, and logistics risks| PODS
  RA -->|Reviews regional performance and governance| PODS
  SA -->|Manages users, policies, and platform operations| PODS

  PODS -->|Sends prompts and receives AI responses| GEM
```

## 7) C4 Level 2 — Container Diagram

```mermaid
flowchart TB
  %% People
  SM[Store Manager]
  LA[Logistics Analyst]
  RA[Regional Admin]
  SA[System Admin]

  %% Containers
  WEB[Web App<br/>React + TypeScript<br/>Served by Nginx]
  API[Backend API<br/>Node.js + Express + TypeScript]
  ML[ML Service<br/>Python + FastAPI + scikit-learn]
  DB[(PostgreSQL)]
  GEM[Google Gemini API]

  %% Relationships
  SM --> WEB
  LA --> WEB
  RA --> WEB
  SA --> WEB

  WEB -->|HTTPS /api/*| API
  API -->|SQL| DB
  API -->|HTTP /api/ml/* proxy| ML
  API -->|LLM prompt/response| GEM
  ML -->|Read/write model inputs & forecasts| DB
```

## 8) C4 Level 3 — Component Diagram (Node Backend)

```mermaid
flowchart TB
  %% External dependencies
  FE["Frontend - React App"]
  MLSVC["Python ML Service"]
  PG[(PostgreSQL)]
  GEM["Google Gemini API"]

  %% Backend container
  subgraph NODE["Node Backend - Express"]
    MW["Cross-cutting Middleware<br/>security headers, sanitize, CORS, rate limits"]
    AUTH["Auth Routes<br/>login/session/identity"]
    USERS["User Routes<br/>RBAC + user management"]
    DATA["Data Routes<br/>products, logistics, analytics"]
    ANOM["Anomaly Routes<br/>operational anomaly APIs"]
    CHAT["Chat Routes<br/>message + stream + session lifecycle"]
    MLGW["ML Routes Gateway<br/>forecast/anomaly proxy + batch endpoints"]
    GEMSVC["Gemini Service<br/>model tiering + timeout handling"]
    SCHED["Forecast Scheduler<br/>nightly orchestration"]
    BATCH["Forecast Batch Service<br/>store-product batch execution"]
    DBL["DB Layer<br/>query + persistence functions"]
  end

  FE --> MW
  MW --> AUTH
  MW --> USERS
  MW --> DATA
  MW --> ANOM
  MW --> CHAT
  MW --> MLGW

  CHAT --> GEMSVC --> GEM

  AUTH --> DBL
  USERS --> DBL
  DATA --> DBL
  ANOM --> DBL
  MLGW --> DBL

  MLGW --> MLSVC
  SCHED --> BATCH
  BATCH --> MLSVC
  BATCH --> DBL

  DBL --> PG
```
