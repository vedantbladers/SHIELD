import { useTrustEvents, useVendorStats } from '@/lib/hooks/use-api';
import { Star, TrendingUp, Shield, CheckCircle, Award } from 'lucide-react';

const EVENT_ICONS: Record<string, any> = {
  deal_completed: CheckCircle,
  cert_verified: Shield,
  cert_approved: Shield,
  proposal_accepted: TrendingUp,
  dispute_closed: Shield,
  review_received: Star,
  moderator_adjustment: Award,
};

const EVENT_COLORS: Record<string, string> = {
  deal_completed: 'text-emerald-400',
  cert_verified: 'text-purple-400',
  cert_approved: 'text-purple-400',
  proposal_accepted: 'text-blue-400',
  dispute_closed: 'text-red-400',
  review_received: 'text-amber-400',
  moderator_adjustment: 'text-orange-400',
};

export default function VendorTrust() {
  const { data: events, isLoading: eventsLoading } = useTrustEvents() as { data: any; isLoading: boolean };
  const { data: stats, isLoading: statsLoading } = useVendorStats() as { data: any; isLoading: boolean };

  const score = stats?.trust_score || 0;
  const percentile = events?.percentile || 50;

  // Build the circular progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Star className="w-7 h-7 text-amber-400" /> Trust Score</h1>

      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center">
          <svg viewBox="0 0 140 140" className="w-36 h-36 -rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgb(51,65,85)" strokeWidth="10" />
            <circle cx="70" cy="70" r={radius} fill="none" stroke="url(#trustGradientVite)" strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={circumference - progress}
              strokeLinecap="round" className="transition-all duration-1000" />
            <defs>
              <linearGradient id="trustGradientVite" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center -mt-1">
            <p className="text-4xl font-bold text-white">{statsLoading ? '—' : score}</p>
            <p className="text-sm text-slate-400">out of 100</p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <Award className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">{percentile}th</p>
            <p className="text-sm text-slate-400">Percentile</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.completed_deals ?? '—'}</p>
            <p className="text-sm text-slate-400">Deals Completed</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <Shield className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{events?.events?.filter((e: any) => e.event_type === 'cert_verified' || e.event_type === 'cert_approved')?.length ?? 0}</p>
            <p className="text-sm text-slate-400">Certs Verified</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <TrendingUp className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{events?.events?.length ?? 0}</p>
            <p className="text-sm text-slate-400">Trust Events</p>
          </div>
        </div>
      </div>

      {/* How Trust Score Works */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">How Your Score is Calculated</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <p className="text-emerald-400 font-medium">Deal Completion</p>
            <p className="text-slate-400">+10 pts per deal closed successfully</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-purple-400 font-medium">Certifications</p>
            <p className="text-slate-400">+5 pts per verified certification</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-amber-400 font-medium">Buyer Rating</p>
            <p className="text-slate-400">+3 pts per 5-star review</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-red-400 font-medium">Disputes</p>
            <p className="text-slate-400">-15 pts per lost dispute</p>
          </div>
        </div>
      </div>

      {/* Trust Event History */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Trust Event History</h2>
        {eventsLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="animate-pulse h-10 bg-slate-700 rounded" />)}</div>
        ) : events && events.events && events.events.length > 0 ? (
          <div className="divide-y divide-slate-700/50">
            {events.events.map((event: any, i: number) => {
              const Icon = EVENT_ICONS[event.event_type] || Star;
              const color = EVENT_COLORS[event.event_type] || 'text-slate-400';
              const isPositive = event.score_delta > 0;
              return (
                <div key={event.id || i} className="flex items-center gap-3 py-3">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm text-white capitalize">{event.event_type?.replace(/_/g, ' ')}</p>
                    {event.deal_id && <p className="text-xs text-slate-500">Deal #{event.deal_id.slice(0, 8)}</p>}
                  </div>
                  <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : event.score_delta === 0 ? 'text-slate-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{event.score_delta} pts
                  </span>
                  <span className="text-xs text-slate-500 w-24 text-right">{new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No trust events recorded yet.</p>
            <p className="text-slate-600 text-xs mt-1">Trust events are created when you complete deals, get certifications approved, or receive reviews.</p>
          </div>
        )}
      </div>
    </div>
  );
}
