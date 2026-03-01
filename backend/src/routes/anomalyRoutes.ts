import { Router, Request, Response } from 'express';
import { detectInventoryAnomalies } from '../services/anomalyService.js';
import { Product } from '../types.js';

export const anomalyRouter = Router();

// Detect anomalies in inventory
anomalyRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const anomalies = await detectInventoryAnomalies(products);
    res.json({ anomalies });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});
