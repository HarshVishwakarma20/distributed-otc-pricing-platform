import datetime
from decimal import Decimal

import pytest
from app.db.session import SessionLocal
from app.domain.enums import (
    CDSDirection,
    ContractStatus,
    InstrumentType,
    PaymentFrequency,
    RestructuringClause,
)
from app.domain.schemas import (
    CDSSpec,
    ContractCreateRequest,
    ContractTransitionRequest,
    ContractUpdateRequest,
)
from app.services.contract_service import ContractService
from fastapi import HTTPException
from sqlalchemy.orm import Session


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_sample_cds_contract(service: ContractService):
    req = ContractCreateRequest(
        instrument_type=InstrumentType.CREDIT_DEFAULT_SWAP,
        counterparty="Citigroup Global Markets Inc",
        external_reference="TEST-CDS-001",
        cds_terms=CDSSpec(
            reference_entity="General Motors Co",
            direction=CDSDirection.BUY_PROTECTION,
            notional=Decimal("15000000.00"),
            spread_bps=Decimal("120.00"),
            currency="USD",
            effective_date=datetime.date(2026, 6, 20),
            maturity_date=datetime.date(2031, 6, 20),
            premium_frequency=PaymentFrequency.QUARTERLY,
            restructuring_clause=RestructuringClause.CR,
        ),
    )
    return service.create_contract(req)


def test_standard_lifecycle_happy_path(db_session: Session):
    service = ContractService(db_session)
    contract = create_sample_cds_contract(service)
    cid = contract.contract_id

    # 1. Initially DRAFT (v1)
    assert contract.status == ContractStatus.DRAFT
    assert contract.version == 1

    # 2. DRAFT -> PENDING_APPROVAL (v2)
    t_req = ContractTransitionRequest(expected_version=1, actor="Trader Joe", reason="Staged for risk approval")
    res = service.transition_state(cid, ContractStatus.PENDING_APPROVAL, t_req)
    assert res.status == ContractStatus.PENDING_APPROVAL
    assert res.version == 2

    # 3. PENDING_APPROVAL -> ACTIVE (v3)
    t_req2 = ContractTransitionRequest(expected_version=2, actor="Risk Officer Jane", reason="Counterparty limit approved")
    res2 = service.transition_state(cid, ContractStatus.ACTIVE, t_req2)
    assert res2.status == ContractStatus.ACTIVE
    assert res2.version == 3

    # 4. ACTIVE -> MATURED (v4, Terminal state)
    t_req3 = ContractTransitionRequest(expected_version=3, actor="Operations Bot", reason="Scheduled contract maturity reached")
    res3 = service.transition_state(cid, ContractStatus.MATURED, t_req3)
    assert res3.status == ContractStatus.MATURED
    assert res3.version == 4

    # 5. MATURED is terminal -> Cannot transition anywhere
    with pytest.raises(HTTPException) as exc:
        service.transition_state(
            cid,
            ContractStatus.ACTIVE,
            ContractTransitionRequest(expected_version=4, actor="Hacker", reason="Illegal reactivation"),
        )
    assert exc.value.status_code == 409
    assert "Invalid lifecycle transition" in exc.value.detail


def test_rejection_and_redraft_flow(db_session: Session):
    service = ContractService(db_session)
    contract = create_sample_cds_contract(service)
    cid = contract.contract_id

    # DRAFT -> PENDING_APPROVAL
    service.transition_state(
        cid,
        ContractStatus.PENDING_APPROVAL,
        ContractTransitionRequest(expected_version=1, actor="Trader Joe"),
    )

    # PENDING_APPROVAL -> REJECTED
    rej_res = service.transition_state(
        cid,
        ContractStatus.REJECTED,
        ContractTransitionRequest(expected_version=2, actor="Risk Officer Jane", reason="Credit limit exceeded"),
    )
    assert rej_res.status == ContractStatus.REJECTED
    assert rej_res.version == 3

    # REJECTED -> DRAFT
    draft_res = service.transition_state(
        cid,
        ContractStatus.DRAFT,
        ContractTransitionRequest(expected_version=3, actor="Trader Joe", reason="Reducing notional to fit limits"),
    )
    assert draft_res.status == ContractStatus.DRAFT
    assert draft_res.version == 4


def test_direct_activation_from_draft_blocked(db_session: Session):
    service = ContractService(db_session)
    contract = create_sample_cds_contract(service)
    cid = contract.contract_id

    # DRAFT -> ACTIVE is illegal (must go through PENDING_APPROVAL first)
    with pytest.raises(HTTPException) as exc:
        service.transition_state(
            cid,
            ContractStatus.ACTIVE,
            ContractTransitionRequest(expected_version=1, actor="Impatient Trader"),
        )
    assert exc.value.status_code == 409
    assert "Invalid lifecycle transition" in exc.value.detail


def test_optimistic_concurrency_conflict_on_transition(db_session: Session):
    service = ContractService(db_session)
    contract = create_sample_cds_contract(service)
    cid = contract.contract_id

    # Stale version provided (e.g. expected 999 instead of 1)
    with pytest.raises(HTTPException) as exc:
        service.transition_state(
            cid,
            ContractStatus.PENDING_APPROVAL,
            ContractTransitionRequest(expected_version=999, actor="Stale Client"),
        )
    assert exc.value.status_code == 409
    assert "Optimistic Concurrency Conflict" in exc.value.detail


def test_terms_update_blocked_outside_draft(db_session: Session):
    service = ContractService(db_session)
    contract = create_sample_cds_contract(service)
    cid = contract.contract_id

    # Transition to ACTIVE
    service.transition_state(cid, ContractStatus.PENDING_APPROVAL, ContractTransitionRequest(expected_version=1))
    service.transition_state(cid, ContractStatus.ACTIVE, ContractTransitionRequest(expected_version=2))

    # Try modifying terms when ACTIVE
    with pytest.raises(HTTPException) as exc:
        service.update_contract(
            cid,
            ContractUpdateRequest(
                counterparty="Modified Counterparty LLC",
                expected_version=3,
            ),
        )
    assert exc.value.status_code == 409
    assert "terms can only be modified while in DRAFT" in exc.value.detail
