/**
 * ML Service API Client with retry logic for rate limiting
 * Handles communication with Python ML microservice
 */

const ML_API_BASE = '/api/ml';

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
