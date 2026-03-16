import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppSettings:
    service_name: str
    service_version: str
    app_host: str
    app_port: int
    cors_allow_origins: list[str]
    forecast_default_method: str
    forecast_ab_enabled: bool
    forecast_ab_variant_b_ratio: float
    forecast_variant_b_method: str
    mlflow_enabled: bool
    mlflow_tracking_uri: str | None
    mlflow_experiment_name: str


def _parse_allowed_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return ["http://localhost:3000", "http://localhost:5173"]

    values = [item.strip() for item in raw_value.split(",") if item.strip()]
    if not values:
        raise ValueError("CORS_ALLOW_ORIGINS is set but contains no valid origins")

    if "*" in values:
        return ["*"]

    for origin in values:
        if not origin.startswith(("http://", "https://")):
            raise ValueError("CORS_ALLOW_ORIGINS must contain http:// or https:// URLs")

    return values


def _parse_port(raw_value: str | None) -> int:
    if not raw_value:
        return 5000

    parsed = int(raw_value)
    if parsed < 1 or parsed > 65535:
        raise ValueError("ML_SERVICE_PORT must be between 1 and 65535")
    return parsed


def _parse_bool(raw_value: str | None, fallback: bool) -> bool:
    if raw_value is None:
      return fallback
    value = raw_value.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ValueError("Boolean setting must be one of true/false/1/0/yes/no/on/off")


def _parse_method(raw_value: str | None, fallback: str, env_name: str) -> str:
    value = (raw_value or fallback).strip().lower()
    allowed = {"auto", "exponential_smoothing", "arima", "prophet"}
    if value not in allowed:
        raise ValueError(f"{env_name} must be one of: {', '.join(sorted(allowed))}")
    return value


def _parse_ratio(raw_value: str | None, fallback: float) -> float:
    if raw_value is None:
        return fallback
    parsed = float(raw_value)
    if parsed < 0.0 or parsed > 1.0:
        raise ValueError("FORECAST_AB_VARIANT_B_RATIO must be between 0.0 and 1.0")
    return parsed


def load_settings() -> AppSettings:
    return AppSettings(
        service_name=os.getenv("ML_SERVICE_NAME", "PODS ML Service"),
        service_version=os.getenv("ML_SERVICE_VERSION", "1.0.0"),
        app_host=os.getenv("ML_SERVICE_HOST", "0.0.0.0"),
        app_port=_parse_port(os.getenv("ML_SERVICE_PORT")),
        cors_allow_origins=_parse_allowed_origins(os.getenv("CORS_ALLOW_ORIGINS")),
        forecast_default_method=_parse_method(os.getenv("FORECAST_DEFAULT_METHOD"), "auto", "FORECAST_DEFAULT_METHOD"),
        forecast_ab_enabled=_parse_bool(os.getenv("FORECAST_AB_TESTING_ENABLED"), False),
        forecast_ab_variant_b_ratio=_parse_ratio(os.getenv("FORECAST_AB_VARIANT_B_RATIO"), 0.3),
        forecast_variant_b_method=_parse_method(os.getenv("FORECAST_VARIANT_B_METHOD"), "arima", "FORECAST_VARIANT_B_METHOD"),
        mlflow_enabled=_parse_bool(os.getenv("MLFLOW_ENABLED"), False),
        mlflow_tracking_uri=os.getenv("MLFLOW_TRACKING_URI"),
        mlflow_experiment_name=os.getenv("MLFLOW_EXPERIMENT_NAME", "pods-forecasting"),
    )
