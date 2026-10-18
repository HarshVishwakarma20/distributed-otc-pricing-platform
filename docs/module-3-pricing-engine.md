# DerivaQuant — Module 3: Financial Pricing Engine

## 1. Executive Summary

Module 3 delivers the **Financial Pricing Engine** for DerivaQuant. It provides an institutional-grade, closed-form quantitative valuation engine for Over-the-Counter (OTC) derivatives, replacing previous synthetic approximations with mathematically rigorous models, analytical Greeks, explicit assumptions, and immutable database persistence.

---

## 2. Architectural Boundaries & Integration Rules

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DerivaQuant Frontend (React / Vite)                   │
│                                                                        │
│   Pricing Workbench · Derivatives Registry · Overview · Risk Analytics │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                     HTTP / JSON     │ (Proxy: /api/v1/pricing)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Gateway (Module 3 Endpoints)               │
│                                                                        │
│  GET /pricing/models · POST /pricing/price · GET /pricing/valuations   │
│  GET /pricing/valuations/{id} · POST /pricing/ad-hoc                   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Module 3: PricingService & ModelRegistry                 │
│                                                                        │
│  1. Resolve Contract (via Module 2 ContractService strictly)           │
│  2. Validate Version (Optimistic Concurrency: 409 if mismatch)         │
│  3. Resolve Model from Registry (Check supported instruments)          │
│  4. Ingest Market Data (Stable MarketSnapshot interface)               │
│  5. Execute Quant Math (Deterministic, callable pure Python)           │
│  6. Validate Output (Reject NaN/Inf, format exact Decimal)             │
│  7. Persist to DB (valuations table via Alembic migration)             │
│  8. Return ValuationResponse (PV, analytical Greeks, cashflows)        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
     ┌─────────────────────────────┐  ┌─────────────────────────────┐
     │  Pure Quant Algorithms      │  │  Persistent Storage (DB)    │
     │  • BSM European Options     │  │  • valuations table         │
     │  • Single-Curve DCF (IRS)   │  │  • Immutable history        │
     │  • Cross-Currency DCF       │  │  • Contract UNTOUCHED!      │
     │  • ISDA Hazard Rate (CDS)   │  │                             │
     └─────────────────────────────┘  └─────────────────────────────┘
