import datetime

from sqlalchemy import (
    JSON,
    Column,
    Date,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)

from app.db.session import Base


class ContractModel(Base):
    """
    Persistent OTC Derivative Contract Registry entity.
    Stores common contractual headers and JSON-serialized typed instrument specifications.
    """
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(String(50), unique=True, index=True, nullable=False)
    external_reference = Column(String(100), index=True, nullable=True)
    instrument_type = Column(String(50), index=True, nullable=False)
    counterparty = Column(String(150), index=True, nullable=False)
    notional = Column(Numeric(24, 4), nullable=False)
    currency = Column(String(3), nullable=False)
    effective_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)
    status = Column(String(30), index=True, nullable=False, default="DRAFT")
    version = Column(Integer, nullable=False, default=1)
    terms = Column(JSON, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.UTC),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.UTC),
        onupdate=lambda: datetime.datetime.now(datetime.UTC),
    )

    __table_args__ = (
        Index("ix_contracts_counterparty_status", "counterparty", "status"),
        Index("ix_contracts_dates", "effective_date", "maturity_date"),
    )


class ContractAuditModel(Base):
    """
    Immutable audit log recording contract creation, updates, and lifecycle transitions.
    """
    __tablename__ = "contract_audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(50), unique=True, nullable=False)
    contract_id = Column(String(50), index=True, nullable=False)
    event_type = Column(String(30), nullable=False)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=True)
    actor = Column(String(100), nullable=False)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.UTC),
    )
    diff = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    version = Column(Integer, nullable=False)

    __table_args__ = (
        Index("ix_contract_audit_contract_timestamp", "contract_id", "timestamp"),
    )


class ContractRevisionModel(Base):
    """
    Immutable snapshots of full contract states created on terms modification or activation.
    """
    __tablename__ = "contract_revisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(String(50), index=True, nullable=False)
    version = Column(Integer, nullable=False)
    status = Column(String(30), nullable=False)
    snapshot = Column(JSON, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.UTC),
    )
    changed_by = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_contract_revisions_contract_version", "contract_id", "version", unique=True),
    )


class ValuationModel(Base):
    """
    Module 3 Persistent Valuation Record entity.
    Stores immutable quantitative valuation results, present value, Greeks,
    market snapshot references, and model execution assumptions.
    Pricing a contract NEVER mutates the contract record itself.
    """
    __tablename__ = "valuations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    valuation_id = Column(String(50), unique=True, index=True, nullable=False)
    contract_id = Column(String(50), index=True, nullable=False)
    contract_version = Column(Integer, nullable=False)
    instrument_type = Column(String(50), index=True, nullable=False)
    model_id = Column(String(50), index=True, nullable=False)
    valuation_date = Column(Date, nullable=False)
    present_value = Column(Numeric(24, 4), nullable=False)
    currency = Column(String(3), nullable=False)
    greeks = Column(JSON, nullable=True)
    market_snapshot = Column(JSON, nullable=True)
    assumptions = Column(JSON, nullable=True)
    warnings = Column(JSON, nullable=True)
    cashflows = Column(JSON, nullable=True)
    status = Column(String(30), nullable=False, default="Completed")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.UTC),
    )

    __table_args__ = (
        Index("ix_valuations_contract_date", "contract_id", "valuation_date"),
        Index("ix_valuations_model_status", "model_id", "status"),
    )

