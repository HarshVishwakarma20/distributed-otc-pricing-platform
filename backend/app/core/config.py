import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "DerivaQuant API"
    app_version: str = "0.2.0"
    api_prefix: str = "/api/v1"
    debug: bool = os.getenv("DERIVAQUANT_DEBUG", "false").lower() in ("true", "1", "yes")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    random_seed: int = int(os.getenv("DERIVAQUANT_SEED", "42"))
    is_demo_mode: bool = os.getenv("DERIVAQUANT_DEMO_MODE", "false").lower() in ("true", "1", "yes")

    # Database connection string
    # Defaults to SQLite for local lightweight/portable execution, or PostgreSQL if configured
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./derivaquant.db",
    )
    # Storage engine mode: "persistent" (default) or "mock"
    storage_mode: str = os.getenv("DERIVAQUANT_STORAGE_MODE", "persistent")


settings = Settings()
