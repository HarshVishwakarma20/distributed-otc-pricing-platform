import React from 'react'
import { AlertCircle, Database, CheckCircle2, RefreshCw } from 'lucide-react'

interface DemoBadgeProps {
  isLiveApi?: boolean
  timestamp?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DemoBadge({
  isLiveApi = false,
  timestamp,
  onRefresh,
  isRefreshing = false,
}: DemoBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Synthetic Data Mode Flag */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-900 font-medium">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="tracking-tight">SYNTHETIC DEMO DATA</span>
      </div>

      {/* Backend API Connection Status */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium ${
          isLiveApi
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900'
            : 'bg-slate-200/60 border-slate-300 text-slate-700'
        }`}
        title={
          isLiveApi
            ? 'Connected to FastAPI Backend (/api/v1)'
            : 'Backend offline; running with typed synthetic client fallback'
        }
      >
        {isLiveApi ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>FastAPI: Online</span>
          </>
        ) : (
          <>
            <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Standalone Client Fallback</span>
          </>
        )}
      </div>

      {/* Snapshot Timestamp */}
      {timestamp && (
        <span className="text-slate-500 hidden sm:inline-block">
          Snapshot: <span className="font-mono text-slate-700">{timestamp}</span>
        </span>
      )}

      {/* Refresh demo data button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-xs"
          title="Refresh synthetic dataset snapshots"
        >
          <RefreshCw
            className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
          />
          <span>Refresh</span>
        </button>
      )}
    </div>
  )
}
