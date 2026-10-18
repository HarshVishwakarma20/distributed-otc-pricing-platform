from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.domain.enums import (
    ActivitySeverity,
    AuditEventType,
    BusinessDayConvention,
    CDSDirection,
    ContractStatus,
    DayCountConvention,
    ExerciseStyle,
    FixedPayer,
    InstrumentType,
    JobStatus,
    LegRateType,
    OptionType,
    PaymentFrequency,
    PositionDirection,
    PrincipalExchange,
    RestructuringClause,
    ServiceHealthStatus,
    SettlementType,
    SimulationType,
    ValuationStatus,
)

# ============================================================================
# Instrument-Specific Specifications (Module 2 Domain Modeling)
# ============================================================================

class IRSSpec(BaseModel):
    """Interest Rate Swap specific terms (Dual-leg fixed vs floating)."""
    notional: Decimal = Field(..., gt=0, description="Gross notional principal amount")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="ISO 4217 Currency Code")
    effective_date: date = Field(..., description="Swap start / accrual date")
    maturity_date: date = Field(..., description="Swap termination date")
    fixed_rate: Decimal = Field(..., ge=0, description="Fixed coupon rate in percentage points (e.g. 3.85 for 3.85%)")
    floating_index: str = Field(..., min_length=2, description="Floating reference benchmark index (e.g. SOFR, EURIBOR 6M)")
    fixed_leg_payer: FixedPayer = Field(default=FixedPayer.PAY_FIXED, description="Payer direction of the fixed coupon leg")
    fixed_frequency: PaymentFrequency = Field(default=PaymentFrequency.SEMI_ANNUAL, description="Fixed leg payment frequency")
    floating_frequency: PaymentFrequency = Field(default=PaymentFrequency.QUARTERLY, description="Floating leg reset & payment frequency")
    day_count_convention: DayCountConvention = Field(default=DayCountConvention.ACT_360, description="Day count fraction convention")
    business_day_convention: BusinessDayConvention = Field(default=BusinessDayConvention.MODIFIED_FOLLOWING, description="Roll-date adjustment rule")
    settlement_calendar: str = Field(default="US_NY", description="Holiday settlement calendar (e.g. US_NY, TARGET, GB_LON)")

    @model_validator(mode="after")
    def validate_dates(self) -> "IRSSpec":
        if self.maturity_date <= self.effective_date:
            raise ValueError(f"maturity_date ({self.maturity_date}) must be strictly after effective_date ({self.effective_date})")
        return self


class EuropeanOptionSpec(BaseModel):
    """European Option specific terms (Underlying asset with single terminal exercise)."""
    underlying_asset: str = Field(..., min_length=1, description="Underlying equity, index or commodity symbol (e.g. SPX, AAPL)")
    option_type: OptionType = Field(..., description="CALL or PUT")
    exercise_style: ExerciseStyle = Field(default=ExerciseStyle.EUROPEAN, description="Exercise style constraint (EUROPEAN only in M2)")
    strike_price: Decimal = Field(..., gt=0, description="Option strike price per unit")
    premium: Decimal = Field(..., ge=0, description="Upfront trade premium amount")
    notional: Decimal = Field(..., gt=0, description="Underlying contract notional face value")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="ISO 4217 Currency Code")
    trade_date: date = Field(..., description="Option execution trade date")
    expiration_date: date = Field(..., description="Option maturity / expiration date")
    settlement_type: SettlementType = Field(default=SettlementType.CASH, description="CASH or PHYSICAL settlement")
    position_direction: PositionDirection = Field(default=PositionDirection.BUY, description="BUY (Long) or SELL (Short)")

    @model_validator(mode="after")
    def validate_dates(self) -> "EuropeanOptionSpec":
        if self.expiration_date < self.trade_date:
            raise ValueError(f"expiration_date ({self.expiration_date}) cannot be before trade_date ({self.trade_date})")
        return self


