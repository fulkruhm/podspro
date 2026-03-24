# GCP Deployment Guide for PODS Application

This guide explains how to deploy the PODS application to Google Cloud Platform using Cloud Run and Cloud SQL.

## Prerequisites

1. **Google Cloud Project**: Create a GCP project or use an existing one
2. **Google Cloud SDK**: Install and initialize gcloud CLI
3. **Gemini API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
4. **Billing**: Ensure billing is enabled for your GCP project

## Quick Deployment

1. **Clone/Update the repository** (if not already done)

2. **Install Google Cloud SDK** (if not installed):
   ```bash
   # On macOS with Homebrew
   brew install google-cloud-sdk
   ```

3. **Authenticate and set project**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

4. **Update configuration in `deploy-gcp.sh`**:
   - Set `PROJECT_ID` to your GCP project ID
   - Optionally change `REGION` (default: us-central1)

5. **Set your Gemini API key**:
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key-here"
   ```

6. **Run the deployment script**:
   ```bash
   ./deploy-gcp.sh
   ```

## What the deployment does

The deployment script will:
- Enable required GCP APIs
- Create a Cloud SQL PostgreSQL instance
- Set up database schema and user
- Build Docker images using Cloud Build
- Deploy services to Cloud Run
- Provide URLs for accessing the application

## Services Deployed

- **Backend API**: Node.js/Express API server
- **Frontend**: React SPA served by Nginx
- **ML Service**: Python/FastAPI ML service
- **Database**: PostgreSQL on Cloud SQL

## Database Seeding

After deployment, you may want to seed the database with sample data:

1. Get the Cloud SQL connection name from the deployment output
2. Update the connection string in your environment
3. Run the seeder (you can modify the cloudbuild.yaml to include seeding or run it locally)

## Environment Variables

The following environment variables are set automatically:
- `DATABASE_URL`: Connection string for Cloud SQL
- `GEMINI_API_KEY`: Your Gemini API key (set before deployment)
- `NODE_ENV`: production
- `VITE_API_BASE_URL`: Frontend API base URL

## Costs

- **Cloud SQL**: ~$0.015/hour for db-f1-micro instance
- **Cloud Run**: Pay-per-use (very low for light traffic)
- **Cloud Build**: Free tier available
- **Cloud Storage**: For container images (minimal cost)

## Troubleshooting

- **Build failures**: Check Cloud Build logs in GCP Console
- **Deployment failures**: Verify service account permissions
- **Database connection**: Ensure Cloud SQL instance is running and accessible
- **API key issues**: Verify Gemini API key is valid and has quota

## Manual Steps (if needed)

If the automated script fails, you can perform these steps manually:

1. Create Cloud SQL instance
2. Import schema: `gcloud sql import sql INSTANCE_NAME backend/init.sql --database=pods_db`
3. Build images: `gcloud builds submit --config cloudbuild.yaml`
4. Deploy services individually using `gcloud run deploy`

## Security Notes

- The deployment allows unauthenticated access for demo purposes
- In production, configure proper authentication and authorization
- Store secrets in Secret Manager instead of environment variables
- Use VPC for better security isolation