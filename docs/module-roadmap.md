# DerivaQuant — 15-Module Product Roadmap & Integration Specifications

This roadmap documents all 15 planned modules for the **DerivaQuant OTC Derivatives Pricing & Distributed Risk Platform**, detailing their responsibilities, input/output contracts, and systematic integration sequence.

---

## Roadmap Overview

```
Phase 1: Foundation & Modeling Core
  Module 1: UI & Dashboard Foundation (Current Milestone — Complete)
  Module 2: Contract Management
  Module 3: Financial Pricing Engine
  Module 4: Market Data and Curves

Phase 2: Quantitative Simulation & Distributed Infrastructure
  Module 5: Risk Analytics & Greeks
  Module 6: Monte Carlo Simulation Engine
  Module 7: Parallel & Distributed Computing (MPI / Workers)
  Module 8: Job Orchestration & Load Balancing
  Module 9: Fault Tolerance & Recovery

Phase 3: Portfolio Aggregation & Enterprise Capabilities
  Module 10: Portfolio Analytics & SIMM Margin
  Module 11: Historical Analytics & Spark Processing
  Module 12: Valuation History & Immutable Audit Trail
  Module 13: Reporting & Financial Export
  Module 14: Monitoring & Observability
  Module 15: Security, RBAC & Cloud Deployment
```

---

## Detailed Module Specifications

### Module 1: UI and Dashboard Foundation (Implemented)
- **Status**: Milestone 1 Complete.
- **Responsibilities**: Provide responsive institutional frontend (React, TypeScript, Tailwind CSS, Recharts) and FastAPI backend gateway. Establish deterministic mock data providers and stable API interfaces.
- **Inputs**: HTTP requests from client browser.
- **Outputs**: Formatted JSON responses for dashboard KPIs, exposures, valuations, simulations, and CSV export.

---

