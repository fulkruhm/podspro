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
  {
    id: '26', name: 'Cage-Free Brown Eggs (18ct)', currentStock: 9, avgDailyDemand: 11, leadTime: 2, safetyStock: 10, reorderPoint: 32, status: 'critical', category: 'Dairy', price: 8.49, region: 'Central', store: 'River Bend Foods', department: 'Dairy',
    historicalDemand: [12, 10, 11, 13, 14, 12, 11],
    imageUrl: 'https://picsum.photos/seed/browneggs/800/800',
    shrinkRate: 0.9, markdownRate: 0.3, oosDays: 4, turnoverRate: 15.4, lastRestockDate: '2026-02-21',
    forecastedDemand: [12, 13, 11, 12, 14, 13, 12]
  },
  {
    id: '27', name: 'Ground Turkey (1lb)', currentStock: 44, avgDailyDemand: 9, leadTime: 2, safetyStock: 10, reorderPoint: 28, status: 'excess', category: 'Meat', price: 7.99, region: 'Central', store: 'River Bend Foods', department: 'Meat',
    historicalDemand: [8, 7, 8, 9, 10, 9, 8],
    imageUrl: 'https://picsum.photos/seed/turkey/800/800',
    shrinkRate: 1.8, markdownRate: 1.1, oosDays: 0, turnoverRate: 6.2, lastRestockDate: '2026-02-24',
    forecastedDemand: [9, 10, 8, 9, 10, 11, 9]
  },
  {
    id: '28', name: 'Whole Grain Cereal (18oz)', currentStock: 87, avgDailyDemand: 10, leadTime: 5, safetyStock: 18, reorderPoint: 68, status: 'excess', category: 'Pantry', price: 5.29, region: 'North', store: 'Main St. Market', department: 'Pantry',
    historicalDemand: [11, 10, 9, 11, 12, 13, 10],
    imageUrl: 'https://picsum.photos/seed/cereal/800/800',
    shrinkRate: 0.2, markdownRate: 0.4, oosDays: 0, turnoverRate: 5.1, lastRestockDate: '2026-02-18',
    forecastedDemand: [11, 12, 10, 11, 13, 12, 11]
  },
  {
    id: '29', name: 'Frozen Chicken Nuggets (32oz)', currentStock: 12, avgDailyDemand: 8, leadTime: 4, safetyStock: 12, reorderPoint: 44, status: 'critical', category: 'Frozen', price: 7.49, region: 'South', store: 'Uptown Grocers', department: 'Frozen',
    historicalDemand: [9, 8, 7, 9, 10, 11, 9],
    imageUrl: 'https://picsum.photos/seed/nuggets/800/800',
    shrinkRate: 0.4, markdownRate: 0.2, oosDays: 3, turnoverRate: 6.9, lastRestockDate: '2026-02-19',
    forecastedDemand: [9, 10, 9, 8, 11, 12, 10]
  },
  {
    id: '30', name: 'Sparkling Apple Cider (25oz)', currentStock: 39, avgDailyDemand: 6, leadTime: 5, safetyStock: 10, reorderPoint: 40, status: 'optimal', category: 'Beverages', price: 4.99, region: 'East', store: 'Harbor Fresh', department: 'Beverages',
    historicalDemand: [7, 6, 5, 7, 8, 7, 6],
    imageUrl: 'https://picsum.photos/seed/cider/800/800',
    shrinkRate: 0.2, markdownRate: 0.2, oosDays: 0, turnoverRate: 4.1, lastRestockDate: '2026-02-20',
    forecastedDemand: [7, 8, 6, 7, 8, 9, 7]
  },
  {
    id: '31', name: 'Roma Tomatoes (2lb)', currentStock: 13, avgDailyDemand: 11, leadTime: 2, safetyStock: 10, reorderPoint: 32, status: 'low', category: 'Produce', price: 3.79, region: 'West', store: 'Green Valley Co-op', department: 'Produce',
    historicalDemand: [12, 11, 10, 12, 14, 13, 11],
    imageUrl: 'https://picsum.photos/seed/roma/800/800',
    shrinkRate: 4.2, markdownRate: 2.4, oosDays: 1, turnoverRate: 12.8, lastRestockDate: '2026-02-26',
    forecastedDemand: [12, 13, 11, 12, 14, 15, 13]
  },
  {
    id: '32', name: 'Cod Fillet Frozen (2lb)', currentStock: 26, avgDailyDemand: 5, leadTime: 4, safetyStock: 10, reorderPoint: 30, status: 'optimal', category: 'Seafood', price: 12.99, region: 'Central', store: 'Metro Wholesale', department: 'Seafood',
    historicalDemand: [6, 5, 4, 6, 7, 6, 5],
    imageUrl: 'https://picsum.photos/seed/cod/800/800',
    shrinkRate: 1.1, markdownRate: 0.7, oosDays: 0, turnoverRate: 4.8, lastRestockDate: '2026-02-22',
    forecastedDemand: [6, 7, 5, 6, 7, 8, 6]
  },
  {
    id: '33', name: 'Butter Croissants (6ct)', currentStock: 18, avgDailyDemand: 13, leadTime: 1, safetyStock: 8, reorderPoint: 21, status: 'low', category: 'Bakery', price: 5.99, region: 'East', store: 'Harbor Fresh', department: 'Bakery',
    historicalDemand: [14, 13, 12, 14, 15, 16, 13],
    imageUrl: 'https://picsum.photos/seed/croissant/800/800',
    shrinkRate: 3.1, markdownRate: 2.2, oosDays: 1, turnoverRate: 17.3, lastRestockDate: '2026-02-28',
    forecastedDemand: [14, 15, 13, 14, 16, 17, 15]
  },
  {
    id: '34', name: 'Maple Syrup (12oz)', currentStock: 58, avgDailyDemand: 4, leadTime: 7, safetyStock: 10, reorderPoint: 38, status: 'excess', category: 'Pantry', price: 9.49, region: 'South', store: 'Uptown Grocers', department: 'Pantry',
    historicalDemand: [5, 4, 4, 5, 6, 5, 4],
    imageUrl: 'https://picsum.photos/seed/maple/800/800',
    shrinkRate: 0.1, markdownRate: 0.0, oosDays: 0, turnoverRate: 2.9, lastRestockDate: '2026-02-12',
    forecastedDemand: [5, 6, 4, 5, 6, 7, 5]
  },
  {
    id: '35', name: 'Protein Bar Variety Pack (12ct)', currentStock: 21, avgDailyDemand: 7, leadTime: 6, safetyStock: 10, reorderPoint: 52, status: 'critical', category: 'Snacks', price: 15.99, region: 'Central', store: 'Metro Wholesale', department: 'Pantry',
    historicalDemand: [8, 7, 6, 8, 9, 10, 7],
    imageUrl: 'https://picsum.photos/seed/proteinbar/800/800',
    shrinkRate: 0.1, markdownRate: 0.1, oosDays: 5, turnoverRate: 4.2, lastRestockDate: '2026-02-14',
    forecastedDemand: [8, 9, 7, 8, 10, 11, 9]
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
    id: 'r2', origin: 'Miami Port, FL', destination: 'Atlanta DC', currentRate: 2.10, trend: 'stable', capacity: 'loose', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.05 }, { date: '2025-12-08', rate: 2.00 }, { date: '2025-12-15', rate: 2.05 }, { date: '2025-12-22', rate: 2.10 },
      { date: '2026-01-05', rate: 2.08 }, { date: '2026-01-12', rate: 2.10 }, { date: '2026-01-19', rate: 2.05 }, { date: '2026-01-26', rate: 2.10 },
      { date: '2026-02-02', rate: 2.15 }, { date: '2026-02-09', rate: 2.10 }, { date: '2026-02-16', rate: 2.12 }, { date: '2026-02-23', rate: 2.10 }
    ]
  },
  {
    id: 'r3', origin: 'Pacific Northwest, WA', destination: 'Los Angeles Hub', currentRate: 1.85, trend: 'down', capacity: 'loose', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.20 }, { date: '2025-12-08', rate: 2.15 }, { date: '2025-12-15', rate: 2.10 }, { date: '2025-12-22', rate: 2.05 },
      { date: '2026-01-05', rate: 2.00 }, { date: '2026-01-12', rate: 1.98 }, { date: '2026-01-19', rate: 1.95 }, { date: '2026-01-26', rate: 1.92 },
      { date: '2026-02-02', rate: 1.90 }, { date: '2026-02-09', rate: 1.88 }, { date: '2026-02-16', rate: 1.87 }, { date: '2026-02-23', rate: 1.85 }
    ]
  },
  {
    id: 'r4', origin: 'Texas Gulf Coast, TX', destination: 'Dallas DC', currentRate: 1.55, trend: 'stable', capacity: 'loose', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 1.50 }, { date: '2025-12-08', rate: 1.52 }, { date: '2025-12-15', rate: 1.55 }, { date: '2025-12-22', rate: 1.58 },
      { date: '2026-01-05', rate: 1.55 }, { date: '2026-01-12', rate: 1.53 }, { date: '2026-01-19', rate: 1.56 }, { date: '2026-01-26', rate: 1.57 },
      { date: '2026-02-02', rate: 1.54 }, { date: '2026-02-09', rate: 1.55 }, { date: '2026-02-16', rate: 1.56 }, { date: '2026-02-23', rate: 1.55 }
    ]
  },
  {
    id: 'r5', origin: 'Central Valley, CA', destination: 'Phoenix Hub', currentRate: 2.75, trend: 'up', capacity: 'moderate', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.30 }, { date: '2025-12-08', rate: 2.35 }, { date: '2025-12-15', rate: 2.40 }, { date: '2025-12-22', rate: 2.50 },
      { date: '2026-01-05', rate: 2.45 }, { date: '2026-01-12', rate: 2.50 }, { date: '2026-01-19', rate: 2.55 }, { date: '2026-01-26', rate: 2.60 },
      { date: '2026-02-02', rate: 2.65 }, { date: '2026-02-09', rate: 2.70 }, { date: '2026-02-16', rate: 2.72 }, { date: '2026-02-23', rate: 2.75 }
    ]
  },
  {
    id: 'r6', origin: 'New York Port, NY', destination: 'Boston Hub', currentRate: 1.30, trend: 'stable', capacity: 'loose', riskLevel: 'low',
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
    id: 'r8', origin: 'Southeast Port, SC', destination: 'Charlotte DC', currentRate: 1.95, trend: 'down', capacity: 'loose', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.40 }, { date: '2025-12-08', rate: 2.35 }, { date: '2025-12-15', rate: 2.28 }, { date: '2025-12-22', rate: 2.20 },
      { date: '2026-01-05', rate: 2.15 }, { date: '2026-01-12', rate: 2.10 }, { date: '2026-01-19', rate: 2.08 }, { date: '2026-01-26', rate: 2.05 },
      { date: '2026-02-02', rate: 2.02 }, { date: '2026-02-09', rate: 2.00 }, { date: '2026-02-16', rate: 1.97 }, { date: '2026-02-23', rate: 1.95 }
    ]
  },
  {
    id: 'r9', origin: 'Midwest Farms, IA', destination: 'St. Louis Hub', currentRate: 2.60, trend: 'up', capacity: 'moderate', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.10 }, { date: '2025-12-08', rate: 2.15 }, { date: '2025-12-15', rate: 2.20 }, { date: '2025-12-22', rate: 2.30 },
      { date: '2026-01-05', rate: 2.25 }, { date: '2026-01-12', rate: 2.30 }, { date: '2026-01-19', rate: 2.35 }, { date: '2026-01-26', rate: 2.40 },
      { date: '2026-02-02', rate: 2.45 }, { date: '2026-02-09', rate: 2.50 }, { date: '2026-02-16', rate: 2.55 }, { date: '2026-02-23', rate: 2.60 }
    ]
  },
  {
    id: 'r10', origin: 'Gulf Coast, LA', destination: 'Nashville DC', currentRate: 2.30, trend: 'stable', capacity: 'loose', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.20 }, { date: '2025-12-08', rate: 2.25 }, { date: '2025-12-15', rate: 2.28 }, { date: '2025-12-22', rate: 2.30 },
      { date: '2026-01-05', rate: 2.28 }, { date: '2026-01-12', rate: 2.30 }, { date: '2026-01-19', rate: 2.32 }, { date: '2026-01-26', rate: 2.30 },
      { date: '2026-02-02', rate: 2.28 }, { date: '2026-02-09', rate: 2.30 }, { date: '2026-02-16', rate: 2.31 }, { date: '2026-02-23', rate: 2.30 }
    ]
  },
  {
    id: 'r11', origin: 'Denver Crossdock, CO', destination: 'Salt Lake Hub', currentRate: 2.05, trend: 'stable', capacity: 'moderate', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 1.95 }, { date: '2025-12-08', rate: 1.98 }, { date: '2025-12-15', rate: 2.00 }, { date: '2025-12-22', rate: 2.03 },
      { date: '2026-01-05', rate: 2.00 }, { date: '2026-01-12', rate: 2.02 }, { date: '2026-01-19', rate: 2.04 }, { date: '2026-01-26', rate: 2.05 },
      { date: '2026-02-02', rate: 2.03 }, { date: '2026-02-09', rate: 2.04 }, { date: '2026-02-16', rate: 2.05 }, { date: '2026-02-23', rate: 2.05 }
    ]
  },
  {
    id: 'r12', origin: 'Kansas City Rail, MO', destination: 'Memphis Hub', currentRate: 2.95, trend: 'up', capacity: 'tight', riskLevel: 'high',
    historicalRates: [
      { date: '2025-12-01', rate: 2.20 }, { date: '2025-12-08', rate: 2.30 }, { date: '2025-12-15', rate: 2.42 }, { date: '2025-12-22', rate: 2.55 },
      { date: '2026-01-05', rate: 2.60 }, { date: '2026-01-12', rate: 2.68 }, { date: '2026-01-19', rate: 2.72 }, { date: '2026-01-26', rate: 2.80 },
      { date: '2026-02-02', rate: 2.84 }, { date: '2026-02-09', rate: 2.89 }, { date: '2026-02-16', rate: 2.93 }, { date: '2026-02-23', rate: 2.95 }
    ]
  },
  {
    id: 'r13', origin: 'Portland Terminal, OR', destination: 'Boise DC', currentRate: 1.72, trend: 'down', capacity: 'loose', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 2.10 }, { date: '2025-12-08', rate: 2.04 }, { date: '2025-12-15', rate: 1.98 }, { date: '2025-12-22', rate: 1.92 },
      { date: '2026-01-05', rate: 1.88 }, { date: '2026-01-12', rate: 1.85 }, { date: '2026-01-19', rate: 1.82 }, { date: '2026-01-26', rate: 1.79 },
      { date: '2026-02-02', rate: 1.77 }, { date: '2026-02-09', rate: 1.75 }, { date: '2026-02-16', rate: 1.73 }, { date: '2026-02-23', rate: 1.72 }
    ]
  },
  {
    id: 'r14', origin: 'Savannah Port, GA', destination: 'Jacksonville Hub', currentRate: 1.65, trend: 'stable', capacity: 'loose', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 1.60 }, { date: '2025-12-08', rate: 1.62 }, { date: '2025-12-15', rate: 1.63 }, { date: '2025-12-22', rate: 1.64 },
      { date: '2026-01-05', rate: 1.63 }, { date: '2026-01-12', rate: 1.64 }, { date: '2026-01-19', rate: 1.66 }, { date: '2026-01-26', rate: 1.65 },
      { date: '2026-02-02', rate: 1.64 }, { date: '2026-02-09', rate: 1.65 }, { date: '2026-02-16', rate: 1.66 }, { date: '2026-02-23', rate: 1.65 }
    ]
  },
  {
    id: 'r15', origin: 'Ontario, CA', destination: 'Las Vegas Hub', currentRate: 2.40, trend: 'up', capacity: 'moderate', riskLevel: 'medium',
    historicalRates: [
      { date: '2025-12-01', rate: 2.02 }, { date: '2025-12-08', rate: 2.08 }, { date: '2025-12-15', rate: 2.12 }, { date: '2025-12-22', rate: 2.18 },
      { date: '2026-01-05', rate: 2.20 }, { date: '2026-01-12', rate: 2.24 }, { date: '2026-01-19', rate: 2.28 }, { date: '2026-01-26', rate: 2.32 },
      { date: '2026-02-02', rate: 2.34 }, { date: '2026-02-09', rate: 2.36 }, { date: '2026-02-16', rate: 2.38 }, { date: '2026-02-23', rate: 2.40 }
    ]
  },
  {
    id: 'r16', origin: 'Cleveland Freight, OH', destination: 'Detroit Hub', currentRate: 1.48, trend: 'stable', capacity: 'moderate', riskLevel: 'low',
    historicalRates: [
      { date: '2025-12-01', rate: 1.44 }, { date: '2025-12-08', rate: 1.45 }, { date: '2025-12-15', rate: 1.46 }, { date: '2025-12-22', rate: 1.47 },
      { date: '2026-01-05', rate: 1.46 }, { date: '2026-01-12', rate: 1.47 }, { date: '2026-01-19', rate: 1.48 }, { date: '2026-01-26', rate: 1.49 },
      { date: '2026-02-02', rate: 1.48 }, { date: '2026-02-09', rate: 1.48 }, { date: '2026-02-16', rate: 1.49 }, { date: '2026-02-23', rate: 1.48 }
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

type SeedProduct = (typeof MOCK_PRODUCTS)[number];
type SeedRoute = (typeof MOCK_ROUTES)[number];

function parseSeedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

const SEED_PRODUCT_MULTIPLIER = parseSeedInt(process.env.SEED_PRODUCT_MULTIPLIER, 2, 1, 8);
const SEED_ROUTE_MULTIPLIER = parseSeedInt(process.env.SEED_ROUTE_MULTIPLIER, 2, 1, 8);
const SEED_HISTORY_DAYS = parseSeedInt(process.env.SEED_HISTORY_DAYS, 84, 28, 365);
const SEED_FORECAST_DAYS = parseSeedInt(process.env.SEED_FORECAST_DAYS, 14, 7, 60);

const STORE_REGION_MAP: Array<{ store: string; region: string }> = [
  { store: 'Main St. Market', region: 'North' },
  { store: 'Uptown Grocers', region: 'South' },
  { store: 'Harbor Fresh', region: 'East' },
  { store: 'Green Valley Co-op', region: 'West' },
  { store: 'River Bend Foods', region: 'Central' },
  { store: 'Metro Wholesale', region: 'Central' },
];

const SEED_REFERENCE_DATE = new Date(Date.UTC(2026, 1, 28));

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftSeedDate(dateString: string, referenceDate = new Date()): string {
  const parsed = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  const referenceUtc = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())
  );
  const dayDelta = Math.round(
    (parsed.getTime() - SEED_REFERENCE_DATE.getTime()) / (24 * 60 * 60 * 1000)
  );

  referenceUtc.setUTCDate(referenceUtc.getUTCDate() + dayDelta);
  return formatDateOnlyUtc(referenceUtc);
}

