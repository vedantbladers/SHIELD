import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { ClipboardList, Shield, DollarSign, Clock, Check } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  withdrawn: 'bg-slate-500/20 text-slate-400',
}

export default function BuyerProposals() {
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['buyer-proposals'],
    queryFn: async () => {
      const res = await api.get('/api/cmp/buyer/proposals') as any
      return res.data || []
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-cyan-400" /> Proposals Received
        </h1>
        <p className="text-slate-400 mt-1">Review proposals from verified vendors</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-32 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : proposals?.length > 0 ? (
        <div className="space-y-4">
          {proposals.map((prop: any) => (
            <div key={prop._id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-cyan-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold mb-1">{prop.requirement_title || 'Untitled Requirement'}</h3>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-cyan-400 font-mono text-sm">
                      <Shield className="w-3.5 h-3.5" /> {prop.vendor_alias}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[prop.status]}`}>
                      {prop.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    {prop.proposed_price?.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {prop.proposed_timeline_weeks} weeks
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{prop.cover_note}</p>

              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Methodology</p>
                <p className="text-sm text-slate-300 line-clamp-2">{prop.methodology}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{new Date(prop.created_at).toLocaleDateString()}</span>
                {prop.status === 'pending' && (
                  <div className="flex gap-2">
                    <Link to={`/dashboard/buyer/requirements/${prop.requirement_id}`}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                      <Check className="w-3 h-3" /> Review
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white/30 rounded-xl border border-slate-200">
          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No proposals yet</h3>
          <p className="text-slate-400 mb-4">Post a requirement to start receiving proposals from certified vendors.</p>
          <Link to="/dashboard/buyer/post-requirement"
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium">
            Post a Requirement
          </Link>
        </div>
      )}
    </div>
  )
}
