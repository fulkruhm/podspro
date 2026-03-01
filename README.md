<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# PODS — Predictive Order & Demand Solutions

**An AI-powered supply chain management platform built with React + Gemini**

</div>

---

## Overview

PODS is a full-featured inventory, logistics, and demand forecasting dashboard powered by Google Gemini AI. It supports multi-store operations with role-based access control, real-time data refresh, an AI advisor assistant, and anomaly detection across your supply chain.

## Features

- **Dashboard** — Live KPIs, demand forecasts, and inventory health across regions and stores
- **Inventory Management** — Browse, filter, and update product stock with department-level drill-down
- **Logistics View** — Monitor freight routes and delivery status (admin/logistics roles)
- **AI Advisor** — Chat with a Gemini-powered assistant that understands your inventory context
- **Anomaly Detection** — Automated alerts for stock anomalies across your product catalog
- **Multi-Store Filtering** — Filter by region, store, department, and status
- **Role-Based Access** — `sysadmin`, `admin`, `store_user`, `logistics_user` roles with scoped views
- **User Management** — Add, edit, lock, and audit users (sysadmin only)
- **Onboarding Flow** — Guided first-run experience for new users
- **Responsive UI** — Works on desktop and mobile with a collapsible sidebar

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **AI:** Google Gemini API (`@google/generative-ai`)
- **State:** React hooks + localStorage persistence

---

## Run Locally

**Prerequisites:** Node.js 18+

1. Clone the repo:
   ```bash
   git clone https://github.com/fulkruhm/podspro.git
   cd podspro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root:
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```
   Get your API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

---

## Run with Docker

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Build and run manually

```bash
docker build --build-arg GEMINI_API_KEY=your_api_key_here -t podspro .
docker run -p 8080:80 podspro
```

Open [http://localhost:8080](http://localhost:8080)

### Or use Docker Compose (recommended)

Make sure your `.env.local` has your `GEMINI_API_KEY`, then:

```bash
docker compose up --build
```

To stop:
```bash
docker compose down
```

---

## User Roles

| Role | Access |
|------|--------|
| `sysadmin` | Full access including user management and audit logs |
| `admin` | Dashboard, inventory, logistics, AI advisor |
| `logistics_user` | Logistics view and AI advisor |
| `store_user` | Dashboard and inventory scoped to their assigned store |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key (required) |

---

## Project Structure

```
podspro/
├── components/         # All React view components
│   ├── AssistantView   # AI Advisor chat interface
│   ├── DashboardView   # Main KPI dashboard
│   ├── InventoryView   # Product inventory management
│   ├── LogisticsView   # Freight route tracking
│   ├── LoginView       # Auth + user login
│   ├── UserManagement  # Admin user controls
│   └── ...
├── services/
│   ├── geminiService   # Gemini API integration
│   └── anomalyService  # Anomaly detection logic
├── App.tsx             # Root app with routing and state
├── Sidebar.tsx         # Navigation sidebar
├── types.ts            # TypeScript types
├── constants.tsx       # Mock data and constants
└── Dockerfile          # Docker build config
```

---

## View in AI Studio

[Open in AI Studio](https://ai.studio/apps/abfb4769-1fe2-41f0-87e0-305d86d55f04)