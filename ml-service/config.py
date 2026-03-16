import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppSettings:
    service_name: str
    service_version: str
    app_host: str
    app_port: int
    cors_allow_origins: list[str]


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


def load_settings() -> AppSettings:
    return AppSettings(
        service_name=os.getenv("ML_SERVICE_NAME", "PODS ML Service"),
        service_version=os.getenv("ML_SERVICE_VERSION", "1.0.0"),
        app_host=os.getenv("ML_SERVICE_HOST", "0.0.0.0"),
        app_port=_parse_port(os.getenv("ML_SERVICE_PORT")),
        cors_allow_origins=_parse_allowed_origins(os.getenv("CORS_ALLOW_ORIGINS")),
    )
