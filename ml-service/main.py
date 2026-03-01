"""
PODS ML Service - Anomaly Detection & Forecasting Microservice

Provides ML/AI capabilities for:
- Real-time inventory anomaly detection
- Demand forecasting
- Route optimization insights
- Statistical analysis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json

app = FastAPI(title="PODS ML Service", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Data Models
# ============================================================================

class InventoryDatapoint(BaseModel):
    """Single inventory data point"""
    timestamp: datetime
    product_id: str
    store_id: str
    current_stock: int
    avg_daily_demand: float


class AnomalyDetectionRequest(BaseModel):
    """Request for anomaly detection analysis"""
    datapoints: List[InventoryDatapoint]
    sensitivity: float = 0.05  # Percentage threshold (5%)


class AnomalyResult(BaseModel):
    """Anomaly detection result"""
    product_id: str
    store_id: str
    is_anomaly: bool
    anomaly_score: float  # 0-1, higher = more anomalous
    reason: str
    recommended_action: str


class ForecastRequest(BaseModel):
    """Request for demand forecasting"""
    product_id: str
    store_id: str
    historical_demand: List[float]  # Last 30-60 days
    forecast_days: int = 7


class ForecastResult(BaseModel):
    """Demand forecast result"""
    product_id: str
    store_id: str
    forecast: List[float]
    confidence_interval: List[float]  # [lower, upper] bounds
    trend: str


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Service health check endpoint"""
    return {
        "status": "healthy",
        "service": "PODS ML Service",
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Anomaly Detection
# ============================================================================

class AnomalyDetector:
    """Isolation Forest-based anomaly detection for inventory"""

    def __init__(self, contamination: float = 0.05):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()

    def detect(self, datapoints: List[InventoryDatapoint]) -> List[AnomalyResult]:
        """Detect anomalies in inventory data"""
        if not datapoints:
            return []

        # Group by product/store combination
        grouped = {}
        for dp in datapoints:
            key = (dp.product_id, dp.store_id)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(dp)

        results = []

        for (product_id, store_id), group in grouped.items():
            if len(group) < 3:
                # Not enough data for anomaly detection
                continue

            # Extract features
            stocks = np.array([dp.current_stock for dp in group]).reshape(-1, 1)
            demands = np.array([dp.avg_daily_demand for dp in group]).reshape(-1, 1)

            # Combine features
            features = np.concatenate([stocks, demands], axis=1)

            # Normalize
            features_scaled = self.scaler.fit_transform(features)

            # Detect anomalies
            predictions = self.model.fit_predict(features_scaled)
            scores = self.model.score_samples(features_scaled)

            # Get latest point anomaly status
            latest_idx = len(group) - 1
            is_anomaly = predictions[latest_idx] == -1
            anomaly_score = 1 / (1 + np.exp(-scores[latest_idx]))  # Sigmoid normalize

            # Generate reason and recommendation
            latest_dp = group[latest_idx]
            reason, action = self._explain_anomaly(
                latest_dp,
                group,
                is_anomaly,
                anomaly_score
            )

            results.append(AnomalyResult(
                product_id=product_id,
                store_id=store_id,
                is_anomaly=is_anomaly,
                anomaly_score=float(anomaly_score),
                reason=reason,
                recommended_action=action
            ))

        return results

    def _explain_anomaly(
        self,
        current: InventoryDatapoint,
        history: List[InventoryDatapoint],
        is_anomaly: bool,
        score: float
    ) -> tuple:
        """Generate human-readable explanations"""

        if not is_anomaly:
            return "Normal inventory levels", "Continue monitoring"

        # Analyze trends
        stocks = [dp.current_stock for dp in history[-7:]]
        demands = [dp.avg_daily_demand for dp in history[-7:]]

        avg_stock = np.mean(stocks)
        avg_demand = np.mean(demands)

        if current.current_stock < avg_stock * 0.5:
            reason = f"Stock level ({current.current_stock}) critically low (avg: {avg_stock:.0f})"
            action = "⚠️ Trigger emergency reorder"
        elif current.current_stock > avg_stock * 2.0:
            reason = f"Stock level ({current.current_stock}) unusually high (avg: {avg_stock:.0f})"
            action = "📦 Consider promotional campaign or redistribution"
        elif current.avg_daily_demand > avg_demand * 1.5:
            reason = f"Demand surge detected ({current.avg_daily_demand:.1f} vs avg {avg_demand:.1f})"
            action = "🚀 Increase replenishment frequency"
        else:
            reason = f"Unexpected pattern detected (anomaly score: {score:.2%})"
            action = "🔍 Review logistics and demand patterns"

        return reason, action


@app.post("/api/ml/anomalies/detect", response_model=List[AnomalyResult])
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    Detect anomalies in inventory data using Isolation Forest
    
    Returns list of anomalies with explanations and recommended actions.
    """
    try:
        detector = AnomalyDetector(contamination=request.sensitivity)
        results = detector.detect(request.datapoints)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


# ============================================================================
# Demand Forecasting
# ============================================================================

class DemandForecaster:
    """Simple exponential smoothing + trend analysis forecaster"""

    @staticmethod
    def forecast(
        historical_demand: List[float],
        forecast_days: int = 7,
        alpha: float = 0.3
    ) -> tuple:
        """
        Forecast future demand using exponential smoothing
        Returns: (forecast, confidence_interval, trend)
        """
        if len(historical_demand) < 3:
            raise ValueError("Need at least 3 historical data points")

        data = np.array(historical_demand, dtype=float)

        # Exponential smoothing
        forecast = [data[0]]
        for i in range(1, len(data)):
            smoothed = alpha * data[i] + (1 - alpha) * forecast[-1]
            forecast.append(smoothed)

        # Trend analysis
        x = np.arange(len(data))
        z = np.polyfit(x, data, 1)
        trend_slope = z[0]

        # Generate forecast
        last_value = forecast[-1]
        future_forecast = []
        for i in range(forecast_days):
            next_val = last_value + (trend_slope * (i + 1))
            future_forecast.append(max(0, next_val))
            last_value = next_val

        # Confidence interval (simplified)
        std_dev = np.std(data)
        confidence = [
            [max(0, f - 1.96 * std_dev) for f in future_forecast],
            [f + 1.96 * std_dev for f in future_forecast]
        ]

        # Trend direction
        if trend_slope > 0.5:
            trend = "📈 Increasing"
        elif trend_slope < -0.5:
            trend = "📉 Decreasing"
        else:
            trend = "➡️ Stable"

        return future_forecast, confidence, trend


@app.post("/api/ml/forecast", response_model=ForecastResult)
async def forecast_demand(request: ForecastRequest):
    """
    Forecast demand for next N days using exponential smoothing
    
    Provides forecast with confidence intervals and trend analysis.
    """
    try:
        forecast, confidence, trend = DemandForecaster.forecast(
            request.historical_demand,
            request.forecast_days
        )

        return ForecastResult(
            product_id=request.product_id,
            store_id=request.store_id,
            forecast=forecast,
            confidence_interval=[
                np.mean(confidence[0]),
                np.mean(confidence[1])
            ],
            trend=trend
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Forecast failed: {str(e)}")


# ============================================================================
# Batch Analysis
# ============================================================================

@app.post("/api/ml/batch-analysis")
async def batch_analysis(
    anomalies_request: Optional[AnomalyDetectionRequest] = None,
    forecasts: Optional[List[ForecastRequest]] = None
):
    """
    Run multiple analyses in batch (anomalies + forecasts)
    """
    results = {
        "anomalies": [],
        "forecasts": []
    }

    if anomalies_request:
        detector = AnomalyDetector(contamination=anomalies_request.sensitivity)
        results["anomalies"] = detector.detect(anomalies_request.datapoints)

    if forecasts:
        for forecast_req in forecasts:
            try:
                forecast_data, confidence, trend = DemandForecaster.forecast(
                    forecast_req.historical_demand,
                    forecast_req.forecast_days
                )
                results["forecasts"].append({
                    "product_id": forecast_req.product_id,
                    "store_id": forecast_req.store_id,
                    "forecast": forecast_data,
                    "confidence_interval": confidence,
                    "trend": trend
                })
            except Exception as e:
                results["forecasts"].append({
                    "product_id": forecast_req.product_id,
                    "store_id": forecast_req.store_id,
                    "error": str(e)
                })

    return results


# ============================================================================
# Ready for Future Expansion
# ============================================================================

@app.get("/api/ml/info")
async def service_info():
    """ML Service capabilities and versions"""
    return {
        "service": "PODS ML Service",
        "version": "1.0.0",
        "capabilities": [
            "Anomaly Detection (Isolation Forest)",
            "Demand Forecasting (Exponential Smoothing)",
            "Batch Analysis",
            "Ready for: TensorFlow, PyTorch, MLFlow integration"
        ],
        "libraries": {
            "scikit-learn": "Anomaly detection, preprocessing",
            "pandas": "Data manipulation",
            "numpy": "Numerical computing",
            "fastapi": "REST API framework"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
