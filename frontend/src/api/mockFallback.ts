import type {
  KPISummary,
  ValueHistoryPoint,
  PortfolioExposure,
  ValuationSummary,
  SimulationJobSummary,
  ActivityEvent,
  ContractSummary,
  PortfolioSummary,
  YieldCurvePoint,
  FXRateItem,
  SystemHealthSummary,
  PricingWorkbenchRequest,
  PricingWorkbenchResponse,
  ContractDetailResponse,
  ContractPaginationResponse,
  ModelMetadata,
  ValuationResponse,
} from '../types'

export const fallbackKPISummary: KPISummary = {
  total_notional: 1425000000.0,
  total_market_value: 48320500.0,
  active_contracts: 84,
  daily_pnl: 642300.0,
  daily_pnl_pct: 1.35,
  simulated_var_95_1d: 2850000.0,
  active_simulation_jobs: 3,
  currency: 'USD',
  valuation_timestamp: '2026-10-14T18:00:00Z',
  is_demo_data: true,
}

export function generateFallbackValueHistory(days: number = 30): ValueHistoryPoint[] {
  const points: ValueHistoryPoint[] = []
  let mv = 42500000.0
  let cumPnl = 0.0
  const baseDate = new Date('2026-10-14T00:00:00Z')

  // Predictable pseudo-random walk
  const deltas = [
    120000, -85000, 310000, 450000, -190000, 280000, -95000, 410000,
    180000, -220000, 350000, 510000, -140000, 90000, 642300,
  ]

  for (let i = days; i >= 1; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i + 1)
    const pnl = deltas[i % deltas.length]
    mv += pnl
    cumPnl += pnl
    points.push({
      date: d.toISOString().split('T')[0],
      market_value: mv,
      daily_pnl: pnl,
      cumulative_pnl: cumPnl,
    })
  }
  return points
}

export const fallbackExposures: PortfolioExposure[] = [
  {
    instrument_type: 'Interest Rate Swap',
    notional: 820000000.0,
    market_value: 27850000.0,
    delta_equivalent: 24100000.0,
    percentage_of_total: 57.54,
    contract_count: 42,
  },
  {
    instrument_type: 'European Option',
    notional: 240000000.0,
    market_value: 8920500.0,
    delta_equivalent: 14300000.0,
    percentage_of_total: 16.84,
    contract_count: 18,
  },
  {
    instrument_type: 'Currency Swap',
    notional: 215000000.0,
    market_value: 6450000.0,
    delta_equivalent: 5900000.0,
    percentage_of_total: 15.09,
    contract_count: 14,
  },
  {
    instrument_type: 'Credit Default Swap',
    notional: 150000000.0,
    market_value: 5100000.0,
    delta_equivalent: 4200000.0,
    percentage_of_total: 10.53,
    contract_count: 10,
  },
]

export const fallbackValuations: ValuationSummary[] = [
  {
    valuation_id: 'VAL-2026-901',
    contract_id: 'CNT-IRS-1001',
    instrument: 'Interest Rate Swap',
    valuation_timestamp: '2026-10-14T17:45:00Z',
    market_value: 1420350.0,
    currency: 'USD',
    model_used: 'Discounted Cash Flow (Dual Curve)',
    status: 'Completed',
    pv01: 4850.25,
    dv01: 4790.1,
  },
  {
    valuation_id: 'VAL-2026-902',
    contract_id: 'CNT-EUR-2002',
    instrument: 'European Option',
    valuation_timestamp: '2026-10-14T17:42:15Z',
    market_value: -340800.0,
    currency: 'USD',
    model_used: 'Black-Scholes-Merton 76',
    status: 'Completed',
    pv01: -820.0,
    dv01: -795.5,
  },
  {
    valuation_id: 'VAL-2026-903',
    contract_id: 'CNT-FXS-3003',
    instrument: 'Currency Swap',
    valuation_timestamp: '2026-10-14T17:35:50Z',
    market_value: 890400.0,
    currency: 'USD',
    model_used: 'Cross-Currency Basis Curve',
    status: 'Completed',
    pv01: 3120.0,
    dv01: 3080.4,
  },
  {
    valuation_id: 'VAL-2026-904',
    contract_id: 'CNT-CDS-4004',
    instrument: 'Credit Default Swap',
    valuation_timestamp: '2026-10-14T17:28:10Z',
    market_value: -185200.0,
    currency: 'USD',
    model_used: 'ISDA Standard Hazard Rate Engine',
    status: 'Completed',
    pv01: -540.0,
    dv01: -515.2,
  },
  {
    valuation_id: 'VAL-2026-905',
    contract_id: 'CNT-IRS-1005',
    instrument: 'Interest Rate Swap',
    valuation_timestamp: '2026-10-14T17:15:30Z',
    market_value: 2340000.0,
    currency: 'USD',
    model_used: 'Discounted Cash Flow (Dual Curve)',
    status: 'Completed',
    pv01: 7240.5,
    dv01: 7180.0,
  },
  {
    valuation_id: 'VAL-2026-906',
    contract_id: 'CNT-EUR-2006',
    instrument: 'European Option',
    valuation_timestamp: '2026-10-14T17:02:45Z',
    market_value: 512000.0,
    currency: 'USD',
    model_used: 'Heston Stochastic Volatility',
    status: 'In Progress',
    pv01: 1420.0,
    dv01: 1390.0,
  },
]

