from datetime import datetime

from pydantic import BaseModel


class InventoryDatapoint(BaseModel):
    """Single inventory data point"""
    timestamp: datetime
    product_id: str
    store_id: str
    current_stock: int
    avg_daily_demand: float


class AnomalyDetectionRequest(BaseModel):
    """Request for anomaly detection analysis"""
    datapoints: list[InventoryDatapoint]
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
    historical_demand: list[float]
    historical_features: list[dict] | None = None
    future_features: list[dict] | None = None
    forecast_days: int = 7


class ForecastResult(BaseModel):
    """Demand forecast result"""
    product_id: str
    store_id: str
    forecast: list[float]
    confidence_interval: list[float]
    trend: str
    explainability: list[str]
    model_name: str

    model_config = {
        'protected_namespaces': (),
    }
