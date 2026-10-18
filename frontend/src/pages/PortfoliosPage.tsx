import React from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Briefcase } from 'lucide-react'
import { usePortfolios } from '../api/client'
import { formatCurrency } from '../utils/formatters'

export function PortfoliosPage() {
  const { data: portfoliosRes } = usePortfolios()
  const portfolios = portfoliosRes?.data || []

  const totalNotional = portfolios.reduce((acc, p) => acc + p.total_notional, 0)
  const totalMTM = portfolios.reduce((acc, p) => acc + p.market_value, 0)

  return (
    <div className="space-y-6">
      {/* Module 10 Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-xs text-blue-900">
        <Briefcase className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Module 10 Scaffold: Portfolio Analytics & Aggregation
          </p>
          <p className="text-blue-800 leading-relaxed">
            Multi-tier book aggregation, margin requirement calculations (SIMM), counterparty limit monitoring, and portfolio-level risk attribution will be introduced in <strong>Module 10: Portfolio Analytics</strong>.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Trading Desks
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {portfolios.length} Books
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Partitioned sub-portfolios</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Aggregate Book Notional
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalNotional, 'USD', true)}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-0.5">
            Active bilateral commitments
          </p>
        </Card>

        <Card className="border-l-4 border-l-slate-700">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Net Mark-to-Market
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(totalMTM, 'USD', true)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Dual-curve present value</p>
        </Card>
      </div>

      {/* Books Table */}
      <Card>
        <CardHeader
          title="Portfolio Book Breakdown"
          subtitle="Desk allocations, active contract counts, and risk profiles"
        />

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-3">Book ID</th>
                <th className="py-2.5 px-3">Portfolio Name</th>
                <th className="py-2.5 px-3 text-right">Total Notional</th>
                <th className="py-2.5 px-3 text-right">Net MTM</th>
                <th className="py-2.5 px-3 text-center">Active Contracts</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Base Ccy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {portfolios.map((p) => (
                <tr key={p.portfolio_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-blue-600">
                    {p.portfolio_id}
                  </td>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                    {p.name}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-800">
                    {formatCurrency(p.total_notional, p.base_currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600">
                    {formatCurrency(p.market_value, p.base_currency)}
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                      {p.contracts_count}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <Badge
                      variant={
                        p.risk_level === 'High'
                          ? 'danger'
                          : p.risk_level === 'Moderate-High' || p.risk_level === 'Moderate'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                      dot
                    >
                      {p.risk_level}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-sans">
                    {p.base_currency}
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
