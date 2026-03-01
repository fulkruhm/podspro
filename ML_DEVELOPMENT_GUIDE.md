# Python ML Service Development Guide

## Quick Start

### Local Development (Without Docker)

```bash
cd ml-service

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

**Access:** http://localhost:5000
**Docs:** http://localhost:5000/docs (Swagger UI)

### Running with Docker

```bash
cd /path/to/podspro

# Build and run entire stack
docker-compose up --build

# Or just the ML service
docker-compose up --build ml-service
```

---

## Project Structure

```
ml-service/
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container configuration
└── README.md                  # This file
```

---

## Available Endpoints (Development Mode)

### Interactive API Docs

**Swagger UI:** http://localhost:5000/docs  
**ReDoc:** http://localhost:5000/redoc

### Core Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/api/ml/info` | Service capabilities |
| POST | `/api/ml/anomalies/detect` | Detect anomalies |
| POST | `/api/ml/forecast` | Forecast demand |
| POST | `/api/ml/batch-analysis` | Run multiple analyses |

---

## Extending the ML Service

### Adding a New Endpoint

```python
from fastapi import APIRouter
from pydantic import BaseModel

class NewAnalysisRequest(BaseModel):
    data: List[float]
    
@app.post("/api/ml/new-analysis")
async def new_analysis(request: NewAnalysisRequest):
    """Your analysis here"""
    results = compute_something(request.data)
    return {"results": results}
```

### Adding ML Models

#### 1. Random Forest (Binary Classification)

```python
from sklearn.ensemble import RandomForestClassifier
import numpy as np

model = RandomForestClassifier(n_estimators=100)
X = np.array([[1, 2], [3, 4], [5, 6]])
y = np.array([0, 1, 0])
model.fit(X, y)
```

#### 2. TensorFlow Deep Learning

First, add to `requirements.txt`:
```
tensorflow==2.15.0
```

Then use in code:

```python
import tensorflow as tf
from tensorflow import keras

model = keras.Sequential([
    keras.layers.Dense(64, activation='relu', input_shape=(10,)),
    keras.layers.Dense(32, activation='relu'),
    keras.layers.Dense(1, activation='sigmoid')
])
model.compile(optimizer='adam', loss='binary_crossentropy')
```

#### 3. XGBoost Gradient Boosting

Add to `requirements.txt`:
```
xgboost==2.0.3
```

```python
import xgboost as xgb

dtrain = xgb.DMatrix(X, label=y)
params = {'max_depth': 5, 'learning_rate': 0.1}
model = xgb.train(params, dtrain, num_boost_round=100)
pred = model.predict(dtest)
```

---

## Best Practices

### 1. Data Validation

Always validate input before processing:

```python
from pydantic import BaseModel, validator

class InputData(BaseModel):
    values: List[float]
    
    @validator('values')
    def validate_values(cls, v):
        if len(v) < 3:
            raise ValueError('Need at least 3 data points')
        return v
```

### 2. Error Handling

Return meaningful errors:

```python
from fastapi import HTTPException

try:
    result = compute_analysis(data)
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    raise HTTPException(status_code=500, detail="Processing failed")
```

### 3. Logging

Add logging for debugging:

```python
import logging

logger = logging.getLogger(__name__)

@app.post("/api/ml/analyze")
async def analyze(data):
    logger.info(f"Processing {len(data)} records")
    try:
        result = process(data)
        logger.info("Analysis completed successfully")
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise
```

### 4. Performance Tips

- **Batch Processing:** Process multiple items at once to reduce overhead
- **Caching:** Cache model predictions when applicable
- **Async I/O:** Use async functions for database queries
- **Model Serialization:** Save trained models to disk, load on startup

```python
import joblib

# Save model
joblib.dump(model, 'models/my_model.pkl')

# Load model at startup
model = joblib.load('models/my_model.pkl')

@app.post("/api/ml/predict")
async def predict(data):
    predictions = model.predict(data)
    return predictions
```

---

## Testing

### Unit Tests

Create `test_main.py`:

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_anomaly_detection():
    response = client.post("/api/ml/anomalies/detect", json={
        "datapoints": [
            {
                "timestamp": "2026-03-01T10:00:00Z",
                "product_id": "P1",
                "store_id": "S1",
                "current_stock": 100,
                "avg_daily_demand": 20
            }
        ],
        "sensitivity": 0.05
    })
    assert response.status_code == 200
    assert "is_anomaly" in response.json()[0]
```

Run tests:

```bash
pip install pytest
pytest test_main.py -v
```

---

## Monitoring & Logging

### View Logs

```bash
# Docker
docker-compose logs ml-service
docker-compose logs ml-service -f  # Follow

# Local
uvicorn main:app --log-level debug
```

### Health Monitoring

```bash
# Check service health
curl http://localhost:5000/health

# From Node.js backend
curl http://localhost:3001/api/ml/health
```

---

## Database Connection

The ML service has access to PostgreSQL:

```python
import psycopg2
from psycopg2.extras import RealDictCursor
import os

DATABASE_URL = os.getenv('DATABASE_URL')

def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    return conn, cursor

# Usage
conn, cursor = get_db()
cursor.execute("SELECT * FROM products")
products = cursor.fetchall()
conn.close()
```

Or use SQLAlchemy:

```python
from sqlalchemy import create_engine

engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    result = conn.execute("SELECT * FROM products")
    products = result.fetchall()
```

---

## Deployment Checklist

- [ ] All endpoints documented in code
- [ ] Error handling for edge cases
- [ ] Performance tested with expected data volume
- [ ] Input validation on all endpoints
- [ ] Logging configured
- [ ] Health check returning correct status
- [ ] Requirements.txt updated with all dependencies
- [ ] Dockerfile builds successfully
- [ ] Docker Compose integrates service correctly
- [ ] API accessible from Node.js backend

---

## Future Enhancements

### Planned

1. **MLflow Integration** - Model versioning and experiment tracking
   ```bash
   pip install mlflow
   mlflow ui  # View experiments at http://localhost:5000
   ```

2. **Model Serving** - TensorFlow Serving for production models
   ```bash
   pip install tensorflow-serving-api
   ```

3. **Feature Store** - Feast for feature management
   ```bash
   pip install feast
   feast init my_feature_store
   ```

4. **Distributed Training** - Ray for parallel ML
   ```bash
   pip install ray
   ```

### Example: MLflow Integration

```python
import mlflow
from sklearn.ensemble import RandomForestClassifier

mlflow.set_experiment("anomaly_detection")

with mlflow.start_run():
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    mlflow.log_metric("accuracy", score)
    mlflow.log_param("n_estimators", 100)
    mlflow.sklearn.log_model(model, "model")
```

---

## Troubleshooting

### Issue: "Module not found"

**Solution:** Ensure virtual environment is activated and requirements installed:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: "Connection refused" (Docker)

**Solution:** Ensure services are running:

```bash
docker-compose ps
docker-compose logs ml-service
```

### Issue: Slow predictions

**Solution:** Profile and cache results:

```python
import time

@app.post("/api/ml/predict")
async def predict(data):
    start = time.time()
    result = model.predict(data)
    elapsed = time.time() - start
    logger.info(f"Prediction took {elapsed:.2f}s for {len(data)} items")
    return result
```

---

## Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **scikit-learn:** https://scikit-learn.org
- **Pandas:** https://pandas.pydata.org
- **NumPy:** https://numpy.org
- **TensorFlow:** https://www.tensorflow.org
- **Docker:** https://docs.docker.com

---

**Last Updated:** March 1, 2026  
**Python Version:** 3.11+
