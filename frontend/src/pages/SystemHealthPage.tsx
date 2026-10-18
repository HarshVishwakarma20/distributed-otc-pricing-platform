import React from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Activity, Server, Cpu, HardDrive, AlertCircle } from 'lucide-react'
import { useSystemHealth } from '../api/client'
import { formatDateTime } from '../utils/formatters'

export function SystemHealthPage() {
  const { data: healthRes } = useSystemHealth()
  const health = healthRes?.data

  const services = health?.services || []

  return (
    <div className="space-y-6">
      {/* Module 14 Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">
            Module 14 Scaffold: Monitoring & Observability (Demo Telemetry)
          </p>
          <p className="text-amber-800 leading-relaxed">
            All telemetry metrics below (worker counts, CPU/memory loads, RPC latencies) are explicitly simulated demo metrics for UI layout validation. Real OpenTelemetry collectors, Prometheus scraping, and Redis/Celery queue monitoring will be integrated in <strong>Module 14: Monitoring and Observability</strong>.
          </p>
        </div>
      </div>

      {/* Cluster Status Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Simulated Workers
            </span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {health ? `${health.active_workers} / ${health.total_workers}` : '16 / 16'}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            100% capacity available
          </p>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Queue Depth
            </span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {health ? health.queue_depth : 2} Jobs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sub-millisecond dispatch
          </p>
        </Card>

        <Card className="border-l-4 border-l-slate-700">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Simulated CPU Load
            </span>
            <Cpu className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {health ? `${health.cpu_load_pct}%` : '34.2%'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across 16 worker cores
          </p>
        </Card>

        <Card className="border-l-4 border-l-slate-700">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Simulated Memory
            </span>
            <HardDrive className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {health ? `${health.memory_load_pct}%` : '58.6%'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Curve cache allocated
          </p>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader
          title="Component & Service Health Registry"
          subtitle="Heartbeat monitors and operational states for platform sub-modules"
        />

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-3">Service Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Synthetic Latency</th>
                <th className="py-2.5 px-3">Last Heartbeat</th>
                <th className="py-2.5 px-3">Architecture Role & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {services.map((s) => (
                <tr key={s.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                    {s.name}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <Badge
                      variant={
                        s.status === 'Healthy'
                          ? 'success'
                          : s.status === 'Degraded'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                      dot
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {s.latency_ms > 0 ? `${s.latency_ms.toFixed(1)} ms` : '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">
                    {formatDateTime(s.last_heartbeat)}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600 text-[11px]">
                    {s.details}
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
