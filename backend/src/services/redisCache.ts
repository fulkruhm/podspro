import { createHash } from 'crypto';
import { createClient, RedisClientType } from 'redis';
import { loadAppConfig } from '../config/env.js';

let redisClient: RedisClientType | null = null;
let redisConnectAttempted = false;

const inMemoryCache = new Map<string, { expiresAt: number; value: string }>();

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRedisUrl() {
  return loadAppConfig().redisUrl;
}

export function isRedisConfigured() {
  const redisUrl = getRedisUrl();
  return typeof redisUrl === 'string' && redisUrl.trim().length > 0;
}

async function getRedisClient() {
  if (!isRedisConfigured()) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!redisClient && !redisConnectAttempted) {
    redisConnectAttempted = true;
    redisClient = createClient({
      url: getRedisUrl(),
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    redisClient.on('error', (error) => {
      console.error('[redisCache] Redis error:', error.message);
    });
  }

  if (!redisClient) {
    return null;
  }

  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('[redisCache] Redis connection established');
    } catch (error: unknown) {
      console.error(
        '[redisCache] Failed to connect to Redis, using in-memory fallback:',
        toErrorMessage(error)
      );
      return null;
    }
  }

  return redisClient;
}

function cleanupInMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of inMemoryCache.entries()) {
    if (entry.expiresAt <= now) {
      inMemoryCache.delete(key);
    }
  }
}

setInterval(cleanupInMemoryCache, 60_000);

export function buildCacheKey(prefix: string, payload: unknown) {
  const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return `${prefix}:${payloadHash}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (client) {
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  }

  const inMemory = inMemoryCache.get(key);
  if (!inMemory) {
    return null;
  }

  if (inMemory.expiresAt <= Date.now()) {
    inMemoryCache.delete(key);
    return null;
  }

  return JSON.parse(inMemory.value) as T;
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  const client = await getRedisClient();
  const encoded = JSON.stringify(value);

  if (client) {
    await client.set(key, encoded, { EX: Math.max(1, Math.floor(ttlSeconds)) });
    return;
  }

  inMemoryCache.set(key, {
    value: encoded,
    expiresAt: Date.now() + Math.max(1, Math.floor(ttlSeconds)) * 1000,
  });
}

export async function getCacheDependencyStatus() {
  if (!isRedisConfigured()) {
    return {
      configured: false,
      backend: 'memory',
      ready: true,
    } as const;
  }

  const client = await getRedisClient();
  if (!client) {
    return {
      configured: true,
      backend: 'memory_fallback',
      ready: false,
    } as const;
  }

  try {
    const ping = await client.ping();
    return {
      configured: true,
      backend: 'redis',
      ready: ping === 'PONG',
    } as const;
  } catch {
    return {
      configured: true,
      backend: 'memory_fallback',
      ready: false,
    } as const;
  }
}
