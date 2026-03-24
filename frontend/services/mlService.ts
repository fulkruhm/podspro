/**
 * ML Service API Client with retry logic for rate limiting
 * Handles communication with Python ML microservice
 */

import { API_BASE_URL } from './api';

// ML endpoints live under the same API namespace; build the URL dynamically so
// we reuse whatever base the rest of the app is using (could be absolute or
// relative).
const ML_API_BASE = `${API_BASE_URL.replace(/\/$/, '')}/ml`;

// Cache for forecast results to reduce redundant requests
const forecastCache = new Map<string, { result: ForecastResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second

/**
 * Exponential backoff retry decorator
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      if (error.status === 429 || error.message?.includes('Too many requests')) {
        const retryAfter = error.retryAfter || Math.pow(2, attempt) * BASE_RETRY_DELAY;
        const delayMs = typeof retryAfter === 'string' ? parseInt(retryAfter) : retryAfter;

        console.warn(
          `Rate limited. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Don't retry on other errors
      throw error;
    }
  }

  throw lastError!;
}

export interface AnomalyDatapoint {
  timestamp: string;
  product_id: string;
  store_id: string;
  current_stock: number;
  avg_daily_demand: number;
}

export interface AnomalyResult {
  product_id: string;
  store_id: string;
  is_anomaly: boolean;
  anomaly_score: number;
  reason: string;
  recommended_action: string;
}

export interface ForecastRequest {
  product_id: string;
  store_id: string;
  historical_demand: number[];
  forecast_days?: number;
}

export interface ForecastResult {
  product_id: string;
  store_id: string;
  forecast: number[];
  confidence_interval: [number, number];
  trend: string;
  explainability?: string[];
}

export interface MLServiceHealth {
  status: string;
  mlService: {
    status: string;
    service: string;
    timestamp: string;
  };
}

export interface MLServiceInfo {
  service: string;
  version: string;
  capabilities: string[];
  libraries: Record<string, string>;
}

export interface ForecastBatchRun {
  id: number;
  job_type: string;
  status: 'running' | 'success' | 'failed' | 'partial_success';
  triggered_by?: string;
  started_at: string;
  ended_at?: string;
  total_items?: number;
  succeeded_items?: number;
  failed_items?: number;
  error_summary?: string;
}

export interface ForecastBatchStatusResponse {
  latest_run: ForecastBatchRun | null;
  next_scheduled_run_at: string | null;
}

export interface ForecastBatchTriggerResponse {
  run_id: number;
  status?: 'running' | 'success' | 'failed' | 'partial_success';
  message?: string;
  total_store_products?: number;
  succeeded?: number;
  failed?: number;
  errors?: Array<{ product_id: string; store_id: string; error: string }>;
}

export interface ForecastReviewItem {
  product_id: string;
  product_name: string;
  store_id: string;
  region: string;
  department: string;
  history_avg: number;
  forecast_avg: number;
  history_std: number;
  forecast_std: number;
  confidence_spread_avg: number;
  bias_pct: number;
  anomaly_score: number;
  recommended_action: 'accept_model' | 'adjust_baseline' | 'flag_data_issue' | 'request_override';
  latest_decision_status?: 'accept_model' | 'adjust_baseline' | 'flag_data_issue' | 'request_override';
  latest_baseline_adjustment_pct?: number;
  latest_notes?: string;
  latest_decided_by?: string;
  latest_decision_at?: string;
}

export interface ForecastReviewItemsResponse {
  items: ForecastReviewItem[];
}

export interface ForecastReviewDecisionResponse {
  decision: {
    id: number;
    product_id: string;
    store_id: string;
    decision_status: 'accept_model' | 'adjust_baseline' | 'flag_data_issue' | 'request_override';
    baseline_adjustment_pct?: number;
    notes?: string;
    decided_by?: string;
    created_at: string;
  };
}

/**
 * Check ML service health
 */
export async function checkMLHealth(): Promise<MLServiceHealth> {
  try {
    const response = await fetch(`${ML_API_BASE}/health`);
    if (!response.ok) throw new Error('ML service unhealthy');
    return await response.json();
  } catch (error) {
    console.error('ML health check failed:', error);
    throw error;
  }
}

/**
 * Get ML service capabilities
 */
export async function getMLServiceInfo(): Promise<MLServiceInfo> {
  try {
    const response = await fetch(`${ML_API_BASE}/info`);
    if (!response.ok) throw new Error('Failed to fetch ML service info');
    return await response.json();
  } catch (error) {
    console.error('Failed to get ML service info:', error);
    throw error;
  }
}

/**
 * Detect anomalies in inventory data
 */
export async function detectAnomalies(
  datapoints: AnomalyDatapoint[],
  sensitivity = 0.05
): Promise<AnomalyResult[]> {
  try {
    const response = await fetch(`${ML_API_BASE}/anomalies/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datapoints,
        sensitivity,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anomaly detection failed: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Anomaly detection error:', error);
    throw error;
  }
}

/**
 * Forecast future demand with caching and retry logic
 */
export async function forecastDemand(
  request: ForecastRequest
): Promise<ForecastResult> {
  // Generate cache key
  const cacheKey = `${request.product_id}:${request.store_id}:${request.forecast_days || 7}`;

  // Check cache first
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('Using cached forecast for', cacheKey);
    return cached.result;
  }

  // Fetch with retry logic
  return retryWithBackoff(async () => {
    const response = await fetch(`${ML_API_BASE}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: request.product_id,
        store_id: request.store_id,
        historical_demand: request.historical_demand,
        forecast_days: request.forecast_days || 7,
      }),
    });

    // Parse error response to extract rate limit info
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`Forecast failed: ${JSON.stringify(errorData)}`);
      (error as any).status = response.status;
      (error as any).retryAfter = errorData.retryAfter;
      throw error;
    }

    const result = await response.json();

    // Cache the result
    forecastCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }).catch((error) => {
    console.error('Forecast error:', error);
    throw error;
  });
}

