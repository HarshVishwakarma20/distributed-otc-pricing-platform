import csv
import datetime
import io

import numpy as np

from app.domain.enums import (
    ActivitySeverity,
    ContractStatus,
    InstrumentType,
    JobStatus,
    ServiceHealthStatus,
    SimulationType,
    ValuationStatus,
)
from app.domain.schemas import (
    ActivityEvent,
    ContractSummary,
    FXRateItem,
    KPISummary,
    PortfolioExposure,
    PortfolioSummary,
    PricingWorkbenchRequest,
    PricingWorkbenchResponse,
    ServiceStatus,
    SimulationJobSummary,
    SystemHealthSummary,
    ValuationSummary,
    ValueHistoryPoint,
    YieldCurvePoint,
)
from app.interfaces.providers import IDataProvider


class MockDataProvider(IDataProvider):
    """
    Deterministic synthetic mock data provider for Module 1.
    All figures are generated with fixed seeds and explicit demo flags.
    No live financial services, pricing engines, or databases are required.
    """

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
        self._rng = np.random.default_rng(seed)
        self._anchor_time = datetime.datetime(2026, 10, 14, 18, 0, 0, tzinfo=datetime.UTC)

    def get_kpi_summary(self) -> KPISummary:
        return KPISummary(
            total_notional=1_425_000_000.00,
            total_market_value=48_320_500.00,
            active_contracts=84,
            daily_pnl=642_300.00,
            daily_pnl_pct=1.35,
            simulated_var_95_1d=2_850_000.00,
            active_simulation_jobs=3,
            currency="USD",
            valuation_timestamp=self._anchor_time.isoformat(),
            is_demo_data=True,
        )

    def get_value_history(self, days: int = 30) -> list[ValueHistoryPoint]:
        rng = np.random.default_rng(self.seed)
        start_date = self._anchor_time.date() - datetime.timedelta(days=days)

        # Generate realistic geometric random walk
        daily_returns = rng.normal(loc=0.0006, scale=0.008, size=days)
        base_value = 42_500_000.0
        values = [base_value]
        for r in daily_returns:
            values.append(values[-1] * (1.0 + r))

        history: list[ValueHistoryPoint] = []
        cumulative_pnl = 0.0

        for i in range(days):
            current_date = start_date + datetime.timedelta(days=i + 1)
            mv = round(values[i + 1], 2)
            prev_mv = values[i]
            pnl = round(mv - prev_mv, 2)
            cumulative_pnl += pnl

            history.append(
                ValueHistoryPoint(
                    date=current_date.strftime("%Y-%m-%d"),
                    market_value=mv,
                    daily_pnl=pnl,
                    cumulative_pnl=round(cumulative_pnl, 2),
                )
            )

        return history

    def get_portfolio_exposures(self) -> list[PortfolioExposure]:
        return [
            PortfolioExposure(
                instrument_type=InstrumentType.INTEREST_RATE_SWAP,
                notional=820_000_000.0,
                market_value=27_850_000.0,
                delta_equivalent=24_100_000.0,
                percentage_of_total=57.54,
                contract_count=42,
            ),
            PortfolioExposure(
                instrument_type=InstrumentType.EUROPEAN_OPTION,
                notional=240_000_000.0,
                market_value=8_920_500.0,
                delta_equivalent=14_300_000.0,
                percentage_of_total=16.84,
                contract_count=18,
            ),
            PortfolioExposure(
                instrument_type=InstrumentType.CURRENCY_SWAP,
                notional=215_000_000.0,
                market_value=6_450_000.0,
                delta_equivalent=5_900_000.0,
                percentage_of_total=15.09,
                contract_count=14,
            ),
            PortfolioExposure(
                instrument_type=InstrumentType.CREDIT_DEFAULT_SWAP,
                notional=150_000_000.0,
                market_value=5_100_000.0,
                delta_equivalent=4_200_000.0,
                percentage_of_total=10.53,
                contract_count=10,
            ),
        ]

    def get_recent_valuations(self, limit: int = 10) -> list[ValuationSummary]:
        valuations = [
            ValuationSummary(
                valuation_id="VAL-2026-901",
                contract_id="CNT-IRS-1001",
                instrument=InstrumentType.INTEREST_RATE_SWAP,
                valuation_timestamp="2026-10-14T17:45:00Z",
                market_value=1_420_350.00,
                currency="USD",
                model_used="Discounted Cash Flow (Dual Curve)",
                status=ValuationStatus.COMPLETED,
                pv01=4850.25,
                dv01=4790.10,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-902",
                contract_id="CNT-EUR-2002",
                instrument=InstrumentType.EUROPEAN_OPTION,
                valuation_timestamp="2026-10-14T17:42:15Z",
                market_value=-340_800.00,
                currency="USD",
                model_used="Black-Scholes-Merton 76",
                status=ValuationStatus.COMPLETED,
                pv01=-820.00,
                dv01=-795.50,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-903",
                contract_id="CNT-FXS-3003",
                instrument=InstrumentType.CURRENCY_SWAP,
                valuation_timestamp="2026-10-14T17:35:50Z",
                market_value=890_400.00,
                currency="USD",
                model_used="Cross-Currency Basis Curve",
                status=ValuationStatus.COMPLETED,
                pv01=3120.00,
                dv01=3080.40,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-904",
                contract_id="CNT-CDS-4004",
                instrument=InstrumentType.CREDIT_DEFAULT_SWAP,
                valuation_timestamp="2026-10-14T17:28:10Z",
                market_value=-185_200.00,
                currency="USD",
                model_used="ISDA Standard Hazard Rate Engine",
                status=ValuationStatus.COMPLETED,
                pv01=-540.00,
                dv01=-515.20,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-905",
                contract_id="CNT-IRS-1005",
                instrument=InstrumentType.INTEREST_RATE_SWAP,
                valuation_timestamp="2026-10-14T17:15:30Z",
                market_value=2_340_000.00,
                currency="USD",
                model_used="Discounted Cash Flow (Dual Curve)",
                status=ValuationStatus.COMPLETED,
                pv01=7240.50,
                dv01=7180.00,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-906",
                contract_id="CNT-EUR-2006",
                instrument=InstrumentType.EUROPEAN_OPTION,
                valuation_timestamp="2026-10-14T17:02:45Z",
                market_value=512_000.00,
                currency="USD",
                model_used="Heston Stochastic Volatility",
                status=ValuationStatus.IN_PROGRESS,
                pv01=1420.00,
                dv01=1390.00,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-907",
                contract_id="CNT-FXS-3007",
                instrument=InstrumentType.CURRENCY_SWAP,
                valuation_timestamp="2026-10-14T16:48:10Z",
                market_value=670_100.00,
                currency="USD",
                model_used="Cross-Currency Basis Curve",
                status=ValuationStatus.COMPLETED,
                pv01=2350.00,
                dv01=2310.00,
            ),
            ValuationSummary(
                valuation_id="VAL-2026-908",
                contract_id="CNT-CDS-4008",
                instrument=InstrumentType.CREDIT_DEFAULT_SWAP,
                valuation_timestamp="2026-10-14T16:30:00Z",
                market_value=-95_400.00,
                currency="USD",
                model_used="ISDA Standard Hazard Rate Engine",
                status=ValuationStatus.COMPLETED,
                pv01=-310.00,
                dv01=-295.00,
            ),
        ]
        return valuations[:limit]

    def get_recent_activity(self, limit: int = 10) -> list[ActivityEvent]:
        events = [
            ActivityEvent(
                event_id="EVT-101",
                event_type="VALUATION_COMPLETED",
                title="EOD Portfolio Mark-to-Market Completed",
                description="84 active derivative contracts valued against latest market curves.",
                timestamp="2026-10-14T17:45:00Z",
                severity=ActivitySeverity.SUCCESS,
            ),
            ActivityEvent(
                event_id="EVT-102",
                event_type="SIMULATION_SUBMITTED",
                title="Distributed Monte Carlo Job #SIM-804 Submitted",
                description="Heston Stochastic Volatility job dispatched to 16 synthetic worker slots.",
                timestamp="2026-10-14T17:30:12Z",
                severity=ActivitySeverity.INFO,
            ),
            ActivityEvent(
                event_id="EVT-103",
                event_type="DATA_IMPORTED",
                title="SOFR Zero Curve Ingested",
                description="Tenors 1M to 30Y successfully updated from benchmark rate feeds.",
                timestamp="2026-10-14T17:10:00Z",
                severity=ActivitySeverity.INFO,
            ),
            ActivityEvent(
                event_id="EVT-104",
                event_type="WORKER_REBALANCED",
                title="Worker Node #4 Workload Rebalanced",
                description="Synthetic cluster load-balancer shifted 25,000 paths from Worker-04 to Worker-02.",
                timestamp="2026-10-14T16:55:20Z",
                severity=ActivitySeverity.WARNING,
            ),
            ActivityEvent(
                event_id="EVT-105",
                event_type="CONTRACT_CREATED",
                title="New Contract Staged: CNT-IRS-1009",
                description="USD 50M 5Y Fixed-for-Floating IRS counterparty Barclays Capital staged for confirmation.",
                timestamp="2026-10-14T16:20:45Z",
                severity=ActivitySeverity.SUCCESS,
            ),
        ]
        return events[:limit]

    def get_simulation_jobs(self) -> list[SimulationJobSummary]:
        return [
            SimulationJobSummary(
                job_id="SIM-804",
                simulation_type=SimulationType.HESTON_STOCHASTIC_VOL,
                status=JobStatus.RUNNING,
                progress=68.5,
                paths=500_000,
                time_steps=252,
                elapsed_sec=14.2,
                submitted_time="2026-10-14T17:30:12Z",
            ),
            SimulationJobSummary(
                job_id="SIM-803",
                simulation_type=SimulationType.HULL_WHITE_2F,
                status=JobStatus.RUNNING,
                progress=42.0,
                paths=250_000,
                time_steps=360,
                elapsed_sec=8.7,
                submitted_time="2026-10-14T17:34:00Z",
            ),
            SimulationJobSummary(
                job_id="SIM-802",
                simulation_type=SimulationType.MONTE_CARLO_BS,
                status=JobStatus.COMPLETED,
                progress=100.0,
                paths=1_000_000,
                time_steps=100,
                elapsed_sec=22.4,
                submitted_time="2026-10-14T17:10:05Z",
            ),
            SimulationJobSummary(
                job_id="SIM-801",
                simulation_type=SimulationType.VASICEK_SHORT_RATE,
                status=JobStatus.QUEUED,
                progress=0.0,
                paths=100_000,
                time_steps=180,
                elapsed_sec=0.0,
                submitted_time="2026-10-14T17:38:22Z",
            ),
        ]

    def get_contracts(self) -> list[ContractSummary]:
        return [
            ContractSummary(
                contract_id="CNT-IRS-1001",
                counterparty="JPMorgan Chase NA",
                instrument_type=InstrumentType.INTEREST_RATE_SWAP,
                notional=100_000_000.0,
                currency="USD",
                start_date="2024-01-15",
                maturity_date="2029-01-15",
                status=ContractStatus.ACTIVE,
                fixed_rate=3.85,
                floating_index="SOFR 3M",
                market_value=1_420_350.0,
            ),
            ContractSummary(
                contract_id="CNT-EUR-2002",
                counterparty="Goldman Sachs Bank USA",
                instrument_type=InstrumentType.EUROPEAN_OPTION,
                notional=50_000_000.0,
                currency="USD",
                start_date="2024-06-01",
                maturity_date="2027-06-01",
                status=ContractStatus.ACTIVE,
                fixed_rate=None,
                floating_index=None,
                market_value=-340_800.0,
            ),
            ContractSummary(
                contract_id="CNT-FXS-3003",
                counterparty="Barclays Capital",
                instrument_type=InstrumentType.CURRENCY_SWAP,
                notional=75_000_000.0,
                currency="USD",
                start_date="2023-11-20",
                maturity_date="2028-11-20",
                status=ContractStatus.ACTIVE,
                fixed_rate=4.10,
                floating_index="EURIBOR 6M",
                market_value=890_400.0,
            ),
            ContractSummary(
                contract_id="CNT-CDS-4004",
                counterparty="Morgan Stanley & Co",
                instrument_type=InstrumentType.CREDIT_DEFAULT_SWAP,
                notional=40_000_000.0,
                currency="USD",
                start_date="2024-03-20",
                maturity_date="2029-03-20",
                status=ContractStatus.ACTIVE,
                fixed_rate=1.20,
                floating_index=None,
                market_value=-185_200.0,
            ),
            ContractSummary(
                contract_id="CNT-IRS-1005",
                counterparty="Citigroup Global Markets",
                instrument_type=InstrumentType.INTEREST_RATE_SWAP,
                notional=150_000_000.0,
                currency="USD",
                start_date="2025-02-10",
                maturity_date="2035-02-10",
                status=ContractStatus.ACTIVE,
                fixed_rate=3.95,
                floating_index="SOFR 3M",
                market_value=2_340_000.0,
            ),
            ContractSummary(
                contract_id="CNT-EUR-2006",
                counterparty="BNP Paribas",
                instrument_type=InstrumentType.EUROPEAN_OPTION,
                notional=30_000_000.0,
                currency="USD",
                start_date="2025-05-15",
                maturity_date="2026-11-15",
                status=ContractStatus.PENDING_CONFIRMATION,
                fixed_rate=None,
                floating_index=None,
                market_value=512_000.0,
            ),
        ]

    def get_portfolios(self) -> list[PortfolioSummary]:
        return [
            PortfolioSummary(
                portfolio_id="PTF-GLOBAL-RATES",
                name="Global Rates & Swaps Book",
                base_currency="USD",
                total_notional=820_000_000.0,
                market_value=27_850_000.0,
                contracts_count=42,
                risk_level="Moderate",
            ),
            PortfolioSummary(
                portfolio_id="PTF-FX-HEDGING",
                name="Macro Cross-Currency Book",
                base_currency="USD",
                total_notional=215_000_000.0,
                market_value=6_450_000.0,
                contracts_count=14,
                risk_level="Low-Moderate",
            ),
            PortfolioSummary(
                portfolio_id="PTF-EQUITY-DERIV",
                name="Structured Equity Volatility Book",
                base_currency="USD",
                total_notional=240_000_000.0,
                market_value=8_920_500.0,
                contracts_count=18,
                risk_level="High",
            ),
            PortfolioSummary(
                portfolio_id="PTF-CREDIT-PROTECTION",
                name="Sovereign & Corp Credit Protection",
                base_currency="USD",
                total_notional=150_000_000.0,
                market_value=5_100_000.0,
                contracts_count=10,
                risk_level="Moderate-High",
            ),
        ]

    def get_yield_curve(self) -> list[YieldCurvePoint]:
        return [
            YieldCurvePoint(tenor="1M", zero_rate=4.85, par_yield=4.82, discount_factor=0.9960),
            YieldCurvePoint(tenor="3M", zero_rate=4.75, par_yield=4.73, discount_factor=0.9882),
            YieldCurvePoint(tenor="6M", zero_rate=4.60, par_yield=4.58, discount_factor=0.9775),
            YieldCurvePoint(tenor="1Y", zero_rate=4.38, par_yield=4.35, discount_factor=0.9580),
            YieldCurvePoint(tenor="2Y", zero_rate=4.15, par_yield=4.12, discount_factor=0.9203),
            YieldCurvePoint(tenor="5Y", zero_rate=3.92, par_yield=3.89, discount_factor=0.8220),
            YieldCurvePoint(tenor="10Y", zero_rate=4.08, par_yield=4.05, discount_factor=0.6651),
            YieldCurvePoint(tenor="30Y", zero_rate=4.35, par_yield=4.31, discount_factor=0.2725),
        ]

    def get_fx_rates(self) -> list[FXRateItem]:
        return [
            FXRateItem(pair="EUR/USD", spot_rate=1.0845, change_24h=0.0032, change_pct=0.30),
            FXRateItem(pair="GBP/USD", spot_rate=1.2980, change_24h=-0.0015, change_pct=-0.12),
            FXRateItem(pair="USD/JPY", spot_rate=152.40, change_24h=0.85, change_pct=0.56),
            FXRateItem(pair="USD/CHF", spot_rate=0.8820, change_24h=-0.0020, change_pct=-0.23),
        ]

    def get_system_health(self) -> SystemHealthSummary:
        return SystemHealthSummary(
            status=ServiceHealthStatus.HEALTHY,
            active_workers=16,
            total_workers=16,
            queue_depth=2,
            cpu_load_pct=34.2,
            memory_load_pct=58.6,
            error_rate_pct=0.0,
            services=[
                ServiceStatus(
                    name="API Gateway",
                    status=ServiceHealthStatus.HEALTHY,
                    latency_ms=18.4,
                    last_heartbeat="2026-10-14T17:59:58Z",
                    details="FastAPI v0.143 serving synthetic endpoints",
                ),
                ServiceStatus(
                    name="Pricing Provider (Module 3)",
                    status=ServiceHealthStatus.DEGRADED,
                    latency_ms=0.0,
                    last_heartbeat="2026-10-14T17:59:50Z",
                    details="Synthetic Mock Mode active; real pricing engine pending Module 3",
                ),
                ServiceStatus(
                    name="Simulation Cluster (Module 7)",
                    status=ServiceHealthStatus.HEALTHY,
                    latency_ms=28.1,
                    last_heartbeat="2026-10-14T17:59:55Z",
                    details="Simulated 16-worker pool operational for Monte Carlo tasks",
                ),
                ServiceStatus(
                    name="Market Data Feeds (Module 4)",
                    status=ServiceHealthStatus.DEGRADED,
                    latency_ms=0.0,
                    last_heartbeat="2026-10-14T17:59:45Z",
                    details="Using static synthetic curve snapshots; live providers pending Module 4",
                ),
            ],
            is_demo_data=True,
        )

    def preview_pricing(self, request: PricingWorkbenchRequest) -> PricingWorkbenchResponse:
        # Approximate baseline PV calculation for preview purposes
        notional = request.notional
        years = request.maturity_years or 1.0

        if request.instrument_type == InstrumentType.EUROPEAN_OPTION:
            s0 = request.underlying_price or 100.0
            k = request.strike_price or 100.0
            vol = request.volatility or 0.20
            # Rough Black-Scholes estimate
            moneyness = max(s0 - k, 0.0)
            time_value = s0 * 0.4 * vol * np.sqrt(years)
            estimated_pv = (notional / s0) * (moneyness + time_value)
        elif request.instrument_type == InstrumentType.INTEREST_RATE_SWAP:
            fixed = (request.fixed_rate or 4.0) / 100.0
            estimated_pv = notional * (fixed - 0.038) * years * 0.95
        else:
            estimated_pv = notional * 0.015

        return PricingWorkbenchResponse(
            is_preview=True,
            notice="This pricing calculation is a synthetic preview. Real pricing engine will be enabled in Module 3.",
            estimated_pv=round(float(estimated_pv), 2),
            currency=request.currency,
            parameters={
                "instrument_type": request.instrument_type.value,
                "notional": request.notional,
                "maturity_years": request.maturity_years,
                "counterparty": request.counterparty,
                "evaluation_date": self._anchor_time.strftime("%Y-%m-%d"),
            },
        )

    def export_valuations_csv(self) -> str:
        valuations = self.get_recent_valuations(limit=100)
        output = io.StringIO()
        writer = csv.writer(output)

        # Write standard financial audit headers
        writer.writerow([
            "Valuation ID",
            "Contract ID",
            "Instrument Type",
            "Valuation Timestamp (UTC)",
            "Market Value (USD)",
            "Currency",
            "Pricing Model",
            "Status",
            "PV01",
            "DV01",
        ])

        for v in valuations:
            writer.writerow([
                v.valuation_id,
                v.contract_id,
                v.instrument.value,
                v.valuation_timestamp,
                f"{v.market_value:.2f}",
                v.currency,
                v.model_used,
                v.status.value,
                f"{v.pv01:.2f}",
                f"{v.dv01:.2f}",
            ])

        return output.getvalue()


# Default singleton provider instance for Module 1
default_mock_provider = MockDataProvider(seed=42)
