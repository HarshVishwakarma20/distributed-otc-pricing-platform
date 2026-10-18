import datetime
import math

import pytest
from app.domain.enums import InstrumentType
from app.pricing.market_data import create_deterministic_market_snapshot
from app.pricing.models.bsm import bsm_analytical_price
from app.pricing.models.cds import ISDAHazardRateCDSModel
from app.pricing.models.currency_swap import CrossCurrencySwapModel
from app.pricing.models.irs import DiscountedCashFlowIRSModel


def test_hull_options_benchmark():
    """
    Standard textbook benchmark from John C. Hull,
    Options, Futures, and Other Derivatives (11th Ed):
    S=42, K=40, T=0.5, r=0.10, sigma=0.20, q=0.0
    Expected Call = 4.7594, Expected Put = 0.8086
    """
    s = 42.0
    k = 40.0
    t = 0.5
    r = 0.10
    q = 0.0
    sigma = 0.20

    call_pv, call_greeks, _, _ = bsm_analytical_price(s, k, t, r, q, sigma, is_call=True)
    put_pv, put_greeks, _, _ = bsm_analytical_price(s, k, t, r, q, sigma, is_call=False)

    assert call_pv == pytest.approx(4.7594, abs=1e-4)
    assert put_pv == pytest.approx(0.8086, abs=1e-4)
    assert call_greeks["delta"] == pytest.approx(0.7791, abs=1e-3)
    assert put_greeks["delta"] == pytest.approx(-0.2209, abs=1e-3)


def test_put_call_parity():
    """
    Validates BSM Put-Call Parity across multiple parameter regimes:
    C - P = S * exp(-q * T) - K * exp(-r * T)
    """
    test_cases = [
        {"s": 100.0, "k": 100.0, "t": 1.0, "r": 0.05, "q": 0.02, "vol": 0.20},
        {"s": 150.0, "k": 120.0, "t": 0.75, "r": 0.04, "q": 0.00, "vol": 0.35},
        {"s": 80.0, "k": 100.0, "t": 2.5, "r": 0.03, "q": 0.03, "vol": 0.15},
        {"s": 5000.0, "k": 5200.0, "t": 0.25, "r": 0.045, "q": 0.015, "vol": 0.18},
    ]

    for tc in test_cases:
        s, k, t, r, q, vol = tc["s"], tc["k"], tc["t"], tc["r"], tc["q"], tc["vol"]
        c, _, _, _ = bsm_analytical_price(s, k, t, r, q, vol, is_call=True)
        p, _, _, _ = bsm_analytical_price(s, k, t, r, q, vol, is_call=False)

        parity_rhs = s * math.exp(-q * t) - k * math.exp(-r * t)
        assert (c - p) == pytest.approx(parity_rhs, rel=1e-7, abs=1e-7)


def test_delta_bounds_and_relationship():
    """
    Validates delta bounds:
    0 <= Delta_call <= exp(-q*T)
    -exp(-q*T) <= Delta_put <= 0
    Delta_call - Delta_put = exp(-q*T)
    """
    s, k, t, r, q, vol = 100.0, 105.0, 1.5, 0.04, 0.018, 0.25
    df_q = math.exp(-q * t)

    _, call_greeks, _, _ = bsm_analytical_price(s, k, t, r, q, vol, is_call=True)
    _, put_greeks, _, _ = bsm_analytical_price(s, k, t, r, q, vol, is_call=False)

    c_delta = call_greeks["delta"]
    p_delta = put_greeks["delta"]
    assert c_delta is not None
    assert p_delta is not None

    assert 0.0 < c_delta < df_q
    assert -df_q < p_delta < 0.0
    assert (c_delta - p_delta) == pytest.approx(df_q, abs=1e-9)


