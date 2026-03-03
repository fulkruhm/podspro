# PODS ML Service API Documentation

## Status: API-Only (Frontend UI Removed)

**Note**: ML visualization frontend components have been removed (March 1, 2026). The Python FastAPI backend service remains fully operational and all API endpoints are accessible via the Node.js backend gateway.

## Overview

PODS uses a **hybrid architecture** with a **Python FastAPI microservice** for ML/AI capabilities:

```
┌─────────────────────────────────────────────┐
│         React Frontend (Port 5173)          │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│    Node.js Backend API (Port 3001)          │
│  - Authentication & Session Management      │
│  - User Management & RBAC                   │
│  - Data Management (Products, Routes)       │
│  - Real-time Chat with Gemini               │
│  - ML Service Gateway                       │
└────────────────┬────────────────────────────┘
                 │
         ┌───────▼────────┐
         │                │
         ▼                ▼
    PostgreSQL      Python ML Service
   (Port 5432)    (FastAPI, Port 5000)
                  - Anomaly Detection
                  - Demand Forecasting
                  - Statistical Analysis
```

## Why Hybrid Architecture?

| Aspect | Node.js Backend | Python ML Service |
|--------|---|---|
| **Strengths** | Fast, lightweight, HTTP APIs | Rich ML library ecosystem, data science tools |
| **Use Cases** | Auth, routing, user mgmt | TensorFlow, scikit-learn, pandas, numpy |
| **Scalability** | Horizontal scaling easy | Vertical scaling with GPU support |
| **Integration** | 3rd party APIs, Gemini | ML pipelines, advanced models |

## Python ML Service Endpoints

All ML endpoints are accessed through the Node.js gateway at `/api/ml/*`

### Health Check

**Endpoint:** `GET /api/ml/health`

**Response:**
```json
{
  "status": "healthy",
  "mlService": {
    "status": "healthy",
    "service": "PODS ML Service",
    "timestamp": "2026-03-01T12:00:00.000Z"
  }
}
```

---

### Service Info

**Endpoint:** `GET /api/ml/info`

**Response:**
```json
{
  "service": "PODS ML Service",
  "version": "1.0.0",
  "capabilities": [
    "Anomaly Detection (Isolation Forest)",
    "Demand Forecasting (Exponential Smoothing)",
    "Batch Analysis",
    "Ready for: TensorFlow, PyTorch, MLFlow integration"
  ],
  "libraries": {
    "scikit-learn": "Anomaly detection, preprocessing",
    "pandas": "Data manipulation",
    "numpy": "Numerical computing",
    "fastapi": "REST API framework"
  }
}
```

---

### Anomaly Detection

**Endpoint:** `POST /api/ml/anomalies/detect`

Detects anomalies in inventory data using **Isolation Forest** algorithm.

**Request Body:**
```json
{
  "datapoints": [
    {
      "timestamp": "2026-03-01T10:00:00Z",
      "product_id": "PRODUCT_001",
      "store_id": "STORE_001",
      "current_stock": 150,
      "avg_daily_demand": 25.5
    },
    {
      "timestamp": "2026-03-02T10:00:00Z",
      "product_id": "PRODUCT_001",
      "store_id": "STORE_001",
      "current_stock": 125,
      "avg_daily_demand": 25.5
    }
  ],
  "sensitivity": 0.05
}
```

