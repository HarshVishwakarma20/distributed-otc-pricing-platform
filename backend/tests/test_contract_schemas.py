import datetime
from decimal import Decimal

import pytest
from app.domain.enums import (
    BusinessDayConvention,
    CDSDirection,
    DayCountConvention,
    ExerciseStyle,
    FixedPayer,
    InstrumentType,
    LegRateType,
    OptionType,
    PaymentFrequency,
    PrincipalExchange,
    RestructuringClause,
    SettlementType,
)
from app.domain.schemas import (
    CDSSpec,
    ContractCreateRequest,
    CurrencySwapSpec,
    EuropeanOptionSpec,
    IRSSpec,
)
from pydantic import ValidationError


def test_valid_irs_spec():
    today = datetime.date(2026, 1, 1)
    maturity = datetime.date(2031, 1, 1)
    irs = IRSSpec(
        notional=Decimal("100000000.00"),
        currency="USD",
        effective_date=today,
        maturity_date=maturity,
        fixed_rate=Decimal("3.8500"),
        floating_index="SOFR 3M",
        fixed_leg_payer=FixedPayer.PAY_FIXED,
        fixed_frequency=PaymentFrequency.SEMI_ANNUAL,
        floating_frequency=PaymentFrequency.QUARTERLY,
        day_count_convention=DayCountConvention.ACT_360,
        business_day_convention=BusinessDayConvention.MODIFIED_FOLLOWING,
        settlement_calendar="US_NY",
    )
    assert irs.notional == Decimal("100000000.00")
    assert irs.fixed_rate == Decimal("3.8500")


def test_invalid_irs_dates():
    today = datetime.date(2026, 1, 1)
    with pytest.raises(ValidationError) as exc:
        IRSSpec(
            notional=Decimal("50000000.00"),
            currency="USD",
            effective_date=today,
            maturity_date=today,  # Invalid: maturity must be strictly after effective
            fixed_rate=Decimal("4.0000"),
            floating_index="SOFR",
        )
    assert "maturity_date" in str(exc.value)


def test_invalid_negative_notional():
    today = datetime.date(2026, 1, 1)
    maturity = datetime.date(2031, 1, 1)
    with pytest.raises(ValidationError):
        IRSSpec(
            notional=Decimal("-1000.00"),  # Invalid: must be > 0
            currency="USD",
            effective_date=today,
            maturity_date=maturity,
            fixed_rate=Decimal("4.0000"),
            floating_index="SOFR",
        )


def test_valid_european_option_spec():
    trade = datetime.date(2026, 3, 1)
    exp = datetime.date(2027, 3, 1)
    opt = EuropeanOptionSpec(
        underlying_asset="SPX",
        option_type=OptionType.CALL,
        exercise_style=ExerciseStyle.EUROPEAN,
        strike_price=Decimal("5200.00"),
        premium=Decimal("145.50"),
        notional=Decimal("25000000.00"),
        currency="USD",
        trade_date=trade,
        expiration_date=exp,
        settlement_type=SettlementType.CASH,
    )
    assert opt.underlying_asset == "SPX"
    assert opt.strike_price == Decimal("5200.00")


def test_invalid_european_option_dates():
    trade = datetime.date(2026, 6, 1)
    exp = datetime.date(2026, 5, 1)  # Invalid: expiration before trade
    with pytest.raises(ValidationError) as exc:
        EuropeanOptionSpec(
            underlying_asset="AAPL",
            option_type=OptionType.PUT,
            strike_price=Decimal("180.00"),
            premium=Decimal("12.00"),
            notional=Decimal("1000000.00"),
            trade_date=trade,
            expiration_date=exp,
        )
    assert "expiration_date" in str(exc.value)


def test_valid_currency_swap_spec():
    eff = datetime.date(2026, 1, 15)
    mat = datetime.date(2031, 1, 15)
    cs = CurrencySwapSpec(
        pay_currency="USD",
        receive_currency="EUR",
        pay_notional=Decimal("100000000.00"),
        receive_notional=Decimal("92000000.00"),
        fx_exchange_rate=Decimal("1.0870"),
        effective_date=eff,
        maturity_date=mat,
        pay_leg_rate_type=LegRateType.FIXED,
        receive_leg_rate_type=LegRateType.FLOATING,
        pay_fixed_rate=Decimal("4.25"),
        receive_floating_index="EURIBOR 6M",
        principal_exchange=PrincipalExchange.INITIAL_AND_FINAL,
    )
    assert cs.pay_currency == "USD"
    assert cs.receive_currency == "EUR"


def test_invalid_currency_swap_same_currency():
    eff = datetime.date(2026, 1, 15)
    mat = datetime.date(2031, 1, 15)
    with pytest.raises(ValidationError) as exc:
        CurrencySwapSpec(
            pay_currency="USD",
            receive_currency="USD",  # Invalid: identical currencies
            pay_notional=Decimal("100000000.00"),
            receive_notional=Decimal("100000000.00"),
            effective_date=eff,
            maturity_date=mat,
            pay_leg_rate_type=LegRateType.FIXED,
            receive_leg_rate_type=LegRateType.FLOATING,
            pay_fixed_rate=Decimal("4.00"),
            receive_floating_index="SOFR",
        )
    assert "pay_currency and receive_currency must be distinct" in str(exc.value)


def test_valid_cds_spec():
    eff = datetime.date(2026, 3, 20)
    mat = datetime.date(2031, 3, 20)
    cds = CDSSpec(
        reference_entity="Ford Motor Credit Co LLC",
        direction=CDSDirection.BUY_PROTECTION,
        notional=Decimal("25000000.00"),
        spread_bps=Decimal("145.00"),
        currency="USD",
        effective_date=eff,
        maturity_date=mat,
        premium_frequency=PaymentFrequency.QUARTERLY,
        restructuring_clause=RestructuringClause.CR,
    )
    assert cds.spread_bps == Decimal("145.00")
    assert cds.direction == CDSDirection.BUY_PROTECTION


def test_contract_create_request_mismatched_spec():
    # Attempting to stage an IRS without irs_terms
    with pytest.raises(ValidationError) as exc:
        ContractCreateRequest(
            instrument_type=InstrumentType.INTEREST_RATE_SWAP,
            counterparty="Goldman Sachs International",
            # missing irs_terms
        )
    assert "irs_terms must be provided" in str(exc.value)
