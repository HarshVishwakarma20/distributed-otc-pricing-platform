
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.domain.enums import InstrumentType
from app.pricing.registry import default_model_registry
from app.pricing.schemas import (
    AdHocPricingRequest,
    ModelMetadata,
    PriceContractRequest,
    ValuationResponse,
)
from app.pricing.service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing Engine"])


@router.get("/models", response_model=list[ModelMetadata], tags=["Pricing Engine"])
def list_models(
    instrument_type: InstrumentType | None = Query(default=None, description="Filter models by instrument type"),
) -> list[ModelMetadata]:
    """
    List registered quantitative pricing models, supported instruments,
    required inputs, and available Greeks.
    """
    if instrument_type:
        return default_model_registry.get_models_for_instrument(instrument_type)
    return default_model_registry.list_models()


@router.post(
    "/price",
    response_model=ValuationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Pricing Engine"],
)
def price_contract(
    request: PriceContractRequest,
    db: Session = Depends(get_db),
) -> ValuationResponse:
    """
    Price an authoritative Module 2 contract with mathematically correct quant models.
    Enforces optimistic concurrency (409 on version mismatch) and persists valuation
    history without mutating the contract record.
    """
    service = PricingService(db)
    return service.price_contract(request)


@router.get(
    "/valuations/{valuation_id}",
    response_model=ValuationResponse,
    tags=["Pricing Engine"],
)
def get_valuation(
    valuation_id: str,
    db: Session = Depends(get_db),
) -> ValuationResponse:
    """Retrieve an immutable persisted quantitative valuation record by ID."""
    service = PricingService(db)
    return service.get_valuation(valuation_id)


@router.get(
    "/valuations",
    response_model=list[ValuationResponse],
    tags=["Pricing Engine"],
)
def list_valuations(
    contract_id: str | None = Query(default=None, description="Filter valuations by contract ID"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[ValuationResponse]:
    """List historical quantitative valuation runs with risk sensitivities."""
    service = PricingService(db)
    return service.list_valuations(contract_id=contract_id, limit=limit, offset=offset)


@router.post(
    "/ad-hoc",
    response_model=ValuationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Pricing Engine"],
)
def price_ad_hoc(
    request: AdHocPricingRequest,
    db: Session = Depends(get_db),
) -> ValuationResponse:
    """
    Price an ad-hoc unbooked structure with analytical math.
    Useful for interactive what-if scenarios in the Pricing Workbench.
    """
    service = PricingService(db)
    return service.price_ad_hoc(request)
