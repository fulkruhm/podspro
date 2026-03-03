
export type Role = 'admin' | 'store_user' | 'logistics_user' | 'sysadmin';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  assignedStore?: string;
  assignedRegion?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  status: 'active' | 'paused' | 'deactivated';
  failedLoginAttempts?: number;
  isLocked?: boolean;
}

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
  // Hierarchical fields
  region: string;
  store: string;
  department: string;
  historicalDemand?: number[]; // Last 14 days
  // New Analyst fields
  imageUrl?: string;
  shrinkRate?: number; // percentage
  markdownRate?: number; // percentage
  oosDays?: number; // days out of stock in last 30 days
  turnoverRate?: number;
  lastRestockDate?: string;
  forecastedDemand?: number[]; // Next 7 days
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
  historicalRates?: { date: string; rate: number }[]; // Past 3 months (weekly data)
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Filters {
  region: string;
  store: string;
  department: string;
  product: string;
  status: string;
}

export interface AppState {
  products: Product[];
  routes: FreightRoute[];
  lastUpdated: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  details: string;
  category: 'security' | 'provisioning' | 'system' | 'auth';
  severity: 'info' | 'warning' | 'critical';
}
export interface InventoryAnomaly {
  productId: string;
  productName: string;
  storeName: string;
  type: 'stockout_risk' | 'overstock' | 'demand_spike' | 'supply_delay';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}