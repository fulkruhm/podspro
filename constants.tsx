
import { Product, FreightRoute } from './types';

export const SYSTEM_PROMPT = `
# PODS (Predictive Order & Demand Solutions) AI Assistant
## System Identity & Core Mission
You are an advanced supply chain optimization platform specifically designed for **Multi-Store Grocery Retail Groups**. You manage a hierarchy of Regions, Stores, Departments, and Products.

## Context: Hierarchical Grocery Retail
Always consider the hierarchy:
1. **Region**: (North, South, West)
2. **Store**: (Main St. Market, Uptown Grocers, Lakeside Foods, River Walk Grocers, Coastal Foods)
3. **Department**: (Produce, Dairy, Bakery, Pantry, Meat, Frozen, Beverages)
4. **Product**: Individual grocery items.

## Analysis Rules
- **Perishability**: Short shelf-life for produce/dairy affects Safety Stock.
- **Aggregation**: Be able to summarize metrics at the store or regional level.
- **ROP Formula**: ROP = (Daily Demand × Lead Time) + Safety Stock.
- **Safety Stock**: Use service level targets (95-99%).
`;

export const MOCK_PRODUCTS: Product[] = [
  // NORTH - MAIN ST. MARKET
  { 
    id: '1', name: 'Organic Whole Milk (1 Gal)', currentStock: 45, avgDailyDemand: 15, leadTime: 2, safetyStock: 10, reorderPoint: 40, status: 'optimal', category: 'Dairy', price: 5.99, region: 'North', store: 'Main St. Market', department: 'Dairy', 
    historicalDemand: [16, 14, 15, 17, 19, 20, 18],
    imageUrl: 'https://picsum.photos/seed/milk/800/800',
    shrinkRate: 1.2,
    markdownRate: 0.5,
    oosDays: 0,
    turnoverRate: 12.5,
    lastRestockDate: '2026-02-25',
    forecastedDemand: [16, 18, 15, 17, 19, 20, 18]
  },
  { 
    id: '2', name: 'Almond Butter (16oz)', currentStock: 8, avgDailyDemand: 4, leadTime: 5, safetyStock: 12, reorderPoint: 32, status: 'critical', category: 'Pantry', price: 12.50, region: 'North', store: 'Main St. Market', department: 'Pantry', 
    historicalDemand: [5, 4, 5, 6, 7, 8, 9],
    imageUrl: 'https://picsum.photos/seed/almond/800/800',
    shrinkRate: 0.2,
    markdownRate: 0,
    oosDays: 5,
    turnoverRate: 4.2,
    lastRestockDate: '2026-02-10',
    forecastedDemand: [9, 10, 8, 7, 9, 11, 10]
  },
  { 
    id: '3', name: 'Honeycrisp Apples (5lb)', currentStock: 15, avgDailyDemand: 12, leadTime: 3, safetyStock: 10, reorderPoint: 46, status: 'critical', category: 'Produce', price: 7.99, region: 'North', store: 'Main St. Market', department: 'Produce', 
    historicalDemand: [18, 17, 19, 20, 22, 21, 23],
    imageUrl: 'https://picsum.photos/seed/apple/800/800',
    shrinkRate: 8.5,
    markdownRate: 15.0,
    oosDays: 2,
    turnoverRate: 18.0,
    lastRestockDate: '2026-02-26',
    forecastedDemand: [25, 28, 30, 26, 24, 27, 29]
  },
  { id: '4', name: 'Free Range Chicken Breast', currentStock: 22, avgDailyDemand: 8, leadTime: 2, safetyStock: 6, reorderPoint: 22, status: 'low', category: 'Meat', price: 14.99, region: 'North', store: 'Main St. Market', department: 'Meat', historicalDemand: [7, 8, 9, 8, 7, 8, 9, 10, 9, 8, 9, 10, 11, 12] },

  // NORTH - UPTOWN GROCERS
  { id: '5', name: 'Artisan Sourdough Bread', currentStock: 12, avgDailyDemand: 30, leadTime: 1, safetyStock: 10, reorderPoint: 40, status: 'critical', category: 'Bakery', price: 6.49, region: 'North', store: 'Uptown Grocers', department: 'Bakery', historicalDemand: [25, 28, 30, 32, 29, 31, 33, 35, 34, 36, 38, 40, 39, 41] },
  { id: '6', name: 'Greek Yogurt (32oz)', currentStock: 85, avgDailyDemand: 10, leadTime: 4, safetyStock: 15, reorderPoint: 55, status: 'excess', category: 'Dairy', price: 6.99, region: 'North', store: 'Uptown Grocers', department: 'Dairy', historicalDemand: [8, 9, 10, 11, 10, 9, 10, 11, 12, 11, 10, 9, 10, 11] },
  { id: '7', name: 'Frozen Spinach (16oz)', currentStock: 120, avgDailyDemand: 6, leadTime: 7, safetyStock: 20, reorderPoint: 62, status: 'excess', category: 'Frozen', price: 3.49, region: 'North', store: 'Uptown Grocers', department: 'Frozen', historicalDemand: [5, 6, 5, 6, 7, 6, 5, 6, 7, 6, 5, 6, 7, 6] },

  // SOUTH - LAKESIDE FOODS
  { id: '8', name: 'Hass Avocados (Bulk)', currentStock: 25, avgDailyDemand: 20, leadTime: 3, safetyStock: 15, reorderPoint: 75, status: 'low', category: 'Produce', price: 1.50, region: 'South', store: 'Lakeside Foods', department: 'Produce' },
  { id: '9', name: 'Organic Quinoa (2lb)', currentStock: 120, avgDailyDemand: 5, leadTime: 10, safetyStock: 20, reorderPoint: 70, status: 'excess', category: 'Grains', price: 8.99, region: 'South', store: 'Lakeside Foods', department: 'Pantry' },
  { id: '10', name: 'Grass-fed Ribeye (12oz)', currentStock: 5, avgDailyDemand: 4, leadTime: 3, safetyStock: 8, reorderPoint: 20, status: 'critical', category: 'Meat', price: 18.99, region: 'South', store: 'Lakeside Foods', department: 'Meat' },
  { id: '11', name: 'Sparkling Water (12pk)', currentStock: 40, avgDailyDemand: 15, leadTime: 4, safetyStock: 20, reorderPoint: 80, status: 'low', category: 'Beverages', price: 5.49, region: 'South', store: 'Lakeside Foods', department: 'Beverages' },

  // SOUTH - RIVER WALK GROCERS
  { id: '12', name: 'Rotisserie Chicken', currentStock: 15, avgDailyDemand: 25, leadTime: 1, safetyStock: 5, reorderPoint: 30, status: 'critical', category: 'Meat', price: 9.99, region: 'South', store: 'River Walk Grocers', department: 'Meat' },
  { id: '13', name: 'Whole Wheat Bagels', currentStock: 45, avgDailyDemand: 10, leadTime: 2, safetyStock: 8, reorderPoint: 28, status: 'optimal', category: 'Bakery', price: 4.99, region: 'South', store: 'River Walk Grocers', department: 'Bakery' },
  { id: '14', name: 'Frozen Wild Blueberries', currentStock: 60, avgDailyDemand: 12, leadTime: 7, safetyStock: 15, reorderPoint: 100, status: 'low', category: 'Frozen', price: 10.99, region: 'South', store: 'River Walk Grocers', department: 'Frozen' },

  // WEST - COASTAL FOODS
  { id: '15', name: 'Cold Brew Coffee (48oz)', currentStock: 55, avgDailyDemand: 10, leadTime: 4, safetyStock: 15, reorderPoint: 55, status: 'optimal', category: 'Beverages', price: 7.99, region: 'West', store: 'Coastal Foods', department: 'Beverages' },
  { id: '16', name: 'Organic Kale (Bunch)', currentStock: 10, avgDailyDemand: 15, leadTime: 2, safetyStock: 8, reorderPoint: 38, status: 'critical', category: 'Produce', price: 2.99, region: 'West', store: 'Coastal Foods', department: 'Produce' },
  { id: '17', name: 'Oat Milk (64oz)', currentStock: 42, avgDailyDemand: 8, leadTime: 3, safetyStock: 10, reorderPoint: 34, status: 'optimal', category: 'Dairy', price: 4.99, region: 'West', store: 'Coastal Foods', department: 'Dairy' },
  { id: '18', name: 'Peanut Butter (Smooth)', currentStock: 95, avgDailyDemand: 3, leadTime: 6, safetyStock: 12, reorderPoint: 30, status: 'excess', category: 'Pantry', price: 4.50, region: 'West', store: 'Coastal Foods', department: 'Pantry' },
];

