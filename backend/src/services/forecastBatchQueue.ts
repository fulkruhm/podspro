import { createHash } from 'crypto';
import { Job, Queue, Worker } from 'bullmq';
import {
  createStoreProductForecastBatchRun,
  executeExistingStoreProductForecastBatch,
  ForecastBatchOptions,
  ForecastBatchResult,
  STORE_PRODUCT_FORECAST_JOB_TYPE,
} from './forecastBatchService.js';
import { loadAppConfig } from '../config/env.js';

interface ForecastBatchJobPayload {
  runId: number;
  options: ForecastBatchOptions;
}

interface FailedQueueJobSummary {
  jobId: string;
  runId: number;
  failedReason: string;
  attemptsMade: number;
  attemptsConfigured: number;
  timestamp: number;
}

const QUEUE_NAME = 'pods-forecast-batch';
let queue: Queue<ForecastBatchJobPayload> | null = null;
let worker: Worker<ForecastBatchJobPayload, ForecastBatchResult> | null = null;
let workerInitialized = false;

function getRedisConnectionOptions() {
  const redisUrl = loadAppConfig().redisUrl;
  if (!redisUrl) {
    return null;
  }

  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : 0,
      maxRetriesPerRequest: null as null,
    };
  } catch {
    return null;
  }
}

function hasQueueSupport() {
  return !!getRedisConnectionOptions();
}

function getAttempts() {
  return loadAppConfig().forecastBatchQueueAttempts;
}

function getBackoffMs() {
  return loadAppConfig().forecastBatchQueueBackoffMs;
}

function buildJobId(idempotencyKey: string | undefined, options: ForecastBatchOptions) {
  if (!idempotencyKey) {
    return undefined;
  }

  const normalizedOptions = {
    historyDays: options.historyDays ?? 56,
    forecastDays: options.forecastDays ?? 14,
    minHistoryPoints: options.minHistoryPoints ?? 14,
    filters: options.filters ?? {},
  };

  const digest = createHash('sha256')
    .update(`${idempotencyKey}:${JSON.stringify(normalizedOptions)}`)
    .digest('hex');

  return `forecast-batch:${digest}`;
}

async function getQueue() {
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return null;
  }

  if (!queue) {
    queue = new Queue<ForecastBatchJobPayload>(QUEUE_NAME, { connection });
  }

  return queue;
}

async function initializeWorker() {
  if (workerInitialized || !hasQueueSupport()) {
    return;
  }

  workerInitialized = true;
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return;
  }

  worker = new Worker<ForecastBatchJobPayload, ForecastBatchResult>(
    QUEUE_NAME,
    async (job: Job<ForecastBatchJobPayload>) => {
      return executeExistingStoreProductForecastBatch(job.data.runId, job.data.options);
    },
    {
      connection,
      concurrency: loadAppConfig().forecastBatchQueueConcurrency,
    }
  );

  worker.on('failed', (job, error) => {
    console.error('[forecastBatchQueue] Job failed', {
      jobId: job?.id,
      runId: job?.data?.runId,
      attemptsMade: job?.attemptsMade,
      error: error?.message || error,
    });
  });

  worker.on('completed', (job) => {
    console.log('[forecastBatchQueue] Job completed', {
      jobId: job.id,
      runId: job.data.runId,
    });
  });

  console.log('[forecastBatchQueue] Worker initialized');
}

export async function initializeForecastBatchQueueProcessing() {
  await initializeWorker();
}

export async function enqueueStoreProductForecastBatch(
  options: ForecastBatchOptions & { idempotencyKey?: string } = {}
): Promise<{
  runId: number;
  queued: boolean;
  duplicate: boolean;
  execution?: Promise<ForecastBatchResult>;
}> {
  await initializeWorker();

  const queueInstance = await getQueue();
  if (!queueInstance) {
    const runId = await createStoreProductForecastBatchRun(options);
    const execution = executeExistingStoreProductForecastBatch(runId, options);
    return {
      runId,
      queued: false,
      duplicate: false,
      execution,
    };
  }

  const jobId = buildJobId(options.idempotencyKey, options);
  if (jobId) {
    const existing = await queueInstance.getJob(jobId);
    if (existing) {
      return {
        runId: existing.data.runId,
        queued: true,
        duplicate: true,
      };
    }
  }

  const runId = await createStoreProductForecastBatchRun(options);
  await queueInstance.add(
    STORE_PRODUCT_FORECAST_JOB_TYPE,
    {
      runId,
      options,
    },
    {
      jobId,
      attempts: getAttempts(),
      backoff: {
        type: 'exponential',
        delay: getBackoffMs(),
      },
      removeOnComplete: {
        age: 60 * 60,
        count: 200,
      },
      removeOnFail: {
        age: 60 * 60 * 24,
        count: 1000,
      },
    }
  );

  return {
    runId,
    queued: true,
    duplicate: false,
  };
}

export async function getForecastBatchQueueStats() {
  await initializeWorker();

  const queueInstance = await getQueue();
  if (!queueInstance) {
    return {
      mode: 'in_process_fallback',
      workerInitialized,
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      },
    } as const;
  }

  const counts = await queueInstance.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused'
  );
  return {
    mode: 'redis_queue',
    workerInitialized,
    counts,
  } as const;
}

export async function getFailedForecastBatchJobs(limit = 20): Promise<FailedQueueJobSummary[]> {
  await initializeWorker();

  const queueInstance = await getQueue();
  if (!queueInstance) {
    return [];
  }

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.floor(limit)) : 20;
  const jobs = await queueInstance.getJobs(['failed'], 0, safeLimit - 1, true);

  return jobs.map((job) => ({
    jobId: String(job.id),
    runId: job.data.runId,
    failedReason: job.failedReason || 'Unknown failure',
    attemptsMade: job.attemptsMade,
    attemptsConfigured: job.opts.attempts || 1,
    timestamp: job.timestamp,
  }));
}

export async function retryFailedForecastBatchRun(runId: number) {
  await initializeWorker();

  const queueInstance = await getQueue();
  if (!queueInstance) {
    return {
      retried: false,
      reason: 'queue_unavailable',
    } as const;
  }

  const failedJobs = await queueInstance.getJobs(['failed'], 0, 200, true);
  const targetJob = failedJobs.find((job) => job.data.runId === runId);

  if (!targetJob) {
    return {
      retried: false,
      reason: 'run_not_found_in_failed_queue',
    } as const;
  }

  await targetJob.retry();
  return {
    retried: true,
    jobId: String(targetJob.id),
  } as const;
}
