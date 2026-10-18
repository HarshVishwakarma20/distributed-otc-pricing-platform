import math
from datetime import date

from pydantic import BaseModel, Field


class CurvePoint(BaseModel):
    """Zero rate and discount factor at a given tenor in years."""
    tenor_years: float = Field(..., ge=0, description="Tenor in annual fraction")
    zero_rate: float = Field(..., description="Continuously compounded zero rate (e.g. 0.045 for 4.5%)")
    discount_factor: float = Field(..., gt=0, le=1.05, description="Discount factor P(0, t)")


class YieldCurve(BaseModel):
    """
    Yield and discount curve representation.
    Supports log-linear discount factor interpolation across tenors.
    """
    currency: str = Field(..., min_length=3, max_length=3)
    curve_name: str = Field(default="SOFR-OIS")
    points: list[CurvePoint]

    def get_discount_factor(self, t: float) -> float:
        """
        Log-linear discount factor interpolation:
        ln(DF(t)) interpolated linearly between grid tenors.
        For t <= 0, returns 1.0.
        For t beyond max tenor, flat zero-rate extrapolation.
        """
        if t <= 0.0:
            return 1.0
        
        pts = sorted(self.points, key=lambda p: p.tenor_years)
        if not pts:
            return 1.0
        
        # If t before first point
        if t <= pts[0].tenor_years:
            t0 = pts[0].tenor_years
            df0 = pts[0].discount_factor
            if t0 <= 1e-9:
                return df0
            # Interpolate between (0, 1.0) and (t0, df0)
            log_df = (t / t0) * math.log(df0)
            return math.exp(log_df)

        # If t beyond last point: flat extrapolation of zero rate
        if t >= pts[-1].tenor_years:
            last_rate = pts[-1].zero_rate
            return math.exp(-last_rate * t)

        # Bracket t between p_i and p_{i+1}
        for i in range(len(pts) - 1):
            t_a, df_a = pts[i].tenor_years, pts[i].discount_factor
            t_b, df_b = pts[i+1].tenor_years, pts[i+1].discount_factor
            if t_a <= t <= t_b:
                dt = t_b - t_a
                if dt <= 1e-9:
                    return df_a
                weight = (t - t_a) / dt
                log_df = (1.0 - weight) * math.log(df_a) + weight * math.log(df_b)
                return math.exp(log_df)

        return pts[-1].discount_factor

    def get_zero_rate(self, t: float) -> float:
        """Extract continuous zero rate r(t) = -ln(DF(t)) / t."""
        if t <= 1e-9:
            return self.points[0].zero_rate if self.points else 0.0
        df = self.get_discount_factor(t)
        return -math.log(df) / t


class EquityMarketInputs(BaseModel):
    """Underlying equity / index parameters for option pricing."""
    spot_price: float = Field(..., gt=0, description="Current spot price S")
    dividend_yield: float = Field(default=0.0, ge=0, description="Continuous dividend yield q")
    volatility: float = Field(..., ge=0, description="Annualized implied volatility sigma (e.g. 0.20 for 20%)")
    risk_free_rate: float = Field(default=0.045, description="Continuous risk-free rate r")


class CreditMarketInputs(BaseModel):
    """Credit market parameters for single-name CDS valuation."""
    hazard_rate: float = Field(..., ge=0, description="Annual constant hazard rate lambda (e.g. 0.02 for 2%)")
    recovery_rate: float = Field(default=0.40, ge=0, le=1.0, description="Estimated recovery rate R upon default")


