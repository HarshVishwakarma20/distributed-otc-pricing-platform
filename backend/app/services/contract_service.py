import datetime
import uuid
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import ContractAuditModel, ContractModel, ContractRevisionModel
from app.domain.enums import (
    AuditEventType,
    ContractStatus,
    InstrumentType,
)
from app.domain.schemas import (
    ContractAuditResponse,
    ContractCreateRequest,
    ContractDetailResponse,
    ContractPaginationResponse,
    ContractRevisionResponse,
    ContractTransitionRequest,
    ContractUpdateRequest,
)
from app.services.contract_repository import ContractRepository

# Explicit, centralized state transition matrix
VALID_TRANSITIONS: dict[str, set[str]] = {
    ContractStatus.DRAFT.value: {
        ContractStatus.PENDING_APPROVAL.value,
        ContractStatus.CANCELLED.value,
    },
    ContractStatus.PENDING_APPROVAL.value: {
        ContractStatus.ACTIVE.value,
        ContractStatus.REJECTED.value,
        ContractStatus.DRAFT.value,
    },
    ContractStatus.ACTIVE.value: {
        ContractStatus.MATURED.value,
        ContractStatus.CANCELLED.value,
    },
    ContractStatus.REJECTED.value: {
        ContractStatus.DRAFT.value,
    },
    ContractStatus.MATURED.value: set(),  # Terminal
    ContractStatus.CANCELLED.value: set(),  # Terminal
}

TYPE_PREFIX_MAP: dict[InstrumentType, str] = {
    InstrumentType.INTEREST_RATE_SWAP: "IRS",
    InstrumentType.EUROPEAN_OPTION: "OPT",
    InstrumentType.CURRENCY_SWAP: "FXS",
    InstrumentType.CREDIT_DEFAULT_SWAP: "CDS",
    InstrumentType.FX_FORWARD: "FXF",
    InstrumentType.EQUITY_VARIANCE_SWAP: "VAR",
}


def _extract_common_terms(
    instrument_type: InstrumentType,
    irs_terms: Any,
    option_terms: Any,
    currency_swap_terms: Any,
    cds_terms: Any,
) -> tuple[Decimal, str, Any, Any, dict[str, Any]]:
    """Extract standard header attributes (notional, currency, effective_date, maturity_date, terms_dict)."""
    if instrument_type == InstrumentType.INTEREST_RATE_SWAP and irs_terms:
        notional = irs_terms.notional
        currency = irs_terms.currency.upper()
        effective_date = irs_terms.effective_date
        maturity_date = irs_terms.maturity_date
        terms_dict = irs_terms.model_dump(mode="json")
    elif instrument_type == InstrumentType.EUROPEAN_OPTION and option_terms:
        notional = option_terms.notional
        currency = option_terms.currency.upper()
        effective_date = option_terms.trade_date
        maturity_date = option_terms.expiration_date
        terms_dict = option_terms.model_dump(mode="json")
    elif instrument_type == InstrumentType.CURRENCY_SWAP and currency_swap_terms:
        notional = currency_swap_terms.pay_notional
        currency = currency_swap_terms.pay_currency.upper()
        effective_date = currency_swap_terms.effective_date
        maturity_date = currency_swap_terms.maturity_date
        terms_dict = currency_swap_terms.model_dump(mode="json")
    elif instrument_type == InstrumentType.CREDIT_DEFAULT_SWAP and cds_terms:
        notional = cds_terms.notional
        currency = cds_terms.currency.upper()
        effective_date = cds_terms.effective_date
        maturity_date = cds_terms.maturity_date
        terms_dict = cds_terms.model_dump(mode="json")
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Incompatible specification payload for instrument type '{instrument_type.value}'",
        )

    return notional, currency, effective_date, maturity_date, terms_dict


