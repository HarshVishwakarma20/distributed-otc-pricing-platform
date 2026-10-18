from fastapi.testclient import TestClient


def test_list_pricing_models(client: TestClient):
    """Verify GET /pricing/models returns all registered quant models."""
    res = client.get("/api/v1/pricing/models")
    assert res.status_code == 200
    models = res.json()
    model_ids = [m["model_id"] for m in models]
    assert "BSM_EUROPEAN" in model_ids
    assert "DISCOUNTED_CASH_FLOW_IRS" in model_ids
    assert "CROSS_CURRENCY_DCF" in model_ids
    assert "ISDA_HAZARD_RATE_CDS" in model_ids

    # Filter by European Option
    opt_res = client.get("/api/v1/pricing/models?instrument_type=European%20Option")
    assert opt_res.status_code == 200
    opt_models = opt_res.json()
    assert len(opt_models) == 1
    assert opt_models[0]["model_id"] == "BSM_EUROPEAN"
    assert "Delta" in opt_models[0]["supported_greeks"]


def test_price_option_contract_happy_path(client: TestClient):
    """
    Price an authoritative European Option contract (CNT-OPT-2002).
    Validates PV, Greeks, units, assumptions, and database persistence.
    """
    req_payload = {
        "contract_id": "CNT-OPT-2002",
        "contract_version": 1,
        "model_id": "BSM_EUROPEAN",
        "valuation_date": "2026-10-15",
        "market_overrides": {
            "spot_price": 5500.0,
            "volatility": 0.18,
            "risk_free_rate": 0.045,
            "dividend_yield": 0.015,
        },
    }

    res = client.post("/api/v1/pricing/price", json=req_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["contract_id"] == "CNT-OPT-2002"
    assert data["contract_version"] == 1
    assert data["instrument_type"] == "European Option"
    assert data["currency"] == "USD"
    assert float(data["present_value"]) > 0.0

    # Greeks validation
    greeks = data["greeks"]
    assert greeks is not None
    assert greeks["delta"] is not None and greeks["delta"] > 0.0
    assert greeks["gamma"] is not None and greeks["gamma"] > 0.0
    assert greeks["vega"] is not None and greeks["vega"] > 0.0
    assert "units" in greeks
    assert "delta" in greeks["units"]

    # Verify persistence: retrieve via GET /pricing/valuations/{id}
    valuation_id = data["valuation_id"]
    get_res = client.get(f"/api/v1/pricing/valuations/{valuation_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["valuation_id"] == valuation_id
    assert get_data["present_value"] == data["present_value"]

    # Verify contract immutability: contract version and audit trail did NOT change
    contract_res = client.get("/api/v1/contracts/CNT-OPT-2002")
    assert contract_res.status_code == 200
    assert contract_res.json()["version"] == 1


def test_price_contract_stale_version_conflict_409(client: TestClient):
    """
    Enforces optimistic concurrency control:
    If client provides outdated contract_version, reject with HTTP 409 Conflict.
    """
    req_payload = {
        "contract_id": "CNT-OPT-2002",
        "contract_version": 999,  # Authoritative version is 1
        "model_id": "BSM_EUROPEAN",
        "valuation_date": "2026-10-15",
    }

    res = client.post("/api/v1/pricing/price", json=req_payload)
    assert res.status_code == 409
    err = res.json()
    assert "Stale contract version" in err["detail"]


def test_price_contract_not_found_404(client: TestClient):
    """Pricing a non-existent contract ID must return HTTP 404."""
    req_payload = {
        "contract_id": "CNT-NON-EXISTENT-9999",
        "contract_version": 1,
        "model_id": "BSM_EUROPEAN",
        "valuation_date": "2026-10-15",
    }

    res = client.post("/api/v1/pricing/price", json=req_payload)
    assert res.status_code == 404


def test_price_contract_model_mismatch_422(client: TestClient):
    """Attempting to price an IRS contract with BSM option model must fail with HTTP 422."""
    req_payload = {
        "contract_id": "CNT-IRS-1001",
        "contract_version": 1,
        "model_id": "BSM_EUROPEAN",
        "valuation_date": "2026-10-15",
    }

    res = client.post("/api/v1/pricing/price", json=req_payload)
    assert res.status_code == 422
    assert "does not support instrument type" in res.json()["detail"]


def test_price_irs_contract_happy_path(client: TestClient):
    """Price an authoritative Interest Rate Swap contract (CNT-IRS-1001)."""
    req_payload = {
        "contract_id": "CNT-IRS-1001",
        "contract_version": 1,
        "model_id": "DISCOUNTED_CASH_FLOW_IRS",
        "valuation_date": "2026-10-15",
    }

    res = client.post("/api/v1/pricing/price", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["contract_id"] == "CNT-IRS-1001"
    assert data["instrument_type"] == "Interest Rate Swap"
    assert data["greeks"]["pv01"] is not None
    assert data["greeks"]["dv01"] is not None
    assert data["cashflows"] is not None
    assert len(data["cashflows"]) > 0


def test_price_ad_hoc_workbench_flow(client: TestClient):
    """Test ad-hoc pricing for unbooked structures directly from workbench."""
    req_payload = {
        "instrument_type": "European Option",
        "model_id": "BSM_EUROPEAN",
        "notional": 10000000.0,
        "currency": "USD",
        "valuation_date": "2026-10-15",
        "option_type": "CALL",
        "strike_price": 100.0,
        "underlying_price": 105.0,
        "volatility": 0.20,
        "risk_free_rate": 0.045,
    }

    res = client.post("/api/v1/pricing/ad-hoc", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert float(data["present_value"]) > 0.0
    assert data["greeks"]["delta"] is not None
