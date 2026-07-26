import { useBuyerRequirementDetail, useCreateDeal } from '@/lib/hooks/use-api'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Shield, Clock, DollarSign, ArrowLeft, Check, X, Pencil } from 'lucide-react'
import { StarRating } from '@/components/shared/StarRating'

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  withdrawn: 'bg-slate-500/20 text-slate-400',
}

export default function BuyerRequirementDetail() {
  const { id } = useParams() as { id: string }
  const navigate = useNavigate()
  const { data, isLoading } = useBuyerRequirementDetail(id) as { data: any; isLoading: boolean }
  const createDeal = useCreateDeal()

  const handleAccept = async (proposalId: string) => {
    if (!confirm('Accept this proposal? All other pending proposals will be rejected.')) return
    try {
      const result: any = await createDeal.mutateAsync({ proposal_id: proposalId })
      navigate(`/dashboard/buyer/deals/${result.deal_id}`)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-white rounded w-1/3" />
      <div className="h-48 bg-white rounded-xl" />
    </div>
  }

  const req = data?.requirement
  if (!req) return <p className="text-slate-400">Requirement not found.</p>

  return (
    <div className="space-y-6">
      <Link to="/dashboard/buyer/requirements" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400">
        <ArrowLeft className="w-4 h-4" /> Back to Requirements
      </Link>

      {/* Requirement Detail */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">{req.title}</h1>
          {req.status === 'open' && (
            <Link to={`/dashboard/buyer/requirements/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors">
              <Pencil className="w-4 h-4" /> Edit
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium">{req.status}</span>
          <span className="px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full text-xs">{req.engagement_type}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${req.urgency === 'critical' ? 'bg-red-500/20 text-red-400' : req.urgency === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
            {req.urgency} urgency
          </span>
        </div>
        <p className="text-slate-300 whitespace-pre-wrap mb-6">{req.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <DollarSign className="w-4 h-4 text-emerald-400 mb-1" />
            <p className="text-xs text-slate-500">Budget Range</p>
            <p className="text-white font-medium">${req.budget_range?.min?.toLocaleString()} – ${req.budget_range?.max?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <Clock className="w-4 h-4 text-blue-400 mb-1" />
            <p className="text-xs text-slate-500">Timeline</p>
            <p className="text-white font-medium">{req.timeline_weeks} weeks</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Service Types</p>
            <div className="flex flex-wrap gap-1">{req.service_type?.map((t: string) => (
              <span key={t} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">{t}</span>
            ))}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Compliance</p>
            <div className="flex flex-wrap gap-1">{req.compliance_needs?.length > 0
              ? req.compliance_needs.map((c: string) => <span key={c} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{c}</span>)
              : <span className="text-slate-500 text-xs">None specified</span>
            }</div>
          </div>
        </div>
      </div>

      {/* Proposals */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Proposals ({data?.proposals?.length || 0})
        </h2>
        {data?.proposals?.length > 0 ? (
          <div className="space-y-4">
            {data.proposals.map((prop: any) => (
              <div key={prop._id} className="bg-white border border-slate-200/30 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <span className="font-mono text-cyan-400 font-medium">{prop.vendor_alias}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${PROPOSAL_STATUS_COLORS[prop.status]}`}>{prop.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StarRating rating={prop.vendor_rating || 0} totalReviews={prop.vendor_total_reviews || 0} />
                    {(prop.vendor_trust_score > 0) && (
                      <span className="inline-flex items-center gap-1 text-xs text-cyan-400 font-medium">
                        <Shield className="w-3 h-3" />{prop.vendor_trust_score}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${prop.proposed_price?.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{prop.proposed_timeline_weeks} weeks</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2">{prop.cover_note}</p>
                <div className="bg-white rounded p-3 mb-3">
                  <p className="text-xs text-slate-500 mb-1 font-medium">Methodology</p>
                  <p className="text-sm text-slate-300">{prop.methodology}</p>
                </div>
                {prop.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => handleAccept(prop._id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                      <Check className="w-4 h-4" /> Accept Proposal
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No proposals received yet.</p>
        )}
      </div>
    </div>
  )
}
