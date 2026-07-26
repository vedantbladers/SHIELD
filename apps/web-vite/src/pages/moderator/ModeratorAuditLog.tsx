import { useState } from 'react'
import { ScrollText, Search, ChevronLeft, ChevronRight, Filter, Clock } from 'lucide-react'
import { useModeratorAuditLog } from '@/lib/hooks/use-api'

interface AuditEntry {
  id: string
  actor_alias: string
  action_type: string
  deal_id: string | null
  target_alias: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor: {
    alias: string
    role: string
  } | null
}

interface AuditResponse {
  items: AuditEntry[]
  total: number
  page: number
  pages: number
}

const ACTION_COLORS: Record<string, string> = {
  cert_approved: 'bg-emerald-500/20 text-emerald-400',
  cert_rejected: 'bg-red-500/20 text-red-400',
  trust_adjustment: 'bg-amber-500/20 text-amber-400',
  dispute_resolved: 'bg-blue-500/20 text-blue-400',
  deal_created: 'bg-cyan-500/20 text-cyan-400',
  deal_accepted: 'bg-purple-500/20 text-purple-400',
}

export default function ModeratorAuditLogPage() {
  const [actionType, setActionType] = useState('')
  const [actorAlias, setActorAlias] = useState('')
  const [actorInput, setActorInput] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: responseData, isLoading } = useModeratorAuditLog({
    page,
    action_type: actionType,
    actor_alias: actorAlias,
  })

  const data = responseData?.data as AuditResponse | undefined

  const handleActorSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActorAlias(actorInput)
    setPage(1)
  }

  const actionTypes = [
    { label: 'All', value: '' },
    { label: 'Cert Approved', value: 'cert_approved' },
    { label: 'Cert Rejected', value: 'cert_rejected' },
    { label: 'Trust Adjust', value: 'trust_adjustment' },
    { label: 'Dispute Resolved', value: 'dispute_resolved' },
  ]

  const getActionColor = (type: string) => {
    return ACTION_COLORS[type] || 'bg-slate-500/20 text-slate-400'
  }

  const roleColor = (role: string) => {
    if (role === 'moderator') return 'text-amber-400'
    if (role === 'vendor') return 'text-purple-400'
    if (role === 'buyer') return 'text-cyan-400'
    return 'text-slate-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScrollText className="w-7 h-7 text-amber-400" />
          Audit Log
        </h1>
        <p className="text-slate-400 mt-1">Complete platform activity trail</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Action type filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            {actionTypes.map(t => (
              <button
                key={t.value}
                onClick={() => { setActionType(t.value); setPage(1) }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  actionType === t.value
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actor search */}
        <form onSubmit={handleActorSearch} className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={actorInput}
              onChange={e => setActorInput(e.target.value)}
              placeholder="Filter by actor alias..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </form>

        <span className="text-xs text-slate-500 ml-auto">
          {data ? `${data.total} entries` : '—'}
        </span>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No audit log entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {data?.items.map(entry => (
              <div key={entry.id} className="hover:bg-slate-700/10 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left"
                >
                  {/* Timeline dot */}
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-slate-500 w-36 shrink-0 font-mono">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>

                  {/* Action badge */}
                  <span className={`px-2.5 py-0.5 rounded text-xs font-medium shrink-0 ${getActionColor(entry.action_type)}`}>
                    {entry.action_type}
                  </span>

                  {/* Actor */}
                  <span className="text-sm text-slate-300">
                    by <span className={`font-mono font-medium ${entry.actor ? roleColor(entry.actor.role) : 'text-slate-400'}`}>
                      {entry.actor_alias}
                    </span>
                  </span>

                  {/* Target */}
                  {entry.target_alias && (
                    <span className="text-xs text-slate-500">
                      → <span className="font-mono text-slate-300">{entry.target_alias}</span>
                    </span>
                  )}

                  {entry.deal_id && (
                    <span className="text-xs text-slate-500">
                      Deal: <span className="font-mono text-slate-400">{entry.deal_id.slice(0, 8)}...</span>
                    </span>
                  )}
                </button>

                {/* Expanded metadata */}
                {expandedId === entry.id && entry.metadata && (
                  <div className="px-5 pb-4">
                    <pre className="text-xs text-slate-400 bg-white rounded-lg p-3 overflow-x-auto font-mono">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
