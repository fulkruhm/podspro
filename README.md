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
- Real-time inventory analytics
- Department-level performance tracking
- KPI monitoring across locations

### 🤖 AI Operations Advisor
Gemini-powered reasoning engine that:
- Understands operational context
- Explains anomalies in plain language
- Answers natural-language questions
- Recommends actionable next steps

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

```
                React Analytics UI
                        │
                        ▼
                Node.js API Layer
                        │
        ┌───────────────┴───────────────┐
        │                               │
   AI Intelligence Layer          Business Services
   (Gemini Reasoning)            Inventory / Logistics
        │                               │
        └───────────────┬───────────────┘
                        ▼
                  PostgreSQL
              Operational Data Core
```

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

---

## 🔌 API Surface

**AI Advisor**
```
POST  /api/chat/start
POST  /api/chat/message
GET   /api/chat/realtime-data
```

**Anomaly Detection**
```
POST  /api/anomalies/detect
```

---

## 🛣 Product Roadmap

- [ ] Predictive demand forecasting
- [ ] Autonomous reorder engine
- [ ] Real-time event streaming
- [ ] Multi-tenant enterprise architecture
- [ ] AI workflow automation

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