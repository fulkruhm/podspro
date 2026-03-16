import json
import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config import load_settings
from routes import register_routes


def create_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title=settings.service_name, version=settings.service_version)
    logger = logging.getLogger("pods.ml-service")

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_request_context(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid4())
        start = perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((perf_counter() - start) * 1000, 2)
            logger.exception(
                json.dumps(
                    {
                        "level": "error",
                        "event": "request.failed",
                        "requestId": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "durationMs": duration_ms,
                    }
                )
            )
            raise

        duration_ms = round((perf_counter() - start) * 1000, 2)
        response.headers["X-Request-Id"] = request_id
        logger.info(
            json.dumps(
                {
                    "level": "info",
                    "event": "request.completed",
                    "requestId": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "statusCode": response.status_code,
                    "durationMs": duration_ms,
                }
            )
        )
        return response

    register_routes(app, settings)
    return app
