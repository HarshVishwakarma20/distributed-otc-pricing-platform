from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_dashboard_summary_endpoint(client: TestClient):
    response = client.get("/api/v1/dashboard/summary?days=30")
    assert response.status_code == 200
    data = response.json()

    assert "kpi" in data
    assert "value_history" in data
    assert data["is_demo_data"] is True

    kpi = data["kpi"]
    assert kpi["total_notional"] == 1_425_000_000.0
    assert kpi["total_market_value"] == 48_320_500.0
    assert kpi["active_contracts"] == 84
    assert len(data["value_history"]) == 30


def test_dashboard_exposure_endpoint(client: TestClient):
    response = client.get("/api/v1/dashboard/exposure")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    first = data[0]
    assert "instrument_type" in first
    assert "notional" in first
    assert "market_value" in first


def test_recent_valuations_endpoint(client: TestClient):
    response = client.get("/api/v1/valuations/recent?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert data[0]["valuation_id"] == "VAL-2026-901"


def test_recent_activity_endpoint(client: TestClient):
    response = client.get("/api/v1/activity?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "event_id" in data[0]


def test_simulation_jobs_summary_endpoint(client: TestClient):
    response = client.get("/api/v1/jobs/summary")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


def test_contracts_endpoint(client: TestClient):
    response = client.get("/api/v1/contracts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0


def test_portfolios_endpoint(client: TestClient):
    response = client.get("/api/v1/portfolios")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4


def test_market_rates_endpoint(client: TestClient):
    response = client.get("/api/v1/market-data/rates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8


def test_pricing_preview_endpoint(client: TestClient):
    payload = {
        "instrument_type": "European Option",
        "notional": 1000000.0,
        "maturity_years": 1.0,
        "underlying_price": 100.0,
        "strike_price": 100.0,
        "volatility": 0.25,
    }
    response = client.post("/api/v1/pricing/preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_preview"] is True
    assert "estimated_pv" in data


def test_valuations_csv_export_endpoint(client: TestClient):
    response = client.get("/api/v1/reports/export/valuations.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers.get("content-disposition", "")
    assert b"Valuation ID" in response.content
