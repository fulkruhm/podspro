# ADR 0001: Service Boundaries and Ownership

## Status

Accepted

## Context

PODS is a multi-runtime system (frontend, backend, ML service). Drift in responsibilities and docs creates operational risk.

## Decision

Adopt explicit service boundaries:

- Frontend owns UI rendering and user interactions.
- Backend owns auth, authorization, orchestration, persistence, queue control, and public API contracts.
- ML service owns inference logic for anomaly detection and forecasting.

## Consequences

- API behavior changes must be reflected in backend OpenAPI and current docs.
- ML response schema changes must be coordinated with backend and frontend in one change set.
- Queue/forecast lifecycle remains backend-owned to preserve observability and auditability.

## Follow-Up

- Add ADR for deployment topology and SLO targets.
- Revisit quarterly for architecture drift.
