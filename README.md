# DerivaQuant — Distributed OTC Derivatives Pricing & Risk Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, institutional-grade quantitative finance platform simulating the end-to-end architecture of investment-bank derivatives desks. **DerivaQuant** integrates financial pricing, multi-asset risk analytics, distributed computing (MPI, worker pools), and real-time portfolio management.

---

## Current Milestone — Module 3: Financial Pricing Engine

**Module 3** delivers the **Financial Pricing Engine**, an independently testable quantitative module implementing closed-form analytical valuations, single-curve and dual-currency discounted cash flow algorithms, and reduced-form credit models.

### Key Capabilities in Module 3:
- **Black-Scholes-Merton (1973) European Option Engine**: Exact closed-form pricing for Calls and Puts with analytical Greeks (Delta, Gamma, Vega, Vega 1%, Theta annual/daily, Rho 1bp). Robust boundary handling for expiry ($T=0$ intrinsic payoff) and zero volatility ($\sigma=0$ discounted forward payoff).
- **Single-Curve OIS Discounted Cash Flow (IRS)**: Dual-leg fixed vs floating valuation on SOFR discount curves, generating complete cashflow schedules, par swap rates, PV01 fixed coupon sensitivity, and DV01 curve sensitivity with explicit payer/receiver sign conventions.
- **Cross-Currency Swap Engine**: Dual-leg native currency DCF discounting legs in native currencies and converting via authoritative market FX spot.
- **ISDA Standard Hazard Rate Engine (CDS)**: Reduced-form credit protection valuation under constant hazard rates with accrual-on-default midpoint settlement and CS01 spread sensitivity.
- **Quantitative Model Registry**: Decoupled registry mapping models to supported instruments and validating required inputs and Greeks.
- **Authoritative Contract Pricing & Concurrency Control**: Resolves terms directly from Module 2's `ContractService` (clients cannot override strike or maturity); enforces optimistic concurrency (`HTTP 409 Conflict` on version mismatch).
- **Persistent Valuation History**: All valuation runs are immutably persisted to the `valuations` relational table (Alembic migration `222b685b02b1`). **Pricing a contract never mutates the contract record itself.**
- **Upgraded Pricing Workbench UI**: Interactive interface supporting both Booked Contract Valuation and What-If Ad-Hoc pricing, displaying Greeks tables with documented units, cashflow schedules, and persistence indicators.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, TanStack Query |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, PostgreSQL / SQLite, NumPy, Pandas, SciPy, Uvicorn |
| **Testing** | pytest (61 Backend Tests), Vitest & React Testing Library (16 Frontend Tests) |
| **Linting** | Ruff (Python), Oxlint / ESLint (TypeScript/React) |
| **Containers** | Docker Compose (PostgreSQL 16 Alpine) |


---

## Getting Started

### Prerequisites
- **Python**: Version 3.12 or higher.
- **Node.js**: Version 18 or higher (Node 20+ recommended) with npm.

---

### Step 1: Clone and Navigate to Repository
```bash
git clone https://github.com/HarshVishwakarma20/distributed-otc-pricing-platform.git
cd distributed-otc-pricing-platform/DerivaQuant
```

---

### Step 2: Backend Setup & Execution

#### On Windows (PowerShell):
```powershell
# Optional: create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install -e .

# Launch the FastAPI backend server
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### On macOS / Linux:
```bash
# Optional: create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -e .

# Launch the FastAPI backend server
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API is now live at:
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

### Step 3: Frontend Setup & Execution

Open a second terminal window:

```bash
cd frontend

# Install frontend dependencies (if not already installed)
npm install

# Start Vite local development server
npm run dev
```

