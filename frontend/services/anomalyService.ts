import { Product, InventoryAnomaly } from "../types";
import { authFetch } from './authSession';
import { appConfig } from '../config/appConfig';

export type { InventoryAnomaly } from "../types";

export async function detectInventoryAnomalies(products: Product[]): Promise<InventoryAnomaly[]> {
  try {
    const response = await authFetch(`${appConfig.apiBaseUrl}/anomalies/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    });
    
    if (!response.ok) throw new Error('Failed to detect anomalies');
    const data = await response.json();
    return data.anomalies || [];
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return [];
  }
}
