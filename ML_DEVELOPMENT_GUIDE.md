# PODS ML Service Development Guide

## Purpose

This guide covers day-to-day development of the Python ML microservice and its contract with the Node.js backend.

Current stack:

- FastAPI
- scikit-learn
- numpy
- pandas
- pydantic
- uvicorn

## Project Layout

```text
ml-service/
  anomaly.py
  app_factory.py
  config.py
  forecast.py
  main.py
  routes.py
  schemas.py
  tests/
```

## Local Development

### Run The ML Service Only

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Default local service URLs:

- `http://localhost:5000/health`
- `http://localhost:5000/ready`
- `http://localhost:5000/docs`

### Run With Docker Compose

```bash
docker compose up --build ml-service
```

When launched via Compose, the service is available on host port `5001`.

## Configuration

Configuration is centralized in `ml-service/config.py`.

Supported settings:

| Variable | Default | Purpose |
|---|---|---|
| `ML_SERVICE_NAME` | `PODS ML Service` | Service metadata |
| `ML_SERVICE_VERSION` | `1.0.0` | Reported version |
| `ML_SERVICE_HOST` | `0.0.0.0` | Uvicorn bind host |
| `ML_SERVICE_PORT` | `5000` | Uvicorn bind port |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins |

For the current local frontend, `http://localhost:3000` is the important default.

## Current Endpoint Surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness |
| GET | `/api/ml/info` | Capability metadata |
| POST | `/api/ml/anomalies/detect` | Inventory anomaly detection |
| POST | `/api/ml/forecast` | Demand forecast generation |
| POST | `/api/ml/batch-analysis` | Combined direct analysis |

The Node backend proxies the main inference endpoints and adds:

- auth enforcement
- request validation
- caching
- persistence
- batch queueing and governance

## How The Service Fits Into PODS

### Python Service Responsibilities

- compute anomaly results
- compute forecast outputs
- return explainability text and model metadata
- expose service-level health and readiness

### Backend Responsibilities

- authenticate and authorize callers
- validate request bodies
- cache anomaly and non-persistent forecast responses
- persist forecasts when requested
- manage batch queueing, retries, and review workflows

Keep this boundary intact when extending the service.

## Main Code Paths

### `routes.py`

Defines all FastAPI endpoints.

Use this file when:

- adding or removing endpoints
- changing request/response behavior
- updating service metadata exposure

### `schemas.py`

Defines Pydantic request and response schemas.

Use this file when:

- changing contract fields
- tightening validation
- introducing new request/response models

### `forecast.py`

Contains forecast logic and explainability behavior.

Use this file when:

- tuning forecast output
- adding model metadata
- changing feature influence handling

### `anomaly.py`

Contains anomaly detection logic.

Use this file when:

- adjusting contamination/sensitivity handling
- changing anomaly reasoning output
- adding richer recommendation rules

## Contract Expectations

### Forecast Endpoint

The backend expects forecast responses to contain:

- `product_id`
- `store_id`
- `forecast`
- `confidence_interval`
- `trend`
- `explainability`
- `model_name`

If you add fields such as `model_variant` or `model_version`, update backend handling and docs together.

### Anomaly Endpoint

The backend expects anomaly responses to be a list of result objects that can be returned directly to callers.

## Extension Workflow

### Add A New ML Capability

1. Add or extend schema definitions in `schemas.py`
2. Implement logic in `anomaly.py`, `forecast.py`, or a new module
3. Register endpoint in `routes.py`
4. Update backend route proxying if the capability should be application-facing
5. Update docs and tests

### Change Existing Forecast Semantics

1. Keep the response backward compatible where possible
2. Update backend persistence logic if field shape changes
3. Verify frontend/client assumptions
4. Update `ML_SERVICE_API.md` and system docs

### Add External ML Libraries

Optional future expansion can include libraries such as TensorFlow or PyTorch, but they are not part of the current dependency set.

If you add them:

1. update `requirements.txt`
2. document the reason and runtime implications
3. add tests covering the new execution path
4. revisit Docker image size and startup time

MLflow is not part of the current shipped runtime.

## Testing

### Service Tests

The repo includes ML service tests under `ml-service/tests/`.

Run them from repo root:

```bash
docker compose run --rm ml-service pytest -q
```

If using the workspace Python environment directly, use the configured interpreter and run pytest from `ml-service/`.

### Manual Smoke Checks

```bash
curl http://localhost:5000/health
curl http://localhost:5000/ready
curl http://localhost:5000/api/ml/info
```

## Development Guidelines

### Keep The Service Stateless

- avoid local mutable singleton state unless required for model loading
- prefer deterministic request-in/request-out behavior
- treat persistence as a backend concern unless there is a clear architectural reason otherwise

### Keep Contracts Explicit

- validate all incoming payloads through Pydantic models
- avoid loosely typed JSON blobs
- preserve stable field names once consumed by backend/frontend code

### Fail Clearly

- raise explicit `HTTPException` values for expected failures
- keep internal stack traces out of external responses where practical
- log enough context to correlate failures with backend request IDs

### Watch For Performance Regressions

- large forecast batches should stay in backend-managed queue paths
- synchronous direct endpoints should remain suitable for request/response use
- expensive new model initialization should be measured and, if needed, moved to startup

## Common Change Checklist

- update schemas
- update service logic
- update backend integration if contracts changed
- update docs
- run tests
- validate local health and readiness

## Related Docs

- `ML_SERVICE_API.md`
- `HYBRID_ARCHITECTURE_SUMMARY.md`
- `TECHNICAL_SYSTEM_HANDBOOK.md`
`README.md`
