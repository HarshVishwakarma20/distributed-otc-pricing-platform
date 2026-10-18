import React from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { History } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export function ValuationHistoryPage() {
  const historyRuns = [
    {
      batchId: 'BATCH-2026-10-14-EOD',
      date: '2026-10-14 17:45 UTC',
      trigger: 'Automated EOD Close',
      contractsValued: 84,
      totalNotional: 1425000000.0,
      netMTM: 48320500.0,
      modelHash: 'sha256:7f3b89a1c...',
      status: 'Verified',
    },
    {
      batchId: 'BATCH-2026-10-13-EOD',
      date: '2026-10-13 17:45 UTC',
      trigger: 'Automated EOD Close',
      contractsValued: 83,
      totalNotional: 1375000000.0,
      netMTM: 47678200.0,
      modelHash: 'sha256:4b219e88d...',
      status: 'Verified',
    },
    {
      batchId: 'BATCH-2026-10-12-EOD',
      date: '2026-10-12 17:45 UTC',
      trigger: 'Automated EOD Close',
      contractsValued: 83,
      totalNotional: 1375000000.0,
      netMTM: 47588200.0,
      modelHash: 'sha256:4b219e88d...',
      status: 'Verified',
    },
    {
      batchId: 'BATCH-2026-10-11-INTRADAY',
      date: '2026-10-11 12:30 UTC',
      trigger: 'Ad-hoc Rates Shock Test',
      contractsValued: 42,
      totalNotional: 820000000.0,
      netMTM: 27850000.0,
      modelHash: 'sha256:3a180cf21...',
      status: 'Archived',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Module 12 Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-xs text-blue-900">
        <History className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Module 12 Scaffold: Valuation History & Audit Trail
          </p>
          <p className="text-blue-800 leading-relaxed">
            Immutable snapshot recording, regulatory audit provenance, temporal point-in-time diffing, and cryptographic validation hashes will be implemented in <strong>Module 12: Valuation History & Audit Trail</strong>.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Historical Valuation Runs & Audit Batches"
          subtitle="Chronological register of executed valuation batches and immutable snapshot hashes"
        />

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold font-sans bg-slate-50/50">
                <th className="py-2.5 px-3">Batch Run ID</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Trigger Type</th>
                <th className="py-2.5 px-3 text-center">Positions</th>
                <th className="py-2.5 px-3 text-right">Aggregate Notional</th>
                <th className="py-2.5 px-3 text-right">Net MTM</th>
                <th className="py-2.5 px-3">Model Hash</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyRuns.map((h) => (
                <tr key={h.batchId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-blue-600">
                    {h.batchId}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-sans">
                    {h.date}
                  </td>
                  <td className="py-3 px-3 text-slate-800 font-sans font-medium">
                    {h.trigger}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">
                    {h.contractsValued}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-800">
                    {formatCurrency(h.totalNotional, 'USD', true)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600">
                    {formatCurrency(h.netMTM)}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-[120px]">
                    {h.modelHash}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <Badge variant="success" size="sm" dot>
                      {h.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <Button
                      variant="outline"
                      size="sm"
                      disabledReason="Run comparison diffing requires Module 12"
                    >
                      Compare
                    </Button>
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
