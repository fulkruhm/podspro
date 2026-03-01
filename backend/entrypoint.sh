#!/bin/bash
set -e

echo "[entrypoint] Starting backend service..."

# Wait for database to be ready
echo "[entrypoint] Waiting for database to be ready..."
for i in {1..30}; do
  if node -e "import('pg').then(p => { const Pool = p.Pool; const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 }); pool.connect().then(() => { console.log('DB ready'); process.exit(0); }).catch(() => process.exit(1)); });" 2>/dev/null; then
    echo "[entrypoint] ✓ Database is ready"
    break
  fi
  echo "[entrypoint] Database not ready, attempt $i/30, waiting..."
  sleep 1
done

# Run seed script
echo "[entrypoint] Running database seed script..."
if NODE_OPTIONS='--loader ts-node/esm' node seed.ts; then
  echo "[entrypoint] ✓ Database seed completed successfully"
else
  echo "[entrypoint] ⚠ Database seed failed (might be already seeded)"
fi

# Start the backend server
echo "[entrypoint] Starting Node.js app..."
exec node dist/server.js
