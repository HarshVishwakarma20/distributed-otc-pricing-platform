import React from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TrendingUp, UploadCloud, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react'
import { useMarketRates, useFXRates } from '../api/client'
import { formatPercent } from '../utils/formatters'

export function MarketDataPage() {
  const { data: ratesRes } = useMarketRates()
  const { data: fxRes } = useFXRates()

  const rates = ratesRes?.data || []
  const fxRates = fxRes?.data || []

  return (
    <div className="space-y-6">
      {/* Module 4 Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-xs text-blue-900">
        <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Module 4 Scaffold: Market Data & Curves
          </p>
          <p className="text-blue-800 leading-relaxed">
            Live Bloomberg/Refinitiv connectors, dual-curve bootstrapping (SOFR OIS vs Euribor/Libor), SABR volatility surface interpolators, and automated curve stripping will be implemented in <strong>Module 4: Market Data and Curves</strong>. Current rates represent a static synthetic benchmark snapshot.
          </p>
        </div>
      </div>

      {/* FX Rates Ticker Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-slate-500" />
          Benchmark FX Spot Rates (EOD Snapshot)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fxRates.map((fx) => (
            <Card key={fx.pair} className="border-t-2 border-t-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                <span>{fx.pair}</span>
                <span className={`text-[11px] font-bold flex items-center ${fx.change_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fx.change_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(fx.change_pct)}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                {fx.spot_rate.toFixed(4)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                24h Net: {fx.change_24h > 0 ? '+' : ''}{fx.change_24h.toFixed(4)}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOFR Yield Curve (2 cols) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="US SOFR Benchmark Yield Curve"
              subtitle="Zero discount rates and par yields across key tenor pillars"
              tooltip="Dual-curve discounting term structure used for interest rate swap mark-to-market"
            />

            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold font-sans bg-slate-50/50">
                    <th className="py-2.5 px-3">Tenor Pillar</th>
                    <th className="py-2.5 px-3 text-right">Zero Rate (%)</th>
                    <th className="py-2.5 px-3 text-right">Par Yield (%)</th>
                    <th className="py-2.5 px-3 text-right">Discount Factor (DF)</th>
                    <th className="py-2.5 px-3">Interpolation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rates.map((r) => (
                    <tr key={r.tenor} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-blue-600">
                        {r.tenor}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {r.zero_rate.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {r.par_yield.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {r.discount_factor.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[11px] text-slate-500">
                        Log-linear on DF
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Market Data Import Preview (1 col) */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader
                title="Market Feed Ingestion"
                subtitle="Historical rate curves & tick feed imports"
              />

              <div className="space-y-4 text-xs">
                {/* Upload Scaffold */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-800">
                    Drop CSV / Parquet curve files
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Supports ISDA standard curve files and Reuters/Bloomberg CSV dumps
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabledReason="Live feed upload will be connected in Module 4"
                  >
                    Select File (Module 4)
                  </Button>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-slate-600">
                  <div className="font-semibold text-slate-800">
                    Ingestion Pipeline Status
                  </div>
                  <div className="flex justify-between">
                    <span>Active Feed:</span>
                    <span className="font-mono text-slate-800">Synthetic Fixture (Static)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validation Engine:</span>
                    <span className="text-emerald-600 font-medium">Arbitrage Free Checks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pillar Count:</span>
                    <span className="font-mono">8 Tenors (1M to 30Y)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
              <span>Module 4: Market Data</span>
              <span>Scaffold Ready</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
