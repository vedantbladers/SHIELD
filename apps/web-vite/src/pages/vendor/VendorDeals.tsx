import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Handshake, Clock, CheckCircle, XCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  NEGOTIATING: 'bg-amber-500/20 text-amber-400',
  CONTRACTED: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400',
  REVIEW: 'bg-cyan-500/20 text-cyan-400',
  CLOSED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-slate-500/20 text-slate-400',
  DISPUTED: 'bg-red-500/20 text-red-400',
};

export default function VendorDeals() {
  const { data: deals, isLoading } = useQuery({
    queryKey: ['vendor-deals-list'],
    queryFn: async () => {
      const res = await fetch('/api/cmp/deals/list?role=vendor');
      const json = await res.json();
      return json.data || [];
    },
  });

  const active = (deals || []).filter((d: any) => ['CONTRACTED', 'IN_PROGRESS', 'REVIEW', 'NEGOTIATING'].includes(d.status));
  const completed = (deals || []).filter((d: any) => d.status === 'CLOSED');
  const cancelled = (deals || []).filter((d: any) => ['CANCELLED', 'DISPUTED'].includes(d.status));

  const DealCard = ({ deal }: { deal: any }) => (
    <Link to={`/dashboard/vendor/deals/${deal.id}`}
      className="block bg-white border border-slate-200/30 rounded-lg p-4 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-cyan-400 text-sm">{deal.buyer_alias}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[deal.status]}`}>{deal.status}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>${deal.agreed_price?.toLocaleString() || '—'}</span>
        <span>{new Date(deal.created_at).toLocaleDateString()}</span>
      </div>
    </Link>
  );

  if (isLoading) return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl" />)}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Handshake className="w-7 h-7 text-cyan-400" /> My Deals</h1>

      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Active ({active.length})</h2>
          <div className="grid gap-3">{active.map((d: any) => <DealCard key={d.id} deal={d} />)}</div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Completed ({completed.length})</h2>
          <div className="grid gap-3">{completed.map((d: any) => <DealCard key={d.id} deal={d} />)}</div>
        </div>
      )}
      {cancelled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancelled ({cancelled.length})</h2>
          <div className="grid gap-3">{cancelled.map((d: any) => <DealCard key={d.id} deal={d} />)}</div>
        </div>
      )}
      {(!deals || deals.length === 0) && (
        <div className="text-center py-16 bg-white/30 rounded-xl border border-slate-200">
          <Handshake className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No deals yet</h3>
          <p className="text-slate-400">Get a proposal accepted to start your first deal.</p>
        </div>
      )}
    </div>
  );
}
