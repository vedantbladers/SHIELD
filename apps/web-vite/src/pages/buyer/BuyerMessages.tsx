import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { MessageSquare, Shield, Lock } from 'lucide-react'

export default function BuyerMessages() {
  const { data: deals, isLoading } = useQuery({
    queryKey: ['buyer-deals-messages'],
    queryFn: async () => {
      const res = await api.get('/api/cmp/deals/list?role=buyer') as any
      return (res.data || []).filter((d: any) => !['CANCELLED'].includes(d.status))
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-cyan-400" /> Messages
        </h1>
        <p className="text-slate-400 mt-1">End-to-end encrypted conversations with vendors</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ minHeight: "500px" }}>
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 border-b border-slate-200/30 flex items-center gap-3 px-5">
                <div className="w-10 h-10 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-1/3" />
                  <div className="h-3 bg-slate-700/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : deals?.length > 0 ? (
          <div className="divide-y divide-slate-700/30">
            {deals.map((deal: any) => (
              <Link key={deal.id} to={`/deal/${deal.id}/chat`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition-colors">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {deal.vendor_alias?.charAt(0)?.toUpperCase()}{deal.vendor_alias?.split("-")[1]?.charAt(0)?.toUpperCase() || ""}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white font-mono truncate">{deal.vendor_alias}</span>
                    <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    Deal #{deal.id.slice(0, 8)} · {deal.status}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${deal.status === 'IN_PROGRESS' ? 'bg-purple-500/20 text-purple-400'
                      : deal.status === 'REVIEW' ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>{deal.status}</span>
                  <span className="text-[10px] text-slate-500 mt-1">{new Date(deal.updated_at || deal.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No conversations yet</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Accept a vendor proposal to start an encrypted conversation.
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-xs text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              256-bit TweetNaCl encryption active
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
