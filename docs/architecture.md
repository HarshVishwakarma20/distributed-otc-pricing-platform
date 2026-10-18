# DerivaQuant — Platform Architecture

## 1. System Overview

**DerivaQuant** is an institutional-grade educational and quantitative research platform designed for pricing Over-the-Counter (OTC) derivatives and executing distributed risk analytics.

Module 1 delivers the **UI & Dashboard Foundation**, establishing a complete, decoupled, and testable full-stack architecture:

- **Frontend Application**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons, Recharts financial data visualization, and TanStack Query.
- **Backend API Gateway**: FastAPI, Pydantic v2 domain schemas, and HTTP endpoints exposing portfolio metrics, valuations, simulations, and telemetry.
- **Service & Provider Layer**: Strict protocol interfaces (`IDataProvider`) backed by a deterministic synthetic mock data engine (`MockDataProvider`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DerivaQuant Frontend (React / Vite)                   │
│                                                                        │
│   Overview · Derivatives · Pricing Workbench · Risk Analytics · MC Lab  │
│   Portfolios · Market Data · Valuation History · Reports · Health      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                     HTTP / JSON     │ (Proxy: /api/v1)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Gateway (Module 1)                   │
│                                                                        │
│  /health · /dashboard/summary · /dashboard/exposure · /valuations/recent│
│  /activity · /jobs/summary · /contracts · /portfolios · /market-data   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                             Python Protocol:
                              IDataProvider
                                     │
                   ┌─────────────────┴─────────────────┐
                   │                                   │
                   ▼                                   ▼
    ┌─────────────────────────────┐     ┌─────────────────────────────┐
    │      MockDataProvider       │     │    Future Module Services   │
    │  (Module 1 Synthetic Engine)│     │  (Pricing, DB, Spark, MPI)   │
    │   • Deterministic Seed (#42)│     │  • Module 2: Contracts DB   │
    │   • Zero external dependencies│   │  • Module 3: Quant Pricing  │
    │   • Full schema compliance  │     │  • Module 6: Monte Carlo    │
    └─────────────────────────────┘     └─────────────────────────────┘
```

---

## 2. Decoupling & Separation of Concerns

To guarantee that the dashboard remains completely independent of future distributed infrastructure (e.g. Apache Spark, MPI, Redis, Celery, PostgreSQL), the system follows strict separation of concerns:

1. **Presentation Layer (React)**:
   - Contains no financial pricing mathematics, database drivers, or distributed job logic.
   - All components interact exclusively with typed interfaces and the centralized `api` client (`frontend/src/api/client.ts`).
   - Resilient offline fallback (`frontend/src/api/mockFallback.ts`) ensures the UI renders reliably in standalone mode and displays visible status badges (`DEMO DATA - SYNTHETIC`).

2. **Domain Layer (Pydantic Models)**:
   - Shared domain models define strict data contracts (`backend/app/domain/schemas.py`).
   - Fields include exact types, currency annotations, ISO 8601 timestamps, and documentation descriptions.

3. **Service & Provider Abstraction**:
   - `IDataProvider` (`backend/app/interfaces/providers.py`) defines the contract methods that any data source must fulfill.
   - `MockDataProvider` (`backend/app/services/mock_provider.py`) fulfills this interface today using deterministic NumPy pseudo-random generators.
   - Route handlers in `backend/app/api/v1/router.py` consume `IDataProvider` without knowing whether data originates from mock generation, a PostgreSQL repository, or an MPI worker cluster.

---

## 3. Mock Data Strategy & Determinism

All figures presented in Module 1 are synthetic, generated with a fixed seed (`seed = 42`):
- **Notional vs Market Value**: Total Notional ($1.425B) and Mark-to-Market ($48.32M) reflect institutional scale while maintaining clean accounting distinctions.
- **Relational Integrity**: Contract IDs (e.g. `CNT-IRS-1001`, `CNT-EUR-2002`) remain consistent across the contract repository, historical valuations table, and audit trail logs.
- **Time-Series Realism**: The 30-day valuation walk simulates realistic geometric progression and daily P&L fluctuations without claiming connection to live markets.
- **Illustrative Disclaimers**: Value at Risk (VaR 95% 1-Day: $2.85M) and Greeks are explicitly labeled as illustrative synthetic previews.

---

## 4. Future Module Migration Strategy

Future modules will plug directly into the architecture without requiring frontend rewrites:

| Module | Status | Architecture & Implementation |
|---|---|---|
| **Module 1: UI & Dashboard** | **Complete** | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts financial dashboards |
| **Module 2: Contract Management** | **Complete** | SQLAlchemy 2.x, Alembic, PostgreSQL/SQLite, typed instrument specs, state machine, atomic audit trail |
| **Module 3: Pricing Engine** | **Complete** | Closed-form Black-Scholes-Merton (1973), Single-Curve OIS DCF, Cross-Currency DCF, ISDA Hazard Rate CDS, analytical Greeks, valuations DB persistence |
| **Module 4: Market Data** | Scaffolded | Static SOFR curve and benchmark FX snapshot; will ingest real rates from live market feeds |
| **Module 5: Risk Analytics** | Scaffolded | Synthetic Greeks cards and parametric stress shifts; will connect bump-and-revalue engine |
| **Module 6 & 7: Monte Carlo & Distributed** | Scaffolded | Simulated progress animation; will dispatch jobs to real MPI / Ray worker pool |
| **Module 12: Valuation History** | Scaffolded | Static audit batch runs; will ingest snapshots from PostgreSQL audit tables |
| **Module 13: Reports & Export** | Operational | Functional client/server CSV export; PDF reporting slated for future milestone |
| **Module 14: System Health** | Operational | Health check telemetry, database status probe (`/api/v1/contracts/meta/health`) |

---

## 5. Interface Stability Guarantees

The following contracts are guaranteed to remain stable across future milestones:
- `KPISummary`: Metric names, currency references, and synthetic flags.
- `ValueHistoryPoint`: Date format (`YYYY-MM-DD`), MTM value, and daily P&L.
- `PortfolioExposure`: Categorization by `InstrumentType` and exposure percentages.
- `ValuationSummary`: Valuation ID, Contract ID, model name, and PV01/DV01 sensitivities.
- `SimulationJobSummary`: Job ID, progress percentage, path counts, and status enums.