/**
 * Run batch analysis (anomalies + forecasts)
 */
export async function runBatchAnalysis(
  anomalies?: { datapoints: AnomalyDatapoint[]; sensitivity?: number },
  forecasts?: ForecastRequest[]
) {
  try {
    const response = await fetch(`${ML_API_BASE}/batch-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anomalies_request: anomalies,
        forecasts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch analysis failed: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Batch analysis error:', error);
    throw error;
  }
}

/**
 * Get latest forecast batch run status (admin only)
 */
export async function getForecastBatchStatus(
  userRole: string
): Promise<ForecastBatchStatusResponse> {
  const response = await fetch(`${ML_API_BASE}/forecast/batch/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch forecast batch status: ${error}`);
  }

  return await response.json();
}

/**
 * Trigger forecast batch run manually (admin only)
 */
export async function triggerForecastBatchRun(
  userRole: string,
  userName: string,
  options?: {
    history_days?: number;
    forecast_days?: number;
    min_history_points?: number;
    filters?: {
      region?: string;
      store?: string;
      department?: string;
      product?: string;
      status?: string;
    };
  }
): Promise<ForecastBatchTriggerResponse> {
  const response = await fetch(`${ML_API_BASE}/forecast/batch/store-products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
      'x-user-name': userName,
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger forecast batch: ${error}`);
  }

  return await response.json();
}

export async function getForecastReviewItems(
  userRole: string,
  limit = 50
): Promise<ForecastReviewItemsResponse> {
  const response = await fetch(`${ML_API_BASE}/forecast/review-items?limit=${encodeURIComponent(String(limit))}&_=${Date.now()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch forecast review items: ${error}`);
  }

  return await response.json();
}

export async function submitForecastReviewDecision(
  userRole: string,
  userName: string,
  input: {
    productId: string;
    storeId: string;
    decision_status: 'accept_model' | 'adjust_baseline' | 'flag_data_issue' | 'request_override';
    baseline_adjustment_pct?: number;
    notes?: string;
  }
): Promise<ForecastReviewDecisionResponse> {
  const response = await fetch(`${ML_API_BASE}/forecast/review-items/${encodeURIComponent(input.productId)}/${encodeURIComponent(input.storeId)}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
      'x-user-name': userName,
    },
    body: JSON.stringify({
      decision_status: input.decision_status,
      baseline_adjustment_pct: input.baseline_adjustment_pct,
      notes: input.notes,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit forecast review decision: ${error}`);
  }

  return await response.json();
}
