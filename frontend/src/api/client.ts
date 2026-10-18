import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DashboardSummaryResponse,
  PortfolioExposure,
  ValuationSummary,
  ActivityEvent,
  SimulationJobSummary,
  ContractSummary,
  PortfolioSummary,
  YieldCurvePoint,
  FXRateItem,
  SystemHealthSummary,
  PricingWorkbenchRequest,
  PricingWorkbenchResponse,
  ContractDetailResponse,
  ContractPaginationResponse,
  ContractCreateRequest,
  ContractUpdateRequest,
  ContractTransitionRequest,
  ContractAuditResponse,
  ContractRevisionResponse,
  DatabaseHealthInfo,
  ModelMetadata,
  PriceContractRequest,
  ValuationResponse,
  AdHocPricingRequest,
} from '../types'
import {
  fallbackKPISummary,
  generateFallbackValueHistory,
  fallbackExposures,
  fallbackValuations,
  fallbackActivityEvents,
  fallbackSimulationJobs,
  fallbackContracts,
  fallbackPortfolios,
  fallbackYieldCurve,
  fallbackFXRates,
  fallbackSystemHealth,
  previewFallbackPricing,
  fallbackDetailedContracts,
  fallbackPaginationResponse,
  fallbackPricingModels,
  fallbackValuationResponse,
} from './mockFallback'


const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export interface ApiResult<T> {
  data: T
  isLive: boolean
  error?: string
}

async function fetchWithFallback<T>(
  endpoint: string,
  fallbackData: T
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()
    return { data: json as T, isLive: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend unreachable'
    console.warn(`[DerivaQuant API] Using demo fallback for ${endpoint}: ${message}`)
    return { data: fallbackData, isLive: false, error: message }
  }
}