export const fallbackActivityEvents: ActivityEvent[] = [
  {
    event_id: 'EVT-101',
    event_type: 'VALUATION_COMPLETED',
    title: 'EOD Portfolio Mark-to-Market Completed',
    description: '84 active derivative contracts valued against latest market curves.',
    timestamp: '2026-10-14T17:45:00Z',
    severity: 'success',
  },
  {
    event_id: 'EVT-102',
    event_type: 'SIMULATION_SUBMITTED',
    title: 'Distributed Monte Carlo Job #SIM-804 Submitted',
    description: 'Heston Stochastic Volatility job dispatched to 16 synthetic worker slots.',
    timestamp: '2026-10-14T17:30:12Z',
    severity: 'info',
  },
  {
    event_id: 'EVT-103',
    event_type: 'DATA_IMPORTED',
    title: 'SOFR Zero Curve Ingested',
    description: 'Tenors 1M to 30Y successfully updated from benchmark rate feeds.',
    timestamp: '2026-10-14T17:10:00Z',
    severity: 'info',
  },
  {
    event_id: 'EVT-104',
    event_type: 'WORKER_REBALANCED',
    title: 'Worker Node #4 Workload Rebalanced',
    description: 'Synthetic cluster load-balancer shifted 25,000 paths from Worker-04 to Worker-02.',
    timestamp: '2026-10-14T16:55:20Z',
    severity: 'warning',
  },
  {
    event_id: 'EVT-105',
    event_type: 'CONTRACT_CREATED',
    title: 'New Contract Staged: CNT-IRS-1009',
    description: 'USD 50M 5Y Fixed-for-Floating IRS counterparty Barclays Capital staged for confirmation.',
    timestamp: '2026-10-14T16:20:45Z',
    severity: 'success',
  },
]

export const fallbackSimulationJobs: SimulationJobSummary[] = [
  {
    job_id: 'SIM-804',
    simulation_type: 'Heston Stochastic Volatility',
    status: 'Running',
    progress: 68.5,
    paths: 500000,
    time_steps: 252,
    elapsed_sec: 14.2,
    submitted_time: '2026-10-14T17:30:12Z',
  },
  {
    job_id: 'SIM-803',
    simulation_type: 'Hull-White (2-Factor)',
    status: 'Running',
    progress: 42.0,
    paths: 250000,
    time_steps: 360,
    elapsed_sec: 8.7,
    submitted_time: '2026-10-14T17:34:00Z',
  },
  {
    job_id: 'SIM-802',
    simulation_type: 'Monte Carlo (Black-Scholes)',
    status: 'Completed',
    progress: 100.0,
    paths: 1000000,
    time_steps: 100,
    elapsed_sec: 22.4,
    submitted_time: '2026-10-14T17:10:05Z',
  },
  {
    job_id: 'SIM-801',
    simulation_type: 'Vasicek Interest Rate',
    status: 'Queued',
    progress: 0.0,
    paths: 100000,
    time_steps: 180,
    elapsed_sec: 0.0,
    submitted_time: '2026-10-14T17:38:22Z',
  },
]

