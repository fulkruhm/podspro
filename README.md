<div align="center">

# PODS

### 🧠 Predictive Order & Demand Solutions

**The AI Co-Pilot for Supply Chain Operations**

*AI-native operational intelligence for inventory, logistics, and demand prediction.*

---

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## What is PODS?

PODS is an **AI-native supply chain intelligence platform** that transforms operational data into real-time decisions.

Rather than dashboards that only visualize metrics, PODS acts as an **operational co-pilot** — continuously analyzing inventory and logistics signals to surface risks, insights, and recommended actions before problems escalate.

---

## AI Advisor in Action

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

### Requirements

- Node.js 18+
- PostgreSQL 14+
- Google Gemini API key
- Docker *(optional, for containerized deployment)*

### Setup

```bash
git clone https://github.com/fulkruhm/podspro.git
cd podspro
```

**Backend `.env`**
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/pods
GEMINI_API_KEY=your_key_here
NODE_ENV=development
```

**Frontend `.env`**
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

```bash
npm install
npm run dev
```

---

## Docker Deployment

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001/api |
| Nginx Proxy | http://localhost |

---

## API Reference

**Authentication**
```
POST  /api/auth/login         — Login with rate limiting & exponential backoff
GET   /api/auth/validate      — Validate JWT token
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
GET   /api/ml/health            — ML service health check
GET   /api/ml/info              — Service capabilities and model info
```

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
- [ ] Advanced permission matrix customization

**Upcoming**
- [ ] Autonomous reorder engine with anomaly-triggered alerts
- [ ] Real-time event streaming via WebSockets
- [ ] Mobile app for field operations
- [ ] Multi-tenant enterprise architecture

---

## Engineering Standards

PODS is built with production reliability and maintainability as first-class concerns.

**Type Safety** — Strict TypeScript enforced across both frontend and backend, eliminating runtime type errors and improving IDE-driven development.

**Service-Layer Architecture** — Business logic is cleanly separated from routing and data access layers, making each component independently testable and replaceable.

**Input Validation** — All API inputs are validated server-side using Zod schemas, ensuring malformed or malicious payloads are rejected before reaching business logic.

**Security** — Login endpoint protected with rate limiting and exponential backoff. CORS policies and security headers enforced at the Nginx layer.

**Configuration Management** — All environment-specific values are externalized via `.env` files, keeping secrets out of source control and enabling clean dev/staging/prod parity.

**Container-First Deployment** — Every service is containerized and orchestrated with Docker Compose, ensuring consistent, reproducible environments from local development to production.

---

## Vision

PODS is built to become the **AI operating system for physical operations** — enabling supply chains to shift from reactive management to autonomous, intelligent decision-making.

---

<div align="center">

**👨‍💻 Maintained by [Fulkruhm](https://github.com/fulkruhm)**

MIT License · *AI-Driven Operations Intelligence*

</div>