export const api = {
  async getHealth(): Promise<{ status: string; service: string }> {
    try {
      const res = await fetch(`${BASE_URL}/health`)
      if (res.ok) return await res.json()
      throw new Error('Health check failed')
    } catch {
      return { status: 'offline', service: 'DerivaQuant API (Offline Mode)' }
    }
  },

  async getDashboardSummary(days: number = 30): Promise<ApiResult<DashboardSummaryResponse>> {
    const fallback: DashboardSummaryResponse = {
      kpi: fallbackKPISummary,
      value_history: generateFallbackValueHistory(days),
      is_demo_data: true,
    }
    return fetchWithFallback<DashboardSummaryResponse>(
      `/dashboard/summary?days=${days}`,
      fallback
    )
  },

  async getDashboardExposure(): Promise<ApiResult<PortfolioExposure[]>> {
    return fetchWithFallback<PortfolioExposure[]>('/dashboard/exposure', fallbackExposures)
  },

  async getRecentValuations(limit: number = 10): Promise<ApiResult<ValuationSummary[]>> {
    return fetchWithFallback<ValuationSummary[]>(
      `/valuations/recent?limit=${limit}`,
      fallbackValuations.slice(0, limit)
    )
  },

  async getRecentActivity(limit: number = 10): Promise<ApiResult<ActivityEvent[]>> {
    return fetchWithFallback<ActivityEvent[]>(
      `/activity?limit=${limit}`,
      fallbackActivityEvents.slice(0, limit)
    )
  },

  async getSimulationJobs(): Promise<ApiResult<SimulationJobSummary[]>> {
    return fetchWithFallback<SimulationJobSummary[]>('/jobs/summary', fallbackSimulationJobs)
  },

  async getContracts(): Promise<ApiResult<ContractSummary[]>> {
    return fetchWithFallback<ContractSummary[]>('/contracts', fallbackContracts)
  },

  async getPortfolios(): Promise<ApiResult<PortfolioSummary[]>> {
    return fetchWithFallback<PortfolioSummary[]>('/portfolios', fallbackPortfolios)
  },

  async getYieldCurve(): Promise<ApiResult<YieldCurvePoint[]>> {
    return fetchWithFallback<YieldCurvePoint[]>('/market-data/rates', fallbackYieldCurve)
  },

  async getFXRates(): Promise<ApiResult<FXRateItem[]>> {
    return fetchWithFallback<FXRateItem[]>('/market-data/fx', fallbackFXRates)
  },

  async getSystemHealth(): Promise<ApiResult<SystemHealthSummary>> {
    return fetchWithFallback<SystemHealthSummary>('/system/health', fallbackSystemHealth)
  },

  async previewPricing(
    request: PricingWorkbenchRequest
  ): Promise<PricingWorkbenchResponse> {
    try {
      const res = await fetch(`${BASE_URL}/pricing/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (res.ok) {
        return await res.json()
      }
      throw new Error(`Pricing API returned ${res.status}`)
    } catch {
      return previewFallbackPricing(request)
    }
  },

  exportValuationsCSV(): void {
    window.location.href = `${BASE_URL}/reports/export/valuations.csv`
  },

  async listContracts(
    params: ContractQueryParams = {}
  ): Promise<ApiResult<ContractPaginationResponse>> {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.instrument_type) query.set('instrument_type', params.instrument_type)
    if (params.status) query.set('status', params.status)
    if (params.counterparty) query.set('counterparty', params.counterparty)
    if (params.sort_by) query.set('sort_by', params.sort_by)
    if (params.sort_order) query.set('sort_order', params.sort_order)
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return fetchWithFallback<ContractPaginationResponse>(
      `/contracts${queryString}`,
      fallbackPaginationResponse
    )
  },

  async getContract(contractId: string): Promise<ApiResult<ContractDetailResponse>> {
    const fallback =
      fallbackDetailedContracts.find((c) => c.contract_id === contractId) ||
      fallbackDetailedContracts[0]
    return fetchWithFallback<ContractDetailResponse>(`/contracts/${contractId}`, fallback)
  },

  async createContract(request: ContractCreateRequest): Promise<ContractDetailResponse> {
    const res = await fetch(`${BASE_URL}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `Failed to create contract (${res.status})`)
    }
    return res.json()
  },

  async updateContract(
    contractId: string,
    request: ContractUpdateRequest
  ): Promise<ContractDetailResponse> {
    const res = await fetch(`${BASE_URL}/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `Failed to update contract (${res.status})`)
    }
    return res.json()
  },

  async transitionContract(
    contractId: string,
    action: 'submit' | 'activate' | 'reject' | 'return-to-draft' | 'mature' | 'cancel',
    request: ContractTransitionRequest
  ): Promise<ContractDetailResponse> {
    const res = await fetch(`${BASE_URL}/contracts/${contractId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `Failed to transition contract (${res.status})`)
    }
    return res.json()
  },

  async getContractAudit(contractId: string): Promise<ApiResult<ContractAuditResponse[]>> {
    return fetchWithFallback<ContractAuditResponse[]>(`/contracts/${contractId}/audit`, [])
  },

  async getContractRevisions(contractId: string): Promise<ApiResult<ContractRevisionResponse[]>> {
    return fetchWithFallback<ContractRevisionResponse[]>(`/contracts/${contractId}/revisions`, [])
  },

  async getContractsDbHealth(): Promise<ApiResult<DatabaseHealthInfo>> {
    return fetchWithFallback<DatabaseHealthInfo>('/contracts/meta/health', {
      status: 'disconnected',
      dialect: 'demo-fallback',
      url_masked: 'local-in-memory',
      healthy: false,
    })
  },

  // Module 3: Quantitative Financial Pricing Engine API
  async getPricingModels(instrumentType?: string): Promise<ApiResult<ModelMetadata[]>> {
    const q = instrumentType ? `?instrument_type=${encodeURIComponent(instrumentType)}` : ''
    return fetchWithFallback<ModelMetadata[]>(
      `/pricing/models${q}`,
      instrumentType
        ? fallbackPricingModels.filter((m) => m.supported_instruments.includes(instrumentType as any))
        : fallbackPricingModels
    )
  },

  async priceContract(request: PriceContractRequest): Promise<ValuationResponse> {
    const res = await fetch(`${BASE_URL}/pricing/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `Valuation failed with HTTP ${res.status}`)
    }
    return res.json()
  },

  async priceAdHoc(request: AdHocPricingRequest): Promise<ValuationResponse> {
    const res = await fetch(`${BASE_URL}/pricing/ad-hoc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `Ad-hoc valuation failed with HTTP ${res.status}`)
    }
    return res.json()
  },

  async getValuation(valuationId: string): Promise<ApiResult<ValuationResponse>> {
    return fetchWithFallback<ValuationResponse>(
      `/pricing/valuations/${valuationId}`,
      fallbackValuationResponse
    )
  },

  async listValuations(contractId?: string): Promise<ApiResult<ValuationResponse[]>> {
    const q = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : ''
    return fetchWithFallback<ValuationResponse[]>(
      `/pricing/valuations${q}`,
      [fallbackValuationResponse]
    )
  },
}


