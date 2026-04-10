import nodemailer from 'nodemailer';
import {
  AuditLogSeverity,
  createAuditLog,
  createDigestDeliveryHistory,
  DigestDeliveryConfigRecord,
  getAuditLogs,
  getUserById,
  updateDigestDeliveryRunResult,
} from '../db.js';
import { loadAppConfig } from '../config/env.js';

interface DigestSummary {
  currentLogsCount: number;
  previousLogsCount: number;
  currentWarnings: number;
  currentCritical: number;
  topActions: Array<[string, number]>;
  bullets: string[];
}

interface DigestDeliveryResult {
  status: 'sent' | 'failed';
  summaryText: string;
  error?: string;
}

function getWindowMs(frequency: DigestDeliveryConfigRecord['frequency']) {
  return frequency === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
}

export function computeNextDigestRunAt(
  frequency: DigestDeliveryConfigRecord['frequency'],
  baseTime = Date.now()
) {
  return baseTime + getWindowMs(frequency);
}

function safeChangePct(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function direction(value: number) {
  return value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
}

function passesSearchFilter(query: string, log: Awaited<ReturnType<typeof getAuditLogs>>[number]) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  return (
    log.action.toLowerCase().includes(normalized) ||
    (log.details || '').toLowerCase().includes(normalized) ||
    (log.user_name || '').toLowerCase().includes(normalized) ||
    (log.product_name || '').toLowerCase().includes(normalized)
  );
}

