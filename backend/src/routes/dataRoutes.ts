import { Router, Request, Response } from 'express';
import { getProducts, getProductById, getRoutes, getRouteById, updateProduct } from '../db.js';
import {
  validateRequestParams,
  validateRequestBody,
  updateProductSchema,
  entityIdParamSchema,
} from '../middleware/validation.js';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter.js';
import { requireAnyRole, requireAuthenticatedUser } from '../middleware/authz.js';

export const dataRouter = Router();

dataRouter.use(requireAuthenticatedUser);

// Get all products
dataRouter.get('/products', apiLimiter, async (_req: Request, res: Response) => {
  try {
    const products = await getProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
dataRouter.get(
  '/products/:id',
  apiLimiter,
  validateRequestParams(entityIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await getProductById(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ product });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }
);

// Update product - with validation and rate limiting
dataRouter.put(
  '/products/:id',
  strictLimiter,
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestParams(entityIdParamSchema),
  validateRequestBody(updateProductSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await updateProduct(id, req.body);
      res.json({ product });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// Get all freight routes
dataRouter.get('/routes', apiLimiter, async (_req: Request, res: Response) => {
  try {
    const routes = await getRoutes();
    res.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get single route
dataRouter.get(
  '/routes/:id',
  apiLimiter,
  validateRequestParams(entityIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const route = await getRouteById(id);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      res.json({ route });
    } catch (error) {
      console.error('Error fetching route:', error);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  }
);
