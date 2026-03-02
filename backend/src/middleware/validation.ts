import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// User validation schemas
export const createUserSchema = z.object({
  id: z.string().min(1).max(255),
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  role: z.enum(['sysadmin', 'admin', 'store_user', 'logistics_user']),
  email: z.string().email(),
  phoneNumber: z.string().regex(/^\+?1?\d{9,15}$/).optional(),
  password: z.string().min(8).max(255),
  assignedStore: z.string().max(100).optional(),
  assignedRegion: z.string().max(100).optional(),
  status: z.enum(['active', 'paused', 'deactivated']).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  role: z.enum(['sysadmin', 'admin', 'store_user', 'logistics_user']).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().regex(/^\+?1?\d{9,15}$/).optional(),
  password: z.string().min(8).max(255).optional(),
  assignedStore: z.string().max(100).optional(),
  assignedRegion: z.string().max(100).optional(),
  status: z.enum(['active', 'paused', 'deactivated']).optional(),
});

// Product validation schemas
export const updateProductSchema = z.object({
  current_stock: z.number().int().min(0).optional(),
  avg_daily_demand: z.number().positive().optional(),
  status: z.enum(['optimal', 'low', 'excess', 'critical']).optional(),
  last_restock_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  historical_demand: z.array(z.number()).optional(),
  forecasted_demand: z.array(z.number()).optional(),
});

// Chat validation schemas
export const chatMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(20000),
});

export const chatCloseSchema = z.object({
  sessionId: z.string().min(1),
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
        const formattedErrors = error.errors.map(e => ({
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
        const formattedErrors = error.errors.map(e => ({
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
      req.params = validated as any;
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
