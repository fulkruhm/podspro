# Rate Limiter Configuration Fix

## Problem Identified

Users were getting "Too many requests" errors across the entire application:
- **Regional Analytics** (anomaly detection and forecasting) throwing rate limit errors
- **Login** also rate-limited with only 5 attempts per 15 minutes
- Error response: `{"error":"Too many requests, please try again later","retryAfter":876}`

### Root Cause

The rate limiter configuration in the backend was too aggressive:

**Old Configuration**:
- **Global API Limiter**: 100 requests per 15 minutes (applied to ALL endpoints)
- **Auth Limiter**: 5 login attempts per 15 minutes (too strict for testing/legitimate users)
- **Strict Limiter**: 10 requests per 1 minute (very restrictive)
- **No dedicated ML limiter**: ML endpoints were hitting the global 100/15min limit

This configuration was problematic because:
1. ML endpoints (anomaly detection, forecasting) require multiple concurrent requests
2. Regional Analytics loads data for multiple regions/products at once
3. The frontend caching wasn't preventing the backend from being hit again within the window
4. Auth limiter was too strict (5 attempts in 15 min = 1 attempt per 3 minutes)

## Solution Implemented

### Changes Made

#### 1. Updated `/backend/src/middleware/rateLimiter.ts`

**New Rate Limiter Configuration**:

| Limiter | Window | Max Requests | Use Case |
|---------|--------|--------------|----------|
| **authLimiter** | 15 minutes | 20 | Login attempts (up from 5) |
| **apiLimiter** | 1 minute | 300 | General API endpoints |
| **strictLimiter** | 1 minute | 30 | Resource-intensive ops (chat, updates) |
| **mlLimiter** | 1 minute | 500 | ML endpoints (NEW) |

**Why These Numbers?**
- **Auth (20/15min)**: Allows legitimate users to retry failed logins without hitting limits
- **API (300/min)**: Handles normal app usage with good performance margin
- **ML (500/min)**: Handles concurrent requests from Regional Analytics (multiple regions × multiple products × anomaly + forecast)
- **Strict (30/min)**: Protects resource-intensive operations from abuse

#### 2. Applied New `mlLimiter` to ML Routes

Updated `/backend/src/routes/mlRoutes.ts` to apply the dedicated ML limiter:

```typescript
import { mlLimiter } from '../middleware/rateLimiter.js';

// Applied to all ML endpoints
router.post('/anomalies/detect', mlLimiter, async (req, res) => { ... });
router.post('/forecast', mlLimiter, async (req, res) => { ... });
router.post('/batch-analysis', mlLimiter, async (req, res) => { ... });
```

### Why Lenient ML Limits?

Regional Analytics generates multiple concurrent requests:
- 1 region selection = at least 2 requests (anomalies + forecast)
- Optional product filter = potential 2-4 more requests per product
- Multiple regions in parallel = 4-6+ concurrent requests
- Caching (5 min TTL) doesn't prevent initial requests

**500 requests/minute = ~8 requests/second**, which is well-suited for:
- 2-3 simultaneous users loading Regional Analytics
- Multiple region/product combinations being analyzed
- Frontend retry logic with 3 max attempts and exponential backoff

## Testing Results

### Login Endpoint
```bash
✅ curl -X POST http://localhost:3001/api/auth/login
Response: 200 OK - User authenticated successfully
```

### Forecast Endpoint
```bash
✅ curl -X POST http://localhost:3001/api/ml/forecast
Response: 200 OK - Forecast generated successfully
{
  "product_id": "test-product",
  "forecast": [22.27, 27.27, 34.77, 44.77, 57.27, 72.27, 89.77],
  "trend": "📈 Increasing"
}
```

### Anomaly Detection Endpoint
```bash
✅ curl -X POST http://localhost:3001/api/ml/anomalies/detect
Response: 200 OK - Anomalies detected
[
  {
    "product_id": "prod-1",
    "is_anomaly": true,
    "anomaly_score": 0.7,
    "reason": "⚠️ Low stock: Level (8) below average (avg: 29)"
  }
]
```

## Rate Limiter Architecture

### IP-Based Tracking
Rate limiters track by IP address:
```typescript
const key = req.ip || req.socket.remoteAddress || 'unknown';
```

For development/testing, requests from `localhost` or `127.0.0.1` share the same limit window.

### Response Headers
Each rate-limited response includes:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests left in current window
- `X-RateLimit-Reset`: When the window resets (ISO timestamp)
- `Retry-After`: Seconds to wait before retrying (on 429 error)

### 429 Responses
When rate limit exceeded:
```json
{
  "error": "Too many requests, please try again later",
  "retryAfter": 45
}
```

The frontend's retry logic will:
1. Detect 429 status or "Too many requests" message
2. Parse `retryAfter` from response
3. Wait that many seconds (or exponential backoff: 1s, 2s, 4s)
4. Retry up to 3 times total

## Environment Considerations

### Development/Testing
- Lenient limits allow rapid iteration
- Can make 500 ML requests/minute per IP
- Can login 20 times per 15 minutes

### Production Recommendations
- Monitor actual usage patterns
- Consider Redis-backed rate limiting for distributed systems
- Adjust limits based on typical user load:
  - Single user: 50-100 ML requests/min sufficient
  - Small team (5 users): 500 ML requests/min recommended
  - Large deployment: Consider 1000+ ML requests/min

## Potential Further Optimizations

1. **Per-User Rate Limiting**: Track by user ID instead of IP (more fair in shared networks)
2. **Redis Backend**: Replace in-memory Map with Redis for distributed deployments
3. **Adaptive Rate Limiting**: Increase limits during off-peak hours, decrease during peak load
4. **ML Service Circuit Breaker**: Return cached results if ML service is slow/down
5. **Frontend Request Batching**: Combine multiple ML requests into single batch-analysis endpoint

## Files Modified

1. `backend/src/middleware/rateLimiter.ts`
   - Added `mlLimiter` export
   - Updated rate limit thresholds
   - Changed window sizes (15min → 1min for most)

2. `backend/src/routes/mlRoutes.ts`
   - Added `mlLimiter` import
   - Applied `mlLimiter` to all ML endpoints:
     - POST /api/ml/anomalies/detect
     - POST /api/ml/forecast
     - POST /api/ml/batch-analysis

## Deployment Status

✅ All containers rebuilt and running:
- postgres: healthy
- backend: Up, using new rate limiter
- frontend: Up, running with retry logic
- ml-service: Up, handling requests

✅ All tests passing:
- Login works without rate limiting
- Forecast generation works without rate limiting
- Anomaly detection works without rate limiting
- Rate limiting headers present in responses

## Rollback Plan

If issues arise, revert to previous configuration by restoring:
- `/backend/src/middleware/rateLimiter.ts` (original 100/15min, 5 auth attempts)
- `/backend/src/routes/mlRoutes.ts` (remove mlLimiter from endpoints)

Then rebuild: `docker-compose down && docker-compose up --build`

---

**Date Fixed**: March 1, 2026
**Status**: ✅ RESOLVED - Regional Analytics and login now working without rate limit errors