Open your browser to:
- **DerivaQuant Terminal**: [http://localhost:5173](http://localhost:5173)

---

## Running Automated Tests & Linting

### Backend Testing (pytest)
```bash
# From repository root or backend/
python -m pytest backend/tests
```
*Executes 22 automated tests validating Pydantic schemas, deterministic mock provider repeatability, API endpoints, and CSV export formatting.*

### Backend Linting (Ruff)
```bash
python -m ruff check backend
python -m ruff format --check backend
```

### Frontend Testing (Vitest)
```bash
cd frontend
npm test
```
*Executes component tests, mock fallback verification, and financial formatting utility suites.*

### Frontend Production Build & Linting
```bash
cd frontend
npm run lint
npm run build
```

---

## Repository Structure

```
DerivaQuant/
├── .gitignore                      # Git ignore rules for Python, Node, caches
├── pyproject.toml                  # Python package configuration and dependencies
├── README.md                       # Platform documentation
├── .env.example                    # Sample environment configuration template
├── docs/
│   ├── architecture.md             # System architecture & decoupling specification
│   └── module-roadmap.md           # 15-module roadmap and contract definitions
├── backend/
│   ├── pyproject.toml              # Backend package metadata
│   ├── app/
│   │   ├── main.py                 # FastAPI application entrypoint with CORS
│   │   ├── core/
│   │   │   └── config.py           # Application settings and environment defaults
│   │   ├── domain/
│   │   │   ├── enums.py            # Financial instrument & status enums
│   │   │   └── schemas.py          # Pydantic v2 domain models and API contracts
│   │   ├── interfaces/
│   │   │   └── providers.py        # IDataProvider protocol interface
│   │   ├── services/
│   │   │   └── mock_provider.py    # Deterministic synthetic data generator (Seed #42)
│   │   └── api/
│   │       └── v1/
│   │           └── router.py       # API v1 endpoints
│   └── tests/
│       ├── conftest.py             # TestClient fixtures
│       ├── test_schemas.py         # Schema validation tests
│       ├── test_mock_provider.py   # Deterministic provider & CSV export tests
│       └── test_api_endpoints.py   # FastAPI HTTP endpoint tests
└── frontend/
    ├── package.json                # Frontend dependencies and npm scripts
    ├── vite.config.ts              # Vite configuration with Tailwind v4 & proxy
    ├── tsconfig.json               # TypeScript compiler options
    ├── src/
    │   ├── main.tsx                # React DOM root entrypoint
    │   ├── App.tsx                 # React Router routing table & QueryClientProvider
    │   ├── index.css               # Tailwind CSS v4 styling & financial terminal theme
    │   ├── types/
    │   │   └── index.ts            # Frontend domain TypeScript definitions
    │   ├── api/
    │   │   ├── client.ts           # Centralized typed API client & TanStack Query hooks
    │   │   └── mockFallback.ts     # Offline synthetic data fallback
    │   ├── utils/
    │   │   └── formatters.ts       # Currency, percentage, bps, and date formatters
    │   ├── components/
    │   │   ├── layout/             # Sidebar, TopHeader, AppLayout, DemoBadge
    │   │   ├── ui/                 # Card, Badge, Button, Modal
    │   │   └── charts/             # ValueHistoryChart, ExposureChart
    │   └── pages/                  # 10 Platform pages
    └── test/
        ├── setup.ts                # Vitest setup
        ├── test-utils.tsx          # Render helper with React Router & QueryClient
        ├── formatters.test.ts      # Formatting tests
        ├── TopHeader.test.tsx      # Header & demo badge tests
        └── OverviewPage.test.tsx   # Dashboard component tests
```

---

## 15-Module Product Roadmap Summary

1. **UI and Dashboard** *(Milestone 1 — Complete)*
2. **Contract Management** *(Milestone 2)*
3. **Financial Pricing Engine** *(Milestone 3)*
4. **Market Data and Curves** *(Milestone 4)*
5. **Risk Analytics & Greeks** *(Milestone 5)*
6. **Monte Carlo Simulation Engine** *(Milestone 6)*
7. **Parallel and Distributed Computing (MPI)** *(Milestone 7)*
8. **Job Orchestration and Load Balancing** *(Milestone 8)*
9. **Fault Tolerance and Recovery** *(Milestone 9)*
10. **Portfolio Analytics & Margin (SIMM)** *(Milestone 10)*
11. **Historical Analytics & Apache Spark** *(Milestone 11)*
12. **Valuation History and Audit Trail (BCBS 239)** *(Milestone 12)*
13. **Reporting and Financial Export** *(Milestone 13)*
14. **Monitoring and Observability (OpenTelemetry)** *(Milestone 14)*
15. **Security, RBAC and Cloud Deployment** *(Milestone 15)*

*For full details on input/output contracts and integration order, see [docs/module-roadmap.md](docs/module-roadmap.md).*

---

## Disclaimer

**Educational and Research Platform**: DerivaQuant is designed for educational, research, and technical portfolio demonstration purposes. All figures, curves, valuations, Value at Risk (VaR), and Greeks generated in Module 1 are synthetic mock data and must not be used for actual trading, hedging, or regulatory filings.
