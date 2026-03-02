import pkg from 'pg';
const { Pool } = pkg;

const MOCK_PRODUCTS = [
  { 
    id: '1', name: 'Organic Whole Milk (1 Gal)', currentStock: 45, avgDailyDemand: 15, leadTime: 2, safetyStock: 10, reorderPoint: 40, status: 'optimal', category: 'Dairy', price: 5.99, region: 'North', store: 'Main St. Market', department: 'Dairy', 
    historicalDemand: [16, 14, 15, 17, 19, 20, 18],
    imageUrl: 'https://picsum.photos/seed/milk/800/800',
    shrinkRate: 1.2, markdownRate: 0.5, oosDays: 0, turnoverRate: 12.5, lastRestockDate: '2026-02-25',
    forecastedDemand: [16, 18, 15, 17, 19, 20, 18]
  },
  { 
    id: '2', name: 'Almond Butter (16oz)', currentStock: 8, avgDailyDemand: 4, leadTime: 5, safetyStock: 12, reorderPoint: 32, status: 'critical', category: 'Pantry', price: 12.50, region: 'North', store: 'Main St. Market', department: 'Pantry', 
    historicalDemand: [5, 4, 5, 6, 7, 8, 9],
    imageUrl: 'https://picsum.photos/seed/almond/800/800',
    shrinkRate: 0.2, markdownRate: 0, oosDays: 5, turnoverRate: 4.2, lastRestockDate: '2026-02-10',
    forecastedDemand: [9, 10, 8, 7, 9, 11, 10]
  },
  {
    id: '3', name: 'Free Range Eggs (Dozen)', currentStock: 28, avgDailyDemand: 10, leadTime: 1, safetyStock: 8, reorderPoint: 18, status: 'optimal', category: 'Dairy', price: 7.49, region: 'North', store: 'Main St. Market', department: 'Dairy',
    historicalDemand: [11, 9, 10, 12, 13, 11, 10],
    imageUrl: 'https://picsum.photos/seed/eggs/800/800',
    shrinkRate: 0.8, markdownRate: 0.3, oosDays: 0, turnoverRate: 18.2, lastRestockDate: '2026-02-27',
    forecastedDemand: [10, 11, 12, 11, 13, 12, 11]
  },
  {
    id: '4', name: 'Greek Yogurt Plain (32oz)', currentStock: 14, avgDailyDemand: 7, leadTime: 2, safetyStock: 8, reorderPoint: 22, status: 'low', category: 'Dairy', price: 6.29, region: 'South', store: 'Uptown Grocers', department: 'Dairy',
    historicalDemand: [8, 7, 6, 7, 8, 9, 7],
    imageUrl: 'https://picsum.photos/seed/yogurt/800/800',
    shrinkRate: 1.0, markdownRate: 0.6, oosDays: 1, turnoverRate: 9.8, lastRestockDate: '2026-02-22',
    forecastedDemand: [8, 9, 7, 8, 9, 10, 9]
  },
  {
    id: '5', name: 'Sourdough Bread Loaf', currentStock: 22, avgDailyDemand: 8, leadTime: 1, safetyStock: 6, reorderPoint: 14, status: 'optimal', category: 'Bakery', price: 4.99, region: 'South', store: 'Uptown Grocers', department: 'Bakery',
    historicalDemand: [9, 8, 7, 8, 10, 11, 9],
    imageUrl: 'https://picsum.photos/seed/bread/800/800',
    shrinkRate: 3.5, markdownRate: 2.1, oosDays: 0, turnoverRate: 21.0, lastRestockDate: '2026-02-28',
    forecastedDemand: [9, 10, 9, 8, 10, 11, 10]
  },
  {
    id: '6', name: 'Atlantic Salmon Fillet (1lb)', currentStock: 6, avgDailyDemand: 5, leadTime: 1, safetyStock: 5, reorderPoint: 10, status: 'critical', category: 'Seafood', price: 14.99, region: 'East', store: 'Harbor Fresh', department: 'Seafood',
    historicalDemand: [6, 5, 4, 6, 7, 8, 6],
    imageUrl: 'https://picsum.photos/seed/salmon/800/800',
    shrinkRate: 4.2, markdownRate: 3.0, oosDays: 3, turnoverRate: 7.5, lastRestockDate: '2026-02-26',
    forecastedDemand: [6, 7, 8, 7, 8, 9, 7]
  },
  {
    id: '7', name: 'Organic Baby Spinach (5oz)', currentStock: 35, avgDailyDemand: 12, leadTime: 2, safetyStock: 10, reorderPoint: 34, status: 'optimal', category: 'Produce', price: 3.99, region: 'West', store: 'Green Valley Co-op', department: 'Produce',
    historicalDemand: [13, 11, 12, 14, 15, 13, 12],
    imageUrl: 'https://picsum.photos/seed/spinach/800/800',
    shrinkRate: 5.0, markdownRate: 2.5, oosDays: 0, turnoverRate: 16.8, lastRestockDate: '2026-02-27',
    forecastedDemand: [13, 14, 12, 13, 15, 14, 13]
  },
  {
    id: '8', name: 'Extra Virgin Olive Oil (16.9oz)', currentStock: 41, avgDailyDemand: 6, leadTime: 7, safetyStock: 15, reorderPoint: 57, status: 'low', category: 'Pantry', price: 11.99, region: 'West', store: 'Green Valley Co-op', department: 'Pantry',
    historicalDemand: [7, 6, 6, 5, 7, 8, 6],
    imageUrl: 'https://picsum.photos/seed/oliveoil/800/800',
    shrinkRate: 0.1, markdownRate: 0.0, oosDays: 0, turnoverRate: 3.2, lastRestockDate: '2026-02-15',
    forecastedDemand: [6, 7, 7, 6, 8, 7, 7]
  },
  {
    id: '9', name: 'Chicken Breast Boneless (2lb)', currentStock: 18, avgDailyDemand: 9, leadTime: 1, safetyStock: 8, reorderPoint: 17, status: 'optimal', category: 'Meat', price: 9.99, region: 'East', store: 'Harbor Fresh', department: 'Meat',
    historicalDemand: [10, 9, 8, 10, 11, 12, 10],
    imageUrl: 'https://picsum.photos/seed/chicken/800/800',
    shrinkRate: 2.1, markdownRate: 1.5, oosDays: 0, turnoverRate: 14.0, lastRestockDate: '2026-02-28',
    forecastedDemand: [10, 11, 9, 10, 12, 11, 10]
  },
  {
    id: '10', name: 'Cheddar Cheese Block (8oz)', currentStock: 30, avgDailyDemand: 8, leadTime: 3, safetyStock: 10, reorderPoint: 34, status: 'optimal', category: 'Dairy', price: 5.49, region: 'North', store: 'Main St. Market', department: 'Dairy',
    historicalDemand: [9, 8, 7, 9, 10, 9, 8],
    imageUrl: 'https://picsum.photos/seed/cheddar/800/800',
    shrinkRate: 0.7, markdownRate: 0.4, oosDays: 0, turnoverRate: 8.5, lastRestockDate: '2026-02-24',
    forecastedDemand: [9, 10, 8, 9, 10, 11, 9]
  },
  {
    id: '11', name: 'Banana Bunch (Approx 6ct)', currentStock: 52, avgDailyDemand: 20, leadTime: 1, safetyStock: 15, reorderPoint: 35, status: 'optimal', category: 'Produce', price: 1.29, region: 'South', store: 'Uptown Grocers', department: 'Produce',
    historicalDemand: [22, 20, 19, 21, 24, 25, 22],
    imageUrl: 'https://picsum.photos/seed/banana/800/800',
    shrinkRate: 6.0, markdownRate: 3.2, oosDays: 0, turnoverRate: 28.5, lastRestockDate: '2026-02-28',
    forecastedDemand: [21, 23, 20, 22, 25, 24, 22]
  },
  {
    id: '12', name: 'Oat Milk (64oz)', currentStock: 11, avgDailyDemand: 6, leadTime: 4, safetyStock: 10, reorderPoint: 34, status: 'critical', category: 'Dairy Alt', price: 5.79, region: 'West', store: 'Green Valley Co-op', department: 'Dairy',
    historicalDemand: [7, 6, 5, 7, 8, 9, 7],
    imageUrl: 'https://picsum.photos/seed/oatmilk/800/800',
    shrinkRate: 0.3, markdownRate: 0.2, oosDays: 4, turnoverRate: 6.1, lastRestockDate: '2026-02-18',
    forecastedDemand: [7, 8, 8, 7, 9, 10, 9]
  },
  {
    id: '13', name: 'Blueberries (1 Pint)', currentStock: 19, avgDailyDemand: 9, leadTime: 2, safetyStock: 8, reorderPoint: 26, status: 'low', category: 'Produce', price: 4.49, region: 'East', store: 'Harbor Fresh', department: 'Produce',
    historicalDemand: [10, 9, 8, 10, 12, 11, 9],
    imageUrl: 'https://picsum.photos/seed/blueberry/800/800',
    shrinkRate: 4.8, markdownRate: 2.8, oosDays: 1, turnoverRate: 13.5, lastRestockDate: '2026-02-26',
    forecastedDemand: [10, 11, 10, 9, 12, 13, 11]
  },
  {
    id: '14', name: 'Pasta Spaghetti (1lb)', currentStock: 68, avgDailyDemand: 11, leadTime: 5, safetyStock: 20, reorderPoint: 75, status: 'low', category: 'Pantry', price: 2.29, region: 'North', store: 'Main St. Market', department: 'Pantry',
    historicalDemand: [12, 11, 10, 12, 13, 14, 11],
    imageUrl: 'https://picsum.photos/seed/pasta/800/800',
    shrinkRate: 0.1, markdownRate: 0.0, oosDays: 0, turnoverRate: 5.8, lastRestockDate: '2026-02-20',
    forecastedDemand: [12, 13, 11, 12, 14, 13, 12]
  },
  {
    id: '15', name: 'Frozen Mixed Vegetables (12oz)', currentStock: 48, avgDailyDemand: 14, leadTime: 3, safetyStock: 18, reorderPoint: 60, status: 'optimal', category: 'Frozen', price: 3.49, region: 'South', store: 'Uptown Grocers', department: 'Frozen',
    historicalDemand: [15, 14, 13, 15, 16, 17, 14],
    imageUrl: 'https://picsum.photos/seed/frozenvegs/800/800',
    shrinkRate: 0.5, markdownRate: 0.2, oosDays: 0, turnoverRate: 10.2, lastRestockDate: '2026-02-23',
    forecastedDemand: [14, 15, 14, 13, 16, 17, 15]
  },
  {
    id: '16', name: 'Orange Juice 100% (52oz)', currentStock: 3, avgDailyDemand: 8, leadTime: 2, safetyStock: 10, reorderPoint: 26, status: 'critical', category: 'Beverages', price: 6.99, region: 'West', store: 'Green Valley Co-op', department: 'Beverages',
    historicalDemand: [9, 8, 7, 9, 10, 11, 9],
    imageUrl: 'https://picsum.photos/seed/oj/800/800',
    shrinkRate: 1.5, markdownRate: 0.8, oosDays: 6, turnoverRate: 8.9, lastRestockDate: '2026-02-21',
    forecastedDemand: [9, 10, 9, 8, 11, 12, 10]
  },
  {
    id: '17', name: 'Russet Potatoes (5lb bag)', currentStock: 37, avgDailyDemand: 13, leadTime: 2, safetyStock: 12, reorderPoint: 38, status: 'low', category: 'Produce', price: 4.99, region: 'North', store: 'Main St. Market', department: 'Produce',
    historicalDemand: [14, 13, 12, 14, 15, 16, 13],
    imageUrl: 'https://picsum.photos/seed/potato/800/800',
    shrinkRate: 2.2, markdownRate: 1.1, oosDays: 0, turnoverRate: 9.2, lastRestockDate: '2026-02-25',
    forecastedDemand: [14, 15, 13, 14, 16, 15, 14]
  },
  {
    id: '18', name: 'Sparkling Water 12pk', currentStock: 55, avgDailyDemand: 16, leadTime: 4, safetyStock: 20, reorderPoint: 84, status: 'optimal', category: 'Beverages', price: 8.99, region: 'East', store: 'Harbor Fresh', department: 'Beverages',
    historicalDemand: [17, 16, 15, 17, 19, 20, 17],
    imageUrl: 'https://picsum.photos/seed/sparkling/800/800',
    shrinkRate: 0.1, markdownRate: 0.0, oosDays: 0, turnoverRate: 7.8, lastRestockDate: '2026-02-24',
    forecastedDemand: [17, 18, 16, 17, 20, 19, 18]
  },
  {
    id: '19', name: 'Ground Coffee Dark Roast (12oz)', currentStock: 23, avgDailyDemand: 7, leadTime: 6, safetyStock: 14, reorderPoint: 56, status: 'low', category: 'Beverages', price: 10.99, region: 'South', store: 'Uptown Grocers', department: 'Beverages',
    historicalDemand: [8, 7, 6, 8, 9, 10, 7],
    imageUrl: 'https://picsum.photos/seed/coffee/800/800',
    shrinkRate: 0.2, markdownRate: 0.1, oosDays: 0, turnoverRate: 4.8, lastRestockDate: '2026-02-19',
    forecastedDemand: [8, 9, 7, 8, 10, 11, 9]
  },
  {
    id: '20', name: 'Avocados (4ct bag)', currentStock: 16, avgDailyDemand: 8, leadTime: 3, safetyStock: 8, reorderPoint: 32, status: 'optimal', category: 'Produce', price: 5.99, region: 'West', store: 'Green Valley Co-op', department: 'Produce',
    historicalDemand: [9, 8, 7, 9, 10, 11, 8],
    imageUrl: 'https://picsum.photos/seed/avocado/800/800',
    shrinkRate: 3.8, markdownRate: 2.0, oosDays: 0, turnoverRate: 11.4, lastRestockDate: '2026-02-26',
    forecastedDemand: [9, 10, 8, 9, 11, 12, 10]
  },
  {
    id: '21', name: 'Tomato Sauce Can (28oz)', currentStock: 74, avgDailyDemand: 10, leadTime: 7, safetyStock: 25, reorderPoint: 95, status: 'low', category: 'Pantry', price: 2.99, region: 'East', store: 'Harbor Fresh', department: 'Pantry',
    historicalDemand: [11, 10, 9, 11, 12, 13, 10],
    imageUrl: 'https://picsum.photos/seed/tomatosauce/800/800',
    shrinkRate: 0.1, markdownRate: 0.0, oosDays: 0, turnoverRate: 4.4, lastRestockDate: '2026-02-17',
    forecastedDemand: [11, 12, 10, 11, 13, 12, 11]
  },
  {
    id: '22', name: 'Frozen Strawberries (16oz)', currentStock: 33, avgDailyDemand: 9, leadTime: 3, safetyStock: 12, reorderPoint: 39, status: 'optimal', category: 'Frozen', price: 4.49, region: 'North', store: 'Main St. Market', department: 'Frozen',
    historicalDemand: [10, 9, 8, 10, 11, 12, 9],
    imageUrl: 'https://picsum.photos/seed/frozenberry/800/800',
    shrinkRate: 0.4, markdownRate: 0.2, oosDays: 0, turnoverRate: 8.1, lastRestockDate: '2026-02-23',
    forecastedDemand: [10, 11, 9, 10, 12, 13, 11]
  },
  {
    id: '23', name: 'Whole Wheat Tortillas (10ct)', currentStock: 27, avgDailyDemand: 8, leadTime: 4, safetyStock: 12, reorderPoint: 44, status: 'optimal', category: 'Bakery', price: 3.79, region: 'South', store: 'Uptown Grocers', department: 'Bakery',
    historicalDemand: [9, 8, 7, 9, 10, 11, 8],
    imageUrl: 'https://picsum.photos/seed/tortilla/800/800',
    shrinkRate: 0.5, markdownRate: 0.3, oosDays: 0, turnoverRate: 6.7, lastRestockDate: '2026-02-22',
    forecastedDemand: [9, 10, 8, 9, 11, 10, 9]
  },
  {
    id: '24', name: 'Pork Ribs (2lb)', currentStock: 10, avgDailyDemand: 5, leadTime: 2, safetyStock: 6, reorderPoint: 16, status: 'low', category: 'Meat', price: 13.99, region: 'North', store: 'Main St. Market', department: 'Meat',
    historicalDemand: [6, 5, 4, 6, 7, 8, 5],
    imageUrl: 'https://picsum.photos/seed/ribs/800/800',
    shrinkRate: 2.5, markdownRate: 1.8, oosDays: 2, turnoverRate: 5.5, lastRestockDate: '2026-02-25',
    forecastedDemand: [6, 7, 6, 5, 7, 8, 7]
  },
  {
    id: '25', name: 'Quinoa (2lb bag)', currentStock: 29, avgDailyDemand: 5, leadTime: 6, safetyStock: 12, reorderPoint: 42, status: 'optimal', category: 'Pantry', price: 8.99, region: 'West', store: 'Green Valley Co-op', department: 'Pantry',
    historicalDemand: [6, 5, 4, 6, 7, 8, 5],
    imageUrl: 'https://picsum.photos/seed/quinoa/800/800',
    shrinkRate: 0.1, markdownRate: 0.0, oosDays: 0, turnoverRate: 3.5, lastRestockDate: '2026-02-16',
    forecastedDemand: [6, 7, 5, 6, 8, 7, 6]
  },
];

