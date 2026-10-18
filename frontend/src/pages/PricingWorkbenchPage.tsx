import React, { useState, useEffect } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { api, usePricingModels, usePriceContractMutation, usePriceAdHocMutation } from '../api/client'
import { formatCurrency, formatPercent } from '../utils/formatters'
import type {
  InstrumentType,
  ContractDetailResponse,
  ValuationResponse,
  PriceContractRequest,
  AdHocPricingRequest,
} from '../types'
import {
  Calculator,
  AlertCircle,
  CheckCircle2,
  Database,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
  FileSpreadsheet,
  AlertTriangle,
  Info,
} from 'lucide-react'

export function PricingWorkbenchPage() {
  // Mode switcher: 'contract' (Booked M2 Contract) or 'adhoc' (What-If Structure)
  const [pricingMode, setPricingMode] = useState<'contract' | 'adhoc'>('contract')

  // Contracts list loaded from M2
  const [contracts, setContracts] = useState<ContractDetailResponse[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string>('')
  const [isLoadingContracts, setIsLoadingContracts] = useState<boolean>(true)

  // Selected contract data
  const selectedContract = contracts.find((c) => c.contract_id === selectedContractId) || contracts[0]

  // Model selection
  const targetInstrument = pricingMode === 'contract' ? selectedContract?.instrument_type : undefined
  const { data: modelsResult } = usePricingModels(targetInstrument)
  const availableModels = modelsResult?.data || []
  const [selectedModelId, setSelectedModelId] = useState<string>('')

  // Valuation Date
  const [valuationDate, setValuationDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Market Overrides / Inputs
  const [spotOverride, setSpotOverride] = useState<string>('5000.0')
  const [volOverride, setVolOverride] = useState<string>('0.20')
  const [rateOverride, setRateOverride] = useState<string>('0.045')
  const [dividendOverride, setDividendOverride] = useState<string>('0.015')
  const [curveShiftBps, setCurveShiftBps] = useState<string>('0')
  const [hazardRateOverride, setHazardRateOverride] = useState<string>('0.02')

  // Ad-hoc configuration state
  const [adhocInstrument, setAdhocInstrument] = useState<InstrumentType>('European Option')
  const [adhocNotional, setAdhocNotional] = useState<number>(10000000)
  const [adhocStrike, setAdhocStrike] = useState<number>(100.0)
  const [adhocUnderlying, setAdhocUnderlying] = useState<number>(105.0)
  const [adhocVol, setAdhocVol] = useState<number>(0.20)
  const [adhocRate, setAdhocRate] = useState<number>(0.045)
  const [adhocOptionType, setAdhocOptionType] = useState<'CALL' | 'PUT'>('CALL')
  const [adhocFixedRate, setAdhocFixedRate] = useState<number>(3.85)

  // Valuation Output & Error state
  const [valuationResult, setValuationResult] = useState<ValuationResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Mutations
  const priceContractMutation = usePriceContractMutation()
  const priceAdHocMutation = usePriceAdHocMutation()

  const isCalculating = priceContractMutation.isPending || priceAdHocMutation.isPending

  // Fetch contracts from Module 2 on mount
  useEffect(() => {
    let isMounted = true
    setIsLoadingContracts(true)
    api.listContracts({ page_size: 50 })
      .then((res) => {
        if (isMounted) {
          setContracts(res.data.items)
          if (res.data.items.length > 0 && !selectedContractId) {
            setSelectedContractId(res.data.items[0].contract_id)
          }
        }
      })
      .catch(() => {
        // Fallback handled inside api client
      })
      .finally(() => {
        if (isMounted) setIsLoadingContracts(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Auto-select default model when available
  useEffect(() => {
    if (availableModels.length > 0) {
      if (!selectedModelId || !availableModels.some((m) => m.model_id === selectedModelId)) {
        setSelectedModelId(availableModels[0].model_id)
      }
    }
  }, [availableModels, selectedModelId])

  // Execute Authoritative Contract Pricing
  const handlePriceContract = async () => {
    if (!selectedContract) return
    setErrorMessage(null)

    const payload: PriceContractRequest = {
      contract_id: selectedContract.contract_id,
      contract_version: selectedContract.version,
      model_id: selectedModelId || undefined,
      valuation_date: valuationDate,
      market_overrides: {
        spot_price: spotOverride ? parseFloat(spotOverride) : null,
        volatility: volOverride ? parseFloat(volOverride) : null,
        risk_free_rate: rateOverride ? parseFloat(rateOverride) : null,
        dividend_yield: dividendOverride ? parseFloat(dividendOverride) : null,
        yield_curve_shift_bps: curveShiftBps ? parseFloat(curveShiftBps) : null,
        hazard_rate: hazardRateOverride ? parseFloat(hazardRateOverride) : null,
      },
    }

    try {
      const res = await priceContractMutation.mutateAsync(payload)
      setValuationResult(res)
    } catch (err: any) {
      setErrorMessage(err.message || 'Quantitative valuation failed')
    }
  }

  // Execute Ad-Hoc Pricing
  const handlePriceAdHoc = async () => {
    setErrorMessage(null)

    const payload: AdHocPricingRequest = {
      instrument_type: adhocInstrument,
      model_id: adhocInstrument === 'European Option' ? 'BSM_EUROPEAN' : 'DISCOUNTED_CASH_FLOW_IRS',
      notional: adhocNotional,
      currency: 'USD',
      valuation_date: valuationDate,
      option_type: adhocOptionType,
      strike_price: adhocStrike,
      underlying_price: adhocUnderlying,
      volatility: adhocVol,
      risk_free_rate: adhocRate,
      fixed_rate: adhocFixedRate,
    }

    try {
      const res = await priceAdHocMutation.mutateAsync(payload)
      setValuationResult(res)
    } catch (err: any) {
      setErrorMessage(err.message || 'Ad-hoc pricing failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Module 3 Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-300 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Module 3: Financial Pricing Engine</span>
              <Badge variant="success" size="sm">Operational</Badge>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Real Black-Scholes-Merton (1973), Single-Curve OIS DCF, and ISDA Hazard Rate models. All valuations compute analytical Greeks and persist immutable audit records.
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-lg border border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => {
              setPricingMode('contract')
              setErrorMessage(null)
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              pricingMode === 'contract'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Booked Contract
          </button>
          <button
            type="button"
            onClick={() => {
              setPricingMode('adhoc')
              setErrorMessage(null)
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              pricingMode === 'adhoc'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ad-Hoc / What-If
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs Panel (2 cols) vs Output Panel (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contract Selection, Locked Terms & Market Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {pricingMode === 'contract' ? (
            <Card>
              <CardHeader
                title="Authoritative Contract Valuation"
                subtitle="Select persistent contract from Module 2 registry and configure market inputs"
                tooltip="Resolves authoritative contractual terms from database without allowing client term tampering"
              />

              <div className="p-4 space-y-5 text-xs">
                {/* 1. Contract Selection */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Target OTC Contract (Module 2 Registry)
                  </label>
                  {isLoadingContracts ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                      Loading persistent contracts...
                    </div>
                  ) : (
                    <select
                      value={selectedContractId}
                      onChange={(e) => {
                        setSelectedContractId(e.target.value)
                        setErrorMessage(null)
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {contracts.map((c) => (
                        <option key={c.contract_id} value={c.contract_id}>
                          {c.contract_id} — {c.instrument_type} ({formatCurrency(c.notional, c.currency)}) [{c.counterparty}] [v{c.version}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Read-Only Contract Terms Card */}
                {selectedContract && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {selectedContract.contract_id}
                        </span>
                        <Badge variant="neutral" size="sm">v{selectedContract.version}</Badge>
                        <Badge
                          variant={selectedContract.status === 'ACTIVE' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {selectedContract.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Counterparty: <strong className="text-slate-800">{selectedContract.counterparty}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Instrument</span>
                        <span className="font-semibold text-slate-800">{selectedContract.instrument_type}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Face Notional</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatCurrency(selectedContract.notional, selectedContract.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Effective Date</span>
                        <span className="font-semibold text-slate-800 font-mono">{selectedContract.effective_date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Maturity Date</span>
                        <span className="font-semibold text-slate-800 font-mono">{selectedContract.maturity_date}</span>
                      </div>
                    </div>

                    {/* Instrument Specific Read-only details */}
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-4 text-[11px] text-slate-600">
                      {selectedContract.instrument_type === 'European Option' && (
                        <>
                          <div>Underlying: <strong className="text-slate-900 font-mono">{selectedContract.terms.underlying_asset}</strong></div>
                          <div>Type: <strong className="text-slate-900">{selectedContract.terms.option_type}</strong></div>
                          <div>Strike: <strong className="text-slate-900 font-mono">${selectedContract.terms.strike_price}</strong></div>
                          <div>Direction: <strong className="text-slate-900">{selectedContract.terms.position_direction || 'BUY'}</strong></div>
                        </>
                      )}
                      {selectedContract.instrument_type === 'Interest Rate Swap' && (
                        <>
                          <div>Fixed Coupon: <strong className="text-slate-900 font-mono">{selectedContract.terms.fixed_rate}%</strong></div>
                          <div>Index: <strong className="text-slate-900 font-mono">{selectedContract.terms.floating_index}</strong></div>
                          <div>Payer: <strong className="text-slate-900">{selectedContract.terms.fixed_leg_payer}</strong></div>
                          <div>Frequency: <strong className="text-slate-900">{selectedContract.terms.fixed_frequency}</strong></div>
                          <div>Day Count: <strong className="text-slate-900 font-mono">{selectedContract.terms.day_count_convention}</strong></div>
                        </>
                      )}
                      {selectedContract.instrument_type === 'Currency Swap' && (
                        <>
                          <div>Pay: <strong className="text-slate-900 font-mono">{selectedContract.terms.pay_currency} {selectedContract.terms.pay_notional?.toLocaleString()}</strong></div>
                          <div>Receive: <strong className="text-slate-900 font-mono">{selectedContract.terms.receive_currency} {selectedContract.terms.receive_notional?.toLocaleString()}</strong></div>
                          <div>Frequency: <strong className="text-slate-900">{selectedContract.terms.payment_frequency}</strong></div>
                        </>
                      )}
                      {selectedContract.instrument_type === 'Credit Default Swap' && (
                        <>
                          <div>Obligor: <strong className="text-slate-900">{selectedContract.terms.reference_entity}</strong></div>
                          <div>Spread: <strong className="text-slate-900 font-mono">{selectedContract.terms.spread_bps} bps</strong></div>
                          <div>Direction: <strong className="text-slate-900">{selectedContract.terms.direction}</strong></div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Model Selection */}
                <div className="pt-2">
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Quantitative Valuation Model
                  </label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {availableModels.map((m) => (
                      <option key={m.model_id} value={m.model_id}>
                        {m.name} (v{m.version})
                      </option>
                    ))}
                  </select>
                  {selectedModelId && (
                    <p className="text-[11px] text-slate-500 mt-1.5 italic">
                      {availableModels.find((m) => m.model_id === selectedModelId)?.description}
                    </p>
                  )}
                </div>

                {/* 4. Market Inputs & Scenario Overrides */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Market Inputs & Scenario Shifts
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Authoritative Market Snapshot
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">
                        Valuation Date
                      </label>
                      <input
                        type="date"
                        value={valuationDate}
                        onChange={(e) => setValuationDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {selectedContract?.instrument_type === 'European Option' && (
                      <>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">
                            Spot Price S ($)
                          </label>
                          <input
                            type="number"
                            step="1.0"
                            value={spotOverride}
                            onChange={(e) => setSpotOverride(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">
                            Implied Volatility σ (annual)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={volOverride}
                            onChange={(e) => setVolOverride(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">
                            Continuous Rate r
                          </label>
                          <input
                            type="number"
                            step="0.005"
                            value={rateOverride}
                            onChange={(e) => setRateOverride(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">
                            Dividend Yield q
                          </label>
                          <input
                            type="number"
                            step="0.005"
                            value={dividendOverride}
                            onChange={(e) => setDividendOverride(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {selectedContract?.instrument_type === 'Interest Rate Swap' && (
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">
                          Curve Parallel Shift (bps)
                        </label>
                        <input
                          type="number"
                          step="5.0"
                          value={curveShiftBps}
                          onChange={(e) => setCurveShiftBps(e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {selectedContract?.instrument_type === 'Credit Default Swap' && (
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">
                          Hazard Rate λ (annual)
                        </label>
                        <input
                          type="number"
                          step="0.005"
                          value={hazardRateOverride}
                          onChange={(e) => setHazardRateOverride(e.target.value)}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-950">Valuation Failed</p>
                      <p className="text-red-800 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Calculate Action Button */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    Valuation results are persisted to the database registry.
                  </span>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Calculator className="w-4 h-4" />}
                    loading={isCalculating}
                    disabled={isCalculating || !selectedContract}
                    onClick={handlePriceContract}
                  >
                    Execute Valuation
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Ad-Hoc Quantitative Structure Pricing"
                subtitle="Interactively evaluate what-if structures before booking"
                tooltip="Direct analytical execution without requiring an existing persistent contract"
              />

              <div className="p-4 space-y-4 text-xs">
                {/* Structure Selection */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Instrument Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['European Option', 'Interest Rate Swap'] as InstrumentType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAdhocInstrument(t)}
                        className={`p-2.5 rounded-lg border text-left font-medium cursor-pointer transition-all ${
                          adhocInstrument === t
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-semibold">{t}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {t === 'European Option' ? 'Black-Scholes-Merton (1973)' : 'Single-Curve DCF'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ad-hoc Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Notional Amount ($)</label>
                    <input
                      type="number"
                      value={adhocNotional}
                      onChange={(e) => setAdhocNotional(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {adhocInstrument === 'European Option' ? (
                    <>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Option Type</label>
                        <select
                          value={adhocOptionType}
                          onChange={(e) => setAdhocOptionType(e.target.value as 'CALL' | 'PUT')}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 bg-white text-slate-900"
                        >
                          <option value="CALL">CALL</option>
                          <option value="PUT">PUT</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Strike Price ($)</label>
                        <input
                          type="number"
                          value={adhocStrike}
                          onChange={(e) => setAdhocStrike(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Underlying Spot ($)</label>
                        <input
                          type="number"
                          value={adhocUnderlying}
                          onChange={(e) => setAdhocUnderlying(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Implied Vol (σ)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adhocVol}
                          onChange={(e) => setAdhocVol(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Risk-Free Rate (r)</label>
                        <input
                          type="number"
                          step="0.005"
                          value={adhocRate}
                          onChange={(e) => setAdhocRate(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Fixed Rate (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={adhocFixedRate}
                        onChange={(e) => setAdhocFixedRate(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Calculator className="w-4 h-4" />}
                    loading={isCalculating}
                    disabled={isCalculating}
                    onClick={handlePriceAdHoc}
                  >
                    Run Quantitative Pricing
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Valuation Output & Risk Sensitivities */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <div className="space-y-4">
              <CardHeader
                title="Valuation Output"
                subtitle="Exact theoretical present value and risk sensitivities"
              />

              {valuationResult ? (
                <div className="space-y-4 text-xs">
                  {/* Hero Present Value Card */}
                  <div className="p-4 rounded-xl bg-slate-950 text-white space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Net Present Value (PV)</span>
                      <Badge variant="success" size="sm">
                        {valuationResult.status}
                      </Badge>
                    </div>

                    <div className={`text-2xl font-bold font-mono ${
                      valuationResult.present_value >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(valuationResult.present_value, valuationResult.currency)}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                      <span>Valuation ID:</span>
                      <span className="font-mono text-blue-400 font-medium">{valuationResult.valuation_id}</span>
                    </div>
                  </div>

                  {/* Model Metadata */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Model:</span>
                      <span className="font-semibold text-slate-900">{valuationResult.model_info.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Market Ref:</span>
                      <span className="font-mono text-slate-800">{valuationResult.market_snapshot_ref}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valuation Date:</span>
                      <span className="font-mono text-slate-800">{valuationResult.valuation_date}</span>
                    </div>
                  </div>

                  {/* Greeks & Risk Sensitivities Grid */}
                  {valuationResult.greeks && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          Risk Sensitivities (Greeks)
                        </span>
                        <span className="text-[10px] text-slate-400">Analytical</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-mono">
                        {valuationResult.greeks.delta !== null && valuationResult.greeks.delta !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.delta}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">Delta (Δ)</div>
                            <div className="text-sm font-bold text-slate-900">
                              {valuationResult.greeks.delta.toFixed(4)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">dV/dS</div>
                          </div>
                        )}

                        {valuationResult.greeks.gamma !== null && valuationResult.greeks.gamma !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.gamma}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">Gamma (Γ)</div>
                            <div className="text-sm font-bold text-slate-900">
                              {valuationResult.greeks.gamma.toFixed(6)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">d²V/dS²</div>
                          </div>
                        )}

                        {valuationResult.greeks.vega_1pct !== null && valuationResult.greeks.vega_1pct !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.vega_1pct}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">Vega (1%)</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(valuationResult.greeks.vega_1pct)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">per 1% vol</div>
                          </div>
                        )}

                        {valuationResult.greeks.theta_per_day !== null && valuationResult.greeks.theta_per_day !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.theta_per_day}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">Theta (Daily)</div>
                            <div className="text-sm font-bold text-rose-600">
                              {formatCurrency(valuationResult.greeks.theta_per_day)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">per day</div>
                          </div>
                        )}

                        {valuationResult.greeks.rho_1bp !== null && valuationResult.greeks.rho_1bp !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.rho_1bp}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">Rho (1 bp)</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(valuationResult.greeks.rho_1bp)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">per 1 bp rate</div>
                          </div>
                        )}

                        {valuationResult.greeks.pv01 !== null && valuationResult.greeks.pv01 !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.pv01}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">PV01</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(valuationResult.greeks.pv01)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">per 1 bp coupon</div>
                          </div>
                        )}

                        {valuationResult.greeks.dv01 !== null && valuationResult.greeks.dv01 !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.dv01}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">DV01</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(valuationResult.greeks.dv01)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">per 1 bp curve shift</div>
                          </div>
                        )}

                        {valuationResult.greeks.cs01 !== null && valuationResult.greeks.cs01 !== undefined && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200" title={valuationResult.greeks.units?.cs01}>
                            <div className="text-[10px] text-slate-400 uppercase font-sans">CS01</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(valuationResult.greeks.cs01)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5">per 1 bp spread</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cashflow Schedule (if present) */}
                  {valuationResult.cashflows && valuationResult.cashflows.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          Cash Flow Schedule
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {valuationResult.cashflows.length} periods
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-[10px] font-mono">
                          <thead className="bg-slate-100 text-slate-600 sticky top-0">
                            <tr>
                              <th className="p-1.5 text-left">Date</th>
                              <th className="p-1.5 text-right">Fixed</th>
                              <th className="p-1.5 text-right">Float</th>
                              <th className="p-1.5 text-right">Net</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {valuationResult.cashflows.slice(0, 10).map((cf) => (
                              <tr key={cf.period} className="hover:bg-slate-50">
                                <td className="p-1.5 text-slate-700">{cf.payment_date}</td>
                                <td className="p-1.5 text-right text-slate-600">{cf.fixed_amount?.toLocaleString()}</td>
                                <td className="p-1.5 text-right text-slate-600">{cf.floating_amount?.toLocaleString()}</td>
                                <td className="p-1.5 text-right font-semibold text-slate-900">{cf.net_cashflow.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Modeling Assumptions */}
                  {valuationResult.assumptions && valuationResult.assumptions.length > 0 && (
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-1 text-[11px] text-blue-950">
                      <div className="font-semibold flex items-center gap-1 text-blue-900">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        Modeling Assumptions
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-800 text-[10px]">
                        {valuationResult.assumptions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings if any */}
                  {valuationResult.warnings && valuationResult.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1 text-[11px] text-amber-950">
                      <div className="font-semibold flex items-center gap-1 text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Operational Notices
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[10px]">
                        {valuationResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2.5">
                  <Calculator className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">No calculation run yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Select a contract or choose ad-hoc mode, configure market inputs, and click "Execute Valuation" to run analytical quant math.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Closed-Form Mathematical Engine
              </span>
              <span>Module 3 Complete</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
