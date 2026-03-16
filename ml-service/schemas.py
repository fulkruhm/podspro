from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional


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
    sensitivity: float = 0.05


class AnomalyResult(BaseModel):
    """Anomaly detection result"""
    product_id: str
    store_id: str
    is_anomaly: bool
    anomaly_score: float
    reason: str
    recommended_action: str


class ForecastRequest(BaseModel):
    """Request for demand forecasting"""
    product_id: str
    store_id: str
    historical_demand: List[float]
    historical_features: Optional[List[dict]] = None
    future_features: Optional[List[dict]] = None
    forecast_days: int = 7


class ForecastResult(BaseModel):
    """Demand forecast result"""
    product_id: str
    store_id: str
    forecast: List[float]
    confidence_interval: List[float]
    trend: str
    explainability: List[str]
    model_name: str

    model_config = {
        'protected_namespaces': (),
    }
