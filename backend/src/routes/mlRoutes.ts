/**
 * ML Service Router - Proxy to Python ML microservice
 *
 * This router forwards ML/AI requests to the Python FastAPI service
 * (anomaly detection, forecasting, etc.)
 */

import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { mlLimiter } from '../middleware/rateLimiter.js';
import {
  getLatestBatchJobRun,
  saveStoreProductForecast,
  getForecastReviewItems,
  createForecastReviewDecision,
} from '../db.js';
import { startStoreProductForecastBatch, STORE_PRODUCT_FORECAST_JOB_TYPE } from '../services/forecastBatchService.js';
import { getNextNightlyForecastRun } from '../services/forecastBatchScheduler.js';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:5000';

interface ForecastServiceResponse {
  product_id: string;
  store_id: string;
  forecast: number[];
  confidence_interval?: [number, number];
  trend?: string;
  explainability?: string[];
}

function isAdminRole(role: string | undefined) {
  return role === 'admin' || role === 'sysadmin';
}

/**
 * Anomaly Detection Endpoint
 * POST /api/ml/anomalies/detect
 *
 * Detects anomalies in inventory data using isolation forest
 */
router.post('/anomalies/detect', mlLimiter, async (req: Request, res: Response) => {
  try {
    const { datapoints, sensitivity } = req.body;

    if (!datapoints || !Array.isArray(datapoints)) {
      return res.status(400).json({ error: 'Invalid datapoints' });
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
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }

    const results = await response.json();
    res.json(results);
  } catch (error: any) {
    console.error('Anomaly detection error:', error.message);
    res.status(503).json({
      error: 'ML service unavailable',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Demand Forecasting Endpoint (with lenient rate limiting for concurrent requests)
 * POST /api/ml/forecast
 *
 * Forecasts future demand using exponential smoothing
 */
router.post('/forecast', mlLimiter, async (req: Request, res: Response) => {
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

    if (!historical_demand || !Array.isArray(historical_demand)) {
      return res.status(400).json({ error: 'Invalid historical_demand' });
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
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }

    const forecast = await response.json() as ForecastServiceResponse;

    if (persist !== false && Array.isArray(forecast?.forecast)) {
      await saveStoreProductForecast(
        product_id,
        store_id,
        forecast.forecast,
        forecast.confidence_interval,
        forecast.trend,
        'exponential_smoothing',
        historical_demand,
        forecast.explainability
      );
    }

    res.json(forecast);
  } catch (error: any) {
    console.error('Forecast error:', error.message);
    res.status(503).json({
      error: 'ML service unavailable',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Batch Forecast Endpoint for all store-product combinations
 * POST /api/ml/forecast/batch/store-products
 *
 * Uses historical demand at store-product level and persists forecast output.
 */
router.post('/forecast/batch/store-products', mlLimiter, async (req: Request, res: Response) => {
  try {
    const requesterRole = req.header('x-user-role') || undefined;
    if (!isAdminRole(requesterRole)) {
      return res.status(403).json({ error: 'Only admin users can trigger forecast batch runs' });
    }

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

    const triggeredBy = req.header('x-user-name') || 'admin_manual';
    const { runId, execution } = await startStoreProductForecastBatch({
      historyDays,
      forecastDays,
      minHistoryPoints,
      triggeredBy,
      filters,
    });

    execution.catch((executionError: any) => {
      console.error('Background store-product forecast batch failed:', executionError?.message || executionError);
    });

    res.status(202).json({
      run_id: runId,
      status: 'running',
      message: 'Forecast batch accepted and running in background',
    });
  } catch (error: any) {
    console.error('Batch store-product forecast error:', error.message);
    res.status(503).json({
      error: 'Batch forecast failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Forecast Batch Status Endpoint (admin only)
 * GET /api/ml/forecast/batch/status
 */
router.get('/forecast/batch/status', mlLimiter, async (req: Request, res: Response) => {
  try {
    const requesterRole = req.header('x-user-role') || undefined;
    if (!isAdminRole(requesterRole)) {
      return res.status(403).json({ error: 'Only admin users can view forecast batch status' });
    }

    const latestRun = await getLatestBatchJobRun(STORE_PRODUCT_FORECAST_JOB_TYPE);
    const nextRunAt = getNextNightlyForecastRun();

    return res.json({
      latest_run: latestRun,
      next_scheduled_run_at: nextRunAt ? nextRunAt.toISOString() : null,
    });
  } catch (error: any) {
    console.error('Forecast batch status error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch forecast batch status',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/forecast/review-items', mlLimiter, async (req: Request, res: Response) => {
  try {
    const requesterRole = req.header('x-user-role') || undefined;
    if (!isAdminRole(requesterRole)) {
      return res.status(403).json({ error: 'Only admin users can view forecast review items' });
    }

    const limit = Number(req.query?.limit ?? 50);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(200, Math.floor(limit)) : 50;

    const items = await getForecastReviewItems(safeLimit);
    return res.json({ items });
  } catch (error: any) {
    console.error('Forecast review items error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch forecast review items',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/forecast/review-items/:productId/:storeId/decision', mlLimiter, async (req: Request, res: Response) => {
  try {
    const requesterRole = req.header('x-user-role') || undefined;
    if (!isAdminRole(requesterRole)) {
      return res.status(403).json({ error: 'Only admin users can submit forecast review decisions' });
    }

    const { productId, storeId } = req.params;
    const decisionStatus = req.body?.decision_status;
    const baselineAdjustmentPct = req.body?.baseline_adjustment_pct;
    const notes = req.body?.notes;
    const decidedBy = req.header('x-user-name') || 'admin';

    const allowedStatuses = ['accept_model', 'adjust_baseline', 'flag_data_issue', 'request_override'];
    if (!allowedStatuses.includes(decisionStatus)) {
      return res.status(400).json({ error: 'Invalid decision_status' });
    }

    let normalizedBaselineAdjustment: number | null | undefined = null;
    if (baselineAdjustmentPct !== undefined && baselineAdjustmentPct !== null && baselineAdjustmentPct !== '') {
      const parsed = Number(baselineAdjustmentPct);
      if (!Number.isFinite(parsed) || parsed < -50 || parsed > 50) {
        return res.status(400).json({ error: 'baseline_adjustment_pct must be between -50 and 50' });
      }
      normalizedBaselineAdjustment = parsed;
    }

    const decision = await createForecastReviewDecision({
      productId,
      storeId,
      decisionStatus,
      baselineAdjustmentPct: decisionStatus === 'adjust_baseline' ? (normalizedBaselineAdjustment ?? 0) : null,
      notes: typeof notes === 'string' ? notes : undefined,
      decidedBy,
    });

    return res.json({ decision });
  } catch (error: any) {
    console.error('Forecast review decision error:', error.message);
    res.status(500).json({
      error: 'Failed to save forecast review decision',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Batch Analysis Endpoint (with lenient rate limiting)
 * POST /api/ml/batch-analysis
 *
 * Run multiple analyses (anomalies + forecasts) in one request
 */
router.post('/batch-analysis', mlLimiter, async (req: Request, res: Response) => {
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
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }

    const results = await response.json();
    res.json(results);
  } catch (error: any) {
    console.error('Batch analysis error:', error.message);
    res.status(503).json({
      error: 'ML service unavailable',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * ML Service Info Endpoint
 * GET /api/ml/info
 *
 * Get information about available ML capabilities
 */
router.get('/info', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/ml/info`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Could not fetch ML service info' });
    }

    const info = await response.json();
    res.json(info);
  } catch (error: any) {
    console.error('ML info error:', error.message);
    res.status(503).json({
      error: 'ML service unavailable',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'ML service unreachable',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export const mlRouter = router;