export const fallbackContracts: ContractSummary[] = [
  {
    contract_id: 'CNT-IRS-1001',
    counterparty: 'JPMorgan Chase NA',
    instrument_type: 'Interest Rate Swap',
    notional: 100000000.0,
    currency: 'USD',
    start_date: '2024-01-15',
    maturity_date: '2029-01-15',
    status: 'Active',
    fixed_rate: 3.85,
    floating_index: 'SOFR 3M',
    market_value: 1420350.0,
  },
  {
    contract_id: 'CNT-EUR-2002',
    counterparty: 'Goldman Sachs Bank USA',
    instrument_type: 'European Option',
    notional: 50000000.0,
    currency: 'USD',
    start_date: '2024-06-01',
    maturity_date: '2027-06-01',
    status: 'Active',
    fixed_rate: null,
    floating_index: null,
    market_value: -340800.0,
  },
  {
    contract_id: 'CNT-FXS-3003',
    counterparty: 'Barclays Capital',
    instrument_type: 'Currency Swap',
    notional: 75000000.0,
    currency: 'USD',
    start_date: '2023-11-20',
    maturity_date: '2028-11-20',
    status: 'Active',
    fixed_rate: 4.1,
    floating_index: 'EURIBOR 6M',
    market_value: 890400.0,
  },
  {
    contract_id: 'CNT-CDS-4004',
    counterparty: 'Morgan Stanley & Co',
    instrument_type: 'Credit Default Swap',
    notional: 40000000.0,
    currency: 'USD',
    start_date: '2024-03-20',
    maturity_date: '2029-03-20',
    status: 'Active',
    fixed_rate: 1.2,
    floating_index: null,
    market_value: -185200.0,
  },
  {
    contract_id: 'CNT-IRS-1005',
    counterparty: 'Citigroup Global Markets',
    instrument_type: 'Interest Rate Swap',
    notional: 150000000.0,
    currency: 'USD',
    start_date: '2025-02-10',
    maturity_date: '2035-02-10',
    status: 'Active',
    fixed_rate: 3.95,
    floating_index: 'SOFR 3M',
    market_value: 2340000.0,
  },
]

export const fallbackPortfolios: PortfolioSummary[] = [
  {
    portfolio_id: 'PTF-GLOBAL-RATES',
    name: 'Global Rates & Swaps Book',
    base_currency: 'USD',
    total_notional: 820000000.0,
    market_value: 27850000.0,
    contracts_count: 42,
    risk_level: 'Moderate',
  },
  {
    portfolio_id: 'PTF-FX-HEDGING',
    name: 'Macro Cross-Currency Book',
    base_currency: 'USD',
    total_notional: 215000000.0,
    market_value: 6450000.0,
    contracts_count: 14,
    risk_level: 'Low-Moderate',
  },
  {
    portfolio_id: 'PTF-EQUITY-DERIV',
    name: 'Structured Equity Volatility Book',
    base_currency: 'USD',
    total_notional: 240000000.0,
    market_value: 8920500.0,
    contracts_count: 18,
    risk_level: 'High',
  },
  {
    portfolio_id: 'PTF-CREDIT-PROTECTION',
    name: 'Sovereign & Corp Credit Protection',
    base_currency: 'USD',
    total_notional: 150000000.0,
    market_value: 5100000.0,
    contracts_count: 10,
    risk_level: 'Moderate-High',
  },
]

export const fallbackYieldCurve: YieldCurvePoint[] = [
  { tenor: '1M', zero_rate: 4.85, par_yield: 4.82, discount_factor: 0.996 },
  { tenor: '3M', zero_rate: 4.75, par_yield: 4.73, discount_factor: 0.9882 },
  { tenor: '6M', zero_rate: 4.6, par_yield: 4.58, discount_factor: 0.9775 },
  { tenor: '1Y', zero_rate: 4.38, par_yield: 4.35, discount_factor: 0.958 },
  { tenor: '2Y', zero_rate: 4.15, par_yield: 4.12, discount_factor: 0.9203 },
  { tenor: '5Y', zero_rate: 3.92, par_yield: 3.89, discount_factor: 0.822 },
  { tenor: '10Y', zero_rate: 4.08, par_yield: 4.05, discount_factor: 0.6651 },
  { tenor: '30Y', zero_rate: 4.35, par_yield: 4.31, discount_factor: 0.2725 },
]

