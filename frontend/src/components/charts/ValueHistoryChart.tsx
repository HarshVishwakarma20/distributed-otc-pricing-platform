import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ValueHistoryPoint } from '../../types'
import { formatCurrency, formatDate } from '../../utils/formatters'

interface ValueHistoryChartProps {
  data: ValueHistoryPoint[]
}

export function ValueHistoryChart({ data }: ValueHistoryChartProps) {
  const [range, setRange] = useState<number>(30)
  const [metric, setMetric] = useState<'market_value' | 'cumulative_pnl'>('market_value')

  const filteredData = data.slice(-range)

  return (
    <div className="w-full space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Metric Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setMetric('market_value')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              metric === 'market_value'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mark-to-Market Value
          </button>
          <button
            onClick={() => setMetric('cumulative_pnl')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              metric === 'cumulative_pnl'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cumulative P&L
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setRange(days)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                range === days
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => formatDate(val)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val, 'USD', true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              width={65}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ValueHistoryPoint
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-slate-300">
                        {formatDate(String(label || ''))}
                      </div>
                      <div className="text-sm font-bold text-white">
                        MTM: {formatCurrency(pt.market_value)}
                      </div>
                      <div
                        className={`font-medium ${
                          pt.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        Daily P&L: {pt.daily_pnl >= 0 ? '+' : ''}
                        {formatCurrency(pt.daily_pnl)}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Cum. P&L: {formatCurrency(pt.cumulative_pnl)}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={metric === 'market_value' ? '#2563eb' : '#059669'}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${metric === 'market_value' ? 'valueGradient' : 'pnlGradient'})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-400 text-right">
        *Illustrative synthetic valuation trajectory. Not real financial performance.
      </p>
    </div>
  )
}
