import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.db.models import ContractAuditModel, ContractModel, ContractRevisionModel
from app.domain.enums import (
    AuditEventType,
    BusinessDayConvention,
    CDSDirection,
    ContractStatus,
    DayCountConvention,
    ExerciseStyle,
    FixedPayer,
    InstrumentType,
    LegRateType,
    OptionType,
    PaymentFrequency,
    PositionDirection,
    PrincipalExchange,
    RestructuringClause,
    SettlementType,
)


def seed_initial_contracts(db: Session | None = None) -> None:
    """
    Idempotently seed the baseline OTC contracts into the persistent database.
    Ensures the platform has representative, validated contracts across all 4 core asset classes.
    """
    if db is None:
        from app.db.session import SessionLocal
        session = SessionLocal()
        try:
            _seed_with_session(session)
        finally:
            session.close()
    else:
        _seed_with_session(db)


def _seed_with_session(db: Session) -> None:
    if db.query(ContractModel).count() > 0:
        return  # Already seeded

    now = datetime.datetime.now(datetime.UTC)

    seed_records = [
        # 1. USD 100M 5Y SOFR Interest Rate Swap
        {
            "contract_id": "CNT-IRS-1001",
            "external_reference": "EXT-JPM-2024-001",
            "instrument_type": InstrumentType.INTEREST_RATE_SWAP.value,
            "counterparty": "JPMorgan Chase NA",
            "notional": Decimal("100000000.0000"),
            "currency": "USD",
            "effective_date": datetime.date(2024, 1, 15),
            "maturity_date": datetime.date(2029, 1, 15),
            "status": ContractStatus.ACTIVE.value,
            "version": 1,
            "terms": {
                "notional": 100000000.0,
                "currency": "USD",
                "effective_date": "2024-01-15",
                "maturity_date": "2029-01-15",
                "fixed_rate": 3.85,
                "floating_index": "SOFR",
                "fixed_leg_payer": FixedPayer.PAY_FIXED.value,
                "fixed_frequency": PaymentFrequency.SEMI_ANNUAL.value,
                "floating_frequency": PaymentFrequency.QUARTERLY.value,
                "day_count_convention": DayCountConvention.ACT_360.value,
                "business_day_convention": BusinessDayConvention.MODIFIED_FOLLOWING.value,
                "settlement_calendar": "US_NY",
            },
        },
        # 2. USD 50M SPX European Call Option
        {
            "contract_id": "CNT-OPT-2002",
            "external_reference": "EXT-GS-2024-089",
            "instrument_type": InstrumentType.EUROPEAN_OPTION.value,
            "counterparty": "Goldman Sachs Bank USA",
            "notional": Decimal("50000000.0000"),
            "currency": "USD",
            "effective_date": datetime.date(2024, 6, 1),
            "maturity_date": datetime.date(2027, 6, 1),
            "status": ContractStatus.ACTIVE.value,
            "version": 1,
            "terms": {
                "underlying_asset": "SPX",
                "option_type": OptionType.CALL.value,
                "exercise_style": ExerciseStyle.EUROPEAN.value,
                "strike_price": 5400.0,
                "premium": 1250000.0,
                "notional": 50000000.0,
                "currency": "USD",
                "trade_date": "2024-06-01",
                "expiration_date": "2027-06-01",
                "settlement_type": SettlementType.CASH.value,
                "position_direction": PositionDirection.BUY.value,
            },
        },
        # 3. EUR/USD 75M Cross-Currency Swap
        {
            "contract_id": "CNT-FXS-3003",
            "external_reference": "EXT-BARC-2023-412",
            "instrument_type": InstrumentType.CURRENCY_SWAP.value,
            "counterparty": "Barclays Capital",
            "notional": Decimal("75000000.0000"),
            "currency": "EUR",
            "effective_date": datetime.date(2023, 11, 20),
            "maturity_date": datetime.date(2028, 11, 20),
            "status": ContractStatus.ACTIVE.value,
            "version": 1,
            "terms": {
                "pay_currency": "EUR",
                "receive_currency": "USD",
                "pay_notional": 75000000.0,
                "receive_notional": 81300000.0,
                "fx_exchange_rate": 1.084,
                "effective_date": "2023-11-20",
                "maturity_date": "2028-11-20",
                "pay_leg_rate_type": LegRateType.FIXED.value,
                "receive_leg_rate_type": LegRateType.FLOATING.value,
                "pay_fixed_rate": 3.40,
                "receive_floating_index": "SOFR",
                "payment_frequency": PaymentFrequency.SEMI_ANNUAL.value,
                "principal_exchange": PrincipalExchange.INITIAL_AND_FINAL.value,
                "day_count_convention": DayCountConvention.ACT_360.value,
            },
        },
        # 4. USD 40M Single-Name Credit Default Swap
        {
            "contract_id": "CNT-CDS-4004",
            "external_reference": "EXT-MS-2024-501",
            "instrument_type": InstrumentType.CREDIT_DEFAULT_SWAP.value,
            "counterparty": "Morgan Stanley & Co",
            "notional": Decimal("40000000.0000"),
            "currency": "USD",
            "effective_date": datetime.date(2024, 3, 20),
            "maturity_date": datetime.date(2029, 3, 20),
            "status": ContractStatus.ACTIVE.value,
            "version": 1,
            "terms": {
                "reference_entity": "Ford Motor Credit Co LLC",
                "direction": CDSDirection.BUY_PROTECTION.value,
                "notional": 40000000.0,
                "spread_bps": 120.0,
                "currency": "USD",
                "effective_date": "2024-03-20",
                "maturity_date": "2029-03-20",
                "premium_frequency": PaymentFrequency.QUARTERLY.value,
                "day_count_convention": DayCountConvention.ACT_360.value,
                "restructuring_clause": RestructuringClause.CR.value,
            },
        },
        # 5. USD 30M Draft Contract for testing lifecycle workflows
        {
            "contract_id": "CNT-IRS-5005",
            "external_reference": "EXT-CITI-2025-999",
            "instrument_type": InstrumentType.INTEREST_RATE_SWAP.value,
            "counterparty": "Citigroup Global Markets",
            "notional": Decimal("30000000.0000"),
            "currency": "USD",
            "effective_date": datetime.date(2025, 4, 1),
            "maturity_date": datetime.date(2030, 4, 1),
            "status": ContractStatus.DRAFT.value,
            "version": 1,
            "terms": {
                "notional": 30000000.0,
                "currency": "USD",
                "effective_date": "2025-04-01",
                "maturity_date": "2030-04-01",
                "fixed_rate": 4.10,
                "floating_index": "SOFR",
                "fixed_leg_payer": FixedPayer.PAY_FIXED.value,
                "fixed_frequency": PaymentFrequency.SEMI_ANNUAL.value,
                "floating_frequency": PaymentFrequency.QUARTERLY.value,
                "day_count_convention": DayCountConvention.ACT_360.value,
                "business_day_convention": BusinessDayConvention.MODIFIED_FOLLOWING.value,
                "settlement_calendar": "US_NY",
            },
        },
    ]

    for rec in seed_records:
        contract = ContractModel(
            contract_id=rec["contract_id"],
            external_reference=rec["external_reference"],
            instrument_type=rec["instrument_type"],
            counterparty=rec["counterparty"],
            notional=rec["notional"],
            currency=rec["currency"],
            effective_date=rec["effective_date"],
            maturity_date=rec["maturity_date"],
            status=rec["status"],
            version=rec["version"],
            terms=rec["terms"],
            created_at=now,
            updated_at=now,
        )
        db.add(contract)
        db.flush()

        audit = ContractAuditModel(
            event_id=f"EVT-SEED-{rec['contract_id']}",
            contract_id=rec["contract_id"],
            event_type=AuditEventType.CREATED.value,
            from_status=None,
            to_status=rec["status"],
            actor="System Ingestion Seed",
            timestamp=now,
            diff={"initial_terms": rec["terms"]},
            reason="Idempotent seed ingestion",
            version=1,
        )
        db.add(audit)

        revision = ContractRevisionModel(
            contract_id=rec["contract_id"],
            version=1,
            status=rec["status"],
            snapshot={
                "contract_id": rec["contract_id"],
                "external_reference": rec["external_reference"],
                "instrument_type": rec["instrument_type"],
                "counterparty": rec["counterparty"],
                "notional": float(rec["notional"]),
                "currency": rec["currency"],
                "effective_date": rec["effective_date"].isoformat(),
                "maturity_date": rec["maturity_date"].isoformat(),
                "status": rec["status"],
                "version": 1,
                "terms": rec["terms"],
            },
            created_at=now,
            changed_by="System Ingestion Seed",
            reason="Baseline contract creation",
        )
        db.add(revision)

    db.commit()
