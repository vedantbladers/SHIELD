import { Link } from 'react-router-dom'
import {
  Shield, BadgeCheck, Users, Scale, Activity,
  ArrowRight, TrendingUp, Clock, AlertTriangle
} from 'lucide-react'
import { useModeratorStats } from '@/lib/hooks/use-api'

interface DashboardStats {
  total_users: number
  total_vendors: number
  total_buyers: number
  total_certifications: number
  pending_certifications: number
  approved_certifications: number
  rejected_certifications: number
  total_deals: number
  active_deals: number
  total_disputes: number
  recent_actions: Array<{
    id: string
    action_type: string
    target_type: string
    target_id: string
    reason?: string
    created_at: string
  }>
}

export default function ModeratorDashboard() {
  const { data: responseData, isLoading } = useModeratorStats()
  const stats = responseData?.data as DashboardStats | undefined

  const statCards = [
    { label: 'Pending Certs', value: stats?.pending_certifications ?? '—', icon: Clock, color: 'from-amber-500 to-orange-600', href: '/dashboard/moderator/certifications' },
    { label: 'Total Users', value: stats?.total_users ?? '—', icon: Users, color: 'from-cyan-500 to-blue-600', href: '/dashboard/moderator/users' },
    { label: 'Active Deals', value: stats?.active_deals ?? '—', icon: TrendingUp, color: 'from-emerald-500 to-green-600', href: '#' },
    { label: 'Open Disputes', value: stats?.total_disputes ?? '—', icon: AlertTriangle, color: 'from-red-500 to-rose-600', href: '/dashboard/moderator/disputes' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-400" />
            Moderator Command Center
          </h1>
          <p className="text-slate-400 mt-1">Platform oversight and certification management</p>
        </div>
        <Link to="/dashboard/moderator/certifications"
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2">
          Review Certs <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(card => (
          <Link key={card.label} to={card.href}
            className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 hover:border-amber-500/30 transition-all">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-[40px] group-hover:opacity-20 transition-opacity`} />
            <card.icon className="w-5 h-5 text-slate-400 mb-3" />
            <p className="text-3xl font-bold text-white">
              {isLoading ? <span className="animate-pulse bg-slate-700 rounded w-12 h-8 inline-block" /> : card.value}
            </p>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Cert Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-slate-400">Approved</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {isLoading ? '—' : stats?.approved_certifications ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-slate-400">Pending</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">
            {isLoading ? '—' : stats?.pending_certifications ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm font-medium text-slate-400">Rejected</span>
          </div>
          <p className="text-3xl font-bold text-red-400">
            {isLoading ? '—' : stats?.rejected_certifications ?? 0}
          </p>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-amber-400" /> Recent Actions
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stats?.recent_actions && stats.recent_actions.length > 0 ? (
          <div className="space-y-2">
            {stats.recent_actions.map(action => (
              <div key={action.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-white border border-slate-200/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    action.action_type.includes('APPROVED') ? 'bg-emerald-400' :
                    action.action_type.includes('REJECTED') ? 'bg-red-400' :
                    'bg-amber-400'
                  }`} />
                  <div>
                    <span className="text-sm font-medium text-white font-mono">{action.action_type}</span>
                    <span className="text-xs text-slate-500 ml-2">{action.target_type}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(action.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No actions yet. Start by reviewing pending certifications.</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard/moderator/certifications" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-500/30 transition-all">
          <BadgeCheck className="w-6 h-6 text-amber-400 mb-2" />
          <h3 className="font-semibold text-white">Review Certifications</h3>
          <p className="text-sm text-slate-400 mt-1">Approve or reject vendor certifications</p>
        </Link>
        <Link to="/dashboard/moderator/users" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-cyan-500/30 transition-all">
          <Users className="w-6 h-6 text-cyan-400 mb-2" />
          <h3 className="font-semibold text-white">Manage Users</h3>
          <p className="text-sm text-slate-400 mt-1">View users and adjust trust scores</p>
        </Link>
        <Link to="/dashboard/moderator/disputes" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-red-500/30 transition-all">
          <Scale className="w-6 h-6 text-red-400 mb-2" />
          <h3 className="font-semibold text-white">Resolve Disputes</h3>
          <p className="text-sm text-slate-400 mt-1">Handle disputed deals between parties</p>
        </Link>
      </div>
    </div>
  )
}
