# Operations Runbook

## Scope

Operational checks and incident-first actions for PODS services.

## Service Health Checks

1. Backend health: `GET /api/health`
2. Backend readiness: `GET /api/ready`
3. ML service health: `GET http://localhost:5001/health`
4. ML service readiness: `GET http://localhost:5001/ready`

## Batch Forecast Troubleshooting

1. Check queue stats: `GET /api/ml/forecast/batch/queue`
2. Check failed jobs: `GET /api/ml/forecast/batch/failed-jobs`
3. Retry failed run: `POST /api/ml/forecast/batch/retry`
4. Confirm latest run: `GET /api/ml/forecast/batch/status`

## Data Refresh Behavior

- Forecast Governance refresh now waits for batch completion before global data refresh.
- Product graph data is reloaded from backend data endpoints, not chat realtime endpoint.

## Security Checks

1. Node audit: `npm run security:npm`
2. Python audit: `npm run security:pip`
3. Dependabot config: `.github/dependabot.yml`

## Quality Tightening Checks

1. Baseline quality: `npm run lint`
2. Phase-2 module tightening: `npm run lint:phase2`

## Escalation Checklist

1. Capture run ID, timestamps, and failing endpoint.
2. Capture backend and ML-service logs around failure window.
3. Note whether failure is data quality, dependency outage, or auth/permission issue.
4. Open incident issue with impact, root cause hypothesis, and mitigation.
