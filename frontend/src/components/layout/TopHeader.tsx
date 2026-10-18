import React from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DemoBadge } from './DemoBadge'
import { formatDateTime } from '../../utils/formatters'

interface TopHeaderProps {
  isLiveApi?: boolean
  snapshotTimestamp?: string
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Overview Dashboard',
    subtitle: 'Institutional portfolio mark-to-market and risk analytics overview',
  },
  '/derivatives': {
    title: 'Derivatives Contracts',
    subtitle: 'OTC contract repository and master agreement tracking (Module 2)',
  },
  '/pricing': {
    title: 'Pricing Workbench',
    subtitle: 'Instrument parameterization and valuation preview (Module 3)',
  },
  '/risk': {
    title: 'Risk Analytics & Greeks',
    subtitle: 'Portfolio sensitivities, scenario analysis, and stress testing (Module 5)',
  },
  '/monte-carlo': {
    title: 'Monte Carlo Simulation Lab',
    subtitle: 'Stochastic path generators and distributed simulation dispatcher (Module 6)',
  },
  '/portfolios': {
    title: 'Portfolio Books',
    subtitle: 'Trading book partitions, exposure limits, and aggregation (Module 10)',
  },
  '/market-data': {
    title: 'Market Data & Curves',
    subtitle: 'Discount yield curves, FX spot rates, and volatility surfaces (Module 4)',
  },
  '/valuation-history': {
    title: 'Valuation History & Audit',
    subtitle: 'Historical batch runs, EOD snapshots, and audit trail (Module 12)',
  },
  '/reports': {
    title: 'Reports & Export',
    subtitle: 'Financial valuation exports and compliance reports (Module 13)',
  },
  '/system-health': {
    title: 'System Health & Workers',
    subtitle: 'Distributed compute worker slots, latency, and telemetry (Module 14)',
  },
}

export function TopHeader({
  isLiveApi = false,
  snapshotTimestamp = '2026-10-14T18:00:00Z',
}: TopHeaderProps) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const meta = pageTitles[location.pathname] || {
    title: 'DerivaQuant Terminal',
    subtitle: 'OTC Derivatives Pricing Platform',
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {meta.title}
          </h2>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-medium text-slate-500">
            DerivaQuant Platform
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <DemoBadge
          isLiveApi={isLiveApi}
          timestamp={formatDateTime(snapshotTimestamp)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </header>
  )
}