class CurrencySwapSpec(BaseModel):
    """Cross-Currency Swap specific terms (Dual-currency principal & coupon exchanges)."""
    pay_currency: str = Field(..., min_length=3, max_length=3, description="Currency paid by party A")
    receive_currency: str = Field(..., min_length=3, max_length=3, description="Currency received by party A")
    pay_notional: Decimal = Field(..., gt=0, description="Principal notional in pay currency")
    receive_notional: Decimal = Field(..., gt=0, description="Principal notional in receive currency")
    fx_exchange_rate: Decimal | None = Field(default=None, gt=0, description="Agreed initial exchange rate (pay/receive)")
    effective_date: date = Field(..., description="Swap effective date")
    maturity_date: date = Field(..., description="Swap maturity date")
    pay_leg_rate_type: LegRateType = Field(default=LegRateType.FIXED, description="Rate type for pay leg")
    receive_leg_rate_type: LegRateType = Field(default=LegRateType.FLOATING, description="Rate type for receive leg")
    pay_fixed_rate: Decimal | None = Field(default=None, ge=0, description="Fixed rate if pay leg is fixed")
    receive_fixed_rate: Decimal | None = Field(default=None, ge=0, description="Fixed rate if receive leg is fixed")
    pay_floating_index: str | None = Field(default=None, description="Floating index if pay leg is floating")
    receive_floating_index: str | None = Field(default=None, description="Floating index if receive leg is floating")
    payment_frequency: PaymentFrequency = Field(default=PaymentFrequency.SEMI_ANNUAL, description="Payment frequency")
    principal_exchange: PrincipalExchange = Field(default=PrincipalExchange.INITIAL_AND_FINAL, description="Principal exchange terms")
    day_count_convention: DayCountConvention = Field(default=DayCountConvention.ACT_360, description="Day count convention")

    @model_validator(mode="after")
    def validate_swap_terms(self) -> "CurrencySwapSpec":
        if self.maturity_date <= self.effective_date:
            raise ValueError(f"maturity_date ({self.maturity_date}) must be after effective_date ({self.effective_date})")
        if self.pay_currency.upper() == self.receive_currency.upper():
            raise ValueError("pay_currency and receive_currency must be distinct for a Currency Swap")
        if self.pay_leg_rate_type == LegRateType.FIXED and self.pay_fixed_rate is None:
            raise ValueError("pay_fixed_rate must be provided when pay_leg_rate_type is FIXED")
        if self.receive_leg_rate_type == LegRateType.FIXED and self.receive_fixed_rate is None:
            raise ValueError("receive_fixed_rate must be provided when receive_leg_rate_type is FIXED")
        if self.pay_leg_rate_type == LegRateType.FLOATING and not self.pay_floating_index:
            raise ValueError("pay_floating_index must be specified when pay_leg_rate_type is FLOATING")
        if self.receive_leg_rate_type == LegRateType.FLOATING and not self.receive_floating_index:
            raise ValueError("receive_floating_index must be specified when receive_leg_rate_type is FLOATING")
        return self


class CDSSpec(BaseModel):
    """Credit Default Swap specific terms (Single-name credit protection contract)."""
    reference_entity: str = Field(..., min_length=2, description="Obligor reference entity (e.g. Ford Motor Credit Co LLC)")
    direction: CDSDirection = Field(default=CDSDirection.BUY_PROTECTION, description="BUY_PROTECTION or SELL_PROTECTION")
    notional: Decimal = Field(..., gt=0, description="Credit protection face notional")
    spread_bps: Decimal = Field(..., gt=0, description="Contract coupon spread in basis points (e.g. 100.0 for 100 bps)")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="ISO 4217 Currency Code")
    effective_date: date = Field(..., description="Protection start date")
    maturity_date: date = Field(..., description="Scheduled contract termination date")
    premium_frequency: PaymentFrequency = Field(default=PaymentFrequency.QUARTERLY, description="Coupon payment frequency")
    day_count_convention: DayCountConvention = Field(default=DayCountConvention.ACT_360, description="Day count fraction convention")
    restructuring_clause: RestructuringClause = Field(default=RestructuringClause.CR, description="ISDA Restructuring clause (CR, MR, MM, XR)")

    @model_validator(mode="after")
    def validate_dates(self) -> "CDSSpec":
        if self.maturity_date <= self.effective_date:
            raise ValueError(f"maturity_date ({self.maturity_date}) must be after effective_date ({self.effective_date})")
        return self


