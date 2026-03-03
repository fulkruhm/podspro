import { executeStoreProductForecastBatch } from './forecastBatchService.js';

let schedulerTimer: NodeJS.Timeout | null = null;
let nextRunAt: Date | null = null;

function getScheduleConfig() {
  const hour = Number(process.env.FORECAST_BATCH_HOUR ?? 2);
  const minute = Number(process.env.FORECAST_BATCH_MINUTE ?? 0);

  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 2,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
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
      await executeStoreProductForecastBatch({
        triggeredBy: 'scheduler:nightly',
      });
      console.log('✓ Nightly store-product forecast batch completed');
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