export const fallbackFXRates: FXRateItem[] = [
  { pair: 'EUR/USD', spot_rate: 1.0845, change_24h: 0.0032, change_pct: 0.3 },
  { pair: 'GBP/USD', spot_rate: 1.298, change_24h: -0.0015, change_pct: -0.12 },
  { pair: 'USD/JPY', spot_rate: 152.4, change_24h: 0.85, change_pct: 0.56 },
  { pair: 'USD/CHF', spot_rate: 0.882, change_24h: -0.002, change_pct: -0.23 },
]

export const fallbackSystemHealth: SystemHealthSummary = {
  status: 'Healthy',
  active_workers: 16,
  total_workers: 16,
  queue_depth: 2,
  cpu_load_pct: 34.2,
  memory_load_pct: 58.6,
  error_rate_pct: 0.0,
  services: [
    {
      name: 'API Gateway',
      status: 'Healthy',
      latency_ms: 18.4,
      last_heartbeat: '2026-10-14T17:59:58Z',
      details: 'FastAPI v0.143 serving synthetic endpoints',
    },
    {
      name: 'Pricing Provider (Module 3)',
      status: 'Degraded',
      latency_ms: 0.0,
      last_heartbeat: '2026-10-14T17:59:50Z',
      details: 'Synthetic Mock Mode active; real pricing engine pending Module 3',
    },
    {
      name: 'Simulation Cluster (Module 7)',
      status: 'Healthy',
      latency_ms: 28.1,
      last_heartbeat: '2026-10-14T17:59:55Z',
      details: 'Simulated 16-worker pool operational for Monte Carlo tasks',
    },
    {
      name: 'Market Data Feeds (Module 4)',
      status: 'Degraded',
      latency_ms: 0.0,
      last_heartbeat: '2026-10-14T17:59:45Z',
      details: 'Using static synthetic curve snapshots; live providers pending Module 4',
    },
  ],
  is_demo_data: true,
}

export function previewFallbackPricing(request: PricingWorkbenchRequest): PricingWorkbenchResponse {
  const notional = request.notional || 1000000.0
  const years = request.maturity_years || 1.0
  let estimated = notional * 0.015

  if (request.instrument_type === 'European Option') {
    const s0 = request.underlying_price || 100.0
    const k = request.strike_price || 100.0
    const vol = request.volatility || 0.20
    const moneyness = Math.max(s0 - k, 0)
    estimated = (notional / s0) * (moneyness + s0 * 0.4 * vol * Math.sqrt(years))
  } else if (request.instrument_type === 'Interest Rate Swap') {
    const fixed = (request.fixed_rate || 4.0) / 100.0
    estimated = notional * (fixed - 0.038) * years * 0.95
  }

  return {
    is_preview: true,
    notice: 'This pricing calculation is a synthetic preview. Real pricing engine will be enabled in Module 3.',
    estimated_pv: Math.round(estimated * 100) / 100,
    currency: request.currency || 'USD',
    parameters: {
      instrument_type: request.instrument_type,
      notional: request.notional,
      maturity_years: request.maturity_years,
      counterparty: request.counterparty || 'Demo Global Markets LLC',
    },
  }
}

