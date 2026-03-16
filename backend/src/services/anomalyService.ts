
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types.js";
import { loadAppConfig } from '../config/env.js';

export interface InventoryAnomaly {
  productId: string;
  productName: string;
  storeName: string;
  type: 'stockout_risk' | 'overstock' | 'demand_spike' | 'supply_delay';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

const appConfig = loadAppConfig();
const GEMINI_MODEL = appConfig.geminiAnomalyModel;
const SEVERITY_ORDER: Record<InventoryAnomaly['severity'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};
const LOCAL_FALLBACK_MIN_RESULTS = 4;
const LOCAL_FALLBACK_MAX_RESULTS = 12;

interface LocalAnomalyCandidate extends InventoryAnomaly {
  score: number;
}

const extractJsonArray = (input: string): unknown[] | null => {
  const trimmed = input.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Continue to fenced extraction fallback
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!fencedMatch?.[1]) return null;

  try {
    const parsed = JSON.parse(fencedMatch[1].trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeAiAnomaly = (value: unknown): InventoryAnomaly | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  const productId = typeof record.productId === 'string' ? record.productId : '';
  const productName = typeof record.productName === 'string' ? record.productName : '';
  const storeName = typeof record.storeName === 'string' ? record.storeName : '';
  const type = typeof record.type === 'string' ? record.type : '';
  const severity = typeof record.severity === 'string' ? record.severity : '';
  const description = typeof record.description === 'string' ? record.description : '';
  const recommendation = typeof record.recommendation === 'string' ? record.recommendation : '';

  if (!productId || !productName || !storeName || !description || !recommendation) return null;
  if (!['stockout_risk', 'overstock', 'demand_spike', 'supply_delay'].includes(type)) return null;
  if (!['high', 'medium', 'low'].includes(severity)) return null;

  return {
    productId,
    productName,
    storeName,
    type: type as InventoryAnomaly['type'],
    severity: severity as InventoryAnomaly['severity'],
    description,
    recommendation,
  };
};

const avg = (values: number[]): number => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const detectAnomaliesLocally = (products: Product[]): InventoryAnomaly[] => {
  const anomalies: LocalAnomalyCandidate[] = [];

  for (const product of products) {
    const demand = Math.max(product.avgDailyDemand || 0, 0);
    const stock = Math.max(product.currentStock || 0, 0);
    const leadTime = Math.max(product.leadTime || 0, 0);
    const reorderPoint = Math.max(product.reorderPoint || 0, 0);
    const stockCoverageDays = demand > 0 ? stock / demand : Number.POSITIVE_INFINITY;

    const isCriticalStatus = product.status === 'critical';
    const isLowStatus = product.status === 'low';

    const severeCoverageThreshold = Math.max(1, leadTime * 0.65);
    const stockoutThreshold = Math.max(1, leadTime * 0.85);
    const isStockoutRisk = demand > 0 && (
      isCriticalStatus ||
      stockCoverageDays <= stockoutThreshold ||
      (stock <= reorderPoint * 0.7 && stockCoverageDays <= leadTime + 1)
    );

    if (isStockoutRisk) {
      const severity: InventoryAnomaly['severity'] = isCriticalStatus || stockCoverageDays <= severeCoverageThreshold ? 'high' : 'medium';
      const deficit = Math.max(0, leadTime - stockCoverageDays);
      const score = (severity === 'high' ? 140 : 95) + deficit * 10;
      anomalies.push({
        productId: product.id,
        productName: product.name,
        storeName: product.store,
        type: 'stockout_risk',
        severity,
        description: `Current stock (${Math.round(stock)}) covers about ${stockCoverageDays.toFixed(1)} days vs lead time ${leadTime} days.`,
        recommendation: 'Place replenishment order now and prioritize inbound allocation to avoid stockout.',
        score,
      });
    }

    const overstockThresholdDays = Math.max(leadTime + 18, 28);
    const extremeOverstockThresholdDays = Math.max(leadTime + 24, 45);
    const isOverstock = demand > 0 && (
      (product.status === 'excess' && stockCoverageDays >= overstockThresholdDays) ||
      stockCoverageDays >= extremeOverstockThresholdDays
    );

    if (isOverstock) {
      const severity: InventoryAnomaly['severity'] = stockCoverageDays >= Math.max(extremeOverstockThresholdDays, 60) ? 'high' : 'medium';
      const score = (severity === 'high' ? 120 : 85) + (stockCoverageDays - overstockThresholdDays);
      anomalies.push({
        productId: product.id,
        productName: product.name,
        storeName: product.store,
        type: 'overstock',
        severity,
        description: `Stock coverage is ${stockCoverageDays.toFixed(1)} days, above target ${overstockThresholdDays} days.`,
        recommendation: 'Slow reorders, accelerate markdown/promotions, or rebalance stock to faster-moving stores.',
        score,
      });
    }

    const recentHistory = product.historicalDemand?.slice(-7) || [];
    if (recentHistory.length >= 7) {
      const baseline = avg(recentHistory.slice(0, 4));
      const recent = avg(recentHistory.slice(-3));
      const spikeRatio = baseline > 0 ? recent / baseline : 0;
      const absoluteIncrease = recent - baseline;
      if (baseline > 0 && spikeRatio >= 1.5 && absoluteIncrease >= Math.max(2, baseline * 0.2)) {
        const severity: InventoryAnomaly['severity'] = spikeRatio >= 1.8 ? 'high' : 'medium';
        const score = (severity === 'high' ? 110 : 80) + (spikeRatio - 1) * 40;
        anomalies.push({
          productId: product.id,
          productName: product.name,
          storeName: product.store,
          type: 'demand_spike',
          severity,
          description: `Recent demand is ${((recent / baseline - 1) * 100).toFixed(0)}% above the prior baseline.`,
          recommendation: 'Raise reorder point temporarily and monitor next deliveries for potential demand regime shift.',
          score,
        });
      }
    }

    if (leadTime >= 10 && demand > 0 && (isLowStatus || isCriticalStatus) && stockCoverageDays < leadTime * 0.85) {
      const severity: InventoryAnomaly['severity'] = stockCoverageDays < leadTime * 0.65 ? 'high' : 'medium';
      const score = (severity === 'high' ? 115 : 78) + (leadTime - stockCoverageDays) * 4;
      anomalies.push({
        productId: product.id,
        productName: product.name,
        storeName: product.store,
        type: 'supply_delay',
        severity,
        description: `Long lead time (${leadTime} days) with limited stock coverage (${stockCoverageDays.toFixed(1)} days).`,
        recommendation: 'Escalate supplier ETA, expedite shipment where possible, and prepare substitution plan.',
        score,
      });
    }
  }

  const perProductBest = new Map<string, LocalAnomalyCandidate>();
  for (const anomaly of anomalies) {
    const existing = perProductBest.get(anomaly.productId);
    if (
      !existing ||
      anomaly.score > existing.score ||
      (anomaly.score === existing.score && SEVERITY_ORDER[anomaly.severity] < SEVERITY_ORDER[existing.severity])
    ) {
      perProductBest.set(anomaly.productId, anomaly);
    }
  }

  const sorted = Array.from(perProductBest.values()).sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity]) {
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    }
    return a.productName.localeCompare(b.productName);
  });

  const dynamicLimit = Math.ceil(products.length * 0.3);
  const resultLimit = Math.max(LOCAL_FALLBACK_MIN_RESULTS, Math.min(LOCAL_FALLBACK_MAX_RESULTS, dynamicLimit));

  return sorted.slice(0, resultLimit).map(({ score, ...anomaly }) => anomaly);
};

export async function detectInventoryAnomalies(products: Product[]): Promise<InventoryAnomaly[]> {
  const apiKey = appConfig.geminiApiKey;
  if (!apiKey) {
    console.warn("[anomalyService] GEMINI_API_KEY not set. Falling back to local anomaly rules.");
    return detectAnomaliesLocally(products);
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
      model: GEMINI_MODEL,
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
    if (!text) {
      return detectAnomaliesLocally(products);
    }

    const parsedArray = extractJsonArray(text);
    if (!parsedArray) {
      console.warn('[anomalyService] AI response was not valid JSON array. Falling back to local rules.');
      return detectAnomaliesLocally(products);
    }

    const normalized = parsedArray
      .map(normalizeAiAnomaly)
      .filter((anomaly): anomaly is InventoryAnomaly => Boolean(anomaly));

    return normalized.length ? normalized : detectAnomaliesLocally(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/CONSUMER_SUSPENDED|PERMISSION_DENIED|forbidden|unauthorized|suspended/i.test(message)) {
      console.warn('[anomalyService] Gemini access denied/suspended. Using local anomaly detection fallback.');
    } else {
      console.error("Error detecting anomalies via Gemini. Using local fallback:", error);
    }
    return detectAnomaliesLocally(products);
  }
}