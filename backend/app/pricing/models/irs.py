import datetime
import math
from typing import Any

from app.domain.enums import DayCountConvention, FixedPayer, InstrumentType, PaymentFrequency
from app.pricing.market_data import MarketSnapshot
from app.pricing.models.base import BasePricingModel, MathDomainError, UnsupportedInstrumentError
from app.pricing.schemas import CashflowScheduleItem, GreeksResult, ModelMetadata


def calculate_day_count_fraction(
    start_date: datetime.date,
    end_date: datetime.date,
    convention: DayCountConvention | str,
) -> float:
    """Computes accrual fraction alpha between two dates under standard market conventions."""
    if end_date <= start_date:
        return 0.0

    conv_str = str(convention.value if hasattr(convention, "value") else convention).upper()

    if conv_str in ("ACT_360", "ACTUAL/360"):
        return (end_date - start_date).days / 360.0
    elif conv_str in ("ACT_365_FIXED", "ACTUAL/365"):
        return (end_date - start_date).days / 365.0
    elif conv_str in ("30_360", "30/360", "THIRTY_360"):
        d1 = min(start_date.day, 30)
        d2 = min(end_date.day, 30) if d1 == 30 else end_date.day
        days = (end_date.year - start_date.year) * 360 + (end_date.month - start_date.month) * 30 + (d2 - d1)
        return max(days / 360.0, 0.0)
    else:
        # Default fallback ACT/360
        return (end_date - start_date).days / 360.0


