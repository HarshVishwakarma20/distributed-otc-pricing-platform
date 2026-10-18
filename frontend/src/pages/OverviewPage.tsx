import React, { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  FileText,
  ShieldAlert,
  Cpu,
  BarChart3,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ValueHistoryChart } from '../components/charts/ValueHistoryChart'
import { ExposureChart } from '../components/charts/ExposureChart'
import {
  useDashboardSummary,
  useDashboardExposure,
  useRecentValuations,
  useRecentActivity,
  useSimulationJobs,
} from '../api/client'
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDateTime,
} from '../utils/formatters'
import type { ValuationSummary } from '../types'

export function OverviewPage() {
  const { data: summaryRes } = useDashboardSummary()
  const { data: exposureRes } = useDashboardExposure()
  const { data: valuationsRes } = useRecentValuations(10)
  const { data: activityRes } = useRecentActivity(6)
  const { data: jobsRes } = useSimulationJobs()

  const [valuationSearch, setValuationSearch] = useState('')
  const [selectedInstrument, setSelectedInstrument] = useState<string>('All')

  const kpi = summaryRes?.data.kpi
  const history = summaryRes?.data.value_history || []
  const exposures = exposureRes?.data || []
  const valuations = valuationsRes?.data || []
  const activities = activityRes?.data || []
  const jobs = jobsRes?.data || []

  // Filtered valuations
  const filteredValuations = valuations.filter((v: ValuationSummary) => {
    const matchesSearch =
      v.valuation_id.toLowerCase().includes(valuationSearch.toLowerCase()) ||
      v.contract_id.toLowerCase().includes(valuationSearch.toLowerCase()) ||
      v.instrument.toLowerCase().includes(valuationSearch.toLowerCase())
    const matchesInstrument =
      selectedInstrument === 'All' || v.instrument === selectedInstrument
    return matchesSearch && matchesInstrument
  })

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Notional */}
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              title="Aggregate face amount across all OTC derivative contracts"
            >
              Total Notional
            </span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {kpi ? formatCurrency(kpi.total_notional, 'USD', true) : '$1.43B'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Gross principal reference
          </p>
        </Card>

        {/* Portfolio Market Value */}
        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              title="Summed net present value of all active positions"
            >
              Market Value (MTM)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {kpi ? formatCurrency(kpi.total_market_value, 'USD', true) : '$48.32M'}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            Dual-curve discounted
          </p>
        </Card>

        {/* Active Contracts */}
        <Card className="border-l-4 border-l-slate-700">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              title="Count of currently active, unmatured derivative commitments"
            >
              Active Contracts
            </span>
            <FileText className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {kpi ? formatNumber(kpi.active_contracts) : '84'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across 4 core asset classes
          </p>
        </Card>

        {/* Daily P&L */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              title="Simulated single-day mark-to-market movement"
            >
              Daily P&L
            </span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 tracking-tight flex items-center gap-1">
            {kpi ? `+${formatCurrency(kpi.daily_pnl, 'USD', true)}` : '+$642.3K'}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {kpi ? formatPercent(kpi.daily_pnl_pct) : '+1.35%'} vs prior close
          </p>
        </Card>

        {/* Portfolio VaR 95% */}
        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              title="Simulated 1-day 95% Parametric Value at Risk (illustrative synthetic estimate)"
            >
              VaR 95% (1-Day)
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {kpi ? formatCurrency(kpi.simulated_var_95_1d, 'USD', true) : '$2.85M'}
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">
            *Simulated illustrative
          </p>
        </Card>

        {/* Active Simulation Jobs */}
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              title="Simulated active Monte Carlo pricing and stress jobs"
            >
              Simulation Jobs
            </span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{kpi ? kpi.active_simulation_jobs : 3}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            16 synthetic worker slots
          </p>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical Value & P&L Chart */}
        <Card>
          <CardHeader
            title="Portfolio Value & P&L Trajectory"
            subtitle="Historical simulated mark-to-market progression and daily returns"
            tooltip="Synthetic 30-day geometric walk capturing daily yield curve shifts and option time decay"
          />
          <ValueHistoryChart data={history} />
        </Card>

        {/* Portfolio Exposure Breakdown Chart */}
        <Card>
          <CardHeader
            title="Instrument Exposure & Allocation"
            subtitle="Gross notional vs net mark-to-market across derivative families"
            tooltip="Comparison of contract notional commitments against current net dual-curve valuations"
          />
          <ExposureChart data={exposures} />
        </Card>
      </div>

      {/* Tables & Panels Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Valuations Table (2 columns wide on xl) */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              title="Recent Contract Valuations"
              subtitle="Latest mark-to-market runs, pricing engines, and PV01 sensitivities"
              tooltip="Real-time simulated valuations reflecting dual-curve discounting and Black-76/Heston engines"
              action={
                <div className="flex items-center gap-2">
                  <select
                    value={selectedInstrument}
                    onChange={(e) => setSelectedInstrument(e.target.value)}
                    className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Instruments</option>
                    <option value="Interest Rate Swap">IRS</option>
                    <option value="European Option">Options</option>
                    <option value="Currency Swap">Currency Swaps</option>
                    <option value="Credit Default Swap">CDS</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search valuations..."
                    value={valuationSearch}
                    onChange={(e) => setValuationSearch(e.target.value)}
                    className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-700 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              }
            />

            {/* Valuations Table */}
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Valuation ID</th>
                    <th className="py-2.5 px-3">Contract ID</th>
                    <th className="py-2.5 px-3">Instrument</th>
                    <th className="py-2.5 px-3 text-right">Market Value (USD)</th>
                    <th className="py-2.5 px-3 text-right">PV01 ($/bp)</th>
                    <th className="py-2.5 px-3">Pricing Model</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredValuations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-slate-400 font-sans"
                      >
                        No matching valuations found in synthetic dataset.
                      </td>
                    </tr>
                  ) : (
                    filteredValuations.map((v) => (
                      <tr
                        key={v.valuation_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-blue-600">
                          {v.valuation_id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {v.contract_id}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-800">
                          {v.instrument}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            v.market_value >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(v.market_value)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {v.pv01 >= 0 ? `+${v.pv01.toFixed(1)}` : v.pv01.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px] truncate max-w-[160px]">
                          {v.model_used}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <Badge
                            variant={
                              v.status === 'Completed'
                                ? 'success'
                                : v.status === 'In Progress'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                            dot
                          >
                            {v.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {filteredValuations.length} of {valuations.length} valuations
              </span>
              <span className="font-mono text-[11px]">
                Deterministic Provider: Seed #42
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Activity Feed & Simulation Jobs */}
        <div className="space-y-6">
          {/* Active Simulation Jobs Panel */}
          <Card>
            <CardHeader
              title="Simulation Engine (Module 6 & 7)"
              subtitle="Distributed Monte Carlo worker jobs"
              tooltip="Simulated cluster dispatch queue for stochastic path evaluation"
            />
            <div className="space-y-3.5">
              {jobs.map((job) => (
                <div
                  key={job.job_id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      <span>{job.job_id}</span>
                      <span className="text-[11px] font-normal text-slate-500 truncate max-w-[130px]">
                        ({job.simulation_type})
                      </span>
                    </div>
                    <Badge
                      variant={
                        job.status === 'Running'
                          ? 'warning'
                          : job.status === 'Completed'
                          ? 'success'
                          : 'neutral'
                      }
                      size="sm"
                      dot
                    >
                      {job.status}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{formatNumber(job.paths)} paths</span>
                      <span className="font-mono">{job.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader
              title="Audit & Activity Log"
              subtitle="Simulated platform and risk engine events"
              tooltip="Institutional audit event logging for regulatory compliance and operational trace"
            />
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.event_id}
                  className="flex items-start gap-2.5 text-xs pb-2.5 border-b border-slate-100 last:border-b-0 last:pb-0"
                >
                  <div className="mt-0.5 shrink-0">
                    {act.severity === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : act.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">{act.title}</p>
                    <p className="text-slate-500 text-[11px] leading-tight">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