const MOCK_ROUTES = [
  { 
    id: 'r1', origin: 'Salinas Valley, CA', destination: 'Chicago Hub', currentRate: 3.45, trend: 'up', capacity: 'tight', riskLevel: 'high',
    historicalRates: [
      { date: '2025-12-01', rate: 2.85 }, { date: '2025-12-08', rate: 2.90 }, { date: '2025-12-15', rate: 3.10 }, { date: '2025-12-22', rate: 3.25 },
      { date: '2026-01-05', rate: 3.15 }, { date: '2026-01-12', rate: 3.20 }, { date: '2026-01-19', rate: 3.35 }, { date: '2026-01-26', rate: 3.40 },
      { date: '2026-02-02', rate: 3.30 }, { date: '2026-02-09', rate: 3.45 }, { date: '2026-02-16', rate: 3.55 }, { date: '2026-02-23', rate: 3.45 }
    ]
  },
  {
    id: 'r2', origin: 'Miami Port, FL', destination: 'Atlanta DC', currentRate: 2.10, trend: 'stable', capacity: 'available', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.05 }, { date: '2025-12-08', rate: 2.00 }, { date: '2025-12-15', rate: 2.05 }, { date: '2025-12-22', rate: 2.10 },
      { date: '2026-01-05', rate: 2.08 }, { date: '2026-01-12', rate: 2.10 }, { date: '2026-01-19', rate: 2.05 }, { date: '2026-01-26', rate: 2.10 },
      { date: '2026-02-02', rate: 2.15 }, { date: '2026-02-09', rate: 2.10 }, { date: '2026-02-16', rate: 2.12 }, { date: '2026-02-23', rate: 2.10 }
    ]
  },
  {
    id: 'r3', origin: 'Pacific Northwest, WA', destination: 'Los Angeles Hub', currentRate: 1.85, trend: 'down', capacity: 'available', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.20 }, { date: '2025-12-08', rate: 2.15 }, { date: '2025-12-15', rate: 2.10 }, { date: '2025-12-22', rate: 2.05 },
      { date: '2026-01-05', rate: 2.00 }, { date: '2026-01-12', rate: 1.98 }, { date: '2026-01-19', rate: 1.95 }, { date: '2026-01-26', rate: 1.92 },
      { date: '2026-02-02', rate: 1.90 }, { date: '2026-02-09', rate: 1.88 }, { date: '2026-02-16', rate: 1.87 }, { date: '2026-02-23', rate: 1.85 }
    ]
  },
  {
    id: 'r4', origin: 'Texas Gulf Coast, TX', destination: 'Dallas DC', currentRate: 1.55, trend: 'stable', capacity: 'available', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 1.50 }, { date: '2025-12-08', rate: 1.52 }, { date: '2025-12-15', rate: 1.55 }, { date: '2025-12-22', rate: 1.58 },
      { date: '2026-01-05', rate: 1.55 }, { date: '2026-01-12', rate: 1.53 }, { date: '2026-01-19', rate: 1.56 }, { date: '2026-01-26', rate: 1.57 },
      { date: '2026-02-02', rate: 1.54 }, { date: '2026-02-09', rate: 1.55 }, { date: '2026-02-16', rate: 1.56 }, { date: '2026-02-23', rate: 1.55 }
    ]
  },
  {
    id: 'r5', origin: 'Central Valley, CA', destination: 'Phoenix Hub', currentRate: 2.75, trend: 'up', capacity: 'limited', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.30 }, { date: '2025-12-08', rate: 2.35 }, { date: '2025-12-15', rate: 2.40 }, { date: '2025-12-22', rate: 2.50 },
      { date: '2026-01-05', rate: 2.45 }, { date: '2026-01-12', rate: 2.50 }, { date: '2026-01-19', rate: 2.55 }, { date: '2026-01-26', rate: 2.60 },
      { date: '2026-02-02', rate: 2.65 }, { date: '2026-02-09', rate: 2.70 }, { date: '2026-02-16', rate: 2.72 }, { date: '2026-02-23', rate: 2.75 }
    ]
  },
  {
    id: 'r6', origin: 'New York Port, NY', destination: 'Boston Hub', currentRate: 1.30, trend: 'stable', capacity: 'available', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 1.25 }, { date: '2025-12-08', rate: 1.28 }, { date: '2025-12-15', rate: 1.30 }, { date: '2025-12-22', rate: 1.32 },
      { date: '2026-01-05', rate: 1.30 }, { date: '2026-01-12', rate: 1.29 }, { date: '2026-01-19', rate: 1.31 }, { date: '2026-01-26', rate: 1.30 },
      { date: '2026-02-02', rate: 1.28 }, { date: '2026-02-09', rate: 1.30 }, { date: '2026-02-16', rate: 1.31 }, { date: '2026-02-23', rate: 1.30 }
    ]
  },
  {
    id: 'r7', origin: 'Great Plains, NE', destination: 'Minneapolis Hub', currentRate: 4.10, trend: 'up', capacity: 'tight', riskLevel: 'high',
    historicalRates: [
      { date: '2025-12-01', rate: 2.80 }, { date: '2025-12-08', rate: 2.95 }, { date: '2025-12-15', rate: 3.20 }, { date: '2025-12-22', rate: 3.40 },
      { date: '2026-01-05', rate: 3.50 }, { date: '2026-01-12', rate: 3.60 }, { date: '2026-01-19', rate: 3.75 }, { date: '2026-01-26', rate: 3.85 },
      { date: '2026-02-02', rate: 3.90 }, { date: '2026-02-09', rate: 3.95 }, { date: '2026-02-16', rate: 4.05 }, { date: '2026-02-23', rate: 4.10 }
    ]
  },
  {
    id: 'r8', origin: 'Southeast Port, SC', destination: 'Charlotte DC', currentRate: 1.95, trend: 'down', capacity: 'available', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.40 }, { date: '2025-12-08', rate: 2.35 }, { date: '2025-12-15', rate: 2.28 }, { date: '2025-12-22', rate: 2.20 },
      { date: '2026-01-05', rate: 2.15 }, { date: '2026-01-12', rate: 2.10 }, { date: '2026-01-19', rate: 2.08 }, { date: '2026-01-26', rate: 2.05 },
      { date: '2026-02-02', rate: 2.02 }, { date: '2026-02-09', rate: 2.00 }, { date: '2026-02-16', rate: 1.97 }, { date: '2026-02-23', rate: 1.95 }
    ]
  },
  {
    id: 'r9', origin: 'Midwest Farms, IA', destination: 'St. Louis Hub', currentRate: 2.60, trend: 'up', capacity: 'limited', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.10 }, { date: '2025-12-08', rate: 2.15 }, { date: '2025-12-15', rate: 2.20 }, { date: '2025-12-22', rate: 2.30 },
      { date: '2026-01-05', rate: 2.25 }, { date: '2026-01-12', rate: 2.30 }, { date: '2026-01-19', rate: 2.35 }, { date: '2026-01-26', rate: 2.40 },
      { date: '2026-02-02', rate: 2.45 }, { date: '2026-02-09', rate: 2.50 }, { date: '2026-02-16', rate: 2.55 }, { date: '2026-02-23', rate: 2.60 }
    ]
  },
  {
    id: 'r10', origin: 'Gulf Coast, LA', destination: 'Nashville DC', currentRate: 2.30, trend: 'stable', capacity: 'available', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.20 }, { date: '2025-12-08', rate: 2.25 }, { date: '2025-12-15', rate: 2.28 }, { date: '2025-12-22', rate: 2.30 },
      { date: '2026-01-05', rate: 2.28 }, { date: '2026-01-12', rate: 2.30 }, { date: '2026-01-19', rate: 2.32 }, { date: '2026-01-26', rate: 2.30 },
      { date: '2026-02-02', rate: 2.28 }, { date: '2026-02-09', rate: 2.30 }, { date: '2026-02-16', rate: 2.31 }, { date: '2026-02-23', rate: 2.30 }
    ]
  },
];

