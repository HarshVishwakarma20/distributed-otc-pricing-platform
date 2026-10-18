import datetime
import math
from typing import Any

from app.domain.enums import CDSDirection, InstrumentType
from app.pricing.market_data import MarketSnapshot
from app.pricing.models.base import BasePricingModel, MathDomainError, UnsupportedInstrumentError
from app.pricing.models.irs import calculate_day_count_fraction, generate_swap_dates
from app.pricing.schemas import CashflowScheduleItem, GreeksResult, ModelMetadata


class ISDAHazardRateCDSModel(BasePricingModel):
    """
    Module 3 Quantitative Pricing Engine: Credit Default Swap (CDS) ISDA Standard Model.
    Values single-name protection and premium legs using continuous hazard rates,
    accrual-on-default conventions, and stochastic default timing.
    """

    @property
    def metadata(self) -> ModelMetadata:
        return ModelMetadata(
            model_id="ISDA_HAZARD_RATE_CDS",
            name="ISDA Standard Hazard Rate CDS Engine",
            version="1.0.0",
            description=(
                "Reduced-form intensity model for Credit Default Swaps. "
                "Calculates protection leg and premium leg (with accrual-on-default) using survival probability curves "
                "and discount curves, producing CS01 credit spread sensitivity."
            ),
            supported_instruments=[InstrumentType.CREDIT_DEFAULT_SWAP],
            required_market_inputs=["yield_curve", "hazard_rate", "recovery_rate"],
            supported_greeks=["CS01", "RPV01", "DefaultProb"],
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
        if instrument_type != InstrumentType.CREDIT_DEFAULT_SWAP:
            raise UnsupportedInstrumentError(
                f"Model 'ISDA_HAZARD_RATE_CDS' does not support instrument type '{instrument_type.value}'"
            )

        val_date = datetime.date.fromisoformat(valuation_date_str)
        eff_date = datetime.date.fromisoformat(effective_date_str)
        mat_date = datetime.date.fromisoformat(maturity_date_str)

        if mat_date <= eff_date:
            raise MathDomainError("CDS maturity date must be strictly after effective date")

        reference_entity = str(terms.get("reference_entity", "Standard Corporate"))
        direction = str(terms.get("direction", "BUY_PROTECTION")).upper()
        spread_bps = float(terms.get("spread_bps", 100.0))
        spread_rate = spread_bps / 10000.0  # e.g. 100 bps = 0.0100
        freq = str(terms.get("premium_frequency", "QUARTERLY")).upper()
        day_count = str(terms.get("day_count_convention", "ACT_360"))

        # Resolve credit inputs
        hazard_override = overrides.hazard_rate if overrides else None
        recovery_override = overrides.recovery_rate if overrides else None
        credit_inputs = market.get_credit_inputs(reference_entity, hazard_override, recovery_override)

        hazard_rate = credit_inputs.hazard_rate  # lambda
        recovery_rate = credit_inputs.recovery_rate  # R

        if hazard_rate < 0.0:
            raise MathDomainError("Credit hazard rate cannot be negative")
        if not (0.0 <= recovery_rate <= 1.0):
            raise MathDomainError("Recovery rate must be between 0.0 and 1.0")

        curve = market.get_curve(currency)
        schedule_dates = generate_swap_dates(eff_date, mat_date, freq)
        cashflow_items: list[CashflowScheduleItem] = []

        pv_premium_leg = 0.0
        pv_protection_leg = 0.0
        risky_annuity = 0.0

        t_eff = max((eff_date - val_date).days / 365.0, 0.0)
        q_prev = math.exp(-hazard_rate * t_eff)
        prev_date = schedule_dates[0]

        for i in range(1, len(schedule_dates)):
            p_date = schedule_dates[i]
            alpha = calculate_day_count_fraction(prev_date, p_date, day_count)
            t_pay = (p_date - val_date).days / 365.0

            if t_pay <= 0.0:
                prev_date = p_date
                continue

            t_prev = (prev_date - val_date).days / 365.0
            t_mid = 0.5 * (max(t_prev, 0.0) + t_pay)

            df_pay = curve.get_discount_factor(t_pay)
            df_mid = curve.get_discount_factor(t_mid)

            # Survival probability at payment date
            q_curr = math.exp(-hazard_rate * t_pay)
            prob_default_period = max(q_prev - q_curr, 0.0)

            # 1. Premium Leg: regular coupon + accrual on default
            regular_coupon = notional * spread_rate * alpha * q_curr * df_pay
            accrual_on_default = notional * spread_rate * (0.5 * alpha) * prob_default_period * df_mid
            premium_i = regular_coupon + accrual_on_default

            # 2. Protection Leg: loss given default paid at midpoint
            protection_i = (1.0 - recovery_rate) * notional * prob_default_period * df_mid

            pv_premium_leg += premium_i
            pv_protection_leg += protection_i
            risky_annuity += alpha * q_curr * df_pay + 0.5 * alpha * prob_default_period * df_mid

            net_flow_buyer = protection_i - premium_i
            net_flow = net_flow_buyer if direction == "BUY_PROTECTION" else -net_flow_buyer

            cashflow_items.append(
                CashflowScheduleItem(
                    period=i,
                    payment_date=p_date.isoformat(),
                    accrual_fraction=round(alpha, 6),
                    fixed_amount=round(premium_i, 2),
                    floating_amount=round(protection_i, 2),
                    net_cashflow=round(net_flow, 2),
                    discount_factor=round(df_pay, 6),
                    present_value=round(net_flow, 2),
                )
            )

            prev_date = p_date
            q_prev = q_curr

        # Direction signs:
        # BUY_PROTECTION: Long credit protection -> PV = PV_protection - PV_premium
        # SELL_PROTECTION: Short credit protection -> PV = PV_premium - PV_protection
        is_buy_prot = direction == CDSDirection.BUY_PROTECTION.value
        net_pv = (pv_protection_leg - pv_premium_leg) if is_buy_prot else (pv_premium_leg - pv_protection_leg)

        # CS01: change in PV per +1 bp (0.0001) spread shift = notional * 0.0001 * risky_annuity
        cs01_signed = notional * 0.0001 * risky_annuity if is_buy_prot else -notional * 0.0001 * risky_annuity

        # 5Y Cumulative default probability
        t_mat = max((mat_date - val_date).days / 365.0, 0.0)
        cum_default_prob = 1.0 - math.exp(-hazard_rate * t_mat)

        greeks = GreeksResult(
            delta=None,
            gamma=None,
            vega=None,
            theta_per_year=None,
            theta_per_day=None,
            rho=None,
            pv01=None,
            dv01=None,
            cs01=round(cs01_signed, 4),
            units={
                "cs01": "Credit spread sensitivity: Change in CDS PV per 1 bp increase in spread (currency/bp)",
            },
        )

        assumptions = [
            f"ISDA Standard CDS model with constant hazard rate lambda = {hazard_rate * 100:.2f}% per annum",
            f"Fixed recovery rate assumption R = {recovery_rate * 100:.1f}%",
            f"Accrual on default evaluated at interval midpoint with discount curve {curve.curve_name}",
            f"Cumulative default probability through maturity ({mat_date}): {cum_default_prob * 100:.2f}%",
            f"Direction: {'Buyer of Protection' if is_buy_prot else 'Seller of Protection'}",
        ]
        warnings = []
        if val_date > eff_date:
            warnings.append(f"Valuation date ({val_date}) is after protection start date ({eff_date}); past periods excluded.")

        return net_pv, greeks, cashflow_items, assumptions, warnings
