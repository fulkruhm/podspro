import { Request, Response, NextFunction } from 'express';
import { loadAppConfig } from '../config/env.js';

const appConfig = loadAppConfig();

/**
 * Security headers middleware
 * Adds important security headers to all responses
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.set('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');

  // Control referrer information
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable browser features that could be misused
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://aistudio.google.com"
  );

  // Strict Transport Security (HTTPS only)
  if (appConfig.nodeEnv === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * Input sanitization - prevent common attacks
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const sanitize = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitize(val);
      }
      return sanitized;
    }

    return value;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
}