def add_frequency_months(d: datetime.date, months: int) -> datetime.date:
    """Adds a fixed number of calendar months, handling end-of-month roll."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    # Day handling
    max_days = [31, 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    day = min(d.day, max_days)
    return datetime.date(year, month, day)


def generate_swap_dates(
    start_date: datetime.date,
    end_date: datetime.date,
    frequency: PaymentFrequency | str,
) -> list[datetime.date]:
    """Generates unadjusted roll schedule dates."""
    freq_str = str(frequency.value if hasattr(frequency, "value") else frequency).upper()
    months_step = {
        "ANNUAL": 12,
        "SEMI_ANNUAL": 6,
        "QUARTERLY": 3,
        "MONTHLY": 1,
    }.get(freq_str, 6)

    dates = [start_date]
    curr = start_date
    while True:
        next_date = add_frequency_months(curr, months_step)
        if next_date >= end_date:
            dates.append(end_date)
            break
        dates.append(next_date)
        curr = next_date

    return dates


class DiscountedCashFlowIRSModel(BasePricingModel):
    """
    Module 3 Quantitative Pricing Engine: Interest Rate Swap (IRS) Discounted Cash Flow.
    Prices fixed-for-floating single-currency swaps with exact cashflow schedules,
    par swap rates, PV01, and DV01 curve sensitivities.
    """

    @property
    def metadata(self) -> ModelMetadata:
        return ModelMetadata(
            model_id="DISCOUNTED_CASH_FLOW_IRS",
            name="Single-Curve Discounted Cash Flow IRS Engine",
            version="1.0.0",
            description=(
                "Dual-leg discounted cashflow valuation for Interest Rate Swaps. "
                "Constructs forward floating index expectations from discount curve, computes accrual fractions, "
                "and produces PV01 fixed-rate and DV01 discount curve sensitivities."
            ),
            supported_instruments=[InstrumentType.INTEREST_RATE_SWAP],
            required_market_inputs=["yield_curve"],
            supported_greeks=["PV01", "DV01", "ParSwapRate"],
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
        if instrument_type != InstrumentType.INTEREST_RATE_SWAP:
            raise UnsupportedInstrumentError(
                f"Model 'DISCOUNTED_CASH_FLOW_IRS' does not support instrument type '{instrument_type.value}'"
            )

        # 1. Parse terms
        val_date = datetime.date.fromisoformat(valuation_date_str)
        eff_date = datetime.date.fromisoformat(effective_date_str)
        mat_date = datetime.date.fromisoformat(maturity_date_str)

        if mat_date <= eff_date:
            raise MathDomainError(f"Maturity date ({maturity_date_str}) must be strictly after effective date ({effective_date_str})")

        fixed_rate_pct = float(terms.get("fixed_rate", 3.50))
        fixed_rate = fixed_rate_pct / 100.0  # e.g. 0.0385
        floating_index = str(terms.get("floating_index", "SOFR"))
        payer_direction = str(terms.get("fixed_leg_payer", "PAY_FIXED")).upper()
        fixed_freq = str(terms.get("fixed_frequency", "SEMI_ANNUAL")).upper()
        day_count = str(terms.get("day_count_convention", "ACT_360"))

        curve = market.get_curve(currency)
        yield_shift_bps = overrides.yield_curve_shift_bps if (overrides and overrides.yield_curve_shift_bps) else 0.0

        # Helper to compute swap legs given a curve and yield shift
        def evaluate_swap_legs(shift_bps: float = 0.0):
            shift_r = shift_bps * 0.0001
            schedule_dates = generate_swap_dates(eff_date, mat_date, fixed_freq)
            cashflows: list[CashflowScheduleItem] = []
            pv_fixed_leg = 0.0
            pv_float_leg = 0.0
            total_fixed_annuity = 0.0

            # Time to effective date
            t0 = max((eff_date - val_date).days / 365.0, 0.0)
            df0 = curve.get_discount_factor(t0) * math.exp(-shift_r * t0) if t0 > 0 else 1.0

            prev_date = schedule_dates[0]
            prev_df = df0

            for i in range(1, len(schedule_dates)):
                pay_date = schedule_dates[i]
                alpha = calculate_day_count_fraction(prev_date, pay_date, day_count)
                t_pay = (pay_date - val_date).days / 365.0

                if t_pay <= 0.0:
                    # Matured past cashflow
                    prev_date = pay_date
                    continue

                curr_df = curve.get_discount_factor(t_pay) * math.exp(-shift_r * t_pay)

                fixed_cf = notional * fixed_rate * alpha
                # Floating forward rate: (prev_df / curr_df - 1) / alpha
                if alpha > 1e-9:
                    float_rate = (prev_df / curr_df - 1.0) / alpha
                    float_cf = notional * float_rate * alpha
                else:
                    float_cf = 0.0

                pv_fixed_i = fixed_cf * curr_df
                pv_float_i = float_cf * curr_df

                pv_fixed_leg += pv_fixed_i
                pv_float_leg += pv_float_i
                total_fixed_annuity += alpha * curr_df

                cashflows.append(
                    CashflowScheduleItem(
                        period=i,
                        payment_date=pay_date.isoformat(),
                        accrual_fraction=round(alpha, 6),
                        fixed_amount=round(fixed_cf, 2),
                        floating_amount=round(float_cf, 2),
                        net_cashflow=round(float_cf - fixed_cf if payer_direction == "PAY_FIXED" else fixed_cf - float_cf, 2),
                        discount_factor=round(curr_df, 6),
                        present_value=round(pv_float_i - pv_fixed_i if payer_direction == "PAY_FIXED" else pv_fixed_i - pv_float_i, 2),
                    )
                )

                prev_date = pay_date
                prev_df = curr_df

            return pv_fixed_leg, pv_float_leg, total_fixed_annuity, cashflows

        pv_fixed, pv_float, annuity, cashflow_items = evaluate_swap_legs(yield_shift_bps)

        # Apply sign conventions:
        # PAY_FIXED: pays fixed, receives float -> PV = PV_float - PV_fixed
        # RECEIVE_FIXED: receives fixed, pays float -> PV = PV_fixed - PV_float
        is_pay_fixed = payer_direction == FixedPayer.PAY_FIXED.value
        net_pv = pv_float - pv_fixed if is_pay_fixed else pv_fixed - pv_float

        # Greeks:
        # 1. PV01: Value change for a 1 bp increase in fixed rate: notional * 0.0001 * annuity
        # If PAY_FIXED, paying higher rate reduces value (-PV01); if RECEIVE_FIXED, (+PV01)
        pv01_raw = notional * 0.0001 * annuity
        pv01_signed = -pv01_raw if is_pay_fixed else pv01_raw

        # 2. DV01: Value change for a +1 bp parallel curve shift
        pv_f_bump, pv_fl_bump, _, _ = evaluate_swap_legs(yield_shift_bps + 1.0)
        net_pv_bump = (pv_fl_bump - pv_f_bump) if is_pay_fixed else (pv_f_bump - pv_fl_bump)
        dv01_signed = net_pv_bump - net_pv

        # 3. Par Swap Rate: rate that sets Net PV to 0
        par_swap_rate = (pv_float / (notional * annuity) * 100.0) if (annuity > 1e-9) else fixed_rate_pct

        greeks = GreeksResult(
            delta=None,
            gamma=None,
            vega=None,
            theta_per_year=None,
            theta_per_day=None,
            rho=None,
            pv01=round(pv01_signed, 4),
            dv01=round(dv01_signed, 4),
            units={
                "pv01": "Change in Swap PV per 1 bp (0.01%) increase in fixed coupon rate (currency/bp)",
                "dv01": "Change in Swap PV per 1 bp parallel upward shift in discount curve (currency/bp)",
            },
        )

        assumptions = [
            f"Single-curve OIS discounted cash flow framework using {curve.curve_name}",
            f"Floating reference benchmark index: {floating_index}",
            f"Day count convention: {day_count} with {fixed_freq} payment rolls",
            f"Direction: {'Pay Fixed / Receive Float' if is_pay_fixed else 'Receive Fixed / Pay Float'}",
            f"Implied par swap rate at current curve: {par_swap_rate:.4f}%",
        ]
        warnings = []
        if val_date > eff_date:
            warnings.append(f"Valuation date ({val_date}) is after effective date ({eff_date}); past cash flows excluded.")

        return net_pv, greeks, cashflow_items, assumptions, warnings
