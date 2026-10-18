from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import check_db_health, get_db
from app.domain.enums import ContractStatus, InstrumentType
from app.domain.schemas import (
    ContractAuditResponse,
    ContractCreateRequest,
    ContractDetailResponse,
    ContractPaginationResponse,
    ContractRevisionResponse,
    ContractSummary,
    ContractTransitionRequest,
    ContractUpdateRequest,
)
from app.services.contract_service import ContractService
from app.services.mock_provider import default_mock_provider

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.get("/meta/health", tags=["Contracts"])
def get_contracts_db_health() -> dict:
    """Return database connection status and storage engine telemetry."""
    return check_db_health()


@router.get("/summary/legacy", response_model=list[ContractSummary], tags=["Contracts"])
def list_contracts_summary() -> list[ContractSummary]:
    """Legacy summary list preserved for Module 1 backward compatibility."""
    return default_mock_provider.get_contracts()


@router.get("", response_model=ContractPaginationResponse, tags=["Contracts"])
def list_contracts(
    search: str | None = Query(default=None, description="Search query across ID, ext ref, and counterparty"),
    instrument_type: InstrumentType | None = Query(default=None, description="Filter by instrument type"),
    status: ContractStatus | None = Query(default=None, description="Filter by lifecycle state"),
    counterparty: str | None = Query(default=None, description="Filter by counterparty name"),
    effective_from: date | None = Query(default=None, description="Filter by effective date on or after"),
    maturity_to: date | None = Query(default=None, description="Filter by maturity date on or before"),
    sort_by: str = Query(default="created_at", description="Sort field (created_at, notional, effective_date, etc.)"),
    sort_order: str = Query(default="desc", description="Sort direction (asc, desc)"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size (max 100)"),
    db: Session = Depends(get_db),
) -> ContractPaginationResponse:
    """List and filter persistent contracts with pagination and sorting."""
    service = ContractService(db)
    return service.list_contracts(
        search=search,
        instrument_type=instrument_type,
        status=status,
        counterparty=counterparty,
        effective_from=effective_from,
        maturity_to=maturity_to,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ContractDetailResponse, status_code=status.HTTP_201_CREATED, tags=["Contracts"])
def create_contract(
    request: ContractCreateRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Stage a new OTC contract in DRAFT state with validated terms and initial audit record."""
    service = ContractService(db)
    return service.create_contract(request)


@router.get("/{contract_id}", response_model=ContractDetailResponse, tags=["Contracts"])
def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Retrieve full contract details and instrument specifications by contract ID."""
    service = ContractService(db)
    return service.get_contract(contract_id)


@router.patch("/{contract_id}", response_model=ContractDetailResponse, tags=["Contracts"])
def update_contract(
    contract_id: str,
    request: ContractUpdateRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """
    Update contract terms. Only permitted in DRAFT state.
    Enforces optimistic concurrency control using expected_version.
    """
    service = ContractService(db)
    return service.update_contract(contract_id, request)


@router.post("/{contract_id}/submit", response_model=ContractDetailResponse, tags=["Contracts Lifecycle"])
def submit_contract_for_approval(
    contract_id: str,
    request: ContractTransitionRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Transition contract: DRAFT -> PENDING_APPROVAL."""
    service = ContractService(db)
    return service.transition_state(contract_id, ContractStatus.PENDING_APPROVAL, request)


@router.post("/{contract_id}/activate", response_model=ContractDetailResponse, tags=["Contracts Lifecycle"])
def activate_contract(
    contract_id: str,
    request: ContractTransitionRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Transition contract: PENDING_APPROVAL -> ACTIVE."""
    service = ContractService(db)
    return service.transition_state(contract_id, ContractStatus.ACTIVE, request)


@router.post("/{contract_id}/reject", response_model=ContractDetailResponse, tags=["Contracts Lifecycle"])
def reject_contract(
    contract_id: str,
    request: ContractTransitionRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Transition contract: PENDING_APPROVAL -> REJECTED."""
    service = ContractService(db)
    return service.transition_state(contract_id, ContractStatus.REJECTED, request)


@router.post("/{contract_id}/return-to-draft", response_model=ContractDetailResponse, tags=["Contracts Lifecycle"])
def return_contract_to_draft(
    contract_id: str,
    request: ContractTransitionRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Transition contract: PENDING_APPROVAL or REJECTED -> DRAFT."""
    service = ContractService(db)
    return service.transition_state(contract_id, ContractStatus.DRAFT, request)


@router.post("/{contract_id}/mature", response_model=ContractDetailResponse, tags=["Contracts Lifecycle"])
def mature_contract(
    contract_id: str,
    request: ContractTransitionRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Transition contract: ACTIVE -> MATURED (Terminal State)."""
    service = ContractService(db)
    return service.transition_state(contract_id, ContractStatus.MATURED, request)


@router.post("/{contract_id}/cancel", response_model=ContractDetailResponse, tags=["Contracts Lifecycle"])
def cancel_contract(
    contract_id: str,
    request: ContractTransitionRequest,
    db: Session = Depends(get_db),
) -> ContractDetailResponse:
    """Transition contract: DRAFT or ACTIVE -> CANCELLED (Terminal State)."""
    service = ContractService(db)
    return service.transition_state(contract_id, ContractStatus.CANCELLED, request)


@router.get("/{contract_id}/audit", response_model=list[ContractAuditResponse], tags=["Contracts Audit"])
def get_contract_audit_trail(
    contract_id: str,
    db: Session = Depends(get_db),
) -> list[ContractAuditResponse]:
    """Retrieve chronological immutable audit event trail for a contract."""
    service = ContractService(db)
    return service.get_audit_trail(contract_id)


@router.get("/{contract_id}/revisions", response_model=list[ContractRevisionResponse], tags=["Contracts Audit"])
def get_contract_revisions(
    contract_id: str,
    db: Session = Depends(get_db),
) -> list[ContractRevisionResponse]:
    """Retrieve versioned historical snapshots of contract states."""
    service = ContractService(db)
    return service.get_revisions(contract_id)
