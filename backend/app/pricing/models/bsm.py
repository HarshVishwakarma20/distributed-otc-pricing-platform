import datetime
import math
from typing import Any

from app.domain.enums import InstrumentType, OptionType, PositionDirection
from app.pricing.market_data import MarketSnapshot
from app.pricing.models.base import BasePricingModel, MathDomainError, UnsupportedInstrumentError
from app.pricing.schemas import CashflowScheduleItem, GreeksResult, ModelMetadata
from scipy.stats import norm  # type: ignore[import-untyped,import-not-found]

GREEK_UNITS = {
    "delta": "Change in option price per 1.0 unit move in underlying spot price (dimensionless)",
    "gamma": "Change in Delta per 1.0 unit move in underlying spot price (1/currency)",
    "vega": "Sensitivity per 1.0 (100%) change in volatility (currency)",
    "vega_1pct": "Sensitivity per 1 percentage point (0.01) change in volatility (currency/1% vol)",
    "theta_per_year": "Option value change per year of elapsed time (-dV/dt, currency/year)",
    "theta_per_day": "Option value change per calendar day (currency/day)",
    "rho": "Sensitivity per 1.0 (100%) change in risk-free interest rate (currency)",
    "rho_1pct": "Sensitivity per 1 percentage point (0.01) change in rate (currency/1% rate)",
    "rho_1bp": "Sensitivity per 1 basis point (0.0001) shift in interest rate (currency/bp)",
}