**Response:**
```json
[
  {
    "product_id": "PRODUCT_001",
    "store_id": "STORE_001",
    "is_anomaly": false,
    "anomaly_score": 0.23,
    "reason": "Normal inventory levels",
    "recommended_action": "Continue monitoring"
  },
  {
    "product_id": "PRODUCT_002",
    "store_id": "STORE_001",
    "is_anomaly": true,
    "anomaly_score": 0.87,
    "reason": "Stock level (5) critically low (avg: 85.0)",
    "recommended_action": "⚠️ Trigger emergency reorder"
  }
]
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `datapoints` | Array | Required | List of inventory data points |
| `sensitivity` | Float | 0.05 | Anomaly threshold (0.0-1.0) |
| `timestamp` | DateTime | Required | ISO 8601 timestamp |
| `product_id` | String | Required | Product identifier |
| `store_id` | String | Required | Store location identifier |
| `current_stock` | Integer | Required | Current inventory level |
| `avg_daily_demand` | Float | Required | Average daily demand rate |

**Anomaly Detection Rules:**

- **Stock Too Low:** `current_stock < avg_stock * 0.5` → Emergency reorder
- **Stock Too High:** `current_stock > avg_stock * 2.0` → Consider promotional campaign
- **Demand Surge:** `avg_daily_demand > avg_demand * 1.5` → Increase replenishment
- **General Anomaly:** Isolation Forest anomaly score > threshold → Investigate pattern

---

### Demand Forecasting

**Endpoint:** `POST /api/ml/forecast`

Forecasts future demand using **exponential smoothing** with trend analysis.

**Request Body:**
```json
{
  "product_id": "PRODUCT_001",
  "store_id": "STORE_001",
  "historical_demand": [20, 22, 19, 25, 23, 21, 24, 22, 26, 25],
  "historical_features": [
    { "feature_date": "2026-03-01", "promo_flag": false, "holiday_flag": false, "weather_index": 0.98 },
    { "feature_date": "2026-03-02", "promo_flag": true, "holiday_flag": false, "weather_index": 1.05 }
  ],
  "future_features": [
    { "feature_date": "2026-03-03", "promo_flag": true, "holiday_flag": false, "weather_index": 1.07 },
    { "feature_date": "2026-03-04", "promo_flag": false, "holiday_flag": true, "weather_index": 0.96 }
  ],
  "forecast_days": 7
}
```

**Response:**
```json
{
  "product_id": "PRODUCT_001",
  "store_id": "STORE_001",
  "forecast": [24.2, 24.5, 24.8, 25.1, 25.4, 25.7, 26.0],
  "confidence_interval": [12.5, 37.2],
  "trend": "📈 Increasing",
  "explainability": [
    "D+1: increasing trend, +4% vs last-7-day baseline, confidence 12-37.",
    "D+2: increasing trend, +5% vs last-7-day baseline, confidence 12-37."
  ]
}
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `product_id` | String | Required | Product identifier |
| `store_id` | String | Required | Store location |
| `historical_demand` | Array[Float] | Required | Last 30-60 days of demand (minimum 3 points) |
| `historical_features` | Array[Object] | Optional | Per-day feature flags aligned to `historical_demand` |
| `future_features` | Array[Object] | Optional | Per-day feature flags for forecast horizon |
| `forecast_days` | Integer | 7 | Number of days to forecast |

Feature object fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `feature_date` | String (YYYY-MM-DD) | Optional | Date used for calendar covariates |
| `promo_flag` | Boolean | `false` | Promotion active for the day |
| `holiday_flag` | Boolean | `false` | Holiday/event day indicator |
| `weather_index` | Float | `1.0` | Relative weather impact factor |

**Forecasting Method:**

- **Algorithm:** Exponential Smoothing (α=0.3)
- **Trend:** Linear regression on historical data
- **Feature Effects:** Applies promo/holiday/weather adjustments from feature vectors
- **Calendar Effects:** Uses `feature_date` to model day-of-week, day-of-month, and week-of-year seasonality
- **Confidence:** 95% confidence interval using standard deviation
- **Trend Labels:** "📈 Increasing", "📉 Decreasing", "➡️ Stable"

---

### Batch Analysis

**Endpoint:** `POST /api/ml/batch-analysis`

Run both anomaly detection and forecasting in a single request for efficiency.

**Request Body:**
```json
{
  "anomalies_request": {
    "datapoints": [
      {
        "timestamp": "2026-03-02T10:00:00Z",
        "product_id": "PRODUCT_001",
        "store_id": "STORE_001",
        "current_stock": 125,
        "avg_daily_demand": 25.5
      }
    ],
    "sensitivity": 0.05
  },
  "forecasts": [
    {
      "product_id": "PRODUCT_001",
      "store_id": "STORE_001",
      "historical_demand": [20, 22, 19, 25, 23, 21, 24, 22, 26, 25],
      "forecast_days": 7
    }
  ]
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "product_id": "PRODUCT_001",
      "store_id": "STORE_001",
      "is_anomaly": false,
      "anomaly_score": 0.23,
      "reason": "Normal inventory levels",
      "recommended_action": "Continue monitoring"
    }
  ],
  "forecasts": [
    {
      "product_id": "PRODUCT_001",
      "store_id": "STORE_001",
      "forecast": [24.2, 24.5, 24.8, 25.1, 25.4, 25.7, 26.0],
      "confidence_interval": [12.5, 37.2],
      "trend": "📈 Increasing"
    }
  ]
}
```

