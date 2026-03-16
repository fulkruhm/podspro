import pkg from 'pg';
import { randomUUID } from 'crypto';
import { loadAppConfig } from './config/env.js';
const { Pool } = pkg;

const appConfig = loadAppConfig();

const pool = new Pool({
  connectionString: appConfig.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export type BatchJobStatus = 'running' | 'success' | 'failed' | 'partial_success';

let databaseInitialized = false;

const BATCH_RUN_STALE_MINUTES = appConfig.batchRunStaleMinutes;

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

async function ensureBatchJobTables() {
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

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_ml_batch_job_runs_job_type_started_at ON ml_batch_job_runs(job_type, started_at DESC)'
  );
}

async function ensureForecastExplainabilityColumn() {
  await pool.query(`
    ALTER TABLE IF EXISTS product_demand_forecast
    ADD COLUMN IF NOT EXISTS explainability_text TEXT
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS product_demand_forecast
    ADD COLUMN IF NOT EXISTS model_variant VARCHAR(32)
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS product_demand_forecast
    ADD COLUMN IF NOT EXISTS model_version VARCHAR(64)
  `);
}

async function ensureDemandFeatureTable() {
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

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_product_demand_features_product_store_date ON product_demand_features(product_id, store_id, feature_date)'
  );
}

async function ensureForecastReviewDecisionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forecast_review_decisions (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      store_id VARCHAR(255) NOT NULL,
      decision_status VARCHAR(50) NOT NULL CHECK (decision_status IN ('accept_model', 'adjust_baseline', 'flag_data_issue', 'request_override')),
      baseline_adjustment_pct DECIMAL(6,2),
      notes TEXT,
      decided_by VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_forecast_review_decisions_product_store_created ON forecast_review_decisions(product_id, store_id, created_at DESC)'
  );
}

async function ensureAuthTokenTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      token_id UUID PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      replaced_by_token_id UUID
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id ON auth_refresh_tokens(user_id, created_at DESC)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_revoked_access_tokens (
      token_id UUID PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_auth_revoked_access_tokens_expires ON auth_revoked_access_tokens(expires_at)'
  );
}

