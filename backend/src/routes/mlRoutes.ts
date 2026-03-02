/**
 * ML Service Router - Proxy to Python ML microservice
 *
 * This router forwards ML/AI requests to the Python FastAPI service
 * (anomaly detection, forecasting, etc.)
 */

import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { mlLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:5000';

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
      forecast_days,
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

    const forecast = await response.json();
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
router.get('/info', async (req: Request, res: Response) => {
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
router.get('/health', async (req: Request, res: Response) => {
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
