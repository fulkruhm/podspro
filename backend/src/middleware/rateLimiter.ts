import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests, please try again later',
};

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */
export function createRateLimiter(options: Partial<RateLimitOptions> = {}) {
  const config = { ...defaultOptions, ...options };
  const store: RateLimitStore = {};

  // Cleanup old entries every 5 minutes
  setInterval(
    () => {
      const now = Date.now();
      for (const key in store) {
        if (store[key].resetTime < now) {
          delete store[key];
        }
      }
    },
    5 * 60 * 1000
  );

  const keyGenerator =
    config.keyGenerator ||
    ((req: Request) => {
      // Use IP address as the key
      return (req.ip || req.socket.remoteAddress || 'unknown') as string;
    });

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return next();
    }

    const entry = store[key];

    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      return next();
    }

    entry.count++;

    // Set rate limit headers
    const resetTime = Math.ceil((entry.resetTime - now) / 1000);
    res.set('X-RateLimit-Limit', config.maxRequests.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
    res.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    if (entry.count > config.maxRequests) {
      res.set('Retry-After', resetTime.toString());
      return res.status(429).json({
        error: config.message,
        retryAfter: resetTime,
      });
    }

    next();
  };
}

/**
 * Moderate rate limiter for authentication endpoints
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per 15 minutes (allows testing/retries)
  message: 'Too many login attempts, please try again later',
});

/**
 * Standard rate limiter for general API endpoints
 */
export const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 300, // 300 requests per minute (handles Regional Analytics concurrent requests)
});

/**
 * Moderate rate limiter for resource-intensive operations
 */
export const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'Too many requests, please slow down',
});

/**
 * Lenient rate limiter for ML endpoints (forecasting, anomaly detection)
 */
export const mlLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 500, // 500 requests per minute (handles multiple regions/products)
  message: 'ML service rate limit exceeded. Please retry after a moment.',
});
