import { useState } from 'react'
import { Scale, Clock, CheckCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { useModeratorDisputes, useResolveDispute } from '@/lib/hooks/use-api'

interface DealEvent {
  id: string
  event_type: string
  from_status: string | null
  to_status: string | null
  actor_alias: string
  note: string | null
  created_at: string
}

interface Dispute {
  id: string
  requirement_id: string | null
  buyer_alias: string
  vendor_alias: string | null
  status: string
  amount: number | null
  title: string | null
  created_at: string
  updated_at: string
  buyer: { alias: string; trust_score: number }
  vendor: { alias: string; trust_score: number } | null
  deal_events: DealEvent[]
}

interface DisputesResponse {
  items: Dispute[]
  total: number
  page: number
  pages: number
}

export default function ModeratorDisputesPage() {
  const [statusFilter, setStatusFilter] = useState('DISPUTED')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Resolve form
  const [resolution, setResolution] = useState('mutual')
  const [reason, setReason] = useState('')
  const [buyerAdj, setBuyerAdj] = useState(0)
  const [vendorAdj, setVendorAdj] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const { data: responseData, isLoading } = useModeratorDisputes({
    status: statusFilter,
    page,
    limit: 20,
  })

  const data = responseData?.data as DisputesResponse | undefined
  const resolveMutation = useResolveDispute()

  const handleResolve = async (dealId: string) => {
    if (!reason.trim()) return
    setIsSubmitting(true)
    setFeedback(null)
    try {
      await resolveMutation.mutateAsync({
        dealId,
        body: {
          resolution,
          reason: reason.trim(),
          buyer_trust_adjustment: buyerAdj,
          vendor_trust_adjustment: vendorAdj,
        }
      })
      setFeedback({ type: 'success', msg: `Dispute resolved: ${resolution}` })
      setExpanded(null)
      setResolution('mutual')
      setReason('')
      setBuyerAdj(0)
      setVendorAdj(0)
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err || 'Failed to resolve dispute' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusTabs = [
    { label: 'Disputed', value: 'DISPUTED', icon: AlertTriangle },
    { label: 'Resolved', value: 'RESOLVED', icon: CheckCircle },
    { label: 'All', value: 'all', icon: Scale },
  ]

  const trustColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Scale className="w-7 h-7 text-amber-400" />
          Dispute Resolution
        </h1>
        <p className="text-slate-400 mt-1">Review and resolve disputed deals</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {feedback.msg}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-4">
        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); setExpanded(null) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">
          {data ? `${data.total} disputes` : '—'}
        </span>
      </div>

      {/* Dispute cards */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))
        ) : data?.items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No {statusFilter.toLowerCase()} disputes found</p>
          </div>
        ) : (
          data?.items.map(dispute => (
            <div key={dispute.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpanded(expanded === dispute.id ? null : dispute.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-700/20 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${
                  dispute.status === 'DISPUTED' ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {dispute.title || `Deal ${dispute.id.slice(0, 8)}...`}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-400">
                      Buyer: <span className="text-cyan-400 font-mono">{dispute.buyer.alias}</span>
                      <span className={`ml-1 ${trustColor(dispute.buyer.trust_score)}`}>({dispute.buyer.trust_score})</span>
                    </span>
                    {dispute.vendor && (
                      <span className="text-xs text-slate-400">
                        Vendor: <span className="text-purple-400 font-mono">{dispute.vendor.alias}</span>
                        <span className={`ml-1 ${trustColor(dispute.vendor.trust_score)}`}>({dispute.vendor.trust_score})</span>
                      </span>
                    )}
                    {dispute.amount && (
                      <span className="text-xs text-slate-400">
                        Amount: <span className="text-white font-medium">${dispute.amount}</span>
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                  dispute.status === 'DISPUTED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {dispute.status}
                </span>
                <span className="text-xs text-slate-500">{new Date(dispute.updated_at).toLocaleDateString()}</span>
                {expanded === dispute.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Expanded detail */}
              {expanded === dispute.id && (
                <div className="border-t border-slate-200 px-5 py-5">
                  {/* Event timeline */}
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Events</h4>
                  {dispute.deal_events.length > 0 ? (
                    <div className="space-y-2 mb-5">
                      {dispute.deal_events.map(evt => (
                        <div key={evt.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white">
                          <Clock className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-mono text-amber-400">{evt.event_type}</span>
                            {evt.note && <p className="text-xs text-slate-400 mt-0.5">{evt.note}</p>}
                          </div>
                          <span className="text-xs text-slate-500 shrink-0">
                            {new Date(evt.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mb-5">No events recorded</p>
                  )}

                  {/* Resolve form — only for DISPUTED status */}
                  {dispute.status === 'DISPUTED' && (
                    <div className="border-t border-slate-200/30 pt-5">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resolve Dispute</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Resolution type */}
                        <div>
                          <label className="text-xs text-slate-400 mb-2 block">Resolution</label>
                          <div className="flex gap-2">
                            {['buyer_favor', 'vendor_favor', 'mutual'].map(r => (
                              <button
                                key={r}
                                onClick={() => setResolution(r)}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                  resolution === r
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                    : 'bg-white border-slate-200 text-slate-400 hover:text-white'
                                }`}
                              >
                                {r === 'buyer_favor' ? 'Buyer Favor' : r === 'vendor_favor' ? 'Vendor Favor' : 'Mutual'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Trust adjustments */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400 mb-2 block">
                              Buyer Trust: <span className={`font-bold ${buyerAdj > 0 ? 'text-emerald-400' : buyerAdj < 0 ? 'text-red-400' : ''}`}>{buyerAdj > 0 ? '+' : ''}{buyerAdj}</span>
                            </label>
                            <input
                              type="range" min={-20} max={20} step={1} value={buyerAdj}
                              onChange={e => setBuyerAdj(Number(e.target.value))}
                              className="w-full accent-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-2 block">
                              Vendor Trust: <span className={`font-bold ${vendorAdj > 0 ? 'text-emerald-400' : vendorAdj < 0 ? 'text-red-400' : ''}`}>{vendorAdj > 0 ? '+' : ''}{vendorAdj}</span>
                            </label>
                            <input
                              type="range" min={-20} max={20} step={1} value={vendorAdj}
                              onChange={e => setVendorAdj(Number(e.target.value))}
                              className="w-full accent-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="mt-4">
                        <label className="text-xs text-slate-400 mb-2 block">Reason *</label>
                        <textarea
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Explain the resolution..."
                          rows={3}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                      </div>

                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => handleResolve(dispute.id)}
                          disabled={isSubmitting || !reason.trim()}
                          className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Resolving...' : 'Resolve Dispute'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
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
