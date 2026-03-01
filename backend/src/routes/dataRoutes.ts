import { Router, Request, Response } from 'express';
import { getProducts, getProductById, getRoutes, getRouteById, updateProduct } from '../db.js';

export const dataRouter = Router();

// Get all products
dataRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await getProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
dataRouter.get('/products/:id', async (req: Request, res: Response) => {
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
});

// Update product
dataRouter.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await updateProduct(id, req.body);
    res.json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Get all freight routes
dataRouter.get('/routes', async (req: Request, res: Response) => {
  try {
    const routes = await getRoutes();
    res.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get single route
dataRouter.get('/routes/:id', async (req: Request, res: Response) => {
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
});
