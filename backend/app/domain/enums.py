from enum import Enum


class InstrumentType(str, Enum):
    INTEREST_RATE_SWAP = "Interest Rate Swap"
    EUROPEAN_OPTION = "European Option"
    CURRENCY_SWAP = "Currency Swap"
    CREDIT_DEFAULT_SWAP = "Credit Default Swap"
    FX_FORWARD = "FX Forward"
    EQUITY_VARIANCE_SWAP = "Equity Variance Swap"


class ContractStatus(str, Enum):
    # Module 2 Official Lifecycle States
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    MATURED = "MATURED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

    # Module 1 Legacy Compatibility Aliases
    PENDING_CONFIRMATION = "Pending Confirmation"
    TERMINATED = "Terminated"
    ACTIVE_LEGACY = "Active"
    MATURED_LEGACY = "Matured"
    TERMINATED_LEGACY = "Terminated"
    PENDING_CONFIRMATION_LEGACY = "Pending Confirmation"
    DRAFT_LEGACY = "Draft"


class OptionType(str, Enum):
    CALL = "CALL"
    PUT = "PUT"


class ExerciseStyle(str, Enum):
    EUROPEAN = "EUROPEAN"


class SettlementType(str, Enum):
    CASH = "CASH"
    PHYSICAL = "PHYSICAL"


class PositionDirection(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class FixedPayer(str, Enum):
    PAY_FIXED = "PAY_FIXED"
    RECEIVE_FIXED = "RECEIVE_FIXED"


class PaymentFrequency(str, Enum):
    ANNUAL = "ANNUAL"
    SEMI_ANNUAL = "SEMI_ANNUAL"
    QUARTERLY = "QUARTERLY"
    MONTHLY = "MONTHLY"


class DayCountConvention(str, Enum):
    ACT_360 = "ACT_360"
    ACT_365_FIXED = "ACT_365_FIXED"
    THIRTY_360 = "30_360"


class BusinessDayConvention(str, Enum):
    FOLLOWING = "FOLLOWING"
    MODIFIED_FOLLOWING = "MODIFIED_FOLLOWING"
    PRECEDING = "PRECEDING"


class PrincipalExchange(str, Enum):
    INITIAL_AND_FINAL = "INITIAL_AND_FINAL"
    FINAL_ONLY = "FINAL_ONLY"
    NONE = "NONE"


class LegRateType(str, Enum):
    FIXED = "FIXED"
    FLOATING = "FLOATING"


class CDSDirection(str, Enum):
    BUY_PROTECTION = "BUY_PROTECTION"
    SELL_PROTECTION = "SELL_PROTECTION"


class RestructuringClause(str, Enum):
    CR = "CR"
    MR = "MR"
    MM = "MM"
    XR = "XR"


class AuditEventType(str, Enum):
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    STATUS_CHANGED = "STATUS_CHANGED"


class ValuationStatus(str, Enum):
    COMPLETED = "Completed"
    IN_PROGRESS = "In Progress"
    FAILED = "Failed"
    PENDING_VALIDATION = "Pending Validation"


class JobStatus(str, Enum):
    RUNNING = "Running"
    COMPLETED = "Completed"
    QUEUED = "Queued"
    FAILED = "Failed"
    CANCELLED = "Cancelled"


class SimulationType(str, Enum):
    MONTE_CARLO_BS = "Monte Carlo (Black-Scholes)"
    HULL_WHITE_2F = "Hull-White (2-Factor)"
    HESTON_STOCHASTIC_VOL = "Heston Stochastic Volatility"
    VASICEK_SHORT_RATE = "Vasicek Interest Rate"


class ActivitySeverity(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class ServiceHealthStatus(str, Enum):
    HEALTHY = "Healthy"
    DEGRADED = "Degraded"
    OFFLINE = "Offline"
