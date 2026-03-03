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

-- Create historical demand table (store-product daily demand history)
CREATE TABLE IF NOT EXISTS product_demand_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id VARCHAR(255) NOT NULL,
  demand_date DATE NOT NULL,
  demand_qty INTEGER NOT NULL CHECK (demand_qty >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, store_id, demand_date)
);

-- Create demand feature table (store-product daily exogenous features)
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
);

-- Create forecast demand table (separate from historical demand)
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
);

-- Create ML batch job runs table (scheduler + manual triggers)
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
);

-- Create forecast review decisions table (admin analyst workflow)
CREATE TABLE IF NOT EXISTS forecast_review_decisions (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id VARCHAR(255) NOT NULL,
  decision_status VARCHAR(50) NOT NULL CHECK (decision_status IN ('accept_model', 'adjust_baseline', 'flag_data_issue', 'request_override')),
  baseline_adjustment_pct DECIMAL(6,2),
  notes TEXT,
  decided_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_product_demand_history_product_store_date
  ON product_demand_history(product_id, store_id, demand_date);
CREATE INDEX IF NOT EXISTS idx_product_demand_history_store_date
  ON product_demand_history(store_id, demand_date);

CREATE INDEX IF NOT EXISTS idx_product_demand_features_product_store_date
  ON product_demand_features(product_id, store_id, feature_date);
CREATE INDEX IF NOT EXISTS idx_product_demand_features_store_date
  ON product_demand_features(store_id, feature_date);

CREATE INDEX IF NOT EXISTS idx_product_demand_forecast_product_store_generated
  ON product_demand_forecast(product_id, store_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_demand_forecast_store_date
  ON product_demand_forecast(store_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_ml_batch_job_runs_job_type_started_at
  ON ml_batch_job_runs(job_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecast_review_decisions_product_store_created
  ON forecast_review_decisions(product_id, store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecast_review_decisions_status
  ON forecast_review_decisions(decision_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
