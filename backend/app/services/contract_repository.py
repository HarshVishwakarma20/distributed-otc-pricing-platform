from datetime import date

from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from app.db.models import ContractAuditModel, ContractModel, ContractRevisionModel
from app.domain.enums import ContractStatus, InstrumentType


class ContractRepository:
    """
    SQLAlchemy repository providing transactional persistence for OTC contracts,
    immutable audit logs, and versioned revisions.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        contract: ContractModel,
        audit: ContractAuditModel,
        revision: ContractRevisionModel,
    ) -> ContractModel:
        """Atomically persist a new contract along with its initial audit event and revision snapshot."""
        try:
            self.db.add(contract)
            self.db.flush()  # Assign primary keys

            audit.contract_id = contract.contract_id
            revision.contract_id = contract.contract_id

            self.db.add(audit)
            self.db.add(revision)
            self.db.commit()
            self.db.refresh(contract)
            return contract
        except Exception:
            self.db.rollback()
            raise

    def get_by_contract_id(self, contract_id: str) -> ContractModel | None:
        """Fetch contract by business identifier (e.g. CNT-IRS-9A3F1B02)."""
        return (
            self.db.query(ContractModel)
            .filter(ContractModel.contract_id == contract_id)
            .first()
        )

    def save_mutation(
        self,
        contract: ContractModel,
        audit: ContractAuditModel,
        revision: ContractRevisionModel,
    ) -> ContractModel:
        """Atomically persist contract update / state transition with audit log and revision."""
        try:
            self.db.add(contract)
            self.db.add(audit)
            self.db.add(revision)
            self.db.commit()
            self.db.refresh(contract)
            return contract
        except Exception:
            self.db.rollback()
            raise

    def list_contracts(
        self,
        search: str | None = None,
        instrument_type: InstrumentType | None = None,
        status: ContractStatus | None = None,
        counterparty: str | None = None,
        effective_from: date | None = None,
        maturity_to: date | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ContractModel], int]:
        """
        Query contracts with allowlisted sorting, pagination, and multi-parameter filtering.
        """
        query = self.db.query(ContractModel)

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    ContractModel.contract_id.ilike(pattern),
                    ContractModel.external_reference.ilike(pattern),
                    ContractModel.counterparty.ilike(pattern),
                )
            )

        if instrument_type:
            query = query.filter(ContractModel.instrument_type == instrument_type.value)

        if status:
            query = query.filter(ContractModel.status == status.value)

        if counterparty:
            query = query.filter(ContractModel.counterparty.ilike(f"%{counterparty.strip()}%"))

        if effective_from:
            query = query.filter(ContractModel.effective_date >= effective_from)

        if maturity_to:
            query = query.filter(ContractModel.maturity_date <= maturity_to)

        total = query.count()

        # Sorting with allowlist
        sort_column_map = {
            "created_at": ContractModel.created_at,
            "updated_at": ContractModel.updated_at,
            "contract_id": ContractModel.contract_id,
            "notional": ContractModel.notional,
            "effective_date": ContractModel.effective_date,
            "maturity_date": ContractModel.maturity_date,
            "counterparty": ContractModel.counterparty,
            "status": ContractModel.status,
        }
        col = sort_column_map.get(sort_by, ContractModel.created_at)
        query = query.order_by(desc(col) if sort_order.lower() == "desc" else asc(col))

        # Pagination
        offset = max(0, (page - 1) * page_size)
        items = query.offset(offset).limit(page_size).all()

        return items, total

    def get_audit_events(self, contract_id: str) -> list[ContractAuditModel]:
        """Fetch chronological immutable audit trail for a contract."""
        return (
            self.db.query(ContractAuditModel)
            .filter(ContractAuditModel.contract_id == contract_id)
            .order_by(asc(ContractAuditModel.timestamp))
            .all()
        )

    def get_revisions(self, contract_id: str) -> list[ContractRevisionModel]:
        """Fetch versioned snapshots for a contract."""
        return (
            self.db.query(ContractRevisionModel)
            .filter(ContractRevisionModel.contract_id == contract_id)
            .order_by(asc(ContractRevisionModel.version))
            .all()
        )

    def count_active(self) -> int:
        """Count active contracts in the database."""
        return (
            self.db.query(func.count(ContractModel.id))
            .filter(ContractModel.status == ContractStatus.ACTIVE.value)
            .scalar()
            or 0
        )