# ============================================================================
# Contract Lifecycle & Registry Schemas (Module 2 CRUD & State Machine)
# ============================================================================

class ContractCreateRequest(BaseModel):
    """Payload to stage a new OTC derivative contract in DRAFT state."""
    instrument_type: InstrumentType
    counterparty: str = Field(..., min_length=2, max_length=150, description="Legal entity name of the bilateral counterparty")
    external_reference: str | None = Field(default=None, max_length=100, description="Optional external trade/booking reference ID")
    
    # Exactly one matching specification block must be supplied:
    irs_terms: IRSSpec | None = None
    option_terms: EuropeanOptionSpec | None = None
    currency_swap_terms: CurrencySwapSpec | None = None
    cds_terms: CDSSpec | None = None

    @model_validator(mode="after")
    def validate_matching_spec(self) -> "ContractCreateRequest":
        itype = self.instrument_type
        if itype == InstrumentType.INTEREST_RATE_SWAP and not self.irs_terms:
            raise ValueError("irs_terms must be provided when instrument_type is 'Interest Rate Swap'")
        elif itype == InstrumentType.EUROPEAN_OPTION and not self.option_terms:
            raise ValueError("option_terms must be provided when instrument_type is 'European Option'")
        elif itype == InstrumentType.CURRENCY_SWAP and not self.currency_swap_terms:
            raise ValueError("currency_swap_terms must be provided when instrument_type is 'Currency Swap'")
        elif itype == InstrumentType.CREDIT_DEFAULT_SWAP and not self.cds_terms:
            raise ValueError("cds_terms must be provided when instrument_type is 'Credit Default Swap'")
        return self


class ContractUpdateRequest(BaseModel):
    """Payload to update terms of a contract while in DRAFT state."""
    counterparty: str | None = Field(default=None, min_length=2, max_length=150)
    external_reference: str | None = Field(default=None, max_length=100)
    irs_terms: IRSSpec | None = None
    option_terms: EuropeanOptionSpec | None = None
    currency_swap_terms: CurrencySwapSpec | None = None
    cds_terms: CDSSpec | None = None
    expected_version: int = Field(..., description="Optimistic concurrency control: expected current version")
    reason: str | None = Field(default=None, max_length=500, description="Reason for terms modification")


class ContractTransitionRequest(BaseModel):
    """Payload to trigger an explicit lifecycle transition."""
    expected_version: int = Field(..., description="Optimistic concurrency control: expected current version")
    actor: str = Field(default="Risk Operator", description="User or service performing the transition")
    reason: str | None = Field(default=None, max_length=500, description="Operational justification for the state change")


class ContractDetailResponse(BaseModel):
    """Full contract response including common attributes, status, and typed terms."""
    contract_id: str
    external_reference: str | None = None
    counterparty: str
    instrument_type: InstrumentType
    status: ContractStatus
    version: int
    notional: float
    currency: str
    effective_date: str
    maturity_date: str
    terms: dict[str, Any]
    created_at: str
    updated_at: str


class ContractAuditResponse(BaseModel):
    """Immutable audit record entry."""
    event_id: str
    contract_id: str
    event_type: AuditEventType
    from_status: str | None = None
    to_status: str | None = None
    actor: str
    timestamp: str
    diff: dict[str, Any] | None = None
    reason: str | None = None
    version: int


class ContractRevisionResponse(BaseModel):
    """Full snapshot of contract state at a specific version."""
    revision_id: int
    contract_id: str
    version: int
    status: ContractStatus
    snapshot: dict[str, Any]
    created_at: str
    changed_by: str
    reason: str | None = None


