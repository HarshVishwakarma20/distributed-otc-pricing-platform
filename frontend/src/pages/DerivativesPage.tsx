import React, { useState } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge, BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import {
  useContractRegistry,
  useContractDetail,
  useContractAudit,
  useContractRevisions,
  useContractsDbHealth,
  useCreateContractMutation,
  useTransitionContractMutation,
} from '../api/client'
import {
  ContractDetailResponse,
  ContractCreateRequest,
  ContractStatus,
  InstrumentType,
  FixedPayer,
  OptionType,
  SettlementType,
  PositionDirection,
  LegRateType,
  CDSDirection,
} from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import {
  Plus,
  Filter,
  Database,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  History,
  AlertTriangle,
  FileText,
  Layers,
} from 'lucide-react'

export function DerivativesPage() {
  // Query parameters state
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Server state via TanStack Query
  const {
    data: registryRes,
    isLoading,
    isRefetching,
    refetch,
    error: registryError,
  } = useContractRegistry({
    search: search.trim() || undefined,
    instrument_type: filterType !== 'All' ? filterType : undefined,
    status: filterStatus !== 'All' ? filterStatus : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: pageSize,
  })

  const { data: dbHealthRes } = useContractsDbHealth()
  const dbHealth = dbHealthRes?.data
  const contracts = registryRes?.data?.items || []
  const totalContracts = registryRes?.data?.total || 0
  const totalPages = registryRes?.data?.total_pages || 1

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [detailsTab, setDetailsTab] = useState<'terms' | 'audit' | 'revisions'>('terms')

  // Lifecycle transition confirmation state
  const [transitionAction, setTransitionAction] = useState<
    'submit' | 'activate' | 'reject' | 'return-to-draft' | 'mature' | 'cancel' | null
  >(null)
  const [transitionActor, setTransitionActor] = useState('Risk Operator')
  const [transitionReason, setTransitionReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  // Mutations
  const createMutation = useCreateContractMutation()
  const transitionMutation = useTransitionContractMutation()

  // Selected contract query
  const { data: detailRes, isLoading: isDetailLoading } = useContractDetail(selectedContractId)
  const { data: auditRes, isLoading: isAuditLoading } = useContractAudit(selectedContractId)
  const { data: revisionsRes, isLoading: isRevisionsLoading } = useContractRevisions(selectedContractId)

  const activeContract: ContractDetailResponse | undefined = detailRes?.data

  // Status badge styling helper
  const getStatusBadgeVariant = (status: ContractStatus): BadgeVariant => {
    switch (status) {
      case 'ACTIVE':
      case 'Active':
        return 'success'
      case 'PENDING_APPROVAL':
      case 'Pending Confirmation':
        return 'warning'
      case 'DRAFT':
      case 'Draft':
        return 'neutral'
      case 'REJECTED':
      case 'CANCELLED':
      case 'Terminated':
        return 'danger'
      case 'MATURED':
      case 'Matured':
        return 'info'
      default:
        return 'neutral'
    }
  }

  // Handle Lifecycle Transition Execution
  const handleExecuteTransition = async () => {
    if (!activeContract || !transitionAction) return
    setActionError(null)

    try {
      await transitionMutation.mutateAsync({
        contractId: activeContract.contract_id,
        action: transitionAction,
        req: {
          expected_version: activeContract.version,
          actor: transitionActor.trim() || 'Risk Operator',
          reason: transitionReason.trim() || undefined,
        },
      })
      setTransitionAction(null)
      setTransitionReason('')
    } catch (err: any) {
      setActionError(err.message || 'Transition failed due to concurrency or validation rules')
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform & Persistence Mode Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">Contract Management & Registry</h2>
              <Badge
                variant={dbHealth?.healthy ? 'success' : 'warning'}
                size="sm"
                className="bg-white/10 text-white border-white/20"
                dot
              >
                {dbHealth?.healthy ? `Persistent (${dbHealth.dialect})` : 'Demo In-Memory Mode'}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Module 2: Complete persistent OTC registry, typed instrument validation, immutable audit trails & optimistic concurrency control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right hidden sm:block">
            <span className="text-slate-400 block text-[11px]">Total Contracts</span>
            <span className="font-mono font-bold text-white text-sm">{totalContracts}</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-md"
          >
            Stage New Contract
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader
          title="Derivative Contract Registry"
          subtitle="Real-time persistent OTC contract inventory, confirmation workflows, and lifecycle state"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                onClick={() => refetch()}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search ID, counterparty, ref..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Instrument Type Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value)
                  setPage(1)
                }}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              >
                <option value="All">All Instruments</option>
                <option value="Interest Rate Swap">Interest Rate Swap</option>
                <option value="European Option">European Option</option>
                <option value="Currency Swap">Currency Swap</option>
                <option value="Credit Default Swap">Credit Default Swap</option>
              </select>
            </div>

            {/* Lifecycle Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="All">All Lifecycle States</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="MATURED">MATURED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="created_at">Sort: Created Date</option>
              <option value="notional">Sort: Notional</option>
              <option value="effective_date">Sort: Effective Date</option>
              <option value="maturity_date">Sort: Maturity Date</option>
              <option value="counterparty">Sort: Counterparty</option>
            </select>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-slate-300 px-2 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold"
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>

          <div className="text-slate-500 self-center lg:self-auto">
            Showing <span className="font-semibold text-slate-900">{contracts.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalContracts}</span> contracts
          </div>
        </div>

        {/* Database Error Alert */}
        {registryError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Failed to connect to backend registry. Falling back to local demonstration state.</span>
          </div>
        )}

        {/* Contracts Registry Table */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-2.5 px-3">Contract ID</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Counterparty</th>
                <th className="py-2.5 px-3 text-right">Notional</th>
                <th className="py-2.5 px-3">Tenor (Start → Maturity)</th>
                <th className="py-2.5 px-3 text-center">Version</th>
                <th className="py-2.5 px-3">Lifecycle State</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Loading contracts from persistent store...</span>
                    </div>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No contracts matched the search and filter criteria.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.contract_id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">
                      {c.contract_id}
                      {c.external_reference && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Ref: {c.external_reference}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {c.instrument_type}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {c.counterparty}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(c.notional, c.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {formatDate(c.effective_date)} → {formatDate(c.maturity_date)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                        v{c.version}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={getStatusBadgeVariant(c.status)} size="sm" dot>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedContractId(c.contract_id)
                          setDetailsTab('terms')
                          setActionError(null)
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Contract Details, Lifecycle Actions, Revisions & Audit Modal */}
      {selectedContractId && (
        <Modal
          isOpen={!!selectedContractId}
          onClose={() => {
            setSelectedContractId(null)
            setTransitionAction(null)
            setActionError(null)
          }}
          title={activeContract ? `${activeContract.contract_id} — ${activeContract.instrument_type}` : 'Contract Inspection'}
          subtitle={`Counterparty: ${activeContract?.counterparty || '...'} | Lifecycle: ${activeContract?.status || '...'}`}
          maxWidth="xl"
        >
          {isDetailLoading || !activeContract ? (
            <div className="py-8 text-center text-slate-400">Loading contract specifications...</div>
          ) : (
            <div className="space-y-5 text-xs">
              {/* Lifecycle Transition Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(activeContract.status)} size="md" dot>
                    {activeContract.status}
                  </Badge>
                  <span className="text-slate-500 text-[11px]">
                    Version: <strong className="text-slate-900 font-mono">v{activeContract.version}</strong>
                  </span>
                  <span className="text-slate-400 text-[11px]">|</span>
                  <span className="text-slate-500 text-[11px]">
                    Updated: {formatDate(activeContract.updated_at)}
                  </span>
                </div>

                {/* State Transition Actions */}
                <div className="flex items-center gap-2">
                  {activeContract.status === 'DRAFT' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTransitionAction('submit')
                          setActionError(null)
                        }}
                      >
                        Submit for Approval
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setTransitionAction('cancel')
                          setActionError(null)
                        }}
                      >
                        Cancel Contract
                      </Button>
                    </>
                  )}

                  {activeContract.status === 'PENDING_APPROVAL' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTransitionAction('activate')
                          setActionError(null)
                        }}
                      >
                        Approve & Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setTransitionAction('reject')
                          setActionError(null)
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTransitionAction('return-to-draft')
                          setActionError(null)
                        }}
                      >
                        Return to Draft
                      </Button>
                    </>
                  )}

                  {activeContract.status === 'ACTIVE' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTransitionAction('mature')
                          setActionError(null)
                        }}
                      >
                        Mark as Matured
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setTransitionAction('cancel')
                          setActionError(null)
                        }}
                      >
                        Cancel / Terminate
                      </Button>
                    </>
                  )}

                  {activeContract.status === 'REJECTED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setTransitionAction('return-to-draft')
                        setActionError(null)
                      }}
                    >
                      Return to Draft for Revision
                    </Button>
                  )}

                  {(activeContract.status === 'MATURED' || activeContract.status === 'CANCELLED') && (
                    <span className="text-[11px] text-slate-500 italic">
                      Terminal state: Contract is final and immutable.
                    </span>
                  )}
                </div>
              </div>

              {/* Transition Dialog Confirmation Input */}
              {transitionAction && (
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-blue-950 flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                      Confirm Lifecycle Transition: <span className="uppercase text-blue-700 font-mono">{transitionAction}</span>
                    </h4>
                    <button
                      onClick={() => setTransitionAction(null)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-slate-600 text-[11px]">
                    This action will atomically increment the contract version from{' '}
                    <strong className="text-slate-900 font-mono">v{activeContract.version}</strong> to{' '}
                    <strong className="text-slate-900 font-mono">v{activeContract.version + 1}</strong> and generate an immutable audit log record.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Actor / Authorizer</label>
                      <input
                        type="text"
                        value={transitionActor}
                        onChange={(e) => setTransitionActor(e.target.value)}
                        className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Justification Reason</label>
                      <input
                        type="text"
                        value={transitionReason}
                        onChange={(e) => setTransitionReason(e.target.value)}
                        placeholder="e.g. Risk limit approved, Counterparty executed"
                        className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-xs"
                      />
                    </div>
                  </div>

                  {actionError && (
                    <div className="p-2.5 rounded bg-rose-100 text-rose-800 text-[11px] border border-rose-200">
                      {actionError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setTransitionAction(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={transitionMutation.isPending}
                      onClick={handleExecuteTransition}
                    >
                      Execute Transition
                    </Button>
                  </div>
                </div>
              )}

              {/* Detail Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setDetailsTab('terms')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    detailsTab === 'terms'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Instrument Terms
                </button>
                <button
                  onClick={() => setDetailsTab('audit')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    detailsTab === 'audit'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Audit Trail ({auditRes?.data?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab('revisions')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    detailsTab === 'revisions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Version History ({revisionsRes?.data?.length || 0})
                </button>
              </div>

              {/* Tab 1: Specific Instrument Terms */}
              {detailsTab === 'terms' && (
                <div className="space-y-4">
                  {/* General Header Properties */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Notional</span>
                      <strong className="text-slate-900">{formatCurrency(activeContract.notional, activeContract.currency)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Effective Date</span>
                      <span className="text-slate-800">{activeContract.effective_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Maturity Date</span>
                      <span className="text-slate-800">{activeContract.maturity_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Currency</span>
                      <span className="text-slate-800">{activeContract.currency}</span>
                    </div>
                  </div>

                  {/* Instrument-Specific Breakdown */}
                  <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
                    <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Detailed Specifications ({activeContract.instrument_type})
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(activeContract.terms).map(([key, value]) => (
                        <div key={key} className="p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono font-medium text-slate-800 text-xs">
                            {typeof value === 'boolean'
                              ? value ? 'Yes' : 'No'
                              : typeof value === 'object' && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Immutable Audit Trail */}
              {detailsTab === 'audit' && (
                <div className="space-y-3">
                  {isAuditLoading ? (
                    <div className="py-6 text-center text-slate-400">Loading audit history...</div>
                  ) : !auditRes?.data || auditRes.data.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">No audit events logged yet.</div>
                  ) : (
                    <div className="relative border-l border-slate-200 ml-3 space-y-4 py-2">
                      {auditRes.data.map((evt) => (
                        <div key={evt.event_id} className="relative pl-6">
                          <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {evt.event_type}
                                {evt.to_status && ` → ${evt.to_status}`}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">{formatDate(evt.timestamp)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>Actor: <strong className="text-slate-700">{evt.actor}</strong></span>
                              <span>•</span>
                              <span>Version: <strong className="font-mono text-slate-700">v{evt.version}</strong></span>
                            </div>
                            {evt.reason && (
                              <p className="text-slate-600 text-[11px] italic bg-white p-1.5 rounded border border-slate-100 mt-1">
                                "{evt.reason}"
                              </p>
                            )}
                            {evt.diff && Object.keys(evt.diff).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-600 bg-white p-2 rounded">
                                <span className="font-bold block text-slate-800 mb-1">State Mutation Diff:</span>
                                <pre className="overflow-x-auto">{JSON.stringify(evt.diff, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Revisions History */}
              {detailsTab === 'revisions' && (
                <div className="space-y-3">
                  {isRevisionsLoading ? (
                    <div className="py-6 text-center text-slate-400">Loading version snapshots...</div>
                  ) : !revisionsRes?.data || revisionsRes.data.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">No revisions captured yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {revisionsRes.data.map((rev) => (
                        <div key={rev.revision_id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800 text-xs">
                                Revision #{rev.version}
                              </span>
                              <Badge variant={getStatusBadgeVariant(rev.status)} size="sm">
                                {rev.status}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">{formatDate(rev.created_at)}</span>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            Changed By: <strong className="text-slate-900">{rev.changed_by}</strong>
                            {rev.reason && <span className="italic ml-2">({rev.reason})</span>}
                          </div>

                          <details className="text-[10px] text-slate-600 cursor-pointer">
                            <summary className="font-medium text-blue-600 hover:underline">Inspect Snapshot Payload</summary>
                            <pre className="mt-1 p-2 bg-white rounded border border-slate-200 overflow-x-auto font-mono">
                              {JSON.stringify(rev.snapshot, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Stage New OTC Contract Form Modal */}
      <StageContractModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload)
          setIsCreateModalOpen(false)
        }}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}

// ============================================================================
// Stage New Contract Multi-Instrument Form Modal
// ============================================================================

interface StageContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: ContractCreateRequest) => Promise<void>
  isLoading: boolean
}

function StageContractModal({ isOpen, onClose, onSubmit, isLoading }: StageContractModalProps) {
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('Interest Rate Swap')
  const [counterparty, setCounterparty] = useState('JPMorgan Chase NA')
  const [externalRef, setExternalRef] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // IRS State
  const [irsNotional, setIrsNotional] = useState(100000000)
  const [irsCurrency, setIrsCurrency] = useState('USD')
  const [irsEffectiveDate, setIrsEffectiveDate] = useState('2026-06-01')
  const [irsMaturityDate, setIrsMaturityDate] = useState('2031-06-01')
  const [irsFixedRate, setIrsFixedRate] = useState(3.85)
  const [irsFloatingIndex, setIrsFloatingIndex] = useState('SOFR 3M')
  const [irsFixedPayer, setIrsFixedPayer] = useState<FixedPayer>('PAY_FIXED')

  // European Option State
  const [optUnderlying, setOptUnderlying] = useState('SPX')
  const [optType, setOptType] = useState<OptionType>('CALL')
  const [optStrike, setOptStrike] = useState(5200)
  const [optPremium, setOptPremium] = useState(140)
  const [optNotional, setOptNotional] = useState(50000000)
  const [optCurrency, setOptCurrency] = useState('USD')
  const [optTradeDate, setOptTradeDate] = useState('2026-06-01')
  const [optExpirationDate, setOptExpirationDate] = useState('2027-06-01')
  const [optSettlement, setOptSettlement] = useState<SettlementType>('CASH')
  const [optDirection, setOptDirection] = useState<PositionDirection>('BUY')

  // Currency Swap State
  const [csPayCcy, setCsPayCcy] = useState('USD')
  const [csRecCcy, setCsRecCcy] = useState('EUR')
  const [csPayNotional, setCsPayNotional] = useState(100000000)
  const [csRecNotional, setCsRecNotional] = useState(92000000)
  const [csFxRate, setCsFxRate] = useState(1.087)
  const [csEffectiveDate, setCsEffectiveDate] = useState('2026-06-01')
  const [csMaturityDate, setCsMaturityDate] = useState('2031-06-01')
  const [csPayRateType, setCsPayRateType] = useState<LegRateType>('FIXED')
  const [csRecRateType, setCsRecRateType] = useState<LegRateType>('FLOATING')
  const [csPayFixedRate, setCsPayFixedRate] = useState(4.25)
  const [csRecFloatIndex, setCsRecFloatIndex] = useState('EURIBOR 6M')

  // CDS State
  const [cdsReferenceEntity, setCdsReferenceEntity] = useState('Ford Motor Credit Co LLC')
  const [cdsDirection, setCdsDirection] = useState<CDSDirection>('BUY_PROTECTION')
  const [cdsNotional, setCdsNotional] = useState(25000000)
  const [cdsSpreadBps, setCdsSpreadBps] = useState(145.0)
  const [cdsCurrency, setCdsCurrency] = useState('USD')
  const [cdsEffectiveDate, setCdsEffectiveDate] = useState('2026-06-20')
  const [cdsMaturityDate, setCdsMaturityDate] = useState('2031-06-20')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!counterparty.trim()) {
      setFormError('Counterparty legal entity name is required.')
      return
    }

    try {
      let payload: ContractCreateRequest

      if (instrumentType === 'Interest Rate Swap') {
        if (new Date(irsMaturityDate) <= new Date(irsEffectiveDate)) {
          throw new Error('Maturity date must be strictly after the effective date.')
        }
        if (irsNotional <= 0) throw new Error('Notional must be greater than zero.')

        payload = {
          instrument_type: 'Interest Rate Swap',
          counterparty: counterparty.trim(),
          external_reference: externalRef.trim() || undefined,
          irs_terms: {
            notional: irsNotional,
            currency: irsCurrency,
            effective_date: irsEffectiveDate,
            maturity_date: irsMaturityDate,
            fixed_rate: irsFixedRate,
            floating_index: irsFloatingIndex,
            fixed_leg_payer: irsFixedPayer,
            fixed_frequency: 'SEMI_ANNUAL',
            floating_frequency: 'QUARTERLY',
            day_count_convention: 'ACT_360',
            business_day_convention: 'MODIFIED_FOLLOWING',
            settlement_calendar: 'US_NY',
          },
        }
      } else if (instrumentType === 'European Option') {
        if (new Date(optExpirationDate) < new Date(optTradeDate)) {
          throw new Error('Expiration date cannot be prior to trade date.')
        }
        if (optStrike <= 0 || optNotional <= 0) throw new Error('Strike and notional must be greater than zero.')

        payload = {
          instrument_type: 'European Option',
          counterparty: counterparty.trim(),
          external_reference: externalRef.trim() || undefined,
          option_terms: {
            underlying_asset: optUnderlying.trim(),
            option_type: optType,
            exercise_style: 'EUROPEAN',
            strike_price: optStrike,
            premium: optPremium,
            notional: optNotional,
            currency: optCurrency,
            trade_date: optTradeDate,
            expiration_date: optExpirationDate,
            settlement_type: optSettlement,
            position_direction: optDirection,
          },
        }
      } else if (instrumentType === 'Currency Swap') {
        if (csPayCcy.toUpperCase() === csRecCcy.toUpperCase()) {
          throw new Error('Pay Currency and Receive Currency must be distinct for a Currency Swap.')
        }
        if (new Date(csMaturityDate) <= new Date(csEffectiveDate)) {
          throw new Error('Maturity date must be strictly after effective date.')
        }

        payload = {
          instrument_type: 'Currency Swap',
          counterparty: counterparty.trim(),
          external_reference: externalRef.trim() || undefined,
          currency_swap_terms: {
            pay_currency: csPayCcy,
            receive_currency: csRecCcy,
            pay_notional: csPayNotional,
            receive_notional: csRecNotional,
            fx_exchange_rate: csFxRate,
            effective_date: csEffectiveDate,
            maturity_date: csMaturityDate,
            pay_leg_rate_type: csPayRateType,
            receive_leg_rate_type: csRecRateType,
            pay_fixed_rate: csPayFixedRate,
            receive_floating_index: csRecFloatIndex,
            payment_frequency: 'SEMI_ANNUAL',
            principal_exchange: 'INITIAL_AND_FINAL',
            day_count_convention: 'ACT_360',
          },
        }
      } else if (instrumentType === 'Credit Default Swap') {
        if (new Date(cdsMaturityDate) <= new Date(cdsEffectiveDate)) {
          throw new Error('Maturity date must be strictly after effective date.')
        }
        if (cdsSpreadBps <= 0) throw new Error('Spread in basis points must be positive.')

        payload = {
          instrument_type: 'Credit Default Swap',
          counterparty: counterparty.trim(),
          external_reference: externalRef.trim() || undefined,
          cds_terms: {
            reference_entity: cdsReferenceEntity.trim(),
            direction: cdsDirection,
            notional: cdsNotional,
            spread_bps: cdsSpreadBps,
            currency: cdsCurrency,
            effective_date: cdsEffectiveDate,
            maturity_date: cdsMaturityDate,
            premium_frequency: 'QUARTERLY',
            day_count_convention: 'ACT_360',
            restructuring_clause: 'CR',
          },
        }
      } else {
        throw new Error(`Unsupported instrument type: ${instrumentType}`)
      }

      await onSubmit(payload)
    } catch (err: any) {
      setFormError(err.message || 'Validation error while staging contract')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stage New OTC Derivative Contract"
      subtitle="Creates a validated contract in DRAFT state with initial audit trail (v1)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Top Header Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Instrument Type</label>
            <select
              value={instrumentType}
              onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
            >
              <option value="Interest Rate Swap">Interest Rate Swap (IRS)</option>
              <option value="European Option">European Option</option>
              <option value="Currency Swap">Cross-Currency Swap</option>
              <option value="Credit Default Swap">Credit Default Swap (CDS)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Counterparty Entity</label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="e.g. JPMorgan Chase Bank NA"
              className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">External Booking Ref (Optional)</label>
            <input
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="e.g. EXT-2026-BOOK-01"
              className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs font-mono"
            />
          </div>
        </div>

        {/* IRS Dynamic Fields */}
        {instrumentType === 'Interest Rate Swap' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs">Interest Rate Swap Terms (Fixed vs Floating)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Notional Amount</label>
                <input
                  type="number"
                  value={irsNotional}
                  onChange={(e) => setIrsNotional(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Currency</label>
                <select
                  value={irsCurrency}
                  onChange={(e) => setIrsCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={irsEffectiveDate}
                  onChange={(e) => setIrsEffectiveDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Maturity Date</label>
                <input
                  type="date"
                  value={irsMaturityDate}
                  onChange={(e) => setIrsMaturityDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Fixed Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={irsFixedRate}
                  onChange={(e) => setIrsFixedRate(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Floating Index</label>
                <input
                  type="text"
                  value={irsFloatingIndex}
                  onChange={(e) => setIrsFloatingIndex(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Fixed Leg Direction</label>
                <select
                  value={irsFixedPayer}
                  onChange={(e) => setIrsFixedPayer(e.target.value as FixedPayer)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="PAY_FIXED">Pay Fixed / Rec Float</option>
                  <option value="RECEIVE_FIXED">Rec Fixed / Pay Float</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* European Option Dynamic Fields */}
        {instrumentType === 'European Option' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs">European Option Terms</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Underlying Asset</label>
                <input
                  type="text"
                  value={optUnderlying}
                  onChange={(e) => setOptUnderlying(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Option Type</label>
                <select
                  value={optType}
                  onChange={(e) => setOptType(e.target.value as OptionType)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs font-semibold"
                >
                  <option value="CALL">CALL</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Strike Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={optStrike}
                  onChange={(e) => setOptStrike(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Trade Premium</label>
                <input
                  type="number"
                  step="0.01"
                  value={optPremium}
                  onChange={(e) => setOptPremium(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Contract Notional</label>
                <input
                  type="number"
                  value={optNotional}
                  onChange={(e) => setOptNotional(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Trade Date</label>
                <input
                  type="date"
                  value={optTradeDate}
                  onChange={(e) => setOptTradeDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={optExpirationDate}
                  onChange={(e) => setOptExpirationDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Direction</label>
                <select
                  value={optDirection}
                  onChange={(e) => setOptDirection(e.target.value as PositionDirection)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="BUY">BUY (Long)</option>
                  <option value="SELL">SELL (Short)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Currency</label>
                <select
                  value={optCurrency}
                  onChange={(e) => setOptCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Settlement Type</label>
                <select
                  value={optSettlement}
                  onChange={(e) => setOptSettlement(e.target.value as SettlementType)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="CASH">CASH</option>
                  <option value="PHYSICAL">PHYSICAL</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Currency Swap Dynamic Fields */}
        {instrumentType === 'Currency Swap' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs">Cross-Currency Swap Terms</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Pay Currency</label>
                <input
                  type="text"
                  maxLength={3}
                  value={csPayCcy}
                  onChange={(e) => setCsPayCcy(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono uppercase bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Receive Currency</label>
                <input
                  type="text"
                  maxLength={3}
                  value={csRecCcy}
                  onChange={(e) => setCsRecCcy(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono uppercase bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Pay Notional</label>
                <input
                  type="number"
                  value={csPayNotional}
                  onChange={(e) => setCsPayNotional(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Receive Notional</label>
                <input
                  type="number"
                  value={csRecNotional}
                  onChange={(e) => setCsRecNotional(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Initial FX Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={csFxRate}
                  onChange={(e) => setCsFxRate(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={csEffectiveDate}
                  onChange={(e) => setCsEffectiveDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Maturity Date</label>
                <input
                  type="date"
                  value={csMaturityDate}
                  onChange={(e) => setCsMaturityDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Pay Fixed Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={csPayFixedRate}
                  onChange={(e) => setCsPayFixedRate(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Pay Leg Rate Type</label>
                <select
                  value={csPayRateType}
                  onChange={(e) => setCsPayRateType(e.target.value as LegRateType)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="FIXED">FIXED</option>
                  <option value="FLOATING">FLOATING</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Rec Leg Rate Type</label>
                <select
                  value={csRecRateType}
                  onChange={(e) => setCsRecRateType(e.target.value as LegRateType)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="FLOATING">FLOATING</option>
                  <option value="FIXED">FIXED</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Rec Floating Benchmark</label>
                <input
                  type="text"
                  value={csRecFloatIndex}
                  onChange={(e) => setCsRecFloatIndex(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* CDS Dynamic Fields */}
        {instrumentType === 'Credit Default Swap' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs">Credit Default Swap (CDS) Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Reference Entity</label>
                <input
                  type="text"
                  value={cdsReferenceEntity}
                  onChange={(e) => setCdsReferenceEntity(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Protection Direction</label>
                <select
                  value={cdsDirection}
                  onChange={(e) => setCdsDirection(e.target.value as CDSDirection)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs font-semibold"
                >
                  <option value="BUY_PROTECTION">Buy Protection (Long Credit Risk)</option>
                  <option value="SELL_PROTECTION">Sell Protection (Short Credit Risk)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Face Notional</label>
                <input
                  type="number"
                  value={cdsNotional}
                  onChange={(e) => setCdsNotional(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Spread (Basis Points)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cdsSpreadBps}
                  onChange={(e) => setCdsSpreadBps(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded p-1.5 font-mono bg-white text-xs"
                  required
                />
                <span className="text-[10px] text-slate-400">100 bps = 1.00%</span>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Currency</label>
                <select
                  value={cdsCurrency}
                  onChange={(e) => setCdsCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={cdsEffectiveDate}
                  onChange={(e) => setCdsEffectiveDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Maturity Date</label>
                <input
                  type="date"
                  value={cdsMaturityDate}
                  onChange={(e) => setCdsMaturityDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 italic">
            Contract will be staged in <strong className="text-slate-800">DRAFT</strong> state with initial revision (v1).
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
              Confirm & Stage Contract
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
