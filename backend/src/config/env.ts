type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  frontendUrl?: string;
  databaseUrl: string;
  mlServiceUrl: string;
  redisUrl?: string;
  authSecret: string;
  authTokenTtlMinutes: number;
  refreshTokenTtlMinutes: number;
  forecastBatchQueueAttempts: number;
  forecastBatchQueueBackoffMs: number;
  forecastBatchQueueConcurrency: number;
  forecastBatchHour: number;
  forecastBatchMinute: number;
  batchRunStaleMinutes: number;
  mlAnomalyCacheTtlSeconds: number;
  mlForecastCacheTtlSeconds: number;
  mlInfoCacheTtlSeconds: number;
  aiResponseTimeoutMs?: number;
  geminiApiKey?: string;
  geminiFastModel: string;
  geminiProModel: string;
  geminiAnomalyModel: string;
}

const DEFAULT_PORT = 3001;
const DEFAULT_DATABASE_URL = 'postgresql://pods_user:pods_password@localhost:5432/pods_db';
const DEFAULT_ML_SERVICE_URL = 'http://ml-service:5000';
const DEFAULT_AUTH_SECRET = 'pods-dev-auth-secret-change-me';
const DEFAULT_AUTH_TOKEN_TTL_MINUTES = 8 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_MINUTES = 60 * 24 * 7;
const DEFAULT_FORECAST_BATCH_QUEUE_ATTEMPTS = 3;
const DEFAULT_FORECAST_BATCH_QUEUE_BACKOFF_MS = 5000;
const DEFAULT_FORECAST_BATCH_QUEUE_CONCURRENCY = 1;
const DEFAULT_FORECAST_BATCH_HOUR = 2;
const DEFAULT_FORECAST_BATCH_MINUTE = 0;
const DEFAULT_BATCH_RUN_STALE_MINUTES = 45;
const DEFAULT_ML_ANOMALY_CACHE_TTL_SECONDS = 120;
const DEFAULT_ML_FORECAST_CACHE_TTL_SECONDS = 300;
const DEFAULT_ML_INFO_CACHE_TTL_SECONDS = 600;
const DEFAULT_GEMINI_FAST_MODEL = 'gemini-3.1-pro-preview';
const DEFAULT_GEMINI_PRO_MODEL = 'gemini-3.1-pro-preview';
const DEFAULT_GEMINI_ANOMALY_MODEL = 'gemini-3-flash-preview';

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return parsed;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (!value) {
    return 'development';
  }

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error("NODE_ENV must be one of: 'development', 'test', 'production'");
}

function parseOptionalUrl(value: string | undefined, envName: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error(`${envName} must be an http or https URL`);
    }
    return value;
  } catch {
    throw new Error(`${envName} must be a valid URL`);
  }
}

function parseDatabaseUrl(value: string | undefined): string {
  const finalValue = value || DEFAULT_DATABASE_URL;

  try {
    const parsed = new URL(finalValue);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error('DATABASE_URL must use postgres or postgresql scheme');
    }
    return finalValue;
  } catch {
    throw new Error('DATABASE_URL must be a valid postgres URL');
  }
}

function parseMlServiceUrl(value: string | undefined): string {
  const finalValue = value || DEFAULT_ML_SERVICE_URL;

  try {
    const parsed = new URL(finalValue);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('ML_SERVICE_URL must use http or https');
    }
    return finalValue;
  } catch {
    throw new Error('ML_SERVICE_URL must be a valid URL');
  }
}

function parseOptionalRedisUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
      throw new Error('REDIS_URL must use redis or rediss scheme');
    }
    return value;
  } catch {
    throw new Error('REDIS_URL must be a valid redis URL');
  }
}

function parseAuthSecret(value: string | undefined, nodeEnv: NodeEnv): string {
  const secret = value || DEFAULT_AUTH_SECRET;
  if (nodeEnv === 'production' && secret === DEFAULT_AUTH_SECRET) {
    throw new Error('AUTH_SECRET must be set in production');
  }
  if (secret.length < 24) {
    throw new Error('AUTH_SECRET must be at least 24 characters long');
  }
  return secret;
}

