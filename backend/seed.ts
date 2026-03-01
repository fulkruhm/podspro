import pkg from 'pg';
const { Pool } = pkg;

// Sample mock data (you can import from constants later)
const MOCK_PRODUCTS = [
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
  // Add more products as needed...
];

const MOCK_ROUTES = [
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
];

const MOCK_USERS = [
  // SysAdmin
  { id: 'sys1', name: 'System Administrator', username: 'sysadmin', role: 'sysadmin', email: 'sysadmin@pods.ai', phoneNumber: '+1 (000) 0000', password: 'sysadmin', status: 'active', failedLoginAttempts: 0, isLocked: false },
  // Admins
  { id: 'admin1', name: 'Matt', username: 'matt', role: 'admin', email: 'mattjohnson95@gmail.com', phoneNumber: '+1 (555) 0101', password: 'matt', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin2', name: 'Kevin', username: 'kevin', role: 'admin', email: 'kforr4@gmail.com', phoneNumber: '+1 (555) 0102', password: 'kevin', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin3', name: 'Gokul', username: 'gokul', role: 'admin', email: 'gokul.jd@gmail.com', phoneNumber: '+1 (555) 0103', password: 'gokul', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin4', name: 'Venki', username: 'venki', role: 'admin', email: 'vn28565@gmail.com', phoneNumber: '+1 (555) 0104', password: 'venki', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin5', name: 'Anoop', username: 'anoop', role: 'admin', email: 'mkanoop1984@gmail.com', phoneNumber: '+1 (555) 0105', password: 'anoop', status: 'active', failedLoginAttempts: 0, isLocked: false },
  // Store Users
  { id: 's1', name: 'Main St. Manager', username: 'main_st_user', role: 'store_user', assignedStore: 'Main St. Market', email: 'mainst@pods-retail.com', phoneNumber: '+1 (555) 0201', password: 'main_st_user', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 's2', name: 'Uptown Manager', username: 'uptown_user', role: 'store_user', assignedStore: 'Uptown Grocers', email: 'uptown@pods-retail.com', phoneNumber: '+1 (555) 0202', password: 'uptown_user', status: 'active', failedLoginAttempts: 0, isLocked: false },
  // Logistics Users
  { id: 'l1', name: 'Logistics Analyst 1', username: 'log1', role: 'logistics_user', email: 'log1@pods-logistics.com', phoneNumber: '+1 (555) 0301', password: 'log1', status: 'active', failedLoginAttempts: 0, isLocked: false },
];

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://pods_user:pods_password@localhost:5432/pods_db',
  });

  try {
    console.log('🌱 Seeding database...');

    // Clear existing data
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

      // Insert demand data
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

      // Insert route rates
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
