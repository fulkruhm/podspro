import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chatRoutes.js';
import { anomalyRouter } from './routes/anomalyRoutes.js';
import { dataRouter } from './routes/dataRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { mlRouter } from './routes/mlRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';
import { startNightlyForecastScheduler } from './services/forecastBatchScheduler.js';
import { securityHeaders, sanitizeInput } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { attachRequestContext } from './middleware/requestContext.js';
import { loadAppConfig } from './config/env.js';
import { checkDatabaseReadiness } from './db.js';
import { openApiSpec } from './openapi/spec.js';
import { getCacheDependencyStatus } from './services/redisCache.js';
import { initializeForecastBatchQueueProcessing } from './services/forecastBatchQueue.js';

dotenv.config();

const appConfig = loadAppConfig();

const app = express();
const PORT = appConfig.port;

function mountApiRoutes(basePath: string) {
  app.use(`${basePath}/auth`, authRouter);
  app.use(`${basePath}/chat`, chatRouter);
  app.use(`${basePath}/anomalies`, anomalyRouter);
  app.use(`${basePath}/data`, dataRouter);
  app.use(`${basePath}/users`, userRouter);
  app.use(`${basePath}/ml`, mlRouter);
  app.use(`${basePath}/audit`, auditRouter);
}

// Security middleware
app.use(securityHeaders);

// CORS configuration - only allow trusted origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
];

if (appConfig.frontendUrl) {
  allowedOrigins.push(appConfig.frontendUrl);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  })
);

// Body parser with size limits
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ limit: '256kb', extended: true }));

// Request context and structured access logs
app.use(attachRequestContext);

// Input sanitization
app.use(sanitizeInput);

// Rate limiting on all routes
app.use(apiLimiter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pods-backend',
    environment: appConfig.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pods-backend',
    environment: appConfig.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    version: 'v1',
  });
});

app.get('/api/ready', async (_req, res) => {
  const databaseReady = await checkDatabaseReadiness();
  const cacheStatus = await getCacheDependencyStatus();
  let mlServiceReady = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${appConfig.mlServiceUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    mlServiceReady = response.ok;
  } catch {
    mlServiceReady = false;
  }

  const overallReady = databaseReady && mlServiceReady;
  const status = overallReady ? 'ready' : 'not_ready';
  const statusCode = overallReady ? 200 : 503;

  res.status(statusCode).json({
    status,
    dependencies: {
      database: databaseReady ? 'ready' : 'not_ready',
      mlService: mlServiceReady ? 'ready' : 'not_ready',
      cache: cacheStatus.ready ? cacheStatus.backend : 'degraded',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/ready', async (_req, res) => {
  const databaseReady = await checkDatabaseReadiness();
  const cacheStatus = await getCacheDependencyStatus();
  let mlServiceReady = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${appConfig.mlServiceUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    mlServiceReady = response.ok;
  } catch {
    mlServiceReady = false;
  }

  const overallReady = databaseReady && mlServiceReady;
  const status = overallReady ? 'ready' : 'not_ready';
  const statusCode = overallReady ? 200 : 503;

  res.status(statusCode).json({
    status,
    version: 'v1',
    dependencies: {
      database: databaseReady ? 'ready' : 'not_ready',
      mlService: mlServiceReady ? 'ready' : 'not_ready',
      cache: cacheStatus.ready ? cacheStatus.backend : 'degraded',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.get('/api/v1/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// Routes
mountApiRoutes('/api');
mountApiRoutes('/api/v1');

// Error handling middleware - never expose internal errors to client
interface HttpErrorLike {
  status?: number;
  message?: string;
  stack?: string;
}

function toHttpErrorLike(error: unknown): HttpErrorLike {
  if (typeof error === 'object' && error !== null) {
    return error as HttpErrorLike;
  }

  return {};
}
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const httpError = toHttpErrorLike(err);
    const message = httpError.message ?? 'Unknown error';
    const requestId = res.locals.requestId as string | undefined;
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'request.failed',
        requestId,
        message,
        stack: appConfig.nodeEnv === 'production' ? undefined : httpError.stack,
      })
    );

    // Don't expose internal error details to client
    const status = typeof httpError.status === 'number' ? httpError.status : 500;
    const clientMessage = appConfig.nodeEnv === 'production' ? 'Internal server error' : message;

    res.status(status).json({ error: clientMessage, requestId });
  }
);

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'backend.started',
      port: PORT,
      environment: appConfig.nodeEnv,
    })
  );

  initializeForecastBatchQueueProcessing().catch((error) => {
    console.error('Failed to initialize forecast batch queue worker:', error?.message || error);
  });

  startNightlyForecastScheduler();
});
