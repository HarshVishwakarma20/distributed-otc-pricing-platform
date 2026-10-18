from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db
from app.services.seed_data import seed_initial_contracts


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database tables and seed initial contracts."""
    if settings.storage_mode == "persistent":
        try:
            init_db()
            seed_initial_contracts()
        except Exception as e:
            import logging
            logging.getLogger("uvicorn.error").error(f"Database initialization failed: {e}")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="DerivaQuant — Quantitative OTC Derivatives Pricing & Distributed Risk Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for local development and institutional frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
        "demo_mode": "true",
    }
