import { enqueueStoreProductForecastBatch } from './forecastBatchQueue.js';
import { loadAppConfig } from '../config/env.js';

let schedulerTimer: NodeJS.Timeout | null = null;
let nextRunAt: Date | null = null;

function getScheduleConfig() {
  const appConfig = loadAppConfig();
  return {
    hour: appConfig.forecastBatchHour,
    minute: appConfig.forecastBatchMinute,
  };
}

function computeNextRunDate(now: Date): Date {
  const { hour, minute } = getScheduleConfig();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);

  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}

function scheduleNextRun() {
  const now = new Date();
  nextRunAt = computeNextRunDate(now);
  const delayMs = Math.max(1000, nextRunAt.getTime() - now.getTime());

  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
  }

  schedulerTimer = setTimeout(async () => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      await enqueueStoreProductForecastBatch({
        triggeredBy: 'scheduler:nightly',
        idempotencyKey: `scheduler:${dateKey}`,
      });
      console.log('✓ Nightly store-product forecast batch submitted');
    } catch (error: any) {
      console.error('Nightly forecast batch failed:', error?.message || error);
    } finally {
      scheduleNextRun();
    }
  }, delayMs);

  console.log(`Nightly forecast batch scheduled for ${nextRunAt.toISOString()}`);
}

export function startNightlyForecastScheduler() {
  scheduleNextRun();
}

export function getNextNightlyForecastRun() {
  return nextRunAt;
}
