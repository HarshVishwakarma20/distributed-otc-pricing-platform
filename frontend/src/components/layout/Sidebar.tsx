import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  Calculator,
  ShieldAlert,
  Cpu,
  Briefcase,
  TrendingUp,
  History,
  FileText,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  name: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  moduleTag: string
  isCore: boolean
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: LayoutDashboard, moduleTag: 'M1', isCore: true },
  { name: 'Derivatives', path: '/derivatives', icon: FileText, moduleTag: 'M2', isCore: false },
  { name: 'Pricing Workbench', path: '/pricing', icon: Calculator, moduleTag: 'M3', isCore: false },
  { name: 'Risk Analytics', path: '/risk', icon: ShieldAlert, moduleTag: 'M5', isCore: false },
  { name: 'Monte Carlo Lab', path: '/monte-carlo', icon: Cpu, moduleTag: 'M6', isCore: false },
  { name: 'Portfolios', path: '/portfolios', icon: Briefcase, moduleTag: 'M10', isCore: false },
  { name: 'Market Data', path: '/market-data', icon: TrendingUp, moduleTag: 'M4', isCore: false },
  { name: 'Valuation History', path: '/valuation-history', icon: History, moduleTag: 'M12', isCore: false },
  { name: 'Reports', path: '/reports', icon: FileSpreadsheet, moduleTag: 'M13', isCore: false },
  { name: 'System Health', path: '/system-health', icon: Activity, moduleTag: 'M14', isCore: false },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col shrink-0 min-h-screen text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30 font-bold text-lg tracking-wider">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-slate-100 text-base tracking-tight">DerivaQuant</h1>
            <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v0.1
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium tracking-tight">
            OTC Pricing & Risk Engine
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          Analytics & Trading
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-blue-400" />
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    item.isCore
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title={`Module ${item.moduleTag}`}
                >
                  {item.moduleTag}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </NavLink>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-[#070b16] text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>Active Architecture</span>
          <span className="text-slate-300 font-mono">Module 1 Foundation</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Backend Link</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            FastAPI / Proxy
          </span>
        </div>
        <div className="pt-2 text-[10px] text-slate-300 border-t border-slate-800/60 leading-tight">
          Educational & Quantitative Research Platform. Synthetic mock data mode.
        </div>
      </div>
    </aside>
  )
}
