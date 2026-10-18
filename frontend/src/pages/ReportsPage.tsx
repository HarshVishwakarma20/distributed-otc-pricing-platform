import React, { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react'
import { useRecentValuations } from '../api/client'

export function ReportsPage() {
  const { data: valuationsRes } = useRecentValuations(50)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const handleExportCSV = () => {
    // Generate browser-side download of synthetic CSV data
    const valuations = valuationsRes?.data || []
    const headers = [
      'Valuation ID',
      'Contract ID',
      'Instrument Type',
      'Valuation Timestamp (UTC)',
      'Market Value (USD)',
      'Currency',
      'Pricing Model',
      'Status',
      'PV01',
      'DV01',
    ]

    const rows = valuations.map((v) => [
      v.valuation_id,
      v.contract_id,
      `"${v.instrument}"`,
      v.valuation_timestamp,
      v.market_value.toFixed(2),
      v.currency,
      `"${v.model_used}"`,
      v.status,
      v.pv01.toFixed(2),
      v.dv01.toFixed(2),
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `derivaquant_valuations_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setDownloadSuccess(true)
    setTimeout(() => setDownloadSuccess(false), 4000)
  }

  const reportCards = [
    {
      title: 'EOD Mark-to-Market Valuation Ledger',
      description: 'Comprehensive audit trail of mark-to-market prices, discount factors, and dual-curve discounting models for all active contracts.',
      format: 'CSV (Ready) / PDF / Parquet',
      isReady: true,
    },
    {
      title: 'Counterparty Credit Netting & Collateral Schedule',
      description: 'Gross and net counterparty exposure calculations under ISDA master netting agreements and CSA threshold monitoring.',
      format: 'PDF / Excel',
      isReady: false,
    },
    {
      title: 'Regulatory Market Risk & Basel III Capital Report',
      description: '1-day 99% and 10-day 99% VaR, Stressed VaR (SVaR), and Incremental Risk Charge (IRC) calculations for supervisory compliance.',
      format: 'XBRL / CSV',
      isReady: false,
    },
    {
      title: 'Projected Cash Flow & Floating Index Fixing Calendar',
      description: 'Projected forward floating rate resets (SOFR, Euribor) and coupon exchange cash flow timings over next 4 quarters.',
      format: 'Excel / CSV',
      isReady: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Module 13 Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-xs text-blue-900">
        <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Module 13 Scaffold: Reports & Financial Export
          </p>
          <p className="text-blue-800 leading-relaxed">
            Automated PDF fact-sheet rendering, regulatory Basel reports, and scheduled email dispatch will be implemented in <strong>Module 13: Reporting and Export</strong>. The CSV valuation export below is fully functional today using synthetic platform data.
          </p>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            CSV Export successfully downloaded! Contains synthetic valuation records and sensitivity figures.
          </span>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((report) => (
          <Card key={report.title} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={report.isReady ? 'success' : 'neutral'} size="sm">
                  {report.isReady ? 'Available Now' : 'Module 13 Planned'}
                </Badge>
                <span className="text-[11px] text-slate-400 font-mono">
                  {report.format}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1.5">
                {report.title}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {report.description}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {report.isReady ? 'Deterministic Snapshot' : 'Scaffold'}
              </span>
              {report.isReady ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportCSV}
                >
                  Export CSV Dataset
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabledReason="This report generator is scheduled for Module 13"
                >
                  Generate (Module 13)
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