export interface ContractQueryParams {
  search?: string
  instrument_type?: string
  status?: string
  counterparty?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

// React Query Hooks
export function useDashboardSummary(days: number = 30) {
  return useQuery({
    queryKey: ['dashboard-summary', days],
    queryFn: () => api.getDashboardSummary(days),
    staleTime: 10_000,
  })
}

export function useDashboardExposure() {
  return useQuery({
    queryKey: ['dashboard-exposure'],
    queryFn: () => api.getDashboardExposure(),
    staleTime: 15_000,
  })
}

export function useRecentValuations(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-valuations', limit],
    queryFn: () => api.getRecentValuations(limit),
    staleTime: 10_000,
  })
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => api.getRecentActivity(limit),
    staleTime: 10_000,
  })
}

export function useSimulationJobs() {
  return useQuery({
    queryKey: ['simulation-jobs'],
    queryFn: () => api.getSimulationJobs(),
    staleTime: 10_000,
  })
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.getContracts(),
    staleTime: 30_000,
  })
}

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => api.getPortfolios(),
    staleTime: 30_000,
  })
}

export function useMarketRates() {
  return useQuery({
    queryKey: ['market-rates'],
    queryFn: () => api.getYieldCurve(),
    staleTime: 30_000,
  })
}

export function useFXRates() {
  return useQuery({
    queryKey: ['market-fx'],
    queryFn: () => api.getFXRates(),
    staleTime: 15_000,
  })
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.getSystemHealth(),
    staleTime: 10_000,
  })
}

export function useContractRegistry(params: ContractQueryParams = {}) {
  return useQuery({
    queryKey: ['contracts-registry', params],
    queryFn: () => api.listContracts(params),
    staleTime: 10_000,
  })
}

export function useContractDetail(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-detail', contractId],
    queryFn: () => (contractId ? api.getContract(contractId) : null),
    enabled: !!contractId,
    staleTime: 10_000,
  })
}

export function useContractAudit(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-audit', contractId],
    queryFn: () => (contractId ? api.getContractAudit(contractId) : null),
    enabled: !!contractId,
    staleTime: 10_000,
  })
}

export function useContractRevisions(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-revisions', contractId],
    queryFn: () => (contractId ? api.getContractRevisions(contractId) : null),
    enabled: !!contractId,
    staleTime: 10_000,
  })
}

export function useContractsDbHealth() {
  return useQuery({
    queryKey: ['contracts-db-health'],
    queryFn: () => api.getContractsDbHealth(),
    staleTime: 30_000,
  })
}

export function useCreateContractMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: ContractCreateRequest) => api.createContract(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts-registry'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}

export function useUpdateContractMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contractId, req }: { contractId: string; req: ContractUpdateRequest }) =>
      api.updateContract(contractId, req),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contracts-registry'] })
      queryClient.invalidateQueries({ queryKey: ['contract-detail', vars.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-audit', vars.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-revisions', vars.contractId] })
    },
  })
}

export function useTransitionContractMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      contractId,
      action,
      req,
    }: {
      contractId: string
      action: 'submit' | 'activate' | 'reject' | 'return-to-draft' | 'mature' | 'cancel'
      req: ContractTransitionRequest
    }) => api.transitionContract(contractId, action, req),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contracts-registry'] })
      queryClient.invalidateQueries({ queryKey: ['contract-detail', vars.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-audit', vars.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-revisions', vars.contractId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}

// ============================================================================
// Module 3: Quantitative Pricing Engine Hooks
// ============================================================================

export function usePricingModels(instrumentType?: string) {
  return useQuery({
    queryKey: ['pricing-models', instrumentType],
    queryFn: () => api.getPricingModels(instrumentType),
    staleTime: 60_000,
  })
}

export function usePriceContractMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: PriceContractRequest) => api.priceContract(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-valuations'] })
      queryClient.invalidateQueries({ queryKey: ['recent-valuations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}

export function usePriceAdHocMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: AdHocPricingRequest) => api.priceAdHoc(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-valuations'] })
    },
  })
}

export function useValuation(valuationId: string | null) {
  return useQuery({
    queryKey: ['pricing-valuation', valuationId],
    queryFn: () => (valuationId ? api.getValuation(valuationId) : null),
    enabled: !!valuationId,
    staleTime: 30_000,
  })
}

export function useValuations(contractId?: string) {
  return useQuery({
    queryKey: ['pricing-valuations', contractId],
    queryFn: () => api.listValuations(contractId),
    staleTime: 15_000,
  })
}

