import { useVendorProposals } from '@/lib/hooks/use-api';
import { Link } from 'react-router-dom';
import { FileText, DollarSign, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  withdrawn: 'bg-slate-500/20 text-slate-400',
};

export default function VendorProposals() {
  const { data: proposals, isLoading } = useVendorProposals() as { data: any[]; isLoading: boolean };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="w-7 h-7 text-cyan-400" /> My Proposals</h1>
        <p className="text-slate-400 mt-1">Track the status of your submitted proposals</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse h-28 bg-white rounded-xl" />)}</div>
      ) : proposals && proposals.length > 0 ? (
        <div className="space-y-4">
          {proposals.map((prop: any) => (
            <div key={prop._id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{prop.requirement_title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(prop.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[prop.status]}`}>{prop.status}</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> ${prop.proposed_price?.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {prop.proposed_timeline_weeks} weeks</span>
              </div>
              {prop.status === 'accepted' && (
                <Link to={`/dashboard/vendor/deals`} className="inline-block mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors">
                  Go to Deal →
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white/30 rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No proposals yet</h3>
          <p className="text-slate-400 mb-4">Browse the marketplace to find opportunities.</p>
          <Link to="/dashboard/vendor/opportunities" className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg font-medium">Browse Marketplace</Link>
        </div>
      )}
    </div>
  );
}
