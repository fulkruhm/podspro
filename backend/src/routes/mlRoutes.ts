/**
 * ML Service Router - Proxy to Python ML microservice
 *
 * This router forwards ML/AI requests to the Python FastAPI service
 * (anomaly detection, forecasting, etc.)
 */

import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { mlLimiter } from '../middleware/rateLimiter.js';
import { requireAnyRole, requireAuthenticatedUser, getIdentity } from '../middleware/authz.js';
import {
  validateRequestBody,
  validateRequestParams,
  validateRequestQuery,
  mlAnomalyRequestSchema,
  mlForecastRequestSchema,
  mlBatchRequestSchema,
  mlForecastBatchRequestSchema,
  forecastReviewQuerySchema,
  forecastReviewDecisionParamsSchema,
  forecastReviewDecisionBodySchema,
  forecastBatchFailedJobsQuerySchema,
  forecastBatchRetryBodySchema,
} from '../middleware/validation.js';
import {
  getLatestBatchJobRun,
  saveStoreProductForecast,
  getForecastReviewItems,
  createForecastReviewDecision,
} from '../db.js';
import { STORE_PRODUCT_FORECAST_JOB_TYPE } from '../services/forecastBatchService.js';
import {
  enqueueStoreProductForecastBatch,
  getForecastBatchQueueStats,
  getFailedForecastBatchJobs,
  retryFailedForecastBatchRun,
} from '../services/forecastBatchQueue.js';
import { getNextNightlyForecastRun } from '../services/forecastBatchScheduler.js';
import { buildCacheKey, getCachedJson, setCachedJson } from '../services/redisCache.js';
import { loadAppConfig } from '../config/env.js';

const router = Router();
const appConfig = loadAppConfig();

const ML_SERVICE_URL = appConfig.mlServiceUrl;
const ML_ANOMALY_CACHE_TTL_SECONDS = appConfig.mlAnomalyCacheTtlSeconds;
const ML_FORECAST_CACHE_TTL_SECONDS = appConfig.mlForecastCacheTtlSeconds;
const ML_INFO_CACHE_TTL_SECONDS = appConfig.mlInfoCacheTtlSeconds;
const IS_DEVELOPMENT = appConfig.nodeEnv === 'development';

interface ForecastServiceResponse {
  product_id: string;
  store_id: string;
  forecast: number[];
  confidence_interval?: [number, number];
  trend?: string;
  explainability?: string[];
  model_name?: string;
  model_variant?: string;
  model_version?: string;
}

type AnomalyDetectionResponse = unknown[];
type MlInfoResponse = Record<string, unknown>;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

router.use(requireAuthenticatedUser);

/**
 * Anomaly Detection Endpoint
 * POST /api/ml/anomalies/detect
 *
 * Detects anomalies in inventory data using isolation forest
 */