```

### Integration Guarantees:
1. **Module 2 Contract Authority**: Contracts are retrieved exclusively through Module 2's `ContractService`. Contractual terms (strike, fixed rate, notional, currency, maturity) cannot be tampered with by clients.
2. **Contract Immutability**: Pricing a contract **NEVER** mutates the contract record itself. Version numbers, status, and audit logs of the contract remain untouched.
3. **Optimistic Concurrency Control**: Every pricing request requires the `contract_version`. If a concurrent process has amended terms, `HTTP 409 Conflict` is returned.
4. **Stable Market Data Interface**: Market inputs adhere to typed Pydantic v2 domain models (`YieldCurve`, `EquityMarketInputs`, `MarketSnapshot`), enabling seamless drop-in integration with Module 4 live feeds.
5. **No Synthetic Fallback on Math Failure**: If inputs violate domain bounds (e.g. $S \le 0$ or negative volatility), the engine returns `HTTP 422 Unprocessable Entity` with structured diagnostics.

---

## 3. Quantitative Models & Mathematical Formulations

### 3.1 Black-Scholes-Merton (1973) European Options Engine (`BSM_EUROPEAN`)
Prices vanilla European equity and index options with continuous dividend/carry yield.

#### Closed-Form Price:
$$d_1 = \frac{\ln(S / K) + \left(r - q + \frac{1}{2}\sigma^2\right)T}{\sigma \sqrt{T}}$$
$$d_2 = d_1 - \sigma \sqrt{T}$$
$$\text{Call} = S e^{-qT} N(d_1) - K e^{-rT} N(d_2)$$
$$\text{Put} = K e^{-rT} N(-d_2) - S e^{-qT} N(-d_1)$$

Where:
- $S$: Spot price ($S > 0$)
- $K$: Strike exercise price ($K > 0$)
- $T$: Annualized time to expiry in years ($T \ge 0$, ACT/365 convention)
- $r$: Continuous risk-free interest rate
- $q$: Continuous dividend or carry yield ($q \ge 0$)
- $\sigma$: Annualized implied volatility ($\sigma \ge 0$)
- $N(x)$: Cumulative standard normal distribution function (`scipy.stats.norm.cdf`)
- $N'(x) = \frac{1}{\sqrt{2\pi}} e^{-x^2 / 2}$: Standard normal probability density function (`scipy.stats.norm.pdf`)

#### Analytical Greeks & Documented Units:

| Greek | Mathematical Definition | Call Formula | Put Formula | Stated Units |
|---|---|---|---|---|
| **Delta ($\Delta$)** | $\frac{\partial V}{\partial S}$ | $e^{-qT} N(d_1)$ | $-e^{-qT} N(-d_1)$ | Dimensionless (Change in option price per 1.0 unit move in underlying spot) |
| **Gamma ($\Gamma$)** | $\frac{\partial^2 V}{\partial S^2}$ | $\frac{e^{-qT} N'(d_1)}{S \sigma \sqrt{T}}$ | $\frac{e^{-qT} N'(d_1)}{S \sigma \sqrt{T}}$ | 1/Currency (Change in Delta per 1.0 unit move in underlying spot) |
| **Vega ($\mathcal{V}$)** | $\frac{\partial V}{\partial \sigma}$ | $S e^{-qT} \sqrt{T} N'(d_1)$ | $S e^{-qT} \sqrt{T} N'(d_1)$ | Currency per 100% (1.0) change in volatility |
| **Vega 1%** | $\frac{\partial V}{\partial \sigma} \times 0.01$ | $\mathcal{V} \times 0.01$ | $\mathcal{V} \times 0.01$ | Currency per 1 percentage point (0.01) change in volatility |
| **Theta ($\Theta$)** | $-\frac{\partial V}{\partial T}$ | $-\frac{S e^{-qT} N'(d_1) \sigma}{2\sqrt{T}} + q S e^{-qT} N(d_1) - r K e^{-rT} N(d_2)$ | $-\frac{S e^{-qT} N'(d_1) \sigma}{2\sqrt{T}} - q S e^{-qT} N(-d_1) + r K e^{-rT} N(-d_2)$ | Currency per year of elapsed time |
| **Theta Daily** | $\frac{\Theta}{365}$ | $\frac{\Theta}{365}$ | $\frac{\Theta}{365}$ | Currency per calendar day |
| **Rho ($\rho$)** | $\frac{\partial V}{\partial r}$ | $K T e^{-rT} N(d_2)$ | $-K T e^{-rT} N(-d_2)$ | Currency per 100% change in risk-free interest rate |
| **Rho 1 bp** | $\frac{\partial V}{\partial r} \times 0.0001$ | $\rho \times 0.0001$ | $\rho \times 0.0001$ | Currency per 1 basis point (0.0001) shift in interest rate |

#### Position Sizing & Sign Conventions:
- Contract Notional $N$, Strike $K \implies$ Quantity $Q = N / K$ shares.
- Position Direction:
  - `BUY` (Long): $\text{PV} = +Q \times \text{Payoff}$; Greeks scaled by $+Q$.
  - `SELL` (Short): $\text{PV} = -Q \times \text{Payoff}$; Greeks scaled by $-Q$.

#### Edge Condition Handling:
1. **At Expiry ($T = 0$)**:
   - Call $\text{Payoff} = \max(S - K, 0)$; Put $\text{Payoff} = \max(K - S, 0)$.
   - Delta & Gamma away from strike: Delta = 1.0 (Call ITM) or 0.0 (Call OTM); Gamma = 0.0.
   - At-the-money ($S = K$): Delta and Gamma return `None` ("undefined" due to payoff gradient discontinuity).
   - Vega = 0, Theta = 0, Rho = 0.
2. **Zero Volatility ($\sigma = 0$)**:
   - Forward $F = S e^{(r - q)T}$.
   - Call $\text{Payoff} = e^{-rT} \max(F - K, 0)$; Put $\text{Payoff} = e^{-rT} \max(K - F, 0)$.
   - Vega = 0.0.

---

### 3.2 Single-Curve Discounted Cash Flow IRS Engine (`DISCOUNTED_CASH_FLOW_IRS`)
Prices bilateral fixed-for-floating Interest Rate Swaps.

#### Cash Flow Schedule & Discounting:
For payment periods $i = 1, \dots, M$ between $t_{i-1}$ and $t_i$:
- Accrual fraction $\alpha_i$ calculated using day-count convention (`ACT_360`, `ACT_365_FIXED`, or `30_360`).
- Discount factor $DF(t_i)$ evaluated from yield curve.
- Fixed Leg Cash Flow:
  $$\text{Fixed CF}_i = \text{Notional} \times \text{Fixed Rate} \times \alpha_i$$
  $$\text{PV}_{\text{fixed}} = \sum_{i=1}^M \text{Fixed CF}_i \times DF(t_i)$$
- Floating Leg Forward Rate:
  $$F_i = \frac{1}{\alpha_i} \left( \frac{DF(t_{i-1})}{DF(t_i)} - 1 \right)$$
  $$\text{PV}_{\text{float}} = \sum_{i=1}^M \text{Notional} \times F_i \times \alpha_i \times DF(t_i) = \text{Notional} \times (DF(t_0) - DF(t_M))$$

#### Sign Conventions:
- `PAY_FIXED`: $\text{Net PV} = \text{PV}_{\text{float}} - \text{PV}_{\text{fixed}}$
- `RECEIVE_FIXED`: $\text{Net PV} = \text{PV}_{\text{fixed}} - \text{PV}_{\text{float}}$

#### Risk Sensitivities:
- **PV01** (Fixed Annuity Sensitivity):
  $$\text{PV01} = \text{Notional} \times 0.0001 \times \sum_{i=1}^M \alpha_i DF(t_i)$$
  (Signed: negative for `PAY_FIXED`, positive for `RECEIVE_FIXED`).
- **DV01** (Discount Curve Sensitivity):
  $$\text{DV01} = \text{Net PV}(r + 1\,\text{bp}) - \text{Net PV}(r)$$
- **Par Swap Rate**:
  $$S_{\text{par}} = \frac{DF(t_0) - DF(t_M)}{\sum_{i=1}^M \alpha_i DF(t_i)} \times 100\%$$

---

### 3.3 Cross-Currency Swap Model (`CROSS_CURRENCY_DCF`)
- Values pay leg in native `pay_currency` using `pay_currency` OIS curve.
- Values receive leg in native `receive_currency` using `receive_currency` OIS curve.
- Terminal principal exchange incorporated per `PrincipalExchange` rule (`INITIAL_AND_FINAL`, `FINAL_ONLY`, `NONE`).
- Converts receive leg to reporting currency via supplied market FX spot:
  $$\text{Net PV} = (\text{PV}_{\text{rec}}^{\text{native}} \times S_{FX}) - \text{PV}_{\text{pay}}^{\text{native}}$$
- FX Delta: $\frac{\partial \text{Net PV}}{\partial S_{FX}} = \text{PV}_{\text{rec}}^{\text{native}}$.

---

### 3.4 ISDA Standard Hazard Rate CDS Engine (`ISDA_HAZARD_RATE_CDS`)
Prices single-name Credit Default Swaps under continuous default intensity $\lambda$.

#### Premium Leg:
$$\text{PV}_{\text{premium}} = \text{Notional} \times s \times \sum_{i=1}^M \left[ \alpha_i Q(t_i) DF(t_i) + \frac{\alpha_i}{2} (Q(t_{i-1}) - Q(t_i)) DF(t_{i,\text{mid}}) \right]$$
Where $Q(t) = e^{-\lambda t}$ is survival probability and second term accounts for accrual on default.

#### Protection Leg:
$$\text{PV}_{\text{protection}} = (1 - R) \times \text{Notional} \times \sum_{i=1}^M (Q(t_{i-1}) - Q(t_i)) DF(t_{i,\text{mid}})$$
Where $R$ is recovery rate (default 0.40).

#### Direction:
- `BUY_PROTECTION`: $\text{Net PV} = \text{PV}_{\text{protection}} - \text{PV}_{\text{premium}}$
- `SELL_PROTECTION`: $\text{Net PV} = \text{PV}_{\text{premium}} - \text{PV}_{\text{protection}}$
- **CS01**: Sensitivity to +1 bp shift in credit spread.

---

## 4. API Specification & HTTP Status Mapping

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/v1/pricing/models` | List registered quant models and metadata | 200 |
| `POST` | `/api/v1/pricing/price` | Price authoritative Module 2 contract | 200, 404, 409, 422 |
| `GET` | `/api/v1/pricing/valuations/{id}` | Fetch persisted valuation record | 200, 404 |
| `GET` | `/api/v1/pricing/valuations` | List historical valuations with risk sensitivities | 200 |
| `POST` | `/api/v1/pricing/ad-hoc` | Fast what-if valuation for unbooked structures | 200, 422, 501 |

