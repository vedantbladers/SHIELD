import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, FileText, Users, MessageSquare,
  Shield, Star, LogOut, Menu, Bell,
  Briefcase, Award, ChevronRight, Search
} from 'lucide-react'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { alias, role, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const buyerNav = [
    { label: 'Overview',
      href: '/dashboard/buyer',
      icon: <LayoutDashboard size={18} /> },
    { label: 'Requirements',
      href: '/dashboard/buyer/requirements',
      icon: <FileText size={18} /> },
    { label: 'Proposals',
      href: '/dashboard/buyer/proposals',
      icon: <Users size={18} /> },
    { label: 'Deals',
      href: '/dashboard/buyer/deals',
      icon: <Briefcase size={18} /> },
    { label: 'Marketplace',
      href: '/dashboard/buyer/marketplace',
      icon: <Search size={18} /> },
    { label: 'Messages',
      href: '/dashboard/buyer/messages',
      icon: <MessageSquare size={18} /> },
  ]

  const vendorNav = [
    { label: 'Overview',
      href: '/dashboard/vendor',
      icon: <LayoutDashboard size={18} /> },
    { label: 'Opportunities',
      href: '/dashboard/vendor/opportunities',
      icon: <Search size={18} /> },
    { label: 'Proposals',
      href: '/dashboard/vendor/proposals',
      icon: <FileText size={18} /> },
    { label: 'Deals',
      href: '/dashboard/vendor/deals',
      icon: <Briefcase size={18} /> },
    { label: 'Certifications',
      href: '/dashboard/vendor/certifications',
      icon: <Award size={18} /> },
    { label: 'Trust Score',
      href: '/dashboard/vendor/trust',
      icon: <Star size={18} /> },
    { label: 'Messages',
      href: '/dashboard/vendor/messages',
      icon: <MessageSquare size={18} /> },
  ]

  const moderatorNav = [
    { label: 'Overview',
      href: '/dashboard/moderator',
      icon: <LayoutDashboard size={18} /> },
    { label: 'Certifications',
      href: '/dashboard/moderator/certifications',
      icon: <Award size={18} /> },
    { label: 'Disputes',
      href: '/dashboard/moderator/disputes',
      icon: <Shield size={18} /> },
    { label: 'Users',
      href: '/dashboard/moderator/users',
      icon: <Users size={18} /> },
    { label: 'Audit Log',
      href: '/dashboard/moderator/audit-log',
      icon: <FileText size={18} /> },
  ]

  const navItems =
    role === 'vendor'    ? vendorNav :
    role === 'moderator' ? moderatorNav :
    buyerNav

  const roleColors: Record<string, string> = {
    buyer:     'bg-blue-100 text-blue-700',
    vendor:    'bg-indigo-100 text-indigo-700',
    moderator: 'bg-amber-100 text-amber-700',
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white
                    border-r border-slate-200">

      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5
                      border-b border-slate-100">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl
                        flex items-center justify-center
                        flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900
                        leading-none">
            SHIELD
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5
                        leading-none">
            Cybersecurity Marketplace
          </p>
        </div>
      </div>

      {/* ── User card ────────────────────────────── */}
      <div className="px-3 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3 bg-slate-50
                        rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 bg-indigo-100 rounded-full
                          flex items-center justify-center
                          text-indigo-600 font-bold text-sm
                          flex-shrink-0">
            {(alias || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-slate-800
                          truncate leading-tight">
              {alias || '—'}
            </p>
            <span className={`text-[10px] font-medium px-1.5
                              py-0.5 rounded-full
                              ${roleColors[role || 'buyer']}`}>
              {(role || 'buyer').charAt(0).toUpperCase()
               + (role || 'buyer').slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Nav links ────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5
                      overflow-y-auto">
        {navItems.map((item) => {
          const active =
            location.pathname === item.href ||
            (item.href !== `/dashboard/${role}` &&
             location.pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5
                rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <span className={
                active
                  ? 'text-indigo-500'
                  : 'text-slate-400 group-hover:text-slate-600'
              }>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight size={13}
                  className="text-indigo-400 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Sign out ─────────────────────────────── */}
      <div className="px-3 py-3 border-t border-slate-100">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5
                     rounded-xl text-sm font-medium text-slate-600
                     hover:bg-red-50 hover:text-red-600
                     transition-all duration-150 group"
        >
          <LogOut
            size={18}
            className="text-slate-400 group-hover:text-red-500"
          />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Desktop sidebar — fixed 256px */}
      <aside className="hidden lg:flex flex-col
                        w-64 fixed left-0 top-0 bottom-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0
                            w-64 z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">

        {/* Top header */}
        <header className="sticky top-0 z-20 bg-white
                           border-b border-slate-200">
          <div className="flex items-center justify-between
                          px-5 py-3.5">

            {/* Mobile: hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg
                           hover:bg-slate-100 text-slate-600
                           transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg
                                flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">
                  SHIELD
                </span>
              </div>
            </div>

            {/* Right: notification bell */}
            <div className="flex items-center gap-2 ml-auto">
              <button className="relative p-2 rounded-xl
                                 hover:bg-slate-100 text-slate-500
                                 hover:text-slate-700
                                 transition-colors">
                <Bell size={19} />
                {/* Unread dot — wire to your notification count */}
                <span className="absolute top-1.5 right-1.5
                                 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Desktop alias chip */}
              <div className="hidden lg:flex items-center gap-2
                              bg-slate-50 border border-slate-200
                              rounded-xl px-3 py-1.5">
                <div className="w-5 h-5 bg-indigo-100 rounded-full
                                flex items-center justify-center
                                text-indigo-600 font-bold text-xs">
                  {(alias || 'U')[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {alias}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
