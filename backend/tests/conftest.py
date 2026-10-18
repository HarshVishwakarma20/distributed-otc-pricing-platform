import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services.mock_provider import MockDataProvider


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database tables and baseline seeds exist for all test runs."""
    from app.db.session import init_db
    from app.services.seed_data import seed_initial_contracts

    init_db()
    seed_initial_contracts()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def mock_provider() -> MockDataProvider:
    return MockDataProvider(seed=42)
