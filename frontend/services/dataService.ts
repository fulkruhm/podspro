// Frontend Data Service - Fetches products and routes from backend API
import { authFetch } from './authSession';
import { appConfig } from '../config/appConfig';

export interface Product {
  id: string;
  name: string;
  currentStock: number;
  avgDailyDemand: number;
  leadTime: number;
  safetyStock: number;
  reorderPoint: number;
  status: 'optimal' | 'low' | 'excess' | 'critical';
  category: string;
  price: number;
  region: string;
  store: string;
  department: string;
  historicalDemand?: number[];
  imageUrl?: string;
  shrinkRate?: number;
  markdownRate?: number;
  oosDays?: number;
  turnoverRate?: number;
  lastRestockDate?: string;
  forecastedDemand?: number[];
  forecastedExplainability?: string[];
}

export interface FreightRoute {
  id: string;
  origin: string;
  destination: string;
  currentRate: number;
  trend: 'up' | 'down' | 'stable';
  capacity: 'loose' | 'moderate' | 'tight';
  riskLevel: 'low' | 'medium' | 'high';
  historicalRates?: { date: string; rate: number }[];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => toNumber(item));
}

function toHistoricalRates(value: unknown): Array<{ date: string; rate: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const row = entry as Record<string, unknown>;
    return [
      {
        date: toString(row.date),
        rate: toNumber(row.rate),
      },
    ];
  });
}

function toProductStatus(value: unknown): Product['status'] {
  const status = toString(value).toLowerCase();
  if (status === 'optimal' || status === 'low' || status === 'excess' || status === 'critical') {
    return status;
  }

  return 'optimal';
}

function toTrend(value: unknown): FreightRoute['trend'] {
  const trend = toString(value).toLowerCase();
  if (trend === 'up' || trend === 'down' || trend === 'stable') {
    return trend;
  }

  return 'stable';
}

function toCapacity(value: unknown): FreightRoute['capacity'] {
  const capacity = toString(value).toLowerCase();
  if (capacity === 'loose' || capacity === 'moderate' || capacity === 'tight') {
    return capacity;
  }

  return 'moderate';
}

function toRiskLevel(value: unknown): FreightRoute['riskLevel'] {
  const risk = toString(value).toLowerCase();
  if (risk === 'low' || risk === 'medium' || risk === 'high') {
    return risk;
  }

  return 'low';
}

// Map database snake_case product to frontend camelCase
function mapProductFromDB(dbProductRaw: unknown): Product {
  const dbProduct = toRecord(dbProductRaw);

  return {
    id: toString(dbProduct.id),
    name: toString(dbProduct.name),
    currentStock: toNumber(dbProduct.current_stock),
    avgDailyDemand: toNumber(dbProduct.avg_daily_demand),
    leadTime: toNumber(dbProduct.lead_time),
    safetyStock: toNumber(dbProduct.safety_stock),
    reorderPoint: toNumber(dbProduct.reorder_point),
    status: toProductStatus(dbProduct.status),
    category: toString(dbProduct.category),
    price: toNumber(dbProduct.price),
    region: toString(dbProduct.region),
    store: toString(dbProduct.store),
    department: toString(dbProduct.department),
    historicalDemand: toNumberArray(dbProduct.historical_demand),
    imageUrl: toString(dbProduct.image_url),
    shrinkRate: toNumber(dbProduct.shrink_rate),
    markdownRate: toNumber(dbProduct.markdown_rate),
    oosDays: toNumber(dbProduct.oos_days),
    turnoverRate: toNumber(dbProduct.turnover_rate),
    lastRestockDate: toString(dbProduct.last_restock_date),
    forecastedDemand: toNumberArray(dbProduct.forecasted_demand),
    forecastedExplainability: Array.isArray(dbProduct.forecast_explainability)
      ? dbProduct.forecast_explainability.map((item) => String(item))
      : [],
  };
}

// Map database snake_case route to frontend camelCase
function mapRouteFromDB(dbRouteRaw: unknown): FreightRoute {
  const dbRoute = toRecord(dbRouteRaw);

  return {
    id: toString(dbRoute.id),
    origin: toString(dbRoute.origin),
    destination: toString(dbRoute.destination),
    currentRate: toNumber(dbRoute.current_rate),
    trend: toTrend(dbRoute.trend),
    capacity: toCapacity(dbRoute.capacity),
    riskLevel: toRiskLevel(dbRoute.risk_level),
    historicalRates: toHistoricalRates(dbRoute.historical_rates),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    console.log('[dataService] Fetching products from:', `${appConfig.apiBaseUrl}/data/products`);
    const response = await authFetch(`${appConfig.apiBaseUrl}/data/products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
    const data = await response.json();
    const products = (data.products || []).map(mapProductFromDB);
    console.log('[dataService] Fetched', products.length, 'products');
    return products;
  } catch (error) {
    console.error('[dataService] Error fetching products:', error);
    return [];
  }
}

export async function fetchRoutes(): Promise<FreightRoute[]> {
  try {
    console.log('[dataService] Fetching routes from:', `${appConfig.apiBaseUrl}/data/routes`);
    const response = await authFetch(`${appConfig.apiBaseUrl}/data/routes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch routes: ${response.status}`);
    const data = await response.json();
    const routes = (data.routes || []).map(mapRouteFromDB);
    console.log('[dataService] Fetched', routes.length, 'routes');
    return routes;
  } catch (error) {
    console.error('[dataService] Error fetching routes:', error);
    return [];
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  try {
    const response = await authFetch(`${appConfig.apiBaseUrl}/data/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Failed to update product: ${response.status}`);
    const data = await response.json();
    return data.product ? mapProductFromDB(data.product) : null;
  } catch (error) {
    console.error('[dataService] Error updating product:', error);
    return null;
  }
}
