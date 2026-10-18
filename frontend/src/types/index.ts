export type InstrumentType =
  | 'Interest Rate Swap'
  | 'European Option'
  | 'Currency Swap'
  | 'Credit Default Swap'
  | 'FX Forward'
  | 'Equity Variance Swap'

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'MATURED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'Active'
  | 'Matured'
  | 'Terminated'
  | 'Pending Confirmation'
  | 'Draft'

export type OptionType = 'CALL' | 'PUT'
export type ExerciseStyle = 'EUROPEAN'
export type SettlementType = 'CASH' | 'PHYSICAL'
export type PositionDirection = 'BUY' | 'SELL'
export type FixedPayer = 'PAY_FIXED' | 'RECEIVE_FIXED'
export type PaymentFrequency = 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY'
export type DayCountConvention = 'ACT_360' | 'ACT_365_FIXED' | 'THIRTY_360' | 'ACT_ACT_ISDA'
export type BusinessDayConvention = 'FOLLOWING' | 'MODIFIED_FOLLOWING' | 'PRECEDING'
export type PrincipalExchange = 'INITIAL_AND_FINAL' | 'FINAL_ONLY' | 'NONE'
export type LegRateType = 'FIXED' | 'FLOATING'
export type CDSDirection = 'BUY_PROTECTION' | 'SELL_PROTECTION'
export type RestructuringClause = 'CR' | 'MR' | 'MM' | 'XR'

export type ValuationStatus =
  | 'Completed'
  | 'In Progress'
  | 'Failed'
  | 'Pending Validation'

export type JobStatus =
  | 'Running'
  | 'Completed'
  | 'Queued'
  | 'Failed'
  | 'Cancelled'

export type SimulationType =
  | 'Monte Carlo (Black-Scholes)'
  | 'Hull-White (2-Factor)'
  | 'Heston Stochastic Volatility'
  | 'Vasicek Interest Rate'

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error'

export type ServiceHealthStatus = 'Healthy' | 'Degraded' | 'Offline'

export interface KPISummary {
  total_notional: number
  total_market_value: number
  active_contracts: number
  daily_pnl: number
  daily_pnl_pct: number
  simulated_var_95_1d: number
  active_simulation_jobs: number
  currency: string
  valuation_timestamp: string
  is_demo_data: boolean
}

export interface ValueHistoryPoint {
  date: string
  market_value: number
  daily_pnl: number
  cumulative_pnl: number
}

export interface DashboardSummaryResponse {
  kpi: KPISummary
  value_history: ValueHistoryPoint[]
  is_demo_data: boolean
}

export interface PortfolioExposure {
  instrument_type: InstrumentType
  notional: number
  market_value: number
  delta_equivalent: number
  percentage_of_total: number
  contract_count: number
}

export interface ValuationSummary {
  valuation_id: string
  contract_id: string
  instrument: InstrumentType
  valuation_timestamp: string
  market_value: number
  currency: string
  model_used: string
  status: ValuationStatus
  pv01: number
  dv01: number
}

export interface SimulationJobSummary {
  job_id: string
  simulation_type: SimulationType
  status: JobStatus
  progress: number
  paths: number
  time_steps: number
  elapsed_sec: number
  submitted_time: string
}

export interface ActivityEvent {
  event_id: string
  event_type: string
  title: string
  description: string
  timestamp: string
  severity: ActivitySeverity
}

export interface ServiceStatus {
  name: string
  status: ServiceHealthStatus
  latency_ms: number
  last_heartbeat: string
  details: string
}

export interface SystemHealthSummary {
  status: ServiceHealthStatus
  active_workers: number
  total_workers: number
  queue_depth: number
  cpu_load_pct: number
  memory_load_pct: number
  error_rate_pct: number
  services: ServiceStatus[]
  is_demo_data: boolean
}

export interface ContractSummary {
  contract_id: string
  counterparty: string
  instrument_type: InstrumentType
  notional: number
  currency: string
  start_date: string
  maturity_date: string
  status: ContractStatus
  fixed_rate?: number | null
  floating_index?: string | null
  market_value: number
}

export interface PortfolioSummary {
  portfolio_id: string
  name: string
  base_currency: string
  total_notional: number
  market_value: number
  contracts_count: number
  risk_level: string
}

export interface YieldCurvePoint {
  tenor: string
  zero_rate: number
  par_yield: number
  discount_factor: number
}

export interface FXRateItem {
  pair: string
  spot_rate: number
  change_24h: number
  change_pct: number
}

export interface PricingWorkbenchRequest {
  instrument_type: InstrumentType
  notional: number
  currency: string
  maturity_years: number
  underlying_price?: number
  strike_price?: number
  volatility?: number
  risk_free_rate?: number
  fixed_rate?: number
  counterparty?: string
}

export interface PricingWorkbenchResponse {
  is_preview: boolean
  notice: string
  estimated_pv: number
  currency: string
  parameters: Record<string, unknown>
}

// ============================================================================
// Module 3: Quantitative Pricing Engine Types & Result Schemas
// ============================================================================

export interface ModelMetadata {
  model_id: string
  name: string
  version: string
  description: string
  supported_instruments: InstrumentType[]
  required_market_inputs: string[]
  supported_greeks: string[]
}

export interface MarketInputsOverride {
  spot_price?: number | null
  volatility?: number | null
  risk_free_rate?: number | null
  dividend_yield?: number | null
  hazard_rate?: number | null
  recovery_rate?: number | null
  fx_spot?: number | null
  yield_curve_shift_bps?: number | null
}

