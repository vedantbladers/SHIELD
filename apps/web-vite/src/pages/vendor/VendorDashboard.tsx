import { useVendorStats } from '@/lib/hooks/use-api';
import { Link } from 'react-router-dom';
import { Shield, Search, FileText, Handshake, Star, DollarSign, ArrowRight } from 'lucide-react';

export default function VendorDashboard() {
  const { data: stats, isLoading } = useVendorStats() as { data: any; isLoading: boolean };

  const statCards = [
    { label: 'Open Opportunities', value: stats?.open_opportunities ?? '—', icon: Search, color: 'from-cyan-500 to-blue-600', href: '/dashboard/vendor/opportunities' },
    { label: 'Active Proposals', value: stats?.active_proposals ?? '—', icon: FileText, color: 'from-purple-500 to-pink-600', href: '/dashboard/vendor/proposals' },
    { label: 'Active Deals', value: stats?.active_deals ?? '—', icon: Handshake, color: 'from-amber-500 to-orange-600', href: '/dashboard/vendor/deals' },
    { label: 'Trust Score', value: stats?.trust_score ?? '—', icon: Star, color: 'from-emerald-500 to-green-600', href: '/dashboard/vendor/trust' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyan-400" />
            Vendor Command Center
          </h1>
          <p className="text-slate-400 mt-1">Find opportunities and manage engagements</p>
        </div>
        <Link to="/dashboard/vendor/opportunities"
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2">
          Browse Marketplace <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(card => (
          <Link key={card.label} to={card.href}
            className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 hover:border-cyan-500/30 transition-all">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-[40px] group-hover:opacity-20 transition-opacity`} />
            <card.icon className="w-5 h-5 text-slate-400 mb-3" />
            <div className="text-3xl font-bold text-white">
              {isLoading ? <span className="animate-pulse bg-slate-700 rounded w-12 h-8 inline-block" /> : card.value}
            </div>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Empty State / Welcome Banner */}
      {!isLoading && stats?.active_proposals === 0 && stats?.active_deals === 0 && (
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Shield className="w-32 h-32 text-purple-400" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to SHIELD Marketplace</h2>
            <p className="text-slate-300 max-w-xl mb-6 leading-relaxed">
              You are now a verified vendor. Your identity remains protected under your chosen alias. Browse active requirements and submit your first proposal to start building your Trust Score.
            </p>
            <div className="flex gap-4">
              <Link to="/dashboard/vendor/opportunities"
                className="inline-flex px-6 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-purple-50 transition-colors gap-2 items-center">
                <Search className="w-5 h-5" /> Browse Opportunities
              </Link>
              <Link to="/dashboard/vendor/certifications"
                className="inline-flex px-6 py-3 border border-white/20 text-white rounded-lg font-bold hover:bg-white/10 transition-colors gap-2 items-center">
                <Shield className="w-5 h-5" /> Add Certifications
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Earnings */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-emerald-400" /> Earnings This Month
        </h2>
        <p className="text-3xl font-bold text-emerald-400">
          ${isLoading ? '—' : (stats?.earnings_this_month || 0).toLocaleString()}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard/vendor/opportunities" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-cyan-500/30 transition-all">
          <Search className="w-6 h-6 text-cyan-400 mb-2" />
          <h3 className="font-semibold text-white">Browse Opportunities</h3>
          <p className="text-sm text-slate-400 mt-1">Find matching security requirements</p>
        </Link>
        <Link to="/dashboard/vendor/certifications" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-purple-500/30 transition-all">
          <Shield className="w-6 h-6 text-purple-400 mb-2" />
          <h3 className="font-semibold text-white">Manage Certifications</h3>
          <p className="text-sm text-slate-400 mt-1">Upload and track your certs</p>
        </Link>
        <Link to="/dashboard/vendor/trust" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-500/30 transition-all">
          <Star className="w-6 h-6 text-emerald-400 mb-2" />
          <h3 className="font-semibold text-white">Trust Score</h3>
          <p className="text-sm text-slate-400 mt-1">View your reputation breakdown</p>
        </Link>
      </div>
    </div>
  );
}
