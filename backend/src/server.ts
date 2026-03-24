import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chatRoutes.js';
import { anomalyRouter } from './routes/anomalyRoutes.js';
import { dataRouter } from './routes/dataRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { mlRouter } from './routes/mlRoutes.js';
import { startNightlyForecastScheduler } from './services/forecastBatchScheduler.js';
import { securityHeaders, sanitizeInput } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const cloudRunFrontendOriginPattern = /^https:\/\/pods-frontend-[a-z0-9-]+\.([a-z0-9-]+\.)?run\.app$/;

// Security middleware
app.use(securityHeaders);

// CORS configuration - only allow trusted origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || cloudRunFrontendOriginPattern.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-User-Role',
    'X-User-Name',
    'Cache-Control',
    'Pragma',
  ],
}));

// Body parser with size limits
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ limit: '256kb', extended: true }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting on all routes
app.use(apiLimiter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/anomalies', anomalyRouter);
app.use('/api/data', dataRouter);
app.use('/api/users', userRouter);
app.use('/api/ml', mlRouter);

// Error handling middleware - never expose internal errors to client
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);

  // Don't expose internal error details to client
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : err.message;

  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  startNightlyForecastScheduler();
});
