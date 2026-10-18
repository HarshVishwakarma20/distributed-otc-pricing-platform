import React from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatPercent } from '../utils/formatters'

export function RiskAnalyticsPage() {
  const greeks = [
    { name: 'Delta (Δ)', value: '$48,500,000', unit: 'USD Equivalent', change: '+2.4%', positive: true, tooltip: 'Sensitivity of portfolio value to underlying price movements' },
    { name: 'Gamma (Γ)', value: '$124,300', unit: 'USD / $1 Move', change: '-0.8%', positive: false, tooltip: 'Rate of change of portfolio Delta' },
    { name: 'Vega (ν)', value: '$385,200', unit: 'USD / 1% Vol', change: '+5.1%', positive: true, tooltip: 'Sensitivity of option portfolio to implied volatility changes' },
    { name: 'Theta (θ)', value: '-$42,800', unit: 'USD / Calendar Day', change: '-1.2%', positive: false, tooltip: 'Daily portfolio time decay' },
    { name: 'Rho (ρ)', value: '$2,150,000', unit: 'USD / 100 bps Rate', change: '+0.5%', positive: true, tooltip: 'Sensitivity of portfolio to benchmark interest rates' },
    { name: 'DV01', value: '$14,250', unit: 'USD / 1 bp Yield Shift', change: '+1.1%', positive: true, tooltip: 'Dollar Value of an 01 (basis point yield change)' },
  ]

  const scenarios = [
    { name: 'Yield Curve -100 bps Shift', ratesChange: '-100 bps', volChange: '0%', pnlImpact: -1425000, pnlPct: -2.95, varImpact: '+$450K' },
    { name: 'Yield Curve -50 bps Shift', ratesChange: '-50 bps', volChange: '0%', pnlImpact: -712500, pnlPct: -1.47, varImpact: '+$210K' },
    { name: 'Base Market Snapshot', ratesChange: '0 bps', volChange: '0%', pnlImpact: 0, pnlPct: 0.0, varImpact: '$2.85M' },
    { name: 'Yield Curve +50 bps Shift', ratesChange: '+50 bps', volChange: '0%', pnlImpact: 712500, pnlPct: 1.47, varImpact: '-$180K' },
    { name: 'Yield Curve +100 bps Shift', ratesChange: '+100 bps', volChange: '0%', pnlImpact: 1425000, pnlPct: 2.95, varImpact: '-$340K' },
    { name: 'Vol Spike Shock (+10 pts)', ratesChange: '0 bps', volChange: '+10.0%', pnlImpact: 3852000, pnlPct: 7.97, varImpact: '+$1.2M' },
  ]

  return (
    <div className="space-y-6">
      {/* Module 5 Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-xs text-blue-900">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Module 5 Scaffold: Risk Analytics & Greeks Engine
          </p>
          <p className="text-blue-800 leading-relaxed">
            Analytical Greeks, algorithmic bump-and-revalue sensitivity engines, historical simulation VaR, expected shortfall (CVaR), and regulatory stress testing will be calculated in <strong>Module 5: Risk Analytics</strong>. Current figures are deterministic synthetic metrics.
          </p>
        </div>
      </div>

      {/* Greeks Cards Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Portfolio First & Second Order Greeks (Synthetic Baseline)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {greeks.map((g) => (
            <Card key={g.name} className="border-t-2 border-t-blue-600">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" title={g.tooltip}>
                {g.name}
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                {g.value}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{g.unit}</p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">1D Shift:</span>
                <span className={`font-semibold flex items-center ${g.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {g.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {g.change}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Scenario Analysis Matrix */}
      <Card>
        <CardHeader
          title="Yield Curve & Volatility Scenario Shifts"
          subtitle="Simulated P&L impacts across interest rate and volatility stress scenarios"
          tooltip="Parametric sensitivity revaluation across parallel curve shifts"
        />

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold font-sans bg-slate-50/50">
                <th className="py-2.5 px-3">Scenario Name</th>
                <th className="py-2.5 px-3">Yield Shift</th>
                <th className="py-2.5 px-3">Vol Shift</th>
                <th className="py-2.5 px-3 text-right">P&L Impact (USD)</th>
                <th className="py-2.5 px-3 text-right">% of Portfolio</th>
                <th className="py-2.5 px-3 text-right">Simulated VaR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scenarios.map((s) => (
                <tr key={s.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                    {s.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{s.ratesChange}</td>
                  <td className="py-2.5 px-3 text-slate-600">{s.volChange}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      s.pnlImpact > 0
                        ? 'text-emerald-600'
                        : s.pnlImpact < 0
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {s.pnlImpact > 0 ? '+' : ''}
                    {formatCurrency(s.pnlImpact)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-semibold ${
                      s.pnlPct > 0
                        ? 'text-emerald-600'
                        : s.pnlPct < 0
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatPercent(s.pnlPct)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 font-semibold">
                    {s.varImpact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