def bsm_analytical_price(
    spot: float,
    strike: float,
    time_to_expiry: float,
    risk_free_rate: float,
    dividend_yield: float,
    volatility: float,
    is_call: bool = True,
) -> tuple[float, dict[str, float | None], list[str], list[str]]:
    """
    Pure Python Black-Scholes-Merton (1973) European Option pricing engine.
    Callable directly in Python without FastAPI or database dependencies.

    Args:
        spot (S): Current spot price of underlying asset (> 0)
        strike (K): Strike exercise price (> 0)
        time_to_expiry (T): Time to expiration in annual years (>= 0)
        risk_free_rate (r): Continuously compounded risk-free rate
        dividend_yield (q): Continuous dividend or foreign carry yield (>= 0)
        volatility (sigma): Annualized implied volatility (>= 0)
        is_call (bool): True for Call, False for Put

    Returns:
        pv: Per-unit theoretical option price
        greeks: Dictionary of analytical Greeks (Delta, Gamma, Vega, Theta, Rho)
        assumptions: List of mathematical modeling assumptions applied
        warnings: List of edge-condition warnings or boundary limits
    """
    # 1. Finite and Domain Validations
    for name, val in [
        ("spot", spot),
        ("strike", strike),
        ("time_to_expiry", time_to_expiry),
        ("risk_free_rate", risk_free_rate),
        ("dividend_yield", dividend_yield),
        ("volatility", volatility),
    ]:
        if not math.isfinite(val):
            raise MathDomainError(f"Input '{name}' must be finite, received {val}")

    if spot <= 0.0:
        raise MathDomainError(f"Underlying spot price S must be strictly positive (>0), received {spot}")
    if strike <= 0.0:
        raise MathDomainError(f"Strike price K must be strictly positive (>0), received {strike}")
    if volatility < 0.0:
        raise MathDomainError(f"Volatility sigma cannot be negative, received {volatility}")
    if dividend_yield < 0.0:
        raise MathDomainError(f"Dividend yield q cannot be negative, received {dividend_yield}")
    if time_to_expiry < 0.0:
        raise MathDomainError(
            f"Time to expiry T ({time_to_expiry:.4f} years) cannot be negative. Valuation date is after expiration."
        )

    assumptions = [
        "Black-Scholes-Merton (1973) continuous lognormal geometric Brownian motion",
        "Deterministic constant risk-free discount rate and continuous dividend yield",
        "European exercise constraint with zero early exercise premium",
        "Frictionless market without transaction costs or short-selling constraints",
    ]
    warnings = []

    # 2. Edge Case: T = 0 (Option Expiration)
    if time_to_expiry <= 1e-9:
        warnings.append("Option is at expiration (T=0). Value reflects terminal intrinsic payoff.")
        if is_call:
            intrinsic = max(spot - strike, 0.0)
            if spot > strike:
                delta = 1.0
                gamma = 0.0
            elif spot < strike:
                delta = 0.0
                gamma = 0.0
            else:
                delta = None  # Discontinuous at-the-money
                gamma = None
        else:
            intrinsic = max(strike - spot, 0.0)
            if spot < strike:
                delta = -1.0
                gamma = 0.0
            elif spot > strike:
                delta = 0.0
                gamma = 0.0
            else:
                delta = None
                gamma = None

        greeks: dict[str, float | None] = {
            "delta": delta,
            "gamma": gamma,
            "vega": 0.0,
            "vega_1pct": 0.0,
            "theta_per_year": 0.0,
            "theta_per_day": 0.0,
            "rho": 0.0,
            "rho_1pct": 0.0,
            "rho_1bp": 0.0,
        }
        return intrinsic, greeks, assumptions, warnings

    # 3. Edge Case: sigma = 0 (Zero Volatility Limit)
    if volatility <= 1e-9:
        warnings.append("Zero volatility limit (sigma=0). Value reflects discounted forward intrinsic payoff.")
        forward = spot * math.exp((risk_free_rate - dividend_yield) * time_to_expiry)
        df_r = math.exp(-risk_free_rate * time_to_expiry)
        df_q = math.exp(-dividend_yield * time_to_expiry)

        if is_call:
            intrinsic_fwd = df_r * max(forward - strike, 0.0)
            if forward > strike:
                delta = df_q
                gamma = 0.0
            elif forward < strike:
                delta = 0.0
                gamma = 0.0
            else:
                delta = None
                gamma = None
        else:
            intrinsic_fwd = df_r * max(strike - forward, 0.0)
            if forward < strike:
                delta = -df_q
                gamma = 0.0
            elif forward > strike:
                delta = 0.0
                gamma = 0.0
            else:
                delta = None
                gamma = None

        greeks = {
            "delta": delta,
            "gamma": gamma,
            "vega": 0.0,
            "vega_1pct": 0.0,
            "theta_per_year": (
                -risk_free_rate * intrinsic_fwd if (is_call and forward > strike) or (not is_call and forward < strike) else 0.0
            ),
            "theta_per_day": 0.0,
            "rho": (
                time_to_expiry * intrinsic_fwd if (is_call and forward > strike) else 0.0
            ),
            "rho_1pct": 0.0,
            "rho_1bp": 0.0,
        }
        return intrinsic_fwd, greeks, assumptions, warnings

    # 4. Standard BSM Valuation (T > 0, sigma > 0)
    sqrt_t = math.sqrt(time_to_expiry)
    vol_sqrt_t = volatility * sqrt_t

    d1 = (math.log(spot / strike) + (risk_free_rate - dividend_yield + 0.5 * volatility * volatility) * time_to_expiry) / vol_sqrt_t
    d2 = d1 - vol_sqrt_t

    df_r = math.exp(-risk_free_rate * time_to_expiry)
    df_q = math.exp(-dividend_yield * time_to_expiry)

    nd1 = float(norm.cdf(d1))
    nd2 = float(norm.cdf(d2))
    n_minus_d1 = float(norm.cdf(-d1))
    n_minus_d2 = float(norm.cdf(-d2))
    pdf_d1 = float(norm.pdf(d1))

    # Analytical Prices
    if is_call:
        pv = spot * df_q * nd1 - strike * df_r * nd2
        delta = df_q * nd1
        theta = (
            -(spot * df_q * pdf_d1 * volatility) / (2.0 * sqrt_t)
            + dividend_yield * spot * df_q * nd1
            - risk_free_rate * strike * df_r * nd2
        )
        rho = strike * time_to_expiry * df_r * nd2
    else:
        pv = strike * df_r * n_minus_d2 - spot * df_q * n_minus_d1
        delta = -df_q * n_minus_d1
        theta = (
            -(spot * df_q * pdf_d1 * volatility) / (2.0 * sqrt_t)
            - dividend_yield * spot * df_q * n_minus_d1
            + risk_free_rate * strike * df_r * n_minus_d2
        )
        rho = -strike * time_to_expiry * df_r * n_minus_d2

    # Common Greeks
    gamma = (df_q * pdf_d1) / (spot * vol_sqrt_t)
    vega = spot * df_q * sqrt_t * pdf_d1

    greeks = {
        "delta": delta,
        "gamma": gamma,
        "vega": vega,
        "vega_1pct": vega * 0.01,
        "theta_per_year": theta,
        "theta_per_day": theta / 365.0,
        "rho": rho,
        "rho_1pct": rho * 0.01,
        "rho_1bp": rho * 0.0001,
    }

    return pv, greeks, assumptions, warnings


