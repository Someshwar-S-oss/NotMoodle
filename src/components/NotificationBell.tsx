'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Optional: set up real-time subscription here
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
      // Silently ignore errors (401, 500) — bell shows empty state
    } catch {
      // Network error, ignore
    }
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], read: true })
    })
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds, read: true })
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const recent = notifications.slice(0, 5)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-foreground hover:bg-[#e5e5e5] transition-colors border border-transparent hover:border-border/20">
        <Bell size={24} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-foreground border-2 border-background text-[10px] font-bold flex items-center justify-center text-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-4 w-80 bg-card border border-foreground shadow-[8px_8px_0px_var(--color-foreground),0.1)] z-50 overflow-hidden">
          <div className="p-4 border-b border-border/20 flex justify-between items-center bg-background">
            <h3 className="clash-title text-lg uppercase tracking-wide">Alerts</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-[10px] uppercase font-bold tracking-widest text-foreground hover:bg-foreground hover:text-background px-2 py-1 transition-colors border border-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto bg-card">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-foreground/50 text-xs uppercase font-bold tracking-widest">No recent alerts</div>
            ) : (
              recent.map(n => (
                <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-4 border-b border-border/10 cursor-pointer transition-colors ${!n.is_read ? 'bg-[#f8f8f8] border-l-4 border-l-foreground' : 'hover:bg-background border-l-4 border-l-transparent'}`}>
                  <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">{n.title}</p>
                  <p className="text-xs text-foreground/70 line-clamp-2 font-medium">{n.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-0 text-center bg-foreground">
            <Link href="/notifications" onClick={() => setOpen(false)} className="block w-full py-3 text-xs uppercase font-bold tracking-widest text-background hover:bg-[#222222] transition-colors">
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
