# PODS ML Service API Documentation

## Scope

This document describes the current ML API surface in PODS.

There are two layers to understand:

- Python ML service endpoints exposed by FastAPI
- Backend gateway endpoints exposed by Node.js under `/api/ml/*`

Application clients should use the backend gateway unless they are explicitly performing service-level testing.

## Current Topology

```text
Frontend -> Node.js Backend (/api/ml/*) -> Python ML Service
```

### Local Access

| Interface | URL |
|---|---|
| Backend ML gateway | http://localhost:3001/api/ml |
| Python ML service direct | http://localhost:5001 |

## Backend Gateway Endpoints

These are the supported endpoints for the frontend and authenticated operational workflows.

### Health And Metadata

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ml/health` | Check backend-to-ML connectivity |
| GET | `/api/ml/info` | Fetch ML capabilities and library metadata |

### Interactive Inference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ml/anomalies/detect` | Detect inventory anomalies |
| POST | `/api/ml/forecast` | Generate demand forecast |

### Forecast Governance And Batch Operations

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ml/forecast/batch/store-products` | Queue durable batch forecast run |
| GET | `/api/ml/forecast/batch/status` | Latest batch run and next scheduled run |
| GET | `/api/ml/forecast/batch/queue` | Queue depth and worker health |
| GET | `/api/ml/forecast/batch/failed-jobs` | Failed jobs for diagnostics |
| POST | `/api/ml/forecast/batch/retry` | Requeue failed batch run |
| GET | `/api/ml/forecast/review-items` | Review queue items |
| POST | `/api/ml/forecast/review-items/:productId/:storeId/decision` | Persist review decision |

## Python ML Service Endpoints

These are exposed directly by FastAPI and are used by the backend gateway.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service liveness |
| GET | `/ready` | Service readiness |
| GET | `/api/ml/info` | Capabilities and versions |
| POST | `/api/ml/anomalies/detect` | Isolation Forest anomaly detection |
| POST | `/api/ml/forecast` | Exponential smoothing forecast |
| POST | `/api/ml/batch-analysis` | Direct combined ML analysis |

## Authentication And Authorization

Backend `/api/ml/*` endpoints require authenticated access.

- All routes require signed bearer tokens
- Forecast governance endpoints require `admin` or `sysadmin`
- Requests should use:

```http
Authorization: Bearer <token>
```

## Endpoint Details

### GET `/api/ml/health`

Checks whether the backend can successfully reach the Python ML service.

Typical uses:

- operational diagnostics
- readiness investigations
- smoke checks

### GET `/api/ml/info`

Returns service metadata and capability descriptions from the Python service.

Representative response shape:

```json
{
  "service": "PODS ML Service",
  "version": "1.0.0",
  "capabilities": [
    "Anomaly Detection (Isolation Forest)",
    "Demand Forecasting (Exponential Smoothing)",
    "Batch Analysis",
    "Ready for: TensorFlow and PyTorch integration"
  ],
  "libraries": {
    "scikit-learn": "Anomaly detection, preprocessing",
    "pandas": "Data manipulation",
    "numpy": "Numerical computing",
    "fastapi": "REST API framework"
  }
}
```

### POST `/api/ml/anomalies/detect`

Detects anomalies using the Python `AnomalyDetector` with an Isolation Forest-based strategy.

Request body:

```json
{
  "datapoints": [
    {
      "timestamp": "2026-03-01T10:00:00Z",
      "product_id": "PRODUCT_001",
      "store_id": "STORE_001",
      "current_stock": 150,
      "avg_daily_demand": 25.5
    }
  ],
  "sensitivity": 0.05
}
```

Notes:

- backend responses may be cache-backed
- cache hits and misses are surfaced via `X-Cache`
- request validation is enforced before forwarding to Python

### POST `/api/ml/forecast`

Generates forecast output with confidence interval, trend, explainability, and model metadata.

Request body:

```json
{
  "product_id": "PRODUCT_001",
  "store_id": "STORE_001",
  "historical_demand": [20, 22, 19, 25, 23, 21, 24],
  "historical_features": [
    {
      "feature_date": "2026-03-01",
      "promo_flag": false,
      "holiday_flag": false,
      "weather_index": 0.98
    }
  ],
  "future_features": [
    {
      "feature_date": "2026-03-08",
      "promo_flag": true,
      "holiday_flag": false,
      "weather_index": 1.04
    }
  ],
  "forecast_days": 7,
  "persist": false
}
```

Behavior:

- `persist !== false` causes backend persistence of forecast output
- `persist === false` enables cache-first, non-persistent forecast usage
- response includes `forecast`, `confidence_interval`, `trend`, `explainability`, and `model_name`

### POST `/api/ml/forecast/batch/store-products`

Queues a durable forecast run over eligible store-product combinations.

Representative request:

```json
{
  "history_days": 56,
  "forecast_days": 14,
  "min_history_points": 14,
  "filters": {
    "region": "South",
    "store": "Store 14",
    "department": "Beverages"
  }
}
```

Key behavior:

- admin or sysadmin only
- supports optional `Idempotency-Key`
- enqueues via BullMQ and Redis
- writes audit log for trigger action

Representative response:

```json
{
  "run_id": 42,
  "status": "queued",
  "duplicate": false,
  "message": "Forecast batch accepted and queued"
}
```

### GET `/api/ml/forecast/batch/status`

Returns:

- `latest_run`
- `next_scheduled_run_at`

This is the primary endpoint for overview status in forecast governance flows.

### GET `/api/ml/forecast/batch/queue`

Returns queue depth and runtime metrics from the backend queue service.

### GET `/api/ml/forecast/batch/failed-jobs`

Returns failed queue jobs for diagnostic review.

Query parameters:

- `limit` with a current default of `20`

### POST `/api/ml/forecast/batch/retry`

Retries a failed run by `run_id`.

Request body:

```json
{
  "run_id": 42
}
```

### GET `/api/ml/forecast/review-items`

Fetches forecast review queue items for admin and sysadmin workflows.

### POST `/api/ml/forecast/review-items/:productId/:storeId/decision`

Records a review decision and writes corresponding audit trail details.

## Direct Python Service Behavior

### GET `/health`

Representative response:

```json
{
  "status": "healthy",
  "service": "PODS ML Service",
  "timestamp": "2026-04-10T12:00:00.000000"
}
```

### GET `/ready`

Representative response:

```json
{
  "status": "ready",
  "service": "PODS ML Service",
  "timestamp": "2026-04-10T12:00:00.000000"
}
```

### POST `/api/ml/batch-analysis`

This direct service endpoint remains available for combined anomaly and forecast testing, but it is not the main application-facing contract for durable forecast governance.

## Error Handling

Backend behavior:

- validation errors return `400`
- authorization failures return `401` or `403`
- downstream ML failures surface as backend errors with environment-aware detail handling
- connectivity issues return `503` when the ML service is unavailable

Python service behavior:

- anomaly endpoint returns `500` on detector failures
- forecast endpoint returns `400` for forecast request failures

## Caching And Persistence Notes

- anomaly responses are cacheable through the backend
- non-persistent forecast responses are cacheable through the backend
- persisted forecasts are written to PostgreSQL by the backend, not the Python service directly
- cache storage prefers Redis and falls back to memory when Redis is unavailable

## Testing Tips

Use the backend gateway for end-to-end testing:

```bash
curl http://localhost:3001/api/ml/health
```

Use the Python service directly for service-level checks:

```bash
curl http://localhost:5001/health
```

For authenticated backend ML routes, obtain a bearer token from `/api/auth/login` first.

## Related Docs

- `README.md`
- `ML_DEVELOPMENT_GUIDE.md`
- `TECHNICAL_SYSTEM_HANDBOOK.md`
- `ARCHITECTURE_DIAGRAMS.md`
