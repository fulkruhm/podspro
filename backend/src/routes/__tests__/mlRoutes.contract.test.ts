import { AddressInfo } from 'net';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fetchFromMlService from 'node-fetch';

vi.mock('../../db.js', () => ({
  getLatestBatchJobRun: vi.fn(async () => null),
  saveStoreProductForecast: vi.fn(async () => null),
  getForecastReviewItems: vi.fn(async () => []),
  createForecastReviewDecision: vi.fn(async () => ({ id: 1 })),
  isAccessTokenRevoked: vi.fn(async () => false),
}));

vi.mock('../../services/forecastBatchService.js', () => ({
  STORE_PRODUCT_FORECAST_JOB_TYPE: 'store_product_forecast',
}));

vi.mock('../../services/forecastBatchQueue.js', () => ({
  enqueueStoreProductForecastBatch: vi.fn(async () => ({
    runId: 1,
    queued: true,
    duplicate: false,
  })),
  getForecastBatchQueueStats: vi.fn(async () => ({
    mode: 'redis_queue',
    workerInitialized: true,
    counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
  })),
  getFailedForecastBatchJobs: vi.fn(async () => []),
  retryFailedForecastBatchRun: vi.fn(async () => ({ retried: false, reason: 'run_not_found_in_failed_queue' })),
}));

vi.mock('../../services/forecastBatchScheduler.js', () => ({
  getNextNightlyForecastRun: vi.fn(() => null),
}));

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import { mlRouter } from '../mlRoutes.js';
import { signAuthToken } from '../../auth/token.js';

describe('ml routes contract and auth', () => {
  let server: import('http').Server;
  let baseUrl = '';

  beforeEach(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/ml', mlRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  const issueToken = (role: 'admin' | 'sysadmin' | 'store_user' | 'logistics_user') => {
    const { token } = signAuthToken({
      sub: 'u1',
      username: 'tester',
      name: 'Tester',
      role,
      status: 'active',
    });
    return token;
  };

  afterEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('rejects requests without user role header', async () => {
    const response = await fetch(`${baseUrl}/api/ml/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ historical_demand: [10, 11, 12], persist: false }),
    });

    expect(response.status).toBe(401);
    const payload = await response.json() as any;
    expect(payload.error).toContain('Authentication required');
  });

  it('validates forecast payload strictly', async () => {
    const response = await fetch(`${baseUrl}/api/ml/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${issueToken('admin')}`,
      },
      body: JSON.stringify({ historical_demand: [10], persist: false, extra_key: true }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json() as any;
    expect(payload.error).toBe('Validation failed');
  });

  it('proxies valid forecast payload to ML service', async () => {
    const mockFetch = vi.mocked(fetchFromMlService as unknown as (...args: any[]) => any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        product_id: 'p1',
        store_id: 's1',
        forecast: [12, 13],
        confidence_interval: [10, 14],
      }),
    } as any);

    const response = await fetch(`${baseUrl}/api/ml/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${issueToken('admin')}`,
      },
      body: JSON.stringify({
        product_id: 'p1',
        store_id: 's1',
        historical_demand: [8, 9, 10, 11],
        forecast_days: 2,
        persist: false,
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as any;
    expect(payload.product_id).toBe('p1');
    expect(payload.forecast).toEqual([12, 13]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/ml/forecast');
  });

  it('enforces admin role on batch status endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/ml/forecast/batch/status`, {
      headers: {
        'Authorization': `Bearer ${issueToken('store_user')}`,
      },
    });

    expect(response.status).toBe(403);
    const payload = await response.json() as any;
    expect(payload.error).toContain('Insufficient permissions');
  });

  it('enforces admin role on queue status endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/ml/forecast/batch/queue`, {
      headers: {
        'Authorization': `Bearer ${issueToken('store_user')}`,
      },
    });

    expect(response.status).toBe(403);
    const payload = await response.json() as any;
    expect(payload.error).toContain('Insufficient permissions');
  });
});
