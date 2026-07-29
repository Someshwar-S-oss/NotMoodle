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
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications || [])
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
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No recent notifications</div>
            ) : (
              recent.map(n => (
                <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer ${!n.is_read ? 'bg-gray-800/50' : ''}`}>
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-gray-800 text-center bg-gray-900">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