async function buildDigestSummary(config: DigestDeliveryConfigRecord): Promise<DigestSummary> {
  const now = Date.now();
  const windowMs = getWindowMs(config.frequency);
  const currentStart = now - windowMs;
  const previousStart = currentStart - windowMs;

  const filters = config.filters || {};
  const baseOptions = {
    limit: 1000,
    userId: filters.userId,
    region: filters.region,
    store: filters.store,
    department: filters.department,
    productId: filters.productId,
    severity: filters.severity as AuditLogSeverity | undefined,
  };

  const [currentRaw, previousRaw] = await Promise.all([
    getAuditLogs({ ...baseOptions, from: currentStart, to: now }),
    getAuditLogs({ ...baseOptions, from: previousStart, to: currentStart - 1 }),
  ]);

  const query = (filters.searchText || '').trim().toLowerCase();
  const currentLogs = query
    ? currentRaw.filter((log) => passesSearchFilter(query, log))
    : currentRaw;
  const previousLogs = query
    ? previousRaw.filter((log) => passesSearchFilter(query, log))
    : previousRaw;

  const currentWarnings = currentLogs.filter(
    (log) => log.severity === 'warning' || log.severity === 'critical'
  ).length;
  const previousWarnings = previousLogs.filter(
    (log) => log.severity === 'warning' || log.severity === 'critical'
  ).length;

  const currentCritical = currentLogs.filter((log) => log.severity === 'critical').length;
  const previousCritical = previousLogs.filter((log) => log.severity === 'critical').length;

  const actionCounter = new Map<string, number>();
  for (const log of currentLogs) {
    actionCounter.set(log.action, (actionCounter.get(log.action) || 0) + 1);
  }

  const topActions = Array.from(actionCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const storeCounter = new Map<string, number>();
  for (const log of currentLogs) {
    const key = log.store || 'unknown';
    storeCounter.set(key, (storeCounter.get(key) || 0) + 1);
  }
  const topStore = Array.from(storeCounter.entries()).sort((a, b) => b[1] - a[1])[0];

  const userCounter = new Map<string, number>();
  for (const log of currentLogs) {
    const key = log.user_name || 'unknown';
    userCounter.set(key, (userCounter.get(key) || 0) + 1);
  }
  const topUser = Array.from(userCounter.entries()).sort((a, b) => b[1] - a[1])[0];

  const actionChangePct = safeChangePct(currentLogs.length, previousLogs.length);
  const warningChangePct = safeChangePct(currentWarnings, previousWarnings);
  const criticalChangePct = safeChangePct(currentCritical, previousCritical);

  const bullets = [
    `${config.frequency === 'daily' ? 'Past 24h' : 'Past 7d'} volume is ${currentLogs.length.toLocaleString()} actions (${direction(actionChangePct)} ${Math.abs(actionChangePct)}% vs previous window).`,
    `Warnings/critical are ${currentWarnings.toLocaleString()} (${direction(warningChangePct)} ${Math.abs(warningChangePct)}%), with critical at ${currentCritical.toLocaleString()} (${direction(criticalChangePct)} ${Math.abs(criticalChangePct)}%).`,
    topStore
      ? `Highest activity location is ${topStore[0]} with ${topStore[1].toLocaleString()} actions in this window.`
      : 'No store-linked activity in this window.',
    topUser
      ? `Most active user is ${topUser[0]} with ${topUser[1].toLocaleString()} actions in this window.`
      : 'No user activity in this window.',
  ];

  return {
    currentLogsCount: currentLogs.length,
    previousLogsCount: previousLogs.length,
    currentWarnings,
    currentCritical,
    topActions,
    bullets,
  };
}

async function sendDigestEmail(recipient: string, subject: string, body: string) {
  const appConfig = loadAppConfig();

  if (!appConfig.digestSmtpHost || !appConfig.digestEmailFrom) {
    throw new Error('Digest SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: appConfig.digestSmtpHost,
    port: appConfig.digestSmtpPort,
    secure: appConfig.digestSmtpSecure,
    auth:
      appConfig.digestSmtpUser && appConfig.digestSmtpPass
        ? {
            user: appConfig.digestSmtpUser,
            pass: appConfig.digestSmtpPass,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: appConfig.digestEmailFrom,
    to: recipient,
    subject,
    text: body,
  });
}

export async function executeDigestDelivery(
  config: DigestDeliveryConfigRecord,
  mode: 'manual' | 'scheduled'
): Promise<DigestDeliveryResult> {
  const sentAt = Date.now();
  const summary = await buildDigestSummary(config);
  const summaryText = `${summary.currentLogsCount.toLocaleString()} actions, ${summary.currentCritical.toLocaleString()} critical, ${summary.currentWarnings.toLocaleString()} warn/critical`;

  const topActionsText =
    summary.topActions.length > 0
      ? summary.topActions.map(([action, count]) => `${action} (${count})`).join(', ')
      : 'No top actions';

  const subject = `[PODS Digest] ${config.frequency === 'daily' ? 'Daily' : 'Weekly'} Action Intelligence`;
  const bodyLines = [
    `Recipient: ${config.recipient}`,
    `Window: ${config.frequency}`,
    `Summary: ${summaryText}`,
    `Top Actions: ${topActionsText}`,
    'Narrative:',
    ...summary.bullets.map((line) => `- ${line}`),
  ];
  const body = bodyLines.join('\n');

  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | undefined;

  try {
    if (config.channel === 'email') {
      await sendDigestEmail(config.recipient, subject, body);
    }
  } catch (error: unknown) {
    status = 'failed';
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  await createDigestDeliveryHistory({
    configId: config.id,
    userId: config.user_id,
    sentAt,
    mode,
    channel: config.channel,
    recipient: config.recipient,
    frequency: config.frequency,
    summary: summaryText,
    status,
    error: errorMessage ?? null,
  });

  if (config.enabled) {
    await updateDigestDeliveryRunResult({
      configId: config.id,
      lastSentAt: sentAt,
      nextRunAt: computeNextDigestRunAt(config.frequency, sentAt),
    });
  }

  const user = await getUserById(config.user_id);
  await createAuditLog({
    userId: config.user_id,
    userName: user?.name || user?.username || config.user_id,
    action: status === 'sent' ? 'DIGEST_DELIVERY_SENT' : 'DIGEST_DELIVERY_FAILED',
    details: `${mode} ${config.channel} digest for ${config.recipient}: ${summaryText}${errorMessage ? ` | ${errorMessage}` : ''}`,
    category: 'system',
    severity: status === 'sent' ? 'info' : 'warning',
  });

  if (status === 'failed') {
    return { status, summaryText, error: errorMessage || 'Unknown digest delivery error' };
  }

  return { status, summaryText };
}
