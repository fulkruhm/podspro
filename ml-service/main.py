"""PODS ML Service bootstrap."""

from app_factory import create_app
from config import load_settings

app = create_app()
settings = load_settings()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.app_host, port=settings.app_port)
