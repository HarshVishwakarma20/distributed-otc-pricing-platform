from fastapi.testclient import TestClient


def test_meta_health_endpoint(client: TestClient):
    response = client.get("/api/v1/contracts/meta/health")
    assert response.status_code == 200
    data = response.json()
    assert data["healthy"] is True
    assert "dialect" in data


def test_list_contracts_pagination_and_filter(client: TestClient):
    # 1. Base list
    res = client.get("/api/v1/contracts?page=1&page_size=5")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) <= 5

    # 2. Filter by status
    res_status = client.get("/api/v1/contracts?status=ACTIVE")
    assert res_status.status_code == 200
    data_status = res_status.json()
    for item in data_status["items"]:
        assert item["status"] == "ACTIVE"


def test_contract_crud_and_lifecycle_api_flow(client: TestClient):
    # 1. Create a new IRS Contract in DRAFT state (201 Created)
    payload = {
        "instrument_type": "Interest Rate Swap",
        "counterparty": "Bank of America Merrill Lynch",
        "external_reference": "BOA-SWAP-2026-99",
        "irs_terms": {
            "notional": 85000000.0,
            "currency": "USD",
            "effective_date": "2026-05-01",
            "maturity_date": "2031-05-01",
            "fixed_rate": 3.92,
            "floating_index": "SOFR 3M",
            "fixed_leg_payer": "PAY_FIXED",
            "fixed_frequency": "SEMI_ANNUAL",
            "floating_frequency": "QUARTERLY",
            "day_count_convention": "ACT_360",
            "business_day_convention": "MODIFIED_FOLLOWING",
            "settlement_calendar": "US_NY",
        },
    }
    create_res = client.post("/api/v1/contracts", json=payload)
    assert create_res.status_code == 201
    contract = create_res.json()
    cid = contract["contract_id"]
    assert cid.startswith("CNT-IRS-")
    assert contract["status"] == "DRAFT"
    assert contract["version"] == 1
    assert contract["notional"] == 85000000.0

    # 2. Fetch by ID (200 OK)
    get_res = client.get(f"/api/v1/contracts/{cid}")
    assert get_res.status_code == 200
    assert get_res.json()["contract_id"] == cid

    # 3. Update contract in DRAFT state (PATCH)
    update_res = client.patch(
        f"/api/v1/contracts/{cid}",
        json={
            "counterparty": "Bank of America NA (Updated)",
            "expected_version": 1,
            "reason": "Correct legal entity name",
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["counterparty"] == "Bank of America NA (Updated)"
    assert updated["version"] == 2

    # 4. Lifecycle: Submit for approval
    submit_res = client.post(
        f"/api/v1/contracts/{cid}/submit",
        json={
            "expected_version": 2,
            "actor": "Credit Risk Desk",
            "reason": "Submitting for final credit verification",
        },
    )
    assert submit_res.status_code == 200
    submitted = submit_res.json()
    assert submitted["status"] == "PENDING_APPROVAL"
    assert submitted["version"] == 3

    # 5. Lifecycle: Activate contract
    act_res = client.post(
        f"/api/v1/contracts/{cid}/activate",
        json={
            "expected_version": 3,
            "actor": "Authorized Officer",
            "reason": "Approved and signed",
        },
    )
    assert act_res.status_code == 200
    activated = act_res.json()
    assert activated["status"] == "ACTIVE"
    assert activated["version"] == 4

    # 6. Lifecycle: Mature contract (Terminal)
    mat_res = client.post(
        f"/api/v1/contracts/{cid}/mature",
        json={
            "expected_version": 4,
            "actor": "Settlement Operations",
            "reason": "Reached scheduled maturity",
        },
    )
    assert mat_res.status_code == 200
    matured = mat_res.json()
    assert matured["status"] == "MATURED"
    assert matured["version"] == 5

    # 7. Check audit trail
    audit_res = client.get(f"/api/v1/contracts/{cid}/audit")
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    assert len(audit_events) == 5
    assert audit_events[0]["event_type"] == "CREATED"
    assert audit_events[1]["event_type"] == "UPDATED"
    assert audit_events[2]["to_status"] == "PENDING_APPROVAL"
    assert audit_events[3]["to_status"] == "ACTIVE"
    assert audit_events[4]["to_status"] == "MATURED"

    # 8. Check revisions
    rev_res = client.get(f"/api/v1/contracts/{cid}/revisions")
    assert rev_res.status_code == 200
    revisions = rev_res.json()
    assert len(revisions) == 5
    assert [r["version"] for r in revisions] == [1, 2, 3, 4, 5]


def test_contract_not_found(client: TestClient):
    res = client.get("/api/v1/contracts/NON-EXISTENT-ID")
    assert res.status_code == 404


def test_invalid_transition_returns_409(client: TestClient):
    # Staging a CDS contract
    payload = {
        "instrument_type": "Credit Default Swap",
        "counterparty": "Deutsche Bank AG",
        "cds_terms": {
            "reference_entity": "Volkswagen AG",
            "direction": "BUY_PROTECTION",
            "notional": 10000000.0,
            "spread_bps": 95.0,
            "effective_date": "2026-06-20",
            "maturity_date": "2031-06-20",
        },
    }
    c_res = client.post("/api/v1/contracts", json=payload)
    cid = c_res.json()["contract_id"]

    # Attempting to activate directly from DRAFT without approval
    res = client.post(
        f"/api/v1/contracts/{cid}/activate",
        json={"expected_version": 1, "actor": "Test"},
    )
    assert res.status_code == 409
    assert "Invalid lifecycle transition" in res.json()["detail"]


def test_optimistic_concurrency_version_mismatch(client: TestClient):
    payload = {
        "instrument_type": "European Option",
        "counterparty": "UBS AG",
        "option_terms": {
            "underlying_asset": "TSLA",
            "option_type": "CALL",
            "strike_price": 250.0,
            "premium": 15.0,
            "notional": 5000000.0,
            "trade_date": "2026-06-01",
            "expiration_date": "2027-06-01",
        },
    }
    c_res = client.post("/api/v1/contracts", json=payload)
    cid = c_res.json()["contract_id"]

    # Send update with wrong version
    res = client.patch(
        f"/api/v1/contracts/{cid}",
        json={"counterparty": "UBS Zurich", "expected_version": 42},
    )
    assert res.status_code == 409
    assert "Optimistic Concurrency Conflict" in res.json()["detail"]