export interface PriceContractRequest {
  contract_id: string
  contract_version: number
  model_id?: string
  valuation_date: string
  market_overrides?: MarketInputsOverride | null
}

export interface GreeksResult {
  delta?: number | null
  gamma?: number | null
  vega?: number | null
  vega_1pct?: number | null
  theta_per_year?: number | null
  theta_per_day?: number | null
  rho?: number | null
  rho_1pct?: number | null
  rho_1bp?: number | null
  pv01?: number | null
  dv01?: number | null
  cs01?: number | null
  units?: Record<string, string>
}

export interface CashflowScheduleItem {
  period: number
  payment_date: string
  accrual_fraction: number
  fixed_amount?: number | null
  floating_amount?: number | null
  net_cashflow: number
  discount_factor: number
  present_value: number
}

export interface ValuationResponse {
  valuation_id: string
  contract_id: string
  contract_version: number
  instrument_type: InstrumentType
  model_info: ModelMetadata
  valuation_date: string
  present_value: number
  currency: string
  greeks?: GreeksResult | null
  market_snapshot_ref: string
  cashflows?: CashflowScheduleItem[] | null
  assumptions: string[]
  warnings: string[]
  status: string
  created_at: string
}

export interface AdHocPricingRequest {
  instrument_type: InstrumentType
  model_id?: string
  notional: number
  currency?: string
  valuation_date: string
  option_type?: OptionType
  strike_price?: number | null
  expiration_date?: string | null
  underlying_price?: number | null
  volatility?: number | null
  risk_free_rate?: number | null
  dividend_yield?: number | null
  position_direction?: PositionDirection
  fixed_rate?: number | null
  floating_index?: string | null
  maturity_date?: string | null
  payment_frequency?: PaymentFrequency
  fixed_leg_payer?: FixedPayer
  spread_bps?: number | null
  hazard_rate?: number | null
  recovery_rate?: number | null
}


// ============================================================================
// Module 2: Contract Specifications, Lifecycle, and Audit Trails
// ============================================================================

export interface IRSSpec {
  notional: number
  currency: string
  effective_date: string
  maturity_date: string
  fixed_rate: number
  floating_index: string
  fixed_leg_payer?: FixedPayer
  fixed_frequency?: PaymentFrequency
  floating_frequency?: PaymentFrequency
  day_count_convention?: DayCountConvention
  business_day_convention?: BusinessDayConvention
  settlement_calendar?: string
}

export interface EuropeanOptionSpec {
  underlying_asset: string
  option_type: OptionType
  exercise_style?: ExerciseStyle
  strike_price: number
  premium: number
  notional: number
  currency?: string
  trade_date: string
  expiration_date: string
  settlement_type?: SettlementType
  position_direction?: PositionDirection
}

export interface CurrencySwapSpec {
  pay_currency: string
  receive_currency: string
  pay_notional: number
  receive_notional: number
  fx_exchange_rate?: number | null
  effective_date: string
  maturity_date: string
  pay_leg_rate_type?: LegRateType
  receive_leg_rate_type?: LegRateType
  pay_fixed_rate?: number | null
  receive_fixed_rate?: number | null
  pay_floating_index?: string | null
  receive_floating_index?: string | null
  payment_frequency?: PaymentFrequency
  principal_exchange?: PrincipalExchange
  day_count_convention?: DayCountConvention
}

export interface CDSSpec {
  reference_entity: string
  direction?: CDSDirection
  notional: number
  spread_bps: number
  currency?: string
  effective_date: string
  maturity_date: string
  premium_frequency?: PaymentFrequency
  day_count_convention?: DayCountConvention
  restructuring_clause?: RestructuringClause
}

export interface ContractDetailResponse {
  contract_id: string
  external_reference?: string | null
  counterparty: string
  instrument_type: InstrumentType
  status: ContractStatus
  version: number
  notional: number
  currency: string
  effective_date: string
  maturity_date: string
  terms: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ContractPaginationResponse {
  items: ContractDetailResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ContractCreateRequest {
  instrument_type: InstrumentType
  counterparty: string
  external_reference?: string | null
  irs_terms?: IRSSpec | null
  option_terms?: EuropeanOptionSpec | null
  currency_swap_terms?: CurrencySwapSpec | null
  cds_terms?: CDSSpec | null
}

export interface ContractUpdateRequest {
  counterparty?: string
  external_reference?: string | null
  expected_version: number
  reason?: string
  irs_terms?: IRSSpec | null
  option_terms?: EuropeanOptionSpec | null
  currency_swap_terms?: CurrencySwapSpec | null
  cds_terms?: CDSSpec | null
}

export interface ContractTransitionRequest {
  expected_version: number
  actor?: string
  reason?: string
}

export interface ContractAuditResponse {
  event_id: string
  contract_id: string
  event_type: string
  from_status?: string | null
  to_status?: string | null
  actor: string
  timestamp: string
  diff?: Record<string, any> | null
  reason?: string | null
  version: number
}

export interface ContractRevisionResponse {
  revision_id: number
  contract_id: string
  version: number
  status: ContractStatus
  snapshot: Record<string, any>
  created_at: string
  changed_by: string
  reason?: string | null
}

export interface DatabaseHealthInfo {
  status: string
  dialect: string
  url_masked: string
  healthy: boolean
  error?: string
}
