import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuyerRequirements } from '@/lib/hooks/use-api'
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  open: 'badge-green',
  matched: 'badge-blue',
  'in-progress': 'badge-amber',
  closed: 'badge-gray',
}

export default function BuyerRequirements() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { data, isLoading } = useBuyerRequirements(page) as { data: any; isLoading: boolean }

  const requirements = data?.items || []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Requirements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage your security requirements
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/buyer/post-requirement')}
          className="flex items-center gap-2 bg-indigo-600
                     hover:bg-indigo-700 text-white font-medium
                     px-4 py-2.5 rounded-xl transition-colors
                     text-sm"
        >
          <span className="text-lg leading-none">+</span>
          Post Requirement
        </button>
      </div>

      {/* Requirements list or empty state */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl
                                     border border-slate-200 p-6
                                     animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : requirements.length === 0 ? (
        <div className="bg-white rounded-2xl border
                        border-slate-200 border-dashed
                        p-16 text-center">
          <FileText className="w-12 h-12 text-slate-300
                                mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            No requirements yet
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            Post your first security requirement to get
            matched with vendors
          </p>
          <button
            onClick={() =>
              navigate('/dashboard/buyer/post-requirement')
            }
            className="bg-indigo-600 hover:bg-indigo-700
                       text-white font-medium px-6 py-2.5
                       rounded-xl transition-colors text-sm"
          >
            Post Your First Requirement
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {requirements.map((req: any) => (
              <div
                key={req._id}
                className="bg-white rounded-2xl border border-slate-200
                           p-6 hover:shadow-card-hover transition-shadow
                           cursor-pointer"
                onClick={() => navigate(`/dashboard/buyer/requirements/${req._id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 text-base">
                    {req.title}
                  </h3>
                  <span className={STATUS_COLORS[req.status] || STATUS_COLORS.closed}>
                    {req.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                  {req.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {req.service_type?.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-6 text-xs text-slate-400">
                  <span>Budget: ${req.budget_range?.min?.toLocaleString()} — ${req.budget_range?.max?.toLocaleString()}</span>
                  <span>{req.timeline_weeks} weeks</span>
                  <span>{req.proposal_count || 0} proposals</span>
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-500">Page {page} of {data.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