class BSMEuropeanOptionModel(BasePricingModel):
    """
    Module 3 Quantitative Pricing Engine: Black-Scholes-Merton European Options.
    Evaluates institutional Calls & Puts with analytical Greeks, zero-vol limits,
    and contract position sizing.
    """

    @property
    def metadata(self) -> ModelMetadata:
        return ModelMetadata(
            model_id="BSM_EUROPEAN",
            name="Black-Scholes-Merton (1973) Analytical Engine",
            version="1.0.0",
            description=(
                "Closed-form analytical pricing for European vanilla equity and index options. "
                "Calculates exact Delta, Gamma, Vega, Theta, and Rho with Merton continuous carry/dividend yield."
            ),
            supported_instruments=[InstrumentType.EUROPEAN_OPTION],
            required_market_inputs=["spot_price", "volatility", "risk_free_rate"],
            supported_greeks=["Delta", "Gamma", "Vega", "Theta", "Rho"],
        )

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
        if instrument_type != InstrumentType.EUROPEAN_OPTION:
            raise UnsupportedInstrumentError(
                f"Model 'BSM_EUROPEAN' does not support instrument type '{instrument_type.value}'"
            )

        # Parse contract terms
        underlying_asset = str(terms.get("underlying_asset", "SPX")).upper()
        option_type_raw = str(terms.get("option_type", "CALL")).upper()
        is_call = option_type_raw == OptionType.CALL.value
        strike_price = float(terms.get("strike_price", 100.0))
        position_direction_raw = str(terms.get("position_direction", "BUY")).upper()
        is_long = position_direction_raw == PositionDirection.BUY.value
        position_multiplier = 1.0 if is_long else -1.0

        # Calculate time to expiry in annual fraction (ACT/365 convention)
        val_date = datetime.date.fromisoformat(valuation_date_str)
        mat_date = datetime.date.fromisoformat(maturity_date_str)
        days_to_expiry = (mat_date - val_date).days
        if days_to_expiry < 0:
            raise MathDomainError(
                f"Option has already matured on {maturity_date_str}, which precedes valuation date {valuation_date_str}."
            )
        time_to_expiry = max(days_to_expiry / 365.0, 0.0)

        # Resolve market inputs
        spot_override = overrides.spot_price if overrides else None
        vol_override = overrides.volatility if overrides else None
        rate_override = overrides.risk_free_rate if overrides else None
        div_override = overrides.dividend_yield if overrides else None

        equity_inputs = market.get_equity_inputs(
            symbol=underlying_asset,
            spot_override=spot_override,
            vol_override=vol_override,
            rate_override=rate_override,
            div_override=div_override,
        )

        # Contract quantity sizing: contract notional / strike
        quantity = notional / strike_price if strike_price > 0 else 1.0

        per_unit_pv, raw_greeks, assumptions, warnings = bsm_analytical_price(
            spot=equity_inputs.spot_price,
            strike=strike_price,
            time_to_expiry=time_to_expiry,
            risk_free_rate=equity_inputs.risk_free_rate,
            dividend_yield=equity_inputs.dividend_yield,
            volatility=equity_inputs.volatility,
            is_call=is_call,
        )

        # Scale position PV and Greeks
        total_pv = per_unit_pv * quantity * position_multiplier

        def scale_greek(val: float | None) -> float | None:
            if val is None:
                return None
            return val * quantity * position_multiplier

        greeks_obj = GreeksResult(
            delta=scale_greek(raw_greeks.get("delta")),
            gamma=scale_greek(raw_greeks.get("gamma")),
            vega=scale_greek(raw_greeks.get("vega")),
            vega_1pct=scale_greek(raw_greeks.get("vega_1pct")),
            theta_per_year=scale_greek(raw_greeks.get("theta_per_year")),
            theta_per_day=scale_greek(raw_greeks.get("theta_per_day")),
            rho=scale_greek(raw_greeks.get("rho")),
            rho_1pct=scale_greek(raw_greeks.get("rho_1pct")),
            rho_1bp=scale_greek(raw_greeks.get("rho_1bp")),
            pv01=scale_greek(raw_greeks.get("rho_1bp")),
            dv01=scale_greek(raw_greeks.get("rho_1bp")),
            units=GREEK_UNITS,
        )

        assumptions.append(
            f"Contract position sizing: {quantity:,.2f} underlying shares (notional {notional:,.2f} / strike {strike_price:,.2f}) [{position_direction_raw}]"
        )
        assumptions.append(
            f"Day count convention: ACT/365 ({days_to_expiry} calendar days to expiry = {time_to_expiry:.4f} years)"
        )

        return total_pv, greeks_obj, None, assumptions, warnings
