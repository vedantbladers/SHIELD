import { useState } from 'react'
import { Activity, ChevronLeft, ChevronRight, Filter, Clock, BadgeCheck, Shield, Scale } from 'lucide-react'
import { useModeratorActions } from '@/lib/hooks/use-api'

interface ModAction {
  id: string
  moderator_alias: string
  action_type: string
  target_type: string
  target_id: string
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  moderator: {
    alias: string
    role: string
  } | null
}

interface ActionsResponse {
  items: ModAction[]
  total: number
  page: number
  pages: number
}

const ACTION_TYPE_CONFIG: Record<string, { color: string; icon: typeof BadgeCheck }> = {
  CERT_APPROVED: { color: 'bg-emerald-500/20 text-emerald-400', icon: BadgeCheck },
  CERT_REJECTED: { color: 'bg-red-500/20 text-red-400', icon: BadgeCheck },
  USER_TRUST_ADJUSTED: { color: 'bg-amber-500/20 text-amber-400', icon: Shield },
  DISPUTE_RESOLVED: { color: 'bg-blue-500/20 text-blue-400', icon: Scale },
}

export default function ModeratorActionsPage() {
  const [actionType, setActionType] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: responseData, isLoading } = useModeratorActions({
    page,
    action_type: actionType,
  })

  const data = responseData?.data as ActionsResponse | undefined

  const actionTypes = [
    { label: 'All', value: '' },
    { label: 'Cert Approved', value: 'CERT_APPROVED' },
    { label: 'Cert Rejected', value: 'CERT_REJECTED' },
    { label: 'Trust Adjusted', value: 'USER_TRUST_ADJUSTED' },
    { label: 'Dispute Resolved', value: 'DISPUTE_RESOLVED' },
  ]

  const getConfig = (type: string) => {
    return ACTION_TYPE_CONFIG[type] || { color: 'bg-slate-500/20 text-slate-400', icon: Activity }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-7 h-7 text-amber-400" />
          Moderator Actions
        </h1>
        <p className="text-slate-400 mt-1">History of all moderator interventions</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-4 h-4 text-slate-500" />
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 flex-wrap">
          {actionTypes.map(t => (
            <button
              key={t.value}
              onClick={() => { setActionType(t.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                actionType === t.value
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">
          {data ? `${data.total} actions` : '—'}
        </span>
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))
        ) : data?.items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No moderator actions found</p>
          </div>
        ) : (
          data?.items.map(action => {
            const config = getConfig(action.action_type)
            const IconComp = config.icon
            return (
              <div key={action.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-200/50 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                        {action.action_type}
                      </span>
                      <span className="text-xs text-slate-500">
                        on {action.target_type}
                      </span>
                    </div>
                    {action.reason && (
                      <p className="text-sm text-slate-300 mt-1 truncate">{action.reason}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        by <span className="text-amber-400 font-mono">{action.moderator_alias}</span>
                      </span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(action.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Target ID */}
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {action.target_id.slice(0, 12)}...
                  </span>
                </button>

                {/* Expanded metadata */}
                {expandedId === action.id && (
                  <div className="border-t border-slate-200/30 px-5 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-slate-500">Target Type</span>
                        <p className="text-sm text-white font-mono mt-0.5">{action.target_type}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Target ID</span>
                        <p className="text-sm text-white font-mono mt-0.5 break-all">{action.target_id}</p>
                      </div>
                    </div>
                    {action.reason && (
                      <div className="mb-3">
                        <span className="text-xs text-slate-500">Reason</span>
                        <p className="text-sm text-slate-300 mt-0.5">{action.reason}</p>
                      </div>
                    )}
                    {action.metadata && (
                      <div>
                        <span className="text-xs text-slate-500">Metadata</span>
                        <pre className="text-xs text-slate-400 bg-white rounded-lg p-3 overflow-x-auto font-mono mt-1">
                          {JSON.stringify(action.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {data.page} of {data.pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