class MarketSnapshot(BaseModel):
    """
    Comprehensive, immutable market data snapshot for a specific valuation date.
    Acts as the stable interface between Module 3 (Pricing) and future Module 4 (Market Data).
    """
    snapshot_id: str = Field(..., description="Unique snapshot identifier (e.g. MKT-2026-10-15-EOD)")
    valuation_date: date = Field(..., description="Evaluation EOD or intraday date")
    base_currency: str = Field(default="USD")
    default_risk_free_rate: float = Field(default=0.045, description="Benchmark risk-free rate")
    yield_curves: dict[str, YieldCurve] = Field(default_factory=dict)
    equity_spots: dict[str, float] = Field(default_factory=dict)
    equity_vols: dict[str, float] = Field(default_factory=dict)
    equity_dividends: dict[str, float] = Field(default_factory=dict)
    credit_hazard_rates: dict[str, float] = Field(default_factory=dict)
    credit_recovery_rates: dict[str, float] = Field(default_factory=dict)
    fx_spots: dict[str, float] = Field(default_factory=dict)  # e.g. "EUR/USD": 1.0850

    def get_curve(self, currency: str) -> YieldCurve:
        """Retrieve curve for currency or construct default curve."""
        curr = currency.upper()
        if curr in self.yield_curves:
            return self.yield_curves[curr]
        # Return fallback curve using default rate
        r = self.default_risk_free_rate
        return YieldCurve(
            currency=curr,
            curve_name=f"{curr}-FLAT-{r*100:.1f}PCT",
            points=[
                CurvePoint(tenor_years=0.25, zero_rate=r, discount_factor=math.exp(-r * 0.25)),
                CurvePoint(tenor_years=0.5, zero_rate=r, discount_factor=math.exp(-r * 0.5)),
                CurvePoint(tenor_years=1.0, zero_rate=r, discount_factor=math.exp(-r * 1.0)),
                CurvePoint(tenor_years=2.0, zero_rate=r, discount_factor=math.exp(-r * 2.0)),
                CurvePoint(tenor_years=5.0, zero_rate=r, discount_factor=math.exp(-r * 5.0)),
                CurvePoint(tenor_years=10.0, zero_rate=r, discount_factor=math.exp(-r * 10.0)),
                CurvePoint(tenor_years=30.0, zero_rate=r, discount_factor=math.exp(-r * 30.0)),
            ],
        )

    def get_equity_inputs(
        self,
        symbol: str,
        spot_override: float | None = None,
        vol_override: float | None = None,
        rate_override: float | None = None,
        div_override: float | None = None,
    ) -> EquityMarketInputs:
        """Resolve equity inputs, applying scenario overrides where provided."""
        sym = symbol.upper()
        spot = spot_override if spot_override is not None else self.equity_spots.get(sym, 100.0)
        vol = vol_override if vol_override is not None else self.equity_vols.get(sym, 0.20)
        rate = rate_override if rate_override is not None else self.default_risk_free_rate
        div = div_override if div_override is not None else self.equity_dividends.get(sym, 0.0)
        return EquityMarketInputs(
            spot_price=spot,
            dividend_yield=div,
            volatility=vol,
            risk_free_rate=rate,
        )

    def get_credit_inputs(
        self,
        reference_entity: str,
        hazard_override: float | None = None,
        recovery_override: float | None = None,
    ) -> CreditMarketInputs:
        """Resolve credit hazard rate and recovery rate."""
        entity = reference_entity.strip()
        hazard = hazard_override if hazard_override is not None else self.credit_hazard_rates.get(entity, 0.02)
        recovery = recovery_override if recovery_override is not None else self.credit_recovery_rates.get(entity, 0.40)
        return CreditMarketInputs(hazard_rate=hazard, recovery_rate=recovery)

    def get_fx_rate(self, pair: str, override: float | None = None) -> float:
        """Resolve FX spot rate (e.g. 'EUR/USD' or 'USD/EUR')."""
        if override is not None:
            return override
        pair_clean = pair.upper()
        if pair_clean in self.fx_spots:
            return self.fx_spots[pair_clean]
        # Inversion check
        parts = pair_clean.split("/")
        if len(parts) == 2:
            inv = f"{parts[1]}/{parts[0]}"
            if inv in self.fx_spots and self.fx_spots[inv] > 0:
                return 1.0 / self.fx_spots[inv]
        # Default parity
        return 1.0