def test_finite_difference_greeks():
    """
    Verifies that analytical Greeks match numerical finite-difference bumps:
    Delta: dV/dS
    Gamma: d2V/dS2
    Vega: dV/d(sigma)
    Theta: -dV/dT
    Rho: dV/dr
    """
    s = 100.0
    k = 102.0
    t = 1.0
    r = 0.045
    q = 0.015
    vol = 0.22

    for is_call in [True, False]:
        v0, greeks, _, _ = bsm_analytical_price(s, k, t, r, q, vol, is_call=is_call)

        # 1. Delta: dV/dS
        hs = 1e-4
        vp_s, _, _, _ = bsm_analytical_price(s + hs, k, t, r, q, vol, is_call=is_call)
        vm_s, _, _, _ = bsm_analytical_price(s - hs, k, t, r, q, vol, is_call=is_call)
        num_delta = (vp_s - vm_s) / (2.0 * hs)
        assert greeks["delta"] == pytest.approx(num_delta, abs=1e-5)

        # 2. Gamma: d2V/dS2
        hg = 1e-3
        vp_g, _, _, _ = bsm_analytical_price(s + hg, k, t, r, q, vol, is_call=is_call)
        vm_g, _, _, _ = bsm_analytical_price(s - hg, k, t, r, q, vol, is_call=is_call)
        num_gamma = (vp_g - 2.0 * v0 + vm_g) / (hg * hg)
        assert greeks["gamma"] == pytest.approx(num_gamma, abs=1e-4)

        # 3. Vega: dV/d(sigma)
        hv = 1e-5
        vp_v, _, _, _ = bsm_analytical_price(s, k, t, r, q, vol + hv, is_call=is_call)
        vm_v, _, _, _ = bsm_analytical_price(s, k, t, r, q, vol - hv, is_call=is_call)
        num_vega = (vp_v - vm_v) / (2.0 * hv)
        assert greeks["vega"] == pytest.approx(num_vega, abs=1e-4)

        # 4. Theta: -dV/dT
        ht = 1e-5
        vp_t, _, _, _ = bsm_analytical_price(s, k, t + ht, r, q, vol, is_call=is_call)
        vm_t, _, _, _ = bsm_analytical_price(s, k, t - ht, r, q, vol, is_call=is_call)
        num_theta = -(vp_t - vm_t) / (2.0 * ht)
        assert greeks["theta_per_year"] == pytest.approx(num_theta, abs=1e-4)

        # 5. Rho: dV/dr
        hr = 1e-5
        vp_r, _, _, _ = bsm_analytical_price(s, k, t, r + hr, q, vol, is_call=is_call)
        vm_r, _, _, _ = bsm_analytical_price(s, k, t, r - hr, q, vol, is_call=is_call)
        num_rho = (vp_r - vm_r) / (2.0 * hr)
        assert greeks["rho"] == pytest.approx(num_rho, abs=1e-4)


def test_zero_volatility_limit():
    """
    Tests edge condition sigma=0:
    Present value must match discounted forward payoff e^(-rT) * max(F - K, 0).
    """
    s = 100.0
    k = 90.0
    t = 1.0
    r = 0.05
    q = 0.02
    forward = s * math.exp((r - q) * t)

    call_pv, call_greeks, _, warnings = bsm_analytical_price(s, k, t, r, q, 0.0, is_call=True)
    expected_call = math.exp(-r * t) * (forward - k)

    assert call_pv == pytest.approx(expected_call, abs=1e-7)
    assert call_greeks["vega"] == 0.0
    assert any("Zero volatility limit" in w for w in warnings)


def test_expiry_boundary():
    """
    Tests edge condition T=0:
    Present value must equal intrinsic payoff max(S - K, 0).
    """
    s = 105.0
    k = 100.0
    call_pv, call_greeks, _, warnings = bsm_analytical_price(s, k, 0.0, 0.05, 0.0, 0.20, is_call=True)
    put_pv, put_greeks, _, _ = bsm_analytical_price(s, k, 0.0, 0.05, 0.0, 0.20, is_call=False)

    assert call_pv == 5.0
    assert put_pv == 0.0
    assert call_greeks["delta"] == 1.0
    assert put_greeks["delta"] == 0.0
    assert any("at expiration" in w for w in warnings)

    # At-the-money discontinuity
    atm_call, atm_greeks, _, _ = bsm_analytical_price(100.0, 100.0, 0.0, 0.05, 0.0, 0.20, is_call=True)
    assert atm_call == 0.0
    assert atm_greeks["delta"] is None
    assert atm_greeks["gamma"] is None