function parseAuthTokenTtlMinutes(value: string | undefined): number {
  if (!value) {
    return DEFAULT_AUTH_TOKEN_TTL_MINUTES;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 60 * 24 * 7) {
    throw new Error('AUTH_TOKEN_TTL_MINUTES must be an integer between 1 and 10080');
  }

  return parsed;
}

function parseRefreshTokenTtlMinutes(value: string | undefined): number {
  if (!value) {
    return DEFAULT_REFRESH_TOKEN_TTL_MINUTES;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 60 * 24 * 30) {
    throw new Error('REFRESH_TOKEN_TTL_MINUTES must be an integer between 1 and 43200');
  }

  return parsed;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  envName: string,
  min: number,
  max: number
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${envName} must be an integer between ${min} and ${max}`);
  }

  return parsed;
}

function parseForecastBatchHour(value: string | undefined): number {
  return parsePositiveInteger(value, DEFAULT_FORECAST_BATCH_HOUR, 'FORECAST_BATCH_HOUR', 0, 23);
}

function parseForecastBatchMinute(value: string | undefined): number {
  return parsePositiveInteger(value, DEFAULT_FORECAST_BATCH_MINUTE, 'FORECAST_BATCH_MINUTE', 0, 59);
}

function parseOptionalTimeoutMs(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1000 || parsed > 300000) {
    throw new Error('AI_RESPONSE_TIMEOUT_MS must be an integer between 1000 and 300000');
  }

  return parsed;
}

function parseOptionalSecret(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const errors: string[] = [];

  let port = DEFAULT_PORT;
  let nodeEnv: NodeEnv = 'development';
  let frontendUrl: string | undefined;
  let databaseUrl = DEFAULT_DATABASE_URL;
  let mlServiceUrl = DEFAULT_ML_SERVICE_URL;
  let redisUrl: string | undefined;
  let authSecret = DEFAULT_AUTH_SECRET;
  let authTokenTtlMinutes = DEFAULT_AUTH_TOKEN_TTL_MINUTES;
  let refreshTokenTtlMinutes = DEFAULT_REFRESH_TOKEN_TTL_MINUTES;
  let forecastBatchQueueAttempts = DEFAULT_FORECAST_BATCH_QUEUE_ATTEMPTS;
  let forecastBatchQueueBackoffMs = DEFAULT_FORECAST_BATCH_QUEUE_BACKOFF_MS;
  let forecastBatchQueueConcurrency = DEFAULT_FORECAST_BATCH_QUEUE_CONCURRENCY;
  let forecastBatchHour = DEFAULT_FORECAST_BATCH_HOUR;
  let forecastBatchMinute = DEFAULT_FORECAST_BATCH_MINUTE;
  let batchRunStaleMinutes = DEFAULT_BATCH_RUN_STALE_MINUTES;
  let mlAnomalyCacheTtlSeconds = DEFAULT_ML_ANOMALY_CACHE_TTL_SECONDS;
  let mlForecastCacheTtlSeconds = DEFAULT_ML_FORECAST_CACHE_TTL_SECONDS;
  let mlInfoCacheTtlSeconds = DEFAULT_ML_INFO_CACHE_TTL_SECONDS;
  let aiResponseTimeoutMs: number | undefined;
  let geminiApiKey: string | undefined;
  let geminiFastModel = DEFAULT_GEMINI_FAST_MODEL;
  let geminiProModel = DEFAULT_GEMINI_PRO_MODEL;
  let geminiAnomalyModel = DEFAULT_GEMINI_ANOMALY_MODEL;

  try {
    port = parsePort(env.PORT);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    nodeEnv = parseNodeEnv(env.NODE_ENV);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    frontendUrl = parseOptionalUrl(env.FRONTEND_URL, 'FRONTEND_URL');
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    databaseUrl = parseDatabaseUrl(env.DATABASE_URL);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    mlServiceUrl = parseMlServiceUrl(env.ML_SERVICE_URL);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    redisUrl = parseOptionalRedisUrl(env.REDIS_URL);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    authSecret = parseAuthSecret(env.AUTH_SECRET, nodeEnv);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    authTokenTtlMinutes = parseAuthTokenTtlMinutes(env.AUTH_TOKEN_TTL_MINUTES);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    refreshTokenTtlMinutes = parseRefreshTokenTtlMinutes(env.REFRESH_TOKEN_TTL_MINUTES);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    forecastBatchQueueAttempts = parsePositiveInteger(
      env.FORECAST_BATCH_QUEUE_ATTEMPTS,
      DEFAULT_FORECAST_BATCH_QUEUE_ATTEMPTS,
      'FORECAST_BATCH_QUEUE_ATTEMPTS',
      1,
      10
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    forecastBatchQueueBackoffMs = parsePositiveInteger(
      env.FORECAST_BATCH_QUEUE_BACKOFF_MS,
      DEFAULT_FORECAST_BATCH_QUEUE_BACKOFF_MS,
      'FORECAST_BATCH_QUEUE_BACKOFF_MS',
      100,
      300000
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    forecastBatchQueueConcurrency = parsePositiveInteger(
      env.FORECAST_BATCH_QUEUE_CONCURRENCY,
      DEFAULT_FORECAST_BATCH_QUEUE_CONCURRENCY,
      'FORECAST_BATCH_QUEUE_CONCURRENCY',
      1,
      20
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    forecastBatchHour = parseForecastBatchHour(env.FORECAST_BATCH_HOUR);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    forecastBatchMinute = parseForecastBatchMinute(env.FORECAST_BATCH_MINUTE);
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    batchRunStaleMinutes = parsePositiveInteger(
      env.BATCH_RUN_STALE_MINUTES,
      DEFAULT_BATCH_RUN_STALE_MINUTES,
      'BATCH_RUN_STALE_MINUTES',
      1,
      720
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    mlAnomalyCacheTtlSeconds = parsePositiveInteger(
      env.ML_ANOMALY_CACHE_TTL_SECONDS,
      DEFAULT_ML_ANOMALY_CACHE_TTL_SECONDS,
      'ML_ANOMALY_CACHE_TTL_SECONDS',
      1,
      86400
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    mlForecastCacheTtlSeconds = parsePositiveInteger(
      env.ML_FORECAST_CACHE_TTL_SECONDS,
      DEFAULT_ML_FORECAST_CACHE_TTL_SECONDS,
      'ML_FORECAST_CACHE_TTL_SECONDS',
      1,
      86400
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    mlInfoCacheTtlSeconds = parsePositiveInteger(
      env.ML_INFO_CACHE_TTL_SECONDS,
      DEFAULT_ML_INFO_CACHE_TTL_SECONDS,
      'ML_INFO_CACHE_TTL_SECONDS',
      1,
      86400
    );
  } catch (error: any) {
    errors.push(error.message);
  }

  try {
    aiResponseTimeoutMs = parseOptionalTimeoutMs(env.AI_RESPONSE_TIMEOUT_MS);
  } catch (error: any) {
    errors.push(error.message);
  }

  geminiApiKey = parseOptionalSecret(env.GEMINI_API_KEY) || parseOptionalSecret(env.API_KEY);
  geminiFastModel = parseOptionalSecret(env.GEMINI_FAST_MODEL) || DEFAULT_GEMINI_FAST_MODEL;
  geminiProModel = parseOptionalSecret(env.GEMINI_PRO_MODEL) || DEFAULT_GEMINI_PRO_MODEL;
  geminiAnomalyModel = parseOptionalSecret(env.GEMINI_ANOMALY_MODEL) || DEFAULT_GEMINI_ANOMALY_MODEL;

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    port,
    nodeEnv,
    frontendUrl,
    databaseUrl,
    mlServiceUrl,
    redisUrl,
    authSecret,
    authTokenTtlMinutes,
    refreshTokenTtlMinutes,
    forecastBatchQueueAttempts,
    forecastBatchQueueBackoffMs,
    forecastBatchQueueConcurrency,
    forecastBatchHour,
    forecastBatchMinute,
    batchRunStaleMinutes,
    mlAnomalyCacheTtlSeconds,
    mlForecastCacheTtlSeconds,
    mlInfoCacheTtlSeconds,
    aiResponseTimeoutMs,
    geminiApiKey,
    geminiFastModel,
    geminiProModel,
    geminiAnomalyModel,
  };
}
