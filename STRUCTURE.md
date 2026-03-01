# PODS — Predictive Order & Demand Solutions

An AI-powered supply chain management platform with a **monorepo structure** containing:
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Express.js + TypeScript (Node.js API server)
- **AI Integration:** Google Gemini API for intelligent analysis

## Directory Structure

```
podspro/
├── frontend/                  # React application (Vite)
│   ├── src/
│   │   ├── components/       # React component files
│   │   ├── services/         # API client services
│   │   ├── App.tsx           # Main React app
│   │   └── index.tsx         # Entry point
│   ├── vite.config.ts        # Vite configuration
│   ├── tsconfig.json         # TypeScript config
│   ├── package.json          # Frontend dependencies
│   └── .env                  # Frontend env vars
│
├── backend/                   # Express API server
│   ├── src/
│   │   ├── server.ts         # Express server setup
│   │   ├── routes/           # API route handlers
│   │   │   ├── chatRoutes.ts
│   │   │   └── anomalyRoutes.ts
│   │   └── types.ts          # Shared TypeScript types
│   ├── services/             # Business logic
│   │   ├── geminiService.ts  # Gemini API integration
│   │   └── anomalyService.ts # Anomaly detection
│   ├── tsconfig.json         # TypeScript config
│   ├── package.json          # Backend dependencies
│   └── .env                  # Backend env vars
│
├── package.json              # Root monorepo config
├── docker-compose.yml        # Docker Compose for both services
└── Dockerfile                # Multi-stage build

```

## Project Features

- **Multi-Store Dashboard** — Real-time KPIs, inventory health, demand forecasts
- **Inventory Management** — Stock monitoring, anomaly detection, reorder optimization
- **Logistics Tracking** — Freight routes, delivery status, rate forecasting
- **AI Assistant** — Chat with Gemini-powered advisor for supply chain insights
- **Role-Based Access** — sysadmin, admin, store_user, logistics_user with scoped views
- **User Management** — Admin controls for user provisioning and access
- **Responsive UI** — Mobile-friendly design with collapsible navigation
- **Real-time Updates** — Automatic data refresh with historical trending

## Architecture

### Frontend (`/frontend`)
- **React 18** components with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **API Client Services** that call the backend REST API
  - `geminiService.ts` — Chat and realtime data endpoints
  - `anomalyService.ts` — Anomaly detection API calls

### Backend (`/backend`)
- **Express.js** REST API server written in TypeScript
- **Gemini Service** — Direct integration with Google Gemini API
- **Chat Routes** — Session management and message handling
- **Anomaly Routes** — Inventory anomaly detection endpoint
- **CORS enabled** for frontend communication

## Setup & Running

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key

### 1. Install Dependencies

```bash
# Install root + all workspace dependencies
npm install
```

### 2. Configure Environment Variables

**Frontend:** Create `frontend/.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

**Backend:** Create `backend/.env`
```env
PORT=5000
GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
```

### 3. Run Locally

**Option A: Run both services concurrently**
```bash
# From root directory
npm run dev
```

**Option B: Run separately**
```bash
# Terminal 1 - Frontend
npm run frontend:dev

# Terminal 2 - Backend
npm run backend:dev
```

Access:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api

## API Endpoints

### Chat Routes
- `POST /api/chat/start` — Initialize a new chat session
- `POST /api/chat/message` — Send message to Gemini
- `GET /api/chat/realtime-data` — Fetch AI-generated mock data
- `POST /api/chat/close` — End chat session

### Anomaly Routes
- `POST /api/anomalies/detect` — Run anomaly detection on products

## Docker Deployment

### Build & Run with Docker Compose

```bash
# Build images (includes both frontend and backend)
docker-compose build

# Run services
docker-compose up

# Access
# Frontend: http://localhost:80
# Backend: http://localhost:5000
```

Both services are deployed as separate containers with proper networking.

## Development Workflow

### Adding Features

#### New Frontend Component
1. Create in `frontend/components/`
2. Import and use in `frontend/App.tsx` or other components
3. Update types in `frontend/types.ts` if needed

#### New Backend Route
1. Create handler in `backend/src/routes/`
2. Import router in `backend/src/server.ts`
3. Register with `app.use('/api/path', router)`

#### New Service Integration
1. **Backend:** Implement in `backend/services/`
2. **Frontend:** Create API wrapper in `frontend/services/apiClient.ts`
3. Call from components

### Building for Production

```bash
# Build frontend and backend
npm run build

# Create optimized Docker images
docker-compose build
```

## Technology Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Express.js, TypeScript, Node.js |
| **AI** | Google Gemini API |
| **Dev Tools** | npm workspaces, concurrently |
| **Containers** | Docker, Docker Compose |

## Key Files

- `frontend/App.tsx` — Main React application
- `frontend/components/` — React UI components
- `backend/src/server.ts` — Express server entry point
- `backend/services/geminiService.ts` — AI integration
- `package.json` — Monorepo configuration with workspaces

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Or specify different port in backend/.env
PORT=5001
```

### Frontend can't reach backend
```bash
# Check backend is running on port 5000
# Verify VITE_API_BASE_URL in frontend/.env
# Check CORS configuration in backend/src/server.ts
```

### Missing Gemini API response
```bash
# Ensure GEMINI_API_KEY is set in backend/.env
# Check API key validity in Google Cloud console
# Check token quota and usage limits
```

## Contributing

Instructions for contributing coming soon.

## License & Support

For issues and support, open a GitHub issue or check documentation.