def test_irs_par_swap_and_symmetry():
    """
    Tests Interest Rate Swap (IRS) Discounted Cash Flow model:
    - PAY_FIXED and RECEIVE_FIXED have opposite Net PVs
    - At par fixed rate, swap Net PV is approximately zero
    """
    val_date = datetime.date(2026, 10, 15)
    market = create_deterministic_market_snapshot(val_date)
    irs_model = DiscountedCashFlowIRSModel()

    terms_pay = {
        "fixed_rate": 4.15,
        "floating_index": "SOFR",
        "fixed_leg_payer": "PAY_FIXED",
        "fixed_frequency": "SEMI_ANNUAL",
        "day_count_convention": "ACT_360",
    }
    terms_rec = dict(terms_pay)
    terms_rec["fixed_leg_payer"] = "RECEIVE_FIXED"

    pv_pay, greeks_pay, cfs_pay, assumptions, _ = irs_model.price(
        instrument_type=InstrumentType.INTEREST_RATE_SWAP,
        terms=terms_pay,
        notional=10_000_000.0,
        currency="USD",
        effective_date_str="2026-10-15",
        maturity_date_str="2031-10-15",
        valuation_date_str="2026-10-15",
        market=market,
    )

    pv_rec, greeks_rec, _, _, _ = irs_model.price(
        instrument_type=InstrumentType.INTEREST_RATE_SWAP,
        terms=terms_rec,
        notional=10_000_000.0,
        currency="USD",
        effective_date_str="2026-10-15",
        maturity_date_str="2031-10-15",
        valuation_date_str="2026-10-15",
        market=market,
    )

    # PV Symmetry
    assert pv_pay == pytest.approx(-pv_rec, abs=1e-2)
    assert greeks_pay is not None and greeks_rec is not None
    assert greeks_pay.pv01 is not None and greeks_rec.pv01 is not None
    assert greeks_pay.pv01 == pytest.approx(-greeks_rec.pv01, abs=1e-4)
    assert cfs_pay is not None
    assert len(cfs_pay) == 10  # 5 years * 2 semi-annual payments

    # Par Swap Rate Test
    # Find par rate from assumptions
    par_rate_str = [a for a in assumptions if "par swap rate" in a][0]
    par_rate = float(par_rate_str.split(":")[-1].replace("%", "").strip())

    terms_par = dict(terms_pay)
    terms_par["fixed_rate"] = par_rate
    pv_par, _, _, _, _ = irs_model.price(
        instrument_type=InstrumentType.INTEREST_RATE_SWAP,
        terms=terms_par,
        notional=10_000_000.0,
        currency="USD",
        effective_date_str="2026-10-15",
        maturity_date_str="2031-10-15",
        valuation_date_str="2026-10-15",
        market=market,
    )
    assert abs(pv_par) < 50.0  # Net PV within $50 on $10M notional


def test_currency_swap_dcf():
    """Validates Currency Swap dual-leg valuation and FX conversion."""
    val_date = datetime.date(2026, 10, 15)
    market = create_deterministic_market_snapshot(val_date)
    xccy_model = CrossCurrencySwapModel()

    terms = {
        "pay_currency": "USD",
        "receive_currency": "EUR",
        "pay_notional": 10_000_000.0,
        "receive_notional": 9_200_000.0,
        "pay_leg_rate_type": "FIXED",
        "receive_leg_rate_type": "FIXED",
        "pay_fixed_rate": 4.0,
        "receive_fixed_rate": 2.8,
        "payment_frequency": "SEMI_ANNUAL",
        "principal_exchange": "INITIAL_AND_FINAL",
        "day_count_convention": "ACT_360",
    }

    pv, greeks, cfs, assumptions, _ = xccy_model.price(
        instrument_type=InstrumentType.CURRENCY_SWAP,
        terms=terms,
        notional=10_000_000.0,
        currency="USD",
        effective_date_str="2026-10-15",
        maturity_date_str="2029-10-15",
        valuation_date_str="2026-10-15",
        market=market,
    )

    assert math.isfinite(pv)
    assert cfs is not None
    assert len(cfs) == 6  # 3 years semi-annual
    assert greeks is not None and greeks.delta is not None
    assert greeks.delta > 0.0  # Positive FX delta to EUR/USD


def test_cds_isda_hazard_rate():
    """Validates Credit Default Swap (CDS) hazard rate pricing and buyer/seller sign."""
    val_date = datetime.date(2026, 10, 15)
    market = create_deterministic_market_snapshot(val_date)
    cds_model = ISDAHazardRateCDSModel()

    terms_buy = {
        "reference_entity": "Ford Motor Credit Co LLC",
        "direction": "BUY_PROTECTION",
        "spread_bps": 120.0,
        "premium_frequency": "QUARTERLY",
        "day_count_convention": "ACT_360",
    }
    terms_sell = dict(terms_buy)
    terms_sell["direction"] = "SELL_PROTECTION"

    pv_buy, greeks_buy, cfs_buy, _, _ = cds_model.price(
        instrument_type=InstrumentType.CREDIT_DEFAULT_SWAP,
        terms=terms_buy,
        notional=5_000_000.0,
        currency="USD",
        effective_date_str="2026-10-15",
        maturity_date_str="2031-10-15",
        valuation_date_str="2026-10-15",
        market=market,
    )

    pv_sell, greeks_sell, _, _, _ = cds_model.price(
        instrument_type=InstrumentType.CREDIT_DEFAULT_SWAP,
        terms=terms_sell,
        notional=5_000_000.0,
        currency="USD",
        effective_date_str="2026-10-15",
        maturity_date_str="2031-10-15",
        valuation_date_str="2026-10-15",
        market=market,
    )

    assert pv_buy == pytest.approx(-pv_sell, abs=1e-2)
    assert greeks_buy is not None and greeks_buy.cs01 is not None
    assert greeks_sell is not None and greeks_sell.cs01 is not None
    assert greeks_buy.cs01 > 0.0  # Buyer gains when credit spread widens
    assert greeks_sell.cs01 < 0.0  # Seller loses when credit spread widens
    assert cfs_buy is not None
    assert len(cfs_buy) == 20  # 5 years quarterly
