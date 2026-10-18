import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { useDashboardSummary } from '../../api/client'

export function AppLayout() {
  const { data } = useDashboardSummary()
  const isLive = data?.isLive ?? false
  const timestamp = data?.data?.kpi?.valuation_timestamp ?? '2026-10-14T18:00:00Z'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader isLiveApi={isLive} snapshotTimestamp={timestamp} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
