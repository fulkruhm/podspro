import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// User validation schemas
export const createUserSchema = z
  .object({
    id: z.string().min(1).max(255),
    name: z.string().min(1).max(100),
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_-]+$/),
    role: z.enum(['sysadmin', 'admin', 'store_user', 'logistics_user']),
    email: z.string().email(),
    phoneNumber: z
      .string()
      .regex(/^\+?1?\d{9,15}$/)
      .optional(),
    password: z.string().min(8).max(255),
    assignedStore: z.string().max(100).optional(),
    assignedRegion: z.string().max(100).optional(),
    status: z.enum(['active', 'paused', 'deactivated']).optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    role: z.enum(['sysadmin', 'admin', 'store_user', 'logistics_user']).optional(),
    email: z.string().email().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?1?\d{9,15}$/)
      .optional(),
    password: z.string().min(8).max(255).optional(),
    assignedStore: z.string().max(100).optional(),
    assignedRegion: z.string().max(100).optional(),
    status: z.enum(['active', 'paused', 'deactivated']).optional(),
  })
  .strict();

// Product validation schemas
export const updateProductSchema = z
  .object({
    current_stock: z.number().int().min(0).optional(),
    avg_daily_demand: z.number().positive().optional(),
    status: z.enum(['optimal', 'low', 'excess', 'critical']).optional(),
    last_restock_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    historical_demand: z.array(z.number()).optional(),
    forecasted_demand: z.array(z.number()).optional(),
  })
  .strict();

// Chat validation schemas
export const chatMessageSchema = z
  .object({
    sessionId: z.string().min(1),
    message: z.string().min(1).max(20000),
  })
  .strict();

export const chatCloseSchema = z
  .object({
    sessionId: z.string().min(1),
  })
  .strict();

export const authRefreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export const authLogoutSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

export const anomalyDetectSchema = z
  .object({
    products: z.array(z.record(z.unknown())).min(1),
  })
  .strict();

export const mlAnomalyRequestSchema = z
  .object({
    datapoints: z.array(z.record(z.unknown())).min(1),
    sensitivity: z.number().min(0.001).max(0.5).optional(),
  })
  .strict();

export const mlForecastRequestSchema = z
  .object({
    product_id: z.string().min(1).optional(),
    store_id: z.string().min(1).optional(),
    historical_demand: z.array(z.number()).min(3),
    historical_features: z.array(z.record(z.unknown())).optional(),
    future_features: z.array(z.record(z.unknown())).optional(),
    forecast_days: z.number().int().min(1).max(90).optional(),
    persist: z.boolean().optional(),
  })
  .strict();

export const mlBatchRequestSchema = z
  .object({
    anomalies_request: z
      .object({
        datapoints: z.array(z.record(z.unknown())).min(1),
        sensitivity: z.number().min(0.001).max(0.5).optional(),
      })
      .optional(),
    forecasts: z
      .array(
        z.object({
          product_id: z.string().min(1),
          store_id: z.string().min(1),
          historical_demand: z.array(z.number()).min(3),
          forecast_days: z.number().int().min(1).max(90).optional(),
          historical_features: z.array(z.record(z.unknown())).optional(),
          future_features: z.array(z.record(z.unknown())).optional(),
        })
      )
      .optional(),
  })
  .strict();

export const mlForecastBatchRequestSchema = z
  .object({
    history_days: z.number().int().min(7).max(365).optional(),
    forecast_days: z.number().int().min(1).max(90).optional(),
    min_history_points: z.number().int().min(3).max(120).optional(),
    filters: z
      .object({
        region: z.string().trim().min(1).optional(),
        store: z.string().trim().min(1).optional(),
        department: z.string().trim().min(1).optional(),
        product: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .strict();

export const forecastReviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const forecastReviewDecisionParamsSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
});

export const forecastReviewDecisionBodySchema = z
  .object({
    decision_status: z.enum([
      'accept_model',
      'adjust_baseline',
      'flag_data_issue',
      'request_override',
    ]),
    baseline_adjustment_pct: z.number().min(-50).max(50).optional(),
    notes: z.string().max(5000).optional(),
  })
  .strict();

export const forecastBatchFailedJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const forecastBatchRetryBodySchema = z
  .object({
    run_id: z.number().int().min(1),
  })
  .strict();

export const auditLogQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).max(50000).optional(),
    category: z.enum(['security', 'provisioning', 'system', 'auth']).optional(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    userId: z.string().min(1).max(255).optional(),
    region: z.string().min(1).max(255).optional(),
    store: z.string().min(1).max(255).optional(),
    department: z.string().min(1).max(255).optional(),
    productId: z.string().min(1).max(255).optional(),
    from: z.coerce.number().int().min(0).optional(),
    to: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => data.from === undefined || data.to === undefined || data.from <= data.to, {
    message: '`from` must be less than or equal to `to`',
    path: ['from'],
  });

export const auditLogCreateBodySchema = z
  .object({
    action: z.string().min(1).max(255),
    details: z.string().max(5000).optional(),
    category: z.enum(['security', 'provisioning', 'system', 'auth']),
    severity: z.enum(['info', 'warning', 'critical']),
    productId: z.string().min(1).max(255).optional(),
    productName: z.string().min(1).max(255).optional(),
    region: z.string().min(1).max(255).optional(),
    store: z.string().min(1).max(255).optional(),
    department: z.string().min(1).max(255).optional(),
  })
  .strict();

const digestDeliveryFiltersSchema = z
  .object({
    userId: z.string().min(1).max(255).optional(),
    region: z.string().min(1).max(255).optional(),
    store: z.string().min(1).max(255).optional(),
    department: z.string().min(1).max(255).optional(),
    productId: z.string().min(1).max(255).optional(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    searchText: z.string().max(200).optional(),
  })
  .strict();

export const digestDeliveryConfigBodySchema = z
  .object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly']),
    channel: z.enum(['in_app', 'email']),
    recipient: z.string().min(1).max(255),
    filters: digestDeliveryFiltersSchema.optional(),
  })
  .strict();

export const digestDeliverySendNowBodySchema = z
  .object({
    frequency: z.enum(['daily', 'weekly']).optional(),
  })
  .strict();

export const digestDeliveryHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Generic ID validation for path parameters
export const entityIdParamSchema = z.object({
  id: z.string().min(1).max(255),
});

// Validation middleware factory
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = {
        ...req.body,
        ...req.params,
      };

      const validated = schema.parse(dataToValidate);

      // Attach validated data to request
      req.body = validated;
      req.params = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      res.status(400).json({ error: 'Invalid request' });
    }
  };
}

// Strict validation - only allow specified fields
export function validateRequestBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
}

export function validateRequestParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as Request['params'];
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors,
        });
      }
      res.status(400).json({ error: 'Invalid request parameters' });
    }
  };
}

export function validateRequestQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as Request['query'];
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }
      res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
}
