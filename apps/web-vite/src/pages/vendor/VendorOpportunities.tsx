import { useState } from 'react';
import { useMarketplace } from '@/lib/hooks/use-api';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, DollarSign, Clock } from 'lucide-react';

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
};

export default function VendorOpportunities() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const { data, isLoading } = useMarketplace(page, sort) as { data: any; isLoading: boolean };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Search className="w-7 h-7 text-cyan-400" /> Marketplace</h1>
          <p className="text-slate-400 mt-1">Browse open security requirements</p>
        </div>
        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-300">
          <option value="newest">Newest First</option>
          <option value="budget_high">Budget: High to Low</option>
          <option value="budget_low">Budget: Low to High</option>
          <option value="urgency">Urgency</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-36 bg-white rounded-xl border border-slate-200" />)}</div>
      ) : data?.items?.length > 0 ? (
        <>
          <div className="space-y-4">
            {data.items.map((req: any) => (
              <div key={req._id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{req.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {req.service_type?.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs border border-cyan-500/20">{t}</span>
                      ))}
                      <span className={`px-2 py-0.5 rounded text-xs ${URGENCY_COLORS[req.urgency]}`}>
                        {req.urgency} urgency
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">{req.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> ${req.budget_range?.min?.toLocaleString()} – ${req.budget_range?.max?.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {req.timeline_weeks}w</span>
                    {req.compliance_needs?.length > 0 && (
                      <span>{req.compliance_needs.join(', ')}</span>
                    )}
                    <span>{Math.round((Date.now() - new Date(req.created_at).getTime()) / 86400000)}d ago</span>
                  </div>
                  <Link to={`/dashboard/vendor/opportunities/${req._id}`}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
                    View & Propose
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg bg-white text-slate-400 hover:text-white disabled:opacity-30">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-400">Page {page} of {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                className="p-2 rounded-lg bg-white text-slate-400 hover:text-white disabled:opacity-30">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white/30 rounded-xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No open requirements</h3>
          <p className="text-slate-400">Check back later for new opportunities.</p>
        </div>
      )}
    </div>
  );
}
