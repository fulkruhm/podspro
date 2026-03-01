
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types.js";

export interface InventoryAnomaly {
  productId: string;
  productName: string;
  storeName: string;
  type: 'stockout_risk' | 'overstock' | 'demand_spike' | 'supply_delay';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export async function detectInventoryAnomalies(products: Product[]): Promise<InventoryAnomaly[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key is missing");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare a condensed version of products to save tokens and focus on relevant data
  const productData = products.map(p => ({
    id: p.id,
    name: p.name,
    store: p.store,
    stock: p.currentStock,
    avgDemand: p.avgDailyDemand,
    rop: p.reorderPoint,
    leadTime: p.leadTime,
    status: p.status,
    historical: p.historicalDemand?.slice(-7) || []
  }));

  const prompt = `
    Analyze the following inventory data for a grocery retail group and identify critical anomalies.
    Focus on:
    1. Stockout Risk: Where current stock is dangerously low relative to demand and lead time.
    2. Overstock: Where capital is tied up in excessive inventory that isn't moving.
    3. Demand Spikes: Where recent historical demand shows a sudden upward trend not reflected in ROP.
    
    Data: ${JSON.stringify(productData)}
    
    Return a JSON array of anomalies. Ensure you include the store name for each anomaly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productId: { type: Type.STRING },
              productName: { type: Type.STRING },
              storeName: { type: Type.STRING },
              type: { 
                type: Type.STRING, 
                enum: ['stockout_risk', 'overstock', 'demand_spike', 'supply_delay'] 
              },
              severity: { 
                type: Type.STRING, 
                enum: ['high', 'medium', 'low'] 
              },
              description: { type: Type.STRING },
              recommendation: { type: Type.STRING }
            },
            required: ["productId", "productName", "storeName", "type", "severity", "description", "recommendation"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    return [];
  }
}