class ContractPaginationResponse(BaseModel):
    """Standard pagination wrapper for contract listings."""
    items: list[ContractDetailResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Preserved Module 1 Analytics & Dashboard Schemas
# ============================================================================

class KPISummary(BaseModel):
    total_notional: float = Field(..., description="Total aggregate portfolio notional in USD")
    total_market_value: float = Field(..., description="Net portfolio mark-to-market value in USD")
    active_contracts: int = Field(..., description="Count of live, active OTC contracts")
    daily_pnl: float = Field(..., description="Single-day estimated profit and loss")
    daily_pnl_pct: float = Field(..., description="Single-day P&L percentage change")
    simulated_var_95_1d: float = Field(..., description="Simulated 1-day 95% Value at Risk (illustrative)")
    active_simulation_jobs: int = Field(..., description="Number of currently executing or queued simulation jobs")
    currency: str = Field(default="USD", description="Base reporting currency")
    valuation_timestamp: str = Field(..., description="ISO 8601 timestamp of market snapshot")
    is_demo_data: bool = Field(default=True, description="Indicates that all figures are synthetic demo values")


class ValueHistoryPoint(BaseModel):
    date: str
    market_value: float
    daily_pnl: float
    cumulative_pnl: float


class DashboardSummaryResponse(BaseModel):
    kpi: KPISummary
    value_history: list[ValueHistoryPoint]
    is_demo_data: bool = True


class PortfolioExposure(BaseModel):
    instrument_type: InstrumentType
    notional: float
    market_value: float
    delta_equivalent: float
    percentage_of_total: float
    contract_count: int


class ValuationSummary(BaseModel):
    valuation_id: str
    contract_id: str
    instrument: InstrumentType
    valuation_timestamp: str
    market_value: float
    currency: str
    model_used: str
    status: ValuationStatus
    pv01: float
    dv01: float


class SimulationJobSummary(BaseModel):
    job_id: str
    simulation_type: SimulationType
    status: JobStatus
    progress: float
    paths: int
    time_steps: int
    elapsed_sec: float
    submitted_time: str


class ActivityEvent(BaseModel):
    event_id: str
    event_type: str
    title: str
    description: str
    timestamp: str
    severity: ActivitySeverity


class ServiceStatus(BaseModel):
    name: str
    status: ServiceHealthStatus
    latency_ms: float
    last_heartbeat: str
    details: str


class SystemHealthSummary(BaseModel):
    status: ServiceHealthStatus
    active_workers: int
    total_workers: int
    queue_depth: int
    cpu_load_pct: float
    memory_load_pct: float
    error_rate_pct: float
    services: list[ServiceStatus]
    is_demo_data: bool = True


class ContractSummary(BaseModel):
    """Preserved contract summary for Module 1 dashboard views."""
    contract_id: str
    counterparty: str
    instrument_type: InstrumentType
    notional: float
    currency: str
    start_date: str
    maturity_date: str
    status: ContractStatus
    fixed_rate: float | None = None
    floating_index: str | None = None
    market_value: float = 0.0


class PortfolioSummary(BaseModel):
    portfolio_id: str
    name: str
    base_currency: str
    total_notional: float
    market_value: float
    contracts_count: int
    risk_level: str


class YieldCurvePoint(BaseModel):
    tenor: str
    zero_rate: float
    par_yield: float
    discount_factor: float


class FXRateItem(BaseModel):
    pair: str
    spot_rate: float
    change_24h: float
    change_pct: float


class PricingWorkbenchRequest(BaseModel):
    instrument_type: InstrumentType
    notional: float
    currency: str = "USD"
    maturity_years: float = 1.0
    underlying_price: float | None = None
    strike_price: float | None = None
    volatility: float | None = None
    risk_free_rate: float | None = None
    fixed_rate: float | None = None
    counterparty: str = "Demo Global Markets LLC"


class PricingWorkbenchResponse(BaseModel):
    is_preview: bool = True
    notice: str = "This pricing calculation is a synthetic preview. Real pricing engine will be enabled in Module 3."
    estimated_pv: float
    currency: str
    parameters: dict[str, Any]
