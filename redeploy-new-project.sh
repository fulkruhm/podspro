#!/usr/bin/env bash

set -euo pipefail

# Redeploy PODS services (backend, frontend, ml-service) to a new or existing GCP project.
# Usage:
#   NEW_PROJECT_ID="my-project-id" \
#   CLOUD_SQL_CONNECTION_NAME="my-project-id:us-central1:pods-postgres" \
#   GEMINI_API_KEY="..." \
#   ./redeploy-new-project.sh

NEW_PROJECT_ID="${NEW_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
CLOUD_SQL_CONNECTION_NAME="${CLOUD_SQL_CONNECTION_NAME:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

if [[ -z "$NEW_PROJECT_ID" ]]; then
  echo "Error: NEW_PROJECT_ID is required."
  exit 1
fi

if [[ -z "$CLOUD_SQL_CONNECTION_NAME" ]]; then
  echo "Error: CLOUD_SQL_CONNECTION_NAME is required (format: project:region:instance)."
  exit 1
fi

echo "Using project: $NEW_PROJECT_ID"
echo "Using region: $REGION"
echo "Using Cloud SQL instance: $CLOUD_SQL_CONNECTION_NAME"

gcloud config set project "$NEW_PROJECT_ID"

echo "Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  containerregistry.googleapis.com

COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

echo "Deploying through Cloud Build (commit: $COMMIT_SHA)..."
gcloud builds submit \
  --project="$NEW_PROJECT_ID" \
  --config=cloudbuild.yaml \
  --substitutions="_COMMIT_SHA=$COMMIT_SHA,_CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME,_GEMINI_API_KEY=$GEMINI_API_KEY,_FRONTEND_URL=,_BACKEND_API_BASE_URL=,_ML_SERVICE_URL="

BACKEND_URL="$(gcloud run services describe pods-backend --project="$NEW_PROJECT_ID" --region="$REGION" --format='value(status.url)')"
FRONTEND_URL="$(gcloud run services describe pods-frontend --project="$NEW_PROJECT_ID" --region="$REGION" --format='value(status.url)')"
ML_URL="$(gcloud run services describe pods-ml-service --project="$NEW_PROJECT_ID" --region="$REGION" --format='value(status.url)')"

echo "Updating backend service env vars with actual runtime URLs..."
gcloud run services update pods-backend \
  --project="$NEW_PROJECT_ID" \
  --region="$REGION" \
  --update-env-vars="FRONTEND_URL=$FRONTEND_URL,ML_SERVICE_URL=$ML_URL"

echo
echo "Deployment complete"
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "ML URL:       $ML_URL"