async function ensureAuditLogTable() {
  await pool.query(`
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
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)'
  );

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)'
  );
}

// Initialize database connection on startup
async function initializeDatabase() {
  try {
    await waitForDatabase();
    await ensureBatchJobTables();
    await ensureForecastExplainabilityColumn();
    await ensureDemandFeatureTable();
    await ensureForecastReviewDecisionTable();
    await ensureAuthTokenTables();
    await ensureAuditLogTable();
    databaseInitialized = true;
  } catch (err) {
    databaseInitialized = false;
    console.error('Fatal: Could not initialize database:', err);
    process.exit(1);
  }
}

initializeDatabase();

export async function checkDatabaseReadiness() {
  if (!databaseInitialized) {
    return false;
  }

  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function createBatchJobRun(jobType: string, triggeredBy?: string) {
  const result = await pool.query(`
    INSERT INTO ml_batch_job_runs (job_type, status, triggered_by, started_at)
    VALUES ($1, 'running', $2, NOW())
    RETURNING *
  `, [jobType, triggeredBy ?? null]);

  return result.rows[0];
}

export async function completeBatchJobRun(
  id: number,
  status: Exclude<BatchJobStatus, 'running'>,
  summary: {
    totalItems: number;
    succeededItems: number;
    failedItems: number;
    errorSummary?: string;
    details?: unknown;
  }
) {
  const result = await pool.query(`
    UPDATE ml_batch_job_runs
    SET
      status = $1,
      ended_at = NOW(),
      total_items = $2,
      succeeded_items = $3,
      failed_items = $4,
      error_summary = $5,
      details = $6
    WHERE id = $7
    RETURNING *
  `, [
    status,
    summary.totalItems,
    summary.succeededItems,
    summary.failedItems,
    summary.errorSummary ?? null,
    summary.details ? JSON.stringify(summary.details) : null,
    id,
  ]);

  return result.rows[0];
}

export async function failBatchJobRun(id: number, errorSummary: string) {
  const result = await pool.query(`
    UPDATE ml_batch_job_runs
    SET
      status = 'failed',
      ended_at = NOW(),
      error_summary = $1
    WHERE id = $2
    RETURNING *
  `, [errorSummary, id]);

  return result.rows[0];
}

export async function getLatestBatchJobRun(jobType: string) {
  await pool.query(`
    UPDATE ml_batch_job_runs
    SET
      status = 'failed',
      ended_at = COALESCE(ended_at, NOW()),
      error_summary = COALESCE(error_summary, 'Marked failed after exceeding stale running timeout')
    WHERE job_type = $1
      AND status = 'running'
      AND started_at < NOW() - ($2::text || ' minutes')::interval
  `, [jobType, BATCH_RUN_STALE_MINUTES]);

  const result = await pool.query(`
    SELECT *
    FROM ml_batch_job_runs
    WHERE job_type = $1
    ORDER BY started_at DESC
    LIMIT 1
  `, [jobType]);

  return result.rows[0] ?? null;
}

export async function getForecastReviewItems(limit = 50) {
  try {
    const result = await pool.query(`
      WITH history AS (
        SELECT
          h.product_id,
          h.store_id,
          AVG(h.demand_qty)::DECIMAL(10,2) AS history_avg,
          STDDEV_POP(h.demand_qty)::DECIMAL(10,2) AS history_std
        FROM product_demand_history h
        WHERE h.demand_date >= CURRENT_DATE - INTERVAL '14 day'
        GROUP BY h.product_id, h.store_id
      ),
      latest_run AS (
        SELECT product_id, store_id, MAX(generated_at) AS generated_at
        FROM product_demand_forecast
        GROUP BY product_id, store_id
      ),
      forecast AS (
        SELECT
          f.product_id,
          f.store_id,
          AVG(f.forecast_qty)::DECIMAL(10,2) AS forecast_avg,
          STDDEV_POP(f.forecast_qty)::DECIMAL(10,2) AS forecast_std,
          AVG(COALESCE(f.confidence_upper, f.forecast_qty) - COALESCE(f.confidence_lower, f.forecast_qty))::DECIMAL(10,2) AS confidence_spread_avg
        FROM product_demand_forecast f
        INNER JOIN latest_run lr
          ON lr.product_id = f.product_id
          AND lr.store_id = f.store_id
          AND lr.generated_at = f.generated_at
        GROUP BY f.product_id, f.store_id
      ),
      latest_decision AS (
        SELECT *
        FROM (
          SELECT
            d.*,
            ROW_NUMBER() OVER (PARTITION BY d.product_id, d.store_id ORDER BY d.created_at DESC) AS rn
          FROM forecast_review_decisions d
        ) ranked
        WHERE ranked.rn = 1
      )
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.store AS store_id,
        p.region,
        p.department,
        COALESCE(history.history_avg, 0)::DECIMAL(10,2) AS history_avg,
        COALESCE(forecast.forecast_avg, 0)::DECIMAL(10,2) AS forecast_avg,
        COALESCE(history.history_std, 0)::DECIMAL(10,2) AS history_std,
        COALESCE(forecast.forecast_std, 0)::DECIMAL(10,2) AS forecast_std,
        COALESCE(forecast.confidence_spread_avg, 0)::DECIMAL(10,2) AS confidence_spread_avg,
        CASE
          WHEN COALESCE(history.history_avg, 0) > 0
            THEN ROUND(((COALESCE(forecast.forecast_avg, 0) - history.history_avg) / history.history_avg) * 100, 2)
          ELSE 0
        END AS bias_pct,
        ROUND(
          ABS(
            CASE
              WHEN COALESCE(history.history_avg, 0) > 0
                THEN ((COALESCE(forecast.forecast_avg, 0) - history.history_avg) / history.history_avg) * 100
              ELSE 0
            END
          )
          + LEAST(
              100,
              CASE
                WHEN COALESCE(history.history_std, 0) > 0
                  THEN ABS((COALESCE(forecast.forecast_std, 0) - history.history_std) / history.history_std) * 30
                ELSE ABS(COALESCE(forecast.forecast_std, 0))
              END
            )
          + LEAST(50, COALESCE(forecast.confidence_spread_avg, 0)),
          2
        ) AS anomaly_score,
        CASE
          WHEN ABS(
            CASE
              WHEN COALESCE(history.history_avg, 0) > 0
                THEN ((COALESCE(forecast.forecast_avg, 0) - history.history_avg) / history.history_avg) * 100
              ELSE 0
            END
          ) > 10 THEN 'adjust_baseline'
          ELSE 'accept_model'
        END AS recommended_action,
        CASE
          WHEN latest_decision.decision_status IS NOT NULL
            AND latest_decision.created_at >= lr_current.generated_at
            THEN latest_decision.decision_status
          WHEN ABS(
            CASE
              WHEN COALESCE(history.history_avg, 0) > 0
                THEN ((COALESCE(forecast.forecast_avg, 0) - history.history_avg) / history.history_avg) * 100
              ELSE 0
            END
          ) <= 10 THEN 'accept_model'
          ELSE NULL
        END AS latest_decision_status,
        CASE
          WHEN latest_decision.created_at >= lr_current.generated_at
            THEN latest_decision.baseline_adjustment_pct
          ELSE NULL
        END AS latest_baseline_adjustment_pct,
        CASE
          WHEN latest_decision.created_at >= lr_current.generated_at
            THEN latest_decision.notes
          ELSE NULL
        END AS latest_notes,
        CASE
          WHEN latest_decision.created_at >= lr_current.generated_at
            THEN latest_decision.decided_by
          ELSE NULL
        END AS latest_decided_by,
        CASE
          WHEN latest_decision.created_at >= lr_current.generated_at
            THEN latest_decision.created_at
          ELSE NULL
        END AS latest_decision_at
      FROM products p
      LEFT JOIN history ON history.product_id = p.id AND history.store_id = p.store
      LEFT JOIN forecast ON forecast.product_id = p.id AND forecast.store_id = p.store
      LEFT JOIN latest_run lr_current ON lr_current.product_id = p.id AND lr_current.store_id = p.store
      LEFT JOIN latest_decision ON latest_decision.product_id = p.id AND latest_decision.store_id = p.store
      WHERE history.product_id IS NOT NULL AND forecast.product_id IS NOT NULL
      ORDER BY anomaly_score DESC, p.store, p.id
      LIMIT $1
    `, [limit]);

    return result.rows;
  } catch (error) {
    console.error('Error fetching forecast review items:', error);
    throw error;
  }
}

export async function createForecastReviewDecision(input: {
  productId: string;
  storeId: string;
  decisionStatus: 'accept_model' | 'adjust_baseline' | 'flag_data_issue' | 'request_override';
  baselineAdjustmentPct?: number | null;
  notes?: string;
  decidedBy?: string;
}) {
  try {
    const result = await pool.query(`
      INSERT INTO forecast_review_decisions (
        product_id,
        store_id,
        decision_status,
        baseline_adjustment_pct,
        notes,
        decided_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [
      input.productId,
      input.storeId,
      input.decisionStatus,
      input.baselineAdjustmentPct ?? null,
      input.notes ?? null,
      input.decidedBy ?? null,
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating forecast review decision:', error);
    throw error;
  }
}

export async function getProducts() {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(dh.historical_demand, ARRAY[]::INTEGER[]) as historical_demand,
        COALESCE(df.forecasted_demand, ARRAY[]::INTEGER[]) as forecasted_demand,
        COALESCE(df.forecast_explainability, ARRAY[]::TEXT[]) as forecast_explainability
      FROM products p
      LEFT JOIN LATERAL (
        SELECT array_agg(h.demand_qty ORDER BY h.demand_date) AS historical_demand
        FROM product_demand_history h
        WHERE h.product_id = p.id AND h.store_id = p.store
      ) dh ON true
      LEFT JOIN LATERAL (
        SELECT
          array_agg(ROUND(f.forecast_qty)::INTEGER ORDER BY f.forecast_date) AS forecasted_demand,
          array_agg(COALESCE(f.explainability_text, '') ORDER BY f.forecast_date) AS forecast_explainability
        FROM product_demand_forecast f
        WHERE f.product_id = p.id
          AND f.store_id = p.store
          AND f.generated_at = (
            SELECT MAX(f2.generated_at)
            FROM product_demand_forecast f2
            WHERE f2.product_id = p.id AND f2.store_id = p.store
          )
      ) df ON true
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
        COALESCE(dh.historical_demand, ARRAY[]::INTEGER[]) as historical_demand,
        COALESCE(df.forecasted_demand, ARRAY[]::INTEGER[]) as forecasted_demand,
        COALESCE(df.forecast_explainability, ARRAY[]::TEXT[]) as forecast_explainability
      FROM products p
      LEFT JOIN LATERAL (
        SELECT array_agg(h.demand_qty ORDER BY h.demand_date) AS historical_demand
        FROM product_demand_history h
        WHERE h.product_id = p.id AND h.store_id = p.store
      ) dh ON true
      LEFT JOIN LATERAL (
        SELECT
          array_agg(ROUND(f.forecast_qty)::INTEGER ORDER BY f.forecast_date) AS forecasted_demand,
          array_agg(COALESCE(f.explainability_text, '') ORDER BY f.forecast_date) AS forecast_explainability
        FROM product_demand_forecast f
        WHERE f.product_id = p.id
          AND f.store_id = p.store
          AND f.generated_at = (
            SELECT MAX(f2.generated_at)
            FROM product_demand_forecast f2
            WHERE f2.product_id = p.id AND f2.store_id = p.store
          )
      ) df ON true
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { 
      current_stock, 
      avg_daily_demand, 
      status, 
      last_restock_date,
      historical_demand,
      forecasted_demand 
    } = data;

    // Update product
    await client.query(`
      UPDATE products 
      SET current_stock = $1, avg_daily_demand = $2, status = $3, last_restock_date = $4, updated_at = NOW()
      WHERE id = $5
    `, [current_stock, avg_daily_demand, status, last_restock_date, id]);

    const productResult = await client.query(`
      SELECT id, store
      FROM products
      WHERE id = $1
    `, [id]);

    const product = productResult.rows[0];

    if (product && Array.isArray(historical_demand)) {
      await client.query(
        'DELETE FROM product_demand_history WHERE product_id = $1 AND store_id = $2',
        [id, product.store]
      );

      for (let index = 0; index < historical_demand.length; index++) {
        const demandQty = historical_demand[index];
        const daysAgo = historical_demand.length - index - 1;

        await client.query(`
          INSERT INTO product_demand_history (product_id, store_id, demand_date, demand_qty)
          VALUES (
            $1,
            $2,
            CURRENT_DATE - ($3 * INTERVAL '1 day'),
            $4
          )
        `, [id, product.store, daysAgo, demandQty]);
      }
    }

    if (product && Array.isArray(forecasted_demand)) {
      await client.query(
        'DELETE FROM product_demand_forecast WHERE product_id = $1 AND store_id = $2',
        [id, product.store]
      );

      for (let index = 0; index < forecasted_demand.length; index++) {
        const forecastQty = forecasted_demand[index];

        await client.query(`
          INSERT INTO product_demand_forecast (
            product_id,
            store_id,
            forecast_date,
            forecast_qty,
            generated_at,
            explainability_text
          )
          VALUES (
            $1,
            $2,
            CURRENT_DATE + (($3 + 1) * INTERVAL '1 day'),
            $4,
            NOW(),
            $5
          )
        `, [
          id,
          product.store,
          index,
          forecastQty,
          'Manually updated forecast value.',
        ]);
      }
    }

    await client.query('COMMIT');
    return getProductById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating product:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getStoreProductForecastInputs(
  historyDays = 56,
  minHistoryPoints = 14,
  forecastDays = 14,
  filters?: {
    region?: string;
    store?: string;
    department?: string;
    product?: string;
    status?: string;
  }
) {
  try {
    const whereClauses: string[] = ['COALESCE(array_length(history.historical_demand, 1), 0) >= $2'];
    const params: any[] = [historyDays, minHistoryPoints, forecastDays];

    const appendFilter = (value: string | undefined, clauseBuilder: (placeholder: string) => string) => {
      if (!value || !value.trim()) {
        return;
      }

      const normalized = value.trim();
      params.push(normalized);
      const placeholder = `$${params.length}`;
      whereClauses.push(clauseBuilder(placeholder));
    };

    appendFilter(filters?.region, (ph) => `p.region = ${ph}`);
    appendFilter(filters?.store, (ph) => `p.store = ${ph}`);
    appendFilter(filters?.department, (ph) => `p.department = ${ph}`);
    appendFilter(filters?.product, (ph) => `p.id = ${ph}`);
    appendFilter(filters?.status, (ph) => `LOWER(p.status) = LOWER(${ph})`);

    const result = await pool.query(`
      WITH history AS (
        SELECT
          h.product_id,
          h.store_id,
          array_agg(h.demand_qty ORDER BY h.demand_date) AS historical_demand,
          array_agg(
            json_build_object(
              'feature_date', h.demand_date,
              'promo_flag', COALESCE(df.promo_flag, FALSE),
              'holiday_flag', COALESCE(df.holiday_flag, FALSE),
              'weather_index', COALESCE(df.weather_index, 1.0)
            )
            ORDER BY h.demand_date
          ) AS historical_features
        FROM product_demand_history h
        LEFT JOIN product_demand_features df
          ON df.product_id = h.product_id
          AND df.store_id = h.store_id
          AND df.feature_date = h.demand_date
        WHERE h.demand_date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
        GROUP BY h.product_id, h.store_id
      ),
      future_features AS (
        SELECT
          p.id AS product_id,
          p.store AS store_id,
          array_agg(
            json_build_object(
              'feature_date', future_dates.forecast_date,
              'promo_flag', COALESCE(df.promo_flag, FALSE),
              'holiday_flag', COALESCE(df.holiday_flag, FALSE),
              'weather_index', COALESCE(df.weather_index, 1.0)
            )
            ORDER BY future_dates.forecast_date
          ) AS future_features
        FROM products p
        JOIN LATERAL (
          SELECT (CURRENT_DATE + (day_offset * INTERVAL '1 day'))::DATE AS forecast_date
          FROM generate_series(1, $3) AS day_offset
        ) future_dates ON true
        LEFT JOIN product_demand_features df
          ON df.product_id = p.id
          AND df.store_id = p.store
          AND df.feature_date = future_dates.forecast_date
        GROUP BY p.id, p.store
      )
      SELECT
        p.id AS product_id,
        p.store AS store_id,
        COALESCE(history.historical_demand, ARRAY[]::INTEGER[]) AS historical_demand,
        COALESCE(history.historical_features, ARRAY[]::JSON[]) AS historical_features,
        COALESCE(future_features.future_features, ARRAY[]::JSON[]) AS future_features
      FROM products p
      LEFT JOIN history
        ON history.product_id = p.id
        AND history.store_id = p.store
      LEFT JOIN future_features
        ON future_features.product_id = p.id
        AND future_features.store_id = p.store
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.store, p.id
    `, params);

    return result.rows;
  } catch (error) {
    console.error('Error fetching store-product forecast inputs:', error);
    throw error;
  }
}

export async function saveStoreProductForecast(
  productId: string,
  storeId: string,
  forecast: number[],
  confidenceInterval?: [number, number],
  trend?: string,
  modelName = 'exponential_smoothing',
  modelVariant?: string,
  modelVersion?: string,
  historicalDemand?: number[],
  explainabilityByDay?: string[]
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM product_demand_forecast WHERE product_id = $1 AND store_id = $2',
      [productId, storeId]
    );

    const baselineWindow = (historicalDemand || []).slice(-7);
    const baselineAvg = baselineWindow.length
      ? baselineWindow.reduce((sum, value) => sum + value, 0) / baselineWindow.length
      : null;

    for (let index = 0; index < forecast.length; index++) {
      const pointForecast = forecast[index];
      const variancePercent = baselineAvg && baselineAvg > 0
        ? Math.round(((pointForecast - baselineAvg) / baselineAvg) * 100)
        : null;

      const generatedExplainability = `D+${index + 1}: ${trend || 'stable'} trend${variancePercent === null ? '' : `, ${variancePercent >= 0 ? '+' : ''}${variancePercent}% vs last-7-day baseline`}${confidenceInterval ? `, confidence ${Math.round(confidenceInterval[0])}-${Math.round(confidenceInterval[1])}` : ''}.`;

      const explainabilityText = explainabilityByDay?.[index] || generatedExplainability;

      await client.query(`
        INSERT INTO product_demand_forecast (
          product_id,
          store_id,
          forecast_date,
          forecast_qty,
          confidence_lower,
          confidence_upper,
          trend,
          explainability_text,
          model_name,
          model_variant,
          model_version,
          generated_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_DATE + (($3 + 1) * INTERVAL '1 day'),
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          NOW()
        )
      `, [
        productId,
        storeId,
        index,
        pointForecast,
        confidenceInterval?.[0] ?? null,
        confidenceInterval?.[1] ?? null,
        trend ?? null,
        explainabilityText,
        modelName,
        modelVariant ?? null,
        modelVersion ?? null,
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving store-product forecast:', error);
    throw error;
  }
  finally {
    client.release();
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

export async function storeRefreshToken(input: {
  tokenId: string;
  userId: string;
  username: string;
  expiresAtIso: string;
}) {
  await pool.query(
    `
      INSERT INTO auth_refresh_tokens (token_id, user_id, username, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [input.tokenId, input.userId, input.username, input.expiresAtIso]
  );
}

export async function getRefreshTokenRecord(tokenId: string) {
  const result = await pool.query(
    `
      SELECT *
      FROM auth_refresh_tokens
      WHERE token_id = $1
      LIMIT 1
    `,
    [tokenId]
  );
  return result.rows[0] ?? null;
}

export async function revokeRefreshToken(tokenId: string, replacedByTokenId?: string) {
  await pool.query(
    `
      UPDATE auth_refresh_tokens
      SET revoked_at = COALESCE(revoked_at, NOW()), replaced_by_token_id = COALESCE($2, replaced_by_token_id)
      WHERE token_id = $1
    `,
    [tokenId, replacedByTokenId ?? null]
  );
}

export async function revokeAccessToken(input: { tokenId: string; userId: string; expiresAtIso: string }) {
  await pool.query(
    `
      INSERT INTO auth_revoked_access_tokens (token_id, user_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token_id) DO NOTHING
    `,
    [input.tokenId, input.userId, input.expiresAtIso]
  );
}

export async function isAccessTokenRevoked(tokenId: string) {
  const result = await pool.query(
    `
      SELECT 1
      FROM auth_revoked_access_tokens
      WHERE token_id = $1
      LIMIT 1
    `,
    [tokenId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function cleanupExpiredAuthTokens() {
  await pool.query('DELETE FROM auth_revoked_access_tokens WHERE expires_at < NOW()');
  await pool.query('DELETE FROM auth_refresh_tokens WHERE expires_at < NOW()');
}

export async function closePool() {
  await pool.end();
}

export interface ForecastAbMetricsRecord {
  model_name: string;
  model_variant: string;
  model_version: string | null;
  compared_points: number;
  mae: number;
  rmse: number;
  mape_pct: number;
  avg_forecast: number;
  avg_actual: number;
}

export async function getForecastAbPerformanceMetrics(days = 30): Promise<ForecastAbMetricsRecord[]> {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(180, Math.floor(days))) : 30;

  const result = await pool.query(
    `
      WITH joined AS (
        SELECT
          COALESCE(NULLIF(TRIM(f.model_name), ''), 'unknown') AS model_name,
          COALESCE(NULLIF(TRIM(f.model_variant), ''), 'A') AS model_variant,
          NULLIF(TRIM(f.model_version), '') AS model_version,
          f.forecast_qty::DECIMAL(12,4) AS forecast_qty,
          h.demand_qty::DECIMAL(12,4) AS actual_qty
        FROM product_demand_forecast f
        INNER JOIN product_demand_history h
          ON h.product_id = f.product_id
          AND h.store_id = f.store_id
          AND h.demand_date = f.forecast_date
        WHERE f.forecast_date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
          AND f.forecast_date <= CURRENT_DATE
      )
      SELECT
        model_name,
        model_variant,
        model_version,
        COUNT(*)::INT AS compared_points,
        ROUND(AVG(ABS(forecast_qty - actual_qty))::NUMERIC, 4) AS mae,
        ROUND(SQRT(AVG(POWER((forecast_qty - actual_qty), 2)))::NUMERIC, 4) AS rmse,
        ROUND(
          AVG(
            CASE
              WHEN actual_qty > 0 THEN ABS((forecast_qty - actual_qty) / actual_qty) * 100
              ELSE NULL
            END
          )::NUMERIC,
          4
        ) AS mape_pct,
        ROUND(AVG(forecast_qty)::NUMERIC, 4) AS avg_forecast,
        ROUND(AVG(actual_qty)::NUMERIC, 4) AS avg_actual
      FROM joined
      GROUP BY model_name, model_variant, model_version
      ORDER BY model_variant ASC, mae ASC
    `,
    [safeDays]
  );

  return result.rows as ForecastAbMetricsRecord[];
}

export type AuditLogCategory = 'security' | 'provisioning' | 'system' | 'auth';
export type AuditLogSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogRecord {
  id: string;
  timestamp: number;
  user_id: string | null;
  user_name: string | null;
  action: string;
  details: string | null;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
}

export async function createAuditLog(input: {
  userId?: string | null;
  userName?: string | null;
  action: string;
  details?: string | null;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
}) {
  const id = `audit_${randomUUID()}`;
  const timestamp = Date.now();

  const result = await pool.query(
    `
      INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, details, category, severity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, timestamp, user_id, user_name, action, details, category, severity
    `,
    [
      id,
      timestamp,
      input.userId ?? null,
      input.userName ?? null,
      input.action,
      input.details ?? null,
      input.category,
      input.severity,
    ]
  );

  return result.rows[0] as AuditLogRecord;
}

export async function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  category?: AuditLogCategory;
  severity?: AuditLogSeverity;
  userId?: string;
}) {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(1000, Math.floor(options.limit!))) : 200;
  const offset = Number.isFinite(options.offset) ? Math.max(0, Math.floor(options.offset!)) : 0;

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (options.category) {
    params.push(options.category);
    whereClauses.push(`category = $${params.length}`);
  }

  if (options.severity) {
    params.push(options.severity);
    whereClauses.push(`severity = $${params.length}`);
  }

  if (options.userId) {
    params.push(options.userId);
    whereClauses.push(`user_id = $${params.length}`);
  }

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const result = await pool.query(
    `
      SELECT id, timestamp, user_id, user_name, action, details, category, severity
      FROM audit_logs
      ${whereSql}
      ORDER BY timestamp DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    params
  );

  return result.rows as AuditLogRecord[];
}
