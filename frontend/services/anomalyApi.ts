// Frontend anomaly detection API service
import { Product, InventoryAnomaly } from '../types';

const API_BASE_URL = '/api';

export async function detectInventoryAnomalies(products: Product[]): Promise<InventoryAnomaly[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/anomalies/detect`, {
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
