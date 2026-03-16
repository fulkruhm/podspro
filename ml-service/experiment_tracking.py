from __future__ import annotations

import hashlib
from typing import Any

from config import AppSettings


def choose_ab_variant(settings: AppSettings, product_id: str, store_id: str) -> str:
    if not settings.forecast_ab_enabled:
        return "A"

    key = f"{product_id}:{store_id}".encode("utf-8")
    digest = hashlib.sha256(key).hexdigest()
    bucket = int(digest[:8], 16) / 0xFFFFFFFF
    return "B" if bucket < settings.forecast_ab_variant_b_ratio else "A"


def resolve_forecast_method(settings: AppSettings, requested_method: str | None, variant: str) -> str:
    base_method = (requested_method or settings.forecast_default_method).lower()
    if variant == "B" and settings.forecast_ab_enabled:
        return settings.forecast_variant_b_method
    return base_method


def try_log_forecast_run(
    settings: AppSettings,
    *,
    product_id: str,
    store_id: str,
    method: str,
    variant: str,
    forecast_days: int,
    historical_points: int,
    forecast: list[float],
) -> None:
    if not settings.mlflow_enabled:
        return

    try:
        import mlflow

        if settings.mlflow_tracking_uri:
            mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment_name)

        with mlflow.start_run(run_name=f"forecast-{method}-{variant}"):
            mlflow.log_param("product_id", product_id)
            mlflow.log_param("store_id", store_id)
            mlflow.log_param("method", method)
            mlflow.log_param("variant", variant)
            mlflow.log_param("forecast_days", forecast_days)
            mlflow.log_param("historical_points", historical_points)
            if forecast:
                mlflow.log_metric("forecast_mean", float(sum(forecast) / len(forecast)))
                mlflow.log_metric("forecast_min", float(min(forecast)))
                mlflow.log_metric("forecast_max", float(max(forecast)))
    except Exception:
        # Tracking should never break inference path.
        return