---

## Integration with Node.js Backend

The Node.js backend (`mlRoutes.ts`) acts as a **gateway** to the Python service:

### Usage in Node.js Code

```typescript
import { mlRouter } from './routes/mlRoutes.js';

// Already integrated in server.ts
app.use('/api/ml', mlRouter);
```

### Direct Python Access (Optional)

For debugging or advanced use cases, you can call the Python service directly:

```bash
curl -X POST http://ml-service:5000/api/ml/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{
    "datapoints": [...],
    "sensitivity": 0.05
  }'
```

---

## Frontend ML Insights Dashboard

### 🎨 Components Overview

The React frontend includes three visualization components for ML insights:

#### 1. **MLDashboard** (`frontend/components/MLDashboard.tsx`)
- Main dashboard container with 3-tab interface
- **Tab 1: Anomaly Scanner** - Real-time anomaly detection with adjustable sensitivity
- **Tab 2: Demand Forecaster** - Interactive demand forecasting with product selector
- **Tab 3: Service Status** - ML service health monitoring
- Auto-refresh capability (optional)
- Role-based access (admin, logistics_user, sysadmin only)

#### 2. **AnomalyVisualization** (`frontend/components/AnomalyVisualization.tsx`)
Anomaly detection scanner with:
- Adjustable sensitivity slider (1-20%)
- "Scan Now" button for real-time detection
- Severity-based color coding:
  - 🔴 **Critical (Red):** Anomaly score > 0.8
  - 🟡 **Warning (Yellow):** Anomaly score 0.5-0.8
  - 🔵 **Info (Blue):** Anomaly score < 0.5
- Anomaly score progress bar
- Root cause analysis showing reason (e.g., "Stock level critically low")
- Actionable recommendations (emergency reorder, promotion, etc.)
- "All systems normal" message when no anomalies detected

#### 3. **ForecastVisualization** (`frontend/components/ForecastVisualization.tsx`)
Advanced demand forecasting with:
- Product selector dropdown
- Forecast period selector (7/14/30 days)
- **Interactive Area Chart:**
  - Blue line: Forecast predictions
  - Light blue shade: Confidence interval (upper/lower bounds)
  - Powered by Recharts
- **Summary Cards:**
  - Trend (📈 Increasing, 📉 Decreasing, ➡️ Stable)
  - Average Demand
  - Confidence Range
- **Detail Table:** Day-by-day forecast breakdown

### 📡 ML Service Client (`frontend/services/mlService.ts`)

TypeScript API client for communicating with ML endpoints:

```typescript
// Detect anomalies with adjustable sensitivity
const anomalies = await detectAnomalies(datapoints, sensitivity);

// Forecast future demand
const forecast = await forecastDemand({
  product_id: "PRODUCT_001",
  store_id: "STORE_001",
  historical_demand: [...],
  forecast_days: 7
});

// Check ML service health
const health = await checkMLHealth();

// Run combined analysis (anomalies + forecast)
const results = await runBatchAnalysis(params);
```

### 🔗 Frontend → Backend → Python Flow

```
React Component (MLDashboard)
        ↓
TypeScript Client (mlService.ts)
        ↓ /api/ml/anomalies/detect
Node.js Backend (mlRoutes.ts)
        ↓
Python FastAPI Service
        ↓
Anomaly Detection (Isolation Forest)
        ↓
Response JSON → Visualization
```

### 📊 Using the Dashboard

**Access:** Navigate to **ML Insights** tab in sidebar (🧠 icon)

