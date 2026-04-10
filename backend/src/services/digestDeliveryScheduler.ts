import { getDueDigestDeliveryConfigs, waitForDatabaseInitialization } from '../db.js';
import { loadAppConfig } from '../config/env.js';
import { executeDigestDelivery } from './digestDeliveryService.js';

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerRunning = false;

function getPollIntervalMs() {
  const appConfig = loadAppConfig();
  return appConfig.digestSchedulerPollSeconds * 1000;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function processDueDigestDeliveries() {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;
  try {
    const dueConfigs = await getDueDigestDeliveryConfigs(Date.now(), 25);
    for (const config of dueConfigs) {
      try {
        await executeDigestDelivery(config, 'scheduled');
      } catch (error: unknown) {
        console.error('Scheduled digest delivery failed:', toErrorMessage(error));
      }
    }
  } catch (error: unknown) {
    console.error('Digest scheduler iteration failed:', toErrorMessage(error));
  } finally {
    schedulerRunning = false;
  }
}

export function startDigestDeliveryScheduler() {
  void (async () => {
    await waitForDatabaseInitialization();

    const intervalMs = getPollIntervalMs();
    const pollMs = Math.max(10_000, intervalMs);

    if (schedulerTimer) {
      clearInterval(schedulerTimer);
    }

    schedulerTimer = setInterval(() => {
      void processDueDigestDeliveries();
    }, pollMs);

    await processDueDigestDeliveries();
    console.log(`Digest delivery scheduler started (poll=${pollMs}ms)`);
  })().catch((error: unknown) => {
    console.error('Digest scheduler startup failed:', toErrorMessage(error));
  });
}