### Module 2: Contract Management & Persistent Contract Registry (Implemented)
- **Status**: Milestone 2 Complete.
- **Responsibilities**: Bilateral contract origination, typed instrument validation (IRS, European Option, Currency Swap, CDS), persistent relational database backing (SQLAlchemy 2.x, Alembic, PostgreSQL/SQLite), explicit lifecycle state machine (`DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `MATURED`, `CANCELLED`, `REJECTED`), optimistic concurrency control, immutable audit events, and versioned historical snapshots.
- **Inputs**: Typed contract create payloads (`irs_terms`, `option_terms`, `currency_swap_terms`, `cds_terms`), transition requests with authorizer and justification.
- **Outputs**: Persistent contract entities in database, versioned revisions, immutable audit log events.
- **Interface Contract**:
  - `GET /api/v1/contracts`: List and query registry with search, filter, and pagination
  - `POST /api/v1/contracts`: Stage validated contract in `DRAFT` state
  - `GET /api/v1/contracts/{id}`: Snapshot inspection interface for downstream pricing engines
  - `POST /api/v1/contracts/{id}/{action}`: Lifecycle state machine transitions

---

### Module 3: Financial Pricing Engine
- **Status**: **Complete** (Documentation: [module-3-pricing-engine.md](file:///docs/module-3-pricing-engine.md)).
- **Responsibilities**: Closed-form analytical and discounted cash flow valuation algorithms:
  - European Equity Options: Closed-form Black-Scholes-Merton (1973) with analytical Delta, Gamma, Vega, Vega 1%, Theta (annual & daily), and Rho. Edge conditions (T=0, sigma=0).
  - Interest Rate Swaps (IRS): Single-curve OIS discounted cash flow with payment schedules, par swap rate, PV01, and DV01.
  - Cross-Currency Swaps: Dual-leg native currency DCF with FX spot conversion.
  - Credit Default Swaps (CDS): ISDA Standard Hazard Rate model with accrual on default and CS01.
- **Model Registry & Concurrency**:
  - `ModelRegistry` mapping models to supported instruments.
  - Optimistic concurrency control (409 Conflict if `contract_version` stale).
  - Contract immutability: pricing never mutates the underlying contract record.
- **Persistence**:
  - `valuations` table storing Net Present Value (Decimal), analytical Greeks, market references, assumptions, and warnings.
- **Interface Contract**:
  - `POST /api/v1/pricing/price`: Authoritative valuation of Module 2 contract.
  - `GET /api/v1/pricing/models`: Quant model registry and metadata.
  - `GET /api/v1/pricing/valuations/{id}`: Valuation retrieval.
  - `POST /api/v1/pricing/ad-hoc`: What-if workbench pricing.

---

### Module 4: Market Data and Curves
- **Status**: Scaffold in Module 1; Implementation in Milestone 4.
- **Responsibilities**: Ingest, validate, and interpolate market feeds:
  - SOFR OIS yield curve bootstrapping.
  - LIBOR / Euribor basis curve construction.
  - SABR and Dupire local volatility surface construction.
- **Inputs**: Benchmark cash deposits, futures, swap par rates, option implied vol quotes.
- **Outputs**: Arbitrage-free discount curve objects and calibrated volatility grids.
- **Interface Contract**:
  - `IMarketDataProvider.get_discount_curve(currency: str) -> YieldCurve`
  - `IMarketDataProvider.get_vol_surface(underlying: str) -> VolatilitySurface`

---

### Module 5: Risk Analytics
- **Status**: Preview in Module 1; Implementation in Milestone 5.
- **Responsibilities**: Compute portfolio Greeks (Delta, Gamma, Vega, Theta, Rho), Historical and Parametric Value at Risk (VaR), Expected Shortfall (CVaR), and regulatory stress testing (e.g. Basel III, Dodd-Frank scenarios).
- **Inputs**: Active contract portfolio, pricing models, multi-year historical rate scenarios.
- **Outputs**: Greek exposure matrix, VaR distribution percentiles, stress loss breakdowns.
- **Interface Contract**:
  - `IRiskService.calculate_greeks(portfolio_id: str) -> GreeksSummary`
  - `IRiskService.run_stress_test(portfolio_id: str, scenario: StressScenario) -> ScenarioResult`

---

### Module 6: Monte Carlo Simulation Engine
- **Status**: Scaffold in Module 1; Implementation in Milestone 6.
- **Responsibilities**: Stochastic differential equation path generators (Geometric Brownian Motion, Heston Stochastic Volatility, Hull-White Two-Factor). Variance reduction (Antithetic, Sobol quasi-random).
- **Inputs**: Model parameters (drift, vol, mean reversion speed, correlation), path count $N$, time steps $M$, seed.
- **Outputs**: Simulated asset price and short rate paths; payoff distribution statistics and confidence intervals.
- **Interface Contract**:
  - `IMonteCarloEngine.simulate_paths(spec: SimulationSpec) -> SimulationResult`

---

### Module 7: Parallel and Distributed Computing
- **Status**: Scaffold in Module 1; Implementation in Milestone 7.
- **Responsibilities**: Parallelize Monte Carlo path generation and portfolio valuation across multi-core nodes using Message Passing Interface (MPI) and worker pools.
- **Inputs**: Partitioned chunks of Monte Carlo simulation tasks ($N / K$ paths per worker).
- **Outputs**: Worker task execution results aggregated by master rank.

---

### Module 8: Job Orchestration and Load Balancing
- **Status**: Scaffold in Module 1; Implementation in Milestone 8.
- **Responsibilities**: Asynchronous task queuing, worker registration, dynamic work-stealing, and queue priority scheduling.
- **Inputs**: Batch simulation requests from users or automated EOD triggers.
- **Outputs**: Job execution IDs, real-time worker task allocation telemetry.

---

### Module 9: Fault Tolerance and Recovery
- **Status**: Scaffold in Module 1; Implementation in Milestone 9.
- **Responsibilities**: Worker heartbeat monitoring, checkpoint/restart for long-running Monte Carlo runs, automatic failover, and task rescheduling on node failure.
- **Inputs**: Worker heartbeat signals, task execution checkpoints.
- **Outputs**: Cluster self-healing events and state reconstruction.

---

### Module 10: Portfolio Analytics
- **Status**: Scaffold in Module 1; Implementation in Milestone 10.
- **Responsibilities**: Multi-desk portfolio hierarchy aggregation, Standard Initial Margin Model (SIMM) calculations, counterparty netting sets, and risk factor decomposition.
- **Inputs**: Portfolio book structures, counterparty master agreements.
- **Outputs**: Net margin requirements, credit valuation adjustment (CVA), book risk allocations.

---

### Module 11: Historical Analytics
- **Status**: Scaffold in Module 1; Implementation in Milestone 11.
- **Responsibilities**: Apache Spark integration for distributed processing of multi-year tick feeds, rolling backtesting, model parameter calibration, and market regime clustering.
- **Inputs**: Terabytes of historical market tick data in Parquet / Iceberg formats.
- **Outputs**: Calibrated model parameters and historical return matrices.

---

### Module 12: Valuation History and Audit Trail
- **Status**: Scaffold in Module 1; Implementation in Milestone 12.
- **Responsibilities**: Immutable append-only audit records of every executed valuation, model version used, market snapshot applied, and user attribution for regulatory compliance (BCBS 239).
- **Inputs**: Completed valuation snapshots and metadata.
- **Outputs**: Cryptographically signed valuation audit log and point-in-time temporal queries.

---

### Module 13: Reporting and Export
- **Status**: Scaffold in Module 1; Implementation in Milestone 13.
- **Responsibilities**: Scheduled and on-demand generation of institutional reports:
  - PDF fact-sheets and risk summaries.
  - CSV / Excel EOD valuation ledgers (functional in Module 1).
  - Regulatory XBRL reporting packages.
- **Inputs**: Portfolio valuation runs and risk analytics datasets.
- **Outputs**: Formatted downloadable documents and automated email broadcasts.

---

### Module 14: Monitoring and Observability
- **Status**: Scaffold in Module 1; Implementation in Milestone 14.
- **Responsibilities**: Production telemetry: OpenTelemetry tracing across distributed workers, Prometheus metrics scraping, Grafana dashboards, and error budget alerting.
- **Inputs**: Worker node CPU/memory metrics, RPC latencies, pricing engine error rates.
- **Outputs**: Live metrics endpoints (`/metrics`), tracing spans, and operational alerts.

---

### Module 15: Security and Deployment
- **Status**: Architecture scaffolded; Implementation in Milestone 15.
- **Responsibilities**: Role-Based Access Control (RBAC) (Trader, Risk Officer, Quantitative Analyst, Auditor), JWT / OAuth2 authentication, TLS encryption, Docker / Kubernetes containerization, and automated CI/CD pipelines.
- **Inputs**: User credentials, API tokens, infrastructure manifests.
- **Outputs**: Secure containerized platform deployed across staging/production clusters.
