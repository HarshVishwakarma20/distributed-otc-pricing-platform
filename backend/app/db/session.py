import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure SQLAlchemy engine
is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.debug,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a transactional database session.
    Automatically rolls back on uncaught exception and closes session upon completion.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_health() -> dict[str, str | bool]:
    """Verify database connectivity and dialect information."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "dialect": engine.dialect.name,
            "url_masked": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url,
            "healthy": True,
        }
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return {
            "status": "disconnected",
            "dialect": engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            "error": str(exc),
            "healthy": False,
        }


def init_db() -> None:
    """Initialize database tables idempotently."""
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
