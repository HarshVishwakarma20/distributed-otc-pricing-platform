from datetime import date
from decimal import Decimal

from app.domain.enums import InstrumentType
from pydantic import BaseModel, Field


class ModelMetadata(BaseModel):
    """Metadata describing a registered quantitative pricing model."""
    model_id: str = Field(..., description="Unique model code (e.g. BSM_EUROPEAN)")
    name: str = Field(..., description="Full academic/institutional name")
    version: str = Field(default="1.0.0", description="Model engine version")
    description: str = Field(..., description="Summary of mathematical approach and assumptions")
    supported_instruments: list[InstrumentType] = Field(..., description="Derivative types this model can price")
    required_market_inputs: list[str] = Field(..., description="Names of mandatory market inputs")
    supported_greeks: list[str] = Field(..., description="Greeks produced by this model")


class MarketInputsOverride(BaseModel):
    """
    Explicit what-if market scenario parameters.
    Keeps what-if stress inputs cleanly separated from contractual terms.
    """
    spot_price: float | None = Field(default=None, gt=0, description="Underlying spot price override S")
    volatility: float | None = Field(default=None, ge=0, description="Annualized implied volatility override sigma")
    risk_free_rate: float | None = Field(default=None, description="Risk-free continuous rate override r")
    dividend_yield: float | None = Field(default=None, ge=0, description="Continuous dividend/carry yield override q")
    hazard_rate: float | None = Field(default=None, ge=0, description="Credit hazard rate override lambda")
    recovery_rate: float | None = Field(default=None, ge=0, le=1.0, description="Credit recovery rate override R")
    fx_spot: float | None = Field(default=None, gt=0, description="FX spot rate override")
    yield_curve_shift_bps: float | None = Field(default=None, description="Parallel yield curve shift in basis points")


class PriceContractRequest(BaseModel):
    """
    Authoritative request to price an existing persistent Module 2 contract.
    Contractual terms are resolved directly from Module 2; client cannot override strike/maturity.
    """
    contract_id: str = Field(..., min_length=2, description="Target contract ID in Module 2 registry")
    contract_version: int = Field(..., description="Expected contract version for optimistic concurrency validation")
    model_id: str = Field(default="BSM_EUROPEAN", description="Quant model identifier")
    valuation_date: date = Field(..., description="Valuation evaluation date")
    market_overrides: MarketInputsOverride | None = Field(default=None, description="Optional what-if scenario shifts")


class GreeksResult(BaseModel):
    """
    Sensitivities / Greeks produced by the quantitative model.
    Units are stated explicitly to prevent institutional misinterpretation.
    """
    delta: float | None = Field(default=None, description="First derivative with respect to underlying spot price dV/dS")
    gamma: float | None = Field(default=None, description="Second derivative with respect to spot price d2V/dS2")
    vega: float | None = Field(default=None, description="Sensitivity to volatility dV/d(sigma)")
    vega_1pct: float | None = Field(default=None, description="Vega per 1 percentage point change in volatility (dV/d(sigma) * 0.01)")
    theta_per_year: float | None = Field(default=None, description="Time decay per year (-dV/dt)")
    theta_per_day: float | None = Field(default=None, description="Time decay per calendar day (theta / 365)")
    rho: float | None = Field(default=None, description="Sensitivity to interest rate dV/dr")
    rho_1pct: float | None = Field(default=None, description="Rho per 1 percentage point change in interest rate (dV/dr * 0.01)")
    rho_1bp: float | None = Field(default=None, description="Rho per 1 basis point change in interest rate (dV/dr * 0.0001)")
    pv01: float | None = Field(default=None, description="Present Value of a Basis Point (fixed rate sensitivity)")
    dv01: float | None = Field(default=None, description="Dollar Value of a Basis Point (discount curve sensitivity)")
    cs01: float | None = Field(default=None, description="Credit spread sensitivity per 1 basis point shift")
    units: dict[str, str] = Field(default_factory=dict, description="Documented units for each computed Greek")


class CashflowScheduleItem(BaseModel):
    """Payment cash flow row for swaps and credit contracts."""
    period: int
    payment_date: str
    accrual_fraction: float
    fixed_amount: float | None = None
    floating_amount: float | None = None
    net_cashflow: float
    discount_factor: float
    present_value: float


class ValuationResponse(BaseModel):
    """
    Institutional valuation output contract.
    Contains mathematically correct present value (PV), Greeks, market references,
    and explicit assumptions/warnings.
    """
    valuation_id: str = Field(..., description="Unique valuation identifier")
    contract_id: str = Field(..., description="Priced contract ID")
    contract_version: int = Field(..., description="Version of contract evaluated")
    instrument_type: InstrumentType = Field(..., description="Instrument derivative asset class")
    model_info: ModelMetadata = Field(..., description="Pricing model metadata")
    valuation_date: date = Field(..., description="Valuation effective date")
    present_value: Decimal = Field(..., description="Exact persisted Net Present Value (PV)")
    currency: str = Field(..., description="Settlement/reporting currency")
    greeks: GreeksResult | None = Field(default=None, description="Risk sensitivities")
    market_snapshot_ref: str = Field(..., description="Market snapshot identifier used for inputs")
    cashflows: list[CashflowScheduleItem] | None = Field(default=None, description="Cash flow schedule if applicable")
    assumptions: list[str] = Field(default_factory=list, description="Explicit modeling assumptions")
    warnings: list[str] = Field(default_factory=list, description="Operational warnings or edge condition notices")
    status: str = Field(default="Completed")
    created_at: str = Field(..., description="ISO 8601 UTC execution timestamp")


class AdHocPricingRequest(BaseModel):
    """
    Ad-hoc / What-if pricing request for unbooked hypothetical structures.
    Allows quantitative testing directly from the workbench.
    """
    instrument_type: InstrumentType
    model_id: str = "BSM_EUROPEAN"
    notional: Decimal = Field(..., gt=Decimal(0))
    currency: str = "USD"
    valuation_date: date
    # Option fields
    option_type: str | None = "CALL"  # CALL or PUT
    strike_price: Decimal | None = None
    expiration_date: date | None = None
    underlying_price: float | None = None
    volatility: float | None = None
    risk_free_rate: float | None = None
    dividend_yield: float | None = 0.0
    position_direction: str | None = "BUY"
    # Swap fields
    fixed_rate: Decimal | None = None
    floating_index: str | None = "SOFR"
    maturity_date: date | None = None
    payment_frequency: str | None = "SEMI_ANNUAL"
    fixed_leg_payer: str | None = "PAY_FIXED"
    # CDS fields
    spread_bps: Decimal | None = None
    hazard_rate: float | None = None
    recovery_rate: float | None = 0.40