export const fallbackDetailedContracts: ContractDetailResponse[] = [
  {
    contract_id: 'CNT-IRS-1001',
    external_reference: 'EXT-JPM-2024-001',
    counterparty: 'JPMorgan Chase NA',
    instrument_type: 'Interest Rate Swap',
    notional: 100000000.0,
    currency: 'USD',
    effective_date: '2024-01-15',
    maturity_date: '2029-01-15',
    status: 'ACTIVE',
    version: 3,
    terms: {
      notional: 100000000.0,
      currency: 'USD',
      effective_date: '2024-01-15',
      maturity_date: '2029-01-15',
      fixed_rate: 3.85,
      floating_index: 'SOFR 3M',
      fixed_leg_payer: 'PAY_FIXED',
      fixed_frequency: 'SEMI_ANNUAL',
      floating_frequency: 'QUARTERLY',
      day_count_convention: 'ACT_360',
      business_day_convention: 'MODIFIED_FOLLOWING',
      settlement_calendar: 'US_NY',
    },
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T11:30:00Z',
  },
  {
    contract_id: 'CNT-OPT-2002',
    external_reference: 'EXT-GS-EQ-2024-88',
    counterparty: 'Goldman Sachs Bank USA',
    instrument_type: 'European Option',
    notional: 50000000.0,
    currency: 'USD',
    effective_date: '2024-06-01',
    maturity_date: '2027-06-01',
    status: 'ACTIVE',
    version: 2,
    terms: {
      underlying_asset: 'SPX',
      option_type: 'CALL',
      exercise_style: 'EUROPEAN',
      strike_price: 5200.0,
      premium: 142.5,
      notional: 50000000.0,
      currency: 'USD',
      trade_date: '2024-06-01',
      expiration_date: '2027-06-01',
      settlement_type: 'CASH',
      position_direction: 'BUY',
    },
    created_at: '2024-06-01T10:15:00Z',
    updated_at: '2024-06-01T12:00:00Z',
  },
  {
    contract_id: 'CNT-FXS-3003',
    external_reference: 'EXT-BARC-FX-2023-14',
    counterparty: 'Barclays Capital',
    instrument_type: 'Currency Swap',
    notional: 75000000.0,
    currency: 'USD',
    effective_date: '2023-11-20',
    maturity_date: '2028-11-20',
    status: 'ACTIVE',
    version: 2,
    terms: {
      pay_currency: 'USD',
      receive_currency: 'EUR',
      pay_notional: 75000000.0,
      receive_notional: 69000000.0,
      fx_exchange_rate: 1.087,
      effective_date: '2023-11-20',
      maturity_date: '2028-11-20',
      pay_leg_rate_type: 'FIXED',
      receive_leg_rate_type: 'FLOATING',
      pay_fixed_rate: 4.1,
      receive_floating_index: 'EURIBOR 6M',
      payment_frequency: 'SEMI_ANNUAL',
      principal_exchange: 'INITIAL_AND_FINAL',
      day_count_convention: 'ACT_360',
    },
    created_at: '2023-11-20T08:30:00Z',
    updated_at: '2023-11-20T10:00:00Z',
  },
  {
    contract_id: 'CNT-CDS-4004',
    external_reference: 'EXT-MS-CDS-2024-07',
    counterparty: 'Morgan Stanley & Co',
    instrument_type: 'Credit Default Swap',
    notional: 40000000.0,
    currency: 'USD',
    effective_date: '2024-03-20',
    maturity_date: '2029-03-20',
    status: 'ACTIVE',
    version: 2,
    terms: {
      reference_entity: 'Ford Motor Credit Co LLC',
      direction: 'BUY_PROTECTION',
      notional: 40000000.0,
      spread_bps: 120.0,
      currency: 'USD',
      effective_date: '2024-03-20',
      maturity_date: '2029-03-20',
      premium_frequency: 'QUARTERLY',
      day_count_convention: 'ACT_360',
      restructuring_clause: 'CR',
    },
    created_at: '2024-03-20T14:20:00Z',
    updated_at: '2024-03-20T15:45:00Z',
  },
  {
    contract_id: 'CNT-IRS-1005',
    external_reference: 'EXT-CITI-IRS-2025-03',
    counterparty: 'Citigroup Global Markets',
    instrument_type: 'Interest Rate Swap',
    notional: 150000000.0,
    currency: 'USD',
    effective_date: '2025-02-10',
    maturity_date: '2035-02-10',
    status: 'DRAFT',
    version: 1,
    terms: {
      notional: 150000000.0,
      currency: 'USD',
      effective_date: '2025-02-10',
      maturity_date: '2035-02-10',
      fixed_rate: 3.95,
      floating_index: 'SOFR 3M',
      fixed_leg_payer: 'PAY_FIXED',
      fixed_frequency: 'SEMI_ANNUAL',
      floating_frequency: 'QUARTERLY',
      day_count_convention: 'ACT_360',
      business_day_convention: 'MODIFIED_FOLLOWING',
      settlement_calendar: 'US_NY',
    },
    created_at: '2025-02-10T11:00:00Z',
    updated_at: '2025-02-10T11:00:00Z',
  },
]

