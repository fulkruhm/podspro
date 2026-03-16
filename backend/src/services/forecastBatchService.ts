import fetch from 'node-fetch';
import {
  getStoreProductForecastInputs,
  saveStoreProductForecast,
  createBatchJobRun,
  completeBatchJobRun,
  failBatchJobRun,
} from '../db.js';
import { loadAppConfig } from '../config/env.js';

const ML_SERVICE_URL = loadAppConfig().mlServiceUrl;

export const STORE_PRODUCT_FORECAST_JOB_TYPE = 'store_product_forecast';

export interface ForecastBatchOptions {
  historyDays?: number;
  forecastDays?: number;
  minHistoryPoints?: number;
  triggeredBy?: string;
  filters?: {
    region?: string;
    store?: string;
    department?: string;
    product?: string;
    status?: string;
  };
}

export interface ForecastBatchResult {
  totalStoreProducts: number;
  succeeded: number;
  failed: number;
  errors: Array<{ product_id: string; store_id: string; error: string }>;
  runId: number;
}

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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runStoreProductForecastBatch(
  runId: number,
  options: ForecastBatchOptions = {}
): Promise<ForecastBatchResult> {
  const historyDays = Number(options.historyDays ?? 56);
  const forecastDays = Number(options.forecastDays ?? 14);
  const minHistoryPoints = Number(options.minHistoryPoints ?? 14);

  try {
    const forecastInputs = await getStoreProductForecastInputs(
      historyDays,
      minHistoryPoints,
      forecastDays,
      options.filters
    );

    const errors: Array<{ product_id: string; store_id: string; error: string }> = [];
    let succeeded = 0;

    for (const item of forecastInputs) {
      try {
        const response = await fetch(`${ML_SERVICE_URL}/api/ml/forecast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.product_id,
            store_id: item.store_id,
            historical_demand: item.historical_demand,
            historical_features: item.historical_features,
            future_features: item.future_features,
            forecast_days: forecastDays,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          errors.push({
            product_id: item.product_id,
            store_id: item.store_id,
            error: errorText || `HTTP ${response.status}`,
          });
          continue;
        }

        const forecast = (await response.json()) as ForecastServiceResponse;

        await saveStoreProductForecast(
          item.product_id,
          item.store_id,
          forecast.forecast || [],
          forecast.confidence_interval,
          forecast.trend,
          forecast.model_name || 'exponential_smoothing',
          forecast.model_variant,
          forecast.model_version,
          item.historical_demand,
          forecast.explainability
        );

        succeeded += 1;
      } catch (error: unknown) {
        errors.push({
          product_id: item.product_id,
          store_id: item.store_id,
          error: toErrorMessage(error),
        });
      }
    }

    const totalStoreProducts = forecastInputs.length;
    const failed = errors.length;

    await completeBatchJobRun(runId, failed > 0 ? 'partial_success' : 'success', {
      totalItems: totalStoreProducts,
      succeededItems: succeeded,
      failedItems: failed,
      errorSummary: failed > 0 ? `${failed} store-products failed` : undefined,
      details: {
        historyDays,
        forecastDays,
        minHistoryPoints,
        filters: options.filters,
        errors,
      },
    });

    return {
      totalStoreProducts,
      succeeded,
      failed,
      errors,
      runId,
    };
  } catch (error: unknown) {
    await failBatchJobRun(runId, toErrorMessage(error));
    throw error;
  }
}

export async function createStoreProductForecastBatchRun(options: ForecastBatchOptions = {}) {
  const runRecord = await createBatchJobRun(STORE_PRODUCT_FORECAST_JOB_TYPE, options.triggeredBy);
  return runRecord.id as number;
}

export async function executeExistingStoreProductForecastBatch(
  runId: number,
  options: ForecastBatchOptions = {}
): Promise<ForecastBatchResult> {
  return runStoreProductForecastBatch(runId, options);
}

export async function startStoreProductForecastBatch(
  options: ForecastBatchOptions = {}
): Promise<{ runId: number; execution: Promise<ForecastBatchResult> }> {
  const runId = await createStoreProductForecastBatchRun(options);
  const execution = executeExistingStoreProductForecastBatch(runId, options);
  return {
    runId,
    execution,
  };
}

export async function executeStoreProductForecastBatch(
  options: ForecastBatchOptions = {}
): Promise<ForecastBatchResult> {
  const runId = await createStoreProductForecastBatchRun(options);
  return executeExistingStoreProductForecastBatch(runId, options);
}
