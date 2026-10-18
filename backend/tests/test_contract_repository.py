import datetime
from decimal import Decimal

import pytest
from app.db.session import SessionLocal
from app.domain.enums import (
    AuditEventType,
    ContractStatus,
    InstrumentType,
    OptionType,
)
from app.domain.schemas import (
    ContractCreateRequest,
    EuropeanOptionSpec,
)
from app.services.contract_repository import ContractRepository
from app.services.contract_service import ContractService
from sqlalchemy.orm import Session


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_repository_atomic_create_and_query(db_session: Session):
    service = ContractService(db_session)
    repo = ContractRepository(db_session)

    req = ContractCreateRequest(
        instrument_type=InstrumentType.EUROPEAN_OPTION,
        counterparty="Repo Test Counterparty",
        external_reference="EXT-REPO-001",
        option_terms=EuropeanOptionSpec(
            underlying_asset="NVDA",
            option_type=OptionType.CALL,
            strike_price=Decimal("120.00"),
            premium=Decimal("8.50"),
            notional=Decimal("5000000.00"),
            trade_date=datetime.date(2026, 4, 1),
            expiration_date=datetime.date(2026, 10, 1),
        ),
    )
    created = service.create_contract(req)
    cid = created.contract_id

    # Check contract model
    c_model = repo.get_by_contract_id(cid)
    assert c_model is not None
    assert c_model.counterparty == "Repo Test Counterparty"
    assert c_model.status == ContractStatus.DRAFT.value
    assert c_model.version == 1

    # Check audit events
    audits = repo.get_audit_events(cid)
    assert len(audits) >= 1
    assert audits[0].event_type == AuditEventType.CREATED.value
    assert audits[0].to_status == ContractStatus.DRAFT.value

    # Check revisions
    revisions = repo.get_revisions(cid)
    assert len(revisions) == 1
    assert revisions[0].version == 1
    assert revisions[0].snapshot["counterparty"] == "Repo Test Counterparty"


def test_repository_filtering_and_sorting(db_session: Session):
    repo = ContractRepository(db_session)

    # List all
    items, total = repo.list_contracts(page=1, page_size=10)
    assert total >= 4
    assert len(items) <= 10

    # Filter by instrument type
    irs_items, irs_total = repo.list_contracts(instrument_type=InstrumentType.INTEREST_RATE_SWAP)
    assert irs_total >= 1
    for item in irs_items:
        assert item.instrument_type == InstrumentType.INTEREST_RATE_SWAP.value

    # Filter by status
    active_items, active_total = repo.list_contracts(status=ContractStatus.ACTIVE)
    assert active_total >= 1
    for item in active_items:
        assert item.status == ContractStatus.ACTIVE.value

    # Search filter
    search_items, search_total = repo.list_contracts(search="JPMorgan")
    assert search_total >= 1
    assert any("JPMorgan" in it.counterparty for it in search_items)


def test_count_active(db_session: Session):
    repo = ContractRepository(db_session)
    active_count = repo.count_active()
    assert isinstance(active_count, int)
    assert active_count >= 1
