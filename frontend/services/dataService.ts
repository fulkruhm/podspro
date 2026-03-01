// Frontend Data Service - Fetches products and routes from backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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

// Map database snake_case product to frontend camelCase
function mapProductFromDB(dbProduct: any): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    currentStock: parseInt(dbProduct.current_stock) || 0,
    avgDailyDemand: parseFloat(dbProduct.avg_daily_demand) || 0,
    leadTime: dbProduct.lead_time || 0,
    safetyStock: dbProduct.safety_stock || 0,
    reorderPoint: dbProduct.reorder_point || 0,
    status: dbProduct.status || 'optimal',
    category: dbProduct.category || '',
    price: parseFloat(dbProduct.price) || 0,
    region: dbProduct.region || '',
    store: dbProduct.store || '',
    department: dbProduct.department || '',
    historicalDemand: dbProduct.historical_demand,
    imageUrl: dbProduct.image_url,
    shrinkRate: parseFloat(dbProduct.shrink_rate) || 0,
    markdownRate: parseFloat(dbProduct.markdown_rate) || 0,
    oosDays: dbProduct.oos_days || 0,
    turnoverRate: parseFloat(dbProduct.turnover_rate) || 0,
    lastRestockDate: dbProduct.last_restock_date,
    forecastedDemand: dbProduct.forecasted_demand,
  };
}

// Map database snake_case route to frontend camelCase
function mapRouteFromDB(dbRoute: any): FreightRoute {
  return {
    id: dbRoute.id,
    origin: dbRoute.origin,
    destination: dbRoute.destination,
    currentRate: parseFloat(dbRoute.current_rate) || 0,
    trend: (dbRoute.trend || 'stable') as 'up' | 'down' | 'stable',
    capacity: (dbRoute.capacity || 'moderate') as 'loose' | 'moderate' | 'tight',
    riskLevel: (dbRoute.risk_level || 'low') as 'low' | 'medium' | 'high',
    historicalRates: dbRoute.historical_rates,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    console.log('[dataService] Fetching products from:', `${API_BASE_URL}/data/products`);
    const response = await fetch(`${API_BASE_URL}/data/products`, {
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
    console.log('[dataService] Fetching routes from:', `${API_BASE_URL}/data/routes`);
    const response = await fetch(`${API_BASE_URL}/data/routes`, {
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

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/data/products/${id}`, {
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
