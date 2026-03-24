#!/bin/bash

# GCP Deployment Setup Script for PODS Application
# This script sets up the necessary GCP resources for deployment

set -e

# Configuration - Update these variables
PROJECT_ID="pods-489403"  # Replace with your GCP project ID
REGION="us-central1"
CLOUD_SQL_INSTANCE="pods-postgres"
SERVICE_ACCOUNT_NAME="pods-deployer"
GCS_BUCKET="pods-deployment-$PROJECT_ID"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"  # Set your Gemini API key here or as environment variable

echo "Setting up GCP deployment for PODS application..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create Cloud SQL PostgreSQL instance
echo "Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create $CLOUD_SQL_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=pods_password \
  --database-flags=cloudsql.iam_authentication=off || echo "Cloud SQL instance already exists, continuing..."

# Create database and user
echo "Setting up database and user..."
gcloud sql databases create pods_db --instance=$CLOUD_SQL_INSTANCE || echo "Database already exists, continuing..."
gcloud sql users create pods_user \
  --instance=$CLOUD_SQL_INSTANCE \
  --password=pods_password || echo "User already exists, continuing..."

# Create GCS bucket for deployment files
echo "Creating GCS bucket for deployment files..."
gsutil mb -l $REGION gs://$GCS_BUCKET 2>/dev/null || echo "Bucket already exists"

# Get current authorized networks and add the new IP
echo "Adding current IP to Cloud SQL authorized networks..."
CURRENT_IP=$(curl -s https://api.ipify.org)
EXISTING_NETWORKS=$(gcloud sql instances describe $CLOUD_SQL_INSTANCE --format="value(settings.ipConfiguration.authorizedNetworks[].value)" | tr '\n' ',')
if [ -n "$EXISTING_NETWORKS" ]; then
    AUTHORIZED_NETWORKS="${EXISTING_NETWORKS}${CURRENT_IP}"
else
    AUTHORIZED_NETWORKS="$CURRENT_IP"
fi
gcloud sql instances patch $CLOUD_SQL_INSTANCE --authorized-networks=$AUTHORIZED_NETWORKS --quiet

# Get Cloud SQL instance IP
echo "Getting Cloud SQL instance IP..."
CLOUD_SQL_IP=$(gcloud sql instances describe $CLOUD_SQL_INSTANCE --format="value(ipAddresses[0].ipAddress)")
echo "Cloud SQL IP: $CLOUD_SQL_IP"

# Install PostgreSQL client if not available
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    brew install postgresql
    export PATH="$(brew --prefix postgresql@18)/bin:$PATH"
else
    echo "PostgreSQL client already available"
fi

# Import database schema using psql
echo "Importing database schema..."
PGPASSWORD=pods_password psql -h $CLOUD_SQL_IP -U postgres -d pods_db -f backend/init.sql

# Get the Cloud SQL connection name
CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe $CLOUD_SQL_INSTANCE --format="value(connectionName)")
echo "Cloud SQL Connection Name: $CLOUD_SQL_CONNECTION_NAME"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
echo "Project Number: $PROJECT_NUMBER"

# Set commit SHA (use current timestamp if not in git repo)
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
echo "Commit SHA: $COMMIT_SHA"

# Create service account for Cloud Run
echo "Creating service account..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --description="Service account for PODS application" \
  --display-name="PODS Deployer" || echo "Service account already exists, continuing..."

# Grant necessary permissions
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.invoker"

# Build and submit the Cloud Build
echo "Building and deploying application..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _CLOUD_SQL_CONNECTION_NAME="$CLOUD_SQL_CONNECTION_NAME",_GEMINI_API_KEY="$GEMINI_API_KEY",_PROJECT_NUMBER="$PROJECT_NUMBER",_COMMIT_SHA="$COMMIT_SHA"

# Get the URLs of deployed services
echo "Deployment complete!"
# capture them into variables for later use
BACKEND_URL=$(gcloud run services describe pods-backend --region=$REGION --format="value(status.url)")
FRONTEND_URL=$(gcloud run services describe pods-frontend --region=$REGION --format="value(status.url)")
ML_URL=$(gcloud run services describe pods-ml-service --region=$REGION --format="value(status.url)")

echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "ML Service URL: $ML_URL"

echo ""
# make sure the backend service knows about the frontend URL so CORS checks allow it
echo "Updating backend CORS environment variable..."
gcloud run services update pods-backend --region=$REGION \
  --update-env-vars=FRONTEND_URL=$FRONTEND_URL || echo "Failed to update BACKEND CORS env var"

echo ""
echo "Next steps:"
echo "1. (Optional) if you need to rebuild the frontend you can supply VITE_API_BASE_URL=$BACKEND_URL during build"
echo "2. Set up database seeding if needed"
echo "3. Configure domain and SSL if required"