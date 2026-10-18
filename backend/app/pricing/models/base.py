from abc import ABC, abstractmethod
from typing import Any

from app.domain.enums import InstrumentType
from app.pricing.market_data import MarketSnapshot
from app.pricing.schemas import CashflowScheduleItem, GreeksResult, ModelMetadata


class PricingEngineError(Exception):
    """Base exception for all quantitative pricing errors."""
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class MathDomainError(PricingEngineError):
    """Raised when mathematical parameters violate domain constraints (e.g. S <= 0, vol < 0)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class MissingMarketDataError(PricingEngineError):
    """Raised when required market curves or parameters are absent."""
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class StaleContractVersionError(PricingEngineError):
    """Raised when client provides an outdated contract version."""
    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class UnsupportedInstrumentError(PricingEngineError):
    """Raised when requested model cannot price the instrument type."""
    def __init__(self, message: str):
        super().__init__(message, status_code=501)


class BasePricingModel(ABC):
    """Abstract interface for all quantitative pricing algorithms."""
    
    @property
    @abstractmethod
    def metadata(self) -> ModelMetadata:
        """Returns model registration metadata."""
        pass

    @abstractmethod
    def price(
        self,
        instrument_type: InstrumentType,
        terms: dict[str, Any],
        notional: float,
        currency: str,
        effective_date_str: str,
        maturity_date_str: str,
        valuation_date_str: str,
        market: MarketSnapshot,
        overrides: Any | None = None,
    ) -> tuple[float, GreeksResult | None, list[CashflowScheduleItem] | None, list[str], list[str]]:
        """
        Execute deterministic mathematical valuation.
        
        Returns:
            pv (float): Present value of the position in contract currency
            greeks (GreeksResult | None): Risk sensitivities with explicit units
            cashflows (list[CashflowScheduleItem] | None): Cashflow breakdown if applicable
            assumptions (list[str]): Key quantitative model assumptions
            warnings (list[str]): Operational warnings, edge conditions, or approximations
        """
        pass
