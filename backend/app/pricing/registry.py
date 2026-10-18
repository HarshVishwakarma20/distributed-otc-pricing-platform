from app.domain.enums import InstrumentType
from app.pricing.models import (
    BasePricingModel,
    BSMEuropeanOptionModel,
    CrossCurrencySwapModel,
    DiscountedCashFlowIRSModel,
    ISDAHazardRateCDSModel,
    UnsupportedInstrumentError,
)
from app.pricing.schemas import ModelMetadata


class ModelRegistry:
    """
    Centralized quantitative model registry.
    Maps derivative instrument types to validated pricing algorithms,
    validates required market inputs, and manages model metadata.
    """

    def __init__(self):
        self._models: dict[str, BasePricingModel] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        """Register primary institutional models."""
        self.register(BSMEuropeanOptionModel())
        self.register(DiscountedCashFlowIRSModel())
        self.register(CrossCurrencySwapModel())
        self.register(ISDAHazardRateCDSModel())

    def register(self, model: BasePricingModel) -> None:
        """Register a new pricing model."""
        meta = model.metadata
        self._models[meta.model_id] = model

    def get_model(self, model_id: str) -> BasePricingModel:
        """Retrieve model by unique ID or raise UnsupportedInstrumentError."""
        if model_id not in self._models:
            raise UnsupportedInstrumentError(
                f"Pricing model '{model_id}' is not registered in quantitative registry. "
                f"Available models: {list(self._models.keys())}"
            )
        return self._models[model_id]

    def list_models(self) -> list[ModelMetadata]:
        """Returns metadata for all registered models."""
        return [m.metadata for m in self._models.values()]

    def get_models_for_instrument(self, instrument_type: InstrumentType) -> list[ModelMetadata]:
        """Returns models supporting the specified instrument type."""
        return [
            m.metadata
            for m in self._models.values()
            if instrument_type in m.metadata.supported_instruments
        ]

    def resolve_default_model(self, instrument_type: InstrumentType) -> BasePricingModel:
        """Resolves the default benchmark model for a given instrument type."""
        mapping = {
            InstrumentType.EUROPEAN_OPTION: "BSM_EUROPEAN",
            InstrumentType.INTEREST_RATE_SWAP: "DISCOUNTED_CASH_FLOW_IRS",
            InstrumentType.CURRENCY_SWAP: "CROSS_CURRENCY_DCF",
            InstrumentType.CREDIT_DEFAULT_SWAP: "ISDA_HAZARD_RATE_CDS",
        }
        model_id = mapping.get(instrument_type)
        if not model_id or model_id not in self._models:
            raise UnsupportedInstrumentError(
                f"No default quantitative pricing model registered for instrument '{instrument_type.value}'"
            )
        return self._models[model_id]


default_model_registry = ModelRegistry()
