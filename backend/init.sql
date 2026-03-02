-- Create Products table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  current_stock INTEGER NOT NULL,
  avg_daily_demand DECIMAL(10,2) NOT NULL,
  lead_time INTEGER NOT NULL,
  safety_stock INTEGER NOT NULL,
  reorder_point INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('optimal', 'low', 'excess', 'critical')),
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  region VARCHAR(100) NOT NULL,
  store VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  image_url VARCHAR(500),
  shrink_rate DECIMAL(5,2),
  markdown_rate DECIMAL(5,2),
  oos_days INTEGER,
  turnover_rate DECIMAL(10,2),
  last_restock_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create JSON storage for historical/forecasted demand (PostgreSQL array)
CREATE TABLE IF NOT EXISTS product_demand (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  historical_demand INTEGER[],
  forecasted_demand INTEGER[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Freight Routes table
CREATE TABLE IF NOT EXISTS freight_routes (
  id VARCHAR(255) PRIMARY KEY,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  current_rate DECIMAL(10,2) NOT NULL,
  trend VARCHAR(50) NOT NULL CHECK (trend IN ('up', 'down', 'stable')),
  capacity VARCHAR(50) NOT NULL CHECK (capacity IN ('loose', 'moderate', 'tight')),
  risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Freight Route History table
CREATE TABLE IF NOT EXISTS freight_route_rates (
  id SERIAL PRIMARY KEY,
  route_id VARCHAR(255) NOT NULL REFERENCES freight_routes(id) ON DELETE CASCADE,
  rate_date DATE NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Users table (for system users)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('sysadmin', 'admin', 'store_user', 'logistics_user')),
  assigned_store VARCHAR(255),
  assigned_region VARCHAR(100),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  password VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deactivated')),
  failed_login_attempts INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  details TEXT,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_region ON products(region);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store);
CREATE INDEX IF NOT EXISTS idx_products_department ON products(department);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_freight_routes_origin ON freight_routes(origin);
CREATE INDEX IF NOT EXISTS idx_freight_routes_destination ON freight_routes(destination);
CREATE INDEX IF NOT EXISTS idx_freight_routes_risk_level ON freight_routes(risk_level);
CREATE INDEX IF NOT EXISTS idx_freight_routes_capacity ON freight_routes(capacity);
CREATE INDEX IF NOT EXISTS idx_freight_routes_trend ON freight_routes(trend);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_demand_product_id_unique ON product_demand(product_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
