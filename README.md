<div align="center">

# PODS

### 🧠 Predictive Order & Demand Solutions

**The AI Operating System for Supply Chains**

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

## 🎬 What PODS Is

PODS is an **AI-native supply chain intelligence platform** that transforms operational data into real-time decisions.

Instead of dashboards that only visualize metrics, PODS acts as an **operational co-pilot** — continuously analyzing inventory and logistics signals to surface risks, insights, and recommended actions.

---

## ⚡ Demo — How Teams Use PODS

```
Operator: "Why is Store 14 inventory dropping faster this week?"

PODS AI:
  • Demand increased 27% in beverages
  • Shipment delay detected (logistics route TX-3)
  • Stockout risk within 4 days

Recommended Action:
  → Trigger reorder suggestion
  → Reallocate excess inventory from Store 09
```

---

## 🧩 Core Capabilities

### 📊 Operational Intelligence
- Real-time inventory analytics with database fallback
- Department-level performance tracking
- KPI monitoring across locations
- Store-specific views and filtering

### 👥 Role-Based Access Control
Multi-tier permission system:
- **Store Manager** — Single-store view, inventory & local operations
- **Logistics Analyst** — Multi-store routes, shipment tracking, network-wide logistics
- **Regional Admin** — Regional oversight, all stores, user management
- **System Admin** — Full platform control, user provisioning, system configuration

### 🤖 AI Operations Advisor
Gemini-powered reasoning engine that:
- Understands operational context
- Explains anomalies in plain language
- Answers natural-language questions
- Recommends actionable next steps
- Falls back to database insights when AI unavailable

### ⚠️ Anomaly Detection Engine
Detects:
- Abnormal demand spikes
- Inventory inconsistencies
- Logistics disruptions
- Operational risk patterns

### 📦 Inventory & Logistics Platform
- Multi-store visibility
- Shipment monitoring
- Freight workflow insights
- Role-specific operational views

---

## 🏗 System Architecture

<div align="center">
  <img src="assets/architecture.png" alt="PODS System Architecture" width="800"/>
</div>

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express.js, TypeScript REST API |
| **Database** | PostgreSQL — transactional storage, analytical querying, anomaly history |
| **AI Layer** | Google Gemini — context-aware operational reasoning |
| **Infrastructure** | Docker, Docker Compose, Nginx reverse proxy |

---

## 🧠 Architecture Philosophy

> PODS treats AI as a **decision layer**, not a chatbot.

```
Data  →  Context  →  Reasoning  →  Recommendation
```

**Key principles:**
- AI augments workflows, not replaces systems
- Database remains source of truth
- APIs isolate intelligence from UI
- Modular services enable future ML integration

---

## 🚀 Quick Start

### Requirements

- Node.js 18+
- PostgreSQL 14+
- Gemini API key
- Docker *(optional)*

### Clone

```bash
git clone https://github.com/fulkruhm/podspro.git
cd podspro
```

### Environment Setup

**Backend `.env`**
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/pods
GEMINI_API_KEY=your_key
NODE_ENV=development
```

**Frontend `.env`**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Run Development

```bash
npm install
npm run dev
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

Access:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001/api
- **Nginx Proxy**: http://localhost (port 80)


## ✨ Recent Features & Improvements

### User Management & Provisioning
- **Store-based access control**: Store Managers automatically scoped to assigned store
- **Role-centric provisioning**: System Admin UI conditionally displays store selection only for Store Manager role
- **Audit logging**: All user provisioning actions tracked with timestamp and assignment details
- Admin and Logistics Analysts provision without store requirement

### Real-Time Data & Sync
- **Sync Live Engine**: Live data refresh button with intelligent fallback
  - Primary: Fetches from Google Gemini API when available
  - Fallback: Returns current database snapshot for operational continuity
- **Zero downtime**: System gracefully handles missing API keys

### Security Enhancements
- **Rate limiting**: /api/auth/login protected with exponential backoff
- **Server-side validation**: Zod schema validation on all user inputs
- **JWT token support**: Prepared for stateless authentication scaling
- **CORS & security headers**: Nginx configured with proper security middleware

---

## 👤 User Roles & Permissions

| Role | Stores | Inventory | Routes | Users | Chat AI | Notes |
|---|---|---|---|---|---|---|
| **Store Manager** | Single (assigned) | ✓ View | ✗ | ✗ | ✓ | Local operations focus |
| **Logistics Analyst** | All | ✓ View | ✓ Manage | ✗ | ✓ | Network-wide shipments |
| **Regional Admin** | All | ✓ View/Edit | ✓ View | ✓ Manage | ✓ | Regional oversight |
| **System Admin** | Global | ✓ Full | ✓ Full | ✓ Full | ✓ | Platform control |

**Provisioning Rules:**
- Store Manager: **Required** to select store during user creation
- All other roles: Store field **not shown** during provisioning

---

## 🔌 API Surface

**Authentication**
```
POST  /api/auth/login          — Server-side session auth with rate limiting
GET   /api/auth/validate       — JWT token validation
```

**AI Advisor**
```
POST  /api/chat/start          — Initiate AI conversation session
POST  /api/chat/message        — Send message to AI advisor
GET   /api/chat/realtime-data  — Fetch real-time inventory & logistics (with DB fallback)
```

**Anomaly Detection**
```
POST  /api/anomalies/detect    — Detect operational anomalies
```

**User Management** *(Admin/SysAdmin only)*
```
GET   /api/users               — List all users with assigned stores
POST  /api/users               — Provision new user (role-based store assignment)
PUT   /api/users/:id           — Update user role/permissions
DELETE /api/users/:id          — Deactivate user account
```

**Data**
```
GET   /api/data/products       — All products with store inventory
GET   /api/data/routes         — Logistics routes with shipment status
```

---

## 🛣 Product Roadmap

**Completed**
- [x] Server-side authentication with rate limiting
- [x] Role-based access control (4-tier permission system)
- [x] Store-based user scoping for Store Managers
- [x] Real-time data sync with database fallback
- [x] User provisioning with audit logging
- [x] Anomaly detection framework

**In Progress**
- [ ] Frontend store filtering and view isolation
- [ ] Advanced permission matrix customization
- [ ] Audit log dashboard and export

**Upcoming**
- [ ] Predictive demand forecasting
- [ ] Autonomous reorder engine
- [ ] Real-time event streaming
- [ ] Multi-tenant enterprise architecture
- [ ] AI workflow automation
- [ ] Mobile app for field operations

---

## 🧪 Engineering Standards

- Strict TypeScript throughout
- Service-layer architecture
- Environment-based configuration
- Container-first deployment

---

## 🌍 Vision

PODS aims to become the **AI operating system for physical operations**, enabling supply chains to move from reactive management to autonomous decision-making.

---

<div align="center">

**👨‍💻 Maintained by [Fulkruhm](https://github.com/fulkruhm)**

*AI-Driven Operations Intelligence*

</div>