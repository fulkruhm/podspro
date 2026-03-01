<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# PODS — Predictive Order & Demand Solutions

**An AI-powered supply chain management platform with React Frontend + Express Backend**

</div>

---

## Overview

PODS is a full-featured, production-ready supply chain platform with:
- **React Frontend** (Vite, TypeScript, Tailwind)
- **Express Backend** (Node.js, TypeScript)
- **Google Gemini AI** integration for intelligent analysis
- **Monorepo structure** for easy deployment and development

It supports multi-store operations with role-based access control, real-time data, an AI advisor assistant, and automated anomaly detection.

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

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **Recharts** for data visualization

### Backend
- **Express.js** REST API
- **TypeScript** for type safety
- **Google Gemini API** for AI capabilities
- **CORS** enabled for frontend communication

---

## Project Structure

```
.
├── frontend/           # React application
│   ├── components/    # React components
│   ├── services/      # API client services
│   ├── App.tsx
│   └── package.json
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   └── server.ts
│   └── package.json
├── docker-compose.yml
└── package.json       # Root monorepo
```

For detailed structure, see [STRUCTURE.md](./STRUCTURE.md)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone and install:**
   ```bash
   git clone https://github.com/fulkruhm/podspro.git
   cd podspro
   npm install
   ```

2. **Configure environment:**
   
   `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

   `backend/.env`:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_api_key_here
   NODE_ENV=development
   ```

3. **Run development servers:**
   ```bash
   npm run dev
   ```
   
   Or run separately:
   ```bash
   npm run frontend:dev   # Terminal 1
   npm run backend:dev    # Terminal 2
   ```

4. **Open browser:**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000/api

### Docker Deployment

```bash
docker-compose up --build
```

Access:
- Frontend: http://localhost:80 (or :8080)
- Backend API: http://localhost:5000

---

## Development

### Build for Production

```bash
npm run build
```

This builds both frontend (optimized React bundle) and backend (compiled TypeScript).

### Running Tests

```bash
npm run lint
```

### Adding Features

See [STRUCTURE.md](./STRUCTURE.md) for guidance on adding components, routes, and services.

---

## API Endpoints

### Chat
- `POST /api/chat/start` — Start new chat session
- `POST /api/chat/message` — Send message to AI
- `GET /api/chat/realtime-data` — Fetch AI-generated data
- `POST /api/chat/close` — Close session

### Anomalies  
- `POST /api/anomalies/detect` — Detect inventory anomalies

---

## Login Credentials (Demo)

Available demo users are pre-populated. Check `frontend/components/LoginView.tsx` for details.

---

## Troubleshooting

**Backend won't start:**
```bash
lsof -i :5000  # Check if port is in use
```

**Frontend can't reach backend:**
- Ensure `VITE_API_BASE_URL` is set correctly
- Verify backend is running
- Check CORS errors in browser console

**Gemini API errors:**
- Verify API key in `backend/.env`
- Check quota in Google Cloud Console

---

## Contributing

Contributions welcome! Please open an issue or pull request.

## License

LICENSE TBD


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