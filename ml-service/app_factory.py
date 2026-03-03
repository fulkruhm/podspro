from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import register_routes


def create_app() -> FastAPI:
    app = FastAPI(title="PODS ML Service", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_routes(app)
    return app