const MOCK_USERS = [
  { id: 'sys1', name: 'System Administrator', username: 'sysadmin', role: 'sysadmin', email: 'sysadmin@pods.ai', phoneNumber: '+1 (000) 0000', password: 'sysadmin', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin1', name: 'Matt', username: 'matt', role: 'admin', email: 'mattjohnson95@gmail.com', phoneNumber: '+1 (555) 0101', password: 'matt', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin2', name: 'Kevin', username: 'kevin', role: 'admin', email: 'kforr4@gmail.com', phoneNumber: '+1 (555) 0102', password: 'kevin', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin3', name: 'Gokul', username: 'gokul', role: 'admin', email: 'gokul.jd@gmail.com', phoneNumber: '+1 (555) 0103', password: 'gokul', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin4', name: 'Venki', username: 'venki', role: 'admin', email: 'vn28565@gmail.com', phoneNumber: '+1 (555) 0104', password: 'venki', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin5', name: 'Anoop', username: 'anoop', role: 'admin', email: 'mkanoop1984@gmail.com', phoneNumber: '+1 (555) 0105', password: 'anoop', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 's1', name: 'Main St. Manager', username: 'main_st_user', role: 'store_user', assignedStore: 'Main St. Market', email: 'mainst@pods-retail.com', phoneNumber: '+1 (555) 0201', password: 'main_st_user', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 's2', name: 'Uptown Manager', username: 'uptown_user', role: 'store_user', assignedStore: 'Uptown Grocers', email: 'uptown@pods-retail.com', phoneNumber: '+1 (555) 0202', password: 'uptown_user', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'l1', name: 'Logistics Analyst 1', username: 'log1', role: 'logistics_user', email: 'log1@pods-logistics.com', phoneNumber: '+1 (555) 0301', password: 'log1', status: 'active', failedLoginAttempts: 0, isLocked: false },
];

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://pods_user:pods_password@localhost:5432/pods_db',
  });

  try {
    console.log('🌱 Seeding database...');

    await pool.query('DELETE FROM freight_route_rates');
    await pool.query('DELETE FROM product_demand');
    await pool.query('DELETE FROM freight_routes');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM users');

    // Seed users
    for (const user of MOCK_USERS) {
      await pool.query(`
        INSERT INTO users (
          id, name, username, role, assigned_store, email, phone_number, password,
          status, failed_login_attempts, is_locked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        user.id, user.name, user.username, user.role, user.assignedStore || null,
        user.email, user.phoneNumber, user.password, user.status,
        user.failedLoginAttempts, user.isLocked
      ]);
    }
    console.log(`✓ Seeded ${MOCK_USERS.length} users`);

    // Seed products
    for (const product of MOCK_PRODUCTS) {
      await pool.query(`
        INSERT INTO products (
          id, name, current_stock, avg_daily_demand, lead_time, safety_stock,
          reorder_point, status, category, price, region, store, department,
          image_url, shrink_rate, markdown_rate, oos_days, turnover_rate, last_restock_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        product.id, product.name, product.currentStock, product.avgDailyDemand,
        product.leadTime, product.safetyStock, product.reorderPoint, product.status,
        product.category, product.price, product.region, product.store, product.department,
        product.imageUrl, product.shrinkRate, product.markdownRate, product.oosDays,
        product.turnoverRate, product.lastRestockDate
      ]);

      await pool.query(`
        INSERT INTO product_demand (product_id, historical_demand, forecasted_demand)
        VALUES ($1, $2, $3)
      `, [
        product.id,
        product.historicalDemand || [],
        product.forecastedDemand || []
      ]);
    }
    console.log(`✓ Seeded ${MOCK_PRODUCTS.length} products`);

    // Seed routes
    for (const route of MOCK_ROUTES) {
      await pool.query(`
        INSERT INTO freight_routes (id, origin, destination, current_rate, trend, capacity, risk_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        route.id, route.origin, route.destination, route.currentRate,
        route.trend, route.capacity, route.riskLevel
      ]);

      for (const rate of route.historicalRates || []) {
        await pool.query(`
          INSERT INTO freight_route_rates (route_id, rate_date, rate)
          VALUES ($1, $2, $3)
        `, [route.id, rate.date, rate.rate]);
      }
    }
    console.log(`✓ Seeded ${MOCK_ROUTES.length} routes`);

    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error seeding database:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('❌ Error seeding database:', JSON.stringify(error, null, 2));
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();