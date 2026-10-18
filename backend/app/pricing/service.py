import datetime
import math
import uuid
from decimal import Decimal
from typing import Any

from app.db.models import ValuationModel
from app.domain.enums import InstrumentType
from app.pricing.market_data import create_deterministic_market_snapshot
from app.pricing.models.base import MathDomainError, PricingEngineError
from app.pricing.registry import ModelRegistry, default_model_registry
from app.pricing.schemas import (
    AdHocPricingRequest,
    CashflowScheduleItem,
    GreeksResult,
    ModelMetadata,
    PriceContractRequest,
    ValuationResponse,
)
from app.services.contract_service import ContractService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class PricingService:
    """
    Module 3 Quantitative Pricing Service.
    Orchestrates contract resolution from Module 2, market data retrieval,
    model dispatch, output validation, and database persistence.
    """

    def __init__(self, db: Session, registry: ModelRegistry | None = None):
        self.db = db
        self.registry = registry or default_model_registry
        self.contract_service = ContractService(db)

    def price_contract(self, request: PriceContractRequest) -> ValuationResponse:
        """
        Executes authoritative valuation for an existing Module 2 contract.
        
        Execution Flow:
        1. Resolve Contract from Module 2 (authoritative terms).
        2. Validate optimistic concurrency (contract version match) and state constraints.
        3. Resolve pricing model from ModelRegistry.
        4. Ingest/build market snapshot and evaluate what-if overrides.
        5. Execute mathematical algorithm.
        6. Validate numerical output (reject NaN/Inf).
        7. Persist valuation record to DB without mutating the contract record.
        8. Return typed institutional response.
        """
        # 1. Resolve Contract
        contract = self.contract_service.get_contract(request.contract_id)

        # 2. Concurrency & State Validations
        if contract.version != request.contract_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Stale contract version for '{request.contract_id}'. "
                    f"Request expected version {request.contract_version}, but authoritative version is {contract.version}. "
                    "Re-fetch the contract before pricing."
                ),
            )

        if str(contract.status.value).upper() == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cannot price contract '{request.contract_id}' in terminal 'CANCELLED' state.",
            )

        # 3. Resolve Model
        try:
            if request.model_id:
                model = self.registry.get_model(request.model_id)
            else:
                model = self.registry.resolve_default_model(contract.instrument_type)
        except PricingEngineError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message) from err

        if contract.instrument_type not in model.metadata.supported_instruments:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"Model '{model.metadata.model_id}' does not support instrument type '{contract.instrument_type.value}'. "
                    f"Supported instruments: {[i.value for i in model.metadata.supported_instruments]}"
                ),
            )

        # 4. Ingest Market Data
        market = create_deterministic_market_snapshot(request.valuation_date)

        # 5. Execute Mathematical Pricing
        try:
            pv_float, greeks, cashflows, assumptions, warnings = model.price(
                instrument_type=contract.instrument_type,
                terms=contract.terms,
                notional=float(contract.notional),
                currency=contract.currency,
                effective_date_str=contract.effective_date,
                maturity_date_str=contract.maturity_date,
                valuation_date_str=request.valuation_date.isoformat(),
                market=market,
                overrides=request.market_overrides,
            )
        except MathDomainError as err:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=err.message) from err
        except PricingEngineError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message) from err
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Quantitative pricing algorithm failed: {str(exc)}",
            ) from exc

        # 6. Validate Output
        if not math.isfinite(pv_float):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Pricing model generated a non-finite present value (NaN or Infinity).",
            )

        pv_decimal = Decimal(f"{pv_float:.4f}")
        now = datetime.datetime.now(datetime.UTC)
        valuation_id = f"VAL-{contract.contract_id[:7]}-{uuid.uuid4().hex[:8].upper()}"

        # 7. Persist Valuation Record
        val_entity = ValuationModel(
            valuation_id=valuation_id,
            contract_id=contract.contract_id,
            contract_version=contract.version,
            instrument_type=contract.instrument_type.value,
            model_id=model.metadata.model_id,
            valuation_date=request.valuation_date,
            present_value=pv_decimal,
            currency=contract.currency,
            greeks=greeks.model_dump(mode="json") if greeks else None,
            market_snapshot={
                "snapshot_id": market.snapshot_id,
                "valuation_date": request.valuation_date.isoformat(),
                "base_currency": market.base_currency,
                "overrides": request.market_overrides.model_dump(mode="json", exclude_none=True) if request.market_overrides else None,
            },
            assumptions=assumptions,
            warnings=warnings,
            cashflows=[c.model_dump(mode="json") for c in cashflows] if cashflows else None,
            status="Completed",
            created_at=now,
        )

        self.db.add(val_entity)
        self.db.commit()
        self.db.refresh(val_entity)

        # 8. Return Response
        return ValuationResponse(
            valuation_id=val_entity.valuation_id,
            contract_id=val_entity.contract_id,
            contract_version=val_entity.contract_version,
            instrument_type=contract.instrument_type,
            model_info=model.metadata,
            valuation_date=val_entity.valuation_date,
            present_value=val_entity.present_value,
            currency=val_entity.currency,
            greeks=greeks,
            market_snapshot_ref=market.snapshot_id,
            cashflows=cashflows,
            assumptions=assumptions,
            warnings=warnings,
            status=val_entity.status,
            created_at=now.isoformat(),
        )

    def get_valuation(self, valuation_id: str) -> ValuationResponse:
        """Fetch persisted valuation record by ID."""
        val = self.db.query(ValuationModel).filter(ValuationModel.valuation_id == valuation_id).first()
        if not val:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Valuation record '{valuation_id}' not found.",
            )
        return self._to_valuation_response(val)

    def list_valuations(
        self,
        contract_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ValuationResponse]:
        """List persisted valuations, optionally filtered by contract ID."""
        query = self.db.query(ValuationModel)
        if contract_id:
            query = query.filter(ValuationModel.contract_id == contract_id)
        rows = query.order_by(ValuationModel.created_at.desc()).offset(offset).limit(limit).all()
        return [self._to_valuation_response(r) for r in rows]

    def price_ad_hoc(self, request: AdHocPricingRequest) -> ValuationResponse:
        """
        Ad-hoc / What-if pricing for hypothetical unbooked structures.
        Does not require an existing M2 contract, but executes full analytical math and records run.
        """
        try:
            model = self.registry.get_model(request.model_id)
        except PricingEngineError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message) from err

        market = create_deterministic_market_snapshot(request.valuation_date)
        terms: dict[str, Any] = {}

        if request.instrument_type == InstrumentType.EUROPEAN_OPTION:
            exp_date = request.expiration_date or (request.valuation_date + datetime.timedelta(days=365))
            terms = {
                "underlying_asset": "SPX",
                "option_type": request.option_type or "CALL",
                "strike_price": float(request.strike_price or 100.0),
                "position_direction": request.position_direction or "BUY",
            }
            from app.pricing.schemas import MarketInputsOverride
            overrides = MarketInputsOverride(
                spot_price=request.underlying_price,
                volatility=request.volatility,
                risk_free_rate=request.risk_free_rate,
                dividend_yield=request.dividend_yield,
            )
            eff_str = request.valuation_date.isoformat()
            mat_str = exp_date.isoformat()
        elif request.instrument_type == InstrumentType.INTEREST_RATE_SWAP:
            mat_date = request.maturity_date or (request.valuation_date + datetime.timedelta(days=365 * 5))
            terms = {
                "fixed_rate": float(request.fixed_rate or 3.85),
                "floating_index": request.floating_index or "SOFR",
                "fixed_leg_payer": request.fixed_leg_payer or "PAY_FIXED",
                "fixed_frequency": request.payment_frequency or "SEMI_ANNUAL",
                "day_count_convention": "ACT_360",
            }
            overrides = None
            eff_str = request.valuation_date.isoformat()
            mat_str = mat_date.isoformat()
        elif request.instrument_type == InstrumentType.CREDIT_DEFAULT_SWAP:
            mat_date = request.maturity_date or (request.valuation_date + datetime.timedelta(days=365 * 5))
            terms = {
                "reference_entity": "Standard Corporate",
                "direction": "BUY_PROTECTION",
                "spread_bps": float(request.spread_bps or 100.0),
                "premium_frequency": "QUARTERLY",
                "day_count_convention": "ACT_360",
            }
            from app.pricing.schemas import MarketInputsOverride
            overrides = MarketInputsOverride(
                hazard_rate=request.hazard_rate,
                recovery_rate=request.recovery_rate,
            )
            eff_str = request.valuation_date.isoformat()
            mat_str = mat_date.isoformat()
        else:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"Ad-hoc pricing for '{request.instrument_type.value}' is not supported.",
            )

        pv_float, greeks, cashflows, assumptions, warnings = model.price(
            instrument_type=request.instrument_type,
            terms=terms,
            notional=float(request.notional),
            currency=request.currency,
            effective_date_str=eff_str,
            maturity_date_str=mat_str,
            valuation_date_str=request.valuation_date.isoformat(),
            market=market,
            overrides=overrides,
        )

        pv_decimal = Decimal(f"{pv_float:.4f}")
        now = datetime.datetime.now(datetime.UTC)
        valuation_id = f"VAL-ADHOC-{uuid.uuid4().hex[:8].upper()}"

        val_entity = ValuationModel(
            valuation_id=valuation_id,
            contract_id="ADHOC-STRUCTURE",
            contract_version=1,
            instrument_type=request.instrument_type.value,
            model_id=model.metadata.model_id,
            valuation_date=request.valuation_date,
            present_value=pv_decimal,
            currency=request.currency,
            greeks=greeks.model_dump(mode="json") if greeks else None,
            market_snapshot={"snapshot_id": market.snapshot_id},
            assumptions=assumptions,
            warnings=warnings,
            cashflows=[c.model_dump(mode="json") for c in cashflows] if cashflows else None,
            status="Completed",
            created_at=now,
        )
        self.db.add(val_entity)
        self.db.commit()

        return ValuationResponse(
            valuation_id=valuation_id,
            contract_id="ADHOC-STRUCTURE",
            contract_version=1,
            instrument_type=request.instrument_type,
            model_info=model.metadata,
            valuation_date=request.valuation_date,
            present_value=pv_decimal,
            currency=request.currency,
            greeks=greeks,
            market_snapshot_ref=market.snapshot_id,
            cashflows=cashflows,
            assumptions=assumptions,
            warnings=warnings,
            status="Completed",
            created_at=now.isoformat(),
        )

    def _to_valuation_response(self, entity: ValuationModel) -> ValuationResponse:
        """Helper to transform ORM entity to API response."""
        try:
            model = self.registry.get_model(entity.model_id)
            meta = model.metadata
        except Exception:
            meta = ModelMetadata(
                model_id=entity.model_id,
                name=entity.model_id,
                description="Persisted quantitative model",
                supported_instruments=[InstrumentType(entity.instrument_type)],
                required_market_inputs=[],
                supported_greeks=[],
            )

        greeks_obj = GreeksResult(**entity.greeks) if entity.greeks else None
        cashflows_obj = [CashflowScheduleItem(**c) for c in entity.cashflows] if entity.cashflows else None

        return ValuationResponse(
            valuation_id=entity.valuation_id,
            contract_id=entity.contract_id,
            contract_version=entity.contract_version,
            instrument_type=InstrumentType(entity.instrument_type),
            model_info=meta,
            valuation_date=entity.valuation_date,
            present_value=entity.present_value,
            currency=entity.currency,
            greeks=greeks_obj,
            market_snapshot_ref=entity.market_snapshot.get("snapshot_id", "MKT-HISTORIC") if entity.market_snapshot else "MKT-HISTORIC",
            cashflows=cashflows_obj,
            assumptions=entity.assumptions or [],
            warnings=entity.warnings or [],
            status=entity.status,
            created_at=entity.created_at.isoformat(),
        )
