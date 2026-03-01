import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pods_user:pods_password@localhost:5432/pods_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

// Wait for database to be ready
async function waitForDatabase(maxRetries = 30, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('✓ Database connection successful');
      return;
    } catch (error) {
      console.log(`Database connection attempt ${i + 1}/${maxRetries} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Failed to connect to database after 30 attempts');
}

// Initialize database connection on startup
waitForDatabase().catch(err => {
  console.error('Fatal: Could not connect to database:', err);
  process.exit(1);
});

export async function getProducts() {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(pd.historical_demand, ARRAY[]::INTEGER[]) as historical_demand,
        COALESCE(pd.forecasted_demand, ARRAY[]::INTEGER[]) as forecasted_demand
      FROM products p
      LEFT JOIN product_demand pd ON p.id = pd.product_id
      ORDER BY p.store, p.department
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function getProductById(id: string) {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(pd.historical_demand, ARRAY[]::INTEGER[]) as historical_demand,
        COALESCE(pd.forecasted_demand, ARRAY[]::INTEGER[]) as forecasted_demand
      FROM products p
      LEFT JOIN product_demand pd ON p.id = pd.product_id
      WHERE p.id = $1
    `, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

export async function getRoutes() {
  try {
    const result = await pool.query(`
      SELECT 
        fr.id,
        fr.origin,
        fr.destination,
        fr.current_rate,
        fr.trend,
        fr.capacity,
        fr.risk_level,
        json_agg(json_build_object('date', frr.rate_date, 'rate', frr.rate) ORDER BY frr.rate_date) as historical_rates
      FROM freight_routes fr
      LEFT JOIN freight_route_rates frr ON fr.id = frr.route_id
      GROUP BY fr.id, fr.origin, fr.destination, fr.current_rate, fr.trend, fr.capacity, fr.risk_level
      ORDER BY fr.origin, fr.destination
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
}

export async function getRouteById(id: string) {
  try {
    const result = await pool.query(`
      SELECT 
        fr.id,
        fr.origin,
        fr.destination,
        fr.current_rate,
        fr.trend,
        fr.capacity,
        fr.risk_level,
        json_agg(json_build_object('date', frr.rate_date, 'rate', frr.rate) ORDER BY frr.rate_date) as historical_rates
      FROM freight_routes fr
      LEFT JOIN freight_route_rates frr ON fr.id = frr.route_id
      WHERE fr.id = $1
      GROUP BY fr.id, fr.origin, fr.destination, fr.current_rate, fr.trend, fr.capacity, fr.risk_level
    `, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}

export async function updateProduct(id: string, data: any) {
  try {
    const { 
      current_stock, 
      avg_daily_demand, 
      status, 
      last_restock_date,
      historical_demand,
      forecasted_demand 
    } = data;

    // Update product
    await pool.query(`
      UPDATE products 
      SET current_stock = $1, avg_daily_demand = $2, status = $3, last_restock_date = $4, updated_at = NOW()
      WHERE id = $5
    `, [current_stock, avg_daily_demand, status, last_restock_date, id]);

    // Update demand data
    if (historical_demand || forecasted_demand) {
      await pool.query(`
        UPDATE product_demand 
        SET historical_demand = COALESCE($1, historical_demand),
            forecasted_demand = COALESCE($2, forecasted_demand),
            updated_at = NOW()
        WHERE product_id = $3
      `, [historical_demand, forecasted_demand, id]);
    }

    return getProductById(id);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

// User management functions
export async function getAllUsers() {
  try {
    const result = await pool.query(`
      SELECT * FROM users ORDER BY name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function getUserById(id: string) {
  try {
    const result = await pool.query(`
      SELECT * FROM users WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  try {
    const result = await pool.query(`
      SELECT * FROM users WHERE username = $1
    `, [username]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw error;
  }
}

export async function createUser(user: any) {
  try {
    const result = await pool.query(`
      INSERT INTO users (
        id, name, username, role, assigned_store, assigned_region,
        email, phone_number, password, status, failed_login_attempts, is_locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      user.id, user.name, user.username, user.role, user.assignedStore || null,
      user.assignedRegion || null, user.email, user.phoneNumber, user.password,
      user.status || 'active', user.failedLoginAttempts || 0, user.isLocked || false
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: string, updates: any) {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      username: 'username',
      role: 'role',
      assignedStore: 'assigned_store',
      assignedRegion: 'assigned_region',
      email: 'email',
      phoneNumber: 'phone_number',
      password: 'password',
      status: 'status',
      failedLoginAttempts: 'failed_login_attempts',
      isLocked: 'is_locked'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return getUserById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(id: string) {
  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function closePool() {
  await pool.end();
}