def create_deterministic_market_snapshot(valuation_date: date) -> MarketSnapshot:
    """
    Produces an institutional-grade, deterministic market data snapshot.
    Used for reproducible unit tests and standalone pricing before Module 4 feed integration.
    """
    usd_points = [
        CurvePoint(tenor_years=0.0833, zero_rate=0.0485, discount_factor=math.exp(-0.0485 * 0.0833)),
        CurvePoint(tenor_years=0.25, zero_rate=0.0480, discount_factor=math.exp(-0.0480 * 0.25)),
        CurvePoint(tenor_years=0.5, zero_rate=0.0470, discount_factor=math.exp(-0.0470 * 0.5)),
        CurvePoint(tenor_years=1.0, zero_rate=0.0450, discount_factor=math.exp(-0.0450 * 1.0)),
        CurvePoint(tenor_years=2.0, zero_rate=0.0425, discount_factor=math.exp(-0.0425 * 2.0)),
        CurvePoint(tenor_years=3.0, zero_rate=0.0410, discount_factor=math.exp(-0.0410 * 3.0)),
        CurvePoint(tenor_years=5.0, zero_rate=0.0400, discount_factor=math.exp(-0.0400 * 5.0)),
        CurvePoint(tenor_years=7.0, zero_rate=0.0395, discount_factor=math.exp(-0.0395 * 7.0)),
        CurvePoint(tenor_years=10.0, zero_rate=0.0390, discount_factor=math.exp(-0.0390 * 10.0)),
        CurvePoint(tenor_years=30.0, zero_rate=0.0405, discount_factor=math.exp(-0.0405 * 30.0)),
    ]

    eur_points = [
        CurvePoint(tenor_years=0.25, zero_rate=0.0340, discount_factor=math.exp(-0.0340 * 0.25)),
        CurvePoint(tenor_years=0.5, zero_rate=0.0330, discount_factor=math.exp(-0.0330 * 0.5)),
        CurvePoint(tenor_years=1.0, zero_rate=0.0315, discount_factor=math.exp(-0.0315 * 1.0)),
        CurvePoint(tenor_years=2.0, zero_rate=0.0290, discount_factor=math.exp(-0.0290 * 2.0)),
        CurvePoint(tenor_years=5.0, zero_rate=0.0270, discount_factor=math.exp(-0.0270 * 5.0)),
        CurvePoint(tenor_years=10.0, zero_rate=0.0260, discount_factor=math.exp(-0.0260 * 10.0)),
    ]

    gbp_points = [
        CurvePoint(tenor_years=0.25, zero_rate=0.0490, discount_factor=math.exp(-0.0490 * 0.25)),
        CurvePoint(tenor_years=0.5, zero_rate=0.0480, discount_factor=math.exp(-0.0480 * 0.5)),
        CurvePoint(tenor_years=1.0, zero_rate=0.0460, discount_factor=math.exp(-0.0460 * 1.0)),
        CurvePoint(tenor_years=5.0, zero_rate=0.0420, discount_factor=math.exp(-0.0420 * 5.0)),
        CurvePoint(tenor_years=10.0, zero_rate=0.0410, discount_factor=math.exp(-0.0410 * 10.0)),
    ]

    return MarketSnapshot(
        snapshot_id=f"MKT-{valuation_date.isoformat()}-FIXTURE",
        valuation_date=valuation_date,
        base_currency="USD",
        default_risk_free_rate=0.0450,
        yield_curves={
            "USD": YieldCurve(currency="USD", curve_name="USD-SOFR-OIS", points=usd_points),
            "EUR": YieldCurve(currency="EUR", curve_name="EUR-ESTR-OIS", points=eur_points),
            "GBP": YieldCurve(currency="GBP", curve_name="GBP-SONIA-OIS", points=gbp_points),
        },
        equity_spots={
            "SPX": 5000.0,
            "AAPL": 185.0,
            "MSFT": 420.0,
            "TSLA": 210.0,
            "NVDA": 125.0,
            "GOOGL": 175.0,
            "AMZN": 180.0,
        },
        equity_vols={
            "SPX": 0.165,
            "AAPL": 0.240,
            "MSFT": 0.220,
            "TSLA": 0.480,
            "NVDA": 0.450,
            "GOOGL": 0.260,
            "AMZN": 0.280,
        },
        equity_dividends={
            "SPX": 0.015,
            "AAPL": 0.005,
            "MSFT": 0.007,
            "TSLA": 0.0,
            "NVDA": 0.002,
            "GOOGL": 0.0,
            "AMZN": 0.0,
        },
        credit_hazard_rates={
            "Ford Motor Credit Co LLC": 0.020,  # ~120 bps spread / (1 - 0.40)
            "General Motors Financial": 0.018,
            "Boeing Company": 0.022,
            "AT&T Inc": 0.015,
            "Apple Inc": 0.004,
        },
        credit_recovery_rates={
            "Ford Motor Credit Co LLC": 0.40,
            "General Motors Financial": 0.40,
            "Boeing Company": 0.40,
            "AT&T Inc": 0.40,
            "Apple Inc": 0.40,
        },
        fx_spots={
            "EUR/USD": 1.0850,
            "USD/EUR": 1.0 / 1.0850,
            "GBP/USD": 1.2950,
            "USD/GBP": 1.0 / 1.2950,
            "USD/JPY": 154.20,
            "JPY/USD": 1.0 / 154.20,
        },
    )
