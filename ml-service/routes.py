from datetime import datetime
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException

from anomaly import AnomalyDetector
from config import AppSettings
from forecast import DemandForecaster
from schemas import (
    AnomalyDetectionRequest,
    AnomalyResult,
    ForecastRequest,
    ForecastResult,
)


def register_routes(app: FastAPI, settings: AppSettings) -> None:
    @app.get("/health")
    async def health_check():
        """Service health check endpoint"""
        return {
            "status": "healthy",
            "service": settings.service_name,
            "timestamp": datetime.utcnow().isoformat()
        }

    @app.get("/ready")
    async def readiness_check():
        """Service readiness endpoint"""
        return {
            "status": "ready",
            "service": settings.service_name,
            "timestamp": datetime.utcnow().isoformat()
        }

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

    @app.post("/api/ml/forecast", response_model=ForecastResult)
    async def forecast_demand(request: ForecastRequest):
        """
        Forecast demand for next N days using exponential smoothing

        Provides forecast with confidence intervals and trend analysis.
        """
        try:
            forecast, confidence, trend, explainability = DemandForecaster.forecast(
                request.historical_demand,
                request.historical_features,
                request.future_features,
                request.forecast_days,
            )

            return ForecastResult(
                product_id=request.product_id,
                store_id=request.store_id,
                forecast=forecast,
                confidence_interval=[
                    np.mean(confidence[0]),
                    np.mean(confidence[1])
                ],
                trend=trend,
                explainability=explainability,
                model_name="exponential_smoothing",
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Forecast failed: {str(e)}")

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
                    forecast_data, confidence, trend, explainability = DemandForecaster.forecast(
                        forecast_req.historical_demand,
                        forecast_req.historical_features,
                        forecast_req.future_features,
                        forecast_req.forecast_days,
                    )
                    results["forecasts"].append({
                        "product_id": forecast_req.product_id,
                        "store_id": forecast_req.store_id,
                        "forecast": forecast_data,
                        "confidence_interval": confidence,
                        "trend": trend,
                        "explainability": explainability,
                        "model_name": "exponential_smoothing",
                    })
                except Exception as e:
                    results["forecasts"].append({
                        "product_id": forecast_req.product_id,
                        "store_id": forecast_req.store_id,
                        "error": str(e)
                    })

        return results

    @app.get("/api/ml/info")
    async def service_info():
        """ML Service capabilities and versions"""
        return {
            "service": settings.service_name,
            "version": settings.service_version,
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