function withDynamicSeedDates(product: SeedProduct): SeedProduct {
  return {
    ...product,
    lastRestockDate: shiftSeedDate(product.lastRestockDate),
  };
}

function buildForecastSeries(baseWeekly: number[], fallbackWeekly: number[], totalDays = 14): number[] {
  const source = baseWeekly.length > 0 ? baseWeekly : fallbackWeekly;
  if (!source.length) return [];

  const output: number[] = [];
  const startOffset = totalDays % source.length;

  for (let i = 0; i < totalDays; i++) {
    const idx = (startOffset + i) % source.length;
    const baseValue = source[idx] || 0;
    const weekendLift = i % 7 === 5 || i % 7 === 6 ? 1.06 : 0.96;
    const drift = 1 + (i / Math.max(1, totalDays - 1)) * 0.08;
    const noise = ((i % 4) - 1.5) * 0.03;
    output.push(Math.max(0, Math.round(baseValue * weekendLift * drift * (1 + noise))));
  }

  return output;
}

function buildSeedProducts(): SeedProduct[] {
  if (SEED_PRODUCT_MULTIPLIER <= 1) {
    return MOCK_PRODUCTS.map((product) => ({
      ...withDynamicSeedDates(product),
      historicalDemand: [...product.historicalDemand],
      forecastedDemand: buildForecastSeries(product.forecastedDemand || [], product.historicalDemand || [], SEED_FORECAST_DAYS),
    }));
  }

  const expanded: SeedProduct[] = [];
  let syntheticIdCounter = 1000;

  for (let replica = 0; replica < SEED_PRODUCT_MULTIPLIER; replica++) {
    for (const baseProduct of MOCK_PRODUCTS) {
      if (replica === 0) {
        expanded.push({
          ...withDynamicSeedDates(baseProduct),
          historicalDemand: [...baseProduct.historicalDemand],
          forecastedDemand: buildForecastSeries(baseProduct.forecastedDemand || [], baseProduct.historicalDemand || [], SEED_FORECAST_DAYS),
        });
        continue;
      }

      const location = STORE_REGION_MAP[(Number(baseProduct.id) + replica) % STORE_REGION_MAP.length];
      const stockScale = 1 + ((replica % 3) - 1) * 0.18;
      const demandScale = 1 + ((replica % 4) - 1.5) * 0.10;
      const historicalDemand = (baseProduct.historicalDemand || []).map((value, idx) => {
        const noise = ((idx + replica) % 3 - 1) * 0.05;
        return Math.max(0, Math.round(value * demandScale * (1 + noise)));
      });

      const forecastedDemand = buildForecastSeries(baseProduct.forecastedDemand || [], historicalDemand, SEED_FORECAST_DAYS);

      const derivedDemand = Math.max(1, Math.round(baseProduct.avgDailyDemand * demandScale));
      const derivedStock = Math.max(0, Math.round(baseProduct.currentStock * stockScale));
      const derivedReorderPoint = Math.max(derivedDemand + baseProduct.safetyStock, Math.round(baseProduct.reorderPoint * demandScale));

      expanded.push({
        ...withDynamicSeedDates(baseProduct),
        id: String(syntheticIdCounter++),
        name: `${baseProduct.name} • Variant ${replica + 1}`,
        currentStock: derivedStock,
        avgDailyDemand: derivedDemand,
        reorderPoint: derivedReorderPoint,
        status: derivedStock <= Math.max(1, Math.floor(derivedReorderPoint * 0.35))
          ? 'critical'
          : derivedStock <= Math.max(1, Math.floor(derivedReorderPoint * 0.7))
            ? 'low'
            : derivedStock >= Math.max(1, Math.floor(derivedReorderPoint * 1.5))
              ? 'excess'
              : 'optimal',
        region: location.region,
        store: location.store,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(baseProduct.id)}-${replica}/800/800`,
        historicalDemand,
        forecastedDemand,
      });
    }
  }

  return expanded;
}

function buildSeedRoutes(): SeedRoute[] {
  if (SEED_ROUTE_MULTIPLIER <= 1) {
    return MOCK_ROUTES.map((route) => ({
      ...route,
      historicalRates: route.historicalRates.map((rate) => ({ ...rate })),
    }));
  }

  const expanded: SeedRoute[] = [];

  for (let replica = 0; replica < SEED_ROUTE_MULTIPLIER; replica++) {
    for (const baseRoute of MOCK_ROUTES) {
      if (replica === 0) {
        expanded.push({
          ...baseRoute,
          historicalRates: baseRoute.historicalRates.map((rate) => ({ ...rate })),
        });
        continue;
      }

      const rateScale = 1 + ((replica % 5) - 2) * 0.06;
      const historicalRates = baseRoute.historicalRates.map((rate, idx) => {
        const noise = ((idx + replica) % 4 - 1.5) * 0.02;
        const scaledRate = Number((rate.rate * rateScale * (1 + noise)).toFixed(2));
        return {
          date: rate.date,
          rate: Math.max(0.8, scaledRate),
        };
      });

      const currentRate = historicalRates[historicalRates.length - 1]?.rate ?? baseRoute.currentRate;

      expanded.push({
        ...baseRoute,
        id: `${baseRoute.id}-v${replica + 1}`,
        origin: `${baseRoute.origin} (L${replica + 1})`,
        destination: `${baseRoute.destination} (L${replica + 1})`,
        currentRate,
        historicalRates,
      });
    }
  }

  return expanded;
}

function buildHistoricalSeries(baseWeekly: number[], totalDays = 56): number[] {
  if (!baseWeekly.length) {
    return [];
  }

  const series: number[] = [];
  const startOffset = totalDays % baseWeekly.length;

  for (let i = 0; i < totalDays; i++) {
    const weeklyIdx = (startOffset + i) % baseWeekly.length;
    const baseValue = baseWeekly[weeklyIdx] || 0;

    const seasonality = i % 7 === 5 || i % 7 === 6 ? 1.08 : 0.97;
    const drift = 1 + ((i - totalDays / 2) / totalDays) * 0.06;
    const noise = ((i % 5) - 2) * 0.04;

    const adjusted = Math.max(0, Math.round(baseValue * seasonality * drift * (1 + noise)));
    series.push(adjusted);
  }

  return series;
}

function isFixedHoliday(date: Date): boolean {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const key = `${month}-${day}`;
  const fixedHolidays = new Set([
    '1-1',
    '7-4',
    '11-26',
    '12-24',
    '12-25',
    '12-31'
  ]);
  return fixedHolidays.has(key);
}

const SEEDED_PROMO_DAY_OFFSETS = new Set([1, 3, 5, 8, 10, 12]);
const SEEDED_HOLIDAY_DAY_OFFSETS = new Set([7, 14]);

function buildFeatureSignal(productId: string, dayOffset: number, date: Date) {
  const weekday = date.getUTCDay(); // 0=Sun
  const holidayFlag = isFixedHoliday(date)
    || (dayOffset > 0 && SEEDED_HOLIDAY_DAY_OFFSETS.has(dayOffset));

  const promoFlag = (dayOffset > 0 && SEEDED_PROMO_DAY_OFFSETS.has(dayOffset))
    || holidayFlag
    || (dayOffset <= 0 && weekday === 5);

  const seasonalWave = Math.sin((dayOffset / 9) * Math.PI) * 0.08;
  const weekendLift = (weekday === 5 || weekday === 6) ? 0.05 : -0.02;
  const promoWeatherBoost = promoFlag ? 0.04 : 0;
  const weatherIndex = Number((1 + seasonalWave + weekendLift + promoWeatherBoost).toFixed(3));

  return {
    promoFlag,
    holidayFlag,
    weatherIndex: Math.max(0.75, Math.min(1.35, weatherIndex)),
  };
}

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://pods_user:pods_password@localhost:5432/pods_db',
  });

  try {
    console.log('🌱 Seeding database...');

    const seedProducts = buildSeedProducts();
    const seedRoutes = buildSeedRoutes();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_demand_history (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        store_id VARCHAR(255) NOT NULL,
        demand_date DATE NOT NULL,
        demand_qty INTEGER NOT NULL CHECK (demand_qty >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (product_id, store_id, demand_date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_demand_forecast (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        store_id VARCHAR(255) NOT NULL,
        forecast_date DATE NOT NULL,
        forecast_qty DECIMAL(10,2) NOT NULL CHECK (forecast_qty >= 0),
        confidence_lower DECIMAL(10,2),
        confidence_upper DECIMAL(10,2),
        trend VARCHAR(50),
        explainability_text TEXT,
        model_name VARCHAR(100) DEFAULT 'exponential_smoothing',
        generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_demand_features (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        store_id VARCHAR(255) NOT NULL,
        feature_date DATE NOT NULL,
        promo_flag BOOLEAN NOT NULL DEFAULT FALSE,
        holiday_flag BOOLEAN NOT NULL DEFAULT FALSE,
        weather_index DECIMAL(6,3) NOT NULL DEFAULT 1.000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (product_id, store_id, feature_date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ml_batch_job_runs (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial_success')),
        triggered_by VARCHAR(255),
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        total_items INTEGER,
        succeeded_items INTEGER,
        failed_items INTEGER,
        error_summary TEXT,
        details JSONB
      )
    `);

    await pool.query('DELETE FROM freight_route_rates');
    await pool.query('DELETE FROM ml_batch_job_runs');
    await pool.query('DELETE FROM product_demand_forecast');
    await pool.query('DELETE FROM product_demand_features');
    await pool.query('DELETE FROM product_demand_history');
    await pool.query('DELETE FROM freight_routes');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM users');

    // Enforce schema contracts on existing databases (init.sql only runs on fresh volumes)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check') THEN
          ALTER TABLE products
          ADD CONSTRAINT products_status_check CHECK (status IN ('optimal', 'low', 'excess', 'critical'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'freight_routes_trend_check') THEN
          ALTER TABLE freight_routes
          ADD CONSTRAINT freight_routes_trend_check CHECK (trend IN ('up', 'down', 'stable'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'freight_routes_capacity_check') THEN
          ALTER TABLE freight_routes
          ADD CONSTRAINT freight_routes_capacity_check CHECK (capacity IN ('loose', 'moderate', 'tight'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'freight_routes_risk_level_check') THEN
          ALTER TABLE freight_routes
          ADD CONSTRAINT freight_routes_risk_level_check CHECK (risk_level IN ('low', 'medium', 'high'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
          ALTER TABLE users
          ADD CONSTRAINT users_role_check CHECK (role IN ('sysadmin', 'admin', 'store_user', 'logistics_user'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
          ALTER TABLE users
          ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'paused', 'deactivated'));
        END IF;
      END $$;
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_product_demand_history_product_store_date ON product_demand_history(product_id, store_id, demand_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_product_demand_forecast_product_store_generated ON product_demand_forecast(product_id, store_id, generated_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_product_demand_features_product_store_date ON product_demand_features(product_id, store_id, feature_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_freight_routes_destination ON freight_routes(destination)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_freight_routes_risk_level ON freight_routes(risk_level)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_freight_routes_capacity ON freight_routes(capacity)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_freight_routes_trend ON freight_routes(trend)');

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
    for (const product of seedProducts) {
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

      const historicalSeries = buildHistoricalSeries(product.historicalDemand || [], SEED_HISTORY_DAYS);

      for (let idx = 0; idx < historicalSeries.length; idx++) {
        const demandQty = historicalSeries[idx];
        const daysAgo = historicalSeries.length - idx - 1;

        await pool.query(`
          INSERT INTO product_demand_history (product_id, store_id, demand_date, demand_qty)
          VALUES (
            $1,
            $2,
            CURRENT_DATE - ($3 * INTERVAL '1 day'),
            $4
          )
        `, [product.id, product.store, daysAgo, demandQty]);
      }

      for (let dayOffset = -(SEED_HISTORY_DAYS - 1); dayOffset <= Math.max(30, SEED_FORECAST_DAYS + 14); dayOffset++) {
        const featureDate = new Date();
        featureDate.setUTCDate(featureDate.getUTCDate() + dayOffset);
        const featureSignal = buildFeatureSignal(product.id, dayOffset, featureDate);

        await pool.query(`
          INSERT INTO product_demand_features (
            product_id,
            store_id,
            feature_date,
            promo_flag,
            holiday_flag,
            weather_index
          )
          VALUES (
            $1,
            $2,
            CURRENT_DATE + ($3 * INTERVAL '1 day'),
            $4,
            $5,
            $6
          )
          ON CONFLICT (product_id, store_id, feature_date)
          DO UPDATE SET
            promo_flag = EXCLUDED.promo_flag,
            holiday_flag = EXCLUDED.holiday_flag,
            weather_index = EXCLUDED.weather_index
        `, [
          product.id,
          product.store,
          dayOffset,
          featureSignal.promoFlag,
          featureSignal.holidayFlag,
          featureSignal.weatherIndex,
        ]);
      }

      const generatedAt = new Date().toISOString();
      const forecastSeries = buildForecastSeries(product.forecastedDemand || [], historicalSeries, SEED_FORECAST_DAYS);
      for (let idx = 0; idx < forecastSeries.length; idx++) {
        const forecastQty = forecastSeries[idx];

        await pool.query(`
          INSERT INTO product_demand_forecast (
            product_id,
            store_id,
            forecast_date,
            forecast_qty,
            explainability_text,
            generated_at,
            model_name
          )
          VALUES (
            $1,
            $2,
            CURRENT_DATE + (($3 + 1) * INTERVAL '1 day'),
            $4,
            $5,
            $6,
            'seed_baseline'
          )
        `, [
          product.id,
          product.store,
          idx,
          forecastQty,
          `Seed baseline forecast for D+${idx + 1}.`,
          generatedAt,
        ]);
      }
    }
    console.log(`✓ Seeded ${seedProducts.length} products`);
    console.log(
      `✓ Seeded feature schedule (next 14 days): promo D+${Array.from(SEEDED_PROMO_DAY_OFFSETS).join(', D+')}; holidays D+${Array.from(SEEDED_HOLIDAY_DAY_OFFSETS).join(', D+')}`
    );

    // Seed routes
    for (const route of seedRoutes) {
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
    console.log(`✓ Seeded ${seedRoutes.length} routes`);
    console.log(`✓ Seed config: products x${SEED_PRODUCT_MULTIPLIER}, routes x${SEED_ROUTE_MULTIPLIER}, history ${SEED_HISTORY_DAYS}d, forecast ${SEED_FORECAST_DAYS}d`);

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