### HTTP Status Code Semantics:
- `200 OK`: Successful quantitative calculation and database persistence.
- `404 Not Found`: Target Contract ID or Valuation ID not found in registry.
- `409 Conflict`: **Stale contract version**. Request specified an outdated version; user must re-fetch before pricing.
- `422 Unprocessable Entity`: Math domain violation (e.g. $S \le 0$, negative volatility, valuation after expiry, or unsupported instrument/model combination).
- `501 Not Implemented`: Requested feature or model not implemented.

---

## 5. Database Schema & Persistence

Managed via **Alembic** migration `222b685b02b1_create_valuations_table.py`:

```
┌────────────────────────────────────────────────────────┐
│                       valuations                       │
├────────────────────────────────────────────────────────┤
│ id (PK)                 INTEGER (Autoincrement)        │
│ valuation_id (UNIQUE)   VARCHAR(50) (INDEX)            │
│ contract_id             VARCHAR(50) (INDEX)            │
│ contract_version        INTEGER                        │
│ instrument_type         VARCHAR(50) (INDEX)            │
│ model_id                VARCHAR(50) (INDEX)            │
│ valuation_date          DATE                           │
│ present_value           NUMERIC(24, 4)                 │
│ currency                VARCHAR(3)                     │
│ greeks                  JSON                           │
│ market_snapshot         JSON                           │
│ assumptions             JSON                           │
│ warnings                JSON                           │
│ cashflows               JSON                           │
│ status                  VARCHAR(30)                    │
│ created_at              TIMESTAMP WITH TIME ZONE (UTC) │
└────────────────────────────────────────────────────────┘
```

---

## 6. Verification & Test Execution

### 6.1 Backend Test Suites
```bash
# Run quantitative mathematics tests (Benchmark, parity, finite-difference Greeks, limits)
pytest backend/tests/test_pricing_math.py -v

# Run pricing API integration tests (Endpoints, status codes, concurrency, immutability)
pytest backend/tests/test_pricing_api.py -v

# Run full platform regression suite (Module 1, Module 2, Module 3)
pytest backend/tests -v

# Run linter
ruff check backend
```

### 6.2 Frontend Test Suite & Build
```bash
# Run Vitest component tests (including PricingWorkbenchPage.test.tsx)
cmd /c "npm test"

# Run TypeScript check and production bundle build
cmd /c "npm run build"
```
