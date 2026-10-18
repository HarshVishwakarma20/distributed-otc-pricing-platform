from app.domain.enums import InstrumentType, ValuationStatus
from app.services.mock_provider import MockDataProvider


def test_deterministic_seed_repeatability():
    provider_a = MockDataProvider(seed=42)
    provider_b = MockDataProvider(seed=42)

    history_a = provider_a.get_value_history(days=15)
    history_b = provider_b.get_value_history(days=15)

    assert len(history_a) == 15
    assert len(history_b) == 15
    assert [p.market_value for p in history_a] == [p.market_value for p in history_b]
    assert [p.daily_pnl for p in history_a] == [p.daily_pnl for p in history_b]


def test_kpi_summary_values(mock_provider: MockDataProvider):
    kpi = mock_provider.get_kpi_summary()
    assert kpi.total_notional > 0
    assert kpi.total_market_value > 0
    assert kpi.active_contracts > 0
    assert kpi.simulated_var_95_1d > 0
    assert kpi.is_demo_data is True


def test_portfolio_exposure_breakdown(mock_provider: MockDataProvider):
    exposures = mock_provider.get_portfolio_exposures()
    assert len(exposures) >= 4

    types = {e.instrument_type for e in exposures}
    assert InstrumentType.INTEREST_RATE_SWAP in types
    assert InstrumentType.EUROPEAN_OPTION in types
    assert InstrumentType.CURRENCY_SWAP in types
    assert InstrumentType.CREDIT_DEFAULT_SWAP in types

    total_pct = sum(e.percentage_of_total for e in exposures)
    assert 99.0 <= total_pct <= 101.0


def test_consistent_contract_and_valuation_relationships(mock_provider: MockDataProvider):
    contracts = {c.contract_id for c in mock_provider.get_contracts()}
    valuations = mock_provider.get_recent_valuations(limit=10)

    assert len(contracts) > 0
    assert len(valuations) > 0
    # Valuations reference contracts
    for v in valuations:
        assert v.contract_id.startswith("CNT-")
        assert v.valuation_id.startswith("VAL-")
        assert v.status in list(ValuationStatus)


def test_simulation_jobs_summary(mock_provider: MockDataProvider):
    jobs = mock_provider.get_simulation_jobs()
    assert len(jobs) >= 3
    for job in jobs:
        assert job.paths > 0
        assert 0.0 <= job.progress <= 100.0


def test_csv_export_format_and_headers(mock_provider: MockDataProvider):
    csv_text = mock_provider.export_valuations_csv()
    lines = csv_text.strip().split("\r\n") if "\r\n" in csv_text else csv_text.strip().split("\n")

    assert len(lines) >= 5
    header = lines[0].split(",")
    assert "Valuation ID" in header
    assert "Contract ID" in header
    assert "Market Value (USD)" in header
    assert "Pricing Model" in header
