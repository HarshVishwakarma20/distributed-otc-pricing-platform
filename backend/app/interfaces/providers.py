from typing import Protocol

from app.domain.schemas import (
    ActivityEvent,
    ContractSummary,
    FXRateItem,
    KPISummary,
    PortfolioExposure,
    PortfolioSummary,
    PricingWorkbenchRequest,
    PricingWorkbenchResponse,
    SimulationJobSummary,
    SystemHealthSummary,
    ValuationSummary,
    ValueHistoryPoint,
    YieldCurvePoint,
)


class IDataProvider(Protocol):
    """
    Contract for providing market and platform analytics.
    Future modules (e.g. Module 3 Pricing, Module 4 Market Data, Module 10 Portfolio)
    will implement this protocol with real database/distributed-service backends.
    """

    def get_kpi_summary(self) -> KPISummary:
        ...

    def get_value_history(self, days: int = 30) -> list[ValueHistoryPoint]:
        ...

    def get_portfolio_exposures(self) -> list[PortfolioExposure]:
        ...

    def get_recent_valuations(self, limit: int = 10) -> list[ValuationSummary]:
        ...

    def get_recent_activity(self, limit: int = 10) -> list[ActivityEvent]:
        ...

    def get_simulation_jobs(self) -> list[SimulationJobSummary]:
        ...

    def get_contracts(self) -> list[ContractSummary]:
        ...

    def get_portfolios(self) -> list[PortfolioSummary]:
        ...

    def get_yield_curve(self) -> list[YieldCurvePoint]:
        ...

    def get_fx_rates(self) -> list[FXRateItem]:
        ...

    def get_system_health(self) -> SystemHealthSummary:
        ...

    def preview_pricing(self, request: PricingWorkbenchRequest) -> PricingWorkbenchResponse:
        ...

    def export_valuations_csv(self) -> str:
        ...
