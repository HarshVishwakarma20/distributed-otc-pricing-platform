from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.v1.contracts import router as contracts_router
from app.api.v1.pricing import router as pricing_router
from app.db.session import get_db
from app.domain.schemas import (
    ActivityEvent,
    DashboardSummaryResponse,
    FXRateItem,
    PortfolioExposure,
    PortfolioSummary,
    PricingWorkbenchRequest,
    PricingWorkbenchResponse,
    SimulationJobSummary,
    SystemHealthSummary,
    ValuationSummary,
    YieldCurvePoint,
)
from app.services.contract_repository import ContractRepository
from app.services.mock_provider import default_mock_provider

api_router = APIRouter()

# Mount Module 2 Contract Registry & Lifecycle Router
api_router.include_router(contracts_router)

# Mount Module 3 Quantitative Financial Pricing Engine Router
api_router.include_router(pricing_router)


@api_router.get("/health", tags=["Health"])
def get_health() -> dict[str, str]:
    """Health check endpoint for container orchestrators and monitoring probes."""
    return {
        "status": "healthy",
        "service": "DerivaQuant API Gateway",
        "environment": "demo-synthetic",
    }


@api_router.get("/dashboard/summary", response_model=DashboardSummaryResponse, tags=["Dashboard"])
def get_dashboard_summary(
    days: int = Query(default=30, ge=7, le=90),
    source: str = Query(default="auto", description="Data source: 'auto', 'mock', or 'db'"),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    """Returns top-level KPIs, 30-day market value history walk, and demo flags."""
    kpi = default_mock_provider.get_kpi_summary()
    history = default_mock_provider.get_value_history(days=days)
    is_demo = True

    if source == "db":
        try:
            repo = ContractRepository(db)
            db_active = repo.count_active()
            kpi.active_contracts = db_active
            is_demo = False
        except Exception:
            is_demo = True

    return DashboardSummaryResponse(
        kpi=kpi,
        value_history=history,
        is_demo_data=is_demo,
    )


@api_router.get("/dashboard/exposure", response_model=list[PortfolioExposure], tags=["Dashboard"])
def get_dashboard_exposure() -> list[PortfolioExposure]:
    """Returns portfolio notional and mark-to-market exposures grouped by derivative type."""
    return default_mock_provider.get_portfolio_exposures()


@api_router.get("/valuations/recent", response_model=list[ValuationSummary], tags=["Valuations"])
def get_recent_valuations(limit: int = Query(default=10, ge=1, le=50)) -> list[ValuationSummary]:
    """Returns the latest valuation runs with status, model used, and risk sensitivities (PV01/DV01)."""
    return default_mock_provider.get_recent_valuations(limit=limit)


@api_router.get("/activity", response_model=list[ActivityEvent], tags=["Activity"])
def get_recent_activity(limit: int = Query(default=10, ge=1, le=50)) -> list[ActivityEvent]:
    """Returns recent platform events, audit trail logs, and simulation completions."""
    return default_mock_provider.get_recent_activity(limit=limit)


@api_router.get("/jobs/summary", response_model=list[SimulationJobSummary], tags=["Simulations"])
def get_simulation_jobs_summary() -> list[SimulationJobSummary]:
    """Returns status and progress of distributed Monte Carlo simulation jobs."""
    return default_mock_provider.get_simulation_jobs()



@api_router.get("/portfolios", response_model=list[PortfolioSummary], tags=["Portfolios"])
def get_portfolios() -> list[PortfolioSummary]:
    """Returns trading books and portfolio partitions."""
    return default_mock_provider.get_portfolios()


@api_router.get("/market-data/rates", response_model=list[YieldCurvePoint], tags=["Market Data"])
def get_market_rates() -> list[YieldCurvePoint]:
    """Returns benchmark SOFR discount and zero rates."""
    return default_mock_provider.get_yield_curve()


@api_router.get("/market-data/fx", response_model=list[FXRateItem], tags=["Market Data"])
def get_fx_rates() -> list[FXRateItem]:
    """Returns benchmark foreign exchange spot rates."""
    return default_mock_provider.get_fx_rates()


@api_router.get("/system/health", response_model=SystemHealthSummary, tags=["System Health"])
def get_system_health() -> SystemHealthSummary:
    """Returns worker cluster status, latency, and service availability."""
    return default_mock_provider.get_system_health()


@api_router.post("/pricing/preview", response_model=PricingWorkbenchResponse, tags=["Pricing"])
def preview_pricing(request: PricingWorkbenchRequest) -> PricingWorkbenchResponse:
    """Preview pricing calculation for an instrument (Module 3 scaffold)."""
    return default_mock_provider.preview_pricing(request)


@api_router.get("/reports/export/valuations.csv", tags=["Reports"])
def export_valuations_csv() -> Response:
    """Generates and downloads a clean CSV export of recent valuations."""
    csv_content = default_mock_provider.export_valuations_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=derivaquant_valuations_export.csv",
        },
    )