**Supported User Roles:**
- ✅ System Admin (sysadmin)
- ✅ Logistics User (logistics_user)
- ✅ Admin (admin)
- ❌ Store User (store_user) - Dashboard hidden

**Features by Tab:**

| Tab | Use Case | Input |
|---|---|---|
| **Anomalies** | Find inventory/demand outliers | Sensitivity slider (auto-fetches data) |
| **Forecasting** | Plan inventory levels | Product + Period selection |
| **Status** | Monitor ML service health | Real-time health endpoint |

### 💻 Example Integration Code

```typescript
// In a React component:
import { detectAnomalies } from '../services/mlService';

function MyComponent() {
  const [anomalies, setAnomalies] = useState([]);
  
  const handleScan = async (sensitivity: number) => {
    const results = await detectAnomalies(products, sensitivity);
    setAnomalies(results);
  };
  
  return (
    <button onClick={() => handleScan(0.05)}>
      Scan for Anomalies
    </button>
  );
}
```

---

## Error Handling

### Service Unavailable

If the ML service is offline or unreachable:

**Status:** 503

**Response:**
```json
{
  "error": "ML service unavailable",
  "message": "Connection refused (development only)"
}
```

### Invalid Request

**Status:** 400

**Response:**
```json
{
  "error": "Invalid datapoints"
}
```

### ML Processing Error

**Status:** 500

**Response:**
```json
{
  "error": "Anomaly detection failed",
  "details": "Insufficient data points (development only)"
}
```

---

## Performance Characteristics

| Operation | Time | Notes |
|---|---|---|
| **Anomaly Detection** | ~50-100ms | ~100 data points, Isolation Forest |
| **Forecasting** | ~20-50ms | 7-day forecast, exponential smoothing |
| **Batch Analysis** | ~100-200ms | Both operations combined |

---

## Future Expansion

The Python service is pre-configured for:

### Coming Soon
- **TensorFlow Integration** - Deep learning models for advanced forecasting
- **PyTorch Support** - Custom neural networks for demand prediction
- **MLflow Tracking** - Model versioning and experimentation
- **Optuna** - Hyperparameter optimization
- **Advanced Time Series** - ARIMA, Prophet, LSTM models

### Installation (when ready)

```bash
# Add to ml-service/requirements.txt:
tensorflow==2.15.0
torch==2.1.1
mlflow==2.9.1
optuna==3.15.0
prophet==1.1.5
```

---

## Deployment

### Docker Compose

```yaml
ml-service:
  build:
    context: ./ml-service
    dockerfile: Dockerfile
  container_name: pods-ml-service
  ports:
    - "5000:5000"
  environment:
    - DATABASE_URL=postgresql://...
  depends_on:
    postgres:
      condition: service_healthy
```

### Environment Variables

```env
# Backend
ML_SERVICE_URL=http://ml-service:5000  # Default in docker-compose

# Development
ML_SERVICE_URL=http://localhost:5000
```

---

## Testing

### Using cURL

```bash
# Check ML health
curl http://localhost:3001/api/ml/health

# Get service info
curl http://localhost:3001/api/ml/info

# Send anomaly detection request
curl -X POST http://localhost:3001/api/ml/anomalies/detect \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "datapoints": [
    {
      "timestamp": "2026-03-02T10:00:00Z",
      "product_id": "P001",
      "store_id": "S001",
      "current_stock": 100,
      "avg_daily_demand": 20
    }
  ],
  "sensitivity": 0.05
}
EOF
```

### Using Node.js

```typescript
const response = await fetch('http://localhost:3001/api/ml/anomalies/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    datapoints: [...],
    sensitivity: 0.05
  })
});

const results = await response.json();
```

---

## Architecture Benefits

1. **Separation of Concerns** - ML logic isolated from API logic
2. **Language Optimization** - Python for ML, Node.js for HTTP routing
3. **Independent Scaling** - Scale ML service independently for compute-heavy operations
4. **Future Ready** - Easy to add TensorFlow, PyTorch, advanced models
5. **Development Agility** - Data scientists can work on ML without touching Node.js code
6. **Production Ready** - Both services containerized, orchestrated via Docker Compose

---

**Version:** 1.0.0  
**Last Updated:** March 1, 2026
