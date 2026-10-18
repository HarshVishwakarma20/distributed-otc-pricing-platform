import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PortfolioExposure } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface ExposureChartProps {
  data: PortfolioExposure[]
}

const COLORS = ['#2563eb', '#0284c7', '#0d9488', '#4f46e5']

export function ExposureChart({ data }: ExposureChartProps) {
  const [viewMode, setViewMode] = useState<'notional' | 'market_value'>('notional')

  return (
    <div className="w-full space-y-4">
      {/* Metric Mode Toggle */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Showing:{' '}
          <span className="font-semibold text-slate-800">
            {viewMode === 'notional'
              ? 'Gross Notional Exposure'
              : 'Mark-to-Market Net Value'}
          </span>
        </span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('notional')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              viewMode === 'notional'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Notional
          </button>
          <button
            onClick={() => setViewMode('market_value')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              viewMode === 'market_value'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Market Value
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="#e2e8f0"
            />
            <XAxis
              type="number"
              tickFormatter={(val) => formatCurrency(val, 'USD', true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="instrument_type"
              tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={130}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as PortfolioExposure
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-200">
                        {item.instrument_type}
                      </div>
                      <div className="text-slate-300">
                        Notional: <span className="font-bold text-white">{formatCurrency(item.notional)}</span>
                      </div>
                      <div className="text-slate-300">
                        Market Value: <span className="font-bold text-blue-400">{formatCurrency(item.market_value)}</span>
                      </div>
                      <div className="text-slate-300">
                        Delta Equivalent: {formatCurrency(item.delta_equivalent)}
                      </div>
                      <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800 flex justify-between">
                        <span>Contracts: {item.contract_count}</span>
                        <span>Share: {item.percentage_of_total}%</span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey={viewMode}
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
        {data.map((item, idx) => (
          <div key={item.instrument_type} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-slate-600 truncate">{item.instrument_type}</span>
            <span className="font-semibold text-slate-900 ml-auto">
              {item.percentage_of_total}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