router.post(
  '/anomalies/detect',
  mlLimiter,
  validateRequestBody(mlAnomalyRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { datapoints, sensitivity } = req.body;
      const cacheKey = buildCacheKey('ml:anomalies', {
        datapoints,
        sensitivity: sensitivity || 0.05,
      });

      const cached = await getCachedJson<AnomalyDetectionResponse>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      const response = await fetch(`${ML_SERVICE_URL}/api/ml/anomalies/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datapoints,
          sensitivity: sensitivity || 0.05,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('ML Service error:', error);
        return res.status(response.status).json({
          error: 'Anomaly detection failed',
          details: IS_DEVELOPMENT ? error : undefined,
        });
      }

      const results = await response.json();
      await setCachedJson(cacheKey, results, ML_ANOMALY_CACHE_TTL_SECONDS);
      res.setHeader('X-Cache', 'MISS');
      res.json(results);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Anomaly detection error:', errorMessage);
      res.status(503).json({
        error: 'ML service unavailable',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

/**
 * Demand Forecasting Endpoint (with lenient rate limiting for concurrent requests)
 * POST /api/ml/forecast
 *
 * Forecasts future demand using exponential smoothing
 */
router.post(
  '/forecast',
  mlLimiter,
  validateRequestBody(mlForecastRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        product_id,
        store_id,
        historical_demand,
        historical_features,
        future_features,
        forecast_days,
        persist,
      } = req.body;

      const shouldUseCache = persist === false;
      let cacheKey: string | null = null;
      if (shouldUseCache) {
        cacheKey = buildCacheKey('ml:forecast', {
          product_id,
          store_id,
          historical_demand,
          historical_features,
          future_features,
          forecast_days: forecast_days || 7,
        });

        const cached = await getCachedJson<ForecastServiceResponse>(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }
      }

      const response = await fetch(`${ML_SERVICE_URL}/api/ml/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id,
          store_id,
          historical_demand,
          historical_features,
          future_features,
          forecast_days: forecast_days || 7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('ML Service error:', error);
        return res.status(response.status).json({
          error: 'Forecast failed',
          details: IS_DEVELOPMENT ? error : undefined,
        });
      }

      const forecast = (await response.json()) as ForecastServiceResponse;

      if (persist !== false && Array.isArray(forecast?.forecast)) {
        await saveStoreProductForecast(
          product_id,
          store_id,
          forecast.forecast,
          forecast.confidence_interval,
          forecast.trend,
          forecast.model_name || 'exponential_smoothing',
          forecast.model_variant,
          forecast.model_version,
          historical_demand,
          forecast.explainability
        );
      }

      if (cacheKey) {
        await setCachedJson(cacheKey, forecast, ML_FORECAST_CACHE_TTL_SECONDS);
        res.setHeader('X-Cache', 'MISS');
      }

      res.json(forecast);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast error:', errorMessage);
      res.status(503).json({
        error: 'ML service unavailable',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

/**
 * Batch Forecast Endpoint for all store-product combinations
 * POST /api/ml/forecast/batch/store-products
 *
 * Uses historical demand at store-product level and persists forecast output.
 */
router.post(
  '/forecast/batch/store-products',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestBody(mlForecastBatchRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const historyDays = Number(req.body?.history_days ?? 56);
      const forecastDays = Number(req.body?.forecast_days ?? 14);
      const minHistoryPoints = Number(req.body?.min_history_points ?? 14);
      const requestedFilters = req.body?.filters || {};

      const normalizeFilter = (value: unknown) => {
        if (typeof value !== 'string') {
          return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const filters = {
        region: normalizeFilter(requestedFilters.region),
        store: normalizeFilter(requestedFilters.store),
        department: normalizeFilter(requestedFilters.department),
        product: normalizeFilter(requestedFilters.product),
        status: normalizeFilter(requestedFilters.status),
      };

      if (!Number.isFinite(historyDays) || historyDays < 7) {
        return res.status(400).json({ error: 'history_days must be a number >= 7' });
      }

      if (!Number.isFinite(forecastDays) || forecastDays < 1 || forecastDays > 90) {
        return res.status(400).json({ error: 'forecast_days must be between 1 and 90' });
      }

      if (!Number.isFinite(minHistoryPoints) || minHistoryPoints < 3) {
        return res.status(400).json({ error: 'min_history_points must be >= 3' });
      }

      const identity = getIdentity(res);
      const triggeredBy = identity?.username || 'admin_manual';
      const idempotencyHeader = req.header('idempotency-key') || undefined;

      const { runId, queued, duplicate, execution } = await enqueueStoreProductForecastBatch({
        historyDays,
        forecastDays,
        minHistoryPoints,
        triggeredBy,
        filters,
        idempotencyKey: idempotencyHeader,
      });

      if (execution) {
        execution.catch((executionError: unknown) => {
          console.error(
            'Background store-product forecast batch failed:',
            getErrorMessage(executionError)
          );
        });
      }

      res.status(202).json({
        run_id: runId,
        status: queued ? 'queued' : 'running',
        duplicate,
        message: queued
          ? duplicate
            ? 'Forecast batch already queued with matching idempotency key'
            : 'Forecast batch accepted and queued'
          : 'Forecast batch accepted and running in background',
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Batch store-product forecast error:', errorMessage);
      res.status(503).json({
        error: 'Batch forecast failed',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

/**
 * Forecast Batch Status Endpoint (admin only)
 * GET /api/ml/forecast/batch/status
 */
router.get(
  '/forecast/batch/status',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  async (_req: Request, res: Response) => {
    try {
      const latestRun = await getLatestBatchJobRun(STORE_PRODUCT_FORECAST_JOB_TYPE);
      const nextRunAt = getNextNightlyForecastRun();

      return res.json({
        latest_run: latestRun,
        next_scheduled_run_at: nextRunAt ? nextRunAt.toISOString() : null,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast batch status error:', errorMessage);
      res.status(500).json({
        error: 'Failed to fetch forecast batch status',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

router.get(
  '/forecast/batch/queue',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  async (_req: Request, res: Response) => {
    try {
      const queue = await getForecastBatchQueueStats();
      return res.json({ queue });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast batch queue status error:', errorMessage);
      return res.status(500).json({
        error: 'Failed to fetch forecast batch queue status',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

router.get(
  '/forecast/batch/failed-jobs',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestQuery(forecastBatchFailedJobsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query?.limit ?? 20);
      const jobs = await getFailedForecastBatchJobs(limit);
      return res.json({ jobs });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast batch failed-jobs error:', errorMessage);
      return res.status(500).json({
        error: 'Failed to fetch failed forecast batch jobs',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

router.post(
  '/forecast/batch/retry',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestBody(forecastBatchRetryBodySchema),
  async (req: Request, res: Response) => {
    try {
      const runId = Number(req.body.run_id);
      const retryResult = await retryFailedForecastBatchRun(runId);
      if (!retryResult.retried) {
        return res.status(404).json({
          error: 'Failed run not found in queue',
          reason: retryResult.reason,
        });
      }

      return res.json({
        status: 'requeued',
        run_id: runId,
        job_id: retryResult.jobId,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast batch retry error:', errorMessage);
      return res.status(500).json({
        error: 'Failed to retry forecast batch run',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

router.get(
  '/forecast/review-items',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestQuery(forecastReviewQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query?.limit ?? 50);
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(200, Math.floor(limit)) : 50;

      const items = await getForecastReviewItems(safeLimit);
      return res.json({ items });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast review items error:', errorMessage);
      res.status(500).json({
        error: 'Failed to fetch forecast review items',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

router.post(
  '/forecast/review-items/:productId/:storeId/decision',
  mlLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestParams(forecastReviewDecisionParamsSchema),
  validateRequestBody(forecastReviewDecisionBodySchema),
  async (req: Request, res: Response) => {
    try {
      const { productId, storeId } = req.params;
      const decisionStatus = req.body?.decision_status;
      const baselineAdjustmentPct = req.body?.baseline_adjustment_pct;
      const notes = req.body?.notes;
      const identity = getIdentity(res);
      const decidedBy = identity?.username || 'admin';

      let normalizedBaselineAdjustment: number | null | undefined = null;
      if (
        baselineAdjustmentPct !== undefined &&
        baselineAdjustmentPct !== null &&
        baselineAdjustmentPct !== ''
      ) {
        const parsed = Number(baselineAdjustmentPct);
        if (!Number.isFinite(parsed) || parsed < -50 || parsed > 50) {
          return res
            .status(400)
            .json({ error: 'baseline_adjustment_pct must be between -50 and 50' });
        }
        normalizedBaselineAdjustment = parsed;
      }

      const decision = await createForecastReviewDecision({
        productId,
        storeId,
        decisionStatus,
        baselineAdjustmentPct:
          decisionStatus === 'adjust_baseline' ? (normalizedBaselineAdjustment ?? 0) : null,
        notes: typeof notes === 'string' ? notes : undefined,
        decidedBy,
      });

      return res.json({ decision });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Forecast review decision error:', errorMessage);
      res.status(500).json({
        error: 'Failed to save forecast review decision',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

/**
 * Batch Analysis Endpoint (with lenient rate limiting)
 * POST /api/ml/batch-analysis
 *
 * Run multiple analyses (anomalies + forecasts) in one request
 */
router.post(
  '/batch-analysis',
  mlLimiter,
  validateRequestBody(mlBatchRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/ml/batch-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('ML Service error:', error);
        return res.status(response.status).json({
          error: 'Batch analysis failed',
          details: IS_DEVELOPMENT ? error : undefined,
        });
      }

      const results = await response.json();
      res.json(results);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Batch analysis error:', errorMessage);
      res.status(503).json({
        error: 'ML service unavailable',
        message: IS_DEVELOPMENT ? errorMessage : undefined,
      });
    }
  }
);

/**
 * ML Service Info Endpoint
 * GET /api/ml/info
 *
 * Get information about available ML capabilities
 */
router.get('/info', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'ml:info';
    const cached = await getCachedJson<MlInfoResponse>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const response = await fetch(`${ML_SERVICE_URL}/api/ml/info`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Could not fetch ML service info' });
    }

    const info = await response.json();
    await setCachedJson(cacheKey, info, ML_INFO_CACHE_TTL_SECONDS);
    res.setHeader('X-Cache', 'MISS');
    res.json(info);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error('ML info error:', errorMessage);
    res.status(503).json({
      error: 'ML service unavailable',
      message: IS_DEVELOPMENT ? errorMessage : undefined,
    });
  }
});

/**
 * ML Service Health Check
 * GET /api/ml/health
 *
 * Check ML service availability
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);

    if (response.ok) {
      const health = await response.json();
      return res.json({ status: 'healthy', mlService: health });
    }

    res.status(503).json({ status: 'unhealthy', mlService: 'unavailable' });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'ML service unreachable',
      message: IS_DEVELOPMENT ? errorMessage : undefined,
    });
  }
});

export const mlRouter = router;
