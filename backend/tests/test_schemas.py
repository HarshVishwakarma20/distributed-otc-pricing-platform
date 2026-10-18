import pytest
from app.domain.enums import (
    ContractStatus,
    InstrumentType,
    ValuationStatus,
)
from app.domain.schemas import (
    ContractSummary,
    KPISummary,
    PortfolioExposure,
    ValuationSummary,
)
from pydantic import ValidationError


def test_kpi_summary_validation():
    kpi = KPISummary(
        total_notional=1_000_000.0,
        total_market_value=50_000.0,
        active_contracts=10,
        daily_pnl=1200.0,
        daily_pnl_pct=2.4,
        simulated_var_95_1d=25_000.0,
        active_simulation_jobs=2,
        valuation_timestamp="2026-10-14T18:00:00Z",
        is_demo_data=True,
    )
    assert kpi.total_notional == 1_000_000.0
    assert kpi.currency == "USD"
    assert kpi.is_demo_data is True


def test_portfolio_exposure_schema():
    exposure = PortfolioExposure(
        instrument_type=InstrumentType.INTEREST_RATE_SWAP,
        notional=500_000_000.0,
        market_value=12_000_000.0,
        delta_equivalent=11_000_000.0,
        percentage_of_total=50.0,
        contract_count=20,
    )
    assert exposure.instrument_type == InstrumentType.INTEREST_RATE_SWAP
    assert exposure.percentage_of_total == 50.0


def test_valuation_summary_schema():
    val = ValuationSummary(
        valuation_id="VAL-001",
        contract_id="CNT-001",
        instrument=InstrumentType.EUROPEAN_OPTION,
        valuation_timestamp="2026-10-14T12:00:00Z",
        market_value=15000.0,
        currency="USD",
        model_used="Black-Scholes-Merton",
        status=ValuationStatus.COMPLETED,
        pv01=120.5,
        dv01=118.0,
    )
    assert val.status == ValuationStatus.COMPLETED
    assert val.model_used == "Black-Scholes-Merton"


def test_contract_summary_schema():
    contract = ContractSummary(
        contract_id="CNT-TEST-01",
        counterparty="Goldman Sachs",
        instrument_type=InstrumentType.INTEREST_RATE_SWAP,
        notional=50_000_000.0,
        currency="USD",
        start_date="2025-01-01",
        maturity_date="2030-01-01",
        status=ContractStatus.ACTIVE,
        fixed_rate=3.5,
        floating_index="SOFR 3M",
        market_value=450_000.0,
    )
    assert contract.contract_id == "CNT-TEST-01"
    assert contract.fixed_rate == 3.5


def test_invalid_schema_throws_validation_error():
    with pytest.raises(ValidationError):
        # Missing required fields like valuation_id
        ValuationSummary(
            contract_id="CNT-001",
            instrument=InstrumentType.EUROPEAN_OPTION,
            market_value=100.0,
        )