export const MOCK_ROUTES: FreightRoute[] = [
  { 
    id: 'r1', 
    origin: 'Salinas Valley, CA', 
    destination: 'Chicago Hub', 
    currentRate: 3.45, 
    trend: 'up', 
    capacity: 'tight', 
    riskLevel: 'high',
    historicalRates: [
      { date: '2025-12-01', rate: 2.85 }, { date: '2025-12-08', rate: 2.90 }, { date: '2025-12-15', rate: 3.10 }, { date: '2025-12-22', rate: 3.25 },
      { date: '2026-01-05', rate: 3.15 }, { date: '2026-01-12', rate: 3.20 }, { date: '2026-01-19', rate: 3.35 }, { date: '2026-01-26', rate: 3.40 },
      { date: '2026-02-02', rate: 3.30 }, { date: '2026-02-09', rate: 3.45 }, { date: '2026-02-16', rate: 3.55 }, { date: '2026-02-23', rate: 3.45 }
    ]
  },
  { 
    id: 'r2', 
    origin: 'Houston Port, TX', 
    destination: 'Atlanta Hub', 
    currentRate: 1.95, 
    trend: 'stable', 
    capacity: 'moderate', 
    riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 1.85 }, { date: '2025-12-08', rate: 1.88 }, { date: '2025-12-15', rate: 1.92 }, { date: '2025-12-22', rate: 1.95 },
      { date: '2026-01-05', rate: 1.90 }, { date: '2026-01-12', rate: 1.93 }, { date: '2026-01-19', rate: 1.96 }, { date: '2026-01-26', rate: 1.94 },
      { date: '2026-02-02', rate: 1.92 }, { date: '2026-02-09', rate: 1.95 }, { date: '2026-02-16', rate: 1.97 }, { date: '2026-02-23', rate: 1.95 }
    ]
  },
  { 
    id: 'r3', 
    origin: 'Newark Port, NJ', 
    destination: 'Columbus Hub', 
    currentRate: 3.10, 
    trend: 'up', 
    capacity: 'tight', 
    riskLevel: 'high',
    historicalRates: [
      { date: '2025-12-01', rate: 2.65 }, { date: '2025-12-08', rate: 2.75 }, { date: '2025-12-15', rate: 2.85 }, { date: '2025-12-22', rate: 3.00 },
      { date: '2026-01-05', rate: 2.90 }, { date: '2026-01-12', rate: 2.95 }, { date: '2026-01-19', rate: 3.10 }, { date: '2026-01-26', rate: 3.20 },
      { date: '2026-02-02', rate: 3.05 }, { date: '2026-02-09', rate: 3.15 }, { date: '2026-02-16', rate: 3.25 }, { date: '2026-02-23', rate: 3.10 }
    ]
  },
  { 
    id: 'r4', 
    origin: 'Miami, FL', 
    destination: 'Atlanta Hub', 
    currentRate: 2.25, 
    trend: 'up', 
    capacity: 'moderate', 
    riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.05 }, { date: '2025-12-08', rate: 2.10 }, { date: '2025-12-15', rate: 2.15 }, { date: '2025-12-22', rate: 2.30 },
      { date: '2026-01-05', rate: 2.20 }, { date: '2026-01-12', rate: 2.25 }, { date: '2026-01-19', rate: 2.35 }, { date: '2026-01-26', rate: 2.40 },
      { date: '2026-02-02', rate: 2.30 }, { date: '2026-02-09', rate: 2.40 }, { date: '2026-02-16', rate: 2.50 }, { date: '2026-02-23', rate: 2.25 }
    ]
  },
];
