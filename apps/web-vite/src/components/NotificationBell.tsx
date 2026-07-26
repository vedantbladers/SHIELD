"use client"

import { useNotifications } from '@/lib/hooks/use-api'
import { useState, useRef, useEffect } from 'react'
import { Bell, Check, MessageSquare, Shield, Handshake, Star } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'

const TYPE_ICONS: Record<string, any> = {
  new_match: Shield,
  proposal_received: MessageSquare,
  proposal_accepted: Handshake,
  deal_update: Handshake,
  trust_update: Star,
}

const TYPE_COLORS: Record<string, string> = {
  new_match: 'text-cyan-400',
  proposal_received: 'text-purple-400',
  proposal_accepted: 'text-emerald-400',
  deal_update: 'text-amber-400',
  trust_update: 'text-blue-400',
}

export default function NotificationBell() {
  const { data: notifications, refetch } = useNotifications() as { data: any[]; refetch: () => void }
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  const { socket } = useSocket()
  const { alias } = useAuth()

  const unread = (notifications || []).filter((n: any) => !n.read)

  // Socket.IO notification events
  useEffect(() => {
    if (!socket || !alias) return
    socket.emit('join-notifications', alias)

    socket.on('new-notification', () => {
      refetch()
    })

    return () => {
      socket.off('new-notification')
    }
  }, [socket, alias, refetch])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    try {
      await fetch('/api/cmp/notifications', { method: 'PATCH' })
      refetch()
    } catch { }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
        <Bell className="w-5 h-5 text-slate-400" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-96 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-80">
            {(notifications || []).length > 0 ? (
              (notifications || []).slice(0, 20).map((notif: any) => {
                const Icon = TYPE_ICONS[notif.type] || Bell
                const color = TYPE_COLORS[notif.type] || 'text-slate-400'
                return (
                  <div key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 border-b border-slate-200/30 transition-colors ${!notif.read ? 'bg-cyan-500/5' : ''}`}>
                    <Icon className={`w-4 h-4 mt-0.5 ${color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2">{notif.content}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                    {!notif.read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1 flex-shrink-0" />}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