export const fallbackPaginationResponse: ContractPaginationResponse = {
  items: fallbackDetailedContracts,
  total: fallbackDetailedContracts.length,
  page: 1,
  page_size: 20,
  total_pages: 1,
}

export const fallbackPricingModels: ModelMetadata[] = [
  {
    model_id: 'BSM_EUROPEAN',
    name: 'Black-Scholes-Merton (1973) Analytical Engine',
    version: '1.0.0',
    description: 'Closed-form analytical pricing for European vanilla equity and index options with full Greeks.',
    supported_instruments: ['European Option'],
    required_market_inputs: ['spot_price', 'volatility', 'risk_free_rate'],
    supported_greeks: ['Delta', 'Gamma', 'Vega', 'Theta', 'Rho'],
  },
  {
    model_id: 'DISCOUNTED_CASH_FLOW_IRS',
    name: 'Single-Curve Discounted Cash Flow IRS Engine',
    version: '1.0.0',
    description: 'Dual-leg discounted cashflow valuation for Interest Rate Swaps with par swap rates, PV01, and DV01.',
    supported_instruments: ['Interest Rate Swap'],
    required_market_inputs: ['yield_curve'],
    supported_greeks: ['PV01', 'DV01', 'ParSwapRate'],
  },
  {
    model_id: 'CROSS_CURRENCY_DCF',
    name: 'Cross-Currency Dual-Leg Discounted Cash Flow Engine',
    version: '1.0.0',
    description: 'Dual-currency DCF pricing for Cross-Currency Swaps with native curve discounting and FX spot conversion.',
    supported_instruments: ['Currency Swap'],
    required_market_inputs: ['yield_curve', 'fx_spot'],
    supported_greeks: ['PV01', 'FX_Delta'],
  },
  {
    model_id: 'ISDA_HAZARD_RATE_CDS',
    name: 'ISDA Standard Hazard Rate CDS Engine',
    version: '1.0.0',
    description: 'Intensity model for Credit Default Swaps calculating protection and premium legs with accrual on default and CS01.',
    supported_instruments: ['Credit Default Swap'],
    required_market_inputs: ['yield_curve', 'hazard_rate', 'recovery_rate'],
    supported_greeks: ['CS01', 'RPV01', 'DefaultProb'],
  },
]

export const fallbackValuationResponse: ValuationResponse = {
  valuation_id: 'VAL-OPT-DEMO-001',
  contract_id: 'CNT-OPT-2002',
  contract_version: 1,
  instrument_type: 'European Option',
  model_info: fallbackPricingModels[0],
  valuation_date: '2026-10-15',
  present_value: 3425000.0,
  currency: 'USD',
  greeks: {
    delta: 5320.45,
    gamma: 12.34,
    vega: 24500.12,
    vega_1pct: 245.0,
    theta_per_year: -185000.0,
    theta_per_day: -506.85,
    rho: 14200.0,
    rho_1bp: 1.42,
    units: {
      delta: 'Change in contract value per $1 move in underlying asset',
      gamma: 'Change in Delta per $1 move in underlying asset',
      vega: 'Sensitivity per 100% change in volatility',
      vega_1pct: 'Sensitivity per 1% change in implied volatility',
      theta_per_year: 'Time decay per year of elapsed time (-dV/dt)',
      theta_per_day: 'Time decay per calendar day (1/365)',
      rho: 'Sensitivity per 100% change in risk-free interest rate',
      rho_1bp: 'Sensitivity per 1 basis point (0.01%) shift in risk-free rate',
    },
  },
  market_snapshot_ref: 'MKT-2026-10-15-DEMO',
  assumptions: [
    'Black-Scholes-Merton (1973) continuous lognormal geometric Brownian motion',
    'Deterministic constant risk-free discount rate and continuous dividend yield',
    'European exercise constraint with zero early exercise premium',
  ],
  warnings: [],
  status: 'Completed',
  created_at: '2026-10-15T12:00:00Z',
}

