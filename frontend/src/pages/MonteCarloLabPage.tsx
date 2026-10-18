import React, { useState } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Cpu, Play, CheckCircle2, BarChart2 } from 'lucide-react'
import { formatNumber } from '../utils/formatters'

export function MonteCarloLabPage() {
  const [model, setModel] = useState('Heston Stochastic Volatility')
  const [paths, setPaths] = useState(500000)
  const [steps, setSteps] = useState(252)
  const [seed, setSeed] = useState(42)
  const [varianceReduction, setVarianceReduction] = useState('Antithetic Variates + Sobol')

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasCompleted, setHasCompleted] = useState(false)

  const handleRunSimulation = () => {
    setIsRunning(true)
    setProgress(0)
    setHasCompleted(false)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsRunning(false)
          setHasCompleted(true)
          return 100
        }
        return prev + 20
      })
    }, 200)
  }

  return (
    <div className="space-y-6">
      {/* Module 6 Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-xs text-blue-900">
        <Cpu className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Module 6 & 7 Scaffold: Monte Carlo & Distributed Computing
          </p>
          <p className="text-blue-800 leading-relaxed">
            Multi-threaded path generation, MPI cluster load-balancing, and GPU/SIMD accelerated stochastic simulations will be implemented in <strong>Module 6: Monte Carlo Engine</strong> and <strong>Module 7: Parallel Computing</strong>. Below is the simulation parameter workbench.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Configuration (2 cols) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Simulation Parameters & RNG Configuration"
              subtitle="Configure stochastic process, path count, and discretization steps"
            />

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Stochastic Model Process
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option>Heston Stochastic Volatility</option>
                    <option>Monte Carlo (Black-Scholes 76)</option>
                    <option>Hull-White (2-Factor Short Rate)</option>
                    <option>Vasicek Mean-Reverting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Simulation Paths (N)
                  </label>
                  <select
                    value={paths}
                    onChange={(e) => setPaths(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    <option value={100000}>100,000 paths (Fast)</option>
                    <option value={250000}>250,000 paths (Balanced)</option>
                    <option value={500000}>500,000 paths (High Precision)</option>
                    <option value={1000000}>1,000,000 paths (Production Institutional)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Time Discretization Steps (M)
                  </label>
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    e.g. 252 trading days / year
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Deterministic Random Seed
                  </label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Seed guarantees identical reproducible paths
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-slate-700 font-semibold mb-1">
                  Variance Reduction Technique
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    'Antithetic Variates + Sobol',
                    'Control Variates (Black-Scholes)',
                    'Standard Pseudo-Random (Mersenne Twister)',
                  ].map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => setVarianceReduction(tech)}
                      className={`p-2 rounded border text-left cursor-pointer transition-all ${
                        varianceReduction === tech
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar (when running) */}
              {isRunning && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs text-blue-900 font-semibold">
                    <span>Dispatching paths across simulated worker slots...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Total points: <span className="font-mono font-semibold">{formatNumber(paths * steps)}</span> evaluations
                </div>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Play className="w-3.5 h-3.5" />}
                  loading={isRunning}
                  onClick={handleRunSimulation}
                >
                  Dispatch Simulation Run (Demo)
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Results Preview (1 col) */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader
                title="Simulation Diagnostics"
                subtitle="Convergence & confidence bounds"
              />

              {hasCompleted ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Simulated Run Complete</p>
                      <p className="text-[11px] text-emerald-700">
                        {formatNumber(paths)} paths evaluated in 0.82 seconds (synthetic simulation).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">Mean Option Price:</span>
                      <span className="font-bold text-slate-900">$1,420,350.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">Standard Error (SE):</span>
                      <span>± $1,840.25 (0.13%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">95% Confidence Interval:</span>
                      <span>[$1,416,743 - $1,423,957]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">Synthetic Seed:</span>
                      <span>{seed}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <BarChart2 className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-medium text-slate-600">Awaiting simulation trigger</p>
                  <p className="text-[11px]">
                    Click "Dispatch Simulation Run (Demo)" to run the interactive progress demonstration.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
              <span>Module 6: Monte Carlo Engine</span>
              <span>Synthetic Scaffold</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