class ContractService:
    """
    Core domain service managing OTC contract lifecycle, integrity validation,
    optimistic concurrency, and audit trails.
    """

    def __init__(self, db: Session) -> None:
        self.repo = ContractRepository(db)

    def create_contract(
        self,
        request: ContractCreateRequest,
        actor: str = "Trade Capture System",
    ) -> ContractDetailResponse:
        """Create a new contract in initial DRAFT state with immutable audit record and revision #1."""
        prefix = TYPE_PREFIX_MAP.get(request.instrument_type, "OTC")
        contract_id = f"CNT-{prefix}-{uuid.uuid4().hex[:8].upper()}"

        notional, currency, effective_date, maturity_date, terms_dict = _extract_common_terms(
            request.instrument_type,
            request.irs_terms,
            request.option_terms,
            request.currency_swap_terms,
            request.cds_terms,
        )

        now = datetime.datetime.now(datetime.UTC)

        contract = ContractModel(
            contract_id=contract_id,
            external_reference=request.external_reference,
            instrument_type=request.instrument_type.value,
            counterparty=request.counterparty,
            notional=notional,
            currency=currency,
            effective_date=effective_date,
            maturity_date=maturity_date,
            status=ContractStatus.DRAFT.value,
            version=1,
            terms=terms_dict,
            created_at=now,
            updated_at=now,
        )

        audit = ContractAuditModel(
            event_id=f"EVT-AUD-{uuid.uuid4().hex[:8].upper()}",
            contract_id=contract_id,
            event_type=AuditEventType.CREATED.value,
            from_status=None,
            to_status=ContractStatus.DRAFT.value,
            actor=actor,
            timestamp=now,
            diff={"initial_terms": terms_dict},
            reason="Initial contract origination and capture",
            version=1,
        )

        revision = ContractRevisionModel(
            contract_id=contract_id,
            version=1,
            status=ContractStatus.DRAFT.value,
            snapshot=self._build_snapshot(contract),
            created_at=now,
            changed_by=actor,
            reason="Contract creation snapshot",
        )

        saved = self.repo.create(contract, audit, revision)
        return self._to_detail_response(saved)

    def get_contract(self, contract_id: str) -> ContractDetailResponse:
        """Retrieve contract by ID or raise HTTP 404."""
        contract = self.repo.get_by_contract_id(contract_id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contract '{contract_id}' not found in registry",
            )
        return self._to_detail_response(contract)

    def update_contract(
        self,
        contract_id: str,
        request: ContractUpdateRequest,
        actor: str = "Trade Operator",
    ) -> ContractDetailResponse:
        """
        Update contract terms. Permitted ONLY in DRAFT state.
        Enforces optimistic concurrency control via expected_version.
        """
        contract = self.repo.get_by_contract_id(contract_id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contract '{contract_id}' not found in registry",
            )

        # 1. State check: Terms can only be modified while in DRAFT
        if contract.status != ContractStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Contract terms can only be modified while in DRAFT state. Current status is '{contract.status}'.",
            )

        # 2. Optimistic Concurrency Control
        if contract.version != request.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Optimistic Concurrency Conflict: Contract '{contract_id}' has been updated concurrently. Expected version {request.expected_version}, but current version is {contract.version}.",
            )

        diff: dict[str, Any] = {}
        if request.counterparty is not None and contract.counterparty != request.counterparty:
            diff["counterparty"] = {"old": contract.counterparty, "new": request.counterparty}
            contract.counterparty = request.counterparty
        if request.external_reference is not None and contract.external_reference != request.external_reference:
            diff["external_reference"] = {"old": contract.external_reference, "new": request.external_reference}
            contract.external_reference = request.external_reference

        # If updated instrument terms are specified, extract and record diff
        has_new_terms = any([
            request.irs_terms,
            request.option_terms,
            request.currency_swap_terms,
            request.cds_terms,
        ])
        if has_new_terms:
            itype = InstrumentType(contract.instrument_type)
            notional, currency, effective_date, maturity_date, terms_dict = _extract_common_terms(
                itype,
                request.irs_terms,
                request.option_terms,
                request.currency_swap_terms,
                request.cds_terms,
            )
            diff["terms"] = {"old": contract.terms, "new": terms_dict}
            diff["notional"] = {"old": float(contract.notional), "new": float(notional)}
            contract.notional = notional
            contract.currency = currency
            contract.effective_date = effective_date
            contract.maturity_date = maturity_date
            contract.terms = terms_dict

        contract.version += 1
        now = datetime.datetime.now(datetime.UTC)
        contract.updated_at = now

        audit = ContractAuditModel(
            event_id=f"EVT-AUD-{uuid.uuid4().hex[:8].upper()}",
            contract_id=contract_id,
            event_type=AuditEventType.UPDATED.value,
            from_status=contract.status,
            to_status=contract.status,
            actor=actor,
            timestamp=now,
            diff=diff,
            reason=request.reason or "Contract terms update",
            version=contract.version,
        )

        revision = ContractRevisionModel(
            contract_id=contract_id,
            version=contract.version,
            status=contract.status,
            snapshot=self._build_snapshot(contract),
            created_at=now,
            changed_by=actor,
            reason=request.reason or "Terms updated",
        )

        saved = self.repo.save_mutation(contract, audit, revision)
        return self._to_detail_response(saved)

    def transition_state(
        self,
        contract_id: str,
        target_status: ContractStatus,
        request: ContractTransitionRequest,
    ) -> ContractDetailResponse:
        """
        Execute an explicit lifecycle transition with strict state-machine validation,
        optimistic concurrency check, and atomic audit log recording.
        """
        contract = self.repo.get_by_contract_id(contract_id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contract '{contract_id}' not found in registry",
            )

        current_status = contract.status
        allowed = VALID_TRANSITIONS.get(current_status, set())

        # 1. State transition validation
        if target_status.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Invalid lifecycle transition: Cannot transition contract from '{current_status}' "
                    f"to '{target_status.value}'. Allowed transitions: {sorted(list(allowed)) or 'None (Terminal state)'}."
                ),
            )

        # 2. Optimistic Concurrency Check
        if contract.version != request.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Optimistic Concurrency Conflict: Contract '{contract_id}' has been updated concurrently. "
                    f"Expected version {request.expected_version}, but current version is {contract.version}."
                ),
            )

        now = datetime.datetime.now(datetime.UTC)
        contract.status = target_status.value
        contract.version += 1
        contract.updated_at = now

        audit = ContractAuditModel(
            event_id=f"EVT-AUD-{uuid.uuid4().hex[:8].upper()}",
            contract_id=contract_id,
            event_type=AuditEventType.STATUS_CHANGED.value,
            from_status=current_status,
            to_status=target_status.value,
            actor=request.actor,
            timestamp=now,
            diff={"status": {"from": current_status, "to": target_status.value}},
            reason=request.reason or f"Transition to {target_status.value}",
            version=contract.version,
        )

        revision = ContractRevisionModel(
            contract_id=contract_id,
            version=contract.version,
            status=target_status.value,
            snapshot=self._build_snapshot(contract),
            created_at=now,
            changed_by=request.actor,
            reason=request.reason or f"State transition to {target_status.value}",
        )

        saved = self.repo.save_mutation(contract, audit, revision)
        return self._to_detail_response(saved)

    def list_contracts(
        self,
        search: str | None = None,
        instrument_type: InstrumentType | None = None,
        status: ContractStatus | None = None,
        counterparty: str | None = None,
        effective_from: Any = None,
        maturity_to: Any = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> ContractPaginationResponse:
        """List contracts with filtering, pagination, and sorting."""
        page_size = min(max(1, page_size), 100)  # Bound between 1 and 100
        page = max(1, page)

        items, total = self.repo.list_contracts(
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

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return ContractPaginationResponse(
            items=[self._to_detail_response(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def get_audit_trail(self, contract_id: str) -> list[ContractAuditResponse]:
        """Fetch chronological audit logs for a contract."""
        self.get_contract(contract_id)  # Validate existence
        events = self.repo.get_audit_events(contract_id)
        return [
            ContractAuditResponse(
                event_id=e.event_id,
                contract_id=e.contract_id,
                event_type=e.event_type,
                from_status=e.from_status,
                to_status=e.to_status,
                actor=e.actor,
                timestamp=e.timestamp.isoformat(),
                diff=e.diff,
                reason=e.reason,
                version=e.version,
            )
            for e in events
        ]

    def get_revisions(self, contract_id: str) -> list[ContractRevisionResponse]:
        """Fetch versioned snapshots for a contract."""
        self.get_contract(contract_id)  # Validate existence
        revs = self.repo.get_revisions(contract_id)
        return [
            ContractRevisionResponse(
                revision_id=r.id,
                contract_id=r.contract_id,
                version=r.version,
                status=ContractStatus(r.status),
                snapshot=r.snapshot,
                created_at=r.created_at.isoformat(),
                changed_by=r.changed_by,
                reason=r.reason,
            )
            for r in revs
        ]

    def _build_snapshot(self, contract: ContractModel) -> dict[str, Any]:
        return {
            "contract_id": contract.contract_id,
            "external_reference": contract.external_reference,
            "instrument_type": contract.instrument_type,
            "counterparty": contract.counterparty,
            "notional": float(contract.notional),
            "currency": contract.currency,
            "effective_date": contract.effective_date.isoformat(),
            "maturity_date": contract.maturity_date.isoformat(),
            "status": contract.status,
            "version": contract.version,
            "terms": contract.terms,
        }

    def _to_detail_response(self, model: ContractModel) -> ContractDetailResponse:
        return ContractDetailResponse(
            contract_id=model.contract_id,
            external_reference=model.external_reference,
            counterparty=model.counterparty,
            instrument_type=InstrumentType(model.instrument_type),
            status=ContractStatus(model.status),
            version=model.version,
            notional=float(model.notional),
            currency=model.currency,
            effective_date=model.effective_date.isoformat(),
            maturity_date=model.maturity_date.isoformat(),
            terms=model.terms,
            created_at=model.created_at.isoformat(),
            updated_at=model.updated_at.isoformat(),
        )
